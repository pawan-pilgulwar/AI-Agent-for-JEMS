import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getStudentProfile, updateStudentProfile } from "@/lib/db/student-data";
import { readJsonLimited } from "@/lib/http";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { validateProfileInput } from "@/lib/validation/student";

// Generous enough to carry a base64 avatar, bounded enough to stay safe.
const MAX_BODY_BYTES = 900_000;

/** Returns the signed-in student's full editable profile. */
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const profile = await getStudentProfile(userId);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }
  return NextResponse.json({ profile });
}

/** Persists validated profile edits for the signed-in student. */
export async function PATCH(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  // Only students own a student profile.
  if (session?.user?.role !== "student") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  // Throttle write floods: 30 saves per user per minute.
  const limit = await rateLimit(`profile:${userId}`, 30, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const parsed = await readJsonLimited(request, MAX_BODY_BYTES);
  if (parsed.error) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  const { value, error } = validateProfileInput(parsed.data);
  if (error || !value) {
    return NextResponse.json({ error: error ?? "Invalid input." }, { status: 400 });
  }

  const ok = await updateStudentProfile(userId, value);
  if (!ok) {
    return NextResponse.json(
      { error: "Could not save your profile." },
      { status: 500 },
    );
  }

  const profile = await getStudentProfile(userId);
  return NextResponse.json({ ok: true, profile });
}
