"use client";

import type { CompanyMetrics } from "../types";

interface CompanyHeroProps {
  companyName?: string;
  companyMetrics?: CompanyMetrics;
  onNavigate?: (href: string) => void;
}

/** Compact dashboard-style hero for an authenticated company. */
export default function CompanyHero({
  companyName,
  companyMetrics,
  onNavigate,
}: CompanyHeroProps) {
  const m: Required<CompanyMetrics> = {
    activeCandidates: companyMetrics?.activeCandidates ?? 23,
    candidatesTrend: companyMetrics?.candidatesTrend ?? "↑ 5 this week",
    openJobs: companyMetrics?.openJobs ?? 3,
    jobsStatus: companyMetrics?.jobsStatus ?? "2 have matches",
    interviewsScheduled: companyMetrics?.interviewsScheduled ?? 8,
    nextInterview: companyMetrics?.nextInterview ?? "Next: Friday 2PM",
    recentActivity: companyMetrics?.recentActivity ?? [
      { name: "Priya Sharma", role: "Frontend Engineer", time: "2h ago" },
      { name: "Marcus Lee", role: "Data Analyst", time: "5h ago" },
      { name: "Aisha Khan", role: "Product Designer", time: "1d ago" },
    ],
  };

  const metrics = [
    {
      icon: "👥",
      number: m.activeCandidates,
      label: "Active Candidates",
      detail: m.candidatesTrend,
      detailClass: "text-emerald",
    },
    {
      icon: "📝",
      number: m.openJobs,
      label: "Open Jobs",
      detail: m.jobsStatus,
      detailClass: "text-slate",
    },
    {
      icon: "✅",
      number: m.interviewsScheduled,
      label: "Interviews Scheduled",
      detail: m.nextInterview,
      detailClass: "text-mediumgray",
    },
  ];

  return (
    <section className="bg-transparent">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <h1 className="text-2xl font-bold text-navy sm:text-3xl">
          Welcome back, {companyName || "there"}! 👋
        </h1>

        {/* Key metrics */}
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="flex flex-col rounded-2xl border border-lightgray bg-white p-6 shadow-[var(--shadow-soft)]"
            >
              <span className="text-2xl">{metric.icon}</span>
              <span className="mt-3 text-4xl font-extrabold text-navy">
                {metric.number}
              </span>
              <span className="mt-1 text-sm font-medium text-mediumgray">
                {metric.label}
              </span>
              <span
                className={`mt-2 text-xs font-semibold ${metric.detailClass}`}
              >
                {metric.detail}
              </span>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={() => onNavigate?.("/post-job")}
            className="rounded-full bg-primary-gradient px-6 py-3 text-sm font-semibold text-white shadow-[var(--shadow-primary)] transition-transform hover:scale-[1.02]"
          >
            Post New Job
          </button>
          <button
            type="button"
            onClick={() => onNavigate?.("/browse-talent")}
            className="rounded-full border border-slate bg-white px-6 py-3 text-sm font-semibold text-slate transition-colors hover:bg-slate/5"
          >
            Browse Talent
          </button>
          <button
            type="button"
            onClick={() => onNavigate?.("/interview-schedule")}
            className="rounded-full border border-lightgray bg-white px-6 py-3 text-sm font-semibold text-navy transition-colors hover:bg-surface-2"
          >
            Schedule Interview
          </button>
        </div>

        {/* Recent activity */}
        <div className="mt-8 rounded-2xl border border-lightgray bg-white p-6 shadow-[var(--shadow-soft)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-navy">Recent Activity</h2>
            <button
              type="button"
              onClick={() => onNavigate?.("/company-applications")}
              className="text-sm font-semibold text-slate hover:underline"
            >
              View All
            </button>
          </div>
          <ul className="divide-y divide-lightgray">
            {m.recentActivity.map((item, i) => (
              <li
                key={`${item.name}-${i}`}
                className="flex items-center justify-between py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate/10 text-sm font-semibold text-slate">
                    {item.name.charAt(0)}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-navy">
                      {item.name}
                    </p>
                    <p className="text-xs text-mediumgray">
                      applied for {item.role}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-mediumgray">{item.time}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
