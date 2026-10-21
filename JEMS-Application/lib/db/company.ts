import { ObjectId, type Db, type Document } from "mongodb";
import { getDatabase } from "@/lib/db/mongodb";
import { scoreAgainst } from "@/lib/agents/engine";
import { APPLICATION_STATUSES, type CompanyApplicationStatus } from "@/lib/company/constants";

/**
 * Industry portal data: the company's openings, the applicants and
 * skill-ranked candidates for each, and the learning programs it publishes.
 * Everything is scoped to the signed-in company user's `companyId`.
 */

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const strArr = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => str(x)).filter(Boolean) : []);
const iso = (v: unknown): string => (v instanceof Date ? v.toISOString() : "");

async function getDb(): Promise<Db> {
  return getDatabase();
}


export interface CompanyContext {
  userId: string;
  name: string;
  industry: string;
  location: string;
}

export async function getCompanyContext(userId: string): Promise<CompanyContext | null> {
  if (!ObjectId.isValid(userId)) return null;
  try {
    const db = await getDb();
    const _id = new ObjectId(userId);
    const [user, profile] = await Promise.all([
      db.collection("users").findOne({ _id, role: "company" }),
      db.collection("companyProfiles").findOne({ userId: _id }),
    ]);
    if (!user) return null;
    return {
      userId,
      name: str(profile?.companyName) || str(user.name) || "Company",
      industry: str(profile?.industry),
      location: str(profile?.location),
    };
  } catch (err) {
    console.error("[company] getCompanyContext failed:", err);
    return null;
  }
}

// ── Openings ────────────────────────────────────────────────────

export interface OpeningView {
  id: string;
  role: string;
  type: string;
  location: string;
  salary: string;
  experience: string;
  requiredSkills: string[];
  niceToHave: string[];
  description: string;
  status: string;
  postedAt: string;
  applicants: number;
}

function openingFromDoc(d: Document, applicants = 0): OpeningView {
  return {
    id: d._id.toString(),
    role: str(d.role),
    type: str(d.type) || "Full-time",
    location: str(d.location),
    salary: str(d.salary),
    experience: str(d.experience),
    requiredSkills: strArr(d.requiredSkills),
    niceToHave: strArr(d.niceToHave),
    description: str(d.description),
    status: str(d.status) || "open",
    postedAt: iso(d.postedAt) || iso(d.createdAt),
    applicants,
  };
}

export async function listOpenings(companyUserId: string): Promise<OpeningView[]> {
  if (!ObjectId.isValid(companyUserId)) return [];
  try {
    const db = await getDb();
    const companyId = new ObjectId(companyUserId);
    const jobs = await db.collection("jobPostings").find({ companyId }).sort({ postedAt: -1 }).toArray();
    const counts = await db
      .collection("jobApplications")
      .aggregate([{ $match: { jobId: { $in: jobs.map((j) => j._id) } } }, { $group: { _id: "$jobId", n: { $sum: 1 } } }])
      .toArray();
    const byJob = new Map(counts.map((c) => [String(c._id), Number(c.n)]));
    return jobs.map((j) => openingFromDoc(j, byJob.get(j._id.toString()) ?? 0));
  } catch (err) {
    console.error("[company] listOpenings failed:", err);
    return [];
  }
}

export interface OpeningInput {
  role: string;
  type: string;
  location: string;
  salary: string;
  experience: string;
  requiredSkills: string[];
  niceToHave: string[];
  description: string;
  remote: boolean;
}

export async function createOpening(companyUserId: string, company: string, input: OpeningInput): Promise<string | null> {
  if (!ObjectId.isValid(companyUserId)) return null;
  try {
    const db = await getDb();
    const now = new Date();
    const res = await db.collection("jobPostings").insertOne({
      companyId: new ObjectId(companyUserId),
      company: String(company),
      role: String(input.role),
      type: String(input.type),
      location: String(input.location),
      salary: String(input.salary),
      experience: String(input.experience),
      requiredSkills: input.requiredSkills.map(String),
      niceToHave: input.niceToHave.map(String),
      description: String(input.description),
      remote: Boolean(input.remote),
      status: "open",
      postedAt: now,
      createdAt: now,
    });
    return res.insertedId.toString();
  } catch (err) {
    console.error("[company] createOpening failed:", err);
    return null;
  }
}

// ── Candidates ──────────────────────────────────────────────────

export interface CandidateView {
  studentId: string;
  name: string;
  targetRole: string;
  institution: string;
  readiness: number;
  verifiedSkills: number;
  score: number;
  matched: string[];
  missing: string[];
  application: { id: string; status: string; appliedAt: string } | null;
}

