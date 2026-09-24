"""Free, no-API-key company website discovery via DuckDuckGo search.

Two uses:
- `discover_company_website`: recovery path in `main.py`'s `/ingest-company` when
  a given website_url fails to fetch (typo, moved domain, etc.).
- `discover_next_company`: the no-input "discovery mode" of the same endpoint --
  picks a company nobody has told it about yet by searching a rotating set of
  broad, industry-shaped queries, restricted to what looks like each result's
  own official site (never a job board, social platform, or a domain already
  in the `companies` collection).
"""

import logging
import random
import re

from ddgs import DDGS

from tools.web_scraper_tool import registrable_domain

logger = logging.getLogger(__name__)

# Directories/social platforms that show up for "<company> official website"
# searches but are never the company's own site.
_EXCLUDED_DOMAINS = (
    "linkedin.com",
    "facebook.com",
    "twitter.com",
    "x.com",
    "crunchbase.com",
    "glassdoor.com",
    "indeed.com",
    "wikipedia.org",
    "youtube.com",
    "instagram.com",
    "reddit.com",
)

# Broad, industry-shaped seed queries for "discovery mode" (no company named).
# Deliberately generic and editable -- narrow or extend this list to steer what
# kinds of companies get discovered.
DISCOVERY_SEED_QUERIES = (
    "software company official website careers page",
    "fintech startup official website careers page",
    "healthcare technology company official careers page",
    "e-commerce company official website careers page",
    "AI startup official website careers page",
    "cybersecurity company official website careers page",
    "cloud infrastructure company official careers page",
    "edtech startup official website careers page",
)

_TITLE_SEPARATORS = re.compile(r"\s+[|\-–—]\s+")


def discover_company_website(company_name: str) -> str | None:
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(f"{company_name} official website", max_results=5))
    except Exception:
        logger.warning("Company website discovery failed for %r", company_name, exc_info=True)
        return None

    for result in results:
        url = result.get("href") or result.get("link")
        if not url:
            continue
        if any(domain in url.lower() for domain in _EXCLUDED_DOMAINS):
            continue
        return url
    return None


def _derive_company_name(title: str, domain: str) -> str:
    candidate = _TITLE_SEPARATORS.split(title.strip())[0].strip() if title else ""
    if len(candidate) >= 2:
        return candidate
    # Fallback: turn "acme-labs.com" into "Acme Labs"
    root = domain.split(".")[0]
    return " ".join(word.capitalize() for word in re.split(r"[-_]+", root) if word)


def discover_next_company(known_domains: set[str]) -> tuple[str, str] | None:
    """Finds one company nobody has ingested yet, or None if nothing new turned
    up across the seed queries tried this call. Returns (company_name, website_url)."""
    seed_queries = list(DISCOVERY_SEED_QUERIES)
    random.shuffle(seed_queries)

    for query in seed_queries:
        try:
            with DDGS() as ddgs:
                results = list(ddgs.text(query, max_results=10))
        except Exception:
            logger.warning("Discovery search failed for seed query %r", query, exc_info=True)
            continue

        if not results:
            # Not an error -- the search backend can legitimately return zero
            # results -- but silent-and-empty looks identical to "everything
            # got filtered out" from the caller's side, so log it either way.
            logger.info("Discovery search returned no results for seed query %r", query)
            continue

        for result in results:
            url = result.get("href") or result.get("link")
            if not url:
                continue
            domain = registrable_domain(url)
            if any(excluded in domain for excluded in _EXCLUDED_DOMAINS):
                continue
            if domain in known_domains:
                continue

            company_name = _derive_company_name(result.get("title", ""), domain)
            return company_name, url

        logger.info("Discovery search for seed query %r returned only excluded/known domains", query)

    logger.warning("Discovery exhausted all %d seed queries without finding a new company", len(seed_queries))
    return None
