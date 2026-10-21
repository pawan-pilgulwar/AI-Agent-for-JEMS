import type { Metadata } from "next";
import Programs from "@/components/company/Programs";
import { requireRole } from "@/lib/auth/require-role";
import { listCollaborations } from "@/lib/db/collaborations";
import { getCompanyContext, listPrograms } from "@/lib/db/company";

export const metadata: Metadata = { title: "Programs — Jems" };

export default async function ProgramsPage() {
  const session = await requireRole("company");
  const [company, programs, all] = await Promise.all([
    getCompanyContext(session.user.id),
    listPrograms(session.user.id),
    listCollaborations(session.user.id),
  ]);
  const mine = all.filter((c) => c.company === (company?.name ?? ""));
  return <Programs company={company?.name ?? "Company"} programs={programs} collaborations={mine} />;
}
