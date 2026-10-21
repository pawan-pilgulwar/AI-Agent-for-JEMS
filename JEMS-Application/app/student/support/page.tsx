import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Support from "@/components/support/Support";
import { listTickets } from "@/lib/db/student-actions";

export const metadata: Metadata = {
  title: "Support — Jems",
};

export default async function SupportPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const tickets = await listTickets(session.user.id);
  return <Support initialTickets={tickets} />;
}
