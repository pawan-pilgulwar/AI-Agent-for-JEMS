import { redirect } from "next/navigation";

export default async function AiRoadmapRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/student/roadmap/${id}`);
}
