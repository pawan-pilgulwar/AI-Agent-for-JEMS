"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

interface WelcomeBannerProps {
  onStartTour: () => void;
  onDismiss: () => void;
}

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/** Full-screen greeting: the avatar leads, then a short line and one way in. */
export default function WelcomeBanner({ onStartTour, onDismiss }: WelcomeBannerProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const restoreTo = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onDismiss();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const items = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => !el.hasAttribute("disabled"));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      restoreTo?.focus?.();
    };
  }, [onDismiss]);

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-heading"
      tabIndex={-1}
      className="animate-fade-in fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto bg-[#fffdfa] px-6 py-12"
    >
      {/* Canvas texture kept on an inert layer so it never eats clicks. */}
      <div
        aria-hidden="true"
        className="bg-page-canvas pointer-events-none absolute inset-0 -z-10"
      />

      <Image
        src="/logo.png"
        alt="JEMS"
        width={782}
        height={697}
        priority
        className="absolute left-6 top-5 h-11 w-auto"
      />

      {/* Avatar */}
      <div className="avatar-rise flex flex-col items-center">
        <div className="avatar-bob">
          <Image
            src="/avatar/welcome.png"
            alt=""
            width={725}
            height={946}
            priority
            className="h-[min(34vh,14rem)] w-auto drop-shadow-[0_18px_28px_rgba(17,24,39,0.14)] sm:h-[min(42vh,19rem)] lg:h-[min(48vh,23rem)]"
          />
        </div>
        <div
          aria-hidden="true"
          className="avatar-shadow -mt-5 h-3.5 w-36 rounded-[50%] bg-navy blur-[7px] sm:w-44"
        />
      </div>

      {/* Copy */}
      <h1
        id="welcome-heading"
        className="font-display mt-10 text-center text-3xl font-bold tracking-tight text-navy sm:text-4xl"
      >
        Welcome to JEMS
      </h1>

      <p className="mt-3 max-w-[48ch] text-center text-[15px] leading-7 text-ink-soft">
        You&apos;re looking at the JEMS portal, where students build the
        skills that industry needs with proper guidance, companies hire with ease,
        academicians grow through FDPs, and institutions monitor progress
        every step of the way.
      </p>

      <button
        type="button"
        onClick={onStartTour}
        className="bg-cta-gradient group mt-9 inline-flex items-center justify-center gap-2 rounded-lg px-8 py-3.5 text-[15px] font-semibold text-white shadow-[var(--shadow-cta)] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
      >
        Start the journey
        <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
      </button>
    </div>
  );
}
