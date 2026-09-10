from fastapi.testclient import TestClient

import main


async def _noop_startup() -> None:
    return None


def test_learning_path_happy_path(monkeypatch):
    """Happy-path test with the CrewAI/Ollama call mocked out -- no real LLM call."""
    monkeypatch.setattr(main, "ensure_vector_index", _noop_startup)

    def fake_run_learning_path_crew(current_skills, skill_gaps, career_objective):
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


def test_learning_path_rejects_invalid_input():
    client = TestClient(main.app)
    response = client.post("/learning-path", json={"user_profile": {}, "resume_text": ""})
    assert response.status_code == 422
