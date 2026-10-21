import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { UserRole } from "@/lib/db/users";

/** Where each role's home is — used after login and when bouncing a wrong role. */
export const HOME_BY_ROLE: Record<UserRole, string> = {
  student: "/student/dashboard",
  company: "/company/dashboard",
  institution: "/institution/dashboard",
  faculty: "/faculty/dashboard",
};

/**
 * Server-side role gate for a portal layout: unauthenticated → /login,
 * wrong role → that role's own home. Returns the session for the page.
 */
export async function requireRole(role: UserRole) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== role) redirect(HOME_BY_ROLE[session.user.role as UserRole] ?? "/login");
  return session;
}
