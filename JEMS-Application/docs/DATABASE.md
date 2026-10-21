# Database

MongoDB database name: `jems_production` (see `scripts/setupDatabase.js`).

## Collections & indexes

| Collection | Indexes |
|---|---|
| `users` | `email` (unique), `role` |
| `studentProfiles` | `userId` (unique), `targetRole`. Also holds `goals` (`{ careerPath, careerTitle, targetPackage, targetCompany, setAt }`) and `skills` (`{ name, level }[]`, credited by passed roadmap modules) |
| `companyProfiles` | `userId` (unique) |
| `resumes` | `studentId`, `atsScore` |
| `jobPostings` | `companyId`, `status`, `requiredSkills`. Also `niceToHave[]`, `type` (Internship / Apprenticeship / Project / Full-time), `experience` — the Matching Agent scores compatibility from these |
| `jobApplications` | `studentId`, `jobId`, `(studentId, jobId)` unique |
| `savedJobs` | `studentId`, `jobId` |
| `candidateMatches` | `jobId`, `studentId`, `matchScore` (desc) |
| `mockInterviews` | `studentId` |
| `learningPaths` | `studentId` |
| `roadmapProgress` | `(studentId, careerPath)` unique — `{ passedModules: number[], lessonsWatched: { [moduleId]: number[] } }` |
| `lessonVideos` | `cacheKey` (unique) — cached AI/fallback lesson slides, shared by all students |
| `skillTestSessions` | `expiresAt` TTL — in-progress skill tests (answer key server-side only) |
| `skillAssessments` | `(studentId, skill)` unique — latest score / pass / `lockedUntil` per skill |
| `studentAnalyses` | `studentId` (unique) — latest multi-agent analysis result (`lib/agents/types.ts: AnalysisResult`) |
| `industryPrograms` | `companyId` — training / certification / workshop / mentorship programs published by companies |
| `collaborations` | `type` — FDPs, faculty internships, industrial training, guest lectures, research, consultancy, challenges, live projects |
| `collaborationInterests` | `(userId, collaborationId)` unique — faculty "express interest" records |
| `institutionProfiles`, `facultyProfiles` | `userId` (unique) |
| `scheduledInterviews` | `studentId` |
| `activityLogs` | `userId` |
| `notifications` | `userId` |
| `passwordResets` | `email` (unique); `expiresAt` TTL index (auto-deletes expired docs) |
| `signupOtps` | `email` (unique); `expiresAt` TTL index (auto-deletes expired docs) |

Collections created with no indexes beyond `_id`: `studentAnalytics`,
`companyAnalytics`, `feedback`.

## Ephemeral / short-lived collections

- **`signupOtps`** — one active OTP per email (`lib/db/signup-otp.ts`). Code
  is stored as an HMAC-SHA256 digest, 10-minute TTL, max 5 verify attempts.
- **`passwordResets`** — mirrors the same pattern for the forgot-password
  flow (`lib/db/password-reset.ts`).

Both rely on MongoDB's TTL index (`expireAfterSeconds: 0` on `expiresAt`) to
self-clean rather than a cron job.

## Redis

Used only for rate limiting (`lib/redis.ts`, `lib/rate-limit.ts`) — no
durable data is stored there.

## Setup

Run `npm run setup-db` (`scripts/setupDatabase.js`) to create all
collections and indexes idempotently. Safe to re-run.
