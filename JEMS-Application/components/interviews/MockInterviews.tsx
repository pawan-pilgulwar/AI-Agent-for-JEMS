"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type LucideIcon,
  ArrowRight,
  Code2,
  LoaderCircle,
  MessageSquare,
  Network,
  Play,
  Target,
  TrendingUp,
} from "lucide-react";
import DashboardShell, { DashboardContainer } from "@/components/dashboard/student/DashboardShell";
import { Card } from "@/components/dashboard/student/ui";
import TaskStatus from "@/components/ai/TaskStatus";
import { INTERVIEW_TYPES, type InterviewType, type PaperSummary, paperMinutes } from "@/lib/ai/papers-shared";
import { isActive } from "@/lib/ai-tasks/types";
import { startAiTask, useAiTasks } from "@/lib/ai-tasks/use-tasks";
import type { MockInterviewData } from "@/lib/db/student-data";

const ICONS: Record<InterviewType["id"], LucideIcon> = {
  behavioral: MessageSquare,
  technical: Code2,
  "system-design": Network,
  role: Target,
};

function scoreTone(score: number) {
  if (score >= 80) return "bg-emerald/10 text-emerald";
  if (score >= 70) return "bg-slate/10 text-slate";
  return "bg-gold/10 text-[#b45309]";
}

/**
 * Mock interviews run by the AI agents: the question set is generated in the
 * background, the student answers in the timed player, and written answers
 * are graded by the AI with feedback. Scores land in the history below.
 */
export default function MockInterviews({ data, papers }: { data: MockInterviewData; papers: PaperSummary[] }) {
  const router = useRouter();
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [showAll, setShowAll] = useState(false);
  const { track, latestFor } = useAiTasks(["assessment.generate", "assessment.grade"], { onSettled: () => router.refresh() });

  const STATS = [
    { label: "Completed", value: String(data.completed) },
    { label: "Average score", value: data.completed ? `${data.average}%` : "—" },
    { label: "Best score", value: data.completed ? `${data.best}%` : "—" },
    { label: "Current streak", value: data.streak ? `${data.streak} day${data.streak === 1 ? "" : "s"}` : "—" },
  ];

  const start = async (t: InterviewType) => {
    setError("");
    setStarting(t.id);
    try {
      track(await startAiTask("/api/student/ai/papers", { purpose: "interview", interviewType: t.id }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the interview.");
    } finally {
      setStarting(null);
    }
  };

  const past = showAll ? data.past : data.past.slice(0, 5);

  return (
    <DashboardShell>
      <DashboardContainer className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {STATS.map((s, i) => (
            <Card key={s.label} className="p-5">
              <p className="text-xs font-medium text-mediumgray">{s.label}</p>
              <p className="mt-2 inline-flex items-center gap-1.5 text-2xl font-bold text-navy">
                {s.value}
                {i === 1 && data.completed > 0 && <TrendingUp className="h-4 w-4 text-emerald" />}
              </p>
            </Card>
          ))}
        </div>

        {/* Start a new interview */}
        <div>
          <div className="mb-3 flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-semibold text-navy">Start a new interview</h2>
            <span className="text-xs text-mediumgray">Questions and feedback by the AI agents</span>
          </div>
          {error && <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {INTERVIEW_TYPES.map((t) => {
              const Icon = ICONS[t.id];
              const task = latestFor(t.title, "assessment.generate");
              const paper = papers.find((p) => p.interviewType === t.id) ?? null;
              const generating = (!!task && isActive(task.status)) || starting === t.id;
              const open = paper && (paper.status === "ready" || paper.status === "in-progress" || paper.status === "submitted");
              return (
                <Card key={t.id} className="group flex flex-col p-5 transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate/10 text-slate">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-base font-bold text-navy">{t.title}</h3>
                  <p className="mt-1 flex-1 text-xs text-mediumgray">{t.desc}</p>
                  <p className="mt-3 text-xs font-medium text-mediumgray">~{paperMinutes(t.counts)} min</p>
                  {task && (generating || task.status === "failed") && <TaskStatus task={task} className="mt-3" />}
                  {generating ? (
                    <span className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-lightgray py-2.5 text-sm font-semibold text-mediumgray">
                      <LoaderCircle className="h-4 w-4 animate-spin" /> Preparing…
                    </span>
                  ) : open ? (
                    <Link
                      href={`/student/assessment/ai/${paper.id}`}
                      className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary-gradient py-2.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(234,88,12,0.25)] transition-transform group-hover:-translate-y-0.5"
                    >
                      {paper.status === "submitted" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                      {paper.status === "ready" ? "Begin interview" : paper.status === "in-progress" ? "Resume" : "Grading…"}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => start(t)}
                      className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary-gradient py-2.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(234,88,12,0.25)] transition-transform group-hover:-translate-y-0.5"
                    >
                      <Play className="h-4 w-4" />
                      Start
                    </button>
                  )}
                </Card>
              );
            })}
          </div>
        </div>

        {/* Past interviews */}
        <Card>
          <div className="flex items-center justify-between border-b border-lightgray px-5 py-3.5">
            <h2 className="text-sm font-semibold text-navy">Past interviews</h2>
            {data.past.length > 5 && (
              <button type="button" onClick={() => setShowAll((v) => !v)} className="text-xs font-semibold text-slate hover:text-[#c2410c]">
                {showAll ? "Show less" : "View all"}
              </button>
            )}
          </div>
          {data.past.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-mediumgray">
              You haven&apos;t taken any mock interviews yet. Pick a type above to
              run your first one and get AI feedback on every answer.
            </p>
          ) : (
            <ul className="divide-y divide-lightgray">
              {past.map((p) => (
                <li key={p.id} className="flex items-center gap-4 px-5 py-3.5">
                  <span className={`flex h-9 w-12 items-center justify-center rounded-lg text-sm font-bold ${scoreTone(p.score)}`}>
                    {p.score}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-navy">{p.type}</p>
                    <p className="text-xs text-mediumgray">{p.date}</p>
                  </div>
                  {p.paperId ? (
                    <Link href={`/student/assessment/ai/${p.paperId}`} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-lightgray px-3.5 py-2 text-xs font-semibold text-navy transition-colors hover:border-slate hover:text-slate">
                      View feedback <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  ) : (
                    <span className="shrink-0 text-[11px] text-mediumgray">No detailed feedback</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </DashboardContainer>
    </DashboardShell>
  );
}
