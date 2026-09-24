import asyncio
import json
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException

from crews.company_ingestion_crew import run_company_ingestion_crew
from crews.learning_path_crew import run_learning_path_crew
from crews.matching_crew import run_job_suggestion_crew, run_matching_crew
from db.company_store import list_known_domains, upsert_company, upsert_job_postings
from db.mongo_client import ensure_vector_index
from db.results_store import save_learning_path_result, save_match_result
from models.schemas import (
    IngestCompanyRequest,
    IngestCompanyResponse,
    JobPostingSummary,
    LearningPathRequest,
    LearningPathResponse,
    MatchRequest,
    MatchResponse,
    SuggestJobsRequest,
    SuggestJobsResponse,
)
from tools.company_discovery_tool import discover_company_website, discover_next_company
from tools.rag_retrieval_tool import RagRetrievalTool
from tools.skill_gap_tool import compute_skill_gaps, extract_current_skills
from tools.vector_search_tool import VectorSearchTool
from tools.web_scraper_tool import discover_careers_link, fetch_page, same_domain

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("jems-agent-service")

GENERIC_LLM_ERROR = "The reasoning engine failed to produce a valid response. Please retry."
GENERIC_DB_ERROR = "A database/vector-search error occurred. Please retry."
GENERIC_SCRAPE_ERROR = "Could not retrieve the company's website. Please check the URL and retry."

# Keeps the LLM extraction prompt (and scrape time) bounded for a single ingestion call.
MAX_JOB_LINKS_PER_INGEST = 8
MAX_EXTRACTION_CHARS = 6000


@asynccontextmanager
async def lifespan(app: FastAPI):
    await ensure_vector_index()
    yield


app = FastAPI(title="Jems Agent Service", version="1.0.0", lifespan=lifespan)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.post("/learning-path", response_model=LearningPathResponse)
async def learning_path(request: LearningPathRequest) -> LearningPathResponse:
    current_skills = extract_current_skills(request.user_profile, request.resume_text)
    _, skill_gaps = compute_skill_gaps(current_skills, request.career_objective)

    rag_tool = RagRetrievalTool()
    try:
        retrieved_jobs = await rag_tool.retrieve_jobs(request.career_objective, only_open=True)
    except Exception:
        logger.warning("RAG job retrieval failed for learning path; proceeding ungrounded", exc_info=True)
        retrieved_jobs = []

    try:
        crew_result = await asyncio.to_thread(
            run_learning_path_crew, current_skills, skill_gaps, request.career_objective, retrieved_jobs
        )
    except Exception:
        logger.exception("Learning path crew failed")
        raise HTTPException(status_code=502, detail=GENERIC_LLM_ERROR)

    try:
        response = LearningPathResponse(
            current_skills=current_skills,
            skill_gaps=skill_gaps,
            learning_path=crew_result["learning_path"],
            target_resume_skills=crew_result["target_resume_skills"],
            grounded=crew_result["grounded"],
            grounding_sources=crew_result["grounding_sources"],
        )
    except Exception:
        logger.exception("Learning path response validation failed")
        raise HTTPException(status_code=502, detail=GENERIC_LLM_ERROR)

    await save_learning_path_result(
        user_profile=request.user_profile,
        career_objective=request.career_objective,
        current_skills=response.current_skills,
        skill_gaps=response.skill_gaps,
        learning_path=[step.model_dump() for step in response.learning_path],
        target_resume_skills=response.target_resume_skills,
    )

    return response


@app.post("/match-candidates", response_model=MatchResponse)
async def match_candidates(request: MatchRequest) -> MatchResponse:
    vector_tool = VectorSearchTool()

    try:
        user_ids = await vector_tool.upsert_candidate_embeddings(request.candidate_pool)
        query_text = f"{request.role_title}\n{request.job_description}"
        shortlist = await vector_tool.top_n_candidates(query_text, user_ids)
    except Exception:
        logger.exception("Vector search stage failed")
        raise HTTPException(status_code=502, detail=GENERIC_DB_ERROR)

    rag_tool = RagRetrievalTool()
    company_context = None
    if request.company_name:
        try:
            company_context = await rag_tool.find_company_by_name(request.company_name)
        except Exception:
            logger.warning("Company lookup failed for %r; proceeding without it", request.company_name, exc_info=True)

    try:
        retrieved_context = await rag_tool.retrieve_jobs(query_text, only_open=False)
    except Exception:
        logger.warning("RAG job-context retrieval failed for matching; proceeding ungrounded", exc_info=True)
        retrieved_context = []

    try:
        crew_result = await asyncio.to_thread(
            run_matching_crew,
            request.job_description,
            request.role_title,
            shortlist,
            company_context,
            retrieved_context,
        )
    except Exception:
        logger.exception("Matching crew failed")
        raise HTTPException(status_code=502, detail=GENERIC_LLM_ERROR)

    try:
        response = MatchResponse(
            parsed_requirements=crew_result["parsed_requirements"],
            ranked_matches=crew_result["ranked_matches"],
            grounded=crew_result["grounded"],
            grounding_sources=crew_result["grounding_sources"],
        )
    except Exception:
        logger.exception("Match response validation failed")
        raise HTTPException(status_code=502, detail=GENERIC_LLM_ERROR)

    await save_match_result(
        role_title=request.role_title,
        job_description=request.job_description,
        parsed_requirements=response.parsed_requirements.model_dump(),
        ranked_matches=[match.model_dump() for match in response.ranked_matches],
    )

    return response


