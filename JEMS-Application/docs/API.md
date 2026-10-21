# API Reference

All routes are Next.js App Router route handlers under `app/api/`.

| Route | Methods | Purpose |
|---|---|---|
| `/api/auth/[...nextauth]` | GET/POST | NextAuth session, login, sign-out |
| `/api/auth/send-signup-otp` | POST | Issue an email-verification OTP during signup |
| `/api/auth/verify-signup-otp` | POST | Verify a signup OTP |
| `/api/auth/forgot-password` | POST | Issue a password-reset OTP |
| `/api/auth/verify-reset-otp` | POST | Verify a password-reset OTP |
| `/api/auth/reset-password` | POST | Set a new password after OTP verification |
| `/api/register` | POST | Create a student account (rate-limited: 5/IP/10min) |
| `/api/account` | — | Account management |
| `/api/student/profile` | — | Student profile read/update |
| `/api/student/resume` | GET / PUT | Resume data read/update — skills not verified by JEMS are stripped on save |
| `/api/student/goals` | PATCH | Save career path + target package/company (`lib/validation/roadmap.ts`) |
| `/api/student/roadmap/lesson` | POST | Narrated slide lesson for `{ careerPath, moduleId, lessonIndex }` — Gemini when `GEMINI_API_KEY` is set, deterministic fallback otherwise; cached in `lessonVideos` |
| `/api/student/roadmap/progress` | POST | Mark a lesson watched |
| `/api/student/roadmap/quiz` | POST | Grade a module quiz server-side (answer key never leaves the server); on pass records the module and credits its skills as *verified* |
| `/api/student/assessment/questionnaire` | PATCH | Save the skill + soft-skill questionnaire (rated skills become *claimed*, never verified) |
| `/api/student/assessment/test` | POST / PUT | Start a skill test (server-picked questions, no answer key) / submit answers (server-graded; pass verifies the skill, fail locks it 24h) |
| `/api/student/analysis` | GET / POST | Latest / run the multi-agent career analysis (`lib/agents`) for the signed-in student; result stored in `studentAnalyses` |
| `/api/company/jobs` | GET / POST | Company's openings / post an internship, apprenticeship, project or job with `requiredSkills` |
| `/api/company/programs` | POST | Publish a student learning program (`kind: "program"`) or an academia collaboration (`kind: "collaboration"`) |
| `/api/company/applications/[id]` | PATCH | Move an applicant through the pipeline (company's own openings only) |
| `/api/faculty/interest` | POST | Faculty / institution toggles interest in a collaboration |
| `/api/student/saved-jobs` | GET / POST / DELETE | Saved jobs / save `{ jobId }` (idempotent) / unsave `{ jobId }` or `{ savedId }` |
| `/api/student/applications` | GET / POST | Applications / apply `{ jobId }` (409 if already applied; company is notified) |
| `/api/student/settings` | GET / PATCH | Notification + job preferences; name, target role, location |
| `/api/account/password` | POST | Change password `{ current, next, confirm }` (signup strength rules) |
| `/api/student/support` | GET / POST | Support tickets / open `{ subject, category, message }` |
| `/api/notifications` | GET / PATCH | Bell feed with active AI tasks / mark read |
| `/api/ai/tasks`, `/api/ai/tasks/[id]` | GET | Background AI task status |
| `/api/student/ai/*`, `/api/company/ai/match` | various | AI Agent features, run as background tasks — see [AI_AGENT.md](./AI_AGENT.md) |
| `/api/student/ai/roadmap/[id]/progress` | PATCH | Tick / untick a topic of an AI roadmap `{ step, topic, done }` → `{ topicsDone }` (stored in `aiRoadmaps.topicsDone`; drives Learning Paths progress, no Agent call) |

## Conventions

- Request bodies are parsed with `readJsonLimited` (`lib/http.ts`), which
  caps body size and returns a typed `{ error, status }` on failure.
- Every field pulled from a JSON body is coerced to a primitive (usually via
  a local `asString` helper) before being used in a DB query or business
  logic — never pass raw `unknown` values into a Mongo filter.
- Sensitive endpoints call `rateLimit(key, limit, windowMs)`
  (`lib/rate-limit.ts`, backed by Redis) keyed by `clientIp(request)`, and
  return `tooManyRequests(retryAfter)` on 429.
