import { createHash } from "node:crypto";
import { ObjectId, type Db, type Document } from "mongodb";
import { getDatabase } from "@/lib/db/mongodb";
import { AgentError, agent } from "@/lib/agent/client";
import {
  LEARNER_LEVELS,
  LEARNING_STYLES,
  type Learner,
  type LearnerLevel,
  type LearningLessonResponse,
  type LearningNotesResponse,
  type LearningPathResponse,
  type LearningStyle,
  type PlanLesson,
  type PlanModule,
  type RoadmapStep,
  type RoadmapTopic,
} from "@/lib/agent/types";
import { TaskInputError, type TaskHandler } from "@/lib/ai-tasks/context";
import { TARGET_ROLES } from "@/components/signup/data";
import { parseProfileSkills } from "@/lib/db/assessment";
import { ensureAiIndexes } from "./indexes";
import type { LearningPathDetail, LessonContent, NotesContent, PathModuleView } from "./learning-shared";
import { moduleSubjectKey } from "./papers-shared";
import { refreshRoadmapPath, sanitizeRoadmap, setTopicDone, verifiedSkillKeys } from "./roadmap";
import { roadmapProgress, stepProgress, topicKey } from "./roadmap-progress";
import { isRecord, iso, num, skillKey, str, strArr } from "./util";

/**
 * Personal learning paths on top of AI roadmaps, written by the Agent's
 * learning path agent (`/learning/*`, served by the self-hosted vLLM model).
 *
 *  roadmap step  → module: lessons, then a module test (an `aiPapers` doc with
 *                  `purpose: "module"`) whose pass verifies the step's skill
 *  roadmap topic → lesson: narrated slide video + quick check, YouTube videos, notes
 *
 * State lives on the roadmap's `learningPaths` row, next to its progress:
 *  learningPaths {
 *    …roadmap path fields (see roadmap.ts),
 *    plan:        { modules[], totalMinutes, model, generatedAt, roadmapUpdatedAt }   from /learning/path
 *    checks:      [{ key: topicKey, step, correct, total, at }]   latest quick check per lesson
 *    weak:        [{ step: skillKey, items[] }]                    subtopics to re-explain
 *    moduleTests: [{ step: skillKey, paperId, percent, passed, at }]
 *  }
 * Lesson completion is the roadmap's own `aiRoadmaps.topicsDone`, so the roadmap
 * page and the learning path always agree.
 *
 * Personalisation: every lesson / notes request carries a `Learner` built here
 * from stored data only (signup answers, skill levels, quick checks, module
 * tests) — never from text the student typed — so a prompt can't be steered.
 * Generated content is cached in `learningContent`, keyed by everything that
 * shaped it (topic, level, style, role, weak / known subtopics): students with
 * the same profile share one copy, and only a student's remedial versions are
 * effectively personal.
 */

/** Bump to invalidate every cached lesson and note after a prompt change. */
const CONTENT_VERSION = 1;

async function getDb(): Promise<Db> {
  const db = await getDatabase();
  await ensureAiIndexes(db);
  return db;
}

type Fail = { ok: false; status: number; error: string };

const fail = (status: number, error: string): Fail => ({ ok: false, status, error });

/** Turns an Agent failure into a message the student can act on. */
function agentFailure(err: unknown, what: string): Fail {
  if (err instanceof AgentError) {
    console.error(`[learning] ${what} failed:`, err.message);
    if (err.status === 502 || err.status === 0) {
      return fail(503, "The learning model isn't available right now (it may still be starting up). Please try again in a few minutes.");
    }
    return fail(502, `Could not write the ${what}. Please try again.`);
  }
  console.error(`[learning] ${what} failed:`, err);
  return fail(500, `Could not load the ${what}.`);
}

// ── Stored state ────────────────────────────────────────────────

interface CheckEntry {
  key: string;
  step: string;
  correct: number;
  total: number;
  at: Date;
}

interface WeakEntry {
  step: string;
  items: string[];
}

interface ModuleTestEntry {
  step: string;
  paperId: ObjectId;
  percent: number;
  passed: boolean;
  at: Date;
}

