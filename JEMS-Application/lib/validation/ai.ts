/** Server-side validation for the AI task APIs. */

import { CODING_LANGUAGES, type CodingLanguage } from "@/lib/agent/types";
import { INTERVIEW_TYPES, type PaperPurpose } from "@/lib/ai/papers-shared";
import type { ValidationResult } from "./student";

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const asString = (v: unknown): string => (typeof v === "string" ? v : "");

/** Letters, digits and the punctuation real skill names use (C++, C#, Node.js, CI/CD, …). */
const SKILL_RE = /^[\p{L}\p{N}][\p{L}\p{N} +#./&()'’:-]*$/u;

export function validateSkillName(raw: unknown): ValidationResult<string> {
  const skill = asString(raw).trim().replace(/\s+/g, " ");
  if (skill.length < 1 || skill.length > 80) return { error: "Enter a skill name (up to 80 characters)." };
  if (!SKILL_RE.test(skill)) return { error: "That skill name contains unsupported characters." };
  return { value: skill };
}

export function validateRoadmapRequest(body: unknown): ValidationResult<{ skill: string }> {
  if (!isRecord(body)) return { error: "Invalid request body." };
  const { value, error } = validateSkillName(body.skill);
  return error || !value ? { error } : { value: { skill: value } };
}

/** `{ step, topic, done }` — ticks one topic of an AI roadmap. Names are matched against the stored syllabus. */
export function validateTopicToggle(body: unknown): ValidationResult<{ step: string; topic: string; done: boolean }> {
  if (!isRecord(body)) return { error: "Invalid request body." };
  const step = asString(body.step).trim().slice(0, 120);
  const topic = asString(body.topic).trim().slice(0, 200);
  if (!step || !topic) return { error: "Say which step and topic to update." };
  if (typeof body.done !== "boolean") return { error: "`done` must be true or false." };
  return { value: { step, topic, done: body.done } };
}

/** `{ step, topic }` — one lesson of a learning path. Names are matched against the stored syllabus. */
export function validateLessonRef(body: unknown): ValidationResult<{ step: string; topic: string }> {
  if (!isRecord(body)) return { error: "Invalid request body." };
  const step = asString(body.step).trim().slice(0, 120);
  const topic = asString(body.topic).trim().slice(0, 200);
  if (!step || !topic) return { error: "Say which module and lesson to open." };
  return { value: { step, topic } };
}

/**
 * `{ step, topic, check?: { correct, total, missed[] } }` — completes a lesson.
 * `missed` is filtered against the syllabus on the server before it is used.
 */
export function validateLessonDone(
  body: unknown,
): ValidationResult<{ step: string; topic: string; check: { correct: number; total: number; missed: string[] } | null }> {
  const ref = validateLessonRef(body);
  if (ref.error || !ref.value) return { error: ref.error };
  const raw = (body as Record<string, unknown>).check;
  if (raw == null) return { value: { ...ref.value, check: null } };
  if (!isRecord(raw)) return { error: "Invalid quick-check result." };
  const { correct, total } = raw;
  if (!Number.isInteger(correct) || !Number.isInteger(total) || (total as number) < 1 || (total as number) > 10 || (correct as number) < 0 || (correct as number) > (total as number)) {
    return { error: "Invalid quick-check score." };
  }
  const missed = (Array.isArray(raw.missed) ? raw.missed : []).map((m) => asString(m).trim().slice(0, 200)).filter(Boolean).slice(0, 10);
  return { value: { ...ref.value, check: { correct: correct as number, total: total as number, missed } } };
}

/** `{ step }` — one module of a learning path. */
export function validateModuleRef(body: unknown): ValidationResult<{ step: string }> {
  if (!isRecord(body)) return { error: "Invalid request body." };
  const step = asString(body.step).trim().slice(0, 120);
  if (!step) return { error: "Say which module." };
  return { value: { step } };
}

export function validateProfileRequest(body: unknown): ValidationResult<{ github: string; leetcode: string }> {
  if (!isRecord(body)) return { error: "Invalid request body." };
  const github = asString(body.github).trim().slice(0, 300);
  const leetcode = asString(body.leetcode).trim().slice(0, 300);
  if (!github && !leetcode) return { error: "Add a GitHub or LeetCode username." };
  return { value: { github, leetcode } };
}

export interface PaperRequest {
  purpose: PaperPurpose;
  skill: string;
  interviewType: string | null;
  includeCoding: boolean | null;
}

export function validatePaperRequest(body: unknown): ValidationResult<PaperRequest> {
  if (!isRecord(body)) return { error: "Invalid request body." };
  if (body.purpose === "interview") {
    const t = INTERVIEW_TYPES.find((x) => x.id === body.interviewType);
    if (!t) return { error: "Unknown interview type." };
    return { value: { purpose: "interview", skill: t.title, interviewType: t.id, includeCoding: null } };
  }
  const { value, error } = validateSkillName(body.skill);
  if (error || !value) return { error };
  return {
    value: {
      purpose: "skill",
      skill: value,
      interviewType: null,
      includeCoding: typeof body.includeCoding === "boolean" ? body.includeCoding : null,
    },
  };
}

export function validateRunCode(body: unknown): ValidationResult<{ language: CodingLanguage; source_code: string; stdin: string }> {
  if (!isRecord(body)) return { error: "Invalid request body." };
  const language = asString(body.language) as CodingLanguage;
  if (!(CODING_LANGUAGES as readonly string[]).includes(language)) return { error: "Unsupported language." };
  const source_code = asString(body.source_code);
  const stdin = asString(body.stdin);
  if (!source_code.trim()) return { error: "Write some code first." };
  if (source_code.length > 20_000) return { error: "Code is too long (max 20,000 characters)." };
  if (stdin.length > 10_000) return { error: "Input is too long (max 10,000 characters)." };
  return { value: { language, source_code, stdin } };
}

export function validateAnswers(body: unknown): ValidationResult<Record<string, unknown>> {
  if (!isRecord(body) || !isRecord(body.answers)) return { error: "Invalid answers." };
  const entries = Object.entries(body.answers).filter(([k]) => /^[A-Za-z0-9_-]{1,20}$/.test(k));
  if (entries.length > 40) return { error: "Too many answers." };
  return { value: Object.fromEntries(entries) };
}

export function validateMatchRequest(body: unknown): ValidationResult<{ jobId: string; studentId: string }> {
  if (!isRecord(body)) return { error: "Invalid request body." };
  const jobId = asString(body.jobId);
  const studentId = asString(body.studentId);
  if (!/^[0-9a-f]{24}$/.test(jobId) || !/^[0-9a-f]{24}$/.test(studentId)) return { error: "Invalid opening or candidate." };
  return { value: { jobId, studentId } };
}
