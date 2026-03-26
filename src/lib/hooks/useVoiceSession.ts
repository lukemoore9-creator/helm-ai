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
// Helpers
// ---------------------------------------------------------------------------

/** Split text into sentences on . ? ! boundaries. Returns complete sentences
 *  and any leftover fragment that hasn't ended with a sentence boundary yet. */
function extractSentences(text: string): { sentences: string[]; remainder: string } {
  const sentences: string[] = [];
  // Match sentences ending with . ? or ! (optionally followed by quotes/parens)
  const regex = /[^.!?]*[.!?]+["')\s]*/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    sentences.push(match[0].trim());
    lastIndex = regex.lastIndex;
  }
  return { sentences, remainder: text.slice(lastIndex) };
}

/** Read a streaming response body, calling onSentence for each complete sentence
 *  as it arrives. Returns the full accumulated text when the stream ends. */
async function readStreamAndSplit(
  response: Response,
  onSentence: (sentence: string, isFirst: boolean) => void
): Promise<string> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';
  let sentenceCount = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    buffer += chunk;
    fullText += chunk;

    // Extract any complete sentences from the buffer
    const { sentences, remainder } = extractSentences(buffer);
    buffer = remainder;

    for (const sentence of sentences) {
      if (sentence.trim()) {
        onSentence(sentence, sentenceCount === 0);
        sentenceCount++;
      }
    }
  }

  // Flush any remaining text as the final sentence
  if (buffer.trim()) {
    onSentence(buffer.trim(), sentenceCount === 0);
  }

  return fullText;
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
  // Stream Claude response + pipeline TTS playback
  // ------------------------------------------------------------------

  /** Fetch streaming chat, split into sentences, pipeline TTS playback.
   *  Returns the full assistant text. */
  const streamAndSpeak = useCallback(
    async (chatRes: Response): Promise<string> => {
      // We'll collect sentences into a queue and play them sequentially.
      // The first sentence triggers playback immediately; subsequent ones
      // are queued and played as each finishes.
      const sentenceQueue: string[] = [];
      let playing = false;
      let resolveDone: () => void;
      const donePromise = new Promise<void>((r) => { resolveDone = r; });
      let streamFinished = false;

      const playNext = async () => {
        if (playing) return; // already playing — will be called again when current finishes
        const next = sentenceQueue.shift();
        if (!next) {
          if (streamFinished) {
            resolveDone();
          }
          return;
        }
        playing = true;
        setState('speaking');
        await playTTS(next);
        playing = false;
        // Play next sentence if available
        await playNext();
      };

      const fullText = await readStreamAndSplit(chatRes, (sentence, isFirst) => {
        console.log(`[VoiceSession] Sentence ${isFirst ? '(first)' : ''}: ${sentence.substring(0, 40)}...`);
        sentenceQueue.push(sentence);
        if (isFirst) {
          // Start playing immediately — don't wait for the rest of the stream
          playNext();
        }
      });

      streamFinished = true;
      // If nothing is playing and queue is empty, resolve now
      if (!playing && sentenceQueue.length === 0) {
        resolveDone!();
      } else if (!playing) {
        // Queue has items but nothing is playing — kick it off
        playNext();
      }

      await donePromise;
      return fullText;
    },
    [playTTS]
  );

  // ------------------------------------------------------------------
  // Process user speech: send to Claude, get streaming response, pipeline TTS
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
        // Call Claude (streaming)
        console.log('[VoiceSession] Calling /api/chat (streaming)...');
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

        // Stream response + pipeline TTS
        const assistantText = await streamAndSpeak(chatRes);
        console.log('[VoiceSession] All TTS complete for:', assistantText.substring(0, 50) + '...');

        const assistantMsg: Message = { role: 'assistant', content: assistantText };
        messagesRef.current = [...messagesRef.current, assistantMsg];

        setTranscript((prev) => [
          ...prev,
          { speaker: 'examiner', text: assistantText, timestamp: Date.now() },
        ]);

        // After all audio finishes, reopen mic
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
  }, [playTTS, stopMicMeter, streamAndSpeak]);

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
        // Get opening question from Claude (streaming)
        const initialMessages: Message[] = [
          {
            role: 'user',
            content:
              'Session starting. Greet the student in ONE short sentence and ask ONE question. Maximum 2 sentences total. Do not introduce yourself at length.',
          },
        ];

        console.log('[VoiceSession] Calling /api/chat for opening question (streaming)...');
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

        // Stream and pipeline TTS for the opening
        const openingText = await streamAndSpeak(chatRes);
        console.log('[VoiceSession] Opening complete:', openingText.substring(0, 80) + '...');

        messagesRef.current = [
          ...initialMessages,
          { role: 'assistant', content: openingText },
        ];

        setTranscript([
          { speaker: 'examiner', text: openingText, timestamp: Date.now() },
        ]);

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
    [playTTS, speechRecognition, audioPlayer, streamAndSpeak]
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