interface StoredPlan {
  modules: PlanModule[];
  totalMinutes: number;
  model: string;
  generatedAt: Date | null;
  roadmapUpdatedAt: Date | null;
}

const checksOf = (d: Document | null): CheckEntry[] =>
  (Array.isArray(d?.checks) ? d.checks : []).filter(isRecord).map((c) => ({
    key: str(c.key, 400),
    step: str(c.step, 200),
    correct: num(c.correct),
    total: num(c.total),
    at: c.at instanceof Date ? c.at : new Date(0),
  }));

const weakOf = (d: Document | null): WeakEntry[] =>
  (Array.isArray(d?.weak) ? d.weak : []).filter(isRecord).map((w) => ({ step: str(w.step, 200), items: strArr(w.items, 12, 200) }));

const testsOf = (d: Document | null): ModuleTestEntry[] =>
  (Array.isArray(d?.moduleTests) ? d.moduleTests : [])
    .filter(isRecord)
    .filter((t) => t.paperId instanceof ObjectId)
    .map((t) => ({
      step: str(t.step, 200),
      paperId: t.paperId as ObjectId,
      percent: num(t.percent),
      passed: Boolean(t.passed),
      at: t.at instanceof Date ? t.at : new Date(0),
    }));

function sanitizePlanLesson(v: unknown): PlanLesson | null {
  if (!isRecord(v)) return null;
  const topic = str(v.topic, 200);
  if (!topic) return null;
  return {
    topic,
    objective: str(v.objective, 300),
    focus: strArr(v.focus, 6, 200),
    skip: strArr(v.skip, 10, 200),
    approach: str(v.approach, 300),
    minutes: Math.max(0, Math.min(180, Math.round(num(v.minutes)))),
    video_query: str(v.video_query, 150),
  };
}

const asLevel = (v: unknown): LearnerLevel => ((LEARNER_LEVELS as readonly string[]).includes(str(v)) ? (v as LearnerLevel) : "beginner");
const asStyle = (v: unknown): LearningStyle => ((LEARNING_STYLES as readonly string[]).includes(str(v)) ? (v as LearningStyle) : "mix");

function sanitizePlanModule(v: unknown): PlanModule | null {
  if (!isRecord(v)) return null;
  const skill = str(v.skill, 120);
  if (!skill) return null;
  const test = isRecord(v.test) ? v.test : {};
  const difficulty = str(test.difficulty);
  return {
    skill,
    role: str(v.role, 20) || "prerequisite",
    level: asLevel(v.level),
    intro: str(v.intro, 600),
    lessons: (Array.isArray(v.lessons) ? v.lessons : []).map(sanitizePlanLesson).filter((l): l is PlanLesson => !!l).slice(0, 15),
    test: {
      topics: strArr(test.topics, 8, 200),
      difficulty: difficulty === "easy" || difficulty === "medium" || difficulty === "hard" ? difficulty : "mixed",
    },
    planned: v.planned !== false,
    warnings: strArr(v.warnings, 5, 300),
  };
}

function planOf(d: Document | null): StoredPlan | null {
  if (!d || !isRecord(d.plan)) return null;
  const p = d.plan;
  const modules = (Array.isArray(p.modules) ? p.modules : []).map(sanitizePlanModule).filter((m): m is PlanModule => !!m);
  if (modules.length === 0) return null;
  return {
    modules,
    totalMinutes: num(p.totalMinutes),
    model: str(p.model, 80),
    generatedAt: p.generatedAt instanceof Date ? p.generatedAt : null,
    roadmapUpdatedAt: p.roadmapUpdatedAt instanceof Date ? p.roadmapUpdatedAt : null,
  };
}

// ── The learner ─────────────────────────────────────────────────

/** Everything the learner model needs, loaded once per request. */
interface LearnerContext {
  roadmap: Document;
  steps: RoadmapStep[];
  path: Document | null;
  profile: Document | null;
  verified: string[];
}

