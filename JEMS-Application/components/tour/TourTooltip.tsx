"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import type { TooltipRenderProps } from "react-joyride";
import { PILLAR_STYLE, type TourPillar } from "./tours";

/** Guide poses in /public/avatar, named by where the guide is pointing. */
type Pose =
  | "welcome"
  | "point-left"
  | "point-right"
  | "point-down"
  | "point-down-left"
  | "point-down-right"
  | "point-up-left"
  | "point-up-right";

const POSES: Pose[] = [
  "welcome",
  "point-left",
  "point-right",
  "point-down",
  "point-down-left",
  "point-down-right",
  "point-up-left",
  "point-up-right",
];

/** Poses whose pointing hand is on the right sit on the card's right edge. */
const SITS_RIGHT = new Set<Pose>(["point-right", "point-down-right", "point-up-right"]);

/**
 * Works out which way the guide should point from where Joyride actually put
 * the tooltip. Joyride flips placements when space runs out and doesn't tell
 * a custom tooltip, so measure instead of trusting `step.placement`.
 */
function poseFor(card: DOMRect, target: DOMRect | null, fallback: string): Pose {
  if (!target || fallback === "center") return "welcome";

  const gap = 4;
  const dx = target.left + target.width / 2 - (card.left + card.width / 2);
  const leanRight = dx > 0;
  const straight = Math.abs(dx) < card.width * 0.2;

  if (card.left >= target.right - gap) return "point-left";
  if (card.right <= target.left + gap) return "point-right";
  if (card.top >= target.bottom - gap) return leanRight ? "point-up-right" : "point-up-left";
  if (card.bottom <= target.top + gap) {
    if (straight) return "point-down";
    return leanRight ? "point-down-right" : "point-down-left";
  }

  // Tooltip overlaps the target (e.g. a very tall card) — go by the request.
  if (fallback.startsWith("right")) return "point-left";
  if (fallback.startsWith("left")) return "point-right";
  if (fallback.startsWith("bottom")) return "point-up-left";
  return "point-down";
}

/** Joyride tooltip restyled to the app's card language, with the guide avatar and SIH pillar chip. */
export function TourTooltip({
  step,
  index,
  size,
  isLastStep,
  backProps,
  primaryProps,
  skipProps,
  closeProps,
  tooltipProps,
}: TooltipRenderProps) {
  const pillar = (step.data as { pillar?: TourPillar } | undefined)?.pillar;
  const cardRef = useRef<HTMLDivElement>(null);
  const [pose, setPose] = useState<Pose>(step.placement === "center" ? "welcome" : "point-down");

  // Warm the cache so switching poses between steps doesn't flash.
  useEffect(() => {
    for (const p of POSES) {
      const img = new window.Image();
      img.src = `/avatar/${p}.png`;
    }
  }, []);

  // Follow the tooltip as Floating UI positions, flips and scrolls it.
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const card = cardRef.current;
      if (card) {
        const target =
          typeof step.target === "string"
            ? document.querySelector(step.target)
            : step.target instanceof HTMLElement
              ? step.target
              : null;
        const next = poseFor(
          card.getBoundingClientRect(),
          target?.getBoundingClientRect() ?? null,
          step.placement,
        );
        setPose((prev) => (prev === next ? prev : next));
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [step.target, step.placement]);

  const isWelcome = pose === "welcome";
  const onRight = SITS_RIGHT.has(pose);

  return (
    <div
      {...tooltipProps}
      ref={cardRef}
      className={`flex ${isWelcome ? "w-[min(94vw,700px)]" : "w-[min(92vw,460px)]"} overflow-hidden rounded-2xl border border-lightgray bg-white text-left shadow-[0_16px_48px_-12px_rgba(17,24,39,0.35)] ${
        onRight ? "flex-row-reverse" : "flex-row"
      }`}
    >
      {/* Guide — anchored to the card's bottom edge, pointing at the target. */}
      <div
        aria-hidden="true"
        className={`relative flex shrink-0 items-end justify-center self-stretch bg-orange/[0.06] ${
          isWelcome ? "w-[120px] sm:w-[240px]" : "w-[88px] sm:w-[112px]"
        } ${
          onRight ? "border-l" : "border-r"
        } border-lightgray/70`}
      >
        <Image
          key={pose}
          src={`/avatar/${pose}.png`}
          alt=""
          width={isWelcome ? 725 : 500}
          height={isWelcome ? 946 : 520}
          sizes="240px"
          className={`avatar-rise w-full object-contain object-bottom ${
            isWelcome ? "max-h-[380px] px-4 pb-5" : "max-h-[160px]"
          }`}
        />
      </div>

      <div className={`min-w-0 flex-1 ${isWelcome ? "p-6 sm:p-8" : "p-5"}`}>
        <div className="flex items-start justify-between gap-3">
          {pillar ? (
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${PILLAR_STYLE[pillar]}`}>
              {pillar}
            </span>
          ) : (
            <span />
          )}
          <button
            {...closeProps}
            type="button"
            className="-mr-1 -mt-1 flex h-7 w-7 items-center justify-center rounded-lg text-mediumgray transition-colors hover:bg-surface hover:text-navy"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {step.title && (
          <h3 className={`mt-3 font-bold text-navy ${isWelcome ? "text-2xl" : "text-base"}`}>{step.title}</h3>
        )}
        <div className={`mt-1.5 leading-relaxed text-mediumgray ${isWelcome ? "text-base" : "text-sm"}`}>
          {step.content}
        </div>

        {/* Step dots */}
        <div className="mt-4 flex items-center gap-1" aria-hidden>
          {Array.from({ length: size }, (_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-5 bg-slate" : i < index ? "w-1.5 bg-slate/40" : "w-1.5 bg-lightgray"
              }`}
            />
          ))}
          <span className="ml-auto text-[11px] font-medium tabular-nums text-mediumgray">
            {index + 1} / {size}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          {!isLastStep ? (
            <button
              {...skipProps}
              type="button"
              className="text-xs font-medium text-mediumgray transition-colors hover:text-navy"
            >
              Skip tour
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            {index > 0 && (
              <button
                {...backProps}
                type="button"
                className="inline-flex items-center gap-1 rounded-lg border border-lightgray bg-white px-3 py-2 text-sm font-semibold text-navy transition-colors hover:border-slate hover:text-slate"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            )}
            <button
              {...primaryProps}
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-gradient px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(234,88,12,0.25)] transition-transform hover:-translate-y-0.5"
            >
              {isLastStep ? (
                <>
                  Done <Check className="h-4 w-4" />
                </>
              ) : (
                <>
                  Next <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
