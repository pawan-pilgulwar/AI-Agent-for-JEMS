import { ObjectId, type Db } from "mongodb";
import { getDatabase } from "@/lib/db/mongodb";
import { agent } from "@/lib/agent/client";
import type { GithubRepoEvidence, ProfileRequest, ProfileSkillEvidence } from "@/lib/agent/types";
import { TaskInputError, type TaskHandler } from "@/lib/ai-tasks/context";
import { ensureAiIndexes } from "./indexes";
import { isRecord, iso, num, str, strArr } from "./util";

/**
 * Coding-profile analysis (API guide flow, step 2): collect public evidence
 * from GitHub and LeetCode, then ask `/agents/profile` which skills it proves.
 * The result is *evidence*, never verification — skills still have to be
 * verified by a test, exactly as the guide recommends.
 *
 *  aiProfileAnalyses { studentId, sources, skills[], summary, warnings[], createdAt, updatedAt }
 *
 * One document per student: re-running updates it.
 */

const MAX_REPOS = 8;
const FETCH_TIMEOUT_MS = 15_000;

async function getDb(): Promise<Db> {
  const db = await getDatabase();
  await ensureAiIndexes(db);
  return db;
}

/** Accepts "octocat", "@octocat" or "https://github.com/octocat/…". */
export function parseGithubUsername(raw: string): string | null {
  const s = raw.trim().replace(/^@/, "");
  const m = s.match(/github\.com\/([A-Za-z0-9-]{1,39})/i) ?? s.match(/^([A-Za-z0-9-]{1,39})$/);
  return m ? m[1] : null;
}

/** Accepts "user" or "https://leetcode.com/u/user/" / "https://leetcode.com/user/". */
export function parseLeetcodeUsername(raw: string): string | null {
  const s = raw.trim().replace(/^@/, "");
  const m = s.match(/leetcode\.com\/(?:u\/)?([A-Za-z0-9_-]{1,40})/i) ?? s.match(/^([A-Za-z0-9_-]{1,40})$/);
  return m ? m[1] : null;
}

