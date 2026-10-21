"use client";

import { useState } from "react";
import { OtpModal } from "./OtpModal";
import { FieldError, FieldLabel, inputClass } from "./primitives";

interface VerifiableFieldProps {
  id: string;
  label: string;
  type: "email" | "tel";
  channel: "email" | "phone";
  value: string;
  onChange: (value: string) => void;
  verified: boolean;
  onVerified: () => void;
  /** True once the value is well-formed enough to "send" a code. */
  canVerify: boolean;
  placeholder?: string;
  optional?: boolean;
  autoComplete?: string;
  error?: string | null;
  /** Role accent — forwarded to the (portaled) OTP modal. */
  accent?: string;
}

/**
 * Text input paired with an OTP "Verify" affordance and a verified badge.
 * Editing a verified value clears its verified state (handled by the parent
 * via onChange resetting `verified`).
 */
export function VerifiableField({
  id,
  label,
  type,
  channel,
  value,
  onChange,
  verified,
  onVerified,
  canVerify,
  placeholder,
  optional,
  autoComplete,
  error,
  accent = "#ea580c",
}: VerifiableFieldProps) {
  const [otpOpen, setOtpOpen] = useState(false);

  return (
    <div>
      <FieldLabel htmlFor={id} optional={optional}>
        {label}
      </FieldLabel>
      <div className="flex items-stretch gap-2">
        <input
          id={id}
          type={type}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          className={`${inputClass} flex-1`}
        />
        {verified ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border-[1.5px] border-emerald/20 bg-emerald/10 px-3.5 text-sm font-semibold text-emerald">
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M3 8.5l3.5 3.5L13 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Verified
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setOtpOpen(true)}
            disabled={!canVerify}
            style={
              canVerify
                ? { color: "var(--accent)", borderColor: "var(--accent)", backgroundColor: "var(--accent-tint)" }
                : undefined
            }
            className="signup-chip-btn shrink-0 rounded-lg bg-white px-4 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:text-mediumgray"
          >
            Verify
          </button>
        )}
      </div>
      <FieldError show={!!error}>{error}</FieldError>

      {otpOpen && (
        <OtpModal
          channel={channel}
          destination={value}
          accent={accent}
          onClose={() => setOtpOpen(false)}
          onVerified={() => {
            onVerified();
            setOtpOpen(false);
          }}
        />
      )}
    </div>
  );
}
