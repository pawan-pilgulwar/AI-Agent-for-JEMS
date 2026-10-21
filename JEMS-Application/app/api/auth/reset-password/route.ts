import { NextResponse } from "next/server";
import { evaluatePassword, isEmailLike } from "@/components/signup/password";
import { hashPassword } from "@/lib/auth/password";
import { resetPasswordWithToken } from "@/lib/db/password-reset";
import { getUserByEmail } from "@/lib/db/users";
import { readJsonLimited } from "@/lib/http";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

const asString = (v: unknown): string => (typeof v === "string" ? v : "");

export async function POST(request: Request) {
  const ip = clientIp(request);
  const limit = await rateLimit(`reset-password:${ip}`, 15, 10 * 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const parsed = await readJsonLimited(request, 5_000);
  if (parsed.error) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }
  const body = (parsed.data ?? {}) as Record<string, unknown>;
  const email = asString(body.email).toLowerCase().trim();
  const resetToken = asString(body.resetToken).trim();
  const password = asString(body.password);

  if (!isEmailLike(email) || !resetToken) {
    return NextResponse.json(
      { error: "This reset link has expired. Please start over." },
      { status: 400 },
    );
  }

  const user = await getUserByEmail(email);
  if (!evaluatePassword(password, [user?.name ?? "", email]).acceptable) {
    return NextResponse.json(
      { error: "Password does not meet the requirements." },
      { status: 400 },
    );
  }

  const ok = await resetPasswordWithToken(email, resetToken, hashPassword(password));
  if (!ok) {
    return NextResponse.json(
      { error: "This reset link has expired. Please start over." },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
