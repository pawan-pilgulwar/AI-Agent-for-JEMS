"use client";

import { Building } from "lucide-react";

/** Shared bits for the industry portal screens. */

export const inputClass =
  "h-10 w-full rounded-lg border border-lightgray bg-white px-3 text-sm text-navy outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-mediumgray focus:border-orange focus:ring-4 focus:ring-orange/15";
export const textareaClass =
  "min-h-24 w-full resize-y rounded-lg border border-lightgray bg-white px-3 py-2 text-sm leading-6 text-navy outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-mediumgray focus:border-orange focus:ring-4 focus:ring-orange/15";
export const primaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-primary-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-cta)] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0";
export const secondaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-navy/15 bg-white px-4 py-2 text-sm font-semibold text-navy transition-colors duration-200 hover:border-orange hover:text-orange";

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-navy">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-mediumgray">{hint}</span>}
    </label>
  );
}

export function PageHead({ title, hint, company }: { title: string; hint: string; company: string }) {
  return (
    <div>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate/10 px-2.5 py-1 text-xs font-semibold text-slate"><Building className="h-3.5 w-3.5" /> {company}</span>
      <h1 className="font-display mt-3 text-[1.75rem] font-bold tracking-[-0.02em] text-navy">{title}</h1>
      <p className="mt-1 text-sm text-mediumgray">{hint}</p>
    </div>
  );
}

export const TYPE_STYLE = (type: string) =>
  /intern|apprentice/i.test(type) ? "bg-sky-50 text-sky-700" : /project/i.test(type) ? "bg-violet-50 text-violet-700" : "bg-surface text-navy";

export const STATUS_STYLE = (status: string) =>
  /offer|selected/i.test(status) ? "bg-emerald/10 text-emerald" : /interview|shortlist/i.test(status) ? "bg-slate/10 text-slate" : /reject/i.test(status) ? "bg-red-50 text-red-600" : "bg-surface text-mediumgray";

export const fmtDate = (iso: string) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "");
