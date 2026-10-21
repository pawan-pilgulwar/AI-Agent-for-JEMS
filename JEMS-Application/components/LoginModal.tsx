"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { UserRole } from "./types";

interface DemoAccount {
  email: string;
  password: string;
  role: Exclude<UserRole, null> | "admin";
  name: string;
}

/** Demo accounts wired for testing the conditional UI. */
export const demoAccounts: DemoAccount[] = [
  {
    email: "student@test.com",
    password: "TestStudent123!",
    role: "student",
    name: "Alex Kumar",
  },
  {
    email: "company@test.com",
    password: "TestCompany123!",
    role: "company",
    name: "Tech Innovations Inc.",
  },
  {
    email: "admin@test.com",
    password: "AdminTest123!",
    role: "admin",
    name: "Admin",
  },
];

interface LoginModalProps {
  open: boolean;
  /** Hint which role the user intended (from "Sign Up" vs "For Companies"). */
  intendedRole?: UserRole;
  onClose: () => void;
  onLogin: (role: "student" | "company", name: string) => void;
}

/**
 * Lightweight demo auth modal. Validates against {@link demoAccounts} so the
 * conditional navbar/hero can be exercised without a real backend.
 */
export default function LoginModal({
  open,
  intendedRole,
  onClose,
  onLogin,
}: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  const quickFill = (acct: DemoAccount) => {
    setEmail(acct.email);
    setPassword(acct.password);
    setError(null);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const match = demoAccounts.find(
      (a) => a.email === email.trim() && a.password === password,
    );
    if (!match) {
      setError("Invalid credentials. Try a demo account below.");
      return;
    }
    if (match.role === "admin") {
      setError("Admin console isn't part of this landing page demo.");
      return;
    }
    onLogin(match.role, match.name);
    setEmail("");
    setPassword("");
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-navy/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Log in"
        className="relative w-full max-w-md rounded-2xl border border-lightgray bg-white p-7 shadow-[0_8px_30px_rgba(0,0,0,0.18)]"
        style={{ animation: "fade-in 0.2s ease-out" }}
      >
        <div className="mb-5 text-center">
          <Image
            src="/logo.png"
            alt="Jems"
            width={782}
            height={697}
            className="mx-auto h-8 w-auto"
          />
          <p className="mt-1 text-sm text-mediumgray">
            {intendedRole === "company"
              ? "Sign in to your company account"
              : "Welcome back — sign in to continue"}
          </p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="login-email"
              className="mb-1 block text-sm font-medium text-navy"
            >
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              className="w-full rounded-lg border border-lightgray px-3.5 py-2.5 text-sm text-navy outline-none transition-colors focus:border-slate focus:ring-2 focus:ring-slate/20"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label
              htmlFor="login-password"
              className="mb-1 block text-sm font-medium text-navy"
            >
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              className="w-full rounded-lg border border-lightgray px-3.5 py-2.5 text-sm text-navy outline-none transition-colors focus:border-slate focus:ring-2 focus:ring-slate/20"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-orange/5 px-3 py-2 text-sm text-orange">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="mt-1 w-full rounded-full bg-cta-gradient px-5 py-3 text-sm font-semibold text-white shadow-[var(--shadow-cta)] transition-transform hover:scale-[1.02]"
          >
            Log in
          </button>
        </form>

        <div className="mt-6 border-t border-lightgray pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-mediumgray">
            Quick demo login
          </p>
          <div className="flex flex-col gap-2">
            {demoAccounts.map((acct) => (
              <button
                key={acct.email}
                type="button"
                onClick={() => quickFill(acct)}
                className="flex items-center justify-between rounded-lg border border-lightgray px-3 py-2 text-left text-sm transition-colors hover:bg-surface-2"
              >
                <span className="font-medium capitalize text-navy">
                  {acct.role}
                </span>
                <span className="text-xs text-mediumgray">{acct.email}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 text-mediumgray transition-colors hover:text-navy"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
