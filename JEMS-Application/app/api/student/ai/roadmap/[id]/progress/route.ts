import { NextResponse } from "next/server";
import { apiSession } from "@/lib/auth/api-session";
import { setTopicDone } from "@/lib/ai/roadmap";
import { readJsonLimited } from "@/lib/http";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { validateTopicToggle } from "@/lib/validation/ai";

/**
 * Ticks or unticks one topic of the student's AI roadmap:
 * `{ step, topic, done }` → `{ topicsDone }`. Feeds Learning Paths progress.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await apiSession("student");
  if ("error" in s) return s.error;
  const limit = await rateLimit(`ai-roadmap-progress:${s.userId}`, 120, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);
  const { id } = await params;

  const parsed = await readJsonLimited(request, 1_000);
  if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const { value, error } = validateTopicToggle(parsed.data);
  if (error || !value) return NextResponse.json({ error: error ?? "Invalid input." }, { status: 400 });

  const res = await setTopicDone(s.userId, String(id), value);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json({ topicsDone: res.topicsDone });
}
