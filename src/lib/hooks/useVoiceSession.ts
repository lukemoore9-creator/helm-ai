'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { SessionState, TranscriptEntry } from '@/lib/types';
import { useSpeechRecognition } from './useSpeechRecognition';

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
  startSession: (ticketType: string, firstName?: string, totalSessions?: number) => void;
  endSession: () => void;
  toggleMic: () => void;
  analyserNode: AnalyserNode | null;
  micLevel: number;
  browserSupported: boolean;
  lastError: string | null;
}

// ---------------------------------------------------------------------------
// Topic detection
// ---------------------------------------------------------------------------

const TOPIC_KEYWORDS: Record<string, string> = {
  'colreg': 'colregs', 'rule ': 'colregs', 'collision': 'colregs',
  'navigation': 'navigation', 'passage plan': 'navigation', 'chart': 'navigation',
  'safety': 'safety', 'fire': 'safety', 'man overboard': 'safety', 'mob': 'safety', 'abandon': 'safety',
  'solas': 'solas',
  'meteorolog': 'meteorology', 'weather': 'meteorology', 'synoptic': 'meteorology',
  'stability': 'stability', 'gm': 'stability', 'gz': 'stability',
  'marpol': 'marpol', 'pollution': 'marpol',
  'stcw': 'stcw', 'watchkeep': 'stcw',
  'cargo': 'cargo',
  'gmdss': 'gmdss', 'distress': 'gmdss', 'vhf': 'gmdss',
  'radar': 'bridge-equipment', 'ecdis': 'bridge-equipment', 'ais': 'bridge-equipment', 'bridge': 'bridge-equipment',
  'maritime law': 'maritime-law', 'ism': 'maritime-law', 'mlc': 'maritime-law',
};

