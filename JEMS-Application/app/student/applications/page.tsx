import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Applications from "@/components/applications/Applications";
import { getApplications } from "@/lib/db/student-data";

export const metadata: Metadata = {
  title: "Applications — Jems",
};

export default async function ApplicationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const apps = await getApplications(session.user.id);
  return <Applications apps={apps} />;
}
