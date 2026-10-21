import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getLatestAnalysis, runStudentAnalysis } from "@/lib/db/analysis";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

/** Returns the student's most recent AI career analysis (null if never run). */
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  return NextResponse.json({ result: await getLatestAnalysis(userId) });
}

/**
 * Runs the multi-agent pipeline for the signed-in student and stores the
 * result. No request body — every input comes from the student's own records
 * and the shared market data, so there is nothing for a client to tamper with.
 */
export async function POST() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (session?.user?.role !== "student") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  const limit = await rateLimit(`analysis:${userId}`, 10, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const result = await runStudentAnalysis(userId);
  if (!result) return NextResponse.json({ error: "Could not run the analysis." }, { status: 500 });
  return NextResponse.json({ result });
}
