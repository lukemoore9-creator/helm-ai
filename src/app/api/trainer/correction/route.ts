import { auth, currentUser } from "@clerk/nextjs/server";
import { createServiceClient } from "@/lib/supabase/server";
import { isBetaUser } from "@/lib/beta-access";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress;
    if (!isBetaUser(email)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const {
      examinerSaid,
      studentSaid,
      correction,
      flagReason,
      correctionType,
      topic,
      ticketType,
    } = await req.json();

    if (!examinerSaid || !correctionType) {
      return Response.json(
        { error: "examinerSaid and correctionType are required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const { error } = await supabase.from("trainer_corrections").insert({
      trainer_email: email,
      topic,
      ticket_type: ticketType,
      examiner_said: examinerSaid,
      student_said: studentSaid,
      correction,
      flag_reason: flagReason,
      correction_type: correctionType,
    });

    if (error) {
      console.error("Failed to save correction:", error);
      return Response.json({ error: "Failed to save" }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("Trainer correction error:", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
