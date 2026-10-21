import { NextResponse } from "next/server";
import { isEmailLike } from "@/components/signup/password";
import { verifyPasswordResetOtp } from "@/lib/db/password-reset";
import { readJsonLimited } from "@/lib/http";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

const asString = (v: unknown): string => (typeof v === "string" ? v : "");

export async function POST(request: Request) {
  const ip = clientIp(request);
  const limit = await rateLimit(`verify-reset-otp:${ip}`, 15, 10 * 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const parsed = await readJsonLimited(request, 2_000);
  if (parsed.error) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }
  const body = (parsed.data ?? {}) as Record<string, unknown>;
  const email = asString(body.email).toLowerCase().trim();
  const otp = asString(body.otp).trim();

  if (!isEmailLike(email) || !/^\d{6}$/.test(otp)) {
    return NextResponse.json({ error: "Invalid or expired code." }, { status: 400 });
  }

  const result = await verifyPasswordResetOtp(email, otp);
  if (!result.ok) {
    return NextResponse.json({ error: "Invalid or expired code." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, resetToken: result.resetToken });
}
