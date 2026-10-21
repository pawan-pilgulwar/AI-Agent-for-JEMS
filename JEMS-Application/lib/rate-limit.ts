/**
 * Fixed-window rate limiter keyed by an arbitrary string (usually IP or
 * IP+action). It throttles abusive bursts (brute-force logins, signup spam,
 * write floods) so one client can't degrade the API for everyone — the
 * application-level half of DDoS defence.
 *
 * Backed by Redis (REDIS_URL) so the window is shared across every instance /
 * serverless invocation. If Redis is unset or unreachable, it transparently
 * degrades to a per-process in-memory window — limiting still works on that
 * instance and the app never breaks because of a cache outage.
 */

import { getRedis } from "@/lib/redis";

interface Window {
  count: number;
  resetAt: number;
}

const store = new Map<string, Window>();
const MAX_KEYS = 50_000; // hard cap so the map can't grow without bound

export interface RateLimitResult {
  ok: boolean;
  /** Seconds until the window resets (only meaningful when ok === false). */
  retryAfter: number;
}

// Atomic INCR + first-hit PEXPIRE, returning the count and remaining TTL (ms).
const SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
return {current, redis.call('PTTL', KEYS[1])}
`;

/** Records a hit for `key` and reports whether it is within `limit`/`windowMs`. */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const redis = getRedis();
  if (redis && redis.status === "ready") {
    try {
      const res = (await redis.eval(
        SCRIPT,
        1,
        `rl:${key}`,
        String(windowMs),
      )) as [number, number];
      const current = Number(res[0]);
      const ttl = Number(res[1]);
      if (current > limit) {
        return { ok: false, retryAfter: Math.max(1, Math.ceil(ttl / 1000)) };
      }
      return { ok: true, retryAfter: 0 };
    } catch {
      // Redis hiccup — fall through to the in-memory window below.
    }
  }
  return memoryRateLimit(key, limit, windowMs);
}

/** Per-process fallback window used when Redis is unavailable. */
function memoryRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    if (store.size > MAX_KEYS) pruneExpired(now);
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  if (existing.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((existing.resetAt - now) / 1000) };
  }

  existing.count += 1;
  return { ok: true, retryAfter: 0 };
}

function pruneExpired(now: number) {
  for (const [k, v] of store) {
    if (v.resetAt <= now) store.delete(k);
  }
}

/** Best-effort client IP from proxy headers (Vercel/CDN set x-forwarded-for). */
export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/** Builds a 429 JSON Response with a Retry-After header. */
export function tooManyRequests(retryAfter: number): Response {
  return new Response(
    JSON.stringify({ error: "Too many requests. Please slow down." }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(Math.max(1, retryAfter)),
      },
    },
  );
}
