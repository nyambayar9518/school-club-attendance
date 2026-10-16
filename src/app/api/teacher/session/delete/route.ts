import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
    }

    // Verify session exists
    const { data: session, error: sessErr } = await supabaseAdmin
      .from("sessions")
      .select("id, club_id, title")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessErr || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Verify teacher is the leader of this club
    const { data: leaderMember } = await supabaseAdmin
      .from("club_members")
      .select("id")
      .eq("club_id", session.club_id)
      .eq("user_id", user.id)
      .eq("role_in_club", "leader")
      .maybeSingle();

    if (!leaderMember) {
      return NextResponse.json(
        { error: "You are not authorized to delete sessions for this club" },
        { status: 403 }
      );
    }

    // Permanent restriction: Sessions and historical attendance records cannot be deleted
    return NextResponse.json(
      { error: "Attendance sessions cannot be deleted in order to preserve attendance records." },
      { status: 403 }
    );
  } catch (err: any) {
    console.error("Delete session error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to delete session" },
      { status: 500 }
    );
  }
}
