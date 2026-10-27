import { NextResponse } from "next/server";
import { apiSession } from "@/lib/auth/api-session";
import { completeLesson } from "@/lib/ai/learning";
import { readJsonLimited } from "@/lib/http";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { validateLessonDone } from "@/lib/validation/ai";

/**
 * Completes one lesson: `{ step, topic, check?: { correct, total, missed[] } }`
 * → `{ topicsDone, level, weak }`. Ticks the roadmap topic (Learning Paths
 * progress) and records the quick check, which adapts the module's level and
 * the subtopics its next lessons re-explain.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await apiSession("student");
  if ("error" in s) return s.error;
  const limit = await rateLimit(`learning-progress:${s.userId}`, 120, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);
  const { id } = await params;

  const parsed = await readJsonLimited(request, 4_000);
  if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const { value, error } = validateLessonDone(parsed.data);
  if (error || !value) return NextResponse.json({ error: error ?? "Invalid input." }, { status: 400 });

  const res = await completeLesson(s.userId, String(id), value);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json({ topicsDone: res.topicsDone, level: res.level, weak: res.weak });
}
