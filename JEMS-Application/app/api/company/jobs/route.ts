import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { skillKey } from "@/lib/ai/util";
import { enqueueTask } from "@/lib/ai-tasks/queue";
import { createOpening, getCompanyContext, listOpenings } from "@/lib/db/company";
import { readJsonLimited } from "@/lib/http";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { validateOpening } from "@/lib/validation/company";

async function companySession() {
  const session = await auth();
  if (!session?.user?.id) return { error: NextResponse.json({ error: "Not signed in." }, { status: 401 }) };
  if (session.user.role !== "company") return { error: NextResponse.json({ error: "Forbidden." }, { status: 403 }) };
  return { userId: session.user.id };
}

// Posting an opening may start a background prerequisite warm-up in after().
export const maxDuration = 300;

/** The company's own openings. */
export async function GET() {
  const s = await companySession();
  if ("error" in s) return s.error;
  return NextResponse.json({ openings: await listOpenings(s.userId!) });
}

/** Post an internship / apprenticeship / project / job with required skills. */
export async function POST(request: Request) {
  const s = await companySession();
  if ("error" in s) return s.error;
  const limit = await rateLimit(`company-jobs:${s.userId}`, 20, 60_000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const parsed = await readJsonLimited(request, 8_000);
  if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  const { value, error } = validateOpening(parsed.data);
  if (error || !value) return NextResponse.json({ error: error ?? "Invalid input." }, { status: 400 });

  const company = await getCompanyContext(s.userId!);
  if (!company) return NextResponse.json({ error: "Company profile not found." }, { status: 404 });
  const id = await createOpening(s.userId!, company.name, value);
  if (!id) return NextResponse.json({ error: "Could not post the opening." }, { status: 500 });

  // Warm the prerequisite-tree cache for the opening's skills in the
  // background, so students' AI roadmaps for them start faster. Best effort:
  // the opening is already saved whether or not this succeeds.
  const skills = value.requiredSkills.slice(0, 10);
  if (skills.length > 0) {
    await enqueueTask({
      userId: s.userId!,
      role: "company",
      type: "skill.prereqs",
      subject: skills.join(", "),
      dedupeKey: `prereqs:${skills.map(skillKey).sort().join("|")}`,
      input: { skills },
      system: true,
    });
  }
  return NextResponse.json({ ok: true, id });
}
