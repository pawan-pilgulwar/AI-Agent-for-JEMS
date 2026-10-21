/**
 * Guided product tours (React Joyride). Each step is tagged with the pillar of
 * the SIH problem statement it demonstrates, so a judge can map what they see
 * on screen to the "expected solution" list.
 *
 * Steps anchor to `data-tour="…"` attributes. Cross-page steps carry a `route`;
 * the TourProvider navigates there and waits for the target before showing it.
 */

export type TourPillar =
  | "Skill Development"
  | "Internship"
  | "Placement"
  | "Platform"
  | "Collaboration";

export type TourId = "landing" | "student" | "company" | "faculty" | "institution";

export interface TourStep {
  target: string;
  title: string;
  content: string;
  pillar: TourPillar;
  /** Route the target lives on. Omit for same-page tours. */
  route?: string;
  placement?: "top" | "bottom" | "left" | "right" | "auto" | "center";
  /** Highlight a wider element than the one the tooltip anchors to. */
  spotlight?: string;
  /** Skip below the `lg` breakpoint, e.g. sidebar items hidden in the mobile drawer. */
  desktopOnly?: boolean;
}

const DASH = "/student/dashboard";
const COMPANY = "/company/dashboard";
const FACULTY = "/faculty/dashboard";
const INSTITUTION = "/institution/dashboard";

