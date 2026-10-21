"use client";

import Image from "next/image";
import type { TooltipRenderProps } from "react-joyride";

export interface TourAvatar {
  src: string;
  width: number;
  height: number;
  /** Which side of the tooltip he stands on, so he points outward at the target. */
  side: "left" | "right";
  /** Direction he points -- drives the idle nudge. "none" is a static pose. */
  point: "left" | "right" | "down" | "none";
}

export interface TourChoice {
  label: string;
  goTo: number;
  tone: "student" | "company";
}

export interface TourStepData {
  avatar?: TourAvatar;
  /** Renders a branch picker instead of the Next button. */
  choice?: TourChoice[];
  /** Replaces the "n of m" counter, which is meaningless once the tour branches. */
  progress?: string;
  /** Back returns here rather than to the previous index. */
  backTo?: number;
  /** Last step of a branch: the primary button ends the tour. */
  endsBranch?: boolean;
  onFinish?: () => void;
}

export default function TourTooltip({
  index,
  size,
  step,
  isLastStep,
  controls,
  backProps,
  primaryProps,
  skipProps,
  tooltipProps,
}: TooltipRenderProps) {
  const data = (step.data ?? {}) as TourStepData;
  const { avatar, choice, progress, backTo, endsBranch, onFinish } = data;

  return (
    <div
      {...tooltipProps}
      className="w-[min(45rem,calc(100vw-2rem))] rounded-2xl bg-navy p-8 shadow-[var(--shadow-lift)]"
    >
      <div
        className={`flex items-end gap-6 ${
          avatar?.side === "right" ? "flex-row-reverse" : "flex-row"
        }`}
      >
        {avatar && (
          // key=index remounts on every step so the pop-in replays, even when
          // two consecutive steps share the same pose.
          <div key={index} className="tour-avatar-in shrink-0">
            <div className={avatar.point === "none" ? "" : `tour-nudge-${avatar.point}`}>
              <Image
                src={avatar.src}
                alt=""
                width={avatar.width}
                height={avatar.height}
                className="h-40 w-auto drop-shadow-[0_12px_22px_rgba(0,0,0,0.38)]"
              />
            </div>
          </div>
        )}
        <p className="flex-1 self-center text-[20px] leading-[1.65] text-stone-200">
          {step.content}
        </p>
      </div>

      {choice ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {choice.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => controls.go(c.goTo)}
              className={`rounded-xl px-5 py-4 text-[17px] font-semibold transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0 ${
                c.tone === "student"
                  ? "bg-cta-gradient text-white"
                  : "bg-white text-navy hover:bg-white/90"
              }`}
            >
              {c.label}
            </button>
          ))}
          <button
            type="button"
            {...skipProps}
            className="col-span-full rounded-md py-2 text-[15px] font-medium text-white/65 transition-colors hover:text-white"
          >
            Skip the tour
          </button>
        </div>
      ) : (
        <div className="mt-7 flex items-center justify-between border-t border-white/10 pt-5">
          <span className="tabular text-[15px] font-medium text-white/60">
            {progress ?? `${index + 1} of ${size}`}
          </span>

          <div className="flex items-center gap-1.5">
            <button
              {...skipProps}
              className="rounded-lg px-4 py-2.5 text-[15px] font-medium text-white/65 transition-colors hover:bg-white/10 hover:text-white"
            >
              Skip
            </button>
            {(index > 0 || backTo !== undefined) && (
              <button
                {...backProps}
                onClick={(e) =>
                  backTo === undefined ? backProps.onClick(e) : controls.go(backTo)
                }
                className="rounded-lg px-4 py-2.5 text-[15px] font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                Back
              </button>
            )}
            <button
              {...primaryProps}
              onClick={(e) =>
                endsBranch ? onFinish?.() : primaryProps.onClick(e)
              }
              className="bg-cta-gradient rounded-lg px-7 py-2.5 text-[15px] font-semibold text-white transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0"
            >
              {endsBranch || isLastStep ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
