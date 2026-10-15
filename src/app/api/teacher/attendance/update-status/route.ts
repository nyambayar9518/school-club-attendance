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
