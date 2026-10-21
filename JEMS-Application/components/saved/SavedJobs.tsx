"use client";

import { useState } from "react";
import { Bookmark, Check, LoaderCircle, MapPin, Trash2 } from "lucide-react";
import Link from "next/link";
import DashboardShell, { DashboardContainer } from "@/components/dashboard/student/DashboardShell";
import { Card } from "@/components/dashboard/student/ui";

import type { SavedJobView } from "@/lib/db/student-data";

function matchTone(match: number) {
  if (match >= 90) return "bg-emerald/10 text-emerald";
  if (match >= 80) return "bg-slate/10 text-slate";
  return "bg-gold/10 text-[#b45309]";
}

export default function SavedJobs({ saved, initialApplied }: { saved: SavedJobView[]; initialApplied: string[] }) {
  const [jobs, setJobs] = useState<SavedJobView[]>(saved);
  const [applied, setApplied] = useState<Set<string>>(() => new Set(initialApplied));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const remove = async (row: SavedJobView) => {
    const before = jobs;
    setJobs((j) => j.filter((x) => x.id !== row.id));
    setError("");
    try {
      const res = await fetch("/api/student/saved-jobs", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ savedId: row.id }) });
      if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error || "Could not remove the job.");
    } catch (e) {
      setJobs(before);
      setError(e instanceof Error ? e.message : "Could not remove the job.");
    }
  };

  const apply = async (row: SavedJobView) => {
    setBusy(row.id);
    setError("");
    try {
      const res = await fetch("/api/student/applications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId: row.jobId }) });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok && res.status !== 409) throw new Error(data.error || "Could not apply.");
      setApplied((prev) => new Set(prev).add(row.jobId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not apply.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <DashboardShell>
      <DashboardContainer className="space-y-6">
        {jobs.length === 0 ? (
          <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate/10 text-slate">
              <Bookmark className="h-6 w-6" />
            </span>
            <p className="mt-4 text-sm font-semibold text-navy">No saved jobs yet</p>
            <p className="mt-1 text-xs text-mediumgray">
              Save roles from Job Matches to revisit them here.
            </p>
            <Link
              href="/student/jobs"
              className="mt-5 rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1f2937]"
            >
              Browse Job Matches
            </Link>
          </Card>
        ) : (
          <>
            <p className="text-sm text-mediumgray">
              <span className="font-semibold text-navy">{jobs.length}</span> saved roles
            </p>
            {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
            <div className="space-y-4">
              {jobs.map((j) => (
                <Card key={j.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface text-base font-bold text-navy">
                    {j.company.charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-navy">{j.role}</h3>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${matchTone(j.match)}`}>
                        {j.match}% match
                      </span>
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-mediumgray">
                      <span className="font-medium text-navy">{j.company}</span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {j.location}
                      </span>
                      <span>{j.salary}</span>
                      <span>· Saved {j.saved}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => remove(j)}
                      aria-label="Remove"
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-lightgray text-mediumgray transition-colors hover:border-[#EF4444] hover:bg-[#fee2e2] hover:text-[#EF4444]"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                    {applied.has(j.jobId) ? (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald/10 px-5 py-2.5 text-sm font-semibold text-emerald">
                        <Check className="h-4 w-4" /> Applied
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => apply(j)}
                        disabled={busy === j.id}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(234,88,12,0.25)] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
                      >
                        {busy === j.id && <LoaderCircle className="h-4 w-4 animate-spin" />}
                        Apply
                      </button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </DashboardContainer>
    </DashboardShell>
  );
}
