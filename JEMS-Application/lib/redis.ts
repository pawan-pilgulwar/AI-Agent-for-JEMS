import Redis from "ioredis";

/**
 * Lazily-created, process-wide Redis client.
 *
 * Cached on `globalThis` so dev HMR doesn't open a new connection on every
 * reload. Returns null when REDIS_URL isn't set. Crucially, a Redis outage must
 * never take the app down: an `error` handler swallows connection errors (so
 * unhandled 'error' events can't crash the process) and `enableOfflineQueue:
 * false` makes commands fail fast while disconnected — callers then degrade to
 * the in-memory limiter instead of hanging.
 */

declare global {
  var __jemsRedis: Redis | null | undefined;
}

let warnedOnce = false;

export function getRedis(): Redis | null {
  if (!process.env.REDIS_URL) return null;
  if (globalThis.__jemsRedis !== undefined) return globalThis.__jemsRedis;

  try {
    const client = new Redis(process.env.REDIS_URL, {
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 1000,
      // Keep trying to reconnect with a capped backoff so it self-heals when
      // Redis comes back, without busy-looping.
      retryStrategy: (times) => Math.min(times * 200, 2000),
    });
    client.on("error", (err) => {
      if (!warnedOnce) {
        console.error(
          "[redis] unavailable — rate limiting falls back to in-memory:",
          err.message,
        );
        warnedOnce = true;
      }
    });
    globalThis.__jemsRedis = client;
    return client;
  } catch (err) {
    console.error("[redis] failed to initialize:", err);
    globalThis.__jemsRedis = null;
    return null;
  }
}
