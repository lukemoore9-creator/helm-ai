import Anthropic from "@anthropic-ai/sdk";
import { buildExaminerPrompt } from "@/lib/prompts";

const client = new Anthropic();

export async function POST(req: Request) {
  try {
    const { messages, ticketType, topic } = await req.json();

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: buildExaminerPrompt(ticketType || "OOW Unlimited", topic),
      messages,
    });

    const text = response.content
      .filter((block: any) => block.type === "text")
      .map((block: any) => block.text)
      .join("");

    return Response.json({ text });
  } catch (err) {
    console.error("Chat API error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
