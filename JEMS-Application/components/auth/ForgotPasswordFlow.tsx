"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { PasswordField } from "@/components/signup/PasswordField";

const inputClass =
  "w-full rounded-lg border border-lightgray px-3.5 py-2.5 text-sm text-navy outline-none transition-colors focus:border-slate focus:ring-2 focus:ring-slate/20";
const buttonClass =
  "mt-1 flex w-full items-center justify-center gap-2 rounded-full bg-cta-gradient px-5 py-3 text-sm font-semibold text-white shadow-[var(--shadow-cta)] transition-transform hover:scale-[1.02] disabled:opacity-60 disabled:hover:scale-100";
const OTP_LENGTH = 6;

type Step = "email" | "otp" | "password" | "done";

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

interface ForgotPasswordFlowProps {
  /** Called when the user backs out to the login form (or finishes and wants to log in). */
  onBackToLogin: () => void;
}

/**
 * Email -> OTP -> new password flow. Rendered standalone at /forgot-password
 * and inline (swapped into the login page's right panel) so the logic lives
 * in one place.
 */
export function ForgotPasswordFlow({ onBackToLogin }: ForgotPasswordFlowProps) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notRegistered, setNotRegistered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const otpInputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const t = setTimeout(() => setResendSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendSeconds]);

  const requestOtp = async () => {
    setLoading(true);
    setError(null);
    setNotRegistered(false);
    const { ok, data } = await postJson("/api/auth/forgot-password", { email });
    setLoading(false);
    if (!ok) {
      if (data.code === "not_registered") {
        setNotRegistered(true);
      } else {
        setError(data.error || "Something went wrong. Please try again.");
      }
      return;
    }
    setOtp(Array(OTP_LENGTH).fill(""));
    setResendSeconds(30);
    setStep("otp");
    setTimeout(() => otpInputs.current[0]?.focus(), 60);
  };

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    await requestOtp();
  };

  const setOtpAt = (i: number, raw: string) => {
    const v = raw.replace(/\D/g, "").slice(-1);
    setOtp((prev) => {
      const next = [...prev];
      next[i] = v;
      return next;
    });
    setError(null);
    if (v && i < OTP_LENGTH - 1) otpInputs.current[i + 1]?.focus();
  };

  const onOtpKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) otpInputs.current[i - 1]?.focus();
    if (e.key === "ArrowLeft" && i > 0) otpInputs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < OTP_LENGTH - 1) otpInputs.current[i + 1]?.focus();
  };

  const onOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = Array(OTP_LENGTH).fill("");
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setOtp(next);
    otpInputs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
  };

  const submitOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length !== OTP_LENGTH) return;
    setLoading(true);
    setError(null);
    const { ok, data } = await postJson("/api/auth/verify-reset-otp", { email, otp: code });
    setLoading(false);
    if (!ok) {
      setError(data.error || "Invalid or expired code.");
      setOtp(Array(OTP_LENGTH).fill(""));
      otpInputs.current[0]?.focus();
      return;
    }
    setResetToken(data.resetToken);
    setStep("password");
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    setError(null);
    const { ok, data } = await postJson("/api/auth/reset-password", {
      email,
      resetToken,
      password,
    });
    setLoading(false);
    if (!ok) {
      setError(data.error || "Something went wrong. Please try again.");
      return;
    }
    setStep("done");
  };

  return (
    <div>
      {step === "email" && (
        <>
          <h2 className="text-2xl font-extrabold tracking-tight text-navy">
            Forgot your password?
          </h2>
          <p className="mt-1 text-sm text-mediumgray">
            Enter your email and we&apos;ll send you a 6-digit code to reset it.
          </p>
          <form onSubmit={submitEmail} className="mt-6 flex flex-col gap-4">
            <div>
              <label htmlFor="reset-email" className="mb-1 block text-sm font-medium text-navy">
                Email
              </label>
              <input
                id="reset-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                  setNotRegistered(false);
                }}
                className={inputClass}
                placeholder="you@example.com"
              />
            </div>
            {notRegistered && (
              <p className="rounded-lg border border-orange/20 bg-orange/5 px-3.5 py-3 text-sm text-navy">
                No account exists for that email.{" "}
                <Link href="/signup" className="font-semibold text-orange hover:underline">
                  Create an account
                </Link>{" "}
                first.
              </p>
            )}
            {error && (
              <p className="rounded-lg bg-orange/5 px-3 py-2 text-sm text-orange">{error}</p>
            )}
            <button type="submit" disabled={loading || !email} className={buttonClass}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Sending…" : "Send code"}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-mediumgray">
            <button
              type="button"
              onClick={onBackToLogin}
              className="font-semibold text-orange hover:underline"
            >
              Back to log in
            </button>
          </p>
        </>
      )}

      {step === "otp" && (
        <>
          <h2 className="text-2xl font-extrabold tracking-tight text-navy">Check your email</h2>
          <p className="mt-1 text-sm text-mediumgray">
            Enter the 6-digit code we sent to{" "}
            <span className="font-semibold text-navy">{email}</span>.
          </p>
          <form onSubmit={submitOtp} className="mt-6 flex flex-col gap-4">
            <div className="flex justify-center gap-2.5" onPaste={onOtpPaste}>
              {otp.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    otpInputs.current[i] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) => setOtpAt(i, e.target.value)}
                  onKeyDown={(e) => onOtpKeyDown(i, e)}
                  aria-label={`Digit ${i + 1}`}
                  className="h-12 w-11 rounded-lg border border-lightgray text-center text-xl font-bold text-navy outline-none transition-colors focus:border-slate focus:ring-2 focus:ring-slate/20"
                />
              ))}
            </div>
            {error && (
              <p className="rounded-lg bg-orange/5 px-3 py-2 text-sm text-orange">{error}</p>
            )}
            <button type="submit" disabled={loading || otp.some((d) => !d)} className={buttonClass}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Verifying…" : "Verify code"}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-mediumgray">
            Didn&apos;t get it?{" "}
            {resendSeconds > 0 ? (
              <span>
                Resend in <span className="font-semibold text-navy">{resendSeconds}s</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={requestOtp}
                className="font-semibold text-orange hover:underline"
              >
                Resend code
              </button>
            )}
          </p>
        </>
      )}

      {step === "password" && (
        <>
          <h2 className="text-2xl font-extrabold tracking-tight text-navy">
            Set a new password
          </h2>
          <p className="mt-1 text-sm text-mediumgray">
            Choose a strong password for your account.
          </p>
          <form onSubmit={submitPassword} className="mt-6 flex flex-col gap-4">
            <PasswordField
              id="reset-password"
              label="New password"
              value={password}
              onChange={(v) => {
                setPassword(v);
                setError(null);
              }}
              showMeter
              forbiddenTerms={[email]}
            />
            <PasswordField
              id="reset-confirm-password"
              label="Confirm password"
              value={confirmPassword}
              onChange={(v) => {
                setConfirmPassword(v);
                setError(null);
              }}
              valid={!!confirmPassword && confirmPassword === password}
              error={
                confirmPassword && confirmPassword !== password
                  ? "Passwords don't match."
                  : null
              }
            />
            {error && (
              <p className="rounded-lg bg-orange/5 px-3 py-2 text-sm text-orange">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading || !password || password !== confirmPassword}
              className={buttonClass}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Saving…" : "Reset password"}
            </button>
          </form>
        </>
      )}

      {step === "done" && (
        <>
          <h2 className="text-2xl font-extrabold tracking-tight text-navy">Password reset</h2>
          <p className="mt-2 text-sm leading-relaxed text-mediumgray">
            Your password has been updated. You can now log in with your new password.
          </p>
          <button type="button" onClick={onBackToLogin} className={`${buttonClass} mt-6`}>
            Back to log in
          </button>
        </>
      )}
    </div>
  );
}
