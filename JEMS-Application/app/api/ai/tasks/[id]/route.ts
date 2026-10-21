import { NextResponse } from "next/server";
import { apiSession } from "@/lib/auth/api-session";
import { getTaskForUser, sweepAndKick } from "@/lib/ai-tasks/queue";

export const maxDuration = 300;

/** Status of one of the signed-in user's AI tasks (polled by the UI). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await apiSession();
  if ("error" in s) return s.error;
  const { id } = await params;

  await sweepAndKick();
  const task = await getTaskForUser(s.userId, String(id));
  if (!task) return NextResponse.json({ error: "Task not found." }, { status: 404 });
  return NextResponse.json({ task });
}
