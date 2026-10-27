"use client";

import { useEffect, useState } from "react";
import { BookOpen, CircleCheck, CircleX, Download, ExternalLink, LifeBuoy, ListChecks, LoaderCircle, MonitorPlay, RotateCcw, Film } from "lucide-react";
import SlidePlayer, { SLIDE_SCREEN } from "@/components/roadmap/SlidePlayer";
import type { LessonVideos } from "@/lib/agent/types";
import { LEVEL_LABEL, STYLE_LABEL, VIDEO_ID_RE, type LessonContent, type NotesContent, type PathLessonView } from "@/lib/ai/learning-shared";

type Tab = "video" | "videos" | "notes";

const TABS: { id: Tab; label: string; icon: typeof MonitorPlay }[] = [
  { id: "video", label: "Video lesson", icon: MonitorPlay },
  { id: "videos", label: "YouTube", icon: Film },
  { id: "notes", label: "Notes", icon: BookOpen },
];

/** POSTs `{ step, topic }` to one of the learning path content routes. */
async function load<T>(roadmapId: string, kind: "lesson" | "notes", step: string, topic: string): Promise<T> {
  const res = await fetch(`/api/student/learning/${roadmapId}/${kind}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ step, topic }),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown> & { error?: string };
  if (!res.ok || !data[kind]) throw new Error(data.error || `Could not load the ${kind}.`);
  return data[kind] as T;
}

/**
 * One lesson of a learning path: a narrated slide video written for the
 * student (level, learning style, weak spots), a quick check that completes
 * the lesson and adapts the next ones, real YouTube videos, and notes.
 */
export default function LessonPanel({
  roadmapId,
  step,
  lesson,
  onCompleted,
}: {
  roadmapId: string;
  step: string;
  lesson: PathLessonView;
  /** After the lesson is saved as complete (the parent refreshes the path). */
  onCompleted: () => void;
}) {
  const [tab, setTab] = useState<Tab>("video");
  const [reloadKey, setReloadKey] = useState(0);
  const [content, setContent] = useState<LessonContent | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    load<LessonContent>(roadmapId, "lesson", step, lesson.topic)
      .then((c) => !cancelled && setContent(c))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Could not load the lesson."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [roadmapId, step, lesson.topic, reloadKey]);

  const reload = () => {
    setContent(null);
    setError("");
    setLoading(true);
    setChecking(false);
    setReloadKey((k) => k + 1);
  };

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-lightgray bg-white">
      <div role="tablist" aria-label="Lesson content" className="flex overflow-x-auto border-b border-lightgray [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
              tab === t.id ? "border-orange text-navy" : "border-transparent text-mediumgray hover:text-navy"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "video" && (
        <div>
          {loading ? (
            <div className={`${SLIDE_SCREEN} items-center justify-center px-6 text-center`}>
              <LoaderCircle className="h-10 w-10 animate-spin text-slate" />
              <p className="mt-3 text-sm font-medium">Writing your lesson…</p>
              <p className="mt-1 text-xs text-white/60">The first student at your level waits up to a minute; after that it opens instantly.</p>
            </div>
          ) : error || !content ? (
            <div className={`${SLIDE_SCREEN} items-center justify-center px-6 text-center`}>
              <p className="max-w-md text-sm font-medium">{error || "No lesson content available."}</p>
              <button type="button" onClick={reload} className="mt-3 text-xs font-semibold text-slate underline">Retry</button>
            </div>
          ) : (
            <>
              <SlidePlayer
                key={reloadKey}
                slides={content.slides}
                lessonTitle={lesson.topic}
                badge={`${LEVEL_LABEL[content.level]} · ${STYLE_LABEL[content.style]}${content.remedial.length ? " · Extra help" : ""}`}
                watched={lesson.done}
                rate={content.level === "beginner" ? 0.95 : content.level === "advanced" ? 1.05 : 1}
                onComplete={() => setChecking(true)}
              />
              <div className="space-y-3 p-4">
                {content.remedial.length > 0 && (
                  <p className="flex items-start gap-2 rounded-lg bg-slate/5 px-3 py-2 text-xs text-navy">
                    <LifeBuoy className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate" />
                    This version explains again what you missed last time: {content.remedial.join(", ")}.
                  </p>
                )}
                {checking ? (
                  <QuickCheck
                    roadmapId={roadmapId}
                    step={step}
                    topic={lesson.topic}
                    content={content}
                    onSaved={onCompleted}
                    onRewatch={reload}
                  />
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-mediumgray">Press play to hear the lesson. A short quick check follows — it completes the lesson.</p>
                    <button type="button" onClick={() => setChecking(true)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate hover:underline">
                      <ListChecks className="h-3.5 w-3.5" /> Go to the quick check
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {tab === "videos" && <VideosTab videos={content?.videos ?? null} loading={loading} topic={lesson.topic} />}

      {tab === "notes" && <NotesTab roadmapId={roadmapId} step={step} topic={lesson.topic} />}
    </div>
  );
}

// ── Quick check ─────────────────────────────────────────────────

function QuickCheck({
  roadmapId,
  step,
  topic,
  content,
  onSaved,
  onRewatch,
}: {
  roadmapId: string;
  step: string;
  topic: string;
  content: LessonContent;
  onSaved: () => void;
  onRewatch: () => void;
}) {
  const questions = content.quickCheck;
  const [picks, setPicks] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [missed, setMissed] = useState<string[]>([]);

  const save = async () => {
    setSaving(true);
    setError("");
    const wrong = questions.filter((q, i) => picks[i] !== q.answer_index);
    const missedSubtopics = Array.from(new Set(wrong.map((q) => q.subtopic).filter(Boolean)));
    try {
      const res = await fetch(`/api/student/learning/${roadmapId}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step,
          topic,
          check: questions.length ? { correct: questions.length - wrong.length, total: questions.length, missed: missedSubtopics } : null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not save your progress.");
      setMissed(missedSubtopics);
      setSubmitted(true);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your progress.");
    } finally {
      setSaving(false);
    }
  };

  if (questions.length === 0) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-lightgray p-3">
        <p className="text-xs text-mediumgray">No quick check for this lesson. Mark it complete when you&apos;re done.</p>
        {error && <p className="w-full text-xs text-red-600">{error}</p>}
        {submitted ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald"><CircleCheck className="h-3.5 w-3.5" /> Lesson complete</span>
        ) : (
          <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-primary-gradient px-4 py-2 text-xs font-semibold text-white disabled:opacity-60">
            {saving ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <CircleCheck className="h-3.5 w-3.5" />} Mark lesson complete
          </button>
        )}
      </div>
    );
  }

  const correct = questions.filter((q, i) => picks[i] === q.answer_index).length;
  const allAnswered = questions.every((_, i) => picks[i] !== undefined);

  return (
    <div className="rounded-lg border border-lightgray p-4">
      <h4 className="flex items-center gap-1.5 text-sm font-bold text-navy"><ListChecks className="h-4 w-4 text-slate" /> Quick check</h4>
      <p className="mt-0.5 text-xs text-mediumgray">Not graded — it shows what to explain again and tunes the level of your next lessons.</p>
      <ol className="mt-3 space-y-4">
        {questions.map((q, i) => (
          <li key={i}>
            <p className="text-sm font-medium text-navy">{i + 1}. {q.question}</p>
            <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {q.options.map((o, j) => {
                const picked = picks[i] === j;
                const right = submitted && j === q.answer_index;
                const wrong = submitted && picked && j !== q.answer_index;
                return (
                  <button
                    key={j}
                    type="button"
                    disabled={submitted}
                    aria-pressed={picked}
                    onClick={() => setPicks((p) => ({ ...p, [i]: j }))}
                    className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors disabled:cursor-default ${
                      right ? "border-emerald bg-emerald/10 text-navy" : wrong ? "border-red-300 bg-red-50 text-navy" : picked ? "border-slate bg-slate/5 text-navy" : "border-lightgray text-navy hover:border-slate"
                    }`}
                  >
                    {o}
                  </button>
                );
              })}
            </div>
            {submitted && (
              <p className={`mt-1.5 flex items-start gap-1.5 text-xs ${picks[i] === q.answer_index ? "text-emerald" : "text-red-600"}`}>
                {picks[i] === q.answer_index ? <CircleCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <CircleX className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                <span className="text-mediumgray">{q.explanation}</span>
              </p>
            )}
          </li>
        ))}
      </ol>
      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
      {submitted ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-lightgray pt-3">
          <p className="text-xs text-navy">
            <span className="font-semibold">{correct} of {questions.length} correct · lesson complete.</span>{" "}
            {missed.length > 0 ? `Your next version of this lesson and its notes will explain ${missed.join(", ")} again.` : "Nice — you've got this one."}
          </p>
          {missed.length > 0 && (
            <button type="button" onClick={onRewatch} className="inline-flex items-center gap-1.5 rounded-lg border border-lightgray px-3 py-1.5 text-xs font-semibold text-navy hover:border-slate hover:text-slate">
              <RotateCcw className="h-3.5 w-3.5" /> Watch again with extra help
            </button>
          )}
        </div>
      ) : (
        <button type="button" onClick={save} disabled={!allAnswered || saving} className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary-gradient px-4 py-2 text-xs font-semibold text-white disabled:opacity-60">
          {saving && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />} Check my answers
        </button>
      )}
    </div>
  );
}

// ── YouTube ─────────────────────────────────────────────────────

function VideosTab({ videos, loading, topic }: { videos: LessonVideos | null; loading: boolean; topic: string }) {
  if (loading) {
    return <p className="flex items-center gap-2 p-5 text-sm text-mediumgray"><LoaderCircle className="h-4 w-4 animate-spin" /> Finding videos for {topic}…</p>;
  }
  const list = (videos?.videos ?? []).filter((v) => VIDEO_ID_RE.test(v.video_id));
  const searchUrl = videos?.search_url || `https://www.youtube.com/results?search_query=${encodeURIComponent(`${topic} tutorial`)}`;
  return (
    <div className="space-y-4 p-4">
      {list.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((v) => (
            <figure key={v.video_id} className="overflow-hidden rounded-lg border border-lightgray">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${v.video_id}`}
                title={v.title}
                loading="lazy"
                allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="aspect-video w-full"
              />
              <figcaption className="p-2.5">
                <p className="line-clamp-2 text-xs font-semibold text-navy">{v.title}</p>
                <p className="text-[11px] text-mediumgray">{v.channel}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <p className="text-sm text-mediumgray">Hand-picked videos aren&apos;t set up for this server, but YouTube has plenty on this topic.</p>
      )}
      <a href={searchUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate hover:underline">
        <ExternalLink className="h-3.5 w-3.5" /> {list.length ? "More videos on YouTube" : `Search YouTube for “${videos?.query || topic}”`}
      </a>
    </div>
  );
}

// ── Notes ───────────────────────────────────────────────────────

function notesMarkdown(n: NotesContent): string {
  const out = [`# ${n.topic}`, "", n.overview, ""];
  for (const s of n.sections) {
    out.push(`## ${s.heading}`, "", ...s.points.map((p) => `- ${p}`), "");
    if (s.example) out.push("```", s.example, "```", "");
  }
  const list = (title: string, items: string[]) => (items.length ? [`## ${title}`, "", ...items.map((i) => `- ${i}`), ""] : []);
  if (n.keyTerms.length) out.push("## Key terms", "", ...n.keyTerms.map((t) => `- **${t.term}**: ${t.meaning}`), "");
  out.push(...list("Common mistakes", n.commonMistakes), ...list("Summary", n.summary), ...list("Check yourself", n.selfCheck), ...list("Practice", n.practice));
  return out.join("\n");
}

function NotesTab({ roadmapId, step, topic }: { roadmapId: string; step: string; topic: string }) {
  const [notes, setNotes] = useState<NotesContent | null>(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    load<NotesContent>(roadmapId, "notes", step, topic)
      .then((n) => !cancelled && setNotes(n))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Could not load the notes."));
    return () => {
      cancelled = true;
    };
  }, [roadmapId, step, topic, reloadKey]);

  const download = () => {
    if (!notes) return;
    const url = URL.createObjectURL(new Blob([notesMarkdown(notes)], { type: "text/markdown;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${topic.replace(/[^\w-]+/g, "-").slice(0, 60) || "notes"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <div className="p-5 text-sm">
        <p className="text-red-600">{error}</p>
        <button type="button" onClick={() => { setError(""); setReloadKey((k) => k + 1); }} className="mt-2 text-xs font-semibold text-slate underline">Retry</button>
      </div>
    );
  }
  if (!notes) {
    return <p className="flex items-center gap-2 p-5 text-sm text-mediumgray"><LoaderCircle className="h-4 w-4 animate-spin" /> Writing your notes…</p>;
  }

  const listBlock = (title: string, items: string[]) =>
    items.length > 0 && (
      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-mediumgray">{title}</h4>
        <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-navy">{items.map((i) => <li key={i}>{i}</li>)}</ul>
      </section>
    );

  return (
    <article className="space-y-5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-mediumgray">{LEVEL_LABEL[notes.level]} · {STYLE_LABEL[notes.style]}{notes.remedial.length ? ` · extra help on ${notes.remedial.join(", ")}` : ""}</p>
          {notes.overview && <p className="mt-1 text-sm text-navy">{notes.overview}</p>}
        </div>
        <button type="button" onClick={download} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-lightgray px-3 py-1.5 text-xs font-semibold text-navy hover:border-slate hover:text-slate">
          <Download className="h-3.5 w-3.5" /> Download (.md)
        </button>
      </div>
      {notes.sections.map((s) => (
        <section key={s.heading}>
          <h4 className="text-sm font-bold text-navy">{s.heading}</h4>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-navy">{s.points.map((p) => <li key={p}>{p}</li>)}</ul>
          {s.example && <pre className="mt-2 overflow-x-auto rounded-lg bg-surface p-3 font-mono text-xs leading-relaxed text-navy">{s.example}</pre>}
        </section>
      ))}
      {notes.keyTerms.length > 0 && (
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-mediumgray">Key terms</h4>
          <dl className="mt-1.5 space-y-1 text-sm">
            {notes.keyTerms.map((t) => (
              <div key={t.term}><dt className="inline font-semibold text-navy">{t.term}: </dt><dd className="inline text-navy">{t.meaning}</dd></div>
            ))}
          </dl>
        </section>
      )}
      {listBlock("Common mistakes", notes.commonMistakes)}
      {listBlock("Summary", notes.summary)}
      {listBlock("Check yourself", notes.selfCheck)}
      {listBlock("Practice", notes.practice)}
    </article>
  );
}
