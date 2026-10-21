import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { startSkillTest, submitSkillTest } from "@/lib/db/assessment";
import { readJsonLimited } from "@/lib/http";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { validateStart, validateSubmit } from "@/lib/validation/assessment";

async function studentSession() {
  const session = await auth();
  if (!session?.user?.id) return { error: NextResponse.json({ error: "Not signed in." }, { status: 401 }) };
  if (session.user.role !== "student") return { error: NextResponse.json({ error: "Forbidden." }, { status: 403 }) };
  return { userId: session.user.id };
}

/** Start a skill test: the server picks the questions and keeps the answer key. */
export async function POST(request: Request) {
  const s = await studentSession();
  if ("error" in s) return s.error;
  const limit = await rateLimit(`skill-test-start:${s.userId}`, 10, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const parsed = await readJsonLimited(request, 1_000);
  if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const { value, error } = validateStart(parsed.data);
  if (error || !value) return NextResponse.json({ error: error ?? "Invalid input." }, { status: 400 });

  const res = await startSkillTest(s.userId!, value.skill);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res.test);
}

/** Submit answers: graded server-side; a pass verifies the skill on the profile. */
export async function PUT(request: Request) {
  const s = await studentSession();
  if ("error" in s) return s.error;
  const limit = await rateLimit(`skill-test-submit:${s.userId}`, 20, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const parsed = await readJsonLimited(request, 8_000);
  if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const { value, error } = validateSubmit(parsed.data);
  if (error || !value) return NextResponse.json({ error: error ?? "Invalid input." }, { status: 400 });

  const res = await submitSkillTest(s.userId!, value.sessionId, value.answers);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res.result);
}
