"use client";

import type { StudentMetrics } from "../types";
import ProgressRing from "./ProgressRing";

interface StudentHeroProps {
  studentName?: string;
  readinessPercentage?: number;
  studentMetrics?: StudentMetrics;
  onNavigate?: (href: string) => void;
  /** Opens the full student dashboard. */
  onGoToDashboard?: () => void;
}

interface ActionCard {
  icon: string;
  title: string;
  description: string;
  cta: string;
  href: string;
  meta?: string;
  badge?: string;
}

/** Compact dashboard-style hero for an authenticated student. */
export default function StudentHero({
  studentName,
  readinessPercentage = 45,
  studentMetrics,
  onNavigate,
  onGoToDashboard,
}: StudentHeroProps) {
  const m: Required<StudentMetrics> = {
    resumeStepsComplete: studentMetrics?.resumeStepsComplete ?? 2,
    resumeStepsTotal: studentMetrics?.resumeStepsTotal ?? 5,
    interviewsDone: studentMetrics?.interviewsDone ?? 2,
    interviewsTotal: studentMetrics?.interviewsTotal ?? 10,
    newJobMatches: studentMetrics?.newJobMatches ?? 5,
  };

  const cards: ActionCard[] = [
    {
      icon: "📄",
      title: "Complete Your Resume",
      description: "Add experience to increase ATS score",
      cta: "Build Resume",
      href: "/resume-builder",
      meta: `${m.resumeStepsComplete}/${m.resumeStepsTotal} steps complete`,
    },
    {
      icon: "🎤",
      title: "Take Mock Interview",
      description: "Practice for upcoming interviews",
      cta: "Take Interview",
      href: "/mock-interviews",
      meta: `${m.interviewsDone}/${m.interviewsTotal} interviews done`,
    },
    {
      icon: "🎯",
      title: "View Job Matches",
      description: `${m.newJobMatches} new matches available`,
      cta: "View Jobs",
      href: "/job-matches",
      badge: "🔥 NEW",
    },
  ];

  return (
    <section className="bg-transparent">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-center sm:text-left">
            <h1 className="text-2xl font-bold text-navy sm:text-3xl">
              Welcome, {studentName || "there"}! 👋
            </h1>
            <p className="mt-2 text-lg text-mediumgray">
              You&apos;re{" "}
              <span className="font-bold text-slate">
                {readinessPercentage}%
              </span>{" "}
              of the way to job-ready
            </p>
            <button
              type="button"
              onClick={onGoToDashboard}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-cta-gradient px-6 py-3 text-sm font-semibold text-white shadow-[var(--shadow-cta)] transition-transform hover:scale-[1.03]"
            >
              Go to Dashboard
              <span aria-hidden="true">→</span>
            </button>
          </div>
          <ProgressRing percentage={readinessPercentage} />
        </div>

        <div className="mt-10">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-mediumgray">
            Next steps
          </h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {cards.map((card) => (
              <div
                key={card.title}
                className="relative flex flex-col rounded-2xl border border-lightgray bg-white p-6 shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-card)]"
              >
                {card.badge && (
                  <span className="absolute right-4 top-4 rounded-full bg-orange/10 px-2.5 py-1 text-xs font-bold text-orange">
                    {card.badge}
                  </span>
                )}
                <span className="text-3xl">{card.icon}</span>
                <h3 className="mt-4 text-lg font-bold text-navy">
                  {card.title}
                </h3>
                <p className="mt-1 text-sm text-mediumgray">
                  {card.description}
                </p>
                {card.meta && (
                  <p className="mt-3 text-xs font-medium text-slate">
                    {card.meta}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => onNavigate?.(card.href)}
                  className="mt-5 w-full rounded-full bg-primary-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-primary)] transition-transform hover:scale-[1.02]"
                >
                  {card.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
