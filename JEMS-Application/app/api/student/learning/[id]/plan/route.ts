import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { apiSession } from "@/lib/auth/api-session";
import { getAiRoadmap } from "@/lib/ai/roadmap";
import { enqueueTask } from "@/lib/ai-tasks/queue";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

// The task runs in after() once the 202 is sent: one /learning/path call
// (one vLLM call per module, up to AGENT_LEARNING_TIMEOUT_MS = 240 s).
export const maxDuration = 300;

/**
 * Plans (or re-plans) the student's learning path for one AI roadmap with the
 * learning path agent, in the background. Responds 202 with the task; the plan
 * lands on the roadmap's `learningPaths` row and the student is notified.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await apiSession("student");
  if ("error" in s) return s.error;
  const limit = await rateLimit(`learning-plan:${s.userId}`, 6, 10 * 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Learning path not found." }, { status: 404 });

  const roadmap = await getAiRoadmap(s.userId, id);
  if (!roadmap) return NextResponse.json({ error: "Learning path not found." }, { status: 404 });

  const res = await enqueueTask({
    userId: s.userId,
    role: s.role,
    type: "learning.plan",
    // The roadmap id lets the learning path page find its own task.
    subject: id,
    dedupeKey: `${s.userId}:learning-plan:${id}`,
    input: { roadmapId: id },
    label: `${roadmap.skill} learning path`,
    link: `/student/learning/${id}`,
  });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json({ task: res.task, created: res.created }, { status: 202 });
}
