import { auth, clerkClient } from "@clerk/nextjs/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { data: student, error } = await supabase
    .from("students")
    .select("*")
    .eq("clerk_id", userId)
    .single();

  if (error || !student) {
    return Response.json({ error: "Student not found" }, { status: 404 });
  }

  // Fetch latest completed session
  const { data: lastSession } = await supabase
    .from("sessions")
    .select("topics_covered, ai_summary, weak_areas, strong_areas")
    .eq("student_id", student.id)
    .eq("status", "completed")
    .order("ended_at", { ascending: false })
    .limit(1)
    .single();

  // Fetch recent topic scores (latest per topic)
  const { data: topicScores } = await supabase
    .from("topic_scores")
    .select("topic, score")
    .eq("student_id", student.id)
    .order("assessed_at", { ascending: false });

  const latestScores: Record<string, number> = {};
  if (topicScores) {
    for (const ts of topicScores) {
      if (!(ts.topic in latestScores)) {
        latestScores[ts.topic] = Number(ts.score);
      }
    }
  }

  const weakAreas = Object.entries(latestScores)
    .filter(([, score]) => score < 50)
    .map(([topic]) => topic);

  const strongAreas = Object.entries(latestScores)
    .filter(([, score]) => score >= 70)
    .map(([topic]) => topic);

  return Response.json({
    student,
    lastSession: lastSession || null,
    topicScores: latestScores,
    weakAreas,
    strongAreas,
  });
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fullName, ticketType, hasExamDate, examDate } = await req.json();

    if (!fullName || !ticketType) {
      return Response.json(
        { error: "Please fill in all required fields" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Get email from Clerk
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    const email = clerkUser.emailAddresses?.[0]?.emailAddress || null;

    // Upsert student
    const { error: dbError } = await supabase.from("students").upsert(
      {
        clerk_id: userId,
        email,
        full_name: fullName,
        ticket_type: ticketType,
        has_exam_date: !!hasExamDate,
        exam_date: hasExamDate && examDate ? examDate : null,
        onboarding_complete: true,
      },
      { onConflict: "clerk_id" }
    );

    if (dbError) {
      console.error("Supabase error:", dbError);
      return Response.json(
        { error: "Failed to save profile: " + dbError.message },
        { status: 500 }
      );
    }

    // Update Clerk publicMetadata
    await client.users.updateUser(userId, {
      publicMetadata: {
        onboardingComplete: true,
        ticketType,
      },
    });

    return Response.json({ success: true });
  } catch (err) {
    console.error("Student POST error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
