"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  COMPANY_SIZES,
  HIRING_ROLES,
  INDUSTRIES,
  REMOTE_PREFS,
} from "./data";
import { PasswordField } from "./PasswordField";
import { ProgressBar } from "./ProgressBar";
import { OptionCards, SelectField, TextInput } from "./primitives";
import { evaluatePassword, isEmailLike } from "./password";
import { StepCarousel } from "./StepCarousel";
import { SuccessPanel } from "./SuccessPanel";
import { VerifiableField } from "./VerifiableField";

const INDUSTRY_OPTIONS = INDUSTRIES.map((i) => ({ value: i, label: i }));
const HIRING_ROLE_OPTIONS = HIRING_ROLES.map((r) => ({ value: r, title: r }));

const PRIMARY_BTN =
  "rounded-lg bg-navy px-7 py-3 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(17,24,39,0.2)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#1f2937] hover:shadow-[0_10px_20px_rgba(17,24,39,0.25)] active:translate-y-0 active:shadow-[0_2px_8px_rgba(17,24,39,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:translate-y-0 disabled:shadow-[0_2px_8px_rgba(17,24,39,0.12)]";
const BACK_BTN =
  "signup-chip-btn rounded-lg bg-white px-6 py-3 text-sm font-semibold text-navy transition-all duration-200 hover:text-navy";

const isUrlLike = (value: string) =>
  /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/\S*)?$/.test(value.trim());

interface CompanySignupProps {
  onBack: () => void;
}