/** Every student ranked by compatibility with one of the company's openings. */
export async function getCandidatesForOpening(companyUserId: string, jobId: string): Promise<{ opening: OpeningView; candidates: CandidateView[] } | null> {
  if (!ObjectId.isValid(companyUserId) || !ObjectId.isValid(jobId)) return null;
  try {
    const db = await getDb();
    const job = await db.collection("jobPostings").findOne({ _id: new ObjectId(jobId), companyId: new ObjectId(companyUserId) });
    if (!job) return null;
    const opening = openingFromDoc(job);

    const [profiles, applications] = await Promise.all([
      db.collection("studentProfiles").find({}).toArray(),
      db.collection("jobApplications").find({ jobId: job._id }).toArray(),
    ]);
    const ids = profiles.map((p) => p.userId as ObjectId).filter(Boolean);
    const [users, analytics] = await Promise.all([
      db.collection("users").find({ _id: { $in: ids }, role: "student" }).project({ name: 1, email: 1 }).toArray(),
      db.collection("studentAnalytics").find({ studentId: { $in: ids } }).project({ studentId: 1, readiness: 1 }).toArray(),
    ]);
    const userById = new Map(users.map((u) => [u._id.toString(), u]));
    const readiness = new Map(analytics.map((a) => [String(a.studentId), Number(a.readiness) || 0]));
    const appByStudent = new Map(applications.map((a) => [String(a.studentId), a]));

    const candidates = profiles
      .filter((p) => userById.has(String(p.userId)))
      .map((p) => {
        const k = String(p.userId);
        const u = userById.get(k)!;
        const skills = (Array.isArray(p.skills) ? p.skills : []).map((s: Record<string, unknown>) => ({
          name: str(s?.name), level: Number(s?.level) || 0, verified: Boolean(s?.verified),
        })).filter((s: { name: string }) => s.name);
        const goals = (p.goals ?? {}) as Record<string, unknown>;
        const app = appByStudent.get(k);
        return {
          studentId: k,
          name: str(p.displayName) || str(u.name) || str(u.email),
          targetRole: str(goals.careerTitle) || str(p.targetRole) || "—",
          institution: str(p.institution),
          readiness: readiness.get(k) ?? 0,
          verifiedSkills: skills.filter((s: { verified: boolean }) => s.verified).length,
          ...scoreAgainst(skills, opening.requiredSkills, opening.niceToHave),
          application: app ? { id: app._id.toString(), status: str(app.status), appliedAt: iso(app.createdAt) } : null,
        };
      })
      .sort((a, b) => Number(!!b.application) - Number(!!a.application) || b.score - a.score);

    return { opening, candidates };
  } catch (err) {
    console.error("[company] getCandidatesForOpening failed:", err);
    return null;
  }
}

/** Moves an applicant through the pipeline — only for the company's own openings. */
export async function updateApplicationStatus(companyUserId: string, applicationId: string, status: CompanyApplicationStatus): Promise<boolean> {
  if (!ObjectId.isValid(companyUserId) || !ObjectId.isValid(applicationId)) return false;
  try {
    const db = await getDb();
    const app = await db.collection("jobApplications").findOne({ _id: new ObjectId(applicationId) });
    if (!app) return false;
    const job = await db.collection("jobPostings").findOne({ _id: app.jobId, companyId: new ObjectId(companyUserId) });
    if (!job) return false;
    await db.collection("jobApplications").updateOne({ _id: app._id }, { $set: { status: String(status), updatedAt: new Date() } });
    return true;
  } catch (err) {
    console.error("[company] updateApplicationStatus failed:", err);
    return false;
  }
}

// ── Programs ────────────────────────────────────────────────────

export interface ProgramView {
  id: string;
  title: string;
  type: string;
  skills: string[];
  duration: string;
  mode: string;
  seats: number;
  startsAt: string;
}

export async function listPrograms(companyUserId: string): Promise<ProgramView[]> {
  if (!ObjectId.isValid(companyUserId)) return [];
  try {
    const db = await getDb();
    const rows = await db.collection("industryPrograms").find({ companyId: new ObjectId(companyUserId) }).sort({ startsAt: 1 }).toArray();
    return rows.map((p) => ({
      id: p._id.toString(), title: str(p.title), type: str(p.type), skills: strArr(p.skills),
      duration: str(p.duration), mode: str(p.mode), seats: Number(p.seats) || 0, startsAt: iso(p.startsAt),
    }));
  } catch (err) {
    console.error("[company] listPrograms failed:", err);
    return [];
  }
}

export interface ProgramInput {
  title: string;
  type: string;
  skills: string[];
  duration: string;
  mode: string;
  seats: number;
  startsAt: string;
}

