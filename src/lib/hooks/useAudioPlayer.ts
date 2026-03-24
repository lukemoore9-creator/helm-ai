'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

// ---------------------------------------------------------------------------
// Hook interface
// ---------------------------------------------------------------------------

interface UseAudioPlayerReturn {
  play: (text: string) => Promise<void>;
  stop: () => void;
  isPlaying: boolean;
  analyserNode: AnalyserNode | null;
}

// ---------------------------------------------------------------------------
// Hook implementation
// ---------------------------------------------------------------------------

export function useAudioPlayer(): UseAudioPlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // ------------------------------------------------------------------
  // Ensure AudioContext exists and is running
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
  // Play TTS audio
  // ------------------------------------------------------------------

  const play = useCallback(
    async (text: string): Promise<void> => {
      console.log('[AudioPlayer] play called, text length:', text.length);
      setIsPlaying(true);

      try {
        // 1. Fetch audio from TTS API
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
        console.log('[AudioPlayer] TTS audio received:', arrayBuf.byteLength, 'bytes');

        if (arrayBuf.byteLength < 100) {
          throw new Error(`TTS returned tiny audio (${arrayBuf.byteLength} bytes)`);
        }

        // 3. Decode audio via Web Audio API
        const ctx = await ensureAudioContext();
        const audioBuffer = await ctx.decodeAudioData(arrayBuf.slice(0));
        console.log('[AudioPlayer] Audio decoded:', audioBuffer.duration.toFixed(1), 'seconds');

        // 4. Create source -> analyser -> destination chain
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
            console.log('[AudioPlayer] Audio playback ended');
            sourceNodeRef.current = null;
            analyserRef.current = null;
            setAnalyserNode(null);
            setIsPlaying(false);
            resolve();
          };
          source.start(0);
          console.log('[AudioPlayer] Audio playback started');
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown TTS error';
        console.error('[AudioPlayer] TTS failed:', errorMsg);

        // Fallback: browser speechSynthesis
        return new Promise<void>((resolve) => {
          if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            console.log('[AudioPlayer] Falling back to browser speech synthesis');
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-GB';
            utterance.rate = 1;
            utterance.onend = () => {
              setIsPlaying(false);
              resolve();
            };
            utterance.onerror = () => {
              setIsPlaying(false);
              resolve();
            };
            window.speechSynthesis.speak(utterance);
          } else {
            setIsPlaying(false);
            resolve();
          }
        });
      }
    },
    [ensureAudioContext]
  );

  // ------------------------------------------------------------------
  // Stop playback
  // ------------------------------------------------------------------

  const stop = useCallback(() => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch {
        // already stopped
      }
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    analyserRef.current = null;
    setAnalyserNode(null);
    setIsPlaying(false);
  }, []);

  // ------------------------------------------------------------------
  // Cleanup on unmount
  // ------------------------------------------------------------------

  useEffect(() => {
    return () => {
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
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // ------------------------------------------------------------------
  // Public: pre-warm AudioContext (call on user gesture)
  // ------------------------------------------------------------------

  const warmUp = useCallback(async (): Promise<void> => {
    await ensureAudioContext();
  }, [ensureAudioContext]);

  // Expose ensureAudioContext via play's first call or explicitly
  // The parent hook can call play() which internally ensures context.
  // For pre-warming on user gesture, we attach it to the returned object.
  const returnValue: UseAudioPlayerReturn & { warmUp: () => Promise<void> } = {
    play,
    stop,
    isPlaying,
    analyserNode,
    warmUp,
  };

  return returnValue;
}
