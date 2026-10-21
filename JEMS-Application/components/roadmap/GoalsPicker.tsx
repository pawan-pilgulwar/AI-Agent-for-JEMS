"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CircleCheck, LoaderCircle, Sparkles, X } from "lucide-react";
import DashboardShell, { DashboardContainer } from "@/components/dashboard/student/DashboardShell";
import { Card } from "@/components/dashboard/student/ui";
import type { StudentGoals } from "@/lib/db/roadmap";
import { CAREER_PATHS } from "@/lib/roadmap/data";
import { careerIcon } from "./career-icons";

/**
 * Career-goals picker: choose a path, set a target package / dream company,
 * then generate the roadmap. Pre-selects the path suggested from the signup
 * `targetRole` so a first-time student can confirm in one click.
 */
export default function GoalsPicker({
  initial,
  suggestedPath,
}: {
  initial: StudentGoals | null;
  suggestedPath: string | null;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(initial?.careerPath ?? suggestedPath);
  const [targetPackage, setTargetPackage] = useState(initial?.targetPackage ?? "");
  const [targetCompany, setTargetCompany] = useState(initial?.targetCompany ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState("");

  const selectedData = CAREER_PATHS.find((c) => c.id === selected);
  const isFirstTime = !initial;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setStatus("saving");
    setError("");
    try {
      const res = await fetch("/api/student/goals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ careerPath: selected, targetPackage, targetCompany }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not save your goals.");
      // `fresh` shows the one-time "generating your roadmap" animation.
      router.push(`/student/roadmap?fresh=1`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your goals.");
      setStatus("error");
    }
  };

  return (
    <DashboardShell>
      <DashboardContainer className="space-y-6">
        {/* Heading */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate/10 px-2.5 py-1 text-xs font-semibold text-slate">
              <Sparkles className="h-3.5 w-3.5" />
              {isFirstTime ? "Step 1 of 2" : "Update goals"}
            </span>
            <h1 className="mt-3 text-2xl font-bold text-navy">Choose your career path</h1>
            <p className="mt-1 text-sm text-mediumgray">
              {suggestedPath && isFirstTime
                ? "We pre-selected a path from your signup answers — change it if you like."
                : "Pick the role you're aiming for and we'll build a step-by-step roadmap."}
            </p>
          </div>
          {!isFirstTime && (
            <Link
              href="/student/roadmap"
              className="inline-flex items-center gap-1 text-sm font-medium text-mediumgray transition-colors hover:text-navy"
            >
              <X className="h-4 w-4" /> Cancel
            </Link>
          )}
        </div>

        {/* Career cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {CAREER_PATHS.map((path) => {
            const Icon = careerIcon(path.icon);
            const isSelected = selected === path.id;
            const isSuggested = suggestedPath === path.id;
            return (
              <button
                key={path.id}
                type="button"
                onClick={() => setSelected(path.id)}
                aria-pressed={isSelected}
                className={`rounded-2xl border-2 bg-white p-5 text-left transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] ${
                  isSelected
                    ? "border-slate shadow-[0_4px_12px_rgba(234,88,12,0.15)]"
                    : "border-lightgray hover:border-mediumgray/40"
                }`}
              >
                <div className="mb-4 flex items-start justify-between">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${path.color}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  {isSelected ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate px-2.5 py-0.5 text-[10px] font-semibold text-white">
                      <CircleCheck className="h-3 w-3" /> Selected
                    </span>
                  ) : isSuggested ? (
                    <span className="rounded-full bg-emerald/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald">
                      Suggested
                    </span>
                  ) : null}
                </div>
                <h3 className="text-sm font-bold text-navy">{path.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-mediumgray">{path.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {path.skills.slice(0, 6).map((s) => (
                    <span key={s} className="rounded bg-surface px-1.5 py-0.5 text-[10px] font-medium text-mediumgray">
                      {s}
                    </span>
                  ))}
                </div>
                <div className="mt-3 border-t border-lightgray pt-3">
                  <p className="text-[10px] text-mediumgray">Avg. package</p>
                  <p className="text-sm font-bold text-slate">{path.avgPackage}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Goal form */}
        {selectedData && (
          <Card className="mx-auto w-full max-w-xl p-6 sm:p-7">
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="flex items-center gap-3">
                {(() => {
                  const Icon = careerIcon(selectedData.icon);
                  return (
                    <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${selectedData.color}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                  );
                })()}
                <div>
                  <h2 className="text-base font-bold text-navy">Set goals for {selectedData.title}</h2>
                  <p className="text-xs text-mediumgray">Optional — helps us personalise your roadmap</p>
                </div>
              </div>

              <div>
                <label htmlFor="targetPackage" className="mb-1.5 block text-xs font-semibold text-navy">
                  Target package (LPA)
                </label>
                <input
                  id="targetPackage"
                  type="number"
                  min={1}
                  max={500}
                  placeholder="e.g. 12"
                  value={targetPackage}
                  onChange={(e) => setTargetPackage(e.target.value)}
                  className="w-full rounded-xl border border-lightgray px-3.5 py-2.5 text-sm text-navy outline-none transition-colors focus:border-slate focus:ring-2 focus:ring-slate/20"
                />
                <p className="mt-1 text-[11px] text-mediumgray">Typical range: {selectedData.avgPackage}</p>
              </div>

              <div>
                <label htmlFor="targetCompany" className="mb-1.5 block text-xs font-semibold text-navy">
                  Dream company
                </label>
                <input
                  id="targetCompany"
                  type="text"
                  maxLength={80}
                  placeholder="e.g. Google, Microsoft, Amazon"
                  value={targetCompany}
                  onChange={(e) => setTargetCompany(e.target.value)}
                  className="w-full rounded-xl border border-lightgray px-3.5 py-2.5 text-sm text-navy outline-none transition-colors focus:border-slate focus:ring-2 focus:ring-slate/20"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={status === "saving"}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-gradient py-3 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(234,88,12,0.25)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {status === "saving" ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" /> Saving…
                  </>
                ) : (
                  <>
                    {isFirstTime ? "Generate my roadmap" : "Save & regenerate roadmap"}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </Card>
        )}
      </DashboardContainer>
    </DashboardShell>
  );
}
