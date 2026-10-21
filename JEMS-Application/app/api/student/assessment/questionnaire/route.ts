import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { saveQuestionnaire } from "@/lib/db/assessment";
import { readJsonLimited } from "@/lib/http";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { validateQuestionnaire } from "@/lib/validation/assessment";

/** Saves the skill + soft-skill questionnaire. Rated skills become *claimed*, never verified. */
export async function PATCH(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (session.user.role !== "student") return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const limit = await rateLimit(`questionnaire:${userId}`, 10, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const parsed = await readJsonLimited(request, 16_000);
  if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const { value, error } = validateQuestionnaire(parsed.data);
  if (error || !value) return NextResponse.json({ error: error ?? "Invalid input." }, { status: 400 });

  const ok = await saveQuestionnaire(userId, value);
  if (!ok) return NextResponse.json({ error: "Could not save your assessment." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