export async function createProgram(companyUserId: string, company: string, input: ProgramInput): Promise<boolean> {
  if (!ObjectId.isValid(companyUserId)) return false;
  try {
    const db = await getDb();
    await db.collection("industryPrograms").insertOne({
      companyId: new ObjectId(companyUserId),
      company: String(company),
      title: String(input.title),
      type: String(input.type),
      skills: input.skills.map(String),
      duration: String(input.duration),
      mode: String(input.mode),
      seats: Number(input.seats) || 0,
      startsAt: new Date(input.startsAt),
      createdAt: new Date(),
    });
    return true;
  } catch (err) {
    console.error("[company] createProgram failed:", err);
    return false;
  }
}

// ── Dashboard ───────────────────────────────────────────────────

export interface CompanyDashboard {
  company: CompanyContext;
  kpis: { openings: number; applicants: number; shortlisted: number; offers: number; programs: number; collaborations: number; facultyInterest: number };
  pipeline: { status: string; count: number }[];
  openings: OpeningView[];
  recentApplicants: { id: string; name: string; role: string; status: string; appliedAt: string; score: number }[];
  topDemand: { skill: string; openings: number }[];
}

export async function getCompanyDashboard(companyUserId: string): Promise<CompanyDashboard | null> {
  const company = await getCompanyContext(companyUserId);
  if (!company) return null;
  try {
    const db = await getDb();
    const companyId = new ObjectId(companyUserId);
    const openings = await listOpenings(companyUserId);
    const jobIds = openings.map((o) => new ObjectId(o.id));
    const [applications, programs, collaborations, interests] = await Promise.all([
      db.collection("jobApplications").find({ jobId: { $in: jobIds } }).sort({ createdAt: -1 }).toArray(),
      db.collection("industryPrograms").countDocuments({ companyId }),
      db.collection("collaborations").find({ companyId }).project({ _id: 1 }).toArray(),
      db.collection("collaborationInterests").find({}).project({ collaborationId: 1 }).toArray(),
    ]);
    const collabIds = new Set(collaborations.map((c) => c._id.toString()));
    const facultyInterest = interests.filter((i) => collabIds.has(String(i.collaborationId))).length;

    const pipelineCounts = new Map<string, number>();
    for (const a of applications) pipelineCounts.set(str(a.status) || "Applied", (pipelineCounts.get(str(a.status) || "Applied") ?? 0) + 1);
    const pipeline = APPLICATION_STATUSES.filter((s) => pipelineCounts.has(s)).map((status) => ({ status, count: pipelineCounts.get(status)! }));

    // Recent applicants with a compatibility score against the job they applied to.
    const recent = applications.slice(0, 8);
    const studentIds = recent.map((a) => a.studentId as ObjectId);
    const [profiles, users] = await Promise.all([
      db.collection("studentProfiles").find({ userId: { $in: studentIds } }).toArray(),
      db.collection("users").find({ _id: { $in: studentIds } }).project({ name: 1, email: 1 }).toArray(),
    ]);
    const profileBy = new Map(profiles.map((p) => [String(p.userId), p]));
    const userBy = new Map(users.map((u) => [u._id.toString(), u]));
    const openingBy = new Map(openings.map((o) => [o.id, o]));
    const recentApplicants = recent.map((a) => {
      const p = profileBy.get(String(a.studentId));
      const u = userBy.get(String(a.studentId));
      const o = openingBy.get(String(a.jobId));
      const skills = (Array.isArray(p?.skills) ? p!.skills : []).map((s: Record<string, unknown>) => ({ name: str(s?.name), level: Number(s?.level) || 0, verified: Boolean(s?.verified) }));
      return {
        id: a._id.toString(),
        name: str(p?.displayName) || str(u?.name) || str(u?.email) || "Student",
        role: o?.role ?? str(a.role),
        status: str(a.status),
        appliedAt: iso(a.createdAt),
        score: o ? scoreAgainst(skills, o.requiredSkills, o.niceToHave).score : 0,
      };
    });

    const demand = new Map<string, number>();
    for (const o of openings) for (const s of o.requiredSkills) demand.set(s, (demand.get(s) ?? 0) + 1);
    const topDemand = Array.from(demand, ([skill, n]) => ({ skill, openings: n })).sort((a, b) => b.openings - a.openings).slice(0, 8);

    return {
      company,
      kpis: {
        openings: openings.filter((o) => o.status === "open").length,
        applicants: applications.length,
        shortlisted: applications.filter((a) => /shortlist|interview/i.test(str(a.status))).length,
        offers: applications.filter((a) => /offer|selected/i.test(str(a.status))).length,
        programs,
        collaborations: collaborations.length,
        facultyInterest,
      },
      pipeline,
      openings,
      recentApplicants,
      topDemand,
    };
  } catch (err) {
    console.error("[company] getCompanyDashboard failed:", err);
    return null;
  }
}
