from crewai import Crew, Process, Task
from pydantic import BaseModel

from agents.path_builder_agent import build_path_builder_agent
from crews._json_utils import extract_json_object
from models.schemas import LearningPathStep


class CrewLearningPathOutput(BaseModel):
    learning_path: list[LearningPathStep]
    target_resume_skills: list[str]


TASK_DESCRIPTION = """\
A student's career objective is: "{career_objective}"

Their current skills are: {current_skills}

A deterministic skill-gap analysis (not your job to redo) found these missing \
skills, in no particular order: {skill_gaps}

Sequence these gaps into an ordered learning path. For each skill in the gap \
list (use exactly these skills, do not add or remove any), decide:
- what order it should be learned in relative to the others
- resource_type: one of "course", "project", "documentation", "practice_problems"
- estimated_hours: a realistic number of hours to reach working competency
- rationale: one sentence on why this skill matters for the stated objective \
and/or why it belongs at this point in the sequence

Also produce target_resume_skills: the list of skills (current + gap skills) \
worth highlighting on the student's resume once this path is complete.

Respond with ONLY a JSON object, no prose, in exactly this shape:
{{
  "learning_path": [
    {{"skill": "...", "resource_type": "...", "estimated_hours": 0, "rationale": "..."}}
  ],
  "target_resume_skills": ["...", "..."]
}}
"""


def run_learning_path_crew(current_skills: list[str], skill_gaps: list[str], career_objective: str) -> dict:
    agent = build_path_builder_agent()

    task = Task(
        description=TASK_DESCRIPTION.format(
            career_objective=career_objective,
            current_skills=", ".join(current_skills) or "(none listed)",
            skill_gaps=", ".join(skill_gaps) or "(none -- candidate already covers the target skill set)",
        ),
        expected_output="A single JSON object with keys learning_path and target_resume_skills.",
        agent=agent,
        output_pydantic=CrewLearningPathOutput,
    )

    crew = Crew(agents=[agent], tasks=[task], process=Process.sequential, verbose=False)
    result = crew.kickoff()

    if result.pydantic is not None:
        parsed = result.pydantic.model_dump()
    else:
        parsed = extract_json_object(str(result))

    return {
        "learning_path": parsed.get("learning_path", []),
        "target_resume_skills": parsed.get("target_resume_skills", current_skills),
    }
