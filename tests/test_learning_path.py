from fastapi.testclient import TestClient

import main


async def _noop_startup() -> None:
    return None


class FakeRagRetrievalTool:
    """Stands in for tools.rag_retrieval_tool.RagRetrievalTool -- no real
    MongoDB Atlas / $vectorSearch calls in tests."""

    async def retrieve_jobs(self, query_text, top_k=None, only_open=True):
        return []


def test_learning_path_happy_path(monkeypatch):
    """Happy-path test with the CrewAI/Ollama call and RAG retrieval both
    mocked out -- no real LLM or MongoDB Atlas call."""
    monkeypatch.setattr(main, "ensure_vector_index", _noop_startup)
    monkeypatch.setattr(main, "RagRetrievalTool", FakeRagRetrievalTool)

    def fake_run_learning_path_crew(current_skills, skill_gaps, career_objective, retrieved_jobs=None):
        return {
            "learning_path": [
                {
                    "skill": skill,
                    "resource_type": "course",
                    "estimated_hours": 5,
                    "rationale": f"Needed for: {career_objective}",
                }
                for skill in skill_gaps
            ],
            "target_resume_skills": current_skills + skill_gaps,
            "grounded": False,
            "grounding_sources": [],
        }

    monkeypatch.setattr(main, "run_learning_path_crew", fake_run_learning_path_crew)

    client = TestClient(main.app)
    response = client.post(
        "/learning-path",
        json={
            "user_profile": {"skills": ["python", "git"]},
            "resume_text": "Experienced with python and git, built a rest api design once.",
            "career_objective": "Backend engineer at a fintech",
        },
    )

    assert response.status_code == 200
    body = response.json()

    assert "python" in body["current_skills"]
    assert "git" in body["current_skills"]
    assert isinstance(body["skill_gaps"], list)
    assert len(body["learning_path"]) == len(body["skill_gaps"])
    for step in body["learning_path"]:
        assert step["skill"] in body["skill_gaps"]
        assert step["resource_type"] == "course"
    assert body["grounded"] is False
    assert body["grounding_sources"] == []


def test_learning_path_rejects_invalid_input():
    client = TestClient(main.app)
    response = client.post("/learning-path", json={"user_profile": {}, "resume_text": ""})
    assert response.status_code == 422
