import { supabaseAdmin } from "@/lib/supabase";

// In-memory fallback cache in case Supabase rate_limits table isn't migrated yet
const memoryCache = new Map<string, { points: number; expireAt: number }>();

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetSeconds: number;
}

/**
 * Extracts the real client IP address from request headers
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // Return first IP in the X-Forwarded-For chain
    const ip = forwardedFor.split(",")[0].trim();
    if (ip) return ip;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "127.0.0.1";
}

/**
 * Checks and increments a rate limit key.
 * Uses the Supabase `rate_limits` table with an automatic in-memory fallback.
 * 
 * @param key Unique key for this action and client (e.g. `login:192.168.1.1`)
 * @param limit Maximum allowed points within the window (e.g. 5)
 * @param windowSeconds Window length in seconds (e.g. 900 for 15 minutes)
 */
export async function checkRateLimit(
  key: string,
  limit: number = 5,
  windowSeconds: number = 900
): Promise<RateLimitResult> {
  const now = new Date();
  const nowMs = now.getTime();
  const expireAtIso = new Date(nowMs + windowSeconds * 1000).toISOString();

  try {
    // Attempt database-backed check in Supabase
    const { data, error } = await supabaseAdmin
      .from("rate_limits")
      .select("key, points, expire_at")
      .eq("key", key)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data || new Date(data.expire_at).getTime() <= nowMs) {
      // First attempt or window has expired: reset counter
      await supabaseAdmin
        .from("rate_limits")
        .upsert({
          key,
          points: 1,
          expire_at: expireAtIso,
        });

      return {
        success: true,
        remaining: Math.max(0, limit - 1),
        resetSeconds: windowSeconds,
      };
    }

    // Existing active window
    const resetSeconds = Math.max(
      1,
      Math.ceil((new Date(data.expire_at).getTime() - nowMs) / 1000)
    );

    if (data.points >= limit) {
      // Rate limit exceeded
      return {
        success: false,
        remaining: 0,
        resetSeconds,
      };
    }

    // Increment points
    await supabaseAdmin
      .from("rate_limits")
      .update({ points: data.points + 1 })
      .eq("key", key);

    return {
      success: true,
      remaining: Math.max(0, limit - (data.points + 1)),
      resetSeconds,
    };
  } catch (err) {
    // In-memory fallback if table is not yet created or DB query fails
    const cached = memoryCache.get(key);

    if (!cached || cached.expireAt <= nowMs) {
      memoryCache.set(key, { points: 1, expireAt: nowMs + windowSeconds * 1000 });
      return {
        success: true,
        remaining: Math.max(0, limit - 1),
        resetSeconds: windowSeconds,
      };
    }

    const resetSeconds = Math.max(1, Math.ceil((cached.expireAt - nowMs) / 1000));

    if (cached.points >= limit) {
      return {
        success: false,
        remaining: 0,
        resetSeconds,
      };
    }

    cached.points += 1;
    return {
      success: true,
      remaining: Math.max(0, limit - cached.points),
      resetSeconds,
    };
  }
}

/**
 * Resets a rate limit key upon successful authentication
 */
export async function resetRateLimit(key: string): Promise<void> {
  memoryCache.delete(key);
  try {
    await supabaseAdmin.from("rate_limits").delete().eq("key", key);
  } catch {
    // Ignore error
  }
}
