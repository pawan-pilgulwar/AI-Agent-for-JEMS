"use client";

import { SectionHeading, revealClass, useReveal } from "./_shared";

interface Testimonial {
  name: string;
  role: string;
  quote: string;
  timeline: string;
  /** Tailwind bg classes for the avatar tile. */
  avatar: string;
}

const featured: Testimonial = {
  name: "Priya Sharma",
  role: "Senior Engineer, Google",
  quote:
    "I was stuck for 8 months. Jems got me job-ready in 4 weeks. Now earning 40% more.",
  timeline: "4 weeks on Jems",
  avatar: "bg-cta-gradient",
};

const others: Testimonial[] = [
  {
    name: "Raj Patel",
    role: "Data Engineer, Amazon",
    quote: "Mock interviews were the difference. I went from scared to confident in three sessions.",
    timeline: "6 weeks on Jems",
    avatar: "bg-primary-gradient",
  },
  {
    name: "Alex Chen",
    role: "Frontend Developer, Microsoft",
    quote: "The roadmap was exactly what I needed. No wasted time on things I already knew.",
    timeline: "5 weeks on Jems",
    avatar: "bg-gradient-to-br from-emerald to-navy",
  },
  {
    name: "Sara Williams",
    role: "ML Engineer, Netflix",
    quote: "From zero callbacks to four offers. The match scores told me exactly what to fix.",
    timeline: "7 weeks on Jems",
    avatar: "bg-gradient-to-br from-gold to-orange",
  },
];

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function Person({ t, light = false }: { t: Testimonial; light?: boolean }) {
  return (
    <figcaption className="flex items-center gap-3.5">
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white ${t.avatar}`}
        aria-hidden="true"
      >
        {initials(t.name)}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block truncate font-semibold ${light ? "text-white" : "text-navy"}`}>{t.name}</span>
        <span className={`block truncate text-sm ${light ? "text-white/65" : "text-mediumgray"}`}>{t.role}</span>
      </span>
      <span
        className={`hidden shrink-0 text-xs font-medium sm:block ${light ? "text-orange-200" : "text-orange"}`}
      >
        {t.timeline}
      </span>
    </figcaption>
  );
}

/** Social proof — one featured story and three supporting quotes. */
export default function SocialProof() {
  const { ref, visible } = useReveal<HTMLElement>();
  const r = revealClass(visible);

  return (
    <section id="success" ref={ref} className="bg-transparent">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <SectionHeading
          className={r}
          title="Real students. Real offers."
          lede="What changed for people who stopped guessing what recruiters wanted."
        />

        <div className="mt-14 grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Featured */}
          <figure
            style={{ transitionDelay: visible ? "100ms" : "0ms" }}
            className={`relative flex flex-col justify-center overflow-hidden rounded-3xl bg-navy p-8 text-white shadow-[var(--shadow-card)] sm:p-12 lg:col-span-7 ${r}`}
          >
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
              <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-orange/25 blur-3xl" />
            </div>
            <blockquote className="font-display relative max-w-[18ch] text-3xl font-medium leading-[1.15] tracking-[-0.02em] sm:text-[2.75rem]">
              “{featured.quote}”
            </blockquote>
            <dl className="relative mt-10 flex gap-10 border-t border-white/10 pt-8">
              <div>
                <dt className="text-xs text-white/55">Stuck for</dt>
                <dd className="font-display mt-1 text-2xl font-bold tabular">8 months</dd>
              </div>
              <div>
                <dt className="text-xs text-white/55">Job-ready in</dt>
                <dd className="font-display mt-1 text-2xl font-bold text-orange-300 tabular">4 weeks</dd>
              </div>
              <div>
                <dt className="text-xs text-white/55">Salary</dt>
                <dd className="font-display mt-1 text-2xl font-bold text-emerald tabular">+40%</dd>
              </div>
            </dl>
            <div className="relative mt-8">
              <Person t={featured} light />
            </div>
          </figure>

          {/* Supporting */}
          <div className="grid gap-4 lg:col-span-5">
            {others.map((t, i) => (
              <figure
                key={t.name}
                style={{ transitionDelay: visible ? `${i * 90 + 200}ms` : "0ms" }}
                className={`flex flex-col gap-5 rounded-3xl border border-navy/[0.07] bg-white p-6 shadow-[var(--shadow-soft)] ${r}`}
              >
                <blockquote className="text-[15px] leading-7 text-navy">“{t.quote}”</blockquote>
                <Person t={t} />
              </figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
