import type { ComponentType, HTMLAttributes, ReactNode, Ref } from "react";
import Link from "next/link";

/** Standard dashboard surface — soft border + subtle shadow, no gradients. */
export function Card({
  children,
  className = "",
  ref,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  ref?: Ref<HTMLDivElement>;
} & Omit<HTMLAttributes<HTMLDivElement>, "className" | "children">) {
  return (
    <div
      ref={ref}
      {...rest}
      className={`rounded-2xl border border-navy/[0.06] bg-white shadow-[var(--shadow-soft)] ${className}`}
    >
      {children}
    </div>
  );
}

export function ProgressBar({
  value,
  barClass = "bg-slate",
}: {
  value: number;
  barClass?: string;
}) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-lightgray">
      <div
        className={`h-full rounded-full transition-[width] duration-500 ${barClass}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-sm font-semibold text-navy">{children}</h2>;
}

/**
 * Friendly empty state shown when a student hasn't worked on a section yet —
 * an icon, a short headline, a hint and a call-to-action that points them to
 * the place where they can "add this" to get started.
 */
export function EmptyState({
  icon: Icon,
  title,
  hint,
  ctaLabel,
  ctaHref,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  hint: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange/10 text-orange">
        <Icon className="h-7 w-7" />
      </span>
      <p className="font-display mt-4 text-lg font-bold tracking-tight text-navy">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-mediumgray">{hint}</p>
      {ctaLabel && ctaHref && (
        <Link
          href={ctaHref}
          className="mt-5 inline-flex items-center justify-center rounded-lg bg-primary-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-cta)] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
        >
          {ctaLabel}
        </Link>
      )}
    </Card>
  );
}

/** The student's profile picture, or their initial when they haven't picked one. */
export function UserAvatar({ name, image }: { name: string; image: string | null }) {
  const initial = name.trim().charAt(0).toUpperCase() || "U";
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={image} alt="" className="h-9 w-9 shrink-0 rounded-full bg-surface object-cover ring-2 ring-orange/15" />
    );
  }
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange text-sm font-semibold text-white ring-2 ring-orange/15">
      {initial}
    </span>
  );
}

/** Controlled switch used in Settings / notifications. */
export function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        checked ? "bg-slate" : "bg-lightgray"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
