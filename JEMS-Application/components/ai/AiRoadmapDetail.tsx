"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Award,
  BadgeCheck,
  BookOpen,
  Check,
  ChevronDown,
  CircleCheck,
  Clock,
  Dumbbell,
  GraduationCap,
  Hammer,
  Lightbulb,
  LoaderCircle,
  Play,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";
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

  const stats = [
    { icon: Target, label: "Duration", value: `~${roadmap.totalWeeks} weeks` },
    { icon: Clock, label: "Milestones", value: `${steps.length} steps` },
    { icon: BookOpen, label: "Topics", value: `${overall.total} topics` },
    { icon: TrendingUp, label: "Progress", value: `${overall.percent}% done` },
  ];

  return (
    <DashboardShell>
      <DashboardContainer className="mx-auto max-w-4xl space-y-6">
        {/* Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link href="/student/roadmap" className="inline-flex items-center gap-1 text-sm font-semibold text-slate hover:underline">
            <ArrowLeft className="h-4 w-4" /> All Roadmaps
          </Link>
          <Link href={`/student/learning/${roadmap.id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate hover:underline">
            <GraduationCap className="h-4 w-4" /> Interactive Lessons &amp; Quizzes
          </Link>
        </div>

        {/* Hero Card styled like /roadmap */}
        <Card className="p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate/10 px-2.5 py-1 text-xs font-semibold text-slate">
                  <Sparkles className="h-3.5 w-3.5" /> Personalized AI Roadmap
                </span>
                <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-navy">
                  Target: {roadmap.skill}
                </span>
              </div>
              <h1 className="mt-3 text-2xl font-bold text-navy">{roadmap.skill} Roadmap</h1>
              <p className="mt-1 text-sm text-mediumgray">
                Your personalized step-by-step syllabus to master {roadmap.skill}. Complete topics, practice hands-on, and verify your skills with tests.
              </p>
              {roadmap.knownSkills.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-mediumgray">
                  <BadgeCheck className="h-3.5 w-3.5 text-emerald" /> Skipped because you&apos;ve verified them:
                  {roadmap.knownSkills.map((k) => (
                    <span key={k} className="rounded bg-emerald/10 px-1.5 py-0.5 font-medium text-emerald">
                      {k}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <Link
              href={`/student/learning/${roadmap.id}`}
              className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-lg bg-primary-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(234,88,12,0.25)] transition-transform hover:-translate-y-0.5"
            >
              <Play className="h-4 w-4" />
              {overall.percent === 0 ? "Start learning path" : overall.percent >= 100 ? "Review learning path" : "Continue learning"}
            </Link>
          </div>

          {/* 4 Stats Grid */}
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="flex items-center gap-3 rounded-xl border border-lightgray bg-surface-2 p-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate/10 text-slate">
                  <s.icon className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-xs text-mediumgray">{s.label}</span>
                  <span className="block text-sm font-semibold text-navy">{s.value}</span>
                </span>
              </div>
            ))}
          </div>

          {/* Progress Bar */}
          <div className="mt-5">
            <div className="mb-1 flex justify-between text-xs text-mediumgray">
              <span>{overall.done} of {overall.total} topics completed · {overall.verifiedSteps} of {steps.length} skills verified</span>
              <span className="font-semibold text-slate">{overall.percent}%</span>
            </div>
            <ProgressBar value={overall.percent} barClass={overall.percent >= 100 ? "bg-emerald" : "bg-slate"} />
          </div>
        </Card>

        {testError && <p className="text-sm text-red-600">{testError}</p>}
        {progressError && <p className="text-sm text-red-600">{progressError}</p>}

        {/* Milestones Timeline */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-navy">Syllabus Milestones</h2>
            <span className="text-xs text-mediumgray">{steps.length} milestone steps</span>
          </div>

          <ol className="relative space-y-4 border-l-2 border-lightgray pl-6 ml-3">
            {steps.map((step, i) => {
              const isOpen = open === i;
              const task: AiTaskView | null = latestFor(step.skill, "assessment.generate");
              const sp = stepProgress(step, topicsDone, verified);
              const isDone = sp.verified || (sp.done === sp.total && sp.total > 0);

              return (
                <li key={`${step.skill}-${i}`} className="relative">
                  <span
                    className={`absolute -left-[35px] top-4 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ring-4 ring-surface ${
                      isDone
                        ? "bg-emerald text-white"
                        : step.role === "target"
                          ? "bg-primary-gradient text-white shadow-[0_4px_12px_rgba(234,88,12,0.3)]"
                          : "bg-navy text-white"
                    }`}
                  >
                    {isDone ? <CircleCheck className="h-4 w-4" /> : step.role === "target" ? <Target className="h-4 w-4" /> : i + 1}
                  </span>

                  <Card className="overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? -1 : i)}
                      aria-expanded={isOpen}
                      className="flex w-full items-start gap-3 p-5 text-left"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-bold text-navy">{step.skill}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              step.role === "target" ? "bg-orange/10 text-orange" : "bg-surface text-mediumgray"
                            }`}
                          >
                            {step.role === "target" ? "Target skill" : "Prerequisite"}
                          </span>
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
                      <ChevronDown
                        className={`mt-1 h-4 w-4 shrink-0 text-mediumgray transition-transform ${isOpen ? "rotate-180" : ""}`}
                      />
                    </button>

                    {isOpen && (
                      <div className="space-y-5 border-t border-lightgray px-5 pb-5 pt-4">
                        {step.why_learn && (
                          <section>
                            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-mediumgray">
                              <Lightbulb className="h-3.5 w-3.5" /> Why learn it
                            </h3>
                            <p className="mt-1.5 text-sm text-navy">{step.why_learn}</p>
                            {step.used_in && step.used_in.length > 0 && (
                              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-mediumgray">
                                {step.used_in.map((u) => (
                                  <li key={u}>{u}</li>
                                ))}
                              </ul>
                            )}
                          </section>
                        )}

                        <section>
                          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-mediumgray">
                            <BookOpen className="h-3.5 w-3.5" /> Topics &amp; Practice Checklist
                          </h3>
                          <ul className="mt-2 space-y-3">
                            {step.topics.map((t) => {
                              const key = topicKey(step.skill, t.name);
                              const checked = sp.verified || topicsDone.has(key);
                              return (
                                <li
                                  key={t.name}
                                  className={`rounded-lg border p-3 transition-colors ${
                                    checked ? "border-emerald/30 bg-emerald/[0.03]" : "border-lightgray bg-white"
                                  }`}
                                >
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
                                        checked
                                          ? "border-emerald bg-emerald text-white"
                                          : "border-mediumgray/50 bg-white hover:border-slate"
                                      }`}
                                    >
                                      {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                                    </button>
                                    <p
                                      className={`text-sm font-semibold ${
                                        checked ? "text-mediumgray line-through decoration-mediumgray/40" : "text-navy"
                                      }`}
                                    >
                                      {t.name}
                                    </p>
                                  </div>
                                  <div className="pl-7">
                                    {t.why && <p className="mt-0.5 text-xs text-mediumgray">{t.why}</p>}
                                    {t.subtopics.length > 0 && (
                                      <div className="mt-2 flex flex-wrap gap-1">
                                        {t.subtopics.map((st) => (
                                          <span key={st} className="rounded bg-surface px-1.5 py-0.5 text-[11px] text-navy">
                                            {st}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                    {t.practice && t.practice.length > 0 && (
                                      <ul className="mt-2 space-y-1">
                                        {t.practice.map((p) => (
                                          <li key={p} className="flex items-start gap-1.5 text-xs text-navy">
                                            <Dumbbell className="mt-0.5 h-3 w-3 shrink-0 text-slate" />
                                            {p}
                                          </li>
                                        ))}
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
                            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-mediumgray">
                              <Hammer className="h-3.5 w-3.5" /> Hands-on Project
                            </h3>
                            <p className="mt-1.5 text-sm text-navy">{step.project}</p>
                          </section>
                        )}

                        {step.resources && step.resources.length > 0 && (
                          <section>
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-mediumgray">
                              Suggested Resources
                            </h3>
                            <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-sm text-navy">
                              {step.resources.map((r) => (
                                <li key={r}>{r}</li>
                              ))}
                            </ul>
                            <p className="mt-1 text-[11px] text-mediumgray">
                              Curated resources to accelerate your mastery of this step.
                            </p>
                          </section>
                        )}

                        {step.warnings && step.warnings.length > 0 && (
                          <p className="flex items-start gap-2 text-xs text-amber-700">
                            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            {step.warnings.join(" ")}
                          </p>
                        )}

                        {/* Step actions */}
                        <div className="flex flex-wrap items-center gap-3 border-t border-lightgray pt-4">
                          {task && task.status !== "succeeded" ? (
                            <TaskStatus task={task} />
                          ) : task?.status === "succeeded" && task.link ? (
                            <Link
                              href={task.link}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-gradient px-4 py-2 text-xs font-semibold text-white shadow-[0_4px_12px_rgba(234,88,12,0.25)]"
                            >
                              <ShieldCheck className="h-3.5 w-3.5" /> Your {step.skill} test is ready — start it
                            </Link>
                          ) : (
                            <button
                              type="button"
                              onClick={() => testMe(step.skill)}
                              disabled={starting === step.skill}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-lightgray px-4 py-2 text-xs font-semibold text-navy transition-colors hover:border-slate hover:text-slate disabled:opacity-60"
                            >
                              {starting === step.skill ? (
                                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <ShieldCheck className="h-3.5 w-3.5" />
                              )}
                              Done learning? Generate an AI test for {step.skill}
                            </button>
                          )}

                          <Link
                            href={`/student/learning/${roadmap.id}`}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-surface px-4 py-2 text-xs font-semibold text-navy transition-colors hover:bg-lightgray/50"
                          >
                            <GraduationCap className="h-3.5 w-3.5 text-slate" />
                            Study in Learning Path
                          </Link>
                        </div>
                      </div>
                    )}
                  </Card>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Footer CTA styled like /roadmap */}
        <Card className="p-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate/10 text-slate">
            <Award className="h-7 w-7" />
          </span>
          <h2 className="mt-4 text-lg font-bold text-navy">
            {overall.percent === 100 ? "Roadmap completed — Outstanding!" : "Ready to master this skill?"}
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-mediumgray">
            {overall.percent === 100
              ? `You've completed all topics for ${roadmap.skill}. Head to Assessments to verify your skills or check Job Matches.`
              : `Follow this syllabus step-by-step. Interactive video lessons, study notes and module tests are waiting in your learning path.`}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href={`/student/learning/${roadmap.id}`}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(234,88,12,0.25)] transition-transform hover:-translate-y-0.5"
            >
              <Play className="h-4 w-4" /> Open Learning Path
            </Link>
            <Link
              href="/student/roadmap"
              className="inline-flex items-center gap-2 rounded-lg border border-lightgray bg-white px-5 py-2.5 text-sm font-semibold text-navy transition-colors hover:border-slate hover:text-slate"
            >
              <ArrowLeft className="h-4 w-4" /> All Roadmaps
            </Link>
          </div>
        </Card>
      </DashboardContainer>
    </DashboardShell>
  );
}