export const TOURS: Record<TourId, { title: string; steps: TourStep[] }> = {
  // ── Pre-login: the pitch, end to end ─────────────────────────────────
  landing: {
    title: "What is JEMS?",
    steps: [
      {
        target: '[data-tour="hero"]',
        placement: "center",
        pillar: "Platform",
        title: "An Academia–Industry Collaboration Portal",
        content:
          "One platform connecting students, industries, academicians and institutions. This quick tour shows how JEMS covers the full journey from skill building to internships and placements.",
      },
      // Module cards sit in a 2-column grid: left-column cards put the tooltip
      // on the right and vice versa. Joyride flips it on narrow screens.
      {
        target: '[data-tour="student-card"]',
        placement: "right",
        pillar: "Skill Development",
        title: "Student module",
        content:
          "Students get clear guidance and a personalised roadmap shaped by what industry actually requires. A skill assessment shows the gap to their target role, roadmap quizzes verify each skill as they learn it, and that verified profile matches them to the right internships and jobs.",
      },
      {
        target: '[data-tour="company-card"]',
        placement: "left",
        pillar: "Placement",
        title: "Industry module",
        content:
          "Companies post internships and roles with the skills they need, and get AI-ranked shortlists of candidates whose skills are already verified. They can also run training programs and track hiring through recruitment analytics.",
      },
      {
        target: '[data-tour="faculty-card"]',
        placement: "right",
        pillar: "Collaboration",
        title: "Academician module",
        content:
          "Academicians gain industry exposure through internships, industrial training and FDPs, and join research collaborations. Live insight into skill demand keeps their teaching relevant as they mentor students.",
      },
      {
        target: '[data-tour="institution-card"]',
        placement: "left",
        pillar: "Platform",
        title: "Institution module",
        content:
          "Institutions monitor every student's skill growth and placement readiness in one place. They manage industry partnerships and MoUs, and export analytics for accreditation and audits.",
      },
      {
        target: '[data-tour="student-button"]',
        placement: "top",
        pillar: "Platform",
        title: "Start your journey",
        content:
          "Choose your role and step inside to see how JEMS works for you, from building skills to getting hired. You can replay this tour anytime from the header.",
      },
    ],
  },

  // ── Post-login: the student dashboard, section by section ────────────
  // Every step lives on the dashboard, so replaying from any student page
  // brings the student back here first.
  student: {
    title: "Your JEMS dashboard",
    steps: [
      {
        route: DASH,
        target: '[data-tour="page"]',
        placement: "center",
        pillar: "Platform",
        title: "Welcome to your dashboard",
        content:
          "This is your home base for building skills and landing internships and jobs. Let's take a quick look at what's here.",
      },
      {
        route: DASH,
        target: '[data-tour="dashboard-stats"]',
        placement: "bottom",
        pillar: "Platform",
        title: "Your progress at a glance",
        content:
          "Job readiness, applications, interviews and learning progress in one row. These numbers update as you learn, apply and practise.",
      },
      {
        route: DASH,
        target: '[data-tour="dashboard-roadmap"]',
        placement: "bottom",
        pillar: "Skill Development",
        title: "Your personalised roadmap",
        content:
          "A step-by-step learning plan for your target role, built from what industry actually requires. Each module ends with a quiz that verifies the skill.",
      },
      {
        route: DASH,
        target: '[data-tour="dashboard-next-steps"]',
        placement: "bottom",
        pillar: "Skill Development",
        title: "Your next steps",
        content:
          "JEMS suggests what to do next, from finishing your profile to your next module. Follow these and you'll always know where to focus.",
      },
      {
        route: DASH,
        target: '[data-tour="dashboard-ai"]',
        placement: "top",
        pillar: "Skill Development",
        title: "AI workspace",
        content:
          "Your AI roadmaps, AI tests waiting to be taken and the skills your GitHub or LeetCode work proves. AI work runs in the background; the bell tells you when it's ready.",
      },
      {
        route: DASH,
        target: '[data-tour="dashboard-jobs"]',
        placement: "top",
        pillar: "Placement",
        title: "Top job matches",
        content:
          "Internships and jobs ranked by how well your verified skills match each role. The higher the match, the better your chances.",
      },
      {
        route: DASH,
        target: '[data-tour="dashboard-profile"]',
        placement: "left",
        pillar: "Platform",
        title: "Profile completion",
        content:
          "A complete profile gets you matched first. Add your resume and skills to reach 100% and unlock priority matching.",
      },
      {
        route: DASH,
        target: '[data-tour="dashboard-upcoming"]',
        placement: "left",
        pillar: "Internship",
        title: "Upcoming",
        content:
          "Interviews, deadlines and events you've signed up for, so nothing slips past you.",
      },
      {
        route: DASH,
        target: '[data-tour="dashboard-skills"]',
        placement: "left",
        pillar: "Skill Development",
        title: "Your verified skills",
        content:
          "Skills you've proven through assessments and roadmap quizzes. These are what recruiters see and what job matching is based on.",
      },
      {
        route: DASH,
        target: '[data-tour="dashboard-activity"]',
        placement: "left",
        pillar: "Platform",
        title: "Recent activity",
        content: "A running log of what you've done lately, from modules passed to applications sent.",
      },
      {
        route: DASH,
        target: '[data-tour="nav-profile"]',
        placement: "right",
        desktopOnly: true,
        pillar: "Skill Development",
        title: "Profile & Portfolio",
        content:
          "Your profile and a shareable portfolio of verified skills, certificates, projects and achievements.",
      },
      {
        route: DASH,
        target: '[data-tour="nav-resume"]',
        placement: "right",
        desktopOnly: true,
        pillar: "Placement",
        title: "Resume Builder",
        content:
          "Build an ATS-friendly resume in minutes. Your verified skills and certificates are imported with one click.",
      },
      {
        route: DASH,
        target: '[data-tour="nav-analysis"]',
        placement: "right",
        desktopOnly: true,
        pillar: "Placement",
        title: "Career Analysis",
        content:
          "See how your verified skills compare with what companies ask for, and let AI read your coding profile for evidence.",
      },
      {
        route: DASH,
        target: '[data-tour="nav-assessment"]',
        placement: "right",
        desktopOnly: true,
        pillar: "Skill Development",
        title: "Assessments",
        content:
          "Rate your skills, then verify them with skill tests or AI-written tests with coding questions. Passing marks the skill as verified.",
      },
      {
        route: DASH,
        target: '[data-tour="nav-jobs"]',
        placement: "right",
        desktopOnly: true,
        pillar: "Placement",
        title: "Job Matches",
        content: "Roles ranked by how well your verified skills fit. Save the ones you like or apply in one click.",
      },
      {
        route: DASH,
        target: '[data-tour="nav-applications"]',
        placement: "right",
        desktopOnly: true,
        pillar: "Internship",
        title: "Applications",
        content:
          "Track every internship and job application, from applied to shortlisted, interview and offer.",
      },
      {
        route: DASH,
        target: '[data-tour="nav-interviews"]',
        placement: "right",
        desktopOnly: true,
        pillar: "Placement",
        title: "Mock Interviews",
        content:
          "Practise AI mock interviews for the roles you're targeting and get scores and feedback to improve.",
      },
      {
        route: DASH,
        target: '[data-tour="nav-learning"]',
        placement: "right",
        desktopOnly: true,
        pillar: "Skill Development",
        title: "Learning Paths",
        content:
          "Training programs, courses and workshops from industry, recommended to close your skill gaps.",
      },
      {
        route: DASH,
        target: '[data-tour="nav-saved"]',
        placement: "right",
        desktopOnly: true,
        pillar: "Placement",
        title: "Saved Jobs",
        content: "Bookmark roles you like and come back to apply when you're ready.",
      },
      {
        route: DASH,
        target: '[data-tour="help"]',
        placement: "bottom",
        pillar: "Platform",
        title: "You're all set",
        content:
          "Replay this tour anytime from this help button. A good first move: open your roadmap and start your first module.",
      },
    ],
  },

  // ── Industry portal ──────────────────────────────────────────────────
  company: {
    title: "Your Industry portal",
    steps: [
      {
        route: COMPANY,
        target: '[data-tour="page"]',
        placement: "center",
        pillar: "Placement",
        title: "Welcome to your Industry portal",
        content:
          "Post jobs and internships, discover students with verified skills, and build your future workforce, all from one place. Here's a quick look around.",
      },
      {
        route: COMPANY,
        target: '[data-tour="company-kpis"]',
        placement: "bottom",
        pillar: "Platform",
        title: "Your hiring at a glance",
        content:
          "Open jobs and internships, applicants, offers, learning programs and academia collaborations. These numbers update as students apply and progress.",
      },
      {
        route: COMPANY,
        target: '[data-tour="company-post"]',
        placement: "left",
        pillar: "Internship",
        title: "Post a job or internship",
        content:
          "List the role along with the skills it requires. JEMS uses those skills to find and rank the students who match best.",
      },
      {
        route: COMPANY,
        target: '[data-tour="company-applicants"]',
        placement: "top",
        pillar: "Placement",
        title: "Recent applicants",
        content:
          "Every applicant comes with a skill-match score built on verified skills, not self-reported claims, so the strongest fits stand out.",
      },
      {
        route: COMPANY,
        target: '[data-tour="company-pipeline"]',
        placement: "left",
        pillar: "Placement",
        title: "Hiring pipeline",
        content: "See how many candidates are at each stage, from applied to shortlisted, interviewing and offered.",
      },
      {
        route: COMPANY,
        target: '[data-tour="company-skills"]',
        placement: "left",
        pillar: "Skill Development",
        title: "Skills you're hiring for",
        content:
          "The skills your openings ask for most. This demand also guides what students learn and what institutions focus on.",
      },
      {
        route: COMPANY,
        target: '[data-tour="company-openings"]',
        placement: "top",
        pillar: "Internship",
        title: "Your openings",
        content:
          "All your active jobs and internships. Open the shortlist on any role to see students ranked by how well they match.",
      },
      {
        route: COMPANY,
        target: '[data-tour="nav-opportunities"]',
        placement: "right",
        desktopOnly: true,
        pillar: "Internship",
        title: "Jobs / Internships",
        content: "Create and manage every job, internship, apprenticeship and project, each with the skills it requires.",
      },
      {
        route: COMPANY,
        target: '[data-tour="nav-candidates"]',
        placement: "right",
        desktopOnly: true,
        pillar: "Placement",
        title: "Candidates",
        content:
          "Skill-ranked shortlists for each opening. Review verified profiles and move candidates through your hiring pipeline.",
      },
      {
        route: COMPANY,
        target: '[data-tour="nav-programs"]',
        placement: "right",
        desktopOnly: true,
        pillar: "Collaboration",
        title: "Programs",
        content:
          "Publish training, workshops and mentorships for students, and collaborations like FDPs and research projects for academicians.",
      },
      {
        route: COMPANY,
        target: '[data-tour="help"]',
        placement: "bottom",
        pillar: "Platform",
        title: "You're all set",
        content: "Replay this tour anytime from here. A good first move: post a job or internship and see who matches.",
      },
    ],
  },

  // ── Academician portal ───────────────────────────────────────────────
  faculty: {
    title: "Your Academician portal",
    steps: [
      {
        route: FACULTY,
        target: '[data-tour="page"]',
        placement: "center",
        pillar: "Collaboration",
        title: "Welcome to your Academician portal",
        content:
          "Connect with industry through FDPs, faculty internships, industrial training and research, and bring real-world practice into your teaching.",
      },
      {
        route: FACULTY,
        target: '[data-tour="collab-stats"]',
        placement: "bottom",
        pillar: "Collaboration",
        title: "Collaboration at a glance",
        content:
          "How many programs are open, how many are FDPs and training or research and consultancy, and how many you've shown interest in.",
      },
      {
        route: FACULTY,
        target: '[data-tour="collab-filters"]',
        placement: "bottom",
        pillar: "Collaboration",
        title: "Find what fits you",
        content:
          "Filter by type, such as FDPs, faculty internships, guest lectures, research or live projects, to see only what's relevant to you.",
      },
      {
        route: FACULTY,
        target: '[data-tour="collab-grid"] > :first-child',
        placement: "right",
        pillar: "Collaboration",
        title: "Programs from industry partners",
        content:
          "Each card shows the company, dates, duration, location, seats and focus areas, so you can decide at a glance.",
      },
      {
        route: FACULTY,
        target: '[data-tour="collab-grid"] > :first-child button',
        placement: "bottom",
        pillar: "Collaboration",
        title: "Express interest",
        content:
          "One click tells the company and your institution you'd like to join. You can withdraw anytime.",
      },
      {
        route: FACULTY,
        target: '[data-tour="help"]',
        placement: "bottom",
        pillar: "Platform",
        title: "You're all set",
        content: "Replay this tour anytime from here. Start by filtering for FDPs or faculty internships in your field.",
      },
    ],
  },

  // ── Institution portal ───────────────────────────────────────────────
  institution: {
    title: "Your Institution portal",
    steps: [
      {
        route: INSTITUTION,
        target: '[data-tour="page"]',
        placement: "center",
        pillar: "Platform",
        title: "Welcome to your Institution portal",
        content:
          "Monitor how your students progress from skill gaps to internships and placements, and manage your industry partnerships, all in one place.",
      },
      {
        route: INSTITUTION,
        target: '[data-tour="inst-kpis"]',
        placement: "bottom",
        pillar: "Platform",
        title: "Your institution at a glance",
        content:
          "Students, average placement readiness, verified skills earned, applications and offers, updated as your students progress.",
      },
      {
        route: INSTITUTION,
        target: '[data-tour="inst-skill-gaps"]',
        placement: "right",
        pillar: "Skill Development",
        title: "Skill gap statistics",
        content:
          "Compare what industry demands with how many of your students have verified each skill. The biggest gaps show where to focus training.",
      },
      {
        route: INSTITUTION,
        target: '[data-tour="inst-demand"]',
        placement: "top",
        pillar: "Skill Development",
        title: "Industry demand trends",
        content: "The skills most requested in current openings, so your curriculum can keep pace with industry.",
      },
      {
        route: INSTITUTION,
        target: '[data-tour="inst-readiness"]',
        placement: "left",
        pillar: "Placement",
        title: "Placement readiness",
        content: "How many students fall into each readiness band, so you can support those who need it most.",
      },
      {
        route: INSTITUTION,
        target: '[data-tour="inst-pipeline"]',
        placement: "left",
        pillar: "Internship",
        title: "Application pipeline",
        content: "Track your students' internship and job applications, from applied to interview and offer.",
      },
      {
        route: INSTITUTION,
        target: '[data-tour="inst-interests"]',
        placement: "right",
        pillar: "Platform",
        title: "Career interests",
        content: "The target roles your students have chosen, to guide placement drives and industry outreach.",
      },
      {
        route: INSTITUTION,
        target: '[data-tour="inst-collab"]',
        placement: "top",
        pillar: "Collaboration",
        title: "Industry collaboration",
        content:
          "Upcoming FDPs, training and research programs from industry partners, and how many of your faculty are interested.",
      },
      {
        route: INSTITUTION,
        target: '[data-tour="inst-students"]',
        placement: "top",
        pillar: "Placement",
        title: "Every student, in one table",
        content:
          "Sort students by readiness, modules passed or applications to spot who's thriving and who needs support.",
      },
      {
        route: INSTITUTION,
        target: '[data-tour="nav-collaborations"]',
        placement: "right",
        desktopOnly: true,
        pillar: "Collaboration",
        title: "Collaborations",
        content: "Browse every industry program open to your faculty, from FDPs to research and live projects.",
      },
      {
        route: INSTITUTION,
        target: '[data-tour="help"]',
        placement: "bottom",
        pillar: "Platform",
        title: "You're all set",
        content: "Replay this tour anytime from here. Start with the skill gap statistics to see where your students need support.",
      },
    ],
  },
};

export const PILLAR_STYLE: Record<TourPillar, string> = {
  "Skill Development": "bg-emerald/10 text-emerald",
  Internship: "bg-sky-50 text-sky-700",
  Placement: "bg-slate/10 text-slate",
  Platform: "bg-navy/10 text-navy",
  Collaboration: "bg-violet-50 text-violet-700",
};
