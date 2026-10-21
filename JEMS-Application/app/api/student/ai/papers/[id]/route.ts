import { NextResponse } from "next/server";
import { apiSession } from "@/lib/auth/api-session";
import { getPaper, openPaper, submitPaper } from "@/lib/ai/papers";
import type { PaperSummary } from "@/lib/ai/papers-shared";
import { enqueueTask } from "@/lib/ai-tasks/queue";
import { readJsonLimited } from "@/lib/http";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { validateAnswers } from "@/lib/validation/ai";

export const maxDuration = 300;

/** Queues grading for a submitted paper (deduped: one grading task per paper). */
function enqueueGrading(userId: string, role: string, paper: PaperSummary) {
  return enqueueTask({
    userId,
    role,
    type: "assessment.grade",
    // The paper id lets the paper page find its own grading task.
    subject: paper.id,
    dedupeKey: `${userId}:grade:${paper.id}`,
    input: { paperId: paper.id },
    label: paper.purpose === "interview" ? `${paper.subject} interview grading` : `${paper.subject} test grading`,
    link: `/student/assessment/ai/${paper.id}`,
    // The attempt is already submitted — never strand it behind the active-task cap.
    skipCap: true,
  });
}

/** The student-safe paper (no answer keys). The first open starts its timer. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await apiSession("student");
  if ("error" in s) return s.error;
  const { id } = await params;
  const paper = await openPaper(s.userId, String(id));
  if (!paper) return NextResponse.json({ error: "Paper not found." }, { status: 404 });
  return NextResponse.json({ paper });
}

/**
 * Submits `{ answers: { [questionId]: answer } }` and grades them in the
 * background (written answers are checked by the AI, code runs in Judge0).
 * Responds 202 with the grading task.
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await apiSession("student");
  if ("error" in s) return s.error;
  const limit = await rateLimit(`ai-paper-submit:${s.userId}`, 10, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);
  const { id } = await params;

  // Room for a few coding answers (20k chars each) plus written ones.
  const parsed = await readJsonLimited(request, 120_000);
  if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const { value, error } = validateAnswers(parsed.data);
  if (error || !value) return NextResponse.json({ error: error ?? "Invalid answers." }, { status: 400 });

  const submitted = await submitPaper(s.userId, String(id), value);
  if (!submitted.ok) return NextResponse.json({ error: submitted.error }, { status: submitted.status });

  const res = await enqueueGrading(s.userId, s.role, submitted.paper);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json({ task: res.task, paper: submitted.paper }, { status: 202 });
}

/**
 * Retries grading of a submitted paper whose grading task failed (e.g. the
 * Agent was down for longer than the automatic retries). Responds 202.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await apiSession("student");
  if ("error" in s) return s.error;
  const limit = await rateLimit(`ai-paper-regrade:${s.userId}`, 5, 10 * 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);
  const { id } = await params;

  const paper = await getPaper(s.userId, String(id));
  if (!paper) return NextResponse.json({ error: "Paper not found." }, { status: 404 });
  if (paper.status !== "submitted") return NextResponse.json({ error: "This paper is not waiting to be graded." }, { status: 409 });

  const res = await enqueueGrading(s.userId, s.role, paper);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json({ task: res.task }, { status: 202 });
}
