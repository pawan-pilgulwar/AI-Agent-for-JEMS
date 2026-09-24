from fastapi.testclient import TestClient

import main


async def _noop_startup() -> None:
    return None


class FakeRagRetrievalTool:
    """Stands in for tools.rag_retrieval_tool.RagRetrievalTool -- no real
    MongoDB Atlas / $vectorSearch calls in tests."""

    async def retrieve_jobs(self, query_text, top_k=None, only_open=True):
        return [
            {
                "_id": "job-1",
                "company_name": "Acme Inc",
                "title": "Backend Engineer",
                "description": "Backend Engineer -- Python, Docker required.",
                "required_skills": ["python", "docker"],
                "status": "open",
            }
        ]


def _fake_run_job_suggestion_crew(candidate_profile, resume_text, retrieved_jobs):
    return {
        "suggested_jobs": [
            {
                "job_id": job["_id"],
                "company_name": job["company_name"],
                "title": job["title"],
                "score": 85,
                "reasoning": "Strong python/docker overlap with this posting's requirements.",
            }
            for job in retrieved_jobs
        ]
    }


def test_suggest_jobs_for_candidate_happy_path(monkeypatch):
    """Happy-path test with RAG retrieval and the CrewAI/Ollama call both
    mocked out -- no real MongoDB Atlas or Ollama calls."""
    monkeypatch.setattr(main, "ensure_vector_index", _noop_startup)
    monkeypatch.setattr(main, "RagRetrievalTool", FakeRagRetrievalTool)
    monkeypatch.setattr(main, "run_job_suggestion_crew", _fake_run_job_suggestion_crew)

    client = TestClient(main.app)
    response = client.post(
        "/suggest-jobs-for-candidate",
        json={
            "candidate_profile": {"skills": ["python", "docker"]},
            "resume_text": "3 years of Python and Docker experience.",
            "top_n": 5,
        },
    )

    assert response.status_code == 200
    body = response.json()

    assert len(body["suggested_jobs"]) == 1
    assert body["suggested_jobs"][0]["job_id"] == "job-1"
    assert body["suggested_jobs"][0]["company_name"] == "Acme Inc"
    assert body["suggested_jobs"][0]["score"] == 85


def test_suggest_jobs_for_candidate_no_matches_returns_empty(monkeypatch):
    """No real jobs retrieved -- must return an empty list rather than call
    the LLM to invent suggestions."""

    class EmptyRagRetrievalTool:
        async def retrieve_jobs(self, query_text, top_k=None, only_open=True):
            return []

    monkeypatch.setattr(main, "ensure_vector_index", _noop_startup)
    monkeypatch.setattr(main, "RagRetrievalTool", EmptyRagRetrievalTool)

    def _fail_if_called(*args, **kwargs):
        raise AssertionError("run_job_suggestion_crew should not be called with no retrieved jobs")

    monkeypatch.setattr(main, "run_job_suggestion_crew", _fail_if_called)

    client = TestClient(main.app)
    response = client.post(
        "/suggest-jobs-for-candidate",
        json={"candidate_profile": {}, "resume_text": "Some resume text.", "top_n": 5},
    )

    assert response.status_code == 200
    assert response.json() == {"suggested_jobs": []}


def test_suggest_jobs_for_candidate_rejects_invalid_input():
    client = TestClient(main.app)
    response = client.post(
        "/suggest-jobs-for-candidate",
        json={"candidate_profile": {}, "resume_text": ""},
    )
    assert response.status_code == 422
