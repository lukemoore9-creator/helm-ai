import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { isBetaUser } from "@/lib/beta-access";
import { LogbookClient } from "./LogbookClient";

export default async function LogbookPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const supabase = createServiceClient();

  const { data: student } = await supabase
    .from("students")
    .select("*")
    .eq("clerk_id", userId)
    .single();

  if (!student) redirect("/onboarding");
  if (!isBetaUser(student.email)) redirect("/home");

  // Fetch completed sessions
  const { data: sessions } = await supabase
    .from("sessions")
    .select("*")
    .eq("student_id", student.id)
    .eq("status", "completed")
    .order("ended_at", { ascending: false });

  // Fetch all topic scores
  const { data: topicScores } = await supabase
    .from("topic_scores")
    .select("*")
    .eq("student_id", student.id)
    .order("assessed_at", { ascending: false });

  // Latest score per topic
  const latestScores: Record<string, number> = {};
  if (topicScores) {
    for (const ts of topicScores) {
      if (!(ts.topic in latestScores)) {
        latestScores[ts.topic] = Number(ts.score);
      }
    }
  }

  // Days to exam
  let daysToExam: number | null = null;
  if (student.has_exam_date && student.exam_date) {
    daysToExam = Math.ceil(
      (new Date(student.exam_date).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24)
    );
  }

  return (
    <LogbookClient
      student={{
        full_name: student.full_name,
        ticket_type: student.ticket_type,
        total_sessions: student.total_sessions,
        total_minutes: student.total_minutes,
        overall_readiness: Number(student.overall_readiness),
      }}
      sessions={(sessions || []).map((s) => ({
        id: s.id,
        started_at: s.started_at,
        ended_at: s.ended_at,
        duration_seconds: s.duration_seconds,
        topics_covered: s.topics_covered || [],
        overall_score: Number(s.overall_score || 0),
        ai_summary: s.ai_summary || "",
        exchanges_count: s.exchanges_count,
        session_type: s.session_type || "examination",
      }))}
      topicScores={latestScores}
      daysToExam={daysToExam}
    />
  );
}
