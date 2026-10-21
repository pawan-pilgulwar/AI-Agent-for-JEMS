import { NextResponse } from "next/server";
import { isEmailLike, evaluatePassword } from "@/components/signup/password";
import { hashPassword } from "@/lib/auth/password";
import { createStudent, getUserByEmail } from "@/lib/db/users";
import { readJsonLimited } from "@/lib/http";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

/**
 * Coerces an unknown JSON value to a string. Critical for security: a body like
 * `{"email": {"$ne": null}}` would otherwise reach the database as a query
 * operator (NoSQL injection) or crash string methods. Everything is forced to a
 * plain string before use.
 */
const asString = (v: unknown): string => (typeof v === "string" ? v : "");

export async function POST(request: Request) {
  // Throttle account-creation abuse: 5 attempts per IP per 10 minutes.
  const limit = await rateLimit(`register:${clientIp(request)}`, 5, 10 * 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const parsed = await readJsonLimited(request, 20_000);
  if (parsed.error) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }
  const body = (parsed.data ?? {}) as Record<string, unknown>;

  const name = asString(body.name).trim();
  const email = asString(body.email).toLowerCase().trim();
  const password = asString(body.password);

  // Server-side validation — never trust the client form alone.
  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  if (!isEmailLike(email)) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }
  const phone = asString(body.phone).trim();
  if (!evaluatePassword(password, [name, email, phone]).acceptable) {
    return NextResponse.json(
      { error: "Password does not meet the requirements." },
      { status: 400 },
    );
  }

  if (await getUserByEmail(email)) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 },
    );
  }

  try {
    await createStudent({
      name,
      email,
      passwordHash: hashPassword(password),
      phone,
      profile: {
        experienceLevel: asString(body.experienceLevel),
        targetRole: asString(body.targetRole),
        learningStyle: asString(body.learningStyle),
        yearsOfExperience: asString(body.yearsOfExperience),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Could not create your account. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
