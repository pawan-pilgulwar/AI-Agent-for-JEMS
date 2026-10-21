"use client";

import { ArrowRight, Building2, Check, GraduationCap } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";

interface RoleChoiceProps {
  onSelect: (role: "student" | "company") => void;
}

const ROLES = [
  {
    role: "student" as const,
    Icon: GraduationCap,
    title: "I'm a Student",
    subtitle: "Build job-ready skills and land the role you want.",
    perks: ["Personalized learning", "Mock interviews", "Smart job matches"],
    accent: "#ea580c",
    tint: "#fff3e6",
    shadow: "rgba(234, 88, 12, 0.24)",
  },
  {
    role: "company" as const,
    Icon: Building2,
    title: "I'm a Company",
    subtitle: "Find and hire pre-screened, skill-matched talent.",
    perks: ["Vetted candidates", "Smart matching", "Faster hiring"],
    accent: "#111827",
    tint: "#f5f2ec",
    shadow: "rgba(17, 24, 39, 0.2)",
  },
];

/** First step — pick Student or Company (two modern, side-by-side cards). */
export default function RoleChoice({ onSelect }: RoleChoiceProps) {
  return (
    <div style={{ animation: "fade-in 0.3s ease-out" }}>
      <div className="text-center">
        <h1 className="font-display text-4xl font-bold tracking-[-0.025em] text-navy">
          Create your account
        </h1>
        <p className="mt-2 text-[15px] text-mediumgray">
          Choose how you&apos;d like to get started.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
        {ROLES.map(({ role, Icon, title, subtitle, perks, accent, tint, shadow }) => (
          <button
            key={role}
            type="button"
            onClick={() => onSelect(role)}
            style={
              {
                "--rc-accent": accent,
                "--rc-tint": tint,
                "--rc-shadow": shadow,
              } as CSSProperties
            }
            className="group relative flex flex-col items-start rounded-2xl border border-lightgray bg-white p-6 text-left shadow-[0_1px_3px_rgba(0,0,0,0.04)] outline-none transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_44px_var(--rc-shadow)] focus-visible:shadow-[0_20px_44px_var(--rc-shadow)]"
          >
            {/* Accent hairline that draws in on hover. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-transparent transition-colors duration-300 group-hover:ring-[color:var(--rc-accent)] group-focus-visible:ring-[color:var(--rc-accent)]"
            />

            <span
              className="flex h-14 w-14 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105"
              style={{ backgroundColor: "var(--rc-tint)", color: "var(--rc-accent)" }}
            >
              <Icon className="h-7 w-7" strokeWidth={2} />
            </span>

            <h2 className="font-display mt-5 text-xl font-bold tracking-tight text-navy">{title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-mediumgray">{subtitle}</p>

            <ul className="mt-4 space-y-2">
              {perks.map((perk) => (
                <li key={perk} className="flex items-center gap-2 text-sm text-navy/80">
                  <span
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: "var(--rc-tint)", color: "var(--rc-accent)" }}
                  >
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  </span>
                  {perk}
                </li>
              ))}
            </ul>

            <span
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold"
              style={{ color: "var(--rc-accent)" }}
            >
              Continue
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </span>
          </button>
        ))}
      </div>

      <p className="mt-8 text-center text-sm text-mediumgray">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-navy hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
