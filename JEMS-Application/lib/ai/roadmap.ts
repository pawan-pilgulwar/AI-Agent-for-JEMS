import { ObjectId, type Db, type Document } from "mongodb";
import { getDatabase } from "@/lib/db/mongodb";
import { agent } from "@/lib/agent/client";
import type { RoadmapResponse, RoadmapStep, RoadmapTopic } from "@/lib/agent/types";
import { TaskInputError, type TaskHandler } from "@/lib/ai-tasks/context";
import { parseProfileSkills } from "@/lib/db/assessment";
import { ensureAiIndexes } from "./indexes";
import { ensurePrereqs, orderPrereqs } from "./prereqs";
import { roadmapProgress, topicKey } from "./roadmap-progress";
import { isRecord, iso, num, skillKey, str, strArr } from "./util";

/**
 * Personalised AI learning roadmaps (the API guide's typical flow, steps 1–4):
 *   target skill → prerequisite tree (cached) → minus the student's verified
 *   skills → ordered missing skills → `/agents/roadmap` syllabus.
 *
 *  aiRoadmaps { studentId, skillKey, skill, missingSkills[], knownSkills[],
 *               roadmap: RoadmapResponse, createdAt, updatedAt }
 *
 * One document per (student, skill): regenerating updates it in place.
 */

/**
 * The Agent spends ~8-15 LLM calls per step (outline + one per topic), all
 * behind a 3-request concurrency cap, so each extra step adds about a minute.
 */
const MAX_PREREQ_STEPS = 4;

async function getDb(): Promise<Db> {
  const db = await getDatabase();
  await ensureAiIndexes(db);
  return db;
}

function sanitizeTopic(v: unknown): RoadmapTopic | null {
  if (!isRecord(v)) return null;
  const name = str(v.name, 200);
  if (!name) return null;
  return { name, why: str(v.why, 500), subtopics: strArr(v.subtopics, 15, 200), practice: strArr(v.practice, 8, 300) };
}

function sanitizeStep(v: unknown): RoadmapStep | null {
  if (!isRecord(v)) return null;
  const skill = str(v.skill, 120);
  if (!skill) return null;
  return {
    skill,
    role: str(v.role, 20) || "prerequisite",
    weeks: Math.max(0, Math.round(num(v.weeks))),
    summary: str(v.summary, 1_000),
    why_learn: str(v.why_learn, 1_500),
    used_in: strArr(v.used_in, 10, 400),
    topics: (Array.isArray(v.topics) ? v.topics : []).map(sanitizeTopic).filter((t): t is RoadmapTopic => !!t).slice(0, 15),
    project: str(v.project, 1_000),
    resources: strArr(v.resources, 10, 300),
    warnings: strArr(v.warnings, 5),
  };
}

export function sanitizeRoadmap(v: unknown): RoadmapResponse {
  const o = isRecord(v) ? v : {};
  const steps = (Array.isArray(o.steps) ? o.steps : []).map(sanitizeStep).filter((s): s is RoadmapStep => !!s).slice(0, 15);
  return {
    target_skill: str(o.target_skill, 120) || null,
    total_weeks: Math.round(num(o.total_weeks, steps.reduce((n, s) => n + s.weeks, 0))),
    steps,
  };
}

// ── Task ────────────────────────────────────────────────────────

