/** Static option sets for the student & company signup forms. */

export interface CardOption {
  value: string;
  title: string;
  desc?: string;
}

/* ── Student ─────────────────────────────────────────────────────── */

export const EXPERIENCE_LEVELS: CardOption[] = [
  { value: "beginner", title: "Beginner", desc: "Never worked in tech" },
  { value: "intermediate", title: "Intermediate", desc: "1–3 years experience" },
  { value: "advanced", title: "Advanced", desc: "4+ years experience" },
  { value: "expert", title: "Expert", desc: "Industry veteran" },
];

export const TARGET_ROLES = [
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Data Engineer",
  "Product Manager",
  "Designer",
  "DevOps Engineer",
  "QA Engineer",
];

export const LEARNING_STYLES: CardOption[] = [
  { value: "visual", title: "Visual", desc: "Videos, diagrams, charts" },
  { value: "example", title: "Example-based", desc: "Code examples, demos" },
  { value: "handson", title: "Hands-on", desc: "Practice, projects" },
  { value: "theory", title: "Theory-first", desc: "Concepts, then practice" },
  { value: "mix", title: "Mix of everything", desc: "A blend of all styles" },
];

export const YEARS_OPTIONS: { value: string; label: string }[] = [
  { value: "0", label: "0 years (Fresh graduate)" },
  { value: "1", label: "1 year" },
  { value: "2-3", label: "2–3 years" },
  { value: "4-5", label: "4–5 years" },
  { value: "5+", label: "5+ years" },
];

/* ── Company ─────────────────────────────────────────────────────── */

export const COMPANY_SIZES: CardOption[] = [
  { value: "1-50", title: "1–50", desc: "employees" },
  { value: "51-200", title: "51–200", desc: "employees" },
  { value: "201-1000", title: "201–1000", desc: "employees" },
  { value: "1000+", title: "1000+", desc: "employees" },
];

export const INDUSTRIES = [
  "Technology",
  "Finance",
  "Healthcare",
  "Retail",
  "Education",
  "Manufacturing",
  "SaaS",
  "Other",
];

export const HIRING_ROLES = [
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Data Engineer",
  "Product Manager",
  "Designer",
  "DevOps Engineer",
  "QA Engineer",
  "Sales/Business Dev",
  "HR/Operations",
  "Other",
];

export const REMOTE_PREFS: CardOption[] = [
  { value: "remote", title: "Remote only", desc: "Fully distributed" },
  { value: "hybrid", title: "Hybrid", desc: "Mix of office & home" },
  { value: "onsite", title: "On-site only", desc: "In the office" },
  { value: "flexible", title: "Flexible", desc: "Open to anything" },
];
