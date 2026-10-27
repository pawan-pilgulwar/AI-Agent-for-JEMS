"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  ChevronDown,
  Circle,
  CircleCheck,
  Clock,
  Hammer,
  LifeBuoy,
  LoaderCircle,
  Lock,
  Map as MapIcon,
  PlayCircle,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Target,
  TriangleAlert,
} from "lucide-react";
import DashboardShell, { DashboardContainer } from "@/components/dashboard/student/DashboardShell";
import { Card, ProgressBar } from "@/components/dashboard/student/ui";
import TaskStatus from "@/components/ai/TaskStatus";
import { LEVEL_LABEL, STYLE_LABEL, type LearningPathDetail as Detail, type PathModuleView } from "@/lib/ai/learning-shared";
import type { AiTaskView } from "@/lib/ai-tasks/types";
import { isActive } from "@/lib/ai-tasks/types";
import { startAiTask, useAiTasks } from "@/lib/ai-tasks/use-tasks";
import LessonPanel from "./LessonPanel";

const fmtDate = (s: string) => new Date(s).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/**
 * A personal learning path on an AI roadmap: modules (roadmap steps) of
 * lessons (topics). Each lesson is a narrated video + quick check, YouTube
 * videos and notes, written for the student; each module ends with a test that
 * unlocks once its lessons are done and verifies the skill when passed.
 */
