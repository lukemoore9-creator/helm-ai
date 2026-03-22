'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { Mic, MicOff, PhoneOff, AlertTriangle, FileText } from 'lucide-react';
import Link from 'next/link';
import { Orb } from '@/components/voice/Orb';
import { TranscriptPanel } from '@/components/voice/TranscriptPanel';
import { useVoiceSession } from '@/hooks/useVoiceSession';

// ---------------------------------------------------------------------------
// Ticket name lookup (hardcoded, no DB)
// ---------------------------------------------------------------------------

const TICKET_NAMES: Record<string, string> = {
  'oow-unlimited': 'OOW Unlimited',
  'oow-nearcoastal': 'OOW Near Coastal',
  'master-200gt': 'Master <200GT',
  'master-500gt': 'Master <500GT',
  'master-3000gt': 'Master <3000GT',
  'master-unlimited': 'Master Unlimited',
  'ym-offshore': 'Yacht Master Offshore',
  'ym-ocean': 'Yacht Master Ocean',
  'mate-200gt-yacht': 'Mate <200GT Yacht',
  'master-200gt-yacht': 'Master <200GT Yacht',
  'master-500gt-yacht': 'Master <500GT Yacht',
  'master-3000gt-yacht': 'Master <3000GT Yacht',
  'engineer-oow': 'Engineer OOW',
  'eto': 'ETO',
};

// ---------------------------------------------------------------------------
// State labels
// ---------------------------------------------------------------------------

const STATE_LABELS: Record<string, string> = {
  idle: 'Ready',
  listening: 'Listening...',
  processing: 'Thinking...',
  speaking: 'Speaking...',
};

// ---------------------------------------------------------------------------
// Session Inner (wrapped in Suspense for useSearchParams)
// ---------------------------------------------------------------------------

function SessionInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const ticketSlug = searchParams.get('ticket') || 'oow-unlimited';
  const ticketName = TICKET_NAMES[ticketSlug] || ticketSlug;

  const {
    state,
    transcript,
    interimTranscript,
    startSession,
    endSession,
    toggleMic,
    analyserNode,
    micLevel,
    browserSupported,
  } = useVoiceSession();

  const [hasStarted, setHasStarted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [micError, setMicError] = useState(false);
  const startTimeRef = useRef<number | null>(null);

  // Timer
  useEffect(() => {
    if (!hasStarted) return;
    startTimeRef.current = Date.now();
    const interval = setInterval(() => {
      if (startTimeRef.current) {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [hasStarted]);

  // Store transcript to sessionStorage for the report page
  useEffect(() => {
    if (transcript.length > 0) {
      sessionStorage.setItem('helm-transcript', JSON.stringify(transcript));
    }
  }, [transcript]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = async () => {
    // Request microphone permission early so the user sees the prompt
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Release immediately — the voice hook will request again when needed
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      setMicError(true);
      return;
    }

    setHasStarted(true);
    startSession(ticketSlug);
  };

  const handleEnd = () => {
    endSession();
    // Navigate to report page (transcript is already in sessionStorage)
    router.push(`/report?ticket=${ticketSlug}`);
  };

  // ── Pre-start view ──
  if (!hasStarted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
        {/* Idle orb preview */}
        <div className="mb-8">
          <Orb state="idle" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-[#111111] sm:text-3xl">
          {ticketName}
        </h1>
        <p className="mt-2 max-w-md text-center text-[15px] leading-relaxed text-[#6B7280]">
          Your AI examiner will ask questions relevant to this certificate.
          Speak clearly and answer as you would in a real oral exam.
        </p>

        {/* Browser not supported warning */}
        {!browserSupported && (
          <div className="mt-6 flex max-w-md items-start gap-3 rounded-lg border border-[#FDE68A] bg-[#FEF3C7] px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#D97706]" />
            <p className="text-sm text-[#92400E]">
              Voice input requires Chrome or Edge. Please switch browsers for the full experience.
            </p>
          </div>
        )}

        {/* Mic permission denied warning */}
        {micError && (
          <div className="mt-6 flex max-w-md items-start gap-3 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#EF4444]" />
            <p className="text-sm text-[#991B1B]">
              Microphone access is required. Please allow microphone permissions and try again.
            </p>
          </div>
        )}

        {/* Begin button */}
        <button
          onClick={handleStart}
          className="mt-8 flex items-center gap-2 rounded-full bg-[#2563EB] px-8 py-3 text-base font-semibold text-white transition-all hover:bg-[#1D4ED8] hover:shadow-lg active:scale-[0.98]"
        >
          <Mic className="h-5 w-5" />
          Begin Examination
        </button>

        <Link
          href="/select"
          className="mt-4 text-sm text-[#6B7280] transition-colors hover:text-[#111111]"
        >
          Choose a different exam
        </Link>
      </div>
    );
  }

  // ── Active session view ──
  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* ── Top bar ── */}
      <header className="flex h-14 items-center justify-between border-b border-[#E5E7EB] px-6">
        <span className="font-bold text-[#111111]">Helm AI</span>
        <span className="text-sm font-medium text-[#6B7280]">{ticketName}</span>
        <button
          onClick={handleEnd}
          className="inline-flex items-center gap-2 rounded-lg bg-[#EF4444] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#DC2626]"
        >
          <PhoneOff className="h-4 w-4" />
          End
        </button>
      </header>

      {/* ── Main area ── */}
      <main className="flex flex-1 flex-col items-center justify-center">
        <Orb
          state={state}
          analyserNode={analyserNode}
          micLevel={micLevel}
        />

        {/* State label */}
        <p className="mt-6 text-sm font-medium text-[#6B7280]">
          {STATE_LABELS[state]}
        </p>

        {/* Timer */}
        <p className="mt-2 font-mono text-sm tabular-nums text-[#9CA3AF]">
          {formatTime(elapsed)}
        </p>
      </main>

      {/* ── Transcript panel ── */}
      <TranscriptPanel
        transcript={transcript}
        interimTranscript={interimTranscript}
      />

      {/* ── Bottom control bar ── */}
      <div className="flex h-20 items-center justify-center gap-4 border-t border-[#E5E7EB]">
        {/* Mic button */}
        <button
          onClick={toggleMic}
          disabled={state === 'processing' || state === 'speaking'}
          className={`flex h-14 w-14 items-center justify-center rounded-full transition-all ${
            state === 'listening'
              ? 'bg-[#2563EB] text-white shadow-lg'
              : 'border border-[#E5E7EB] bg-[#F7F8FA] text-[#6B7280]'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {state === 'listening' ? (
            <Mic className="h-6 w-6" />
          ) : (
            <MicOff className="h-5 w-5" />
          )}
        </button>

        {/* Report button (always visible during session) */}
        <button
          onClick={handleEnd}
          className="flex h-14 items-center gap-2 rounded-full border border-[#E5E7EB] bg-[#F7F8FA] px-5 text-sm font-medium text-[#6B7280] transition-all hover:border-[#D1D5DB] hover:text-[#111111]"
        >
          <FileText className="h-4 w-4" />
          Get Report
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page wrapper with Suspense (required for useSearchParams in Next.js)
// ---------------------------------------------------------------------------

export default function SessionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white">
          <p className="text-sm text-[#6B7280]">Loading...</p>
        </div>
      }
    >
      <SessionInner />
    </Suspense>
  );
}
