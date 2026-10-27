/**
 * Client-safe shapes of the personal learning path built on an AI roadmap
 * (`lib/ai/learning.ts`). No server imports.
 *
 *  roadmap step  → module   (ends with a module test that verifies its skill)
 *  roadmap topic → lesson   (narrated video lesson + quick check, YouTube videos, notes)
 */

import type {
  Difficulty,
  LearnerLevel,
  LearningStyle,
  LessonSlide,
  LessonVideos,
  NotesSection,
  QuickCheckQuestion,
} from "@/lib/agent/types";
import type { PaperStatus } from "./papers-shared";

export const LEVEL_LABEL: Record<LearnerLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export const STYLE_LABEL: Record<LearningStyle, string> = {
  visual: "Visual",
  example: "Example-based",
  handson: "Hands-on",
  theory: "Theory-first",
  mix: "Mixed",
};

/** A YouTube video id, as the embed URL accepts it. */
export const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

export interface LessonContent {
  topic: string;
  level: LearnerLevel;
  style: LearningStyle;
  /** Subtopics this version re-explains because the student got them wrong. */
  remedial: string[];
  slides: LessonSlide[];
  quickCheck: QuickCheckQuestion[];
  videos: LessonVideos | null;
  /** Served from the shared cache rather than generated for this request. */
  cached: boolean;
}

export interface NotesContent {
  topic: string;
  level: LearnerLevel;
  style: LearningStyle;
  remedial: string[];
  overview: string;
  sections: NotesSection[];
  keyTerms: { term: string; meaning: string }[];
  commonMistakes: string[];
  summary: string[];
  selfCheck: string[];
  practice: string[];
  cached: boolean;
}

export interface PathLessonView {
  topic: string;
  why: string;
  subtopics: string[];
  practice: string[];
  /** From the personal plan (empty until the path is planned). */
  objective: string;
  focus: string[];
  skip: string[];
  minutes: number;
  done: boolean;
  /** Latest quick-check score for this lesson. */
  check: { correct: number; total: number } | null;
}

export interface ModuleTestView {
  /** The current module-test paper, if one was generated. */
  paper: { id: string; status: PaperStatus; percent: number | null; passed: boolean | null } | null;
  /** Retake lock after a failed attempt (ISO), shared with the skill's other tests. */
  lockedUntil: string | null;
  /** Lessons still to finish before the test unlocks. */
  lessonsLeft: number;
  topics: string[];
  difficulty: Difficulty;
}

export interface PathModuleView {
  skill: string;
  role: string;
  weeks: number;
  summary: string;
  intro: string;
  /** The level this module's lessons are written at for this student right now. */
  level: LearnerLevel;
  /** The skill is verified (module test or any other test): the module is complete. */
  verified: boolean;
  lessons: PathLessonView[];
  /** Subtopics the next lessons and notes re-explain. */
  weak: string[];
  project: string;
  resources: string[];
  test: ModuleTestView;
}

export interface LearningPathDetail {
  roadmapId: string;
  skill: string;
  style: LearningStyle;
  targetRole: string;
  progress: { percent: number; lessonsDone: number; lessons: number; modulesPassed: number; modules: number };
  /** null until the learning path agent has planned it. */
  plan: { generatedAt: string; stale: boolean; totalMinutes: number; model: string } | null;
  modules: PathModuleView[];
}
