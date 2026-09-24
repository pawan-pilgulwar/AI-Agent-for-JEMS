from typing import Literal

from pydantic import BaseModel, Field, model_validator


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
    grounded: bool = Field(
        default=False,
        description="True only if real job postings retrieved via RAG were found and used to ground the skill-gap rationale.",
    )
    grounding_sources: list[str] = Field(
        default_factory=list, description="Job posting IDs used to ground this response, if any."
    )


# ---------------------------------------------------------------------------
# Candidate Matching
# ---------------------------------------------------------------------------


class MatchRequest(BaseModel):
    job_description: str = Field(..., min_length=1)
    role_title: str = Field(..., min_length=1)
    candidate_pool: list[dict] = Field(..., min_length=1, description="Candidate profiles (id + resume/skills data)")
    company_name: str | None = Field(
        default=None,
        description="Optional -- if given, looked up against stored company data to cross-check the parsed requirements.",
    )


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
    grounded: bool = Field(
        default=False,
        description="True only if real company/role context retrieved via RAG was found and used in the scoring reasoning.",
    )
    grounding_sources: list[str] = Field(
        default_factory=list, description="Company/job posting IDs used to ground this response, if any."
    )


# ---------------------------------------------------------------------------
# Company Intelligence / Ingestion
# ---------------------------------------------------------------------------


class IngestCompanyRequest(BaseModel):
    company_name: str | None = Field(
        default=None, min_length=1, description="Omit together with website_url to run autonomous discovery instead."
    )
    website_url: str | None = Field(
        default=None, min_length=1, description="Omit together with company_name to run autonomous discovery instead."
    )
    careers_page_url: str | None = Field(
        default=None, description="If known; otherwise discovered by crawling website_url."
    )

    @model_validator(mode="after")
    def _company_name_and_website_url_together(self) -> "IngestCompanyRequest":
        if bool(self.company_name) != bool(self.website_url):
            raise ValueError("Provide both company_name and website_url, or omit both to run discovery mode.")
        return self


class JobPostingSummary(BaseModel):
    id: str
    title: str
    status: str


class IngestCompanyResponse(BaseModel):
    company_id: str
    company_status: Literal["created", "updated", "unchanged"]
    jobs_created: int
    jobs_updated: int
    jobs_closed: int
    jobs: list[JobPostingSummary]


# ---------------------------------------------------------------------------
# Reverse matching: suggest jobs for a candidate
# ---------------------------------------------------------------------------


class SuggestJobsRequest(BaseModel):
    candidate_profile: dict
    resume_text: str = Field(..., min_length=1)
    top_n: int = Field(default=5, gt=0)


class SuggestedJob(BaseModel):
    job_id: str
    company_name: str
    title: str
    score: float = Field(..., ge=0, le=100)
    reasoning: str


class SuggestJobsResponse(BaseModel):
    suggested_jobs: list[SuggestedJob]
