import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { saveStudentGoals } from "@/lib/db/roadmap";
import { readJsonLimited } from "@/lib/http";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { validateGoalsInput } from "@/lib/validation/roadmap";

const MAX_BODY_BYTES = 4_000;

/** Saves the signed-in student's career goals (path + target package/company). */
export async function PATCH(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (session?.user?.role !== "student") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  const limit = await rateLimit(`goals:${userId}`, 20, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const parsed = await readJsonLimited(request, MAX_BODY_BYTES);
  if (parsed.error) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  const { value, error } = validateGoalsInput(parsed.data);
  if (error || !value) {
    return NextResponse.json({ error: error ?? "Invalid input." }, { status: 400 });
  }

  const ok = await saveStudentGoals(userId, value);
  if (!ok) {
    return NextResponse.json({ error: "Could not save your goals." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
