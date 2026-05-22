'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Orb } from '@/components/voice/Orb';
import { VoiceControls } from '@/components/voice/VoiceControls';
import { TranscriptPanel } from '@/components/voice/TranscriptPanel';
import { useVoiceSession } from '@/lib/hooks/useVoiceSession';
import { getTicketName } from '@/lib/tickets';
import { getTopicName } from '@/lib/topics';
import { TopicPicker } from '@/components/topics/TopicPicker';
import { Button } from '@/components/ui/button';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StudentProfile {
  student: {
    id: string;
    full_name: string;
    email: string | null;
    ticket_type: string;
    total_sessions: number;
  };
}

interface DrillReport {
  overallScore: number;
  verdict: 'pass' | 'marginal' | 'refer';
  examinerJudgement: string;
  confidence: 'high' | 'medium' | 'low';
  keyMoments: Array<{
    question: string;
    studentResponse: string;
    verdict: string;
    verdictTone: 'good' | 'ok' | 'bad';
    modelAnswer: string;
  }>;
  topThreeDrills: Array<{
    topicSlug: string;
    topicName: string;
    reason: string;
  }>;
}

type DrillPhase = 'picking' | 'mode' | 'drilling' | 'ending' | 'report';
type DrillMode = 'examination' | 'bridge';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VERDICT_COLOURS: Record<string, string> = {
  pass: 'var(--color-success)',
  marginal: 'var(--color-warning)',
  refer: 'var(--color-danger)',
};

