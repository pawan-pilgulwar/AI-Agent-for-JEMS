import { NextResponse } from "next/server";
import { apiSession } from "@/lib/auth/api-session";
import { AgentError, agent } from "@/lib/agent/client";
import { readJsonLimited } from "@/lib/http";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { validateRunCode } from "@/lib/validation/ai";

export const maxDuration = 60;

/**
 * The code editor's "Run" button: runs the student's program once with their
 * own input via the Agent's Judge0 runner. A single run takes seconds, so this
 * one is synchronous (no background task) and grades nothing.
 */
export async function POST(request: Request) {
  const s = await apiSession("student");
  if ("error" in s) return s.error;
  const limit = await rateLimit(`run-code:${s.userId}`, 20, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const parsed = await readJsonLimited(request, 40_000);
  if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const { value, error } = validateRunCode(parsed.data);
  if (error || !value) return NextResponse.json({ error: error ?? "Invalid input." }, { status: 400 });

  try {
    const run = await agent.runCode(value);
    return NextResponse.json({ run });
  } catch (err) {
    const message = err instanceof AgentError ? err.message : "Could not run the code.";
    const status = err instanceof AgentError && err.status >= 400 && err.status < 500 ? err.status : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
