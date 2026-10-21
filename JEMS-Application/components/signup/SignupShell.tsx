"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import Logo from "@/components/Navbar/Logo";

/**
 * Signup chrome — a soft gray backdrop framing a single bordered white card,
 * matching the bordered-card language used across the dashboard (see e.g.
 * `ProfilePage`'s `border border-lightgray bg-white` panels). The whole
 * layout is pinned to the viewport height — header fixed up top, card
 * vertically centered below it — so the page itself never scrolls. The
 * card has no scrollbar of its own; each step is sized to comfortably fit
 * the viewport, and the (rare) overflow case scrolls the whole content
 * area rather than clipping inside the card's border.
 */
export default function SignupShell({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex h-dvh flex-col overflow-hidden bg-surface"
      style={{
        backgroundImage:
          "radial-gradient(1100px circle at 12% -10%, rgba(234,88,12,0.07), transparent 55%), radial-gradient(900px circle at 100% 110%, rgba(245,158,11,0.06), transparent 55%)",
      }}
    >
      <header className="flex shrink-0 items-center border-b border-lightgray/70 bg-white/80 px-6 py-4 backdrop-blur-sm lg:px-10">
        <Logo className="h-7" />
        <Link
          href="/login"
          className="ml-auto text-sm font-semibold text-navy transition-colors hover:text-navy/70"
        >
          Log in
        </Link>
      </header>

      <div className="flex min-h-0  flex-1 items-center justify-center overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-[980px] rounded-2xl border border-lightgray/80 bg-white p-6 shadow-[0_2px_8px_rgba(17,24,39,0.04),0_24px_48px_-24px_rgba(17,24,39,0.14)] sm:p-8 lg:p-10">
          {children}
        </div>
      </div>
    </div>
  );
}
