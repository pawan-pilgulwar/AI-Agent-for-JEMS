"use client";

import type { ReactNode } from "react";
import { AddButton } from "./fields";

interface FormSectionProps {
  title: string;
  subtitle?: string;
  count?: string;
  addLabel?: string;
  onAdd?: () => void;
  children: ReactNode;
}

export function FormSection({
  title,
  subtitle,
  count,
  addLabel,
  onAdd,
  children,
}: FormSectionProps) {
  return (
    <section className="rounded-lg border border-lightgray bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-navy">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-mediumgray">{subtitle}</p>}
          {count && <p className="mt-0.5 text-xs font-medium text-slate">{count}</p>}
        </div>
        {onAdd && addLabel && <AddButton onClick={onAdd}>{addLabel}</AddButton>}
      </div>
      {children}
    </section>
  );
}

/** Sub-card for a single repeatable entry (experience, education, etc.). */
export function EntryCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-lightgray bg-[#fcfcfd] p-4">{children}</div>
  );
}
