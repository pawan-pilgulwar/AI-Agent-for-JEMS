import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Footer from "@/components/Footer";
import { Navbar } from "@/components/Navbar";

export default function NotFound() {
  return (
    <>
      <Navbar isAuthenticated={false} userRole={null} />
      <main id="main" className="flex min-h-[70vh] items-center pt-16">
        <section className="mx-auto max-w-3xl px-4 py-24 sm:px-6 lg:px-8">
          <p className="font-display text-7xl font-bold tracking-[-0.04em] text-orange tabular sm:text-8xl">404</p>
          <h1 className="font-display mt-4 text-3xl font-bold tracking-tight text-navy sm:text-4xl">
            That page isn&apos;t here.
          </h1>
          <p className="mt-4 max-w-[52ch] text-lg leading-8 text-ink-soft">
            The link may be old, or the page may have moved. Head back to the start, or jump straight into your workspace.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full bg-navy px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1f2937]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center rounded-full border border-navy/20 px-6 py-3 text-sm font-semibold text-navy transition-colors hover:border-navy"
            >
              Log in
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
