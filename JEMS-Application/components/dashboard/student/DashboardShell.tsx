"use client";

import Topbar from "./Topbar";
import { useSidebarPinned } from "./sidebar-context";

/** Page content wrapper that widens to use the extra room freed up when the sidebar isn't pinned open. */
export function DashboardContainer({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const pinned = useSidebarPinned();
  return (
    <div
      data-tour="page"
      className={`mx-auto transition-[max-width] duration-300 ease-in-out ${
        pinned ? "max-w-6xl" : "max-w-7xl"
      } ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Per-page chrome: the topbar plus the main content column. The sidebar
 * itself lives in StudentShell (rendered once by the layout) so it survives
 * navigating between dashboard pages.
 */
export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Topbar />
      <main id="main" className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </>
  );
}