async function fetchJson(url: string, init: RequestInit = {}, signal?: AbortSignal): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort, { once: true });
  try {
    const res = await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`${new URL(url).host} responded with HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

// ── GitHub connector ────────────────────────────────────────────

function githubHeaders(): Record<string, string> {
  const h: Record<string, string> = { Accept: "application/vnd.github+json", "User-Agent": "jems-app" };
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

async function githubDependencies(owner: string, repo: string, languages: Record<string, number>, signal?: AbortSignal): Promise<string[]> {
  const file = languages.JavaScript || languages.TypeScript ? "package.json" : languages.Python ? "requirements.txt" : null;
  if (!file) return [];
  const data = await fetchJson(`https://api.github.com/repos/${owner}/${repo}/contents/${file}`, { headers: githubHeaders() }, signal).catch(() => null);
  if (!isRecord(data) || typeof data.content !== "string") return [];
  const text = Buffer.from(data.content, "base64").toString("utf8");
  if (file === "package.json") {
    try {
      const pkg = JSON.parse(text) as Record<string, unknown>;
      return [...Object.keys(isRecord(pkg.dependencies) ? pkg.dependencies : {}), ...Object.keys(isRecord(pkg.devDependencies) ? pkg.devDependencies : {})].slice(0, 40);
    } catch {
      return [];
    }
  }
  return text.split(/\r?\n/).map((l) => l.split(/[=<>~;\[ ]/)[0].trim()).filter((l) => l && !l.startsWith("#")).slice(0, 40);
}

async function collectGithub(username: string, signal?: AbortSignal): Promise<GithubRepoEvidence[]> {
  const repos = await fetchJson(`https://api.github.com/users/${username}/repos?per_page=100&sort=pushed&type=owner`, { headers: githubHeaders() }, signal);
  if (repos === null) throw new TaskInputError(`GitHub user "${username}" was not found.`);
  const own = (Array.isArray(repos) ? repos : []).filter((r) => isRecord(r) && !r.fork && !r.archived).slice(0, MAX_REPOS) as Record<string, unknown>[];

  const out: GithubRepoEvidence[] = [];
  for (const r of own) {
    const name = str(r.name, 100);
    const [langs, contributors] = await Promise.all([
      fetchJson(`https://api.github.com/repos/${username}/${name}/languages`, { headers: githubHeaders() }, signal).catch(() => ({})),
      fetchJson(`https://api.github.com/repos/${username}/${name}/contributors?per_page=100`, { headers: githubHeaders() }, signal).catch(() => []),
    ]);
    const languages: Record<string, number> = {};
    if (isRecord(langs)) for (const [k, v] of Object.entries(langs)) if (typeof v === "number") languages[k] = v;
    const people = Array.isArray(contributors) ? (contributors as Record<string, unknown>[]) : [];
    const total = people.reduce((n, c) => n + num(c.contributions), 0);
    const mine = people.find((c) => str(c.login).toLowerCase() === username.toLowerCase());
    out.push({
      name,
      description: str(r.description, 300),
      stars: num(r.stargazers_count),
      languages,
      contributors: people.length || 1,
      my_commit_share: total ? Math.round((num(mine?.contributions) / total) * 100) / 100 : 1,
      dependencies: await githubDependencies(username, name, languages, signal),
    });
  }
  return out;
}

// ── LeetCode connector ──────────────────────────────────────────

const LEETCODE_QUERY = `query userProfile($username: String!) {
  matchedUser(username: $username) {
    submitStatsGlobal { acSubmissionNum { difficulty count } }
    tagProblemCounts {
      advanced { tagName problemsSolved }
      intermediate { tagName problemsSolved }
      fundamental { tagName problemsSolved }
    }
  }
}`;

async function collectLeetcode(username: string, signal?: AbortSignal): Promise<NonNullable<ProfileRequest["leetcode"]>> {
  const data = await fetchJson(
    "https://leetcode.com/graphql",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Referer: "https://leetcode.com", "User-Agent": "jems-app" },
      body: JSON.stringify({ query: LEETCODE_QUERY, variables: { username } }),
    },
    signal,
  );
  const user = isRecord(data) && isRecord(data.data) && isRecord(data.data.matchedUser) ? data.data.matchedUser : null;
  if (!user) throw new TaskInputError(`LeetCode user "${username}" was not found.`);

  const solved = { easy: 0, medium: 0, hard: 0 };
  const stats = isRecord(user.submitStatsGlobal) && Array.isArray(user.submitStatsGlobal.acSubmissionNum) ? user.submitStatsGlobal.acSubmissionNum : [];
  for (const s of stats as Record<string, unknown>[]) {
    const d = str(s.difficulty).toLowerCase();
    if (d === "easy" || d === "medium" || d === "hard") solved[d] = num(s.count);
  }
  const topics: Record<string, number> = {};
  const tags = isRecord(user.tagProblemCounts) ? user.tagProblemCounts : {};
  for (const group of ["fundamental", "intermediate", "advanced"]) {
    for (const t of (Array.isArray(tags[group]) ? tags[group] : []) as Record<string, unknown>[]) {
      const name = str(t.tagName, 60);
      if (name && num(t.problemsSolved) > 0) topics[name] = num(t.problemsSolved);
    }
  }
  return { solved, topics };
}

// ── Task ────────────────────────────────────────────────────────

