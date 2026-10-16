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
    const { attendanceId, status } = body;

    if (!attendanceId || !["approved", "rejected", "pending"].includes(status)) {
      return NextResponse.json(
        { error: "Valid attendanceId and status are required" },
        { status: 400 }
      );
    }

    // IDOR Protection: Verify teacher is leader of the club for this attendance record
    const { data: record, error: recErr } = await supabaseAdmin
      .from("attendance")
      .select("id, session_id, sessions(club_id)")
      .eq("id", attendanceId)
      .maybeSingle();

    if (recErr || !record || !record.sessions) {
      return NextResponse.json(
        { error: "Attendance record not found" },
        { status: 404 }
      );
    }

    const clubId = (record.sessions as any).club_id;
    const { data: leaderMember } = await supabaseAdmin
      .from("club_members")
      .select("id")
      .eq("club_id", clubId)
      .eq("user_id", user.id)
      .eq("role_in_club", "leader")
      .maybeSingle();

    if (!leaderMember) {
      return NextResponse.json(
        { error: "You are not authorized to update attendance for this club" },
        { status: 403 }
      );
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from("attendance")
      .update({ status })
      .eq("id", attendanceId)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, attendance: updated });
  } catch (err: any) {
    console.error("Update attendance status error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update attendance status" },
      { status: 500 }
    );
  }
}
