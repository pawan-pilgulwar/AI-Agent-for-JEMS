import type { Db } from "mongodb";

/**
 * Indexes the AI layer relies on for correctness (one active task per dedupe
 * key, one stored result per upsert key). `scripts/setupDatabase.js` creates
 * the same set; this runs once per server process as a safety net so an
 * existing database picks them up without a manual re-run. createIndex is
 * idempotent, so racing processes are harmless.
 */

const DAY = 86_400;

let ensured: Promise<void> | null = null;

export function ensureAiIndexes(db: Db): Promise<void> {
  if (!ensured) {
    ensured = Promise.all([
      db.collection("aiTasks").createIndex({ dedupeKey: 1 }, { unique: true, partialFilterExpression: { active: true }, name: "active_dedupe" }),
      db.collection("aiTasks").createIndex({ userId: 1, createdAt: -1 }),
      db.collection("aiTasks").createIndex({ status: 1, runAfter: 1 }),
      db.collection("aiTasks").createIndex({ status: 1, leaseUntil: 1 }),
      db.collection("aiTasks").createIndex({ finishedAt: 1 }, { expireAfterSeconds: 30 * DAY }),
      db.collection("skillPrereqs").createIndex({ skillKey: 1 }, { unique: true }),
      db.collection("aiRoadmaps").createIndex({ studentId: 1, skillKey: 1 }, { unique: true }),
      // One learning path per AI roadmap (other learningPaths rows have no roadmapId).
      db.collection("learningPaths").createIndex({ studentId: 1, roadmapId: 1 }, { unique: true, partialFilterExpression: { roadmapId: { $exists: true } }, name: "roadmap_path" }),
      db.collection("aiProfileAnalyses").createIndex({ studentId: 1 }, { unique: true }),
      db.collection("aiPapers").createIndex({ studentId: 1, purpose: 1, subjectKey: 1 }, { unique: true }),
      db.collection("matchExplanations").createIndex({ jobId: 1, studentId: 1 }, { unique: true }),
      db.collection("mockInterviews").createIndex({ paperId: 1 }, { unique: true, partialFilterExpression: { paperId: { $exists: true } } }),
      db.collection("notifications").createIndex({ userId: 1, read: 1, createdAt: -1 }),
    ])
      .then(() => undefined)
      .catch((err) => {
        // Don't block requests on index trouble (e.g. conflicting legacy index);
        // allow a retry on the next call.
        console.error("[ai] ensureAiIndexes failed:", err);
        ensured = null;
      });
  }
  return ensured;
}
