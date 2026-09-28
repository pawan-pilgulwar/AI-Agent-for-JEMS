# jems-agent-service

A high-performance Multi-Agent AI microservice for the **JEMS** platform (AI-Powered Academia-Industry Collaboration Platform, SIH 2026).

Built with **CrewAI**, **LiteLLM**, **Ollama**, **FastAPI**, and **MongoDB Atlas Vector Search**, this service coordinates 5 core AI agents + 1 Web Scraper Agent to power the complete skill-to-employment pipeline:

1. **Analysis Agent (Profile + Company Analysis)** — Analyzes student profiles against requirements from **BOTH** platform-registered companies and web-scraped company career pages. Identifies technical and soft skill gaps and calculates compatibility scores.
2. **Roadmap Agent (Skill Gap -> Roadmap)** — Sequences identified gaps into chronological, milestone-driven learning roadmaps with realistic hours, deliverables, and role readiness targets.
3. **Learning Agent (Resources & Training)** — Curates courses, documentation, industry certifications, portfolio projects, and Faculty Development Programs (FDPs) / institutional training modules.
4. **Assessment Agent (Skill Validation)** — Generates cheat-resistant skill tests (MCQ, code analysis, scenarios), evaluates student submissions, and issues verified skill badges stored in MongoDB to combat fake resume claims.
5. **Matching Agent (Job / Internship Matching)** — Two-way matching: matches candidates to jobs/internships for recruiters, recommends open opportunities to students across registered and scraped collections, and generates automated notification payloads.
6. **Web Scraper Agent (Company & Careers Intelligence)** — Takes a list of companies, scrapes official websites and careers pages, extracts structured profiles and live job/internship postings, and stores them into a dedicated `scraped_companies` collection.

### Unified Orchestration Layer & Router
- **`POST /orchestrate`** — Central entry point that routes incoming client/backend requests according to `request_type`, manages agent context, and can execute the complete end-to-end student pipeline.

### Dual Collection Architecture in MongoDB Atlas
- **`registered_companies`** & **`registered_job_postings`**: Populated by companies who register directly on the JEMS platform and post hiring requirements.
- **`scraped_companies`** & **`scraped_job_postings`**: Populated by the Web Scraper Agent from external official company career portals.
- **Analysis Agent & Matching Agent**: Vector-query and evaluate across **BOTH** collections simultaneously.

## RAG Grounding & Anti-Hallucination

The Path Builder, Requirements Analyzer, and Candidate Matcher agents originally reasoned purely
from LLM knowledge, which meant they could invent skills, requirements, or job-market facts that
aren't grounded in anything real. All four agents now follow one rule: **every factual claim
about a company, role, or skill requirement must be grounded in data retrieved by
`tools/rag_retrieval_tool.py` wherever such data exists.**

- `tools/rag_retrieval_tool.py` embeds a text query (same `sentence-transformers` model as
  everywhere else) and runs `$vectorSearch` against `companies` and/or `job_postings`.
- If retrieval finds nothing relevant, the agent is instructed to say so explicitly rather than
  fall back to its own training knowledge. `LearningPathResponse` and `MatchResponse` both carry
  `grounded: bool` and `grounding_sources: list[str]` (the job posting / company IDs actually
  used) as visible proof of this — `grounded` is only ever `true` if real retrieved documents
  were both present *and* the crew result says it used them.
- `companies` and `job_postings` are populated by `POST /ingest-company` (see below) — an empty
  database simply means every response comes back `grounded: false` until you've ingested some
  companies.

### Company ingestion flow

`POST /ingest-company` (`{"company_name", "website_url", "careers_page_url"?}`):

1. **Discovery** (`tools/web_scraper_tool.py::discover_careers_link`) — if `careers_page_url`
   isn't given, the company's home page is crawled for a careers/jobs link. If `website_url`
   itself fails to fetch, `tools/company_discovery_tool.py` (DuckDuckGo search, no API key) is
   tried once as a recovery path by company name.
2. **Scraping** — static `requests` + BeautifulSoup first; falls back to headless Chromium via
   Playwright only if the static page looks empty (JS-rendered). Respects `robots.txt`, sets a
   descriptive User-Agent, and rate-limits requests per domain
   (`SCRAPE_RATE_LIMIT_SECONDS`). Never scrapes anything requiring login.
