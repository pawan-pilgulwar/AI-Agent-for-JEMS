"use client";

import type { UserRole } from "../types";
import CompanyNav from "./CompanyNav";
import ProfileMenu from "./ProfileMenu";
import StudentNav from "./StudentNav";

interface PostLoginNavbarProps {
  userRole: UserRole;
  displayName?: string;
  onNavigate?: (href: string) => void;
  onLogout?: () => void;
}

/** Desktop center mega-menus + right profile dropdown for authenticated users. */
export default function PostLoginNavbar({
  userRole,
  displayName,
  onNavigate,
  onLogout,
}: PostLoginNavbarProps) {
  return (
    <>
      <nav className="hidden flex-1 justify-center md:flex">
        {userRole === "company" ? (
          <CompanyNav onNavigate={onNavigate} />
        ) : (
          <StudentNav onNavigate={onNavigate} />
        )}
      </nav>

      <div className="hidden items-center md:flex">
        <ProfileMenu
          displayName={displayName}
          onNavigate={onNavigate}
          onLogout={onLogout}
        />
      </div>
    </>
  );
}
