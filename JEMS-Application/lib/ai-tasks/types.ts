/**
 * Background AI task shapes — client-safe (no DB or server imports), shared
 * by the queue, the API routes and the UI that polls task status.
 */

export const AI_TASK_TYPES = [
  "skill.prereqs",
  "student.roadmap",
  "student.profile",
  "assessment.generate",
  "assessment.grade",
  "match.explain",
] as const;
export type AiTaskType = (typeof AI_TASK_TYPES)[number];

export type AiTaskStatus = "queued" | "running" | "succeeded" | "failed";

export const ACTIVE_STATUSES: AiTaskStatus[] = ["queued", "running"];

/** What the browser sees about a task. Inputs and raw results stay on the server. */
export interface AiTaskView {
  id: string;
  type: AiTaskType;
  label: string;
  /** What the task is about (a skill name, "jobId:studentId", …) — lets a page find its task. */
  subject: string;
  status: AiTaskStatus;
  /** Last progress message written by the handler ("Generating questions…"). */
  progress: string;
  summary: string;
  error: string;
  /** Where to see the result (or retry) in the app. */
  link: string | null;
  /** Id of the stored result document (roadmap, paper, …) once succeeded. */
  resultId: string | null;
  attempts: number;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

export const TASK_TYPE_LABEL: Record<AiTaskType, string> = {
  "skill.prereqs": "Prerequisite tree",
  "student.roadmap": "AI learning roadmap",
  "student.profile": "Coding profile analysis",
  "assessment.generate": "AI test generation",
  "assessment.grade": "AI test grading",
  "match.explain": "Candidate match insight",
};

export const isActive = (s: AiTaskStatus) => s === "queued" || s === "running";