function formatTime(s: number) {
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function computeVerdict(score: number): 'pass' | 'marginal' | 'refer' {
  if (score >= 75) return 'pass';
  if (score >= 60) return 'marginal';
  return 'refer';
}

// ---------------------------------------------------------------------------
// Inner component
// ---------------------------------------------------------------------------

function DrillInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTopic = searchParams.get('topic');

  const {
    state,
    transcript,
    interimTranscript,
    startSession,
    endSession,
    pauseSession,
    resumeSession,
    toggleMic,
    interrupt,
    isMuted,
    isPaused,
    analyserNode,
    micLevel,
    browserSupported,
    lastError,
    questionsAskedInSection,
  } = useVoiceSession();

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<DrillPhase>(urlTopic ? 'mode' : 'picking');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(urlTopic);
  const [drillMode, setDrillMode] = useState<DrillMode>('examination');
  const [timeLeft, setTimeLeft] = useState(600);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [drillReport, setDrillReport] = useState<DrillReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [micError, setMicError] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasEndedRef = useRef(false);
  const transcriptRef = useRef(transcript);
  const sessionIdRef = useRef<string | null>(null);
  const timeLeftRef = useRef(600);

  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);
  useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);

  useEffect(() => {
    fetch('/api/student')
      .then((res) => res.json())
      .then((data) => { if (data.student) setProfile(data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const ticketSlug = profile?.student?.ticket_type || 'oow-unlimited';
  const ticketName = getTicketName(ticketSlug);
  const topicName = selectedTopic ? getTopicName(selectedTopic) : '';

  // Keyboard shortcuts during active drill
  useEffect(() => {
    if (phase !== 'drilling') return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "m" || e.key === "M") { toggleMic(); return; }
      if (e.key === "p" || e.key === "P") { isPaused ? resumeSession() : pauseSession(); return; }
      if (e.key === " ") { e.preventDefault(); interrupt(); return; }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, toggleMic, isPaused, resumeSession, pauseSession, interrupt]);

  // End drill
  const handleDrillEnd = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    endSession();
    setPhase('ending');

    const currentTranscript = transcriptRef.current;
    const currentSessionId = sessionIdRef.current;
    const duration = 600 - timeLeftRef.current;

    if (currentSessionId) {
      try {
        await fetch('/api/session/end', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: currentSessionId,
            durationSeconds: duration,
            transcript: currentTranscript,
          }),
        });
      } catch (err) {
        console.error('Failed to end drill session:', err);
      }
    }

    // For tutor drills, route to tutor summary
    if (drillMode === 'bridge') {
      sessionStorage.setItem('echo-bridge-transcript', JSON.stringify(currentTranscript));
      router.push('/tutor/summary?id=drill');
      return;
    }

    // For examiner drills, generate report
    setReportLoading(true);
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: currentTranscript, ticketType: ticketName }),
      });
      if (!res.ok) throw new Error(`Report failed (${res.status})`);
      const data = await res.json();
      setDrillReport(data);
    } catch (err) {
      console.error('Drill report error:', err);
      setReportError('Failed to generate report.');
    } finally {
      setReportLoading(false);
      setPhase('report');
    }
  }, [endSession, ticketName, drillMode, router]);

  const handleDrillEndRef = useRef(handleDrillEnd);
  useEffect(() => { handleDrillEndRef.current = handleDrillEnd; }, [handleDrillEnd]);

  // Timer
  useEffect(() => {
    if (phase !== 'drilling') return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (!hasEndedRef.current) {
            hasEndedRef.current = true;
            handleDrillEndRef.current();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  // Start drill
  const handleStart = async (mode?: DrillMode) => {
    if (!selectedTopic) return;
    const effectiveMode = mode || drillMode;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      setMicError(true);
      return;
    }

    setTimeLeft(600);
    hasEndedRef.current = false;
    setPhase('drilling');

    fetch('/api/session/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketType: ticketSlug, sessionType: 'drill' }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.sessionId) {
          setSessionId(data.sessionId);
          sessionIdRef.current = data.sessionId;
        }
      })
      .catch(console.error);

    const firstName = profile?.student?.full_name?.split(' ')[0];
    const totalSessions = profile?.student?.total_sessions || 0;
    startSession(ticketSlug, firstName, totalSessions, {
      drillTopic: selectedTopic,
      drillTopicName: topicName,
      ...(effectiveMode === 'bridge' ? { bridge: true } : {}),
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-foreground-muted" />
      </div>
    );
  }

  // Phase: Topic Picker
  if (phase === 'picking') {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-[720px] px-6 py-12">
          <Link
            href="/home"
            className="text-sm text-foreground-muted transition-colors hover:text-foreground"
          >
            ← Back to home
          </Link>

          <h1 className="mt-8 text-[30px] font-semibold text-foreground">
            Drill
          </h1>
          <p className="mt-2 text-sm text-foreground-soft">
            Pick a topic. Rapid-fire questions for 10 minutes.
          </p>
          <p className="mt-1 text-xs text-foreground-muted">{ticketName}</p>

          {!browserSupported && (
            <div className="mt-6 flex items-start gap-3 rounded-lg border border-border bg-surface px-4 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-foreground-muted" />
              <p className="text-sm text-foreground-muted">Voice input requires Chrome or Edge.</p>
            </div>
          )}
          {micError && (
            <div className="mt-4 flex items-start gap-3 rounded-lg border border-border bg-surface px-4 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
              <p className="text-sm text-danger">Microphone access is required.</p>
            </div>
          )}

          <div className="mt-8">
            <TopicPicker
              selected={selectedTopic}
              onSelect={(slug) => {
                setSelectedTopic(slug);
                setPhase('mode');
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Phase: Mode picker (Examiner vs Tutor)
  if (phase === 'mode') {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-[720px] px-6 py-12">
          <button
            onClick={() => { setSelectedTopic(null); setPhase('picking'); }}
            className="text-sm text-foreground-muted transition-colors hover:text-foreground"
          >
            ← Choose different topic
          </button>

          <h1 className="mt-8 text-[30px] font-semibold text-foreground">
            {topicName}
          </h1>
          <p className="mt-2 text-sm text-foreground-muted">
            10-minute drill · {ticketName}
          </p>

          <div className="mt-8">
            <h3 className="text-lg font-semibold text-foreground">Choose a mode</h3>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setDrillMode('examination')}
                className={`flex-1 rounded-xl border p-4 text-left transition-colors ${
                  drillMode === 'examination'
                    ? 'border-primary bg-surface-2'
                    : 'border-border hover:border-border-strong'
                }`}
              >
                <span className="text-[15px] font-medium text-foreground">Examiner</span>
                <p className="mt-1 text-sm text-foreground-soft">Terse, formal. Verdict at the end.</p>
              </button>
              <button
                onClick={() => setDrillMode('bridge')}
                className={`flex-1 rounded-xl border p-4 text-left transition-colors ${
                  drillMode === 'bridge'
                    ? 'border-primary bg-surface-2'
                    : 'border-border hover:border-border-strong'
                }`}
              >
                <span className="text-[15px] font-medium text-foreground">Tutor</span>
                <p className="mt-1 text-sm text-foreground-soft">Friendly, explains. No verdict.</p>
              </button>
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            <Button onClick={() => handleStart()}>
              Start drill
            </Button>
            <Button variant="outline" onClick={() => router.push('/home')}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Phase: Active Drill
  if (phase === 'drilling') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-6">
          <Link href="/home" className="text-base font-semibold text-foreground">Echo</Link>
          <span className="text-[13px] text-foreground-muted">
            {drillMode === 'bridge' ? 'Tutor' : 'Examiner'} · Drill · {topicName}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (!hasEndedRef.current) {
                hasEndedRef.current = true;
                handleDrillEnd();
              }
            }}
            className="text-danger border-danger hover:bg-danger/10"
          >
            End
          </Button>
        </header>

        <main className="relative flex flex-1 flex-col items-center justify-center">
          {/* Countdown timer */}
          <div className="absolute top-4 right-6">
            <span
              className={`text-2xl font-semibold tabular-nums ${
                timeLeft <= 60 ? 'text-danger' : 'text-foreground'
              }`}
            >
              {formatTime(timeLeft)}
            </span>
          </div>

          <Orb state={state} analyserNode={analyserNode} micLevel={micLevel} size={240} />
          <div className="mt-4">
            <VoiceControls
              state={state}
              isMuted={isMuted}
              isPaused={isPaused}
              onToggleMic={toggleMic}
              onTogglePause={() => (isPaused ? resumeSession() : pauseSession())}
              onInterrupt={interrupt}
            />
            <p className="mt-3 text-center text-xs text-foreground-muted">
              M Mute · P Pause · Space Interrupt
            </p>
          </div>
          {lastError && (
            <div className="mt-6 flex max-w-md items-start gap-3 rounded-lg border border-border bg-surface px-4 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
              <p className="text-sm text-danger">{lastError}</p>
            </div>
          )}
        </main>

        <TranscriptPanel transcript={transcript} interimTranscript={interimTranscript} />
      </div>
    );
  }

  // Phase: Ending / Loading
  if (phase === 'ending' || reportLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <Loader2 className="h-6 w-6 animate-spin text-foreground-muted" />
        <p className="mt-4 text-sm text-foreground-muted">
          Generating report...
        </p>
      </div>
    );
  }

  // Phase: Report Error
  if (reportError || !drillReport) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <AlertTriangle className="h-8 w-8 text-warning" />
        <p className="mt-4 text-[15px] text-foreground">
          {reportError || 'Something went wrong'}
        </p>
        <div className="mt-6">
          <Link href="/drill">
            <Button>Try again</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Phase: Drill Report
  const verdict = computeVerdict(drillReport.overallScore);
  const verdictColour = VERDICT_COLOURS[verdict];

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-[880px] space-y-8 px-6 py-12">
        {/* Verdict Banner */}
        <div className="flex items-center justify-between rounded-xl border border-border-strong bg-background p-6">
          <span
            className="rounded-full px-4 py-1.5 text-sm font-semibold uppercase tracking-wide text-white"
            style={{ backgroundColor: verdictColour }}
          >
            {verdict}
          </span>
          <p className="mx-6 flex-1 text-center text-[17px] font-medium text-foreground">
            {drillReport.examinerJudgement}
          </p>
          <div className="shrink-0 text-right">
            <span className="text-[32px] font-bold tabular-nums text-foreground">
              {drillReport.overallScore}{' '}
              <span className="text-[20px] font-normal text-foreground-muted">/ 100</span>
            </span>
            <p className="mt-1 text-xs text-foreground-muted">{topicName} drill</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3 pb-8">
          <Link href={`/drill?topic=${selectedTopic}`}>
            <Button>Drill again</Button>
          </Link>
          <Link href="/drill">
            <Button variant="outline">Different topic</Button>
          </Link>
          <Link href="/home">
            <Button variant="ghost">Back to home</Button>
          </Link>
        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page wrapper
// ---------------------------------------------------------------------------

export default function DrillPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-6 w-6 animate-spin text-foreground-muted" />
        </div>
      }
    >
      <DrillInner />
    </Suspense>
  );
}
