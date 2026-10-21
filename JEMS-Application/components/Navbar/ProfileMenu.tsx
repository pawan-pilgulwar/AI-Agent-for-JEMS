"use client";

import { useEffect, useRef, useState } from "react";
import { UserIcon } from "./icons";

interface ProfileMenuProps {
  displayName?: string;
  onNavigate?: (href: string) => void;
  onLogout?: () => void;
}

/** Avatar button that opens a click-based dropdown (View Profile / Settings / Logout). */
export default function ProfileMenu({
  displayName,
  onNavigate,
  onLogout,
}: ProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const initial = displayName?.trim()?.charAt(0)?.toUpperCase() || "U";

  const menuItems = [
    { label: "View Profile", action: () => onNavigate?.("/profile") },
    { label: "Account Settings", action: () => onNavigate?.("/settings") },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open profile menu"
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-gradient text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition-transform hover:scale-105"
      >
        {displayName ? initial : <UserIcon className="text-white" />}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-lightgray bg-white py-1 shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
          style={{ animation: "fade-in 0.2s ease-out" }}
        >
          {displayName && (
            <div className="border-b border-lightgray px-4 py-2.5">
              <p className="text-xs text-mediumgray">Signed in as</p>
              <p className="truncate text-sm font-semibold text-navy">
                {displayName}
              </p>
            </div>
          )}
          {menuItems.map((item) => (
            <button
              key={item.label}
              role="menuitem"
              type="button"
              onClick={() => {
                item.action();
                setOpen(false);
              }}
              className="block w-full px-4 py-2.5 text-left text-sm text-navy transition-colors hover:bg-surface-2 hover:text-slate"
            >
              {item.label}
            </button>
          ))}
          <div className="my-1 border-t border-lightgray" />
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              setOpen(false);
              onLogout?.();
            }}
            className="block w-full px-4 py-2.5 text-left text-sm font-medium text-orange transition-colors hover:bg-orange/5"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
