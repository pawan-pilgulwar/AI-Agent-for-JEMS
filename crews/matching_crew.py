import json

from crewai import Crew, Process, Task

from agents.matching_agent import build_matching_agent
from crews._json_utils import extract_json_object

REQUIREMENTS_TASK_DESCRIPTION = """\
Role title: "{role_title}"

Job description:
---
{job_description}
---

{company_context_block}

Parse this job description into structured hiring requirements. Extract ONLY \
skills, seniority, and category that are stated or strongly implied in the \
text above -- never invent a requirement that isn't grounded in it. If \
stored company data above fills in a detail the job description omits (e.g. \
a tech stack item consistently used across this company's other postings), \
you may include it. If the job description conflicts with the stored \
company data, prefer what the job description says -- it is the specific \
role being hired for.

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
similarity search against the job description -- your job is to reason about \
depth of fit, not re-search.

Shortlisted candidates:
{candidates_json}

{grounding_block}

For each candidate, produce a score from 0-100, one to two sentences of \
reasoning grounded ONLY in that candidate's listed skills/resume text versus \
the job requirements, matched_skills (skills the candidate has that the job \
wants), and missing_skills (required or nice-to-have skills the candidate \
appears to lack). If real company/role context was provided above, weave it \
into the reasoning (e.g. how a candidate's stack lines up with this specific \
company's actual tech stack) instead of generic assumptions about the role. \
Never invent a skill a candidate doesn't have or a requirement the job \
doesn't have. Order the list by score, highest first.

Set "grounded" to true only if real company/role context was provided above \
and you used it; otherwise false. Set "grounding_sources" to the list of \
company/job IDs you actually used (empty list if grounded is false).

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
  ],
  "grounded": true,
  "grounding_sources": ["..."]
}}
"""

JOB_SUGGESTION_TASK_DESCRIPTION = """\
A candidate has this profile:
{candidate_profile_json}

Resume text:
---
{resume_text}
---

Below are real open job postings retrieved by vector similarity search \
against this candidate's profile/resume (already narrowed to the most \
relevant roles across all ingested companies -- your job is to explain fit, \
not re-search):
{jobs_json}

For each job posting listed above, produce a score from 0-100 and one to two \
sentences of reasoning grounded ONLY in the candidate's actual skills/resume \
text versus that specific posting's actual requirements. Never invent a \
skill the candidate doesn't have or a requirement the posting doesn't have.

Respond with ONLY a JSON object, no prose, in exactly this shape:
{{
  "suggested_jobs": [
    {{"job_id": "...", "company_name": "...", "title": "...", "score": 0, "reasoning": "..."}}
  ]
}}
"""


def _company_context_block(company_context: dict | None) -> str:
    if not company_context:
        return "No stored company data was found for this company -- rely only on the job description text above."
    return (
        "Stored company data on file (from prior ingestion -- use only to cross-check/fill "
        "gaps; the job description above takes precedence on conflict):\n"
        f"- industry: {company_context.get('industry', '')}\n"
        f"- tech_stack: {company_context.get('tech_stack', [])}\n"
        f"- description: {company_context.get('description', '')}"
    )


def _grounding_block(retrieved_context: list[dict]) -> str:
    if not retrieved_context:
        return (
            "No real company/role context was retrieved for this job -- no additional "
            "grounding is available beyond the job description itself."
        )
    lines = ["Real company/role context retrieved by vector search:"]
    for item in retrieved_context:
        label = item.get("company_name") or item.get("title", "")
        detail = item.get("description") or item.get("title", "")
        lines.append(f"- id={item.get('_id')} | {label}: {detail}")
    return "\n".join(lines)


def run_matching_crew(
    job_description: str,
    role_title: str,
    shortlisted_candidates: list[dict],
    company_context: dict | None = None,
    retrieved_context: list[dict] | None = None,
) -> dict:
    matcher_agent = build_matching_agent()
    retrieved_context = retrieved_context or []

    requirements_task = Task(
        description=REQUIREMENTS_TASK_DESCRIPTION.format(
            role_title=role_title,
            job_description=job_description,
            company_context_block=_company_context_block(company_context),
        ),
        expected_output="A single JSON object with required_skills, nice_to_have_skills, experience_level, role_category.",
        agent=matcher_agent,
    )

    matching_task = Task(
        description=MATCHING_TASK_DESCRIPTION.format(
            candidates_json=json.dumps(shortlisted_candidates, default=str),
            grounding_block=_grounding_block(retrieved_context),
        ),
        expected_output="A single JSON object with keys ranked_matches, grounded, grounding_sources.",
        agent=matcher_agent,
        context=[requirements_task],
    )

    crew = Crew(
        agents=[matcher_agent],
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
        "grounded": bool(parsed_matches.get("grounded", False)) and bool(retrieved_context),
        "grounding_sources": parsed_matches.get("grounding_sources", []) if retrieved_context else [],
    }


def run_job_suggestion_crew(candidate_profile: dict, resume_text: str, retrieved_jobs: list[dict]) -> dict:
    """Reverse-match: given real open postings already retrieved via RAG
    (tools/rag_retrieval_tool.py), explain why each is a fit for this
    candidate using the Matching Agent."""
    matcher_agent = build_matching_agent()

    task = Task(
        description=JOB_SUGGESTION_TASK_DESCRIPTION.format(
            candidate_profile_json=json.dumps(candidate_profile, default=str),
            resume_text=resume_text,
            jobs_json=json.dumps(retrieved_jobs, default=str),
        ),
        expected_output="A single JSON object with key suggested_jobs.",
        agent=matcher_agent,
    )

    crew = Crew(agents=[matcher_agent], tasks=[task], process=Process.sequential, verbose=False)
    crew.kickoff()

    parsed = extract_json_object(str(task.output))
    return {"suggested_jobs": parsed.get("suggested_jobs", [])}

