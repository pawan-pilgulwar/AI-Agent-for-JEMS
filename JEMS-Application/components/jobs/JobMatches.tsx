"use client";

import { useState } from "react";
import { Bookmark, BookmarkCheck, Check, LoaderCircle, MapPin, Search, Target } from "lucide-react";
import DashboardShell, { DashboardContainer } from "@/components/dashboard/student/DashboardShell";
import { Card, EmptyState } from "@/components/dashboard/student/ui";
import type { JobMatchView } from "@/lib/db/student-data";

function matchTone(match: number) {
  if (match >= 70) return "bg-emerald/10 text-emerald";
  if (match >= 40) return "bg-slate/10 text-slate";
  return "bg-gold/10 text-[#b45309]";
}

const FILTERS = [
  { key: "all", label: "All" },
  { key: "remote", label: "Remote" },
  { key: "top", label: "70%+ match" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

async function send(url: string, method: "POST" | "DELETE", jobId: string) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId }) });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
}

export default function JobMatches({
  jobs,
  initialSaved,
  initialApplied,
  remoteOnly = false,
}: {
  jobs: JobMatchView[];
  initialSaved: string[];
  initialApplied: string[];
  /** From Settings → Job preferences: start on the Remote filter. */
  remoteOnly?: boolean;
}) {
  const [filter, setFilter] = useState<FilterKey>(remoteOnly ? "remote" : "all");
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState<Set<string>>(() => new Set(initialSaved));
  const [applied, setApplied] = useState<Set<string>>(() => new Set(initialApplied));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const toggleSave = async (id: string) => {
    const wasSaved = saved.has(id);
    // Optimistic: flip now, roll back if the server says no.
    const flip = (on: boolean) =>
      setSaved((prev) => {
        const next = new Set(prev);
        if (on) next.add(id);
        else next.delete(id);
        return next;
      });
    flip(!wasSaved);
    setError("");
    try {
      await send("/api/student/saved-jobs", wasSaved ? "DELETE" : "POST", id);
    } catch (e) {
      flip(wasSaved);
      setError(e instanceof Error ? e.message : "Could not update saved jobs.");
    }
  };

  const apply = async (j: JobMatchView) => {
    setBusy(j.id);
    setError("");
    try {
      await send("/api/student/applications", "POST", j.id);
      setApplied((prev) => new Set(prev).add(j.id));
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not apply.";
      if (/already applied/i.test(message)) setApplied((prev) => new Set(prev).add(j.id));
      else setError(message);
    } finally {
      setBusy(null);
    }
  };

  const q = query.trim().toLowerCase();
  const visible = jobs.filter(
    (j) =>
      (filter === "remote" ? j.remote : filter === "top" ? j.match >= 70 : true) &&
      (!q || j.role.toLowerCase().includes(q) || j.company.toLowerCase().includes(q) || j.location.toLowerCase().includes(q)),
  );

  if (jobs.length === 0) {
    return (
      <DashboardShell>
        <DashboardContainer className="space-y-6">
          <EmptyState
            icon={Target}
            title="No job matches yet"
            hint="Earn verified skills on your roadmap so we can match you with roles that fit. Your best matches will appear here."
            ctaLabel="Open my roadmap"
            ctaHref="/student/roadmap"
          />
        </DashboardContainer>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <DashboardContainer className="space-y-6">
        {/* Search + filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mediumgray" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search roles or companies…"
              aria-label="Search roles or companies"
              className="h-11 w-full rounded-lg border border-lightgray bg-white pl-9 pr-3 text-sm text-navy outline-none transition-colors placeholder:text-mediumgray focus:border-slate focus:ring-2 focus:ring-slate/15"
            />
          </div>
          <div className="flex gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  filter === f.key
                    ? "bg-navy text-white"
                    : "border border-lightgray bg-white text-mediumgray hover:text-navy"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <p className="text-sm text-mediumgray">
          <span className="font-semibold text-navy">{visible.length}</span> matching roles
        </p>
        {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        {/* Job list */}
        <div className="space-y-4">
          {visible.map((j) => {
            const isSaved = saved.has(j.id);
            const isApplied = applied.has(j.id);
            return (
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
                    <span>{j.type}</span>
                    <span>{j.salary}</span>
                    <span>· {j.posted}</span>
                  </p>
                  {(j.matched.length > 0 || j.missing.length > 0) && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {j.matched.map((s) => <span key={s} className="rounded bg-emerald/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald">✓ {s}</span>)}
                      {j.missing.map((s) => <span key={s} className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600">✗ {s}</span>)}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleSave(j.id)}
                    aria-label={isSaved ? "Unsave" : "Save"}
                    aria-pressed={isSaved}
                    className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${
                      isSaved
                        ? "border-slate bg-slate/10 text-slate"
                        : "border-lightgray text-mediumgray hover:border-slate hover:text-slate"
                    }`}
                  >
                    {isSaved ? <BookmarkCheck className="h-5 w-5" /> : <Bookmark className="h-5 w-5" />}
                  </button>
                  {isApplied ? (
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
            );
          })}
        </div>
      </DashboardContainer>
    </DashboardShell>
  );
}
