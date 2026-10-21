"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { MenuGroup, UserRole } from "../types";
import { ChevronDownIcon, CloseIcon } from "./icons";
import Logo from "./Logo";

interface SimpleLink {
  label: string;
  href: string;
}

interface MobileMenuProps {
  isAuthenticated: boolean;
  userRole: UserRole;
  menus: MenuGroup[];
  preLoginLinks: SimpleLink[];
  onClose: () => void;
  onNavigate?: (href: string) => void;
  onLogin?: () => void;
  onSignup?: () => void;
  onLogout?: () => void;
}

/** Full-screen overlay menu that slides down from the top on mobile/tablet (<768px). */
export default function MobileMenu({
  isAuthenticated,
  menus,
  preLoginLinks,
  onClose,
  onNavigate,
  onLogout,
}: MobileMenuProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  // Lock body scroll while the overlay is open.
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  const go = (href: string) => {
    onNavigate?.(href);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] md:hidden">
      <div
        className="absolute inset-0 bg-navy/20"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="absolute inset-x-0 top-0 flex max-h-screen flex-col overflow-y-auto bg-white shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
        style={{ animation: "slide-down 0.25s ease-out" }}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <div className="flex items-center justify-between border-b border-lightgray px-5 py-4">
          <Logo onClick={() => go("/")} />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-navy transition-colors hover:bg-surface-2"
          >
            <CloseIcon />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4">
          {isAuthenticated ? (
            <ul className="flex flex-col gap-1">
              {menus.map((group) => {
                const isOpen = expanded === group.label;
                return (
                  <li key={group.label}>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() =>
                        setExpanded(isOpen ? null : group.label)
                      }
                      className="flex w-full items-center justify-between rounded-lg px-4 py-3 text-base font-semibold text-navy transition-colors hover:bg-surface-2"
                    >
                      {group.label}
                      <ChevronDownIcon
                        className={`transition-transform duration-200 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <ul className="ml-2 mt-1 flex flex-col gap-0.5 border-l-2 border-lightgray pl-3">
                        {group.items.map((item) => (
                          <li key={item.title}>
                            <button
                              type="button"
                              onClick={() => go(item.href)}
                              className="flex w-full flex-col items-start rounded-lg px-3 py-2 text-left transition-colors hover:bg-surface-2"
                            >
                              <span className="text-sm font-medium text-navy">
                                {item.title}
                              </span>
                              <span className="text-xs text-mediumgray">
                                {item.description}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <ul className="flex flex-col gap-1">
              {preLoginLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    onClick={onClose}
                    className="block w-full rounded-lg px-4 py-3 text-left text-base font-medium text-navy transition-colors hover:bg-surface-2"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </nav>

        <div className="border-t border-lightgray px-5 py-4">
          {isAuthenticated ? (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => go("/profile")}
                className="w-full rounded-lg px-4 py-3 text-left text-sm font-medium text-navy transition-colors hover:bg-surface-2"
              >
                View Profile
              </button>
              <button
                type="button"
                onClick={() => go("/settings")}
                className="w-full rounded-lg px-4 py-3 text-left text-sm font-medium text-navy transition-colors hover:bg-surface-2"
              >
                Account Settings
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLogout?.();
                }}
                className="w-full rounded-lg px-4 py-3 text-center text-sm font-semibold text-orange transition-colors hover:bg-orange/5"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <Link
                href="/login"
                onClick={onClose}
                className="w-full rounded-full border border-lightgray px-5 py-3 text-center text-sm font-semibold text-navy transition-colors hover:bg-surface-2"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                onClick={onClose}
                className="w-full rounded-full bg-cta-gradient px-5 py-3 text-center text-sm font-semibold text-white shadow-[var(--shadow-cta)] transition-transform hover:scale-[1.02]"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
