import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import ProfilePage from "@/components/dashboard/student/ProfilePage";
import { getPortfolio } from "@/lib/db/portfolio";
import {
  getApplications,
  getJobMatches,
  getMockInterviews,
  getProgress,
  getStudentProfile,
} from "@/lib/db/student-data";

export const metadata: Metadata = {
  title: "Profile & Portfolio — Jems",
};

export default async function StudentProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [profile, apps, matches, interviews, portfolio, progress, { tab }] = await Promise.all([
    getStudentProfile(userId),
    getApplications(userId),
    getJobMatches(userId),
    getMockInterviews(userId),
    getPortfolio(userId),
    getProgress(userId),
    searchParams,
  ]);
  if (!profile || !portfolio) redirect("/login");

  // Public share URL, built from the request so it's right in dev and prod.
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const shareUrl = process.env.AUTH_URL
    ? `${process.env.AUTH_URL.replace(/\/$/, "")}/p/${portfolio.id}`
    : `${proto}://${host}/p/${portfolio.id}`;

  return (
    <ProfilePage
      profile={profile}
      portfolio={portfolio}
      shareUrl={shareUrl}
      initialTab={tab === "portfolio" ? "Portfolio" : "Profile"}
      stats={{
        applications: apps.length,
        matches: matches.length,
        interviews: interviews.completed,
        verifiedSkills: progress.skills.filter((s) => s.verified).length,
      }}
    />
  );
}
