import PortalShell, { type PortalNavItem } from "@/components/portal/PortalShell";
import { requireRole } from "@/lib/auth/require-role";

const NAV: PortalNavItem[] = [
  { label: "Collaborations", href: "/faculty/dashboard", icon: "Handshake" },
];

export default async function FacultyLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("faculty");
  return (
    <PortalShell tour="faculty" roleLabel="Faculty" nav={NAV} name={session.user.name ?? "Faculty"} email={session.user.email ?? ""}>
      {children}
    </PortalShell>
  );
}
