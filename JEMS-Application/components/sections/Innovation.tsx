"use client";

import { Badge, BarChart3, Brain, Zap, Lock, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SectionHeading, revealClass, useReveal } from "./_shared";

interface Innovation {
  Icon: LucideIcon;
  title: string;
  desc: string;
}

const innovations: Innovation[] = [
  {
    Icon: Badge,
    title: "Assessment-Verified Skills",
    desc: "Skills proven by tests and projects, not just certificates. Faculty approval ensures credibility.",
  },
  {
    Icon: Brain,
    title: "Personalised AI Roadmap",
    desc: "Learning path built around each student's interests and career goals. Adaptive and skill-gap aware.",
  },
  {
    Icon: Zap,
    title: "Skill Improvement Recommendations",
    desc: "Courses, certifications and projects suggested for each gap. Actionable guidance every step.",
  },
  {
    Icon: BarChart3,
    title: "AI Job & Internship Matching",
    desc: "AI parses job posts, ranks candidates by verified skills, and shows exact matches with reasons.",
  },
  {
    Icon: Users,
    title: "Easy Hiring for Companies",
    desc: "Plain-word job posts, AI-ranked verified shortlists in seconds. No resume pile-sifting.",
  },
  {
    Icon: Lock,
    title: "Unified Platform for All",
    desc: "Records, skills, learning and jobs in one place. One source of truth for students, faculty, industry and institutions.",
  },
];

export default function Innovation() {
  const { ref, visible } = useReveal<HTMLElement>();
  const r = revealClass(visible);

  return (
    <section id="innovation" ref={ref} className="bg-gradient-to-b from-navy/5 to-transparent">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <SectionHeading
          className={r}
          align="center"
          title="What makes JEMS unique"
          lede="Six core innovations that bridge the gap between education and industry at scale."
        />

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {innovations.map((i, idx) => (
            <article
              key={i.title}
              style={{ transitionDelay: visible ? `${idx * 80 + 100}ms` : "0ms" }}
              className={`group rounded-2xl border border-navy/10 bg-white p-6 shadow-soft hover:shadow-card transition-all duration-300 hover:-translate-y-0.5 ${r}`}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange/10 text-orange group-hover:bg-orange group-hover:text-white transition-colors duration-200">
                <i.Icon className="h-6 w-6" strokeWidth={2} />
              </span>

              <h3 className="font-display mt-4 text-lg font-bold tracking-tight text-navy">{i.title}</h3>
              <p className="mt-2 text-[15px] leading-6 text-ink-soft">{i.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
