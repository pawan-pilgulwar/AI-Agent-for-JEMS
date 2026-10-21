import type { Metadata } from "next";
import CollaborationBoard from "@/components/faculty/CollaborationBoard";
import { requireRole } from "@/lib/auth/require-role";
import { listCollaborations } from "@/lib/db/collaborations";

export const metadata: Metadata = { title: "Industry Collaborations — Jems" };

export default async function InstitutionCollaborationsPage() {
  const session = await requireRole("institution");
  const items = await listCollaborations(session.user.id);
  return <CollaborationBoard items={items} who={session.user.name ?? "Institution"} headline="Industry programs open to your faculty" />;
}