function detectTopic(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [keyword, topic] of Object.entries(TOPIC_KEYWORDS)) {
    if (lower.includes(keyword)) return topic;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Simple TTS: fetch /api/tts → blob → bare Audio element. No Web Audio API.
// ---------------------------------------------------------------------------

/** Fetch TTS audio and play it with a plain Audio element.
 *  No AudioContext, no AnalyserNode, no createMediaElementSource.
 *  Returns a promise that resolves when playback ends. */
async function fetchAndPlayAudio(
  text: string,
  log?: (msg: string) => void
): Promise<void> {
  const l = log || (() => {});

  l('fetching /api/tts...');
  const res = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`TTS returned ${res.status}: ${body.substring(0, 100)}`);
  }

  const blob = await res.blob();
  l(`TTS audio received: ${blob.size} bytes`);

  if (blob.size < 100) {
    throw new Error(`TTS returned tiny audio (${blob.size} bytes)`);
  }

  const blobUrl = URL.createObjectURL(blob);

  return new Promise<void>((resolve, reject) => {
    const audio = new Audio(blobUrl);
    audio.volume = 1;

    // Hard 15-second timeout
    const timeout = setTimeout(() => {
      l('audio timed out after 15s');
      audio.pause();
      URL.revokeObjectURL(blobUrl);
      resolve();
    }, 15000);

    audio.onended = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(blobUrl);
      l('audio playback ended');
      resolve();
    };

    audio.onerror = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(blobUrl);
      reject(new Error('Audio element playback error'));
    };

    audio.play().catch((err) => {
      clearTimeout(timeout);
      URL.revokeObjectURL(blobUrl);
      reject(err);
    });

    l('audio.play() called');
  });
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useVoiceSession(): UseVoiceSessionReturn {
  const [state, setState] = useState<SessionState>('idle');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [micLevel, setMicLevel] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  const messagesRef = useRef<Message[]>([]);
  const ticketTypeRef = useRef<string>('oow-unlimited');
  const currentTopicRef = useRef<string | null>(null);
  const stateRef = useRef<SessionState>('idle');
  const isSessionActiveRef = useRef(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const micStreamRef = useRef<MediaStream | null>(null);
  const micContextRef = useRef<AudioContext | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const micRafRef = useRef<number | null>(null);

  useEffect(() => { stateRef.current = state; }, [state]);

  // Mic metering
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
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        setMicLevel(sum / dataArray.length / 255);
        micRafRef.current = requestAnimationFrame(tick);
      };
      micRafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      console.warn('[Voice] Mic metering failed:', err);
    }
  }, []);

  const stopMicMeter = useCallback(() => {
    if (micRafRef.current !== null) { cancelAnimationFrame(micRafRef.current); micRafRef.current = null; }
    if (micStreamRef.current) { micStreamRef.current.getTracks().forEach((t) => t.stop()); micStreamRef.current = null; }
    if (micContextRef.current && micContextRef.current.state !== 'closed') { micContextRef.current.close().catch(() => {}); micContextRef.current = null; }
    micAnalyserRef.current = null;
    setMicLevel(0);
  }, []);

  // ------------------------------------------------------------------
  // Process user speech — SIMPLE: full text from Claude → TTS → play
  // ------------------------------------------------------------------

  const processUserSpeechRef = useRef<(text: string) => void>(() => {});

  useEffect(() => {
    processUserSpeechRef.current = async (userText: string) => {
      if (!userText.trim() || !isSessionActiveRef.current) return;

      const t0 = Date.now();
      const log = (msg: string) => console.log(`[Voice] +${Date.now() - t0}ms ${msg}`);

      log('speech complete, sending to chat API');
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
        log('fetching /api/chat...');
        const chatRes = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: messagesRef.current,
            ticketType: ticketTypeRef.current,
            currentTopic: currentTopicRef.current,
          }),
        });

        log(`chat response received, status: ${chatRes.status}`);
        if (!chatRes.ok) throw new Error(`Chat API returned ${chatRes.status}`);

        // Read entire response as text
        const fullText = await chatRes.text();
        log(`full response text received: ${fullText.length} chars`);

        const detected = detectTopic(fullText);
        if (detected) currentTopicRef.current = detected;

        messagesRef.current = [...messagesRef.current, { role: 'assistant', content: fullText }];

        setTranscript((prev) => [
          ...prev,
          { speaker: 'examiner', text: fullText, timestamp: Date.now() },
        ]);

        // TTS: fetch audio blob → bare Audio element
        setState('speaking');
        await fetchAndPlayAudio(fullText, log);
        log('TTS playback complete');

        if (isSessionActiveRef.current) {
          setState('listening');
          speechRecognition.startListening();
          log('mic reopened, listening');
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        log(`ERROR: ${errorMsg}`);
        setLastError(errorMsg);

        setTranscript((prev) => [...prev, {
          speaker: 'examiner',
          text: 'Sorry, there was a technical issue. Could you repeat that?',
          timestamp: Date.now(),
        }]);

        // Skip TTS for error message — just go back to listening
        if (isSessionActiveRef.current) {
          setState('listening');
          speechRecognition.startListening();
        }
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopMicMeter]);

  const handleSpeechComplete = useCallback((text: string) => {
    processUserSpeechRef.current(text);
  }, []);

  const speechRecognition = useSpeechRecognition({
    onSpeechComplete: handleSpeechComplete,
    onListeningStart: startMicMeter,
    lang: 'en-GB',
    silenceTimeout: 1200,
  });

  // ------------------------------------------------------------------
  // START SESSION — TTS greeting via bare fetch, static MP3 fallback
  // ------------------------------------------------------------------

  const startSession = useCallback(
    async (ticketType: string, firstName?: string, totalSessions?: number) => {
      const t0 = Date.now();
      const log = (msg: string) => console.log(`[Voice:greeting] +${Date.now() - t0}ms ${msg}`);

      messagesRef.current = [];
      ticketTypeRef.current = ticketType;
      currentTopicRef.current = null;
      isSessionActiveRef.current = true;
      setTranscript([]);
      setLastError(null);
      setState('speaking');

      const isReturning = (totalSessions || 0) > 0;
      const name = firstName || 'there';
      const greetingText = isReturning
        ? `Welcome back ${name}. Want to pick up where we left off, or is there a topic you want to focus on today?`
        : `Hi ${name}, welcome to Echo. Shall I fire some questions at you to find your weak spots, or is there a specific topic you want to work on?`;

      // Add to transcript and seed Claude context immediately
      setTranscript([{ speaker: 'examiner', text: greetingText, timestamp: Date.now() }]);
      messagesRef.current = [{ role: 'assistant', content: greetingText }];

      log('greeting text ready, fetching TTS');

      try {
        await fetchAndPlayAudio(greetingText, log);
        log('greeting playback complete');
      } catch (err) {
        log('TTS greeting failed: ' + err + ', trying static MP3');
        // Fallback: static MP3
        try {
          const audioUrl = isReturning ? '/audio/greeting-returning.mp3' : '/audio/greeting-first.mp3';
          const audio = new Audio(audioUrl);
          audio.volume = 1;
          await audio.play();
          await new Promise<void>((resolve) => {
            audio.onended = () => resolve();
            setTimeout(() => { audio.pause(); resolve(); }, 10000);
          });
          log('static fallback complete');
        } catch (fallbackErr) {
          log('static fallback also failed: ' + fallbackErr);
        }
      }

      if (isSessionActiveRef.current) {
        setState('listening');
        speechRecognition.startListening();
        log('listening started');
      }
    },
    [speechRecognition]
  );

  const endSession = useCallback(() => {
    isSessionActiveRef.current = false;
    speechRecognition.stopListening();
    stopMicMeter();
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setState('idle');
  }, [speechRecognition, stopMicMeter]);

  const toggleMic = useCallback(() => {
    if (stateRef.current === 'listening') {
      speechRecognition.stopListening();
      stopMicMeter();
    } else if (stateRef.current === 'idle' && isSessionActiveRef.current) {
      setState('listening');
      speechRecognition.startListening();
    }
  }, [speechRecognition, stopMicMeter]);

  useEffect(() => {
    return () => { isSessionActiveRef.current = false; stopMicMeter(); };
  }, [stopMicMeter]);

  return {
    state,
    transcript,
    interimTranscript: speechRecognition.interimTranscript,
    startSession,
    endSession,
    toggleMic,
    analyserNode: null, // Orb animation disabled — Web Audio API was causing hangs
    micLevel,
    browserSupported: speechRecognition.browserSupported,
    lastError,
  };
}
