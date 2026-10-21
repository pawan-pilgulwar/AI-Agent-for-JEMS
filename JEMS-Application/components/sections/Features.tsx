"use client";

import { ArrowUpRight, BadgeCheck, FileText, Mic, Route, Target } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SectionHeading, revealClass, useReveal } from "./_shared";

interface Feature {
  Icon: LucideIcon;
  title: string;
  desc: string;
  /** Grid placement classes for the bento. */
  span: string;
  featured?: boolean;
}

const features: Feature[] = [
  {
    Icon: BadgeCheck,
    title: "Assessment-verified skills",
    desc: "Skills proven by tests, projects and faculty approval — not just certificates. Verified abilities flow into your portfolio, roadmap and every job match, so employers see evidence, not claims.",
    span: "sm:col-span-2 lg:col-span-3 lg:row-span-2",
    featured: true,
  },
  {
    Icon: Route,
    title: "Personalised AI roadmap",
    desc: "Learning path built around your interests and career goals. AI identifies gaps and suggests courses, certifications and projects to close them.",
    span: "lg:col-span-3",
  },
  {
    Icon: Target,
    title: "AI job & internship matching",
    desc: "Ranked matches with clear reasons. AI reads job posts in plain words, parses requirements, and shows you which skills matter most.",
    span: "lg:col-span-3",
  },
  {
    Icon: FileText,
    title: "Verified portfolio",
    desc: "Central record of all your verified skills, activities, projects and achievements. One source of truth for internship and job applications.",
    span: "lg:col-span-3",
  },
  {
    Icon: Mic,
    title: "Activity tracker & dashboards",
    desc: "Live dashboard of marks, attendance, seminars, MOOCs and internships. Upload proof, faculty approve it, and watch your credits accumulate toward AICTE requirements.",
    span: "lg:col-span-3",
  },
];

/** Features — the core tools, shown only to unauthenticated visitors. */
export default function Features() {
  const { ref, visible } = useReveal<HTMLElement>();
  const r = revealClass(visible);

  return (
    <section id="features" ref={ref} className="bg-transparent">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <SectionHeading
          className={r}
          title="A unified platform for students, faculty, industry and institutions"
          lede="Assessment-verified skills, personalised AI roadmaps, easy job matching, and live dashboards — all connected. Records, skills, learning and jobs in one place."
        />

        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {features.map((f, i) => (
            <article
              key={f.title}
              style={{ transitionDelay: visible ? `${i * 90 + 100}ms` : "0ms" }}
              className={`group relative flex flex-col overflow-hidden rounded-3xl transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 ${f.span} ${r} ${
                f.featured
                  ? "bg-navy p-8 text-white shadow-[var(--shadow-card)] sm:p-10"
                  : "border border-navy/[0.07] bg-white p-7 shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-card)]"
              }`}
            >
              {f.featured && (
                <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                  <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-orange/30 blur-3xl" />
                  <div className="absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-gold/20 blur-3xl" />
                </div>
              )}

              <span
                className={`relative flex h-11 w-11 items-center justify-center rounded-xl ${
                  f.featured ? "bg-white/10 text-white ring-1 ring-white/15" : "bg-orange/10 text-orange"
                }`}
              >
                <f.Icon className="h-5 w-5" strokeWidth={2} />
              </span>

              <h3
                className={`font-display relative mt-6 font-bold tracking-tight ${
                  f.featured ? "text-3xl leading-tight sm:text-4xl" : "text-xl"
                }`}
              >
                {f.title}
              </h3>
              <p
                className={`relative mt-3 max-w-[48ch] leading-7 ${
                  f.featured ? "text-base text-white/75 sm:text-lg sm:leading-8" : "text-[15px] text-ink-soft"
                }`}
              >
                {f.desc}
              </p>

              {f.featured && (
                <a
                  href="#get-started"
                  className="relative mt-auto inline-flex items-center gap-1.5 self-start pt-10 text-sm font-semibold text-white"
                >
                  Start with a free assessment
                  <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </a>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
