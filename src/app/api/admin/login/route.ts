import { NextResponse } from "next/server";
import { signAdminToken, ADMIN_COOKIE_NAME, verifyAdminCode } from "@/lib/auth";
import { checkRateLimit, resetRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = await checkRateLimit(`admin_login:${ip}`, 5, 900);
    if (!rl.success) {
      return NextResponse.json(
        { error: `Too many failed admin login attempts. Locked for ${Math.ceil(rl.resetSeconds / 60)} minutes.` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { passcode } = body;

    if (!passcode || !verifyAdminCode(passcode)) {
      return NextResponse.json(
        { error: "Invalid administrator passcode" },
        { status: 401 }
      );
    }

    // Reset rate limiter on successful authentication
    await resetRateLimit(`admin_login:${ip}`);

    const token = await signAdminToken();

    const response = NextResponse.json({ success: true });
    response.cookies.set(ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Admin login error" },
      { status: 500 }
    );
  }
}
