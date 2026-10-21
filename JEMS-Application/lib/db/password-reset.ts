import { createHmac, randomBytes, randomInt, timingSafeEqual } from "crypto";
import { getDatabase } from "@/lib/db/mongodb";

/**
 * Password-reset flow: email -> OTP -> short-lived reset token -> new password.
 * One active flow per email, stored in the `passwordResets` collection and
 * overwritten each time a new OTP is requested.
 *
 * OTPs and reset tokens are stored as HMAC-SHA256 digests (keyed by
 * AUTH_SECRET) rather than plaintext, so a DB dump alone can't be replayed.
 */

const OTP_TTL_MS = 10 * 60_000;
const RESET_TOKEN_TTL_MS = 15 * 60_000;
const MAX_ATTEMPTS = 5;

interface PasswordResetDoc {
  email: string;
  otpHash: string;
  otpExpiresAt: Date;
  attempts: number;
  verified: boolean;
  resetTokenHash: string | null;
  resetTokenExpiresAt: Date | null;
  /** Outer-bound expiry (otpExpiresAt, then resetTokenExpiresAt once verified) — TTL-indexed for cleanup. */
  expiresAt: Date;
  updatedAt: Date;
}

async function passwordResets() {
  const db = await getDatabase();
  return db.collection("passwordResets");
}

function digest(value: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set.");
  return createHmac("sha256", secret).update(value).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

/** Generates a fresh 6-digit OTP for `email`, replacing any prior flow. Returns the plaintext code (to email to the user). */
export async function createPasswordResetOtp(email: string): Promise<string> {
  const otp = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);
  const col = await passwordResets();
  await col.updateOne(
    { email },
    {
      $set: {
        email,
        otpHash: digest(`otp:${email}:${otp}`),
        otpExpiresAt,
        attempts: 0,
        verified: false,
        resetTokenHash: null,
        resetTokenExpiresAt: null,
        expiresAt: otpExpiresAt,
        updatedAt: new Date(),
      },
    },
    { upsert: true },
  );
  return otp;
}

export type VerifyOtpResult =
  | { ok: true; resetToken: string }
  | { ok: false };

/** Checks `otp` against the stored flow for `email`. On success, issues a one-time reset token. */
export async function verifyPasswordResetOtp(
  email: string,
  otp: string,
): Promise<VerifyOtpResult> {
  const col = await passwordResets();
  const doc = (await col.findOne({ email })) as PasswordResetDoc | null;
  if (!doc) return { ok: false };
  if (doc.attempts >= MAX_ATTEMPTS) return { ok: false };
  if (doc.otpExpiresAt.getTime() < Date.now()) return { ok: false };

  if (!safeEqual(doc.otpHash, digest(`otp:${email}:${otp}`))) {
    await col.updateOne({ email }, { $inc: { attempts: 1 } });
    return { ok: false };
  }

  const resetToken = randomBytes(32).toString("hex");
  const resetTokenExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
  await col.updateOne(
    { email },
    {
      $set: {
        verified: true,
        attempts: 0,
        resetTokenHash: digest(`reset:${email}:${resetToken}`),
        resetTokenExpiresAt,
        expiresAt: resetTokenExpiresAt,
        updatedAt: new Date(),
      },
    },
  );
  return { ok: true, resetToken };
}

/** Consumes a verified reset token and applies `newPasswordHash` to the user's account. */
export async function resetPasswordWithToken(
  email: string,
  resetToken: string,
  newPasswordHash: string,
): Promise<boolean> {
  const col = await passwordResets();
  const doc = (await col.findOne({ email })) as PasswordResetDoc | null;
  if (!doc?.verified || !doc.resetTokenHash || !doc.resetTokenExpiresAt) {
    return false;
  }
  if (doc.resetTokenExpiresAt.getTime() < Date.now()) return false;
  if (!safeEqual(doc.resetTokenHash, digest(`reset:${email}:${resetToken}`))) {
    return false;
  }

  const db = await getDatabase();
  const res = await db
    .collection("users")
    .updateOne(
      { email },
      { $set: { passwordHash: newPasswordHash, updatedAt: new Date() } },
    );
  if (res.matchedCount !== 1) return false;

  await col.deleteOne({ email });
  return true;
}