async function loadContext(db: Db, studentId: ObjectId, roadmapId: ObjectId): Promise<LearnerContext | null> {
  const roadmap = await db.collection("aiRoadmaps").findOne({ _id: roadmapId, studentId });
  if (!roadmap) return null;
  const [path, profile, verified] = await Promise.all([
    db.collection("learningPaths").findOne({ studentId, roadmapId }),
    db.collection("studentProfiles").findOne({ userId: studentId }, { projection: { skills: 1, experienceLevel: 1, learningStyle: 1, targetRole: 1, goals: 1 } }),
    verifiedSkillKeys(db, studentId),
  ]);
  return { roadmap, steps: sanitizeRoadmap(roadmap.roadmap).steps, path, profile, verified };
}

const EXPERIENCE_RANK: Record<string, number> = { beginner: 0, intermediate: 1, advanced: 2, expert: 2 };

/** The student's career goal, but only from fixed option lists — free text never reaches a prompt. */
function targetRoleOf(profile: Document | null): string {
  const goals = isRecord(profile?.goals) ? profile.goals : {};
  const career = str(goals.careerTitle, 80);
  if (career) return career;
  const role = str(profile?.targetRole, 80);
  return TARGET_ROLES.includes(role) ? role : "";
}

/**
 * The level one module's lessons are written at:
 *  start   = signup experience level
 *  raise   to the student's claimed level in that skill (questionnaire / profile)
 *  lower   one step after a failed module test
 *  adjust  by quick checks in this module once there are at least 6 answers:
 *          under 50% correct → one step down, 90%+ → one step up
 */
function moduleLevel(ctx: LearnerContext, step: RoadmapStep): LearnerLevel {
  let rank = EXPERIENCE_RANK[str(ctx.profile?.experienceLevel)] ?? 0;
  const claimed = parseProfileSkills(ctx.profile?.skills).find((s) => skillKey(s.name) === skillKey(step.skill));
  if (claimed && claimed.level >= 70) rank = Math.max(rank, 2);
  else if (claimed && claimed.level >= 50) rank = Math.max(rank, 1);

  const sk = skillKey(step.skill);
  const test = testsOf(ctx.path).find((t) => t.step === sk);
  if (test && !test.passed) rank -= 1;

  const checks = checksOf(ctx.path).filter((c) => c.step === sk);
  const total = checks.reduce((n, c) => n + c.total, 0);
  if (total >= 6) {
    const ratio = checks.reduce((n, c) => n + c.correct, 0) / total;
    if (ratio < 0.5) rank -= 1;
    else if (ratio >= 0.9) rank += 1;
  }
  return LEARNER_LEVELS[Math.max(0, Math.min(2, rank))];
}

/** Names from `items` that are this topic or one of its subtopics, spelled as in the syllabus, sorted. */
function forTopic(items: string[], topic: RoadmapTopic): string[] {
  const names = [topic.name, ...topic.subtopics];
  const keys = new Set(items.map(skillKey));
  return names.filter((n) => keys.has(skillKey(n))).sort();
}

function learnerFor(ctx: LearnerContext, step: RoadmapStep, topic: RoadmapTopic): Learner {
  const weak = weakOf(ctx.path).find((w) => w.step === skillKey(step.skill))?.items ?? [];
  const knownNames = [...strArr(ctx.roadmap.knownSkills), ...parseProfileSkills(ctx.profile?.skills).filter((s) => s.verified).map((s) => s.name)];
  return {
    level: moduleLevel(ctx, step),
    style: asStyle(ctx.profile?.learningStyle),
    target_role: targetRoleOf(ctx.profile),
    weak: forTopic(weak, topic),
    known: forTopic(knownNames, topic),
  };
}

function findLesson(ctx: LearnerContext, stepName: string, topicName: string): { step: RoadmapStep; topic: RoadmapTopic } | null {
  const step = ctx.steps.find((s) => skillKey(s.skill) === skillKey(stepName));
  const topic = step?.topics.find((t) => skillKey(t.name) === skillKey(topicName));
  return step && topic ? { step, topic } : null;
}

