import { auth } from "@clerk/nextjs/server";
import { createServiceClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

interface TranscriptEntry {
  speaker: string;
  text: string;
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId, durationSeconds, transcript } = await req.json();

  if (!sessionId) {
    return Response.json({ error: "Missing sessionId" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Get student
  const { data: student } = await supabase
    .from("students")
    .select("id, total_sessions, total_minutes, ticket_type")
    .eq("clerk_id", userId)
    .single();

  if (!student) {
    return Response.json({ error: "Student not found" }, { status: 404 });
  }

  // Format transcript for Claude analysis
  const entries = (transcript || []) as TranscriptEntry[];
  const formattedTranscript = entries
    .map(
      (entry) =>
        `${entry.speaker === "examiner" ? "Examiner" : "Candidate"}: ${entry.text}`
    )
    .join("\n\n");

  // Call Claude for session summary
  let summary = "";
  let topicsCovered: string[] = [];
  let weakAreas: string[] = [];
  let strongAreas: string[] = [];
  let overallScore = 0;

  if (formattedTranscript.length > 50) {
    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: `Analyse this oral examination transcript and respond in JSON (no markdown, no code fences):
{
  "summary": "<2-3 sentence assessment>",
  "topicsCovered": ["<topic1>", "<topic2>"],
  "weakAreas": ["<weak topic1>"],
  "strongAreas": ["<strong topic1>"],
  "overallScore": <number 1-100>,
  "topicScores": [{"topic": "<name>", "score": <1-100>, "questionsAsked": <n>}]
}

Use standard topic names: COLREGS, Navigation, Safety, SOLAS, Meteorology, Stability, MARPOL, STCW, Cargo, GMDSS, Bridge Equipment, Maritime Law.`,
        messages: [
          { role: "user", content: `Transcript:\n\n${formattedTranscript}` },
        ],
      });

      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("");

      const parsed = JSON.parse(text);
      summary = parsed.summary || "";
      topicsCovered = parsed.topicsCovered || [];
      weakAreas = parsed.weakAreas || [];
      strongAreas = parsed.strongAreas || [];
      overallScore = parsed.overallScore || 0;

      // Save topic scores
      if (Array.isArray(parsed.topicScores) && parsed.topicScores.length > 0) {
        const scoreRows = parsed.topicScores.map(
          (ts: { topic: string; score: number; questionsAsked?: number }) => ({
            student_id: student.id,
            session_id: sessionId,
            ticket_type: student.ticket_type,
            topic: ts.topic,
            score: ts.score,
            questions_asked: ts.questionsAsked || 0,
          })
        );
        await supabase.from("topic_scores").insert(scoreRows);
      }
    } catch (err) {
      console.error("Session summary error:", err);
      summary = "Session ended. Summary generation failed.";
    }
  }

  // Count exchanges
  const exchangesCount = entries.filter(
    (t) => t.speaker === "candidate"
  ).length;

  // Update session
  await supabase
    .from("sessions")
    .update({
      status: "completed",
      duration_seconds: durationSeconds || 0,
      overall_score: overallScore,
      topics_covered: topicsCovered,
      exchanges_count: exchangesCount,
      ai_summary: summary,
      weak_areas: weakAreas,
      strong_areas: strongAreas,
      ended_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  // Update student stats
  const newTotalSessions = (student.total_sessions || 0) + 1;
  const newTotalMinutes =
    (student.total_minutes || 0) + Math.floor((durationSeconds || 0) / 60);

  await supabase
    .from("students")
    .update({
      total_sessions: newTotalSessions,
      total_minutes: newTotalMinutes,
      overall_readiness: overallScore,
      updated_at: new Date().toISOString(),
    })
    .eq("id", student.id);

  return Response.json({
    summary,
    topicsCovered,
    weakAreas,
    strongAreas,
    overallScore,
  });
}
