import { NextResponse } from "next/server";
import { apiSession } from "@/lib/auth/api-session";
import { saveJob, unsaveJob } from "@/lib/db/student-actions";
import { getSavedJobs } from "@/lib/db/student-data";
import { readJsonLimited } from "@/lib/http";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { validateJobRef } from "@/lib/validation/student-actions";

async function guard(request: Request) {
  const s = await apiSession("student");
  if ("error" in s) return { error: s.error };
  const limit = await rateLimit(`saved-jobs:${s.userId}`, 60, 60_000);
  if (!limit.ok) return { error: tooManyRequests(limit.retryAfter) };
  const parsed = await readJsonLimited(request, 500);
  if (parsed.error) return { error: NextResponse.json({ error: parsed.error }, { status: parsed.status }) };
  const { value, error } = validateJobRef(parsed.data);
  if (error || !value) return { error: NextResponse.json({ error: error ?? "Invalid job." }, { status: 400 }) };
  return { userId: s.userId, ref: value };
}

/** The student's saved jobs. */
export async function GET() {
  const s = await apiSession("student");
  if ("error" in s) return s.error;
  return NextResponse.json({ saved: await getSavedJobs(s.userId) });
}

/** Saves `{ jobId }` (idempotent). */
export async function POST(request: Request) {
  const g = await guard(request);
  if ("error" in g) return g.error;
  if (!g.ref.jobId) return NextResponse.json({ error: "Invalid job." }, { status: 400 });
  const res = await saveJob(g.userId, g.ref.jobId);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json({ ok: true });
}

/** Unsaves `{ jobId }` or `{ savedId }`. */
export async function DELETE(request: Request) {
  const g = await guard(request);
  if ("error" in g) return g.error;
  const ok = await unsaveJob(g.userId, g.ref);
  if (!ok) return NextResponse.json({ error: "Could not remove the saved job." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