/** `student.roadmap` task. Input: `{ skill }`. */
export const roadmapHandler: TaskHandler = async (ctx) => {
  const skill = str(ctx.input.skill, 80).trim();
  if (!skill) throw new TaskInputError("No skill was given for the roadmap.");
  const db = await getDb();

  await ctx.progress(`Mapping the prerequisites of ${skill}…`);
  const trees = await ensurePrereqs([skill], { signal: ctx.signal });
  const tree = trees.get(skillKey(skill));
  const ordered = orderPrereqs(tree?.prerequisites ?? []);

  const profile = await db.collection("studentProfiles").findOne({ userId: ctx.userId });
  const verified = new Set(parseProfileSkills(profile?.skills).filter((s) => s.verified).map((s) => skillKey(s.name)));
  const known = ordered.filter((p) => verified.has(skillKey(p.name))).map((p) => p.name);
  const missing = ordered
    .filter((p) => !verified.has(skillKey(p.name)) && skillKey(p.name) !== skillKey(skill))
    .map((p) => p.name)
    .slice(0, MAX_PREREQ_STEPS);

  await ctx.progress(`Writing your syllabus: ${missing.length} prerequisite${missing.length === 1 ? "" : "s"} + ${skill}…`);
  const roadmap = sanitizeRoadmap(await agent.roadmap({ missing_skills: missing, target_skill: skill }, { signal: ctx.signal }));
  if (roadmap.steps.length === 0) throw new TaskInputError("The AI agent returned an empty roadmap. Please try again.");

  const now = new Date();
  const key = skillKey(skill);
  const saved = await db.collection("aiRoadmaps").findOneAndUpdate(
    { studentId: ctx.userId, skillKey: key },
    {
      $set: { studentId: ctx.userId, skillKey: key, skill, missingSkills: missing, knownSkills: known, roadmap, updatedAt: now },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true, returnDocument: "after", projection: { _id: 1 } },
  );
  const id = saved?._id.toString() ?? null;

  // Every roadmap is also a learning path (same shape as the other
  // `learningPaths` rows), kept in step with it: regenerating updates it.
  if (saved) {
    const full = await db.collection("aiRoadmaps").findOne({ _id: saved._id }, { projection: { topicsDone: 1 } });
    await upsertRoadmapPath(db, ctx.userId, saved._id, {
      skill, roadmap, missingSkills: missing, topicsDone: strArr(full?.topicsDone, 1_000, 300), verified: [...verified],
    });
  }

  return {
    resultId: id,
    summary: `${roadmap.steps.length} steps · about ${roadmap.total_weeks} weeks${known.length ? ` · skipped ${known.length} skill${known.length === 1 ? "" : "s"} you've verified` : ""}`,
    title: `Your ${skill} roadmap is ready`,
    link: id ? `/student/roadmap/ai/${id}` : "/student/roadmap/ai",
  };
};

// ── Learning path ───────────────────────────────────────────────

/** The roadmap agent plans each step at about 10 study hours per week. */
const HOURS_PER_WEEK = 10;

/** Where the student starts: many missing prerequisites = starting from the foundations. */
function pathLevel(missingSkills: number): string {
  if (missingSkills >= 3) return "Beginner";
  if (missingSkills >= 1) return "Intermediate";
  return "Advanced";
}

/**
 * Creates or refreshes the `learningPaths` row for one roadmap:
 *  { studentId, roadmapId, skillKey, title, category, level, lessons, hours, progress, createdAt, updatedAt }
 * `lessons` = the roadmap's topics; `progress` = ticked topics, with verified steps counting in full.
 */
