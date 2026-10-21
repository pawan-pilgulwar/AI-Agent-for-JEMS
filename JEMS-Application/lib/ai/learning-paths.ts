import { ObjectId, type Document } from "mongodb";
import { getDatabase } from "@/lib/db/mongodb";
import { ensureAiIndexes } from "./indexes";
import { refreshRoadmapPath, verifiedSkillKeys } from "./roadmap";

/**
 * Brings the student's roadmap-backed `learningPaths` rows up to date before
 * Learning Paths reads them: creates the row for any roadmap generated before
 * paths existed, and re-derives progress, since a skill verified by a test
 * (anywhere in the app) completes that roadmap step.
 */
export async function syncRoadmapPaths(userId: string): Promise<void> {
  if (!ObjectId.isValid(userId)) return;
  try {
    const db = await getDatabase();
    await ensureAiIndexes(db);
    const studentId = new ObjectId(userId);
    const [rows, verified] = await Promise.all([
      db
        .collection("aiRoadmaps")
        .find({ studentId }, { projection: { skill: 1, roadmap: 1, missingSkills: 1, topicsDone: 1 } })
        .limit(50)
        .toArray(),
      verifiedSkillKeys(db, studentId),
    ]);
    await Promise.all(rows.map((d: Document) => refreshRoadmapPath(db, studentId, d, verified)));
  } catch (err) {
    // Learning Paths still renders the stored rows.
    console.error("[ai] syncRoadmapPaths failed:", err);
  }
}
