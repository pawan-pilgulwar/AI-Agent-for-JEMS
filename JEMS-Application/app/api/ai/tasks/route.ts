import { NextResponse } from "next/server";
import { apiSession } from "@/lib/auth/api-session";
import { listTasks, sweepAndKick } from "@/lib/ai-tasks/queue";
import { AI_TASK_TYPES, type AiTaskType } from "@/lib/ai-tasks/types";

// Polling here may restart interrupted tasks, which then run in after().
export const maxDuration = 300;

/**
 * The signed-in user's AI tasks, newest first.
 * `?active=1` → only queued/running; `?types=a,b` → filter by task type.
 */
export async function GET(request: Request) {
  const s = await apiSession();
  if ("error" in s) return s.error;

  const url = new URL(request.url);
  const types = (url.searchParams.get("types") ?? "")
    .split(",")
    .filter((t): t is AiTaskType => (AI_TASK_TYPES as readonly string[]).includes(t));

  await sweepAndKick();
  const tasks = await listTasks(s.userId, {
    activeOnly: url.searchParams.get("active") === "1",
    types,
    limit: Number(url.searchParams.get("limit")) || 20,
  });
  return NextResponse.json({ tasks });
}
