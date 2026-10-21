/** Server-side validation for the industry portal's write APIs. */

import type { CollaborationInput } from "@/lib/db/collaborations";
import { APPLICATION_STATUSES, COLLABORATION_TYPES, type CompanyApplicationStatus, OPPORTUNITY_TYPES, PROGRAM_TYPES } from "@/lib/company/constants";
import type { OpeningInput, ProgramInput } from "@/lib/db/company";
import type { ValidationResult } from "./student";

const asString = (v: unknown): string => (typeof v === "string" ? v : "");
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

/** "React, Node.js ,SQL" or ["React", …] → trimmed, de-duplicated list. */
function skillList(v: unknown, max = 15): string[] {
  const raw = Array.isArray(v) ? v.map(asString) : asString(v).split(",");
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of raw) {
    const t = s.trim().slice(0, 40);
    if (t && !seen.has(t.toLowerCase())) { seen.add(t.toLowerCase()); out.push(t); }
  }
  return out.slice(0, max);
}

function text(v: unknown, max: number): string {
  return asString(v).trim().slice(0, max);
}

function futureOrTodayDate(v: unknown): string | null {
  const s = asString(v).trim();
  const d = new Date(s);
  return s && !Number.isNaN(d.getTime()) ? d.toISOString() : null;
}


export function validateOpening(body: unknown): ValidationResult<OpeningInput> {
  if (!isRecord(body)) return { error: "Invalid request body." };
  const role = text(body.role, 80);
  if (role.length < 3) return { error: "Role title is required." };
  const type = text(body.type, 30);
  if (!(OPPORTUNITY_TYPES as readonly string[]).includes(type)) return { error: "Pick a valid opportunity type." };
  const requiredSkills = skillList(body.requiredSkills);
  if (requiredSkills.length === 0) return { error: "Add at least one required skill." };
  return {
    value: {
      role, type, requiredSkills,
      niceToHave: skillList(body.niceToHave),
      location: text(body.location, 80) || "Remote",
      salary: text(body.salary, 40),
      experience: text(body.experience, 40),
      description: text(body.description, 1000),
      remote: /remote/i.test(text(body.location, 80)) || body.remote === true,
    },
  };
}

export function validateProgram(body: unknown): ValidationResult<ProgramInput> {
  if (!isRecord(body)) return { error: "Invalid request body." };
  const title = text(body.title, 100);
  if (title.length < 3) return { error: "Program title is required." };
  const type = text(body.type, 30);
  if (!(PROGRAM_TYPES as readonly string[]).includes(type)) return { error: "Pick a valid program type." };
  const skills = skillList(body.skills);
  if (skills.length === 0) return { error: "Add at least one skill the program teaches." };
  const startsAt = futureOrTodayDate(body.startsAt);
  if (!startsAt) return { error: "Start date is required." };
  return { value: { title, type, skills, duration: text(body.duration, 40) || "Self-paced", mode: text(body.mode, 40) || "Online", seats: Math.max(0, Math.min(10000, Number(body.seats) || 0)), startsAt } };
}

export function validateCollaboration(body: unknown): ValidationResult<CollaborationInput> {
  if (!isRecord(body)) return { error: "Invalid request body." };
  const title = text(body.title, 120);
  if (title.length < 3) return { error: "Title is required." };
  const type = text(body.type, 30);
  if (!(COLLABORATION_TYPES as readonly string[]).includes(type)) return { error: "Pick a valid collaboration type." };
  const startsAt = futureOrTodayDate(body.startsAt);
  if (!startsAt) return { error: "Start date is required." };
  return {
    value: {
      title, type, startsAt,
      domain: skillList(body.domain, 6),
      duration: text(body.duration, 40) || "TBA",
      location: text(body.location, 80) || "Remote",
      seats: Math.max(0, Math.min(10000, Number(body.seats) || 0)),
      description: text(body.description, 1000),
    },
  };
}

export function validateStatus(body: unknown): ValidationResult<CompanyApplicationStatus> {
  if (!isRecord(body)) return { error: "Invalid request body." };
  const status = text(body.status, 30);
  if (!(APPLICATION_STATUSES as readonly string[]).includes(status)) return { error: "Invalid status." };
  return { value: status as CompanyApplicationStatus };
}
