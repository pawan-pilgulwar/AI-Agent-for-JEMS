"""Deterministic skill-gap analysis -- no LLM call.

Given a student's current skills and a free-text career objective, this does
a set-difference against a small, normalized skill taxonomy for the closest
matching role. The taxonomy and matching logic are intentionally simple and
inspectable: an LLM never invents the gap list, it only sequences and
explains a gap list produced here.
"""

import re

# Minimal role -> required-skill taxonomy. Extend as needed; keys are matched
# against the free-text career objective by keyword overlap.
ROLE_SKILL_TAXONOMY: dict[str, list[str]] = {
    "backend engineer": [
        "python", "java", "node.js", "sql", "rest api design", "docker",
        "git", "system design", "databases", "unit testing",
    ],
    "frontend engineer": [
        "javascript", "typescript", "react", "html", "css", "git",
        "responsive design", "rest api integration", "webpack", "testing",
    ],
    "full stack engineer": [
        "javascript", "typescript", "react", "node.js", "sql", "rest api design",
        "docker", "git", "html", "css",
    ],
    "data scientist": [
        "python", "pandas", "numpy", "sql", "statistics", "machine learning",
        "data visualization", "scikit-learn", "jupyter", "experiment design",
    ],
    "machine learning engineer": [
        "python", "pytorch", "tensorflow", "machine learning", "mlops",
        "docker", "sql", "model deployment", "data pipelines", "git",
    ],
    "devops engineer": [
        "docker", "kubernetes", "ci/cd", "linux", "cloud infrastructure",
        "terraform", "monitoring", "scripting", "git", "networking basics",
    ],
    "mobile developer": [
        "kotlin", "swift", "flutter", "react native", "mobile ui design",
        "rest api integration", "git", "app store deployment", "testing",
    ],
    "qa engineer": [
        "test planning", "selenium", "manual testing", "automation testing",
        "bug tracking", "sql", "api testing", "git",
    ],
}

DEFAULT_ROLE_SKILLS = [
    "git", "problem solving", "communication", "rest api design",
    "sql", "testing", "system design",
]


def _normalize(text: str) -> str:
    return re.sub(r"[^a-z0-9+.# ]", " ", text.lower())


def _tokenize(text: str) -> set[str]:
    return {tok for tok in _normalize(text).split() if tok}


def extract_current_skills(user_profile: dict, resume_text: str) -> list[str]:
    """Pulls current skills from the structured profile's `skills` field (if
    present) plus a keyword scan of the resume text against the full known
    taxonomy vocabulary."""
    skills: set[str] = set()

    profile_skills = user_profile.get("skills") if isinstance(user_profile, dict) else None
    if isinstance(profile_skills, list):
        skills.update(_normalize(s) for s in profile_skills if isinstance(s, str))

    known_vocab = {skill for skills_list in ROLE_SKILL_TAXONOMY.values() for skill in skills_list}
    known_vocab |= set(DEFAULT_ROLE_SKILLS)

    resume_tokens = _normalize(resume_text)
    for skill in known_vocab:
        if skill in resume_tokens:
            skills.add(skill)

    return sorted(skills)


def _closest_role(career_objective: str) -> list[str]:
    objective_tokens = _tokenize(career_objective)
    best_role = None
    best_overlap = 0

    for role, skills in ROLE_SKILL_TAXONOMY.items():
        role_tokens = _tokenize(role)
        overlap = len(objective_tokens & role_tokens)
        if overlap > best_overlap:
            best_overlap = overlap
            best_role = role

    if best_role is None:
        return DEFAULT_ROLE_SKILLS
    return ROLE_SKILL_TAXONOMY[best_role]


def compute_skill_gaps(current_skills: list[str], career_objective: str) -> tuple[list[str], list[str]]:
    """Returns (target_role_skills, skill_gaps)."""
    target_skills = _closest_role(career_objective)
    current_set = {_normalize(s) for s in current_skills}
    gaps = [skill for skill in target_skills if skill not in current_set]
    return target_skills, gaps
