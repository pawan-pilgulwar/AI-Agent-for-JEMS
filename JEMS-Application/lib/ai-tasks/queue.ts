import { after } from "next/server";
import { MongoServerError, ObjectId, type Db, type Document } from "mongodb";
import { getDatabase } from "@/lib/db/mongodb";
import { createNotification } from "@/lib/db/notifications";
import { AgentError } from "@/lib/agent/client";
import { ensureAiIndexes } from "@/lib/ai/indexes";
import { TaskInputError, type TaskOutcome } from "./context";
import { HANDLERS } from "./handlers";
import { ACTIVE_STATUSES, AI_TASK_TYPES, TASK_TYPE_LABEL, type AiTaskStatus, type AiTaskType, type AiTaskView } from "./types";

/**
 * Durable background queue for AI work.
 *
 * An Agent call can take up to 300 s, far longer than a user should wait on a
 * request, so every AI action is stored as a task in `aiTasks` and run after
 * the response has been sent (`after()`). The browser polls task status and
 * the user gets a notification when it succeeds or fails.
 *
 *  aiTasks {
 *    userId, role, type, subject, label, input, dedupeKey, link,
 *    status: queued | running | succeeded | failed,
 *    active: true            (only while queued/running — unique per dedupeKey)
 *    attempts, maxAttempts, runAfter, leaseUntil, progress,
 *    summary, error, resultId, createdAt, startedAt, finishedAt, updatedAt
 *  }
 *
 * Safety properties:
 *  - Dedupe: one active task per `dedupeKey` (unique partial index), so
 *    double-clicks don't start the same expensive Agent run twice.
 *  - Claiming is atomic (findOneAndUpdate on `status: "queued"`), so a task
 *    runs once even if several processes / sweeps try to start it.
 *  - A running task holds a short lease renewed by a heartbeat. If the server
 *    dies mid-task the lease expires and `sweepAndKick()` re-queues it (or
 *    fails it after `maxAttempts`), so nothing stays "running" forever.
 *  - Transient Agent failures (network, timeout, 5xx) retry with back-off;
 *    permanent ones fail immediately with a readable message.
 */

const LEASE_MS = 90_000;
const HEARTBEAT_MS = 30_000;
/** Hard cap on one attempt; a task may make several Agent calls of ≤300 s each. */
const TASK_DEADLINE_MS = 15 * 60_000;
const RETRY_DELAY_MS = 30_000;
const DEFAULT_MAX_ATTEMPTS = 2;
const MAX_ACTIVE_PER_USER = 5;
const SWEEP_EVERY_MS = 10_000;
/** Tasks one kick may drain back-to-back before handing the slot back. */
const DRAIN_LIMIT = 10;

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const iso = (v: unknown): string | null => (v instanceof Date ? v.toISOString() : null);

async function getDb(): Promise<Db> {
  const db = await getDatabase();
  await ensureAiIndexes(db);
  return db;
}

/** Per-process runtime state (survives dev hot reloads via globalThis). */
function runtime(): { running: number; lastSweep: number } {
  const g = globalThis as unknown as { __aiTaskRuntime?: { running: number; lastSweep: number } };
  g.__aiTaskRuntime ??= { running: 0, lastSweep: 0 };
  return g.__aiTaskRuntime;
}

function concurrency(): number {
  const n = Number(process.env.AI_TASK_CONCURRENCY);
  return Number.isInteger(n) && n > 0 ? Math.min(n, 20) : 3;
}

export function toTaskView(d: Document): AiTaskView {
  const type = (AI_TASK_TYPES as readonly string[]).includes(d.type) ? (d.type as AiTaskType) : "student.roadmap";
  const status = (["queued", "running", "succeeded", "failed"] as const).includes(d.status) ? (d.status as AiTaskStatus) : "queued";
  return {
    id: d._id.toString(),
    type,
    label: str(d.label) || TASK_TYPE_LABEL[type],
    subject: str(d.subject),
    status,
    progress: str(d.progress),
    summary: str(d.summary),
    error: str(d.error),
    link: str(d.link) || null,
    resultId: str(d.resultId) || null,
    attempts: Number(d.attempts) || 0,
    createdAt: iso(d.createdAt) ?? "",
    startedAt: iso(d.startedAt),
    finishedAt: iso(d.finishedAt),
  };
}

