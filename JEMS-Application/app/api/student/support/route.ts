import { NextResponse } from "next/server";
import { apiSession } from "@/lib/auth/api-session";
import { createTicket, listTickets } from "@/lib/db/student-actions";
import { readJsonLimited } from "@/lib/http";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { validateTicket } from "@/lib/validation/student-actions";

/** The signed-in user's support tickets. */
export async function GET() {
  const s = await apiSession();
  if ("error" in s) return s.error;
  return NextResponse.json({ tickets: await listTickets(s.userId) });
}

/** Opens a ticket: `{ subject, category, message }`. */
export async function POST(request: Request) {
  const s = await apiSession();
  if ("error" in s) return s.error;
  const limit = await rateLimit(`support:${s.userId}`, 5, 10 * 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const parsed = await readJsonLimited(request, 8_000);
  if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const { value, error } = validateTicket(parsed.data);
  if (error || !value) return NextResponse.json({ error: error ?? "Invalid input." }, { status: 400 });

  const ticket = await createTicket(s.userId, value);
  if (!ticket) return NextResponse.json({ error: "Could not open the ticket." }, { status: 500 });
  return NextResponse.json({ ticket }, { status: 201 });
}
