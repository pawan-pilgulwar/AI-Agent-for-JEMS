import { ObjectId, type Db } from "mongodb";
import { getDatabase } from "@/lib/db/mongodb";

/**
 * Industry ↔ academia collaboration catalogue (FDPs, faculty internships,
 * industrial training, guest lectures, research, consultancy, challenges)
 * and the "express interest" records faculty leave against them.
 */

export interface CollaborationView {
  id: string;
  company: string;
  title: string;
  type: string;
  domain: string[];
  duration: string;
  startsAt: string;
  location: string;
  seats: number;
  description: string;
  interested: number;
  mine: boolean;
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");

async function getDb(): Promise<Db> {
  return getDatabase();
}

export async function listCollaborations(userId: string): Promise<CollaborationView[]> {
  try {
    const db = await getDb();
    const uid = ObjectId.isValid(userId) ? new ObjectId(userId) : null;
    const [rows, interests] = await Promise.all([
      db.collection("collaborations").find({}).sort({ startsAt: 1 }).toArray(),
      db.collection("collaborationInterests").find({}).toArray(),
    ]);
    const counts = new Map<string, number>();
    const mine = new Set<string>();
    for (const i of interests) {
      const k = String(i.collaborationId);
      counts.set(k, (counts.get(k) ?? 0) + 1);
      if (uid && String(i.userId) === String(uid)) mine.add(k);
    }
    return rows.map((c) => {
      const id = c._id.toString();
      return {
        id,
        company: str(c.company),
        title: str(c.title),
        type: str(c.type),
        domain: Array.isArray(c.domain) ? c.domain.map(String) : [],
        duration: str(c.duration),
        startsAt: c.startsAt instanceof Date ? c.startsAt.toISOString() : "",
        location: str(c.location),
        seats: Number(c.seats) || 0,
        description: str(c.description),
        interested: counts.get(id) ?? 0,
        mine: mine.has(id),
      };
    });
  } catch (err) {
    console.error("[collaborations] listCollaborations failed:", err);
    return [];
  }
}

/** Toggles the signed-in user's interest in a collaboration. Returns the new state. */
export async function toggleInterest(userId: string, collaborationId: string): Promise<{ ok: boolean; interested: boolean }> {
  if (!ObjectId.isValid(userId) || !ObjectId.isValid(collaborationId)) return { ok: false, interested: false };
  try {
    const db = await getDb();
    const filter = { userId: new ObjectId(userId), collaborationId: new ObjectId(collaborationId) };
    const exists = await db.collection("collaborations").countDocuments({ _id: filter.collaborationId }, { limit: 1 });
    if (!exists) return { ok: false, interested: false };
    const existing = await db.collection("collaborationInterests").findOne(filter);
    if (existing) {
      await db.collection("collaborationInterests").deleteOne({ _id: existing._id });
      return { ok: true, interested: false };
    }
    await db.collection("collaborationInterests").insertOne({ ...filter, createdAt: new Date() });
    return { ok: true, interested: true };
  } catch (err) {
    console.error("[collaborations] toggleInterest failed:", err);
    return { ok: false, interested: false };
  }
}

export interface CollaborationInput {
  title: string;
  type: string;
  domain: string[];
  duration: string;
  startsAt: string;
  location: string;
  seats: number;
  description: string;
}

/** A company publishes a new collaboration opportunity. */
export async function createCollaboration(companyUserId: string, company: string, input: CollaborationInput): Promise<boolean> {
  if (!ObjectId.isValid(companyUserId)) return false;
  try {
    const db = await getDb();
    await db.collection("collaborations").insertOne({
      companyId: new ObjectId(companyUserId),
      company: String(company),
      title: String(input.title),
      type: String(input.type),
      domain: input.domain.map(String),
      duration: String(input.duration),
      startsAt: new Date(input.startsAt),
      location: String(input.location),
      seats: Number(input.seats) || 0,
      description: String(input.description),
      createdAt: new Date(),
    });
    return true;
  } catch (err) {
    console.error("[collaborations] createCollaboration failed:", err);
    return false;
  }
}
