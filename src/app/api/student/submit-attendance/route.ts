import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "student") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, photoUrl, description } = body;

    if (!sessionId || !description) {
      return NextResponse.json(
        { error: "Session ID and description are required" },
        { status: 400 }
      );
    }

    // Verify session exists and is open
    const { data: session, error: sessErr } = await supabaseAdmin
      .from("sessions")
      .select("id, club_id, is_open")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessErr || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (!session.is_open) {
      return NextResponse.json(
        { error: "This attendance session is currently closed" },
        { status: 400 }
      );
    }

    // Verify student is enrolled in this club
    const { data: membership } = await supabaseAdmin
      .from("club_members")
      .select("id")
      .eq("club_id", session.club_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json(
        { error: "You are not enrolled in this club" },
        { status: 403 }
      );
    }

    // Check if submission already exists
    const { data: existing } = await supabaseAdmin
      .from("attendance")
      .select("id, status")
      .eq("session_id", sessionId)
      .eq("student_id", user.id)
      .maybeSingle();

    if (existing) {
      // If already submitted and not rejected, return conflict or update
      if (existing.status === "approved") {
        return NextResponse.json(
          { error: "Your attendance for this session is already approved" },
          { status: 400 }
        );
      }

      // Update existing submission
      const { data: updated, error: updateErr } = await supabaseAdmin
        .from("attendance")
        .update({
          photo_url: photoUrl || null,
          description: description.trim(),
          status: "pending",
          submitted_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, submission: updated });
    }

    // Insert new attendance record
    const { data: newRecord, error: insertErr } = await supabaseAdmin
      .from("attendance")
      .insert({
        session_id: sessionId,
        student_id: user.id,
        photo_url: photoUrl || null,
        description: description.trim(),
        status: "pending",
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertErr) {
      return NextResponse.json(
        { error: `Failed to submit attendance: ${insertErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, submission: newRecord });
  } catch (err: any) {
    console.error("Attendance submission error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to submit attendance" },
      { status: 500 }
    );
  }
}