export default function LearningPathDetail({ detail }: { detail: Detail }) {
  const router = useRouter();
  const firstOpen = Math.max(0, detail.modules.findIndex((m) => !m.verified));
  const [open, setOpen] = useState<number>(firstOpen);
  const [lessonOpen, setLessonOpen] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const { tasks, track } = useAiTasks(["learning.plan", "assessment.generate"], {
    onSettled: () => router.refresh(),
    idlePolling: false,
  });
  const planTask = tasks.find((t) => t.type === "learning.plan" && t.subject === detail.roadmapId) ?? null;
  const testTask = (skill: string): AiTaskView | null =>
    tasks.find((t) => t.type === "assessment.generate" && t.label === `${skill} module test`) ?? null;

  const start = async (key: string, url: string, body: unknown) => {
    setError("");
    setBusy(key);
    try {
      track(await startAiTask(url, body));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start.");
    } finally {
      setBusy(null);
    }
  };
  const plan = () => start("plan", `/api/student/learning/${detail.roadmapId}/plan`, {});
  const takeTest = (skill: string) => start(`test:${skill}`, `/api/student/learning/${detail.roadmapId}/test`, { step: skill });

  const { progress } = detail;
  const planning = planTask && isActive(planTask.status);

  return (
    <DashboardShell>
      <DashboardContainer className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link href="/student/learning" className="inline-flex items-center gap-1 text-sm font-semibold text-slate hover:underline"><ArrowLeft className="h-4 w-4" /> Learning Paths</Link>
          <Link href={`/student/roadmap/${detail.roadmapId}`} className="inline-flex items-center gap-1 text-sm font-semibold text-slate hover:underline"><MapIcon className="h-4 w-4" /> Full roadmap</Link>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-navy">{detail.skill} learning path</h1>
          <p className="mt-1 text-sm text-mediumgray">
            {progress.modules} modules · {progress.lessons} lessons · learning style: {STYLE_LABEL[detail.style]}
            {detail.targetRole ? ` · examples for a ${detail.targetRole}` : ""}
          </p>
        </div>

        <Card className="p-5">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 text-sm">
            <span className="font-semibold text-navy">{progress.percent}% complete</span>
            <span className="text-xs text-mediumgray">
              {progress.lessonsDone} of {progress.lessons} lessons · {progress.modulesPassed} of {progress.modules} module tests passed
            </span>
          </div>
          <ProgressBar value={progress.percent} barClass={progress.percent >= 100 ? "bg-emerald" : "bg-slate"} />
          <p className="mt-2 text-xs text-mediumgray">
            Lessons adapt to you: your quick-check answers set the level of the next ones, and anything you miss is explained again. Each module ends with a test — passing it verifies the skill on your profile.
          </p>
        </Card>

        {/* Personal plan */}
        <Card className="p-5">
          {planning ? (
            <TaskStatus task={planTask} />
          ) : detail.plan ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="flex items-start gap-2 text-sm text-navy">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-orange" />
                <span>
                  Planned for you on {fmtDate(detail.plan.generatedAt)} · about {Math.max(1, Math.round(detail.plan.totalMinutes / 60))} hours of lessons
                  {detail.plan.stale && <span className="mt-1 block text-xs text-amber-700">Your roadmap changed since — re-plan to match it.</span>}
                </span>
              </p>
              <button type="button" onClick={plan} disabled={busy === "plan"} className="inline-flex items-center gap-1.5 rounded-lg border border-lightgray px-3 py-1.5 text-xs font-semibold text-navy hover:border-slate hover:text-slate disabled:opacity-60">
                {busy === "plan" ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />} Re-plan
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="max-w-xl">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-navy"><Sparkles className="h-4 w-4 text-orange" /> Personalise this path</p>
                <p className="mt-1 text-xs text-mediumgray">
                  The learning path agent sets a goal, focus areas and study time for every lesson, based on your level and how you like to learn. You can start lessons right away either way.
                </p>
              </div>
              <button type="button" onClick={plan} disabled={busy === "plan"} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary-gradient px-4 py-2 text-xs font-semibold text-white shadow-[0_4px_12px_rgba(234,88,12,0.25)] disabled:opacity-60">
                {busy === "plan" ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Build my plan
              </button>
            </div>
          )}
          {planTask?.status === "failed" && <TaskStatus task={planTask} className="mt-3" />}
        </Card>

        {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <ol className="relative space-y-4 border-l-2 border-lightgray pl-6">
          {detail.modules.map((m, i) => {
            const isOpen = open === i;
            const lessonsDone = m.lessons.filter((l) => l.done).length;
            return (
              <li key={`${m.skill}-${i}`} className="relative">
                <span className={`absolute -left-[33px] top-4 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ring-4 ring-surface ${m.verified ? "bg-emerald text-white" : m.role === "target" ? "bg-orange text-white" : "bg-navy text-white"}`}>
                  {m.verified ? <BadgeCheck className="h-3.5 w-3.5" /> : m.role === "target" ? <Target className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <Card className="overflow-hidden">
                  <button type="button" onClick={() => setOpen(isOpen ? -1 : i)} aria-expanded={isOpen} className="flex w-full items-start gap-3 p-5 text-left">
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-bold text-navy">{m.skill}</span>
                        <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-semibold text-mediumgray">{LEVEL_LABEL[m.level]}</span>
                        {m.verified ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald/10 px-2 py-0.5 text-[10px] font-semibold text-emerald"><BadgeCheck className="h-3 w-3" /> Complete</span>
                        ) : (
                          <span className="text-xs text-mediumgray tabular">{lessonsDone}/{m.lessons.length} lessons</span>
                        )}
                      </span>
                      <span className="mt-1 block text-sm text-mediumgray">{m.intro || m.summary}</span>
                    </span>
                    <ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-mediumgray transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>

                  {isOpen && (
                    <div className="space-y-4 border-t border-lightgray px-5 pb-5 pt-4">
                      {m.weak.length > 0 && !m.verified && (
                        <p className="flex items-start gap-2 rounded-lg bg-slate/5 px-3 py-2 text-xs text-navy">
                          <LifeBuoy className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate" />
                          Explained again in your lessons and notes: {m.weak.join(", ")}.
                        </p>
                      )}

                      <ul className="space-y-2">
                        {m.lessons.map((l) => {
                          const key = `${m.skill}::${l.topic}`;
                          const active = lessonOpen === key;
                          return (
                            <li key={l.topic} className={`rounded-lg border p-3 ${l.done ? "border-emerald/30 bg-emerald/[0.03]" : "border-lightgray"}`}>
                              <div className="flex flex-wrap items-start gap-2.5">
                                {l.done ? <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald" /> : <Circle className="mt-0.5 h-5 w-5 shrink-0 text-mediumgray/50" />}
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold text-navy">{l.topic}</p>
                                  <p className="mt-0.5 text-xs text-mediumgray">{l.objective || l.why}</p>
                                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-mediumgray">
                                    {l.minutes > 0 && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {l.minutes} min</span>}
                                    {l.focus.length > 0 && <span>Focus: {l.focus.join(", ")}</span>}
                                    {l.check && <span>Quick check {l.check.correct}/{l.check.total}</span>}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setLessonOpen(active ? null : key)}
                                  aria-expanded={active}
                                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-lightgray px-3 py-1.5 text-xs font-semibold text-navy transition-colors hover:border-slate hover:text-slate"
                                >
                                  <PlayCircle className="h-3.5 w-3.5" /> {active ? "Close" : l.done ? "Review" : "Start lesson"}
                                </button>
                              </div>
                              {active && <LessonPanel roadmapId={detail.roadmapId} step={m.skill} lesson={l} onCompleted={() => router.refresh()} />}
                            </li>
                          );
                        })}
                      </ul>

                      {m.project && (
                        <section>
                          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-mediumgray"><Hammer className="h-3.5 w-3.5" /> Module project</h3>
                          <p className="mt-1.5 text-sm text-navy">{m.project}</p>
                        </section>
                      )}

                      <ModuleTest module={m} task={testTask(m.skill)} busy={busy === `test:${m.skill}`} onStart={() => takeTest(m.skill)} />
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

const BTN = "inline-flex items-center gap-1.5 rounded-lg bg-primary-gradient px-4 py-2 text-xs font-semibold text-white shadow-[0_4px_12px_rgba(234,88,12,0.25)] disabled:opacity-60";

/** The end-of-module test, in whichever state it is. */
function ModuleTest({ module: m, task, busy, onStart }: { module: PathModuleView; task: AiTaskView | null; busy: boolean; onStart: () => void }) {
  const { test } = m;
  const paper = test.paper;
  let body: React.ReactNode;

  if (m.verified) {
    body = (
      <p className="flex items-center gap-2 text-sm text-emerald">
        <BadgeCheck className="h-4 w-4" /> Module complete — {m.skill} is verified on your profile.
        {paper?.status === "graded" && <Link href={`/student/assessment/ai/${paper.id}`} className="text-xs font-semibold text-slate hover:underline">See the test</Link>}
      </p>
    );
  } else if (task && isActive(task.status)) {
    body = <TaskStatus task={task} />;
  } else if (paper && (paper.status === "ready" || paper.status === "in-progress")) {
    body = (
      <Link href={`/student/assessment/ai/${paper.id}`} className={BTN}>
        <ShieldCheck className="h-3.5 w-3.5" /> {paper.status === "ready" ? "Your module test is ready — start it" : "Continue your module test"}
      </Link>
    );
  } else if (paper?.status === "submitted") {
    body = (
      <Link href={`/student/assessment/ai/${paper.id}`} className="inline-flex items-center gap-1.5 text-sm text-navy hover:underline">
        <LoaderCircle className="h-4 w-4 animate-spin text-slate" /> Your module test is being graded
      </Link>
    );
  } else if (test.lessonsLeft > 0) {
    body = (
      <p className="flex items-center gap-2 text-sm text-mediumgray">
        <Lock className="h-4 w-4" /> Finish {test.lessonsLeft} more lesson{test.lessonsLeft === 1 ? "" : "s"} to unlock the module test.
      </p>
    );
  } else if (test.lockedUntil) {
    body = (
      <p className="flex items-center gap-2 text-sm text-amber-700">
        <Clock className="h-4 w-4" /> {paper?.percent != null ? `You scored ${paper.percent}%. ` : ""}Re-watch the lessons marked for extra help — you can retake the test after {fmtDate(test.lockedUntil)}.
      </p>
    );
  } else {
    const failed = paper?.status === "graded" && paper.passed === false;
    body = (
      <div className="space-y-2">
        {failed && <p className="flex items-center gap-2 text-xs text-amber-700"><TriangleAlert className="h-3.5 w-3.5" /> Last attempt: {paper?.percent}%. The lessons now explain what you missed.</p>}
        <button type="button" onClick={onStart} disabled={busy} className={BTN}>
          {busy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />} {failed ? "Retake the module test" : "Take the module test"}
        </button>
        {task?.status === "failed" && <TaskStatus task={task} />}
      </div>
    );
  }

  return (
    <section className="border-t border-lightgray pt-4">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-mediumgray"><ShieldCheck className="h-3.5 w-3.5" /> Module test</h3>
      {!m.verified && test.topics.length > 0 && <p className="mt-1 text-xs text-mediumgray">Covers {test.topics.join(", ")}. Score 70% or more to verify {m.skill}.</p>}
      <div className="mt-2.5">{body}</div>
    </section>
  );
}
