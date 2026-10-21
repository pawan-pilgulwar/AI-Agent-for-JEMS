"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Award,
  BookOpen,
  ChevronDown,
  Circle,
  CircleCheck,
  Clock,
  Code,
  FileText,
  Lock,
  Pencil,
  Play,
  Sparkles,
  Target,
  TrendingUp,
  Video,
} from "lucide-react";
import DashboardShell, { DashboardContainer } from "@/components/dashboard/student/DashboardShell";
import { Card, ProgressBar } from "@/components/dashboard/student/ui";
import type { RoadmapProgress, StudentGoals } from "@/lib/db/roadmap";
import { type CareerRoadmap, type Module, allModules } from "@/lib/roadmap/data";

const GENERATION_STEPS = [
  { label: "Analyzing your skill level", threshold: 20 },
  { label: "Mapping career requirements", threshold: 40 },
  { label: "Curating learning resources", threshold: 60 },
  { label: "Structuring milestone timeline", threshold: 80 },
  { label: "Finalizing your roadmap", threshold: 96 },
];

const DIFFICULTY_STYLE: Record<Module["difficulty"], string> = {
  Beginner: "bg-emerald/10 text-emerald",
  Intermediate: "bg-gold/15 text-amber-700",
  Advanced: "bg-red-50 text-red-600",
};

const RESOURCE_ICON = { video: Video, article: FileText, project: Code } as const;

/**
 * One-time "generating your roadmap" screen shown right after the student
 * saves their goals. Purely visual — the roadmap is static data — but it makes
 * the personalisation step feel deliberate.
 */
