"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CircleCheck,
  Clock,
  Code,
  FileText,
  Lightbulb,
  LoaderCircle,
  Lock,
  RotateCcw,
  Trophy,
  Video,
} from "lucide-react";
import DashboardShell, { DashboardContainer } from "@/components/dashboard/student/DashboardShell";
import { Card, ProgressBar } from "@/components/dashboard/student/ui";
import { type ModuleContent, PASS_MARK } from "@/lib/roadmap/module";
import LessonPlayer from "./LessonPlayer";

type Tab = "learn" | "project";

interface QuizResult {
  score: number;
  passed: boolean;
  correct: number;
  total: number;
  gainedSkills: string[];
  nextModuleId: number | null;
}

const DIFFICULTY_STYLE: Record<ModuleContent["miniProject"]["difficulty"], string> = {
  Easy: "bg-emerald/10 text-emerald",
  Medium: "bg-gold/15 text-amber-700",
  Hard: "bg-red-50 text-red-600",
};

/**
 * One roadmap module: watch each lesson, then pass the quiz to unlock the next
 * module. Lesson progress and quiz results are persisted server-side, so the
 * page is hydrated with what the student has already done.
 */
export default function LearnModule({
  careerPath,
  content,
  watchedInitial,
  alreadyPassed,
  nextModuleId,
}: {
  careerPath: string;
  content: ModuleContent;
  watchedInitial: number[];
  alreadyPassed: boolean;
  nextModuleId: number | null;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("learn");
  const [watched, setWatched] = useState<number[]>(watchedInitial);
  const [currentLesson, setCurrentLesson] = useState(() => {
    const first = content.lessons.findIndex((l) => !watchedInitial.includes(l.index));
    return first === -1 ? content.lessons.length - 1 : first;
  });
  const [showQuiz, setShowQuiz] = useState(false);
  const [question, setQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState("");

  const lessons = content.lessons;
  const questions = content.quiz.questions;
  const lesson = lessons[currentLesson];
  const allWatched = watched.length >= lessons.length;
  const progressPct = Math.round((watched.length / lessons.length) * 100);

  const markWatched = (index: number) => {
    if (watched.includes(index)) return;
    setWatched((w) => [...w, index]);
    // Best-effort — the UI already advanced; a failed save just means it's
    // re-watched next visit.
    fetch("/api/student/roadmap/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ careerPath, moduleId: content.id, lessonIndex: index }),
    }).catch(() => {});
  };

  const goToLesson = (index: number) => {
    setCurrentLesson(index);
    setShowQuiz(false);
  };

  const onVideoComplete = () => {
    markWatched(currentLesson);
    if (currentLesson < lessons.length - 1) setCurrentLesson(currentLesson + 1);
  };

  const onCompleteLesson = () => {
    markWatched(currentLesson);
    if (currentLesson < lessons.length - 1) {
      setCurrentLesson(currentLesson + 1);
    } else {
      setShowQuiz(true);
    }
  };

  const resetQuiz = () => {
    setResult(null);
    setQuestion(0);
    setAnswers({});
    setError("");
  };

  const submitQuiz = async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/student/roadmap/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          careerPath,
          moduleId: content.id,
          answers: questions.map((q) => answers[q.index] ?? ""),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as Partial<QuizResult> & { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not submit the quiz.");
      setResult(data as QuizResult);
      // Let the roadmap page (server-rendered) pick up the new pass state.
      if (data.passed) router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit the quiz.");
    } finally {
      setSubmitting(false);
    }
  };

  const answeredAll = questions.every((q) => answers[q.index]);
  const q = questions[question];

  return (
    <DashboardShell>
      <DashboardContainer className="space-y-6">
        {/* Header */}
        <Card className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-navy px-2.5 py-1 text-xs font-semibold text-white">Module {content.id}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-navy">
                  <Clock className="h-3 w-3" /> {content.duration}
                </span>
                {alreadyPassed && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald/10 px-2.5 py-1 text-xs font-semibold text-emerald">
                    <CircleCheck className="h-3 w-3" /> Passed
                  </span>
                )}
              </div>
              <h1 className="mt-3 text-2xl font-bold text-navy">{content.title}</h1>
              <p className="mt-1 text-sm text-mediumgray">{content.description}</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2 self-start">
              <Link
                href="/student/roadmap"
                className="inline-flex items-center gap-2 rounded-lg border border-lightgray bg-white px-4 py-2 text-sm font-semibold text-navy transition-colors hover:border-slate hover:text-slate"
              >
                <ArrowLeft className="h-4 w-4" /> Back to roadmap
              </Link>
              {alreadyPassed && nextModuleId != null && (
                <Link
                  href={`/student/roadmap/${nextModuleId}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary-gradient px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(234,88,12,0.25)] transition-transform hover:-translate-y-0.5"
                >
                  Next module <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>
          <div className="mt-5">
            <div className="mb-1 flex justify-between text-xs text-mediumgray">
              <span>Lessons watched</span>
              <span className="font-semibold text-slate">{progressPct}%</span>
            </div>
            <ProgressBar value={progressPct} />
          </div>
        </Card>

        {/* Tabs */}
        <div className="flex gap-2">
          {(
            [
              { key: "learn", label: "Learn & test", icon: Video },
              { key: "project", label: "Mini project", icon: Code },
            ] as { key: Tab; label: string; icon: typeof Video }[]
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === t.key ? "bg-navy text-white" : "border border-lightgray bg-white text-mediumgray hover:text-navy"
              }`}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>

        {tab === "learn" ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              {!showQuiz ? (
                <>
                  <Card className="overflow-hidden">
                    <LessonPlayer
                      key={lesson.index}
                      careerPath={careerPath}
                      moduleId={content.id}
                      lessonIndex={lesson.index}
                      lessonTitle={lesson.title}
                      watched={watched.includes(lesson.index)}
                      onComplete={onVideoComplete}
                    />
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-bold text-navy">{lesson.title}</h2>
                        <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-mediumgray">
                          <Video className="h-3.5 w-3.5" /> {lesson.duration}
                        </p>
                      </div>
                      {watched.includes(lesson.index) && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald/10 px-2.5 py-1 text-xs font-semibold text-emerald">
                          <CircleCheck className="h-3 w-3" /> Completed
                        </span>
                      )}
                    </div>

                    <div className="mt-4 flex items-start gap-3 rounded-xl bg-surface-2 p-4">
                      <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
                      <div>
                        <p className="text-sm font-semibold text-navy">What you&apos;ll learn</p>
                        <ul className="mt-1 space-y-1 text-sm text-mediumgray">
                          <li>• The fundamentals of {lesson.title.toLowerCase()}</li>
                          <li>• Practical examples and real-world applications</li>
                          <li>• Best practices and common pitfalls to avoid</li>
                        </ul>
                      </div>
                    </div>

                    <div className="mt-5 flex gap-3">
                      <button
                        type="button"
                        onClick={() => goToLesson(Math.max(0, currentLesson - 1))}
                        disabled={currentLesson === 0}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-lightgray bg-white py-2.5 text-sm font-semibold text-navy transition-colors hover:border-slate hover:text-slate disabled:opacity-40 disabled:hover:border-lightgray disabled:hover:text-navy"
                      >
                        <ArrowLeft className="h-4 w-4" /> Previous
                      </button>
                      <button
                        type="button"
                        onClick={onCompleteLesson}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary-gradient py-2.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(234,88,12,0.25)] transition-transform hover:-translate-y-0.5"
                      >
                        {currentLesson === lessons.length - 1 ? "Take quiz" : "Next lesson"}
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </Card>
                </>
              ) : !result ? (
                <Card className="p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-navy">{content.quiz.title}</h2>
                      <p className="mt-0.5 text-xs text-mediumgray">
                        Question {question + 1} of {questions.length} · Pass mark {PASS_MARK}%
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full border border-lightgray px-2.5 py-1 text-xs font-medium text-navy">
                      <FileText className="h-3 w-3" /> Quiz
                    </span>
                  </div>
                  <div className="mt-4">
                    <ProgressBar value={((question + 1) / questions.length) * 100} />
                  </div>

                  <h3 className="mt-6 text-base font-semibold text-navy">{q.question}</h3>
                  <div role="radiogroup" aria-label={`Question ${question + 1}`} className="mt-4 space-y-2">
                    {q.options.map((option) => {
                      const selected = answers[q.index] === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => setAnswers((a) => ({ ...a, [q.index]: option }))}
                          className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left text-sm transition-colors ${
                            selected
                              ? "border-slate bg-slate/5 text-navy"
                              : "border-lightgray text-navy hover:bg-surface-2"
                          }`}
                        >
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                              selected ? "border-slate" : "border-mediumgray/50"
                            }`}
                          >
                            {selected && <span className="h-2 w-2 rounded-full bg-slate" />}
                          </span>
                          {option}
                        </button>
                      );
                    })}
                  </div>

                  {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

                  <div className="mt-6 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setQuestion((n) => Math.max(0, n - 1))}
                      disabled={question === 0}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-lightgray bg-white py-2.5 text-sm font-semibold text-navy transition-colors hover:border-slate hover:text-slate disabled:opacity-40"
                    >
                      <ArrowLeft className="h-4 w-4" /> Previous
                    </button>
                    {question === questions.length - 1 ? (
                      <button
                        type="button"
                        onClick={submitQuiz}
                        disabled={!answeredAll || submitting}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary-gradient py-2.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(234,88,12,0.25)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                      >
                        {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CircleCheck className="h-4 w-4" />}
                        Submit quiz
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setQuestion((n) => Math.min(questions.length - 1, n + 1))}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary-gradient py-2.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(234,88,12,0.25)] transition-transform hover:-translate-y-0.5"
                      >
                        Next question <ArrowRight className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </Card>
              ) : (
                <Card className={`p-8 text-center ${result.passed ? "border-emerald/30" : "border-gold/40"}`}>
                  <span
                    className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${
                      result.passed ? "bg-emerald/10 text-emerald" : "bg-gold/15 text-amber-600"
                    }`}
                  >
                    {result.passed ? <Trophy className="h-10 w-10" /> : <Lock className="h-10 w-10" />}
                  </span>
                  <h2 className="mt-5 text-2xl font-bold text-navy">
                    {result.passed ? "Module passed!" : "Not quite there"}
                  </h2>
                  <p className={`mt-2 text-5xl font-bold ${result.passed ? "text-emerald" : "text-amber-600"}`}>
                    {result.score}%
                  </p>
                  <p className="mx-auto mt-2 max-w-md text-sm text-mediumgray">
                    {result.correct} of {result.total} correct.{" "}
                    {result.passed
                      ? "Great work — the next module is unlocked."
                      : `You need ${PASS_MARK}% or more to unlock the next module. Review the lessons and try again.`}
                  </p>

                  {result.passed && result.gainedSkills.length > 0 && (
                    <div className="mt-5 rounded-xl border border-emerald/30 bg-emerald/5 p-4">
                      <p className="mb-2 flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald">
                        <CircleCheck className="h-4 w-4" /> Added to your profile skills
                      </p>
                      <div className="flex flex-wrap justify-center gap-1.5">
                        {result.gainedSkills.map((s) => (
                          <span key={s} className="rounded-md border border-emerald/30 bg-white px-2 py-1 text-[11px] font-medium text-emerald">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowQuiz(false);
                        resetQuiz();
                      }}
                      className="inline-flex items-center gap-2 rounded-lg border border-lightgray bg-white px-5 py-2.5 text-sm font-semibold text-navy transition-colors hover:border-slate hover:text-slate"
                    >
                      Review lessons
                    </button>
                    {result.passed ? (
                      result.nextModuleId != null ? (
                        <Link
                          href={`/student/roadmap/${result.nextModuleId}`}
                          className="inline-flex items-center gap-2 rounded-lg bg-primary-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(234,88,12,0.25)] transition-transform hover:-translate-y-0.5"
                        >
                          Next module <ArrowRight className="h-4 w-4" />
                        </Link>
                      ) : (
                        <Link
                          href="/student/roadmap"
                          className="inline-flex items-center gap-2 rounded-lg bg-primary-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(234,88,12,0.25)] transition-transform hover:-translate-y-0.5"
                        >
                          Back to roadmap <ArrowRight className="h-4 w-4" />
                        </Link>
                      )
                    ) : (
                      <button
                        type="button"
                        onClick={resetQuiz}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(234,88,12,0.25)] transition-transform hover:-translate-y-0.5"
                      >
                        Retry quiz <RotateCcw className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </Card>
              )}
            </div>

            {/* Course content sidebar */}
            <Card className="h-fit p-5">
              <h2 className="text-base font-bold text-navy">Course content</h2>
              <p className="text-xs text-mediumgray">
                {watched.length} of {lessons.length} lessons completed
              </p>
              <ul className="mt-4 space-y-2">
                {lessons.map((l) => {
                  const active = currentLesson === l.index && !showQuiz;
                  const done = watched.includes(l.index);
                  return (
                    <li key={l.index}>
                      <button
                        type="button"
                        onClick={() => goToLesson(l.index)}
                        className={`flex w-full items-start gap-3 rounded-xl border-2 p-3 text-left transition-colors ${
                          active
                            ? "border-slate bg-slate/5"
                            : done
                              ? "border-emerald/20 bg-emerald/5"
                              : "border-lightgray hover:bg-surface-2"
                        }`}
                      >
                        {done ? (
                          <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald" />
                        ) : (
                          <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-mediumgray/40" />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-navy">{l.title}</span>
                          <span className="text-xs text-mediumgray">{l.duration}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
                <li>
                  <button
                    type="button"
                    disabled={!allWatched}
                    onClick={() => setShowQuiz(true)}
                    className={`flex w-full items-start gap-3 rounded-xl border-2 p-3 text-left transition-colors disabled:cursor-not-allowed ${
                      showQuiz ? "border-slate bg-slate/5" : "border-lightgray hover:bg-surface-2 disabled:hover:bg-transparent"
                    }`}
                  >
                    {result?.passed || alreadyPassed ? (
                      <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald" />
                    ) : allWatched ? (
                      <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-mediumgray/40" />
                    ) : (
                      <Lock className="mt-0.5 h-5 w-5 shrink-0 text-mediumgray/60" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-navy">Module quiz</span>
                      <span className="text-xs text-mediumgray">
                        {questions.length} questions{allWatched ? "" : " · watch all lessons first"}
                      </span>
                    </span>
                  </button>
                </li>
              </ul>
            </Card>
          </div>
        ) : (
          <Card className="p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-navy">{content.miniProject.title}</h2>
                <p className="mt-1 text-sm text-mediumgray">{content.miniProject.description}</p>
              </div>
              <span className={`shrink-0 self-start rounded-full px-2.5 py-1 text-xs font-semibold ${DIFFICULTY_STYLE[content.miniProject.difficulty]}`}>
                {content.miniProject.difficulty}
              </span>
            </div>

            <div className="mt-6 flex aspect-video items-center justify-center rounded-xl bg-gradient-to-br from-navy via-[#1f2937] to-[#3b2a1a] text-center text-white">
              <div className="px-6">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
                  <Code className="h-8 w-8 text-slate" />
                </span>
                <p className="mt-4 text-lg font-semibold">Hands-on project</p>
                <p className="mx-auto mt-1 max-w-md text-sm text-white/70">
                  Build it in your own environment, then add it to your resume and portfolio.
                </p>
              </div>
            </div>

            <h3 className="mt-6 flex items-center gap-2 font-semibold text-navy">
              <CircleCheck className="h-5 w-5 text-slate" /> Project requirements
            </h3>
            <ul className="mt-3 space-y-2">
              {content.miniProject.requirements.map((r) => (
                <li key={r} className="flex items-start gap-2 text-sm text-navy">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate" />
                  {r}
                </li>
              ))}
            </ul>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-xl bg-surface-2 p-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                  <Clock className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-medium text-navy">Duration</span>
                  <span className="text-xs text-mediumgray">{content.miniProject.duration}</span>
                </span>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-surface-2 p-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                  <Trophy className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-medium text-navy">Difficulty</span>
                  <span className="text-xs text-mediumgray">{content.miniProject.difficulty}</span>
                </span>
              </div>
            </div>

            <Link
              href="/student/resume"
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-primary-gradient py-3 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(234,88,12,0.25)] transition-transform hover:-translate-y-0.5"
            >
              <Code className="h-5 w-5" /> Add this project to my resume
            </Link>
          </Card>
        )}
      </DashboardContainer>
    </DashboardShell>
  );
}
