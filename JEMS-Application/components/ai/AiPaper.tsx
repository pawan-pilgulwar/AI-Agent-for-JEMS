"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CircleCheck,
  CircleX,
  Clock,
  FileQuestion,
  LoaderCircle,
  Mic,
  Play,
  RotateCcw,
  ShieldCheck,
  Timer,
  TriangleAlert,
} from "lucide-react";
import DashboardShell, { DashboardContainer } from "@/components/dashboard/student/DashboardShell";
import { Card, ProgressBar } from "@/components/dashboard/student/ui";
import CodeQuestion from "@/components/ai/CodeQuestion";
import TaskStatus from "@/components/ai/TaskStatus";
import type { CodingLanguage, StudentQuestion } from "@/lib/agent/types";
import type { ClientAnswer, PaperStatus, PaperView, QuestionReview } from "@/lib/ai/papers-shared";
import { startAiTask, useAiTasks } from "@/lib/ai-tasks/use-tasks";

const RANK: Record<PaperStatus, number> = { ready: 0, "in-progress": 1, submitted: 2, graded: 3 };
const TYPE_LABEL: Record<StudentQuestion["type"], string> = { mcq: "Single choice", multi_select: "Select all that apply", short_answer: "Written answer", coding: "Coding" };

function draftKey(id: string, generation: string) {
  return `jems:paper-draft:${id}:${generation}`;
}

function readDraftRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function parseDraft(raw: string | null): Record<string, ClientAnswer> {
  try {
    return raw ? (JSON.parse(raw) as Record<string, ClientAnswer>) : {};
  } catch {
    return {};
  }
}

// The draft is only read on render; nothing else writes it, so no subscription.
const noSubscribe = () => () => {};

function isAnswered(q: StudentQuestion, a: ClientAnswer | undefined): boolean {
  if (a == null) return false;
  if (q.type === "multi_select") return Array.isArray(a) && a.length > 0;
  if (q.type === "short_answer") return typeof a === "string" && a.trim().length > 0;
  if (q.type === "coding") return typeof a === "object" && !Array.isArray(a) && a.source_code.trim().length > 0;
  return typeof a === "number";
}

/**
 * Takes an AI-generated paper end to end: intro → timed attempt (answers are
 * drafted locally so a refresh doesn't lose them) → background grading with
 * live status → detailed review. Used for AI skill tests and mock interviews.
 */
