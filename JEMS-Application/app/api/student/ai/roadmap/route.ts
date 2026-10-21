import { NextResponse } from "next/server";
import { apiSession } from "@/lib/auth/api-session";
import { listAiRoadmaps } from "@/lib/ai/roadmap";
import { skillKey } from "@/lib/ai/util";
import { enqueueTask } from "@/lib/ai-tasks/queue";
import { readJsonLimited } from "@/lib/http";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { validateRoadmapRequest } from "@/lib/validation/ai";

// The task runs in after() once the 202 is sent: /agents/prereqs (usually cached)
// then /agents/roadmap (~570 s measured, up to AGENT_ROADMAP_TIMEOUT_MS = 750 s).
// 800 s is the platform maximum.
export const maxDuration = 800;

/** The student's generated AI roadmaps. */
export async function GET() {
  const s = await apiSession("student");
  if ("error" in s) return s.error;
  return NextResponse.json({ roadmaps: await listAiRoadmaps(s.userId) });
}

/**
 * Starts (or re-generates) an AI roadmap for `{ skill }` in the background.
 * Responds 202 with the task immediately; the result lands in `aiRoadmaps`
 * and the student is notified when it is ready.
 */
export async function POST(request: Request) {
  const s = await apiSession("student");
  if ("error" in s) return s.error;
  const limit = await rateLimit(`ai-roadmap:${s.userId}`, 10, 10 * 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const parsed = await readJsonLimited(request, 1_000);
  if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const { value, error } = validateRoadmapRequest(parsed.data);
  if (error || !value) return NextResponse.json({ error: error ?? "Invalid input." }, { status: 400 });

  const res = await enqueueTask({
    userId: s.userId,
    role: s.role,
    type: "student.roadmap",
    subject: value.skill,
    dedupeKey: `${s.userId}:roadmap:${skillKey(value.skill)}`,
    input: { skill: value.skill },
    label: `${value.skill} roadmap`,
    link: "/student/roadmap/ai",
  });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json({ task: res.task, created: res.created }, { status: 202 });
}
