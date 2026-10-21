import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import CareerAnalysis from "@/components/analysis/CareerAnalysis";
import { getProfileAnalysis } from "@/lib/ai/profile";
import { getAnalysisInputs, getLatestAnalysis } from "@/lib/db/analysis";
import { getStudentProfile } from "@/lib/db/student-data";

export const metadata: Metadata = {
  title: "AI Career Analysis — Jems",
};

export default async function AnalysisPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [inputs, latest, codingEvidence, profile] = await Promise.all([
    getAnalysisInputs(session.user.id),
    getLatestAnalysis(session.user.id),
    getProfileAnalysis(session.user.id),
    getStudentProfile(session.user.id),
  ]);
  if (!inputs) redirect("/login");

  return (
    <CareerAnalysis
      inputs={inputs}
      initialResult={latest}
      codingEvidence={codingEvidence}
      githubDefault={profile?.github ?? ""}
    />
  );
}
