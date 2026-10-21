import { ObjectId, type Db } from "mongodb";
import { getDatabase } from "@/lib/db/mongodb";

/**
 * In-app notifications (the bell in the student and portal top bars).
 *
 *  notifications { userId, kind, title, body, link, taskId?, read, createdAt }
 *
 * Written by the AI task runner when a background task finishes or fails,
 * and by a few platform events (e.g. a new applicant for a company).
 */

export type NotificationKind = "ai-success" | "ai-failure" | "application" | "info";

export interface NotificationView {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  link: string | null;
  taskId: string | null;
  read: boolean;
  createdAt: string;
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const KINDS: NotificationKind[] = ["ai-success", "ai-failure", "application", "info"];

async function getDb(): Promise<Db> {
  return getDatabase();
}

export async function createNotification(input: {
  userId: string | ObjectId;
  kind: NotificationKind;
  title: string;
  body?: string;
  link?: string | null;
  taskId?: ObjectId | null;
}): Promise<void> {
  const userId = typeof input.userId === "string" ? input.userId : input.userId.toString();
  if (!ObjectId.isValid(userId)) return;
  try {
    const db = await getDb();
    await db.collection("notifications").insertOne({
      userId: new ObjectId(userId),
      kind: input.kind,
      title: String(input.title).slice(0, 160),
      body: String(input.body ?? "").slice(0, 600),
      link: input.link ? String(input.link) : null,
      taskId: input.taskId ?? null,
      read: false,
      createdAt: new Date(),
    });
  } catch (err) {
    // A failed notification must never fail the work that triggered it.
    console.error("[notifications] createNotification failed:", err);
  }
}

export async function listNotifications(
  userId: string,
  limit = 20,
): Promise<{ items: NotificationView[]; unread: number }> {
  if (!ObjectId.isValid(userId)) return { items: [], unread: 0 };
  try {
    const db = await getDb();
    const _id = new ObjectId(userId);
    const [rows, unread] = await Promise.all([
      db.collection("notifications").find({ userId: _id }).sort({ createdAt: -1 }).limit(limit).toArray(),
      db.collection("notifications").countDocuments({ userId: _id, read: false }),
    ]);
    return {
      unread,
      items: rows.map((r) => ({
        id: r._id.toString(),
        kind: KINDS.includes(r.kind) ? (r.kind as NotificationKind) : "info",
        title: str(r.title),
        body: str(r.body),
        link: str(r.link) || null,
        taskId: r.taskId ? String(r.taskId) : null,
        read: Boolean(r.read),
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : "",
      })),
    };
  } catch (err) {
    console.error("[notifications] listNotifications failed:", err);
    return { items: [], unread: 0 };
  }
}

/** Marks the given notifications (or all of them when `ids` is empty) as read. */
export async function markNotificationsRead(userId: string, ids: string[]): Promise<boolean> {
  if (!ObjectId.isValid(userId)) return false;
  try {
    const db = await getDb();
    const filter: Record<string, unknown> = { userId: new ObjectId(userId), read: false };
    const valid = ids.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
    if (ids.length > 0) filter._id = { $in: valid };
    await db.collection("notifications").updateMany(filter, { $set: { read: true, readAt: new Date() } });
    return true;
  } catch (err) {
    console.error("[notifications] markNotificationsRead failed:", err);
    return false;
  }
}
