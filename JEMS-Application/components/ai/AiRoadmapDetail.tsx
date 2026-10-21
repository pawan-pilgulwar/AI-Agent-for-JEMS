"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, BookOpen, Check, ChevronDown, Dumbbell, GraduationCap, Hammer, Lightbulb, LoaderCircle, ShieldCheck, Target, TriangleAlert } from "lucide-react";
import DashboardShell, { DashboardContainer } from "@/components/dashboard/student/DashboardShell";
import { Card, ProgressBar } from "@/components/dashboard/student/ui";
import TaskStatus from "@/components/ai/TaskStatus";
import type { AiRoadmapView } from "@/lib/ai/roadmap";
import { roadmapProgress, stepProgress, topicKey } from "@/lib/ai/roadmap-progress";
import type { AiTaskView } from "@/lib/ai-tasks/types";
import { startAiTask, useAiTasks } from "@/lib/ai-tasks/use-tasks";

/** A generated syllabus: prerequisites first, the target skill last. */
export default function AiRoadmapDetail({ roadmap }: { roadmap: AiRoadmapView }) {
  const steps = roadmap.roadmap.steps;
  const [open, setOpen] = useState<number>(0);
  const [testError, setTestError] = useState("");
  const [starting, setStarting] = useState<string | null>(null);
  const { track, latestFor } = useAiTasks(["assessment.generate"], { idlePolling: false });

  // Topic tick-off: optimistic, saved per click, rolled back if the save fails.
  const [topicsDone, setTopicsDone] = useState(() => new Set(roadmap.topicsDone));
  const [saving, setSaving] = useState<Set<string>>(() => new Set());
  const [progressError, setProgressError] = useState("");
  const verified = useMemo(() => new Set(roadmap.verifiedSkills), [roadmap.verifiedSkills]);
  const overall = roadmapProgress(steps, topicsDone, verified);

  const toggleTopic = async (step: string, topic: string) => {
    const key = topicKey(step, topic);
    if (saving.has(key)) return;
    const done = !topicsDone.has(key);
    const flip = (on: boolean) =>
      setTopicsDone((prev) => {
        const next = new Set(prev);
        if (on) next.add(key);
        else next.delete(key);
        return next;
      });
    setProgressError("");
    flip(done);
    setSaving((prev) => new Set(prev).add(key));
    try {
      const res = await fetch(`/api/student/ai/roadmap/${roadmap.id}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step, topic, done }),
      });
      const data = (await res.json().catch(() => ({}))) as { topicsDone?: string[]; error?: string };
      if (!res.ok) throw new Error(data.error || "Could not save your progress.");
      if (data.topicsDone) setTopicsDone(new Set(data.topicsDone));
    } catch (err) {
      flip(!done);
      setProgressError(err instanceof Error ? err.message : "Could not save your progress.");
    } finally {
      setSaving((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const testMe = async (skill: string) => {
    setTestError("");
    setStarting(skill);
    try {
      track(await startAiTask("/api/student/ai/papers", { purpose: "skill", skill }));
    } catch (err) {
      setTestError(err instanceof Error ? err.message : "Could not start the test.");
    } finally {
      setStarting(null);
    }
  };

  return (
    <DashboardShell>
      <DashboardContainer className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link href="/student/roadmap/ai" className="inline-flex items-center gap-1 text-sm font-semibold text-slate hover:underline"><ArrowLeft className="h-4 w-4" /> All AI roadmaps</Link>
          <Link href="/student/learning" className="inline-flex items-center gap-1 text-sm font-semibold text-slate hover:underline"><GraduationCap className="h-4 w-4" /> Learning Paths</Link>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-navy">{roadmap.skill}</h1>
          <p className="mt-1 text-sm text-mediumgray">
            {steps.length} steps · about {roadmap.totalWeeks} weeks · generated {new Date(roadmap.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </p>
          {roadmap.knownSkills.length > 0 && (
            <p className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-mediumgray">
              <BadgeCheck className="h-3.5 w-3.5 text-emerald" /> Skipped because you&apos;ve verified them:
              {roadmap.knownSkills.map((k) => <span key={k} className="rounded bg-emerald/10 px-1.5 py-0.5 font-medium text-emerald">{k}</span>)}
            </p>
          )}
        </div>

        <Card className="p-5">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 text-sm">
            <span className="font-semibold text-navy">{overall.percent}% complete</span>
            <span className="text-xs text-mediumgray">
              {overall.done} of {overall.total} topics · {overall.verifiedSteps} of {steps.length} skills verified
            </span>
          </div>
          <ProgressBar value={overall.percent} barClass={overall.percent >= 100 ? "bg-emerald" : "bg-slate"} />
          <p className="mt-2 text-xs text-mediumgray">
            Tick topics as you finish them. Passing a step&apos;s AI test verifies the skill and completes the whole step.
          </p>
        </Card>
        {testError && <p className="text-sm text-red-600">{testError}</p>}
        {progressError && <p className="text-sm text-red-600">{progressError}</p>}

        <ol className="relative space-y-4 border-l-2 border-lightgray pl-6">
          {steps.map((step, i) => {
            const isOpen = open === i;
            const task: AiTaskView | null = latestFor(step.skill, "assessment.generate");
            const sp = stepProgress(step, topicsDone, verified);
            return (
              <li key={`${step.skill}-${i}`} className="relative">
                <span className={`absolute -left-[33px] top-4 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ring-4 ring-surface ${step.role === "target" ? "bg-orange text-white" : "bg-navy text-white"}`}>
                  {step.role === "target" ? <Target className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <Card className="overflow-hidden">
                  <button type="button" onClick={() => setOpen(isOpen ? -1 : i)} aria-expanded={isOpen} className="flex w-full items-start gap-3 p-5 text-left">
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-bold text-navy">{step.skill}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${step.role === "target" ? "bg-orange/10 text-orange" : "bg-surface text-mediumgray"}`}>{step.role === "target" ? "Target skill" : "Prerequisite"}</span>
                        <span className="text-xs text-mediumgray">{step.weeks} wk</span>
                        {sp.verified ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald/10 px-2 py-0.5 text-[10px] font-semibold text-emerald">
                            <BadgeCheck className="h-3 w-3" /> Verified
                          </span>
                        ) : (
                          sp.total > 0 && <span className="text-xs text-mediumgray tabular">{sp.done}/{sp.total} topics</span>
                        )}
                      </span>
                      {step.summary && <span className="mt-1 block text-sm text-mediumgray">{step.summary}</span>}
                    </span>
                    <ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-mediumgray transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>

                  {isOpen && (
                    <div className="space-y-5 border-t border-lightgray px-5 pb-5 pt-4">
                      {step.why_learn && (
                        <section>
                          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-mediumgray"><Lightbulb className="h-3.5 w-3.5" /> Why learn it</h3>
                          <p className="mt-1.5 text-sm text-navy">{step.why_learn}</p>
                          {step.used_in && step.used_in.length > 0 && (
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-mediumgray">
                              {step.used_in.map((u) => <li key={u}>{u}</li>)}
                            </ul>
                          )}
                        </section>
                      )}

                      <section>
                        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-mediumgray"><BookOpen className="h-3.5 w-3.5" /> Topics</h3>
                        <ul className="mt-2 space-y-3">
                          {step.topics.map((t) => {
                            const key = topicKey(step.skill, t.name);
                            const checked = sp.verified || topicsDone.has(key);
                            return (
                            <li key={t.name} className={`rounded-lg border p-3 ${checked ? "border-emerald/30 bg-emerald/[0.03]" : "border-lightgray"}`}>
                              <div className="flex items-start gap-2.5">
                                <button
                                  type="button"
                                  role="checkbox"
                                  aria-checked={checked}
                                  aria-label={`Mark "${t.name}" as ${checked ? "not done" : "done"}`}
                                  title={sp.verified ? "Done — this skill is verified" : undefined}
                                  disabled={sp.verified || saving.has(key)}
                                  onClick={() => toggleTopic(step.skill, t.name)}
                                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors disabled:cursor-default ${
                                    checked ? "border-emerald bg-emerald text-white" : "border-mediumgray/50 bg-white hover:border-slate"
                                  }`}
                                >
                                  {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                                </button>
                                <p className={`text-sm font-semibold ${checked ? "text-mediumgray line-through decoration-mediumgray/40" : "text-navy"}`}>{t.name}</p>
                              </div>
                              <div className="pl-7">
                              {t.why && <p className="mt-0.5 text-xs text-mediumgray">{t.why}</p>}
                              {t.subtopics.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {t.subtopics.map((st) => <span key={st} className="rounded bg-surface px-1.5 py-0.5 text-[11px] text-navy">{st}</span>)}
                                </div>
                              )}
                              {t.practice && t.practice.length > 0 && (
                                <ul className="mt-2 space-y-1">
                                  {t.practice.map((p) => <li key={p} className="flex items-start gap-1.5 text-xs text-navy"><Dumbbell className="mt-0.5 h-3 w-3 shrink-0 text-slate" />{p}</li>)}
                                </ul>
                              )}
                              </div>
                            </li>
                            );
                          })}
                        </ul>
                      </section>

                      {step.project && (
                        <section>
                          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-mediumgray"><Hammer className="h-3.5 w-3.5" /> Project</h3>
                          <p className="mt-1.5 text-sm text-navy">{step.project}</p>
                        </section>
                      )}

                      {step.resources && step.resources.length > 0 && (
                        <section>
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-mediumgray">Suggested resources</h3>
                          <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-sm text-navy">
                            {step.resources.map((r) => <li key={r}>{r}</li>)}
                          </ul>
                          <p className="mt-1 text-[11px] text-mediumgray">AI suggestions without links — look them up before relying on them.</p>
                        </section>
                      )}

                      {step.warnings && step.warnings.length > 0 && (
                        <p className="flex items-start gap-2 text-xs text-amber-700"><TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />{step.warnings.join(" ")}</p>
                      )}

                      <div className="border-t border-lightgray pt-4">
                        {task && task.status !== "succeeded" ? (
                          <TaskStatus task={task} />
                        ) : task?.status === "succeeded" && task.link ? (
                          <Link href={task.link} className="inline-flex items-center gap-1.5 rounded-lg bg-primary-gradient px-4 py-2 text-xs font-semibold text-white shadow-[0_4px_12px_rgba(234,88,12,0.25)]">
                            <ShieldCheck className="h-3.5 w-3.5" /> Your {step.skill} test is ready — start it
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={() => testMe(step.skill)}
                            disabled={starting === step.skill}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-lightgray px-4 py-2 text-xs font-semibold text-navy transition-colors hover:border-slate hover:text-slate disabled:opacity-60"
                          >
                            {starting === step.skill ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                            Done learning? Generate an AI test for {step.skill}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              </li>
            );
          })}
        </ol>
      </DashboardContainer>
    </DashboardShell>
  );
}
