"use client";

import { useState } from "react";
import type { UserRole } from "../types";
import { MenuIcon } from "./icons";
import Logo from "./Logo";
import MobileMenu from "./MobileMenu";
import { companyMenus, studentMenus } from "./navData";
import PostLoginNavbar from "./PostLoginNavbar";
import PreLoginNavbar, { preLoginLinks } from "./PreLoginNavbar";
import ProfileMenu from "./ProfileMenu";

export interface NavbarProps {
  isAuthenticated: boolean;
  userRole: UserRole;
  /** Active page key — highlights the matching pre-login link. */
  currentPage?: string;
  /** Display name shown in the profile dropdown when authenticated. */
  displayName?: string;
  onLogout?: () => void;
  onNavigate?: (href: string) => void;
  /** Triggered by "Log in" — wire to your auth flow. */
  onLogin?: () => void;
  /** Triggered by "Sign Up" — wire to your auth flow. */
  onSignup?: () => void;
}

/**
 * Conditional, responsive navbar.
 * - Unauthenticated: simple links + Log in / Sign Up.
 * - Authenticated: role-based 2x2 mega-menus + profile dropdown.
 */
export default function Navbar({
  isAuthenticated,
  userRole,
  displayName,
  onLogout,
  onNavigate,
}: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeMenus = userRole === "company" ? companyMenus : studentMenus;

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-navy/[0.06] bg-white/85 backdrop-blur-md">
      <div className="relative mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Logo className="h-9" />

        {/* Desktop center + right (hidden on mobile) */}
        {isAuthenticated ? (
          <PostLoginNavbar
            userRole={userRole}
            displayName={displayName}
            onNavigate={onNavigate}
            onLogout={onLogout}
          />
        ) : (
          <PreLoginNavbar />
        )}

        {/* Mobile controls (hidden on desktop) */}
        <div className="ml-auto flex items-center gap-2 md:hidden">
          {isAuthenticated && (
            <ProfileMenu
              displayName={displayName}
              onNavigate={onNavigate}
              onLogout={onLogout}
            />
          )}
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-navy transition-colors hover:bg-surface-2"
          >
            <MenuIcon />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <MobileMenu
          isAuthenticated={isAuthenticated}
          userRole={userRole}
          menus={activeMenus}
          preLoginLinks={preLoginLinks}
          onClose={() => setMobileOpen(false)}
          onNavigate={onNavigate}
          onLogout={onLogout}
        />
      )}
    </header>
  );
}
