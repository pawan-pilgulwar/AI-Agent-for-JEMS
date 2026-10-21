import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { cacheLesson, getCachedLesson } from "@/lib/db/roadmap";
import { readJsonLimited } from "@/lib/http";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { findModule, getRoadmap } from "@/lib/roadmap/data";
import { generateLessonScript } from "@/lib/roadmap/lesson";
import { validateLessonRequest } from "@/lib/validation/roadmap";

const MAX_BODY_BYTES = 2_000;

/**
 * Returns the narrated slide lesson for one module lesson — from the shared
 * cache when available, otherwise freshly generated (Gemini, or the built-in
 * deterministic fallback) and then cached for everyone.
 *
 * The lesson content is derived from the *static* roadmap, never from
 * free-text the client sends, so the prompt can't be steered by a user.
 */
export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  // Generation can call an external API — keep it to 30 lessons/min per user.
  const limit = await rateLimit(`lesson:${userId}`, 30, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const parsed = await readJsonLimited(request, MAX_BODY_BYTES);
  if (parsed.error) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  const { value, error } = validateLessonRequest(parsed.data);
  if (error || !value) {
    return NextResponse.json({ error: error ?? "Invalid input." }, { status: 400 });
  }

  const roadmap = getRoadmap(value.careerPath);
  const mod = findModule(roadmap, value.moduleId);
  const lessonTitle = mod?.topics[value.lessonIndex];
  if (!mod || !lessonTitle) {
    return NextResponse.json({ error: "Lesson not found." }, { status: 404 });
  }

  const cacheKey = `${roadmap.id}::${mod.id}::${value.lessonIndex}`;
  const cached = await getCachedLesson(cacheKey);
  if (cached) {
    return NextResponse.json({ ...cached, cached: true });
  }

  const lesson = await generateLessonScript({
    lessonTitle,
    moduleTitle: mod.title,
    topics: mod.topics,
    proficiency: mod.difficulty,
  });
  await cacheLesson(cacheKey, { careerPath: roadmap.id, moduleId: mod.id, lessonTitle }, lesson);

  return NextResponse.json({ ...lesson, cached: false });
}
