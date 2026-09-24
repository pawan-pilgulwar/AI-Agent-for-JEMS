from crewai import Agent

from config import get_settings


def build_candidate_matcher_agent() -> Agent:
    settings = get_settings()
    return Agent(
        role="Candidate Matcher",
        goal=(
            "Given a shortlist of candidates already retrieved by vector similarity search "
            "and a set of structured job requirements, score each candidate from 0-100 with "
            "written reasoning, matched_skills, and missing_skills. Ground every judgment in "
            "the candidate's actual listed skills/resume text and the job's actual "
            "requirements -- never invent a skill or qualification either side doesn't have. "
            "When real company/role context retrieved via RAG is provided, weave it into the "
            "reasoning instead of generic assumptions about the role or company."
        ),
        backstory=(
            "You are a senior technical hiring panelist. You have already been handed the "
            "most relevant candidates by an upstream retrieval step; your job is the final, "
            "nuanced judgment call on fit, not to re-search the candidate pool. You also "
            "reuse this same judgment to explain, from the candidate's side, why a retrieved "
            "open role is or isn't a good fit for them."
        ),
        llm=settings.crew_llm,
        verbose=False,
        allow_delegation=False,
    )
