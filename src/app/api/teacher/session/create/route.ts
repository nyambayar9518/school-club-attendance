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
    const { clubId, title, sessionDate } = body;

    if (!clubId || !title) {
      return NextResponse.json(
        { error: "Club ID and session title are required" },
        { status: 400 }
      );
    }

    // Verify teacher is leader of this club
    const { data: leaderMembership } = await supabaseAdmin
      .from("club_members")
      .select("id")
      .eq("club_id", clubId)
      .eq("user_id", user.id)
      .eq("role_in_club", "leader")
      .maybeSingle();

    if (!leaderMembership) {
      return NextResponse.json(
        { error: "You are not authorized to create sessions for this club" },
        { status: 403 }
      );
    }

    const todayStr = sessionDate || new Date().toISOString().split("T")[0];

    const { data: newSession, error: createErr } = await supabaseAdmin
      .from("sessions")
      .insert({
        club_id: clubId,
        title: title.trim(),
        session_date: todayStr,
        is_open: true,
      })
      .select()
      .single();

    if (createErr || !newSession) {
      return NextResponse.json(
        { error: `Failed to create session: ${createErr?.message || "Unknown error"}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, session: newSession });
  } catch (err: any) {
    console.error("Create session error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create session" },
      { status: 500 }
    );
  }
}
