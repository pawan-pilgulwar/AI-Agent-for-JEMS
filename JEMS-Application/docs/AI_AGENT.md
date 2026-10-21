# AI Agent integration & background tasks

The web app talks to the **Agent service** (`../Agent`, FastAPI "analyzer")
for everything model-backed. Agent calls can take up to **300 seconds**, so
every AI action runs as a **background task**: the API answers `202` at once,
the work runs after the response, the result is **stored in MongoDB** (and
updated in place when re-run), and the user is **notified** when it succeeds
or fails.

## Configuration (`.env`)

| Variable | Default | Purpose |
|---|---|---|
| `AGENT_BASE_URL` | `http://localhost:8080` | Base URL of the Agent API. Replace with the hosted URL later (no trailing slash). |
| `AGENT_API_KEY` | — | Optional. Sent as `Authorization: Bearer …` if the hosted Agent sits behind an auth proxy. |
| `AGENT_TIMEOUT_MS` | `300000` | Per-call timeout. |
| `AI_TASK_CONCURRENCY` | `3` | AI tasks one server process runs at once (others wait queued). |
| `GITHUB_TOKEN` | — | Optional; raises GitHub's rate limit for the coding-profile analysis. |

The Agent has no login: call it **only from the server** (`lib/agent/client.ts`).

## How a task runs

```
browser ──POST /api/student/ai/roadmap──▶ route: validate, rate-limit
                                           enqueueTask() → aiTasks {status: queued}
          ◀── 202 { task } ────────────────┘   after(() => runTask())
                                                    │ atomic claim → running (lease 90 s, heartbeat 30 s)
                                                    │ handler → Agent call(s) → upsert result collection
                                                    ▼
                                           succeeded / failed → notifications
browser polls /api/ai/tasks (3 s while active) and the bell polls /api/notifications
```

Guarantees (`lib/ai-tasks/queue.ts`):

- **Dedupe** — one active task per `dedupeKey` (unique partial index); a double click returns the same task.
- **Run once** — tasks are claimed atomically; later writes are fenced on `(status, attempts)`.
- **Retries** — transient Agent errors (network, timeout, 5xx, 429) retry with back-off (2 attempts by default); permanent ones (4xx, bad input) fail immediately with a readable message.
- **Crash recovery** — if the server dies mid-task the lease expires; the next poll (`sweepAndKick`) re-queues it, or fails it once out of attempts. Nothing stays "running" forever.
- **Limits** — max 5 active tasks per user, 15-minute deadline per attempt, per-route rate limits.
- Finished tasks are kept 30 days (TTL index).

> Deployment: `after()` is fully supported with `next start` (self-hosting).
> On serverless platforms it is bounded by the route's `maxDuration`
> (300 s on AI routes, 800 s on `/api/student/ai/roadmap`) — make sure your plan allows it.

## Task types → Agent endpoints → stored results

| Task type | Started from | Agent endpoint(s) | Stored in (upsert key) |
|---|---|---|---|
| `skill.prereqs` | Company posts an opening (system task, silent) | `/agents/prereqs` | `skillPrereqs` (skillKey) — shared cache, 30-day freshness |
| `student.roadmap` | AI Roadmaps page, "AI roadmap" on analysis gaps | `/agents/prereqs` (cached) → `/agents/roadmap` | `aiRoadmaps` (studentId, skillKey) |
| `student.profile` | Analysis page → Coding profile evidence | GitHub + LeetCode public data → `/agents/profile` | `aiProfileAnalyses` (studentId) |
| `assessment.generate` | Assessment hub "AI test", mock interview "Start", roadmap "Test me" | `/assessment/generate` | `aiPapers` (studentId, purpose, subjectKey) |
| `assessment.grade` | Submitting an AI paper | `/assessment/grade` | `aiPapers.result`; `skillAssessments`; profile skill verified on a clean pass; `mockInterviews` (paperId) |
| `match.explain` | Company → Candidates → "Explain match" | `/agents/match` | `matchExplanations` (jobId, studentId) |

`/assessment/run-code` (the editor's **Run** button) is a single fast Judge0
run, so it is a plain synchronous proxy: `POST /api/student/ai/run-code`.

Full papers (answer keys, hidden tests) never leave the server; the browser
only receives `student_paper`. A passed AI test verifies the skill unless it
was submitted late or the Agent flagged answers `needs_review`.

## API

| Route | Methods | Purpose |
|---|---|---|
| `/api/ai/tasks` | GET | Your tasks (`?active=1`, `?types=a,b`). Also recovers stale tasks. |
| `/api/ai/tasks/[id]` | GET | One task's status / progress / result link |
| `/api/notifications` | GET / PATCH | Bell feed + active tasks / mark read (`{ ids? }`) |
| `/api/student/ai/roadmap` | GET / POST | List roadmaps / generate `{ skill }` → 202 |
| `/api/student/ai/profile` | GET / POST | Latest analysis / analyse `{ github?, leetcode? }` → 202 |
| `/api/student/ai/papers` | GET / POST | List / generate `{ purpose: "skill", skill, includeCoding? }` or `{ purpose: "interview", interviewType }` → 202 |
| `/api/student/ai/papers/[id]` | GET / PUT / POST | Open (starts timer) / submit `{ answers }` → 202 grading / retry failed grading |
| `/api/student/ai/run-code` | POST | Run code once `{ language, source_code, stdin }` |
| `/api/company/ai/match` | POST | Explain a candidate's match `{ jobId, studentId }` → 202 |

## Code map

```
lib/agent/        client.ts (typed client, timeouts, AgentError), types.ts
lib/ai-tasks/     queue.ts (enqueue/claim/retry/recover), handlers.ts, context.ts,
                  types.ts (client-safe), use-tasks.ts (client polling hook)
lib/ai/           prereqs.ts, roadmap.ts, profile.ts, papers.ts, papers-shared.ts,
                  match.ts, indexes.ts, util.ts
components/ai/    TaskStatus, CodingEvidence, AiRoadmaps, AiRoadmapDetail, AiPaper, CodeQuestion
components/notifications/NotificationBell.tsx
```
