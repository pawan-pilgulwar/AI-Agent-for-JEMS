from crewai import Crew, Process, Task
from pydantic import BaseModel

from agents.path_builder_agent import build_path_builder_agent
from crews._json_utils import extract_json_object
from models.schemas import LearningPathStep


class CrewLearningPathOutput(BaseModel):
    learning_path: list[LearningPathStep]
    target_resume_skills: list[str]
    grounded: bool = False
    grounding_sources: list[str] = []


TASK_DESCRIPTION = """\
A student's career objective is: "{career_objective}"

Their current skills are: {current_skills}

A deterministic skill-gap analysis (not your job to redo) found these missing \
skills, in no particular order: {skill_gaps}

{grounding_block}

Sequence these gaps into an ordered learning path. For each skill in the gap \
list (use exactly these skills, do not add or remove any), decide:
- what order it should be learned in relative to the others
- resource_type: one of "course", "project", "documentation", "practice_problems"
- estimated_hours: a realistic number of hours to reach working competency
- rationale: one sentence on why this skill matters for the stated objective \
and/or why it belongs at this point in the sequence. If real job postings \
were provided above, ground the rationale in what those postings actually \
require wherever relevant -- do not fall back to general knowledge about the \
role when real postings are available and contradict it.

Also produce target_resume_skills: the list of skills (current + gap skills) \
worth highlighting on the student's resume once this path is complete.

Set "grounded" to true only if you were given real job postings above and \
used them; set it to false if no real postings were retrieved -- in that \
case, say so plainly in the rationale rather than inventing market \
requirements. Set "grounding_sources" to the list of job posting IDs you \
actually used (empty list if grounded is false).

Respond with ONLY a JSON object, no prose, in exactly this shape:
{{
  "learning_path": [
    {{"skill": "...", "resource_type": "...", "estimated_hours": 0, "rationale": "..."}}
  ],
  "target_resume_skills": ["...", "..."],
  "grounded": true,
  "grounding_sources": ["..."]
}}
"""


def _grounding_block(retrieved_jobs: list[dict]) -> str:
    if not retrieved_jobs:
        return (
            "No real job postings matching this career objective were found in the "
            'database. You do not have grounding data -- set "grounded" to false.'
        )
    lines = ["Real job postings retrieved by vector search, matching this career objective:"]
    for job in retrieved_jobs:
        lines.append(
            f"- id={job.get('_id')} | {job.get('title', '')} at {job.get('company_name', '')}: "
            f"required={job.get('required_skills', [])}, nice_to_have={job.get('nice_to_have_skills', [])}"
        )
    return "\n".join(lines)


def run_learning_path_crew(
    current_skills: list[str],
    skill_gaps: list[str],
    career_objective: str,
    retrieved_jobs: list[dict] | None = None,
) -> dict:
    agent = build_path_builder_agent()
    retrieved_jobs = retrieved_jobs or []

    task = Task(
        description=TASK_DESCRIPTION.format(
            career_objective=career_objective,
            current_skills=", ".join(current_skills) or "(none listed)",
            skill_gaps=", ".join(skill_gaps) or "(none -- candidate already covers the target skill set)",
            grounding_block=_grounding_block(retrieved_jobs),
        ),
        expected_output="A single JSON object with keys learning_path, target_resume_skills, grounded, grounding_sources.",
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
        "grounded": bool(parsed.get("grounded", False)) and bool(retrieved_jobs),
        "grounding_sources": parsed.get("grounding_sources", []) if retrieved_jobs else [],
    }
