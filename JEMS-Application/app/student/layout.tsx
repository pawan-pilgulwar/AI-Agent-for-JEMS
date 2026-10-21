import { redirect } from "next/navigation";
import { auth } from "@/auth";
import StudentShell from "@/components/dashboard/student/StudentShell";
import { StudentProvider } from "@/components/dashboard/student/StudentContext";
import { getStudentView } from "@/lib/student";
import { HOME_BY_ROLE } from "@/lib/auth/require-role";

/**
 * Auth boundary for the whole student area. Every `/student/*` page requires a
 * signed-in user; we load their real profile once here and hand it down via
 * context so the screens render the logged-in student's data, not demo data.
 */
export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "student") redirect(HOME_BY_ROLE[session.user.role] ?? "/login");

  const student = await getStudentView(session.user.id);
  if (!student) redirect("/login");

  return (
    <StudentProvider value={student}>
      <StudentShell name={student.name} email={student.email} image={student.image}>
        {children}
      </StudentShell>
    </StudentProvider>
  );
}
