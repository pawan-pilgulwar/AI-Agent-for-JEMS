import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/db/mongodb";

export type UserRole = "student" | "company" | "institution" | "faculty";
export type AuthProvider = "credentials" | "github";

export interface UserDoc {
  _id: ObjectId;
  name: string;
  email: string;
  role: UserRole;
  authProvider: AuthProvider;
  passwordHash?: string;
  image?: string | null;
  phone?: string | null;
  emailVerified?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Career answers captured during student signup (or empty for OAuth signups). */
export interface StudentProfileInput {
  experienceLevel?: string;
  targetRole?: string;
  learningStyle?: string;
  yearsOfExperience?: string;
}

async function users() {
  const db = await getDatabase();
  return db.collection("users");
}

export async function getUserByEmail(email: string): Promise<UserDoc | null> {
  // Coerce to a primitive string so a non-string value (e.g. a `{ $ne: null }`
  // operator object) can never be passed through into the query — NoSQL
  // injection guard / defence in depth.
  const normalized = String(email ?? "").toLowerCase().trim();
  if (!normalized) return null;
  const col = await users();
  return (await col.findOne({ email: normalized })) as UserDoc | null;
}

/** Looks up a user by their string id. Returns null for missing/invalid ids. */
export async function getUserById(id: string): Promise<UserDoc | null> {
  if (!ObjectId.isValid(id)) return null;
  const col = await users();
  return (await col.findOne({ _id: new ObjectId(id) })) as UserDoc | null;
}

/** Permanently removes a user and their associated studentProfiles doc. */
export async function deleteUserById(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const db = await getDatabase();
  const _id = new ObjectId(id);
  const res = await db.collection("users").deleteOne({ _id });
  await db.collection("studentProfiles").deleteOne({ userId: _id });
  return res.deletedCount === 1;
}

interface CreateStudentArgs {
  name: string;
  email: string;
  passwordHash: string;
  phone?: string | null;
  profile?: StudentProfileInput;
}

/** Creates a credentials-based student user plus their studentProfiles doc. */
export async function createStudent(
  args: CreateStudentArgs,
): Promise<UserDoc> {
  const db = await getDatabase();
  const now = new Date();
  const doc: Omit<UserDoc, "_id"> = {
    name: args.name.trim(),
    email: args.email.toLowerCase().trim(),
    role: "student",
    authProvider: "credentials",
    passwordHash: args.passwordHash,
    phone: args.phone?.trim() || null,
    image: null,
    emailVerified: null,
    createdAt: now,
    updatedAt: now,
  };
  const res = await db.collection("users").insertOne(doc);
  await db.collection("studentProfiles").insertOne({
    userId: res.insertedId,
    ...args.profile,
    createdAt: now,
    updatedAt: now,
  });
  return { _id: res.insertedId, ...doc };
}

/**
 * Finds an existing user by email or creates a student from a GitHub profile.
 * Used by the Auth.js signIn callback so OAuth users land in `users` too.
 */
export async function upsertGithubStudent(args: {
  email: string;
  name?: string | null;
  image?: string | null;
}): Promise<UserDoc> {
  const existing = await getUserByEmail(args.email);
  if (existing) return existing;

  const db = await getDatabase();
  const now = new Date();
  const doc: Omit<UserDoc, "_id"> = {
    name: args.name?.trim() || args.email.split("@")[0],
    email: args.email.toLowerCase().trim(),
    role: "student",
    authProvider: "github",
    image: args.image ?? null,
    phone: null,
    emailVerified: now,
    createdAt: now,
    updatedAt: now,
  };
  const res = await db.collection("users").insertOne(doc);
  await db.collection("studentProfiles").insertOne({
    userId: res.insertedId,
    createdAt: now,
    updatedAt: now,
  });
  return { _id: res.insertedId, ...doc };
}
