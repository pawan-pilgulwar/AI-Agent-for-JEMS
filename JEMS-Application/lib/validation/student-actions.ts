/** Server-side validation for the student action APIs (jobs, settings, password, support). */

import { evaluatePassword } from "@/components/signup/password";
import { NOTIFICATION_KEYS, type NotificationKey, type StudentSettings } from "@/lib/db/student-actions";
import type { ProfileUpdate } from "@/lib/db/student-data";
import type { ValidationResult } from "./student";

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const asString = (v: unknown): string => (typeof v === "string" ? v : "");
const OID = /^[0-9a-f]{24}$/;

export function validateJobRef(body: unknown): ValidationResult<{ jobId?: string; savedId?: string }> {
  if (!isRecord(body)) return { error: "Invalid request body." };
  const jobId = asString(body.jobId);
  const savedId = asString(body.savedId);
  if (OID.test(jobId)) return { value: { jobId } };
  if (OID.test(savedId)) return { value: { savedId } };
  return { error: "Invalid job." };
}

export interface SettingsInput {
  settings: StudentSettings;
  profile: Pick<ProfileUpdate, "displayName" | "targetRole" | "location">;
}

export function validateSettings(body: unknown): ValidationResult<SettingsInput> {
  if (!isRecord(body)) return { error: "Invalid request body." };
  const n = isRecord(body.notifications) ? body.notifications : {};
  const j = isRecord(body.jobPrefs) ? body.jobPrefs : {};
  const name = asString(body.name).trim();
  const targetRole = asString(body.targetRole).trim();
  const location = asString(body.location).trim();
  const desiredRole = asString(j.desiredRole).trim();
  const expectedSalary = asString(j.expectedSalary).trim();

  if (name.length > 120) return { error: "Name is too long." };
  if (body.name !== undefined && !name) return { error: "Name can't be empty." };
  if (targetRole.length > 80 || desiredRole.length > 80) return { error: "Role is too long." };
  if (location.length > 120) return { error: "Location is too long." };
  if (expectedSalary.length > 60) return { error: "Expected salary is too long." };

  return {
    value: {
      settings: {
        notifications: Object.fromEntries(NOTIFICATION_KEYS.map((k) => [k, Boolean(n[k])])) as Record<NotificationKey, boolean>,
        jobPrefs: { desiredRole, expectedSalary, remoteOnly: Boolean(j.remoteOnly) },
      },
      profile: {
        ...(name ? { displayName: name } : {}),
        ...(body.targetRole !== undefined ? { targetRole } : {}),
        ...(body.location !== undefined ? { location } : {}),
      },
    },
  };
}

export function validatePasswordChange(body: unknown, personal: string[]): ValidationResult<{ current: string; next: string }> {
  if (!isRecord(body)) return { error: "Invalid request body." };
  const current = asString(body.current);
  const next = asString(body.next);
  const confirm = asString(body.confirm);
  if (next.length > 200) return { error: "Password is too long." };
  if (next !== confirm) return { error: "The new passwords don't match." };
  if (current && current === next) return { error: "Choose a password different from your current one." };
  const check = evaluatePassword(next, personal);
  if (!check.acceptable) {
    return { error: check.patternWarning ?? "Use 8+ characters with upper and lowercase letters, a number and a symbol." };
  }
  return { value: { current, next } };
}

export const TICKET_CATEGORIES = ["Account & login", "Resume Builder", "Mock Interviews", "Job matching", "Billing & plans", "Something else"];

export function validateTicket(body: unknown): ValidationResult<{ subject: string; category: string; message: string }> {
  if (!isRecord(body)) return { error: "Invalid request body." };
  const subject = asString(body.subject).trim();
  const category = asString(body.category).trim();
  const message = asString(body.message).trim();
  if (!subject || subject.length > 150) return { error: "Add a subject (up to 150 characters)." };
  if (!message || message.length > 4_000) return { error: "Describe the issue (up to 4,000 characters)." };
  return { value: { subject, category: TICKET_CATEGORIES.includes(category) ? category : "Something else", message } };
}
