/**
 * Shapes shared by the agent engine, its persistence layer and the UI.
 * Everything here is plain JSON so an analysis can be stored and replayed.
 */

export type AgentId =
  | "analysis"
  | "roadmap"
  | "learning"
  | "assessment"
  | "matching"
  | "collaboration";

export interface AgentMeta {
  id: AgentId;
  name: string;
  role: string;
  /** What the agent consumes / produces — shown on the orchestration panel. */
  inputs: string[];
  outputs: string[];
}

export const AGENTS: AgentMeta[] = [
  { id: "analysis", name: "Analysis Agent", role: "Profile + company analysis", inputs: ["Student profile", "Company requirements"], outputs: ["Skill profile", "Gaps", "Compatibility"] },
  { id: "roadmap", name: "Roadmap Agent", role: "Skill gap → roadmap", inputs: ["Skill gaps", "Career path"], outputs: ["Personalised roadmap", "Milestones"] },
  { id: "learning", name: "Learning Agent", role: "Resources & training", inputs: ["Skill gaps"], outputs: ["Courses", "Certifications", "Workshops"] },
  { id: "assessment", name: "Assessment Agent", role: "Skill validation", inputs: ["Skill gaps", "Quiz results"], outputs: ["Verification plan", "Verified skills"] },
  { id: "matching", name: "Matching Agent", role: "Job / internship matching", inputs: ["Verified skills", "Openings"], outputs: ["Ranked opportunities"] },
  { id: "collaboration", name: "Collaboration Agent", role: "Industry ↔ academia", inputs: ["Gaps", "Programs"], outputs: ["Mentorship", "Workshops", "Guest lectures"] },
];

// ── Inputs (a snapshot of the student + the market) ─────────────

export interface SkillInput {
  name: string;
  level: number;
  verified?: boolean;
}

export interface JobInput {
  id: string;
  role: string;
  company: string;
  type: string;
  location: string;
  salary?: string;
  experience?: string;
  requiredSkills: string[];
  niceToHave: string[];
}

export interface ProgramInput {
  id: string;
  company: string;
  title: string;
  type: string;
  skills: string[];
  duration: string;
  mode: string;
}

export interface CollaborationInput {
  id: string;
  company: string;
  title: string;
  type: string;
  domain: string[];
  startsAt: string;
}

export interface AnalysisInput {
  student: {
    name: string;
    targetRole: string;
    careerPath: string;
    targetCompany: string;
    experienceLevel: string;
    skills: SkillInput[];
    passedModules: number[];
  };
  jobs: JobInput[];
  programs: ProgramInput[];
  collaborations: CollaborationInput[];
}

// ── Outputs ─────────────────────────────────────────────────────

export interface SkillProfileEntry {
  skill: string;
  /** 0–100, how much of the demand this skill accounts for. */
  demand: number;
  level: number;
  verified: boolean;
}

export interface AnalysisOutput {
  targetRole: string;
  targetCompany: string;
  compatibility: number;
  strengths: SkillProfileEntry[];
  developing: SkillProfileEntry[];
  gaps: SkillProfileEntry[];
  extras: string[];
  jobsAnalysed: number;
}

export interface RoadmapOutput {
  careerPath: string;
  title: string;
  estimatedDuration: string;
  milestones: {
    moduleId: number;
    title: string;
    phase: string;
    weeks: number;
    covers: string[];
    difficulty: string;
    done: boolean;
  }[];
  totalWeeks: number;
}

export interface LearningOutput {
  recommendations: {
    id: string;
    title: string;
    company: string;
    type: string;
    duration: string;
    mode: string;
    covers: string[];
    score: number;
  }[];
}

export interface AssessmentOutput {
  plan: {
    skill: string;
    moduleId: number | null;
    moduleTitle: string | null;
    status: "verified" | "pending" | "no-module";
    /** Skill-test bank key when the Assessment Agent can test it directly. */
    test: string | null;
  }[];
  verifiedCount: number;
  pendingCount: number;
}

export interface MatchingOutput {
  matches: {
    jobId: string;
    role: string;
    company: string;
    type: string;
    location: string;
    salary?: string;
    score: number;
    matched: string[];
    missing: string[];
  }[];
  internships: number;
  jobs: number;
}

export interface CollaborationOutput {
  suggestions: {
    id: string;
    title: string;
    company: string;
    type: string;
    reason: string;
    startsAt: string;
  }[];
}

export interface AgentRun {
  id: AgentId;
  status: "done";
  /** Human-readable trace of what the agent did, in order. */
  logs: string[];
  /** One-line result summary for the orchestration panel. */
  summary: string;
  /** Simulated processing time, used by the UI to pace the animation. */
  durationMs: number;
}

export interface AnalysisResult {
  version: 1;
  generatedAt: string;
  /** "simulated" until an LLM provider is wired in (see lib/agents/llm.ts). */
  provider: string;
  runs: AgentRun[];
  analysis: AnalysisOutput;
  roadmap: RoadmapOutput;
  learning: LearningOutput;
  assessment: AssessmentOutput;
  matching: MatchingOutput;
  collaboration: CollaborationOutput;
}
