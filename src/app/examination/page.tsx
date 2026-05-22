"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ChevronUp, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Orb } from "@/components/voice/Orb";
import { VoiceControls } from "@/components/voice/VoiceControls";
import { TranscriptPanel } from "@/components/voice/TranscriptPanel";
import { useVoiceSession } from "@/lib/hooks/useVoiceSession";
import { getTicketName } from "@/lib/tickets";
import { isBetaUser } from "@/lib/beta-access";
import { getStructureForTicket } from "@/lib/exam-structure";
import { Button } from "@/components/ui/button";

interface StudentProfile {
  student: {
    id: string;
    full_name: string;
    email: string | null;
    ticket_type: string;
    exam_date: string | null;
    has_exam_date: boolean;
    total_sessions: number;
    overall_readiness: number;
  };
  lastSession: {
    topics_covered: string[];
    ai_summary: string;
    weak_areas: string[];
    strong_areas: string[];
  } | null;
  weakAreas: string[];
  strongAreas: string[];
}

export default function ExaminationPage() {
  const router = useRouter();
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
    currentSectionIndex,
    questionsAskedInSection,
  } = useVoiceSession();

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [micError, setMicError] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    fetch("/api/student")
      .then((res) => res.json())
      .then((data) => {
        if (data.student) setProfile(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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

  const ticketSlug = profile?.student?.ticket_type || "oow-unlimited";
  const ticketName = getTicketName(ticketSlug);
  const examStructure = getStructureForTicket(ticketSlug);
  const totalQuestions = examStructure.reduce((a, s) => a + s.questionCount, 0);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStart = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      setMicError(true);
      return;
    }

    fetch("/api/session/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketType: ticketSlug, sessionType: "examination" }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.sessionId) setSessionId(data.sessionId);
      })
      .catch((err) => console.error("Failed to create session:", err));

    setHasStarted(true);
    const firstName = profile?.student?.full_name?.split(" ")[0];
    const totalSessions = profile?.student?.total_sessions || 0;
    startSession(ticketSlug, firstName, totalSessions);
  }, [ticketSlug, profile, startSession]);

  // Keyboard shortcuts during active session
  useEffect(() => {
    if (!hasStarted) return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "m" || e.key === "M") { toggleMic(); return; }
      if (e.key === "p" || e.key === "P") { isPaused ? resumeSession() : pauseSession(); return; }
      if (e.key === " ") { e.preventDefault(); interrupt(); return; }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [hasStarted, toggleMic, isPaused, resumeSession, pauseSession, interrupt]);

  const handleEnd = useCallback(async () => {
    if (transcript.length > 0) {
      sessionStorage.setItem("echo-transcript", JSON.stringify(transcript));
    }

    endSession();

    if (sessionId) {
      try {
        await fetch("/api/session/end", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            durationSeconds: elapsed,
            transcript,
          }),
        });
      } catch (err) {
        console.error("Failed to end session:", err);
      }
    }

    router.push(`/report?ticket=${ticketSlug}`);
  }, [endSession, sessionId, elapsed, transcript, router, ticketSlug]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-foreground-muted">Loading...</p>
      </div>
    );
  }

  // Beta access gate
  if (profile && !isBetaUser(profile.student.email)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <h1 className="text-2xl font-semibold text-foreground">Echo</h1>
        <p className="mt-4 text-lg font-semibold text-foreground">Private Beta</p>
        <p className="mt-3 max-w-md text-center text-[15px] text-foreground-muted">
          Echo is currently in private beta. We&apos;ll be opening up soon.
        </p>
      </div>
    );
  }

  // Active session view
  if (hasStarted) {
    const currentSection = examStructure[currentSectionIndex] || examStructure[examStructure.length - 1];
    const lastExaminerMessage = [...transcript].reverse().find((t) => t.speaker === "examiner");

    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        {/* In-session header */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-6">
          <Link href="/home" className="text-base font-semibold text-foreground">Echo</Link>
          <span className="text-[13px] text-foreground-muted">
            {ticketName} · Section {currentSectionIndex + 1} of {examStructure.length} · {currentSection?.name}
          </span>
          <Button variant="outline" size="sm" onClick={handleEnd} className="text-danger border-danger hover:bg-danger/10">
            End
          </Button>
        </header>

        {/* Centre -- Orb + question */}
        <main className="flex flex-1 flex-col items-center justify-center px-6">
          {lastError && (
            <div className="mb-6 flex max-w-md items-start gap-3 rounded-lg border border-border bg-surface px-4 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
              <p className="text-sm text-danger">{lastError}</p>
            </div>
          )}

          <Orb state={state} analyserNode={analyserNode} micLevel={micLevel} size={240} />

          <div className="mt-6">
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

          <p className="mt-6 max-w-[560px] text-center text-[22px] font-medium text-foreground">
            {lastExaminerMessage?.text || "Echo is preparing your first question…"}
          </p>

          {state === "listening" && (
            <p className="mt-4 text-xs text-foreground-muted">Listening</p>
          )}
        </main>

        {/* Transcript drawer */}
        <AnimatePresence>
          {transcriptOpen && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
              className="absolute inset-x-0 bottom-12 z-40 border-t border-border bg-background"
              style={{ maxHeight: "50vh" }}
            >
              <TranscriptPanel transcript={transcript} interimTranscript={interimTranscript} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <footer className="flex h-12 shrink-0 items-center justify-between border-t border-border px-6">
          <span className="text-[13px] tabular-nums text-foreground-muted">
            {formatTime(elapsed)}
          </span>
          <span className="text-[13px] text-foreground-muted">
            Section {currentSectionIndex + 1}/{examStructure.length}
          </span>
          <button
            onClick={() => setTranscriptOpen((prev) => !prev)}
            className="flex items-center gap-1 text-xs font-medium text-foreground-muted transition-colors hover:text-foreground"
          >
            Transcript
            {transcriptOpen ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronUp className="h-3 w-3" />
            )}
          </button>
        </footer>
      </div>
    );
  }

  // Pre-session view
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
          Start exam
        </h1>
        <p className="mt-2 text-sm text-foreground-muted">
          {ticketName} · {totalQuestions} questions · ~25 minutes
        </p>

        {/* Warnings */}
        {!browserSupported && (
          <div className="mt-6 flex items-start gap-3 rounded-lg border border-border bg-surface px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-foreground-muted" />
            <p className="text-sm text-foreground-muted">
              Voice input requires Chrome or Edge. Please switch browsers for the full experience.
            </p>
          </div>
        )}

        {micError && (
          <div className="mt-4 flex items-start gap-3 rounded-lg border border-border bg-surface px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
            <p className="text-sm text-danger">
              Microphone access is required. Please allow microphone permissions and try again.
            </p>
          </div>
        )}

        {lastError && (
          <div className="mt-4 flex items-start gap-3 rounded-lg border border-border bg-surface px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
            <p className="text-sm text-danger">{lastError}</p>
          </div>
        )}

        {/* Syllabus card */}
        <div className="mt-8 rounded-xl border border-border bg-background p-6">
          <h3 className="text-lg font-semibold text-foreground">
            What you&apos;ll be tested on
          </h3>
          <div className="mt-4">
            {examStructure.map((section, i) => (
              <div
                key={section.id}
                className={`flex items-center justify-between py-3 ${
                  i < examStructure.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <span className="text-[15px] text-foreground">{section.name}</span>
                <span className="text-[13px] text-foreground-muted">
                  {section.questionCount} questions
                </span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[13px] text-foreground-muted">
            You&apos;ll be graded at the end with a verdict and detailed feedback.
          </p>
        </div>

        {/* Actions */}
        <div className="mt-8 flex gap-3">
          <Button onClick={handleStart}>Start exam</Button>
          <Button variant="outline" onClick={() => router.push("/home")}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
