import { NextResponse } from "next/server";
import { signAdminToken, ADMIN_COOKIE_NAME } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { passcode } = body;

    const expectedPasscode =
      process.env.ADMIN_CODE ||
      process.env.NEXT_PUBLIC_ADMIN_CODE ||
      "ADMIN2026";

    if (!passcode || passcode.trim() !== expectedPasscode.trim()) {
      return NextResponse.json(
        { error: "Invalid administrator passcode" },
        { status: 401 }
      );
    }

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
