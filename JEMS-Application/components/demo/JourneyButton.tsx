"use client";

import { useFormStatus } from "react-dom";
import { ArrowRight, Loader2 } from "lucide-react";

export type JourneyTone = "student" | "company" | "faculty" | "institution";

interface JourneyButtonProps {
  action: () => Promise<void>;
  label: string;
  pendingLabel: string;
  tone: JourneyTone;
  dataTour?: string;
}

const TONE_CLASSES: Record<JourneyTone, string> = {
  student: "bg-cta-gradient shadow-[var(--shadow-cta)]",
  company: "bg-navy shadow-[var(--shadow-card)]",
  faculty: "bg-gradient-to-r from-violet-600 to-purple-600 shadow-[0_4px_14px_-2px_rgba(124,58,237,0.35)]",
  institution: "bg-gradient-to-r from-teal-600 to-emerald-600 shadow-[0_4px_14px_-2px_rgba(13,148,136,0.35)]",
};

function Submit({
  label,
  pendingLabel,
  tone,
}: Pick<JourneyButtonProps, "label" | "pendingLabel" | "tone">) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`group flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3.5 text-[15px] font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:translate-y-0 disabled:opacity-80 ${TONE_CLASSES[tone]}`}
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {pendingLabel}
        </>
      ) : (
        <>
          {label}
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </>
      )}
    </button>
  );
}

/** Signs the visitor into the shared demo account and lands them on its dashboard. */
export default function JourneyButton({
  action,
  label,
  pendingLabel,
  tone,
  dataTour,
}: JourneyButtonProps) {
  return (
    <form action={action} data-tour={dataTour}>
      <Submit label={label} pendingLabel={pendingLabel} tone={tone} />
    </form>
  );
}
