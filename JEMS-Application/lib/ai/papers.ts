import { ObjectId, type Db, type Document } from "mongodb";
import { getDatabase } from "@/lib/db/mongodb";
import { agent } from "@/lib/agent/client";
import { CODING_LANGUAGES, QUESTION_TYPES, type GradeResponse, type PaperQuestion, type QuestionResult, type StudentQuestion } from "@/lib/agent/types";
import { TaskInputError, type TaskHandler } from "@/lib/ai-tasks/context";
import { PASS_MARK } from "@/lib/assessment/engine";
import { recordSkillTestResult } from "@/lib/db/assessment";
import { ensureAiIndexes } from "./indexes";
import {
  type ClientAnswer,
  type PaperPurpose,
  type PaperStatus,
  type PaperSummary,
  type PaperView,
  type QuestionReview,
  interviewType,
  paperMinutes,
  skillTestCounts,
} from "./papers-shared";
import { isRecord, iso, num, skillKey, str, strArr } from "./util";

/**
 * AI-generated papers: skill tests (`purpose: "skill"`) and mock interviews
 * (`purpose: "interview"`), via `/assessment/generate` and `/assessment/grade`.
 *
 *  aiPapers {
 *    studentId, purpose, subject, subjectKey, interviewType, agentSkill, counts,
 *    questions[]      FULL paper with answer keys + hidden tests — never sent to the browser
 *    studentPaper[]   the safe version shown to the student
 *    totalMarks, minutes, warnings[], status, startedAt, expiresAt,
 *    answers, submittedAt, late, result, pendingReview, gradedAt, createdAt, updatedAt
 *  }
 *
 * One document per (student, purpose, subject): generating again replaces the
 * paper in place. Grading writes the result back onto it and, for skill tests,
 * records the attempt in `skillAssessments` (verifying the skill on a clean
 * pass); for interviews it upserts the `mockInterviews` history row.
 */

/** Grace period for network lag after the timer runs out. */
const LATE_GRACE_MS = 2 * 60_000;

async function getDb(): Promise<Db> {
  const db = await getDatabase();
  await ensureAiIndexes(db);
  return db;
}

const STATUSES: PaperStatus[] = ["ready", "in-progress", "submitted", "graded"];

// ── Sanitising Agent output ─────────────────────────────────────

function sanitizeTests(v: unknown) {
  return (Array.isArray(v) ? v : []).filter(isRecord).map((t) => ({ input: str(t.input, 10_000), expected: str(t.expected, 10_000) })).slice(0, 30);
}

function sanitizeFull(v: unknown): PaperQuestion | null {
  if (!isRecord(v) || !(QUESTION_TYPES as readonly string[]).includes(str(v.type))) return null;
  const id = str(v.id, 20);
  if (!id) return null;
  const key = isRecord(v.key) ? v.key : {};
  return {
    id,
    type: v.type as PaperQuestion["type"],
    marks: num(v.marks, 1),
    text: str(v.text, 5_000),
    title: str(v.title, 200) || undefined,
    options: Array.isArray(v.options) ? strArr(v.options, 10, 1_000) : undefined,
    topic: str(v.topic, 120) || undefined,
    difficulty: str(v.difficulty, 20) || undefined,
    input_format: str(v.input_format, 1_000) || undefined,
    output_format: str(v.output_format, 1_000) || undefined,
    constraints: str(v.constraints, 1_000) || undefined,
    samples: v.type === "coding" ? sanitizeTests(v.samples) : undefined,
    hidden: v.type === "coding" ? sanitizeTests(v.hidden) : undefined,
    key: {
      ...(typeof key.answer_index === "number" ? { answer_index: key.answer_index } : {}),
      ...(Array.isArray(key.answer_indexes) ? { answer_indexes: key.answer_indexes.filter((n): n is number => typeof n === "number") } : {}),
      ...(key.explanation ? { explanation: str(key.explanation, 2_000) } : {}),
      ...(Array.isArray(key.key_points)
        ? { key_points: key.key_points.filter(isRecord).map((p) => ({ point: str(p.point, 500), weight: num(p.weight, 1) })) }
        : {}),
      ...(key.model_answer ? { model_answer: str(key.model_answer, 4_000) } : {}),
    },
  };
}

