"use client";

import { Mic, MicOff, Pause, Play, CornerDownLeft } from "lucide-react";
import type { SessionState } from "@/lib/types";

interface VoiceControlsProps {
  state: SessionState;
  isMuted: boolean;
  isPaused: boolean;
  onToggleMic: () => void;
  onTogglePause: () => void;
  onInterrupt: () => void;
}

export function VoiceControls({
  state,
  isMuted,
  isPaused,
  onToggleMic,
  onTogglePause,
  onInterrupt,
}: VoiceControlsProps) {
  const interruptDisabled = state !== "speaking";

  return (
    <div className="flex items-center justify-center gap-3">
      {/* Mute / Unmute */}
      <div className="group relative flex flex-col items-center">
        <button
          onClick={onToggleMic}
          className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-colors hover:bg-surface ${
            isMuted
              ? "border-danger text-danger"
              : "border-border text-foreground"
          }`}
        >
          {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>
        <span className="pointer-events-none absolute -bottom-5 text-xs text-foreground-muted opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          {isMuted ? "Unmute" : "Mute"}
        </span>
      </div>

      {/* Pause / Resume */}
      <div className="group relative flex flex-col items-center">
        <button
          onClick={onTogglePause}
          className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-colors hover:bg-surface ${
            isPaused
              ? "border-warning text-warning"
              : "border-border text-foreground"
          }`}
        >
          {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
        </button>
        <span className="pointer-events-none absolute -bottom-5 text-xs text-foreground-muted opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          {isPaused ? "Resume" : "Pause"}
        </span>
      </div>

      {/* Interrupt */}
      <div className="group relative flex flex-col items-center">
        <button
          onClick={onInterrupt}
          disabled={interruptDisabled}
          className={`flex h-10 w-10 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-surface ${
            interruptDisabled ? "cursor-default opacity-50" : ""
          }`}
        >
          <CornerDownLeft className="h-4 w-4" />
        </button>
        <span className="pointer-events-none absolute -bottom-5 text-xs text-foreground-muted opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          Interrupt
        </span>
      </div>
    </div>
  );
}
