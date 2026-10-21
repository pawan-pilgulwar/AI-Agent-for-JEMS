import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { UserRole } from "@/lib/db/users";

/**
 * Route-handler guard: 401 when signed out, 403 when the role doesn't match.
 * Usage: `const s = await apiSession("student"); if ("error" in s) return s.error;`
 */
export async function apiSession(
  role?: UserRole,
): Promise<{ userId: string; role: UserRole } | { error: NextResponse }> {
  const session = await auth();
  if (!session?.user?.id) return { error: NextResponse.json({ error: "Not signed in." }, { status: 401 }) };
  if (role && session.user.role !== role) return { error: NextResponse.json({ error: "Forbidden." }, { status: 403 }) };
  return { userId: session.user.id, role: session.user.role };
}
