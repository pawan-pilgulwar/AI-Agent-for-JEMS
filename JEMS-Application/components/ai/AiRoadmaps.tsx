"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarClock, LoaderCircle, Map as MapIcon, RotateCcw, Sparkles } from "lucide-react";
import DashboardShell, { DashboardContainer } from "@/components/dashboard/student/DashboardShell";
import { Card, EmptyState } from "@/components/dashboard/student/ui";
import TaskStatus from "@/components/ai/TaskStatus";
import type { AiRoadmapSummary } from "@/lib/ai/roadmap";
import { isActive } from "@/lib/ai-tasks/types";
import { startAiTask, useAiTasks } from "@/lib/ai-tasks/use-tasks";

/**
 * AI roadmaps: pick a skill, the agents work out what you're missing for it
 * and write a week-by-week syllabus. Generation runs in the background; each
 * skill has one roadmap that regenerating updates.
 */
export default function AiRoadmaps({
  roadmaps,
  suggestions,
  initialSkill,
}: {
  roadmaps: AiRoadmapSummary[];
  suggestions: string[];
  initialSkill: string;
}) {
  const router = useRouter();
  const [skill, setSkill] = useState(initialSkill);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState<string | null>(null);
  const { tasks, track, latestFor } = useAiTasks(["student.roadmap"], { onSettled: () => router.refresh() });

  const generate = async (name: string) => {
    const target = name.trim();
    if (!target) return;
    setError("");
    setStarting(target);
    try {
      track(await startAiTask("/api/student/ai/roadmap", { skill: target }));
      setSkill("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the roadmap.");
    } finally {
      setStarting(null);
    }
  };

  const inFlight = tasks.filter((t) => isActive(t.status));
  // Recent failures for skills that don't have a roadmap yet (otherwise shown on the card).
  const failed = tasks.filter(
    (t) => t.status === "failed" && latestFor(t.subject)?.id === t.id && !roadmaps.some((r) => r.skill.toLowerCase() === t.subject.toLowerCase()),
  );

  return (
    <DashboardShell>
      <DashboardContainer className="space-y-6">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate/10 px-2.5 py-1 text-xs font-semibold text-slate"><Sparkles className="h-3.5 w-3.5" /> AI Personalized</span>
          <h1 className="mt-3 text-2xl font-bold text-navy">Learning Roadmaps</h1>
          <p className="mt-1 max-w-2xl text-sm text-mediumgray">
            Choose a skill to learn. The AI prerequisite agent maps the foundations, skips anything you&apos;ve already verified, and builds your custom week-by-week syllabus with topics, practice, projects, and resources.
          </p>
        </div>

        <Card className="p-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              generate(skill);
            }}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <input
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
              placeholder="e.g. Spring Boot, Cloud Computing, React"
              maxLength={80}
              aria-label="Skill to learn"
              className="h-11 flex-1 rounded-lg border border-lightgray bg-white px-3 text-sm text-navy outline-none transition-colors placeholder:text-mediumgray focus:border-slate focus:ring-2 focus:ring-slate/15"
            />
            <button
              type="submit"
              disabled={!skill.trim() || !!starting}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary-gradient px-5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(234,88,12,0.25)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {starting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate roadmap
            </button>
          </form>
          {suggestions.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-mediumgray">Your gaps:</span>
              {suggestions.map((s) => (
                <button key={s} type="button" onClick={() => setSkill(s)} className="rounded-full border border-lightgray bg-white px-2.5 py-1 text-xs font-medium text-navy transition-colors hover:border-slate hover:text-slate">
                  {s}
                </button>
              ))}
            </div>
          )}
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          {(inFlight.length > 0 || failed.length > 0) && (
            <div className="mt-4 space-y-2">
              {[...inFlight, ...failed].map((t) => (
                <TaskStatus key={t.id} task={t} />
              ))}
            </div>
          )}
        </Card>

        {roadmaps.length === 0 ? (
          <EmptyState icon={MapIcon} title="No roadmaps yet" hint="Generate your first personalized roadmap above — it takes about one to two minutes, and you'll get a notification when it's ready." />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {roadmaps.map((r) => {
              const task = latestFor(r.skill, "student.roadmap");
              const busy = !!task && isActive(task.status);
              return (
                <Card key={r.id} className="flex flex-col p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-base font-bold text-navy">{r.skill}</h2>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-navy"><CalendarClock className="h-3 w-3" /> ~{r.totalWeeks} wk</span>
                  </div>
                  <p className="mt-1 text-xs text-mediumgray">{r.steps} steps · updated {new Date(r.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                  {r.missingSkills.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {r.missingSkills.map((m) => <span key={m} className="rounded bg-gold/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">{m}</span>)}
                    </div>
                  )}
                  {task && (busy || task.status === "failed") && <TaskStatus task={task} className="mt-3" />}
                  <div className="mt-auto flex items-center gap-2 pt-4">
                    <Link href={`/student/roadmap/${r.id}`} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-navy px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#1f2937]">
                      Open <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => generate(r.skill)}
                      disabled={busy || starting === r.skill}
                      title="Regenerate with your latest verified skills"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-lightgray px-3 py-2 text-xs font-semibold text-navy transition-colors hover:border-slate hover:text-slate disabled:opacity-50"
                    >
                      {busy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />} Regenerate
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </DashboardContainer>
    </DashboardShell>
  );
}
