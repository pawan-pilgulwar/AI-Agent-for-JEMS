from crewai import Agent

from config import get_settings


def build_requirements_analyzer_agent() -> Agent:
    settings = get_settings()
    return Agent(
        role="Company Requirements Analyzer",
        goal=(
            "Parse a job description into structured hiring requirements: required_skills, "
            "nice_to_have_skills, experience_level, and role_category. Extract only what is "
            "stated or strongly implied in the text -- never fabricate a requirement that "
            "isn't grounded in the job description."
        ),
        backstory=(
            "You are a technical recruiter who has read thousands of job descriptions. You "
            "are precise and conservative: if a skill isn't mentioned or clearly implied, it "
            "does not go in required_skills or nice_to_have_skills."
        ),
        llm=settings.crew_llm,
        verbose=False,
        allow_delegation=False,
    )
