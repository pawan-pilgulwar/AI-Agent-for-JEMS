import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import MockInterviews from "@/components/interviews/MockInterviews";
import { listPapers } from "@/lib/ai/papers";
import { getMockInterviews } from "@/lib/db/student-data";

export const metadata: Metadata = {
  title: "Mock Interviews — Jems",
};

export default async function InterviewsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const [data, papers] = await Promise.all([
    getMockInterviews(session.user.id),
    listPapers(session.user.id, "interview"),
  ]);
  return <MockInterviews data={data} papers={papers} />;
}
