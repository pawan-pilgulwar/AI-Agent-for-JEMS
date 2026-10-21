"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, BadgeCheck, CircleCheck, LoaderCircle, Lock, ShieldCheck, Timer } from "lucide-react";
import DashboardShell, { DashboardContainer } from "@/components/dashboard/student/DashboardShell";
import { Card, ProgressBar } from "@/components/dashboard/student/ui";
import { LEVEL_LABEL, PASS_MARK } from "@/lib/assessment/engine";
import type { StartedTest, TestResult } from "@/lib/db/assessment";

/**
 * Timed skill test run by the Assessment Agent. Questions come from the
 * server (no answer key on the client); answers are graded server-side and a
 * pass verifies the skill on the student's profile.
 */
export default function SkillTest({ skill }: { skill: string }) {
  const router = useRouter();
  const [test, setTest] = useState<StartedTest | null>(null);
  const [error, setError] = useState("");
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [left, setLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const submittedRef = useRef(false);

  // Start the test on mount.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/student/assessment/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ skill }) })
      .then(async (r) => ({ ok: r.ok, data: (await r.json().catch(() => ({}))) as StartedTest & { error?: string } }))
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (!ok) throw new Error(data.error || "Could not start the test.");
        setTest(data);
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => { cancelled = true; };
  }, [skill]);

  const submit = async (auto = false) => {
    if (!test || submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      const res = await fetch("/api/student/assessment/test", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: test.sessionId, answers: test.questions.map((q) => answers[q.index] ?? "") }),
      });
      const data = (await res.json().catch(() => ({}))) as TestResult & { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not submit.");
      setResult(data);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit.");
      submittedRef.current = false;
    } finally {
      setSubmitting(false);
      if (auto) setError((e) => e || "Time is up — your answers were submitted automatically.");
    }
  };

  // Countdown; auto-submit at zero.
  useEffect(() => {
    if (!test || result) return;
    const end = new Date(test.expiresAt).getTime();
    const tick = () => {
      const s = Math.max(0, Math.round((end - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) submit(true);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [test, result]);

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  const answered = test ? test.questions.filter((q) => answers[q.index]).length : 0;

  return (
    <DashboardShell>
      <DashboardContainer className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate/10 px-2.5 py-1 text-xs font-semibold text-slate"><ShieldCheck className="h-3.5 w-3.5" /> Skill test</span>
            <h1 className="mt-2 text-2xl font-bold text-navy">{test?.skill ?? skill}</h1>
          </div>
          {test && !result && (
            <span className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold tabular-nums ${left < 60 ? "bg-red-50 text-red-600" : "bg-surface text-navy"}`}><Timer className="h-4 w-4" /> {mm}:{ss}</span>
          )}
        </div>

        {error && !result && (
          <Card className="p-6">
            <p className="text-sm text-red-600">{error}</p>
            <Link href="/student/assessment" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-slate hover:underline"><ArrowLeft className="h-4 w-4" /> Back to assessment</Link>
          </Card>
        )}

        {!test && !error && (
          <Card className="flex items-center justify-center gap-3 p-10 text-sm text-mediumgray"><LoaderCircle className="h-5 w-5 animate-spin text-slate" /> Assessment Agent is generating your test…</Card>
        )}

        {test && !result && (
          <Card className="p-6">
            <div className="flex items-center justify-between text-xs text-mediumgray"><span>Question {idx + 1} of {test.questions.length}</span><span>{answered} answered · pass mark {PASS_MARK}%</span></div>
            <div className="mt-2"><ProgressBar value={((idx + 1) / test.questions.length) * 100} /></div>
            <h2 className="mt-6 text-base font-semibold text-navy">{test.questions[idx].q}</h2>
            <div role="radiogroup" className="mt-4 space-y-2">
              {test.questions[idx].options.map((o) => {
                const selected = answers[test.questions[idx].index] === o;
                return (
                  <button key={o} type="button" role="radio" aria-checked={selected} onClick={() => setAnswers((a) => ({ ...a, [test.questions[idx].index]: o }))}
                    className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left text-sm transition-colors ${selected ? "border-slate bg-slate/5 text-navy" : "border-lightgray text-navy hover:bg-surface-2"}`}>
                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${selected ? "border-slate" : "border-mediumgray/50"}`}>{selected && <span className="h-2 w-2 rounded-full bg-slate" />}</span>
                    <span className="font-mono text-[13px]">{o}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-lightgray bg-white py-2.5 text-sm font-semibold text-navy hover:border-slate hover:text-slate disabled:opacity-40"><ArrowLeft className="h-4 w-4" /> Previous</button>
              {idx < test.questions.length - 1 ? (
                <button type="button" onClick={() => setIdx((i) => i + 1)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary-gradient py-2.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(234,88,12,0.25)]">Next <ArrowRight className="h-4 w-4" /></button>
              ) : (
                <button type="button" onClick={() => submit()} disabled={submitting || answered < test.questions.length} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary-gradient py-2.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(234,88,12,0.25)] disabled:cursor-not-allowed disabled:opacity-60">
                  {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CircleCheck className="h-4 w-4" />} Submit test
                </button>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {test.questions.map((q, i) => (
                <button key={q.index} type="button" onClick={() => setIdx(i)} className={`h-7 w-7 rounded-md text-xs font-semibold ${i === idx ? "bg-navy text-white" : answers[q.index] ? "bg-emerald/10 text-emerald" : "bg-surface text-mediumgray"}`}>{i + 1}</button>
              ))}
            </div>
          </Card>
        )}

        {result && (
          <Card className={`p-8 text-center ${result.passed ? "border-emerald/30" : "border-gold/40"}`}>
            <span className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${result.passed ? "bg-emerald/10 text-emerald" : "bg-gold/15 text-amber-600"}`}>
              {result.passed ? <BadgeCheck className="h-10 w-10" /> : <Lock className="h-10 w-10" />}
            </span>
            <h2 className="mt-5 text-2xl font-bold text-navy">{result.passed ? `${result.skill} verified` : "Not verified yet"}</h2>
            <p className={`mt-2 text-5xl font-bold ${result.passed ? "text-emerald" : "text-amber-600"}`}>{result.score}%</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-mediumgray">
              {result.correct} of {result.total} correct.{" "}
              {result.passed
                ? `Recorded as ${LEVEL_LABEL(result.level)} on your profile — it now counts for your resume, portfolio and job matching.`
                : `You need ${PASS_MARK}% to verify. ${result.lockedUntil ? `You can retry after ${new Date(result.lockedUntil).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}.` : ""} Until then it stays a self-declared claim.`}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/student/assessment" className="inline-flex items-center gap-2 rounded-lg border border-lightgray bg-white px-5 py-2.5 text-sm font-semibold text-navy hover:border-slate hover:text-slate"><ArrowLeft className="h-4 w-4" /> Back to assessment</Link>
              {result.passed && <Link href="/student/profile?tab=portfolio" className="inline-flex items-center gap-2 rounded-lg bg-primary-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(234,88,12,0.25)]">View portfolio <ArrowRight className="h-4 w-4" /></Link>}
            </div>
          </Card>
        )}
      </DashboardContainer>
    </DashboardShell>
  );
}
