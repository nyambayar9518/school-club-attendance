import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const isAuth = await isAdminAuthenticated();
    if (!isAuth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch Clubs
    const { data: clubs } = await supabaseAdmin
      .from("clubs")
      .select("id, name, created_at")
      .order("name", { ascending: true });

    // 2. Fetch all Users
    const { data: users } = await supabaseAdmin
      .from("users")
      .select("id, full_name, phone, role, grade, avatar_url, created_at")
      .order("full_name", { ascending: true });

    const teachersList = (users || []).filter((u) => u.role === "teacher");
    const studentsList = (users || []).filter((u) => u.role === "student");

    // 3. Fetch Club Memberships
    const { data: memberships } = await supabaseAdmin
      .from("club_members")
      .select("id, club_id, user_id, role_in_club");

    // 4. Fetch Sessions
    const { data: sessions } = await supabaseAdmin
      .from("sessions")
      .select("id, club_id, title, session_date, is_open, created_at")
      .order("session_date", { ascending: false });

    // 5. Fetch Attendance Submissions
    const { data: attendance } = await supabaseAdmin
      .from("attendance")
      .select(`
        id,
        session_id,
        student_id,
        photo_url,
        description,
        status,
        submitted_at
      `)
      .order("submitted_at", { ascending: false });

    // 6. Fetch Schedules
    let schedules: any[] = [];
    try {
      const { data: schedData } = await supabaseAdmin
        .from("club_schedules")
        .select("*")
        .order("day_of_week", { ascending: true })
        .order("start_time", { ascending: true });
      if (schedData) schedules = schedData;
    } catch {
      schedules = [];
    }

    // Helper maps
    const clubMap = new Map((clubs || []).map((c) => [c.id, c.name]));
    const userMap = new Map((users || []).map((u) => [u.id, u]));
    const sessionMap = new Map((sessions || []).map((s) => [s.id, s]));

    // Group memberships
    const studentClubsMap = new Map<string, string[]>();
    const clubStudentsMap = new Map<string, string[]>();
    const teacherClubMap = new Map<string, string>(); // teacherId -> clubId

    (memberships || []).forEach((m) => {
      if (m.role_in_club === "student") {
        const studentClubs = studentClubsMap.get(m.user_id) || [];
        const clubName = clubMap.get(m.club_id) || "Club";
        studentClubs.push(clubName);
        studentClubsMap.set(m.user_id, studentClubs);

        const studentsInClub = clubStudentsMap.get(m.club_id) || [];
        studentsInClub.push(m.user_id);
        clubStudentsMap.set(m.club_id, studentsInClub);
      } else if (m.role_in_club === "leader") {
        teacherClubMap.set(m.user_id, m.club_id);
      }
    });

    // Group schedules by club
    const clubSchedulesMap = new Map<string, any[]>();
    schedules.forEach((s) => {
      const list = clubSchedulesMap.get(s.club_id) || [];
      list.push(s);
      clubSchedulesMap.set(s.club_id, list);
    });

    // Build Teacher details
    const enhancedTeachers = teachersList.map((t) => {
      const clubId = teacherClubMap.get(t.id);
      const clubName = clubId ? clubMap.get(clubId) || "Not Assigned" : "Not Assigned";
      const enrolledCount = clubId ? (clubStudentsMap.get(clubId) || []).length : 0;
      const clubSessions = (sessions || []).filter((s) => s.club_id === clubId);
      const clubSlots = clubId ? clubSchedulesMap.get(clubId) || [] : [];

      return {
        id: t.id,
        fullName: t.full_name,
        phone: t.phone,
        avatarUrl: t.avatar_url,
        clubId: clubId || null,
        clubName,
        enrolledStudentsCount: enrolledCount,
        sessionsCount: clubSessions.length,
        schedules: clubSlots,
      };
    });

    // Student approved counts
    const studentApprovedMap = new Map<string, number>();
    (attendance || []).forEach((a) => {
      if (a.status === "approved") {
        studentApprovedMap.set(a.student_id, (studentApprovedMap.get(a.student_id) || 0) + 1);
      }
    });

    // Build Student details
    const enhancedStudents = studentsList.map((s) => {
      const enrolledClubs = studentClubsMap.get(s.id) || [];
      const approvedCount = studentApprovedMap.get(s.id) || 0;

      // Find total sessions in the clubs this student joined
      const joinedClubIds = (memberships || [])
        .filter((m) => m.user_id === s.id && m.role_in_club === "student")
        .map((m) => m.club_id);

      const totalPossibleSessions = (sessions || []).filter((sess) =>
        joinedClubIds.includes(sess.club_id)
      ).length;

      const rate =
        totalPossibleSessions > 0
          ? Math.round((approvedCount / totalPossibleSessions) * 100)
          : 0;

      return {
        id: s.id,
        fullName: s.full_name,
        grade: s.grade,
        phone: s.phone,
        avatarUrl: s.avatar_url,
        enrolledClubs,
        approvedAttendanceCount: approvedCount,
        totalPossibleSessions,
        attendanceRate: rate,
      };
    });

    // Build Master Attendance feed
    const formattedAttendance = (attendance || []).map((a) => {
      const student = userMap.get(a.student_id);
      const session = sessionMap.get(a.session_id);
      const clubName = session ? clubMap.get(session.club_id) || "Club" : "Club";

      return {
        id: a.id,
        studentId: a.student_id,
        studentName: student?.full_name || "Unknown Student",
        grade: student?.grade ?? null,
        phone: student?.phone || "",
        sessionId: a.session_id,
        sessionTitle: session?.title || "Session",
        sessionDate: session?.session_date || "—",
        clubName,
        photoUrl: a.photo_url,
        description: a.description,
        status: a.status,
        submittedAt: a.submitted_at,
      };
    });

    // Metrics
    const totalClubs = (clubs || []).length;
    const totalTeachers = teachersList.length;
    const totalStudents = studentsList.length;
    const totalSessions = (sessions || []).length;
    const totalApproved = (attendance || []).filter((a) => a.status === "approved").length;
    const totalSubmissions = (attendance || []).length;

    const overallAttendanceRate =
      totalSubmissions > 0
        ? Math.round((totalApproved / totalSubmissions) * 100)
        : 100;

    return NextResponse.json({
      metrics: {
        totalClubs,
        totalTeachers,
        totalStudents,
        totalSessions,
        totalSubmissions,
        totalApproved,
        overallAttendanceRate,
      },
      teachers: enhancedTeachers,
      students: enhancedStudents,
      attendance: formattedAttendance,
      clubs: (clubs || []).map((c) => ({ id: c.id, name: c.name })),
    });
  } catch (err: any) {
    console.error("Admin overview error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to load administrator overview" },
      { status: 500 }
    );
  }
}
