import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/Footer";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "About — Jems",
  description:
    "Jems is closing the gap between education and employment with AI-powered learning, real interview practice, and smart job matching.",
};

const values = [
  {
    title: "Personalized",
    desc: "Learning that adapts to how each student actually learns — not one-size-fits-all.",
  },
  {
    title: "Practical",
    desc: "Skills companies hire for, taught the way the job actually demands them.",
  },
  {
    title: "Outcome-driven",
    desc: "We measure success in offers and placements, not lessons completed.",
  },
  {
    title: "Accessible",
    desc: "A free tier that gets anyone started, regardless of background.",
  },
];

const stats = [
  { value: "500+", label: "Students" },
  { value: "50+", label: "Hiring partners" },
  { value: "85%", label: "Placement rate" },
];

export default function AboutPage() {
  return (
    <>
      <Navbar isAuthenticated={false} userRole={null} />
      <main className="pt-16">
        <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="h-px w-8 bg-orange" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-orange">
              About Jems
            </span>
          </div>
          <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-[1.1] tracking-tight text-navy sm:text-5xl">
            Closing the gap between learning and hiring
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-mediumgray">
            Education teaches theory; companies need practical, job-ready skills.
            That disconnect costs students months of wasted effort and companies
            thousands per bad hire. Jems exists to fix it — with AI-personalized
            learning, real interview practice, and matching that connects the
            right people to the right roles.
          </p>

          {/* Stats */}
          <div className="mt-12 grid grid-cols-3 gap-6 rounded-2xl border border-lightgray bg-white/70 p-8 backdrop-blur-sm">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-extrabold text-navy sm:text-4xl">
                  {s.value}
                </p>
                <p className="mt-1 text-sm text-mediumgray">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Values */}
          <h2 className="mt-16 text-2xl font-bold text-navy sm:text-3xl">
            What we believe
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {values.map((v) => (
              <div
                key={v.title}
                className="rounded-2xl border border-lightgray bg-white/80 p-7 backdrop-blur-sm"
              >
                <h3 className="text-lg font-bold text-navy">{v.title}</h3>
                <p className="mt-2 text-sm leading-7 text-mediumgray">
                  {v.desc}
                </p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-16 flex flex-col items-start gap-4 rounded-3xl bg-gradient-to-br from-navy to-[#1f2937] px-8 py-12 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">
                Ready to bridge your gap?
              </h2>
              <p className="mt-1 text-sm text-lightgray">
                Start free — no card required.
              </p>
            </div>
            <Link
              href="/signup"
              className="shrink-0 rounded-full bg-cta-gradient px-7 py-3 text-sm font-semibold text-white shadow-[var(--shadow-cta)] transition-transform hover:scale-[1.03]"
            >
              Get Started
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
