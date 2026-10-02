import json
import logging
from typing import Any

from crewai import Crew, Process, Task
from pydantic import BaseModel, Field

from agents.analysis_agent import build_analysis_agent
from crews._json_utils import extract_json_object

logger = logging.getLogger(__name__)


class CompanyInsightItem(BaseModel):
    company_name: str
    source_type: str = "registered"
    role_title: str
    required_skills: list[str] = []
    nice_to_have_skills: list[str] = []
    relevance_score: float = 0.0


class ProfileAnalysisOutput(BaseModel):
    student_skills: list[str]
    verified_skills: list[str] = []
    technical_skill_gaps: list[str]
    soft_skill_gaps: list[str] = []
    compatibility_score: float = Field(default=0.0, ge=0.0, le=100.0)
    company_insights: list[CompanyInsightItem] = []
    registered_companies_analyzed: int = 0
    scraped_companies_analyzed: int = 0
    analysis_summary: str
    grounded: bool = False
    grounding_sources: list[str] = []


ANALYSIS_TASK_DESCRIPTION = """\
Analyze the following student profile and resume against target career requirements and industry data.

Student Career Objective: "{career_objective}"
Target Companies / Preferences: {target_companies}

Student Profile Data:
{student_profile_json}

Resume Text:
---
{resume_text}
---

Industry Requirements from PLATFORM-REGISTERED Companies:
{registered_companies_block}

Industry Requirements from WEB-SCRAPED Company Postings:
{scraped_companies_block}

Your Instructions:
1. Extract all verified or demonstrable student skills from the resume and profile.
2. Carefully analyze company requirements from BOTH:
   - Platform-registered companies (active hiring partners on JEMS)
   - Web-scraped companies (live external market demand)
3. Compare the student's current skills against these two data sources to identify:
   - technical_skill_gaps: missing technical/framework/language proficiencies required by these companies
   - soft_skill_gaps: communication, problem solving, teamwork, leadership gaps indicated by role seniority
4. Compute an objective compatibility_score from 0 to 100 based on skill overlap.
5. Create company_insights list for key relevant companies analyzed, clearly indicating source_type as "registered" or "scraped".
6. Summarize the gap analysis with actionable advice for the student.

Respond with ONLY a JSON object, no prose, matching this structure:
{{
  "student_skills": ["..."],
  "verified_skills": ["..."],
  "technical_skill_gaps": ["..."],
  "soft_skill_gaps": ["..."],
  "compatibility_score": 75.0,
  "company_insights": [
    {{
      "company_name": "...",
      "source_type": "registered",
      "role_title": "...",
      "required_skills": ["..."],
      "nice_to_have_skills": ["..."],
      "relevance_score": 80.0
    }}
  ],
  "registered_companies_analyzed": 0,
  "scraped_companies_analyzed": 0,
  "analysis_summary": "...",
  "grounded": true,
  "grounding_sources": ["..."]
}}
"""


def _format_context_block(items: list[dict[str, Any]], source_label: str) -> str:
    if not items:
        return f"No {source_label} company postings found in database for this query."
    lines = []
    for item in items:
        company_name = item.get("company_name", "Unknown")
        title = item.get("title", "Role")
        req_skills = item.get("required_skills", [])
        nice_skills = item.get("nice_to_have_skills", [])
        item_id = item.get("_id", "")
        lines.append(
            f"- [{source_label.upper()}] id={item_id} | Company: {company_name} | Role: {title} | "
            f"Required: {req_skills} | Nice-to-have: {nice_skills}"
        )
    return "\n".join(lines)


def run_profile_analysis_crew(
    student_profile: dict[str, Any],
    resume_text: str,
    career_objective: str,
    target_companies: list[str] | None = None,
    registered_context: list[dict[str, Any]] | None = None,
    scraped_context: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    agent = build_analysis_agent()
    target_companies = target_companies or []
    registered_context = registered_context or []
    scraped_context = scraped_context or []

    task = Task(
        description=ANALYSIS_TASK_DESCRIPTION.format(
            career_objective=career_objective,
            target_companies=", ".join(target_companies) or "(any matching)",
            student_profile_json=json.dumps(student_profile, default=str),
            resume_text=resume_text,
            registered_companies_block=_format_context_block(registered_context, "registered"),
            scraped_companies_block=_format_context_block(scraped_context, "scraped"),
        ),
        expected_output="A single JSON object matching the ProfileAnalysisOutput schema.",
        agent=agent,
        output_pydantic=ProfileAnalysisOutput,
    )

    crew = Crew(agents=[agent], tasks=[task], process=Process.sequential, verbose=False)
    result = crew.kickoff()

    if result.pydantic is not None:
        parsed = result.pydantic.model_dump()
    else:
        parsed = extract_json_object(str(result))

    all_sources = [str(item.get("_id")) for item in registered_context + scraped_context if item.get("_id")]
    is_grounded = bool(registered_context or scraped_context)

    return {
        "student_skills": parsed.get("student_skills", []),
        "verified_skills": parsed.get("verified_skills", student_profile.get("verified_skills", [])),
        "technical_skill_gaps": parsed.get("technical_skill_gaps", []),
        "soft_skill_gaps": parsed.get("soft_skill_gaps", []),
        "compatibility_score": float(parsed.get("compatibility_score", 50.0)),
        "company_insights": parsed.get("company_insights", []),
        "registered_companies_analyzed": len(registered_context),
        "scraped_companies_analyzed": len(scraped_context),
        "analysis_summary": parsed.get("analysis_summary", ""),
        "grounded": is_grounded,
        "grounding_sources": all_sources,
    }
