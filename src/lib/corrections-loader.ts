import { createServiceClient } from "@/lib/supabase/server";

export async function loadRecentCorrections(
  ticketType?: string
): Promise<string> {
  try {
    const supabase = createServiceClient();

    let query = supabase
      .from("trainer_corrections")
      .select("examiner_said, correction, flag_reason, correction_type, topic")
      .eq("applied", false)
      .order("created_at", { ascending: false })
      .limit(20);

    if (ticketType) {
      query = query.eq("ticket_type", ticketType);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) return "";

    const lines = data.map((c) => {
      if (c.correction_type === "correction") {
        return `- When asked about "${c.examiner_said?.substring(0, 80)}..." → Correct approach: ${c.correction}`;
      }
      return `- FLAGGED: "${c.examiner_said?.substring(0, 80)}..." — ${c.flag_reason}`;
    });

    return `\n\nTRAINER CORRECTIONS (override reference material):\n${lines.join("\n")}`;
  } catch (err) {
    console.warn("Failed to load corrections:", err);
    return "";
  }
}
