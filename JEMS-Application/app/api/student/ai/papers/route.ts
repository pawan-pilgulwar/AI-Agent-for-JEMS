import { NextResponse } from "next/server";
import { apiSession } from "@/lib/auth/api-session";
import { findPaper, listPapers } from "@/lib/ai/papers";
import { codingLikely } from "@/lib/ai/papers-shared";
import { skillKey } from "@/lib/ai/util";
import { enqueueTask } from "@/lib/ai-tasks/queue";
import { getSkillLock } from "@/lib/db/assessment";
import { readJsonLimited } from "@/lib/http";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { validatePaperRequest } from "@/lib/validation/ai";

export const maxDuration = 300;

/** The student's AI papers. `?purpose=skill|interview` filters. */
export async function GET(request: Request) {
  const s = await apiSession("student");
  if ("error" in s) return s.error;
  const purpose = new URL(request.url).searchParams.get("purpose");
  return NextResponse.json({
    papers: await listPapers(s.userId, purpose === "skill" || purpose === "interview" ? purpose : undefined),
  });
}

/**
 * Generates an AI skill test `{ purpose: "skill", skill, includeCoding? }` or
 * mock interview `{ purpose: "interview", interviewType }` in the background.
 * Generation takes 30–120 s (coding questions are verified by running them),
 * so this responds 202 with the task and notifies the student when ready.
 */
export async function POST(request: Request) {
  const s = await apiSession("student");
  if ("error" in s) return s.error;
  const limit = await rateLimit(`ai-paper:${s.userId}`, 10, 10 * 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const parsed = await readJsonLimited(request, 1_000);
  if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const { value, error } = validatePaperRequest(parsed.data);
  if (error || !value) return NextResponse.json({ error: error ?? "Invalid input." }, { status: 400 });

  if (value.purpose === "skill") {
    const lockedUntil = await getSkillLock(s.userId, value.skill);
    if (lockedUntil) {
      return NextResponse.json({ error: `You can retake the ${value.skill} test after ${lockedUntil.toLocaleString("en-IN")}.` }, { status: 423 });
    }
  }
  const existing = await findPaper(s.userId, value.purpose, value.skill);
  if (existing?.status === "submitted") {
    return NextResponse.json({ error: "Your previous paper for this is still being graded." }, { status: 409 });
  }

  const includeCoding = value.purpose === "skill" ? (value.includeCoding ?? codingLikely(value.skill)) : null;
  const res = await enqueueTask({
    userId: s.userId,
    role: s.role,
    type: "assessment.generate",
    subject: value.skill,
    dedupeKey: `${s.userId}:paper:${value.purpose}:${skillKey(value.skill)}`,
    input: { purpose: value.purpose, subject: value.skill, interviewType: value.interviewType, includeCoding },
    label: value.purpose === "interview" ? `${value.skill} mock interview` : `${value.skill} AI test`,
    link: value.purpose === "interview" ? "/student/interviews" : "/student/assessment",
  });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json({ task: res.task, created: res.created }, { status: 202 });
}
