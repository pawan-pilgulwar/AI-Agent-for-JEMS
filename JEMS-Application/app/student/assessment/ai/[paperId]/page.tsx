import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import AiPaper from "@/components/ai/AiPaper";
import { getPaper } from "@/lib/ai/papers";

export const metadata: Metadata = { title: "AI Test — Jems" };

export default async function AiPaperPage({ params }: { params: Promise<{ paperId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { paperId } = await params;
  // Reading never starts the timer — the student starts it explicitly.
  const paper = await getPaper(session.user.id, paperId);
  if (!paper) notFound();
  return <AiPaper initial={paper} />;
}
