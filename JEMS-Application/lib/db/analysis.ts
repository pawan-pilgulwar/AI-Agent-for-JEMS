import { ObjectId, type Db, type Document } from "mongodb";
import { getDatabase } from "@/lib/db/mongodb";
import { inferCareerPath, runAnalysisPipeline } from "@/lib/agents/engine";
import type { AnalysisInput, AnalysisResult, CollaborationInput, JobInput, ProgramInput } from "@/lib/agents/types";
import { careerPathForTargetRole, careerTitle, isCareerPath } from "@/lib/roadmap/data";

/**
 * Feeds the agent engine. Builds the `AnalysisInput` snapshot for one student
 * (their profile + goals + roadmap progress, and the whole market: openings,
 * industry programs, collaborations), runs the pipeline, and persists the
 * latest result in `studentAnalyses` so the dashboard can show it again.
 */

async function getDb(): Promise<Db> {
  return getDatabase();
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const strArr = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => str(x)).filter(Boolean) : []);

export function jobFromDoc(d: Document): JobInput {
  return {
    id: d._id.toString(),
    role: str(d.role) || str(d.title),
    company: str(d.company),
    type: str(d.type) || "Full-time",
    location: str(d.location),
    salary: str(d.salary) || undefined,
    experience: str(d.experience) || undefined,
    requiredSkills: strArr(d.requiredSkills),
    niceToHave: strArr(d.niceToHave),
  };
}

export function programFromDoc(d: Document): ProgramInput {
  return {
    id: d._id.toString(),
    company: str(d.company),
    title: str(d.title),
    type: str(d.type),
    skills: strArr(d.skills),
    duration: str(d.duration),
    mode: str(d.mode),
  };
}

export function collaborationFromDoc(d: Document): CollaborationInput {
  return {
    id: d._id.toString(),
    company: str(d.company),
    title: str(d.title),
    type: str(d.type),
    domain: strArr(d.domain),
    startsAt: d.startsAt instanceof Date ? d.startsAt.toISOString() : str(d.startsAt),
  };
}

/** The market half of the snapshot — shared by every student's run. */
export async function loadMarket(db: Db) {
  const [jobs, programs, collaborations] = await Promise.all([
    db.collection("jobPostings").find({ status: { $ne: "closed" } }).sort({ postedAt: -1 }).limit(60).toArray(),
    db.collection("industryPrograms").find({}).sort({ startsAt: 1 }).limit(60).toArray(),
    db.collection("collaborations").find({}).sort({ startsAt: 1 }).limit(60).toArray(),
  ]);
  return {
    jobs: jobs.map(jobFromDoc),
    programs: programs.map(programFromDoc),
    collaborations: collaborations.map(collaborationFromDoc),
  };
}

/** The student half of the snapshot. Null when the user doesn't exist. */
export async function loadStudentInput(db: Db, userId: ObjectId): Promise<AnalysisInput["student"] | null> {
  const [user, profile] = await Promise.all([
    db.collection("users").findOne({ _id: userId }),
    db.collection("studentProfiles").findOne({ userId }),
  ]);
  if (!user) return null;
  const p = (profile ?? {}) as Record<string, unknown>;
  const goals = (p.goals ?? {}) as Record<string, unknown>;

  const targetRole = str(goals.careerTitle) || str(p.targetRole) || "Full Stack Developer";
  const careerPath = isCareerPath(str(goals.careerPath))
    ? str(goals.careerPath)
    : (careerPathForTargetRole(targetRole) ?? inferCareerPath(targetRole));

  const progress = await db.collection("roadmapProgress").findOne({ studentId: userId, careerPath });
  const passedModules = Array.isArray(progress?.passedModules) ? progress.passedModules.map(Number) : [];

  const skills = Array.isArray(p.skills)
    ? p.skills
        .map((s: unknown) => {
          const o = (s ?? {}) as Record<string, unknown>;
          return { name: str(o.name), level: Number(o.level) || 0, verified: Boolean(o.verified) };
        })
        .filter((s) => s.name)
    : [];

  return {
    name: str(user.name) || str(user.email),
    targetRole: careerPath && !str(goals.careerTitle) ? careerTitle(careerPath) : targetRole,
    careerPath,
    targetCompany: str(goals.targetCompany),
    experienceLevel: str(p.experienceLevel),
    skills,
    passedModules,
  };
}

/** Runs the full pipeline for a student and stores the result. */
export async function runStudentAnalysis(userId: string): Promise<AnalysisResult | null> {
  if (!ObjectId.isValid(userId)) return null;
  try {
    const db = await getDb();
    const _id = new ObjectId(userId);
    const [student, market] = await Promise.all([loadStudentInput(db, _id), loadMarket(db)]);
    if (!student) return null;

    const result = runAnalysisPipeline({ student, ...market });
    await db.collection("studentAnalyses").updateOne(
      { studentId: _id },
      { $set: { studentId: _id, result, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true },
    );
    return result;
  } catch (err) {
    console.error("[analysis] runStudentAnalysis failed:", err);
    return null;
  }
}

/** The most recent stored result, or null if the student never ran one. */
export async function getLatestAnalysis(userId: string): Promise<AnalysisResult | null> {
  if (!ObjectId.isValid(userId)) return null;
  try {
    const db = await getDb();
    const doc = await db.collection("studentAnalyses").findOne({ studentId: new ObjectId(userId) });
    return (doc?.result as AnalysisResult | undefined) ?? null;
  } catch (err) {
    console.error("[analysis] getLatestAnalysis failed:", err);
    return null;
  }
}

/** What the analysis screen shows before a run: the inputs the agents will use. */
export async function getAnalysisInputs(userId: string): Promise<AnalysisInput | null> {
  if (!ObjectId.isValid(userId)) return null;
  try {
    const db = await getDb();
    const _id = new ObjectId(userId);
    const [student, market] = await Promise.all([loadStudentInput(db, _id), loadMarket(db)]);
    if (!student) return null;
    return { student, ...market };
  } catch (err) {
    console.error("[analysis] getAnalysisInputs failed:", err);
    return null;
  }
}
