"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  Building,
  CircleCheck,
  CircleDashed,
  ClipboardList,
  Cpu,
  LoaderCircle,
  Lock,
  Pencil,
  ShieldCheck,
  Sparkles,
  Timer,
} from "lucide-react";
import TaskStatus from "@/components/ai/TaskStatus";
import DashboardShell, { DashboardContainer } from "@/components/dashboard/student/DashboardShell";
import { Card, ProgressBar } from "@/components/dashboard/student/ui";
import type { PaperSummary } from "@/lib/ai/papers-shared";
import { isActive } from "@/lib/ai-tasks/types";
import { startAiTask, useAiTasks } from "@/lib/ai-tasks/use-tasks";
import { LEVEL_LABEL, LIKERT, SELF_RATINGS, SITUATIONAL, SOFT_SKILLS } from "@/lib/assessment/engine";
import type { AssessmentState } from "@/lib/db/assessment";

const norm = (s: string) => s.trim().toLowerCase();

/**
 * Skill Assessment — the diagram's "Student data → Assessment Agent" entry.
 * 1. Questionnaire: self-rate industry-shared skills + soft-skill/aptitude
 *    questions → *claimed* skills and a soft-skill profile.
 * 2. Skill tests: server-graded MCQ tests turn claimed skills into *verified*.
 * Only verified skills reach the resume, portfolio and matching.
 */
