"use client";

import { Check } from "lucide-react";
import type { InputHTMLAttributes, ReactNode } from "react";
import type { CardOption } from "./data";

/**
 * 44px-tall input chrome. Borderless — depth comes from the layered shadow
 * defined by `.signup-input` (default / focus / error) in globals.css.
 */
export const inputClass =
  "signup-input h-11 w-full rounded-lg bg-white px-3.5 text-sm text-navy outline-none transition-all duration-200 placeholder:text-mediumgray/70";

function CheckCircle() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-emerald"
    >
      <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
        <path d="M3 8.5l3.5 3.5L13 5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export function FieldLabel({
  htmlFor,
  children,
  optional,
}: {
  htmlFor?: string;
  children: ReactNode;
  optional?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-navy">
      {children}
      {optional && (
        <span className="ml-1 font-normal text-mediumgray">(optional)</span>
      )}
    </label>
  );
}

export function FieldError({ show, children }: { show?: boolean; children: ReactNode }) {
  if (!show) return null;
  return <p className="mt-1 text-xs font-medium text-[#EF4444]">{children}</p>;
}

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: ReactNode;
  optional?: boolean;
  error?: string | null;
  /** Show a green check on the right when the value is valid. */
  valid?: boolean;
}

export function TextInput({
  id,
  label,
  optional,
  error,
  valid,
  className = "",
  ...rest
}: TextInputProps) {
  return (
    <div>
      <FieldLabel htmlFor={id} optional={optional}>
        {label}
      </FieldLabel>
      <div className="relative">
        <input
          id={id}
          className={`${inputClass} ${valid ? "pr-10" : ""} ${className}`}
          aria-invalid={error ? true : undefined}
          {...rest}
        />
        {valid && !error && <CheckCircle />}
      </div>
      <FieldError show={!!error}>{error}</FieldError>
    </div>
  );
}

interface SelectFieldProps {
  id: string;
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  error?: string | null;
}

export function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  placeholder = "Select an option",
  error,
}: SelectFieldProps) {
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          className={`${inputClass} cursor-pointer appearance-none pr-9 ${value ? "" : "text-mediumgray"}`}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((o) => (
            <option key={o.value} value={o.value} className="text-navy">
              {o.label}
            </option>
          ))}
        </select>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mediumgray"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <FieldError show={!!error}>{error}</FieldError>
    </div>
  );
}

const COLS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
};

interface OptionCardsProps {
  label: ReactNode;
  options: CardOption[];
  /** string for single-select, string[] for multi-select. */
  value: string | string[];
  onChange: (value: string & string[]) => void;
  multiple?: boolean;
  columns?: 1 | 2 | 3;
  error?: string | null;
}

/**
 * Compact, centered selectable cards (~2x2 grid). Selected state uses the
 * role accent (CSS vars from .signup-accent): orange for students, navy for
 * companies. Works as radios (single) or checkboxes (multi).
 */
export function OptionCards({
  label,
  options,
  value,
  onChange,
  multiple = false,
  columns = 2,
  error,
}: OptionCardsProps) {
  const isSelected = (v: string) =>
    multiple ? (value as string[]).includes(v) : value === v;

  const toggle = (v: string) => {
    if (multiple) {
      const arr = value as string[];
      const next = arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
      onChange(next as string & string[]);
    } else {
      onChange(v as string & string[]);
    }
  };

  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div role={multiple ? "group" : "radiogroup"} className={`grid gap-2.5 ${COLS[columns]}`}>
        {options.map((o) => {
          const selected = isSelected(o.value);
          return (
            <button
              key={o.value}
              type="button"
              role={multiple ? "checkbox" : "radio"}
              aria-checked={selected}
              onClick={() => toggle(o.value)}
              style={
                selected
                  ? {
                      backgroundColor: "var(--accent-tint)",
                      boxShadow: "0 0 0 1.5px var(--accent), 0 6px 16px var(--accent-focus)",
                    }
                  : undefined
              }
              className={`group relative flex min-h-[60px] items-center gap-3 rounded-xl border bg-white px-3.5 py-2.5 text-left transition-all duration-200 ${
                selected
                  ? "border-transparent"
                  : "border-lightgray/80 shadow-[0_1px_2px_rgba(17,24,39,0.04)] hover:-translate-y-0.5 hover:border-mediumgray/30 hover:shadow-[0_6px_16px_rgba(17,24,39,0.08)]"
              }`}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-navy">{o.title}</span>
                {o.desc && (
                  <span className="mt-0.5 block text-[11px] leading-tight text-mediumgray">
                    {o.desc}
                  </span>
                )}
              </span>

              <span
                aria-hidden="true"
                className={`flex h-5 w-5 shrink-0 items-center justify-center border-[1.5px] transition-colors ${
                  multiple ? "rounded-md" : "rounded-full"
                }`}
                style={
                  selected
                    ? { backgroundColor: "var(--accent)", borderColor: "var(--accent)" }
                    : { borderColor: "#cbd1db" }
                }
              >
                {selected && <Check className="h-3 w-3 text-white" strokeWidth={3.5} />}
              </span>
            </button>
          );
        })}
      </div>
      <FieldError show={!!error}>{error}</FieldError>
    </div>
  );
}
