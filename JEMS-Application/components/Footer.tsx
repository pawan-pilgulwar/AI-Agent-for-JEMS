"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const product = [
  { label: "For students", href: "/signup" },
  { label: "For companies", href: "/signup" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Pricing", href: "/pricing" },
];

const company = [
  { label: "About", href: "/about" },
  { label: "Careers", href: "/careers" },
  { label: "Contact", href: "/contact" },
];

/** Site footer — always visible (authenticated and not). */
export default function Footer() {
  return (
    <footer className="relative z-10 bg-navy text-white">
      <div className="mx-auto max-w-7xl px-4 pb-10 pt-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 border-b border-white/10 pb-12 lg:grid-cols-12">
          {/* Brand + newsletter */}
          <div className="lg:col-span-6">
            <Image src="/logo.png" alt="Jems" width={782} height={697} className="h-9 w-auto" />
            <p className="mt-6 max-w-sm text-[15px] leading-7 text-white/65">
              The education-to-employment platform where students verify skills, companies hire on evidence, and institutions see the whole pipeline.
            </p>
            <form onSubmit={(e) => e.preventDefault()} className="mt-7 flex max-w-md flex-col gap-3 sm:flex-row">
              <input
                type="email"
                required
                placeholder="you@example.com"
                aria-label="Email address"
                className="h-11 w-full rounded-full border border-white/15 bg-white/5 px-4 text-sm text-white placeholder:text-white/40 outline-none transition-colors focus:border-orange focus:ring-2 focus:ring-orange/30"
              />
              <button
                type="submit"
                className="group inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-full bg-cta-gradient px-6 text-sm font-semibold text-white shadow-[var(--shadow-cta)] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
              >
                Weekly tips
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </button>
            </form>
          </div>

          {/* Links */}
          <div className="grid grid-cols-2 gap-8 lg:col-span-6 lg:grid-cols-2 lg:pl-12">
            <div>
              <h3 className="text-sm font-semibold text-white">Product</h3>
              <ul className="mt-4 space-y-3">
                {product.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-[15px] text-white/65 transition-colors hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Company</h3>
              <ul className="mt-4 space-y-3">
                {company.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-[15px] text-white/65 transition-colors hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-start justify-between gap-4 pt-8 text-sm text-white/50 sm:flex-row sm:items-center">
          <p>© 2026 Jems. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="transition-colors hover:text-white">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-white">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
