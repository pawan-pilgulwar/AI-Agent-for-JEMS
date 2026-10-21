import { NextResponse } from "next/server";
import { apiSession } from "@/lib/auth/api-session";
import { listTasks, sweepAndKick } from "@/lib/ai-tasks/queue";
import { listNotifications, markNotificationsRead } from "@/lib/db/notifications";
import { readJsonLimited } from "@/lib/http";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

export const maxDuration = 300;

/**
 * Notifications for the bell, plus the user's in-progress AI tasks so the
 * bell can show live progress with one poll.
 */
export async function GET() {
  const s = await apiSession();
  if ("error" in s) return s.error;
  await sweepAndKick();
  const [{ items, unread }, active] = await Promise.all([
    listNotifications(s.userId, 20),
    listTasks(s.userId, { activeOnly: true, limit: 10 }),
  ]);
  return NextResponse.json({ notifications: items, unread, activeTasks: active });
}

/** Marks notifications read. Body: `{ ids?: string[] }` — omit ids to mark all. */
export async function PATCH(request: Request) {
  const s = await apiSession();
  if ("error" in s) return s.error;
  const limit = await rateLimit(`notifications:${s.userId}`, 60, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const parsed = await readJsonLimited(request, 4_000);
  if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const body = (parsed.data ?? {}) as Record<string, unknown>;
  const ids = Array.isArray(body.ids) ? body.ids.filter((x): x is string => typeof x === "string").slice(0, 100) : [];

  const ok = await markNotificationsRead(s.userId, ids);
  if (!ok) return NextResponse.json({ error: "Could not update notifications." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
