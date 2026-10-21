import { ObjectId, type Db } from "mongodb";
import { getDatabase } from "@/lib/db/mongodb";

/**
 * Institution (admin) analytics: aggregates across the institution's students
 * so placement cells can monitor skill development, internship participation
 * and placement readiness — the diagram's "Dashboards & Analytics" box.
 */

export interface InstitutionDashboard {
  institution: string;
  kpis: {
    students: number;
    withGoals: number;
    avgReadiness: number;
    modulesPassed: number;
    verifiedSkills: number;
    applications: number;
    internshipApplications: number;
    offers: number;
    placementRate: number;
  };
  readinessBuckets: { label: string; count: number }[];
  applicationsByStatus: { status: string; count: number }[];
  targetRoles: { role: string; count: number }[];
  /** Industry demand vs cohort coverage — the skill-gap statistics. */
  skillGaps: { skill: string; demand: number; coverage: number; gap: number }[];
  /** Skills most requested across current openings. */
  demandTrends: { skill: string; openings: number }[];
  collaborations: { title: string; company: string; type: string; startsAt: string; interested: number }[];
  students: {
    id: string;
    name: string;
    targetRole: string;
    readiness: number;
    verifiedSkills: number;
    modulesPassed: number;
    applications: number;
    bestStatus: string;
  }[];
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const norm = (s: string) => s.trim().toLowerCase();
const STATUS_RANK = ["Rejected", "Applied", "In review", "Shortlisted", "Interview", "Offer", "Selected"];

async function getDb(): Promise<Db> {
  return getDatabase();
}

export async function getInstitutionDashboard(userId: string): Promise<InstitutionDashboard | null> {
  if (!ObjectId.isValid(userId)) return null;
  try {
    const db = await getDb();
    const inst = await db.collection("institutionProfiles").findOne({ userId: new ObjectId(userId) });
    const institution = str(inst?.institutionName) || "Your institution";

    // Students of this institution (fall back to all students for the demo).
    let profiles = await db.collection("studentProfiles").find({ institution }).toArray();
    if (profiles.length === 0) profiles = await db.collection("studentProfiles").find({}).toArray();
    const ids = profiles.map((p) => p.userId as ObjectId).filter(Boolean);

    const [users, progress, analytics, applications, jobs, collaborations, interests] = await Promise.all([
      db.collection("users").find({ _id: { $in: ids } }).project({ name: 1, email: 1 }).toArray(),
      db.collection("roadmapProgress").find({ studentId: { $in: ids } }).toArray(),
      db.collection("studentAnalytics").find({ studentId: { $in: ids } }).toArray(),
      db.collection("jobApplications").find({ studentId: { $in: ids } }).toArray(),
      db.collection("jobPostings").find({ status: { $ne: "closed" } }).toArray(),
      db.collection("collaborations").find({}).sort({ startsAt: 1 }).limit(6).toArray(),
      db.collection("collaborationInterests").find({}).toArray(),
    ]);
    const userById = new Map(users.map((u) => [u._id.toString(), u]));
    const readinessById = new Map(analytics.map((a) => [String(a.studentId), Number(a.readiness) || 0]));
    const jobById = new Map(jobs.map((j) => [j._id.toString(), j]));
    const passedById = new Map<string, number>();
    for (const p of progress) {
      const k = String(p.studentId);
      passedById.set(k, (passedById.get(k) ?? 0) + (Array.isArray(p.passedModules) ? p.passedModules.length : 0));
    }
    const appsById = new Map<string, typeof applications>();
    for (const a of applications) {
      const k = String(a.studentId);
      appsById.set(k, [...(appsById.get(k) ?? []), a]);
    }

    // ── Per-student rows ──
    const students = profiles.map((p) => {
      const k = String(p.userId);
      const u = userById.get(k);
      const skills = Array.isArray(p.skills) ? p.skills : [];
      const apps = appsById.get(k) ?? [];
      const best = apps.map((a) => str(a.status)).sort((a, b) => STATUS_RANK.indexOf(b) - STATUS_RANK.indexOf(a))[0] ?? "—";
      const goals = (p.goals ?? {}) as Record<string, unknown>;
      return {
        id: k,
        name: str(p.displayName) || str(u?.name) || str(u?.email) || "Student",
        targetRole: str(goals.careerTitle) || str(p.targetRole) || "—",
        readiness: readinessById.get(k) ?? 0,
        verifiedSkills: skills.filter((s: { verified?: unknown }) => Boolean(s?.verified)).length,
        modulesPassed: passedById.get(k) ?? 0,
        applications: apps.length,
        bestStatus: best,
      };
    }).sort((a, b) => b.readiness - a.readiness);

    // ── KPIs ──
    const n = students.length;
    const withGoals = profiles.filter((p) => p.goals && typeof p.goals === "object").length;
    const avgReadiness = n ? Math.round(students.reduce((s, x) => s + x.readiness, 0) / n) : 0;
    const modulesPassed = students.reduce((s, x) => s + x.modulesPassed, 0);
    const verifiedSkills = students.reduce((s, x) => s + x.verifiedSkills, 0);
    const offers = applications.filter((a) => /offer|selected/i.test(str(a.status))).length;
    const internshipApplications = applications.filter((a) => {
      const j = jobById.get(String(a.jobId));
      return /intern|apprentice/i.test(str(j?.type)) || /intern|apprentice/i.test(str(a.role));
    }).length;
    const placedStudents = new Set(applications.filter((a) => /offer|selected/i.test(str(a.status))).map((a) => String(a.studentId))).size;

    const readinessBuckets = [
      { label: "0–39%", count: students.filter((s) => s.readiness < 40).length },
      { label: "40–59%", count: students.filter((s) => s.readiness >= 40 && s.readiness < 60).length },
      { label: "60–79%", count: students.filter((s) => s.readiness >= 60 && s.readiness < 80).length },
      { label: "80–100%", count: students.filter((s) => s.readiness >= 80).length },
    ];

    const statusCounts = new Map<string, number>();
    for (const a of applications) statusCounts.set(str(a.status) || "Applied", (statusCounts.get(str(a.status) || "Applied") ?? 0) + 1);
    const applicationsByStatus = STATUS_RANK.filter((s) => statusCounts.has(s)).map((status) => ({ status, count: statusCounts.get(status)! }));

    const roleCounts = new Map<string, number>();
    for (const s of students) roleCounts.set(s.targetRole, (roleCounts.get(s.targetRole) ?? 0) + 1);
    const targetRoles = Array.from(roleCounts, ([role, count]) => ({ role, count })).sort((a, b) => b.count - a.count).slice(0, 8);

    // ── Skill demand vs cohort coverage ──
    const demand = new Map<string, { skill: string; openings: number }>();
    for (const j of jobs) {
      for (const s of (Array.isArray(j.requiredSkills) ? j.requiredSkills : []) as string[]) {
        const k = norm(s);
        const cur = demand.get(k) ?? { skill: s, openings: 0 };
        cur.openings += 1;
        demand.set(k, cur);
      }
    }
    const demandTrends = Array.from(demand.values()).sort((a, b) => b.openings - a.openings).slice(0, 10);
    const skillGaps = demandTrends.map((d) => {
      // Coverage counts *verified* skills only — claims don't close a gap.
      const have = profiles.filter((p) => (Array.isArray(p.skills) ? p.skills : []).some((s: { name?: unknown; verified?: unknown }) => Boolean(s?.verified) && norm(str(s?.name)) === norm(d.skill))).length;
      const coverage = n ? Math.round((have / n) * 100) : 0;
      return { skill: d.skill, demand: d.openings, coverage, gap: 100 - coverage };
    }).sort((a, b) => b.gap * b.demand - a.gap * a.demand);

    const interestCount = new Map<string, number>();
    for (const i of interests) interestCount.set(String(i.collaborationId), (interestCount.get(String(i.collaborationId)) ?? 0) + 1);

    return {
      institution,
      kpis: {
        students: n, withGoals, avgReadiness, modulesPassed, verifiedSkills,
        applications: applications.length, internshipApplications, offers,
        placementRate: n ? Math.round((placedStudents / n) * 100) : 0,
      },
      readinessBuckets,
      applicationsByStatus,
      targetRoles,
      skillGaps,
      demandTrends,
      collaborations: collaborations.map((c) => ({
        title: str(c.title), company: str(c.company), type: str(c.type),
        startsAt: c.startsAt instanceof Date ? c.startsAt.toISOString() : "",
        interested: interestCount.get(c._id.toString()) ?? 0,
      })),
      students,
    };
  } catch (err) {
    console.error("[institution] getInstitutionDashboard failed:", err);
    return null;
  }
}