/** Student view of a question — built from the full one, so a key can never leak. */
function toStudentQuestion(q: PaperQuestion, fromAgent?: Record<string, unknown>): StudentQuestion {
  return {
    id: q.id,
    type: q.type,
    marks: q.marks,
    text: q.text,
    title: q.title,
    options: q.options,
    topic: q.topic,
    difficulty: q.difficulty,
    input_format: q.input_format,
    output_format: q.output_format,
    constraints: q.constraints,
    samples: q.samples,
    ...(q.type === "coding"
      ? {
          languages: fromAgent && Array.isArray(fromAgent.languages) ? strArr(fromAgent.languages, 10, 20) : [...CODING_LANGUAGES],
          notes: str(fromAgent?.notes, 500) || "Read from standard input, print to standard output. In Java, name the class Main.",
        }
      : {}),
  };
}

function sanitizeResult(v: unknown): GradeResponse {
  const o = isRecord(v) ? v : {};
  const results: QuestionResult[] = (Array.isArray(o.results) ? o.results : []).filter(isRecord).map((r) => ({
    id: str(r.id, 20),
    type: (QUESTION_TYPES as readonly string[]).includes(str(r.type)) ? (r.type as QuestionResult["type"]) : "mcq",
    max: num(r.max),
    score: num(r.score),
    ...(typeof r.correct === "boolean" ? { correct: r.correct } : {}),
    ...(r.explanation ? { explanation: str(r.explanation, 2_000) } : {}),
    ...(r.detail ? { detail: str(r.detail, 500) } : {}),
    ...(r.feedback ? { feedback: str(r.feedback, 2_000) } : {}),
    ...(Array.isArray(r.covered) ? { covered: strArr(r.covered, 20) } : {}),
    ...(Array.isArray(r.missing) ? { missing: strArr(r.missing, 20) } : {}),
    ...(Array.isArray(r.wrong_statements) ? { wrong_statements: strArr(r.wrong_statements, 20) } : {}),
    ...(typeof r.needs_review === "boolean" ? { needs_review: r.needs_review } : {}),
    ...(Array.isArray(r.tests)
      ? {
          tests: r.tests.filter(isRecord).map((t) => ({
            test: str(t.test, 40),
            passed: Boolean(t.passed),
            status: str(t.status, 60),
            time: str(t.time, 20) || null,
            ...(t.your_output != null ? { your_output: str(t.your_output, 300) } : {}),
            ...(t.expected != null ? { expected: str(t.expected, 300) } : {}),
            ...(t.error ? { error: str(t.error, 300) } : {}),
          })),
        }
      : {}),
  }));
  return {
    score: num(o.score),
    total: num(o.total),
    percent: num(o.percent),
    passed: Boolean(o.passed),
    needs_review: strArr(o.needs_review, 30, 20),
    results,
  };
}

// ── Views ───────────────────────────────────────────────────────

function summaryFromDoc(d: Document): PaperSummary {
  const result = d.result ? sanitizeResult(d.result) : null;
  return {
    id: d._id.toString(),
    purpose: d.purpose === "interview" ? "interview" : "skill",
    subject: str(d.subject),
    interviewType: str(d.interviewType) || null,
    status: STATUSES.includes(d.status) ? d.status : "ready",
    totalMarks: num(d.totalMarks),
    questionCount: Array.isArray(d.studentPaper) ? d.studentPaper.length : 0,
    minutes: num(d.minutes, 15),
    percent: result ? Math.round(result.percent) : null,
    passed: result ? result.passed : null,
    pendingReview: Boolean(d.pendingReview),
    createdAt: iso(d.createdAt),
    gradedAt: iso(d.gradedAt) || null,
  };
}

function buildReview(d: Document): QuestionReview[] {
  if (d.status !== "graded" || !d.result) return [];
  const result = sanitizeResult(d.result);
  const full = (Array.isArray(d.questions) ? d.questions : []).map(sanitizeFull).filter((q): q is PaperQuestion => !!q);
  return result.results.map((r) => {
    const q = full.find((x) => x.id === r.id);
    const idx = q?.key?.answer_indexes ?? (typeof q?.key?.answer_index === "number" ? [q.key.answer_index] : undefined);
    return {
      id: r.id,
      score: r.score,
      max: r.max,
      correct: r.correct,
      explanation: r.explanation,
      answerIndexes: q && (q.type === "mcq" || q.type === "multi_select") ? idx : undefined,
      feedback: r.feedback,
      covered: r.covered,
      missing: r.missing,
      modelAnswer: q?.type === "short_answer" ? q.key?.model_answer : undefined,
      detail: r.detail,
      tests: r.tests,
    };
  });
}

