"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { JOBS, MORE, NAVIGATE, navTourId, type NavItem } from "./nav-items";
import { UserAvatar } from "./ui";

/** Text that is hidden while the rail is collapsed and fades in on hover — or always shown once pinned open. */
function revealClass(pinned: boolean) {
  if (pinned) return "whitespace-nowrap transition-opacity duration-200 opacity-100";
  return "whitespace-nowrap transition-opacity duration-200 opacity-100 lg:hidden lg:opacity-0 lg:group-hover:inline-block lg:group-hover:opacity-100";
}

/** Centers icons while collapsed, left-aligns on hover — or always left-aligned once pinned open. */
function justifyClass(pinned: boolean) {
  return pinned ? "lg:justify-start" : "lg:justify-center lg:group-hover:justify-start";
}

function NavList({
  title,
  items,
  pathname,
  pinned,
  onNavigate,
}: {
  title: string;
  items: NavItem[];
  pathname: string;
  pinned: boolean;
  onNavigate: () => void;
}) {
  return (
    <div>
      <p
        className={`${revealClass(pinned)} mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-mediumgray`}
      >
        {title}
      </p>
      <ul className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = !!item.href && (pathname === item.href || pathname.startsWith(item.href + "/"));
          const cls = `group/item flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-all ${justifyClass(pinned)} ${
            isActive
              ? "bg-orange/10 text-orange"
              : "text-ink-soft hover:bg-surface hover:text-navy"
          }`;
          const inner = (
            <>
              <Icon
                className="h-[18px] w-[18px] shrink-0 transition-transform group-hover/item:scale-110"
                strokeWidth={2}
              />
              <span className={`${revealClass(pinned)} flex-1 truncate text-left`}>{item.label}</span>
            </>
          );
          return (
            <li key={item.label} data-tour={navTourId(item)}>
              {item.href ? (
                <Link href={item.href} onClick={onNavigate} aria-current={isActive ? "page" : undefined} className={cls}>
                  {inner}
                </Link>
              ) : (
                <button type="button" onClick={onNavigate} className={`w-full ${cls}`}>
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Aceternity-style sidebar: a slim 64px icon rail (icons centered) that
 * expands to 240px on hover, fading labels in. Mobile is a slide-in drawer.
 */
export default function Sidebar({
  open,
  onClose,
  pinned,
  onTogglePinned,
  name,
  email,
  image,
}: {
  open: boolean;
  onClose: () => void;
  /** Keeps the rail expanded even without hover, once the user clicks the pin toggle. */
  pinned: boolean;
  onTogglePinned: () => void;
  name: string;
  email: string;
  image: string | null;
}) {
  const pathname = usePathname();

  return (
    <>
      {open && (
        <div
          aria-hidden="true"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-navy/30 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        data-tour="sidebar"
        className={`group fixed inset-y-0 left-0 z-50 flex h-screen w-60 flex-col overflow-hidden border-r border-navy/[0.06] bg-white transition-[width,transform,box-shadow] duration-300 ease-in-out ${
          open ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 ${
          pinned
            ? "lg:w-60"
            : "lg:w-16 lg:hover:w-60 lg:hover:shadow-[12px_0_40px_-8px_rgba(17,24,39,0.12)]"
        }`}
      >
        {/* User card */}
        <div className="px-2.5 pt-3">
          <div className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 ${justifyClass(pinned)}`}>
            <UserAvatar name={name} image={image} />
            <span className={`${revealClass(pinned)} min-w-0 flex-1`}>
              <span className="block truncate text-[13px] font-semibold text-navy">{name}</span>
              <span className="block truncate text-[11px] text-mediumgray">{email}</span>
            </span>
            <button
              type="button"
              onClick={onTogglePinned}
              aria-label={pinned ? "Collapse sidebar" : "Keep sidebar open"}
              aria-pressed={pinned}
              className={`${revealClass(pinned)} ml-auto shrink-0 rounded-lg p-1.5 text-mediumgray transition-colors hover:bg-surface hover:text-navy`}
            >
              {pinned ? (
                <PanelLeftClose className="h-5 w-5" />
              ) : (
                <PanelLeftOpen className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        <div className="mx-3 my-2 h-px bg-navy/[0.06]" />

        {/* Nav */}
        <nav className="flex-1 space-y-4 overflow-y-auto px-2.5 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <NavList title="Navigate" items={NAVIGATE} pathname={pathname} pinned={pinned} onNavigate={onClose} />
          <NavList title="Jobs" items={JOBS} pathname={pathname} pinned={pinned} onNavigate={onClose} />
          <NavList title="More" items={MORE} pathname={pathname} pinned={pinned} onNavigate={onClose} />
        </nav>
      </aside>
    </>
  );
}
