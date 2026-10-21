import { NextResponse } from "next/server";
import { apiSession } from "@/lib/auth/api-session";
import { changePassword } from "@/lib/db/student-actions";
import { getUserById } from "@/lib/db/users";
import { readJsonLimited } from "@/lib/http";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { validatePasswordChange } from "@/lib/validation/student-actions";

/**
 * Changes the signed-in user's password: `{ current, next, confirm }`.
 * The new password must pass the same strength rules as signup.
 */
export async function POST(request: Request) {
  const s = await apiSession();
  if ("error" in s) return s.error;
  // Guessing the current password must stay slow.
  const limit = await rateLimit(`password-change:${s.userId}`, 5, 10 * 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const parsed = await readJsonLimited(request, 2_000);
  if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const user = await getUserById(s.userId);
  if (!user) return NextResponse.json({ error: "Account not found." }, { status: 404 });

  const { value, error } = validatePasswordChange(parsed.data, [user.name ?? "", user.email]);
  if (error || !value) return NextResponse.json({ error: error ?? "Invalid input." }, { status: 400 });

  const res = await changePassword(s.userId, value.current, value.next);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json({ ok: true });
}
