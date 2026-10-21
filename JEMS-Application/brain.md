# JEMS — Project Brain

Single-file context dump for this repo. For split-out reference docs see
[`docs/`](./docs/README.md) (setup, architecture, database, auth, API).

## What this is

JEMS is a career-platform web app connecting **students** and **companies**:
students build resumes, apply to jobs, do mock interviews, and follow
learning paths; companies post jobs and review/match candidates. Built with
Next.js App Router, MongoDB, Redis, NextAuth v5.

## Tech stack

- Next.js 16.2.9 (App Router), React 19.2.4, TypeScript
- MongoDB (`mongodb` driver, no ORM) — primary datastore
- Redis (`ioredis`) — rate limiting only, not durable data
- NextAuth v5 (beta) — credentials + GitHub OAuth
- Tailwind CSS 4, shadcn, `@base-ui/react`, lucide-react icons
- Nodemailer — transactional email (OTPs, password reset)

⚠️ **Read `AGENTS.md` before writing Next.js code** — this project pins a
Next.js version whose APIs/conventions may diverge from an LLM's training
data. Check `node_modules/next/dist/docs/` for the real behavior before
assuming.

## Current repo state (as of this writing)

Working tree has uncommitted changes on `main` — signup flow and OTP
verification are mid-development:

- New, not yet committed: `app/api/auth/send-signup-otp/`,
  `app/api/auth/verify-signup-otp/`, `lib/db/signup-otp.ts`, `docs/`
- Modified: most of `components/signup/*`, `components/resume/ResumeBuilder.tsx`,
  `components/GithubButton.tsx`, `lib/email/templates.ts`,
  `scripts/setupDatabase.js`, `app/globals.css`

Recent commit history (newest first): `ui changes` → `some cahnges` →
`password recovery` → `sb created` → `sb created` → initial Next.js
scaffold commits. No PRs/branches — everything lands on `main` directly.

## Data model (MongoDB, db `jems_production`)

Core collections: `users`, `studentProfiles`, `companyProfiles`, `resumes`,
`jobPostings`, `jobApplications`, `savedJobs`, `candidateMatches`,
`mockInterviews`, `learningPaths`, `roadmapProgress`, `lessonVideos`,
`scheduledInterviews`, `activityLogs`, `notifications`, `studentAnalytics`,
`companyAnalytics`, `feedback`.

Ephemeral, self-expiring (TTL index on `expiresAt`): `signupOtps`,
`passwordResets` — both store only an HMAC-SHA256 digest of the code, never
plaintext.

`users` doc shape (`lib/db/users.ts`): `{ name, email, role: "student"|"company",
authProvider: "credentials"|"github", passwordHash?, image?, phone?,
emailVerified?, createdAt, updatedAt }`. Creating a student also inserts a
paired `studentProfiles` doc (`userId` FK). GitHub OAuth sign-in
auto-upserts a `users` row via `upsertGithubStudent`.

Full collection/index list → [`docs/DATABASE.md`](./docs/DATABASE.md).

## Auth flows

1. **Credentials signup**: multi-step UI (`components/signup/SignupShell.tsx`
   + `StepCarousel.tsx`) → email OTP verification
   (`send-signup-otp` / `verify-signup-otp`, 10-min TTL, 5 attempts max) →
   `POST /api/register` creates the account. Passwords are strength-checked
   (`components/signup/password.ts`) and hashed (`lib/auth/password.ts`)
   before storage.
2. **GitHub OAuth**: `components/GithubButton.tsx` → NextAuth →
   `upsertGithubStudent` (always role `student`, `emailVerified` set
   immediately).
3. **Password reset**: mirrors the signup-OTP pattern via
   `lib/db/password-reset.ts` and `/api/auth/forgot-password` →
   `verify-reset-otp` → `reset-password`.

Details → [`docs/AUTH.md`](./docs/AUTH.md).

## Roadmap feature (`/student/roadmap`)

Ported from the SIH demo. Static career roadmaps live in `lib/roadmap/data.ts`
(14 careers, phases → modules; module ids are stable, append-only). Flow:
`/student/roadmap/goals` (pick career; pre-selected from signup `targetRole`)
→ `/student/roadmap` (phase timeline, sequential unlocking) →
`/student/roadmap/[moduleId]` (narrated slide lessons + quiz, pass mark 70%).
Quizzes are built deterministically in `lib/roadmap/module.ts` so the server
regrades them (`/api/student/roadmap/quiz`) without exposing answer keys.
Passing a module writes `roadmapProgress` and merges the module's skills into
`studentProfiles.skills`. Lessons come from Gemini when `GEMINI_API_KEY` is
set, else a deterministic fallback (`lib/roadmap/lesson.ts`); either way they're
cached in `lessonVideos`.

## Multi-role prototype (SIH architecture)

Four roles (`users.role`): `student`, `company`, `institution`, `faculty`.
`lib/auth/require-role.ts` gates each portal layout and maps roles to homes;
login and the landing page redirect by role. Demo logins → `docs/SETUP.md`.

