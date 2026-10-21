import type { Metadata } from "next";
import Footer from "@/components/Footer";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = { title: "Privacy — Jems" };

const sections = [
  {
    h: "What we collect",
    p: "Your name, email, role and the profile details you add — skills, education, projects and resume content. If you sign in with GitHub we store the public profile GitHub shares with us.",
  },
  {
    h: "How we use it",
    p: "To run your account, build your roadmap and match scores, and show companies the verified skills you choose to publish. We send transactional email (verification codes, password resets) and nothing else unless you opt in.",
  },
  {
    h: "Who sees it",
    p: "Companies see the profile and resume fields you make visible. Institutions see aggregate cohort statistics, never individual records, unless you are enrolled with them and consent.",
  },
  {
    h: "Your choices",
    p: "You can edit or delete your profile from Settings at any time. Deleting your account removes your personal data from our systems within 30 days.",
  },
];

export default function PrivacyPage() {
  return (
    <>
      <Navbar isAuthenticated={false} userRole={null} />
      <main id="main" className="pt-16">
        <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <h1 className="font-display text-4xl font-bold tracking-[-0.025em] text-navy sm:text-5xl">Privacy</h1>
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
