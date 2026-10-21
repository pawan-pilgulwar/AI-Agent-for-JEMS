"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Building2,
  Check,
  GraduationCap,
  BookOpen,
  School,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import WelcomeBanner from "@/components/welcome/WelcomeBanner";
import Logo from "@/components/Navbar/Logo";
import { useHasEntered } from "@/components/welcome/entered";
import TourButton from "@/components/tour/TourButton";
import { useTour } from "@/components/tour/TourProvider";
import JourneyButton from "@/components/demo/JourneyButton";
import type { JourneyTone } from "@/components/demo/JourneyButton";
import {
  startStudentJourney,
  startCompanyJourney,
  startFacultyJourney,
  startInstitutionJourney,
} from "@/app/actions/demo";

/* ─── Module Data ────────────────────────────────────────────────── */

interface ModuleConfig {
  key: string;
  icon: React.ElementType;
  title: string;
  description: string;
  features: { title: string; desc: string }[];
  tone: JourneyTone;
  action: () => Promise<void>;
  journeyLabel: string;
  pendingLabel: string;
  loginRole: string;
  iconBg: string;
  iconColor: string;
  checkColor: string;
  bgStyle: React.CSSProperties;
}

const MODULES: ModuleConfig[] = [
  {
    key: "student",
    icon: GraduationCap,
    title: "Student Module",
    description:
      "Build a verified profile, assess your skills against industry benchmarks, and get matched to internships & roles that fit your career path.",
    features: [
      { title: "Skill assessment & profiling", desc: "Evaluate technical & soft skills through industry-designed questionnaires with AI-generated gap analysis" },
      { title: "Smart role matching", desc: "Get recommended industries, job roles & internships ranked by your verified skill profile" },
      { title: "Digital portfolio", desc: "Verified skills, certifications, projects & achievements in one shareable portfolio" },
      { title: "Career roadmap", desc: "Personalized learning path with progress tracking and certification recommendations" },
    ],
    tone: "student",
    action: startStudentJourney,
    journeyLabel: "Explore student journey",
    pendingLabel: "Opening dashboard",
    loginRole: "student",
    iconBg: "bg-orange/10",
    iconColor: "text-orange",
    checkColor: "text-orange",
    bgStyle: {
      backgroundColor: "#fffdfa",
      backgroundImage:
        "radial-gradient(72% 55% at 28% 12%, rgba(234, 88, 12, 0.08), transparent 78%)",
    },
  },
  {
    key: "company",
    icon: Building2,
    title: "Industry Module",
    description:
      "Post opportunities, discover talent ranked by verified evidence, and run training programs that build your future workforce.",
    features: [
      { title: "Smart talent discovery", desc: "AI-ranked candidate shortlists based on verified skills, not keywords or self-reports" },
      { title: "Post opportunities", desc: "Internships, apprenticeships, projects & entry-level roles with skill requirements" },
      { title: "Learning programs", desc: "Publish training courses, workshops, mentorship & innovation challenges for students" },
      { title: "Recruitment analytics", desc: "Track hiring pipeline, skill demand trends & placement outcome dashboards" },
    ],
    tone: "company",
    action: startCompanyJourney,
    journeyLabel: "Explore industry journey",
    pendingLabel: "Opening dashboard",
    loginRole: "company",
    iconBg: "bg-navy/[0.07]",
    iconColor: "text-navy",
    checkColor: "text-emerald",
    bgStyle: {
      backgroundColor: "#f7f4ed",
      backgroundImage:
        "radial-gradient(72% 55% at 74% 86%, rgba(245, 158, 11, 0.10), transparent 78%)",
    },
  },
  {
    key: "faculty",
    icon: BookOpen,
    title: "Academician Module",
    description:
      "Explore faculty internships, industrial training, and research collaborations to align teaching with real-world industry practices.",
    features: [
      { title: "Faculty internships", desc: "Apply for industry internships, industrial training & Faculty Development Programs (FDPs)" },
      { title: "Research collaboration", desc: "Joint research projects, innovation programs & access to industry datasets" },
      { title: "Teaching alignment", desc: "Insights into current industry skill demands to keep curriculum relevant" },
      { title: "Student mentorship", desc: "Guide students through internships, verify activities & support career development" },
    ],
    tone: "faculty",
    action: startFacultyJourney,
    journeyLabel: "Explore academician journey",
    pendingLabel: "Opening dashboard",
    loginRole: "faculty",
    iconBg: "bg-violet-500/10",
    iconColor: "text-violet-600",
    checkColor: "text-violet-500",
    bgStyle: {
      backgroundColor: "#faf8ff",
      backgroundImage:
        "radial-gradient(72% 55% at 28% 86%, rgba(124, 58, 237, 0.08), transparent 78%)",
    },
  },
  {
    key: "institution",
    icon: School,
    title: "Institution Module",
    description:
      "Monitor student progress, track placement outcomes, manage industry partnerships, and make data-driven decisions with analytics.",
    features: [
      { title: "Student monitoring", desc: "Track skill development progress, internship participation & placement readiness" },
      { title: "Placement analytics", desc: "Placement rate trends, recruiter engagement metrics & industry-wise distribution" },
      { title: "Industry partnerships", desc: "Manage MoUs, collaboration activities, workshops & guest lecture programs" },
      { title: "Reporting & compliance", desc: "Export analytics for accreditation, audits & data-driven policy decisions" },
    ],
    tone: "institution",
    action: startInstitutionJourney,
    journeyLabel: "Explore institution journey",
    pendingLabel: "Opening dashboard",
    loginRole: "institution",
    iconBg: "bg-teal-500/10",
    iconColor: "text-teal-600",
    checkColor: "text-teal-500",
    bgStyle: {
      backgroundColor: "#f5fbfa",
      backgroundImage:
        "radial-gradient(72% 55% at 74% 12%, rgba(13, 148, 136, 0.08), transparent 78%)",
    },
  },
];

