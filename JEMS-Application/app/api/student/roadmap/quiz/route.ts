import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { recordModulePass } from "@/lib/db/roadmap";
import { readJsonLimited } from "@/lib/http";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { findModule, getRoadmap, nextModuleId } from "@/lib/roadmap/data";
import { gradeQuiz } from "@/lib/roadmap/module";
import { validateQuizSubmission } from "@/lib/validation/roadmap";

const MAX_BODY_BYTES = 8_000;

/**
 * Grades a module quiz on the server (the answer key never reaches the
 * browser) and, on a pass, records the module + credits its skills.
 */
export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (session?.user?.role !== "student") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  // Discourage brute-forcing the answer key: 20 attempts per user per minute.
  const limit = await rateLimit(`quiz:${userId}`, 20, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const parsed = await readJsonLimited(request, MAX_BODY_BYTES);
  if (parsed.error) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  const { value, error } = validateQuizSubmission(parsed.data);
  if (error || !value) {
    return NextResponse.json({ error: error ?? "Invalid input." }, { status: 400 });
  }

  const roadmap = getRoadmap(value.careerPath);
  const mod = findModule(roadmap, value.moduleId);
  if (!mod) {
    return NextResponse.json({ error: "Module not found." }, { status: 404 });
  }

  const result = gradeQuiz(roadmap, mod, value.answers);
  let gainedSkills: string[] = [];
  if (result.passed) {
    const saved = await recordModulePass(userId, value.careerPath, mod.id, mod.skills);
    if (!saved.ok) {
      return NextResponse.json({ error: "Could not save your progress." }, { status: 500 });
    }
    gainedSkills = saved.gainedSkills;
  }

  return NextResponse.json({
    ...result,
    gainedSkills,
    nextModuleId: nextModuleId(roadmap, mod.id),
  });
}
