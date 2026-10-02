import asyncio
import logging
import time
from typing import Any

from crews.analysis_crew import run_profile_analysis_crew
from crews.assessment_crew import run_assessment_evaluation_crew, run_assessment_generation_crew
from crews.learning_crew import run_learning_crew
from crews.matching_crew import run_job_suggestion_crew, run_matching_crew
from crews.roadmap_crew import run_roadmap_crew
from crews.web_scraper_crew import run_batch_scraping
from db.assessment_store import (
    get_verified_skills,
    save_assessment_evaluation,
    save_assessment_test,
)
from db.company_store import upsert_registered_company, upsert_registered_job_postings
from db.results_store import save_match_result
from db.roadmap_store import (
    compute_learning_cache_key,
    compute_roadmap_cache_key,
    get_cached_learning_recommendation,
    get_cached_roadmap,
    save_learning_recommendation,
    save_roadmap,
)
from models.schemas import AgentRequestType
from tools.rag_retrieval_tool import RagRetrievalTool
from tools.vector_search_tool import VectorSearchTool

logger = logging.getLogger(__name__)


class MultiAgentOrchestrator:
    """Central orchestration layer that routes incoming client and backend requests
    to the appropriate CrewAI agent or coordinates multi-agent sequential workflows."""

    def __init__(self) -> None:
        self.rag_tool = RagRetrievalTool()
        self.vector_tool = VectorSearchTool()

    async def route_request(self, request_type: AgentRequestType, payload: dict[str, Any]) -> dict[str, Any]:
        start_time = time.perf_counter()
        logger.info("Orchestrator received request_type=%s", request_type)

        handler_map = {
            "analyze_profile": self.handle_analyze_profile,
            "generate_roadmap": self.handle_generate_roadmap,
            "recommend_learning": self.handle_recommend_learning,
            "generate_assessment": self.handle_generate_assessment,
            "evaluate_assessment": self.handle_evaluate_assessment,
            "match_candidates": self.handle_match_candidates,
            "suggest_jobs": self.handle_suggest_jobs,
            "scrape_companies": self.handle_scrape_companies,
            "register_company": self.handle_register_company,
            "full_student_pipeline": self.handle_full_student_pipeline,
        }

        handler = handler_map.get(request_type)
        if not handler:
            raise ValueError(f"Unsupported request_type: '{request_type}'")

        result = await handler(payload)
        elapsed = time.perf_counter() - start_time
        return {
            "request_type": request_type,
            "status": "success",
            "result": result,
            "execution_time_seconds": round(elapsed, 3),
        }

    # -------------------------------------------------------------------------
    # 1. Analysis Agent
    # -------------------------------------------------------------------------
    async def handle_analyze_profile(self, payload: dict[str, Any]) -> dict[str, Any]:
        student_profile = payload.get("student_profile", {})
        resume_text = payload.get("resume_text", "")
        career_objective = payload.get("career_objective", "")
        target_companies = payload.get("target_companies", [])
        user_id = student_profile.get("user_id") or student_profile.get("_id")

        # Fetch verified skills if candidate exists
        verified_skills_data = []
        if user_id:
            try:
                verified_skills_data = await get_verified_skills(str(user_id))
            except Exception:
                logger.debug("No prior verified skills found for %s", user_id)
        verified_skill_names = [v.get("skill") for v in verified_skills_data]

        # Retrieve requirements from BOTH registered and scraped collections
        query_text = f"{career_objective}\n{' '.join(target_companies)}"
        registered_jobs = await self.rag_tool.retrieve_jobs(query_text, top_k=5, scope="registered")
        scraped_jobs = await self.rag_tool.retrieve_jobs(query_text, top_k=5, scope="scraped")

        analysis_result = await asyncio.to_thread(
            run_profile_analysis_crew,
            student_profile=student_profile,
            resume_text=resume_text,
            career_objective=career_objective,
            target_companies=target_companies,
            registered_context=registered_jobs,
            scraped_context=scraped_jobs,
        )

        if verified_skill_names:
            analysis_result["verified_skills"] = sorted(
                list(set(analysis_result.get("verified_skills", []) + verified_skill_names))
            )

        return analysis_result

    # -------------------------------------------------------------------------
    # 2. Roadmap Agent
    # -------------------------------------------------------------------------
    async def handle_generate_roadmap(self, payload: dict[str, Any]) -> dict[str, Any]:
        current_skills = payload.get("current_skills", [])
        skill_gaps = payload.get("skill_gaps", [])
        career_objective = payload.get("career_objective", "")
        target_role = payload.get("target_role")
        timeline_weeks = payload.get("timeline_weeks", 12)
        user_id = payload.get("user_id")
        force_refresh = payload.get("force_refresh", False)

        cache_key = compute_roadmap_cache_key(
            career_objective=career_objective,
            target_role=target_role,
            current_skills=current_skills,
            skill_gaps=skill_gaps,
            timeline_weeks=timeline_weeks,
            user_id=user_id,
        )

        if not force_refresh:
            cached = await get_cached_roadmap(cache_key)
            if cached:
                return cached

        roadmap_result = await asyncio.to_thread(
            run_roadmap_crew,
            current_skills=current_skills,
            skill_gaps=skill_gaps,
            career_objective=career_objective,
            target_role=target_role,
            timeline_weeks=timeline_weeks,
        )

        await save_roadmap(
            cache_key=cache_key,
            roadmap_data=roadmap_result,
            user_id=user_id,
            career_objective=career_objective,
            target_role=target_role,
        )
        return roadmap_result

    # -------------------------------------------------------------------------
    # 3. Learning Agent
    # -------------------------------------------------------------------------
    async def handle_recommend_learning(self, payload: dict[str, Any]) -> dict[str, Any]:
        skills_to_learn = payload.get("skills_to_learn", [])
        career_objective = payload.get("career_objective", "")
        target_role = payload.get("target_role")
        user_id = payload.get("user_id")
        force_refresh = payload.get("force_refresh", False)

        cache_key = compute_learning_cache_key(
            career_objective=career_objective,
            target_role=target_role,
            skills_to_learn=skills_to_learn,
            user_id=user_id,
        )

        if not force_refresh:
            cached = await get_cached_learning_recommendation(cache_key)
            if cached:
                return cached

        learning_result = await asyncio.to_thread(
            run_learning_crew,
            skills_to_learn=skills_to_learn,
            career_objective=career_objective,
            target_role=target_role,
        )

        await save_learning_recommendation(
            cache_key=cache_key,
            recommendations_data=learning_result,
            user_id=user_id,
            career_objective=career_objective,
            target_role=target_role,
        )
        return learning_result

    # -------------------------------------------------------------------------
    # 4. Assessment Agent
    # -------------------------------------------------------------------------
    async def handle_generate_assessment(self, payload: dict[str, Any]) -> dict[str, Any]:
        skills = payload.get("skills", [])
        role_category = payload.get("role_category", "software engineering")
        difficulty = payload.get("difficulty", "intermediate")
        num_questions = payload.get("num_questions", 5)
        user_id = payload.get("user_id")

        questions = await asyncio.to_thread(
            run_assessment_generation_crew,
            skills=skills,
            role_category=role_category,
            difficulty=difficulty,
            num_questions=num_questions,
        )

        test_id = await save_assessment_test(
            user_id=user_id,
            skills=skills,
            role_category=role_category,
            difficulty=difficulty,
            questions=questions,
        )

        return {
            "test_id": test_id,
            "skills": skills,
            "difficulty": difficulty,
            "questions": questions,
        }

    async def handle_evaluate_assessment(self, payload: dict[str, Any]) -> dict[str, Any]:
        test_id = payload.get("test_id")
        user_id = payload.get("user_id", "")
        skills = payload.get("skills", [])
        submissions = payload.get("submissions", [])
        questions = payload.get("questions", [])

        eval_result = await asyncio.to_thread(
            run_assessment_evaluation_crew,
            skills=skills,
            submissions=submissions,
            questions=questions,
        )

        # Save assessment results and update student's verified skills portfolio
        await save_assessment_evaluation(
            test_id=test_id,
            user_id=user_id,
            overall_score=eval_result["overall_score"],
            skill_evaluations=eval_result["skill_evaluations"],
            verified_skills=eval_result["verified_skills_awarded"],
            feedback=eval_result["detailed_feedback"],
        )

        eval_result["user_id"] = user_id
        eval_result["test_id"] = test_id
        return eval_result

    # -------------------------------------------------------------------------
    # 5. Matching Agent
    # -------------------------------------------------------------------------
    async def handle_match_candidates(self, payload: dict[str, Any]) -> dict[str, Any]:
        role_title = payload.get("role_title", "")
        job_description = payload.get("job_description", "")
        candidate_pool = payload.get("candidate_pool", [])
        company_name = payload.get("company_name")

        user_ids = await self.vector_tool.upsert_candidate_embeddings(candidate_pool)
        query_text = f"{role_title}\n{job_description}"
        shortlist = await self.vector_tool.top_n_candidates(query_text, user_ids)

        company_context = None
        if company_name:
            company_context = await self.rag_tool.find_company_by_name(company_name)

        retrieved_context = await self.rag_tool.retrieve_jobs(query_text, only_open=False, scope="both")

        crew_result = await asyncio.to_thread(
            run_matching_crew,
            job_description=job_description,
            role_title=role_title,
            shortlisted_candidates=shortlist,
            company_context=company_context,
            retrieved_context=retrieved_context,
        )

        # Generate notifications for shortlisted candidates
        notifications = []
        for candidate in crew_result.get("ranked_matches", [])[:5]:
            if candidate.get("score", 0) >= 60:
                notifications.append(
                    {
                        "recipient_type": "student",
                        "recipient_id": candidate["user_id"],
                        "title": f"New Match: {role_title}",
                        "message": f"You are a {candidate['score']}% match for {role_title}. Reason: {candidate['reasoning']}",
                        "action_url": f"/jobs/details?role={role_title.replace(' ', '+')}",
                    }
                )

        crew_result["notifications"] = notifications

        await save_match_result(
            role_title=role_title,
            job_description=job_description,
            parsed_requirements=crew_result.get("parsed_requirements", {}),
            ranked_matches=crew_result.get("ranked_matches", []),
        )

        return crew_result

    async def handle_suggest_jobs(self, payload: dict[str, Any]) -> dict[str, Any]:
        candidate_profile = payload.get("candidate_profile", {})
        resume_text = payload.get("resume_text", "")
        top_n = payload.get("top_n", 5)

        query_text = f"{candidate_profile}\n{resume_text}"
        retrieved_jobs = await self.rag_tool.retrieve_jobs(query_text, top_k=top_n, only_open=True, scope="both")

        if not retrieved_jobs:
            return {"suggested_jobs": []}

        return await asyncio.to_thread(
            run_job_suggestion_crew,
            candidate_profile=candidate_profile,
            resume_text=resume_text,
            retrieved_jobs=retrieved_jobs,
        )

    # -------------------------------------------------------------------------
    # 6. Web Scraper Agent & Company Ingestion
    # -------------------------------------------------------------------------
    async def handle_scrape_companies(self, payload: dict[str, Any]) -> dict[str, Any]:
        companies = payload.get("companies", [])
        max_postings = payload.get("max_postings_per_company", 8)
        return await run_batch_scraping(companies, max_postings_per_company=max_postings)

    async def handle_register_company(self, payload: dict[str, Any]) -> dict[str, Any]:
        company_name = payload.get("company_name", "")
        website_url = payload.get("website_url", "")
        industry = payload.get("industry", "Technology")
        company_size = payload.get("company_size", "1-50")
        tech_stack = payload.get("tech_stack", [])
        locations = payload.get("locations", [])
        description = payload.get("description", "")
        contact_email = payload.get("contact_email")
        postings = payload.get("postings", [])

        company_id, status = await upsert_registered_company(
            company_name=company_name,
            website_url=website_url,
            industry=industry,
            company_size=company_size,
            tech_stack=tech_stack,
            locations=locations,
            description=description,
            contact_email=contact_email,
        )

        created, updated, _, _ = await upsert_registered_job_postings(
            company_id=company_id,
            company_name=company_name,
            postings=postings,
        )

        return {
            "company_id": company_id,
            "status": status,
            "jobs_created": created,
            "jobs_updated": updated,
        }

    # -------------------------------------------------------------------------
    # 7. End-to-End Multi-Agent Pipeline (Architecture Diagram Flow)
    # -------------------------------------------------------------------------
    async def handle_full_student_pipeline(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Runs the complete multi-agent workflow:
        1. Analysis Agent -> analyzes profile against registered + scraped company requirements
        2. Roadmap Agent -> generates step-by-step milestone learning plan
        3. Learning Agent -> curates courses, projects, certifications & FDP programs
        4. Matching Agent -> matches candidate to open roles
        """
        logger.info("Executing full multi-agent student pipeline")

        # Step 1: Profile & Dual Company Analysis
        analysis_data = await self.handle_analyze_profile(payload)

        current_skills = analysis_data.get("student_skills", [])
        skill_gaps = analysis_data.get("technical_skill_gaps", [])
        career_objective = payload.get("career_objective", "")
        target_role = payload.get("target_role") or career_objective

        # Step 2: Roadmap Generation
        roadmap_payload = {
            "current_skills": current_skills,
            "skill_gaps": skill_gaps,
            "career_objective": career_objective,
            "target_role": target_role,
            "timeline_weeks": payload.get("timeline_weeks", 12),
        }
        roadmap_data = await self.handle_generate_roadmap(roadmap_payload)

        # Step 3: Learning & Training Recommendations
        learning_payload = {
            "skills_to_learn": skill_gaps,
            "career_objective": career_objective,
            "target_role": target_role,
        }
        learning_data = await self.handle_recommend_learning(learning_payload)

        # Step 4: Job Matching
        matching_payload = {
            "candidate_profile": payload.get("student_profile", {}),
            "resume_text": payload.get("resume_text", ""),
            "top_n": 5,
        }
        jobs_data = await self.handle_suggest_jobs(matching_payload)

        return {
            "analysis": analysis_data,
            "roadmap": roadmap_data,
            "learning_recommendations": learning_data,
            "suggested_jobs": jobs_data.get("suggested_jobs", []),
        }
