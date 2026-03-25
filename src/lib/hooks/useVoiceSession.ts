'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { SessionState, TranscriptEntry } from '@/lib/types';
import { useSpeechRecognition } from './useSpeechRecognition';
import { useAudioPlayer } from './useAudioPlayer';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

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
  /** Last error message -- show in UI so problems are visible */
  lastError: string | null;
}

// ---------------------------------------------------------------------------
// Hook implementation
// ---------------------------------------------------------------------------

export function useVoiceSession(): UseVoiceSessionReturn {
  // ---- State ----
  const [state, setState] = useState<SessionState>('idle');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [micLevel, setMicLevel] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  // ---- Refs ----
  const messagesRef = useRef<Message[]>([]);
  const ticketTypeRef = useRef<string>('oow-unlimited');
  const stateRef = useRef<SessionState>('idle');
  const isSessionActiveRef = useRef(false);

  // Mic metering refs
  const micStreamRef = useRef<MediaStream | null>(null);
  const micContextRef = useRef<AudioContext | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const micRafRef = useRef<number | null>(null);

  // Keep stateRef in sync
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // ------------------------------------------------------------------
  // Composed hooks
  // ------------------------------------------------------------------

  const audioPlayer = useAudioPlayer();

  // Wrap playTTS to also set lastError on failure
  const playTTS = useCallback(
    async (text: string): Promise<void> => {
      try {
        await audioPlayer.play(text);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown TTS error';
        setLastError(`Voice playback failed: ${errorMsg}`);
      }
    },
    [audioPlayer]
  );

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
  // Process user speech: send to Claude, get response, play TTS
  // ------------------------------------------------------------------

  // Use a ref so the speech recognition callback always sees the latest version
  const processUserSpeechRef = useRef<(text: string) => void>(() => {});

  useEffect(() => {
    processUserSpeechRef.current = async (userText: string) => {
      if (!userText.trim() || !isSessionActiveRef.current) return;

      console.log('[VoiceSession] Processing user speech:', userText.substring(0, 50) + '...');
      setState('processing');
      setLastError(null);
      stopMicMeter();

      const userMsg: Message = { role: 'user', content: userText.trim() };
      messagesRef.current = [...messagesRef.current, userMsg];

      setTranscript((prev) => [
        ...prev,
        { speaker: 'candidate', text: userText.trim(), timestamp: Date.now() },
      ]);

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

        // Speak the response
        setState('speaking');
        console.log('[VoiceSession] Playing TTS...');
        await playTTS(assistantText);
        console.log('[VoiceSession] TTS playback complete, reopening mic...');

        // After audio finishes, reopen mic
        if (isSessionActiveRef.current) {
          setState('listening');
          speechRecognition.startListening();
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
          speechRecognition.startListening();
        }
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playTTS, stopMicMeter]);

  const handleSpeechComplete = useCallback((text: string) => {
    processUserSpeechRef.current(text);
  }, []);

  const speechRecognition = useSpeechRecognition({
    onSpeechComplete: handleSpeechComplete,
    onListeningStart: startMicMeter,
    lang: 'en-GB',
    silenceTimeout: 2000,
  });

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
      setLastError(null);
      setState('processing');

      // Pre-warm AudioContext on user gesture so it won't be suspended
      try {
        if ('warmUp' in audioPlayer) {
          await (audioPlayer as { warmUp: () => Promise<void> }).warmUp();
        }
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
              'Greet the student briefly (1-2 sentences max) and ask what they want to work on or offer to throw questions at them. Do not introduce yourself with a long speech.',
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
          speechRecognition.startListening();
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
    [playTTS, speechRecognition, audioPlayer]
  );

  const endSession = useCallback(() => {
    isSessionActiveRef.current = false;
    speechRecognition.stopListening();
    stopMicMeter();
    audioPlayer.stop();
    setState('idle');
  }, [speechRecognition, stopMicMeter, audioPlayer]);

  const toggleMic = useCallback(() => {
    if (stateRef.current === 'listening') {
      speechRecognition.stopListening();
      stopMicMeter();
    } else if (stateRef.current === 'idle' && isSessionActiveRef.current) {
      setState('listening');
      speechRecognition.startListening();
    }
  }, [speechRecognition, stopMicMeter]);

  // ------------------------------------------------------------------
  // Cleanup on unmount
  // ------------------------------------------------------------------

  useEffect(() => {
    return () => {
      isSessionActiveRef.current = false;
      stopMicMeter();
    };
  }, [stopMicMeter]);

  return {
    state,
    transcript,
    interimTranscript: speechRecognition.interimTranscript,
    startSession,
    endSession,
    toggleMic,
    analyserNode: audioPlayer.analyserNode,
    micLevel,
    browserSupported: speechRecognition.browserSupported,
    lastError,
  };
}
