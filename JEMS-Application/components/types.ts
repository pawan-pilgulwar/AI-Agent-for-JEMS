export type UserRole = "student" | "company" | null;

export interface StudentMetrics {
  resumeStepsComplete?: number;
  resumeStepsTotal?: number;
  interviewsDone?: number;
  interviewsTotal?: number;
  newJobMatches?: number;
}

export interface CompanyMetrics {
  activeCandidates?: number;
  candidatesTrend?: string;
  openJobs?: number;
  jobsStatus?: string;
  interviewsScheduled?: number;
  nextInterview?: string;
  recentActivity?: Array<{
    name: string;
    role: string;
    time: string;
  }>;
}

/** A single sub-item inside a 2x2 mega-menu dropdown. */
export interface MenuItem {
  title: string;
  description: string;
  href: string;
}

/** A top-level menu with a 2x2 grid dropdown. */
export interface MenuGroup {
  label: string;
  items: MenuItem[];
}
