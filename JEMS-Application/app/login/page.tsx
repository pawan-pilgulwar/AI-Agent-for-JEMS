"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSession, signIn } from "next-auth/react";
import { Suspense, useState } from "react";
import { Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { ForgotPasswordFlow } from "@/components/auth/ForgotPasswordFlow";
import GithubButton from "@/components/GithubButton";
import Logo from "@/components/Navbar/Logo";

type RoleKey = "student" | "company" | "institution" | "faculty";

/** Copy per sign-in role; credentials decide the real role after login. */
const ROLES: Record<RoleKey, { label: string; heading: string; props: string[]; demoEmail: string; quote: string; who: string }> = {
  student: {
    label: "Student",
    heading: "Your dream job is closer than you think.",
    props: ["AI skill analysis & personalised roadmaps", "Verified skills, certificates & digital portfolio", "Smart matching to internships and jobs"],
    demoEmail: "demo@jems.dev",
    quote: "I was stuck for 8 months. Jems got me job-ready in 4 weeks. Now earning 40% more.",
    who: "Priya Sharma · Hired at Google",
  },
  company: {
    label: "Company",
    heading: "Hire for skills you can actually verify.",
    props: ["Post internships & jobs with required skills", "Skill-ranked candidate shortlists", "Publish training programs & FDPs for academia"],
    demoEmail: "company@jems.dev",
    quote: "Our shortlist time dropped from days to minutes — every candidate came with verified skills.",
    who: "Talent lead · Capgemini",
  },
  institution: {
    label: "Institution",
    heading: "See your students' path to placement.",
    props: ["Cohort skill-gap statistics vs industry demand", "Internship participation & placement readiness", "Industry collaboration for your faculty"],
    demoEmail: "institution@jems.dev",
    quote: "For the first time the placement cell can see skill gaps before the placement season.",
    who: "Placement officer · PES University",
  },
  faculty: {
    label: "Faculty",
    heading: "Bring industry practice into your classroom.",
    props: ["Faculty development programs & industrial training", "Guest lectures, live projects & research partnerships", "Consultancy opportunities with industry"],
    demoEmail: "faculty@jems.dev",
    quote: "A four-week industrial immersion changed how I teach distributed systems.",
    who: "Dr. Priya Nair · Associate Professor",
  },
};
const DEMO_PASSWORD = "Demo@1234";

/** Shown when a GitHub login is bounced here because no account exists yet. */
function NotRegisteredNotice() {
  const notRegistered = useSearchParams().get("error") === "not_registered";
  if (!notRegistered) return null;
  return (
    <p className="mt-6 rounded-lg border border-orange/20 bg-orange/5 px-3.5 py-3 text-sm text-navy">
      No account is linked to that GitHub yet.{" "}
      <Link href="/signup" className="font-semibold text-orange hover:underline">
        Create an account
      </Link>{" "}
      first.
    </p>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<RoleKey>("student");
  const copy = ROLES[role];

  const useDemo = () => {
    setEmail(copy.demoEmail);
    setPassword(DEMO_PASSWORD);
    setError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", {
      email: email.trim(),
      password,
      redirect: false,
    });
    setLoading(false);
    if (!res || res.error) {
      setError("Invalid email or password.");
      return;
    }
    // Send each role to its own portal.
    const session = await getSession();
    const role = session?.user?.role ?? "student";
    const home: Record<string, string> = {
      student: "/student/dashboard",
      company: "/company/dashboard",
      institution: "/institution/dashboard",
      faculty: "/faculty/dashboard",
    };
    router.push(home[role] ?? "/student/dashboard");
    router.refresh();
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left — brand panel (desktop only) */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-navy via-navy to-[#1f2937] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -left-16 -top-16 h-72 w-72 rounded-full bg-orange/25 blur-3xl" />
          <div className="absolute -bottom-24 -right-10 h-96 w-96 rounded-full bg-gold/15 blur-3xl" />
        </div>

        <div className="relative">
          <Logo className="h-8" />
        </div>

        <div className="relative max-w-md">
          <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-[-0.025em] sm:text-5xl">
            {copy.heading}
          </h1>
          <ul className="mt-8 space-y-4">
            {copy.props.map((v) => (
              <li key={v} className="flex items-center gap-3 text-white/80">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cta-gradient text-white">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
                {v}
              </li>
            ))}
          </ul>
        </div>

        <figure className="relative max-w-md">
          <blockquote className="font-display text-xl font-medium leading-snug tracking-tight text-white/90">“{copy.quote}”</blockquote>
          <figcaption className="mt-4 text-sm text-white/60">{copy.who}</figcaption>
        </figure>
      </aside>

      {/* Right — login form */}
      <main id="main" className="flex items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 lg:hidden">
            <Logo className="h-8" />
          </div>

          {mode === "forgot" ? (
            <ForgotPasswordFlow onBackToLogin={() => setMode("login")} />
          ) : (
            <>
              {/* Who's signing in */}
              <div role="tablist" aria-label="Sign in as" className="mb-6 grid grid-cols-4 gap-1 rounded-xl bg-surface p-1">
                {(Object.keys(ROLES) as RoleKey[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    role="tab"
                    aria-selected={role === k}
                    onClick={() => { setRole(k); setError(null); }}
                    className={`rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${role === k ? "bg-white text-navy shadow-[0_1px_3px_rgba(0,0,0,0.08)]" : "text-mediumgray hover:text-navy"}`}
                  >
                    {ROLES[k].label}
                  </button>
                ))}
              </div>

              <h2 className="font-display text-3xl font-bold tracking-[-0.02em] text-navy">
                {role === "student" ? "Welcome back" : `${copy.label} sign in`}
              </h2>
              <p className="mt-1 text-sm text-mediumgray">
                {role === "student" || role === "company" ? (
                  <>
                    New to Jems?{" "}
                    <Link href="/signup" className="font-semibold text-orange hover:underline">
                      Create an account
                    </Link>
                  </>
                ) : (
                  <>Institution and faculty accounts are provisioned by JEMS. Use the demo account below to explore.</>
                )}
              </p>

              <Suspense fallback={null}>
                <NotRegisteredNotice />
              </Suspense>

              {/* Continue with GitHub — student accounts only */}
              {role === "student" ? (
                <>
                  <div className="mt-8">
                    <GithubButton intent="login" />
                  </div>
                  <div className="my-5 flex items-center gap-3 text-xs text-mediumgray">
                    <span className="h-px flex-1 bg-lightgray" />
                    or sign in with email
                    <span className="h-px flex-1 bg-lightgray" />
                  </div>
                </>
              ) : (
                <div className="mt-6" />
              )}

              {/* Demo credentials for the prototype walkthrough */}
              <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-dashed border-lightgray bg-surface-2 px-3.5 py-2.5 text-xs">
                <span className="text-mediumgray">
                  Demo {copy.label.toLowerCase()}: <span className="font-medium text-navy">{copy.demoEmail}</span>
                </span>
                <button type="button" onClick={useDemo} className="shrink-0 font-semibold text-slate hover:underline">
                  Use demo login
                </button>
              </div>

              <form onSubmit={submit} className="flex flex-col gap-4">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-1 block text-sm font-medium text-navy"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                    }}
                    className="h-11 w-full rounded-lg border border-lightgray bg-white px-3.5 text-sm text-navy outline-none transition-[border-color,box-shadow] duration-200 hover:border-[#d6d0c6] focus:border-orange focus:ring-4 focus:ring-orange/15"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label htmlFor="password" className="text-sm font-medium text-navy">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setMode("forgot")}
                      className="text-xs font-medium text-slate hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError(null);
                      }}
                      className="h-11 w-full rounded-lg border border-lightgray bg-white px-3.5 pr-10 text-sm text-navy outline-none transition-[border-color,box-shadow] duration-200 hover:border-[#d6d0c6] focus:border-orange focus:ring-4 focus:ring-orange/15"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      aria-pressed={showPassword}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-mediumgray transition-colors hover:text-navy"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm text-mediumgray">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-lightgray accent-orange"
                  />
                  Remember me
                </label>

                {error && (
                  <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  aria-busy={loading}
                  className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-cta-gradient px-5 text-sm font-semibold text-white shadow-[var(--shadow-cta)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-6px_rgba(234,88,12,0.5)] active:translate-y-0 disabled:pointer-events-none disabled:opacity-60"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? "Signing in…" : "Log in"}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
