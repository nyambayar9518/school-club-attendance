import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { hashPassword, signSessionToken, COOKIE_NAME } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fullName, phone, password, teachingClubName, teacherCode } = body;

    if (!fullName || !phone || !password || !teachingClubName || !teacherCode) {
      return NextResponse.json(
        { error: "All fields including teacher invite code are required" },
        { status: 400 }
      );
    }

    const expectedCode = process.env.NEXT_PUBLIC_TEACHER_CODE || "TEACHER2026";
    if (teacherCode.trim() !== expectedCode.trim()) {
      return NextResponse.json(
        { error: "Invalid teacher invite code" },
        { status: 403 }
      );
    }

    const cleanPhone = phone.trim();

    // Check if phone already registered
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("phone", cleanPhone)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this phone number already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    // Create teacher user
    const { data: newTeacher, error: userError } = await supabaseAdmin
      .from("users")
      .insert({
        full_name: fullName.trim(),
        phone: cleanPhone,
        password_hash: passwordHash,
        role: "teacher",
        grade: null,
      })
      .select("id, full_name, phone, role")
      .single();

    if (userError || !newTeacher) {
      console.error("Teacher creation error:", userError);
      return NextResponse.json(
        { error: `Failed to create teacher account: ${userError?.message || "Unknown error"}` },
        { status: 500 }
      );
    }

    // Find or create club
    let clubId: string | null = null;
    const { data: existingClub } = await supabaseAdmin
      .from("clubs")
      .select("id")
      .eq("name", teachingClubName)
      .maybeSingle();

    if (existingClub) {
      clubId = existingClub.id;
    } else {
      const { data: createdClub } = await supabaseAdmin
        .from("clubs")
        .insert({ name: teachingClubName })
        .select("id")
        .single();
      if (createdClub) clubId = createdClub.id;
    }

    if (!clubId) {
      return NextResponse.json(
        { error: "Failed to resolve club in database" },
        { status: 500 }
      );
    }

    // Assign as leader in club_members
    const { error: memberError } = await supabaseAdmin
      .from("club_members")
      .insert({
        club_id: clubId,
        user_id: newTeacher.id,
        role_in_club: "leader",
      });

    if (memberError) {
      console.error("Leader membership error:", memberError);
      return NextResponse.json(
        { error: `Failed to assign club leadership: ${memberError.message}` },
        { status: 500 }
      );
    }

    // Create session token
    const token = await signSessionToken({
      id: newTeacher.id,
      fullName: newTeacher.full_name,
      phone: newTeacher.phone,
      role: "teacher",
      grade: null,
      avatarUrl: null,
    });

    const response = NextResponse.json({
      success: true,
      role: "teacher",
      user: newTeacher,
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (err: any) {
    console.error("Teacher register error:", err);
    return NextResponse.json(
      { error: err.message || "An unexpected error occurred during teacher registration" },
      { status: 500 }
    );
  }
}
