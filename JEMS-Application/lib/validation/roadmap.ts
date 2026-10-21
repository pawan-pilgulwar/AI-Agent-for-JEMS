/**
 * Server-side validation for the roadmap write APIs. Same posture as
 * `lib/validation/student.ts`: the client validates for UX, but every field is
 * re-checked here for type and bounds before it touches the database.
 */

import type { GoalsInput } from "@/lib/db/roadmap";
import { isCareerPath, getRoadmap, findModule } from "@/lib/roadmap/data";
import { MAX_QUIZ_QUESTIONS } from "@/lib/roadmap/module";
import type { ValidationResult } from "./student";

const asString = (v: unknown): string => (typeof v === "string" ? v : "");

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

// ── Goals ───────────────────────────────────────────────────────

export function validateGoalsInput(body: unknown): ValidationResult<GoalsInput> {
  if (!isRecord(body)) return { error: "Invalid request body." };

  const careerPath = asString(body.careerPath).trim();
  if (!isCareerPath(careerPath)) return { error: "Pick a valid career path." };

  const targetPackage = asString(body.targetPackage).trim();
  if (targetPackage) {
    const n = Number(targetPackage);
    if (!Number.isFinite(n) || n <= 0 || n > 500) {
      return { error: "Target package must be a number between 1 and 500 (LPA)." };
    }
  }

  const targetCompany = asString(body.targetCompany).trim();
  if (targetCompany.length > 80) return { error: "Company name is too long (max 80 characters)." };

  return { value: { careerPath, targetPackage, targetCompany } };
}

// ── Module reference (shared by quiz / lesson / progress) ───────

export interface ModuleRef {
  careerPath: string;
  moduleId: number;
}

export function validateModuleRef(body: unknown): ValidationResult<ModuleRef> {
  if (!isRecord(body)) return { error: "Invalid request body." };
  const careerPath = asString(body.careerPath).trim();
  if (!isCareerPath(careerPath)) return { error: "Unknown career path." };
  const moduleId = Number(body.moduleId);
  if (!Number.isInteger(moduleId) || moduleId <= 0) return { error: "Invalid module." };
  if (!findModule(getRoadmap(careerPath), moduleId)) return { error: "Module not found." };
  return { value: { careerPath, moduleId } };
}

// ── Quiz submission ─────────────────────────────────────────────

export interface QuizSubmission extends ModuleRef {
  /** Option text picked per question, in question order. */
  answers: string[];
}

export function validateQuizSubmission(body: unknown): ValidationResult<QuizSubmission> {
  const ref = validateModuleRef(body);
  if (ref.error || !ref.value) return { error: ref.error };
  const raw = (body as Record<string, unknown>).answers;
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_QUIZ_QUESTIONS) {
    return { error: "Answer every question before submitting." };
  }
  const answers = raw.map((a) => asString(a).slice(0, 200));
  if (answers.some((a) => !a)) return { error: "Answer every question before submitting." };
  return { value: { ...ref.value, answers } };
}

// ── Lesson progress ─────────────────────────────────────────────

export interface LessonProgressInput extends ModuleRef {
  lessonIndex: number;
}

export function validateLessonProgress(body: unknown): ValidationResult<LessonProgressInput> {
  const ref = validateModuleRef(body);
  if (ref.error || !ref.value) return { error: ref.error };
  const lessonIndex = Number((body as Record<string, unknown>).lessonIndex);
  const mod = findModule(getRoadmap(ref.value.careerPath), ref.value.moduleId);
  if (!Number.isInteger(lessonIndex) || lessonIndex < 0 || !mod || lessonIndex >= mod.topics.length) {
    return { error: "Invalid lesson." };
  }
  return { value: { ...ref.value, lessonIndex } };
}

// ── Lesson generation ───────────────────────────────────────────

export interface LessonRequest extends ModuleRef {
  lessonIndex: number;
}

export const validateLessonRequest = validateLessonProgress;
