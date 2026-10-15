import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

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

    // Check if there is an open session today
    const openSessionToday = (sessions || []).find(
      (s) => s.is_open && s.session_date === todayStr
    );

    let todaySubmission = null;
    if (openSessionToday) {
      todaySubmission = attendanceMap.get(openSessionToday.id) || null;
    }

    // Format session history for the student
    const sessionHistory = (sessions || []).map((s) => {
      const submission = attendanceMap.get(s.id);
      let calculatedStatus: "approved" | "pending" | "rejected" | "absent" = "absent";

      if (submission) {
        calculatedStatus = submission.status;
      } else if (s.is_open) {
        calculatedStatus = "absent"; // or pending check-in
      } else {
        calculatedStatus = "absent";
      }

      return {
        id: s.id,
        title: s.title,
        sessionDate: s.session_date,
        isOpen: s.is_open,
        submission: submission || null,
        status: calculatedStatus,
      };
    });

    return NextResponse.json({
      club: {
        id: club.id,
        name: club.name,
        teacherName,
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
