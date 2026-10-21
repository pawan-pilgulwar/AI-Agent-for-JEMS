import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import MyProgress from "@/components/progress/MyProgress";
import { getProgress } from "@/lib/db/student-data";

export const metadata: Metadata = {
  title: "My Progress — Jems",
};

export default async function ProgressPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const data = await getProgress(session.user.id);
  return <MyProgress data={data} />;
}
