import { NextResponse } from "next/server";
import { apiSession } from "@/lib/auth/api-session";
import { getProfileAnalysis, parseGithubUsername, parseLeetcodeUsername } from "@/lib/ai/profile";
import { enqueueTask } from "@/lib/ai-tasks/queue";
import { readJsonLimited } from "@/lib/http";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { validateProfileRequest } from "@/lib/validation/ai";

export const maxDuration = 300;

/** The student's latest coding-profile analysis (null if never run). */
export async function GET() {
  const s = await apiSession("student");
  if ("error" in s) return s.error;
  return NextResponse.json({ analysis: await getProfileAnalysis(s.userId) });
}

/**
 * Analyses `{ github?, leetcode? }` (usernames or profile URLs) in the
 * background. Responds 202 with the task; the result replaces the stored one.
 */
export async function POST(request: Request) {
  const s = await apiSession("student");
  if ("error" in s) return s.error;
  const limit = await rateLimit(`ai-profile:${s.userId}`, 5, 10 * 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const parsed = await readJsonLimited(request, 2_000);
  if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const { value, error } = validateProfileRequest(parsed.data);
  if (error || !value) return NextResponse.json({ error: error ?? "Invalid input." }, { status: 400 });

  const github = value.github ? parseGithubUsername(value.github) : null;
  const leetcode = value.leetcode ? parseLeetcodeUsername(value.leetcode) : null;
  if (value.github && !github) return NextResponse.json({ error: "That doesn't look like a GitHub username or profile URL." }, { status: 400 });
  if (value.leetcode && !leetcode) return NextResponse.json({ error: "That doesn't look like a LeetCode username or profile URL." }, { status: 400 });

  const res = await enqueueTask({
    userId: s.userId,
    role: s.role,
    type: "student.profile",
    subject: [github && `GitHub ${github}`, leetcode && `LeetCode ${leetcode}`].filter(Boolean).join(" + "),
    dedupeKey: `${s.userId}:profile`,
    input: { github, leetcode },
    link: "/student/analysis#coding-evidence",
  });
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json({ task: res.task, created: res.created }, { status: 202 });
}
