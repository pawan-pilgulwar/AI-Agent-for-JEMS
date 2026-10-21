"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Award,
  BadgeCheck,
  Briefcase,
  Check,
  CircleCheck,
  Code,
  Copy,
  ExternalLink,
  GraduationCap,
  Link2,
  MapPin,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import { Card, ProgressBar } from "@/components/dashboard/student/ui";
import type { Portfolio } from "@/lib/db/portfolio";

function fmt(iso: string) {
  return iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";
}

/**
 * The portfolio itself, shared by the student's own page (with a share
 * button) and the public read-only page at /p/[id].
 */
export default function PortfolioView({ data, shareUrl }: { data: Portfolio; shareUrl?: string }) {
  // The public page (no shareUrl) shows verified skills only; the owner also
  // sees claimed skills with a route to verify them.
  const isOwner = !!shareUrl;
  const verifiedSkills = data.skills.filter((s) => s.verified);
  const claimedSkills = data.skills.filter((s) => !s.verified);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };
  const initial = data.name.trim().charAt(0).toUpperCase() || "S";

  return (
    <div className="space-y-6">
      {/* Identity */}
      <Card className="p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          {data.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element -- small remote avatar
            <img src={data.avatar} alt="" className="h-20 w-20 shrink-0 rounded-2xl object-cover ring-1 ring-lightgray" />
          ) : (
            <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-orange text-3xl font-bold text-white">{initial}</span>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-navy">{data.name}</h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald/10 px-2.5 py-1 text-[11px] font-semibold text-emerald">
                <BadgeCheck className="h-3.5 w-3.5" /> JEMS verified
              </span>
            </div>
            <p className="mt-0.5 text-sm font-medium text-slate">{data.headline}</p>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-mediumgray">
              {data.institution && <span className="inline-flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" />{data.institution}</span>}
              {data.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{data.location}</span>}
            </p>
            {data.bio && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-mediumgray">{data.bio}</p>}
            {data.links.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {data.links.map((l) => (
                  <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border border-lightgray px-2 py-1 text-xs font-medium text-navy transition-colors hover:border-slate hover:text-slate">
                    <ExternalLink className="h-3 w-3" />{l.label}
                  </a>
                ))}
              </div>
            )}
          </div>
          {shareUrl && (
            <button
              type="button"
              onClick={copy}
              className="inline-flex shrink-0 items-center gap-2 self-start rounded-lg border border-lightgray bg-white px-4 py-2 text-sm font-semibold text-navy transition-colors hover:border-slate hover:text-slate"
            >
              {copied ? <Check className="h-4 w-4 text-emerald" /> : <Link2 className="h-4 w-4" />}
              {copied ? "Link copied" : "Copy share link"}
            </button>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Verified skills", value: data.stats.verifiedSkills, icon: ShieldCheck },
            { label: "Certificates", value: data.stats.modulesPassed, icon: Award },
            { label: "Projects", value: data.projects.length, icon: Code },
            { label: "Readiness", value: `${data.readiness}%`, icon: Trophy },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-3 rounded-xl border border-lightgray bg-surface-2 p-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate/10 text-slate"><s.icon className="h-4 w-4" /></span>
              <span><span className="block text-xs text-mediumgray">{s.label}</span><span className="block text-sm font-semibold text-navy">{s.value}</span></span>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Skills */}
        <Card className="p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-navy"><ShieldCheck className="h-4 w-4 text-slate" /> Verified skills</h2>
          <p className="mt-0.5 text-[11px] text-mediumgray">Every skill here was verified by a JEMS skill test or a server-graded roadmap quiz. Self-declared skills are never shown to recruiters.</p>
          <ul className="mt-4 space-y-3">
            {verifiedSkills.length === 0 && <li className="text-sm text-mediumgray">No verified skills yet.</li>}
            {verifiedSkills.map((s) => (
              <li key={s.name}>
                <div className="flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-1.5 font-medium text-navy">
                    {s.name}
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald"><CircleCheck className="h-3 w-3" /> {s.source === "skill-test" ? "Skill test" : "Roadmap quiz"}</span>
                  </span>
                  <span className="text-xs text-mediumgray">{s.level}%</span>
                </div>
                <div className="mt-1"><ProgressBar value={s.level} barClass="bg-emerald" /></div>
              </li>
            ))}
          </ul>
          {isOwner && claimedSkills.length > 0 && (
            <div className="mt-5 rounded-lg border border-dashed border-gold/50 bg-gold/5 p-3">
              <p className="text-xs font-semibold text-amber-800">Claimed, not yet verified — hidden from recruiters</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {claimedSkills.map((s) => <span key={s.name} className="rounded-md bg-white px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-gold/40">{s.name}</span>)}
              </div>
              <Link href="/student/assessment" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-slate hover:underline">Verify them in Skill Assessment <ExternalLink className="h-3 w-3" /></Link>
            </div>
          )}
          {data.softSkills.length > 0 && (
            <div className="mt-5 border-t border-lightgray pt-4">
              <p className="text-xs font-semibold text-navy">Soft-skill profile</p>
              <p className="text-[11px] text-mediumgray">From the JEMS aptitude questionnaire</p>
              <ul className="mt-2 space-y-2">
                {data.softSkills.map((s) => (
                  <li key={s.key}>
                    <div className="flex items-center justify-between text-xs"><span className="text-navy">{s.label}</span><span className="text-mediumgray">{s.value}%</span></div>
                    <div className="mt-1"><ProgressBar value={s.value} barClass="bg-slate" /></div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        {/* Certificates */}
        <Card className="p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-navy"><Award className="h-4 w-4 text-slate" /> Certificates</h2>
          <ul className="mt-4 space-y-2">
            {data.certificates.length === 0 && <li className="text-sm text-mediumgray">No certificates yet — each passed module issues one.</li>}
            {data.certificates.map((c) => (
              <li key={c.id} className="flex items-start gap-3 rounded-lg border border-lightgray p-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold/15 text-amber-700"><Award className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-navy">{c.title}</span>
                  <span className="block text-[11px] text-mediumgray">{c.issuer} · {fmt(c.issuedAt)}</span>
                  <span className="mt-1 flex flex-wrap gap-1">{c.skills.map((s) => <span key={s} className="rounded bg-surface px-1.5 py-0.5 text-[10px] font-medium text-navy">{s}</span>)}</span>
                </span>
                <span className="shrink-0 rounded-full bg-emerald/10 px-2 py-0.5 text-[10px] font-semibold text-emerald">Verified</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Projects */}
        <Card className="p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-navy"><Code className="h-4 w-4 text-slate" /> Projects</h2>
          <ul className="mt-4 space-y-2">
            {data.projects.length === 0 && <li className="text-sm text-mediumgray">No projects yet.</li>}
            {data.projects.map((p) => (
              <li key={p.id} className="rounded-lg border border-lightgray p-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium text-navy">{p.title}</span>
                  {p.source === "roadmap" ? (
                    <span className="shrink-0 rounded-full bg-emerald/10 px-2 py-0.5 text-[10px] font-semibold text-emerald">Verified</span>
                  ) : p.link ? (
                    <a href={p.link.startsWith("http") ? p.link : `https://${p.link}`} target="_blank" rel="noreferrer" className="text-xs font-semibold text-slate hover:underline">View</a>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-mediumgray">{p.description}</p>
                <div className="mt-2 flex flex-wrap gap-1">{p.tech.map((t) => <span key={t} className="rounded bg-surface px-1.5 py-0.5 text-[10px] font-medium text-navy">{t}</span>)}</div>
              </li>
            ))}
          </ul>
        </Card>

        {/* Experience & achievements */}
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-navy"><Briefcase className="h-4 w-4 text-slate" /> Internships & placements</h2>
            <ul className="mt-4 divide-y divide-lightgray">
              {data.experience.length === 0 && <li className="py-2 text-sm text-mediumgray">No applications yet.</li>}
              {data.experience.map((e) => (
                <li key={e.id} className="flex items-center gap-3 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-navy">{e.title}</span>
                    <span className="text-[11px] text-mediumgray">{e.company} · {fmt(e.date)}</span>
                  </span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${e.kind === "offer" ? "bg-emerald/10 text-emerald" : e.kind === "internship" ? "bg-sky-50 text-sky-700" : "bg-surface text-navy"}`}>{e.status}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-navy"><Trophy className="h-4 w-4 text-slate" /> Achievements</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {data.achievements.length === 0 && <span className="text-sm text-mediumgray">No achievements yet.</span>}
              {data.achievements.map((a) => (
                <span key={a} className="inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-xs font-medium text-amber-800"><Trophy className="h-3 w-3" />{a}</span>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {shareUrl && (
        <p className="text-center text-xs text-mediumgray">
          Recruiters can view this portfolio at{" "}
          <Link href={new URL(shareUrl).pathname} className="font-semibold text-slate hover:underline" target="_blank">{shareUrl}</Link>
          <span className="mx-1">·</span>
          <button type="button" onClick={copy} className="inline-flex items-center gap-1 font-semibold text-slate hover:underline"><Copy className="h-3 w-3" /> copy</button>
        </p>
      )}
    </div>
  );
}
