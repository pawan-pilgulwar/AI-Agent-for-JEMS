# JEMS

JEMS (Exponentor) is a career-readiness and placement platform that connects
students, companies, institutions, and faculty. It combines a Next.js web
application with a separate AI analysis and coding-assessment service.

## What the project does

- **Students** can build a career profile and resume, track jobs and
  applications, practice interviews, set career goals, follow skill roadmaps,
  and take assessments.
- **Companies** can publish jobs and learning programs, manage applicants, and
  review candidate matches.
- **Institutions and faculty** can take part in placement and industry
  collaboration workflows.
- **AI career tools** can analyze skills and evidence, identify prerequisites,
  recommend a learning roadmap, generate assessments, and explain candidate
  matches.
- **Coding assessments** can execute submissions using Judge0 and grade them
  against test cases.

The web platform and the AI/code-runner stack are separate components. The web
application uses MongoDB and Redis; the Agent service uses an LLM provider and
Judge0 for its AI and code-execution features.

## Repository layout

```text
.
├── Agent/
│   ├── analyzer/           FastAPI AI agents, assessment API, and Judge0 client
│   ├── judge0/             Judge0 language configuration
│   ├── docker-compose.yml  MongoDB, PostgreSQL, Redis, Judge0, and analyzer
│   ├── API_GUIDE.md        Agent endpoints and request/response examples
│   └── postman/            Postman collection and environment
├── JEMS-Application/
│   ├── app/                Next.js pages and API route handlers
│   ├── components/         Shared UI and role-specific components
│   ├── lib/                Authentication, database, agents, and utilities
│   ├── scripts/            Database setup, connectivity, and demo seeding
│   └── docs/               Setup, architecture, API, auth, and database docs
└── README.md
```

## Technology

### Web application

- Next.js 16 App Router and React 19
- TypeScript, Tailwind CSS 4, and reusable UI components
- MongoDB for user, profile, job, learning, and assessment data
- NextAuth for authentication
- Redis for rate limiting
- Nodemailer/SMTP for verification and account emails

### AI and assessment service

- FastAPI and Uvicorn
- OpenAI-compatible LLM client (configured for Gemini by default)
- Judge0 for isolated code execution
- Docker Compose for the service dependencies

## Set up the web application after cloning

### Prerequisites

- Git
- Node.js 20.9 or later and npm
- A MongoDB database, either local or hosted (for example, MongoDB Atlas)
- PowerShell on Windows, or a terminal with equivalent commands

Optional:

- Redis, for shared rate limiting (without it, the app uses in-memory limits)
- SMTP credentials, to send verification and password-reset emails
- A GitHub OAuth app, to enable GitHub sign-in
- Docker Desktop, to run the optional Agent and coding-assessment services

### Clone the repository

Run these commands in the directory where you want the project:

```powershell
git clone https://github.com/pawan-pilgulwar/Agent-for-Exponentor.git
cd Agent-for-Exponentor
```

### Configure and start

1. Change into the web application folder:

   ```powershell
   cd .\JEMS-Application
   ```

2. Create your local environment file from the example:

   ```powershell
   Copy-Item .env.example .env.local
   ```

3. Open `.env.local` and set at least:

   - `MONGODB_URI` to your MongoDB connection string. For Atlas, create a
     database user, allow your machine to connect in Network Access, and use
     the connection string provided by Atlas.
   - `AUTH_SECRET` to a private random value. Generate one with:

     ```powershell
     node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
     ```

   - `AUTH_URL` to `http://localhost:3000` for local development.

   The remaining integrations are optional. Set `REDIS_URL` if you have Redis;
   without it, rate limiting is in-memory. Set `SMTP_HOST`, `SMTP_PORT`,
   `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` to enable email delivery. Set
   `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` to enable GitHub sign-in; the
   GitHub OAuth callback URL must be
   `http://localhost:3000/api/auth/callback/github`. `GEMINI_API_KEY` is
   optional for AI-generated roadmap lessons. See
   [the setup guide](JEMS-Application/docs/SETUP.md#environment-variables-envlocal)
   for more detail.

4. Install dependencies, create the MongoDB collections and indexes, and start
   the development server:

   ```powershell
   npm install
   npm run setup-db
   npm run dev
   ```

   Keep this terminal open while using the app. Open
   [http://localhost:3000](http://localhost:3000) in your browser.

The database setup script is safe to run again. If database initialization
fails, check `MONGODB_URI` and verify that MongoDB is running and reachable.
For local demo accounts and sample platform data, run `npm run seed-demo` after
configuring the environment and database. The demo password is `Demo@1234`;
use seeded accounts only in local development.

Useful application commands (run from `JEMS-Application/`):

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Build the production application |
| `npm run start` | Serve a production build |
| `npm run lint` | Run ESLint |
| `npm run setup-db` | Create MongoDB collections and indexes |
| `npm run test-db` | Check the MongoDB connection |
| `npm run seed-demo` | Create local demo users and platform data |

## Optional: run the Agent and coding-assessment service

The Agent service in `Agent/` is separate from the web application and is not
required to start or use its non-AI features. To enable AI agents and coding
assessments, install and start Docker Desktop, then create `Agent/.env` with
one or both of the following model credentials:

```text
GEMINI_API_KEY=your-gemini-api-key
# Or provide one or more comma-separated OpenAI-compatible API keys:
LLM_API_KEYS=your-api-key
```

In a second terminal, start the Compose stack from the repository root:

```powershell
cd Agent
docker compose up -d --build
```

The first start downloads the service images and can take several minutes. The
analyzer API is available at `http://localhost:8080` and Judge0 at
`http://localhost:2358`. Check `http://localhost:8080/health` or open the
interactive API page at `http://localhost:8080/docs`. To connect the web app,
set `AGENT_BASE_URL=http://localhost:8080` in
`JEMS-Application/.env.local` (this is already the example default), then
restart the web development server. See [Agent/API_GUIDE.md](Agent/API_GUIDE.md)
for API examples and [the AI integration guide](JEMS-Application/docs/AI_AGENT.md)
for application behavior.

> The Agent stack includes a code-execution service. Keep its ports bound to
> localhost for development, and replace placeholder database/Redis passwords
> before exposing any services beyond a trusted local environment.

## Connecting the web app to the Agent

Set `AGENT_BASE_URL` in `JEMS-Application/.env.local` (default
`http://localhost:8080`; replace it with the hosted URL later). AI features —
roadmaps, coding-profile analysis, AI tests, mock interviews and candidate
match insights — run as background tasks: results are stored in MongoDB
(updated in place on re-run) and users are notified under the bell when a
task finishes or fails. Run `npm run setup-db` once to create the new
collections and indexes. See
[JEMS-Application/docs/AI_AGENT.md](JEMS-Application/docs/AI_AGENT.md).

## Documentation

- [Application setup and environment variables](JEMS-Application/docs/SETUP.md)
- [Application architecture](JEMS-Application/docs/ARCHITECTURE.md)
- [Web API reference](JEMS-Application/docs/API.md)
- [Authentication and signup flows](JEMS-Application/docs/AUTH.md)
- [Database collections and indexes](JEMS-Application/docs/DATABASE.md)
- [AI Agent API guide](Agent/API_GUIDE.md)

## Development notes

- Keep credentials in local environment files; do not commit `.env` files.
- Database setup and demo seeding affect the configured MongoDB instance.
- The AI service requires valid LLM credentials for model-backed endpoints.
- Assessment code is executed by Judge0, independently of the Next.js server.
