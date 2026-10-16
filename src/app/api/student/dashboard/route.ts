import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "student") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the clubs this student is enrolled in
    const { data: memberships, error: memError } = await supabaseAdmin
      .from("club_members")
      .select(`
        club_id,
        clubs (
          id,
          name
        )
      `)
      .eq("user_id", user.id)
      .eq("role_in_club", "student");

    if (memError) {
      console.error("Error fetching memberships:", memError);
      return NextResponse.json({ error: memError.message }, { status: 500 });
    }

    const todayStr = new Date().toISOString().split("T")[0];

    const clubCards = await Promise.all(
      (memberships || []).map(async (m: any) => {
        const club = m.clubs;
        if (!club) return null;

        // 1. Get Teacher / Leader name
        const { data: leaderMember } = await supabaseAdmin
          .from("club_members")
          .select(`
            users (
              full_name
            )
          `)
          .eq("club_id", club.id)
          .eq("role_in_club", "leader")
          .maybeSingle();

        const teacherName =
          (leaderMember?.users as any)?.full_name || "Faculty Advisor";

        // 2. Total sessions in this club
        const { count: totalSessions } = await supabaseAdmin
          .from("sessions")
          .select("*", { count: "exact", head: true })
          .eq("club_id", club.id);

        // 3. Approved attendance for this student
        const { data: studentAttendance } = await supabaseAdmin
          .from("attendance")
          .select(`
            id,
            status,
            sessions!inner (
              club_id
            )
          `)
          .eq("student_id", user.id)
          .eq("status", "approved")
          .eq("sessions.club_id", club.id);

        const approvedCount = studentAttendance ? studentAttendance.length : 0;

        // 4. Check if session is open today
        const { data: openSessionToday } = await supabaseAdmin
          .from("sessions")
          .select("id, title, is_open, session_date")
          .eq("club_id", club.id)
          .eq("is_open", true)
          .eq("session_date", todayStr)
          .maybeSingle();

        // 5. Fetch schedules for this club
        let scheduleSlot = null;
        try {
          const { data: schedData } = await supabaseAdmin
            .from("club_schedules")
            .select("*")
            .eq("club_id", club.id);

          if (schedData && schedData.length > 0) {
            if (user.grade) {
              scheduleSlot = schedData.find(
                (s) => user.grade! >= s.min_grade && user.grade! <= s.max_grade
              ) || schedData[0];
            } else {
              scheduleSlot = schedData[0];
            }
          }
        } catch {
          scheduleSlot = null;
        }

        const currentDayName = new Intl.DateTimeFormat("en-US", {
          weekday: "long",
        }).format(new Date());

        const isScheduledToday = scheduleSlot?.day_of_week === currentDayName;

        return {
          id: club.id,
          name: club.name,
          teacherName,
          totalSessions: totalSessions || 0,
          approvedCount,
          hasOpenSessionToday: !!openSessionToday,
          openSessionId: openSessionToday?.id || null,
          schedule: scheduleSlot,
          isScheduledToday,
        };
      })
    );

    return NextResponse.json({
      student: user,
      clubs: clubCards.filter(Boolean),
    });
  } catch (err: any) {
    console.error("Student dashboard API error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
