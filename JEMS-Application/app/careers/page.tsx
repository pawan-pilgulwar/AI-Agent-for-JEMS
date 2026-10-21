import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/Footer";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Careers — Jems",
  description:
    "Join the team building the bridge between education and employment.",
};

const roles = [
  {
    title: "Senior Full-Stack Engineer",
    dept: "Engineering",
    location: "Remote",
    type: "Full-time",
  },
  {
    title: "AI / ML Engineer",
    dept: "Engineering",
    location: "Remote",
    type: "Full-time",
  },
  {
    title: "Product Designer",
    dept: "Design",
    location: "Remote",
    type: "Full-time",
  },
  {
    title: "Career Coach (Part-time)",
    dept: "Student Success",
    location: "Hybrid",
    type: "Part-time",
  },
  {
    title: "Partnerships Manager",
    dept: "Growth",
    location: "Remote",
    type: "Full-time",
  },
];

export default function CareersPage() {
  return (
    <>
      <Navbar isAuthenticated={false} userRole={null} />
      <main className="pt-16">
        <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="h-px w-8 bg-orange" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-orange">
              Careers
            </span>
          </div>
          <h1 className="mt-5 max-w-2xl text-4xl font-extrabold leading-[1.1] tracking-tight text-navy sm:text-5xl">
            Build the bridge with us
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-mediumgray">
            We&apos;re a small, fully-remote team obsessed with student outcomes.
            If you want your work to put people into careers, we&apos;d love to
            hear from you.
          </p>

          {/* Open roles */}
          <h2 className="mt-14 text-sm font-semibold uppercase tracking-wide text-mediumgray">
            Open roles
          </h2>
          <ul className="mt-4 divide-y divide-lightgray overflow-hidden rounded-2xl border border-lightgray bg-white/80 backdrop-blur-sm">
            {roles.map((role) => (
              <li key={role.title}>
                <Link
                  href="/contact"
                  className="group flex flex-col gap-2 px-6 py-5 transition-colors hover:bg-surface-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-base font-bold text-navy transition-colors group-hover:text-slate">
                      {role.title}
                    </p>
                    <p className="text-sm text-mediumgray">
                      {role.dept} · {role.location} · {role.type}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-orange">
                    Apply <span aria-hidden="true">→</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-10 rounded-2xl border border-dashed border-lightgray bg-white/60 p-6 text-center backdrop-blur-sm">
            <p className="text-sm text-mediumgray">
              Don&apos;t see your role?{" "}
              <Link
                href="/contact"
                className="font-semibold text-orange hover:underline"
              >
                Tell us how you&apos;d help
              </Link>
              .
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
