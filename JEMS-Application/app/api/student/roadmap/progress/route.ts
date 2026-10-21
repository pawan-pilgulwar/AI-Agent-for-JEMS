import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { markLessonWatched } from "@/lib/db/roadmap";
import { readJsonLimited } from "@/lib/http";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { validateLessonProgress } from "@/lib/validation/roadmap";

const MAX_BODY_BYTES = 2_000;

/** Marks one lesson of a module as watched for the signed-in student. */
export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (session?.user?.role !== "student") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  const limit = await rateLimit(`lesson-progress:${userId}`, 60, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const parsed = await readJsonLimited(request, MAX_BODY_BYTES);
  if (parsed.error) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  const { value, error } = validateLessonProgress(parsed.data);
  if (error || !value) {
    return NextResponse.json({ error: error ?? "Invalid input." }, { status: 400 });
  }

  const ok = await markLessonWatched(userId, value.careerPath, value.moduleId, value.lessonIndex);
  if (!ok) {
    return NextResponse.json({ error: "Could not save your progress." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