@app.post("/ingest-company", response_model=IngestCompanyResponse)
async def ingest_company(request: IngestCompanyRequest) -> IngestCompanyResponse:
    company_name = request.company_name
    website_url = request.website_url

    try:
        if company_name is None and website_url is None:
            # Discovery mode: no company named -- find one nobody has ingested
            # yet via tools/company_discovery_tool.py's seed searches, restricted
            # to what looks like that company's own official domain.
            known_domains = await list_known_domains()
            discovered = await asyncio.to_thread(discover_next_company, known_domains)
            if discovered is None:
                raise HTTPException(
                    status_code=404,
                    detail="No new company could be discovered right now. Try again shortly.",
                )
            company_name, website_url = discovered

        home_page = await asyncio.to_thread(fetch_page, website_url)

        if home_page is None:
            # Recovery path -- the given/discovered website_url failed to fetch
            # (typo, moved domain), so try resolving it by name once more.
            discovered_url = await asyncio.to_thread(discover_company_website, company_name)
            if discovered_url:
                home_page = await asyncio.to_thread(fetch_page, discovered_url)
                if home_page is not None:
                    website_url = discovered_url

        if home_page is None:
            raise HTTPException(status_code=502, detail=GENERIC_SCRAPE_ERROR)

        careers_url = request.careers_page_url or discover_careers_link(home_page)

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
                ][:MAX_JOB_LINKS_PER_INGEST]

                for link in job_links:
                    job_page = await asyncio.to_thread(fetch_page, link)
                    if job_page is not None:
                        job_pages.append(job_page)

                if not job_pages:
                    job_pages.append(careers_page)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Company scraping stage failed")
        raise HTTPException(status_code=502, detail=GENERIC_SCRAPE_ERROR)

    page_text = "\n\n".join(page.text for page in pages_to_summarize)[:MAX_EXTRACTION_CHARS]
    jobs_text = "\n\n".join(f"SOURCE_URL: {page.url}\n{page.text}" for page in job_pages)[:MAX_EXTRACTION_CHARS]

    try:
        crew_result = await asyncio.to_thread(
            run_company_ingestion_crew, company_name, page_text, jobs_text
        )
    except Exception:
        logger.exception("Company ingestion crew failed")
        raise HTTPException(status_code=502, detail=GENERIC_LLM_ERROR)

    company_info = crew_result["company_info"]
    postings = crew_result["postings"]

    try:
        company_id, company_status = await upsert_company(
            company_name=company_name,
            website_url=website_url,
            industry=company_info.get("industry", ""),
            company_size=company_info.get("company_size", ""),
            tech_stack=company_info.get("tech_stack", []),
            locations=company_info.get("locations", []),
            description=company_info.get("description", ""),
        )
        jobs_created, jobs_updated, jobs_closed, job_summaries = await upsert_job_postings(
            company_id=company_id, company_name=company_name, postings=postings
        )
    except Exception:
        logger.exception("Company/job upsert failed")
        raise HTTPException(status_code=502, detail=GENERIC_DB_ERROR)

    return IngestCompanyResponse(
        company_id=company_id,
        company_status=company_status,
        jobs_created=jobs_created,
        jobs_updated=jobs_updated,
        jobs_closed=jobs_closed,
        jobs=[JobPostingSummary(**summary) for summary in job_summaries],
    )


@app.post("/suggest-jobs-for-candidate", response_model=SuggestJobsResponse)
async def suggest_jobs_for_candidate(request: SuggestJobsRequest) -> SuggestJobsResponse:
    rag_tool = RagRetrievalTool()
    query_text = f"{json.dumps(request.candidate_profile, default=str)}\n{request.resume_text}"

    try:
        retrieved_jobs = await rag_tool.retrieve_jobs(query_text, top_k=request.top_n, only_open=True)
    except Exception:
        logger.exception("Job retrieval for suggestion failed")
        raise HTTPException(status_code=502, detail=GENERIC_DB_ERROR)

    if not retrieved_jobs:
        return SuggestJobsResponse(suggested_jobs=[])

    try:
        crew_result = await asyncio.to_thread(
            run_job_suggestion_crew, request.candidate_profile, request.resume_text, retrieved_jobs
        )
    except Exception:
        logger.exception("Job suggestion crew failed")
        raise HTTPException(status_code=502, detail=GENERIC_LLM_ERROR)

    try:
        response = SuggestJobsResponse(suggested_jobs=crew_result["suggested_jobs"])
    except Exception:
        logger.exception("Suggested jobs response validation failed")
        raise HTTPException(status_code=502, detail=GENERIC_LLM_ERROR)

    return response
