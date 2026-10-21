/**
 * Server-side validation for student write APIs. The client already validates
 * its forms, but we never trust that — every field is re-checked here for type
 * and length before it reaches the database. The small extra latency is a
 * deliberate trade for long-term safety: it stops malformed or oversized data
 * from being persisted and keeps reads predictable.
 */

import type { ProfileUpdate } from "@/lib/db/student-data";
import type { ResumeVersionRecord } from "@/lib/db/student-data";

export interface ValidationResult<T> {
  value?: T;
  error?: string;
}

// ── Profile ─────────────────────────────────────────────────────

const PROFILE_LIMITS: Record<keyof ProfileUpdate, number> = {
  firstName: 80,
  lastName: 80,
  username: 80,
  nickname: 80,
  displayName: 120,
  displayRole: 40,
  bio: 1000,
  location: 120,
  website: 300,
  linkedin: 300,
  github: 300,
  whatsapp: 80,
  telegram: 80,
  phone: 40,
  targetRole: 80,
  // base64 data-URL avatars are bounded here; for production these belong in
  // blob storage rather than the user document, but this keeps the demo safe.
  avatar: 700_000,
};

const ALLOWED_ROLES = ["Student", "Job Seeker", "Mentor"];
const PROFILE_KEYS = Object.keys(PROFILE_LIMITS) as (keyof ProfileUpdate)[];

/** Validates and trims a profile-update payload, key by key. */
export function validateProfileInput(
  body: unknown,
): ValidationResult<ProfileUpdate> {
  if (typeof body !== "object" || body === null) {
    return { error: "Invalid request body." };
  }
  const input = body as Record<string, unknown>;
  const value: ProfileUpdate = {};

  for (const key of PROFILE_KEYS) {
    if (!(key in input) || input[key] == null) continue;
    const raw = input[key];
    if (typeof raw !== "string") {
      return { error: `"${key}" must be text.` };
    }
    const trimmed = raw.trim();
    if (trimmed.length > PROFILE_LIMITS[key]) {
      return {
        error:
          key === "avatar"
            ? "That image is too large. Pick one of the avatars or upload a smaller photo."
            : `"${key}" is too long (max ${PROFILE_LIMITS[key]} characters).`,
      };
    }
    value[key] = trimmed;
  }

  if (value.displayRole && !ALLOWED_ROLES.includes(value.displayRole)) {
    return { error: "Invalid role selected." };
  }

  return { value };
}

// ── Resume ──────────────────────────────────────────────────────

const MAX_VERSIONS = 10;
const MAX_LIST_ITEMS = 50; // per resume sub-section (experience, skills, …)
const RESUME_LIST_KEYS = [
  "experience",
  "education",
  "skills",
  "certifications",
  "projects",
];

/** Bounds the nested arrays of a resume so a single doc can't grow unbounded. */
function clampResumeData(data: unknown): unknown {
  if (typeof data !== "object" || data === null) return data;
  const d = data as Record<string, unknown>;
  for (const key of RESUME_LIST_KEYS) {
    if (Array.isArray(d[key]) && d[key].length > MAX_LIST_ITEMS) {
      d[key] = (d[key] as unknown[]).slice(0, MAX_LIST_ITEMS);
    }
  }
  return d;
}

/** Validates the resume payload: a bounded list of well-formed versions. */
export function validateResumePayload(
  body: unknown,
): ValidationResult<{ versions: ResumeVersionRecord[]; atsScore: number }> {
  if (typeof body !== "object" || body === null) {
    return { error: "Invalid request body." };
  }
  const { versions, atsScore } = body as {
    versions?: unknown;
    atsScore?: unknown;
  };

  if (!Array.isArray(versions)) {
    return { error: "Missing resume versions." };
  }
  if (versions.length === 0 || versions.length > MAX_VERSIONS) {
    return { error: `A resume must have between 1 and ${MAX_VERSIONS} versions.` };
  }

  const cleaned: ResumeVersionRecord[] = [];
  for (const v of versions) {
    if (typeof v !== "object" || v === null) {
      return { error: "Malformed resume version." };
    }
    const { id, name, data } = v as Record<string, unknown>;
    if (typeof id !== "string" || id.length > 64) {
      return { error: "Invalid resume version id." };
    }
    if (typeof name !== "string" || name.length > 80) {
      return { error: "Resume version name is invalid or too long." };
    }
    cleaned.push({ id, name: name.trim() || "Resume", data: clampResumeData(data) });
  }

  const score = Number(atsScore);
  const safeScore = Number.isFinite(score) ? Math.min(100, Math.max(0, score)) : 0;

  return { value: { versions: cleaned, atsScore: safeScore } };
}
