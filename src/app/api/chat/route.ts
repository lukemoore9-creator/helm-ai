import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { buildExaminerPrompt } from "@/lib/prompts";
import { createServiceClient } from "@/lib/supabase/server";

export const maxDuration = 30;

const client = new Anthropic();

export async function POST(req: Request) {
  const t0 = Date.now();
  try {
    const { messages, ticketType, topic, currentTopic } = await req.json();
    const effectiveTopic = currentTopic || topic;

    const isOpening = messages.length === 1;

    // Build student context (non-blocking — works without it)
    let studentContext = "";
    try {
      const { userId } = await auth();
      if (userId) {
        const supabase = createServiceClient();

        const { data: student } = await supabase
          .from("students")
          .select("*")
          .eq("clerk_id", userId)
          .single();

        if (student) {
          // Run lastSession query only if needed (skip on opening to save time)
          let lastSession = null;
          if (!isOpening) {
            const { data } = await supabase
              .from("sessions")
              .select("topics_covered, ai_summary, weak_areas, strong_areas")
              .eq("student_id", student.id)
              .eq("status", "completed")
              .order("ended_at", { ascending: false })
              .limit(1)
              .single();
            lastSession = data;
          }

          const examDate =
            student.has_exam_date && student.exam_date
              ? `${student.exam_date} (${Math.ceil(
                  (new Date(student.exam_date).getTime() - Date.now()) /
                    (1000 * 60 * 60 * 24)
                )} days away)`
              : "No exam date set";

          studentContext = `

STUDENT CONTEXT:
- Name: ${student.full_name}
- Preparing for: ${student.ticket_type}
- Exam date: ${examDate}
- Sessions completed: ${student.total_sessions}
- Overall readiness: ${student.overall_readiness}%${
            lastSession
              ? `
- Last session topics: ${(lastSession.topics_covered || []).join(", ")}
- Last session summary: ${lastSession.ai_summary || "N/A"}
- Weak areas: ${(lastSession.weak_areas || []).join(", ") || "None identified"}
- Strong areas: ${(lastSession.strong_areas || []).join(", ") || "None identified"}
- This is a returning student. Do NOT re-introduce yourself. Greet them in ONE sentence: "Welcome back [name], want to pick up where we left off or tackle something new?" Reference their weak areas only if relevant. Then STOP and wait for their answer.`
              : `
- This is their first session. Greet them in ONE sentence using their name. Immediately ask what they want to work on or offer to throw questions at them. Do NOT give a long introduction. Do NOT explain how the session works. Do NOT share your background or credentials. Just: "Hi [name], shall I fire some questions at you or is there a topic you want to focus on?" — that's it.`
          }`;
        }
      }
    } catch (err) {
      console.warn("Failed to load student context:", err);
    }

    let systemPrompt: string;
    try {
      systemPrompt =
        buildExaminerPrompt(ticketType || "OOW Unlimited", effectiveTopic) +
        studentContext;
    } catch (err) {
      console.error("Failed to build examiner prompt from knowledge base:", err);
      systemPrompt =
        `You are Daniel, a senior maritime oral examiner. You are conducting an oral exam for a ${ticketType || "OOW Unlimited"} candidate` +
        (topic ? ` on the topic of ${topic}.` : ".") +
        ` Ask questions, probe understanding, and assess competency. Be thorough but fair.` +
        studentContext;
    }

    // Use Haiku for opening greeting (fast TTFT), Sonnet for exam questions
    const model = isOpening ? "claude-haiku-4-5-20251001" : "claude-sonnet-4-20250514";
    console.log(`[Chat] model: ${model}, prompt: ${systemPrompt.length} chars, topic: ${effectiveTopic || 'none'}, setup: ${Date.now() - t0}ms`);

    const stream = client.messages.stream({
      model,
      max_tokens: isOpening ? 100 : 250,
      system: systemPrompt,
      messages,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } catch (err) {
    console.error("Chat API error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
