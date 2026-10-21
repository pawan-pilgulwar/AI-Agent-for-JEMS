import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import GoalsPicker from "@/components/roadmap/GoalsPicker";
import { getRoadmapState } from "@/lib/db/roadmap";

export const metadata: Metadata = {
  title: "Career Goals — Jems",
};

export default async function RoadmapGoalsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const state = await getRoadmapState(session.user.id);
  return <GoalsPicker initial={state.goals} suggestedPath={state.suggestedPath} />;
}
