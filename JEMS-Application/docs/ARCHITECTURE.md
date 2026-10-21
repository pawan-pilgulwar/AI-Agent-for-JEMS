# Architecture

## Overview

JEMS is a Next.js App Router application with two primary user roles —
**student** and **company** — each with their own signup flow and dashboard.

## Directory layout

```
app/
  about/ careers/ contact/ pricing/         marketing pages
  login/ signup/ forgot-password/           auth pages
  student/                                  student-facing app
    dashboard/ applications/ interviews/ jobs/
    learning/ profile/ progress/ resume/ saved/ settings/ support/ help/
  company/dashboard/                        company-facing app
  api/
    account/ auth/ register/ student/       route handlers (see API.md)

components/
  signup/          multi-step signup UI (student + company), OTP modal
  auth/ dashboard/ resume/ jobs/ interviews/ learning/ progress/
  saved/ settings/ support/ help/ applications/
  ui/ Hero/ Navbar/ sections/               shared/presentational components

lib/
  auth/            password hashing
  db/              MongoDB access (users, student data, OTP, password reset)
  email/           SMTP mailer + email templates
  validation/      server-side input validation
  redis.ts          ioredis client
  rate-limit.ts     Redis-backed rate limiting
  http.ts            bounded JSON body parsing helper

scripts/
  setupDatabase.js   creates collections + indexes
  testConnection.js  connectivity check
  seedDemo.js        demo data seeding
```

## Roles & flows

- **Student**: signs up via `components/signup/StudentSignup.tsx`, verifies
  email via OTP, gets a profile in `studentProfiles`, and uses the
  `/student/*` dashboard (resume builder, applications, interviews, jobs,
  learning paths, progress tracking).
- **Company**: signs up via `components/signup/CompanySignup.tsx`, gets a
  profile in `companyProfiles`, and uses `/company/dashboard` to post jobs
  and review candidates.

Signup is a shared shell (`SignupShell.tsx`) with a step carousel
(`StepCarousel.tsx`), role choice (`RoleChoice.tsx`), and per-field
verification (`VerifiableField.tsx`) — see [AUTH.md](./AUTH.md) for the OTP
flow.

## Data layer

MongoDB is the system of record (see [DATABASE.md](./DATABASE.md)). Redis is
used only for ephemeral state: rate limiting counters (`lib/rate-limit.ts`).

## Security notes baked into the codebase

- All API route bodies are parsed with `readJsonLimited` (bounded size) and
  every field is coerced to a primitive type before use, to prevent NoSQL
  injection via operator objects (e.g. `{"email": {"$ne": null}}`).
- Passwords are hashed before storage (`lib/auth/password.ts`).
- OTP codes are never stored in plaintext — only an HMAC-SHA256 digest
  keyed by `AUTH_SECRET`, compared with `timingSafeEqual`.
- Sensitive endpoints (register, OTP, password reset) are rate-limited per
  IP via `lib/rate-limit.ts`.
