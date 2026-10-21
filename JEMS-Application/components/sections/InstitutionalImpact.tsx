"use client";

import { BookOpen, Building2, TrendingUp, Award, Code, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SectionHeading, revealClass, useReveal } from "./_shared";

interface Portal {
  Icon: LucideIcon;
  title: string;
  role: string;
  benefits: string[];
}

const portals: Portal[] = [
  {
    Icon: BookOpen,
    title: "Students",
    role: "For learners",
    benefits: [
      "Live dashboard of marks, attendance and credit activities",
      "Upload and track seminars, MOOCs, internships and clubs",
      "Skill assessment and AI-powered roadmaps",
      "Verified portfolio for placements",
    ],
  },
  {
    Icon: Building2,
    title: "Faculty Mentors",
    role: "For educators",
    benefits: [
      "Approve student records with one tap",
      "Track mentee progress in real time",
      "Spot skill gaps and guide upskilling",
      "Award AICTE activity points",
    ],
  },
  {
    Icon: TrendingUp,
    title: "Industries",
    role: "For employers",
    benefits: [
      "Post jobs and internships in plain words",
      "AI-ranked verified shortlists in seconds",
      "Mentorship and live project opportunities",
      "Hire with verified skills and proven ability",
    ],
  },
  {
    Icon: Award,
    title: "Institutions",
    role: "For colleges",
    benefits: [
      "One central record per student for audits",
      "NAAC, AICTE and NIRF reports auto-generated",
      "Placement and participation analytics",
      "LMS and ERP integration ready",
    ],
  },
];

export default function InstitutionalImpact() {
  const { ref, visible } = useReveal<HTMLElement>();
  const r = revealClass(visible);

  return (
    <section id="impact" ref={ref} className="bg-transparent">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <SectionHeading
          className={r}
          align="center"
          title="Built for every stakeholder"
          lede="Students, faculty, industry and institutions — all connected on one platform with clear roles and benefits."
        />

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {portals.map((p, i) => (
            <article
              key={p.title}
              style={{ transitionDelay: visible ? `${i * 100 + 120}ms` : "0ms" }}
              className={`group rounded-2xl border border-navy/10 bg-white p-8 shadow-soft hover:shadow-card transition-all duration-300 hover:-translate-y-0.5 ${r}`}
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-orange/10 to-gold/10 text-orange group-hover:from-orange group-hover:to-gold group-hover:text-white transition-all duration-200">
                <p.Icon className="h-7 w-7" strokeWidth={2} />
              </span>

              <h3 className="font-display mt-5 text-xl font-bold tracking-tight text-navy">{p.title}</h3>
              <p className="mt-1 text-sm font-medium text-ink-soft">{p.role}</p>

              <ul className="mt-5 space-y-3">
                {p.benefits.map((benefit) => (
                  <li key={benefit} className="flex gap-3 text-sm leading-6 text-ink-soft">
                    <span className="text-orange font-bold">✓</span>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div
            style={{ transitionDelay: visible ? "500ms" : "0ms" }}
            className={`rounded-2xl border border-navy/10 bg-gradient-to-br from-navy/5 to-orange/5 p-8 text-center ${r}`}
          >
            <p className="font-display text-4xl font-bold text-orange">100%</p>
            <p className="mt-2 text-sm font-medium text-navy">Verified Skills</p>
            <p className="mt-1 text-xs text-ink-soft">Proof-backed abilities, not claims</p>
          </div>

          <div
            style={{ transitionDelay: visible ? "600ms" : "0ms" }}
            className={`rounded-2xl border border-navy/10 bg-gradient-to-br from-navy/5 to-orange/5 p-8 text-center ${r}`}
          >
            <p className="font-display text-4xl font-bold text-orange">One</p>
            <p className="mt-2 text-sm font-medium text-navy">Unified Record</p>
            <p className="mt-1 text-xs text-ink-soft">For audits, placements and growth</p>
          </div>

          <div
            style={{ transitionDelay: visible ? "700ms" : "0ms" }}
            className={`rounded-2xl border border-navy/10 bg-gradient-to-br from-navy/5 to-orange/5 p-8 text-center ${r}`}
          >
            <p className="font-display text-4xl font-bold text-orange">7</p>
            <p className="mt-2 text-sm font-medium text-navy">Steps to Success</p>
            <p className="mt-1 text-xs text-ink-soft">From requirements to job offers</p>
          </div>
        </div>
      </div>
    </section>
  );
}
