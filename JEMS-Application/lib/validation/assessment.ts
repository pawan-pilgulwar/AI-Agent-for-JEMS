/** Server-side validation for the skill-assessment APIs. */

import { LIKERT, QUESTIONS_PER_TEST, type QuestionnaireAnswers, SITUATIONAL } from "@/lib/assessment/engine";
import type { ValidationResult } from "./student";

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const asString = (v: unknown): string => (typeof v === "string" ? v : "");

const MAX_CLAIMED_SKILLS = 40;

export function validateQuestionnaire(body: unknown): ValidationResult<QuestionnaireAnswers> {
  if (!isRecord(body)) return { error: "Invalid request body." };

  const skills: Record<string, number> = {};
  if (isRecord(body.skills)) {
    for (const [name, rating] of Object.entries(body.skills)) {
      const n = name.trim().slice(0, 40);
      const r = Number(rating);
      if (!n || !Number.isInteger(r) || r < 1 || r > 4) continue;
      skills[n] = r;
      if (Object.keys(skills).length >= MAX_CLAIMED_SKILLS) break;
    }
  }

  const likert: Record<string, number> = {};
  for (const l of LIKERT) {
    const v = Number(isRecord(body.likert) ? body.likert[l.id] : NaN);
    if (!Number.isInteger(v) || v < 1 || v > 5) return { error: "Please answer every statement." };
    likert[l.id] = v;
  }

  const situational: Record<string, number> = {};
  for (const s of SITUATIONAL) {
    const v = Number(isRecord(body.situational) ? body.situational[s.id] : NaN);
    if (!Number.isInteger(v) || v < 0 || v >= s.options.length) return { error: "Please answer every scenario." };
    situational[s.id] = v;
  }

  return { value: { skills, likert, situational } };
}

export function validateStart(body: unknown): ValidationResult<{ skill: string }> {
  if (!isRecord(body)) return { error: "Invalid request body." };
  const skill = asString(body.skill).trim().slice(0, 40);
  if (!skill) return { error: "skill is required." };
  return { value: { skill } };
}

export function validateSubmit(body: unknown): ValidationResult<{ sessionId: string; answers: string[] }> {
  if (!isRecord(body)) return { error: "Invalid request body." };
  const sessionId = asString(body.sessionId);
  if (!/^[0-9a-f]{24}$/.test(sessionId)) return { error: "Invalid test session." };
  const raw = Array.isArray(body.answers) ? body.answers : [];
  if (raw.length > QUESTIONS_PER_TEST) return { error: "Too many answers." };
  return { value: { sessionId, answers: raw.map((a) => asString(a).slice(0, 300)) } };
}
