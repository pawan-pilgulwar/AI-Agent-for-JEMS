import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import LearnModule from "@/components/roadmap/LearnModule";
import { getRoadmapState } from "@/lib/db/roadmap";
import { allModules, getRoadmap, nextModuleId } from "@/lib/roadmap/data";
import { buildModuleContent } from "@/lib/roadmap/module";

export const metadata: Metadata = {
  title: "Learn — Jems",
};

export default async function LearnModulePage({
  params,
}: {
  params: Promise<{ moduleId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { moduleId: raw } = await params;
  const moduleId = Number(raw);
  if (!Number.isInteger(moduleId) || moduleId <= 0) notFound();

  const state = await getRoadmapState(session.user.id);
  if (!state.goals) redirect("/student/roadmap/goals");

  const roadmap = getRoadmap(state.goals.careerPath);
  const content = buildModuleContent(roadmap, moduleId);
  if (!content) notFound();

  // Modules unlock in order: everything up to (and including) the first
  // not-yet-passed module is reachable; anything beyond it bounces back.
  const passed = new Set(state.progress.passedModules);
  const modules = allModules(roadmap);
  const firstOpen = modules.find((m) => !passed.has(m.id)) ?? modules[modules.length - 1];
  const reachable = modules.findIndex((m) => m.id === moduleId) <= modules.findIndex((m) => m.id === firstOpen.id);
  if (!reachable) redirect("/student/roadmap");

  return (
    <LearnModule
      careerPath={roadmap.id}
      content={content}
      watchedInitial={state.progress.lessonsWatched[String(moduleId)] ?? []}
      alreadyPassed={passed.has(moduleId)}
      nextModuleId={nextModuleId(roadmap, moduleId)}
    />
  );
}
