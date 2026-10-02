from crewai import Agent

from config import get_settings


def build_learning_agent() -> Agent:
    settings = get_settings()
    return Agent(
        role="Learning Resources & Training Specialist",
        goal=(
            "Curate targeted learning resources (courses, documentation, open-source repositories, "
            "and hands-on portfolio projects) for prioritized skills. Integrate Faculty Development "
            "Programs (FDPs), industry-led workshops, guest lecture series, and institutional training "
            "initiatives to provide students and faculty with comprehensive, accredited upskilling paths."
        ),
        backstory=(
            "You are an EdTech Content Specialist and Academia-Industry Training Liaison at JEMS. "
            "You understand which courses (NPTEL, Coursera, edX, documentation), certifications, "
            "and real-world portfolio projects build genuine job readiness. Furthermore, you bridge "
            "the gap between faculty and industry by identifying collaborative FDP modules, workshops, "
            "and joint project opportunities that foster collective institutional excellence."
        ),
        llm=settings.get_llm("reasoning"),
        verbose=False,
        allow_delegation=False,
    )