function Generating({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(t);
          setTimeout(onDone, 400);
          return 100;
        }
        return p + 3;
      });
    }, 50);
    return () => clearInterval(t);
  }, [onDone]);

  return (
    <Card className="mx-auto w-full max-w-md p-8 text-center">
      <span className="mx-auto flex h-16 w-16 animate-pulse items-center justify-center rounded-2xl bg-slate/10 text-slate">
        <Sparkles className="h-8 w-8" />
      </span>
      <h1 className="mt-6 text-xl font-bold text-navy">Generating your roadmap</h1>
      <p className="mt-1 text-sm text-mediumgray">Personalising your learning path to your goals…</p>
      <div className="mt-6">
        <div className="mb-1 flex justify-between text-xs text-mediumgray">
          <span>Progress</span>
          <span className="font-semibold text-slate">{progress}%</span>
        </div>
        <ProgressBar value={progress} />
      </div>
      <ul className="mt-5 space-y-1.5 text-left">
        {GENERATION_STEPS.map((s) => {
          const done = progress > s.threshold;
          return (
            <li key={s.label} className="flex items-center gap-3 rounded-lg bg-surface px-3 py-2 text-sm">
              {done ? (
                <CircleCheck className="h-4 w-4 shrink-0 text-emerald" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-mediumgray/50" />
              )}
              <span className={done ? "text-navy" : "text-mediumgray"}>{s.label}</span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function ModuleCard({
  mod,
  done,
  locked,
  hasSkill,
  defaultOpen,
}: {
  mod: Module;
  done: boolean;
  locked: boolean;
  hasSkill: (s: string) => boolean;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = `module-${mod.id}-panel`;

  return (
    <Card className={`overflow-hidden ${done ? "border-emerald/30" : ""}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-surface-2"
      >
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            done ? "bg-emerald/10 text-emerald" : locked ? "bg-surface text-mediumgray" : "bg-slate/10 text-slate"
          }`}
        >
          {done ? <CircleCheck className="h-5 w-5" /> : locked ? <Lock className="h-4 w-4" /> : <BookOpen className="h-5 w-5" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-navy">{mod.title}</span>
            {done ? (
              <span className="rounded-full bg-emerald/10 px-2 py-0.5 text-[11px] font-semibold text-emerald">Completed</span>
            ) : (
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${DIFFICULTY_STYLE[mod.difficulty]}`}>
                {mod.difficulty}
              </span>
            )}
          </span>
          <span className="mt-0.5 flex items-center gap-3 text-xs text-mediumgray">
            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{mod.duration}</span>
            <span className="inline-flex items-center gap-1"><Award className="h-3 w-3" />{mod.skills.length} skills</span>
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-mediumgray transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div id={panelId} className="space-y-5 border-t border-lightgray px-5 pb-5 pt-4">
          <div>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-navy">
              <Target className="h-4 w-4 text-slate" /> Topics covered
            </h4>
            <div className="flex flex-wrap gap-2">
              {mod.topics.map((t) => (
                <span key={t} className="rounded-md border border-lightgray bg-white px-2 py-0.5 text-xs text-navy">{t}</span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-navy">
              <BookOpen className="h-4 w-4 text-slate" /> Learning resources
            </h4>
            <ul className="space-y-2">
              {mod.resources.map((r, i) => {
                const Icon = RESOURCE_ICON[r.type];
                return (
                  <li key={i} className="flex items-center gap-3 rounded-lg bg-surface-2 p-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-lightgray bg-white text-mediumgray">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-navy">{r.title}</span>
                      {r.duration && <span className="text-xs text-mediumgray">{r.duration}</span>}
                    </span>
                    <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-mediumgray">
                      {r.type}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-navy">
              <Award className="h-4 w-4 text-slate" /> Skills you&apos;ll gain
            </h4>
            <div className="flex flex-wrap gap-2">
              {mod.skills.map((s) =>
                hasSkill(s) ? (
                  <span key={s} className="inline-flex items-center gap-1 rounded-md bg-emerald/10 px-2 py-0.5 text-xs font-medium text-emerald">
                    <CircleCheck className="h-3 w-3" />{s}
                  </span>
                ) : (
                  <span key={s} className="rounded-md bg-navy px-2 py-0.5 text-xs font-medium text-white">{s}</span>
                ),
              )}
            </div>
          </div>

          {locked ? (
            <p className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-lightgray py-3 text-xs text-mediumgray">
              <Lock className="h-3.5 w-3.5" /> Pass the previous module&apos;s quiz to unlock
            </p>
          ) : (
            <Link
              href={`/student/roadmap/${mod.id}`}
              className={`flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-transform hover:-translate-y-0.5 ${
                done
                  ? "border border-lightgray bg-white text-navy hover:border-slate hover:text-slate"
                  : "bg-primary-gradient text-white shadow-[0_4px_12px_rgba(234,88,12,0.25)]"
              }`}
            >
              <Play className="h-4 w-4" />
              {done ? "Review module" : "Start this module"}
            </Link>
          )}
        </div>
      )}
    </Card>
  );
}

export default function Roadmap({
  roadmap,
  goals,
  progress,
  skills,
  fresh,
}: {
  roadmap: CareerRoadmap;
  goals: StudentGoals;
  progress: RoadmapProgress;
  skills: string[];
  fresh: boolean;
}) {
  const router = useRouter();
  const [generating, setGenerating] = useState(fresh);

  const modules = allModules(roadmap);
  const passed = new Set(progress.passedModules);
  const completedCount = modules.filter((m) => passed.has(m.id)).length;
  const pct = modules.length ? Math.round((completedCount / modules.length) * 100) : 0;
  // The first not-yet-passed module in order is the one to continue with.
  const current = modules.find((m) => !passed.has(m.id)) ?? modules[modules.length - 1];
  const currentIdx = modules.findIndex((m) => m.id === current.id);
  const owned = new Set(skills.map((s) => s.toLowerCase()));
  const hasSkill = (s: string) => owned.has(s.toLowerCase());

  if (generating) {
    return (
      <DashboardShell>
        <DashboardContainer className="flex min-h-[60vh] items-center justify-center">
          <Generating
            onDone={() => {
              setGenerating(false);
              // Drop ?fresh=1 so a reload doesn't replay the animation.
              router.replace("/student/roadmap");
            }}
          />
        </DashboardContainer>
      </DashboardShell>
    );
  }

  const stats = [
    { icon: Target, label: "Duration", value: roadmap.estimatedDuration },
    { icon: Clock, label: "Phases", value: `${roadmap.phases.length} phases` },
    { icon: BookOpen, label: "Modules", value: `${modules.length} modules` },
    { icon: TrendingUp, label: "Progress", value: `${pct}% done` },
  ];

  return (
    <DashboardShell>
      <DashboardContainer className="space-y-6">
        {/* Hero */}
        <Card className="p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate/10 px-2.5 py-1 text-xs font-semibold text-slate">
                  <Sparkles className="h-3.5 w-3.5" /> Personalized
                </span>
                {goals.targetCompany && (
                  <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-navy">
                    Target: {goals.targetCompany}
                  </span>
                )}
                {goals.targetPackage && (
                  <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-navy">
                    {goals.targetPackage} LPA
                  </span>
                )}
              </div>
              <h1 className="mt-3 text-2xl font-bold text-navy">{roadmap.title}</h1>
              <p className="mt-1 text-sm text-mediumgray">
                Your step-by-step path to becoming a {roadmap.targetRole}.
              </p>
              <Link
                href="/student/roadmap/goals"
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-mediumgray transition-colors hover:text-slate"
              >
                <Pencil className="h-3 w-3" /> Change career path or goals
              </Link>
            </div>
            <Link
              href={`/student/roadmap/${current.id}`}
              className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-lg bg-primary-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(234,88,12,0.25)] transition-transform hover:-translate-y-0.5"
            >
              <Play className="h-4 w-4" />
              {completedCount === 0 ? "Start learning" : pct === 100 ? "Review roadmap" : "Continue learning"}
            </Link>
          </div>

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

          <div className="mt-5">
            <div className="mb-1 flex justify-between text-xs text-mediumgray">
              <span>{completedCount} of {modules.length} modules passed</span>
              <span>{pct}%</span>
            </div>
            <ProgressBar value={pct} barClass={pct === 100 ? "bg-emerald" : "bg-slate"} />
          </div>
        </Card>

        {/* Phases timeline */}
        <div className="space-y-10">
          {roadmap.phases.map((phase, phaseIdx) => {
            const phaseDone = phase.modules.every((m) => passed.has(m.id));
            const phaseActive = !phaseDone && phase.modules.some((m) => m.id === current.id);
            return (
              <section key={phase.id} className="relative">
                <div className="mb-4 flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-bold ${
                        phaseDone
                          ? "bg-emerald text-white"
                          : phaseActive
                            ? "bg-primary-gradient text-white shadow-[0_4px_12px_rgba(234,88,12,0.3)]"
                            : "border border-lightgray bg-white text-mediumgray"
                      }`}
                    >
                      {phaseDone ? <CircleCheck className="h-5 w-5" /> : phaseIdx + 1}
                    </span>
                  </div>
                  <div className="pt-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-navy">{phase.title}</h2>
                      {phaseActive && (
                        <span className="rounded-full bg-slate/10 px-2 py-0.5 text-[11px] font-semibold text-slate">
                          {phaseIdx === 0 && completedCount === 0 ? "Start here" : "In progress"}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-4 text-xs text-mediumgray">
                      <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{phase.duration}</span>
                      <span className="inline-flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" />{phase.modules.length} modules</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 border-l border-lightgray pl-6 sm:ml-[22px] sm:pl-9">
                  {phase.modules.map((mod) => {
                    const idx = modules.findIndex((m) => m.id === mod.id);
                    return (
                      <ModuleCard
                        key={mod.id}
                        mod={mod}
                        done={passed.has(mod.id)}
                        locked={idx > currentIdx}
                        hasSkill={hasSkill}
                        defaultOpen={mod.id === current.id}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        {/* Footer CTA */}
        <Card className="p-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate/10 text-slate">
            <Award className="h-7 w-7" />
          </span>
          <h2 className="mt-4 text-lg font-bold text-navy">
            {pct === 100 ? "Roadmap complete — well done!" : "Ready to keep going?"}
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-mediumgray">
            {pct === 100
              ? `You've passed every module on the ${roadmap.targetRole} path. Head to Job Matches to put it to work.`
              : `Follow this roadmap consistently and you'll be job-ready in ${roadmap.estimatedDuration}.`}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {pct === 100 ? (
              <Link
                href="/student/jobs"
                className="inline-flex items-center gap-2 rounded-lg bg-primary-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(234,88,12,0.25)] transition-transform hover:-translate-y-0.5"
              >
                <Target className="h-4 w-4" /> View job matches
              </Link>
            ) : (
              <Link
                href={`/student/roadmap/${current.id}`}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(234,88,12,0.25)] transition-transform hover:-translate-y-0.5"
              >
                <Play className="h-4 w-4" /> {completedCount === 0 ? "Begin learning" : "Continue learning"}
              </Link>
            )}
            <Link
              href="/student/progress"
              className="inline-flex items-center gap-2 rounded-lg border border-lightgray bg-white px-5 py-2.5 text-sm font-semibold text-navy transition-colors hover:border-slate hover:text-slate"
            >
              <TrendingUp className="h-4 w-4" /> My progress
            </Link>
          </div>
        </Card>
      </DashboardContainer>
    </DashboardShell>
  );
}
