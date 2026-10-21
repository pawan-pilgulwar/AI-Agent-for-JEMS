/**
 * The multi-agent career analysis engine — rule-based and deterministic.
 *
 * Six agents run in sequence under a tiny orchestrator, each consuming the
 * previous agents' output (the diagram's "Agent Orchestration Layer").
 * Every agent records a log trace so the UI can replay the run step by step.
 * See `llm.ts` for where a real model would plug in.
 */

import { bankFor } from "@/lib/assessment/bank";
import { CAREER_PATHS, allModules, getRoadmap } from "@/lib/roadmap/data";
import { getProvider } from "./llm";
import type {
  AgentRun,
  AnalysisInput,
  AnalysisOutput,
  AnalysisResult,
  AssessmentOutput,
  CollaborationOutput,
  LearningOutput,
  MatchingOutput,
  RoadmapOutput,
  SkillProfileEntry,
} from "./types";

const norm = (s: string) => s.trim().toLowerCase();
const VERIFIED_LEVEL = 60;

// Common spellings that should satisfy the same industry requirement.
const SKILL_ALIASES: Record<string, string[]> = {
  "css / tailwind": ["css3", "css", "tailwind css", "tailwind"],
  "css": ["css3"],
  "css3": ["css"],
  "html": ["html5"],
  "html5": ["html"],
  "js": ["javascript"],
  "javascript": ["es6+", "js"],
  "node": ["node.js"],
  "nodejs": ["node.js"],
  "node.js": ["node", "nodejs"],
  "reactjs": ["react"],
  "react": ["react.js", "reactjs", "hooks"],
  "postgres": ["postgresql", "sql"],
  "postgresql": ["sql"],
  "mysql": ["sql"],
  "ts": ["typescript"],
  "k8s": ["kubernetes"],
  "aws": ["cloud deployment"],
};

/** Every key a student skill can satisfy: itself plus its aliases. */
function expand(skill: string): string[] {
  const k = norm(skill);
  return [k, ...(SKILL_ALIASES[k] ?? [])];
}

/** Map of normalised skill key → the student's skill record (aliases included). */
function ownedMap(skills: AnalysisInput["student"]["skills"]) {
  const owned = new Map<string, AnalysisInput["student"]["skills"][number]>();
  for (const s of skills) for (const key of expand(s.name)) if (!owned.has(key)) owned.set(key, s);
  return owned;
}

/** Words that identify a job as relevant to the student's target role. */
function roleKeywords(targetRole: string): string[] {
  return norm(targetRole)
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !["developer", "engineer", "specialist", "the", "and"].includes(w));
}

// ── 1. Analysis Agent ───────────────────────────────────────────