// ── Enqueue ─────────────────────────────────────────────────────

export interface EnqueueArgs {
  userId: string;
  role: string;
  type: AiTaskType;
  /** What the task is about — shown in the UI and used to find the task again. */
  subject: string;
  /** Unique key for "the same piece of work"; scoped by the caller (usually per user). */
  dedupeKey: string;
  input: Record<string, unknown>;
  label?: string;
  link?: string | null;
  maxAttempts?: number;
  /** System tasks (prerequisite warm-up): hidden from the user, never notify, no cap. */
  system?: boolean;
  /** Skip the per-user active-task cap (e.g. grading an already-submitted attempt). */
  skipCap?: boolean;
}

export type EnqueueResult =
  | { ok: true; task: AiTaskView; created: boolean }
  | { ok: false; error: string; status: number };

/**
 * Stores a task and schedules it to run after the current response. If the
 * same work is already queued or running, returns that task instead.
 * Must be called from a Route Handler / Server Function (uses `after()`).
 */
export async function enqueueTask(args: EnqueueArgs): Promise<EnqueueResult> {
  if (!ObjectId.isValid(args.userId)) return { ok: false, error: "Not signed in.", status: 401 };
  try {
    const db = await getDb();
    const col = db.collection("aiTasks");
    const userId = new ObjectId(args.userId);

    const existing = await col.findOne({ dedupeKey: args.dedupeKey, active: true });
    if (existing) return { ok: true, task: toTaskView(existing), created: false };

    if (!args.system && !args.skipCap) {
      const active = await col.countDocuments({ userId, active: true, system: { $ne: true } });
      if (active >= MAX_ACTIVE_PER_USER) {
        return { ok: false, error: `You already have ${active} AI tasks in progress. Please wait for one to finish.`, status: 429 };
      }
    }

    const now = new Date();
    const doc = {
      userId,
      role: args.role,
      type: args.type,
      subject: args.subject.slice(0, 200),
      label: args.label ?? TASK_TYPE_LABEL[args.type],
      input: args.input,
      dedupeKey: args.dedupeKey,
      link: args.link ?? null,
      status: "queued" as AiTaskStatus,
      active: true,
      system: Boolean(args.system),
      attempts: 0,
      maxAttempts: args.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
      runAfter: now,
      leaseUntil: null,
      progress: "Queued",
      summary: "",
      error: "",
      resultId: null,
      createdAt: now,
      updatedAt: now,
    };

    let id: ObjectId;
    try {
      id = (await col.insertOne(doc)).insertedId;
    } catch (err) {
      // Lost a race with an identical enqueue — hand back the winner.
      if (err instanceof MongoServerError && err.code === 11000) {
        const winner = await col.findOne({ dedupeKey: args.dedupeKey, active: true });
        if (winner) return { ok: true, task: toTaskView(winner), created: false };
      }
      throw err;
    }

    kickTask(id);
    return { ok: true, task: toTaskView({ ...doc, _id: id }), created: true };
  } catch (err) {
    console.error("[ai-tasks] enqueueTask failed:", err);
    return { ok: false, error: "Could not start the AI task.", status: 500 };
  }
}

// ── Running ─────────────────────────────────────────────────────

/** Runs the task after the current response; falls back to fire-and-forget outside a request. */
export function kickTask(id: ObjectId): void {
  const run = () => runTask(id).catch((err) => console.error("[ai-tasks] runner crashed:", err));
  try {
    after(run);
  } catch {
    void run();
  }
}

