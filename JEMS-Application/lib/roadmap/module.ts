/**
 * Derives the learn-page content (lessons, quiz, mini project) for a roadmap
 * module. Everything here is *deterministic* for a given (careerPath, moduleId)
 * so the server can rebuild exactly the quiz the client rendered and grade it
 * without ever sending answer keys to the browser.
 */

import {
  type CareerRoadmap,
  type Module,
  allModules,
  findModule,
} from "./data";

export const PASS_MARK = 70;
export const MAX_QUIZ_QUESTIONS = 5;

export interface Lesson {
  index: number;
  title: string;
  duration: string;
}

/** A quiz question as the client sees it — no answer key. */
export interface QuizQuestion {
  index: number;
  question: string;
  options: string[];
}

export interface MiniProject {
  title: string;
  description: string;
  difficulty: "Easy" | "Medium" | "Hard";
  duration: string;
  requirements: string[];
}

export interface ModuleContent {
  id: number;
  title: string;
  description: string;
  duration: string;
  difficulty: Module["difficulty"];
  topics: string[];
  skills: string[];
  lessons: Lesson[];
  quiz: { title: string; questions: QuizQuestion[] };
  miniProject: MiniProject;
}

// ── Seeded shuffle ──────────────────────────────────────────────
// Small, dependency-free PRNG so the option order is stable per module.

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

const GENERIC_DISTRACTORS = [
  "Quantum Computing",
  "Photosynthesis",
  "Medieval History",
  "Supply Chain Logistics",
  "Marine Biology",
];

export function lessonsFor(mod: Module): Lesson[] {
  return mod.topics.map((title, index) => ({
    index,
    title,
    duration: `${20 + index * 5} min`,
  }));
}

/**
 * Builds the quiz *with* answer keys. Server-only use — the client gets the
 * `QuizQuestion` projection from `buildModuleContent`.
 */
export function buildQuizWithAnswers(
  roadmap: CareerRoadmap,
  mod: Module,
): { question: string; options: string[]; answer: string }[] {
  const rand = mulberry32(hashSeed(`${roadmap.id}::${mod.id}`));
  // Distractors come from other modules' topics so the quiz stays on-career.
  const foreign = Array.from(
    new Set(
      allModules(roadmap)
        .filter((m) => m.id !== mod.id)
        .flatMap((m) => m.topics)
        .filter((t) => !mod.topics.includes(t)),
    ),
  );
  const pool = foreign.length >= 3 ? foreign : [...foreign, ...GENERIC_DISTRACTORS];

  return mod.topics.slice(0, MAX_QUIZ_QUESTIONS).map((topic) => {
    const distractors = seededShuffle(pool, rand).slice(0, 3);
    const options = seededShuffle([topic, ...distractors], rand);
    return {
      question: `Which of the following is a core topic of "${mod.title}"?`,
      options,
      answer: topic,
    };
  });
}

export function buildModuleContent(
  roadmap: CareerRoadmap,
  moduleId: number,
): ModuleContent | null {
  const mod = findModule(roadmap, moduleId);
  if (!mod) return null;

  const questions = buildQuizWithAnswers(roadmap, mod).map((q, index) => ({
    index,
    question: q.question,
    options: q.options,
  }));

  const projectRes = mod.resources.find((r) => r.type === "project");
  const difficulty: MiniProject["difficulty"] =
    mod.difficulty === "Beginner" ? "Easy" : mod.difficulty === "Advanced" ? "Hard" : "Medium";

  return {
    id: mod.id,
    title: mod.title,
    description: `Part of the ${roadmap.targetRole} path · ${mod.difficulty} level`,
    duration: mod.duration,
    difficulty: mod.difficulty,
    topics: mod.topics,
    skills: mod.skills,
    lessons: lessonsFor(mod),
    quiz: { title: `${mod.title} — Knowledge Check`, questions },
    miniProject: {
      title: projectRes?.title || `${mod.title} Project`,
      description: `Apply what you learned in ${mod.title} by building a hands-on project that demonstrates: ${mod.skills.join(", ")}.`,
      difficulty,
      duration: "3 hours",
      requirements: mod.topics.map((t) => `Demonstrate understanding of ${t}`),
    },
  };
}

/**
 * Grades a submission. `answers[i]` is the option *text* the student picked
 * for question i. Returns the percentage score and whether it clears PASS_MARK.
 */
export function gradeQuiz(
  roadmap: CareerRoadmap,
  mod: Module,
  answers: string[],
): { score: number; passed: boolean; correct: number; total: number } {
  const key = buildQuizWithAnswers(roadmap, mod);
  const total = key.length;
  const correct = key.reduce(
    (n, q, i) => (answers[i] === q.answer ? n + 1 : n),
    0,
  );
  const score = total ? Math.round((correct / total) * 100) : 0;
  return { score, passed: score >= PASS_MARK, correct, total };
}