function viewFromDoc(d: Document): PaperView {
  const questions = (Array.isArray(d.studentPaper) ? d.studentPaper : []) as StudentQuestion[];
  return {
    ...summaryFromDoc(d),
    generationId: str(d.agentPaperId) || iso(d.generatedAt) || d._id.toString(),
    questions,
    warnings: strArr(d.warnings, 10),
    startedAt: iso(d.startedAt) || null,
    expiresAt: iso(d.expiresAt) || null,
    answers: isRecord(d.answers) ? (d.answers as Record<string, ClientAnswer>) : {},
    late: Boolean(d.late),
    review: buildReview(d),
  };
}

export async function listPapers(userId: string, purpose?: PaperPurpose): Promise<PaperSummary[]> {
  if (!ObjectId.isValid(userId)) return [];
  try {
    const db = await getDb();
    const filter: Record<string, unknown> = { studentId: new ObjectId(userId) };
    if (purpose) filter.purpose = purpose;
    const rows = await db
      .collection("aiPapers")
      .find(filter, { projection: { questions: 0 } })
      .sort({ updatedAt: -1 })
      .limit(50)
      .toArray();
    return rows.map(summaryFromDoc);
  } catch (err) {
    console.error("[ai] listPapers failed:", err);
    return [];
  }
}

/** Reads a paper for its owner without starting its timer. */
export async function getPaper(userId: string, paperId: string): Promise<PaperView | null> {
  if (!ObjectId.isValid(userId) || !ObjectId.isValid(paperId)) return null;
  try {
    const db = await getDb();
    const doc = await db.collection("aiPapers").findOne({ _id: new ObjectId(paperId), studentId: new ObjectId(userId) });
    if (!doc) return null;
    const view = viewFromDoc(doc);
    // Don't reveal the questions before the student presses Start.
    return doc.status === "ready" ? { ...view, questions: [] } : view;
  } catch (err) {
    console.error("[ai] getPaper failed:", err);
    return null;
  }
}

/** Loads a paper for its owner; the first open starts the timer. */
export async function openPaper(userId: string, paperId: string): Promise<PaperView | null> {
  if (!ObjectId.isValid(userId) || !ObjectId.isValid(paperId)) return null;
  try {
    const db = await getDb();
    const filter = { _id: new ObjectId(paperId), studentId: new ObjectId(userId) };
    const now = new Date();
    const doc = await db.collection("aiPapers").findOne(filter);
    if (!doc) return null;
    if (doc.status === "ready") {
      const expiresAt = new Date(now.getTime() + num(doc.minutes, 15) * 60_000);
      const started = await db
        .collection("aiPapers")
        .findOneAndUpdate({ ...filter, status: "ready" }, { $set: { status: "in-progress", startedAt: now, expiresAt, updatedAt: now } }, { returnDocument: "after" });
      if (started) return viewFromDoc(started);
    }
    return viewFromDoc(doc);
  } catch (err) {
    console.error("[ai] openPaper failed:", err);
    return null;
  }
}

/** The paper (if any) for this subject — used to block regenerating while grading. */
export async function findPaper(userId: string, purpose: PaperPurpose, subject: string): Promise<PaperSummary | null> {
  if (!ObjectId.isValid(userId)) return null;
  try {
    const db = await getDb();
    const d = await db
      .collection("aiPapers")
      .findOne({ studentId: new ObjectId(userId), purpose, subjectKey: skillKey(subject) }, { projection: { questions: 0 } });
    return d ? summaryFromDoc(d) : null;
  } catch {
    return null;
  }
}

// ── Submitting ──────────────────────────────────────────────────

/** Validates answers against the stored paper's question types and option counts. */
function cleanAnswers(questions: StudentQuestion[], raw: Record<string, unknown>): Record<string, ClientAnswer> {
  const out: Record<string, ClientAnswer> = {};
  for (const q of questions) {
    const a = raw[q.id];
    if (a == null) continue;
    const options = q.options?.length ?? 0;
    if (q.type === "mcq") {
      if (Number.isInteger(a) && (a as number) >= 0 && (a as number) < options) out[q.id] = a as number;
    } else if (q.type === "multi_select") {
      if (Array.isArray(a)) {
        const picks = Array.from(new Set(a.filter((n): n is number => Number.isInteger(n) && n >= 0 && n < options))).sort((x, y) => x - y);
        if (picks.length) out[q.id] = picks;
      }
    } else if (q.type === "short_answer") {
      if (typeof a === "string" && a.trim()) out[q.id] = a.slice(0, 4_000);
    } else if (q.type === "coding") {
      if (isRecord(a) && typeof a.source_code === "string" && a.source_code.trim()) {
        const language = (CODING_LANGUAGES as readonly string[]).includes(str(a.language)) ? (a.language as (typeof CODING_LANGUAGES)[number]) : "python";
        out[q.id] = { language, source_code: a.source_code.slice(0, 20_000) };
      }
    }
  }
  return out;
}

