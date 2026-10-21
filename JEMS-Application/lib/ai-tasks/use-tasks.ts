"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type AiTaskType, type AiTaskView, isActive } from "./types";

/**
 * Starts a background AI task via one of the `POST /api/.../ai/...` routes.
 * Resolves with the queued task (202) or throws with the server's message.
 */
export async function startAiTask(url: string, body: unknown): Promise<AiTaskView> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as { task?: AiTaskView; error?: string };
  if (!res.ok || !data.task) throw new Error(data.error || "Could not start the AI task.");
  // The notification bell listens for this and switches to fast polling.
  window.dispatchEvent(new Event("jems:ai-task-started"));
  return data.task;
}

const FAST_MS = 3_000;
const SLOW_MS = 20_000;

/**
 * Polls the signed-in user's recent AI tasks of the given types. Polls every
 * 3 s while any task is queued/running and every 20 s otherwise (or not at
 * all with `idle: false`). `onSettled` fires once per task that finishes
 * while the page is open — typically `router.refresh()` to show the result.
 */
export function useAiTasks(
  types: AiTaskType[],
  opts: { onSettled?: (task: AiTaskView) => void; idlePolling?: boolean } = {},
) {
  const [tasks, setTasks] = useState<AiTaskView[]>([]);
  const [loaded, setLoaded] = useState(false);
  const seen = useRef(new Map<string, AiTaskView["status"]>());
  const onSettled = useRef(opts.onSettled);
  useEffect(() => {
    onSettled.current = opts.onSettled;
  });
  const typesKey = types.join(",");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Runs a poll now (the loop below keeps it current). */
  const pollRef = useRef<() => void>(() => {});
  const idlePolling = opts.idlePolling !== false;

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      if (timer.current) clearTimeout(timer.current);
      let next: AiTaskView[] | null = null;
      try {
        const res = await fetch(`/api/ai/tasks?types=${encodeURIComponent(typesKey)}&limit=30`, { cache: "no-store" });
        if (res.ok) next = ((await res.json()) as { tasks: AiTaskView[] }).tasks;
      } catch {
        // Offline for a moment — try again on the next tick.
      }
      if (cancelled) return;
      if (next) {
        for (const t of next) {
          const before = seen.current.get(t.id);
          if (before && isActive(before) && !isActive(t.status)) onSettled.current?.(t);
          seen.current.set(t.id, t.status);
        }
        setTasks(next);
        setLoaded(true);
      }
      const busy = (next ?? []).some((t) => isActive(t.status));
      if (busy || idlePolling) timer.current = setTimeout(poll, busy ? FAST_MS : SLOW_MS);
    };
    pollRef.current = poll;
    poll();
    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [typesKey, idlePolling]);

  /** Shows a just-started task immediately and switches to fast polling. */
  const track = useCallback((task: AiTaskView) => {
    seen.current.set(task.id, task.status);
    setTasks((prev) => [task, ...prev.filter((t) => t.id !== task.id)]);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => pollRef.current(), FAST_MS);
  }, []);

  const refresh = useCallback(() => pollRef.current(), []);

  /** Latest task (any status) for a subject, e.g. the skill a roadmap is for. */
  const latestFor = useCallback(
    (subject: string, type?: AiTaskType) =>
      tasks.find((t) => t.subject.toLowerCase() === subject.toLowerCase() && (!type || t.type === type)) ?? null,
    [tasks],
  );

  return { tasks, loaded, track, latestFor, refresh };
}
