export type SessionState = "idle" | "listening" | "processing" | "speaking";

export interface TranscriptEntry {
  speaker: "examiner" | "candidate";
  text: string;
  timestamp: number;
}
