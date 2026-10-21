"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Code2, LoaderCircle, RotateCcw, ScanSearch, TriangleAlert } from "lucide-react";
import { Card } from "@/components/dashboard/student/ui";
import TaskStatus from "@/components/ai/TaskStatus";
import type { ProfileAnalysisView } from "@/lib/ai/profile";
import { isActive } from "@/lib/ai-tasks/types";
import { startAiTask, useAiTasks } from "@/lib/ai-tasks/use-tasks";

const inputClass =
  "h-10 w-full rounded-lg border border-lightgray bg-white px-3 text-sm text-navy outline-none transition-colors placeholder:text-mediumgray focus:border-slate focus:ring-2 focus:ring-slate/15";

function levelTone(level: string) {
  const l = level.toLowerCase();
  if (l.startsWith("adv") || l.startsWith("exp")) return "bg-emerald/10 text-emerald";
  if (l.startsWith("int")) return "bg-slate/10 text-slate";
  return "bg-surface text-mediumgray";
}

/**
 * "Coding profile evidence": the profile agent reads the student's public
 * GitHub repositories and LeetCode stats and lists the skills that activity
 * supports. Runs in the background; the result is stored and replaced on
 * every re-run. Evidence never verifies a skill on its own.
 */
export default function CodingEvidence({
  initial,
  defaultGithub,
}: {
  initial: ProfileAnalysisView | null;
  defaultGithub: string;
}) {
  const router = useRouter();
  const [github, setGithub] = useState(initial?.sources.github?.username ?? defaultGithub);
  const [leetcode, setLeetcode] = useState(initial?.sources.leetcode?.username ?? "");
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const { tasks, track } = useAiTasks(["student.profile"], { onSettled: () => router.refresh(), idlePolling: false });
  const task = tasks[0] ?? null;
  const running = !!task && isActive(task.status);
  const data = initial;

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setStarting(true);
    try {
      track(await startAiTask("/api/student/ai/profile", { github, leetcode }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the analysis.");
    } finally {
      setStarting(false);
    }
  };

  return (
    <Card id="coding-evidence" className="scroll-mt-24 p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate/10 text-slate"><Code2 className="h-4 w-4" /></span>
          <div>
            <h3 className="text-sm font-semibold text-navy">Coding profile evidence</h3>
            <p className="text-[11px] text-mediumgray">The profile agent reads your public GitHub and LeetCode activity and lists the skills it supports.</p>
          </div>
        </div>
        {data?.updatedAt && <span className="text-[11px] text-mediumgray">Updated {new Date(data.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>}
      </div>

      <form onSubmit={run} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-navy">GitHub username or URL</span>
          <input value={github} onChange={(e) => setGithub(e.target.value)} placeholder="octocat" className={inputClass} maxLength={300} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-navy">LeetCode username <span className="font-normal text-mediumgray">(optional)</span></span>
          <input value={leetcode} onChange={(e) => setLeetcode(e.target.value)} placeholder="your-handle" className={inputClass} maxLength={300} />
        </label>
        <button
          type="submit"
          disabled={running || starting || (!github.trim() && !leetcode.trim())}
          className="inline-flex h-10 items-center justify-center gap-2 self-end rounded-lg bg-primary-gradient px-4 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(234,88,12,0.25)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {running || starting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : data ? <RotateCcw className="h-4 w-4" /> : <ScanSearch className="h-4 w-4" />}
          {data ? "Re-analyse" : "Analyse"}
        </button>
      </form>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {task && (running || task.status === "failed") && <TaskStatus task={task} className="mt-3" />}

      {data && (
        <div className="mt-5 space-y-4">
          {data.summary && <p className="rounded-lg bg-surface-2 px-4 py-3 text-sm text-navy">{data.summary}</p>}
          {data.warnings.length > 0 && (
            <ul className="space-y-1">
              {data.warnings.map((w) => (
                <li key={w} className="flex items-start gap-2 text-xs text-amber-700"><TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />{w}</li>
              ))}
            </ul>
          )}
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {data.skills.map((s) => (
              <li key={s.name} className="rounded-lg border border-lightgray p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-navy">{s.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${levelTone(s.level)}`}>{s.level}</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-lightgray">
                    <div className="h-full rounded-full bg-slate" style={{ width: `${s.confidence}%` }} />
                  </div>
                  <span className="text-[10px] tabular-nums text-mediumgray">{s.confidence}% confidence</span>
                </div>
                {s.evidence && <p className="mt-2 text-xs text-mediumgray">{s.evidence}</p>}
              </li>
            ))}
          </ul>
          {data.skills.length > 0 && (
            <p className="text-xs text-mediumgray">
              Evidence isn&apos;t verification. <Link href="/student/assessment" className="font-semibold text-slate hover:underline">Take a skill test</Link> to turn these into verified skills that count for matching.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
