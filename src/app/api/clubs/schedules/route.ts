import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gradeParam = searchParams.get("grade");
    const targetGrade = gradeParam ? parseInt(gradeParam, 10) : null;

    // Fetch all clubs
    const { data: clubs, error: clubsError } = await supabaseAdmin
      .from("clubs")
      .select("id, name")
      .order("name", { ascending: true });

    if (clubsError) {
      return NextResponse.json({ error: clubsError.message }, { status: 500 });
    }

    // Try fetching schedules if club_schedules table exists
    let schedules: any[] = [];
    try {
      const { data: schedData, error: schedError } = await supabaseAdmin
        .from("club_schedules")
        .select("id, club_id, day_of_week, start_time, end_time, min_grade, max_grade")
        .order("day_of_week", { ascending: true })
        .order("start_time", { ascending: true });

      if (!schedError && schedData) {
        schedules = schedData;
      }
    } catch {
      // Table may not be created yet, fallback gracefully
      schedules = [];
    }

    // Group schedules by club_id
    const clubSchedulesMap = new Map<string, any[]>();
    schedules.forEach((s) => {
      const list = clubSchedulesMap.get(s.club_id) || [];
      list.push(s);
      clubSchedulesMap.set(s.club_id, list);
    });

    const enhancedClubs = (clubs || []).map((c) => {
      const clubSlots = clubSchedulesMap.get(c.id) || [];
      
      // Check if this club is eligible for targetGrade
      let isEligible = true;
      let matchingSlot = null;

      if (targetGrade !== null && !isNaN(targetGrade)) {
        if (clubSlots.length > 0) {
          matchingSlot = clubSlots.find(
            (slot) => targetGrade >= slot.min_grade && targetGrade <= slot.max_grade
          );
          isEligible = !!matchingSlot;
        } else {
          // If no slots configured yet, default to eligible for all grades
          isEligible = true;
        }
      }

      return {
        id: c.id,
        name: c.name,
        schedules: clubSlots,
        isEligible,
        matchingSlot: matchingSlot || (clubSlots.length === 1 ? clubSlots[0] : null),
      };
    });

    return NextResponse.json({
      clubs: enhancedClubs,
    });
  } catch (err: any) {
    console.error("Clubs schedules API error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch club schedules" },
      { status: 500 }
    );
  }
}
