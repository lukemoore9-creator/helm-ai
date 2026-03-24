'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

// ---------------------------------------------------------------------------
// Browser SpeechRecognition types
// ---------------------------------------------------------------------------

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

// ---------------------------------------------------------------------------
// Hook interface
// ---------------------------------------------------------------------------

interface UseSpeechRecognitionOptions {
  onSpeechComplete: (text: string) => void;
  onListeningStart?: () => void;
  lang?: string;
  silenceTimeout?: number;
}

interface UseSpeechRecognitionReturn {
  startListening: () => void;
  stopListening: () => void;
  interimTranscript: string;
  browserSupported: boolean;
}

// ---------------------------------------------------------------------------
// Hook implementation
// ---------------------------------------------------------------------------

export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions
): UseSpeechRecognitionReturn {
  const {
    onSpeechComplete,
    onListeningStart,
    lang = 'en-GB',
    silenceTimeout = 2000,
  } = options;

  const [interimTranscript, setInterimTranscript] = useState('');
  const [browserSupported, setBrowserSupported] = useState(true);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finalTranscriptAccumRef = useRef('');

  // Stable refs for callbacks so the recognition handlers always see the latest
  const onSpeechCompleteRef = useRef(onSpeechComplete);
  const onListeningStartRef = useRef(onListeningStart);
  useEffect(() => {
    onSpeechCompleteRef.current = onSpeechComplete;
  }, [onSpeechComplete]);
  useEffect(() => {
    onListeningStartRef.current = onListeningStart;
  }, [onListeningStart]);

  // Check browser support
  useEffect(() => {
    const supported =
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
    setBrowserSupported(supported);
  }, []);

  // ------------------------------------------------------------------
  // Silence timer helpers
  // ------------------------------------------------------------------

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  // ------------------------------------------------------------------
  // Start / stop listening
  // ------------------------------------------------------------------

  // Use a ref-based function to allow self-restart on empty speech
  const startListeningRef = useRef<() => void>(() => {});

  const startListening = useCallback(() => {
    startListeningRef.current();
  }, []);

  useEffect(() => {
    startListeningRef.current = () => {
      if (!browserSupported) {
        console.warn('[SpeechRecognition] Browser does not support SpeechRecognition');
        return;
      }

      console.log('[SpeechRecognition] Starting speech recognition...');
      finalTranscriptAccumRef.current = '';
      setInterimTranscript('');

      const SpeechRecognitionCtor =
        window.SpeechRecognition || window.webkitSpeechRecognition;

      const recognition = new SpeechRecognitionCtor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = lang;

      recognition.onstart = () => {
        console.log('[SpeechRecognition] SpeechRecognition started');
        onListeningStartRef.current?.();
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = '';
        let finalChunk = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const text = result[0].transcript;
          if (result.isFinal) {
            finalChunk += text;
          } else {
            interim += text;
          }
        }

        if (finalChunk) {
          finalTranscriptAccumRef.current += finalChunk;
        }

        const display = finalTranscriptAccumRef.current + interim;
        setInterimTranscript(display);

        // Reset silence timer -- after configured silence, stop recognition
        clearSilenceTimer();
        silenceTimerRef.current = setTimeout(() => {
          console.log(`[SpeechRecognition] ${silenceTimeout}ms silence detected, stopping`);
          if (recognitionRef.current) {
            recognitionRef.current.stop();
          }
        }, silenceTimeout);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === 'aborted' || event.error === 'no-speech') {
          return;
        }
        console.error('[SpeechRecognition] error:', event.error);
      };

      recognition.onend = () => {
        console.log('[SpeechRecognition] ended');
        clearSilenceTimer();

        const finalText = finalTranscriptAccumRef.current.trim();
        recognitionRef.current = null;

        if (finalText) {
          console.log('[SpeechRecognition] Final text:', finalText.substring(0, 50) + '...');
          onSpeechCompleteRef.current(finalText);
        } else {
          // No speech detected -- restart automatically
          console.log('[SpeechRecognition] No speech detected, restarting');
          startListeningRef.current();
        }
      };

      recognitionRef.current = recognition;

      try {
        recognition.start();
      } catch (err) {
        console.error('[SpeechRecognition] Failed to start:', err);
      }
    };
  }, [browserSupported, lang, silenceTimeout, clearSilenceTimer]);

  const stopListening = useCallback(() => {
    clearSilenceTimer();
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    setInterimTranscript('');
  }, [clearSilenceTimer]);

  // ------------------------------------------------------------------
  // Cleanup on unmount
  // ------------------------------------------------------------------

  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) recognitionRef.current.abort();
    };
  }, []);

  return {
    startListening,
    stopListening,
    interimTranscript,
    browserSupported,
  };
}
