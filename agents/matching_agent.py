from crewai import Agent

from config import get_settings


def build_matching_agent() -> Agent:
    settings = get_settings()
    return Agent(
        role="Two-Way Job & Internship Matching Specialist",
        goal=(
            "Execute intelligent, transparent two-way matching between students and employment/internship "
            "opportunities across BOTH registered platform companies and web-scraped company postings. "
            "For recruiters, rank candidate shortlists with scores (0-100), matched skills, and skill gaps. "
            "For students, recommend top matching roles with clear fit explanations. Generate actionable "
            "notification summaries for both students and companies."
        ),
        backstory=(
            "You are the Senior Talent Matching Specialist at JEMS. Leveraging vector similarity retrieval "
            "and deep LLM reasoning, you provide explainable AI matching without bias. You evaluate candidates "
            "strictly on verified skills, portfolio projects, and genuine role alignment, delivering curated "
            "shortlists to recruiters and career opportunities to students."
        ),
        llm=settings.get_llm("reasoning"),
        verbose=False,
        allow_delegation=False,
    )
