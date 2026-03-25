import { auth } from "@clerk/nextjs/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ticketType } = await req.json();
  const supabase = createServiceClient();

  // Get student ID
  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  if (!student) {
    return Response.json({ error: "Student not found" }, { status: 404 });
  }

  // Create session
  const { data: session, error } = await supabase
    .from("sessions")
    .insert({
      student_id: student.id,
      ticket_type: ticketType,
      status: "active",
    })
    .select("id")
    .single();

  if (error) {
    console.error("Create session error:", error);
    return Response.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }

  return Response.json({ sessionId: session.id });
}
