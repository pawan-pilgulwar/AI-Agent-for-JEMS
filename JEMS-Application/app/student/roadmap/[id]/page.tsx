import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import AiRoadmapDetail from "@/components/ai/AiRoadmapDetail";
import { getAiRoadmap } from "@/lib/ai/roadmap";
import LearnModule from "@/components/roadmap/LearnModule";
import { getRoadmapState } from "@/lib/db/roadmap";
import { allModules, getRoadmap, nextModuleId } from "@/lib/roadmap/data";
import { buildModuleContent } from "@/lib/roadmap/module";

export const metadata: Metadata = {
  title: "Roadmap — Jems",
};

export default async function RoadmapDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;

  // Handle legacy numeric module ID (e.g. 1, 2)
  const numericId = Number(id);
  if (Number.isInteger(numericId) && numericId > 0) {
    const state = await getRoadmapState(session.user.id);
    if (!state.goals) redirect("/student/roadmap");

    const roadmap = getRoadmap(state.goals.careerPath);
    const content = buildModuleContent(roadmap, numericId);
    if (!content) notFound();

    const passed = new Set(state.progress.passedModules);
    const modules = allModules(roadmap);
    const firstOpen = modules.find((m) => !passed.has(m.id)) ?? modules[modules.length - 1];
    const reachable = modules.findIndex((m) => m.id === numericId) <= modules.findIndex((m) => m.id === firstOpen.id);
    if (!reachable) redirect("/student/roadmap");

    return (
      <LearnModule
        careerPath={roadmap.id}
        content={content}
        watchedInitial={state.progress.lessonsWatched[String(numericId)] ?? []}
        alreadyPassed={passed.has(numericId)}
        nextModuleId={nextModuleId(roadmap, numericId)}
      />
    );
  }

  // AI Roadmap by ID
  const roadmap = await getAiRoadmap(session.user.id, id);
  if (!roadmap) notFound();

  return <AiRoadmapDetail roadmap={roadmap} />;
}
