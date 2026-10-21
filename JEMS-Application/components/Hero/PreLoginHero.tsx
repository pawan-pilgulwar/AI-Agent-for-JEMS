"use client";

import { ArrowRight, BadgeCheck, Building2, Sparkles } from "lucide-react";
import TourButton from "@/components/tour/TourButton";

interface PreLoginHeroProps {
  onStartLearning?: () => void;
  onForCompanies?: () => void;
}

/* A slice of the real product — the same readiness / verified-skill / match
   signals the student dashboard renders — so the hero shows the thing, not a
   metaphor for it. */
const SKILLS = [
  { name: "React", level: 84, verified: true },
  { name: "TypeScript", level: 71, verified: true },
  { name: "System design", level: 46, verified: false },
];

const MATCHES = [
  { role: "Frontend Developer Intern", company: "Capgemini", match: 91 },
  { role: "Junior Web Developer", company: "Zoho", match: 78 },
];

function Stagger({ i, children, className = "" }: { i: number; children: React.ReactNode; className?: string }) {
  return (
    <div className={`hero-in ${className}`} style={{ "--d": `${i * 90}ms` } as React.CSSProperties}>
      {children}
    </div>
  );
}

/** Marketing hero shown to unauthenticated visitors. */
export default function PreLoginHero({ onStartLearning, onForCompanies }: PreLoginHeroProps) {
  return (
    <section data-tour="hero" className="relative overflow-hidden bg-transparent">
      {/* Warm spotlight + dot texture, weighted toward the product panel. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden md:block">
        <div className="absolute inset-0 bg-hero-spotlight" />
        <div className="absolute inset-0 bg-hero-dots" />
      </div>

      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 pb-20 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-12 lg:gap-10 lg:px-8 lg:pb-28 lg:pt-24">
        {/* ── Copy ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-7">
          <Stagger i={0}>
            <h1 className="font-display max-w-[13ch] text-[2.75rem] font-bold leading-[0.98] tracking-[-0.03em] text-navy sm:text-6xl lg:text-[4.75rem]">
              One <span className="text-orange">verified record</span>, endless{" "}
              <span className="text-orange">opportunities</span>.
            </h1>
          </Stagger>

          <Stagger i={1}>
            <p className="mt-7 max-w-[52ch] text-lg leading-8 text-ink-soft sm:text-xl sm:leading-9">
              JEMS brings together verified skills, personalised AI roadmaps, and
              easy job matching. For students, faculty, industry and institutions —
              all on one platform.
            </p>
          </Stagger>

          <Stagger i={2} className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={onStartLearning}
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-cta-gradient px-7 py-3.5 text-base font-semibold text-white shadow-[var(--shadow-cta)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-6px_rgba(234,88,12,0.5)] active:translate-y-0"
            >
              Start learning free
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
            <button
              type="button"
              onClick={onForCompanies}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-navy/15 bg-white/70 px-7 py-3.5 text-base font-semibold text-navy backdrop-blur-sm transition-colors duration-200 hover:border-navy hover:bg-navy hover:text-white"
            >
              <Building2 className="h-4 w-4" />
              I&apos;m hiring
            </button>
          </Stagger>

          <Stagger i={3} className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-mediumgray">
            <TourButton
              tour="landing"
              className="inline-flex items-center gap-1.5 font-medium text-navy underline decoration-navy/25 underline-offset-4 transition-colors hover:decoration-orange"
            >
              Take the 60-second tour
            </TourButton>
            <span className="tabular">
              <strong className="font-semibold text-navy">100%</strong> verified ·{" "}
              <strong className="font-semibold text-navy">4</strong> roles ·{" "}
              <strong className="font-semibold text-emerald">Live</strong> platform
            </span>
          </Stagger>
        </div>

        {/* ── Product proof panel ───────────────────────────────────── */}
        <div className="relative lg:col-span-5">
          <Stagger i={2}>
            <div className="relative mx-auto max-w-md lg:ml-auto lg:mr-0 lg:max-w-none lg:rotate-[-1.5deg]">
              <div className="overflow-hidden rounded-3xl border border-navy/[0.07] bg-white shadow-[var(--shadow-lift)]">
                {/* Readiness header */}
                <div className="flex items-end justify-between gap-4 border-b border-lightgray px-6 pb-5 pt-6">
                  <div>
                    <p className="text-xs font-medium text-mediumgray">Job readiness</p>
                    <p className="font-display mt-1 text-5xl font-bold leading-none tracking-tight text-navy tabular">
                      68<span className="text-2xl text-mediumgray">%</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-mediumgray">Target role</p>
                    <p className="mt-1 text-sm font-semibold text-navy">Frontend Developer</p>
                  </div>
                </div>

                {/* Verified skills */}
                <ul className="space-y-3.5 px-6 py-5">
                  {SKILLS.map((s) => (
                    <li key={s.name}>
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="inline-flex items-center gap-1.5 font-medium text-navy">
                          {s.name}
                          {s.verified && <BadgeCheck className="h-4 w-4 text-emerald" aria-label="Verified" />}
                        </span>
                        <span className="text-xs text-mediumgray tabular">{s.level}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
                        <div
                          className={`h-full rounded-full ${s.verified ? "bg-navy" : "bg-lightgray"}`}
                          style={{ width: `${s.level}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Matches */}
                <div className="border-t border-lightgray bg-surface-2 px-6 py-4">
                  <p className="text-xs font-medium text-mediumgray">Matched this week</p>
                  <ul className="mt-2.5 divide-y divide-lightgray">
                    {MATCHES.map((m) => (
                      <li key={m.role} className="flex items-center gap-3 py-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-bold text-navy ring-1 ring-lightgray">
                          {m.company.charAt(0)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-navy">{m.role}</span>
                          <span className="block truncate text-xs text-mediumgray">{m.company}</span>
                        </span>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold tabular ${
                            m.match >= 85 ? "bg-emerald/10 text-emerald" : "bg-orange/10 text-orange"
                          }`}
                        >
                          {m.match}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Floating note — the AI layer, stated as a fact not a badge. */}
              <div className="absolute -bottom-10 -left-4 hidden rotate-[2deg] items-center gap-2.5 rounded-2xl border border-orange/20 bg-white px-4 py-3 shadow-[var(--shadow-card)] sm:flex lg:-left-8">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange/10 text-orange">
                  <Sparkles className="h-4 w-4" />
                </span>
                <span className="text-sm leading-tight text-navy">
                  <span className="block font-semibold">Next: System design</span>
                  <span className="text-xs text-mediumgray">+12% readiness · 3 lessons</span>
                </span>
              </div>
            </div>
          </Stagger>
        </div>
      </div>
    </section>
  );
}
