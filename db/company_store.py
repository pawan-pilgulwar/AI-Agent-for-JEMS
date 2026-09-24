"""Upsert logic for the `companies` and `job_postings` collections -- the
data the RAG retrieval layer (tools/rag_retrieval_tool.py) draws from.

Keyed by deterministic natural keys so re-ingestion is idempotent and never
creates duplicates:
- companies:    _id = normalized domain parsed from website_url
- job_postings: _id = sha256(domain, title, source_url)

Unlike db/results_store.py (best-effort audit logging), failures here must
surface to the caller -- this is the data the anti-hallucination grounding
depends on, so a silent write failure would be worse than a loud one.
"""

import hashlib
import logging
from datetime import datetime, timezone
from typing import Any, Literal
from urllib.parse import urlparse

from db.mongo_client import (
    COMPANIES_COLLECTION,
    COMPANY_EMBEDDING_FIELD,
    JOB_EMBEDDING_FIELD,
    JOB_POSTINGS_COLLECTION,
    get_database,
)
from tools.embedding_tool import EmbeddingTool

logger = logging.getLogger(__name__)

# Fields compared to decide "updated" vs "unchanged" for a company record.
_COMPARABLE_COMPANY_FIELDS = ("description", "industry", "company_size", "tech_stack", "locations")


def normalize_domain(url: str) -> str:
    netloc = urlparse(url if "://" in url else f"//{url}").netloc.lower()
    return netloc[4:] if netloc.startswith("www.") else netloc


def job_dedupe_key(domain: str, title: str, source_url: str) -> str:
    raw = f"{domain}|{title.strip().lower()}|{source_url.strip().lower()}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


async def list_known_domains() -> set[str]:
    """All company domains already ingested -- used by discovery mode
    (tools/company_discovery_tool.py::discover_next_company) so repeated
    no-input /ingest-company calls surface new companies instead of
    re-discovering the same one."""
    db = get_database()
    collection = db[COMPANIES_COLLECTION]
    domains = await collection.distinct("domain")
    return set(domains)


async def upsert_company(
    *,
    company_name: str,
    website_url: str,
    industry: str,
    company_size: str,
    tech_stack: list[str],
    locations: list[str],
    description: str,
) -> tuple[str, Literal["created", "updated", "unchanged"]]:
    """Insert or update the company document keyed by domain. Re-embeds only
    if the description text actually changed (embeddings are the expensive
    part; the other fields are cheap metadata)."""
    domain = normalize_domain(website_url)
    db = get_database()
    collection = db[COMPANIES_COLLECTION]

    existing = await collection.find_one({"_id": domain})
    now = datetime.now(timezone.utc)

    fields = {
        "company_name": company_name,
        "website_url": website_url,
        "domain": domain,
        "industry": industry,
        "company_size": company_size,
        "tech_stack": tech_stack,
        "locations": locations,
        "description": description,
        "last_scraped_at": now,
    }

    if existing is None:
        embedder = EmbeddingTool()
        fields[COMPANY_EMBEDDING_FIELD] = embedder.embed(description) if description else []
        await collection.insert_one({"_id": domain, **fields})
        return domain, "created"

    changed = any(existing.get(key) != fields[key] for key in _COMPARABLE_COMPANY_FIELDS)

    update_fields = dict(fields)
    if description and description != existing.get("description"):
        embedder = EmbeddingTool()
        update_fields[COMPANY_EMBEDDING_FIELD] = embedder.embed(description)

    await collection.update_one({"_id": domain}, {"$set": update_fields})
    return domain, "updated" if changed else "unchanged"


async def upsert_job_postings(
    *, company_id: str, company_name: str, postings: list[dict[str, Any]]
) -> tuple[int, int, int, list[dict[str, Any]]]:
    """Insert/update each posting keyed by (company, title, source_url), then
    mark any previously-open posting for this company that didn't reappear in
    this scrape as "closed" (never delete -- match history references it).

    Returns (jobs_created, jobs_updated, jobs_closed, job_summaries).
    """
    db = get_database()
    collection = db[JOB_POSTINGS_COLLECTION]
    embedder = EmbeddingTool()
    now = datetime.now(timezone.utc)

    seen_keys: set[str] = set()
    created = updated = 0
    summaries: list[dict[str, Any]] = []

    for posting in postings:
        title = (posting.get("title") or "").strip()
        source_url = (posting.get("source_url") or "").strip()
        if not title or not source_url:
            continue

        key = job_dedupe_key(company_id, title, source_url)
        seen_keys.add(key)
        description = posting.get("description", "")

        fields = {
            "company_id": company_id,
            "company_name": company_name,
            "title": title,
            "description": description,
            "required_skills": posting.get("required_skills", []),
            "nice_to_have_skills": posting.get("nice_to_have_skills", []),
            "experience_level": posting.get("experience_level", ""),
            "location": posting.get("location", ""),
            "employment_type": posting.get("employment_type", ""),
            "posted_date": posting.get("posted_date"),
            "source_url": source_url,
            "status": "open",
            "last_seen_at": now,
        }

        existing = await collection.find_one({"_id": key})

        if existing is None:
            fields[JOB_EMBEDDING_FIELD] = embedder.embed(f"{title}\n{description}")
            await collection.insert_one({"_id": key, **fields})
            created += 1
        elif existing.get("description") != description:
            fields[JOB_EMBEDDING_FIELD] = embedder.embed(f"{title}\n{description}")
            await collection.update_one({"_id": key}, {"$set": fields})
            updated += 1
        else:
            await collection.update_one(
                {"_id": key}, {"$set": {"last_seen_at": now, "status": "open"}}
            )

        summaries.append({"id": key, "title": title, "status": "open"})

    closed = 0
    async for doc in collection.find({"company_id": company_id, "status": "open"}):
        if doc["_id"] not in seen_keys:
            await collection.update_one({"_id": doc["_id"]}, {"$set": {"status": "closed"}})
            closed += 1

    return created, updated, closed, summaries
