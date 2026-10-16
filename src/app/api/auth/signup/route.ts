import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { hashPassword, signSessionToken, COOKIE_NAME } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = await checkRateLimit(`register_student:${ip}`, 10, 900);
    if (!rl.success) {
      return NextResponse.json(
        { error: `Too many sign-up attempts. Please try again in ${Math.ceil(rl.resetSeconds / 60)} minutes.` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const {
      fullName,
      phone,
      password,
      grade,
      avatarUrl,
      firstClubName,
      secondClubName,
    } = body;

    // Required fields check
    if (!fullName || !phone || !password || !grade || !firstClubName || !secondClubName) {
      return NextResponse.json(
        { error: "Full name, phone, password, grade, and two clubs are required" },
        { status: 400 }
      );
    }

    if (typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    if (firstClubName === secondClubName) {
      return NextResponse.json(
        { error: "First and second clubs must be different" },
        { status: 400 }
      );
    }

    const cleanPhone = phone.trim();
    const parsedGrade = parseInt(grade, 10);

    if (isNaN(parsedGrade) || parsedGrade < 6 || parsedGrade > 12) {
      return NextResponse.json(
        { error: "Grade must be between 6 and 12" },
        { status: 400 }
      );
    }

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

    // Hash password
    const passwordHash = await hashPassword(password);

    // Insert student user
    const { data: newUser, error: userError } = await supabaseAdmin
      .from("users")
      .insert({
        full_name: fullName.trim(),
        phone: cleanPhone,
        password_hash: passwordHash,
        role: "student",
        grade: parsedGrade,
        avatar_url: avatarUrl || null,
      })
      .select("id, full_name, phone, role, grade, avatar_url")
      .single();

    if (userError || !newUser) {
      console.error("User insertion error:", userError);
      return NextResponse.json(
        { error: `Failed to create user account: ${userError?.message || "Unknown error"}` },
        { status: 500 }
      );
    }

    // Resolve or find the club IDs
    const clubNames = [firstClubName, secondClubName];
    const { data: foundClubs, error: clubsError } = await supabaseAdmin
      .from("clubs")
      .select("id, name")
      .in("name", clubNames);

    if (clubsError) {
      console.error("Clubs lookup error:", clubsError);
    }

    // Map found clubs, or insert if club doesn't exist yet
    const clubMap = new Map<string, string>();
    (foundClubs || []).forEach((c) => clubMap.set(c.name, c.id));

    for (const name of clubNames) {
      if (!clubMap.has(name)) {
        const { data: insertedClub } = await supabaseAdmin
          .from("clubs")
          .insert({ name })
          .select("id, name")
          .single();
        if (insertedClub) {
          clubMap.set(insertedClub.name, insertedClub.id);
        }
      }
    }

    const firstClubId = clubMap.get(firstClubName);
    const secondClubId = clubMap.get(secondClubName);

    if (!firstClubId || !secondClubId) {
      return NextResponse.json(
        { error: "Failed to map selected clubs in database" },
        { status: 500 }
      );
    }

    // Insert 2 rows in club_members
    const { error: memberError } = await supabaseAdmin
      .from("club_members")
      .insert([
        {
          club_id: firstClubId,
          user_id: newUser.id,
          role_in_club: "student",
        },
        {
          club_id: secondClubId,
          user_id: newUser.id,
          role_in_club: "student",
        },
      ]);

    if (memberError) {
      console.error("Club membership insertion error:", memberError);
      return NextResponse.json(
        { error: `Failed to join clubs: ${memberError.message}` },
        { status: 500 }
      );
    }

    // Create session token
    const token = await signSessionToken({
      id: newUser.id,
      fullName: newUser.full_name,
      phone: newUser.phone,
      role: newUser.role,
      grade: newUser.grade,
      avatarUrl: newUser.avatar_url,
    });

    const response = NextResponse.json({
      success: true,
      role: "student",
      user: newUser,
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
    console.error("Student signup error:", err);
    return NextResponse.json(
      { error: err.message || "An unexpected error occurred during signup" },
      { status: 500 }
    );
  }
}
