import { NextResponse } from "next/server";
import { apiSession } from "@/lib/auth/api-session";
import { moduleTestInput } from "@/lib/ai/learning";
import { findPaper } from "@/lib/ai/papers";
import { codingLikely, moduleSubjectKey } from "@/lib/ai/papers-shared";
import { enqueueTask } from "@/lib/ai-tasks/queue";
import { getSkillLock } from "@/lib/db/assessment";
import { readJsonLimited } from "@/lib/http";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { validateModuleRef } from "@/lib/validation/ai";

export const maxDuration = 300;

/**
 * Generates the end-of-module test `{ step }` in the background — one test per
 * module, unlocked once every lesson of the module is complete. It covers the
 * module's lessons, is graded like every AI skill test, and a pass verifies
 * the module's skill (which completes the module). Responds 202 with the task.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await apiSession("student");
  if ("error" in s) return s.error;
  const limit = await rateLimit(`learning-test:${s.userId}`, 10, 10 * 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);
  const { id } = await params;

  const parsed = await readJsonLimited(request, 1_000);
  if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const { value, error } = validateModuleRef(parsed.data);
  if (error || !value) return NextResponse.json({ error: error ?? "Invalid input." }, { status: 400 });

  const mod = await moduleTestInput(s.userId, String(id), value.step);
  if (!mod.ok) return NextResponse.json({ error: mod.error }, { status: mod.status });

  const lockedUntil = await getSkillLock(s.userId, mod.skill);
  if (lockedUntil) {
    return NextResponse.json({ error: `You can retake the ${mod.skill} test after ${lockedUntil.toLocaleString("en-IN")}.` }, { status: 423 });
  }
  const key = moduleSubjectKey(String(id), mod.skill);
  const existing = await findPaper(s.userId, "module", mod.skill, key);
  if (existing?.status === "submitted") {
    return NextResponse.json({ error: "Your previous module test is still being graded." }, { status: 409 });
  }

  const res = await enqueueTask({
    userId: s.userId,
    role: s.role,
    type: "assessment.generate",
    subject: mod.skill,
    dedupeKey: `${s.userId}:paper:module:${key}`,
    input: {
      purpose: "module",
      subject: mod.skill,
      roadmapId: String(id),
      topics: mod.topics,
      difficulty: mod.difficulty,
      includeCoding: codingLikely(mod.skill),
    },
    label: `${mod.skill} module test`,
    link: `/student/learning/${id}`,
  });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json({ task: res.task, created: res.created }, { status: 202 });
}
