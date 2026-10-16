import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const isAuth = await isAdminAuthenticated();
    if (!isAuth) {
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

    const { data: updated, error } = await supabaseAdmin
      .from("attendance")
      .update({ status })
      .eq("id", attendanceId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, attendance: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