function contentKey(kind: "lesson" | "notes", step: RoadmapStep, topic: RoadmapTopic, learner: Learner): string {
  const parts = [
    kind,
    CONTENT_VERSION,
    skillKey(step.skill),
    skillKey(topic.name),
    topic.subtopics.map(skillKey),
    learner.level,
    learner.style,
    learner.target_role ?? "",
    learner.weak ?? [],
    learner.known ?? [],
  ];
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}

// ── Plan (background task) ──────────────────────────────────────

/** `learning.plan` task. Input: `{ roadmapId }`. */
export const planHandler: TaskHandler = async (ctx) => {
  const rid = str(ctx.input.roadmapId, 24);
  if (!ObjectId.isValid(rid)) throw new TaskInputError("Learning path not found.");
  const roadmapId = new ObjectId(rid);
  const db = await getDb();
  const lc = await loadContext(db, ctx.userId, roadmapId);
  if (!lc) throw new TaskInputError("This roadmap no longer exists.");
  const skill = str(lc.roadmap.skill);
  const steps = lc.steps.filter((s) => s.topics.length > 0);
  if (steps.length === 0) throw new TaskInputError("This roadmap has no topics to plan.");

  await ctx.progress(`Planning ${steps.length} module${steps.length === 1 ? "" : "s"} of your ${skill} path around how you learn…`);
  const first = steps[0];
  const learner = learnerFor(lc, first, first.topics[0]);
  const res: LearningPathResponse = await agent.learningPath(
    {
      target_skill: str(lc.roadmap.roadmap?.target_skill) || skill,
      steps: steps.map((s) => ({ ...s, level: moduleLevel(lc, s) })),
      learner: { level: learner.level, style: learner.style, target_role: learner.target_role, known: [], weak: [] },
    },
    { signal: ctx.signal },
  );
  const modules = (Array.isArray(res?.modules) ? res.modules : []).map(sanitizePlanModule).filter((m): m is PlanModule => !!m);
  if (modules.length === 0) throw new TaskInputError("The learning path agent returned an empty plan. Please try again.");

  const now = new Date();
  const plan = {
    modules,
    totalMinutes: Math.round(num(res.total_minutes, modules.reduce((n, m) => n + m.lessons.reduce((k, l) => k + l.minutes, 0), 0))),
    model: str(res.model, 80),
    generatedAt: now,
    roadmapUpdatedAt: lc.roadmap.updatedAt instanceof Date ? lc.roadmap.updatedAt : now,
  };
  // Make sure the path row exists (old roadmaps), then store the plan on it.
  await refreshRoadmapPath(db, ctx.userId, lc.roadmap, lc.verified);
  await db.collection("learningPaths").updateOne({ studentId: ctx.userId, roadmapId }, { $set: { plan, updatedAt: now } });

  const lessons = modules.reduce((n, m) => n + m.lessons.length, 0);
  return {
    resultId: rid,
    summary: `${modules.length} modules · ${lessons} lessons · about ${Math.max(1, Math.round(plan.totalMinutes / 60))} hours`,
    title: `Your ${skill} learning path is ready`,
    link: `/student/learning/${rid}`,
  };
};

// ── Lessons and notes ───────────────────────────────────────────

type Ok<T> = { ok: true; content: T };

async function cached<T>(db: Db, key: string): Promise<T | null> {
  const d = await db.collection("learningContent").findOne({ cacheKey: key }, { projection: { content: 1 } });
  return d && isRecord(d.content) ? (d.content as T) : null;
}

async function store(db: Db, key: string, kind: string, step: RoadmapStep, topic: RoadmapTopic, learner: Learner, content: unknown) {
  const now = new Date();
  await db.collection("learningContent").updateOne(
    { cacheKey: key },
    {
      $set: { cacheKey: key, kind, skill: step.skill, topic: topic.name, level: learner.level, style: learner.style, content, createdAt: now },
    },
    { upsert: true },
  );
}

