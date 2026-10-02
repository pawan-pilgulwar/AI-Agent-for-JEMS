import json
from typing import Any

from crewai import Crew, Process, Task
from pydantic import BaseModel

from agents.learning_agent import build_learning_agent
from crews._json_utils import extract_json_object
from models.schemas import FDPProgram, LearningResource


class LearningCrewOutput(BaseModel):
    resources: list[LearningResource]
    recommended_certifications: list[str] = []
    hands_on_projects: list[dict[str, Any]] = []
    fdp_training_programs: list[FDPProgram] = []
    progress_tracking_metrics: list[str] = []


LEARNING_TASK_DESCRIPTION = """\
Curate high-impact learning resources, hands-on portfolio projects, industry certifications, \
and Faculty Development Programs (FDPs) for this target role.

Target Career Goal: "{career_objective}"
Target Role: "{target_role}"
Skills to Upskill: {skills_to_learn}

Instructions:
1. Provide concrete, well-known learning resources for each skill (e.g. NPTEL, Coursera, edX, official docs, freeCodeCamp).
2. Recommend recognized industry certifications (e.g., AWS, GCP, CKA, Oracle, Meta) relevant to the role.
3. Design 2-3 real-world, resume-worthy hands-on projects with detailed specifications (title, tech stack, key features, difficulty).
4. Highlight Faculty Development Programs (FDPs) and institutional workshops where faculty and students can collaborate with industry mentors (a cornerstone of the JEMS platform).
5. Outline progress tracking metrics (e.g. GitHub commit frequency, unit test coverage, milestone assessment completion).

Respond with ONLY a JSON object, no prose, matching this structure:
{{
  "resources": [
    {{
      "skill": "Docker",
      "resource_name": "Docker and Kubernetes: The Complete Guide",
      "resource_type": "course",
      "provider": "Coursera / Udemy",
      "url_or_reference": "https://www.docker.com/resources/",
      "estimated_hours": 20.0,
      "difficulty": "intermediate"
    }}
  ],
  "recommended_certifications": ["AWS Certified Solutions Architect Associate", "CKA: Certified Kubernetes Administrator"],
  "hands_on_projects": [
    {{
      "project_title": "Scalable Microservices E-Commerce API",
      "skills_utilized": ["Docker", "FastAPI", "MongoDB"],
      "description": "Production-grade RESTful API with containerization, caching, and CI/CD pipelines.",
      "portfolio_impact": "Demonstrates backend systems architecture and container orchestration."
    }}
  ],
  "fdp_training_programs": [
    {{
      "title": "Industry-Led Cloud Native & Microservices FDP",
      "focus_area": "Docker, Kubernetes & Microservices Architecture",
      "target_audience": "Faculty & Pre-final Year Students",
      "description": "2-week intensive Faculty Development Program conducted in partnership with leading cloud tech companies."
    }}
  ],
  "progress_tracking_metrics": [
    "Completion of milestone deliverables",
    "Passing grade on JEMS Assessment Agent verification tests",
    "Deployment of at least one public repository project"
  ]
}}
"""


def run_learning_crew(
    skills_to_learn: list[str],
    career_objective: str,
    target_role: str | None = None,
) -> dict[str, Any]:
    agent = build_learning_agent()
    role_title = target_role or career_objective

    task = Task(
        description=LEARNING_TASK_DESCRIPTION.format(
            career_objective=career_objective,
            target_role=role_title,
            skills_to_learn=", ".join(skills_to_learn),
        ),
        expected_output="A single JSON object matching LearningCrewOutput.",
        agent=agent,
        output_pydantic=LearningCrewOutput,
    )

    crew = Crew(agents=[agent], tasks=[task], process=Process.sequential, verbose=False)
    result = crew.kickoff()

    if result.pydantic is not None:
        parsed = result.pydantic.model_dump()
    else:
        parsed = extract_json_object(str(result))

    return {
        "resources": parsed.get("resources", []),
        "recommended_certifications": parsed.get("recommended_certifications", []),
        "hands_on_projects": parsed.get("hands_on_projects", []),
        "fdp_training_programs": parsed.get("fdp_training_programs", []),
        "progress_tracking_metrics": parsed.get("progress_tracking_metrics", []),
    }
