import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { syncWeeklyClubSessions } from "@/lib/auto-renew";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clubId = params.id;
    const todayStr = new Date().toISOString().split("T")[0];

    // Get club info
    const { data: club, error: clubErr } = await supabaseAdmin
      .from("clubs")
      .select("id, name")
      .eq("id", clubId)
      .maybeSingle();

    if (clubErr || !club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    // Get teacher / leader info
    const { data: leaderMember } = await supabaseAdmin
      .from("club_members")
      .select(`
        users (
          full_name,
          phone
        )
      `)
      .eq("club_id", clubId)
      .eq("role_in_club", "leader")
      .maybeSingle();

    const teacherName =
      (leaderMember?.users as any)?.full_name || "Faculty Advisor";

    // Auto-renew sessions and close past ones
    await syncWeeklyClubSessions(clubId);

    // Get all sessions for this club ordered by date descending
    const { data: sessions, error: sessErr } = await supabaseAdmin
      .from("sessions")
      .select("id, title, session_date, is_open, created_at")
      .eq("club_id", clubId)
      .order("session_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (sessErr) {
      return NextResponse.json({ error: sessErr.message }, { status: 500 });
    }

    // Get all attendance records for this student in this club
    const sessionIds = (sessions || []).map((s) => s.id);
    let attendanceMap = new Map<string, any>();

    if (sessionIds.length > 0) {
      const { data: records } = await supabaseAdmin
        .from("attendance")
        .select("id, session_id, photo_url, description, status, submitted_at")
        .eq("student_id", user.id)
        .in("session_id", sessionIds);

      (records || []).forEach((r) => {
        attendanceMap.set(r.session_id, r);
      });
    }

    // Check open sessions today and match to student grade
    const openSessionsToday = (sessions || []).filter(
      (s) => s.is_open && s.session_date === todayStr
    );

    let openSessionToday = null;
    if (user.grade && openSessionsToday.length > 0) {
      openSessionToday =
        openSessionsToday.find((s) => {
          const match = s.title.match(/Grades?\s*(\d+)[–\-](\d+)/i);
          if (match) {
            const min = parseInt(match[1], 10);
            const max = parseInt(match[2], 10);
            return user.grade! >= min && user.grade! <= max;
          }
          return true;
        }) || openSessionsToday[0];
    } else {
      openSessionToday = openSessionsToday[0] || null;
    }

    let todaySubmission = null;
    if (openSessionToday) {
      todaySubmission = attendanceMap.get(openSessionToday.id) || null;
    }

    // Format session history for the student, checking grade relevance
    let totalApplicable = 0;
    let studentApprovedCount = 0;

    const sessionHistory = (sessions || []).map((s) => {
      const submission = attendanceMap.get(s.id);
      let isApplicable = true;

      if (user.grade) {
        const match = s.title.match(/Grades?\s*(\d+)[–\-](\d+)/i);
        if (match) {
          const min = parseInt(match[1], 10);
          const max = parseInt(match[2], 10);
          if (user.grade < min || user.grade > max) {
            isApplicable = false;
          }
        }
      }

      let calculatedStatus: "approved" | "pending" | "rejected" | "absent" = "absent";
      if (submission) {
        calculatedStatus = submission.status;
      } else {
        calculatedStatus = "absent";
      }

      if (isApplicable) {
        totalApplicable++;
        if (calculatedStatus === "approved") {
          studentApprovedCount++;
        }
      }

      return {
        id: s.id,
        title: s.title,
        sessionDate: s.session_date,
        isOpen: s.is_open,
        isApplicableToGrade: isApplicable,
        submission: submission || null,
        status: calculatedStatus,
      };
    });

    const attendanceRate =
      totalApplicable > 0
        ? Math.round((studentApprovedCount / totalApplicable) * 100)
        : 0;

    return NextResponse.json({
      club: {
        id: club.id,
        name: club.name,
        teacherName,
      },
      stats: {
        totalApplicable,
        approvedCount: studentApprovedCount,
        attendanceRate,
      },
      openSessionToday: openSessionToday
        ? {
            id: openSessionToday.id,
            title: openSessionToday.title,
            sessionDate: openSessionToday.session_date,
            isOpen: openSessionToday.is_open,
            submission: todaySubmission,
          }
        : null,
      sessionHistory,
    });
  } catch (err: any) {
    console.error("Student club details API error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
