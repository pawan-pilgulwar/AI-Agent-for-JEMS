"use client";

import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";
import type { AiTaskView } from "@/lib/ai-tasks/types";

/**
 * One-line live state of a background AI task: spinner + progress while it
 * runs, the error when it failed, a tick when done. Reassures the student
 * that they can leave the page — they'll be notified either way.
 */
export default function TaskStatus({ task, className = "" }: { task: AiTaskView | null; className?: string }) {
  if (!task) return null;
  if (task.status === "queued" || task.status === "running") {
    return (
      <p className={`flex items-start gap-2 rounded-lg bg-slate/5 px-3 py-2 text-xs text-navy ${className}`} role="status">
        <LoaderCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-slate" />
        <span>
          <span className="font-semibold">{task.status === "queued" ? "Queued" : "Working"}</span> · {task.progress || task.label}
          <span className="block text-[11px] text-mediumgray">This runs in the background (up to ~5 min). You can leave this page — we&apos;ll notify you.</span>
        </span>
      </p>
    );
  }
  if (task.status === "failed") {
    return (
      <p className={`flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 ${className}`} role="alert">
        <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span><span className="font-semibold">{task.label} failed.</span> {task.error}</span>
      </p>
    );
  }
  return (
    <p className={`flex items-start gap-2 rounded-lg bg-emerald/5 px-3 py-2 text-xs text-emerald ${className}`}>
      <CircleCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{task.summary || "Done"}</span>
    </p>
  );
}
