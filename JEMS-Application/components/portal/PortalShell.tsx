"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { BarChart3, Briefcase, GraduationCap, Handshake, HelpCircle, LayoutDashboard, LogOut, type LucideIcon, Menu, Users, X } from "lucide-react";
import Logo from "@/components/Navbar/Logo";
import NotificationBell from "@/components/notifications/NotificationBell";
import { useTour } from "@/components/tour/TourProvider";
import type { TourId } from "@/components/tour/tours";

/** Icon *names* — server layouts can't pass component functions to a client component. */
const ICONS: Record<string, LucideIcon> = { BarChart3, Briefcase, GraduationCap, Handshake, LayoutDashboard, Users };

export interface PortalNavItem {
  label: string;
  href: string;
  icon: keyof typeof ICONS;
}

/**
 * Lightweight sidebar + topbar used by the company, institution and faculty
 * portals. Kept separate from the student shell, which is tied to the
 * student context/profile.
 */
export default function PortalShell({
  roleLabel,
  nav,
  name,
  email,
  tour,
  children,
}: {
  roleLabel: string;
  nav: PortalNavItem[];
  name: string;
  email: string;
  /** Guided tour replayed from the header's help button. */
  tour?: TourId;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { start: startTour } = useTour();
  const [open, setOpen] = useState(false);
  const initial = name.trim().charAt(0).toUpperCase() || "U";
  const current = nav.find((n) => pathname === n.href || pathname.startsWith(n.href + "/"));

  const links = (
    <ul className="space-y-1">
      {nav.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = ICONS[item.icon] ?? LayoutDashboard;
        return (
          <li key={item.href} data-tour={`nav-${item.href.split("/").pop()}`}>
            <Link
              href={item.href}
              onClick={() => setOpen(false)}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors ${
                active ? "bg-orange/10 text-orange" : "text-ink-soft hover:bg-surface hover:text-navy"
              }`}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="min-h-screen bg-surface">
      {/* Sidebar */}
      <aside
        data-tour="sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-navy/[0.06] bg-white transition-transform duration-300 ease-in-out lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-16 items-center justify-between border-b border-navy/[0.06] px-4">
          <Logo className="h-8" />
          <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="rounded-lg p-1.5 text-mediumgray hover:bg-surface lg:hidden"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-4 pb-2 pt-4">
          <span className="text-xs font-medium text-mediumgray">{roleLabel} portal</span>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-2">{links}</nav>
        <div className="border-t border-navy/[0.06] p-3">
          <div className="flex items-center gap-3 rounded-xl px-2 py-1.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange text-sm font-semibold text-white">{initial}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-navy">{name}</span>
              <span className="block truncate text-[11px] text-mediumgray">{email}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-mediumgray transition-colors hover:bg-surface hover:text-navy"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>
      {open && <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-navy/40 lg:hidden" />}

      <div className="flex min-h-screen flex-col lg:pl-60">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-navy/[0.06] bg-white/90 px-4 backdrop-blur-md sm:px-6">
          <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" className="flex h-9 w-9 items-center justify-center rounded-lg text-navy hover:bg-surface lg:hidden"><Menu className="h-5 w-5" /></button>
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm text-mediumgray">
            <span className="hidden sm:inline">{roleLabel}</span>
            <span className="hidden sm:inline">/</span>
            <span className="truncate font-medium text-navy" aria-current="page">{current?.label ?? "Dashboard"}</span>
          </nav>
          <div className="ml-auto flex items-center gap-1.5">
            <NotificationBell />
            {tour && (
              <button
                type="button"
                data-tour="help"
                onClick={() => startTour(tour)}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-mediumgray transition-colors hover:bg-surface hover:text-navy"
              >
                <HelpCircle className="h-5 w-5" />
                <span className="hidden sm:inline">Take the tour</span>
              </button>
            )}
          </div>
        </header>
        <main id="main" className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div data-tour="page" className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
