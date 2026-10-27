import { ObjectId, type Db, type Document } from "mongodb";
import { getDatabase } from "@/lib/db/mongodb";
import { scoreAgainst } from "@/lib/agents/engine";

/** Typed handle to the database (the JS mongodb helper is untyped). */
async function getDb(): Promise<Db> {
  return getDatabase();
}

/**
 * Runs a loader and, if it throws (DB unreachable, pool exhausted under load,
 * malformed document, …), logs it and returns a safe fallback instead of
 * letting the exception bubble up and crash the page render for the student.
 * This is what keeps the dashboard resilient when many students hit it at once.
 */
async function safe<T>(
  label: string,
  fallback: T,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[student-data] ${label} failed:`, err);
    return fallback;
  }
}

/**
 * Fetches many job postings in a single round-trip and returns them keyed by id.
 * Replaces the previous per-row findOne() loop, which issued one query per job
 * and could exhaust the connection pool when many students loaded at once.
 */
async function jobsByIds(
  db: Db,
  ids: ObjectId[],
): Promise<Map<string, Document>> {
  if (ids.length === 0) return new Map();
  const docs = await db
    .collection("jobPostings")
    .find({ _id: { $in: ids } })
    .toArray();
  return new Map(docs.map((d) => [d._id.toString(), d]));
}

const toObjectIds = (values: unknown[]): ObjectId[] =>
  values.filter((v): v is ObjectId => v instanceof ObjectId);

/**
 * Per-student data access for the dashboard. Every loader here is scoped to a
 * single signed-in `userId` so a student only ever sees their own profile,
 * resume, applications, matches, interviews, learning and progress.
 *
 * All loaders are defensive: when a student hasn't worked on a section yet the
 * underlying collection is simply empty, and we return empty arrays / nulls so
 * the UI can render an "add this to get started" empty state instead of crashing.
 */

// ── Time helpers ────────────────────────────────────────────────
// Computed on the server from stored dates so seeded data still looks alive.

/** "Jun 22" style short date. */
export function shortDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** "2d ago" / "3h ago" / "just now" relative label. */
export function timeAgo(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  const ms = Date.now() - date.getTime();
  if (Number.isNaN(ms)) return "";
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return shortDate(date);
}

const oid = (id: string) => new ObjectId(id);

// ── Profile ─────────────────────────────────────────────────────

/** The full, editable profile as the Profile screen needs it. */
export interface StudentProfileView {
  // identity (from users)
  name: string;
  email: string;
  image: string | null;
  // editable profile fields (from studentProfiles)
  username: string;
  firstName: string;
  lastName: string;
  nickname: string;
  displayName: string;
  displayRole: string;
  bio: string;
  location: string;
  website: string;
  linkedin: string;
  github: string;
  whatsapp: string;
  telegram: string;
  phone: string;
  avatar: string;
  title: string;
  // career answers (from signup)
  experienceLevel: string;
  targetRole: string;
  learningStyle: string;
  yearsOfExperience: string;
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");

/** Loads the full editable profile for the Profile screen. */
export async function getStudentProfile(
  userId: string,
): Promise<StudentProfileView | null> {
  if (!ObjectId.isValid(userId)) return null;
  return safe("getStudentProfile", null, async () => {
  const db = await getDb();
  const _id = oid(userId);

  const user = await db.collection("users").findOne({ _id });
  if (!user) return null;

  const p = ((await db
    .collection("studentProfiles")
    .findOne({ userId: _id })) ?? {}) as Record<string, unknown>;

  const name = str(user.name).trim() || str(user.email).split("@")[0];
  const [firstFromName = "", ...restName] = name.split(/\s+/);

  return {
    name,
    email: str(user.email),
    image: (user.image as string | null) ?? null,
    username: str(p.username) || str(user.email).split("@")[0],
    firstName: str(p.firstName) || firstFromName,
    lastName: str(p.lastName) || restName.join(" "),
    nickname: str(p.nickname),
    displayName: str(p.displayName) || name,
    displayRole: str(p.displayRole) || "Student",
    bio: str(p.bio),
    location: str(p.location),
    website: str(p.website),
    linkedin: str(p.linkedin),
    github: str(p.github),
    whatsapp: str(p.whatsapp),
    telegram: str(p.telegram),
    phone: str(p.phone) || str(user.phone),
    avatar: str(p.avatar),
    title: str(p.targetRole) ? `Aspiring ${str(p.targetRole)}` : "Student",
    experienceLevel: str(p.experienceLevel),
    targetRole: str(p.targetRole),
    learningStyle: str(p.learningStyle),
    yearsOfExperience: str(p.yearsOfExperience),
  };
  });
}

/** Fields the student is allowed to edit from the Profile screen. */
export interface ProfileUpdate {
  firstName?: string;
  lastName?: string;
  username?: string;
  nickname?: string;
  displayName?: string;
  displayRole?: string;
  bio?: string;
  location?: string;
  website?: string;
  linkedin?: string;
  github?: string;
  whatsapp?: string;
  telegram?: string;
  phone?: string;
  avatar?: string;
  targetRole?: string;
}

const EDITABLE_KEYS: (keyof ProfileUpdate)[] = [
  "firstName", "lastName", "username", "nickname", "displayName", "displayRole",
  "bio", "location", "website", "linkedin", "github", "whatsapp", "telegram",
  "phone", "avatar", "targetRole",
];

/** Persists profile edits to studentProfiles and keeps users.name in sync. */
export async function updateStudentProfile(
  userId: string,
  input: ProfileUpdate,
): Promise<boolean> {
  if (!ObjectId.isValid(userId)) return false;
  return safe("updateStudentProfile", false, async () => {
    const db = await getDb();
    const _id = oid(userId);
    const now = new Date();

    const set: Record<string, unknown> = { updatedAt: now };
    for (const key of EDITABLE_KEYS) {
      const value = input[key];
      if (typeof value === "string") set[key] = value.trim();
    }

    await db
      .collection("studentProfiles")
      .updateOne(
        { userId: _id },
        { $set: { ...set, userId: _id }, $setOnInsert: { createdAt: now } },
        { upsert: true },
      );

    // Keep the canonical display name on the user document in sync so the
    // sidebar, top bar and dashboard greeting reflect the change everywhere.
    const fullName = [input.firstName, input.lastName]
      .map((v) => (v ?? "").trim())
      .filter(Boolean)
      .join(" ");
    const newName = (input.displayName ?? "").trim() || fullName;
    if (newName) {
      await db
        .collection("users")
        .updateOne({ _id }, { $set: { name: newName, updatedAt: now } });
    }
    return true;
  });
}

// ── Job matches ─────────────────────────────────────────────────

export interface JobMatchView {
  id: string;
  role: string;
  company: string;
  match: number;
  location: string;
  type: string;
  salary: string;
  posted: string;
  remote: boolean;
  matched: string[];
  missing: string[];
}

/**
 * The student's ranked opportunities: every open posting scored live by the
 * Matching Agent against the student's (verified) skills, so a company's new
 * opening or a freshly passed quiz changes the ranking immediately.
 */
export async function getJobMatches(userId: string): Promise<JobMatchView[]> {
  if (!ObjectId.isValid(userId)) return [];
  return safe("getJobMatches", [], async () => {
    const db = await getDb();
    const [profile, jobs] = await Promise.all([
      db.collection("studentProfiles").findOne({ userId: oid(userId) }),
      db.collection("jobPostings").find({ status: { $ne: "closed" } }).sort({ postedAt: -1 }).limit(60).toArray(),
    ]);
    const skills = (Array.isArray(profile?.skills) ? profile!.skills : [])
      .map((s: unknown) => {
        const o = (s ?? {}) as Record<string, unknown>;
        return { name: str(o.name), level: Number(o.level) || 0, verified: Boolean(o.verified) };
      })
      .filter((s: { name: string }) => s.name);
    if (skills.length === 0) return [];

    return jobs
      .map((job) => {
        const required = Array.isArray(job.requiredSkills) ? job.requiredSkills.map(String) : [];
        const nice = Array.isArray(job.niceToHave) ? job.niceToHave.map(String) : [];
        const { score, matched, missing } = scoreAgainst(skills, required, nice);
        return {
          id: job._id.toString(),
          role: str(job.role) || str(job.title),
          company: str(job.company),
          match: score,
          location: str(job.location),
          type: str(job.type) || "Full-time",
          salary: str(job.salary),
          posted: timeAgo(job.postedAt ?? job.createdAt),
          remote: Boolean(job.remote),
          matched,
          missing,
        };
      })
      .sort((a, b) => b.match - a.match);
  });
}

// ── Saved jobs ──────────────────────────────────────────────────

export interface SavedJobView {
  id: string;
  jobId: string;
  role: string;
  company: string;
  match: number;
  location: string;
  salary: string;
  saved: string;
}

export async function getSavedJobs(userId: string): Promise<SavedJobView[]> {
  if (!ObjectId.isValid(userId)) return [];
  return safe("getSavedJobs", [], async () => {
    const db = await getDb();
    const saved = await db
      .collection("savedJobs")
      .find({ studentId: oid(userId) })
      .sort({ createdAt: -1 })
      .toArray();

    const ids = toObjectIds(saved.map((s) => s.jobId));
    const [jobs, matchDocs, profile] = await Promise.all([
      jobsByIds(db, ids),
      db
        .collection("candidateMatches")
        .find({ studentId: oid(userId), jobId: { $in: ids } })
        .toArray(),
      db.collection("studentProfiles").findOne({ userId: oid(userId) }, { projection: { skills: 1 } }),
    ]);
    const matchByJob = new Map(
      matchDocs.map((m) => [m.jobId.toString(), Number(m.matchScore) || 0]),
    );
    // Jobs saved from Job Matches have no precomputed match — score them live
    // the same way the Job Matches list does.
    const skills = (Array.isArray(profile?.skills) ? profile!.skills : [])
      .map((s: unknown) => {
        const o = (s ?? {}) as Record<string, unknown>;
        return { name: str(o.name), level: Number(o.level) || 0, verified: Boolean(o.verified) };
      })
      .filter((s: { name: string }) => s.name);
    const liveScore = (job: Document) =>
      scoreAgainst(
        skills,
        Array.isArray(job.requiredSkills) ? job.requiredSkills.map(String) : [],
        Array.isArray(job.niceToHave) ? job.niceToHave.map(String) : [],
      ).score;

    const out: SavedJobView[] = [];
    for (const s of saved) {
      const job = s.jobId ? jobs.get(s.jobId.toString()) : null;
      if (!job) continue;
      out.push({
        id: s._id.toString(),
        jobId: job._id.toString(),
        role: str(job.role) || str(job.title),
        company: str(job.company),
        match: matchByJob.get(job._id.toString()) ?? liveScore(job),
        location: str(job.location),
        salary: str(job.salary),
        saved: timeAgo(s.createdAt),
      });
    }
    return out;
  });
}

// ── Applications ────────────────────────────────────────────────

export type ApplicationStatus =
  | "Applied"
  | "In review"
  | "Interview"
  | "Offer"
  | "Rejected";

export interface ApplicationView {
  id: string;
  role: string;
  company: string;
  applied: string;
  status: ApplicationStatus;
}

const APP_STATUSES: ApplicationStatus[] = [
  "Applied", "In review", "Interview", "Offer", "Rejected",
];

export async function getApplications(
  userId: string,
): Promise<ApplicationView[]> {
  if (!ObjectId.isValid(userId)) return [];
  return safe("getApplications", [], async () => {
    const db = await getDb();
    const apps = await db
      .collection("jobApplications")
      .find({ studentId: oid(userId) })
      .sort({ createdAt: -1 })
      .toArray();

    const jobs = await jobsByIds(db, toObjectIds(apps.map((a) => a.jobId)));

    const out: ApplicationView[] = [];
    for (const a of apps) {
      const job = a.jobId ? jobs.get(a.jobId.toString()) : null;
      const status = (APP_STATUSES as string[]).includes(str(a.status))
        ? (a.status as ApplicationStatus)
        : "Applied";
      out.push({
        id: a._id.toString(),
        role: str(a.role) || str(job?.role) || str(job?.title),
        company: str(a.company) || str(job?.company),
        applied: shortDate(a.createdAt ?? a.appliedAt),
        status,
      });
    }
    return out;
  });
}

// ── Mock interviews ─────────────────────────────────────────────

export interface PastInterviewView {
  id: string;
  date: string;
  type: string;
  score: number;
  /** The graded AI interview paper, when the interview was run by the AI agent. */
  paperId: string | null;
}

export interface MockInterviewData {
  past: PastInterviewView[];
  completed: number;
  average: number;
  best: number;
  streak: number;
}

export async function getMockInterviews(
  userId: string,
): Promise<MockInterviewData> {
  const empty: MockInterviewData = {
    past: [], completed: 0, average: 0, best: 0, streak: 0,
  };
  if (!ObjectId.isValid(userId)) return empty;
  return safe("getMockInterviews", empty, async () => {
    const db = await getDb();
    const rows = await db
      .collection("mockInterviews")
      .find({ studentId: oid(userId) })
      .sort({ createdAt: -1 })
      .toArray();
    if (rows.length === 0) return empty;

    const past = rows.map((r) => ({
      id: r._id.toString(),
      date: shortDate(r.createdAt ?? r.takenAt),
      type: str(r.type),
      score: Number(r.score) || 0,
      paperId: r.paperId ? String(r.paperId) : null,
    }));
    const scores = past.map((p) => p.score);
    const average = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const best = Math.max(...scores);
    const streak = Number(rows[0].streak) || 0;
    return { past, completed: rows.length, average, best, streak };
  });
}

// ── Learning paths ──────────────────────────────────────────────

export type LearningStatus = "in-progress" | "recommended" | "completed";

export interface LearningPathView {
  id: string;
  /** roadmap = created for an AI roadmap (has `roadmapId`); path = any other stored row. */
  source: "roadmap" | "path";
  title: string;
  category: string;
  level: string;
  /** Topics for a roadmap path, lessons otherwise. */
  lessons: number;
  hours: number;
  progress: number;
  status: LearningStatus;
  /** Where Start / Continue goes; null when the path has no page. */
  href: string | null;
}

export async function getLearningPaths(
  userId: string,
): Promise<LearningPathView[]> {
  if (!ObjectId.isValid(userId)) return [];
  return safe("getLearningPaths", [], async () => {
    const db = await getDb();
    const rows = await db
      .collection("learningPaths")
      .find({ studentId: oid(userId) })
      .sort({ progress: -1 })
      .toArray();

    return rows.map((r) => {
      const progress = Number(r.progress) || 0;
      const status: LearningStatus =
        progress >= 100 ? "completed" : progress > 0 ? "in-progress" : "recommended";
      const roadmapId = r.roadmapId instanceof ObjectId ? r.roadmapId.toString() : null;
      return {
        id: r._id.toString(),
        source: roadmapId ? ("roadmap" as const) : ("path" as const),
        // A roadmap's path opens its lessons, quick checks and module tests.
        href: roadmapId ? `/student/learning/${roadmapId}` : null,
        title: str(r.title),
        category: str(r.category),
        level: str(r.level) || "Beginner",
        lessons: Number(r.lessons) || 0,
        hours: Number(r.hours) || 0,
        progress,
        status: (str(r.status) as LearningStatus) || status,
      };
    });
  });
}

// ── Skills (shared by dashboard + progress) ─────────────────────

export interface SkillView {
  name: string;
  level: number;
  /** Proven by a skill test, AI test or roadmap quiz (vs. self-rated). */
  verified: boolean;
}

async function getSkills(userId: string): Promise<SkillView[]> {
  const db = await getDb();
  const profile = await db
    .collection("studentProfiles")
    .findOne({ userId: oid(userId) });
  const skills = Array.isArray(profile?.skills) ? profile.skills : [];
  return skills
    .map((s: unknown) => {
      const o = s as { name?: unknown; level?: unknown; verified?: unknown };
      return { name: str(o.name), level: Number(o.level) || 0, verified: Boolean(o.verified) };
    })
    .filter((s: SkillView) => s.name);
}

// ── Progress / analytics ────────────────────────────────────────

export interface ProgressData {
  readiness: number;
  lessonsCompleted: number;
  mockInterviews: number;
  streak: number;
  badges: number;
  week: { day: string; v: number }[];
  achievements: { title: string; earned: boolean }[];
  skills: SkillView[];
}

const DEFAULT_ACHIEVEMENTS = [
  "First Resume", "5 Interviews", "Skill Master", "3-Day Streak",
  "First Application", "10 Interviews", "Job Offer", "Path Complete",
];

export async function getProgress(userId: string): Promise<ProgressData> {
  const empty: ProgressData = {
    readiness: 0, lessonsCompleted: 0, mockInterviews: 0, streak: 0,
    badges: 0, week: [], achievements: [], skills: [],
  };
  if (!ObjectId.isValid(userId)) return empty;
  return safe("getProgress", empty, async () => {
    const db = await getDb();
    const [skills, analyticsDoc] = await Promise.all([
      getSkills(userId),
      db.collection("studentAnalytics").findOne({ studentId: oid(userId) }),
    ]);
    const a = (analyticsDoc ?? {}) as Record<string, unknown>;

    const earned: string[] = Array.isArray(a.achievements) ? a.achievements : [];
    const achievements = DEFAULT_ACHIEVEMENTS.map((title) => ({
      title,
      earned: earned.includes(title),
    }));

    return {
      readiness: Number(a.readiness) || 0,
      lessonsCompleted: Number(a.lessonsCompleted) || 0,
      mockInterviews: Number(a.mockInterviews) || 0,
      streak: Number(a.streak) || 0,
      badges: earned.length,
      week: Array.isArray(a.week) ? a.week : [],
      achievements,
      skills,
    };
  });
}

// ── Resumes ─────────────────────────────────────────────────────

/** A single resume version, stored verbatim as the builder produces it. */
export interface ResumeVersionRecord {
  id: string;
  name: string;
  data: unknown; // ResumeData shape from components/resume/types
}

export interface StudentResume {
  versions: ResumeVersionRecord[];
  atsScore: number | null;
}

/** True when a resume version has real content (not just a blank shell). */
function resumeHasContent(data: unknown): boolean {
  const d = data as
    | { summary?: string; experience?: unknown[]; education?: unknown[]; skills?: unknown[] }
    | null;
  if (!d) return false;
  return Boolean(
    (d.summary && d.summary.trim()) ||
      (Array.isArray(d.experience) && d.experience.length) ||
      (Array.isArray(d.education) && d.education.length) ||
      (Array.isArray(d.skills) && d.skills.length),
  );
}

/** Loads the student's resume document (all versions + cached ATS score). */
export async function getStudentResume(
  userId: string,
): Promise<StudentResume | null> {
  if (!ObjectId.isValid(userId)) return null;
  return safe("getStudentResume", null, async () => {
    const db = await getDb();
    const doc = await db
      .collection("resumes")
      .findOne({ studentId: oid(userId) });
    if (!doc || !Array.isArray(doc.versions)) return null;

    const versions: ResumeVersionRecord[] = doc.versions.map(
      (v: { id?: unknown; name?: unknown; data?: unknown }) => ({
        id: str(v.id) || crypto.randomUUID(),
        name: str(v.name) || "Resume",
        data: v.data ?? null,
      }),
    );
    return {
      versions,
      atsScore: typeof doc.atsScore === "number" ? doc.atsScore : null,
    };
  });
}

/** Persists the full set of resume versions for the student. */
export async function saveStudentResume(
  userId: string,
  versions: ResumeVersionRecord[],
  atsScore: number,
): Promise<boolean> {
  if (!ObjectId.isValid(userId)) return false;
  return safe("saveStudentResume", false, async () => {
    const db = await getDb();
    const now = new Date();
    await db.collection("resumes").updateOne(
      { studentId: oid(userId) },
      {
        $set: { versions, atsScore, updatedAt: now },
        $setOnInsert: { studentId: oid(userId), createdAt: now },
      },
      { upsert: true },
    );
    return true;
  });
}

// ── Dashboard aggregate ─────────────────────────────────────────

export interface DashboardData {
  readiness: number;
  atsScore: number | null;
  interviewsCompleted: number;
  interviewsAverage: number;
  newMatches: number;
  jobs: JobMatchView[];
  upcoming: { title: string; when: string; tag: string }[];
  activity: { text: string; time: string }[];
  skills: SkillView[];
  resumeProgress: number;
  hasResume: boolean;
  /** Skill questionnaire completed (the "assess first" gate). */
  assessmentDone: boolean;
  verifiedSkills: number;
}

export async function getDashboardData(
  userId: string,
): Promise<DashboardData> {
  const [matches, interviews, progress, resume, profileDoc] = await Promise.all([
    getJobMatches(userId),
    getMockInterviews(userId),
    getProgress(userId),
    getStudentResume(userId),
    (async () => (await getDb()).collection("studentProfiles").findOne({ userId: oid(userId) }))(),
  ]);
  const assessmentDone = Boolean((profileDoc?.assessment as { questionnaireAt?: unknown } | undefined)?.questionnaireAt);
  const verifiedSkills = (Array.isArray(profileDoc?.skills) ? profileDoc!.skills : []).filter((s: { verified?: unknown }) => Boolean(s?.verified)).length;

  // These two are not covered by a sub-loader, so guard them independently.
  const { upcoming, activity } = await safe(
    "getDashboardData:extra",
    { upcoming: [] as DashboardData["upcoming"], activity: [] as DashboardData["activity"] },
    async () => {
      const db = await getDb();
      const _id = ObjectId.isValid(userId) ? oid(userId) : null;
      if (!_id) return { upcoming: [], activity: [] };

      const [analyticsDoc, activityRows] = await Promise.all([
        db.collection("studentAnalytics").findOne({ studentId: _id }),
        db
          .collection("activityLogs")
          .find({ userId: _id })
          .sort({ createdAt: -1 })
          .limit(5)
          .toArray(),
      ]);
      const analytics = (analyticsDoc ?? {}) as Record<string, unknown>;

      const upcoming = Array.isArray(analytics.upcoming)
        ? analytics.upcoming.map((u: { title?: unknown; when?: unknown; tag?: unknown }) => ({
            title: str(u.title),
            when: str(u.when),
            tag: str(u.tag),
          }))
        : [];
      const activity = activityRows.map((r) => ({
        text: str(r.text),
        time: timeAgo(r.createdAt),
      }));
      return { upcoming, activity };
    },
  );

  const hasResume = Boolean(
    resume?.versions.some((v) => resumeHasContent(v.data)),
  );

  return {
    readiness: progress.readiness,
    atsScore: resume?.atsScore ?? null,
    interviewsCompleted: interviews.completed,
    interviewsAverage: interviews.average,
    newMatches: matches.length,
    jobs: matches.slice(0, 4),
    upcoming,
    activity,
    skills: progress.skills,
    resumeProgress: hasResume ? 100 : 0,
    hasResume,
    assessmentDone,
    verifiedSkills,
  };
}
