import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import StudentDashboard, { type DashboardAiData } from "@/components/dashboard/student/StudentDashboard";
import TourAutostart from "@/components/tour/TourAutostart";
import { listPapers } from "@/lib/ai/papers";
import { getProfileAnalysis } from "@/lib/ai/profile";
import { listAiRoadmaps } from "@/lib/ai/roadmap";
import { getApplications, getDashboardData, getSavedJobs, shortDate } from "@/lib/db/student-data";

export const metadata: Metadata = {
  title: "Dashboard — Jems",
};

export default async function StudentDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  const [data, roadmaps, papers, analysis, applications, saved] = await Promise.all([
    getDashboardData(userId),
    listAiRoadmaps(userId),
    listPapers(userId),
    getProfileAnalysis(userId),
    getApplications(userId),
    getSavedJobs(userId),
  ]);

  const ai: DashboardAiData = {
    roadmaps: roadmaps.slice(0, 3),
    roadmapCount: roadmaps.length,
    // Papers the student still has to sit (newest first), then the latest result.
    openPapers: papers.filter((p) => p.status === "ready" || p.status === "in-progress").slice(0, 3),
    lastGraded: papers.find((p) => p.status === "graded") ?? null,
    codingSkills: analysis?.skills.length ?? null,
    codingAnalyzedAt: analysis?.updatedAt ? shortDate(analysis.updatedAt) : null,
    applications: applications.length,
    saved: saved.length,
  };

  return (
    <>
      <StudentDashboard data={data} ai={ai} />
      {/* First visit: walk the student through the workspace once. */}
      <TourAutostart tour="student" />
    </>
  );
}
