"use client";

import { useState } from "react";
import Link from "next/link";
import {
  type LucideIcon,
  Boxes,
  Braces,
  Clock,
  Code2,
  Layers,
  Network,
  Play,
  Sparkles,
} from "lucide-react";
import DashboardShell, { DashboardContainer } from "@/components/dashboard/student/DashboardShell";
import { Card, EmptyState, ProgressBar } from "@/components/dashboard/student/ui";
import type { LearningPathView, LearningStatus } from "@/lib/db/student-data";

type Status = LearningStatus;

/** Maps a stored path category to a glyph (icons can't be serialized from DB). */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "AI Roadmap": Sparkles,
  "Web Development": Layers,
  Frameworks: Boxes,
  Languages: Braces,
  Architecture: Network,
  Fundamentals: Code2,
  Styling: Sparkles,
};
const iconFor = (category: string): LucideIcon =>
  CATEGORY_ICONS[category] ?? Layers;

const FILTERS: { key: "all" | Status; label: string }[] = [
  { key: "all", label: "All" },
  { key: "in-progress", label: "In Progress" },
  { key: "recommended", label: "Recommended" },
  { key: "completed", label: "Completed" },
];

function ctaLabel(p: number) {
  if (p >= 100) return "Review";
  if (p > 0) return "Continue";
  return "Start";
}

/** A roadmap path counts topics; the other paths count lessons. */
const unit = (p: LearningPathView) => (p.source === "roadmap" ? "topics" : "lessons");

const CTA_CLASS =
  "mt-5 block w-full rounded-lg border border-lightgray py-2.5 text-center text-sm font-semibold text-navy transition-colors hover:border-slate hover:text-slate";

export default function LearningPaths({ paths }: { paths: LearningPathView[] }) {
  const [filter, setFilter] = useState<"all" | Status>("all");
  const visible = paths.filter((p) => filter === "all" || p.status === filter);
  // Feature the path the student is furthest along but hasn't finished.
  const featured =
    paths.find((p) => p.status === "in-progress") ??
    paths.find((p) => p.status === "recommended");

  if (paths.length === 0) {
    return (
      <DashboardShell>
        <DashboardContainer className="space-y-6">
          <EmptyState
            icon={Layers}
            title="No learning paths yet"
            hint="Generate an AI roadmap for a skill you want to learn and it becomes a learning path here. Tick off topics as you go."
            ctaLabel="Generate an AI roadmap"
            ctaHref="/student/roadmap/ai"
          />
        </DashboardContainer>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <DashboardContainer className="space-y-6">
        {/* Continue learning */}
        {featured && (
          <Card className="overflow-hidden">
            <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate/10 px-2.5 py-1 text-xs font-semibold text-slate">
                  <Play className="h-3.5 w-3.5" /> Continue learning
                </span>
                <h2 className="mt-3 break-words text-lg font-bold text-navy">{featured.title} Path</h2>
                <p className="mt-1 text-sm text-mediumgray">
                  {featured.category} · {featured.lessons} {unit(featured)}
                </p>
                <div className="mt-4 max-w-md">
                  <div className="mb-1 flex justify-between gap-3 text-xs text-mediumgray">
                    <span>{featured.progress}% complete</span>
                    <span>{featured.lessons - Math.round((featured.progress / 100) * featured.lessons)} {unit(featured)} left</span>
                  </div>
                  <ProgressBar value={featured.progress} />
                </div>
              </div>
              {featured.href && (
                <Link
                  href={featured.href}
                  className="shrink-0 rounded-lg bg-primary-gradient px-5 py-2.5 text-center text-sm font-semibold text-white shadow-[0_4px_12px_rgba(234,88,12,0.25)] transition-transform hover:-translate-y-0.5 sm:self-auto"
                >
                  {featured.progress > 0 ? "Resume path" : "Start path"}
                </Link>
              )}
            </div>
          </Card>
        )}

        {/* Filters */}
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                filter === f.key
                  ? "bg-navy text-white"
                  : "border border-lightgray bg-white text-mediumgray hover:text-navy"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Paths grid */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((p) => {
            const Icon = iconFor(p.category);
            const done = p.progress >= 100;
            return (
              <Card key={p.id} className="flex flex-col p-5">
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate/10 text-slate">
                    <Icon className="h-5 w-5" />
                  </span>
                  {done && (
                    <span className="rounded-full bg-emerald/10 px-2.5 py-1 text-xs font-semibold text-emerald">
                      Completed
                    </span>
                  )}
                </div>
                <h3 className="mt-4 break-words text-base font-bold text-navy">{p.title}</h3>
                <p className="text-xs text-mediumgray">{p.category}</p>

                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-mediumgray">
                  <span className="rounded-md bg-surface px-2 py-0.5 font-medium text-navy">{p.level}</span>
                  <span>{p.lessons} {unit(p)}</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {p.hours}h
                  </span>
                </div>

                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-xs text-mediumgray">
                    <span>Progress</span>
                    <span>{p.progress}%</span>
                  </div>
                  <ProgressBar value={p.progress} barClass={done ? "bg-emerald" : "bg-slate"} />
                </div>

                <div className="mt-auto">
                  {p.href ? (
                    <Link href={p.href} className={CTA_CLASS}>
                      {ctaLabel(p.progress)}
                    </Link>
                  ) : (
                    <button type="button" className={CTA_CLASS}>
                      {ctaLabel(p.progress)}
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </DashboardContainer>
    </DashboardShell>
  );
}