export default function AssessmentHub({ state, papers }: { state: AssessmentState; papers: PaperSummary[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState(!state.questionnaireAt);
  const ai = useAiTests(papers);
  const verified = state.skills.filter((s) => s.verified);
  const claimed = state.skills.filter((s) => !s.verified);
  const step = !state.questionnaireAt ? 1 : verified.length === 0 ? 2 : 3;

  return (
    <DashboardShell>
      <DashboardContainer className="space-y-6">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate/10 px-2.5 py-1 text-xs font-semibold text-slate"><ShieldCheck className="h-3.5 w-3.5" /> Skill assessment</span>
          <h1 className="mt-3 text-2xl font-bold text-navy">Assess first, then it counts</h1>
          <p className="mt-1 max-w-2xl text-sm text-mediumgray">
            Tell us which industry skills you have, then verify each one with a skill test. Verified skills are what appear on your resume and portfolio and what companies match against — self-declared skills never do.
          </p>
        </div>

        {/* Steps */}
        <div data-tour="assessment-steps" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { n: 1, title: "Questionnaire", desc: "Self-rate industry skills + soft skills", icon: ClipboardList, done: !!state.questionnaireAt },
            { n: 2, title: "Skill tests", desc: "Assessment Agent verifies each claim", icon: Timer, done: verified.length > 0 },
            { n: 3, title: "Verified profile", desc: "Feeds resume, portfolio & matching", icon: BadgeCheck, done: verified.length > 0 && claimed.length === 0 },
          ].map((s) => (
            <div key={s.n} className={`flex items-center gap-3 rounded-xl border p-4 ${step === s.n ? "border-slate bg-slate/5" : s.done ? "border-emerald/30 bg-emerald/5" : "border-lightgray bg-white"}`}>
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${s.done ? "bg-emerald/10 text-emerald" : step === s.n ? "bg-slate/10 text-slate" : "bg-surface text-mediumgray"}`}>
                {s.done ? <CircleCheck className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
              </span>
              <span><span className="block text-sm font-semibold text-navy">{s.n}. {s.title}</span><span className="text-[11px] text-mediumgray">{s.desc}</span></span>
            </div>
          ))}
        </div>

        {editing ? (
          <Questionnaire state={state} onSaved={() => { setEditing(false); router.refresh(); }} onCancel={state.questionnaireAt ? () => setEditing(false) : undefined} />
        ) : (
          <>
            {/* Skills & verification */}
            <Card data-tour="assessment-skills">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-lightgray px-5 py-3.5">
                <div>
                  <h2 className="text-sm font-semibold text-navy">Your skills</h2>
                  <p className="text-[11px] text-mediumgray">{verified.length} verified · {claimed.length} claimed, awaiting a test</p>
                </div>
                <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate hover:underline"><Pencil className="h-3.5 w-3.5" /> Edit questionnaire</button>
              </div>
              <ul className="divide-y divide-lightgray">
                {state.skills.length === 0 && <li className="px-5 py-6 text-sm text-mediumgray">No skills claimed yet — fill in the questionnaire.</li>}
                {[...verified, ...claimed].map((s) => {
                  const cat = state.catalogue.find((c) => norm(c.name) === norm(s.name));
                  const result = state.results.find((r) => norm(r.skill) === norm(s.name) || norm(r.skill) === norm(cat?.name ?? ""));
                  const locked = result?.lockedUntil && new Date(result.lockedUntil) > new Date();
                  return (
                    <li key={s.name} className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${s.verified ? "bg-emerald/10 text-emerald" : "bg-surface text-mediumgray"}`}>
                        {s.verified ? <BadgeCheck className="h-4 w-4" /> : <CircleDashed className="h-4 w-4" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-navy">{s.name}</span>
                          {s.verified ? (
                            <span className="rounded-full bg-emerald/10 px-2 py-0.5 text-[10px] font-semibold text-emerald">Verified · {LEVEL_LABEL(s.level)}{s.score != null ? ` · ${s.score}%` : ""}</span>
                          ) : (
                            <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Claimed · self-rated {LEVEL_LABEL(s.level)}</span>
                          )}
                          {cat && cat.demand > 0 && <span className="inline-flex items-center gap-1 text-[10px] text-mediumgray"><Building className="h-3 w-3" />{cat.demand} openings</span>}
                        </span>
                        <span className="text-[11px] text-mediumgray">
                          {s.verified
                            ? s.source === "skill-test" ? "Verified by skill test" : "Verified by roadmap module quiz"
                            : locked
                              ? `Failed last attempt (${result?.score}%) · retry after ${new Date(result!.lockedUntil!).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
                              : cat?.testable
                                ? "Take the 8-question skill test (or an AI-generated one) to verify"
                                : cat?.moduleId
                                  ? `Verify by passing the roadmap module "${cat.moduleTitle}" or an AI-generated test`
                                  : "Verify with an AI-generated test"}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-wrap items-center gap-2">
                        {s.verified ? null : locked ? (
                          <span className="inline-flex items-center gap-1 rounded-lg border border-lightgray px-3 py-2 text-xs font-semibold text-mediumgray"><Lock className="h-3.5 w-3.5" /> Locked</span>
                        ) : cat?.testable ? (
                          <Link href={`/student/assessment/test/${encodeURIComponent(s.name)}`} className="inline-flex items-center gap-1.5 rounded-lg bg-primary-gradient px-3.5 py-2 text-xs font-semibold text-white shadow-[0_4px_12px_rgba(234,88,12,0.25)] transition-transform hover:-translate-y-0.5"><Timer className="h-3.5 w-3.5" /> Take test</Link>
                        ) : cat?.moduleId ? (
                          <Link href={`/student/roadmap/${cat.moduleId}`} className="inline-flex items-center gap-1.5 rounded-lg border border-lightgray px-3.5 py-2 text-xs font-semibold text-navy transition-colors hover:border-slate hover:text-slate">Open module <ArrowRight className="h-3.5 w-3.5" /></Link>
                        ) : null}
                        {!s.verified && !locked && <AiTestAction ai={ai} skill={s.name} primary={!cat?.testable && !cat?.moduleId} />}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Card>

            <AiTestsCard ai={ai} papers={papers} />

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              {/* Soft skills */}
              <Card className="p-6">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-navy"><Sparkles className="h-4 w-4 text-slate" /> Soft-skill profile</h2>
                <p className="mt-0.5 text-[11px] text-mediumgray">From your questionnaire answers — shown on your portfolio alongside verified technical skills.</p>
                <ul className="mt-4 space-y-3">
                  {SOFT_SKILLS.map((k) => {
                    const v = state.softSkills?.[k.key] ?? 0;
                    return (
                      <li key={k.key}>
                        <div className="flex items-center justify-between text-xs"><span className="font-medium text-navy">{k.label}</span><span className="tabular-nums text-mediumgray">{v}%</span></div>
                        <div className="mt-1"><ProgressBar value={v} barClass={v >= 70 ? "bg-emerald" : "bg-slate"} /></div>
                      </li>
                    );
                  })}
                </ul>
              </Card>

              {/* Next */}
              <Card className="p-6">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-navy"><Cpu className="h-4 w-4 text-slate" /> What happens next</h2>
                <ol className="mt-4 space-y-3 text-sm text-mediumgray">
                  <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-bold text-navy">1</span>Verify each claimed skill with a test (pass mark 70%). A failed test locks that skill for 24 hours.</li>
                  <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-bold text-navy">2</span>Run the AI Career Analysis — the Analysis Agent counts only verified skills as strengths.</li>
                  <li className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-bold text-navy">3</span>Verified skills, certificates and projects flow into your resume and public portfolio automatically.</li>
                </ol>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link href="/student/analysis" className="inline-flex items-center gap-2 rounded-lg bg-primary-gradient px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(234,88,12,0.25)] transition-transform hover:-translate-y-0.5"><Cpu className="h-4 w-4" /> Run AI analysis</Link>
                  <Link href="/student/profile?tab=portfolio" className="inline-flex items-center gap-2 rounded-lg border border-lightgray bg-white px-4 py-2 text-sm font-semibold text-navy transition-colors hover:border-slate hover:text-slate">View portfolio</Link>
                </div>
              </Card>
            </div>
          </>
        )}
      </DashboardContainer>
    </DashboardShell>
  );
}

// ── AI tests (Agent service) ────────────────────────────────────

function useAiTests(papers: PaperSummary[]) {
  const router = useRouter();
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState("");
  const tasks = useAiTasks(["assessment.generate", "assessment.grade"], { onSettled: () => router.refresh() });
  const paperFor = (skill: string) => papers.find((p) => p.purpose === "skill" && norm(p.subject) === norm(skill)) ?? null;
  const start = async (skill: string) => {
    setError("");
    setStarting(skill);
    try {
      tasks.track(await startAiTask("/api/student/ai/papers", { purpose: "skill", skill }));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the AI test.");
      return false;
    } finally {
      setStarting(null);
    }
  };
  return { ...tasks, paperFor, start, starting, error };
}

type AiTests = ReturnType<typeof useAiTests>;

/** Per-skill action: generate an AI test, show progress, or open the ready paper. */
function AiTestAction({ ai, skill, primary }: { ai: AiTests; skill: string; primary: boolean }) {
  const task = ai.latestFor(skill, "assessment.generate");
  const paper = ai.paperFor(skill);
  const cls = primary
    ? "inline-flex items-center gap-1.5 rounded-lg bg-primary-gradient px-3.5 py-2 text-xs font-semibold text-white shadow-[0_4px_12px_rgba(234,88,12,0.25)] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
    : "inline-flex items-center gap-1.5 rounded-lg border border-lightgray px-3.5 py-2 text-xs font-semibold text-navy transition-colors hover:border-slate hover:text-slate disabled:opacity-60";
  if ((task && isActive(task.status)) || ai.starting === skill) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-lightgray px-3.5 py-2 text-xs font-semibold text-mediumgray" title={task?.progress}>
        <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> Generating AI test…
      </span>
    );
  }
  if (paper && (paper.status === "ready" || paper.status === "in-progress")) {
    return <Link href={`/student/assessment/ai/${paper.id}`} className={cls}><Sparkles className="h-3.5 w-3.5" /> {paper.status === "ready" ? "Start AI test" : "Resume AI test"}</Link>;
  }
  if (paper?.status === "submitted") {
    return <Link href={`/student/assessment/ai/${paper.id}`} className={cls}><LoaderCircle className="h-3.5 w-3.5 animate-spin" /> Grading…</Link>;
  }
  return (
    <button type="button" onClick={() => ai.start(skill)} className={cls} title="The AI agent writes a fresh mixed test (multiple choice, written and — for programming skills — coding)">
      <Sparkles className="h-3.5 w-3.5" /> AI test
    </button>
  );
}

const PAPER_STATUS: Record<PaperSummary["status"], { label: string; tone: string }> = {
  ready: { label: "Ready to start", tone: "bg-slate/10 text-slate" },
  "in-progress": { label: "In progress", tone: "bg-gold/15 text-amber-700" },
  submitted: { label: "Grading…", tone: "bg-slate/10 text-slate" },
  graded: { label: "Graded", tone: "bg-emerald/10 text-emerald" },
};

function AiTestsCard({ ai, papers }: { ai: AiTests; papers: PaperSummary[] }) {
  const [skill, setSkill] = useState("");
  const skillPapers = papers.filter((p) => p.purpose === "skill");
  const generating = ai.tasks.filter(
    (t) => t.type === "assessment.generate" && (isActive(t.status) || (t.status === "failed" && ai.latestFor(t.subject, "assessment.generate")?.id === t.id)),
  );

  return (
    <Card>
      <div className="flex flex-col gap-3 border-b border-lightgray px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-navy"><Sparkles className="h-4 w-4 text-slate" /> AI-generated tests</h2>
          <p className="text-[11px] text-mediumgray">Fresh questions every time — multiple choice, written answers and runnable coding problems. Pass 70% to verify.</p>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (skill.trim() && (await ai.start(skill.trim()))) setSkill("");
          }}
          className="flex gap-2"
        >
          <input value={skill} onChange={(e) => setSkill(e.target.value)} maxLength={80} placeholder="Any skill, e.g. Docker" aria-label="Skill to be tested on" className="h-9 w-full rounded-lg border border-lightgray px-3 text-sm text-navy outline-none focus:border-slate sm:w-48" />
          <button type="submit" disabled={!skill.trim() || !!ai.starting} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-navy px-3.5 text-xs font-semibold text-white transition-colors hover:bg-[#1f2937] disabled:opacity-60">Test me</button>
        </form>
      </div>
      {(ai.error || generating.length > 0) && (
        <div className="space-y-2 border-b border-lightgray px-5 py-3">
          {ai.error && <p className="text-sm text-red-600">{ai.error}</p>}
          {generating.map((t) => <TaskStatus key={t.id} task={t} />)}
        </div>
      )}
      <ul className="divide-y divide-lightgray">
        {skillPapers.length === 0 && <li className="px-5 py-6 text-sm text-mediumgray">No AI tests yet. Use “AI test” on a skill above, or type any skill.</li>}
        {skillPapers.map((p) => (
          <li key={p.id} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center">
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-navy">{p.subject}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${PAPER_STATUS[p.status].tone}`}>{PAPER_STATUS[p.status].label}</span>
                {p.percent != null && <span className={`text-xs font-semibold ${p.passed ? "text-emerald" : "text-amber-600"}`}>{p.percent}%{p.pendingReview ? " · review pending" : ""}</span>}
              </span>
              <span className="text-[11px] text-mediumgray">{p.questionCount} questions · {p.minutes} min</span>
            </span>
            <Link href={`/student/assessment/ai/${p.id}`} className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-slate hover:underline">
              {p.status === "graded" ? "View results" : p.status === "ready" ? "Start" : "Open"} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

// ── Questionnaire ───────────────────────────────────────────────

function Questionnaire({ state, onSaved, onCancel }: { state: AssessmentState; onSaved: () => void; onCancel?: () => void }) {
  const initialRatings = useMemo(() => {
    const r: Record<string, number> = {};
    for (const s of state.skills) r[s.name] = s.level >= 75 ? 4 : s.level >= 60 ? 3 : s.level >= 45 ? 2 : 1;
    return r;
  }, [state.skills]);
  const [ratings, setRatings] = useState<Record<string, number>>(initialRatings);
  const [likert, setLikert] = useState<Record<string, number>>({});
  const [situational, setSituational] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");

  const verifiedNames = new Set(state.skills.filter((s) => s.verified).map((s) => norm(s.name)));
  const catalogue = state.catalogue.filter((c) => !filter || norm(c.name).includes(norm(filter)));
  const complete = LIKERT.every((l) => likert[l.id]) && SITUATIONAL.every((s) => situational[s.id] != null);
  const claimedCount = Object.values(ratings).filter((v) => v >= 1).length;

  const toggle = (name: string, value: number) =>
    setRatings((r) => (r[name] === value ? Object.fromEntries(Object.entries(r).filter(([k]) => k !== name)) : { ...r, [name]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/student/assessment/questionnaire", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ skills: ratings, likert, situational }) });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not save.");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Technical skills */}
      <Card className="p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-navy">1 · Technical skills shared by industry</h2>
            <p className="mt-0.5 text-[11px] text-mediumgray">These are the skills companies currently list in their openings for your target role ({state.targetRole}) and beyond. Rate the ones you have — they&apos;ll be <strong>claimed</strong> until you pass a test.</p>
          </div>
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter skills…" className="h-9 w-full rounded-lg border border-lightgray px-3 text-sm text-navy outline-none focus:border-slate sm:w-48" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-mediumgray">
          {SELF_RATINGS.map((r) => <span key={r.value}><span className="font-semibold text-navy">{r.value} {r.label}</span> — {r.hint}</span>)}
        </div>
        <ul className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
          {catalogue.map((c) => {
            const isVerified = verifiedNames.has(norm(c.name));
            const v = ratings[c.name];
            return (
              <li key={c.name} className={`flex items-center gap-3 rounded-lg border p-3 ${isVerified ? "border-emerald/30 bg-emerald/5" : v ? "border-slate/40 bg-slate/5" : "border-lightgray"}`}>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-sm font-medium text-navy">{c.name}{isVerified && <BadgeCheck className="h-3.5 w-3.5 text-emerald" />}</span>
                  <span className="text-[10px] text-mediumgray">{c.demand} openings{c.testable ? " · test available" : c.moduleId ? " · verify via roadmap" : ""}</span>
                </span>
                {isVerified ? (
                  <span className="text-[10px] font-semibold text-emerald">Verified</span>
                ) : (
                  <span className="flex gap-1">
                    {SELF_RATINGS.map((r) => (
                      <button key={r.value} type="button" onClick={() => toggle(c.name, r.value)} title={`${r.label} — ${r.hint}`} aria-pressed={v === r.value}
                        className={`h-7 w-7 rounded-md text-xs font-semibold transition-colors ${v === r.value ? "bg-slate text-white" : "bg-surface text-mediumgray hover:text-navy"}`}>{r.value}</button>
                    ))}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-mediumgray">{claimedCount} skill{claimedCount === 1 ? "" : "s"} claimed</p>
      </Card>

      {/* Soft skills */}
      <Card className="p-6">
        <h2 className="text-sm font-semibold text-navy">2 · Soft skills — how much do you agree?</h2>
        <ul className="mt-4 space-y-3">
          {LIKERT.map((l) => (
            <li key={l.id} className="flex flex-col gap-2 rounded-lg border border-lightgray p-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm text-navy">{l.text}</span>
              <span className="flex shrink-0 gap-1">
                {[1, 2, 3, 4, 5].map((v) => (
                  <button key={v} type="button" onClick={() => setLikert((s) => ({ ...s, [l.id]: v }))} aria-pressed={likert[l.id] === v}
                    className={`h-8 w-8 rounded-md text-xs font-semibold ${likert[l.id] === v ? "bg-slate text-white" : "bg-surface text-mediumgray hover:text-navy"}`}>{v}</button>
                ))}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11px] text-mediumgray">1 = strongly disagree · 5 = strongly agree</p>
      </Card>

      {/* Situational */}
      <Card className="p-6">
        <h2 className="text-sm font-semibold text-navy">3 · Aptitude — what would you do?</h2>
        <ul className="mt-4 space-y-4">
          {SITUATIONAL.map((s) => (
            <li key={s.id}>
              <p className="text-sm font-medium text-navy">{s.text}</p>
              <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                {s.options.map((o, i) => (
                  <button key={i} type="button" onClick={() => setSituational((st) => ({ ...st, [s.id]: i }))} aria-pressed={situational[s.id] === i}
                    className={`rounded-lg border-2 p-3 text-left text-sm transition-colors ${situational[s.id] === i ? "border-slate bg-slate/5 text-navy" : "border-lightgray text-navy hover:bg-surface-2"}`}>{o.text}</button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={saving || !complete || claimedCount === 0} className="inline-flex items-center gap-2 rounded-lg bg-primary-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(234,88,12,0.25)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0">
          {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />} Save questionnaire
        </button>
        {onCancel && <button type="button" onClick={onCancel} className="rounded-lg border border-lightgray bg-white px-5 py-2.5 text-sm font-semibold text-navy hover:border-slate hover:text-slate">Cancel</button>}
        {!complete && <span className="self-center text-xs text-mediumgray">Answer every statement and scenario to continue.</span>}
      </div>
    </form>
  );
}
