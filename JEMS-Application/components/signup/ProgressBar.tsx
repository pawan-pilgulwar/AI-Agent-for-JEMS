"use client";

/** Slim accent progress bar shown under the form heading. */
export function ProgressBar({
  current,
  total,
}: {
  /** 0-indexed active step. */
  current: number;
  total: number;
}) {
  const pct = ((current + 1) / total) * 100;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-lightgray">
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ width: `${pct}%`, backgroundColor: "var(--accent)" }}
      />
    </div>
  );
}
