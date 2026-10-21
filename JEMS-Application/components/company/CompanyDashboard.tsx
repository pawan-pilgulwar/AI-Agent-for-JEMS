"use client";

import Link from "next/link";
import { ArrowRight, Briefcase, GraduationCap, Handshake, Plus, TrendingUp, Users } from "lucide-react";
import { Card } from "@/components/dashboard/student/ui";
import type { CompanyDashboard as Data } from "@/lib/db/company";
import { PageHead, STATUS_STYLE, TYPE_STYLE, fmtDate, primaryBtn } from "./ui";

export default function CompanyDashboard({ data }: { data: Data }) {
  const k = data.kpis;
  const tiles = [
    { label: "Open jobs / internships", value: k.openings, sub: "internships, apprenticeships & jobs", icon: Briefcase },
    { label: "Applicants", value: k.applicants, sub: `${k.shortlisted} shortlisted / interviewing`, icon: Users },
    { label: "Offers made", value: k.offers, sub: "placements in progress", icon: TrendingUp },
    { label: "Learning programs", value: k.programs, sub: "published for students", icon: GraduationCap },
    { label: "Academia collaborations", value: k.collaborations, sub: `${k.facultyInterest} faculty interested`, icon: Handshake },
  ];
  const pipelineMax = Math.max(1, ...data.pipeline.map((p) => p.count));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHead company={data.company.name} title="Industry portal" hint="Post jobs and internships with the skills you need, get skill-ranked candidates, and publish programs that close the gap." />
        <Link href="/company/opportunities?new=1" data-tour="company-post" className={primaryBtn}><Plus className="h-4 w-4" /> Post a job / internship</Link>
      </div>

      <div data-tour="company-kpis" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {tiles.map((t) => (
          <Card key={t.label} className="p-5">
            <div className="flex items-start justify-between"><p className="text-xs font-medium text-mediumgray">{t.label}</p><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate/10 text-slate"><t.icon className="h-4 w-4" /></span></div>
            <p className="font-display mt-3 text-[1.75rem] font-bold leading-none tracking-tight text-navy tabular">{t.value}</p>
            <p className="mt-1 text-xs text-mediumgray">{t.sub}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card data-tour="company-applicants" className="xl:col-span-2">
          <div className="flex items-center justify-between border-b border-lightgray px-5 py-3.5">
            <h2 className="text-sm font-semibold text-navy">Recent applicants</h2>
            <Link href="/company/candidates" className="inline-flex items-center gap-1 text-xs font-semibold text-slate hover:underline">All candidates <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
          <ul className="divide-y divide-lightgray">
            {data.recentApplicants.length === 0 && <li className="px-5 py-6 text-sm text-mediumgray">No applications yet.</li>}
            {data.recentApplicants.map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-sm font-semibold text-navy">{a.name.charAt(0)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-navy">{a.name}</span>
                  <span className="text-[11px] text-mediumgray">{a.role} · {fmtDate(a.appliedAt)}</span>
                </span>
                <span className={`text-sm font-bold tabular ${a.score >= 70 ? "text-emerald" : a.score >= 40 ? "text-amber-600" : "text-mediumgray"}`}>{a.score}%</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLE(a.status)}`}>{a.status}</span>
              </li>
            ))}
          </ul>
        </Card>

        <div className="space-y-6">
          <Card data-tour="company-pipeline" className="p-5">
            <h2 className="text-sm font-semibold text-navy">Hiring pipeline</h2>
            <ul className="mt-4 space-y-2.5">
              {data.pipeline.length === 0 && <li className="text-sm text-mediumgray">No applications yet.</li>}
              {data.pipeline.map((p) => (
                <li key={p.status} title={`${p.status}: ${p.count}`}>
                  <div className="mb-1 flex justify-between text-xs"><span className="font-medium text-navy">{p.status}</span><span className="tabular-nums text-mediumgray">{p.count}</span></div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-lightgray"><div className="h-full rounded-r-[4px] bg-slate" style={{ width: `${(p.count / pipelineMax) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          </Card>
          <Card data-tour="company-skills" className="p-5">
            <h2 className="text-sm font-semibold text-navy">Skills you&apos;re hiring for</h2>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {data.topDemand.map((d) => <span key={d.skill} className="rounded-md bg-surface px-2 py-0.5 text-xs font-medium text-navy">{d.skill} <span className="text-[10px] text-mediumgray">×{d.openings}</span></span>)}
            </div>
          </Card>
        </div>
      </div>

      <Card data-tour="company-openings">
        <div className="flex items-center justify-between border-b border-lightgray px-5 py-3.5">
          <h2 className="text-sm font-semibold text-navy">Your openings</h2>
          <Link href="/company/opportunities" className="inline-flex items-center gap-1 text-xs font-semibold text-slate hover:underline">Manage <ArrowRight className="h-3.5 w-3.5" /></Link>
        </div>
        <ul className="divide-y divide-lightgray">
          {data.openings.slice(0, 6).map((o) => (
            <li key={o.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2"><span className="text-sm font-medium text-navy">{o.role}</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TYPE_STYLE(o.type)}`}>{o.type}</span></span>
                <span className="text-[11px] text-mediumgray">{o.location} · {o.requiredSkills.slice(0, 4).join(", ")}</span>
              </span>
              <span className="text-xs text-mediumgray">{o.applicants} applicants</span>
              <Link href={`/company/candidates?job=${o.id}`} className="text-xs font-semibold text-slate hover:underline">Shortlist</Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
