"use client";

import { useEffect, useRef, useState } from "react";

/** Scroll-into-view reveal. Returns a ref to attach and a `visible` flag. */
export function useReveal<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

/** Shared reveal transition classes — a short lift, not a slide. */
export function revealClass(visible: boolean): string {
  return `transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
    visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
  }`;
}

/**
 * Section heading block. The heading carries its own weight — no kicker
 * above it. `lede` is the one-line supporting sentence.
 */
export function SectionHeading({
  title,
  lede,
  align = "left",
  className = "",
}: {
  title: React.ReactNode;
  lede?: React.ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div className={`${align === "center" ? "mx-auto text-center" : ""} max-w-2xl ${className}`}>
      <h2 className="font-display text-[2rem] font-bold leading-[1.05] tracking-[-0.025em] text-navy sm:text-[2.75rem]">
        {title}
      </h2>
      {lede && (
        <p className={`mt-4 text-lg leading-8 text-ink-soft ${align === "center" ? "mx-auto" : ""} max-w-[56ch]`}>
          {lede}
        </p>
      )}
    </div>
  );
}
