/**
 * Client-safe definitions for AI-generated papers — AI skill tests and AI mock
 * interviews share one pipeline (generate → take → grade). No server imports.
 */

import type { CodingLanguage, GradeResponse, QuestionType, StudentQuestion } from "@/lib/agent/types";

export type PaperPurpose = "skill" | "interview";

/** ready → opened by the student (in-progress) → submitted (grading) → graded. */
export type PaperStatus = "ready" | "in-progress" | "submitted" | "graded";

export interface InterviewType {
  id: "behavioral" | "technical" | "system-design" | "role";
  title: string;
  desc: string;
  /** What the Agent is asked to examine; "{role}" is replaced with the target role. */
  skill: string;
  counts: Partial<Record<QuestionType, number>>;
}

export const INTERVIEW_TYPES: InterviewType[] = [
  {
    id: "behavioral",
    title: "Behavioral",
    desc: "Common HR & situational questions",
    skill: "Behavioral interview: teamwork, conflict, ownership and communication (answer with real situations)",
    counts: { short_answer: 4 },
  },
  {
    id: "technical",
    title: "Technical Coding",
    desc: "DSA and language fundamentals",
    skill: "Data structures and algorithms",
    counts: { mcq: 3, short_answer: 1, coding: 1 },
  },
  {
    id: "system-design",
    title: "System Design",
    desc: "Architecture & scalability",
    skill: "System design: scalability, caching, databases and APIs",
    counts: { mcq: 3, short_answer: 3 },
  },
  {
    id: "role",
    title: "Role-specific",
    desc: "Tailored to your target role",
    skill: "Interview for a {role}",
    counts: { mcq: 4, short_answer: 2 },
  },
];

export const interviewType = (id: string) => INTERVIEW_TYPES.find((t) => t.id === id) ?? null;

const PROGRAMMING = /\b(java|python|c\+\+|cpp|javascript|typescript|js|node(\.js)?|go(lang)?|rust|kotlin|c#|dsa|data structures|algorithms?|programming|oop|spring( boot)?|django|flask|react|express)\b|^c$/i;

/** Whether a coding question makes sense for this skill (Judge0 runs python/java/c/cpp/js). */
export const codingLikely = (skill: string) => PROGRAMMING.test(skill.trim());

export function skillTestCounts(includeCoding: boolean): Partial<Record<QuestionType, number>> {
  return includeCoding ? { mcq: 5, multi_select: 1, short_answer: 1, coding: 1 } : { mcq: 6, multi_select: 2, short_answer: 2 };
}

/** Time limit in minutes for a paper with these question counts. */
export function paperMinutes(counts: Partial<Record<QuestionType, number>>): number {
  const m = (counts.mcq ?? 0) * 1.5 + (counts.multi_select ?? 0) * 2 + (counts.short_answer ?? 0) * 5 + (counts.coding ?? 0) * 20;
  return Math.max(10, Math.ceil(m / 5) * 5);
}

/** Answer the browser submits per question id. */
export type ClientAnswer = number | number[] | string | { language: CodingLanguage; source_code: string };

/** Per-question review shown after grading (keys are only revealed then). */
export interface QuestionReview {
  id: string;
  score: number;
  max: number;
  correct?: boolean;
  explanation?: string;
  /** mcq / multi_select: the correct option index(es). */
  answerIndexes?: number[];
  feedback?: string;
  covered?: string[];
  missing?: string[];
  modelAnswer?: string;
  detail?: string;
  tests?: GradeResponse["results"][number]["tests"];
}

export interface PaperSummary {
  id: string;
  purpose: PaperPurpose;
  /** Skill name, or the interview type title. */
  subject: string;
  interviewType: string | null;
  status: PaperStatus;
  totalMarks: number;
  questionCount: number;
  minutes: number;
  percent: number | null;
  passed: boolean | null;
  pendingReview: boolean;
  createdAt: string;
  gradedAt: string | null;
}

export interface PaperView extends PaperSummary {
  /** Changes every time the paper is regenerated in place (same id, new questions). */
  generationId: string;
  questions: StudentQuestion[];
  warnings: string[];
  startedAt: string | null;
  expiresAt: string | null;
  answers: Record<string, ClientAnswer>;
  late: boolean;
  review: QuestionReview[];
}
