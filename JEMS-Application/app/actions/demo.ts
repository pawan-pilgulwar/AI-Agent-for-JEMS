"use server";

import { signIn } from "@/auth";
import { DEMO_ACCOUNTS, type DemoRole } from "@/lib/demo";

/**
 * Seeded by scripts/seedPlatform.js. Kept server-side so it never ships in the
 * client bundle; override with DEMO_PASSWORD if the seed is re-run with a
 * different value.
 */
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "Demo@1234";

async function start(role: DemoRole) {
  const account = DEMO_ACCOUNTS[role];
  // Throws a NEXT_REDIRECT on success, which Next turns into the navigation.
  await signIn("credentials", {
    email: account.email,
    password: DEMO_PASSWORD,
    redirectTo: account.dashboard,
  });
}

export async function startStudentJourney() {
  await start("student");
}

export async function startCompanyJourney() {
  await start("company");
}

export async function startFacultyJourney() {
  await start("faculty");
}

export async function startInstitutionJourney() {
  await start("institution");
}