function runAnalysis(input: AnalysisInput): { out: AnalysisOutput; run: AgentRun } {
  const logs: string[] = [];
  const { student, jobs } = input;
  const targetRole = student.targetRole || "Full Stack Developer";
  logs.push(`Loaded profile: ${student.skills.length} skills, target role "${targetRole}"${student.targetCompany ? `, target company ${student.targetCompany}` : ""}.`);

  // Which openings define "industry requirements" for this student?
  const kw = roleKeywords(targetRole);
  let relevant = jobs.filter((j) => {
    const r = norm(j.role);
    return kw.some((k) => r.includes(k)) || (student.targetCompany && norm(j.company) === norm(student.targetCompany));
  });
  if (relevant.length < 3) relevant = jobs;
  logs.push(`Selected ${relevant.length} of ${jobs.length} openings as requirement sources (${kw.join(", ") || "all roles"}).`);

  // Demand = how many relevant openings ask for each skill (+ the roadmap's own skills).
  const demand = new Map<string, { skill: string; count: number }>();
  const bump = (skill: string, w: number) => {
    const k = norm(skill);
    const cur = demand.get(k) ?? { skill, count: 0 };
    cur.count += w;
    demand.set(k, cur);
  };
  for (const j of relevant) {
    j.requiredSkills.forEach((s) => bump(s, 1));
    j.niceToHave.forEach((s) => bump(s, 0.4));
  }
  const roadmap = getRoadmap(student.careerPath);
  allModules(roadmap).forEach((m) => m.skills.forEach((s) => bump(s, 0.5)));
  const maxCount = Math.max(...Array.from(demand.values()).map((d) => d.count), 1);
  logs.push(`Aggregated ${demand.size} distinct skills required by industry for this role.`);

  const owned = ownedMap(student.skills);
  const strengths: SkillProfileEntry[] = [];
  const developing: SkillProfileEntry[] = [];
  const gaps: SkillProfileEntry[] = [];
  let weightHave = 0;
  let weightTotal = 0;
  // A student skill can satisfy several demand keys via aliases — list it once.
  const listed = new Set<string>();

  for (const d of Array.from(demand.values()).sort((a, b) => b.count - a.count)) {
    const entryDemand = Math.round((d.count / maxCount) * 100);
    const s = owned.get(norm(d.skill));
    weightTotal += d.count;
    if (!s) {
      gaps.push({ skill: d.skill, demand: entryDemand, level: 0, verified: false });
      continue;
    }
    // Assess first: only *verified* skills are strengths. A claimed
    // (self-rated) skill counts half and is listed as "developing" until a
    // skill test or roadmap quiz verifies it.
    const strong = !!s.verified && s.level >= VERIFIED_LEVEL;
    weightHave += strong ? d.count : d.count * 0.5;
    if (listed.has(norm(s.name))) continue;
    listed.add(norm(s.name));
    (strong ? strengths : developing).push({ skill: s.name, demand: entryDemand, level: s.level, verified: !!s.verified });
  }
  const extras = student.skills.filter((s) => !expand(s.name).some((k) => demand.has(k))).map((s) => s.name);
  const compatibility = weightTotal ? Math.round((weightHave / weightTotal) * 100) : 0;

  const unverified = developing.filter((d) => !d.verified).length;
  logs.push(`Compared skills: ${strengths.length} verified strengths, ${developing.length} developing (${unverified} claimed but unverified), ${gaps.length} gaps.`);
  logs.push(`Industry compatibility for "${targetRole}": ${compatibility}%.`);

  return {
    out: { targetRole, targetCompany: student.targetCompany, compatibility, strengths, developing, gaps: gaps.slice(0, 12), extras, jobsAnalysed: relevant.length },
    run: { id: "analysis", status: "done", logs, summary: `${compatibility}% compatible · ${gaps.length} skill gaps found`, durationMs: 1400 },
  };
}

// ── 2. Roadmap Agent ────────────────────────────────────────────

function runRoadmap(input: AnalysisInput, analysis: AnalysisOutput): { out: RoadmapOutput; run: AgentRun } {
  const logs: string[] = [];
  const careerPath = input.student.careerPath;
  const roadmap = getRoadmap(careerPath);
  const gapSet = new Set([...analysis.gaps, ...analysis.developing].map((g) => norm(g.skill)));
  const passed = new Set(input.student.passedModules);
  logs.push(`Using the ${roadmap.targetRole} roadmap (${roadmap.phases.length} phases).`);

  const milestones: RoadmapOutput["milestones"] = [];
  for (const phase of roadmap.phases) {
    for (const m of phase.modules) {
      const covers = m.skills.filter((s) => gapSet.has(norm(s)));
      // Keep modules that close a gap, plus anything already passed (for continuity).
      if (covers.length === 0 && !passed.has(m.id)) continue;
      const weeks = parseInt(m.duration, 10) || 2;
      milestones.push({ moduleId: m.id, title: m.title, phase: phase.title, weeks, covers, difficulty: m.difficulty, done: passed.has(m.id) });
    }
  }
  const pending = milestones.filter((m) => !m.done);
  const totalWeeks = pending.reduce((n, m) => n + m.weeks, 0);
  logs.push(`Prioritised ${pending.length} modules that close gaps; ${milestones.length - pending.length} already passed.`);
  logs.push(`Estimated ${totalWeeks} weeks to close the gaps at the roadmap's pace.`);

  return {
    out: { careerPath, title: roadmap.title, estimatedDuration: roadmap.estimatedDuration, milestones, totalWeeks },
    run: { id: "roadmap", status: "done", logs, summary: `${pending.length} gap-closing modules · ~${totalWeeks} weeks`, durationMs: 1100 },
  };
}

// ── 3. Learning Agent ───────────────────────────────────────────

