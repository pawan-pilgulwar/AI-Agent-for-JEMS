import type { MenuGroup } from "../types";

/** Mega-menu configuration for authenticated students. */
export const studentMenus: MenuGroup[] = [
  {
    label: "Learning",
    items: [
      {
        title: "Resume Builder",
        description: "Build ATS-optimized resumes",
        href: "/student/resume",
      },
      {
        title: "Mock Interviews",
        description: "Practice & prep",
        href: "/mock-interviews",
      },
      {
        title: "Learning Paths",
        description: "Personalized paths",
        href: "/learning-paths",
      },
      {
        title: "My Progress",
        description: "Track journey",
        href: "/progress",
      },
    ],
  },
  {
    label: "Jobs",
    items: [
      {
        title: "Job Matches",
        description: "Find opportunities",
        href: "/job-matches",
      },
      {
        title: "Saved Jobs",
        description: "Bookmarked jobs",
        href: "/saved-jobs",
      },
      {
        title: "Applications",
        description: "Track status",
        href: "/applications",
      },
      {
        title: "Interview Prep",
        description: "Ready for it",
        href: "/interview-prep",
      },
    ],
  },
  {
    label: "Profile",
    items: [
      {
        title: "My Profile",
        description: "Edit info",
        href: "/profile",
      },
      {
        title: "Skills",
        description: "Manage skills",
        href: "/skills",
      },
      {
        title: "Resume Versions",
        description: "All resumes",
        href: "/resume-versions",
      },
      {
        title: "Settings",
        description: "Preferences",
        href: "/settings",
      },
    ],
  },
];

/** Mega-menu configuration for authenticated companies. */
export const companyMenus: MenuGroup[] = [
  {
    label: "Hiring",
    items: [
      {
        title: "Post Job",
        description: "Create posting",
        href: "/post-job",
      },
      {
        title: "Find Talent",
        description: "Browse talent",
        href: "/find-talent",
      },
      {
        title: "My Postings",
        description: "Manage posts",
        href: "/my-postings",
      },
      {
        title: "Applications",
        description: "Review apps",
        href: "/company-applications",
      },
    ],
  },
  {
    label: "Candidates",
    items: [
      {
        title: "Browse Talent",
        description: "Search candidates",
        href: "/browse-talent",
      },
      {
        title: "Saved Candidates",
        description: "Your saves",
        href: "/saved-candidates",
      },
      {
        title: "Hiring Funnel",
        description: "Track status",
        href: "/hiring-funnel",
      },
      {
        title: "Interview Sched",
        description: "Schedule calls",
        href: "/interview-schedule",
      },
    ],
  },
  {
    label: "Analytics",
    items: [
      {
        title: "Dashboard",
        description: "Overview",
        href: "/dashboard",
      },
      {
        title: "Reports",
        description: "Generate",
        href: "/reports",
      },
      {
        title: "Pricing",
        description: "Manage plan",
        href: "/pricing",
      },
      {
        title: "Team",
        description: "Team members",
        href: "/team",
      },
    ],
  },
];
