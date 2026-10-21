import type { ObjectId } from "mongodb";

/**
 * Contract between the task queue and the code that does the work.
 * Kept separate from `queue.ts` so the domain modules in `lib/ai/` can
 * implement handlers without importing the queue itself.
 */

export interface TaskContext {
  taskId: ObjectId;
  userId: ObjectId;
  role: string;
  input: Record<string, unknown>;
  /** Aborted when the task hits its wall-clock deadline. Pass it to Agent calls. */
  signal: AbortSignal;
  /** Records a short human-readable progress line and renews the lease. */
  progress: (message: string) => Promise<void>;
}

export interface TaskOutcome {
  /** Id of the stored result document (so the UI can open it). */
  resultId?: string | null;
  /** One line describing the result, shown on the task and notification. */
  summary: string;
  /** Notification title, e.g. "Your Spring Boot roadmap is ready". */
  title: string;
  /** Page where the user sees the result. */
  link?: string | null;
  /** Set false for system tasks nobody is waiting on (e.g. prereq warm-up). */
  notify?: boolean;
}

export type TaskHandler = (ctx: TaskContext) => Promise<TaskOutcome>;

/**
 * A failure that retrying cannot fix (missing data, invalid input, a paper
 * that no longer exists). The message is shown to the user as-is.
 */
export class TaskInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TaskInputError";
  }
}
