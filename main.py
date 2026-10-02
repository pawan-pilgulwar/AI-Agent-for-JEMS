import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException

from crews.orchestrator import MultiAgentOrchestrator
from db.mongo_client import ensure_vector_index
from models.schemas import (
    AnalyzeProfileRequest,
    AnalyzeProfileResponse,
    BatchScrapeCompaniesRequest,
    BatchScrapeCompaniesResponse,
    EnhancedMatchResponse,
    EvaluateAssessmentRequest,
    EvaluateAssessmentResponse,
    GenerateAssessmentRequest,
    GenerateAssessmentResponse,
    GenerateRoadmapRequest,
    GenerateRoadmapResponse,
    MatchRequest,
    OrchestrateRequest,
    OrchestrateResponse,
    RecommendLearningRequest,
    RecommendLearningResponse,
    RegisterCompanyRequest,
    RegisterCompanyResponse,
    SuggestJobsRequest,
    SuggestJobsResponse,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("jems-agent-service")

GENERIC_LLM_ERROR = "The reasoning engine failed to produce a valid response. Please retry."
GENERIC_DB_ERROR = "A database/vector-search error occurred. Please retry."
GENERIC_SCRAPE_ERROR = "Could not retrieve the company's website. Please check the URL and retry."


@asynccontextmanager
async def lifespan(app: FastAPI):
    await ensure_vector_index()
    yield


app = FastAPI(
    title="JEMS Multi-Agent AI Service",
    description="Portal for Academia - Industry Collaboration for Skill Mapping, Internships & Placement (SIH 2026)",
    version="2.0.0",
    lifespan=lifespan,
)
orchestrator = MultiAgentOrchestrator()


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "jems-agent-service", "version": "2.0.0"}


# ---------------------------------------------------------------------------
# Multi-Agent Orchestration Layer & Router
# ---------------------------------------------------------------------------


@app.post("/orchestrate", response_model=OrchestrateResponse)
async def orchestrate_request(request: OrchestrateRequest) -> OrchestrateResponse:
    """Central router: transfers client or backend requests to the matching agent or multi-agent crew."""
    try:
        res = await orchestrator.route_request(request.request_type, request.payload)
        return OrchestrateResponse(**res)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception:
        logger.exception("Orchestration pipeline execution failed")
        raise HTTPException(status_code=502, detail=GENERIC_LLM_ERROR)


# ---------------------------------------------------------------------------
# Dedicated Agent Endpoints (Clean handlers delegating to orchestrator)
# ---------------------------------------------------------------------------


@app.post("/analyze-profile", response_model=AnalyzeProfileResponse)
async def analyze_profile(request: AnalyzeProfileRequest) -> AnalyzeProfileResponse:
    """Agent 1: Analysis Agent -- analyzes student profile against BOTH registered and scraped company requirements."""
    try:
        result = await orchestrator.handle_analyze_profile(request.model_dump())
        return AnalyzeProfileResponse(**result)
    except Exception:
        logger.exception("Analysis Agent execution failed")
        raise HTTPException(status_code=502, detail=GENERIC_LLM_ERROR)


@app.post("/generate-roadmap", response_model=GenerateRoadmapResponse)
async def generate_roadmap(request: GenerateRoadmapRequest) -> GenerateRoadmapResponse:
    """Agent 2: Roadmap Agent -- sequences missing skills into milestone-driven learning roadmap (cached in MongoDB)."""
    try:
        result = await orchestrator.handle_generate_roadmap(request.model_dump())
        return GenerateRoadmapResponse(**result)
    except Exception:
        logger.exception("Roadmap Agent execution failed")
        raise HTTPException(status_code=502, detail=GENERIC_LLM_ERROR)


@app.post("/recommend-learning", response_model=RecommendLearningResponse)
async def recommend_learning(request: RecommendLearningRequest) -> RecommendLearningResponse:
    """Agent 3: Learning Agent -- curates courses, projects, certifications, and FDP / workshop programs (cached in MongoDB)."""
    try:
        result = await orchestrator.handle_recommend_learning(request.model_dump())
        return RecommendLearningResponse(**result)
    except Exception:
        logger.exception("Learning Agent execution failed")
        raise HTTPException(status_code=502, detail=GENERIC_LLM_ERROR)


@app.post("/assessment/generate", response_model=GenerateAssessmentResponse)
async def generate_assessment(request: GenerateAssessmentRequest) -> GenerateAssessmentResponse:
    """Agent 4: Assessment Agent -- creates skill validation test and saves to DB."""
    try:
        result = await orchestrator.handle_generate_assessment(request.model_dump())
        return GenerateAssessmentResponse(**result)
    except Exception:
        logger.exception("Assessment generation failed")
        raise HTTPException(status_code=502, detail=GENERIC_LLM_ERROR)


@app.post("/assessment/evaluate", response_model=EvaluateAssessmentResponse)
async def evaluate_assessment(request: EvaluateAssessmentRequest) -> EvaluateAssessmentResponse:
    """Agent 4: Assessment Agent -- evaluates answers, scores skills, and updates verified badges in DB."""
    try:
        result = await orchestrator.handle_evaluate_assessment(request.model_dump())
        return EvaluateAssessmentResponse(**result)
    except Exception:
        logger.exception("Assessment evaluation failed")
        raise HTTPException(status_code=502, detail=GENERIC_LLM_ERROR)


@app.post("/match-candidates", response_model=EnhancedMatchResponse)
async def match_candidates(request: MatchRequest) -> EnhancedMatchResponse:
    """Agent 5: Matching Agent -- scores candidates against role, grounds context, generates notifications."""
    try:
        result = await orchestrator.handle_match_candidates(request.model_dump())
        return EnhancedMatchResponse(**result)
    except Exception:
        logger.exception("Candidate matching failed")
        raise HTTPException(status_code=502, detail=GENERIC_LLM_ERROR)


@app.post("/suggest-jobs", response_model=SuggestJobsResponse)
async def suggest_jobs(request: SuggestJobsRequest) -> SuggestJobsResponse:
    """Agent 5: Matching Agent (Reverse) -- recommends best matching open jobs for a candidate."""
    try:
        result = await orchestrator.handle_suggest_jobs(request.model_dump())
        return SuggestJobsResponse(**result)
    except Exception:
        logger.exception("Job suggestion failed")
        raise HTTPException(status_code=502, detail=GENERIC_LLM_ERROR)


@app.post("/scrape-companies", response_model=BatchScrapeCompaniesResponse)
async def scrape_companies(request: BatchScrapeCompaniesRequest) -> BatchScrapeCompaniesResponse:
    """Agent 6: Web Scraper Agent -- scrapes company websites/careers and stores in scraped_companies."""
    try:
        result = await orchestrator.handle_scrape_companies(request.model_dump())
        return BatchScrapeCompaniesResponse(**result)
    except Exception:
        logger.exception("Web scraping batch failed")
        raise HTTPException(status_code=502, detail=GENERIC_SCRAPE_ERROR)


@app.post("/register-company", response_model=RegisterCompanyResponse)
async def register_company(request: RegisterCompanyRequest) -> RegisterCompanyResponse:
    """Platform Company Registration -- saves company and postings directly into registered_companies."""
    try:
        result = await orchestrator.handle_register_company(request.model_dump())
        return RegisterCompanyResponse(**result)
    except Exception:
        logger.exception("Platform company registration failed")
        raise HTTPException(status_code=502, detail=GENERIC_DB_ERROR)
