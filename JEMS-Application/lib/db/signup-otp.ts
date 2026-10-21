import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { getDatabase } from "@/lib/db/mongodb";

/**
 * Email-verification OTPs issued during signup, before the account exists.
 * One active code per email, stored in the `signupOtps` collection and
 * overwritten each time a new code is requested. Mirrors the password-reset
 * flow in `lib/db/password-reset.ts`: the code itself is stored as an
 * HMAC-SHA256 digest (keyed by AUTH_SECRET), never in plaintext.
 */

const OTP_TTL_MS = 10 * 60_000;
const MAX_ATTEMPTS = 5;

interface SignupOtpDoc {
  email: string;
  otpHash: string;
  otpExpiresAt: Date;
  attempts: number;
  verified: boolean;
  expiresAt: Date;
  updatedAt: Date;
}

async function signupOtps() {
  const db = await getDatabase();
  return db.collection("signupOtps");
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

/** Generates a fresh 6-digit OTP for `email`, replacing any prior one. Returns the plaintext code (to email to the user). */
export async function createSignupOtp(email: string): Promise<string> {
  const otp = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);
  const col = await signupOtps();
  await col.updateOne(
    { email },
    {
      $set: {
        email,
        otpHash: digest(`signup-otp:${email}:${otp}`),
        otpExpiresAt,
        attempts: 0,
        verified: false,
        expiresAt: otpExpiresAt,
        updatedAt: new Date(),
      },
    },
    { upsert: true },
  );
  return otp;
}

/** Checks `otp` against the stored code for `email`. Marks it verified on success so it can be rechecked at account-creation time. */
export async function verifySignupOtp(email: string, otp: string): Promise<boolean> {
  const col = await signupOtps();
  const doc = (await col.findOne({ email })) as SignupOtpDoc | null;
  if (!doc) return false;
  if (doc.attempts >= MAX_ATTEMPTS) return false;
  if (doc.otpExpiresAt.getTime() < Date.now()) return false;

  if (!safeEqual(doc.otpHash, digest(`signup-otp:${email}:${otp}`))) {
    await col.updateOne({ email }, { $inc: { attempts: 1 } });
    return false;
  }

  await col.updateOne({ email }, { $set: { verified: true, updatedAt: new Date() } });
  return true;
}
