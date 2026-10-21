import { NextResponse } from "next/server";
import { isEmailLike } from "@/components/signup/password";
import { otpEmail } from "@/lib/email/templates";
import { sendMail } from "@/lib/email/mailer";
import { createPasswordResetOtp } from "@/lib/db/password-reset";
import { getUserByEmail } from "@/lib/db/users";
import { readJsonLimited } from "@/lib/http";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

const asString = (v: unknown): string => (typeof v === "string" ? v : "");

export async function POST(request: Request) {
  const ip = clientIp(request);
  const ipLimit = await rateLimit(`forgot-password:${ip}`, 10, 10 * 60_000);
  if (!ipLimit.ok) return tooManyRequests(ipLimit.retryAfter);

  const parsed = await readJsonLimited(request, 2_000);
  if (parsed.error) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }
  const body = (parsed.data ?? {}) as Record<string, unknown>;
  const email = asString(body.email).toLowerCase().trim();
  if (!isEmailLike(email)) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }

  // Throttle per-email requests separately so one address can't be spammed
  // with OTP emails even from rotating IPs.
  const emailLimit = await rateLimit(`forgot-password-email:${email}`, 3, 10 * 60_000);
  if (!emailLimit.ok) return tooManyRequests(emailLimit.retryAfter);

  const user = await getUserByEmail(email);
  if (!user) {
    return NextResponse.json(
      {
        error: "No account found for that email.",
        code: "not_registered",
      },
      { status: 404 },
    );
  }

  // Any registered account (credentials or GitHub-only) can set/reset a
  // password through this flow — for a GitHub-only account this adds email +
  // password as a second way to log in, alongside GitHub.
  try {
    const otp = await createPasswordResetOtp(email);
    const { subject, html, text } = otpEmail(otp);
    await sendMail({ to: email, subject, html, text });
  } catch (err) {
    console.error("[forgot-password] failed to send OTP email:", err);
    return NextResponse.json(
      { error: "Could not send the code. Please try again." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: "We've sent a 6-digit code to your email.",
  });
}
