import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(req: Request) {
  const { transcript, ticketType } = await req.json();

  // Build a readable transcript for Claude to analyse
  const formattedTranscript = transcript
    .map(
      (entry: { speaker: string; text: string }) =>
        `${entry.speaker === "examiner" ? "Examiner" : "Candidate"}: ${entry.text}`
    )
    .join("\n\n");

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: `You are an expert maritime oral examination assessor. You have just observed a mock oral examination for a ${ticketType} certificate.

Analyse the transcript below and produce a structured assessment. Be honest, specific, and constructive.

Respond in this exact JSON format (no markdown, no code fences, just raw JSON):
{
  "overallScore": <number 1-10>,
  "summary": "<2-3 sentence overall assessment>",
  "strengths": ["<specific strength 1>", "<specific strength 2>", ...],
  "weaknesses": ["<specific weakness 1>", "<specific weakness 2>", ...],
  "topicsToStudy": ["<specific topic with detail>", "<specific topic with detail>", ...],
  "examReadiness": "<one of: Not Ready | Needs More Practice | Nearly There | Exam Ready>",
  "keyMoments": [{"quote": "<brief candidate quote>", "feedback": "<what was good or bad about it>"}, ...]
}

Rules:
- Be specific — reference actual answers from the transcript
- Strengths and weaknesses should each have 2-5 items
- topicsToStudy should have 3-6 specific topics with enough detail to guide study
- keyMoments should have 2-4 notable moments from the exam
- If the exam was very short, note that more practice is needed for a proper assessment`,
    messages: [
      {
        role: "user",
        content: `Here is the full examination transcript:\n\n${formattedTranscript}`,
      },
    ],
  });

  const text = response.content
    .filter((block: any) => block.type === "text")
    .map((block: any) => block.text)
    .join("");

  try {
    const report = JSON.parse(text);
    return Response.json(report);
  } catch {
    // If Claude didn't return valid JSON, wrap it
    return Response.json({
      overallScore: 5,
      summary: text,
      strengths: [],
      weaknesses: [],
      topicsToStudy: [],
      examReadiness: "Needs More Practice",
      keyMoments: [],
    });
  }
}