export async function upsertRoadmapPath(
  db: Db,
  studentId: ObjectId,
  roadmapId: ObjectId,
  input: { skill: string; roadmap: RoadmapResponse; missingSkills: string[]; topicsDone: string[]; verified: string[] },
): Promise<void> {
  const p = roadmapProgress(input.roadmap.steps, new Set(input.topicsDone), new Set(input.verified));
  const now = new Date();
  await db.collection("learningPaths").updateOne(
    { studentId, roadmapId },
    {
      $set: {
        studentId,
        roadmapId,
        skillKey: skillKey(input.skill),
        title: input.skill,
        category: "AI Roadmap",
        level: pathLevel(input.missingSkills.length),
        lessons: p.total,
        hours: input.roadmap.total_weeks * HOURS_PER_WEEK,
        progress: p.percent,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );
}

/** Re-derives the learning path of one stored roadmap document (after a tick, or to backfill). */
export async function refreshRoadmapPath(db: Db, studentId: ObjectId, d: Document, verified: string[]): Promise<void> {
  await upsertRoadmapPath(db, studentId, d._id as ObjectId, {
    skill: str(d.skill),
    roadmap: sanitizeRoadmap(d.roadmap),
    missingSkills: strArr(d.missingSkills),
    topicsDone: strArr(d.topicsDone, 1_000, 300),
    verified,
  });
}

// ── Reads ───────────────────────────────────────────────────────

export interface AiRoadmapSummary {
  id: string;
  skill: string;
  totalWeeks: number;
  steps: number;
  missingSkills: string[];
  updatedAt: string;
}

export interface AiRoadmapView extends AiRoadmapSummary {
  knownSkills: string[];
  roadmap: RoadmapResponse;
  /** Ticked topics, as `topicKey(step, topic)`. */
  topicsDone: string[];
  /** skillKeys of the student's verified skills (a verified step counts as complete). */
  verifiedSkills: string[];
}

/** skillKeys of a student's verified skills. */
export async function verifiedSkillKeys(db: Db, userId: ObjectId): Promise<string[]> {
  const profile = await db.collection("studentProfiles").findOne({ userId }, { projection: { skills: 1 } });
  return parseProfileSkills(profile?.skills).filter((s) => s.verified).map((s) => skillKey(s.name));
}

function summaryFromDoc(d: Document): AiRoadmapSummary {
  const roadmap = sanitizeRoadmap(d.roadmap);
  return {
    id: d._id.toString(),
    skill: str(d.skill),
    totalWeeks: roadmap.total_weeks,
    steps: roadmap.steps.length,
    missingSkills: strArr(d.missingSkills),
    updatedAt: iso(d.updatedAt),
  };
}

export async function listAiRoadmaps(userId: string): Promise<AiRoadmapSummary[]> {
  if (!ObjectId.isValid(userId)) return [];
  try {
    const db = await getDb();
    const rows = await db.collection("aiRoadmaps").find({ studentId: new ObjectId(userId) }).sort({ updatedAt: -1 }).limit(50).toArray();
    return rows.map(summaryFromDoc);
  } catch (err) {
    console.error("[ai] listAiRoadmaps failed:", err);
    return [];
  }
}

export async function getAiRoadmap(userId: string, id: string): Promise<AiRoadmapView | null> {
  if (!ObjectId.isValid(userId) || !ObjectId.isValid(id)) return null;
  try {
    const db = await getDb();
    const studentId = new ObjectId(userId);
    const [d, verifiedSkills] = await Promise.all([
      db.collection("aiRoadmaps").findOne({ _id: new ObjectId(id), studentId }),
      verifiedSkillKeys(db, studentId),
    ]);
    if (!d) return null;
    return {
      ...summaryFromDoc(d),
      knownSkills: strArr(d.knownSkills),
      roadmap: sanitizeRoadmap(d.roadmap),
      topicsDone: strArr(d.topicsDone, 1_000, 300),
      verifiedSkills,
    };
  } catch (err) {
    console.error("[ai] getAiRoadmap failed:", err);
    return null;
  }
}

/**
 * Ticks / unticks one topic of the student's own roadmap. The topic must
 * exist in the stored syllabus, so the list can't fill up with junk keys.
 */
export async function setTopicDone(
  userId: string,
  id: string,
  input: { step: string; topic: string; done: boolean },
): Promise<{ ok: true; topicsDone: string[] } | { ok: false; status: number; error: string }> {
  if (!ObjectId.isValid(userId) || !ObjectId.isValid(id)) return { ok: false, status: 404, error: "Roadmap not found." };
  try {
    const db = await getDb();
    const filter = { _id: new ObjectId(id), studentId: new ObjectId(userId) };
    const d = await db.collection("aiRoadmaps").findOne(filter, { projection: { roadmap: 1, skill: 1, missingSkills: 1 } });
    if (!d) return { ok: false, status: 404, error: "Roadmap not found." };

    const step = sanitizeRoadmap(d.roadmap).steps.find((s) => skillKey(s.skill) === skillKey(input.step));
    const topic = step?.topics.find((t) => skillKey(t.name) === skillKey(input.topic));
    if (!step || !topic) return { ok: false, status: 400, error: "That topic is not part of this roadmap." };

    const key = topicKey(step.skill, topic.name);
    // Typed so the driver accepts $pull on the string array.
    const saved = await db.collection<{ topicsDone?: string[] }>("aiRoadmaps").findOneAndUpdate(
      filter,
      input.done ? { $addToSet: { topicsDone: key } } : { $pull: { topicsDone: key } },
      { returnDocument: "after", projection: { topicsDone: 1 } },
    );
    const topicsDone = strArr(saved?.topicsDone, 1_000, 300);
    // Keep the matching learning path's progress in step.
    await refreshRoadmapPath(db, filter.studentId, { ...d, topicsDone }, await verifiedSkillKeys(db, filter.studentId));
    return { ok: true, topicsDone };
  } catch (err) {
    console.error("[ai] setTopicDone failed:", err);
    return { ok: false, status: 500, error: "Could not save your progress." };
  }
}
