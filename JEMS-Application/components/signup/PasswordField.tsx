"use client";

import { useState } from "react";
import { evaluatePassword } from "./password";
import { FieldError, FieldLabel, inputClass } from "./primitives";

/** Strength-meter colors keyed by score 0–4. */
const SEGMENT_COLOR = [
  "bg-lightgray",
  "bg-orange",
  "bg-gold",
  "bg-slate",
  "bg-emerald",
];

const LABEL_COLOR = [
  "text-mediumgray",
  "text-orange",
  "text-gold",
  "text-slate",
  "text-emerald",
];

function EyeIcon({ off }: { off?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {off ? (
        <>
          <path d="M3 3l18 18" />
          <path d="M10.6 10.6a2 2 0 002.8 2.8" />
          <path d="M9.4 5.2A9.5 9.5 0 0112 5c5 0 9 4.5 9 7a12.3 12.3 0 01-2.2 3" />
          <path d="M6.2 6.2C3.9 7.7 2.4 9.9 2.4 11c0 1.5 4 7 9.6 7a9.7 9.7 0 003.4-.6" />
        </>
      ) : (
        <>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  /** Show the strength meter + checklist (page-1 "create" field only). */
  showMeter?: boolean;
  /** The user's own info — none of it may appear in the password. */
  forbiddenTerms?: string[];
  /** Show a green check (e.g. confirm-password matches). */
  valid?: boolean;
  /** External error (e.g. "passwords don't match" on a confirm field). */
  error?: string | null;
}

export function PasswordField({
  id,
  label,
  value,
  onChange,
  placeholder = "••••••••",
  autoComplete = "new-password",
  showMeter = false,
  forbiddenTerms = [],
  valid = false,
  error,
}: PasswordFieldProps) {
  const [show, setShow] = useState(false);
  const result = evaluatePassword(value, forbiddenTerms);
  const showDetails = showMeter && value.length > 0;

  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          autoComplete={autoComplete}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          className={`${inputClass} ${valid && !error ? "pr-16" : "pr-11"}`}
        />
        {valid && !error && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-10 top-1/2 -translate-y-1/2 text-emerald"
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M3 8.5l3.5 3.5L13 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        )}
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-mediumgray transition-colors hover:text-navy"
        >
          <EyeIcon off={show} />
        </button>
      </div>

      <FieldError show={!!error}>{error}</FieldError>

      {showDetails && (
        <div className="mt-2">
          {/* Segmented strength meter */}
          <div className="flex items-center gap-2">
            <div className="flex flex-1 gap-1">
              {[1, 2, 3, 4].map((seg) => (
                <span
                  key={seg}
                  className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                    result.score >= seg ? SEGMENT_COLOR[result.score] : "bg-lightgray"
                  }`}
                />
              ))}
            </div>
            <span className={`w-16 text-right text-[11px] font-semibold ${LABEL_COLOR[result.score]}`}>
              {result.label}
            </span>
          </div>

          {/* Forbidden-pattern callout */}
          {result.patternWarning && (
            <p className="mt-2 flex items-start gap-1.5 rounded-md bg-orange/5 px-2.5 py-1.5 text-[11px] font-medium leading-snug text-orange">
              <span aria-hidden="true">⚠</span>
              <span>{result.patternWarning}</span>
            </p>
          )}

          {/* Compact requirement chips */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {result.checks.map((c) => (
              <span
                key={c.id}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${
                  c.ok
                    ? "bg-emerald/10 text-emerald"
                    : "bg-surface text-mediumgray"
                }`}
              >
                <span aria-hidden="true" className="text-[9px]">
                  {c.ok ? "✓" : "○"}
                </span>
                {c.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
