"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const preLoginLinks = [
  { label: "About", href: "/about" },
  { label: "Pricing", href: "/pricing" },
  { label: "Careers", href: "/careers" },
  { label: "Contact", href: "/contact" },
];

/** Desktop center links + right auth buttons for unauthenticated visitors. */
export default function PreLoginNavbar() {
  const pathname = usePathname();

  return (
    <>
      <nav className="hidden flex-1 justify-center md:flex">
        <ul className="flex items-center gap-1">
          {preLoginLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <li key={link.label}>
                <Link
                  href={link.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`relative rounded-lg px-3 py-2 text-sm font-medium transition-colors after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:rounded-full after:bg-orange after:transition-transform after:duration-200 ${
                    isActive ? "text-navy after:scale-x-100" : "text-ink-soft after:scale-x-0 hover:text-navy hover:after:scale-x-100"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="hidden items-center gap-2 md:flex">
        <Link
          href="/login"
          className="rounded-full px-4 py-2 text-sm font-semibold text-navy transition-colors hover:bg-surface"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="rounded-full bg-cta-gradient px-5 py-2 text-sm font-semibold text-white shadow-[var(--shadow-cta)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-6px_rgba(234,88,12,0.5)] active:translate-y-0"
        >
          Sign Up
        </Link>
      </div>
    </>
  );
}
