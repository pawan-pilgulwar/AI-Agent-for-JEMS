import type { Db } from "mongodb";
import { getDatabase } from "@/lib/db/mongodb";
import { agent } from "@/lib/agent/client";
import type { PrereqItem, PrereqTree } from "@/lib/agent/types";
import type { TaskHandler } from "@/lib/ai-tasks/context";
import { ensureAiIndexes } from "./indexes";
import { isRecord, skillKey, str, strArr } from "./util";

/**
 * Prerequisite trees from the Agent's `/agents/prereqs`, cached globally per
 * skill in `skillPrereqs` (a tree for "Spring Boot" is the same for every
 * student). Re-running for a skill updates the stored tree in place.
 *
 *  skillPrereqs { skillKey, skill, prerequisites[], warnings[], source, createdAt, updatedAt }
 */

const FRESH_MS = 30 * 86_400_000;

async function getDb(): Promise<Db> {
  const db = await getDatabase();
  await ensureAiIndexes(db);
  return db;
}

function sanitizeItem(v: unknown): PrereqItem | null {
  if (!isRecord(v)) return null;
  const name = str(v.name, 120).trim();
  if (!name) return null;
  return { name, level: str(v.level, 20) || "basic", depends_on: strArr(v.depends_on, 20, 120), topics: strArr(v.topics, 12, 200) };
}

export function sanitizeTree(v: unknown, fallbackSkill: string): PrereqTree {
  const o = isRecord(v) ? v : {};
  const prerequisites = (Array.isArray(o.prerequisites) ? o.prerequisites : []).map(sanitizeItem).filter((x): x is PrereqItem => !!x).slice(0, 30);
  const warnings = strArr(o.warnings, 10);
  return { skill: str(o.skill, 120) || fallbackSkill, prerequisites, ...(warnings.length ? { warnings } : {}) };
}

/**
 * Orders prerequisites so every item comes after the items it depends on
 * (Kahn's algorithm). Unknown dependencies are ignored; anything left in a
 * cycle is appended in its original order rather than dropped.
 */
export function orderPrereqs(items: PrereqItem[]): PrereqItem[] {
  const byKey = new Map(items.map((i) => [skillKey(i.name), i]));
  const indegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();
  for (const i of items) {
    const k = skillKey(i.name);
    const deps = i.depends_on.map(skillKey).filter((d) => byKey.has(d) && d !== k);
    indegree.set(k, deps.length);
    for (const d of deps) dependents.set(d, [...(dependents.get(d) ?? []), k]);
  }
  const queue = items.map((i) => skillKey(i.name)).filter((k) => indegree.get(k) === 0);
  const out: PrereqItem[] = [];
  const seen = new Set<string>();
  while (queue.length) {
    const k = queue.shift()!;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(byKey.get(k)!);
    for (const next of dependents.get(k) ?? []) {
      indegree.set(next, (indegree.get(next) ?? 1) - 1);
      if (indegree.get(next) === 0) queue.push(next);
    }
  }
  for (const i of items) if (!seen.has(skillKey(i.name))) out.push(i);
  return out;
}

/** Cached trees for the given skills (fresh or not), keyed by skillKey. */
export async function getCachedPrereqs(skills: string[]): Promise<Map<string, PrereqTree & { updatedAt: Date }>> {
  const keys = Array.from(new Set(skills.map(skillKey).filter(Boolean)));
  if (keys.length === 0) return new Map();
  const db = await getDb();
  const rows = await db.collection("skillPrereqs").find({ skillKey: { $in: keys } }).toArray();
  return new Map(
    rows.map((r) => [
      String(r.skillKey),
      { ...sanitizeTree(r, str(r.skill)), updatedAt: r.updatedAt instanceof Date ? r.updatedAt : new Date(0) },
    ]),
  );
}

/**
 * Returns a tree for every skill, calling the Agent only for skills that are
 * missing or stale (or all of them with `force`), and upserting the answers.
 */
export async function ensurePrereqs(
  skills: string[],
  opts: { signal?: AbortSignal; force?: boolean } = {},
): Promise<Map<string, PrereqTree>> {
  const wanted = Array.from(new Map(skills.map((s) => [skillKey(s), s.trim()])).entries()).filter(([k]) => k);
  const cached = await getCachedPrereqs(wanted.map(([, s]) => s));
  const out = new Map<string, PrereqTree>();
  const toFetch: string[] = [];
  for (const [k, s] of wanted) {
    const hit = cached.get(k);
    if (hit && !opts.force && Date.now() - hit.updatedAt.getTime() < FRESH_MS) out.set(k, hit);
    else toFetch.push(s);
  }
  if (toFetch.length === 0) return out;

  const res = await agent.prereqs({ skills: toFetch }, { signal: opts.signal });
  const trees = Array.isArray(res?.skills) ? res.skills : [];
  const db = await getDb();
  const now = new Date();
  for (const s of toFetch) {
    const k = skillKey(s);
    const raw = trees.find((t) => isRecord(t) && skillKey(str(t.skill)) === k) ?? trees[toFetch.indexOf(s)];
    const tree = sanitizeTree(raw, s);
    out.set(k, tree);
    await db.collection("skillPrereqs").updateOne(
      { skillKey: k },
      {
        $set: { skillKey: k, skill: tree.skill, prerequisites: tree.prerequisites, warnings: tree.warnings ?? [], source: "agent", updatedAt: now },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );
  }
  return out;
}

/** `skill.prereqs` task: warms (or refreshes) the cache for a list of skills. */
export const prereqsHandler: TaskHandler = async (ctx) => {
  const skills = strArr(ctx.input.skills, 20, 120);
  await ctx.progress(`Building prerequisite trees for ${skills.join(", ")}…`);
  const trees = await ensurePrereqs(skills, { signal: ctx.signal, force: Boolean(ctx.input.force) });
  const total = Array.from(trees.values()).reduce((n, t) => n + t.prerequisites.length, 0);
  return {
    summary: `${trees.size} skill tree${trees.size === 1 ? "" : "s"} · ${total} prerequisites`,
    title: "Prerequisite trees are ready",
    notify: false,
  };
};
