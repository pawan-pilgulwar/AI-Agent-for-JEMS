"use client";

import DesktopMegaMenu from "./DesktopMegaMenu";
import { studentMenus } from "./navData";

interface StudentNavProps {
  onNavigate?: (href: string) => void;
}

/** Desktop center menus for an authenticated student. */
export default function StudentNav({ onNavigate }: StudentNavProps) {
  return <DesktopMegaMenu menus={studentMenus} onNavigate={onNavigate} />;
}