function runLearning(input: AnalysisInput, analysis: AnalysisOutput): { out: LearningOutput; run: AgentRun } {
  const logs: string[] = [];
  const gapWeight = new Map<string, number>();
  analysis.gaps.forEach((g) => gapWeight.set(norm(g.skill), g.demand));
  analysis.developing.forEach((g) => gapWeight.set(norm(g.skill), g.demand * 0.6));
  logs.push(`Searching ${input.programs.length} industry programs for ${gapWeight.size} target skills.`);

  const recommendations = input.programs
    .map((p) => {
      const covers = p.skills.filter((s) => gapWeight.has(norm(s)));
      const score = covers.reduce((n, s) => n + (gapWeight.get(norm(s)) ?? 0), 0);
      return { id: p.id, title: p.title, company: p.company, type: p.type, duration: p.duration, mode: p.mode, covers, score: Math.round(score) };
    })
    .filter((r) => r.covers.length > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  const types = Array.from(new Set(recommendations.map((r) => r.type)));
  logs.push(`Matched ${recommendations.length} programs (${types.join(", ") || "none"}) to the student's gaps.`);
  if (recommendations[0]) logs.push(`Top pick: "${recommendations[0].title}" by ${recommendations[0].company} — covers ${recommendations[0].covers.join(", ")}.`);

  return {
    out: { recommendations },
    run: { id: "learning", status: "done", logs, summary: `${recommendations.length} programs recommended`, durationMs: 900 },
  };
}

// ── 4. Assessment Agent ─────────────────────────────────────────

function runAssessment(input: AnalysisInput, analysis: AnalysisOutput): { out: AssessmentOutput; run: AgentRun } {
  const logs: string[] = [];
  const roadmap = getRoadmap(input.student.careerPath);
  const modules = allModules(roadmap);
  const passed = new Set(input.student.passedModules);
  const targets = [...analysis.gaps, ...analysis.developing].slice(0, 10);
  logs.push(`Planning verification for ${targets.length} skills via roadmap module quizzes.`);

  const owned = ownedMap(input.student.skills);
  const plan: AssessmentOutput["plan"] = targets.map((t) => {
    const held = owned.get(norm(t.skill));
    if (held?.verified) return { skill: t.skill, moduleId: null, moduleTitle: null, status: "verified" as const, test: null };
    const test = bankFor(t.skill);
    const m = modules.find((mod) => mod.skills.some((s) => norm(s) === norm(t.skill)));
    if (test) return { skill: t.skill, moduleId: m?.id ?? null, moduleTitle: m?.title ?? null, status: "pending" as const, test };
    if (!m) return { skill: t.skill, moduleId: null, moduleTitle: null, status: "no-module" as const, test: null };
    return { skill: t.skill, moduleId: m.id, moduleTitle: m.title, status: passed.has(m.id) ? ("verified" as const) : ("pending" as const), test: null };
  });
  const verifiedCount = input.student.skills.filter((s) => s.verified).length;
  const claimedCount = input.student.skills.filter((s) => !s.verified).length;
  const pendingCount = plan.filter((p) => p.status === "pending").length;
  const tests = plan.filter((p) => p.test).length;
  logs.push(`${verifiedCount} skills verified (skill tests / module quizzes); ${claimedCount} claimed skills still unverified.`);
  logs.push(`Generated a verification plan: ${tests} skill tests available, ${pendingCount - tests} via roadmap module quizzes.`);
  const noModule = plan.filter((p) => p.status === "no-module").length;
  if (noModule) logs.push(`${noModule} skills have no test or module yet — they stay self-declared.`);

  return {
    out: { plan, verifiedCount, pendingCount },
    run: { id: "assessment", status: "done", logs, summary: `${verifiedCount} verified · ${pendingCount} quizzes pending`, durationMs: 800 },
  };
}

// ── 5. Matching Agent ───────────────────────────────────────────

/**
 * Skill compatibility of one student against one opening (0–100). Verified
 * skills count fully, strong self-reported ones nearly, weak ones partially;
 * nice-to-haves add a small bonus. Shared with the company candidate ranking.
 */
export function scoreAgainst(
  skills: AnalysisInput["student"]["skills"],
  requiredSkills: string[],
  niceToHave: string[] = [],
): { score: number; matched: string[]; missing: string[] } {
  const owned = ownedMap(skills);
  const matched: string[] = [];
  const missing: string[] = [];
  let have = 0;
  for (const s of requiredSkills) {
    const o = owned.get(norm(s));
    if (o) {
      matched.push(s);
      // Verified skills count fully; a self-declared claim counts half.
      have += o.verified ? 1 : 0.5;
    } else missing.push(s);
  }
  const bonus = niceToHave.filter((s) => owned.has(norm(s))).length * 0.05;
  const base = requiredSkills.length ? have / requiredSkills.length : 0;
  return { score: Math.min(100, Math.round((base + bonus) * 100)), matched, missing };
}

function runMatching(input: AnalysisInput): { out: MatchingOutput; run: AgentRun } {
  const logs: string[] = [];
  logs.push(`Scoring ${input.jobs.length} open internships and jobs against ${input.student.skills.length} skills.`);

  const matches = input.jobs
    .map((j) => ({
      jobId: j.id, role: j.role, company: j.company, type: j.type, location: j.location, salary: j.salary,
      ...scoreAgainst(input.student.skills, j.requiredSkills, j.niceToHave),
    }))
    .sort((a, b) => b.score - a.score);

  const internships = matches.filter((m) => /intern|apprentice/i.test(m.type)).length;
  logs.push(`Ranked ${matches.length} opportunities: ${internships} internships/apprenticeships, ${matches.length - internships} jobs.`);
  const strong = matches.filter((m) => m.score >= 70).length;
  logs.push(`${strong} opportunities score ≥ 70% — recommended for immediate application.`);

  return {
    out: { matches: matches.slice(0, 8), internships, jobs: matches.length - internships },
    run: { id: "matching", status: "done", logs, summary: `${strong} strong matches of ${matches.length}`, durationMs: 1000 },
  };
}

// ── 6. Collaboration Agent ──────────────────────────────────────

function runCollaboration(input: AnalysisInput, analysis: AnalysisOutput): { out: CollaborationOutput; run: AgentRun } {
  const logs: string[] = [];
  const gapWords = new Set([...analysis.gaps, ...analysis.developing].flatMap((g) => roleKeywords(g.skill)));
  const roleWords = new Set(roleKeywords(analysis.targetRole));
  logs.push(`Scanning ${input.collaborations.length} industry–academia activities for relevance.`);

  const suggestions = input.collaborations
    .filter((c) => !["FDP", "Faculty Internship", "Consultancy"].includes(c.type)) // faculty-only formats
    .map((c) => {
      const words = c.domain.flatMap((d) => roleKeywords(d)).concat(roleKeywords(c.title));
      const hits = words.filter((w) => gapWords.has(w) || roleWords.has(w));
      const isTarget = analysis.targetCompany && norm(c.company) === norm(analysis.targetCompany);
      const score = hits.length + (isTarget ? 2 : 0);
      const reason = isTarget
        ? `Hosted by your target company, ${c.company}`
        : hits.length
          ? `Relevant to ${Array.from(new Set(hits)).slice(0, 2).join(" & ")}`
          : "Broad industry exposure";
      return { id: c.id, title: c.title, company: c.company, type: c.type, reason, startsAt: c.startsAt, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(({ id, title, company, type, reason, startsAt }) => ({ id, title, company, type, reason, startsAt }));

  logs.push(`Suggested ${suggestions.length} activities (${Array.from(new Set(suggestions.map((s) => s.type))).join(", ")}).`);

  return {
    out: { suggestions },
    run: { id: "collaboration", status: "done", logs, summary: `${suggestions.length} industry activities suggested`, durationMs: 700 },
  };
}

// ── Orchestrator ────────────────────────────────────────────────

export function runAnalysisPipeline(input: AnalysisInput): AnalysisResult {
  const a = runAnalysis(input);
  const r = runRoadmap(input, a.out);
  const l = runLearning(input, a.out);
  const s = runAssessment(input, a.out);
  const m = runMatching(input);
  const c = runCollaboration(input, a.out);
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    provider: getProvider().name,
    runs: [a.run, r.run, l.run, s.run, m.run, c.run],
    analysis: a.out,
    roadmap: r.out,
    learning: l.out,
    assessment: s.out,
    matching: m.out,
    collaboration: c.out,
  };
}

/** Resolves the career path for a student who hasn't set roadmap goals yet. */
export function inferCareerPath(targetRole: string): string {
  const hit = CAREER_PATHS.find((c) => norm(c.title) === norm(targetRole));
  return hit?.id ?? "fullstack";
}
