"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Mic, MicOff, PhoneOff, AlertTriangle, Check, Flag } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { Orb } from "@/components/voice/Orb";
import { useVoiceSession } from "@/lib/hooks/useVoiceSession";
import { Button } from "@/components/ui/button";
import { TRAINER_TICKETS, getTicketName } from "@/lib/tickets";
import { isTrainer } from "@/lib/access";
import type { TranscriptEntry } from "@/lib/types";

const STATE_LABELS: Record<string, string> = {
  idle: "Standing by",
  listening: "Listening",
  processing: "",
  speaking: "",
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
      <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-success">
        <Check className="h-3 w-3" /> Saved
      </span>
    );
  }
  if (status === "flagged") {
    return (
      <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-danger">
        <Flag className="h-3 w-3" /> Flagged
      </span>
    );
  }

  if (mode === "idle") {
    return (
      <div className="mt-2 flex gap-2">
        <Button
          variant="outline"
          size="xs"
          onClick={() => { onPause?.(); setMode("correct"); }}
          className="gap-1 text-success border-success"
        >
          <Check className="h-3 w-3" /> Correct
        </Button>
        <Button
          variant="outline"
          size="xs"
          onClick={() => { onPause?.(); setMode("flag"); }}
          className="gap-1 text-danger border-danger"
        >
          <Flag className="h-3 w-3" /> Flag
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={mode === "correct" ? "What should the examiner say instead?" : "What's wrong with this?"}
        className="w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:border-accent focus:outline-none"
        rows={2}
        autoFocus
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => submit(mode === "correct" ? "correction" : "flag")}
          disabled={!text.trim() || status === "saving"}
        >
          {status === "saving" ? "Saving..." : "Save"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { setMode("idle"); setText(""); onSaved(); }}
        >
          Cancel
        </Button>
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
      className="overflow-y-auto border-t border-border"
      style={{ maxHeight: 320 }}
    >
      <div className="mx-auto max-w-2xl space-y-4 px-6 py-5">
        {transcript.length === 0 && !interimTranscript && (
          <p className="py-6 text-center text-sm text-foreground-muted">
            Your conversation will appear here...
          </p>
        )}

        {transcript.map((msg, index) => {
          const isExaminer = msg.speaker === "examiner";
          return (
            <div
              key={`${msg.timestamp}-${index}`}
              className={`rounded-lg px-4 py-3 ${isExaminer ? "bg-surface" : "bg-background"}`}
            >
              <span className={`mb-1 block text-xs font-medium ${isExaminer ? "text-foreground" : "text-foreground-muted"}`}>
                {isExaminer ? "Echo" : "You"}
              </span>
              <p className={`text-[15px] leading-relaxed ${isExaminer ? "text-foreground" : "text-foreground-soft"}`}>
                {msg.text}
              </p>
              {isExaminer && (
                <CorrectionButtons entry={msg} ticketType={ticketType} onSaved={() => onCorrectionDone?.()} onPause={onPause} />
              )}
            </div>
          );
        })}

        {interimTranscript && (
          <div className="rounded-lg bg-background px-4 py-3">
            <span className="mb-1 block text-xs font-medium text-foreground-muted">You</span>
            <p className="text-[15px] italic text-foreground-muted">{interimTranscript}</p>
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
    window.location.href = "/home";
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-foreground-muted">Loading...</p>
      </div>
    );
  }

  // Access gate
  const email = user?.emailAddresses?.[0]?.emailAddress;
  if (!isTrainer(email)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <h1 className="text-xl font-semibold text-foreground">Access Denied</h1>
        <p className="mt-3 text-[15px] text-foreground-muted">Trainer mode is restricted.</p>
      </div>
    );
  }

  // Pre-start view
  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-background">
        {/* Trainer alert */}
        <div className="mx-auto max-w-[720px] px-6 pt-8">
          <div className="rounded-xl border border-border bg-surface p-4 text-sm text-foreground-muted">
            Trainer Mode · {email}
          </div>
        </div>

        <div className="flex flex-col items-center justify-center px-6 py-16">
          <div className="mb-8">
            <Orb state="idle" size={240} />
          </div>

          <h1 className="text-2xl font-semibold text-foreground">
            Trainer Mode
          </h1>
          <p className="mt-3 max-w-md text-center text-[15px] text-foreground-muted">
            Run a session and correct or flag Echo&apos;s responses. Your corrections feed back into the AI.
          </p>

          <select
            value={currentTicket}
            onChange={(e) => {
              setCurrentTicket(e.target.value);
              setTicketType(e.target.value);
            }}
            className="mt-5 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
          >
            {TRAINER_TICKETS.map((t) => (
              <option key={t.slug} value={t.slug}>{t.name}</option>
            ))}
          </select>

          {/* Mode selector */}
          <div className="mt-4 flex items-center gap-1">
            {(['trainer', 'tutor', 'examiner'] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setAiMode(m); setAiModeHook(m); }}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  aiMode === m
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border text-foreground-muted hover:bg-surface'
                }`}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>

          {!browserSupported && (
            <div className="mt-8 flex max-w-md items-start gap-3 rounded-lg border border-border bg-surface px-4 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <p className="text-sm text-foreground-soft">Voice input requires Chrome or Edge.</p>
            </div>
          )}

          {micError && (
            <div className="mt-4 flex max-w-md items-start gap-3 rounded-lg border border-border bg-surface px-4 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
              <p className="text-sm text-danger">Microphone access is required.</p>
            </div>
          )}

          <Button onClick={handleStart} className="mt-10 gap-2 px-8">
            <Mic className="h-5 w-5" />
            Begin session
          </Button>
        </div>
      </div>
    );
  }

  // Active session
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Trainer alert */}
      <div className="flex h-8 shrink-0 items-center justify-center border-b border-border bg-surface text-xs text-foreground-muted">
        Trainer Mode · {email}
      </div>

      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-6">
        <span className="text-lg font-semibold text-foreground">
          Echo <span className="text-sm font-normal text-foreground-muted">Trainer</span>
        </span>
        <select
          value={currentTicket}
          onChange={(e) => {
            setCurrentTicket(e.target.value);
            setTicketType(e.target.value);
          }}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-accent"
        >
          {TRAINER_TICKETS.map((t) => (
            <option key={t.slug} value={t.slug}>{t.name}</option>
          ))}
        </select>
        <Button variant="destructive" size="sm" onClick={handleEnd} className="gap-2">
          <PhoneOff className="h-4 w-4" />
          End
        </Button>
      </header>

      {/* Mode selector */}
      <div className="flex h-10 shrink-0 items-center justify-center gap-1 border-b border-border">
        {(['trainer', 'tutor', 'examiner'] as const).map((m) => (
          <button
            key={m}
            onClick={() => { setAiMode(m); setAiModeHook(m); }}
            className={`rounded-full px-4 py-1 text-xs font-medium transition-colors ${
              aiMode === m
                ? 'bg-primary text-primary-foreground'
                : 'border border-border text-foreground-muted hover:bg-surface'
            }`}
          >
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>

      <main className="flex flex-1 flex-col items-center justify-center">
        <Orb state={sessionPaused ? "idle" : state} analyserNode={analyserNode} micLevel={micLevel} size={240} />
        <p className="mt-8 text-sm text-foreground-muted">
          {sessionPaused ? "Session paused — submit your correction to continue" : STATE_LABELS[state]}
        </p>
        <p className="mt-2 text-sm tabular-nums text-foreground-muted">{formatTime(elapsed)}</p>
        {lastError && (
          <div className="mt-6 flex max-w-md items-start gap-3 rounded-lg border border-border bg-surface px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
            <p className="text-sm text-danger">{lastError}</p>
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
        <div className="flex shrink-0 items-center justify-center border-t border-border px-6 py-4">
          <Button
            onClick={() => { setSessionPaused(false); resumeSession(); }}
            className="w-full max-w-md"
          >
            Resume
          </Button>
        </div>
      ) : (
        <div className="flex h-20 shrink-0 items-center justify-center border-t border-border">
          <button
            onClick={toggleMic}
            disabled={state === "processing" || state === "speaking"}
            className={`flex h-14 w-14 items-center justify-center rounded-full transition-all ${
              state === "listening"
                ? "bg-primary text-primary-foreground shadow-lg"
                : "border border-border bg-background text-foreground-muted hover:bg-surface"
            } disabled:cursor-not-allowed disabled:opacity-40`}
          >
            {state === "listening" ? <Mic className="h-6 w-6" /> : <MicOff className="h-5 w-5" />}
          </button>
        </div>
      )}
    </div>
  );
}
