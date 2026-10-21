import type { Metadata } from "next";
import CollaborationBoard from "@/components/faculty/CollaborationBoard";
import TourAutostart from "@/components/tour/TourAutostart";
import { requireRole } from "@/lib/auth/require-role";
import { listCollaborations } from "@/lib/db/collaborations";

export const metadata: Metadata = { title: "Faculty Collaboration — Jems" };

export default async function FacultyDashboardPage() {
  const session = await requireRole("faculty");
  const items = await listCollaborations(session.user.id);
  return (
    <>
      <CollaborationBoard items={items} who={session.user.name ?? "Faculty"} headline="Industry collaboration for academicians" />
      {/* First visit: walk the academician through the portal once. */}
      <TourAutostart tour="faculty" />
    </>
  );
}
