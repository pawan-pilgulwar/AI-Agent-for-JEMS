# jems-agent-service

A standalone microservice for the [Jems](https://jems-gilt.vercel.app) platform, adding two
capabilities the main Next.js app doesn't have yet:

1. **`POST /learning-path`** — given a student's profile + resume + career objective, generates
   a personalized, ordered learning path closing their skill gaps.
2. **`POST /match-candidates`** — given a job description and a candidate pool, ranks candidates
   by fit using vector retrieval + LLM reasoning.

It is called by the existing Next.js backend over HTTP and is not intended to be exposed
publicly — auth is handled upstream. It runs entirely on free/open-source components: no paid
LLM or embedding API keys are used anywhere.

## Architecture

- **FastAPI** — HTTP layer, two endpoints + `/health`.
- **CrewAI** (Agents/Tasks/Crews, not raw LangChain) — orchestrates the reasoning steps.
- **Ollama**, in its own container, serving **Llama 3.1 8B** as the LLM behind every agent
  (via LiteLLM's `ollama/<model>` provider string). CPU-only, no GPU required.
- **sentence-transformers** (`all-MiniLM-L6-v2`, CPU, free) for embeddings.
- **MongoDB Atlas Vector Search** (`$vectorSearch`) as the only vector store — no separate
  vector DB, no in-memory cosine similarity in Python.

### Learning path flow

1. `tools/skill_gap_tool.py` deterministically extracts current skills and diffs them against a
   small role-skill taxonomy (**no LLM call** — this is plain set logic, so the gap list itself
   can never be hallucinated).
2. The gap list is handed to the **Path Builder Agent** (Ollama), which only *sequences and
   explains* it — resource type, estimated hours, rationale per step — and proposes
   `target_resume_skills`. It never adds or removes skills from the gap list.

### Matching flow (two-stage, as required — Stage 1 is never skipped)

1. **Stage 1 — deterministic retrieval.** Each candidate in the request's `candidate_pool` is
   embedded (`sentence-transformers`) and upserted into MongoDB's `candidates` collection. A
   `$vectorSearch` aggregation (filtered to just this request's candidates) retrieves the
   top-N (default 10, `MATCH_TOP_N`) most similar candidates to the job's embedded text. All
   ranking here is done by Atlas, not Python.
2. **Stage 2 — LLM reasoning.** Only those top-N candidates are passed to CrewAI:
   the **Requirements Analyzer Agent** parses the job description into structured requirements
   first, then the **Candidate Matcher Agent** scores each shortlisted candidate (0–100) with
   reasoning, `matched_skills`, and `missing_skills`, using the parsed requirements as context.

### Design decision: embeddings live on the candidate document

Candidate embeddings are stored as a `profile_embedding` field directly on each document in the
`candidates` collection, not in a separate `candidate_embeddings` collection. This keeps one
source of truth per candidate and lets `$vectorSearch` run directly against `candidates` with no
join. Since the Next.js backend sends the full candidate pool in each request body (rather than
by reference), the service upserts embeddings on every `/match-candidates` call, keyed by
`user_id` — so embeddings self-heal if a candidate's profile changes between requests. If the
candidate pool grows large enough that re-embedding on every request becomes expensive, moving
to change-triggered embedding writes is the natural next step, but isn't needed yet at this
scale.

## Project structure

```
jems-agent-service/
├── main.py                          # FastAPI app: /learning-path, /match-candidates, /health
├── config.py                        # pydantic-settings, env-driven config
├── crews/
│   ├── learning_path_crew.py        # single-agent Crew (Path Builder)
│   └── matching_crew.py             # two-agent Crew (Requirements Analyzer -> Candidate Matcher)
├── agents/                          # CrewAI Agent factories, one per role
├── tools/
│   ├── embedding_tool.py            # sentence-transformers wrapper
│   ├── vector_search_tool.py        # $vectorSearch queries against Atlas
│   └── skill_gap_tool.py            # deterministic skill-gap diff (no LLM)
├── db/mongo_client.py                # motor client + vector index setup helper
├── models/schemas.py                 # Pydantic v2 request/response models
└── tests/                            # unit tests, LLM + MongoDB fully mocked
```

## Setup

### 1. Environment variables

```bash
cp .env.example .env
```

| Variable | Default | Notes |
|---|---|---|
| `OLLAMA_BASE_URL` | `http://ollama:11434` | Ollama container on the compose network |
| `OLLAMA_MODEL` | `llama3.2:1b` | Swap to `llama3.1:8b` or `llama3.1:70b` if your host has the GPU/RAM for it — drop-in upgrade |
| `EMBEDDING_MODEL` | `all-MiniLM-L6-v2` | CPU-only, free |
| `MONGODB_URI` | *(required)* | Same Atlas connection string as the main Jems platform |
| `MONGODB_DB_NAME` | `jems` | |
| `VECTOR_INDEX_NAME` | `candidate_embeddings_index` | Must match the index created in step 3 |
| `MATCH_TOP_N` | `10` | Stage-1 shortlist size fed into Stage-2 LLM reasoning |

No paid API keys are used anywhere in this build.

### 2. Start the services

```bash
docker-compose up -d
```

### 3. One-time: pull the Ollama model

```bash
docker exec -it $(docker ps -qf "ancestor=ollama/ollama:latest") ollama pull llama3.2:1b
```

### 4. One-time: create the Atlas Vector Search index

The service attempts to create this automatically on startup (`db/mongo_client.py`), but Atlas
Search index creation via the driver isn't guaranteed on every cluster tier/version, so create it
manually if the automatic attempt logs a warning:

**Via Atlas UI:** Atlas → your cluster → *Search* tab → *Create Search Index* → JSON Editor →
database `jems` (or your `MONGODB_DB_NAME`), collection `candidates` →

```json
{
  "name": "candidate_embeddings_index",
  "type": "vectorSearch",
  "definition": {
    "fields": [
      { "type": "vector", "path": "profile_embedding", "numDimensions": 384, "similarity": "cosine" },
      { "type": "filter", "path": "user_id" }
    ]
  }
}
```

**Via Atlas Admin API:** use the [Create Search Index endpoint](https://www.mongodb.com/docs/atlas/reference/api-resources-spec/#tag/Atlas-Search) with the same body.

This works on the free M0 tier.

### 5. Verify

```bash
curl http://localhost:8000/health
# {"status": "ok"}
```

Swagger UI: `http://localhost:8000/docs`

## Example requests

### Learning path

```bash
curl -X POST http://localhost:8000/learning-path \
  -H "Content-Type: application/json" \
  -d '{
    "user_profile": {"skills": ["python", "git"], "education": "B.Tech CSE"},
    "resume_text": "Built a rest api design for a college project using python and git.",
    "career_objective": "Backend engineer at a fintech"
  }'
```

### Candidate matching

```bash
curl -X POST http://localhost:8000/match-candidates \
  -H "Content-Type: application/json" \
  -d '{
    "job_description": "We need a backend engineer proficient in Python, SQL, and Docker. Experience with system design is a plus.",
    "role_title": "Backend Engineer",
    "candidate_pool": [
      {"id": "u1", "resume_text": "3 years Python, Docker, and PostgreSQL experience.", "skills": ["python", "docker", "sql"]},
      {"id": "u2", "resume_text": "Frontend developer skilled in React and CSS.", "skills": ["react", "css"]}
    ]
  }'
```

## Running tests

```bash
pip install -r requirements.txt
pytest
```

All tests mock the CrewAI/Ollama calls and MongoDB/vector-search calls — no real Ollama or Atlas
connection is required to run the test suite.

## Swapping in a paid model later

Every agent's `llm=` parameter reads from `Settings.litellm_model` in `config.py`, currently
`ollama/<OLLAMA_MODEL>`. To move to a hosted frontier model for production-quality matching or
interview evaluation, change that one property (e.g. to `anthropic/claude-sonnet-5` or
`openai/gpt-4o`, with the corresponding API key env var) — no other code changes needed anywhere
in `agents/`, `crews/`, or `main.py`.

## Known limitation of the free-tier build

Llama 3.1 8B run locally is noticeably less reliable than a hosted frontier model at nuanced
judgment (subtle skill-matching reasoning, scoring consistency) — expect more variance and
occasional malformed JSON output than you would from a larger hosted model. This is an accepted
tradeoff for a zero-cost prototype; `crews/_json_utils.py` tolerates minor formatting noise
(markdown fences, surrounding prose) but a completely malformed response surfaces as a `502` to
the caller rather than being silently guessed at.
