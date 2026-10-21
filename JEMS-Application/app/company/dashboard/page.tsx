import type { Metadata } from "next";
import { redirect } from "next/navigation";
import CompanyDashboard from "@/components/company/CompanyDashboard";
import TourAutostart from "@/components/tour/TourAutostart";
import { requireRole } from "@/lib/auth/require-role";
import { getCompanyDashboard } from "@/lib/db/company";

export const metadata: Metadata = { title: "Company Dashboard — Jems" };

export default async function CompanyDashboardPage() {
  const session = await requireRole("company");
  const data = await getCompanyDashboard(session.user.id);
  if (!data) redirect("/login");
  return (
    <>
      <CompanyDashboard data={data} />
      {/* First visit: walk the company through the portal once. */}
      <TourAutostart tour="company" />
    </>
  );
}
