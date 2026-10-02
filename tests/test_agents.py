import pytest
from fastapi.testclient import TestClient

import main


async def _noop_startup() -> None:
    return None


def test_health_endpoint():
    client = TestClient(main.app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_orchestrate_invalid_request_type():
    client = TestClient(main.app)
    response = client.post(
        "/orchestrate",
        json={"request_type": "invalid_type", "payload": {}},
    )
    assert response.status_code == 422


def test_orchestrate_analyze_profile(monkeypatch):
    monkeypatch.setattr(main, "ensure_vector_index", _noop_startup)

    async def fake_handle_analyze_profile(payload):
        return {
            "student_skills": ["python", "sql"],
            "verified_skills": ["python"],
            "technical_skill_gaps": ["docker", "fastapi"],
            "soft_skill_gaps": ["system design"],
            "compatibility_score": 75.0,
            "company_insights": [
                {
                    "company_name": "Capgemini",
                    "source_type": "scraped",
                    "role_title": "Software Developer",
                    "required_skills": ["python", "docker"],
                    "nice_to_have_skills": ["fastapi"],
                    "relevance_score": 85.0,
                },
                {
                    "company_name": "JEMS Partner Tech",
                    "source_type": "registered",
                    "role_title": "Backend Intern",
                    "required_skills": ["python", "sql"],
                    "nice_to_have_skills": ["docker"],
                    "relevance_score": 90.0,
                },
            ],
            "registered_companies_analyzed": 1,
            "scraped_companies_analyzed": 1,
            "analysis_summary": "Strong core Python foundation.",
            "grounded": True,
            "grounding_sources": ["job-1", "job-2"],
        }

    monkeypatch.setattr(main.orchestrator, "handle_analyze_profile", fake_handle_analyze_profile)

    client = TestClient(main.app)
    response = client.post(
        "/orchestrate",
        json={
            "request_type": "analyze_profile",
            "payload": {
                "student_profile": {"skills": ["python", "sql"], "user_id": "stud-1"},
                "resume_text": "Proficient in Python and SQL.",
                "career_objective": "Backend Software Developer",
                "target_companies": ["Capgemini"],
            },
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["request_type"] == "analyze_profile"
    assert body["status"] == "success"
    result = body["result"]
    assert result["student_skills"] == ["python", "sql"]
    assert "docker" in result["technical_skill_gaps"]
    assert result["registered_companies_analyzed"] == 1
    assert result["scraped_companies_analyzed"] == 1


def test_orchestrate_generate_roadmap(monkeypatch):
    monkeypatch.setattr(main, "ensure_vector_index", _noop_startup)

    async def fake_handle_generate_roadmap(payload):
        return {
            "career_objective": "Software Developer",
            "target_role": "Backend Engineer",
            "total_estimated_hours": 100.0,
            "milestones": [
                {
                    "milestone_index": 1,
                    "title": "Phase 1: API Fundamentals",
                    "duration_weeks": 3,
                    "skills_covered": ["fastapi"],
                    "learning_sequence": ["REST", "FastAPI"],
                    "milestone_deliverable": "CRUD REST API",
                    "rationale": "Base requirement for backend roles.",
                }
            ],
            "target_resume_skills": ["python", "fastapi"],
            "target_role_readiness": "Interview-ready for junior backend positions",
        }

    monkeypatch.setattr(main.orchestrator, "handle_generate_roadmap", fake_handle_generate_roadmap)

    client = TestClient(main.app)
    response = client.post(
        "/orchestrate",
        json={
            "request_type": "generate_roadmap",
            "payload": {
                "current_skills": ["python"],
                "skill_gaps": ["fastapi"],
                "career_objective": "Software Developer",
                "target_role": "Backend Engineer",
                "timeline_weeks": 12,
            },
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["request_type"] == "generate_roadmap"
    assert body["status"] == "success"
    assert len(body["result"]["milestones"]) == 1


def test_orchestrate_recommend_learning(monkeypatch):
    monkeypatch.setattr(main, "ensure_vector_index", _noop_startup)

    async def fake_handle_recommend_learning(payload):
        return {
            "resources": [
                {
                    "skill": "docker",
                    "resource_name": "Docker Mastery",
                    "resource_type": "course",
                    "provider": "Coursera",
                    "url_or_reference": "https://coursera.org",
                    "estimated_hours": 15.0,
                    "difficulty": "intermediate",
                }
            ],
            "recommended_certifications": ["Docker Certified Associate"],
            "hands_on_projects": [{"title": "Containerized Service"}],
            "fdp_training_programs": [
                {
                    "title": "Faculty Cloud Native Workshop",
                    "focus_area": "Docker & K8s",
                    "target_audience": "Faculty & Students",
                    "description": "Collaborative FDP workshop",
                }
            ],
            "progress_tracking_metrics": ["Complete Docker challenge"],
        }

    monkeypatch.setattr(main.orchestrator, "handle_recommend_learning", fake_handle_recommend_learning)

    client = TestClient(main.app)
    response = client.post(
        "/orchestrate",
        json={
            "request_type": "recommend_learning",
            "payload": {
                "skills_to_learn": ["docker"],
                "career_objective": "Backend Engineer",
            },
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["request_type"] == "recommend_learning"
    assert body["status"] == "success"
    assert len(body["result"]["resources"]) == 1


def test_orchestrate_assessment_generate_and_evaluate(monkeypatch):
    monkeypatch.setattr(main, "ensure_vector_index", _noop_startup)

    async def fake_handle_generate_assessment(payload):
        return {
            "test_id": "test-uuid-123",
            "skills": ["python"],
            "difficulty": "intermediate",
            "questions": [
                {
                    "question_id": 1,
                    "skill": "python",
                    "question_text": "What is GIL?",
                    "question_type": "multiple_choice",
                    "options": ["A) Lock", "B) Compiler"],
                    "correct_answer": "A) Lock",
                    "evaluation_rubric": "Global Interpreter Lock explanation",
                }
            ],
        }

    async def fake_handle_evaluate_assessment(payload):
        return {
            "user_id": payload["user_id"],
            "test_id": payload["test_id"],
            "overall_score": 85.0,
            "passed": True,
            "skill_evaluations": [
                {
                    "skill": "python",
                    "score": 85.0,
                    "proficiency_level": "advanced",
                    "verified": True,
                    "feedback": "Clear explanation of GIL",
                }
            ],
            "verified_skills_awarded": ["python"],
            "detailed_feedback": "Successfully verified Python competency",
        }

    monkeypatch.setattr(main.orchestrator, "handle_generate_assessment", fake_handle_generate_assessment)
    monkeypatch.setattr(main.orchestrator, "handle_evaluate_assessment", fake_handle_evaluate_assessment)

    client = TestClient(main.app)

    # 1. Generate Assessment
    gen_resp = client.post(
        "/orchestrate",
        json={
            "request_type": "generate_assessment",
            "payload": {"skills": ["python"], "num_questions": 1, "difficulty": "intermediate"},
        },
    )
    assert gen_resp.status_code == 200
    assert gen_resp.json()["result"]["test_id"] == "test-uuid-123"

    # 2. Evaluate Assessment
    eval_resp = client.post(
        "/orchestrate",
        json={
            "request_type": "evaluate_assessment",
            "payload": {
                "test_id": "test-uuid-123",
                "user_id": "user-456",
                "skills": ["python"],
                "submissions": [{"question_id": 1, "answer_text": "A) Lock"}],
            },
        },
    )
    assert eval_resp.status_code == 200
    assert eval_resp.json()["result"]["overall_score"] == 85.0
    assert "python" in eval_resp.json()["result"]["verified_skills_awarded"]


def test_orchestrate_match_candidates(monkeypatch):
    monkeypatch.setattr(main, "ensure_vector_index", _noop_startup)

    async def fake_handle_match_candidates(payload):
        return {
            "parsed_requirements": {
                "required_skills": ["python", "fastapi"],
                "nice_to_have_skills": ["docker"],
                "experience_level": "entry-level",
                "role_category": "backend engineering",
            },
            "ranked_matches": [
                {
                    "user_id": "cand-001",
                    "score": 92.0,
                    "reasoning": "Strong match with Python and FastAPI skills.",
                    "matched_skills": ["python", "fastapi"],
                    "missing_skills": ["docker"],
                }
            ],
            "notifications": [
                {
                    "recipient_type": "student",
                    "recipient_id": "cand-001",
                    "title": "New Match: Backend Developer Intern",
                    "message": "You are a 92.0% match for Backend Developer Intern.",
                    "action_url": "/jobs/details?role=Backend+Developer+Intern",
                }
            ],
            "grounded": True,
            "grounding_sources": ["job-101"],
        }

    monkeypatch.setattr(main.orchestrator, "handle_match_candidates", fake_handle_match_candidates)

    client = TestClient(main.app)
    response = client.post(
        "/orchestrate",
        json={
            "request_type": "match_candidates",
            "payload": {
                "role_title": "Backend Developer Intern",
                "job_description": "We are seeking a Backend Developer Intern with Python & FastAPI skills.",
                "candidate_pool": [{"id": "cand-001", "skills": ["python", "fastapi"]}],
            },
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "success"
    assert body["result"]["ranked_matches"][0]["score"] == 92.0
    assert len(body["result"]["notifications"]) == 1


def test_orchestrate_suggest_jobs(monkeypatch):
    monkeypatch.setattr(main, "ensure_vector_index", _noop_startup)

    async def fake_handle_suggest_jobs(payload):
        return {
            "suggested_jobs": [
                {
                    "job_id": "job-555",
                    "company_name": "TCS",
                    "title": "Software Engineer",
                    "score": 88.0,
                    "reasoning": "Matching Python and Data Science skills.",
                }
            ]
        }

    monkeypatch.setattr(main.orchestrator, "handle_suggest_jobs", fake_handle_suggest_jobs)

    client = TestClient(main.app)
    response = client.post(
        "/orchestrate",
        json={
            "request_type": "suggest_jobs",
            "payload": {
                "candidate_profile": {"skills": ["python", "data-science"]},
                "resume_text": "Experienced in Python and Data Science.",
                "top_n": 3,
            },
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "success"
    assert len(body["result"]["suggested_jobs"]) == 1
    assert body["result"]["suggested_jobs"][0]["score"] == 88.0


def test_orchestrate_scrape_companies(monkeypatch):
    monkeypatch.setattr(main, "ensure_vector_index", _noop_startup)

    async def fake_handle_scrape_companies(payload):
        return {
            "total_requested": 2,
            "successfully_scraped": 2,
            "failed": 0,
            "companies": [
                {
                    "company_name": "Capgemini",
                    "website_url": "https://www.capgemini.com",
                    "industry": "Consulting & Technology",
                    "status": "success",
                    "jobs_scraped": 4,
                    "error": None,
                }
            ],
        }

    monkeypatch.setattr(main.orchestrator, "handle_scrape_companies", fake_handle_scrape_companies)

    client = TestClient(main.app)
    response = client.post(
        "/orchestrate",
        json={
            "request_type": "scrape_companies",
            "payload": {"companies": ["Capgemini"], "max_postings_per_company": 5},
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "success"
    assert body["result"]["successfully_scraped"] == 2


def test_orchestrate_register_company(monkeypatch):
    monkeypatch.setattr(main, "ensure_vector_index", _noop_startup)

    async def fake_handle_register_company(payload):
        return {
            "company_id": "techcorp.com",
            "status": "created",
            "jobs_created": 2,
            "jobs_updated": 0,
        }

    monkeypatch.setattr(main.orchestrator, "handle_register_company", fake_handle_register_company)

    client = TestClient(main.app)
    response = client.post(
        "/orchestrate",
        json={
            "request_type": "register_company",
            "payload": {
                "company_name": "TechCorp",
                "website_url": "https://techcorp.com",
                "industry": "FinTech",
                "company_size": "50-200",
                "tech_stack": ["python", "react", "postgresql"],
                "locations": ["Bangalore"],
                "description": "TechCorp builds cloud native financial products.",
            },
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "success"
    assert body["result"]["company_id"] == "techcorp.com"
    assert body["result"]["jobs_created"] == 2


def test_orchestrate_full_student_pipeline(monkeypatch):
    monkeypatch.setattr(main, "ensure_vector_index", _noop_startup)

    async def fake_handle_full_pipeline(payload):
        return {
            "analysis": {"compatibility_score": 80.0},
            "roadmap": {"milestones": []},
            "learning_recommendations": {"resources": []},
            "suggested_jobs": [{"job_id": "job-1", "score": 85.0}],
        }

    monkeypatch.setattr(main.orchestrator, "handle_full_student_pipeline", fake_handle_full_pipeline)

    client = TestClient(main.app)
    response = client.post(
        "/orchestrate",
        json={
            "request_type": "full_student_pipeline",
            "payload": {
                "student_profile": {"skills": ["python"]},
                "resume_text": "Python developer",
                "career_objective": "Backend Engineer",
            },
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "success"
    assert "analysis" in body["result"]
    assert "roadmap" in body["result"]


@pytest.mark.asyncio
async def test_roadmap_caching_in_orchestrator(monkeypatch):
    import crews.orchestrator as orch_mod

    cache_store = {}

    async def fake_get_cached_roadmap(cache_key):
        return cache_store.get(cache_key)

    async def fake_save_roadmap(cache_key, roadmap_data, **kwargs):
        cache_store[cache_key] = roadmap_data

    call_count = 0

    def fake_run_roadmap_crew(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        return {
            "career_objective": "Backend Engineer",
            "target_role": "Backend Engineer",
            "total_estimated_hours": 80.0,
            "milestones": [],
            "target_resume_skills": ["python"],
            "target_role_readiness": "Ready",
        }

    monkeypatch.setattr(orch_mod, "get_cached_roadmap", fake_get_cached_roadmap)
    monkeypatch.setattr(orch_mod, "save_roadmap", fake_save_roadmap)
    monkeypatch.setattr(orch_mod, "run_roadmap_crew", fake_run_roadmap_crew)

    orchestrator = orch_mod.MultiAgentOrchestrator()
    payload = {
        "current_skills": ["python"],
        "skill_gaps": ["fastapi"],
        "career_objective": "Backend Engineer",
        "target_role": "Backend Engineer",
    }

    # First call: cache miss, runs crew
    res1 = await orchestrator.handle_generate_roadmap(payload)
    assert call_count == 1
    assert res1["career_objective"] == "Backend Engineer"

    # Second call: cache hit, crew NOT called
    res2 = await orchestrator.handle_generate_roadmap(payload)
    assert call_count == 1
    assert res2 == res1


@pytest.mark.asyncio
async def test_learning_recommendation_caching_in_orchestrator(monkeypatch):
    import crews.orchestrator as orch_mod

    cache_store = {}

    async def fake_get_cached_learning(cache_key):
        return cache_store.get(cache_key)

    async def fake_save_learning(cache_key, recommendations_data=None, **kwargs):
        cache_store[cache_key] = recommendations_data

    call_count = 0

    def fake_run_learning_crew(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        return {
            "resources": [],
            "recommended_certifications": ["AWS Solution Architect"],
            "hands_on_projects": [],
            "fdp_training_programs": [],
            "progress_tracking_metrics": [],
        }

    monkeypatch.setattr(orch_mod, "get_cached_learning_recommendation", fake_get_cached_learning)
    monkeypatch.setattr(orch_mod, "save_learning_recommendation", fake_save_learning)
    monkeypatch.setattr(orch_mod, "run_learning_crew", fake_run_learning_crew)

    orchestrator = orch_mod.MultiAgentOrchestrator()
    payload = {
        "skills_to_learn": ["aws"],
        "career_objective": "Cloud Engineer",
    }

    # First call: cache miss, runs crew
    res1 = await orchestrator.handle_recommend_learning(payload)
    assert call_count == 1
    assert "AWS Solution Architect" in res1["recommended_certifications"]

    # Second call: cache hit, crew NOT called
    res2 = await orchestrator.handle_recommend_learning(payload)
    assert call_count == 1
    assert res2 == res1


# ---------------------------------------------------------------------------
# Direct Dedicated Agent Endpoints Tests
# ---------------------------------------------------------------------------


def test_direct_analyze_profile_endpoint(monkeypatch):
    monkeypatch.setattr(main, "ensure_vector_index", _noop_startup)

    async def fake_handle_analyze_profile(payload):
        return {
            "student_skills": ["python"],
            "verified_skills": [],
            "technical_skill_gaps": ["docker"],
            "soft_skill_gaps": [],
            "compatibility_score": 80.0,
            "company_insights": [],
            "registered_companies_analyzed": 1,
            "scraped_companies_analyzed": 1,
            "analysis_summary": "Good profile.",
            "grounded": False,
            "grounding_sources": [],
        }

    monkeypatch.setattr(main.orchestrator, "handle_analyze_profile", fake_handle_analyze_profile)

    client = TestClient(main.app)
    response = client.post(
        "/analyze-profile",
        json={
            "student_profile": {"skills": ["python"]},
            "resume_text": "Python developer",
            "career_objective": "Backend Engineer",
        },
    )
    assert response.status_code == 200
    assert response.json()["student_skills"] == ["python"]


def test_direct_generate_roadmap_endpoint(monkeypatch):
    monkeypatch.setattr(main, "ensure_vector_index", _noop_startup)

    async def fake_handle_generate_roadmap(payload):
        return {
            "career_objective": "Backend Engineer",
            "target_role": "Backend Engineer",
            "total_estimated_hours": 80.0,
            "milestones": [
                {
                    "milestone_index": 1,
                    "title": "Milestone 1",
                    "duration_weeks": 4,
                    "skills_covered": ["fastapi"],
                    "learning_sequence": ["FastAPI basics"],
                    "milestone_deliverable": "API",
                    "rationale": "Essential",
                }
            ],
            "target_resume_skills": ["python", "fastapi"],
            "target_role_readiness": "Ready",
        }

    monkeypatch.setattr(main.orchestrator, "handle_generate_roadmap", fake_handle_generate_roadmap)

    client = TestClient(main.app)
    response = client.post(
        "/generate-roadmap",
        json={
            "current_skills": ["python"],
            "skill_gaps": ["fastapi"],
            "career_objective": "Backend Engineer",
        },
    )
    assert response.status_code == 200
    assert len(response.json()["milestones"]) == 1


def test_direct_recommend_learning_endpoint(monkeypatch):
    monkeypatch.setattr(main, "ensure_vector_index", _noop_startup)

    async def fake_handle_recommend_learning(payload):
        return {
            "resources": [],
            "recommended_certifications": ["AWS"],
            "hands_on_projects": [],
            "fdp_training_programs": [],
            "progress_tracking_metrics": [],
        }

    monkeypatch.setattr(main.orchestrator, "handle_recommend_learning", fake_handle_recommend_learning)

    client = TestClient(main.app)
    response = client.post(
        "/recommend-learning",
        json={
            "skills_to_learn": ["aws"],
            "career_objective": "Cloud Architect",
        },
    )
    assert response.status_code == 200
    assert "AWS" in response.json()["recommended_certifications"]


def test_direct_assessment_endpoints(monkeypatch):
    monkeypatch.setattr(main, "ensure_vector_index", _noop_startup)

    async def fake_handle_generate_assessment(payload):
        return {
            "test_id": "test-direct-123",
            "skills": ["python"],
            "difficulty": "intermediate",
            "questions": [],
        }

    async def fake_handle_evaluate_assessment(payload):
        return {
            "user_id": payload["user_id"],
            "test_id": payload["test_id"],
            "overall_score": 90.0,
            "passed": True,
            "skill_evaluations": [],
            "verified_skills_awarded": ["python"],
            "detailed_feedback": "Passed",
        }

    monkeypatch.setattr(main.orchestrator, "handle_generate_assessment", fake_handle_generate_assessment)
    monkeypatch.setattr(main.orchestrator, "handle_evaluate_assessment", fake_handle_evaluate_assessment)

    client = TestClient(main.app)
    gen = client.post("/assessment/generate", json={"skills": ["python"]})
    assert gen.status_code == 200
    assert gen.json()["test_id"] == "test-direct-123"

    ev = client.post(
        "/assessment/evaluate",
        json={
            "test_id": "test-direct-123",
            "user_id": "u1",
            "skills": ["python"],
            "submissions": [],
        },
    )
    assert ev.status_code == 200
    assert ev.json()["overall_score"] == 90.0


def test_direct_match_and_suggest_endpoints(monkeypatch):
    monkeypatch.setattr(main, "ensure_vector_index", _noop_startup)

    async def fake_handle_match(payload):
        return {
            "parsed_requirements": {
                "required_skills": ["python"],
                "nice_to_have_skills": [],
                "experience_level": "junior",
                "role_category": "engineering",
            },
            "ranked_matches": [],
            "notifications": [],
            "grounded": False,
            "grounding_sources": [],
        }

    async def fake_handle_suggest(payload):
        return {
            "suggested_jobs": [
                {
                    "job_id": "j1",
                    "company_name": "Acme",
                    "title": "Engineer",
                    "score": 90.0,
                    "reasoning": "Fit",
                }
            ]
        }

    monkeypatch.setattr(main.orchestrator, "handle_match_candidates", fake_handle_match)
    monkeypatch.setattr(main.orchestrator, "handle_suggest_jobs", fake_handle_suggest)

    client = TestClient(main.app)
    m = client.post(
        "/match-candidates",
        json={
            "role_title": "Engineer",
            "job_description": "Python dev",
            "candidate_pool": [{"id": "c1"}],
        },
    )
    assert m.status_code == 200

    s = client.post(
        "/suggest-jobs",
        json={"candidate_profile": {}, "resume_text": "Python dev"},
    )
    assert s.status_code == 200
    assert len(s.json()["suggested_jobs"]) == 1


def test_direct_scrape_and_register_endpoints(monkeypatch):
    monkeypatch.setattr(main, "ensure_vector_index", _noop_startup)

    async def fake_handle_scrape(payload):
        return {
            "total_requested": 1,
            "successfully_scraped": 1,
            "failed": 0,
            "companies": [
                {
                    "company_name": "TCS",
                    "website_url": "https://tcs.com",
                    "industry": "IT",
                    "status": "success",
                    "jobs_scraped": 2,
                    "error": None,
                }
            ],
        }

    async def fake_handle_register(payload):
        return {
            "company_id": "google.com",
            "status": "created",
            "jobs_created": 5,
            "jobs_updated": 0,
        }

    monkeypatch.setattr(main.orchestrator, "handle_scrape_companies", fake_handle_scrape)
    monkeypatch.setattr(main.orchestrator, "handle_register_company", fake_handle_register)

    client = TestClient(main.app)
    sc = client.post("/scrape-companies", json={"companies": ["TCS"]})
    assert sc.status_code == 200
    assert sc.json()["successfully_scraped"] == 1

    reg = client.post(
        "/register-company",
        json={
            "company_name": "Google",
            "website_url": "https://google.com",
            "industry": "Tech",
            "company_size": "1000+",
            "tech_stack": ["python"],
            "locations": ["Bangalore"],
            "description": "Tech giant",
        },
    )
    assert reg.status_code == 200
    assert reg.json()["company_id"] == "google.com"