export default function AiPaper({ initial }: { initial: PaperView }) {
  const router = useRouter();
  // Local state wins only while it's ahead of the server copy of the *same* paper generation.
  const [local, setLocal] = useState<PaperView | null>(null);
  const paper = local && local.generationId === initial.generationId && RANK[local.status] > RANK[initial.status] ? local : initial;

  // Answers edited in this session; merged over a local draft (see below).
  const [edits, setAnswers] = useState<Record<string, ClientAnswer>>(initial.answers);
  const [idx, setIdx] = useState(0);
  const [left, setLeft] = useState<number | null>(null);
  const [busy, setBusy] = useState<"start" | "submit" | "regrade" | "regen" | null>(null);
  const [error, setError] = useState("");
  const submitted = useRef(false);
  const key = draftKey(paper.id, paper.generationId);

  // A local draft survives a reload mid-attempt: answers = draft + this session's edits.
  const draftRaw = useSyncExternalStore(noSubscribe, () => readDraftRaw(key), () => null);
  const draft = useMemo(() => parseDraft(draftRaw), [draftRaw]);
  const answers = useMemo(() => (paper.status === "in-progress" ? { ...draft, ...edits } : edits), [draft, edits, paper.status]);
  const answersJson = JSON.stringify(answers);

  const { track, latestFor } = useAiTasks(["assessment.grade", "assessment.generate"], {
    onSettled: () => router.refresh(),
    idlePolling: false,
  });
  const gradeTask = latestFor(paper.id, "assessment.grade");
  const regenTask = latestFor(paper.subject, "assessment.generate");

  // Keep the draft in sync while answering.
  useEffect(() => {
    if (paper.status !== "in-progress") return;
    try {
      window.localStorage.setItem(key, answersJson);
    } catch {
      // Private mode / storage full — answers still live in memory.
    }
  }, [answersJson, key, paper.status]);

  const start = async () => {
    setBusy("start");
    setError("");
    try {
      const res = await fetch(`/api/student/ai/papers/${paper.id}`, { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as { paper?: PaperView; error?: string };
      if (!res.ok || !data.paper) throw new Error(data.error || "Could not open the paper.");
      setLocal(data.paper);
      setAnswers(data.paper.answers);
      setIdx(0);
      submitted.current = false;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open the paper.");
    } finally {
      setBusy(null);
    }
  };

  const submit = useCallback(
    async (auto = false) => {
      if (submitted.current) return;
      submitted.current = true;
      setBusy("submit");
      setError("");
      try {
        const res = await fetch(`/api/student/ai/papers/${paper.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers }),
        });
        const data = (await res.json().catch(() => ({}))) as { task?: Parameters<typeof track>[0]; error?: string };
        if (!res.ok || !data.task) throw new Error(data.error || "Could not submit your answers.");
        track(data.task);
        window.dispatchEvent(new Event("jems:ai-task-started"));
        setLocal({ ...paper, status: "submitted", answers });
        try {
          window.localStorage.removeItem(key);
        } catch {
          // ignore
        }
        if (auto) setError("Time is up — your answers were submitted automatically.");
      } catch (e) {
        submitted.current = false;
        setError(e instanceof Error ? e.message : "Could not submit your answers.");
      } finally {
        setBusy(null);
      }
    },
    [answers, key, paper, track],
  );

  // Countdown; auto-submit at zero.
  useEffect(() => {
    if (paper.status !== "in-progress" || !paper.expiresAt) return;
    const end = new Date(paper.expiresAt).getTime();
    const tick = () => {
      const s = Math.max(0, Math.round((end - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) submit(true);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [paper.status, paper.expiresAt, submit]);

  const regrade = async () => {
    setBusy("regrade");
    setError("");
    try {
      const res = await fetch(`/api/student/ai/papers/${paper.id}`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { task?: Parameters<typeof track>[0]; error?: string };
      if (!res.ok || !data.task) throw new Error(data.error || "Could not retry grading.");
      track(data.task);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not retry grading.");
    } finally {
      setBusy(null);
    }
  };

  const regenerate = async () => {
    setBusy("regen");
    setError("");
    try {
      const body = paper.purpose === "interview" ? { purpose: "interview", interviewType: paper.interviewType } : { purpose: "skill", skill: paper.subject };
      track(await startAiTask("/api/student/ai/papers", body));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate a new paper.");
    } finally {
      setBusy(null);
    }
  };

  const isInterview = paper.purpose === "interview";
  const backHref = isInterview ? "/student/interviews" : "/student/assessment";
  const Icon = isInterview ? Mic : ShieldCheck;
  const answered = paper.questions.filter((q) => isAnswered(q, answers[q.id])).length;
  const q = paper.questions[idx];
  const mm = left != null ? String(Math.floor(left / 60)).padStart(2, "0") : "--";
  const ss = left != null ? String(left % 60).padStart(2, "0") : "--";

  return (
    <DashboardShell>
      <DashboardContainer className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href={backHref} className="inline-flex items-center gap-1 text-sm font-semibold text-slate hover:underline"><ArrowLeft className="h-4 w-4" /> {isInterview ? "Mock interviews" : "Skill assessment"}</Link>
            <span className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-slate"><Icon className="h-3.5 w-3.5" /> {isInterview ? "AI mock interview" : "AI skill test"}</span>
            <h1 className="mt-1 text-2xl font-bold text-navy">{paper.subject}</h1>
          </div>
          {paper.status === "in-progress" && (
            <span className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold tabular-nums ${left != null && left < 120 ? "bg-red-50 text-red-600" : "bg-surface text-navy"}`}>
              <Timer className="h-4 w-4" /> {mm}:{ss}
            </span>
          )}
        </div>

        {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        {/* Intro */}
        {paper.status === "ready" && (
          <Card className="p-8 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate/10 text-slate"><FileQuestion className="h-7 w-7" /></span>
            <h2 className="mt-4 text-lg font-bold text-navy">Ready when you are</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-mediumgray">
              {paper.questionCount} questions · {paper.totalMarks} marks · <span className="font-semibold text-navy">{paper.minutes} minutes</span>. The timer starts when you press Start and keeps running if you leave the page. Answers are submitted automatically when time runs out.
            </p>
            {!isInterview && <p className="mx-auto mt-2 max-w-md text-xs text-mediumgray">Score 70% or more to verify {paper.subject} on your profile. A fail locks retakes for 24 hours.</p>}
            {paper.warnings.length > 0 && <p className="mx-auto mt-3 max-w-md text-xs text-amber-700">{paper.warnings.join(" ")}</p>}
            <button type="button" onClick={start} disabled={busy === "start"} className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary-gradient px-6 py-2.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(234,88,12,0.25)] transition-transform hover:-translate-y-0.5 disabled:opacity-60">
              {busy === "start" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Start
            </button>
          </Card>
        )}

        {/* Attempt */}
        {paper.status === "in-progress" && q && (
          <Card className="p-6">
            <div className="flex items-center justify-between text-xs text-mediumgray">
              <span>Question {idx + 1} of {paper.questions.length} · {TYPE_LABEL[q.type]} · {q.marks} mark{q.marks === 1 ? "" : "s"}</span>
              <span>{answered} answered</span>
            </div>
            <div className="mt-2"><ProgressBar value={((idx + 1) / paper.questions.length) * 100} /></div>

            {q.title && <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-slate">{q.title}</p>}
            <h2 className={`${q.title ? "mt-1" : "mt-6"} whitespace-pre-wrap text-base font-semibold text-navy`}>{q.text}</h2>

            <div className="mt-4">
              {q.type === "mcq" && (
                <div role="radiogroup" className="space-y-2">
                  {(q.options ?? []).map((o, i) => {
                    const selected = answers[q.id] === i;
                    return (
                      <button key={i} type="button" role="radio" aria-checked={selected} onClick={() => setAnswers((a) => ({ ...a, [q.id]: i }))}
                        className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left text-sm transition-colors ${selected ? "border-slate bg-slate/5 text-navy" : "border-lightgray text-navy hover:bg-surface-2"}`}>
                        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${selected ? "border-slate" : "border-mediumgray/50"}`}>{selected && <span className="h-2 w-2 rounded-full bg-slate" />}</span>
                        <span>{o}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {q.type === "multi_select" && (
                <div className="space-y-2">
                  {(q.options ?? []).map((o, i) => {
                    const picked = Array.isArray(answers[q.id]) ? (answers[q.id] as number[]) : [];
                    const selected = picked.includes(i);
                    return (
                      <button key={i} type="button" role="checkbox" aria-checked={selected}
                        onClick={() => setAnswers((a) => ({ ...a, [q.id]: selected ? picked.filter((x) => x !== i) : [...picked, i].sort((x, y) => x - y) }))}
                        className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left text-sm transition-colors ${selected ? "border-slate bg-slate/5 text-navy" : "border-lightgray text-navy hover:bg-surface-2"}`}>
                        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 ${selected ? "border-slate bg-slate text-white" : "border-mediumgray/50"}`}>{selected && <CircleCheck className="h-3 w-3" />}</span>
                        <span>{o}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {q.type === "short_answer" && (
                <div>
                  <textarea
                    value={typeof answers[q.id] === "string" ? (answers[q.id] as string) : ""}
                    onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value.slice(0, 4_000) }))}
                    rows={7}
                    placeholder={isInterview ? "Answer as you would in the interview — use a real example where you can." : "Explain in 2–5 sentences."}
                    className="w-full rounded-lg border border-lightgray bg-white p-3 text-sm text-navy outline-none focus:border-slate focus:ring-2 focus:ring-slate/15"
                  />
                  <p className="mt-1 text-right text-[11px] text-mediumgray">{(typeof answers[q.id] === "string" ? (answers[q.id] as string).length : 0).toLocaleString()} / 4,000</p>
                </div>
              )}
              {q.type === "coding" && (
                <CodeQuestion
                  q={q}
                  value={answers[q.id] as { language: CodingLanguage; source_code: string } | undefined}
                  onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
                />
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-lightgray bg-white py-2.5 text-sm font-semibold text-navy hover:border-slate hover:text-slate disabled:opacity-40"><ArrowLeft className="h-4 w-4" /> Previous</button>
              {idx < paper.questions.length - 1 ? (
                <button type="button" onClick={() => setIdx((i) => i + 1)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary-gradient py-2.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(234,88,12,0.25)]">Next <ArrowRight className="h-4 w-4" /></button>
              ) : (
                <button type="button" onClick={() => submit()} disabled={busy === "submit"} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary-gradient py-2.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(234,88,12,0.25)] disabled:cursor-not-allowed disabled:opacity-60">
                  {busy === "submit" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CircleCheck className="h-4 w-4" />} Submit {answered < paper.questions.length ? `(${paper.questions.length - answered} unanswered)` : ""}
                </button>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {paper.questions.map((x, i) => (
                <button key={x.id} type="button" onClick={() => setIdx(i)} aria-label={`Question ${i + 1}`} className={`h-7 w-7 rounded-md text-xs font-semibold ${i === idx ? "bg-navy text-white" : isAnswered(x, answers[x.id]) ? "bg-emerald/10 text-emerald" : "bg-surface text-mediumgray"}`}>{i + 1}</button>
              ))}
            </div>
          </Card>
        )}

        {/* Grading */}
        {paper.status === "submitted" && (
          <Card className="p-8 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate/10 text-slate">
              {gradeTask?.status === "failed" ? <TriangleAlert className="h-7 w-7" /> : <LoaderCircle className="h-7 w-7 animate-spin" />}
            </span>
            <h2 className="mt-4 text-lg font-bold text-navy">{gradeTask?.status === "failed" ? "Grading didn't finish" : "Grading your answers"}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-mediumgray">
              Multiple-choice answers are checked instantly; written answers are reviewed by the AI and code is run against hidden tests. This can take a few minutes — you can leave this page, we&apos;ll notify you.
            </p>
            <div className="mx-auto mt-4 max-w-md text-left"><TaskStatus task={gradeTask} /></div>
            {gradeTask?.status === "failed" && (
              <button type="button" onClick={regrade} disabled={busy === "regrade"} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(234,88,12,0.25)] disabled:opacity-60">
                {busy === "regrade" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Retry grading
              </button>
            )}
          </Card>
        )}

        {/* Results */}
        {paper.status === "graded" && (
          <>
            <Card className={`p-8 text-center ${paper.passed ? "border-emerald/30" : "border-gold/40"}`}>
              <span className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${paper.passed ? "bg-emerald/10 text-emerald" : "bg-gold/15 text-amber-600"}`}>
                {paper.passed ? <BadgeCheck className="h-8 w-8" /> : <Clock className="h-8 w-8" />}
              </span>
              <p className={`mt-4 text-5xl font-bold ${paper.passed ? "text-emerald" : "text-amber-600"}`}>{paper.percent ?? 0}%</p>
              <p className="mx-auto mt-2 max-w-lg text-sm text-mediumgray">
                {isInterview
                  ? "Your interview score is saved to your history. Read the feedback on each answer below."
                  : paper.late
                    ? "Submitted after the time limit, so this attempt can't verify the skill."
                    : !paper.passed
                      ? "Below the 70% pass mark. Review the feedback, then try again after 24 hours."
                      : paper.pendingReview
                        ? "You passed! Some written answers were flagged for a quick faculty review before the skill is marked verified."
                        : `${paper.subject} is now verified on your profile — it counts for your resume, portfolio and job matching.`}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link href={backHref} className="inline-flex items-center gap-2 rounded-lg border border-lightgray bg-white px-5 py-2.5 text-sm font-semibold text-navy hover:border-slate hover:text-slate"><ArrowLeft className="h-4 w-4" /> Back</Link>
                {(isInterview || !paper.passed) && (
                  <button type="button" onClick={regenerate} disabled={busy === "regen" || regenTask?.status === "queued" || regenTask?.status === "running"} className="inline-flex items-center gap-2 rounded-lg bg-primary-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(234,88,12,0.25)] disabled:opacity-60">
                    {busy === "regen" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} {isInterview ? "New interview" : "Generate a new test"}
                  </button>
                )}
              </div>
              {regenTask && regenTask.status !== "succeeded" && <div className="mx-auto mt-4 max-w-md text-left"><TaskStatus task={regenTask} /></div>}
            </Card>

            <div className="space-y-3">
              {paper.questions.map((x, i) => (
                <ReviewItem key={x.id} n={i + 1} q={x} answer={answers[x.id] ?? paper.answers[x.id]} review={paper.review.find((r) => r.id === x.id)} />
              ))}
            </div>
          </>
        )}
      </DashboardContainer>
    </DashboardShell>
  );
}

function ReviewItem({ n, q, answer, review }: { n: number; q: StudentQuestion; answer: ClientAnswer | undefined; review?: QuestionReview }) {
  const full = review && review.score >= review.max;
  const none = !review || review.score === 0;
  const tone = full ? "text-emerald" : none ? "text-red-600" : "text-amber-600";
  const chosen = typeof answer === "number" ? [answer] : Array.isArray(answer) ? answer : [];

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-navy"><span className="text-mediumgray">{n}.</span> {q.title ? `${q.title} — ` : ""}<span className="whitespace-pre-wrap font-normal">{q.text}</span></p>
        <span className={`shrink-0 text-sm font-bold tabular-nums ${tone}`}>{review ? `${Math.round(review.score * 10) / 10}/${review.max}` : "—"}</span>
      </div>

      {(q.type === "mcq" || q.type === "multi_select") && (
        <ul className="mt-3 space-y-1.5">
          {(q.options ?? []).map((o, i) => {
            const isCorrect = review?.answerIndexes?.includes(i);
            const isChosen = chosen.includes(i);
            return (
              <li key={i} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${isCorrect ? "border-emerald/40 bg-emerald/5" : isChosen ? "border-red-200 bg-red-50" : "border-lightgray"}`}>
                {isCorrect ? <CircleCheck className="h-4 w-4 shrink-0 text-emerald" /> : isChosen ? <CircleX className="h-4 w-4 shrink-0 text-red-600" /> : <span className="h-4 w-4 shrink-0" />}
                <span className="flex-1 text-navy">{o}</span>
                {isChosen && <span className="text-[10px] font-semibold text-mediumgray">your answer</span>}
              </li>
            );
          })}
        </ul>
      )}

      {q.type === "short_answer" && (
        <div className="mt-3 space-y-2 text-sm">
          <p className="whitespace-pre-wrap rounded-lg bg-surface-2 p-3 text-navy">{typeof answer === "string" && answer.trim() ? answer : <span className="text-mediumgray">No answer given.</span>}</p>
          {review?.covered && review.covered.length > 0 && (
            <ul className="space-y-1">{review.covered.map((c) => <li key={c} className="flex items-start gap-1.5 text-xs text-emerald"><CircleCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />{c}</li>)}</ul>
          )}
          {review?.missing && review.missing.length > 0 && (
            <ul className="space-y-1">{review.missing.map((c) => <li key={c} className="flex items-start gap-1.5 text-xs text-red-600"><CircleX className="mt-0.5 h-3.5 w-3.5 shrink-0" />{c}</li>)}</ul>
          )}
          {review?.modelAnswer && (
            <details className="rounded-lg border border-lightgray p-3 text-xs">
              <summary className="cursor-pointer font-semibold text-navy">Model answer</summary>
              <p className="mt-2 whitespace-pre-wrap text-mediumgray">{review.modelAnswer}</p>
            </details>
          )}
        </div>
      )}

      {q.type === "coding" && (
        <div className="mt-3 space-y-2">
          {review?.detail && <p className="text-xs font-medium text-navy">{review.detail}</p>}
          {review?.tests && review.tests.length > 0 && (
            <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {review.tests.map((t) => (
                <li key={t.test} className={`rounded-lg border px-3 py-2 text-xs ${t.passed ? "border-emerald/30 bg-emerald/5" : "border-red-200 bg-red-50"}`}>
                  <span className={`inline-flex items-center gap-1 font-semibold ${t.passed ? "text-emerald" : "text-red-600"}`}>
                    {t.passed ? <CircleCheck className="h-3.5 w-3.5" /> : <CircleX className="h-3.5 w-3.5" />} {t.test} · {t.status}
                  </span>
                  {!t.passed && t.your_output != null && <pre className="mt-1 whitespace-pre-wrap font-mono text-[11px] text-navy">got: {t.your_output || "(nothing)"}{"\n"}expected: {t.expected}</pre>}
                  {!t.passed && t.error && <pre className="mt-1 whitespace-pre-wrap font-mono text-[11px] text-red-700">{t.error}</pre>}
                </li>
              ))}
            </ul>
          )}
          {typeof answer === "object" && answer && !Array.isArray(answer) && (
            <details className="rounded-lg border border-lightgray p-3 text-xs">
              <summary className="cursor-pointer font-semibold text-navy">Your code ({answer.language})</summary>
              <pre className="mt-2 max-h-72 overflow-auto rounded bg-[#0f172a] p-3 font-mono text-[12px] text-slate-100">{answer.source_code}</pre>
            </details>
          )}
        </div>
      )}

      {(review?.explanation || review?.feedback) && (
        <p className="mt-3 rounded-lg bg-slate/5 px-3 py-2 text-xs text-navy">{review.feedback || review.explanation}</p>
      )}
    </Card>
  );
}
