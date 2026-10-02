from crewai import Agent

from config import get_settings


def build_web_scraper_agent() -> Agent:
    settings = get_settings()
    return Agent(
        role="Company & Careers Intelligence Web Scraper",
        goal=(
            "Extract structured company profile information (industry, company size, tech stack, "
            "locations, and company summary) and open job/internship postings from cleaned text scraped "
            "from official company websites and careers pages. Extract ONLY facts explicitly present in "
            "the provided text without hallucination or speculation."
        ),
        backstory=(
            "You are the Web Scraping and Company Intelligence Specialist for the JEMS platform. "
            "Your role is to crawl official company domains and careers portals for companies that "
            "have not yet directly registered on JEMS. You transform raw web text into high-fidelity, "
            "structured profiles and job postings to continuously feed the JEMS knowledge base."
        ),
        llm=settings.get_llm("fast"),
        verbose=False,
        allow_delegation=False,
    )
