import { NextResponse } from "next/server";
import { apiSession } from "@/lib/auth/api-session";
import { enqueueTask } from "@/lib/ai-tasks/queue";
import { readJsonLimited } from "@/lib/http";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { validateMatchRequest } from "@/lib/validation/ai";

export const maxDuration = 300;

/**
 * Asks the match agent to explain why a candidate fits one of the company's
 * openings `{ jobId, studentId }`. Runs in the background; responds 202 with
 * the task. Ownership of the opening is checked by the task itself.
 */
export async function POST(request: Request) {
  const s = await apiSession("company");
  if ("error" in s) return s.error;
  const limit = await rateLimit(`ai-match:${s.userId}`, 30, 10 * 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const parsed = await readJsonLimited(request, 1_000);
  if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const { value, error } = validateMatchRequest(parsed.data);
  if (error || !value) return NextResponse.json({ error: error ?? "Invalid input." }, { status: 400 });

  const res = await enqueueTask({
    userId: s.userId,
    role: s.role,
    type: "match.explain",
    subject: `${value.jobId}:${value.studentId}`,
    dedupeKey: `${s.userId}:match:${value.jobId}:${value.studentId}`,
    input: value,
    link: `/company/candidates?job=${value.jobId}`,
  });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json({ task: res.task, created: res.created }, { status: 202 });
}
