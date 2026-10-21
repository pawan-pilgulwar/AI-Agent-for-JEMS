import { ObjectId, type Db } from "mongodb";
import { getDatabase } from "@/lib/db/mongodb";
import { careerPathForTargetRole, careerTitle, isCareerPath } from "@/lib/roadmap/data";
import type { Slide } from "@/lib/roadmap/lesson";

/**
 * Per-student roadmap persistence. Mirrors the conventions in
 * `lib/db/student-data.ts`: every loader is scoped to one `userId`, wrapped in
 * `safe()` so a DB hiccup degrades to an empty state instead of a crash, and
 * every value written is coerced to a primitive first.
 *
 * Collections:
 *  - `studentProfiles.goals`  — the career the student committed to
 *  - `roadmapProgress`        — { studentId, careerPath, passedModules[], lessonsWatched{} }
 *  - `lessonVideos`           — cache of generated lesson slides, keyed by cacheKey
 */

async function getDb(): Promise<Db> {
  return getDatabase();
}

async function safe<T>(label: string, fallback: T, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[roadmap] ${label} failed:`, err);
    return fallback;
  }
}

const oid = (id: string) => new ObjectId(id);
const str = (v: unknown): string => (typeof v === "string" ? v : "");

// ── Goals ───────────────────────────────────────────────────────

export interface StudentGoals {
  careerPath: string;
  careerTitle: string;
  targetPackage: string;
  targetCompany: string;
  setAt: string;
}

function parseGoals(raw: unknown): StudentGoals | null {
  if (typeof raw !== "object" || raw === null) return null;
  const g = raw as Record<string, unknown>;
  const careerPath = str(g.careerPath);
  if (!isCareerPath(careerPath)) return null;
  const setAt = g.setAt instanceof Date ? g.setAt.toISOString() : str(g.setAt);
  return {
    careerPath,
    careerTitle: str(g.careerTitle) || careerTitle(careerPath),
    targetPackage: str(g.targetPackage),
    targetCompany: str(g.targetCompany),
    setAt,
  };
}

export interface GoalsInput {
  careerPath: string;
  targetPackage: string;
  targetCompany: string;
}

/** Persists the student's chosen career path + targets on their profile. */
export async function saveStudentGoals(userId: string, input: GoalsInput): Promise<boolean> {
  if (!ObjectId.isValid(userId) || !isCareerPath(input.careerPath)) return false;
  return safe("saveStudentGoals", false, async () => {
    const db = await getDb();
    const _id = oid(userId);
    const now = new Date();
    const goals = {
      careerPath: String(input.careerPath),
      careerTitle: careerTitle(input.careerPath),
      targetPackage: String(input.targetPackage ?? "").trim(),
      targetCompany: String(input.targetCompany ?? "").trim(),
      setAt: now,
    };
    await db.collection("studentProfiles").updateOne(
      { userId: _id },
      { $set: { goals, updatedAt: now }, $setOnInsert: { userId: _id, createdAt: now } },
      { upsert: true },
    );
    return true;
  });
}

// ── Progress ────────────────────────────────────────────────────

export interface RoadmapProgress {
  passedModules: number[];
  /** moduleId → indexes of lessons the student has watched. */
  lessonsWatched: Record<string, number[]>;
}

const EMPTY_PROGRESS: RoadmapProgress = { passedModules: [], lessonsWatched: {} };

function parseProgress(raw: unknown): RoadmapProgress {
  if (typeof raw !== "object" || raw === null) return EMPTY_PROGRESS;
  const r = raw as Record<string, unknown>;
  const passedModules = Array.isArray(r.passedModules)
    ? r.passedModules.map(Number).filter((n) => Number.isInteger(n) && n > 0)
    : [];
  const lessonsWatched: Record<string, number[]> = {};
  if (typeof r.lessonsWatched === "object" && r.lessonsWatched !== null) {
    for (const [k, v] of Object.entries(r.lessonsWatched as Record<string, unknown>)) {
      if (Array.isArray(v)) {
        lessonsWatched[k] = v.map(Number).filter((n) => Number.isInteger(n) && n >= 0);
      }
    }
  }
  return { passedModules, lessonsWatched };
}

/**
 * Everything the roadmap screens need for one student: their goals (or a
 * suggested path derived from the signup `targetRole` when they haven't set
 * any yet), and their progress on the active career path.
 */
export interface RoadmapState {
  goals: StudentGoals | null;
  /** Roadmap id inferred from signup answers — used to pre-select the picker. */
  suggestedPath: string | null;
  progress: RoadmapProgress;
  skills: string[];
}

export async function getRoadmapState(userId: string): Promise<RoadmapState> {
  const empty: RoadmapState = { goals: null, suggestedPath: null, progress: EMPTY_PROGRESS, skills: [] };
  if (!ObjectId.isValid(userId)) return empty;
  return safe("getRoadmapState", empty, async () => {
    const db = await getDb();
    const _id = oid(userId);
    const profile = ((await db.collection("studentProfiles").findOne({ userId: _id })) ??
      {}) as Record<string, unknown>;

    const goals = parseGoals(profile.goals);
    const suggestedPath = careerPathForTargetRole(str(profile.targetRole));
    const skills = Array.isArray(profile.skills)
      ? profile.skills
          .map((s: unknown) => str((s as { name?: unknown })?.name))
          .filter(Boolean)
      : [];

    if (!goals) return { goals: null, suggestedPath, progress: EMPTY_PROGRESS, skills };

    const doc = await db
      .collection("roadmapProgress")
      .findOne({ studentId: _id, careerPath: goals.careerPath });
    return { goals, suggestedPath, progress: parseProgress(doc), skills };
  });
}

/** Records that the student watched lesson `lessonIndex` of `moduleId`. */
export async function markLessonWatched(
  userId: string,
  careerPath: string,
  moduleId: number,
  lessonIndex: number,
): Promise<boolean> {
  if (!ObjectId.isValid(userId) || !isCareerPath(careerPath)) return false;
  return safe("markLessonWatched", false, async () => {
    const db = await getDb();
    const _id = oid(userId);
    const now = new Date();
    await db.collection("roadmapProgress").updateOne(
      { studentId: _id, careerPath: String(careerPath) },
      {
        $addToSet: { [`lessonsWatched.${Number(moduleId)}`]: Number(lessonIndex) },
        $set: { updatedAt: now },
        $setOnInsert: { studentId: _id, careerPath: String(careerPath), createdAt: now, passedModules: [] },
      },
      { upsert: true },
    );
    return true;
  });
}

/**
 * Marks a module as passed and credits its skills to the student's profile
 * (case-insensitive merge into `studentProfiles.skills`, which the Progress
 * and Dashboard screens already read). Returns the skills newly added.
 */
export async function recordModulePass(
  userId: string,
  careerPath: string,
  moduleId: number,
  moduleSkills: string[],
): Promise<{ ok: boolean; gainedSkills: string[] }> {
  const fail = { ok: false, gainedSkills: [] as string[] };
  if (!ObjectId.isValid(userId) || !isCareerPath(careerPath)) return fail;
  return safe("recordModulePass", fail, async () => {
    const db = await getDb();
    const _id = oid(userId);
    const now = new Date();

    await db.collection("roadmapProgress").updateOne(
      { studentId: _id, careerPath: String(careerPath) },
      {
        $addToSet: { passedModules: Number(moduleId) },
        $set: { updatedAt: now },
        $setOnInsert: { studentId: _id, careerPath: String(careerPath), createdAt: now },
      },
      { upsert: true },
    );

    const profile = ((await db.collection("studentProfiles").findOne({ userId: _id })) ??
      {}) as Record<string, unknown>;
    const existing: { name: string; level: number; verified: boolean }[] = Array.isArray(profile.skills)
      ? profile.skills
          .map((s: unknown) => {
            const o = s as { name?: unknown; level?: unknown; verified?: unknown };
            return { name: str(o.name), level: Number(o.level) || 0, verified: Boolean(o.verified) };
          })
          .filter((s) => s.name)
      : [];
    const credited = new Set(moduleSkills.map((s) => String(s).trim().toLowerCase()).filter(Boolean));
    const owned = new Set(existing.map((s) => s.name.toLowerCase()));
    const gainedSkills = moduleSkills
      .map((s) => String(s).trim())
      .filter((s) => s && !owned.has(s.toLowerCase()));

    // New skills are added as verified; skills the student had already
    // self-reported become verified (and at least level 60) now that a quiz
    // graded on the server confirms them.
    const merged = [
      ...existing.map((s) =>
        credited.has(s.name.toLowerCase()) ? { ...s, verified: true, level: Math.max(s.level, 60), source: "roadmap", verifiedAt: now } : s,
      ),
      ...gainedSkills.map((name) => ({ name, level: 60, verified: true, source: "roadmap", verifiedAt: now })),
    ];
    await db.collection("studentProfiles").updateOne(
      { userId: _id },
      { $set: { skills: merged, updatedAt: now }, $setOnInsert: { userId: _id, createdAt: now } },
      { upsert: true },
    );
    return { ok: true, gainedSkills };
  });
}

// ── Lesson cache ────────────────────────────────────────────────

export interface CachedLesson {
  slides: Slide[];
  aiGenerated: boolean;
}

export async function getCachedLesson(cacheKey: string): Promise<CachedLesson | null> {
  return safe("getCachedLesson", null, async () => {
    const db = await getDb();
    const doc = await db.collection("lessonVideos").findOne({ cacheKey: String(cacheKey) });
    if (!doc || !Array.isArray(doc.slides) || doc.slides.length === 0) return null;
    return { slides: doc.slides as Slide[], aiGenerated: Boolean(doc.aiGenerated) };
  });
}

export async function cacheLesson(
  cacheKey: string,
  meta: { careerPath: string; moduleId: number; lessonTitle: string },
  lesson: CachedLesson,
): Promise<void> {
  await safe("cacheLesson", undefined, async () => {
    const db = await getDb();
    const now = new Date();
    await db.collection("lessonVideos").updateOne(
      { cacheKey: String(cacheKey) },
      {
        $set: {
          cacheKey: String(cacheKey),
          careerPath: String(meta.careerPath),
          moduleId: Number(meta.moduleId),
          lessonTitle: String(meta.lessonTitle),
          slides: lesson.slides,
          aiGenerated: lesson.aiGenerated,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );
  });
}
