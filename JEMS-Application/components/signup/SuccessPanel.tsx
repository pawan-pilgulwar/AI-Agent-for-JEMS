"use client";

interface SuccessPanelProps {
  title: string;
  message: string;
  ctaLabel: string;
  onCta: () => void;
  /** Seconds shown in the auto-redirect note. */
  redirectIn: number;
}

/** Shared page-3 success screen for both signup flows. */
export function SuccessPanel({
  title,
  message,
  ctaLabel,
  onCta,
  redirectIn,
}: SuccessPanelProps) {
  return (
    <div className="py-6 text-center" style={{ animation: "fade-in 0.4s ease-out" }}>
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-navy/5">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-navy text-white shadow-[var(--shadow-soft)]">
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={3}>
            <path d="M4 12.5l5 5L20 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>

      <h2 className="mt-6 text-2xl font-extrabold tracking-tight text-navy">
        {title}
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-7 text-mediumgray">
        {message}
      </p>

      <button
        type="button"
        onClick={onCta}
        className="mt-7 w-full rounded-full bg-navy px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1f2937] sm:w-auto sm:px-10"
      >
        {ctaLabel}
      </button>

      <p className="mt-4 flex items-center justify-center gap-2 text-xs text-mediumgray">
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-lightgray border-t-navy" />
        Taking you to your dashboard in {redirectIn}s…
      </p>
    </div>
  );
}
