import json

from crewai import Crew, Process, Task

from agents.candidate_matcher_agent import build_candidate_matcher_agent
from agents.requirements_analyzer_agent import build_requirements_analyzer_agent
from crews._json_utils import extract_json_object

REQUIREMENTS_TASK_DESCRIPTION = """\
Role title: "{role_title}"

Job description:
---
{job_description}
---

Parse this job description into structured hiring requirements. Extract ONLY \
skills, seniority, and category that are stated or strongly implied in the \
text above -- never invent a requirement that isn't grounded in it.

Respond with ONLY a JSON object, no prose, in exactly this shape:
{{
  "required_skills": ["..."],
  "nice_to_have_skills": ["..."],
  "experience_level": "e.g. entry-level / mid-level / senior",
  "role_category": "e.g. backend engineering"
}}
"""

MATCHING_TASK_DESCRIPTION = """\
Using the parsed job requirements from the previous task as context, score \
each of the following shortlisted candidates for fit against the role. These \
candidates were already narrowed down from the full pool by a vector \
similarity search on their profile text -- your job is the final, nuanced \
judgment on fit, not re-searching the pool.

Shortlisted candidates (JSON list, each with user_id and profile text/skills):
{candidates_json}

For each candidate, produce a score from 0-100, one to two sentences of \
reasoning grounded ONLY in that candidate's listed skills/resume text versus \
the job requirements, matched_skills (skills the candidate has that the job \
wants), and missing_skills (required or nice-to-have skills the candidate \
appears to lack). Never invent a skill a candidate doesn't have or a \
requirement the job doesn't have. Order the list by score, highest first.

Respond with ONLY a JSON object, no prose, in exactly this shape:
{{
  "ranked_matches": [
    {{
      "user_id": "...",
      "score": 0,
      "reasoning": "...",
      "matched_skills": ["..."],
      "missing_skills": ["..."]
    }}
  ]
}}
"""


def run_matching_crew(job_description: str, role_title: str, shortlisted_candidates: list[dict]) -> dict:
    requirements_agent = build_requirements_analyzer_agent()
    matcher_agent = build_candidate_matcher_agent()

    requirements_task = Task(
        description=REQUIREMENTS_TASK_DESCRIPTION.format(
            role_title=role_title,
            job_description=job_description,
        ),
        expected_output="A single JSON object with required_skills, nice_to_have_skills, experience_level, role_category.",
        agent=requirements_agent,
    )

    matching_task = Task(
        description=MATCHING_TASK_DESCRIPTION.format(
            candidates_json=json.dumps(shortlisted_candidates, default=str),
        ),
        expected_output="A single JSON object with key ranked_matches.",
        agent=matcher_agent,
        context=[requirements_task],
    )

    crew = Crew(
        agents=[requirements_agent, matcher_agent],
        tasks=[requirements_task, matching_task],
        process=Process.sequential,
        verbose=False,
    )
    crew.kickoff()

    parsed_requirements = extract_json_object(str(requirements_task.output))
    parsed_matches = extract_json_object(str(matching_task.output))

    return {
        "parsed_requirements": parsed_requirements,
        "ranked_matches": parsed_matches.get("ranked_matches", []),
    }
