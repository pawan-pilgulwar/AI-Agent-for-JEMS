import PortalShell, { type PortalNavItem } from "@/components/portal/PortalShell";
import { requireRole } from "@/lib/auth/require-role";

const NAV: PortalNavItem[] = [
  { label: "Analytics", href: "/institution/dashboard", icon: "BarChart3" },
  { label: "Collaborations", href: "/institution/collaborations", icon: "Handshake" },
];

export default async function InstitutionLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("institution");
  return (
    <PortalShell tour="institution" roleLabel="Institution" nav={NAV} name={session.user.name ?? "Institution"} email={session.user.email ?? ""}>
      {children}
    </PortalShell>
  );
}
