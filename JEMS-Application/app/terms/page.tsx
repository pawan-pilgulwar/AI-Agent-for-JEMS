import type { Metadata } from "next";
import Footer from "@/components/Footer";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = { title: "Terms — Jems" };

const sections = [
  {
    h: "Your account",
    p: "You must provide accurate information and keep your password private. One person, one account. You are responsible for activity under your login.",
  },
  {
    h: "Verified skills",
    p: "A skill is marked verified when you pass the corresponding test on Jems. Sharing test content or having someone else take a test for you voids the verification and may close your account.",
  },
  {
    h: "Plans and billing",
    p: "The Free plan costs nothing. Pro is billed monthly and can be cancelled from Settings; access continues to the end of the paid period. No refunds for partial months.",
  },
  {
    h: "Content",
    p: "You own what you upload. You grant Jems a licence to display it to the companies and institutions you choose to share it with, and to use it to compute your roadmap and match scores.",
  },
];

export default function TermsPage() {
  return (
    <>
      <Navbar isAuthenticated={false} userRole={null} />
      <main id="main" className="pt-16">
        <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <h1 className="font-display text-4xl font-bold tracking-[-0.025em] text-navy sm:text-5xl">Terms of service</h1>
          <p className="mt-3 text-sm text-mediumgray">Last updated September 2026</p>
          <div className="mt-10 space-y-10">
            {sections.map((s) => (
              <section key={s.h}>
                <h2 className="font-display text-2xl font-bold tracking-tight text-navy">{s.h}</h2>
                <p className="mt-3 max-w-[65ch] text-[17px] leading-8 text-ink-soft">{s.p}</p>
              </section>
            ))}
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
