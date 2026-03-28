"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Mic, MicOff, PhoneOff, AlertTriangle, Check, Flag } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { Orb } from "@/components/voice/Orb";
import { useVoiceSession } from "@/lib/hooks/useVoiceSession";
import { isBetaUser } from "@/lib/beta-access";
import { Button } from "@/components/ui/button";
import { ticketDisplayName } from "@/lib/utils";
import type { TranscriptEntry } from "@/lib/types";

const STATE_LABELS: Record<string, string> = {
  idle: "Ready to start",
  listening: "Listening...",
  processing: "Thinking...",
  speaking: "Speaking...",
};

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

interface StudentProfile {
  student: {
    id: string;
    full_name: string;
    email: string | null;
    ticket_type: string;
  };
}

// ---------------------------------------------------------------------------
// Correction form inline component
// ---------------------------------------------------------------------------

function CorrectionButtons({
  entry,
  ticketType,
  onSaved,
  onPause,
}: {
  entry: TranscriptEntry;
  ticketType: string;
  onSaved: () => void;
  onPause?: () => void;
}) {
  const [mode, setMode] = useState<"idle" | "correct" | "flag">("idle");
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "flagged">("idle");

  const submit = useCallback(
    async (type: "correction" | "flag") => {
      setStatus("saving");
      try {
        await fetch("/api/trainer/correction", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            examinerSaid: entry.text,
            correctionType: type,
            correction: type === "correction" ? text : undefined,
            flagReason: type === "flag" ? text : undefined,
            ticketType,
          }),
        });
        setStatus(type === "correction" ? "saved" : "flagged");
        setTimeout(() => {
          setStatus("idle");
          setMode("idle");
          setText("");
          onSaved();
        }, 2000);
      } catch {
        setStatus("idle");
      }
    },
    [entry.text, text, ticketType, onSaved]
  );

  if (status === "saved") {
    return (
      <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#16A34A]">
        <Check className="h-3 w-3" /> Saved
      </span>
    );
  }
  if (status === "flagged") {
    return (
      <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#EF4444]">
        <Flag className="h-3 w-3" /> Flagged
      </span>
    );
  }

  if (mode === "idle") {
    return (
      <div className="mt-2 flex gap-2">
        <button
          onClick={() => { onPause?.(); setMode("correct"); }}
          className="inline-flex items-center gap-1 rounded border border-[#2563EB] px-2 py-1 text-xs font-medium text-[#2563EB] hover:bg-[#EFF6FF] transition-colors"
        >
          <Check className="h-3 w-3" /> Correct
        </button>
        <button
          onClick={() => { onPause?.(); setMode("flag"); }}
          className="inline-flex items-center gap-1 rounded border border-[#EF4444] px-2 py-1 text-xs font-medium text-[#EF4444] hover:bg-[#FEF2F2] transition-colors"
        >
          <Flag className="h-3 w-3" /> Flag
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={mode === "correct" ? "What should the examiner say instead?" : "What's wrong with this?"}
        className="w-full rounded border border-[#E5E7EB] px-3 py-2 text-sm text-[#111111] placeholder:text-[#9CA3AF] focus:border-[#2563EB] focus:outline-none"
        rows={2}
        autoFocus
      />
      <div className="flex gap-2">
        <button
          onClick={() => submit(mode === "correct" ? "correction" : "flag")}
          disabled={!text.trim() || status === "saving"}
          className={`rounded px-3 py-1 text-xs font-medium text-white transition-colors disabled:opacity-40 ${
            mode === "correct" ? "bg-[#2563EB] hover:bg-[#1D4ED8]" : "bg-[#EF4444] hover:bg-[#DC2626]"
          }`}
        >
          {status === "saving" ? "Saving..." : mode === "correct" ? "Save Correction" : "Save Flag"}
        </button>
        <button
          onClick={() => { setMode("idle"); setText(""); onSaved(); }}
          className="rounded px-3 py-1 text-xs font-medium text-[#6B7280] hover:text-[#111111]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trainer transcript panel with correction buttons
// ---------------------------------------------------------------------------

function TrainerTranscriptPanel({
  transcript,
  interimTranscript,
  ticketType,
  onPause,
  onCorrectionDone,
}: {
  transcript: TranscriptEntry[];
  interimTranscript: string;
  ticketType: string;
  onPause?: () => void;
  onCorrectionDone?: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript, interimTranscript]);

  return (
    <div
      ref={scrollRef}
      className="overflow-y-auto border-t border-[#E5E7EB]"
      style={{ maxHeight: 320, scrollbarWidth: "thin", scrollbarColor: "#D1D5DB transparent" }}
    >
      <div className="mx-auto max-w-2xl space-y-4 px-6 py-5">
        {transcript.length === 0 && !interimTranscript && (
          <p className="py-6 text-center text-sm text-[#9CA3AF]">
            Your conversation will appear here...
          </p>
        )}

        {transcript.map((msg, index) => {
          const isExaminer = msg.speaker === "examiner";
          return (
            <div
              key={`${msg.timestamp}-${index}`}
              className={`rounded-lg px-4 py-3 ${isExaminer ? "bg-[#F7F8FA]" : "bg-white"}`}
            >
              <span className={`mb-1 block text-xs font-medium ${isExaminer ? "text-[#111111]" : "text-[#6B7280]"}`}>
                {isExaminer ? "Examiner" : "You"}
              </span>
              <p className={`text-[15px] leading-[1.6] ${isExaminer ? "text-[#111111]" : "text-[#374151]"}`}>
                {msg.text}
              </p>
              {isExaminer && (
                <CorrectionButtons entry={msg} ticketType={ticketType} onSaved={() => onCorrectionDone?.()} onPause={onPause} />
              )}
            </div>
          );
        })}

        {interimTranscript && (
          <div className="rounded-lg bg-white px-4 py-3">
            <span className="mb-1 block text-xs font-medium text-[#9CA3AF]">You</span>
            <p className="text-[15px] leading-[1.6] italic text-[#9CA3AF]">{interimTranscript}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main trainer page
// ---------------------------------------------------------------------------

export default function TrainerPage() {
  const { user } = useUser();
  const {
    state,
    transcript,
    interimTranscript,
    startSession,
    endSession,
    pauseSession,
    resumeSession,
    setTicketType,
    setAiMode: setAiModeHook,
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
  const [sessionPaused, setSessionPaused] = useState(false);
  const [currentTicket, setCurrentTicket] = useState("oow-unlimited");
  const [aiMode, setAiMode] = useState<'trainer' | 'tutor' | 'examiner'>('trainer');
  const startTimeRef = useRef<number | null>(null);

  // Default trainer page to trainer AI mode
  useEffect(() => { setAiModeHook('trainer'); }, [setAiModeHook]);

  useEffect(() => {
    fetch("/api/student")
      .then((res) => res.json())
      .then((data) => {
        if (data.student) {
          setProfile(data);
          setCurrentTicket(data.student.ticket_type || "oow-unlimited");
        }
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
  const ticketName = ticketDisplayName(ticketSlug);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStart = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      setMicError(true);
      return;
    }
    setHasStarted(true);
    startSession(currentTicket);
  };

  const handleEnd = () => {
    endSession();
    window.location.href = "/dashboard";
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-sm text-[#6B7280]">Loading...</p>
      </div>
    );
  }

  // Access gate
  const email = user?.emailAddresses?.[0]?.emailAddress;
  if (!isBetaUser(email)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
        <h1 className="text-xl font-bold text-[#111111]">Access Denied</h1>
        <p className="mt-3 text-[15px] text-[#6B7280]">Trainer mode is restricted.</p>
      </div>
    );
  }

  // Pre-start view
  if (!hasStarted) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] flex-col items-center justify-center bg-white px-6">
        <div className="mb-8">
          <Orb state="idle" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-[#111111]">
          Trainer Mode
        </h1>
        <p className="mt-3 max-w-md text-center text-[15px] leading-relaxed text-[#6B7280]">
          Run a session and correct or flag examiner responses. Your corrections feed back into the AI.
        </p>

        <span className="mt-5 inline-flex items-center rounded-full border border-[#E5E7EB] px-3 py-1 text-xs font-medium text-[#6B7280]">
          {ticketName}
        </span>

        {!browserSupported && (
          <div className="mt-8 flex max-w-md items-start gap-3 rounded-lg border border-[#FDE68A] bg-[#FEF3C7] px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#D97706]" />
            <p className="text-sm text-[#92400E]">Voice input requires Chrome or Edge.</p>
          </div>
        )}

        {micError && (
          <div className="mt-8 flex max-w-md items-start gap-3 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#EF4444]" />
            <p className="text-sm text-[#991B1B]">Microphone access is required.</p>
          </div>
        )}

        <Button
          onClick={handleStart}
          className="mt-10 h-[44px] gap-2 rounded-lg bg-[#2563EB] px-8 text-[15px] font-semibold text-white hover:bg-[#1D4ED8] active:scale-[0.98]"
        >
          <Mic className="h-5 w-5" />
          Start Trainer Session
        </Button>
      </div>
    );
  }

  // Active session
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#E5E7EB] px-6">
        <span className="text-lg font-bold tracking-tight text-[#111111]">
          Echo <span className="text-sm font-normal text-[#6B7280]">Trainer</span>
        </span>
        <select
          value={currentTicket}
          onChange={(e) => {
            setCurrentTicket(e.target.value);
            setTicketType(e.target.value);
          }}
          className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-sm font-medium text-[#6B7280] focus:border-[#2563EB] focus:outline-none"
        >
          {Object.entries(TICKET_NAMES).map(([slug, name]) => (
            <option key={slug} value={slug}>{name}</option>
          ))}
        </select>
        <Button
          onClick={handleEnd}
          variant="destructive"
          className="h-9 gap-2 rounded-lg bg-[#EF4444] px-4 text-sm font-medium text-white hover:bg-[#DC2626]"
        >
          <PhoneOff className="h-4 w-4" />
          End
        </Button>
      </header>

      {/* ── Mode selector ── */}
      <div className="flex h-10 shrink-0 items-center justify-center gap-1 border-b border-[#E5E7EB]">
        {(['trainer', 'tutor', 'examiner'] as const).map((m) => (
          <button
            key={m}
            onClick={() => { setAiMode(m); setAiModeHook(m); }}
            className={`rounded-full px-4 py-1 text-xs font-medium transition-colors ${
              aiMode === m
                ? 'bg-[#2563EB] text-white'
                : 'border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F7F8FA]'
            }`}
          >
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>

      <main className="flex flex-1 flex-col items-center justify-center">
        <Orb state={sessionPaused ? "idle" : state} analyserNode={analyserNode} micLevel={micLevel} />
        <p className="mt-8 text-sm text-[#6B7280]">
          {sessionPaused ? "Session paused — submit your correction to continue" : STATE_LABELS[state]}
        </p>
        <p className="mt-2 font-mono text-sm tabular-nums text-[#9CA3AF]">{formatTime(elapsed)}</p>
        {lastError && (
          <div className="mt-6 flex max-w-md items-start gap-3 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#EF4444]" />
            <p className="text-sm text-[#991B1B]">{lastError}</p>
          </div>
        )}
      </main>

      <TrainerTranscriptPanel
        transcript={transcript}
        interimTranscript={interimTranscript}
        ticketType={currentTicket}
        onPause={() => { pauseSession(); setSessionPaused(true); }}
        onCorrectionDone={() => {}}
      />

      {sessionPaused ? (
        <div className="flex shrink-0 items-center justify-center border-t border-[#E5E7EB] px-6 py-4">
          <Button
            onClick={() => { setSessionPaused(false); resumeSession(); }}
            className="h-[44px] w-full max-w-md gap-2 rounded-lg bg-[#2563EB] text-[15px] font-semibold text-white hover:bg-[#1D4ED8] active:scale-[0.98]"
          >
            Continue Session
          </Button>
        </div>
      ) : (
        <div className="flex h-20 shrink-0 items-center justify-center border-t border-[#E5E7EB]">
          <button
            onClick={toggleMic}
            disabled={state === "processing" || state === "speaking"}
            className={`flex h-14 w-14 items-center justify-center rounded-full transition-all ${
              state === "listening"
                ? "bg-[#2563EB] text-white shadow-lg shadow-[#2563EB]/25"
                : "border border-[#E5E7EB] bg-white text-[#6B7280] hover:bg-[#F7F8FA]"
            } disabled:cursor-not-allowed disabled:opacity-40`}
          >
            {state === "listening" ? <Mic className="h-6 w-6" /> : <MicOff className="h-5 w-5" />}
          </button>
        </div>
      )}
    </div>
  );
}
