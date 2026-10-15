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
      .select(`
        club_id,
        clubs (
          id,
          name
        )
      `)
      .eq("user_id", user.id)
      .eq("role_in_club", "leader")
      .maybeSingle();

    const club = leaderMember?.clubs as any;
    if (!club) {
      return NextResponse.json({ error: "No club found" }, { status: 404 });
    }

    // Get all enrolled students
    const { data: members, error: memErr } = await supabaseAdmin
      .from("club_members")
      .select(`
        user_id,
        users (
          id,
          full_name,
          grade,
          phone,
          avatar_url,
          created_at
        )
      `)
      .eq("club_id", club.id)
      .eq("role_in_club", "student");

    if (memErr) {
      return NextResponse.json({ error: memErr.message }, { status: 500 });
    }

    // Get total club sessions
    const { count: totalSessions } = await supabaseAdmin
      .from("sessions")
      .select("*", { count: "exact", head: true })
      .eq("club_id", club.id);

    // Compute approved attendance count for each student in this club
    const roster = await Promise.all(
      (members || []).map(async (m: any) => {
        const student = m.users;
        if (!student) return null;

        const { data: approvedList } = await supabaseAdmin
          .from("attendance")
          .select(`
            id,
            sessions!inner (
              club_id
            )
          `)
          .eq("student_id", student.id)
          .eq("status", "approved")
          .eq("sessions.club_id", club.id);

        const approvedCount = approvedList ? approvedList.length : 0;

        return {
          id: student.id,
          fullName: student.full_name,
          grade: student.grade,
          phone: student.phone,
          avatarUrl: student.avatar_url,
          approvedCount,
          totalSessions: totalSessions || 0,
        };
      })
    );

    return NextResponse.json({
      club: {
        id: club.id,
        name: club.name,
      },
      totalSessions: totalSessions || 0,
      students: (roster.filter(Boolean) as any[]).sort((a, b) =>
        a.fullName.localeCompare(b.fullName)
      ),
    });
  } catch (err: any) {
    console.error("Roster API error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
