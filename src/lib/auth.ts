import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const COOKIE_NAME = "school_session_token";
export const ADMIN_COOKIE_NAME = "school_admin_token";

const JWT_SECRET_STRING = process.env.JWT_SECRET || "fallback-secret-minimum-32-characters-needed-123456";
const encodedKey = new TextEncoder().encode(JWT_SECRET_STRING);

export interface SessionUser {
  id: string;
  fullName: string;
  phone: string;
  role: "student" | "teacher" | "admin";
  grade?: number | null;
  avatarUrl?: string | null;
}

/**
 * Hash a plain text password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compare plain text password against bcrypt hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

/**
 * Sign a lightweight JWT containing user session info
 */
export async function signSessionToken(payload: SessionUser): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d") // 30-day session
    .sign(encodedKey);
}

/**
 * Sign an admin session token
 */
export async function signAdminToken(): Promise<string> {
  return new SignJWT({ role: "admin", authenticated: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encodedKey);
}

/**
 * Verify and decode the JWT session token
 */
export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ["HS256"],
    });

    return {
      id: payload.id as string,
      fullName: payload.fullName as string,
      phone: payload.phone as string,
      role: payload.role as "student" | "teacher" | "admin",
      grade: (payload.grade as number) ?? null,
      avatarUrl: (payload.avatarUrl as string) ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Verify admin session token
 */
export async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ["HS256"],
    });
    return payload.role === "admin" && payload.authenticated === true;
  } catch {
    return false;
  }
}

/**
 * Get current session user from incoming request cookies (Server Component / Route Handler)
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Check if the caller has an active admin session
 */
export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return false;
  return verifyAdminToken(token);
}
