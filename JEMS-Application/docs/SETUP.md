# Setup

## Prerequisites

- Node.js
- A MongoDB instance (Atlas or local)
- A Redis instance (used for rate limiting via `ioredis`)
- SMTP credentials for outbound email (OTPs, password reset)

## Environment variables (`.env.local`)

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `REDIS_URL` | Redis connection string |
| `AUTH_URL` | Canonical app URL (`http://localhost:3000` in dev). The GitHub OAuth App's callback URL must be exactly `<AUTH_URL>/api/auth/callback/github` |
| `AUTH_SECRET` | NextAuth secret; also used to HMAC-hash OTP codes |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | GitHub OAuth App client ID / secret |
| `SMTP_HOST` | SMTP server host |
| `SMTP_PORT` | SMTP server port |
| `SMTP_SECURE` | `true`/`false` — use TLS |
| `SMTP_USER` | SMTP auth username |
| `SMTP_PASS` | SMTP auth password |
| `SMTP_FROM` | From address for outbound mail |
| `GEMINI_API_KEY` | *Optional.* Google Gemini key for AI-generated roadmap lessons (free at aistudio.google.com). Unset → built-in deterministic lessons |
| `GEMINI_MODEL` | *Optional.* Defaults to `gemini-2.0-flash` |

## Demo accounts

`npm run seed-demo` creates one login per role (password `Demo@1234` for all):

| Role | Email | Lands on |
|---|---|---|
| Student | `demo@jems.dev` | `/student/dashboard` |
| Company (industry) | `company@jems.dev` | `/company/dashboard` |
| Institution (admin) | `institution@jems.dev` | `/institution/dashboard` |
| Faculty (academician) | `faculty@jems.dev` | `/faculty/dashboard` |

Plus a 12-student demo cohort (`student1@demo.jems` …) so the institution analytics have data.

## Install & run

```bash
npm install
npm run setup-db   # creates Mongo collections + indexes (scripts/setupDatabase.js)
npm run dev        # start dev server on localhost:3000
```

## Other scripts

```bash
npm run test-db     # verify Mongo connectivity (scripts/testConnection.js)
npm run seed-demo   # seed demo data (scripts/seedDemo.js)
npm run build        # production build
npm run start        # run production build
npm run lint          # eslint
```
