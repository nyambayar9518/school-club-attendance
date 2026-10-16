import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyPassword, signSessionToken, COOKIE_NAME } from "@/lib/auth";
import { checkRateLimit, resetRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = await checkRateLimit(`login:${ip}`, 5, 900);
    if (!rl.success) {
      return NextResponse.json(
        { error: `Too many login attempts. Please try again in ${Math.ceil(rl.resetSeconds / 60)} minutes.` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { phone, password } = body;

    if (!phone || !password) {
      return NextResponse.json(
        { error: "Phone number and password are required" },
        { status: 400 }
      );
    }

    const cleanPhone = phone.trim();

    // Query user by phone
    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("id, full_name, phone, password_hash, role, grade, avatar_url")
      .eq("phone", cleanPhone)
      .maybeSingle();

    if (error) {
      console.error("Database query error:", error);
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: "Invalid phone number or password" },
        { status: 401 }
      );
    }

    const isMatch = await verifyPassword(password, user.password_hash);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Invalid phone number or password" },
        { status: 401 }
      );
    }

    // Reset failed login counter on success
    await resetRateLimit(`login:${ip}`);

    // Create session token
    const token = await signSessionToken({
      id: user.id,
      fullName: user.full_name,
      phone: user.phone,
      role: user.role,
      grade: user.grade,
      avatarUrl: user.avatar_url,
    });

    const response = NextResponse.json({
      success: true,
      role: user.role,
      user: {
        id: user.id,
        fullName: user.full_name,
        phone: user.phone,
        role: user.role,
        grade: user.grade,
        avatarUrl: user.avatar_url,
      },
    });

    // Set HTTP-only secure session cookie
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    });

    return response;
  } catch (err: any) {
    console.error("Login route error:", err);
    return NextResponse.json(
      { error: err.message || "An unexpected error occurred during login" },
      { status: 500 }
    );
  }
}
