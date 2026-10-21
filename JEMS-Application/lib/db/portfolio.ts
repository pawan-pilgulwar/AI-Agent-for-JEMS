import { ObjectId, type Db } from "mongodb";
import { getDatabase } from "@/lib/db/mongodb";
import { findModule, getRoadmap, isCareerPath } from "@/lib/roadmap/data";

/**
 * Digital portfolio: the student's employability record assembled from what
 * the platform has actually verified — module quizzes passed, skills credited,
 * projects completed — plus applications, achievements and profile links.
 */

export interface PortfolioSkill {
  name: string;
  level: number;
  verified: boolean;
  source?: string;
}

export interface PortfolioCertificate {
  id: string;
  title: string;
  issuer: string;
  careerPath: string;
  moduleId: number;
  skills: string[];
  issuedAt: string;
}

export interface PortfolioProject {
  id: string;
  title: string;
  description: string;
  tech: string[];
  source: "roadmap" | "resume";
  link?: string;
}

export interface PortfolioExperience {
  id: string;
  title: string;
  company: string;
  kind: "internship" | "job" | "offer";
  status: string;
  date: string;
}

export interface Portfolio {
  id: string;
  name: string;
  headline: string;
  location: string;
  institution: string;
  bio: string;
  avatar: string;
  links: { label: string; href: string }[];
  targetRole: string;
  readiness: number;
  skills: PortfolioSkill[];
  certificates: PortfolioCertificate[];
  projects: PortfolioProject[];
  experience: PortfolioExperience[];
  achievements: string[];
  softSkills: { key: string; label: string; value: number }[];
  stats: { verifiedSkills: number; modulesPassed: number; applications: number };
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");

async function getDb(): Promise<Db> {
  return getDatabase();
}

export async function getPortfolio(userId: string): Promise<Portfolio | null> {
  if (!ObjectId.isValid(userId)) return null;
  try {
    const db = await getDb();
    const _id = new ObjectId(userId);
    const [user, profileDoc, progressDocs, analytics, applications, resume] = await Promise.all([
      db.collection("users").findOne({ _id, role: "student" }),
      db.collection("studentProfiles").findOne({ userId: _id }),
      db.collection("roadmapProgress").find({ studentId: _id }).toArray(),
      db.collection("studentAnalytics").findOne({ studentId: _id }),
      db.collection("jobApplications").find({ studentId: _id }).sort({ createdAt: -1 }).toArray(),
      db.collection("resumes").findOne({ studentId: _id }),
    ]);
    if (!user) return null;
    const p = (profileDoc ?? {}) as Record<string, unknown>;
    const goals = (p.goals ?? {}) as Record<string, unknown>;
    const name = str(p.displayName) || str(user.name) || str(user.email).split("@")[0];
    const targetRole = str(goals.careerTitle) || str(p.targetRole) || "Student";

    const skills: PortfolioSkill[] = Array.isArray(p.skills)
      ? p.skills
          .map((s: unknown) => {
            const o = (s ?? {}) as Record<string, unknown>;
            return { name: str(o.name), level: Number(o.level) || 0, verified: Boolean(o.verified), source: str(o.source) || undefined };
          })
          .filter((s) => s.name)
          .sort((a, b) => Number(b.verified) - Number(a.verified) || b.level - a.level)
      : [];

    // One certificate + one project per passed roadmap module.
    const certificates: PortfolioCertificate[] = [];
    const projects: PortfolioProject[] = [];
    for (const doc of progressDocs) {
      const careerPath = str(doc.careerPath);
      if (!isCareerPath(careerPath)) continue;
      const roadmap = getRoadmap(careerPath);
      const passed: number[] = Array.isArray(doc.passedModules) ? doc.passedModules.map(Number) : [];
      const issuedAt = doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : new Date().toISOString();
      for (const moduleId of passed) {
        const mod = findModule(roadmap, moduleId);
        if (!mod) continue;
        certificates.push({
          id: `${careerPath}-${moduleId}`,
          title: mod.title,
          issuer: `JEMS · ${roadmap.targetRole} path`,
          careerPath,
          moduleId,
          skills: mod.skills,
          issuedAt,
        });
        const proj = mod.resources.find((r) => r.type === "project");
        projects.push({
          id: `rm-${careerPath}-${moduleId}`,
          title: proj?.title ?? `${mod.title} project`,
          description: `Hands-on project completed as part of "${mod.title}" (${mod.difficulty}).`,
          tech: mod.skills,
          source: "roadmap",
        });
      }
    }

    // Projects the student described on a resume version, if any.
    const resumeData = ((resume?.versions as { data?: Record<string, unknown> }[] | undefined)?.[0]?.data ?? {}) as Record<string, unknown>;
    if (Array.isArray(resumeData.projects)) {
      for (const pr of resumeData.projects as Record<string, unknown>[]) {
        if (!str(pr.name)) continue;
        projects.push({
          id: `rs-${str(pr.id) || str(pr.name)}`,
          title: str(pr.name),
          description: str(pr.description),
          tech: str(pr.tech).split(",").map((t) => t.trim()).filter(Boolean),
          source: "resume",
          link: str(pr.link) || undefined,
        });
      }
    }

    const experience: PortfolioExperience[] = applications.map((a) => {
      const status = str(a.status);
      const role = str(a.role);
      const kind: PortfolioExperience["kind"] = /offer|selected/i.test(status)
        ? "offer"
        : /intern|apprentice/i.test(role)
          ? "internship"
          : "job";
      return {
        id: a._id.toString(),
        title: role || "Application",
        company: str(a.company),
        kind,
        status,
        date: a.createdAt instanceof Date ? a.createdAt.toISOString() : "",
      };
    });

    const links: Portfolio["links"] = [];
    if (str(p.website)) links.push({ label: "Website", href: str(p.website).startsWith("http") ? str(p.website) : `https://${str(p.website)}` });
    if (str(p.github)) links.push({ label: "GitHub", href: str(p.github) });
    if (str(p.linkedin)) links.push({ label: "LinkedIn", href: str(p.linkedin) });

    const a = (analytics ?? {}) as Record<string, unknown>;
    return {
      id: userId,
      name,
      headline: targetRole ? `Aspiring ${targetRole}` : "Student",
      location: str(p.location),
      institution: str(p.institution),
      bio: str(p.bio),
      avatar: str(p.avatar) || str(user.image),
      links,
      targetRole,
      readiness: Number(a.readiness) || 0,
      skills,
      certificates,
      projects,
      experience,
      achievements: Array.isArray(a.achievements) ? a.achievements.map(String) : [],
      softSkills: (() => {
        const soft = (p.softSkills ?? null) as Record<string, unknown> | null;
        if (!soft) return [];
        const labels: Record<string, string> = { communication: "Communication", teamwork: "Teamwork", problemSolving: "Problem solving", adaptability: "Adaptability", leadership: "Leadership & ownership" };
        return Object.entries(labels).map(([key, label]) => ({ key, label, value: Number(soft[key]) || 0 }));
      })(),
      stats: {
        verifiedSkills: skills.filter((s) => s.verified).length,
        modulesPassed: certificates.length,
        applications: applications.length,
      },
    };
  } catch (err) {
    console.error("[portfolio] getPortfolio failed:", err);
    return null;
  }
}
