"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Bot,
  Briefcase,
  Building,
  Check,
  CircleCheck,
  CircleDashed,
  Cpu,
  GraduationCap,
  Handshake,
  LoaderCircle,
  Lock,
  Play,
  RotateCcw,
  Route,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  User,
  Users,
} from "lucide-react";
import CodingEvidence from "@/components/ai/CodingEvidence";
import DashboardShell, { DashboardContainer } from "@/components/dashboard/student/DashboardShell";
import { Card, ProgressBar } from "@/components/dashboard/student/ui";
import type { ProfileAnalysisView } from "@/lib/ai/profile";
import { AGENTS, type AgentId, type AgentRun, type AnalysisInput, type AnalysisResult } from "@/lib/agents/types";

type AgentState = { status: "idle" | "queued" | "running" | "done"; shownLogs: number };

const AGENT_ICON: Record<AgentId, typeof Search> = {
  analysis: Search,
  roadmap: Route,
  learning: BookOpen,
  assessment: ShieldCheck,
  matching: Users,
  collaboration: Handshake,
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

const initialStates = (): Record<AgentId, AgentState> =>
  Object.fromEntries(AGENTS.map((a) => [a.id, { status: "idle", shownLogs: 0 }])) as Record<AgentId, AgentState>;

/**
 * The "Ollama multi-agent layer" from the architecture diagram, demonstrated
 * end to end: inputs → orchestrated agents (replayed with their log traces) →
 * the six outputs. The agents themselves are rule-based (see lib/agents).
 */
export default function CareerAnalysis({
  inputs,
  initialResult,
  codingEvidence,
  githubDefault,
}: {
  inputs: AnalysisInput;
  initialResult: AnalysisResult | null;
  codingEvidence: ProfileAnalysisView | null;
  githubDefault: string;
}) {
  const router = useRouter();
  const [result, setResult] = useState<AnalysisResult | null>(initialResult);
  const [phase, setPhase] = useState<"idle" | "requesting" | "replaying" | "done">(initialResult ? "done" : "idle");
  const [agents, setAgents] = useState<Record<AgentId, AgentState>>(() => {
    const s = initialStates();
    if (initialResult) for (const a of AGENTS) s[a.id] = { status: "done", shownLogs: 99 };
    return s;
  });
  const [error, setError] = useState("");
  const cancelled = useRef(false);

  useEffect(() => () => { cancelled.current = true; }, []);

  const replay = async (runs: AgentRun[]) => {
    const s = initialStates();
    for (const a of AGENTS) s[a.id] = { status: "queued", shownLogs: 0 };
    setAgents({ ...s });
    for (const run of runs) {
      if (cancelled.current) return;
      s[run.id] = { status: "running", shownLogs: 0 };
      setAgents({ ...s });
      const step = Math.max(180, run.durationMs / Math.max(1, run.logs.length));
      for (let i = 0; i < run.logs.length; i++) {
        await sleep(step);
        if (cancelled.current) return;
        s[run.id] = { status: "running", shownLogs: i + 1 };
        setAgents({ ...s });
      }
      await sleep(220);
      s[run.id] = { status: "done", shownLogs: run.logs.length };
      setAgents({ ...s });
    }
  };

  const run = async () => {
    setError("");
    setPhase("requesting");
    setResult(null);
    const s = initialStates();
    for (const a of AGENTS) s[a.id] = { status: "queued", shownLogs: 0 };
    setAgents(s);
    try {
      const res = await fetch("/api/student/analysis", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { result?: AnalysisResult; error?: string };
      if (!res.ok || !data.result) throw new Error(data.error || "Could not run the analysis.");
      setPhase("replaying");
      await replay(data.result.runs);
      if (cancelled.current) return;
      setResult(data.result);
      setPhase("done");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not run the analysis.");
      setPhase(result ? "done" : "idle");
      setAgents(initialStates());
    }
  };

  const busy = phase === "requesting" || phase === "replaying";
  const doneCount = AGENTS.filter((a) => agents[a.id].status === "done").length;
  const topRequired = Object.entries(
    inputs.jobs.flatMap((j) => j.requiredSkills).reduce<Record<string, number>>((acc, s) => ((acc[s] = (acc[s] ?? 0) + 1), acc), {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return (
    <DashboardShell>
      <DashboardContainer className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate/10 px-2.5 py-1 text-xs font-semibold text-slate">
              <Cpu className="h-3.5 w-3.5" /> Multi-agent AI layer
            </span>
            <h1 className="mt-3 text-2xl font-bold text-navy">AI Career Analysis</h1>
            <p className="mt-1 text-sm text-mediumgray">
              Your profile and live industry requirements go through six coordinated agents to produce your skill profile, roadmap, learning plan, verification plan and matches.
            </p>
          </div>
          <div className="flex items-center gap-3 self-start sm:self-auto">
            {result && phase === "done" && (
              <span className="text-xs text-mediumgray">Last run {timeAgo(result.generatedAt)}</span>
            )}
            <button
              type="button"
              onClick={run}
              disabled={busy}
              data-tour="analysis-run"
              className="inline-flex items-center gap-2 rounded-lg bg-primary-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(234,88,12,0.25)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : result ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {busy ? "Agents working…" : result ? "Re-run analysis" : "Run analysis"}
            </button>
          </div>
        </div>

        {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        {/* Inputs → Agents → Outputs */}
        <div data-tour="analysis-inputs" className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-700"><User className="h-4 w-4" /></span>
              <h2 className="text-sm font-semibold text-navy">Student data</h2>
              <span className="ml-auto text-[11px] text-mediumgray">from your profile & roadmap goals</span>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-xs text-mediumgray">Desired role</dt><dd className="font-medium text-navy">{inputs.student.targetRole}</dd></div>
              <div><dt className="text-xs text-mediumgray">Target company</dt><dd className="font-medium text-navy">{inputs.student.targetCompany || "Any"}</dd></div>
              <div><dt className="text-xs text-mediumgray">Experience</dt><dd className="font-medium text-navy">{inputs.student.experienceLevel || "Entry level"}</dd></div>
              <div><dt className="text-xs text-mediumgray">Modules passed</dt><dd className="font-medium text-navy">{inputs.student.passedModules.length}</dd></div>
            </dl>
            <p className="mt-4 text-xs text-mediumgray">
              Current skills ({inputs.student.skills.filter((s) => s.verified).length} verified · {inputs.student.skills.filter((s) => !s.verified).length} claimed)
              {inputs.student.skills.some((s) => !s.verified) && <> · <Link href="/student/assessment" className="font-semibold text-slate hover:underline">verify</Link></>}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {inputs.student.skills.length === 0 && (
                <span className="text-xs text-mediumgray">None yet — <Link href="/student/roadmap" className="font-semibold text-slate">start your roadmap</Link> to earn verified skills.</span>
              )}
              {inputs.student.skills.map((s) => (
                <span key={s.name} title={s.verified ? "Verified" : "Claimed — not yet verified"} className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${s.verified ? "bg-emerald/10 text-emerald" : "bg-gold/15 text-amber-700"}`}>
                  {s.verified ? <CircleCheck className="h-3 w-3" /> : <CircleDashed className="h-3 w-3" />}{s.name}
                </span>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-700"><Building className="h-4 w-4" /></span>
              <h2 className="text-sm font-semibold text-navy">Company / industry requirements</h2>
              <span className="ml-auto text-[11px] text-mediumgray">live from posted openings</span>
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <div><dt className="text-xs text-mediumgray">Openings</dt><dd className="font-medium text-navy">{inputs.jobs.length}</dd></div>
              <div><dt className="text-xs text-mediumgray">Internships</dt><dd className="font-medium text-navy">{inputs.jobs.filter((j) => /intern|apprentice/i.test(j.type)).length}</dd></div>
              <div><dt className="text-xs text-mediumgray">Companies</dt><dd className="font-medium text-navy">{new Set(inputs.jobs.map((j) => j.company)).size}</dd></div>
            </dl>
            <p className="mt-4 text-xs text-mediumgray">Most-required skills across openings</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {topRequired.map(([skill, n]) => (
                <span key={skill} className="inline-flex items-center gap-1 rounded-md bg-surface px-2 py-0.5 text-xs font-medium text-navy">
                  {skill}<span className="text-[10px] text-mediumgray">×{n}</span>
                </span>
              ))}
            </div>
          </Card>
        </div>

        {/* AI Agent service: evidence from public coding activity (background task) */}
        <CodingEvidence initial={codingEvidence} defaultGithub={githubDefault} />

        {/* Orchestration panel */}
        <Card className="overflow-hidden">
          <div data-tour="analysis-agents" className="flex flex-wrap items-center justify-between gap-3 border-b border-lightgray px-5 py-3.5">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy text-white"><Bot className="h-4 w-4" /></span>
              <div>
                <h2 className="text-sm font-semibold text-navy">Agent orchestration layer</h2>
                <p className="text-[11px] text-mediumgray">Coordinates agents · manages context · generates final output</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full border border-lightgray px-2.5 py-1 text-[11px] font-medium text-mediumgray" title="These scoring agents are rule-based and instant. The AI Agent service powers roadmaps, AI tests, interviews and coding evidence.">
                Scoring: rule-based · instant
              </span>
              <span className="text-xs font-medium tabular-nums text-navy">{doneCount} / {AGENTS.length}</span>
            </div>
          </div>
          <div className="px-5 pt-4">
            <ProgressBar value={(doneCount / AGENTS.length) * 100} barClass={doneCount === AGENTS.length ? "bg-emerald" : "bg-slate"} />
          </div>
          <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
            {AGENTS.map((a, i) => {
              const state = agents[a.id];
              const run = result?.runs.find((r) => r.id === a.id) ?? null;
              const Icon = AGENT_ICON[a.id];
              return (
                <div
                  key={a.id}
                  className={`rounded-xl border p-4 transition-colors ${
                    state.status === "running" ? "border-slate bg-slate/5" : state.status === "done" ? "border-emerald/30 bg-emerald/5" : "border-lightgray bg-white"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${state.status === "done" ? "bg-emerald/10 text-emerald" : state.status === "running" ? "bg-slate/10 text-slate" : "bg-surface text-mediumgray"}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-navy">{i + 1}. {a.name}</p>
                        {state.status === "running" ? (
                          <LoaderCircle className="h-4 w-4 animate-spin text-slate" />
                        ) : state.status === "done" ? (
                          <CircleCheck className="h-4 w-4 text-emerald" />
                        ) : (
                          <CircleDashed className="h-4 w-4 text-mediumgray/60" />
                        )}
                      </div>
                      <p className="text-[11px] text-mediumgray">{a.role}</p>
                    </div>
                  </div>

                  <ul className="mt-3 min-h-[3.5rem] space-y-1 font-mono text-[11px] leading-relaxed text-navy/80">
                    {state.status === "idle" && (
                      <li className="text-mediumgray">→ {a.inputs.join(" + ")}<br />← {a.outputs.join(", ")}</li>
                    )}
                    {state.status === "queued" && <li className="text-mediumgray">waiting for orchestrator…</li>}
                    <AnimatePresence initial={false}>
                      {run && state.status !== "idle" && state.status !== "queued" &&
                        run.logs.slice(0, state.shownLogs).map((l, k) => (
                          <motion.li key={k} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.18 }}>
                            <span className="text-slate">›</span> {l}
                          </motion.li>
                        ))}
                    </AnimatePresence>
                    {!run && state.status === "running" && <li className="text-mediumgray">processing…</li>}
                  </ul>
                  {state.status === "done" && run && (
                    <p className="mt-2 border-t border-emerald/20 pt-2 text-xs font-semibold text-emerald">{run.summary}</p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Outputs */}
        {result && phase === "done" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6" data-tour="analysis-outputs">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-slate" />
              <h2 className="text-lg font-bold text-navy">Output / results</h2>
            </div>

            {/* 1. Skill profile */}
            <Card className="p-6">
              <div className="flex flex-col gap-6 lg:flex-row">
                <div className="flex shrink-0 flex-col items-center justify-center rounded-2xl bg-surface-2 p-6 lg:w-56">
                  <p className="text-xs font-medium text-mediumgray">Industry compatibility</p>
                  <p className={`mt-1 text-5xl font-bold ${result.analysis.compatibility >= 70 ? "text-emerald" : result.analysis.compatibility >= 40 ? "text-amber-600" : "text-red-600"}`}>
                    {result.analysis.compatibility}%
                  </p>
                  <p className="mt-1 text-center text-xs text-mediumgray">for {result.analysis.targetRole}<br />across {result.analysis.jobsAnalysed} openings</p>
                </div>
                <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-3">
                  <SkillColumn title="Strengths" tone="emerald" items={result.analysis.strengths} empty="No verified strengths yet" />
                  <SkillColumn title="Developing" tone="amber" items={result.analysis.developing} empty="Nothing in progress" />
                  <SkillColumn title="Skill gaps" tone="red" items={result.analysis.gaps} empty="No gaps — great!" roadmapLinks />
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              {/* 2. Roadmap */}
              <Card className="p-6">
                <SectionHead icon={Route} title="Personalised roadmap" hint={`${result.roadmap.title} · ~${result.roadmap.totalWeeks} weeks to close gaps`} />
                <ol className="mt-4 space-y-2">
                  {result.roadmap.milestones.length === 0 && <li className="text-sm text-mediumgray">No gap-closing modules — your roadmap is complete for this role.</li>}
                  {result.roadmap.milestones.slice(0, 6).map((m) => (
                    <li key={m.moduleId} className="flex items-center gap-3 rounded-lg border border-lightgray p-3">
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${m.done ? "bg-emerald text-white" : "bg-surface text-navy"}`}>
                        {m.done ? <Check className="h-3.5 w-3.5" /> : m.moduleId}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-navy">{m.title}</span>
                        <span className="text-[11px] text-mediumgray">{m.phase} · {m.weeks} wk · closes {m.covers.join(", ") || "—"}</span>
                      </span>
                      <Link href={`/student/roadmap/${m.moduleId}`} className="text-xs font-semibold text-slate hover:underline">{m.done ? "Review" : "Start"}</Link>
                    </li>
                  ))}
                </ol>
                <Link href="/student/roadmap" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-slate hover:underline">Open full roadmap <ArrowRight className="h-4 w-4" /></Link>
              </Card>

              {/* 3. Learning */}
              <Card className="p-6">
                <SectionHead icon={GraduationCap} title="Learning recommendations" hint="Industry programs matched to your gaps" />
                <ul className="mt-4 space-y-2">
                  {result.learning.recommendations.length === 0 && <li className="text-sm text-mediumgray">No programs match your gaps right now.</li>}
                  {result.learning.recommendations.map((r) => (
                    <li key={r.id} className="rounded-lg border border-lightgray p-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-navy">{r.title}</span>
                          <span className="text-[11px] text-mediumgray">{r.company} · {r.type} · {r.duration} · {r.mode}</span>
                        </span>
                        <span className="shrink-0 rounded-full bg-slate/10 px-2 py-0.5 text-[11px] font-semibold text-slate">{r.type}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {r.covers.map((c) => <span key={c} className="rounded bg-emerald/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald">{c}</span>)}
                      </div>
                    </li>
                  ))}
                </ul>
                <Link href="/student/learning" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-slate hover:underline">All learning programs <ArrowRight className="h-4 w-4" /></Link>
              </Card>

              {/* 4. Assessment */}
              <Card className="p-6">
                <SectionHead icon={ShieldCheck} title="Skill verification plan" hint={`${result.assessment.verifiedCount} verified · ${result.assessment.pendingCount} pending`} />
                <ul className="mt-4 divide-y divide-lightgray">
                  {result.assessment.plan.length === 0 && <li className="py-2 text-sm text-mediumgray">Nothing to verify — all demanded skills are verified.</li>}
                  {result.assessment.plan.map((p) => (
                    <li key={p.skill} className="flex items-center gap-3 py-2.5">
                      {p.status === "verified" ? <CircleCheck className="h-4 w-4 shrink-0 text-emerald" /> : p.status === "pending" ? <CircleDashed className="h-4 w-4 shrink-0 text-amber-500" /> : <Lock className="h-4 w-4 shrink-0 text-mediumgray" />}
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-navy">{p.skill}</span>
                        <span className="text-[11px] text-mediumgray">{p.test ? `Skill test: ${p.test}` : p.moduleTitle ? `Roadmap quiz: ${p.moduleTitle}` : "No test yet — stays self-declared"}</span>
                      </span>
                      {p.status === "pending" && p.test && (
                        <Link href={`/student/assessment/test/${encodeURIComponent(p.test)}`} className="text-xs font-semibold text-slate hover:underline">Take test</Link>
                      )}
                      {p.status === "pending" && !p.test && p.moduleId != null && (
                        <Link href={`/student/roadmap/${p.moduleId}`} className="text-xs font-semibold text-slate hover:underline">Take quiz</Link>
                      )}
                      {p.status === "verified" && <span className="rounded-full bg-emerald/10 px-2 py-0.5 text-[10px] font-semibold text-emerald">Verified</span>}
                    </li>
                  ))}
                </ul>
              </Card>

              {/* 6. Collaboration */}
              <Card className="p-6">
                <SectionHead icon={Handshake} title="Industry collaboration" hint="Workshops, guest lectures, live projects" />
                <ul className="mt-4 space-y-2">
                  {result.collaboration.suggestions.map((s) => (
                    <li key={s.id} className="rounded-lg border border-lightgray p-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-navy">{s.title}</span>
                          <span className="text-[11px] text-mediumgray">{s.company} · {new Date(s.startsAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · {s.reason}</span>
                        </span>
                        <span className="shrink-0 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700">{s.type}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            {/* 5. Matching */}
            <Card className="p-6">
              <SectionHead icon={Briefcase} title="Job & internship matching" hint={`${result.matching.internships} internships · ${result.matching.jobs} jobs, ranked by skill compatibility`} />
              <ul className="mt-4 space-y-2">
                {result.matching.matches.map((m) => (
                  <li key={m.jobId} className="flex flex-col gap-3 rounded-lg border border-lightgray p-4 sm:flex-row sm:items-center">
                    <div className="flex w-16 shrink-0 flex-col items-center">
                      <span className={`text-xl font-bold ${m.score >= 70 ? "text-emerald" : m.score >= 40 ? "text-amber-600" : "text-mediumgray"}`}>{m.score}%</span>
                      <span className="text-[10px] text-mediumgray">match</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-navy">{m.role}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${/intern|apprentice/i.test(m.type) ? "bg-sky-50 text-sky-700" : "bg-surface text-navy"}`}>{m.type}</span>
                      </div>
                      <p className="text-[11px] text-mediumgray">{m.company} · {m.location}{m.salary ? ` · ${m.salary}` : ""}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {m.matched.map((s) => <span key={s} className="rounded bg-emerald/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald">✓ {s}</span>)}
                        {m.missing.map((s) => <span key={s} className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600">✗ {s}</span>)}
                      </div>
                    </div>
                    <Link href="/student/jobs" className="inline-flex shrink-0 items-center justify-center gap-1 rounded-lg border border-lightgray px-3 py-2 text-xs font-semibold text-navy transition-colors hover:border-slate hover:text-slate">
                      <Target className="h-3.5 w-3.5" /> View & apply
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          </motion.div>
        )}
      </DashboardContainer>
    </DashboardShell>
  );
}

function SectionHead({ icon: Icon, title, hint }: { icon: typeof Route; title: string; hint: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate/10 text-slate"><Icon className="h-4 w-4" /></span>
      <div>
        <h3 className="text-sm font-semibold text-navy">{title}</h3>
        <p className="text-[11px] text-mediumgray">{hint}</p>
      </div>
    </div>
  );
}

function SkillColumn({
  title,
  tone,
  items,
  empty,
  roadmapLinks = false,
}: {
  title: string;
  tone: "emerald" | "amber" | "red";
  items: { skill: string; demand: number; level: number; verified: boolean }[];
  empty: string;
  /** Offer an AI roadmap for each skill (used for gaps). */
  roadmapLinks?: boolean;
}) {
  const bar = tone === "emerald" ? "bg-emerald" : tone === "amber" ? "bg-amber-500" : "bg-red-500";
  const chip = tone === "emerald" ? "text-emerald" : tone === "amber" ? "text-amber-600" : "text-red-600";
  return (
    <div>
      <p className={`text-xs font-semibold uppercase tracking-wide ${chip}`}>{title} · {items.length}</p>
      <ul className="mt-2 space-y-2">
        {items.length === 0 && <li className="text-xs text-mediumgray">{empty}</li>}
        {items.slice(0, 6).map((s) => (
          <li key={s.skill}>
            <div className="flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1 font-medium text-navy">{s.skill}{s.verified && <CircleCheck className="h-3 w-3 text-emerald" />}</span>
              <span className="flex items-center gap-2">
                {roadmapLinks && (
                  <Link href={`/student/roadmap?skill=${encodeURIComponent(s.skill)}`} className="text-[10px] font-semibold text-slate hover:underline" title={`Generate an AI learning roadmap for ${s.skill}`}>
                    AI roadmap
                  </Link>
                )}
                <span className="text-[10px] text-mediumgray">demand {s.demand}%</span>
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-lightgray">
              <div className={`h-full rounded-full ${bar}`} style={{ width: `${s.demand}%` }} />
            </div>
          </li>
        ))}
        {items.length > 6 && <li className="text-[11px] text-mediumgray">+{items.length - 6} more</li>}
      </ul>
    </div>
  );
}
