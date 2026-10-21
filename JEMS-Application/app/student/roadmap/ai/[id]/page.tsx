import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import AiRoadmapDetail from "@/components/ai/AiRoadmapDetail";
import { getAiRoadmap } from "@/lib/ai/roadmap";

export const metadata: Metadata = { title: "AI Roadmap — Jems" };

export default async function AiRoadmapPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;
  const roadmap = await getAiRoadmap(session.user.id, id);
  if (!roadmap) notFound();
  return <AiRoadmapDetail roadmap={roadmap} />;
}
