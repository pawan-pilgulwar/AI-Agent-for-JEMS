import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { updateApplicationStatus } from "@/lib/db/company";
import { readJsonLimited } from "@/lib/http";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { validateStatus } from "@/lib/validation/company";

/** Recruiter moves an applicant through the pipeline (own openings only). */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (session.user.role !== "company") return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const limit = await rateLimit(`company-apps:${userId}`, 60, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const { id } = await params;
  const parsed = await readJsonLimited(request, 1_000);
  if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const { value, error } = validateStatus(parsed.data);
  if (error || !value) return NextResponse.json({ error: error ?? "Invalid input." }, { status: 400 });

  const ok = await updateApplicationStatus(userId, String(id), value);
  if (!ok) return NextResponse.json({ error: "Application not found." }, { status: 404 });
  return NextResponse.json({ ok: true, status: value });
}
