"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff, AlertTriangle } from "lucide-react";
import { Orb } from "@/components/voice/Orb";
import { TranscriptPanel } from "@/components/voice/TranscriptPanel";
import { useVoiceSession } from "@/lib/hooks/useVoiceSession";

const TICKET_NAMES: Record<string, string> = {
  "oow-unlimited": "OOW Unlimited",
  "oow-3000gt-yacht": "OOW <3000GT (Yacht)",
  "master-3000gt": "Master <3000GT",
  "master-unlimited": "Master Unlimited",
  "ym-offshore": "Yacht Master Offshore",
  "ym-ocean": "Yacht Master Ocean",
  "oow-nearcoastal": "OOW Near Coastal",
  "master-200gt": "Master <200GT",
  "master-500gt": "Master <500GT",
  "master-200gt-yacht": "Master <200GT Yacht",
  "master-500gt-yacht": "Master <500GT Yacht",
  "master-3000gt-yacht": "Master <3000GT Yacht",
  "mate-200gt-yacht": "Mate <200GT Yacht",
  "engineer-oow": "Engineer OOW",
  eto: "ETO",
};

const STATE_LABELS: Record<string, string> = {
  idle: "Ready to start",
  listening: "Listening...",
  processing: "Thinking...",
  speaking: "Speaking...",
};

interface StudentProfile {
  student: {
    id: string;
    full_name: string;
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

export default function SessionPage() {
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
    lastError,
  } = useVoiceSession();

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [micError, setMicError] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Load student profile
  useEffect(() => {
    fetch("/api/student")
      .then((res) => res.json())
      .then((data) => {
        if (data.student) setProfile(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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

  const ticketSlug = profile?.student?.ticket_type || "oow-unlimited";
  const ticketName = TICKET_NAMES[ticketSlug] || ticketSlug;

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStart = async () => {
    // Request mic permission
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      setMicError(true);
      return;
    }

    // Create session record in Supabase
    try {
      const res = await fetch("/api/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketType: ticketSlug }),
      });
      const data = await res.json();
      if (data.sessionId) setSessionId(data.sessionId);
    } catch (err) {
      console.error("Failed to create session:", err);
    }

    setHasStarted(true);
    startSession(ticketSlug);
  };

  const handleEnd = async () => {
    endSession();

    // End session in Supabase
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

    window.location.href = "/dashboard";
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-sm text-[#6B7280]">Loading...</p>
      </div>
    );
  }

  // Pre-start view (layout Header visible above this)
  if (!hasStarted) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] flex-col items-center justify-center bg-white px-6">
        <div className="mb-8">
          <Orb state="idle" />
        </div>

        {profile?.student?.full_name && (
          <p className="mb-2 text-[15px] text-[#6B7280]">
            Welcome{profile.student.total_sessions > 0 ? " back" : ""},{" "}
            {profile.student.full_name.split(" ")[0]}
          </p>
        )}

        <h1 className="text-2xl font-bold tracking-tight text-[#111111] sm:text-3xl">
          {ticketName}
        </h1>
        <p className="mt-2 max-w-md text-center text-[15px] leading-relaxed text-[#6B7280]">
          Your AI examiner will ask questions relevant to this certificate.
          Speak clearly and answer as you would in a real oral exam.
        </p>

        <span className="mt-4 inline-flex items-center rounded-full border border-[#E5E7EB] px-3 py-1 text-xs font-medium text-[#6B7280]">
          {ticketName}
        </span>

        {!browserSupported && (
          <div className="mt-6 flex max-w-md items-start gap-3 rounded-lg border border-[#FDE68A] bg-[#FEF3C7] px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#D97706]" />
            <p className="text-sm text-[#92400E]">
              Voice input requires Chrome or Edge. Please switch browsers for
              the full experience.
            </p>
          </div>
        )}

        {micError && (
          <div className="mt-6 flex max-w-md items-start gap-3 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#EF4444]" />
            <p className="text-sm text-[#991B1B]">
              Microphone access is required. Please allow microphone permissions
              and try again.
            </p>
          </div>
        )}

        <button
          onClick={handleStart}
          className="mt-8 flex items-center gap-2 rounded-full bg-[#2563EB] px-8 py-3 text-base font-semibold text-white transition-all hover:bg-[#1D4ED8] hover:shadow-lg active:scale-[0.98]"
        >
          <Mic className="h-5 w-5" />
          Begin Examination
        </button>
      </div>
    );
  }

  // Active session view — fixed overlay covers entire viewport including layout Header
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#E5E7EB] px-6">
        <span className="text-lg font-bold text-[#111111]">Echo</span>
        <span className="text-sm font-medium text-[#6B7280]">
          {ticketName}
        </span>
        <button
          onClick={handleEnd}
          className="inline-flex items-center gap-2 rounded-lg bg-[#EF4444] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#DC2626]"
        >
          <PhoneOff className="h-4 w-4" />
          End
        </button>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center">
        <Orb state={state} analyserNode={analyserNode} micLevel={micLevel} />
        <p className="mt-6 text-sm font-medium text-[#6B7280]">
          {STATE_LABELS[state]}
        </p>
        <p className="mt-2 font-mono text-sm tabular-nums text-[#9CA3AF]">
          {formatTime(elapsed)}
        </p>
        {lastError && (
          <div className="mt-4 flex max-w-md items-start gap-3 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#EF4444]" />
            <p className="text-sm text-[#991B1B]">{lastError}</p>
          </div>
        )}
      </main>

      <TranscriptPanel
        transcript={transcript}
        interimTranscript={interimTranscript}
      />

      <div className="flex h-20 shrink-0 items-center justify-center gap-4 border-t border-[#E5E7EB]">
        <button
          onClick={toggleMic}
          disabled={state === "processing" || state === "speaking"}
          className={`flex h-14 w-14 items-center justify-center rounded-full transition-all ${
            state === "listening"
              ? "bg-[#2563EB] text-white shadow-lg"
              : "border border-[#E5E7EB] bg-[#F7F8FA] text-[#6B7280]"
          } disabled:cursor-not-allowed disabled:opacity-40`}
        >
          {state === "listening" ? (
            <Mic className="h-6 w-6" />
          ) : (
            <MicOff className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  );
}
