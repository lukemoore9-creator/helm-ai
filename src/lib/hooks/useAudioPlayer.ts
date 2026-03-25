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
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

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
  // Cleanup audio element and blob URL
  // ------------------------------------------------------------------

  const cleanupAudio = useCallback(() => {
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.removeAttribute('src');
      audioElRef.current.load();
      audioElRef.current = null;
    }
    if (sourceRef.current) {
      try {
        sourceRef.current.disconnect();
      } catch {
        // already disconnected
      }
      sourceRef.current = null;
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    analyserRef.current = null;
    setAnalyserNode(null);
  }, []);

  // ------------------------------------------------------------------
  // Play TTS audio
  // ------------------------------------------------------------------

  const play = useCallback(
    async (text: string): Promise<void> => {
      console.log('[AudioPlayer] play called, text length:', text.length);
      setIsPlaying(true);

      try {
        // 1. Fetch audio from TTS API (streaming response)
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

        // 2. Collect response into a blob
        const blob = await res.blob();
        console.log('[AudioPlayer] TTS audio received:', blob.size, 'bytes');

        if (blob.size < 100) {
          throw new Error(`TTS returned tiny audio (${blob.size} bytes)`);
        }

        // 3. Create blob URL and HTML Audio element
        const blobUrl = URL.createObjectURL(blob);
        blobUrlRef.current = blobUrl;

        const audioEl = new Audio(blobUrl);
        audioElRef.current = audioEl;

        // 4. Connect to Web Audio API for AnalyserNode (orb animation)
        const ctx = await ensureAudioContext();
        const source = ctx.createMediaElementSource(audioEl);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;

        source.connect(analyser);
        analyser.connect(ctx.destination);

        sourceRef.current = source;
        analyserRef.current = analyser;
        setAnalyserNode(analyser);

        // 5. Play and wait for completion
        return new Promise<void>((resolve, reject) => {
          audioEl.onended = () => {
            console.log('[AudioPlayer] Audio playback ended');
            cleanupAudio();
            setIsPlaying(false);
            resolve();
          };
          audioEl.onerror = () => {
            console.error('[AudioPlayer] Audio element error');
            cleanupAudio();
            setIsPlaying(false);
            reject(new Error('Audio playback failed'));
          };
          audioEl.play().catch((err) => {
            console.error('[AudioPlayer] Play failed:', err);
            cleanupAudio();
            setIsPlaying(false);
            reject(err);
          });
          console.log('[AudioPlayer] Audio playback started');
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown TTS error';
        console.error('[AudioPlayer] TTS failed:', errorMsg);

        cleanupAudio();

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
    [ensureAudioContext, cleanupAudio]
  );

  // ------------------------------------------------------------------
  // Stop playback
  // ------------------------------------------------------------------

  const stop = useCallback(() => {
    cleanupAudio();

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    setIsPlaying(false);
  }, [cleanupAudio]);

  // ------------------------------------------------------------------
  // Cleanup on unmount
  // ------------------------------------------------------------------

  useEffect(() => {
    return () => {
      cleanupAudio();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [cleanupAudio]);

  // ------------------------------------------------------------------
  // Public: pre-warm AudioContext (call on user gesture)
  // ------------------------------------------------------------------

  const warmUp = useCallback(async (): Promise<void> => {
    await ensureAudioContext();
  }, [ensureAudioContext]);

  const returnValue: UseAudioPlayerReturn & { warmUp: () => Promise<void> } = {
    play,
    stop,
    isPlaying,
    analyserNode,
    warmUp,
  };

  return returnValue;
}
