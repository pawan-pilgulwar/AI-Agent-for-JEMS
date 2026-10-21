"use client";

import { SectionHeading, revealClass, useReveal } from "./_shared";

interface Step {
  num: string;
  title: string;
  desc: string;
  final?: boolean;
}

const steps: Step[] = [
  {
    num: "1",
    title: "Companies post requirements",
    desc: "Industry partners post jobs and internships in plain words. AI parses the requirements automatically.",
  },
  {
    num: "2",
    title: "Students add their skills",
    desc: "Upload activities, certificates, MOOCs, projects and internships. Faculty approve each record.",
  },
  {
    num: "3",
    title: "Skill gaps identified",
    desc: "AI compares verified skills against job requirements and shows exactly what's missing.",
  },
  {
    num: "4",
    title: "AI roadmap generated",
    desc: "Personalised learning path built around gaps and career goals. Courses and projects suggested.",
  },
  {
    num: "5",
    title: "Skills verified by platform",
    desc: "Complete assessments, projects and faculty reviews. Skills become verified proof.",
  },
  {
    num: "6",
    title: "AI job & internship matching",
    desc: "Ranked matches with clear reasons. Companies get verified shortlists in seconds.",
  },
  {
    num: "7",
    title: "Student gets job / internship",
    desc: "Apply with verified skills and proven ability. Internship or job offer landed.",
    final: true,
  },
];

/**
 * How It Works — a connected journey timeline (horizontal on desktop,
 * vertical on mobile). The step numbers are the sequence, so they stay.
 */
export default function HowItWorks() {
  const { ref, visible } = useReveal<HTMLElement>();
  const r = revealClass(visible);

  return (
    <section id="how-it-works" ref={ref} className="bg-transparent">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <SectionHeading
          className={r}
          align="center"
          title="How JEMS Works"
          lede="Seven-step flow: from company requirements to verified student matches and job offers."
        />

        {/* Timeline */}
        <ol className="relative mt-16 grid grid-cols-1 gap-10 md:grid-cols-7 md:gap-2">
          {/* Connector line — vertical on mobile, horizontal on desktop */}
          <div
            aria-hidden="true"
            className="absolute bottom-6 left-6 top-6 w-px bg-gradient-to-b from-navy/15 via-orange/60 to-orange md:bottom-auto md:left-6 md:right-6 md:top-6 md:h-px md:w-auto md:bg-gradient-to-r"
          />

          {steps.map((step, i) => (
            <li
              key={step.num}
              style={{ transitionDelay: visible ? `${i * 130 + 120}ms` : "0ms" }}
              className={`relative flex items-start gap-5 md:flex-col md:items-center md:gap-0 md:text-center ${r}`}
            >
              <div
                className={`font-display relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border text-lg font-bold tabular ${
                  step.final
                    ? "border-transparent bg-cta-gradient text-white shadow-[var(--shadow-cta)]"
                    : "border-navy/15 bg-white text-navy"
                }`}
              >
                {step.num}
              </div>

              <div className="md:mt-6 md:px-2">
                <h3 className="font-display text-xl font-bold tracking-tight text-navy">{step.title}</h3>
                <p className="mt-2 max-w-[30ch] text-[15px] leading-7 text-ink-soft md:mx-auto">{step.desc}</p>
              </div>
            </li>
          ))}
        </ol>

        <p
          style={{ transitionDelay: visible ? "700ms" : "0ms" }}
          className={`mx-auto mt-16 max-w-md text-center text-base text-ink-soft ${r}`}
        >
          <span className="font-display text-3xl font-bold text-orange tabular">100%</span>
          <span className="mt-1 block">verified skill matches. One central record. Easy hiring for all.</span>
        </p>
      </div>
    </section>
  );
}
