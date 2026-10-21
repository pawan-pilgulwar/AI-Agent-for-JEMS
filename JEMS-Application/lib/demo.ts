/**
 * Demo accounts used for the guided "journey" entry points on the landing page.
 *
 * These are real, seeded accounts (see scripts/seedPlatform.js) rather than an
 * auth bypass: a judge signing in this way gets an ordinary session, so every
 * downstream permission check, API route and page behaves exactly as it would
 * for a real user. Nothing special-cases "demo mode".
 *
 * The password deliberately lives only in the server action, never here, so it
 * cannot reach the client bundle through this module.
 */

export type DemoRole = "student" | "company" | "faculty" | "institution";

export interface DemoAccount {
  email: string;
  dashboard: string;
  label: string;
}

export const DEMO_ACCOUNTS: Record<DemoRole, DemoAccount> = {
  student: {
    email: "demo@jems.dev",
    dashboard: "/student/dashboard",
    label: "Student",
  },
  company: {
    email: "company@jems.dev",
    dashboard: "/company/dashboard",
    label: "Industry",
  },
  faculty: {
    email: "faculty@jems.dev",
    dashboard: "/faculty/dashboard",
    label: "Academician",
  },
  institution: {
    email: "institution@jems.dev",
    dashboard: "/institution/dashboard",
    label: "Institution",
  },
};

/** Emails whose credentials are public by design. */
export const DEMO_EMAILS: ReadonlySet<string> = new Set(
  Object.values(DEMO_ACCOUNTS).map((a) => a.email),
);
