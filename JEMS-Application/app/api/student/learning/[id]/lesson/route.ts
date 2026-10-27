import { NextResponse } from "next/server";
import { apiSession } from "@/lib/auth/api-session";
import { getLearningContent } from "@/lib/ai/learning";
import { readJsonLimited } from "@/lib/http";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { validateLessonRef } from "@/lib/validation/ai";

// An uncached lesson is written by the vLLM model while the student waits
// (up to AGENT_LEARNING_TIMEOUT_MS = 240 s on a slow GPU).
export const maxDuration = 300;

/**
 * `{ step, topic }` → the narrated video lesson (slides + quick check + YouTube
 * videos) for one lesson of the student's learning path, written for their
 * level, learning style and weak spots. Shared cache first; the prompt is
 * built from the stored syllabus and profile, never from text the client sends.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await apiSession("student");
  if ("error" in s) return s.error;
  const limit = await rateLimit(`learning-lesson:${s.userId}`, 40, 10 * 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);
  const { id } = await params;

  const parsed = await readJsonLimited(request, 1_000);
  if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const { value, error } = validateLessonRef(parsed.data);
  if (error || !value) return NextResponse.json({ error: error ?? "Invalid input." }, { status: 400 });

  const res = await getLearningContent(s.userId, String(id), value, "lesson");
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json({ lesson: res.content });
}