3. **Extraction** (`crews/web_scraper_crew.py`, Web Scraper Agent) — turns the
   cleaned, boilerplate-stripped page text into structured company fields and a list of job
   postings. Extraction is strictly conservative: a field the scraped text doesn't state is left
   empty, never guessed.
4. **Upsert** (`db/company_store.py`) — idempotent by construction: a company document's `_id` is
   its normalized domain, a job posting's `_id` is a hash of `(domain, title, source_url)`, so
   re-running ingestion for the same company never creates duplicates. Re-embedding only happens
   when the underlying text actually changed. A posting that disappears from a re-scrape is
   marked `status: "closed"`, never deleted — match history may reference it.

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
├── main.py                          # FastAPI app: /health and POST /orchestrate
├── config.py                        # pydantic-settings, multi-model LLM configuration
├── crews/
│   ├── orchestrator.py              # MultiAgentOrchestrator: routes all requests & runs pipelines
│   ├── analysis_crew.py             # Agent 1: Dual-company gap analysis crew
│   ├── roadmap_crew.py              # Agent 2: Milestone roadmap generator crew
│   ├── learning_crew.py             # Agent 3: Learning resources & FDP training crew
│   ├── assessment_crew.py           # Agent 4: Skill test generation & evaluation crew
│   ├── matching_crew.py             # Agent 5: Candidate-role two-way matching crew
│   └── web_scraper_crew.py          # Agent 6: Company & careers batch scraping crew
├── agents/                          # 6 specialized CrewAI Agent definitions
│   ├── analysis_agent.py
│   ├── roadmap_agent.py
│   ├── learning_agent.py
│   ├── assessment_agent.py
│   ├── matching_agent.py
│   └── web_scraper_agent.py
├── tools/
│   ├── embedding_tool.py            # sentence-transformers wrapper (shared)
│   ├── vector_search_tool.py        # candidate $vectorSearch
│   ├── rag_retrieval_tool.py        # dual-collection (registered & scraped) vector search
│   ├── skill_gap_tool.py            # deterministic skill-gap diff
│   ├── web_scraper_tool.py          # HTTP & Playwright web scraper
│   └── company_discovery_tool.py    # Autonomous domain lookup
├── db/
│   ├── mongo_client.py              # motor client, collection names & vector index setup
│   ├── company_store.py             # upserts for registered & scraped companies
│   ├── roadmap_store.py             # caching for roadmaps & learning recommendations
│   ├── assessment_store.py          # tests, evaluations, and verified skill badges
│   └── results_store.py             # audit logging
├── models/schemas.py                # Pydantic v2 request/response models & request types
└── tests/test_agents.py             # 100% passing test suite for all agent routes & caching
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
| `VECTOR_INDEX_NAME` | `candidate_embeddings_index` | Must match the index created in step 4 |
| `MATCH_TOP_N` | `10` | Stage-1 shortlist size fed into Stage-2 LLM reasoning |
| `RAG_TOP_K` | `5` | How many real documents `tools/rag_retrieval_tool.py` retrieves per grounding query |
| `SCRAPE_RATE_LIMIT_SECONDS` | `2` | Minimum delay between requests to the same domain during ingestion |
| `SCRAPE_USER_AGENT` | `JemsBot/1.0 (+https://jems.exponentor.com/bot-info)` | Sent on every scrape request |
| `VECTOR_INDEX_NAME_COMPANIES` | `companies_vector_index` | Must match the index created in step 4 |
| `VECTOR_INDEX_NAME_JOBS` | `job_postings_vector_index` | Must match the index created in step 4 |

No paid API keys are used anywhere in this build.

### 2. Start the services

```bash
docker-compose up -d
```

### 3. One-time: pull the Ollama model

```bash
docker exec -it $(docker ps -qf "ancestor=ollama/ollama:latest") ollama pull llama3.2:1b
```

### 4. One-time: create the Atlas Vector Search indexes

The service attempts to create all three automatically on startup (`db/mongo_client.py`), but
Atlas Search index creation via the driver isn't guaranteed on every cluster tier/version, so
create any that log a startup warning manually. Each Atlas Vector Search index is scoped to a
single collection, so there are three separate indexes, one per collection.