async function runTask(first: ObjectId): Promise<void> {
  const rt = runtime();
  // At capacity: the task stays queued and the running drain (or the next
  // sweep) picks it up as soon as a slot frees.
  if (rt.running >= concurrency()) return;
  rt.running++;
  try {
    let next: ObjectId | null = first;
    for (let i = 0; next && i < DRAIN_LIMIT; i++) {
      await executeTask(next);
      next = await nextRunnableId();
    }
  } finally {
    rt.running--;
  }
}

async function nextRunnableId(): Promise<ObjectId | null> {
  const db = await getDb();
  const doc = await db
    .collection("aiTasks")
    .findOne({ status: "queued", runAfter: { $lte: new Date() } }, { sort: { createdAt: 1 }, projection: { _id: 1 } });
  return doc?._id ?? null;
}

/** Turns any thrown value into the message the user sees. */
function userMessage(err: unknown, deadlineHit: boolean): string {
  if (deadlineHit) return `The AI task did not finish within ${TASK_DEADLINE_MS / 60_000} minutes.`;
  if (err instanceof AgentError || err instanceof TaskInputError) return err.message;
  return "Something went wrong while running the AI task.";
}

async function executeTask(id: ObjectId): Promise<void> {
  const db = await getDb();
  const col = db.collection("aiTasks");
  const now = new Date();

  const task = await col.findOneAndUpdate(
    { _id: id, status: "queued", runAfter: { $lte: now } },
    {
      $set: { status: "running", startedAt: now, updatedAt: now, leaseUntil: new Date(now.getTime() + LEASE_MS), progress: "Starting…" },
      $inc: { attempts: 1 },
    },
    { returnDocument: "after" },
  );
  if (!task) return; // someone else claimed it, or it is waiting for a retry

  // Fence every later write on (status, attempts) so a recovered-and-restarted
  // copy of this task can't be overwritten by a stale runner.
  const mine = { _id: id, status: "running", attempts: task.attempts };
  const renew = () => ({ leaseUntil: new Date(Date.now() + LEASE_MS), updatedAt: new Date() });

  const heartbeat = setInterval(() => {
    col.updateOne(mine, { $set: renew() }).catch(() => {});
  }, HEARTBEAT_MS);
  const deadline = new AbortController();
  const deadlineTimer = setTimeout(() => deadline.abort(new Error("deadline")), TASK_DEADLINE_MS);

  const type = task.type as AiTaskType;
  const userId = task.userId as ObjectId;

  try {
    const handler = HANDLERS[type];
    if (!handler) throw new TaskInputError(`Unknown AI task type "${type}".`);

    const outcome: TaskOutcome = await handler({
      taskId: id,
      userId,
      role: str(task.role),
      input: (task.input ?? {}) as Record<string, unknown>,
      signal: deadline.signal,
      progress: async (message) => {
        await col.updateOne(mine, { $set: { progress: message.slice(0, 200), ...renew() } });
      },
    });

    const link = outcome.link ?? (str(task.link) || null);
    const res = await col.updateOne(mine, {
      $set: {
        status: "succeeded",
        progress: "Done",
        summary: outcome.summary.slice(0, 300),
        resultId: outcome.resultId ?? null,
        link,
        error: "",
        finishedAt: new Date(),
        updatedAt: new Date(),
      },
      $unset: { active: "", leaseUntil: "" },
    });
    if (res.modifiedCount && outcome.notify !== false && !task.system) {
      await createNotification({ userId, kind: "ai-success", title: outcome.title, body: outcome.summary, link, taskId: id });
    }
  } catch (err) {
    const deadlineHit = deadline.signal.aborted;
    const message = userMessage(err, deadlineHit);
    const retriable = !deadlineHit && err instanceof AgentError && err.transient && task.attempts < (Number(task.maxAttempts) || 1);
    if (!(err instanceof AgentError) && !(err instanceof TaskInputError)) console.error(`[ai-tasks] ${type} ${id} failed:`, err);

    if (retriable) {
      const wait = RETRY_DELAY_MS * task.attempts;
      await col.updateOne(mine, {
        $set: { status: "queued", runAfter: new Date(Date.now() + wait), progress: `Retrying in ${Math.round(wait / 1000)} s — ${message}`, error: message, updatedAt: new Date() },
        $unset: { leaseUntil: "" },
      });
    } else {
      await failTask(col, mine, task, message);
    }
  } finally {
    clearInterval(heartbeat);
    clearTimeout(deadlineTimer);
  }
}

