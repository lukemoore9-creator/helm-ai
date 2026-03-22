'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SessionState = 'idle' | 'listening' | 'processing' | 'speaking';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface TranscriptEntry {
  speaker: 'examiner' | 'candidate';
  text: string;
  timestamp: number;
}

// Browser SpeechRecognition types
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
// Hook return type
// ---------------------------------------------------------------------------

interface UseVoiceSessionReturn {
  state: SessionState;
  transcript: TranscriptEntry[];
  interimTranscript: string;
  startSession: (ticketType: string) => void;
  endSession: () => void;
  toggleMic: () => void;
  analyserNode: AnalyserNode | null;
  micLevel: number;
  browserSupported: boolean;
  /** Last error message — show in UI so problems are visible */
  lastError: string | null;
}

// ---------------------------------------------------------------------------
// Hook implementation
// ---------------------------------------------------------------------------

export function useVoiceSession(): UseVoiceSessionReturn {
  // ---- State ----
  const [state, setState] = useState<SessionState>('idle');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const [micLevel, setMicLevel] = useState(0);
  const [browserSupported, setBrowserSupported] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);

  // ---- Refs ----
  const messagesRef = useRef<Message[]>([]);
  const ticketTypeRef = useRef<string>('oow-unlimited');
  const stateRef = useRef<SessionState>('idle');
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micContextRef = useRef<AudioContext | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const micRafRef = useRef<number | null>(null);
  const isSessionActiveRef = useRef(false);
  const finalTranscriptAccumRef = useRef('');

  // Keep stateRef in sync
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Check browser support
  useEffect(() => {
    const supported =
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
    setBrowserSupported(supported);
  }, []);

  // ------------------------------------------------------------------
  // Helper: ensure AudioContext exists and is running
  // ------------------------------------------------------------------

  const ensureAudioContext = useCallback(async (): Promise<AudioContext> => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new AudioContext();
    }
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    return ctx;
  }, []);

  // ------------------------------------------------------------------
  // Microphone level metering (for Orb during LISTENING)
  // ------------------------------------------------------------------

  const startMicMeter = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const ctx = new AudioContext();
      micContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      micAnalyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length / 255;
        setMicLevel(avg);
        micRafRef.current = requestAnimationFrame(tick);
      };

      micRafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      console.warn('[VoiceSession] Mic metering failed:', err);
    }
  }, []);

  const stopMicMeter = useCallback(() => {
    if (micRafRef.current !== null) {
      cancelAnimationFrame(micRafRef.current);
      micRafRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (micContextRef.current && micContextRef.current.state !== 'closed') {
      micContextRef.current.close().catch(() => {});
      micContextRef.current = null;
    }
    micAnalyserRef.current = null;
    setMicLevel(0);
  }, []);

  // ------------------------------------------------------------------
  // TTS playback via Web Audio API
  // ------------------------------------------------------------------

  const playTTS = useCallback(
    async (text: string): Promise<void> => {
      console.log('[VoiceSession] playTTS called, text length:', text.length);

      try {
        // 1. Fetch audio from our TTS API
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(
            `TTS API returned ${res.status}: ${errorData.error || 'unknown error'}`
          );
        }

        // 2. Get the audio as an ArrayBuffer
        const arrayBuf = await res.arrayBuffer();
        console.log('[VoiceSession] TTS audio received:', arrayBuf.byteLength, 'bytes');

        if (arrayBuf.byteLength < 100) {
          throw new Error(`TTS returned tiny audio (${arrayBuf.byteLength} bytes)`);
        }

        // 3. Decode audio via Web Audio API
        const ctx = await ensureAudioContext();
        const audioBuffer = await ctx.decodeAudioData(arrayBuf.slice(0));
        console.log('[VoiceSession] Audio decoded:', audioBuffer.duration.toFixed(1), 'seconds');

        // 4. Create source → analyser → destination chain
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;

        source.connect(analyser);
        analyser.connect(ctx.destination);

        sourceNodeRef.current = source;
        analyserRef.current = analyser;
        setAnalyserNode(analyser);

        // 5. Play and wait for completion
        return new Promise<void>((resolve) => {
          source.onended = () => {
            console.log('[VoiceSession] Audio playback ended');
            sourceNodeRef.current = null;
            analyserRef.current = null;
            setAnalyserNode(null);
            resolve();
          };
          source.start(0);
          console.log('[VoiceSession] Audio playback started');
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown TTS error';
        console.error('[VoiceSession] TTS failed:', errorMsg);
        setLastError(`Voice playback failed: ${errorMsg}`);

        // Fallback: browser speechSynthesis
        return new Promise<void>((resolve) => {
          if ('speechSynthesis' in window) {
            console.log('[VoiceSession] Falling back to browser speech synthesis');
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-GB';
            utterance.rate = 1;
            utterance.onend = () => resolve();
            utterance.onerror = () => resolve();
            window.speechSynthesis.speak(utterance);
          } else {
            resolve();
          }
        });
      }
    },
    [ensureAudioContext]
  );

  // ------------------------------------------------------------------
  // Send user speech to Claude, get response, play TTS
  // ------------------------------------------------------------------

  const processUserSpeech = useCallback(
    async (userText: string) => {
      if (!userText.trim() || !isSessionActiveRef.current) return;

      console.log('[VoiceSession] Processing user speech:', userText.substring(0, 50) + '...');
      setState('processing');
      setLastError(null);

      const userMsg: Message = { role: 'user', content: userText.trim() };
      messagesRef.current = [...messagesRef.current, userMsg];

      setTranscript((prev) => [
        ...prev,
        { speaker: 'candidate', text: userText.trim(), timestamp: Date.now() },
      ]);
      setInterimTranscript('');

      try {
        // Call Claude
        console.log('[VoiceSession] Calling /api/chat...');
        const chatRes = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: messagesRef.current,
            ticketType: ticketTypeRef.current,
          }),
        });

        if (!chatRes.ok) {
          throw new Error(`Chat API returned ${chatRes.status}`);
        }

        const { text: assistantText } = await chatRes.json();
        console.log('[VoiceSession] Claude responded:', assistantText.substring(0, 50) + '...');

        const assistantMsg: Message = { role: 'assistant', content: assistantText };
        messagesRef.current = [...messagesRef.current, assistantMsg];

        setTranscript((prev) => [
          ...prev,
          { speaker: 'examiner', text: assistantText, timestamp: Date.now() },
        ]);

        // Stop mic meter before speaking
        stopMicMeter();

        // Speak the response
        setState('speaking');
        console.log('[VoiceSession] Playing TTS...');
        await playTTS(assistantText);
        console.log('[VoiceSession] TTS playback complete, reopening mic...');

        // After audio finishes, reopen mic
        if (isSessionActiveRef.current) {
          setState('listening');
          startListeningInternal();
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error('[VoiceSession] processUserSpeech error:', errorMsg);
        setLastError(errorMsg);

        const errorText =
          'I apologise, there seems to be a technical issue. Could you repeat that?';
        setTranscript((prev) => [
          ...prev,
          { speaker: 'examiner', text: errorText, timestamp: Date.now() },
        ]);

        setState('speaking');
        await playTTS(errorText);

        if (isSessionActiveRef.current) {
          setState('listening');
          startListeningInternal();
        }
      }
    },
    [playTTS, stopMicMeter]
  );

  // ------------------------------------------------------------------
  // Speech Recognition
  // ------------------------------------------------------------------

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  // Ref-based function to avoid circular dependency
  const startListeningInternalRef = useRef<() => void>(() => {});

  const startListeningInternal = useCallback(() => {
    startListeningInternalRef.current();
  }, []);

  useEffect(() => {
    startListeningInternalRef.current = () => {
      if (!browserSupported) {
        console.warn('[VoiceSession] Browser does not support SpeechRecognition');
        return;
      }

      console.log('[VoiceSession] Starting speech recognition...');
      finalTranscriptAccumRef.current = '';
      setInterimTranscript('');

      const SpeechRecognitionCtor =
        window.SpeechRecognition || window.webkitSpeechRecognition;

      const recognition = new SpeechRecognitionCtor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-GB';

      recognition.onstart = () => {
        console.log('[VoiceSession] SpeechRecognition started');
        startMicMeter();
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

        // Reset silence timer — after 2s of silence, stop recognition
        clearSilenceTimer();
        silenceTimerRef.current = setTimeout(() => {
          console.log('[VoiceSession] 2s silence detected, stopping recognition');
          if (recognitionRef.current) {
            recognitionRef.current.stop();
          }
        }, 2000);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === 'aborted' || event.error === 'no-speech') {
          return;
        }
        console.error('[VoiceSession] SpeechRecognition error:', event.error);
      };

      recognition.onend = () => {
        console.log('[VoiceSession] SpeechRecognition ended');
        clearSilenceTimer();
        stopMicMeter();

        const finalText = finalTranscriptAccumRef.current.trim();
        recognitionRef.current = null;

        if (finalText && isSessionActiveRef.current) {
          console.log('[VoiceSession] Got final text:', finalText.substring(0, 50) + '...');
          processUserSpeech(finalText);
        } else if (isSessionActiveRef.current && stateRef.current === 'listening') {
          console.log('[VoiceSession] No speech detected, restarting recognition');
          startListeningInternalRef.current();
        }
      };

      recognitionRef.current = recognition;

      try {
        recognition.start();
      } catch (err) {
        console.error('[VoiceSession] Failed to start SpeechRecognition:', err);
      }
    };
  }, [browserSupported, clearSilenceTimer, startMicMeter, stopMicMeter, processUserSpeech]);

  const stopListeningInternal = useCallback(() => {
    clearSilenceTimer();
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    stopMicMeter();
    setInterimTranscript('');
  }, [clearSilenceTimer, stopMicMeter]);

  // ------------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------------

  const startSession = useCallback(
    async (ticketType: string) => {
      // Reset
      messagesRef.current = [];
      ticketTypeRef.current = ticketType;
      isSessionActiveRef.current = true;
      setTranscript([]);
      setInterimTranscript('');
      setLastError(null);
      setState('processing');

      // Pre-create AudioContext NOW, on user gesture, so it won't be suspended
      try {
        await ensureAudioContext();
        console.log('[VoiceSession] AudioContext ready');
      } catch (err) {
        console.error('[VoiceSession] Failed to create AudioContext:', err);
      }

      try {
        // Get opening question from Claude
        const initialMessages: Message[] = [
          {
            role: 'user',
            content:
              'Begin the oral examination. Introduce yourself and ask your first question.',
          },
        ];

        console.log('[VoiceSession] Calling /api/chat for opening question...');
        const chatRes = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: initialMessages,
            ticketType,
          }),
        });

        if (!chatRes.ok) {
          throw new Error(`Chat API returned ${chatRes.status}`);
        }

        const { text: openingText } = await chatRes.json();
        console.log('[VoiceSession] Got opening text:', openingText.substring(0, 80) + '...');

        messagesRef.current = [
          ...initialMessages,
          { role: 'assistant', content: openingText },
        ];

        setTranscript([
          { speaker: 'examiner', text: openingText, timestamp: Date.now() },
        ]);

        // Speak the opening question
        setState('speaking');
        console.log('[VoiceSession] Playing opening TTS...');
        await playTTS(openingText);
        console.log('[VoiceSession] Opening TTS complete, starting to listen...');

        // After speaking, start listening
        if (isSessionActiveRef.current) {
          setState('listening');
          startListeningInternal();
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error('[VoiceSession] startSession error:', errorMsg);
        setState('idle');
        isSessionActiveRef.current = false;
        setLastError(errorMsg);

        setTranscript([
          {
            speaker: 'examiner',
            text: 'I apologise, there was a technical issue starting the examination. Please try again.',
            timestamp: Date.now(),
          },
        ]);
      }
    },
    [playTTS, startListeningInternal, ensureAudioContext]
  );

  const endSession = useCallback(() => {
    isSessionActiveRef.current = false;
    stopListeningInternal();

    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch {
        // already stopped
      }
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    setAnalyserNode(null);
    setState('idle');
  }, [stopListeningInternal]);

  const toggleMic = useCallback(() => {
    if (stateRef.current === 'listening') {
      clearSilenceTimer();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    } else if (stateRef.current === 'idle' && isSessionActiveRef.current) {
      setState('listening');
      startListeningInternal();
    }
  }, [clearSilenceTimer, startListeningInternal]);

  // ------------------------------------------------------------------
  // Cleanup on unmount
  // ------------------------------------------------------------------

  useEffect(() => {
    return () => {
      isSessionActiveRef.current = false;
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) recognitionRef.current.abort();
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.stop();
        } catch {
          // already stopped
        }
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      stopMicMeter();
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, [stopMicMeter]);

  return {
    state,
    transcript,
    interimTranscript,
    startSession,
    endSession,
    toggleMic,
    analyserNode,
    micLevel,
    browserSupported,
    lastError,
  };
}
