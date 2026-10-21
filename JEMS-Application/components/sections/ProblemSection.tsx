"use client";

import { ArrowDown } from "lucide-react";
import { SectionHeading, revealClass, useReveal } from "./_shared";

interface Problem {
  stat: string;
  meaning: string;
  explanation: string;
}

const problems: Problem[] = [
  {
    stat: "Scattered",
    meaning: "Student records across departments",
    explanation:
      "Marks in the LMS, attendance in the ERP, certificates on paper. Faculty manually hunt across systems. No single verified record exists.",
  },
  {
    stat: "Unverified",
    meaning: "Skills and certificates unvalidated",
    explanation:
      "Paper certificates get lost. Claims go unverified. Companies and institutions don't know what a student can actually do — so hiring and placements stall.",
  },
  {
    stat: "Disconnected",
    meaning: "Students, faculty, industry and institutions operate in silos",
    explanation:
      "No feedback loop between what students learn, what industry needs, what faculty teach, or what institutions report. Skill gaps stay invisible until job-search time.",
  },
];

/**
 * Problem section — shown only to unauthenticated visitors below the hero.
 * An editorial stat ledger: the numbers are the argument, so they get the
 * display face and the room; no card chrome competes with them.
 */
export default function ProblemSection() {
  const { ref, visible } = useReveal<HTMLElement>();
  const r = revealClass(visible);

  return (
    <section id="problem" ref={ref} className="bg-transparent">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className={`grid gap-10 lg:grid-cols-12 lg:gap-8 ${r}`}>
          <div className="lg:col-span-5">
            <SectionHeading
              title="The gap in student verification"
              lede="Records are scattered. Skills go unverified. Students, faculty, industry and institutions operate in silos with no feedback loop. This costs time, money, and opportunities."
            />
            <a
              href="#how-it-works"
              className="group mt-10 inline-flex items-center gap-3 text-sm font-semibold text-navy"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-navy/15 transition-colors duration-200 group-hover:border-orange group-hover:bg-orange group-hover:text-white">
                <ArrowDown className="h-4 w-4 transition-transform duration-200 group-hover:translate-y-0.5" />
              </span>
              See how Jems closes it
            </a>
          </div>

          <dl className="lg:col-span-7 lg:pl-8">
            {problems.map((p, i) => (
              <div
                key={p.stat}
                style={{ transitionDelay: visible ? `${i * 110 + 100}ms` : "0ms" }}
                className={`grid gap-2 border-t border-navy/10 py-7 first:border-t-0 first:pt-0 sm:grid-cols-[11rem_1fr] sm:gap-8 lg:py-8 ${r}`}
              >
                <dt className="font-display whitespace-nowrap text-[2.75rem] font-bold leading-none tracking-[-0.03em] text-orange tabular sm:text-5xl">
                  {p.stat}
                </dt>
                <dd>
                  <p className="text-lg font-semibold leading-snug text-navy">{p.meaning}</p>
                  <p className="mt-2 max-w-[52ch] text-[15px] leading-7 text-ink-soft">{p.explanation}</p>
                </dd>
              </div>
            ))}
          </dl>
        </div>

      </div>
    </section>
  );
}
