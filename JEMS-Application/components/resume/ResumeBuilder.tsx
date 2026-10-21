"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BadgeCheck, Check, Download, FilePlus2, Loader2, Sparkles, Trash2 } from "lucide-react";
import DashboardShell, {
  DashboardContainer,
} from "@/components/dashboard/student/DashboardShell";
import ResumeEditor from "./ResumeEditor";
import ResumePreview from "./ResumePreview";
import {
  atsScore,
  emptyResume,
  type JemsImport,
  type ProficiencyLevel,
  type ResumeData,
  type ResumeVersion,
  uid,
} from "./types";

const levelLabel = (n: number): ProficiencyLevel => (n >= 85 ? "Expert" : n >= 70 ? "Advanced" : n >= 50 ? "Intermediate" : "Beginner");
const norm = (s: string) => s.trim().toLowerCase();

/**
 * Merges the platform's verified record into a resume: verified skills are
 * added (or upgraded to verified if already listed), and each passed module's
 * certificate and project is added once. Returns what changed for the toast.
 */
function importFromJems(data: ResumeData, jems: JemsImport): { next: ResumeData; added: number } {
  let added = 0;
  const skills = [...data.skills];
  for (const s of jems.skills.filter((x) => x.verified)) {
    const i = skills.findIndex((k) => norm(k.name) === norm(s.name));
    if (i === -1) { skills.push({ id: uid("skill"), name: s.name, level: levelLabel(s.level), verified: true }); added++; }
    else if (!skills[i].verified) { skills[i] = { ...skills[i], verified: true }; added++; }
  }
  const certifications = [...data.certifications];
  for (const c of jems.certificates) {
    if (certifications.some((k) => norm(k.name) === norm(c.title) && /jems/i.test(k.org))) continue;
    certifications.push({ id: uid("cert"), name: c.title, org: c.issuer, issueDate: c.issuedAt.slice(0, 7), expDate: "" });
    added++;
  }
  const projects = [...data.projects];
  for (const p of jems.projects) {
    if (projects.some((k) => norm(k.name) === norm(p.title))) continue;
    projects.push({ id: uid("proj"), name: p.title, description: p.description, tech: p.tech.join(", "), link: "" });
    added++;
  }
  return { next: { ...data, skills, certifications, projects }, added };
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

export default function ResumeBuilder({
  initialVersions,
  jems,
}: {
  initialVersions: ResumeVersion[];
  jems?: JemsImport;
}) {
  const [versions, setVersions] = useState<ResumeVersion[]>(initialVersions);
  const [importNote, setImportNote] = useState<string | null>(null);
  const [activeId, setActiveId] = useState(initialVersions[0]?.id ?? "v1");

  const active = versions.find((v) => v.id === activeId) ?? versions[0];
  const data = active.data;

  const setData = (producer: (prev: ResumeData) => ResumeData) =>
    setVersions((vs) =>
      vs.map((v) =>
        v.id === active.id ? { ...v, data: producer(v.data) } : v,
      ),
    );

  // ── Versions ────────────────────────────────────────────────
  const addVersion = () => {
    const id = uid("v");
    setVersions((vs) => [
      ...vs,
      { id, name: `Resume v${vs.length + 1}`, data: emptyResume() },
    ]);
    setActiveId(id);
  };
  const deleteVersion = () => {
    if (versions.length <= 1) return;
    const remaining = versions.filter((v) => v.id !== active.id);
    setVersions(remaining);
    setActiveId(remaining[0].id);
  };
  const renameVersion = (name: string) =>
    setVersions((vs) =>
      vs.map((v) => (v.id === active.id ? { ...v, name } : v)),
    );

  // ── Auto-save (persists to MongoDB) ─────────────────────────
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(() => Date.now());
  const [, tick] = useState(0);
  const firstRun = useRef(true);

  useEffect(() => {
    // Skip the very first render so loading a resume doesn't trigger a save.
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setSaving(true);
    const t = setTimeout(async () => {
      try {
        await fetch("/api/student/resume", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            versions,
            atsScore: atsScore(active.data).score,
          }),
        });
        setLastSaved(Date.now());
      } finally {
        setSaving(false);
      }
    }, 900);
    return () => clearTimeout(t);
    // Re-save whenever any version's content or names change.
  }, [versions, active.data]);

  // Refresh the "x min ago" label periodically.
  useEffect(() => {
    const i = setInterval(() => tick((n) => n + 1), 30000);
    return () => clearInterval(i);
  }, []);

  const ats = atsScore(data);

  const verifiedCount = jems?.skills.filter((s) => s.verified).length ?? 0;
  const importable = verifiedCount + (jems?.certificates.length ?? 0) + (jems?.projects.length ?? 0);
  const runImport = () => {
    if (!jems) return;
    const { next, added } = importFromJems(data, jems);
    setData(() => next);
    setImportNote(added > 0 ? `Added ${added} verified item${added === 1 ? "" : "s"} from your JEMS portfolio.` : "Your resume already has everything JEMS has verified.");
    setTimeout(() => setImportNote(null), 3500);
  };

  return (
    <DashboardShell>
      <DashboardContainer className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-navy">
              Resume Builder
            </h1>
            <p className="mt-1 text-sm text-mediumgray">
              Create ATS-optimized resume
            </p>
          </div>
          <div className="flex items-center gap-2 self-start text-xs font-medium text-mediumgray sm:self-auto">
            {saving ? (
              <span className="inline-flex items-center gap-1.5 text-slate">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving…
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-emerald">
                <Check className="h-3.5 w-3.5" />
                Saved · {timeAgo(lastSaved)}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {/* ── Left: editor ───────────────────────────────── */}
          <div className="space-y-6">
            {/* ATS score */}
            <div className="rounded-lg border border-lightgray bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-navy">ATS Score</h2>
                <span
                  className={`text-sm font-bold ${ats.tone === "good" ? "text-emerald" : "text-orange"}`}
                >
                  {ats.score}/100
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-lightgray">
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ${
                    ats.tone === "good" ? "bg-emerald" : "bg-orange"
                  }`}
                  style={{ width: `${ats.score}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-mediumgray">{ats.suggestion}</p>
            </div>

            {/* Sync from the platform's verified record */}
            {jems && (
              <div data-tour="resume-import" className="rounded-lg border border-emerald/30 bg-emerald/5 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald/10 text-emerald"><BadgeCheck className="h-5 w-5" /></span>
                    <div>
                      <p className="text-sm font-semibold text-navy">Verified by JEMS</p>
                      <p className="text-xs text-mediumgray">
                        {verifiedCount} verified skill{verifiedCount === 1 ? "" : "s"} · {jems.certificates.length} certificate{jems.certificates.length === 1 ? "" : "s"} · {jems.projects.length} project{jems.projects.length === 1 ? "" : "s"} from your roadmap
                        {jems.skills.some((s) => !s.verified) && (
                          <> · <Link href="/student/assessment" className="font-semibold text-slate hover:underline">{jems.skills.filter((s) => !s.verified).length} claimed skill{jems.skills.filter((s) => !s.verified).length === 1 ? "" : "s"} still need a test</Link></>
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={runImport}
                    disabled={importable === 0}
                    className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-emerald px-4 py-2 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                  >
                    <Sparkles className="h-4 w-4" /> Import into resume
                  </button>
                </div>
                {importNote && <p className="mt-2 text-xs font-medium text-emerald">{importNote}</p>}
                {importable === 0 && <p className="mt-2 text-xs text-mediumgray">Verify skills in the <Link href="/student/assessment" className="font-semibold text-slate hover:underline">Skill Assessment</Link> or pass roadmap modules to earn items you can import here.</p>}
              </div>
            )}

            {/* Version controls */}
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-lightgray bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
              <input
                value={active.name}
                onChange={(e) => renameVersion(e.target.value)}
                aria-label="Resume version name"
                className="h-9 min-w-0 flex-1 rounded-md border border-lightgray px-3 text-sm font-semibold text-navy outline-none focus:border-slate focus:shadow-[0_4px_12px_rgba(234,88,12,0.15)]"
              />
              <select
                value={activeId}
                onChange={(e) => setActiveId(e.target.value)}
                aria-label="Switch version"
                className="h-9 rounded-md border border-lightgray bg-white px-2 text-sm text-navy outline-none focus:border-slate"
              >
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={addVersion}
                aria-label="New version"
                className="flex h-9 items-center gap-1.5 rounded-md border border-lightgray px-3 text-xs font-semibold text-navy transition-colors hover:border-slate hover:text-slate"
              >
                <FilePlus2 className="h-4 w-4" />
                New
              </button>
              <button
                type="button"
                onClick={deleteVersion}
                disabled={versions.length <= 1}
                aria-label="Delete version"
                className="flex h-9 w-9 items-center justify-center rounded-md text-mediumgray transition-colors hover:bg-[#fee2e2] hover:text-[#EF4444] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-mediumgray"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <ResumeEditor data={data} setData={setData} verifiedSkills={jems?.skills.filter((s) => s.verified) ?? []} />
          </div>

          {/* ── Right: preview ─────────────────────────────── */}
          <div className="xl:sticky xl:top-[5.5rem] xl:self-start">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-navy">Preview</h2>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-cta-gradient px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(234,88,12,0.2)] transition-transform hover:scale-[1.02]"
              >
                <Download className="h-4 w-4" />
                Download as PDF
              </button>
            </div>
            <div className="max-h-[calc(100vh-8rem)] overflow-auto rounded-lg bg-[#eef1f5] p-4">
              <ResumePreview data={data} />
            </div>
          </div>
        </div>
      </DashboardContainer>
    </DashboardShell>
  );
}
