import { ObjectId, type Db } from "mongodb";
import { getDatabase } from "@/lib/db/mongodb";
import { createNotification } from "@/lib/db/notifications";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

/**
 * Student write actions behind the dashboard buttons: saving jobs, applying,
 * settings, password change and support tickets. Same conventions as
 * `student-data.ts`: scoped to one signed-in `userId`, every value coerced
 * before it reaches a query, failures logged and reported as `false`/errors.
 *
 *  savedJobs       { studentId, jobId, createdAt }
 *  jobApplications { studentId, jobId, role, company, status, createdAt }   (unique studentId+jobId)
 *  studentProfiles.settings { notifications{}, jobPrefs{ desiredRole, expectedSalary, remoteOnly } }
 *  supportTickets  { userId, ticketNo, subject, category, message, status, createdAt, updatedAt }
 */

async function getDb(): Promise<Db> {
  return getDatabase();
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");
type Fail = { ok: false; error: string; status: number };

// ── Saved jobs ──────────────────────────────────────────────────

export async function saveJob(userId: string, jobId: string): Promise<{ ok: true } | Fail> {
  if (!ObjectId.isValid(userId) || !ObjectId.isValid(jobId)) return { ok: false, error: "Job not found.", status: 404 };
  try {
    const db = await getDb();
    const job = await db.collection("jobPostings").findOne({ _id: new ObjectId(jobId) }, { projection: { _id: 1 } });
    if (!job) return { ok: false, error: "Job not found.", status: 404 };
    const studentId = new ObjectId(userId);
    await db.collection("savedJobs").updateOne(
      { studentId, jobId: job._id },
      { $setOnInsert: { studentId, jobId: job._id, createdAt: new Date() } },
      { upsert: true },
    );
    return { ok: true };
  } catch (err) {
    console.error("[student-actions] saveJob failed:", err);
    return { ok: false, error: "Could not save the job.", status: 500 };
  }
}

/** Unsaves by job id (Job Matches) or by saved-row id (Saved Jobs). */
export async function unsaveJob(userId: string, ref: { jobId?: string; savedId?: string }): Promise<boolean> {
  if (!ObjectId.isValid(userId)) return false;
  const filter: Record<string, unknown> = { studentId: new ObjectId(userId) };
  if (ref.jobId && ObjectId.isValid(ref.jobId)) filter.jobId = new ObjectId(ref.jobId);
  else if (ref.savedId && ObjectId.isValid(ref.savedId)) filter._id = new ObjectId(ref.savedId);
  else return false;
  try {
    const db = await getDb();
    await db.collection("savedJobs").deleteMany(filter);
    return true;
  } catch (err) {
    console.error("[student-actions] unsaveJob failed:", err);
    return false;
  }
}

// ── Applications ────────────────────────────────────────────────

export async function applyToJob(userId: string, jobId: string): Promise<{ ok: true; id: string } | Fail> {
  if (!ObjectId.isValid(userId) || !ObjectId.isValid(jobId)) return { ok: false, error: "Job not found.", status: 404 };
  try {
    const db = await getDb();
    const studentId = new ObjectId(userId);
    const job = await db.collection("jobPostings").findOne({ _id: new ObjectId(jobId) });
    if (!job) return { ok: false, error: "Job not found.", status: 404 };
    if (job.status === "closed") return { ok: false, error: "This opening is closed.", status: 410 };

    const existing = await db.collection("jobApplications").findOne({ studentId, jobId: job._id }, { projection: { _id: 1 } });
    if (existing) return { ok: false, error: "You have already applied to this role.", status: 409 };

    const now = new Date();
    const role = str(job.role) || str(job.title);
    const company = str(job.company);
    let id: ObjectId;
    try {
      id = (
        await db.collection("jobApplications").insertOne({ studentId, jobId: job._id, role, company, status: "Applied", createdAt: now, updatedAt: now })
      ).insertedId;
    } catch (err) {
      // Unique (studentId, jobId) index: a double-click lost the race.
      if ((err as { code?: number }).code === 11000) return { ok: false, error: "You have already applied to this role.", status: 409 };
      throw err;
    }

    if (job.companyId instanceof ObjectId) {
      const [user, profile] = await Promise.all([
        db.collection("users").findOne({ _id: studentId }, { projection: { name: 1, email: 1 } }),
        db.collection("studentProfiles").findOne({ userId: studentId }, { projection: { displayName: 1 } }),
      ]);
      const name = str(profile?.displayName) || str(user?.name) || "A student";
      await createNotification({
        userId: job.companyId,
        kind: "application",
        title: `New applicant for ${role}`,
        body: `${name} applied to your ${str(job.type) || "opening"}.`,
        link: `/company/candidates?job=${job._id.toString()}`,
      });
    }
    return { ok: true, id: id.toString() };
  } catch (err) {
    console.error("[student-actions] applyToJob failed:", err);
    return { ok: false, error: "Could not submit your application.", status: 500 };
  }
}

export async function getAppliedJobIds(userId: string): Promise<string[]> {
  if (!ObjectId.isValid(userId)) return [];
  try {
    const db = await getDb();
    const rows = await db.collection("jobApplications").find({ studentId: new ObjectId(userId) }, { projection: { jobId: 1 } }).toArray();
    return rows.map((r) => String(r.jobId));
  } catch (err) {
    console.error("[student-actions] getAppliedJobIds failed:", err);
    return [];
  }
}

// ── Settings ────────────────────────────────────────────────────

export const NOTIFICATION_KEYS = ["matches", "interviews", "summary", "product"] as const;
export type NotificationKey = (typeof NOTIFICATION_KEYS)[number];

export interface StudentSettings {
  notifications: Record<NotificationKey, boolean>;
  jobPrefs: { desiredRole: string; expectedSalary: string; remoteOnly: boolean };
}

export const DEFAULT_SETTINGS: StudentSettings = {
  notifications: { matches: true, interviews: true, summary: false, product: true },
  jobPrefs: { desiredRole: "", expectedSalary: "", remoteOnly: false },
};

export async function getStudentSettings(userId: string): Promise<StudentSettings> {
  if (!ObjectId.isValid(userId)) return DEFAULT_SETTINGS;
  try {
    const db = await getDb();
    const profile = await db.collection("studentProfiles").findOne({ userId: new ObjectId(userId) }, { projection: { settings: 1, targetRole: 1 } });
    const s = (profile?.settings ?? {}) as Record<string, unknown>;
    const n = (s.notifications ?? {}) as Record<string, unknown>;
    const j = (s.jobPrefs ?? {}) as Record<string, unknown>;
    return {
      notifications: Object.fromEntries(
        NOTIFICATION_KEYS.map((k) => [k, typeof n[k] === "boolean" ? n[k] : DEFAULT_SETTINGS.notifications[k]]),
      ) as Record<NotificationKey, boolean>,
      jobPrefs: {
        desiredRole: str(j.desiredRole) || str(profile?.targetRole),
        expectedSalary: str(j.expectedSalary),
        remoteOnly: Boolean(j.remoteOnly),
      },
    };
  } catch (err) {
    console.error("[student-actions] getStudentSettings failed:", err);
    return DEFAULT_SETTINGS;
  }
}

export async function saveStudentSettings(userId: string, settings: StudentSettings): Promise<boolean> {
  if (!ObjectId.isValid(userId)) return false;
  try {
    const db = await getDb();
    const _id = new ObjectId(userId);
    const now = new Date();
    await db.collection("studentProfiles").updateOne(
      { userId: _id },
      {
        $set: {
          userId: _id,
          "settings.notifications": Object.fromEntries(NOTIFICATION_KEYS.map((k) => [k, Boolean(settings.notifications[k])])),
          "settings.jobPrefs": {
            desiredRole: String(settings.jobPrefs.desiredRole),
            expectedSalary: String(settings.jobPrefs.expectedSalary),
            remoteOnly: Boolean(settings.jobPrefs.remoteOnly),
          },
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );
    return true;
  } catch (err) {
    console.error("[student-actions] saveStudentSettings failed:", err);
    return false;
  }
}

// ── Password ────────────────────────────────────────────────────

/**
 * Changes the password. Accounts that have one must confirm the current one;
 * GitHub-only accounts (no password yet) can set a first password.
 */
export async function changePassword(userId: string, current: string, next: string): Promise<{ ok: true } | Fail> {
  if (!ObjectId.isValid(userId)) return { ok: false, error: "Not signed in.", status: 401 };
  try {
    const db = await getDb();
    const _id = new ObjectId(userId);
    const user = await db.collection("users").findOne({ _id }, { projection: { passwordHash: 1 } });
    if (!user) return { ok: false, error: "Account not found.", status: 404 };
    const stored = str(user.passwordHash);
    if (stored && !verifyPassword(current, stored)) return { ok: false, error: "Your current password is incorrect.", status: 403 };
    await db.collection("users").updateOne({ _id }, { $set: { passwordHash: hashPassword(next), passwordChangedAt: new Date(), updatedAt: new Date() } });
    return { ok: true };
  } catch (err) {
    console.error("[student-actions] changePassword failed:", err);
    return { ok: false, error: "Could not change your password.", status: 500 };
  }
}

// ── Support tickets ─────────────────────────────────────────────

export type TicketStatus = "Open" | "In progress" | "Resolved";

export interface TicketView {
  id: string;
  ticketNo: string;
  subject: string;
  category: string;
  status: TicketStatus;
  createdAt: string;
}

const TICKET_STATUSES: TicketStatus[] = ["Open", "In progress", "Resolved"];

export async function listTickets(userId: string): Promise<TicketView[]> {
  if (!ObjectId.isValid(userId)) return [];
  try {
    const db = await getDb();
    const rows = await db.collection("supportTickets").find({ userId: new ObjectId(userId) }).sort({ createdAt: -1 }).limit(30).toArray();
    return rows.map((r) => ({
      id: r._id.toString(),
      ticketNo: str(r.ticketNo),
      subject: str(r.subject),
      category: str(r.category),
      status: TICKET_STATUSES.includes(r.status) ? r.status : "Open",
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : "",
    }));
  } catch (err) {
    console.error("[student-actions] listTickets failed:", err);
    return [];
  }
}

export async function createTicket(
  userId: string,
  input: { subject: string; category: string; message: string },
): Promise<TicketView | null> {
  if (!ObjectId.isValid(userId)) return null;
  try {
    const db = await getDb();
    // Atomic, human-friendly ticket numbers: #JMS-1001, #JMS-1002, …
    const counter = await db
      .collection<{ _id: string; seq: number }>("counters")
      .findOneAndUpdate({ _id: "supportTicket" }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after" });
    const ticketNo = `#JMS-${1000 + (counter?.seq ?? Date.now() % 100_000)}`;
    const now = new Date();
    const doc = {
      userId: new ObjectId(userId),
      ticketNo,
      subject: String(input.subject),
      category: String(input.category),
      message: String(input.message),
      status: "Open" as TicketStatus,
      createdAt: now,
      updatedAt: now,
    };
    const res = await db.collection("supportTickets").insertOne(doc);
    return { id: res.insertedId.toString(), ticketNo, subject: doc.subject, category: doc.category, status: "Open", createdAt: now.toISOString() };
  } catch (err) {
    console.error("[student-actions] createTicket failed:", err);
    return null;
  }
}
