import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "school_session_token";
const JWT_SECRET_STRING = process.env.JWT_SECRET || "fallback-secret-minimum-32-characters-needed-123456";
const encodedKey = new TextEncoder().encode(JWT_SECRET_STRING);

interface DecodedUser {
  id: string;
  role: "student" | "teacher";
}

async function verifyToken(token: string): Promise<DecodedUser | null> {
  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ["HS256"],
    });
    return {
      id: payload.id as string,
      role: payload.role as "student" | "teacher",
    };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets and internal next requests
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const user = token ? await verifyToken(token) : null;

  const isAuthRoute =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/teacher-register";

  // If user is logged in and trying to access an auth page (login, signup, root)
  if (isAuthRoute && user) {
    if (user.role === "teacher") {
      return NextResponse.redirect(new URL("/teacher", request.url));
    } else {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // If user is not logged in and trying to access a protected page
  const isTeacherRoute =
    pathname === "/teacher" || pathname.startsWith("/teacher/");

  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/club") ||
    isTeacherRoute;

  if (isProtectedRoute && !user) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based protection: Student trying to access teacher dashboard
  if (isTeacherRoute && user?.role !== "teacher") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Role-based protection: Teacher trying to access student dashboard
  if (pathname === "/dashboard" && user?.role === "teacher") {
    return NextResponse.redirect(new URL("/teacher", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/signup",
    "/teacher-register",
    "/dashboard/:path*",
    "/club/:path*",
    "/teacher/:path*",
  ],
};
