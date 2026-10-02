import asyncio
import logging
from typing import Any

from crewai import Crew, Process, Task

from agents.web_scraper_agent import build_web_scraper_agent
from crews._json_utils import extract_json_object
from db.company_store import upsert_scraped_company, upsert_scraped_job_postings
from tools.company_discovery_tool import discover_company_website
from tools.web_scraper_tool import discover_careers_link, fetch_page, same_domain

logger = logging.getLogger(__name__)

MAX_JOB_LINKS_PER_SCRAPE = 8
MAX_EXTRACTION_CHARS = 6000

COMPANY_INFO_PROMPT = """\
Company name: "{company_name}"

Cleaned text scraped from this company's official website:
---
{page_text}
---

Extract ONLY information explicitly present in the text above. If a field is not \
mentioned, leave it empty or an empty list. Never hallucinate.

Respond with ONLY a JSON object, no prose, matching this shape:
{{
  "industry": "...",
  "company_size": "...",
  "tech_stack": ["..."],
  "locations": ["..."],
  "description": "one to three sentence factual summary drawn only from the text above"
}}
"""

JOB_POSTINGS_PROMPT = """\
Company name: "{company_name}"

Cleaned text scraped from this company's careers and job postings pages:
---
{jobs_text}
---

Extract each open job or internship position as a distinct posting. \
If no postings are present in the text, return an empty list.

Respond with ONLY a JSON object, no prose, matching this shape:
{{
  "postings": [
    {{
      "title": "...",
      "description": "...",
      "required_skills": ["..."],
      "nice_to_have_skills": ["..."],
      "experience_level": "...",
      "location": "...",
      "employment_type": "full-time / internship / contract",
      "posted_date": null,
      "source_url": "..."
    }}
  ]
}}
"""


def run_single_company_scrape_crew(company_name: str, page_text: str, jobs_text: str) -> dict[str, Any]:
    """Runs the Web Scraper Agent to extract structured profile and job postings."""
    agent = build_web_scraper_agent()

    company_task = Task(
        description=COMPANY_INFO_PROMPT.format(
            company_name=company_name,
            page_text=page_text or "(no page text scraped)",
        ),
        expected_output="A single JSON object with industry, company_size, tech_stack, locations, description.",
        agent=agent,
    )

    jobs_task = Task(
        description=JOB_POSTINGS_PROMPT.format(
            company_name=company_name,
            jobs_text=jobs_text or "(no job posting text scraped)",
        ),
        expected_output="A single JSON object with key postings.",
        agent=agent,
        context=[company_task],
    )

    crew = Crew(
        agents=[agent],
        tasks=[company_task, jobs_task],
        process=Process.sequential,
        verbose=False,
    )
    crew.kickoff()

    company_info = extract_json_object(str(company_task.output))
    postings = extract_json_object(str(jobs_task.output)).get("postings", [])

    return {"company_info": company_info, "postings": postings}


async def scrape_and_ingest_single_company(
    company_identifier: str,
    max_postings: int = MAX_JOB_LINKS_PER_SCRAPE,
) -> dict[str, Any]:
    """Scrapes a company by name or URL, runs the Web Scraper Agent, and stores in scraped_companies."""
    company_identifier = company_identifier.strip()
    is_url = "://" in company_identifier or company_identifier.startswith("www.")

    if is_url:
        website_url = company_identifier if "://" in company_identifier else f"https://{company_identifier}"
        company_name = company_identifier.replace("https://", "").replace("http://", "").split("/")[0].split(".")[0].capitalize()
    else:
        company_name = company_identifier
        website_url = await asyncio.to_thread(discover_company_website, company_name)
        if not website_url:
            return {
                "company_name": company_name,
                "website_url": "",
                "industry": "Unknown",
                "status": "failed",
                "jobs_scraped": 0,
                "error": f"Could not discover official website for '{company_name}'",
            }

    # Fetch home page
    home_page = await asyncio.to_thread(fetch_page, website_url)
    if not home_page:
        return {
            "company_name": company_name,
            "website_url": website_url,
            "industry": "Unknown",
            "status": "failed",
            "jobs_scraped": 0,
            "error": f"Failed to fetch content from {website_url}",
        }

    # Discover careers page
    careers_url = discover_careers_link(home_page)
    pages_to_summarize = [home_page]
    job_pages = []

    if careers_url:
        careers_page = await asyncio.to_thread(fetch_page, careers_url)
        if careers_page is not None:
            pages_to_summarize.append(careers_page)
            job_links = [
                link
                for link in careers_page.links
                if same_domain(link, website_url) and link not in (website_url, careers_url)
            ][:max_postings]

            for link in job_links:
                job_page = await asyncio.to_thread(fetch_page, link)
                if job_page is not None:
                    job_pages.append(job_page)

            if not job_pages:
                job_pages.append(careers_page)

    page_text = "\n\n".join(p.text for p in pages_to_summarize)[:MAX_EXTRACTION_CHARS]
    jobs_text = "\n\n".join(f"SOURCE_URL: {p.url}\n{p.text}" for p in job_pages)[:MAX_EXTRACTION_CHARS]

    # Run CrewAI Web Scraper Agent
    try:
        crew_result = await asyncio.to_thread(
            run_single_company_scrape_crew, company_name, page_text, jobs_text
        )
    except Exception as exc:
        logger.exception("Web scraper crew failed for %s", company_name)
        return {
            "company_name": company_name,
            "website_url": website_url,
            "industry": "Unknown",
            "status": "failed",
            "jobs_scraped": 0,
            "error": str(exc),
        }

    company_info = crew_result.get("company_info", {})
    postings = crew_result.get("postings", [])

    # Save to distinct scraped collections
    try:
        company_id, _ = await upsert_scraped_company(
            company_name=company_name,
            website_url=website_url,
            industry=company_info.get("industry", "Technology"),
            company_size=company_info.get("company_size", "Unknown"),
            tech_stack=company_info.get("tech_stack", []),
            locations=company_info.get("locations", []),
            description=company_info.get("description", ""),
        )
        created, updated, _, _ = await upsert_scraped_job_postings(
            company_id=company_id,
            company_name=company_name,
            postings=postings,
        )
    except Exception as exc:
        logger.exception("Failed to persist scraped company %s", company_name)
        return {
            "company_name": company_name,
            "website_url": website_url,
            "industry": company_info.get("industry", "Unknown"),
            "status": "partial",
            "jobs_scraped": len(postings),
            "error": f"Extracted data but database upsert failed: {exc}",
        }

    return {
        "company_name": company_name,
        "website_url": website_url,
        "industry": company_info.get("industry", "Technology"),
        "status": "success",
        "jobs_scraped": created + updated,
        "error": None,
    }


async def run_batch_scraping(
    company_identifiers: list[str],
    max_postings_per_company: int = MAX_JOB_LINKS_PER_SCRAPE,
) -> dict[str, Any]:
    """Scrapes a list of companies sequentially or in small batches to respect rate limits."""
    summaries = []
    successful = 0
    failed = 0

    for comp in company_identifiers:
        summary = await scrape_and_ingest_single_company(comp, max_postings=max_postings_per_company)
        summaries.append(summary)
        if summary["status"] == "success":
            successful += 1
        else:
            failed += 1

    return {
        "total_requested": len(company_identifiers),
        "successfully_scraped": successful,
        "failed": failed,
        "companies": summaries,
    }
