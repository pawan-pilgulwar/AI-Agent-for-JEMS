import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException

from crews.learning_path_crew import run_learning_path_crew
from crews.matching_crew import run_matching_crew
from db.mongo_client import ensure_vector_index
from db.results_store import save_learning_path_result, save_match_result
from models.schemas import (
    LearningPathRequest,
    LearningPathResponse,
    MatchRequest,
    MatchResponse,
)
from tools.skill_gap_tool import compute_skill_gaps, extract_current_skills
from tools.vector_search_tool import VectorSearchTool

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("jems-agent-service")

GENERIC_LLM_ERROR = "The reasoning engine failed to produce a valid response. Please retry."
GENERIC_DB_ERROR = "A database/vector-search error occurred. Please retry."


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

    try:
        crew_result = await asyncio.to_thread(
            run_learning_path_crew, current_skills, skill_gaps, request.career_objective
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

    try:
        crew_result = await asyncio.to_thread(
            run_matching_crew, request.job_description, request.role_title, shortlist
        )
    except Exception:
        logger.exception("Matching crew failed")
        raise HTTPException(status_code=502, detail=GENERIC_LLM_ERROR)

    try:
        response = MatchResponse(
            parsed_requirements=crew_result["parsed_requirements"],
            ranked_matches=crew_result["ranked_matches"],
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
