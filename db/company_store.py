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
    REGISTERED_COMPANIES_COLLECTION,
    REGISTERED_JOBS_COLLECTION,
    SCRAPED_COMPANIES_COLLECTION,
    SCRAPED_JOBS_COLLECTION,
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


async def list_known_domains(collection_name: str = SCRAPED_COMPANIES_COLLECTION) -> set[str]:
    """Company domains already ingested/scraped -- used by discovery mode."""
    db = get_database()
    collection = db[collection_name]
    domains = await collection.distinct("domain")
    # Also check legacy/registered collections to avoid duplicate scraping
    if collection_name == SCRAPED_COMPANIES_COLLECTION:
        reg_domains = await db[REGISTERED_COMPANIES_COLLECTION].distinct("domain")
        leg_domains = await db[COMPANIES_COLLECTION].distinct("domain")
        return set(domains) | set(reg_domains) | set(leg_domains)
    return set(domains)


async def _upsert_company_to_collection(
    collection_name: str,
    *,
    company_name: str,
    website_url: str,
    industry: str,
    company_size: str,
    tech_stack: list[str],
    locations: list[str],
    description: str,
    source_type: str = "scraped",
    contact_email: str | None = None,
) -> tuple[str, Literal["created", "updated", "unchanged"]]:
    domain = normalize_domain(website_url)
    db = get_database()
    collection = db[collection_name]

    existing = await collection.find_one({"_id": domain})
    now = datetime.now(timezone.utc)

    fields: dict[str, Any] = {
        "company_name": company_name,
        "website_url": website_url,
        "domain": domain,
        "industry": industry,
        "company_size": company_size,
        "tech_stack": tech_stack,
        "locations": locations,
        "description": description,
        "source_type": source_type,
        "updated_at": now,
    }
    if contact_email:
        fields["contact_email"] = contact_email

    if existing is None:
        fields["created_at"] = now
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


async def upsert_scraped_company(
    *,
    company_name: str,
    website_url: str,
    industry: str,
    company_size: str,
    tech_stack: list[str],
    locations: list[str],
    description: str,
) -> tuple[str, Literal["created", "updated", "unchanged"]]:
    """Upsert company into dedicated `scraped_companies` collection."""
    res = await _upsert_company_to_collection(
        SCRAPED_COMPANIES_COLLECTION,
        company_name=company_name,
        website_url=website_url,
        industry=industry,
        company_size=company_size,
        tech_stack=tech_stack,
        locations=locations,
        description=description,
        source_type="scraped",
    )
    # Also keep legacy COMPANIES_COLLECTION in sync for backward compatibility
    try:
        await _upsert_company_to_collection(
            COMPANIES_COLLECTION,
            company_name=company_name,
            website_url=website_url,
            industry=industry,
            company_size=company_size,
            tech_stack=tech_stack,
            locations=locations,
            description=description,
            source_type="scraped",
        )
    except Exception:
        logger.warning("Could not sync to legacy companies collection", exc_info=True)
    return res


async def upsert_registered_company(
    *,
    company_name: str,
    website_url: str,
    industry: str,
    company_size: str,
    tech_stack: list[str],
    locations: list[str],
    description: str,
    contact_email: str | None = None,
) -> tuple[str, Literal["created", "updated", "unchanged"]]:
    """Upsert company into dedicated `registered_companies` collection for companies
    who registered on the platform."""
    return await _upsert_company_to_collection(
        REGISTERED_COMPANIES_COLLECTION,
        company_name=company_name,
        website_url=website_url,
        industry=industry,
        company_size=company_size,
        tech_stack=tech_stack,
        locations=locations,
        description=description,
        source_type="registered",
        contact_email=contact_email,
    )


# Backward-compatible alias
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
    return await upsert_scraped_company(
        company_name=company_name,
        website_url=website_url,
        industry=industry,
        company_size=company_size,
        tech_stack=tech_stack,
        locations=locations,
        description=description,
    )


async def _upsert_job_postings_to_collection(
    collection_name: str,
    *,
    company_id: str,
    company_name: str,
    postings: list[dict[str, Any]],
    source_type: str = "scraped",
) -> tuple[int, int, int, list[dict[str, Any]]]:
    db = get_database()
    collection = db[collection_name]
    embedder = EmbeddingTool()
    now = datetime.now(timezone.utc)

    seen_keys: set[str] = set()
    created = updated = 0
    summaries: list[dict[str, Any]] = []

    for posting in postings:
        title = (posting.get("title") or "").strip()
        source_url = (posting.get("source_url") or "").strip() or f"https://platform.jems/{company_id}/{title.replace(' ', '-').lower()}"
        if not title:
            continue

        key = job_dedupe_key(company_id, title, source_url)
        seen_keys.add(key)
        description = posting.get("description", "")

        fields: dict[str, Any] = {
            "company_id": company_id,
            "company_name": company_name,
            "title": title,
            "description": description,
            "required_skills": posting.get("required_skills", []),
            "nice_to_have_skills": posting.get("nice_to_have_skills", []),
            "experience_level": posting.get("experience_level", ""),
            "location": posting.get("location", ""),
            "employment_type": posting.get("employment_type", "full-time"),
            "posted_date": posting.get("posted_date"),
            "source_url": source_url,
            "source_type": source_type,
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
    # For scraped postings, mark ones no longer seen as closed
    if source_type == "scraped":
        async for doc in collection.find({"company_id": company_id, "status": "open"}):
            if doc["_id"] not in seen_keys:
                await collection.update_one({"_id": doc["_id"]}, {"$set": {"status": "closed"}})
                closed += 1

    return created, updated, closed, summaries


async def upsert_scraped_job_postings(
    *, company_id: str, company_name: str, postings: list[dict[str, Any]]
) -> tuple[int, int, int, list[dict[str, Any]]]:
    """Upsert job postings into dedicated `scraped_job_postings` collection."""
    res = await _upsert_job_postings_to_collection(
        SCRAPED_JOBS_COLLECTION,
        company_id=company_id,
        company_name=company_name,
        postings=postings,
        source_type="scraped",
    )
    # Also sync to legacy JOB_POSTINGS_COLLECTION
    try:
        await _upsert_job_postings_to_collection(
            JOB_POSTINGS_COLLECTION,
            company_id=company_id,
            company_name=company_name,
            postings=postings,
            source_type="scraped",
        )
    except Exception:
        logger.warning("Could not sync to legacy job postings collection", exc_info=True)
    return res


async def upsert_registered_job_postings(
    *, company_id: str, company_name: str, postings: list[dict[str, Any]]
) -> tuple[int, int, int, list[dict[str, Any]]]:
    """Upsert job postings into dedicated `registered_job_postings` collection."""
    return await _upsert_job_postings_to_collection(
        REGISTERED_JOBS_COLLECTION,
        company_id=company_id,
        company_name=company_name,
        postings=postings,
        source_type="registered",
    )


# Backward-compatible alias
async def upsert_job_postings(
    *, company_id: str, company_name: str, postings: list[dict[str, Any]]
) -> tuple[int, int, int, list[dict[str, Any]]]:
    return await upsert_scraped_job_postings(
        company_id=company_id, company_name=company_name, postings=postings
    )