async function failTask(col: ReturnType<Db["collection"]>, filter: Document, task: Document, message: string) {
  const res = await col.updateOne(filter, {
    $set: { status: "failed", progress: "Failed", error: message.slice(0, 500), finishedAt: new Date(), updatedAt: new Date() },
    $unset: { active: "", leaseUntil: "" },
  });
  if (res.modifiedCount && !task.system) {
    const label = str(task.label) || TASK_TYPE_LABEL[task.type as AiTaskType] || "AI task";
    await createNotification({
      userId: task.userId as ObjectId,
      kind: "ai-failure",
      title: `${label} failed`,
      body: message,
      link: str(task.link) || null,
      taskId: task._id as ObjectId,
    });
  }
}

// ── Recovery ────────────────────────────────────────────────────

/**
 * Re-queues tasks whose runner disappeared (expired lease), fails the ones
 * out of attempts, and starts queued tasks that are due. Called from the
 * polling endpoints, throttled per process. Must run inside a request.
 */
export async function sweepAndKick(): Promise<void> {
  const rt = runtime();
  if (Date.now() - rt.lastSweep < SWEEP_EVERY_MS) return;
  rt.lastSweep = Date.now();
  try {
    const db = await getDb();
    const col = db.collection("aiTasks");
    const now = new Date();

    const stale = await col.find({ status: "running", leaseUntil: { $lt: now } }).limit(50).toArray();
    for (const t of stale) {
      const filter = { _id: t._id, status: "running", attempts: t.attempts, leaseUntil: { $lt: now } };
      if ((Number(t.attempts) || 0) < (Number(t.maxAttempts) || 1)) {
        await col.updateOne(filter, {
          $set: { status: "queued", runAfter: now, progress: "Interrupted — retrying", updatedAt: now },
          $unset: { leaseUntil: "" },
        });
      } else {
        await failTask(col, filter, t, "The AI task was interrupted (server restarted) and ran out of retries.");
      }
    }

    const free = Math.max(0, concurrency() - rt.running);
    if (free === 0) return;
    const due = await col
      .find({ status: "queued", runAfter: { $lte: now } }, { projection: { _id: 1 } })
      .sort({ createdAt: 1 })
      .limit(free)
      .toArray();
    for (const d of due) kickTask(d._id);
  } catch (err) {
    console.error("[ai-tasks] sweep failed:", err);
  }
}

// ── Reads ───────────────────────────────────────────────────────

export async function getTaskForUser(userId: string, taskId: string): Promise<AiTaskView | null> {
  if (!ObjectId.isValid(userId) || !ObjectId.isValid(taskId)) return null;
  try {
    const db = await getDb();
    const doc = await db.collection("aiTasks").findOne({ _id: new ObjectId(taskId), userId: new ObjectId(userId) });
    return doc ? toTaskView(doc) : null;
  } catch (err) {
    console.error("[ai-tasks] getTaskForUser failed:", err);
    return null;
  }
}

export async function listTasks(
  userId: string,
  opts: { activeOnly?: boolean; types?: AiTaskType[]; limit?: number } = {},
): Promise<AiTaskView[]> {
  if (!ObjectId.isValid(userId)) return [];
  try {
    const db = await getDb();
    const filter: Record<string, unknown> = { userId: new ObjectId(userId), system: { $ne: true } };
    if (opts.activeOnly) filter.status = { $in: ACTIVE_STATUSES };
    if (opts.types?.length) filter.type = { $in: opts.types };
    const rows = await db
      .collection("aiTasks")
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(opts.limit ?? 20, 100))
      .toArray();
    return rows.map(toTaskView);
  } catch (err) {
    console.error("[ai-tasks] listTasks failed:", err);
    return [];
  }
}
