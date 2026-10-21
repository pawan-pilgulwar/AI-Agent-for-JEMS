"use client";

import { useState } from "react";
import { Briefcase } from "lucide-react";
import DashboardShell, { DashboardContainer } from "@/components/dashboard/student/DashboardShell";
import { Card, EmptyState } from "@/components/dashboard/student/ui";
import type { ApplicationView } from "@/lib/db/student-data";

const STAGES = ["Applied", "In review", "Interview", "Offer"] as const;
type Status = ApplicationView["status"];

function statusTone(s: Status) {
  if (s === "Offer") return "bg-emerald/10 text-emerald";
  if (s === "Rejected") return "bg-[#fee2e2] text-[#EF4444]";
  if (s === "Interview") return "bg-slate/10 text-slate";
  return "bg-gold/10 text-[#b45309]";
}

const TABS = ["All", "Applied", "In review", "Interview", "Offer", "Rejected"] as const;

export default function Applications({ apps }: { apps: ApplicationView[] }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("All");

  const counts = {
    Applied: apps.filter((a) => a.status === "Applied").length,
    "In review": apps.filter((a) => a.status === "In review").length,
    Interview: apps.filter((a) => a.status === "Interview").length,
    Offer: apps.filter((a) => a.status === "Offer").length,
  };

  const visible = apps.filter((a) => tab === "All" || a.status === tab);

  if (apps.length === 0) {
    return (
      <DashboardShell>
        <DashboardContainer className="space-y-6">
          <EmptyState
            icon={Briefcase}
            title="No applications yet"
            hint="When you apply to roles from Job Matches, they'll show up here so you can track every stage from applied to offer."
            ctaLabel="Browse Job Matches"
            ctaHref="/student/jobs"
          />
        </DashboardContainer>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <DashboardContainer className="space-y-6">
        {/* Pipeline stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {(Object.keys(counts) as (keyof typeof counts)[]).map((k) => (
            <Card key={k} className="p-5">
              <p className="text-xs font-medium text-mediumgray">{k}</p>
              <p className="mt-2 text-2xl font-bold text-navy">{counts[k]}</p>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === t
                  ? "bg-navy text-white"
                  : "border border-lightgray bg-white text-mediumgray hover:text-navy"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* List */}
        <Card>
          <ul className="divide-y divide-lightgray">
            {visible.map((a) => {
              const stageIndex = a.status === "Rejected" ? -1 : STAGES.indexOf(a.status);
              return (
                <li key={a.id} className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface text-sm font-bold text-navy">
                    {a.company.charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-navy">{a.role}</p>
                    <p className="text-xs text-mediumgray">
                      {a.company} · Applied {a.applied}
                    </p>
                    {/* Stage tracker */}
                    <div className="mt-2 flex max-w-xs items-center gap-1">
                      {STAGES.map((_, i) => (
                        <span
                          key={i}
                          className={`h-1.5 flex-1 rounded-full ${
                            a.status === "Rejected"
                              ? "bg-lightgray"
                              : i <= stageIndex
                                ? "bg-slate"
                                : "bg-lightgray"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <span className={`shrink-0 self-start rounded-full px-3 py-1 text-xs font-semibold ${statusTone(a.status)}`}>
                    {a.status}
                  </span>
                </li>
              );
            })}
          </ul>
          {visible.length === 0 && (
            <p className="px-5 py-10 text-center text-sm text-mediumgray">
              No applications in this stage.
            </p>
          )}
        </Card>
      </DashboardContainer>
    </DashboardShell>
  );
}
