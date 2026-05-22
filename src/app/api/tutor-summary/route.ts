import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";

export const maxDuration = 30;

const client = new Anthropic();

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { transcript } = await req.json();

    if (!transcript || !Array.isArray(transcript) || transcript.length === 0) {
      return Response.json({ error: "No transcript provided" }, { status: 400 });
    }

    const formattedTranscript = transcript
      .map((t: { speaker: string; text: string }) =>
        `${t.speaker === "examiner" ? "Echo" : "Candidate"}: ${t.text}`
      )
      .join("\n");

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      system: `You are analysing a tutor conversation (informal maritime study session) between Echo (a senior officer) and a candidate. Generate a JSON summary with:
- topicsCovered: array of {slug, count} where slug is one of: colregs, navigation, safety, solas, meteorology, stability, marpol, stcw, cargo, gmdss, bridge-equipment, maritime-law. Count is approximately how many questions/exchanges on that topic.
- thingsToRevisit: array of 1-3 short sentences about areas where the candidate was uncertain or got things wrong. Keep it encouraging.
- encouragement: one warm sentence about how the session went overall.

Return ONLY valid JSON, no markdown fences.`,
      messages: [
        {
          role: "user",
          content: `Here is the tutor conversation transcript:\n\n${formattedTranscript}`,
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    try {
      const data = JSON.parse(text);
      return Response.json(data);
    } catch {
      return Response.json({
        topicsCovered: [],
        thingsToRevisit: ["We had a good chat but couldn't break down the specifics."],
        encouragement: "Good session. Keep at it.",
      });
    }
  } catch (err) {
    console.error("Tutor summary error:", err);
    return Response.json({ error: "Failed to generate summary" }, { status: 500 });
  }
}
