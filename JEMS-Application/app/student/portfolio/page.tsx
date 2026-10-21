import { redirect } from "next/navigation";

/** The portfolio now lives on the Profile page; keep old links working. */
export default function PortfolioPage() {
  redirect("/student/profile?tab=portfolio");
}
