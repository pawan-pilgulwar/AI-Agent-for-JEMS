import {
  BarChart3,
  Bookmark,
  Briefcase,
  ClipboardCheck,
  FileText,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  LifeBuoy,
  type LucideIcon,
  Mic,
  Route,
  Settings,
  Target,
  User,
} from "lucide-react";

export interface NavItem {
  label: string;
  icon: LucideIcon;
  /** Real route. Items without one are visual-only (page not built yet). */
  href?: string;
}

/** `data-tour` anchor for a nav item, e.g. "nav-resume" for /student/resume. */
export function navTourId(item: NavItem): string | undefined {
  return item.href ? `nav-${item.href.split("/").pop()}` : undefined;
}

export const NAVIGATE: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/student/dashboard" },
  { label: "Profile & Portfolio", icon: User, href: "/student/profile" },
  { label: "Resume Builder", icon: FileText, href: "/student/resume" },
  { label: "Career Analysis", icon: BarChart3, href: "/student/analysis" },
  { label: "Assessments", icon: ClipboardCheck, href: "/student/assessment" },
  { label: "Mock Interviews", icon: Mic, href: "/student/interviews" },
  { label: "Roadmap", icon: Route, href: "/student/roadmap" },
  { label: "Learning Paths", icon: GraduationCap, href: "/student/learning" },
];

export const JOBS: NavItem[] = [
  { label: "Job Matches", icon: Target, href: "/student/jobs" },
  { label: "Applications", icon: Briefcase, href: "/student/applications" },
  { label: "Saved Jobs", icon: Bookmark, href: "/student/saved" },
];

export const MORE: NavItem[] = [
  { label: "Settings", icon: Settings, href: "/student/settings" },
  { label: "Help Center", icon: HelpCircle, href: "/student/help" },
  { label: "Support", icon: LifeBuoy, href: "/student/support" },
];

/** Breadcrumbs for pages that are reachable from links but not listed in the menu. */
const HIDDEN_CRUMBS: Record<string, string> = {
  "/student/roadmap": "Roadmap",
  "/student/progress": "My Progress",
  "/student/portfolio": "Portfolio",
};

/** The breadcrumb label for the current route, used by the topbar. */
export function crumbForPath(pathname: string): string {
  const entries: [string, string][] = [
    ...[...NAVIGATE, ...JOBS, ...MORE].flatMap((item): [string, string][] => (item.href ? [[item.href, item.label]] : [])),
    ...Object.entries(HIDDEN_CRUMBS),
  ];
  // Longest matching prefix wins, so /student/roadmap/ai/x is "AI Roadmaps",
  // not "Roadmap". Nested routes inherit their section's label.
  const match = entries
    .filter(([href]) => pathname === href || pathname.startsWith(href + "/"))
    .sort((a, b) => b[0].length - a[0].length)[0];
  return match?.[1] ?? "Dashboard";
}
