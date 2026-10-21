import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Logo from "@/components/Navbar/Logo";
import PortfolioView from "@/components/portfolio/PortfolioView";
import { getPortfolio } from "@/lib/db/portfolio";

/** Public, read-only portfolio page a student can share with recruiters. */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const data = await getPortfolio(id);
  return { title: data ? `${data.name} — Portfolio · Jems` : "Portfolio — Jems" };
}

export default async function PublicPortfolioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getPortfolio(id);
  if (!data) notFound();

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-lightgray bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo className="h-7" />
          <span className="text-xs text-mediumgray">Verified digital portfolio</span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <PortfolioView data={data} />
      </main>
    </div>
  );
}