function sanitizeLesson(r: LearningLessonResponse, learner: Learner): Omit<LessonContent, "cached"> {
  const slides = (Array.isArray(r?.slides) ? r.slides : []).filter(isRecord).map((s) => ({
    title: str(s.title, 90) || "Slide",
    bullets: strArr(s.bullets, 5, 140),
    narration: str(s.narration, 700),
    example: str(s.example, 800),
  })).filter((s) => s.narration).slice(0, 9);
  const quickCheck = (Array.isArray(r?.quick_check) ? r.quick_check : []).filter(isRecord).map((q) => ({
    question: str(q.question, 400),
    options: strArr(q.options, 4, 200),
    answer_index: num(q.answer_index, -1),
    subtopic: str(q.subtopic, 200),
    explanation: str(q.explanation, 400),
  })).filter((q) => q.question && q.options.length === 4 && q.answer_index >= 0 && q.answer_index < 4).slice(0, 3);
  const v = isRecord(r?.videos) ? r.videos : null;
  return {
    topic: str(r?.topic, 200),
    level: learner.level,
    style: learner.style,
    remedial: learner.weak ?? [],
    slides,
    quickCheck,
    videos: v
      ? {
          query: str(v.query, 150),
          search_url: str(v.search_url, 400).startsWith("https://www.youtube.com/") ? str(v.search_url, 400) : "",
          videos: (Array.isArray(v.videos) ? v.videos : []).filter(isRecord).map((x) => ({
            video_id: str(x.video_id, 11),
            title: str(x.title, 200),
            channel: str(x.channel, 120),
            url: `https://www.youtube.com/watch?v=${str(x.video_id, 11)}`,
          })).filter((x) => /^[A-Za-z0-9_-]{11}$/.test(x.video_id)).slice(0, 3),
        }
      : null,
  };
}

function sanitizeNotes(r: LearningNotesResponse, learner: Learner): Omit<NotesContent, "cached"> {
  return {
    topic: str(r?.topic, 200),
    level: learner.level,
    style: learner.style,
    remedial: learner.weak ?? [],
    overview: str(r?.overview, 800),
    sections: (Array.isArray(r?.sections) ? r.sections : []).filter(isRecord).map((s) => ({
      heading: str(s.heading, 160),
      points: strArr(s.points, 6, 600),
      example: str(s.example, 1_200),
    })).filter((s) => s.points.length > 0).slice(0, 10),
    keyTerms: (Array.isArray(r?.key_terms) ? r.key_terms : []).filter(isRecord).map((t) => ({ term: str(t.term, 80), meaning: str(t.meaning, 300) })).filter((t) => t.term).slice(0, 8),
    commonMistakes: strArr(r?.common_mistakes, 6, 400),
    summary: strArr(r?.summary, 8, 300),
    selfCheck: strArr(r?.self_check, 6, 300),
    practice: strArr(r?.practice, 4, 400),
  };
}

/**
 * The lesson (`kind: "lesson"`) or notes (`kind: "notes"`) for one topic of
 * the student's own roadmap, written for them — from the shared cache when an
 * identical learner has already had it, otherwise from the learning agent.
 */
