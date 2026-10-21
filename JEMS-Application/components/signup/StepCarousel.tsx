"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Horizontal slide container for multi-step forms. Panels sit side by side on
 * a track that translates by 100% per step, so advancing swipes the current
 * panel out and the next one in. Inactive panels are made `inert` (no focus /
 * pointer) and the container height animates to the active panel so the card
 * grows and shrinks smoothly between steps.
 */
export function StepCarousel({
  step,
  children,
}: {
  step: number;
  children: ReactNode[];
}) {
  const root = useRef<HTMLDivElement>(null);
  const panels = useRef<(HTMLDivElement | null)[]>([]);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const el = panels.current[step];
    if (!el) return;
    const measure = () => setHeight(el.scrollHeight);
    measure();
    // Keep height in sync as the active panel grows (e.g. validation errors).
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [step]);

  // Switching steps swaps in different content at the same scroll offset, so
  // a page scrolled down on step N can land mid-content (heading clipped)
  // on step N+1. Snap the scroll container back to the top of the new step.
  useEffect(() => {
    root.current?.closest(".overflow-y-auto")?.scrollTo({ top: 0, behavior: "auto" });
  }, [step]);

  return (
    <div
      ref={root}
      className="relative overflow-hidden transition-[height] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
      style={{ height }}
    >
      <div
        className="flex transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
        style={{ transform: `translateX(-${step * 100}%)` }}
      >
        {children.map((child, i) => (
          <div
            key={i}
            ref={(el) => {
              panels.current[i] = el;
            }}
            inert={i !== step}
            className={`w-full shrink-0 px-1 pb-1 transition-opacity duration-500 ${
              i === step ? "opacity-100" : "opacity-0"
            }`}
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}
