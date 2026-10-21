import { NextResponse } from "next/server";
import { apiSession } from "@/lib/auth/api-session";
import { getStudentSettings, saveStudentSettings } from "@/lib/db/student-actions";
import { updateStudentProfile } from "@/lib/db/student-data";
import { readJsonLimited } from "@/lib/http";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { validateSettings } from "@/lib/validation/student-actions";

/** Notification and job-matching preferences. */
export async function GET() {
  const s = await apiSession("student");
  if ("error" in s) return s.error;
  return NextResponse.json({ settings: await getStudentSettings(s.userId) });
}

/**
 * Saves the Settings screen: `{ name?, targetRole?, location?, notifications, jobPrefs }`.
 * Account fields go through the regular profile update so the name stays in
 * sync everywhere; email changes are not allowed here (it is the login).
 */
export async function PATCH(request: Request) {
  const s = await apiSession("student");
  if ("error" in s) return s.error;
  const limit = await rateLimit(`settings:${s.userId}`, 30, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const parsed = await readJsonLimited(request, 4_000);
  if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const { value, error } = validateSettings(parsed.data);
  if (error || !value) return NextResponse.json({ error: error ?? "Invalid input." }, { status: 400 });

  const [prefsOk, profileOk] = await Promise.all([
    saveStudentSettings(s.userId, value.settings),
    Object.keys(value.profile).length ? updateStudentProfile(s.userId, value.profile) : Promise.resolve(true),
  ]);
  if (!prefsOk || !profileOk) return NextResponse.json({ error: "Could not save your settings." }, { status: 500 });
  return NextResponse.json({ ok: true, settings: value.settings });
}
