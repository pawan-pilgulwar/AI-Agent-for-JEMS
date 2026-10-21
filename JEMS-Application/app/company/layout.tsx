import PortalShell, { type PortalNavItem } from "@/components/portal/PortalShell";
import { requireRole } from "@/lib/auth/require-role";
import { getCompanyContext } from "@/lib/db/company";

const NAV: PortalNavItem[] = [
  { label: "Dashboard", href: "/company/dashboard", icon: "LayoutDashboard" },
  { label: "Jobs / Internships", href: "/company/opportunities", icon: "Briefcase" },
  { label: "Candidates", href: "/company/candidates", icon: "Users" },
  { label: "Programs", href: "/company/programs", icon: "GraduationCap" },
];

export default async function CompanyLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("company");
  const company = await getCompanyContext(session.user.id);
  return (
    <PortalShell tour="company" roleLabel="Industry" nav={NAV} name={company?.name ?? session.user.name ?? "Company"} email={session.user.email ?? ""}>
      {children}
    </PortalShell>
  );
}