export async function submitPaper(
  userId: string,
  paperId: string,
  rawAnswers: Record<string, unknown>,
): Promise<{ ok: true; paper: PaperSummary } | { ok: false; error: string; status: number }> {
  if (!ObjectId.isValid(userId) || !ObjectId.isValid(paperId)) return { ok: false, error: "Paper not found.", status: 404 };
  try {
    const db = await getDb();
    const filter = { _id: new ObjectId(paperId), studentId: new ObjectId(userId) };
    const doc = await db.collection("aiPapers").findOne(filter, { projection: { questions: 0 } });
    if (!doc) return { ok: false, error: "Paper not found.", status: 404 };
    if (doc.status === "submitted") return { ok: false, error: "This paper is already being graded.", status: 409 };
    if (doc.status === "graded") return { ok: false, error: "This paper was already graded. Generate a new one to try again.", status: 409 };

    const answers = cleanAnswers((doc.studentPaper ?? []) as StudentQuestion[], rawAnswers);
    const now = new Date();
    const late = doc.expiresAt instanceof Date && now.getTime() > doc.expiresAt.getTime() + LATE_GRACE_MS;
    const updated = await db.collection("aiPapers").findOneAndUpdate(
      { ...filter, status: { $in: ["ready", "in-progress"] } },
      { $set: { status: "submitted", answers, submittedAt: now, late, updatedAt: now } },
      { returnDocument: "after", projection: { questions: 0 } },
    );
    if (!updated) return { ok: false, error: "This paper was already submitted.", status: 409 };
    return { ok: true, paper: summaryFromDoc(updated) };
  } catch (err) {
    console.error("[ai] submitPaper failed:", err);
    return { ok: false, error: "Could not submit your answers.", status: 500 };
  }
}

// ── Tasks ───────────────────────────────────────────────────────

