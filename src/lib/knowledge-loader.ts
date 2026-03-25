import fs from "fs";
import path from "path";

export interface Question {
  id: string;
  question: string;
  key_points: string[];
  follow_ups: string[];
  difficulty: "basic" | "intermediate" | "advanced";
  examiner_notes: string;
}

const DATA_DIR = path.join(process.cwd(), "src", "data");

/** Check if the data directory exists at all (may not on Vercel without tracing config) */
function dataDirectoryExists(): boolean {
  try {
    fs.accessSync(DATA_DIR);
    return true;
  } catch {
    return false;
  }
}

const SLUG_MAP: Record<string, string> = {
  "OOW Unlimited": "oow-unlimited",
  "OOW Near Coastal": "oow-nearcoastal",
  "Master <200GT": "master-200gt",
  "Master <500GT": "master-500gt",
  "Master <3000GT": "master-3000gt",
  "Master Unlimited": "master-unlimited",
  "Yacht Master Offshore": "ym-offshore",
  "Yacht Master Ocean": "ym-ocean",
  "Mate <200GT Yacht": "mate-200gt-yacht",
  "Master <200GT Yacht": "master-200gt-yacht",
  "Master <500GT Yacht": "master-500gt-yacht",
  "Master <3000GT Yacht": "master-3000gt-yacht",
  "Engineer OOW": "engineer-oow",
  ETO: "eto",
};

/**
 * Maps a display name like "OOW Unlimited" to a directory slug like "oow-unlimited".
 * Returns the input unchanged if it already looks like a slug.
 */
export function getTicketSlug(ticketName: string): string {
  return SLUG_MAP[ticketName] ?? ticketName;
}

/**
 * Lists available topic files for a ticket type.
 */
export function listTopics(ticketSlug: string): string[] {
  if (!dataDirectoryExists()) return [];
  const dir = path.join(DATA_DIR, "courses", ticketSlug);
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".md"))
      .map((f) => f.replace(".md", ""));
  } catch {
    return [];
  }
}

/**
 * Loads markdown course content for a specific ticket type and topic.
 * Returns empty string if the file doesn't exist.
 */
export function loadCourseContent(
  ticketSlug: string,
  topic: string
): string {
  const filePath = path.join(DATA_DIR, "courses", ticketSlug, `${topic}.md`);
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return "";
  }
}

/**
 * Loads question bank for a ticket type. If topic is provided, loads only that topic.
 * Otherwise loads all topics and merges them.
 */
export function loadQuestions(
  ticketSlug: string,
  topic?: string
): Question[] {
  if (topic) {
    return loadTopicQuestions(ticketSlug, topic);
  }

  const topics = listTopics(ticketSlug);
  const all: Question[] = [];
  for (const t of topics) {
    all.push(...loadTopicQuestions(ticketSlug, t));
  }
  return all;
}

function loadTopicQuestions(
  ticketSlug: string,
  topic: string
): Question[] {
  const filePath = path.join(
    DATA_DIR,
    "questions",
    ticketSlug,
    `${topic}.json`
  );
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as Question[];
  } catch {
    return [];
  }
}
