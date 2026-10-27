import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import LearningPathDetail from "@/components/learning/LearningPathDetail";
import { getLearningPathDetail } from "@/lib/ai/learning";

export const metadata: Metadata = { title: "Learning Path — Jems" };

export default async function LearningPathPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;
  const detail = await getLearningPathDetail(session.user.id, id);
  if (!detail) notFound();
  return <LearningPathDetail detail={detail} />;
}