export async function getLearningContent(
  userId: string,
  roadmapId: string,
  ref: { step: string; topic: string },
  kind: "lesson",
): Promise<Ok<LessonContent> | Fail>;
export async function getLearningContent(
  userId: string,
  roadmapId: string,
  ref: { step: string; topic: string },
  kind: "notes",
): Promise<Ok<NotesContent> | Fail>;
export async function getLearningContent(
  userId: string,
  roadmapId: string,
  ref: { step: string; topic: string },
  kind: "lesson" | "notes",
): Promise<Ok<LessonContent> | Ok<NotesContent> | Fail> {
  if (!ObjectId.isValid(userId) || !ObjectId.isValid(roadmapId)) return fail(404, "Learning path not found.");
  let db: Db;
  let lc: LearnerContext | null;
  try {
    db = await getDb();
    lc = await loadContext(db, new ObjectId(userId), new ObjectId(roadmapId));
  } catch (err) {
    return agentFailure(err, kind);
  }
  if (!lc) return fail(404, "Learning path not found.");
  const found = findLesson(lc, ref.step, ref.topic);
  if (!found) return fail(400, "That lesson is not part of this learning path.");
  const { step, topic } = found;
  const learner = learnerFor(lc, step, topic);
  const key = contentKey(kind, step, topic, learner);

  try {
    if (kind === "lesson") {
      const hit = await cached<Omit<LessonContent, "cached">>(db, key);
      if (hit) return { ok: true, content: { ...hit, cached: true } };
      const content = sanitizeLesson(await agent.learningLesson({ skill: step.skill, topic, learner, videos: true }), learner);
      if (content.slides.length === 0) return fail(502, "The learning agent returned an empty lesson. Please try again.");
      await store(db, key, kind, step, topic, learner, content);
      return { ok: true, content: { ...content, cached: false } };
    }
    const hit = await cached<Omit<NotesContent, "cached">>(db, key);
    if (hit) return { ok: true, content: { ...hit, cached: true } };
    const content = sanitizeNotes(await agent.learningNotes({ skill: step.skill, topic, learner }), learner);
    if (content.sections.length === 0) return fail(502, "The learning agent returned empty notes. Please try again.");
    await store(db, key, kind, step, topic, learner, content);
    return { ok: true, content: { ...content, cached: false } };
  } catch (err) {
    return agentFailure(err, kind === "lesson" ? "lesson" : "notes");
  }
}

// ── Progress ────────────────────────────────────────────────────

export interface LessonDoneInput {
  step: string;
  topic: string;
  /** Quick-check result; `missed` = the subtopics of the questions answered wrong. */
  check: { correct: number; total: number; missed: string[] } | null;
}

/**
 * Completes one lesson (ticks its roadmap topic) and records its quick check:
 * the missed subtopics replace this topic's weak spots, so the lesson and
 * notes are re-explained next time, and the score feeds the module's level.
 */
export async function completeLesson(
  userId: string,
  roadmapId: string,
  input: LessonDoneInput,
): Promise<{ ok: true; topicsDone: string[]; level: LearnerLevel; weak: string[] } | Fail> {
  const ticked = await setTopicDone(userId, roadmapId, { step: input.step, topic: input.topic, done: true });
  if (!ticked.ok) return ticked;
  try {
    const db = await getDb();
    const studentId = new ObjectId(userId);
    const rid = new ObjectId(roadmapId);
    const lc = await loadContext(db, studentId, rid);
    const found = lc && findLesson(lc, input.step, input.topic);
    if (!lc || !found) return fail(404, "Learning path not found.");
    const { step, topic } = found;
    const sk = skillKey(step.skill);

    let weak = weakOf(lc.path);
    if (input.check) {
      const key = topicKey(step.skill, topic.name);
      const checks = [
        ...checksOf(lc.path).filter((c) => c.key !== key),
        { key, step: sk, correct: input.check.correct, total: input.check.total, at: new Date() },
      ].slice(-300);
      // Only names from the syllabus are kept: they go into later prompts.
      const missed = forTopic(input.check.missed, topic);
      const own = new Set([topic.name, ...topic.subtopics].map(skillKey));
      const rest = (weak.find((w) => w.step === sk)?.items ?? []).filter((i) => !own.has(skillKey(i)));
      weak = [...weak.filter((w) => w.step !== sk), { step: sk, items: [...rest, ...missed].slice(0, 12) }];
      await db.collection("learningPaths").updateOne({ studentId, roadmapId: rid }, { $set: { checks, weak, updatedAt: new Date() } });
      lc.path = { ...(lc.path ?? {}), checks, weak };
    }
    return { ok: true, topicsDone: ticked.topicsDone, level: moduleLevel(lc, step), weak: weak.find((w) => w.step === sk)?.items ?? [] };
  } catch (err) {
    console.error("[learning] completeLesson failed:", err);
    return fail(500, "Your lesson was marked done, but the quick-check result could not be saved.");
  }
}

