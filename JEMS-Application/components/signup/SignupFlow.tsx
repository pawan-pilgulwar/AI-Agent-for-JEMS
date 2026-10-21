"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import CompanySignup from "./CompanySignup";
import RoleChoice from "./RoleChoice";
import SignupShell from "./SignupShell";
import StudentSignup from "./StudentSignup";

/** Banner shown when a GitHub login was bounced here to register first. */
function NotRegisteredNotice() {
  const notRegistered = useSearchParams().get("error") === "not_registered";
  if (!notRegistered) return null;
  return (
    <div className="mb-6 rounded-lg border border-orange/20 bg-orange/5 px-4 py-3 text-sm text-navy">
      That GitHub account isn&apos;t registered yet. Create your account below —
      you can finish with GitHub in one click.
    </div>
  );
}

/** Top-level signup orchestrator: role choice → role-specific multi-step form. */
export default function SignupFlow() {
  const [role, setRole] = useState<"student" | "company" | null>(null);

  const reset = () => setRole(null);

  return (
    <SignupShell>
      {role === null && (
        <Suspense fallback={null}>
          <NotRegisteredNotice />
        </Suspense>
      )}
      {role === null && <RoleChoice onSelect={setRole} />}
      {role === "student" && <StudentSignup onBack={reset} />}
      {role === "company" && <CompanySignup onBack={reset} />}
    </SignupShell>
  );
}
