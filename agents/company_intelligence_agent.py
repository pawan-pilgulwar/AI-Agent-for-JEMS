from crewai import Agent

from config import get_settings


def build_company_intelligence_agent() -> Agent:
    settings = get_settings()
    return Agent(
        role="Company Intelligence Analyst",
        goal=(
            "Turn cleaned text scraped from a company's own website into structured company "
            "profile fields and structured job postings. Extract ONLY what is actually present "
            "on the page -- never infer or invent a fact, skill, or requirement that isn't "
            "stated in the provided text."
        ),
        backstory=(
            "You are a meticulous research analyst who builds a company knowledge base from "
            "primary sources only. You have already been handed pre-scraped, boilerplate-"
            "stripped text from a company's About/Home/Careers pages by an upstream scraping "
            "step; your job is structured extraction, not speculation about facts the page "
            "doesn't state."
        ),
        llm=settings.crew_llm,
        verbose=False,
        allow_delegation=False,
    )
