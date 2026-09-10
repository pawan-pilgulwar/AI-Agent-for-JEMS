from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Learning Path
# ---------------------------------------------------------------------------


class LearningPathRequest(BaseModel):
    user_profile: dict = Field(..., description="Structured profile from MongoDB (skills, education, projects)")
    resume_text: str = Field(..., min_length=1, description="Raw or parsed resume text")
    career_objective: str = Field(..., min_length=1, description="Free text career goal, e.g. 'Backend engineer at a fintech'")


class LearningPathStep(BaseModel):
    skill: str
    resource_type: str
    estimated_hours: float
    rationale: str


class LearningPathResponse(BaseModel):
    current_skills: list[str]
    skill_gaps: list[str]
    learning_path: list[LearningPathStep]
    target_resume_skills: list[str]


# ---------------------------------------------------------------------------
# Candidate Matching
# ---------------------------------------------------------------------------


class MatchRequest(BaseModel):
    job_description: str = Field(..., min_length=1)
    role_title: str = Field(..., min_length=1)
    candidate_pool: list[dict] = Field(..., min_length=1, description="Candidate profiles (id + resume/skills data)")


class ParsedRequirements(BaseModel):
    required_skills: list[str]
    nice_to_have_skills: list[str]
    experience_level: str
    role_category: str


class CandidateMatch(BaseModel):
    user_id: str
    score: float = Field(..., ge=0, le=100)
    reasoning: str
    matched_skills: list[str]
    missing_skills: list[str]


class MatchResponse(BaseModel):
    parsed_requirements: ParsedRequirements
    ranked_matches: list[CandidateMatch]
