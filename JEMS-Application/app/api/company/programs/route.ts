import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createCollaboration } from "@/lib/db/collaborations";
import { createProgram, getCompanyContext } from "@/lib/db/company";
import { readJsonLimited } from "@/lib/http";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { validateCollaboration, validateProgram } from "@/lib/validation/company";

/**
 * Publish either a student learning program (`kind: "program"`) or an
 * industry–academia collaboration for faculty (`kind: "collaboration"`).
 */
export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (session.user.role !== "company") return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const limit = await rateLimit(`company-programs:${userId}`, 20, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const parsed = await readJsonLimited(request, 8_000);
  if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const body = (parsed.data ?? {}) as { kind?: unknown };
  const company = await getCompanyContext(userId);
  if (!company) return NextResponse.json({ error: "Company profile not found." }, { status: 404 });

  if (body.kind === "collaboration") {
    const { value, error } = validateCollaboration(parsed.data);
    if (error || !value) return NextResponse.json({ error: error ?? "Invalid input." }, { status: 400 });
    const ok = await createCollaboration(userId, company.name, value);
    return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Could not publish." }, { status: 500 });
  }

  const { value, error } = validateProgram(parsed.data);
  if (error || !value) return NextResponse.json({ error: error ?? "Invalid input." }, { status: 400 });
  const ok = await createProgram(userId, company.name, value);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Could not publish." }, { status: 500 });
}
