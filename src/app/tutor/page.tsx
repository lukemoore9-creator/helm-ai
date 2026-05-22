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
import { getTopicName } from "@/lib/topics";
import { TopicPicker } from "@/components/topics/TopicPicker";
import { Button } from "@/components/ui/button";

interface StudentProfile {
  student: {
    id: string;
    full_name: string;
    email: string | null;
    ticket_type: string;
    total_sessions: number;
  };
}

export default function TutorPage() {
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
    injectUserMessage,
    isMuted,
    isPaused,
    analyserNode,
    micLevel,
    browserSupported,
    lastError,
  } = useVoiceSession();

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [leadSelected, setLeadSelected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [micError, setMicError] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [typedMessage, setTypedMessage] = useState("");

  const transcriptRef = useRef(transcript);
  useEffect(() => { transcriptRef.current = transcript; }, [transcript]);

  useEffect(() => {
    fetch("/api/student")
      .then((res) => res.json())
      .then((data) => { if (data.student) setProfile(data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const ticketSlug = profile?.student?.ticket_type || "oow-unlimited";
  const ticketName = getTicketName(ticketSlug);
  const firstName = profile?.student?.full_name?.split(" ")[0] || "";

  const topicForSession = leadSelected ? "lead" : selectedTopic;
  const topicDisplay = leadSelected
    ? "Open conversation"
    : selectedTopic
    ? getTopicName(selectedTopic)
    : "";

  const handleStart = useCallback(async () => {
    if (!topicForSession) return;

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
      body: JSON.stringify({ ticketType: ticketSlug, sessionType: "bridge" }),
    })
      .then((res) => res.json())
      .then((data) => { if (data.sessionId) setSessionId(data.sessionId); })
      .catch(console.error);

    setHasStarted(true);
    const totalSessions = profile?.student?.total_sessions || 0;
    startSession(ticketSlug, firstName, totalSessions, {
      drillTopic: topicForSession === "lead" ? undefined : topicForSession ?? undefined,
      drillTopicName: topicDisplay || undefined,
      bridge: true,
    });
  }, [topicForSession, topicDisplay, ticketSlug, firstName, profile, startSession]);

  const handleEnd = useCallback(async () => {
    const currentTranscript = transcriptRef.current;

    if (currentTranscript.length > 0) {
      sessionStorage.setItem("echo-bridge-transcript", JSON.stringify(currentTranscript));
    }

    endSession();

    if (sessionId) {
      try {
        await fetch("/api/session/end", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            durationSeconds: 0,
            transcript: currentTranscript,
          }),
        });
      } catch (err) {
        console.error("Failed to end tutor session:", err);
      }
    }

    router.push(`/tutor/summary?id=${sessionId || "local"}`);
  }, [endSession, sessionId, router]);

  const handleTypedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim()) return;
    injectUserMessage(typedMessage);
    setTypedMessage("");
  };

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

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background" />;
  }

  // Active tutor session
  if (hasStarted) {
    const lastExaminerMessage = [...transcript].reverse().find((t) => t.speaker === "examiner");

    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-6">
          <Link href="/home" className="text-sm font-semibold text-foreground">Echo</Link>
          <span className="text-xs text-foreground-muted">Tutor · {topicDisplay}</span>
          <button
            onClick={handleEnd}
            className="text-xs font-medium text-foreground-muted transition-colors hover:text-danger"
          >
            End
          </button>
        </header>

        {/* Centre */}
        <main className="flex flex-1 flex-col items-center justify-center px-6">
          {lastError && (
            <div className="mb-6 flex max-w-md items-start gap-3 rounded-lg border border-border bg-background px-4 py-3">
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
          </div>

          <p className="mt-6 max-w-lg text-center text-[22px] leading-snug text-foreground">
            {lastExaminerMessage?.text || "Starting session\u2026"}
          </p>

          {state === "listening" && (
            <p className="mt-4 text-xs text-foreground-muted">
              Listening
            </p>
          )}

          {/* Typed input */}
          <div className="mt-6 flex flex-col items-center">
            {isMuted && (
              <p className="mb-2 text-xs text-foreground-muted">
                Mic muted — type instead
              </p>
            )}
            <form onSubmit={handleTypedSubmit}>
              <input
                type="text"
                value={typedMessage}
                onChange={(e) => setTypedMessage(e.target.value)}
                placeholder="Ask Echo a question..."
                className="w-[320px] max-w-full border-b border-border bg-transparent py-2 text-sm text-foreground placeholder:text-foreground-muted outline-none transition-colors focus:border-accent"
              />
            </form>
          </div>
        </main>

        {/* Transcript drawer */}
        <AnimatePresence>
          {transcriptOpen && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
              className="absolute inset-x-0 bottom-10 z-40 border-t border-border bg-background"
              style={{ maxHeight: "50vh" }}
            >
              <TranscriptPanel transcript={transcript} interimTranscript={interimTranscript} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <footer className="flex h-10 shrink-0 items-center justify-between border-t border-border px-6">
          <span className="text-xs text-foreground-muted">Tutor · {topicDisplay}</span>
          <button
            onClick={() => setTranscriptOpen((prev) => !prev)}
            className="flex items-center gap-1 text-xs font-medium text-foreground-muted transition-colors hover:text-foreground"
          >
            Transcript
            {transcriptOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          </button>
        </footer>
      </div>
    );
  }

  // Pre-session screen
  const hasTopicSelected = selectedTopic !== null || leadSelected;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[720px] px-6 py-12">
        <Link
          href="/home"
          className="text-sm text-foreground-muted transition-colors hover:text-foreground"
        >
          &larr; Back
        </Link>

        <h1 className="mt-8 text-[30px] font-semibold text-foreground">
          Tutor session
        </h1>
        <p className="mt-2 max-w-[480px] text-[15px] text-foreground-soft">
          Have a conversation with Echo about any topic. No verdict, no score — just focused learning.
        </p>

        {/* Warnings */}
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

        {/* Topic picker */}
        <div className="mt-10">
          <p className="mb-4 text-sm font-medium text-foreground-muted">
            Choose a topic
          </p>
          <TopicPicker
            selected={selectedTopic}
            onSelect={(slug) => {
              setSelectedTopic(slug);
              setLeadSelected(false);
            }}
            showLeadOption
            onSelectLead={() => {
              setLeadSelected(true);
              setSelectedTopic(null);
            }}
            leadSelected={leadSelected}
          />
        </div>

        {/* CTA */}
        <div className="mt-10 flex items-center gap-3">
          <Button
            onClick={handleStart}
            disabled={!hasTopicSelected}
          >
            Start tutor session
          </Button>
          <Link href="/home">
            <Button variant="outline">Cancel</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