/** What a module test needs, after checking the module is finished and not locked. */
export async function moduleTestInput(
  userId: string,
  roadmapId: string,
  stepName: string,
): Promise<{ ok: true; skill: string; topics: string[]; difficulty: string } | Fail> {
  if (!ObjectId.isValid(userId) || !ObjectId.isValid(roadmapId)) return fail(404, "Learning path not found.");
  try {
    const db = await getDb();
    const lc = await loadContext(db, new ObjectId(userId), new ObjectId(roadmapId));
    if (!lc) return fail(404, "Learning path not found.");
    const step = lc.steps.find((s) => skillKey(s.skill) === skillKey(stepName));
    if (!step) return fail(400, "That module is not part of this learning path.");
    const done = new Set(strArr(lc.roadmap.topicsDone, 1_000, 300));
    const left = step.topics.filter((t) => !done.has(topicKey(step.skill, t.name))).length;
    if (left > 0) return fail(409, `Finish the module first: ${left} lesson${left === 1 ? "" : "s"} left.`);
    const planned = planOf(lc.path)?.modules.find((m) => skillKey(m.skill) === skillKey(step.skill));
    const names = step.topics.map((t) => t.name);
    const topics = planned?.test.topics.filter((t) => names.some((n) => skillKey(n) === skillKey(t))) ?? [];
    return {
      ok: true,
      skill: step.skill,
      topics: (topics.length ? topics : names).slice(0, 8),
      difficulty: planned?.test.difficulty ?? (moduleLevel(lc, step) === "advanced" ? "medium" : "mixed"),
    };
  } catch (err) {
    console.error("[learning] moduleTestInput failed:", err);
    return fail(500, "Could not check the module.");
  }
}

/** Loose match of a test question's topic to the module's syllabus names. */
function matchSyllabus(raw: string, step: RoadmapStep): string | null {
  const k = skillKey(raw);
  if (k.length < 3) return null;
  const names = step.topics.flatMap((t) => [t.name, ...t.subtopics]);
  return names.find((n) => skillKey(n) === k) ?? names.find((n) => {
    const nk = skillKey(n);
    return nk.length >= 4 && k.length >= 4 && (nk.includes(k) || k.includes(nk));
  }) ?? null;
}

/**
 * Called when a module test is graded: stores the attempt on the learning path,
 * turns the topics the student lost marks on into the module's weak spots, and
 * re-derives the path's progress (a pass has just verified the skill).
 */
export async function recordModuleTest(
  studentId: ObjectId,
  roadmapId: ObjectId,
  skill: string,
  result: { paperId: ObjectId; percent: number; passed: boolean; missedTopics: string[] },
): Promise<void> {
  try {
    const db = await getDb();
    const lc = await loadContext(db, studentId, roadmapId);
    if (!lc) return;
    const step = lc.steps.find((s) => skillKey(s.skill) === skillKey(skill));
    if (!step) return;
    const sk = skillKey(step.skill);
    const missed = Array.from(new Set(result.missedTopics.map((t) => matchSyllabus(t, step)).filter((t): t is string => !!t))).slice(0, 8);
    const moduleTests = [...testsOf(lc.path).filter((t) => t.step !== sk), { step: sk, paperId: result.paperId, percent: result.percent, passed: result.passed, at: new Date() }];
    // A fail keeps the quick checks' weak spots too; a pass leaves only what this test still caught.
    const before = weakOf(lc.path).find((w) => w.step === sk)?.items ?? [];
    const items = result.passed ? missed : Array.from(new Set([...missed, ...before])).slice(0, 12);
    const weak = [...weakOf(lc.path).filter((w) => w.step !== sk), { step: sk, items }];
    await refreshRoadmapPath(db, studentId, lc.roadmap, await verifiedSkillKeys(db, studentId));
    await db.collection("learningPaths").updateOne({ studentId, roadmapId }, { $set: { moduleTests, weak, updatedAt: new Date() } });
  } catch (err) {
    // The grade itself is already saved on the paper; only the path's extras are lost.
    console.error("[learning] recordModuleTest failed:", err);
  }
}

// ── Read ────────────────────────────────────────────────────────