export default function CompanySignup({ onBack }: CompanySignupProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [tried, setTried] = useState(false);

  // Page 1 — company info
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [email, setEmail] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [size, setSize] = useState("");
  const [industry, setIndustry] = useState("");

  // Page 2 — hiring setup
  const [manager, setManager] = useState("");
  const [openings, setOpenings] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [remote, setRemote] = useState("");

  const [redirectIn, setRedirectIn] = useState(5);

  // The user's own info — barred from appearing anywhere in the password.
  const forbiddenTerms = [companyName, website, email, manager];

  const emailOk = isEmailLike(email);
  const websiteOk = isUrlLike(website);
  const passwordOk = evaluatePassword(password, forbiddenTerms).acceptable;
  const confirmOk = confirm.length > 0 && confirm === password;
  const openingsOk = Number(openings) >= 1;

  const page1Ok =
    companyName.trim().length > 0 &&
    websiteOk &&
    emailOk &&
    emailVerified &&
    passwordOk &&
    confirmOk &&
    !!size &&
    !!industry;

  const page2Ok =
    manager.trim().length > 0 &&
    openingsOk &&
    roles.length > 0 &&
    !!remote;

  const goNext = () => {
    if (page1Ok) {
      setStep(1);
      setTried(false);
    } else {
      setTried(true);
    }
  };

  const create = () => {
    if (page2Ok) {
      setStep(2);
      setTried(false);
    } else {
      setTried(true);
    }
  };

  useEffect(() => {
    if (step !== 2) return;
    if (redirectIn <= 0) {
      router.push("/company/dashboard");
      return;
    }
    const t = setTimeout(() => setRedirectIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [step, redirectIn, router]);

  return (
    <div className="signup-accent" data-accent="navy">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-mediumgray transition-colors hover:text-navy"
      >
        ← Different account type
      </button>

      {step < 2 && (
        <div className="mb-5">
          <p
            className="text-xs font-bold uppercase tracking-[0.14em]"
            style={{ color: "var(--accent)" }}
          >
            Company sign up
          </p>
          <h1 className="mt-1 text-[28px] font-bold tracking-tight text-navy">
            Create your account
          </h1>
          <p className="mt-1.5 text-sm text-mediumgray">Step {step + 1} of 3</p>
        </div>
      )}

      <ProgressBar current={step} total={3} />

      <div className="mt-5">
        <StepCarousel step={step}>
          {/* ── Page 1 — Company info (two-column grid) ─────────── */}
          <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-mediumgray sm:col-span-2">
              Company information
            </p>

            <TextInput
              id="co-name"
              label="Company Name"
              placeholder="Acme Corp"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              valid={companyName.trim().length > 0}
              error={
                tried && companyName.trim().length === 0
                  ? "Company name is required."
                  : null
              }
            />

            <TextInput
              id="co-website"
              label="Company Website"
              type="url"
              inputMode="url"
              placeholder="https://company.com"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              valid={websiteOk}
              error={tried && !websiteOk ? "Enter a valid URL (https://company.com)." : null}
            />

            <div className="sm:col-span-2">
              <VerifiableField
                id="co-email"
                label="Email Address"
                type="email"
                channel="email"
                accent="#111827"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(v) => {
                  setEmail(v);
                  setEmailVerified(false);
                }}
                verified={emailVerified}
                onVerified={() => setEmailVerified(true)}
                canVerify={emailOk}
                error={
                  tried && !emailOk
                    ? "Enter a valid email address."
                    : tried && !emailVerified
                      ? "Please verify your email."
                      : null
                }
              />
            </div>

            <div className="sm:col-span-2">
              <PasswordField
                id="co-password"
                label="Password"
                value={password}
                onChange={setPassword}
                showMeter
                forbiddenTerms={forbiddenTerms}
                error={tried && !passwordOk ? "Choose a stronger password." : null}
              />
            </div>

            <PasswordField
              id="co-confirm"
              label="Confirm Password"
              value={confirm}
              onChange={setConfirm}
              valid={confirmOk}
              error={
                (tried || confirm.length > 0) && !confirmOk
                  ? "Passwords don't match."
                  : null
              }
            />

            <SelectField
              id="co-industry"
              label="What industry?"
              value={industry}
              onChange={setIndustry}
              options={INDUSTRY_OPTIONS}
              placeholder="Select industry"
              error={tried && !industry ? "Select your industry." : null}
            />

            <div className="sm:col-span-2">
              <OptionCards
                label="Company Size"
                options={COMPANY_SIZES}
                value={size}
                onChange={setSize}
                columns={2}
                error={tried && !size ? "Select your company size." : null}
              />
            </div>

            <div className="pt-1 sm:col-span-2">
              <div className="mx-auto w-full max-w-sm">
                <button type="button" onClick={goNext} className={`w-full ${PRIMARY_BTN}`}>
                  Next
                </button>
                <p className="mt-3 text-center text-sm text-mediumgray">
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="font-semibold hover:underline"
                    style={{ color: "var(--accent)" }}
                  >
                    Log in
                  </Link>
                </p>
              </div>
            </div>
          </div>

          {/* ── Page 2 — Hiring info (two-column grid) ──────────── */}
          <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-mediumgray sm:col-span-2">
              Hiring information
            </p>

            <TextInput
              id="co-manager"
              label="Hiring Manager Name"
              autoComplete="name"
              placeholder="Jane Smith"
              value={manager}
              onChange={(e) => setManager(e.target.value)}
              valid={manager.trim().length > 0}
              error={
                tried && manager.trim().length === 0
                  ? "Hiring manager name is required."
                  : null
              }
            />

            <TextInput
              id="co-openings"
              label="How many open positions?"
              type="number"
              inputMode="numeric"
              min={1}
              placeholder="5"
              value={openings}
              onChange={(e) => setOpenings(e.target.value)}
              valid={openingsOk}
              error={tried && !openingsOk ? "Enter at least 1 open position." : null}
            />

            <div className="sm:col-span-2">
              <OptionCards
                label="What roles are you hiring?"
                options={HIRING_ROLE_OPTIONS}
                value={roles}
                onChange={setRoles}
                multiple
                columns={2}
                error={tried && roles.length === 0 ? "Select at least one role." : null}
              />
            </div>

            <div className="sm:col-span-2">
              <OptionCards
                label="Are you open to remote candidates?"
                options={REMOTE_PREFS}
                value={remote}
                onChange={setRemote}
                columns={2}
                error={tried && !remote ? "Select a remote preference." : null}
              />
            </div>

            <div className="mx-auto flex w-full max-w-sm items-center gap-3 pt-1 sm:col-span-2">
              <button
                type="button"
                onClick={() => {
                  setStep(0);
                  setTried(false);
                }}
                className={BACK_BTN}
              >
                Back
              </button>
              <button type="button" onClick={create} className={`flex-1 ${PRIMARY_BTN}`}>
                Create Account
              </button>
            </div>
          </div>

          {/* ── Page 3 — Success ────────────────────────────────── */}
          <SuccessPanel
            title="You're all set!"
            message="Your company is ready. Let's start hiring."
            ctaLabel="Post your first job"
            onCta={() => router.push("/company/dashboard")}
            redirectIn={redirectIn}
          />
        </StepCarousel>
      </div>
    </div>
  );
}
