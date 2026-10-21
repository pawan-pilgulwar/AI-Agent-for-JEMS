"use client";

import { useState } from "react";
import {
  Briefcase,
  GraduationCap,
  Handshake,
  ShieldCheck,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { Card } from "@/components/dashboard/student/ui";
import type { InstitutionDashboard as Data } from "@/lib/db/institution";

/** Single-series horizontal bar list: label · bar · value. */
function Bars({
  rows,
  max,
  format = (v: number) => String(v),
}: {
  rows: { label: string; value: number; hint?: string }[];
  max?: number;
  format?: (v: number) => string;
}) {
  const top = max ?? Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2.5">
      {rows.length === 0 && <li className="text-sm text-mediumgray">No data yet.</li>}
      {rows.map((r) => (
        <li key={r.label} title={`${r.label}: ${format(r.value)}${r.hint ? ` · ${r.hint}` : ""}`} className="group">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="truncate font-medium text-navy">{r.label}</span>
            <span className="ml-3 shrink-0 tabular-nums text-mediumgray">{format(r.value)}{r.hint && <span className="ml-1 text-[10px]">· {r.hint}</span>}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-lightgray">
            <div className="h-full rounded-r-[4px] bg-slate transition-[width] duration-500 group-hover:bg-orange" style={{ width: `${Math.max(2, (r.value / top) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Head({ icon: Icon, title, hint }: { icon: typeof Users; title: string; hint?: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate/10 text-slate"><Icon className="h-4 w-4" /></span>
      <div>
        <h2 className="text-sm font-semibold text-navy">{title}</h2>
        {hint && <p className="text-[11px] text-mediumgray">{hint}</p>}
      </div>
    </div>
  );
}

export default function InstitutionDashboard({ data }: { data: Data }) {
  const [sort, setSort] = useState<"readiness" | "modulesPassed" | "applications">("readiness");
  const students = [...data.students].sort((a, b) => b[sort] - a[sort]);
  const k = data.kpis;

  const tiles = [
    { label: "Students", value: k.students, sub: `${k.withGoals} with career goals set`, icon: Users },
    { label: "Avg. placement readiness", value: `${k.avgReadiness}%`, sub: "across the cohort", icon: Target },
    { label: "Verified skills earned", value: k.verifiedSkills, sub: `${k.modulesPassed} roadmap modules passed`, icon: ShieldCheck },
    { label: "Applications", value: k.applications, sub: `${k.internshipApplications} to internships`, icon: Briefcase },
    { label: "Offers", value: k.offers, sub: `${k.placementRate}% of students placed`, icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate/10 px-2.5 py-1 text-xs font-semibold text-slate"><GraduationCap className="h-3.5 w-3.5" /> {data.institution}</span>
        <h1 className="mt-3 text-2xl font-bold text-navy">Skill development & placement analytics</h1>
        <p className="mt-1 text-sm text-mediumgray">Live view of how your students are progressing from skill gaps to internships and placements.</p>
      </div>

      {/* KPI tiles */}
      <div data-tour="inst-kpis" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {tiles.map((t) => (
          <Card key={t.label} className="p-5">
            <div className="flex items-start justify-between">
              <p className="text-xs font-medium text-mediumgray">{t.label}</p>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate/10 text-slate"><t.icon className="h-4 w-4" /></span>
            </div>
            <p className="mt-3 text-2xl font-bold text-navy">{t.value}</p>
            <p className="mt-1 text-xs text-mediumgray">{t.sub}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card data-tour="inst-skill-gaps" className="p-6">
          <Head icon={Zap} title="Skill gap statistics" hint="Industry demand vs. share of students with the skill verified" />
          <Bars rows={data.skillGaps.slice(0, 8).map((g) => ({ label: g.skill, value: g.coverage, hint: `${g.demand} openings ask for it` }))} max={100} format={(v) => `${v}% verified`} />
        </Card>
        <Card data-tour="inst-demand" className="p-6">
          <Head icon={TrendingUp} title="Industry demand trends" hint="Skills most requested in current openings" />
          <Bars rows={data.demandTrends.map((d) => ({ label: d.skill, value: d.openings }))} format={(v) => `${v} openings`} />
        </Card>
        <div className="space-y-6">
          <Card data-tour="inst-readiness" className="p-6">
            <Head icon={Target} title="Placement readiness" hint="Students per readiness band" />
            <Bars rows={data.readinessBuckets.map((b) => ({ label: b.label, value: b.count }))} format={(v) => `${v} students`} />
          </Card>
          <Card data-tour="inst-pipeline" className="p-6">
            <Head icon={Briefcase} title="Application pipeline" />
            <Bars rows={data.applicationsByStatus.map((s) => ({ label: s.status, value: s.count }))} />
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card data-tour="inst-interests" className="p-6">
          <Head icon={Users} title="Career interests" hint="Target roles chosen by students" />
          <Bars rows={data.targetRoles.map((r) => ({ label: r.role, value: r.count }))} format={(v) => `${v}`} />
        </Card>
        <Card data-tour="inst-collab" className="p-6 xl:col-span-2">
          <Head icon={Handshake} title="Industry collaboration" hint="Upcoming FDPs, training and research programs open to your faculty" />
          <ul className="divide-y divide-lightgray">
            {data.collaborations.map((c) => (
              <li key={c.title} className="flex items-center gap-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-navy">{c.title}</span>
                  <span className="text-[11px] text-mediumgray">{c.company} · {c.startsAt ? new Date(c.startsAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""}</span>
                </span>
                <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">{c.type}</span>
                <span className="w-24 text-right text-xs text-mediumgray">{c.interested} faculty interested</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Students table */}
      <Card data-tour="inst-students">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-lightgray px-5 py-3.5">
          <h2 className="text-sm font-semibold text-navy">Students</h2>
          <div className="flex gap-1.5">
            {([["readiness", "Readiness"], ["modulesPassed", "Modules"], ["applications", "Applications"]] as const).map(([key, label]) => (
              <button key={key} type="button" onClick={() => setSort(key)} className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${sort === key ? "bg-navy text-white" : "border border-lightgray text-mediumgray hover:text-navy"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          {/* min-width: on phones the table scrolls sideways instead of squeezing names onto two lines */}
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-mediumgray">
                <th className="px-5 py-2.5 font-semibold">Student</th>
                <th className="px-5 py-2.5 font-semibold">Target role</th>
                <th className="px-5 py-2.5 font-semibold">Readiness</th>
                <th className="px-5 py-2.5 font-semibold">Verified skills</th>
                <th className="px-5 py-2.5 font-semibold">Modules</th>
                <th className="px-5 py-2.5 font-semibold">Applications</th>
                <th className="px-5 py-2.5 font-semibold">Best status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-lightgray">
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-surface-2">
                  <td className="px-5 py-2.5 font-medium text-navy">
                    <a href={`/p/${s.id}`} target="_blank" rel="noreferrer" className="hover:text-slate hover:underline">{s.name}</a>
                  </td>
                  <td className="px-5 py-2.5 text-mediumgray">{s.targetRole}</td>
                  <td className="px-5 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-lightgray"><div className="h-full rounded-r-[4px] bg-slate" style={{ width: `${s.readiness}%` }} /></div>
                      <span className="tabular-nums text-xs text-navy">{s.readiness}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-2.5 tabular-nums text-navy">{s.verifiedSkills}</td>
                  <td className="px-5 py-2.5 tabular-nums text-navy">{s.modulesPassed}</td>
                  <td className="px-5 py-2.5 tabular-nums text-navy">{s.applications}</td>
                  <td className="px-5 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${/offer|selected/i.test(s.bestStatus) ? "bg-emerald/10 text-emerald" : /interview|shortlist/i.test(s.bestStatus) ? "bg-slate/10 text-slate" : "bg-surface text-mediumgray"}`}>{s.bestStatus}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