export async function getLearningPathDetail(userId: string, roadmapId: string): Promise<LearningPathDetail | null> {
  if (!ObjectId.isValid(userId) || !ObjectId.isValid(roadmapId)) return null;
  try {
    const db = await getDb();
    const studentId = new ObjectId(userId);
    const rid = new ObjectId(roadmapId);
    const lc = await loadContext(db, studentId, rid);
    if (!lc) return null;

    const skills = lc.steps.map((s) => s.skill);
    const [papers, locks] = await Promise.all([
      db
        .collection("aiPapers")
        .find({ studentId, purpose: "module", roadmapId: rid }, { projection: { subjectKey: 1, status: 1, result: 1 } })
        .toArray(),
      db.collection("skillAssessments").find({ studentId, skill: { $in: skills } }, { projection: { skill: 1, lockedUntil: 1 } }).toArray(),
    ]);

    const plan = planOf(lc.path);
    const checks = checksOf(lc.path);
    const weak = weakOf(lc.path);
    const done = new Set(strArr(lc.roadmap.topicsDone, 1_000, 300));
    const verified = new Set(lc.verified);
    const now = Date.now();

    const modules: PathModuleView[] = lc.steps.map((step) => {
      const sk = skillKey(step.skill);
      const planned = plan?.modules.find((m) => skillKey(m.skill) === sk);
      const sp = stepProgress(step, done, verified);
      const paper = papers.find((p) => p.subjectKey === moduleSubjectKey(roadmapId, step.skill));
      const result = isRecord(paper?.result) ? paper.result : null;
      const lock = locks.find((l) => l.skill === step.skill)?.lockedUntil;
      const lessons = step.topics.map((t) => {
        const pl = planned?.lessons.find((l) => skillKey(l.topic) === skillKey(t.name));
        const c = checks.find((x) => x.key === topicKey(step.skill, t.name));
        return {
          topic: t.name,
          why: t.why ?? "",
          subtopics: t.subtopics,
          practice: t.practice ?? [],
          objective: pl?.objective ?? "",
          focus: pl?.focus ?? [],
          skip: pl?.skip ?? [],
          minutes: pl?.minutes ?? 0,
          done: sp.verified || done.has(topicKey(step.skill, t.name)),
          check: c ? { correct: c.correct, total: c.total } : null,
        };
      });
      return {
        skill: step.skill,
        role: step.role,
        weeks: step.weeks,
        summary: step.summary,
        intro: planned?.intro ?? "",
        level: moduleLevel(lc, step),
        verified: sp.verified,
        lessons,
        weak: weak.find((w) => w.step === sk)?.items ?? [],
        project: step.project ?? "",
        resources: step.resources ?? [],
        test: {
          paper: paper
            ? {
                id: paper._id.toString(),
                status: (["ready", "in-progress", "submitted", "graded"] as const).includes(paper.status) ? paper.status : "ready",
                percent: result ? Math.round(num(result.percent)) : null,
                passed: result ? Boolean(result.passed) : null,
              }
            : null,
          lockedUntil: lock instanceof Date && lock.getTime() > now ? lock.toISOString() : null,
          lessonsLeft: lessons.filter((l) => !l.done).length,
          topics: planned?.test.topics ?? step.topics.map((t) => t.name).slice(0, 6),
          difficulty: planned?.test.difficulty ?? "mixed",
        },
      };
    });

    const p = roadmapProgress(lc.steps, done, verified);
    const updated = lc.roadmap.updatedAt instanceof Date ? lc.roadmap.updatedAt.getTime() : 0;
    return {
      roadmapId,
      skill: str(lc.roadmap.skill),
      style: asStyle(lc.profile?.learningStyle),
      targetRole: targetRoleOf(lc.profile),
      progress: { percent: p.percent, lessonsDone: p.done, lessons: p.total, modulesPassed: p.verifiedSteps, modules: lc.steps.length },
      plan: plan
        ? {
            generatedAt: iso(plan.generatedAt),
            stale: (plan.roadmapUpdatedAt?.getTime() ?? 0) < updated,
            totalMinutes: plan.totalMinutes,
            model: plan.model,
          }
        : null,
      modules,
    };
  } catch (err) {
    console.error("[learning] getLearningPathDetail failed:", err);
    return null;
  }
}
