"use client";

import { ArrowRight } from "lucide-react";
import { revealClass, useReveal } from "./_shared";

interface FinalCTAProps {
  onStartLearning?: () => void;
  onForCompanies?: () => void;
}

/**
 * Final conversion push before the footer. A warm panel rather than another
 * dark block — the footer immediately below is the page's dark anchor.
 */
export default function FinalCTA({ onStartLearning, onForCompanies }: FinalCTAProps) {
  const { ref, visible } = useReveal<HTMLElement>();
  const r = revealClass(visible);

  return (
    <section id="get-started" ref={ref} className="bg-transparent">
      <div className="mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6 lg:px-8">
        <div
          className={`relative overflow-hidden rounded-[2rem] border border-orange/15 bg-gradient-to-br from-[#fff4ea] via-[#fff8f0] to-[#fffdfa] px-6 py-16 shadow-[var(--shadow-soft)] sm:px-12 sm:py-20 lg:px-16 ${r}`}
        >
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-orange/15 blur-3xl" />
            <div className="absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-gold/15 blur-3xl" />
          </div>

          <div className="relative grid gap-10 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7">
              <h2 className="font-display max-w-[16ch] text-[2.5rem] font-bold leading-[1] tracking-[-0.03em] text-navy sm:text-6xl">
                Stop guessing what recruiters want.
              </h2>
              <p className="mt-5 max-w-[46ch] text-lg leading-8 text-ink-soft">
                Join 500+ students who replaced the résumé lottery with verified skills and a plan.
              </p>
            </div>

            <div className="flex flex-col gap-3 lg:col-span-5 lg:items-end">
              <button
                type="button"
                onClick={onStartLearning}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-cta-gradient px-8 py-4 text-base font-semibold text-white shadow-[var(--shadow-cta)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-6px_rgba(234,88,12,0.5)] active:translate-y-0 sm:w-auto lg:w-full lg:max-w-xs"
              >
                Start learning free
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </button>
              <button
                type="button"
                onClick={onForCompanies}
                className="inline-flex w-full items-center justify-center rounded-full border border-navy/20 bg-white/60 px-8 py-4 text-base font-semibold text-navy backdrop-blur-sm transition-colors duration-200 hover:border-navy hover:bg-navy hover:text-white sm:w-auto lg:w-full lg:max-w-xs"
              >
                I&apos;m hiring
              </button>
              <p className="text-sm text-mediumgray lg:text-right">Free plan. No card needed.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
