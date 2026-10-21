# JEMS Documentation

JEMS is a Next.js job/career platform connecting students and companies —
signup and auth, student profiles/resumes, job postings/applications, mock
interviews, and learning paths.

## Contents

- [SETUP.md](./SETUP.md) — local dev environment, required env vars, DB setup
- [ARCHITECTURE.md](./ARCHITECTURE.md) — app structure, routing, tech stack
- [AUTH.md](./AUTH.md) — signup, login, OTP verification, password reset
- [DATABASE.md](./DATABASE.md) — MongoDB collections, indexes, Redis usage
- [API.md](./API.md) — API route reference

## Stack

- Next.js 16 (App Router), React 19
- MongoDB (primary datastore), Redis (`ioredis`, rate limiting)
- NextAuth v5 (beta) for session/credentials auth
- Tailwind CSS 4, shadcn, Base UI
- Nodemailer (SMTP) for transactional email
