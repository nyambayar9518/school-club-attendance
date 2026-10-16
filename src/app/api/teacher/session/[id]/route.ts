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
    if (!user || user.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionId = params.id;

    // Get session
    const { data: session, error: sessErr } = await supabaseAdmin
      .from("sessions")
      .select("id, club_id, title, session_date, is_open, created_at")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessErr || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Verify teacher is the leader of this session's club
    const { data: leaderMember } = await supabaseAdmin
      .from("club_members")
      .select("id")
      .eq("club_id", session.club_id)
      .eq("user_id", user.id)
      .eq("role_in_club", "leader")
      .maybeSingle();

    if (!leaderMember) {
      return NextResponse.json(
        { error: "You are not authorized to view details for this club session" },
        { status: 403 }
      );
    }

    // Get all enrolled students in this club
    const { data: enrolledMembers, error: memErr } = await supabaseAdmin
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
      .eq("club_id", session.club_id)
      .eq("role_in_club", "student");

    if (memErr) {
      return NextResponse.json({ error: memErr.message }, { status: 500 });
    }

    // Get all attendance submissions for this session
    const { data: submissions, error: subErr } = await supabaseAdmin
      .from("attendance")
      .select(`
        id,
        session_id,
        student_id,
        photo_url,
        description,
        status,
        submitted_at,
        users (
          id,
          full_name,
          grade,
          phone,
          avatar_url
        )
      `)
      .eq("session_id", sessionId)
      .order("submitted_at", { ascending: false });

    if (subErr) {
      return NextResponse.json({ error: subErr.message }, { status: 500 });
    }

    const submittedStudentIds = new Set(
      (submissions || []).map((s) => s.student_id)
    );

    // Filter enrolled members who have not submitted
    const missing = (enrolledMembers || [])
      .map((m: any) => m.users)
      .filter((u: any) => u && !submittedStudentIds.has(u.id))
      .map((u: any) => ({
        id: u.id,
        fullName: u.full_name,
        grade: u.grade,
        phone: u.phone,
        avatarUrl: u.avatar_url,
      }));

    const formattedSubmissions = (submissions || []).map((s: any) => ({
      id: s.id,
      studentId: s.student_id,
      studentName: s.users?.full_name || "Unknown Student",
      grade: s.users?.grade ?? null,
      phone: s.users?.phone || "",
      avatarUrl: s.users?.avatar_url || null,
      photoUrl: s.photo_url,
      description: s.description,
      status: s.status,
      submittedAt: s.submitted_at,
    }));

    return NextResponse.json({
      session,
      submitted: formattedSubmissions,
      missing,
    });
  } catch (err: any) {
    console.error("Session review API error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
