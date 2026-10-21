import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import LearningPaths from "@/components/learning/LearningPaths";
import { syncRoadmapPaths } from "@/lib/ai/learning-paths";
import { getLearningPaths } from "@/lib/db/student-data";

export const metadata: Metadata = {
  title: "Learning Paths — Jems",
};

export default async function LearningPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  await syncRoadmapPaths(session.user.id);
  const paths = await getLearningPaths(session.user.id);
  return <LearningPaths paths={paths} />;
}
