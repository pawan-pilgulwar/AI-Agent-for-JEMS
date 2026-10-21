import { NextResponse } from "next/server";
import { apiSession } from "@/lib/auth/api-session";
import { applyToJob } from "@/lib/db/student-actions";
import { getApplications } from "@/lib/db/student-data";
import { readJsonLimited } from "@/lib/http";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { validateJobRef } from "@/lib/validation/student-actions";

/** The student's applications and their pipeline status. */
export async function GET() {
  const s = await apiSession("student");
  if ("error" in s) return s.error;
  return NextResponse.json({ applications: await getApplications(s.userId) });
}

/** Applies to `{ jobId }`; the company is notified of the new applicant. */
export async function POST(request: Request) {
  const s = await apiSession("student");
  if ("error" in s) return s.error;
  const limit = await rateLimit(`apply:${s.userId}`, 20, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const parsed = await readJsonLimited(request, 500);
  if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const { value, error } = validateJobRef(parsed.data);
  if (error || !value?.jobId) return NextResponse.json({ error: error ?? "Invalid job." }, { status: 400 });

  const res = await applyToJob(s.userId, value.jobId);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json({ ok: true, id: res.id }, { status: 201 });
}
