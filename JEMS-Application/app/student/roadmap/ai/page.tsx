import { redirect } from "next/navigation";

export default async function AiRoadmapsRedirect({
  searchParams,
}: {
  searchParams: Promise<{ skill?: string }>;
}) {
  const { skill } = await searchParams;
  if (skill) {
    redirect(`/student/roadmap?skill=${encodeURIComponent(skill)}`);
  }
  redirect("/student/roadmap");
}