- **AI layer** — `lib/agents/` (`engine.ts`, `types.ts`, `llm.ts`). Six
  rule-based, deterministic agents (Analysis → Roadmap → Learning → Assessment →
  Matching → Collaboration) run under `runAnalysisPipeline()`, each emitting a
  log trace the UI replays (`components/analysis/CareerAnalysis.tsx`,
  `/student/analysis`). **No LLM is used**; `llm.ts` is the documented Ollama
  integration point. `scoreAgainst()` is the shared skill-compatibility scorer
  (also used by `/student/jobs` and the company candidate shortlist).
- **Assess first (Assessment Agent)** — `lib/assessment/` (`bank.ts` question
  bank for 12 skills, `engine.ts` seeded pick / grading / soft-skill scoring)
  and `lib/db/assessment.ts`. `/student/assessment`: questionnaire (self-rate
  industry-shared skills + soft-skill/aptitude questions → **claimed** skills,
  `source: "claimed"`, `verified: false`) then timed skill tests
  (`/student/assessment/test/[skill]`; server holds the answer key in
  `skillTestSessions`, pass ≥70% → `verified: true, source: "skill-test"`, fail
  → 24h `lockedUntil` in `skillAssessments`). Roadmap quizzes are the other
  verification path (`source: "roadmap"`).
- **Verified-only rule** — the resume Skills section is a checklist over
  verified skills (no free text) and `PUT /api/student/resume` strips anything
  unverified; the public portfolio shows verified skills only; the Analysis
  Agent counts only verified skills as strengths and `scoreAgainst()` weights a
  claim at 0.5; institution skill coverage counts verified skills only.
- **Digital portfolio** — the Portfolio tab of `/student/profile`
  (`?tab=portfolio`; `/student/portfolio` redirects there) and `/p/[id]`
  (public, read-only) from `lib/db/portfolio.ts`.
- **Industry portal** — `/company/*` (`lib/db/company.ts`): openings with
  `requiredSkills`, skill-ranked candidates + pipeline status, programs and
  collaborations. Client-safe constants live in `lib/company/constants.ts`
  (never import runtime values from `lib/db/*` into client components — it
  drags `mongodb` into the browser bundle).
- **Institution** — `/institution/dashboard` (`lib/db/institution.ts`): cohort
  KPIs, skill-gap vs demand, readiness bands, pipeline, students table.
- **Faculty** — `/faculty/dashboard` (`lib/db/collaborations.ts`): browse
  FDPs / faculty internships / research etc., express interest.
- `components/portal/PortalShell.tsx` is the shared shell for the three
  non-student portals (nav icons are passed by *name* — server layouts can't
  pass component functions to it).

## Guided product tours (React Joyride v3)

`components/tour/` — `tours.ts` defines two tours whose steps are tagged with
the SIH problem-statement pillar they demonstrate: `landing` (pre-login pitch,
button in the hero) and `student` (cross-page workspace walkthrough; auto-runs
once per browser on the first dashboard visit, replay via the `?` topbar
button). `TourProvider` sits in `components/Providers.tsx`; cross-route steps
push their `route` in a Joyride `before` hook and wait for the target to mount.
Anchors: `data-tour="page"` on `DashboardContainer` (so any student page's first
card is targetable), `data-tour="sidebar" | "dashboard-stats" | "help" | "hero"`,
plus the landing sections' existing `id`s.

## Security conventions to preserve

These patterns are deliberate — keep them when touching this code:

- **NoSQL injection guard**: every value pulled from a JSON body is coerced
  to a primitive (`String(x ?? "")`, local `asString` helpers) *before* it
  touches a Mongo query or gets used anywhere else. Never pass raw
  `unknown`/body values straight into a `find`/`updateOne` filter.
- **OTP/reset codes are HMAC-SHA256 digests** (keyed by `AUTH_SECRET`),
  compared with `crypto.timingSafeEqual` — never store or log plaintext
  codes beyond the outbound email.
- **Rate limiting** (`lib/rate-limit.ts`) on abuse-prone endpoints
  (register, OTP send/verify, password reset), keyed by `clientIp(request)`.
  Redis-backed with an automatic per-process in-memory fallback if Redis is
  unreachable — the app must never hard-fail because Redis is down.
- **Bounded body parsing**: `lib/http.ts: readJsonLimited` caps request body
  size on every route handler.

## Environment variables (`.env.local`)

`MONGODB_URI`, `REDIS_URL`, `AUTH_SECRET`, `SMTP_HOST`, `SMTP_PORT`,
`SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`. Full detail →
[`docs/SETUP.md`](./docs/SETUP.md).

## Scripts

```bash
npm run dev         # dev server
npm run setup-db     # idempotent: create Mongo collections + indexes
npm run test-db       # connectivity check
npm run seed-demo      # seed demo data
npm run build / start / lint
```

## Open threads / things to watch

- Signup + OTP verification components are all mid-edit and uncommitted —
  don't assume the flow in `docs/AUTH.md` is fully wired end-to-end in the
  UI until this lands.
- `docs/` was just added and is not yet linked from the root `README.md`
  (which is still the default `create-next-app` boilerplate).
- No test suite currently exists in the repo (no `test` script beyond
  `test-db`, which only checks DB connectivity).
