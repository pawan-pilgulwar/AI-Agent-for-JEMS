import { ObjectId, type Db } from "mongodb";
import { getDatabase } from "@/lib/db/mongodb";
import { agent } from "@/lib/agent/client";
import type { MatchResponse } from "@/lib/agent/types";
import { scoreAgainst } from "@/lib/agents/engine";
import { TaskInputError, type TaskHandler } from "@/lib/ai-tasks/context";
import { parseProfileSkills } from "@/lib/db/assessment";
import { ensureAiIndexes } from "./indexes";
import { isRecord, iso, num, str, strArr } from "./util";

/**
 * Candidate match insights for recruiters (API guide flow, step 9). The score
 * is calculated in code (same Matching Agent score the candidate list shows);
 * `/agents/match` only explains it.
 *
 *  matchExplanations { jobId, studentId, companyUserId, score, strengths[], gaps[], recommendation, createdAt, updatedAt }
 *
 * One document per (opening, student): asking again updates it.
 */

async function getDb(): Promise<Db> {
  const db = await getDatabase();
  await ensureAiIndexes(db);
  return db;
}

/** `match.explain` task. Input: `{ jobId, studentId }`; runs as the company user. */
export const matchHandler: TaskHandler = async (ctx) => {
  const jobId = str(ctx.input.jobId, 24);
  const studentId = str(ctx.input.studentId, 24);
  if (!ObjectId.isValid(jobId) || !ObjectId.isValid(studentId)) throw new TaskInputError("Invalid opening or candidate.");
  const db = await getDb();

  const job = await db.collection("jobPostings").findOne({ _id: new ObjectId(jobId), companyId: ctx.userId });
  if (!job) throw new TaskInputError("That opening no longer exists.");
  const sid = new ObjectId(studentId);
  const [user, profile, company] = await Promise.all([
    db.collection("users").findOne({ _id: sid, role: "student" }, { projection: { name: 1, email: 1 } }),
    db.collection("studentProfiles").findOne({ userId: sid }),
    db.collection("companyProfiles").findOne({ userId: ctx.userId }),
  ]);
  if (!user) throw new TaskInputError("That candidate no longer exists.");

  const skills = parseProfileSkills(profile?.skills);
  const required = strArr(job.requiredSkills);
  const { score } = scoreAgainst(skills, required, strArr(job.niceToHave));
  const name = str(profile?.displayName) || str(user.name) || "The candidate";

  await ctx.progress(`Explaining ${name}'s ${score}% match…`);
  const res: MatchResponse = await agent.match(
    {
      student: { name, verified_skills: skills.filter((s) => s.verified).map((s) => s.name) },
      company: { name: str(company?.companyName) || str(job.company) || "The company", required_skills: required },
      match_score: score,
    },
    { signal: ctx.signal },
  );

  const explanation = {
    strengths: strArr(res?.strengths, 10, 400),
    gaps: strArr(res?.gaps, 10, 400),
    recommendation: str(res?.recommendation, 1_000),
  };
  const now = new Date();
  await db.collection("matchExplanations").updateOne(
    { jobId: job._id, studentId: sid },
    { $set: { jobId: job._id, studentId: sid, companyUserId: ctx.userId, score, ...explanation, updatedAt: now }, $setOnInsert: { createdAt: now } },
    { upsert: true },
  );

  return {
    resultId: studentId,
    summary: explanation.recommendation || `${score}% match explained`,
    title: `Match insight for ${name} is ready`,
    link: `/company/candidates?job=${jobId}`,
  };
};

export interface MatchExplanationView {
  studentId: string;
  score: number;
  strengths: string[];
  gaps: string[];
  recommendation: string;
  updatedAt: string;
}

/** All stored insights for one of the company's openings, keyed by studentId. */
export async function getMatchExplanations(companyUserId: string, jobId: string): Promise<Record<string, MatchExplanationView>> {
  if (!ObjectId.isValid(companyUserId) || !ObjectId.isValid(jobId)) return {};
  try {
    const db = await getDb();
    const rows = await db.collection("matchExplanations").find({ jobId: new ObjectId(jobId), companyUserId: new ObjectId(companyUserId) }).toArray();
    const out: Record<string, MatchExplanationView> = {};
    for (const r of rows) {
      if (!isRecord(r)) continue;
      const sid = String(r.studentId);
      out[sid] = { studentId: sid, score: num(r.score), strengths: strArr(r.strengths), gaps: strArr(r.gaps), recommendation: str(r.recommendation), updatedAt: iso(r.updatedAt) };
    }
    return out;
  } catch (err) {
    console.error("[ai] getMatchExplanations failed:", err);
    return {};
  }
}
