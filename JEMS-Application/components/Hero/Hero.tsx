"use client";

import type { CompanyMetrics, StudentMetrics, UserRole } from "../types";
import CompanyHero from "./CompanyHero";
import PreLoginHero from "./PreLoginHero";
import StudentHero from "./StudentHero";

export interface HeroProps {
  isAuthenticated: boolean;
  userRole: UserRole;
  studentName?: string;
  companyName?: string;
  readinessPercentage?: number;
  studentMetrics?: StudentMetrics;
  companyMetrics?: CompanyMetrics;
  onNavigate?: (href: string) => void;
  onStartLearning?: () => void;
  onForCompanies?: () => void;
  /** Sends an authenticated student straight to their dashboard. */
  onGoToDashboard?: () => void;
}

/**
 * Conditional hero that renders the right experience for the auth state:
 * marketing (logged out), student dashboard, or company dashboard.
 * A top padding offsets the fixed navbar (h-16).
 */
export default function Hero({
  isAuthenticated,
  userRole,
  studentName,
  companyName,
  readinessPercentage,
  studentMetrics,
  companyMetrics,
  onNavigate,
  onStartLearning,
  onForCompanies,
  onGoToDashboard,
}: HeroProps) {
  return (
    <div className="pt-15">
      {!isAuthenticated ? (
        <PreLoginHero
          onStartLearning={onStartLearning}
          onForCompanies={onForCompanies}
        />
      ) : userRole === "company" ? (
        <CompanyHero
          companyName={companyName}
          companyMetrics={companyMetrics}
          onNavigate={onNavigate}
        />
      ) : (
        <StudentHero
          studentName={studentName}
          readinessPercentage={readinessPercentage}
          studentMetrics={studentMetrics}
          onNavigate={onNavigate}
          onGoToDashboard={onGoToDashboard}
        />
      )}
    </div>
  );
}
