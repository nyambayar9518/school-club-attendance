import { supabaseAdmin } from "@/lib/supabase";

/**
 * Automatically renews weekly attendance sessions for a club:
 * 1. Automatically closes any open sessions from past dates (< today).
 * 2. If today is a scheduled meeting day (e.g. Friday) and no session exists for today yet,
 *    automatically creates and opens a fresh session for the scheduled grade cohort.
 */
export async function syncWeeklyClubSessions(clubId: string): Promise<void> {
  try {
    const todayStr = new Date().toISOString().split("T")[0];
    const currentDayName = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
    }).format(new Date());

    // 1. Auto-close any past sessions that were left open
    await supabaseAdmin
      .from("sessions")
      .update({ is_open: false })
      .eq("club_id", clubId)
      .lt("session_date", todayStr)
      .eq("is_open", true);

    // 2. Query configured schedules for this club
    const { data: schedules } = await supabaseAdmin
      .from("club_schedules")
      .select("*")
      .eq("club_id", clubId);

    if (!schedules || schedules.length === 0) {
      return;
    }

    // Find slots that are scheduled for today
    const todaySlots = schedules.filter(
      (s) => s.day_of_week.toLowerCase() === currentDayName.toLowerCase()
    );

    if (todaySlots.length === 0) {
      return;
    }

    // Check if session(s) already exist for today
    const { data: existingSessions } = await supabaseAdmin
      .from("sessions")
      .select("id, title")
      .eq("club_id", clubId)
      .eq("session_date", todayStr);

    const existingTitles = new Set((existingSessions || []).map((s) => s.title));

    for (const slot of todaySlots) {
      const expectedTitle =
        todaySlots.length > 1
          ? `Session for Grades ${slot.min_grade}–${slot.max_grade} (${slot.start_time}–${slot.end_time})`
          : `Session for Grades ${slot.min_grade}–${slot.max_grade}`;

      if (!existingTitles.has(expectedTitle)) {
        await supabaseAdmin.from("sessions").insert({
          club_id: clubId,
          title: expectedTitle,
          session_date: todayStr,
          is_open: true,
        });
        existingTitles.add(expectedTitle);
      }
    }
  } catch (err) {
    console.error("Auto-renew sessions error:", err);
  }
}
