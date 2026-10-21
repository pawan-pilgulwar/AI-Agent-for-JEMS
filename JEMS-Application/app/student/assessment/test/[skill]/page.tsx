import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import SkillTest from "@/components/assessment/SkillTest";
import { bankFor } from "@/lib/assessment/bank";

export const metadata: Metadata = { title: "Skill Test — Jems" };

export default async function SkillTestPage({ params }: { params: Promise<{ skill: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { skill } = await params;
  const name = decodeURIComponent(skill);
  if (!bankFor(name)) notFound();
  return <SkillTest skill={name} />;
}
