import json
from typing import Any

from crewai import Crew, Process, Task
from pydantic import BaseModel

from agents.roadmap_agent import build_roadmap_agent
from crews._json_utils import extract_json_object
from models.schemas import RoadmapMilestone


class RoadmapCrewOutput(BaseModel):
    career_objective: str
    target_role: str
    total_estimated_hours: float
    milestones: list[RoadmapMilestone]
    target_resume_skills: list[str]
    target_role_readiness: str


ROADMAP_TASK_DESCRIPTION = """\
Build a personalized, chronological career roadmap for this student.

Target Career Objective: "{career_objective}"
Target Role Title: "{target_role}"
Allocated Timeline: {timeline_weeks} weeks
Current Skills: {current_skills}
Identified Skill Gaps to Bridge: {skill_gaps}

Instructions:
1. Sequence the missing skills into logical, progressive milestones spanning {timeline_weeks} weeks:
   - Order prerequisites before dependent frameworks (e.g., Python/SQL before Django/FastAPI).
   - Group related skills into distinct phases (e.g. Milestone 1: Fundamentals, Milestone 2: Architecture, Milestone 3: Production Readiness).
2. For each milestone:
   - duration_weeks: realistic duration in weeks
   - skills_covered: list of skills targeted in this milestone
   - learning_sequence: ordered list of subtopics/skills to tackle
   - milestone_deliverable: a concrete project or proof-of-competence artifact (e.g. "Containerized CRUD microservice with unit tests")
   - rationale: why this milestone is necessary and how it leads to the next step
3. Calculate total_estimated_hours across all milestones.
4. Produce target_resume_skills: combined skills to showcase on the student's portfolio/resume upon completion.
5. Provide target_role_readiness: an encouraging, realistic evaluation of how ready the student will be for interviews.

Respond with ONLY a JSON object, no prose, matching this structure:
{{
  "career_objective": "{career_objective}",
  "target_role": "{target_role}",
  "total_estimated_hours": 120.0,
  "milestones": [
    {{
      "milestone_index": 1,
      "title": "Phase 1: Foundations & Core Technologies",
      "duration_weeks": 3,
      "skills_covered": ["..."],
      "learning_sequence": ["..."],
      "milestone_deliverable": "...",
      "rationale": "..."
    }}
  ],
  "target_resume_skills": ["..."],
  "target_role_readiness": "..."
}}
"""


def run_roadmap_crew(
    current_skills: list[str],
    skill_gaps: list[str],
    career_objective: str,
    target_role: str | None = None,
    timeline_weeks: int = 12,
) -> dict[str, Any]:
    agent = build_roadmap_agent()
    role_title = target_role or career_objective

    task = Task(
        description=ROADMAP_TASK_DESCRIPTION.format(
            career_objective=career_objective,
            target_role=role_title,
            timeline_weeks=timeline_weeks,
            current_skills=", ".join(current_skills) or "(none listed)",
            skill_gaps=", ".join(skill_gaps) or "(candidate is ready)",
        ),
        expected_output="A single JSON object matching RoadmapCrewOutput.",
        agent=agent,
        output_pydantic=RoadmapCrewOutput,
    )

    crew = Crew(agents=[agent], tasks=[task], process=Process.sequential, verbose=False)
    result = crew.kickoff()

    if result.pydantic is not None:
        parsed = result.pydantic.model_dump()
    else:
        parsed = extract_json_object(str(result))

    return {
        "career_objective": parsed.get("career_objective", career_objective),
        "target_role": parsed.get("target_role", role_title),
        "total_estimated_hours": float(parsed.get("total_estimated_hours", 80.0)),
        "milestones": parsed.get("milestones", []),
        "target_resume_skills": parsed.get("target_resume_skills", current_skills + skill_gaps),
        "target_role_readiness": parsed.get("target_role_readiness", "Job ready upon completing all milestones"),
    }


def run_learning_path_crew(
    current_skills: list[str],
    skill_gaps: list[str],
    career_objective: str,
    retrieved_jobs: list[dict] | None = None,
) -> dict[str, Any]:
    """Backward-compatible learning path generator delegating to the Roadmap Agent."""
    res = run_roadmap_crew(
        current_skills=current_skills,
        skill_gaps=skill_gaps,
        career_objective=career_objective,
    )
    # Map milestones to steps format for legacy schema
    steps = []
    for m in res.get("milestones", []):
        for s in m.get("skills_covered", []):
            steps.append(
                {
                    "skill": s,
                    "resource_type": "project" if "project" in m.get("milestone_deliverable", "").lower() else "course",
                    "estimated_hours": round(res.get("total_estimated_hours", 80.0) / max(len(skill_gaps), 1), 1),
                    "rationale": m.get("rationale", f"Core requirement for {career_objective}"),
                }
            )

    return {
        "learning_path": steps,
        "target_resume_skills": res.get("target_resume_skills", current_skills + skill_gaps),
        "grounded": bool(retrieved_jobs),
        "grounding_sources": [str(j.get("_id")) for j in (retrieved_jobs or []) if j.get("_id")],
    }

