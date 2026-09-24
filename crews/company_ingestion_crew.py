from crewai import Crew, Process, Task

from agents.company_intelligence_agent import build_company_intelligence_agent
from crews._json_utils import extract_json_object

COMPANY_INFO_TASK_DESCRIPTION = """\
Company name: "{company_name}"

Cleaned text scraped from this company's own website (About/Home/Careers pages):
---
{page_text}
---

Extract only what is explicitly stated in the text above. If a field isn't \
mentioned anywhere, leave it empty rather than guessing -- never invent a \
fact this page doesn't state.

Respond with ONLY a JSON object, no prose, in exactly this shape:
{{
  "industry": "...",
  "company_size": "...",
  "tech_stack": ["..."],
  "locations": ["..."],
  "description": "one to three sentence factual summary drawn only from the text above"
}}
"""

JOB_POSTINGS_TASK_DESCRIPTION = """\
Company name: "{company_name}"

Cleaned text scraped from this company's careers page and individual job \
posting pages. Each page's text is preceded by its source URL on a line \
starting with "SOURCE_URL:".
---
{jobs_text}
---

Extract each distinct open role as a separate job posting. Use ONLY \
information stated in the text for that specific posting -- never invent a \
requirement, skill, or detail. If a field isn't mentioned for a posting, \
leave it empty. Use the "SOURCE_URL:" line immediately preceding a posting's \
text as that posting's source_url. If no postings are present in the text \
above, return an empty list.

Respond with ONLY a JSON object, no prose, in exactly this shape:
{{
  "postings": [
    {{
      "title": "...",
      "description": "...",
      "required_skills": ["..."],
      "nice_to_have_skills": ["..."],
      "experience_level": "...",
      "location": "...",
      "employment_type": "...",
      "posted_date": null,
      "source_url": "..."
    }}
  ]
}}
"""


def run_company_ingestion_crew(company_name: str, page_text: str, jobs_text: str) -> dict:
    agent = build_company_intelligence_agent()

    company_task = Task(
        description=COMPANY_INFO_TASK_DESCRIPTION.format(
            company_name=company_name,
            page_text=page_text or "(no page text scraped)",
        ),
        expected_output="A single JSON object with industry, company_size, tech_stack, locations, description.",
        agent=agent,
    )

    jobs_task = Task(
        description=JOB_POSTINGS_TASK_DESCRIPTION.format(
            company_name=company_name,
            jobs_text=jobs_text or "(no job posting text scraped)",
        ),
        expected_output="A single JSON object with key postings.",
        agent=agent,
        context=[company_task],
    )

    crew = Crew(
        agents=[agent],
        tasks=[company_task, jobs_task],
        process=Process.sequential,
        verbose=False,
    )
    crew.kickoff()

    company_info = extract_json_object(str(company_task.output))
    postings = extract_json_object(str(jobs_task.output)).get("postings", [])

    return {"company_info": company_info, "postings": postings}
