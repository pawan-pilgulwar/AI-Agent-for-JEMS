import type { Metadata } from "next";
import { Suspense } from "react";
import Opportunities from "@/components/company/Opportunities";
import { requireRole } from "@/lib/auth/require-role";
import { getCompanyContext, listOpenings } from "@/lib/db/company";

export const metadata: Metadata = { title: "Jobs / Internships — Jems" };

export default async function OpportunitiesPage() {
  const session = await requireRole("company");
  const [company, openings] = await Promise.all([getCompanyContext(session.user.id), listOpenings(session.user.id)]);
  return (
    <Suspense>
      <Opportunities company={company?.name ?? "Company"} openings={openings} />
    </Suspense>
  );
}
