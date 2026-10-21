/**
 * Assessment Agent internals — pure functions, no I/O.
 *
 *  - skill questionnaire → *claimed* skills (self-rated, unverified)
 *  - soft-skill / aptitude questionnaire → soft-skill profile
 *  - skill test: seeded question pick, server-side grading, level from score
 */

import { type BankQuestion, SKILL_BANK, bankFor } from "./bank";

export const PASS_MARK = 70;
export const QUESTIONS_PER_TEST = 8;
export const TEST_MINUTES = 10;
export const COOLDOWN_HOURS = 24;

// ── Seeded shuffle (same approach as the roadmap quiz) ──────────
function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seededShuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Skill tests ─────────────────────────────────────────────────

/** A question as sent to the client: options shuffled, no answer key. */
export interface PublicQuestion {
  index: number;
  q: string;
  options: string[];
}

/** Server-side copy of the same question with the correct option text. */
export interface KeyedQuestion extends PublicQuestion {
  answerText: string;
}

/** Picks and shuffles a test for `skill`; `seed` makes an attempt reproducible. */
export function buildSkillTest(skill: string, seed: string): { bank: string; questions: KeyedQuestion[] } | null {
  const bank = bankFor(skill);
  if (!bank) return null;
  const rand = mulberry32(hashSeed(`${bank}::${seed}`));
  const picked: BankQuestion[] = seededShuffle(SKILL_BANK[bank], rand).slice(0, QUESTIONS_PER_TEST);
  const questions = picked.map((bq, index) => {
    const options = seededShuffle(bq.options, rand);
    return { index, q: bq.q, options, answerText: bq.options[bq.answer] };
  });
  return { bank, questions };
}

export function toPublic(questions: KeyedQuestion[]): PublicQuestion[] {
  return questions.map(({ index, q, options }) => ({ index, q, options }));
}

/** `answers[i]` is the option text chosen for question i. */
export function gradeSkillTest(questions: KeyedQuestion[], answers: string[]) {
  const total = questions.length;
  const correct = questions.reduce((n, q, i) => (answers[i] === q.answerText ? n + 1 : n), 0);
  const score = total ? Math.round((correct / total) * 100) : 0;
  return { score, correct, total, passed: score >= PASS_MARK };
}

/** Verified proficiency (0–100) awarded for a passing score. */
export function levelFromScore(score: number): number {
  return Math.max(60, Math.min(100, score));
}

export const LEVEL_LABEL = (level: number) => (level >= 85 ? "Expert" : level >= 70 ? "Advanced" : level >= 50 ? "Intermediate" : "Beginner");

// ── Questionnaire ───────────────────────────────────────────────

/** Self-rating scale used in the questionnaire, mapped to a 0–100 level. */
export const SELF_RATINGS = [
  { value: 1, label: "Learning", level: 25, hint: "Studied it, little hands-on" },
  { value: 2, label: "Comfortable", level: 45, hint: "Used it in coursework / small projects" },
  { value: 3, label: "Confident", level: 60, hint: "Built real things with it" },
  { value: 4, label: "Strong", level: 75, hint: "Could teach or lead with it" },
] as const;

export type SoftSkillKey = "communication" | "teamwork" | "problemSolving" | "adaptability" | "leadership";

export const SOFT_SKILLS: { key: SoftSkillKey; label: string }[] = [
  { key: "communication", label: "Communication" },
  { key: "teamwork", label: "Teamwork" },
  { key: "problemSolving", label: "Problem solving" },
  { key: "adaptability", label: "Adaptability" },
  { key: "leadership", label: "Leadership & ownership" },
];

/** Likert statements (1 = strongly disagree … 5 = strongly agree). */
export const LIKERT: { id: string; text: string; skill: SoftSkillKey }[] = [
  { id: "l1", text: "I can explain a technical idea clearly to someone who isn't technical.", skill: "communication" },
  { id: "l2", text: "I regularly ask for and act on feedback from teammates.", skill: "teamwork" },
  { id: "l3", text: "When I'm stuck, I break the problem into smaller pieces before asking for help.", skill: "problemSolving" },
  { id: "l4", text: "I'm comfortable switching to a new tool or language when a project needs it.", skill: "adaptability" },
  { id: "l5", text: "I take ownership of a task end-to-end, including the boring parts.", skill: "leadership" },
  { id: "l6", text: "I keep written notes/docs so others can follow my work.", skill: "communication" },
];

