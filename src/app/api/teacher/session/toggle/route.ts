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
    const { sessionId, isOpen } = body;

    if (!sessionId || typeof isOpen !== "boolean") {
      return NextResponse.json(
        { error: "Session ID and isOpen boolean are required" },
        { status: 400 }
      );
    }

    // Verify session and teacher ownership
    const { data: session } = await supabaseAdmin
      .from("sessions")
      .select("id, club_id")
      .eq("id", sessionId)
      .maybeSingle();

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const { data: leaderMembership } = await supabaseAdmin
      .from("club_members")
      .select("id")
      .eq("club_id", session.club_id)
      .eq("user_id", user.id)
      .eq("role_in_club", "leader")
      .maybeSingle();

    if (!leaderMembership) {
      return NextResponse.json(
        { error: "Unauthorized to modify this session" },
        { status: 403 }
      );
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from("sessions")
      .update({ is_open: isOpen })
      .eq("id", sessionId)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, session: updated });
  } catch (err: any) {
    console.error("Toggle session error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update session" },
      { status: 500 }
    );
  }
}
