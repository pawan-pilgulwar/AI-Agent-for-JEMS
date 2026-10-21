import type { Metadata } from "next";
import { redirect } from "next/navigation";
import InstitutionDashboard from "@/components/institution/InstitutionDashboard";
import TourAutostart from "@/components/tour/TourAutostart";
import { requireRole } from "@/lib/auth/require-role";
import { getInstitutionDashboard } from "@/lib/db/institution";

export const metadata: Metadata = { title: "Institution Analytics — Jems" };

export default async function InstitutionDashboardPage() {
  const session = await requireRole("institution");
  const data = await getInstitutionDashboard(session.user.id);
  if (!data) redirect("/login");
  return (
    <>
      <InstitutionDashboard data={data} />
      {/* First visit: walk the institution through the portal once. */}
      <TourAutostart tour="institution" />
    </>
  );
}