/** Situational judgement questions; each option scores one or more soft skills (0–4). */
export interface SituationalQuestion {
  id: string;
  text: string;
  options: { text: string; scores: Partial<Record<SoftSkillKey, number>> }[];
}

export const SITUATIONAL: SituationalQuestion[] = [
  {
    id: "s1",
    text: "Your team's demo is tomorrow and a teammate's feature is broken. They're offline. What do you do first?",
    options: [
      { text: "Try to fix it yourself quietly and tell them later", scores: { problemSolving: 2, teamwork: 1 } },
      { text: "Message the team, explain the risk, and propose a plan (fix / cut the feature)", scores: { communication: 4, teamwork: 3, leadership: 3 } },
      { text: "Wait for them to come back online", scores: { adaptability: 0 } },
      { text: "Present without that feature and mention nothing", scores: { communication: 0 } },
    ],
  },
  {
    id: "s2",
    text: "A reviewer rejects your pull request with blunt comments. You…",
    options: [
      { text: "Reply defensively explaining why they're wrong", scores: { teamwork: 0 } },
      { text: "Address each comment, ask about the ones you don't understand, and thank them", scores: { teamwork: 4, communication: 3, adaptability: 2 } },
      { text: "Silently make the changes without reading the comments closely", scores: { adaptability: 1 } },
      { text: "Ask someone else to review instead", scores: { teamwork: 1 } },
    ],
  },
  {
    id: "s3",
    text: "Mid-internship, the company switches your project from React to Vue, which you've never used.",
    options: [
      { text: "Ask to stay on React work", scores: { adaptability: 0 } },
      { text: "Spend the first days on Vue's official guide, build a small spike, then continue", scores: { adaptability: 4, problemSolving: 3, leadership: 2 } },
      { text: "Copy patterns from existing code without understanding them", scores: { adaptability: 1 } },
      { text: "Wait to be trained formally", scores: { adaptability: 0 } },
    ],
  },
  {
    id: "s4",
    text: "A production bug appears and nobody knows the cause. Your approach?",
    options: [
      { text: "Reproduce it, check logs and recent changes, narrow down step by step", scores: { problemSolving: 4, leadership: 2 } },
      { text: "Restart the server and hope", scores: { problemSolving: 0 } },
      { text: "Rewrite the module from scratch", scores: { problemSolving: 1 } },
      { text: "Escalate immediately without investigating", scores: { problemSolving: 1, communication: 1 } },
    ],
  },
];

export interface QuestionnaireAnswers {
  /** skill name → self-rating value 1–4 */
  skills: Record<string, number>;
  /** likert id → 1–5 */
  likert: Record<string, number>;
  /** situational id → option index */
  situational: Record<string, number>;
}

/** Turns questionnaire answers into a 0–100 profile per soft skill. */
export function scoreSoftSkills(a: QuestionnaireAnswers): Record<SoftSkillKey, number> {
  const got: Record<SoftSkillKey, number> = { communication: 0, teamwork: 0, problemSolving: 0, adaptability: 0, leadership: 0 };
  const max: Record<SoftSkillKey, number> = { ...got };
  for (const l of LIKERT) {
    const v = Math.min(5, Math.max(1, Number(a.likert[l.id]) || 3));
    got[l.skill] += v - 1; // 0–4
    max[l.skill] += 4;
  }
  for (const s of SITUATIONAL) {
    const choice = s.options[Number(a.situational[s.id])];
    // Every option can contribute up to 4 per skill it touches; count the max across options.
    const touched = new Set(s.options.flatMap((o) => Object.keys(o.scores) as SoftSkillKey[]));
    for (const k of touched) {
      max[k] += 4;
      got[k] += choice?.scores[k] ?? 0;
    }
  }
  const out = { ...got };
  for (const k of Object.keys(out) as SoftSkillKey[]) out[k] = max[k] ? Math.round((got[k] / max[k]) * 100) : 0;
  return out;
}

/** Self-rating → claimed skill level. */
export function levelFromRating(rating: number): number {
  return SELF_RATINGS.find((r) => r.value === rating)?.level ?? 45;
}
