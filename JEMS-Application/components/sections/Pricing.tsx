"use client";

import { Check } from "lucide-react";
import { SectionHeading, revealClass, useReveal } from "./_shared";

interface PricingProps {
  onStartFree?: () => void;
  onStartPro?: () => void;
}

const freeFeatures = [
  "Basic profile",
  "1 resume version",
  "2 mock interviews / month",
  "Job recommendations (limited)",
  "Community support",
];

const proFeatures = [
  "Everything in Free",
  "Unlimited resumes",
  "Unlimited mock interviews",
  "Personalized learning path",
  "1-on-1 career mentor (monthly)",
  "Priority job matching",
];

function Feature({ children, tone }: { children: string; tone: "navy" | "orange" }) {
  return (
    <li className="flex items-start gap-3 text-[15px] text-navy">
      <span
        aria-hidden="true"
        className={`mt-1 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full ${
          tone === "orange" ? "bg-orange text-white" : "bg-navy/10 text-navy"
        }`}
      >
        <Check className="h-3 w-3" strokeWidth={3} />
      </span>
      {children}
    </li>
  );
}

/** Pricing — two tiers, unauthenticated visitors only. */
export default function Pricing({ onStartFree, onStartPro }: PricingProps) {
  const { ref, visible } = useReveal<HTMLElement>();
  const r = revealClass(visible);

  return (
    <section id="pricing" ref={ref} className="bg-transparent">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <SectionHeading
          className={r}
          align="center"
          title="Start free. Upgrade when it pays for itself."
          lede="No contracts. Cancel anytime."
        />

        <div className="mx-auto mt-14 grid max-w-4xl grid-cols-1 gap-4 md:grid-cols-2 md:items-stretch">
          {/* Free */}
          <div
            style={{ transitionDelay: visible ? "120ms" : "0ms" }}
            className={`flex flex-col rounded-3xl border border-navy/[0.07] bg-white p-8 shadow-[var(--shadow-soft)] ${r}`}
          >
            <h3 className="font-display text-xl font-bold text-navy">Free</h3>
            <p className="mt-4 flex items-baseline gap-1">
              <span className="font-display text-5xl font-bold tracking-tight text-navy tabular">$0</span>
              <span className="text-sm text-mediumgray">/month</span>
            </p>
            <p className="mt-2 min-h-10 text-sm text-ink-soft">Enough to verify your first skills and see where you stand.</p>
            <ul className="mt-6 flex-1 space-y-3">
              {freeFeatures.map((f) => (
                <Feature key={f} tone="navy">
                  {f}
                </Feature>
              ))}
            </ul>
            <button
              type="button"
              onClick={onStartFree}
              className="mt-8 w-full rounded-full border border-navy/20 px-5 py-3 text-sm font-semibold text-navy transition-colors duration-200 hover:border-navy hover:bg-navy hover:text-white"
            >
              Start free
            </button>
          </div>

          {/* Pro (highlighted) */}
          <div
            style={{ transitionDelay: visible ? "220ms" : "0ms" }}
            className={`relative flex flex-col overflow-hidden rounded-3xl bg-navy p-8 text-white shadow-[var(--shadow-card)] ${r}`}
          >
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
              <div className="absolute -right-16 -top-20 h-60 w-60 rounded-full bg-orange/30 blur-3xl" />
            </div>
            <div className="relative flex items-center justify-between">
              <h3 className="font-display text-xl font-bold">Pro</h3>
              <span className="text-xs font-semibold text-orange-200">Most popular</span>
            </div>
            <p className="relative mt-4 flex items-baseline gap-1">
              <span className="font-display text-5xl font-bold tracking-tight tabular">$99</span>
              <span className="text-sm text-white/60">/month</span>
            </p>
            <p className="relative mt-2 min-h-10 text-sm text-white/70">For a focused sprint to your first offer.</p>
            <ul className="relative mt-6 flex-1 space-y-3 [&_li]:text-white">
              {proFeatures.map((f) => (
                <Feature key={f} tone="orange">
                  {f}
                </Feature>
              ))}
            </ul>
            <button
              type="button"
              onClick={onStartPro}
              className="relative mt-8 w-full rounded-full bg-cta-gradient px-5 py-3 text-sm font-semibold text-white shadow-[var(--shadow-cta)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-6px_rgba(234,88,12,0.5)] active:translate-y-0"
            >
              Start Pro
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
