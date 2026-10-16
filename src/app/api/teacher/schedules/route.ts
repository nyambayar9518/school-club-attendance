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
      .select("club_id")
      .eq("user_id", user.id)
      .eq("role_in_club", "leader")
      .maybeSingle();

    if (!leaderMember) {
      return NextResponse.json({ error: "No club found for this teacher" }, { status: 404 });
    }

    const { data: schedules, error } = await supabaseAdmin
      .from("club_schedules")
      .select("*")
      .eq("club_id", leaderMember.club_id)
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      // Return empty if table not yet migrated
      return NextResponse.json({ schedules: [] });
    }

    return NextResponse.json({ schedules: schedules || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { dayOfWeek, startTime, endTime, minGrade, maxGrade } = body;

    if (!dayOfWeek || !startTime || !endTime || minGrade === undefined || maxGrade === undefined) {
      return NextResponse.json(
        { error: "Day of week, start/end time, and min/max grade are required" },
        { status: 400 }
      );
    }

    const parsedMin = parseInt(minGrade, 10);
    const parsedMax = parseInt(maxGrade, 10);

    if (parsedMin < 6 || parsedMax > 12 || parsedMin > parsedMax) {
      return NextResponse.json(
        { error: "Grades must be between 6 and 12, with minimum <= maximum" },
        { status: 400 }
      );
    }

    // Find teacher's club
    const { data: leaderMember } = await supabaseAdmin
      .from("club_members")
      .select("club_id")
      .eq("user_id", user.id)
      .eq("role_in_club", "leader")
      .maybeSingle();

    if (!leaderMember) {
      return NextResponse.json({ error: "No club found for this teacher" }, { status: 404 });
    }

    const { data: newSlot, error } = await supabaseAdmin
      .from("club_schedules")
      .insert({
        club_id: leaderMember.club_id,
        teacher_id: user.id,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        min_grade: parsedMin,
        max_grade: parsedMax,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, schedule: newSlot });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Schedule ID is required" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("club_schedules")
      .delete()
      .eq("id", id)
      .eq("teacher_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
