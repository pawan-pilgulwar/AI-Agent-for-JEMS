/**
 * Small coercion helpers for the AI layer. Agent output is model-written JSON,
 * so every field is re-typed before it is stored or rendered — a missing or
 * oddly-typed field degrades to an empty value instead of breaking a page.
 */

export const str = (v: unknown, max = 2_000): string => (typeof v === "string" ? v.slice(0, max) : "");
export const num = (v: unknown, fallback = 0): number => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
export const strArr = (v: unknown, maxItems = 50, maxLen = 500): string[] =>
  Array.isArray(v) ? v.map((x) => str(x, maxLen)).filter(Boolean).slice(0, maxItems) : [];
export const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
export const iso = (v: unknown): string => (v instanceof Date ? v.toISOString() : "");

/** Canonical key for a skill name: case/space-insensitive. */
export const skillKey = (s: string): string => s.trim().toLowerCase().replace(/\s+/g, " ");
