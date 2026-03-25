import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { buildExaminerPrompt } from "@/lib/prompts";
import { createServiceClient } from "@/lib/supabase/server";

const client = new Anthropic();

export async function POST(req: Request) {
  try {
    const { messages, ticketType, topic } = await req.json();

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
          const { data: lastSession } = await supabase
            .from("sessions")
            .select("topics_covered, ai_summary, weak_areas, strong_areas")
            .eq("student_id", student.id)
            .eq("status", "completed")
            .order("ended_at", { ascending: false })
            .limit(1)
            .single();

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
- Strong areas: ${(lastSession.strong_areas || []).join(", ") || "None identified"}`
              : `
- This is their first session.`
          }`;
        }
      }
    } catch (err) {
      console.warn("Failed to load student context:", err);
    }

    let systemPrompt: string;
    try {
      systemPrompt =
        buildExaminerPrompt(ticketType || "OOW Unlimited", topic) +
        studentContext;
    } catch (err) {
      console.error("Failed to build examiner prompt from knowledge base:", err);
      systemPrompt =
        `You are Daniel, a senior maritime oral examiner. You are conducting an oral exam for a ${ticketType || "OOW Unlimited"} candidate` +
        (topic ? ` on the topic of ${topic}.` : ".") +
        ` Ask questions, probe understanding, and assess competency. Be thorough but fair.` +
        studentContext;
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    const text = response.content
      .filter(
        (block): block is Anthropic.TextBlock => block.type === "text"
      )
      .map((block) => block.text)
      .join("");

    return Response.json({ text });
  } catch (err) {
    console.error("Chat API error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