/** `assessment.generate` task. Input: `{ purpose, subject, interviewType?, includeCoding? }`. */
export const generateHandler: TaskHandler = async (ctx) => {
  const purpose: PaperPurpose = ctx.input.purpose === "interview" ? "interview" : "skill";
  const db = await getDb();

  let subject = str(ctx.input.subject, 80).trim();
  let agentSkill = subject;
  let counts = skillTestCounts(Boolean(ctx.input.includeCoding));
  let typeId: string | null = null;

  if (purpose === "interview") {
    const t = interviewType(str(ctx.input.interviewType));
    if (!t) throw new TaskInputError("Unknown interview type.");
    const profile = await db.collection("studentProfiles").findOne({ userId: ctx.userId });
    const goals = isRecord(profile?.goals) ? profile.goals : {};
    const role = str(goals.careerTitle) || str(profile?.targetRole) || "Software Developer";
    typeId = t.id;
    subject = t.title;
    agentSkill = t.skill.replace("{role}", role);
    counts = t.counts;
  }
  if (!subject) throw new TaskInputError("No skill was given for the test.");
  const current = await db.collection("aiPapers").findOne({ studentId: ctx.userId, purpose, subjectKey: skillKey(subject) }, { projection: { status: 1 } });
  if (current?.status === "submitted") throw new TaskInputError(`Your previous ${subject} paper is still being graded. Try again once it is done.`);

  await ctx.progress(purpose === "interview" ? `Preparing your ${subject} interview questions…` : `Writing your ${subject} test${counts.coding ? " (coding questions are checked by running them)" : ""}…`);
  const res = await agent.generatePaper({ skill: agentSkill, difficulty: "mixed", counts }, { signal: ctx.signal });

  const agentStudent = new Map(((Array.isArray(res?.student_paper) ? res.student_paper : []) as unknown[]).filter(isRecord).map((q) => [str(q.id), q]));
  const questions = (Array.isArray(res?.questions) ? res.questions : []).map(sanitizeFull).filter((q): q is PaperQuestion => !!q);
  if (questions.length === 0) throw new TaskInputError("The AI agent could not produce valid questions. Please try again.");
  const studentPaper = questions.map((q) => toStudentQuestion(q, agentStudent.get(q.id)));
  const actual = questions.reduce<Record<string, number>>((acc, q) => ((acc[q.type] = (acc[q.type] ?? 0) + 1), acc), {});
  const minutes = paperMinutes(actual);

  const now = new Date();
  const key = skillKey(subject);
  const saved = await db.collection("aiPapers").findOneAndUpdate(
    { studentId: ctx.userId, purpose, subjectKey: key },
    {
      $set: {
        studentId: ctx.userId,
        purpose,
        subject,
        subjectKey: key,
        interviewType: typeId,
        agentSkill,
        agentPaperId: str(res?.paper_id, 40),
        counts,
        questions,
        studentPaper,
        totalMarks: num(res?.total_marks, questions.reduce((n, q) => n + q.marks, 0)),
        minutes,
        warnings: strArr(res?.warnings, 10),
        status: "ready",
        generatedAt: now,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
      $unset: { answers: "", submittedAt: "", startedAt: "", expiresAt: "", late: "", result: "", pendingReview: "", gradedAt: "" },
    },
    { upsert: true, returnDocument: "after", projection: { _id: 1 } },
  );
  const id = saved?._id.toString() ?? null;

  return {
    resultId: id,
    summary: `${questions.length} questions · ${minutes} min time limit`,
    title: purpose === "interview" ? `Your ${subject} mock interview is ready` : `Your ${subject} AI test is ready`,
    link: id ? `/student/assessment/ai/${id}` : "/student/assessment",
  };
};

function utcDay(d: Date): number {
  return Math.floor(d.getTime() / 86_400_000);
}

/** `assessment.grade` task. Input: `{ paperId }`. */
export const gradeHandler: TaskHandler = async (ctx) => {
  const paperId = str(ctx.input.paperId, 24);
  if (!ObjectId.isValid(paperId)) throw new TaskInputError("Paper not found.");
  const db = await getDb();
  const filter = { _id: new ObjectId(paperId), studentId: ctx.userId };
  const doc = await db.collection("aiPapers").findOne(filter);
  if (!doc) throw new TaskInputError("This paper no longer exists.");
  if (doc.status !== "submitted") throw new TaskInputError("This paper is not waiting to be graded.");

  const questions = (Array.isArray(doc.questions) ? doc.questions : []).map(sanitizeFull).filter((q): q is PaperQuestion => !!q);
  const answers = isRecord(doc.answers) ? (doc.answers as Record<string, ClientAnswer>) : {};
  const subject = str(doc.subject);
  const purpose: PaperPurpose = doc.purpose === "interview" ? "interview" : "skill";

  await ctx.progress(questions.some((q) => q.type === "coding") ? "Running your code against the tests and checking written answers…" : "Checking your answers…");
  const result = sanitizeResult(await agent.gradePaper({ paper: questions, answers, pass_percent: PASS_MARK }, { signal: ctx.signal }));

  const now = new Date();
  const pendingReview = result.needs_review.length > 0;
  const late = Boolean(doc.late);
  const percent = Math.round(result.percent);
  await db.collection("aiPapers").updateOne(filter, { $set: { status: "graded", result, pendingReview, gradedAt: now, updatedAt: now } });

  const link = `/student/assessment/ai/${paperId}`;

  if (purpose === "interview") {
    const prev = await db.collection("mockInterviews").find({ studentId: ctx.userId, paperId: { $ne: doc._id } }).sort({ createdAt: -1 }).limit(1).next();
    const prevDay = prev?.createdAt instanceof Date ? utcDay(prev.createdAt) : null;
    const today = utcDay(now);
    const prevStreak = Number(prev?.streak) || 0;
    const streak = prevDay === today ? Math.max(1, prevStreak) : prevDay === today - 1 ? prevStreak + 1 : 1;
    const feedback = result.results.map((r) => r.feedback).filter(Boolean).join(" ").slice(0, 2_000);
    await db.collection("mockInterviews").updateOne(
      { paperId: doc._id },
      {
        $set: { studentId: ctx.userId, paperId: doc._id, type: subject, interviewType: str(doc.interviewType), score: percent, feedback, streak, takenAt: now, updatedAt: now },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );
    return { resultId: paperId, summary: `Scored ${percent}% · ${result.score}/${result.total} marks`, title: `Your ${subject} interview feedback is ready`, link };
  }

  const verify = result.passed && !late && !pendingReview;
  await recordSkillTestResult(ctx.userId, subject, percent, { passed: result.passed && !late, verify, source: "ai-test" });
  const outcome = late
    ? "submitted after the time limit, so it can't verify the skill"
    : !result.passed
      ? `below the ${PASS_MARK}% pass mark — you can retry in 24 hours`
      : pendingReview
        ? "passed — some answers need a quick faculty review before the skill is verified"
        : "passed — skill verified on your profile";
  return {
    resultId: paperId,
    summary: `Scored ${percent}% (${outcome})`,
    title: verify ? `${subject} verified with ${percent}%` : `Your ${subject} test result is ready`,
    link,
  };
};
