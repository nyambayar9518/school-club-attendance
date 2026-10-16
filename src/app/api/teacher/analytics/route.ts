import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find teacher's club
    const { data: leaderMember } = await supabaseAdmin
      .from("club_members")
      .select("club_id, clubs(id, name)")
      .eq("user_id", user.id)
      .eq("role_in_club", "leader")
      .maybeSingle();

    if (!leaderMember || !leaderMember.clubs) {
      return NextResponse.json({ error: "Club not found for this teacher" }, { status: 404 });
    }

    const club = leaderMember.clubs as any;

    // 1. Fetch all sessions ordered chronologically from beginning to end
    const { data: sessions, error: sessErr } = await supabaseAdmin
      .from("sessions")
      .select("id, title, session_date, is_open, created_at")
      .eq("club_id", club.id)
      .order("session_date", { ascending: true })
      .order("created_at", { ascending: true });

    if (sessErr) {
      return NextResponse.json({ error: sessErr.message }, { status: 500 });
    }

    // 2. Fetch all enrolled students
    const { data: enrolledRows, error: memErr } = await supabaseAdmin
      .from("club_members")
      .select(`
        user_id,
        users (
          id,
          full_name,
          grade,
          phone,
          avatar_url
        )
      `)
      .eq("club_id", club.id)
      .eq("role_in_club", "student");

    if (memErr) {
      return NextResponse.json({ error: memErr.message }, { status: 500 });
    }

    const enrolledStudents = (enrolledRows || [])
      .map((r) => r.users as any)
      .filter(Boolean)
      .sort((a, b) => a.full_name.localeCompare(b.full_name));

    const totalEnrolled = enrolledStudents.length;

    // 3. Fetch all attendance submissions
    const sessionIds = (sessions || []).map((s) => s.id);
    let allAttendance: any[] = [];

    if (sessionIds.length > 0) {
      const { data: attData } = await supabaseAdmin
        .from("attendance")
        .select("id, session_id, student_id, status, submitted_at")
        .in("session_id", sessionIds);

      allAttendance = attData || [];
    }

    // Map attendance by session_id and student_id
    const attendanceMap = new Map<string, string>(); // key: `${sessionId}_${studentId}` -> status
    for (const a of allAttendance) {
      attendanceMap.set(`${a.session_id}_${a.student_id}`, a.status);
    }

    // 4. Compute per-session metrics for graphic chart
    const sessionMetrics = (sessions || []).map((s) => {
      let approvedCount = 0;
      let pendingCount = 0;
      let rejectedCount = 0;

      for (const st of enrolledStudents) {
        const status = attendanceMap.get(`${s.id}_${st.id}`);
        if (status === "approved") approvedCount++;
        else if (status === "pending") pendingCount++;
        else if (status === "rejected") rejectedCount++;
      }

      const absentCount = Math.max(0, totalEnrolled - (approvedCount + pendingCount));
      const rate = totalEnrolled > 0 ? Math.round((approvedCount / totalEnrolled) * 100) : 0;

      return {
        id: s.id,
        title: s.title,
        date: s.session_date,
        isOpen: s.is_open,
        totalEnrolled,
        approvedCount,
        pendingCount,
        rejectedCount,
        absentCount,
        rate,
      };
    });

    // 5. Compute per-student breakdown across timeline
    const studentBreakdown = enrolledStudents.map((st) => {
      const records: Record<string, string> = {};
      let studentApproved = 0;

      for (const s of sessions || []) {
        const status = attendanceMap.get(`${s.id}_${st.id}`) || "absent";
        records[s.id] = status;
        if (status === "approved") studentApproved++;
      }

      const totalSess = sessions?.length || 0;
      const rate = totalSess > 0 ? Math.round((studentApproved / totalSess) * 100) : 0;

      return {
        id: st.id,
        name: st.full_name,
        grade: st.grade,
        phone: st.phone,
        avatarUrl: st.avatar_url,
        approvedTotal: studentApproved,
        attendanceRate: rate,
        records,
      };
    });

    // 6. Overall average attendance across all recorded sessions
    const totalPossibleAttendances = totalEnrolled * (sessions?.length || 0);
    const totalApprovedOverall = allAttendance.filter((a) => a.status === "approved").length;
    const overallRate =
      totalPossibleAttendances > 0
        ? Math.round((totalApprovedOverall / totalPossibleAttendances) * 100)
        : 0;

    return NextResponse.json({
      club: {
        id: club.id,
        name: club.name,
      },
      enrolledCount: totalEnrolled,
      totalSessions: sessions?.length || 0,
      overallRate,
      sessions: sessionMetrics,
      students: studentBreakdown,
    });
  } catch (err: any) {
    console.error("Analytics route error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to load analytics" },
      { status: 500 }
    );
  }
}
