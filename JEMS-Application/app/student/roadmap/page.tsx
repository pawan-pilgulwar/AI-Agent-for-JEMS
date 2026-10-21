import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Roadmap from "@/components/roadmap/Roadmap";
import { getRoadmapState } from "@/lib/db/roadmap";
import { getRoadmap } from "@/lib/roadmap/data";

export const metadata: Metadata = {
  title: "Roadmap — Jems",
};

export default async function RoadmapPage({
  searchParams,
}: {
  searchParams: Promise<{ fresh?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const state = await getRoadmapState(session.user.id);
  // First visit: pick a career before there's anything to show.
  if (!state.goals) redirect("/student/roadmap/goals");

  const { fresh } = await searchParams;
  return (
    <Roadmap
      roadmap={getRoadmap(state.goals.careerPath)}
      goals={state.goals}
      progress={state.progress}
      skills={state.skills}
      fresh={fresh === "1"}
    />
  );
}
