import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Settings from "@/components/settings/Settings";
import { getStudentSettings } from "@/lib/db/student-actions";

export const metadata: Metadata = {
  title: "Settings — Jems",
};

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const settings = await getStudentSettings(session.user.id);
  return <Settings initial={settings} />;
}
