import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import AiRoadmaps from "@/components/ai/AiRoadmaps";
import { listAiRoadmaps } from "@/lib/ai/roadmap";
import { getLatestAnalysis } from "@/lib/db/analysis";
import { getAssessmentState } from "@/lib/db/assessment";

export const metadata: Metadata = { title: "AI Roadmaps — Jems" };

export default async function AiRoadmapsPage({ searchParams }: { searchParams: Promise<{ skill?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [roadmaps, analysis, assessment, { skill }] = await Promise.all([
    listAiRoadmaps(userId),
    getLatestAnalysis(userId),
    getAssessmentState(userId),
    searchParams,
  ]);

  // Suggest the student's biggest gaps first, then in-demand skills they haven't verified.
  const verified = new Set((assessment?.skills ?? []).filter((s) => s.verified).map((s) => s.name.toLowerCase()));
  const have = new Set(roadmaps.map((r) => r.skill.toLowerCase()));
  const suggestions = Array.from(
    new Set([
      ...(analysis?.analysis.gaps ?? []).map((g) => g.skill),
      ...(assessment?.catalogue ?? []).filter((c) => c.demand > 0).map((c) => c.name),
    ]),
  )
    .filter((s) => !verified.has(s.toLowerCase()) && !have.has(s.toLowerCase()))
    .slice(0, 8);

  return <AiRoadmaps roadmaps={roadmaps} suggestions={suggestions} initialSkill={typeof skill === "string" ? skill.slice(0, 80) : ""} />;
}
