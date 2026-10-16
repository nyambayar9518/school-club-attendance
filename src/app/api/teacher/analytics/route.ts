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

    // Helper to parse grade range from session title
    const parseSessionInfo = (title: string) => {
      const gradeMatch = title.match(/Grades?\s*(\d+)[–\-](\d+)/i);
      const timeMatch = title.match(/(\d{1,2}:\d{2}\s*[–\-]\s*\d{1,2}:\d{2})/);
      
      let gradeMin = null;
      let gradeMax = null;
      let cohortLabel = "All";

      if (gradeMatch) {
        gradeMin = parseInt(gradeMatch[1], 10);
        gradeMax = parseInt(gradeMatch[2], 10);
        cohortLabel = `Gr. ${gradeMin}–${gradeMax}`;
      }

      const timeLabel = timeMatch ? timeMatch[1] : "";
      const displayLabel = timeLabel ? `${cohortLabel} · ${timeLabel}` : cohortLabel;

      return { gradeMin, gradeMax, cohortLabel, timeLabel, displayLabel };
    };

    // 4. Compute per-session metrics for graphic chart
    const sessionMetrics = (sessions || []).map((s) => {
      const info = parseSessionInfo(s.title);

      // Filter students eligible for this specific session
      const eligibleStudents = enrolledStudents.filter((st) => {
        if (info.gradeMin === null || info.gradeMax === null || !st.grade) return true;
        return st.grade >= info.gradeMin && st.grade <= info.gradeMax;
      });

      const eligibleCount = eligibleStudents.length;
      let approvedCount = 0;
      let pendingCount = 0;
      let rejectedCount = 0;

      for (const st of eligibleStudents) {
        const status = attendanceMap.get(`${s.id}_${st.id}`);
        if (status === "approved") approvedCount++;
        else if (status === "pending") pendingCount++;
        else if (status === "rejected") rejectedCount++;
      }

      const absentCount = Math.max(0, eligibleCount - (approvedCount + pendingCount));
      const rate = eligibleCount > 0 ? Math.round((approvedCount / eligibleCount) * 100) : 0;

      return {
        id: s.id,
        title: s.title,
        date: s.session_date,
        isOpen: s.is_open,
        totalEnrolled: eligibleCount,
        cohortLabel: info.cohortLabel,
        displayLabel: info.displayLabel,
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
      let applicableSessions = 0;

      for (const s of sessions || []) {
        const info = parseSessionInfo(s.title);
        const isApplicable =
          info.gradeMin === null ||
          info.gradeMax === null ||
          !st.grade ||
          (st.grade >= info.gradeMin && st.grade <= info.gradeMax);

        if (!isApplicable) {
          records[s.id] = "na";
        } else {
          applicableSessions++;
          const status = attendanceMap.get(`${s.id}_${st.id}`) || "absent";
          records[s.id] = status;
          if (status === "approved") {
            studentApproved++;
          }
        }
      }

      const rate =
        applicableSessions > 0
          ? Math.round((studentApproved / applicableSessions) * 100)
          : 0;

      return {
        id: st.id,
        name: st.full_name,
        grade: st.grade,
        phone: st.phone,
        avatarUrl: st.avatar_url,
        approvedTotal: studentApproved,
        applicableTotal: applicableSessions,
        attendanceRate: rate,
        records,
      };
    });

    // 6. Overall average attendance across all recorded sessions
    let totalEligibleOccurrences = 0;
    for (const sm of sessionMetrics) {
      totalEligibleOccurrences += sm.totalEnrolled;
    }
    const totalApprovedOverall = allAttendance.filter((a) => a.status === "approved").length;
    const overallRate =
      totalEligibleOccurrences > 0
        ? Math.round((totalApprovedOverall / totalEligibleOccurrences) * 100)
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
