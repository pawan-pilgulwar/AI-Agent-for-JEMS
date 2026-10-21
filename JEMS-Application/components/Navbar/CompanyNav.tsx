"use client";

import DesktopMegaMenu from "./DesktopMegaMenu";
import { companyMenus } from "./navData";

interface CompanyNavProps {
  onNavigate?: (href: string) => void;
}

/** Desktop center menus for an authenticated company. */
export default function CompanyNav({ onNavigate }: CompanyNavProps) {
  return <DesktopMegaMenu menus={companyMenus} onNavigate={onNavigate} />;
}
