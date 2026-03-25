import { auth } from "@clerk/nextjs/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const {
    sessionId,
    topic,
    examinerQuestion,
    candidateAnswer,
    exchangeOrder,
  } = await req.json();

  if (!sessionId || !examinerQuestion) {
    return Response.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  const { error } = await supabase.from("session_exchanges").insert({
    session_id: sessionId,
    topic: topic || null,
    examiner_question: examinerQuestion,
    candidate_answer: candidateAnswer || null,
    exchange_order: exchangeOrder || 0,
  });

  if (error) {
    console.error("Save exchange error:", error);
    return Response.json(
      { error: "Failed to save exchange" },
      { status: 500 }
    );
  }

  return Response.json({ success: true });
}