**Via Atlas UI:** Atlas → your cluster → *Search* tab → *Create Search Index* → JSON Editor →
database `jems` (or your `MONGODB_DB_NAME`) →

`candidates` collection:
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

`companies` collection:
```json
{
  "name": "companies_vector_index",
  "type": "vectorSearch",
  "definition": {
    "fields": [
      { "type": "vector", "path": "profile_embedding", "numDimensions": 384, "similarity": "cosine" },
      { "type": "filter", "path": "domain" }
    ]
  }
}
```

`job_postings` collection:
```json
{
  "name": "job_postings_vector_index",
  "type": "vectorSearch",
  "definition": {
    "fields": [
      { "type": "vector", "path": "posting_embedding", "numDimensions": 384, "similarity": "cosine" },
      { "type": "filter", "path": "status" },
      { "type": "filter", "path": "company_id" }
    ]
  }
}
```

**Via Atlas Admin API:** use the [Create Search Index endpoint](https://www.mongodb.com/docs/atlas/reference/api-resources-spec/#tag/Atlas-Search) with the same bodies.

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

### Ingest a company (populates the RAG grounding data)

```bash
curl -X POST http://localhost:8000/ingest-company \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Acme Inc",
    "website_url": "https://acme.example.com"
  }'
```

Re-running this for the same company is always safe — it's an idempotent upsert, not an append.
`company_name` and `website_url` must be given together, or omitted together (see discovery mode
below) — one without the other is a `422`.

### Discovery mode: ingest without naming a company

Call the same endpoint with an empty body and it picks a company on its own:

```bash
curl -X POST http://localhost:8000/ingest-company -H "Content-Type: application/json" -d '{}'
```

`tools/company_discovery_tool.py::discover_next_company` searches a rotating set of broad,
industry-shaped seed queries (`DISCOVERY_SEED_QUERIES`, editable in that file) via DuckDuckGo,
then picks the first result whose domain is (a) not a job board/social platform (same exclusion
list `discover_company_website` uses) and (b) not already in the `companies` collection --
so repeated calls surface new companies instead of re-scraping the same one. Once a
company/website_url is resolved, it goes through the exact same scrape → extract → upsert
pipeline as a named call, restricted to that company's own official domain (subdomains included,
e.g. `careers.acme.com` under `acme.com` — see `tools/web_scraper_tool.py::same_domain`). If no
new company turns up across all seed queries this call, it returns a `404` rather than fabricating
one. There's no built-in scheduler for this — call it manually, from a cron, or wire it into
`docker-compose`/an orchestrator if you want it running on a schedule.

### Suggest jobs for a candidate (reverse matching)

```bash
curl -X POST http://localhost:8000/suggest-jobs-for-candidate \
  -H "Content-Type: application/json" \
  -d '{
    "candidate_profile": {"skills": ["python", "docker"]},
    "resume_text": "3 years of Python and Docker experience.",
    "top_n": 5
  }'
```

Only ingested, currently-`open` job postings are considered — if none are relevant,
`suggested_jobs` comes back empty rather than the LLM inventing plausible-sounding roles.

## Running tests

```bash
pip install -r requirements.txt
pytest
```

All tests mock the CrewAI/Ollama calls, MongoDB/vector-search calls, and web scraping — no real
Ollama, Atlas, or network connection is required to run the test suite.

## Note on the Docker image size

Adding the Company Intelligence Agent's Playwright fallback (`tools/web_scraper_tool.py`) means
the build now runs `playwright install --with-deps chromium`, which pulls a headless Chromium
build and its OS-level dependencies. This meaningfully increases image size and first-build time
versus the rest of this otherwise lightweight stack — it's only exercised when a careers page's
static HTML looks JS-rendered (empty), so most ingestion calls never touch it, but the image pays
for it either way.

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
the caller rather than being silently guessed at. The same caveat applies to the Company
Intelligence Agent's page-text extraction: long or messy scraped pages are more likely to trip up
a small local model than a hosted one, which is part of why `main.py` caps how much scraped text
(`MAX_EXTRACTION_CHARS`) and how many job pages (`MAX_JOB_LINKS_PER_INGEST`) go into a single
`/ingest-company` call.
