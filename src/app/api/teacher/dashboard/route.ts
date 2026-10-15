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

    // Find the club this teacher leads
    let { data: leaderMembership } = await supabaseAdmin
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

    let club = leaderMembership?.clubs as any;

    // Fallback if not mapped yet
    if (!club) {
      const { data: firstClub } = await supabaseAdmin
        .from("clubs")
        .select("id, name")
        .limit(1)
        .maybeSingle();

      if (firstClub) {
        club = firstClub;
        await supabaseAdmin.from("club_members").upsert(
          {
            club_id: firstClub.id,
            user_id: user.id,
            role_in_club: "leader",
          },
          { onConflict: "club_id, user_id" }
        );
      }
    }

    if (!club) {
      return NextResponse.json(
        { error: "No club configured in system" },
        { status: 404 }
      );
    }

    // Get sessions for this club
    const { data: sessions, error: sessErr } = await supabaseAdmin
      .from("sessions")
      .select("id, title, session_date, is_open, created_at")
      .eq("club_id", club.id)
      .order("session_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (sessErr) {
      return NextResponse.json({ error: sessErr.message }, { status: 500 });
    }

    // Count enrolled students in this club
    const { count: enrolledCount } = await supabaseAdmin
      .from("club_members")
      .select("*", { count: "exact", head: true })
      .eq("club_id", club.id)
      .eq("role_in_club", "student");

    // Enhance sessions with submission counts
    const enhancedSessions = await Promise.all(
      (sessions || []).map(async (s) => {
        const { count: submissionCount } = await supabaseAdmin
          .from("attendance")
          .select("*", { count: "exact", head: true })
          .eq("session_id", s.id);

        const { count: pendingCount } = await supabaseAdmin
          .from("attendance")
          .select("*", { count: "exact", head: true })
          .eq("session_id", s.id)
          .eq("status", "pending");

        const { count: approvedCount } = await supabaseAdmin
          .from("attendance")
          .select("*", { count: "exact", head: true })
          .eq("session_id", s.id)
          .eq("status", "approved");

        return {
          id: s.id,
          title: s.title,
          sessionDate: s.session_date,
          isOpen: s.is_open,
          submissionCount: submissionCount || 0,
          pendingCount: pendingCount || 0,
          approvedCount: approvedCount || 0,
          enrolledCount: enrolledCount || 0,
        };
      })
    );

    return NextResponse.json({
      teacher: user,
      club: {
        id: club.id,
        name: club.name,
      },
      enrolledCount: enrolledCount || 0,
      sessions: enhancedSessions,
    });
  } catch (err: any) {
    console.error("Teacher dashboard API error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