/* ─── Component ──────────────────────────────────────────────────── */

export default function Home() {
  const router = useRouter();
  const { status, data: session } = useSession();
  const { start: startTour } = useTour();
  // Skip the welcome once they've been inside a module (e.g. after logging out).
  const hasEntered = useHasEntered();
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const showWelcome = !hasEntered && !welcomeDismissed;

  const arrivedSignedIn = useRef<boolean | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (arrivedSignedIn.current === null) {
      arrivedSignedIn.current = status === "authenticated";
    }
    if (!arrivedSignedIn.current) return;

    const home: Record<string, string> = {
      student: "/student/dashboard",
      company: "/company/dashboard",
      institution: "/institution/dashboard",
      faculty: "/faculty/dashboard",
    };
    router.replace(home[session?.user?.role ?? "student"] ?? "/student/dashboard");
  }, [status, session, router]);

  const dismissWelcome = useCallback(() => setWelcomeDismissed(true), []);

  // Let the banner unmount (and restore page scrolling) before Joyride
  // measures and scrolls to the first step.
  const startWelcomeTour = useCallback(() => {
    setWelcomeDismissed(true);
    window.setTimeout(() => startTour("landing"), 350);
  }, [startTour]);

  if (status === "authenticated" && arrivedSignedIn.current) return null;

  return (
    <div className="flex min-h-screen w-full flex-col">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="fixed left-0 right-0 top-0 z-30 flex items-center justify-between border-b border-lightgray/60 bg-white/80 px-6 py-3 backdrop-blur-xl md:px-10">
        <Logo className="h-11" />
        <div className="flex items-center gap-3">
          <TourButton
            tour="landing"
            className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium text-ink-soft transition-colors hover:text-navy sm:inline-flex"
          >
            Take the tour
          </TourButton>
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="rounded-lg border border-lightgray px-4 py-2 text-[13px] font-medium text-navy transition-all duration-200 hover:border-navy/25 hover:shadow-[var(--shadow-soft)]"
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => router.push("/signup")}
            className="bg-cta-gradient rounded-lg px-4 py-2 text-[13px] font-semibold text-white shadow-[var(--shadow-cta)] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
          >
            Get started
          </button>
        </div>
      </header>

      {/* ── Hero Section ───────────────────────────────────────── */}
      <section
        data-tour="hero"
        className="relative flex flex-col items-center justify-center px-6 pb-6 pt-28 text-center md:pb-10 md:pt-36">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10"
          style={{
            backgroundImage:
              "radial-gradient(60% 50% at 50% 0%, rgba(234, 88, 12, 0.06), transparent 70%)",
          }}
        />

        <div className="inline-flex items-center gap-2 rounded-full border border-orange/20 bg-orange/5 px-4 py-1.5 text-[13px] font-medium text-orange">
          <Sparkles className="h-3.5 w-3.5" />
          Academia–Industry Collaboration Portal
        </div>

        <h1 className="font-display mt-6 max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight text-navy md:text-5xl lg:text-6xl">
          Bridging the gap between{" "}
          <span className="bg-gradient-to-r from-orange via-amber-500 to-orange bg-clip-text text-transparent">
            learning &amp; hiring
          </span>
        </h1>

        <p className="mt-5 max-w-2xl text-[16px] leading-[1.7] text-ink-soft md:text-[17px]">
          A unified platform connecting students, industries, academicians &amp;
          institutions — enabling seamless collaboration, skill development,
          internships &amp; placements.
        </p>

        {/* Each item stays on one line; the row wraps on narrow screens. */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[13px] text-ink-soft">
          {["Skill Assessment", "Internships", "Placements"].map((label) => (
            <span key={label} className="inline-flex items-center gap-2 whitespace-nowrap">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald/10 text-emerald">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
              {label}
            </span>
          ))}
        </div>
      </section>

      {/* ── Module Cards Grid ──────────────────────────────────── */}
      <section className="mx-auto w-full max-w-7xl px-5 pb-20 pt-4 md:px-8">
        <div className="grid gap-5 md:grid-cols-2">
          {MODULES.map((mod, idx) => (
            <article
              key={mod.key}
              data-tour={`${mod.key}-card`}
              className="group relative overflow-hidden rounded-2xl border border-lightgray/80 transition-all duration-300 hover:border-lightgray hover:shadow-[var(--shadow-lift)]"
              style={{
                ...mod.bgStyle,
                animationDelay: `${idx * 80}ms`,
              }}
            >
              {/* Decorative corner glow */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
                style={{
                  background:
                    mod.key === "student"
                      ? "rgba(234, 88, 12, 0.12)"
                      : mod.key === "company"
                        ? "rgba(245, 158, 11, 0.15)"
                        : mod.key === "faculty"
                          ? "rgba(124, 58, 237, 0.12)"
                          : "rgba(13, 148, 136, 0.12)",
                }}
              />

              <div className="relative z-10 p-8 md:p-10">
                {/* Icon */}
                <span
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${mod.iconBg} ${mod.iconColor} transition-transform duration-300 group-hover:scale-110`}
                >
                  <mod.icon className="h-6 w-6" strokeWidth={1.75} />
                </span>

                {/* Title */}
                <h2 className="font-display mt-5 text-2xl font-bold tracking-tight text-navy md:text-3xl">
                  {mod.title}
                </h2>

                {/* Description */}
                <p className="mt-3 text-[15px] leading-[1.7] text-ink-soft">
                  {mod.description}
                </p>

                {/* Features */}
                <ul className="mt-7 space-y-4 border-t border-lightgray/80 pt-6">
                  {mod.features.map((f) => (
                    <li key={f.title} className="flex gap-3">
                      <Check
                        className={`mt-0.5 h-4 w-4 shrink-0 ${mod.checkColor}`}
                        strokeWidth={2.5}
                      />
                      <div>
                        <p className="text-[14px] font-semibold text-navy">
                          {f.title}
                        </p>
                        <p className="mt-0.5 text-[13px] leading-[1.6] text-ink-soft">
                          {f.desc}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <div className="mt-8">
                  <JourneyButton
                    dataTour={`${mod.key}-button`}
                    action={mod.action}
                    tone={mod.tone}
                    label={mod.journeyLabel}
                    pendingLabel={mod.pendingLabel}
                  />
                </div>

                <p className="mt-4 text-center text-[13px] text-ink-soft">
                  Opens a demo account &mdash; no sign-up needed.{" "}
                  <button
                    type="button"
                    onClick={() => router.push(`/login?role=${mod.loginRole}`)}
                    className={`font-semibold underline decoration-current/30 underline-offset-4 transition-colors hover:decoration-current ${mod.iconColor}`}
                  >
                    Use your own
                  </button>
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── Footer Tagline ─────────────────────────────────────── */}
      <footer className="flex flex-col items-center gap-3 border-t border-lightgray/60 py-8 text-center">
        <Logo className="h-10" />
        <p className="text-[13px] text-ink-soft">
          Skill Development · Internships · Placements
        </p>
      </footer>

      {/* ── Welcome Banner (overlay) ───────────────────────────── */}
      {showWelcome && (
        <WelcomeBanner
          onStartTour={startWelcomeTour}
          onDismiss={dismissWelcome}
        />
      )}
    </div>
  );
}
