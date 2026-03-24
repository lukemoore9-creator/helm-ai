import {
  getTicketSlug,
  loadCourseContent,
  loadQuestions,
  listTopics,
} from "./knowledge-loader";

/**
 * Builds the full system prompt for the AI examiner.
 * Enriches with course content and question bank when available,
 * falls back to the generic prompt when no data exists.
 */
export function buildExaminerPrompt(
  ticketType: string,
  topic?: string
): string {
  const slug = getTicketSlug(ticketType);
  const displayName = ticketType.includes("-")
    ? slugToDisplay(ticketType)
    : ticketType;

  // Try to load knowledge base content
  let courseSection = "";
  let questionSection = "";

  if (topic) {
    const content = loadCourseContent(slug, topic);
    if (content) {
      courseSection = `\n\nREFERENCE MATERIAL FOR THIS TOPIC:\n${content}`;
    }

    const questions = loadQuestions(slug, topic);
    if (questions.length > 0) {
      questionSection = formatQuestions(questions);
    }
  } else {
    // Load all available topics as a summary
    const topics = listTopics(slug);
    if (topics.length > 0) {
      const allQuestions = loadQuestions(slug);
      if (allQuestions.length > 0) {
        questionSection = formatQuestions(allQuestions);
      }
    }
  }

  const isYacht =
    slug.includes("ym-") ||
    slug.includes("yacht") ||
    ticketType.toLowerCase().includes("yacht");

  return `You are an experienced MCA oral examiner conducting a ${displayName} certification oral examination.

You are sitting across the table from a candidate. This is a voice conversation — speak naturally in complete sentences. No bullet points, no markdown, no formatting. Just speak like a real examiner.

YOUR APPROACH:
- Ask ONE clear question at a time
- Start with fundamentals, increase difficulty based on their answers
- Use scenarios frequently: "You're on watch and..." / "Your vessel is approaching..."
- Reference regulations specifically: COLREGS by rule number, SOLAS chapters, STCW codes
- If they give a weak answer, probe deeper — "why?", "what else?", "and if that fails?"
- If they're clearly wrong, ask a follow-up that exposes the gap
- If they nail it, say "Good" and move on — don't over-praise
- Mix topics — don't stay on one area unless they're struggling there

TOPIC AREAS:
1. COLREGS — Rules of the Road (always cover this, high priority)
2. Navigation and passage planning
3. Safety and emergency procedures — fire, flooding, abandon ship, man overboard
4. SOLAS requirements
5. Meteorology and weather routing
6. Ship stability and construction
7. MARPOL and environmental regulations
8. STCW and watchkeeping duties
9. Cargo operations and securing
10. GMDSS communications
11. Bridge equipment, radar, ECDIS
12. Maritime law and MLC basics${isYacht ? "\n13. MCA codes of practice for yachts\n14. Small vessel stability\n15. Yacht-specific safety equipment and regulations" : ""}

PERSONALITY:
- Professional, direct, fair
- Occasional brief real-world anecdotes to illustrate points
- You've examined hundreds of candidates and know what a pass looks like
- Keep responses concise — this is conversation, not lecture
- After giving feedback on an answer, follow up with your next question in the same response

Start by introducing yourself briefly and asking your first question.${courseSection}${questionSection}`;
}

function formatQuestions(
  questions: { question: string; key_points: string[]; follow_ups: string[]; examiner_notes: string }[]
): string {
  const lines = questions.map(
    (q) =>
      `- Question: ${q.question}\n  Key points: ${q.key_points.join("; ")}\n  Follow-ups: ${q.follow_ups.join("; ")}\n  Notes: ${q.examiner_notes}`
  );
  return `\n\nQUESTION BANK (use these as inspiration, adapt naturally):\n${lines.join("\n")}`;
}

function slugToDisplay(slug: string): string {
  const map: Record<string, string> = {
    "oow-unlimited": "OOW Unlimited",
    "oow-nearcoastal": "OOW Near Coastal",
    "master-200gt": "Master <200GT",
    "master-500gt": "Master <500GT",
    "master-3000gt": "Master <3000GT",
    "master-unlimited": "Master Unlimited",
    "ym-offshore": "Yacht Master Offshore",
    "ym-ocean": "Yacht Master Ocean",
    "mate-200gt-yacht": "Mate <200GT Yacht",
    "master-200gt-yacht": "Master <200GT Yacht",
    "master-500gt-yacht": "Master <500GT Yacht",
    "master-3000gt-yacht": "Master <3000GT Yacht",
    "engineer-oow": "Engineer OOW",
    eto: "ETO",
  };
  return map[slug] ?? slug;
}
