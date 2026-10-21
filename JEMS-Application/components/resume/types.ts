/** Resume builder data model, seeded from the demo student profile. */

export type ProficiencyLevel =
  | "Beginner"
  | "Intermediate"
  | "Advanced"
  | "Expert";

export interface HeaderInfo {
  fullName: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  portfolio: string;
  linkedin: string;
}

export interface ExperienceItem {
  id: string;
  company: string;
  jobTitle: string;
  start: string;
  end: string;
  current: boolean;
  description: string;
}

export interface EducationItem {
  id: string;
  school: string;
  degree: string;
  field: string;
  gradDate: string;
  description: string;
}

export interface SkillItem {
  id: string;
  name: string;
  level: ProficiencyLevel;
  /** Earned by passing a JEMS roadmap quiz (graded server-side). */
  verified?: boolean;
}

/**
 * What the platform has verified about the student — offered to the builder
 * as a one-click import so the resume reflects the digital portfolio.
 */
export interface JemsImport {
  skills: { name: string; level: number; verified: boolean }[];
  certificates: { id: string; title: string; issuer: string; issuedAt: string }[];
  projects: { id: string; title: string; description: string; tech: string[] }[];
}

export interface CertItem {
  id: string;
  name: string;
  org: string;
  issueDate: string;
  expDate: string;
}

export interface ProjectItem {
  id: string;
  name: string;
  description: string;
  tech: string;
  link: string;
}

export interface ResumeData {
  header: HeaderInfo;
  summary: string;
  experience: ExperienceItem[];
  education: EducationItem[];
  skills: SkillItem[];
  certifications: CertItem[];
  projects: ProjectItem[];
}

export interface ResumeVersion {
  id: string;
  name: string;
  data: ResumeData;
}

/** Keys of ResumeData whose values are reorderable lists. */
export type ListKey =
  | "experience"
  | "education"
  | "skills"
  | "certifications"
  | "projects";

export const PROFICIENCY: ProficiencyLevel[] = [
  "Beginner",
  "Intermediate",
  "Advanced",
  "Expert",
];

let counter = 0;
export function uid(prefix = "id"): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

export const blankExperience = (): ExperienceItem => ({
  id: uid("exp"),
  company: "",
  jobTitle: "",
  start: "",
  end: "",
  current: false,
  description: "",
});

export const blankEducation = (): EducationItem => ({
  id: uid("edu"),
  school: "",
  degree: "",
  field: "",
  gradDate: "",
  description: "",
});

export const blankSkill = (): SkillItem => ({
  id: uid("skill"),
  name: "",
  level: "Intermediate",
});

export const blankCert = (): CertItem => ({
  id: uid("cert"),
  name: "",
  org: "",
  issueDate: "",
  expDate: "",
});

export const blankProject = (): ProjectItem => ({
  id: uid("proj"),
  name: "",
  description: "",
  tech: "",
  link: "",
});

export function emptyResume(): ResumeData {
  return {
    header: {
      fullName: "",
      title: "",
      email: "",
      phone: "",
      location: "",
      portfolio: "",
      linkedin: "",
    },
    summary: "",
    experience: [],
    education: [],
    skills: [],
    certifications: [],
    projects: [],
  };
}

/** Seed data — fixed ids so SSR and client hydration match. */
export const INITIAL_RESUME: ResumeData = {
  header: {
    fullName: "Alex Kumar",
    title: "Frontend Developer",
    email: "student@test.com",
    phone: "+91 98765 43210",
    location: "Bengaluru, India",
    portfolio: "alexkumar.dev",
    linkedin: "linkedin.com/in/alexkumar",
  },
  summary:
    "Frontend developer with a strong foundation in React and TypeScript, focused on building accessible, performant web interfaces. Eager to grow into a product-focused engineering role.",
  experience: [
    {
      id: "exp-seed-1",
      company: "BrightApps Studio",
      jobTitle: "Frontend Developer Intern",
      start: "2024-01",
      end: "2024-08",
      current: false,
      description:
        "Built and shipped 12+ reusable React components. Improved Lighthouse performance score from 71 to 94 and reduced bundle size by 28%.",
    },
    {
      id: "exp-seed-2",
      company: "Freelance",
      jobTitle: "Web Developer",
      start: "2023-03",
      end: "",
      current: true,
      description:
        "Deliver responsive marketing sites for small businesses using Next.js and Tailwind CSS.",
    },
  ],
  education: [
    {
      id: "edu-seed-1",
      school: "PES University",
      degree: "B.Tech",
      field: "Computer Science",
      gradDate: "2025-05",
      description: "",
    },
  ],
  skills: [
    { id: "skill-seed-1", name: "React", level: "Advanced" },
    { id: "skill-seed-2", name: "JavaScript", level: "Advanced" },
    { id: "skill-seed-3", name: "TypeScript", level: "Intermediate" },
    { id: "skill-seed-4", name: "CSS / Tailwind", level: "Advanced" },
    { id: "skill-seed-5", name: "Node.js", level: "Beginner" },
  ],
  certifications: [
    {
      id: "cert-seed-1",
      name: "Meta Front-End Developer",
      org: "Coursera",
      issueDate: "2024-02",
      expDate: "",
    },
  ],
  projects: [
    {
      id: "proj-seed-1",
      name: "DevBoard",
      description:
        "A kanban board for developers with offline support and keyboard-first navigation.",
      tech: "React, TypeScript, IndexedDB",
      link: "github.com/alexkumar/devboard",
    },
  ],
};

export interface AtsResult {
  score: number;
  tone: "good" | "warn";
  suggestion: string;
}

/** Lightweight, real-time ATS heuristic (0–100) with one suggestion. */
export function atsScore(d: ResumeData): AtsResult {
  let score = 0;
  const h = d.header;

  // Contact completeness (max 25)
  for (const v of [h.fullName, h.title, h.email, h.phone, h.location]) {
    if (v.trim()) score += 5;
  }

  // Summary (max 15)
  const sum = d.summary.trim().length;
  if (sum >= 120) score += 15;
  else if (sum >= 40) score += 8;

  // Experience (max 30)
  const exp = d.experience.filter((e) => e.company.trim() && e.jobTitle.trim());
  score += Math.min(exp.length, 3) * 10;

  // Education (max 10)
  if (d.education.some((e) => e.school.trim())) score += 10;

  // Skills (max 15)
  const skills = d.skills.filter((s) => s.name.trim()).length;
  score += Math.min(skills * 2, 15);

  // Extras (max 5)
  if (
    d.projects.some((p) => p.name.trim()) ||
    d.certifications.some((c) => c.name.trim())
  ) {
    score += 5;
  }

  score = Math.min(100, Math.round(score));

  let suggestion = "Looking great — your resume is well-rounded.";
  if (skills < 8) suggestion = `Add ${8 - skills} more skills to improve keyword match.`;
  else if (sum < 120) suggestion = "Expand your summary to 2–3 sentences.";
  else if (exp.length < 2) suggestion = "Add another experience entry for stronger impact.";
  else if (!d.projects.some((p) => p.name.trim())) suggestion = "Add a project to showcase your work.";

  return { score, tone: score >= 75 ? "good" : "warn", suggestion };
}

export function reorder<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
