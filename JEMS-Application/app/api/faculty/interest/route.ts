import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { toggleInterest } from "@/lib/db/collaborations";
import { readJsonLimited } from "@/lib/http";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

/** Toggles the signed-in faculty/institution user's interest in a collaboration. */
export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!["faculty", "institution"].includes(session?.user?.role ?? "")) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  const limit = await rateLimit(`interest:${userId}`, 30, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const parsed = await readJsonLimited(request, 1_000);
  if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const collaborationId = String((parsed.data as { collaborationId?: unknown })?.collaborationId ?? "");
  if (!collaborationId) return NextResponse.json({ error: "collaborationId is required." }, { status: 400 });

  const res = await toggleInterest(userId, collaborationId);
  if (!res.ok) return NextResponse.json({ error: "Collaboration not found." }, { status: 404 });
  return NextResponse.json(res);
}
