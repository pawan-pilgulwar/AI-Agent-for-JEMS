from fastapi.testclient import TestClient

import main
from tools.web_scraper_tool import ScrapedPage


async def _noop_startup() -> None:
    return None


def _fake_fetch_page(url):
    if url == "https://acme.example.com":
        return ScrapedPage(
            url=url,
            text="Acme Inc is a fintech company based in Austin, TX.",
            links=["https://acme.example.com/careers"],
        )
    if url == "https://acme.example.com/careers":
        return ScrapedPage(
            url=url,
            text="Open roles: Backend Engineer -- Python, Docker required.",
            links=[],
        )
    return None


def _fake_run_company_ingestion_crew(company_name, page_text, jobs_text):
    return {
        "company_info": {
            "industry": "fintech",
            "company_size": "51-200",
            "tech_stack": ["python", "docker"],
            "locations": ["Austin, TX"],
            "description": "Acme Inc is a fintech company based in Austin, TX.",
        },
        "postings": [
            {
                "title": "Backend Engineer",
                "description": "Backend Engineer -- Python, Docker required.",
                "required_skills": ["python", "docker"],
                "nice_to_have_skills": [],
                "experience_level": "mid-level",
                "location": "Austin, TX",
                "employment_type": "full-time",
                "posted_date": None,
                "source_url": "https://acme.example.com/careers",
            }
        ],
    }


async def _fake_upsert_company(**kwargs):
    return "acme.example.com", "created"


async def _fake_upsert_job_postings(**kwargs):
    return 1, 0, 0, [{"id": "job-1", "title": "Backend Engineer", "status": "open"}]


def test_ingest_company_happy_path(monkeypatch):
    """Happy-path test with scraping, the CrewAI/Ollama call, and Mongo
    upserts all mocked out -- no real network, LLM, or MongoDB calls."""
    monkeypatch.setattr(main, "ensure_vector_index", _noop_startup)
    monkeypatch.setattr(main, "fetch_page", _fake_fetch_page)
    monkeypatch.setattr(main, "run_company_ingestion_crew", _fake_run_company_ingestion_crew)
    monkeypatch.setattr(main, "upsert_company", _fake_upsert_company)
    monkeypatch.setattr(main, "upsert_job_postings", _fake_upsert_job_postings)

    client = TestClient(main.app)
    response = client.post(
        "/ingest-company",
        json={
            "company_name": "Acme Inc",
            "website_url": "https://acme.example.com",
        },
    )

    assert response.status_code == 200
    body = response.json()

    assert body["company_id"] == "acme.example.com"
    assert body["company_status"] == "created"
    assert body["jobs_created"] == 1
    assert body["jobs_updated"] == 0
    assert body["jobs_closed"] == 0
    assert body["jobs"] == [{"id": "job-1", "title": "Backend Engineer", "status": "open"}]


def test_ingest_company_rejects_invalid_input():
    client = TestClient(main.app)
    response = client.post("/ingest-company", json={"company_name": "", "website_url": ""})
    assert response.status_code == 422


def test_ingest_company_rejects_partial_input():
    """company_name/website_url must be given together or not at all -- one
    without the other is ambiguous, not a valid discovery-mode call."""
    client = TestClient(main.app)
    response = client.post("/ingest-company", json={"company_name": "Acme Inc"})
    assert response.status_code == 422


async def _fake_list_known_domains():
    return {"other.example.com"}


def _fake_discover_next_company(known_domains):
    assert known_domains == {"other.example.com"}
    return "Acme Inc", "https://acme.example.com"


def test_ingest_company_discovery_mode_happy_path(monkeypatch):
    """Empty body -- discovery mode picks a company on its own. Search,
    scraping, the CrewAI/Ollama call, and Mongo are all mocked out."""
    monkeypatch.setattr(main, "ensure_vector_index", _noop_startup)
    monkeypatch.setattr(main, "list_known_domains", _fake_list_known_domains)
    monkeypatch.setattr(main, "discover_next_company", _fake_discover_next_company)
    monkeypatch.setattr(main, "fetch_page", _fake_fetch_page)
    monkeypatch.setattr(main, "run_company_ingestion_crew", _fake_run_company_ingestion_crew)
    monkeypatch.setattr(main, "upsert_company", _fake_upsert_company)
    monkeypatch.setattr(main, "upsert_job_postings", _fake_upsert_job_postings)

    client = TestClient(main.app)
    response = client.post("/ingest-company", json={})

    assert response.status_code == 200
    body = response.json()
    assert body["company_id"] == "acme.example.com"
    assert body["company_status"] == "created"


def test_ingest_company_discovery_mode_no_new_company_found(monkeypatch):
    """Discovery exhausted every seed query without finding a new company --
    a clean 404, not a fabricated result."""

    async def _fake_list_known_domains_empty():
        return set()

    def _fake_discover_next_company_none(known_domains):
        return None

    monkeypatch.setattr(main, "ensure_vector_index", _noop_startup)
    monkeypatch.setattr(main, "list_known_domains", _fake_list_known_domains_empty)
    monkeypatch.setattr(main, "discover_next_company", _fake_discover_next_company_none)

    client = TestClient(main.app)
    response = client.post("/ingest-company", json={})

    assert response.status_code == 404
