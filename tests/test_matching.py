from fastapi.testclient import TestClient

import main


async def _noop_startup() -> None:
    return None


class FakeVectorSearchTool:
    """Stands in for tools.vector_search_tool.VectorSearchTool -- no real
    MongoDB Atlas / $vectorSearch calls in tests."""

    async def upsert_candidate_embeddings(self, candidates):
        return [str(c.get("id")) for c in candidates]

    async def top_n_candidates(self, query_text, candidate_user_ids, top_n=None):
        return [{"user_id": uid, "skills": ["python"]} for uid in candidate_user_ids]


class FakeRagRetrievalTool:
    """Stands in for tools.rag_retrieval_tool.RagRetrievalTool -- no real
    MongoDB Atlas / $vectorSearch calls in tests."""

    async def retrieve_jobs(self, query_text, top_k=None, only_open=True):
        return []

    async def find_company_by_name(self, company_name):
        return None


def test_match_candidates_happy_path(monkeypatch):
    """Happy-path test with vector search, RAG retrieval, and the CrewAI/
    Ollama call all mocked out -- no real Atlas or Ollama calls."""
    monkeypatch.setattr(main, "ensure_vector_index", _noop_startup)
    monkeypatch.setattr(main, "VectorSearchTool", FakeVectorSearchTool)
    monkeypatch.setattr(main, "RagRetrievalTool", FakeRagRetrievalTool)

    def fake_run_matching_crew(
        job_description, role_title, shortlisted_candidates, company_context=None, retrieved_context=None
    ):
        return {
            "parsed_requirements": {
                "required_skills": ["python"],
                "nice_to_have_skills": ["docker"],
                "experience_level": "mid-level",
                "role_category": "backend engineering",
            },
            "ranked_matches": [
                {
                    "user_id": candidate["user_id"],
                    "score": 80,
                    "reasoning": "Strong python match against required skills.",
                    "matched_skills": ["python"],
                    "missing_skills": ["docker"],
                }
                for candidate in shortlisted_candidates
            ],
            "grounded": False,
            "grounding_sources": [],
        }

    monkeypatch.setattr(main, "run_matching_crew", fake_run_matching_crew)

    client = TestClient(main.app)
    response = client.post(
        "/match-candidates",
        json={
            "job_description": "Looking for a backend engineer skilled in Python and Docker.",
            "role_title": "Backend Engineer",
            "candidate_pool": [{"id": "cand1", "skills": ["python"]}],
        },
    )

    assert response.status_code == 200
    body = response.json()

    assert body["parsed_requirements"]["required_skills"] == ["python"]
    assert body["ranked_matches"][0]["user_id"] == "cand1"
    assert body["ranked_matches"][0]["score"] == 80
    assert body["grounded"] is False
    assert body["grounding_sources"] == []


def test_match_candidates_rejects_empty_pool():
    client = TestClient(main.app)
    response = client.post(
        "/match-candidates",
        json={"job_description": "JD text", "role_title": "Engineer", "candidate_pool": []},
    )
    assert response.status_code == 422