/** `student.profile` task. Input: `{ github?, leetcode?, hackerrank? }` usernames / badges. */
export const profileHandler: TaskHandler = async (ctx) => {
  const githubUser = ctx.input.github ? parseGithubUsername(str(ctx.input.github)) : null;
  const leetcodeUser = ctx.input.leetcode ? parseLeetcodeUsername(str(ctx.input.leetcode)) : null;
  const badges = isRecord(ctx.input.hackerrank) ? (ctx.input.hackerrank as Record<string, number>) : null;
  if (!githubUser && !leetcodeUser && !badges) throw new TaskInputError("Add a GitHub or LeetCode username to analyse.");

  const body: ProfileRequest = {};
  const warnings: string[] = [];
  const sources: Record<string, unknown> = {};

  if (githubUser) {
    await ctx.progress(`Reading public repositories of ${githubUser} on GitHub…`);
    try {
      const repos = await collectGithub(githubUser, ctx.signal);
      if (repos.length) body.github = { repos };
      else warnings.push(`GitHub user ${githubUser} has no public repositories of their own.`);
      sources.github = { username: githubUser, repos: repos.length };
    } catch (err) {
      if (err instanceof TaskInputError && !leetcodeUser) throw err;
      warnings.push(`GitHub: ${err instanceof Error ? err.message : "could not read repositories"}.`);
    }
  }
  if (leetcodeUser) {
    await ctx.progress(`Reading solved problems of ${leetcodeUser} on LeetCode…`);
    try {
      body.leetcode = await collectLeetcode(leetcodeUser, ctx.signal);
      const s = body.leetcode.solved;
      sources.leetcode = { username: leetcodeUser, solved: s.easy + s.medium + s.hard };
    } catch (err) {
      if (err instanceof TaskInputError && !body.github) throw err;
      warnings.push(`LeetCode: ${err instanceof Error ? err.message : "could not read the profile"}.`);
    }
  }
  if (badges && Object.keys(badges).length) {
    body.hackerrank = { badges };
    sources.hackerrank = { badges: Object.keys(badges).length };
  }
  if (!body.github && !body.leetcode && !body.hackerrank) {
    throw new TaskInputError(warnings.join(" ") || "No public coding activity was found to analyse.");
  }

  await ctx.progress("The profile agent is reading your coding evidence…");
  const res = await agent.profile(body, { signal: ctx.signal });
  const skills: ProfileSkillEvidence[] = (Array.isArray(res?.skills) ? res.skills : [])
    .filter(isRecord)
    .map((s) => ({ name: str(s.name, 80), level: str(s.level, 20) || "beginner", confidence: Math.max(0, Math.min(100, Math.round(num(s.confidence)))), evidence: str(s.evidence, 600) }))
    .filter((s) => s.name)
    .slice(0, 30);
  const summary = str(res?.summary, 1_000);

  const db = await getDb();
  const now = new Date();
  const saved = await db.collection("aiProfileAnalyses").findOneAndUpdate(
    { studentId: ctx.userId },
    { $set: { studentId: ctx.userId, sources, skills, summary, warnings, updatedAt: now }, $setOnInsert: { createdAt: now } },
    { upsert: true, returnDocument: "after", projection: { _id: 1 } },
  );

  return {
    resultId: saved?._id.toString() ?? null,
    summary: `${skills.length} skills found from your coding activity${warnings.length ? ` (${warnings.length} source warning${warnings.length === 1 ? "" : "s"})` : ""}`,
    title: "Your coding profile analysis is ready",
    link: "/student/analysis#coding-evidence",
  };
};

// ── Reads ───────────────────────────────────────────────────────

export interface ProfileAnalysisView {
  skills: ProfileSkillEvidence[];
  summary: string;
  warnings: string[];
  sources: { github?: { username: string; repos: number }; leetcode?: { username: string; solved: number }; hackerrank?: { badges: number } };
  updatedAt: string;
}

export async function getProfileAnalysis(userId: string): Promise<ProfileAnalysisView | null> {
  if (!ObjectId.isValid(userId)) return null;
  try {
    const db = await getDb();
    const d = await db.collection("aiProfileAnalyses").findOne({ studentId: new ObjectId(userId) });
    if (!d) return null;
    const src = isRecord(d.sources) ? d.sources : {};
    const gh = isRecord(src.github) ? src.github : null;
    const lc = isRecord(src.leetcode) ? src.leetcode : null;
    const hr = isRecord(src.hackerrank) ? src.hackerrank : null;
    return {
      skills: (Array.isArray(d.skills) ? d.skills : []).filter(isRecord).map((s) => ({ name: str(s.name), level: str(s.level), confidence: num(s.confidence), evidence: str(s.evidence) })),
      summary: str(d.summary),
      warnings: strArr(d.warnings),
      sources: {
        ...(gh ? { github: { username: str(gh.username), repos: num(gh.repos) } } : {}),
        ...(lc ? { leetcode: { username: str(lc.username), solved: num(lc.solved) } } : {}),
        ...(hr ? { hackerrank: { badges: num(hr.badges) } } : {}),
      },
      updatedAt: iso(d.updatedAt),
    };
  } catch (err) {
    console.error("[ai] getProfileAnalysis failed:", err);
    return null;
  }
}
