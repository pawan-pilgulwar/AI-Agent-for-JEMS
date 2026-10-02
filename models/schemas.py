from typing import Literal

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# 1. Profile & Dual-Company Analysis (Analysis Agent)
# ---------------------------------------------------------------------------


class AnalyzeProfileRequest(BaseModel):
    student_profile: dict = Field(..., description="Student profile with education, projects, skills")
    resume_text: str = Field(..., min_length=1, description="Resume text or parsed CV")
    career_objective: str = Field(..., min_length=1, description="Target career role or goal")
    target_companies: list[str] = Field(
        default_factory=list, description="Target company names (e.g. ['Capgemini', 'TCS'])"
    )
    target_role: str | None = Field(default=None, description="Specific target role title")


class CompanyRequirementInsight(BaseModel):
    company_name: str
    source_type: Literal["registered", "scraped", "legacy"]
    role_title: str
    required_skills: list[str]
    nice_to_have_skills: list[str] = []
    relevance_score: float = 0.0


class AnalyzeProfileResponse(BaseModel):
    student_skills: list[str]
    verified_skills: list[str] = []
    technical_skill_gaps: list[str]
    soft_skill_gaps: list[str] = []
    compatibility_score: float = Field(..., ge=0, le=100)
    company_insights: list[CompanyRequirementInsight]
    registered_companies_analyzed: int
    scraped_companies_analyzed: int
    analysis_summary: str
    grounded: bool = False
    grounding_sources: list[str] = []


# ---------------------------------------------------------------------------
# 2. Career Roadmap (Roadmap Agent)
# ---------------------------------------------------------------------------


class GenerateRoadmapRequest(BaseModel):
    current_skills: list[str]
    skill_gaps: list[str]
    career_objective: str
    target_role: str | None = None
    timeline_weeks: int = Field(default=12, ge=2, le=52)
    user_id: str | None = None
    force_refresh: bool = False


class RoadmapMilestone(BaseModel):
    milestone_index: int
    title: str
    duration_weeks: int
    skills_covered: list[str]
    learning_sequence: list[str]
    milestone_deliverable: str
    rationale: str


class GenerateRoadmapResponse(BaseModel):
    career_objective: str
    target_role: str
    total_estimated_hours: float
    milestones: list[RoadmapMilestone]
    target_resume_skills: list[str]
    target_role_readiness: str


# ---------------------------------------------------------------------------
# 3. Learning Resources & FDP Training (Learning Agent)
# ---------------------------------------------------------------------------


class RecommendLearningRequest(BaseModel):
    skills_to_learn: list[str] = Field(..., min_length=1)
    career_objective: str = Field(..., min_length=1)
    target_role: str | None = None
    user_id: str | None = None
    force_refresh: bool = False


class LearningResource(BaseModel):
    skill: str
    resource_name: str
    resource_type: Literal["course", "project", "documentation", "certification", "workshop"]
    provider: str
    url_or_reference: str
    estimated_hours: float
    difficulty: Literal["beginner", "intermediate", "advanced"]


class FDPProgram(BaseModel):
    title: str
    focus_area: str
    target_audience: str
    description: str


class RecommendLearningResponse(BaseModel):
    resources: list[LearningResource]
    recommended_certifications: list[str]
    hands_on_projects: list[dict]
    fdp_training_programs: list[FDPProgram]
    progress_tracking_metrics: list[str]


# ---------------------------------------------------------------------------
# 4. Skill Validation & Assessments (Assessment Agent)
# ---------------------------------------------------------------------------


class GenerateAssessmentRequest(BaseModel):
    skills: list[str] = Field(..., min_length=1)
    role_category: str = Field(default="software engineering")
    difficulty: Literal["beginner", "intermediate", "advanced"] = "intermediate"
    num_questions: int = Field(default=5, ge=1, le=15)
    user_id: str | None = None


class AssessmentQuestion(BaseModel):
    question_id: int
    skill: str
    question_text: str
    question_type: Literal["multiple_choice", "code_analysis", "scenario"]
    options: list[str] = []
    correct_answer: str | None = None
    evaluation_rubric: str


class GenerateAssessmentResponse(BaseModel):
    test_id: str
    skills: list[str]
    difficulty: str
    questions: list[AssessmentQuestion]


class SubmitAnswer(BaseModel):
    question_id: int
    answer_text: str


class EvaluateAssessmentRequest(BaseModel):
    test_id: str | None = None
    user_id: str = Field(..., min_length=1)
    skills: list[str] = Field(..., min_length=1)
    submissions: list[SubmitAnswer]
    questions: list[AssessmentQuestion] | None = None


class SkillEvaluationResult(BaseModel):
    skill: str
    score: float = Field(..., ge=0, le=100)
    proficiency_level: Literal["beginner", "intermediate", "advanced", "expert"]
    verified: bool
    feedback: str


class EvaluateAssessmentResponse(BaseModel):
    user_id: str
    test_id: str | None = None
    overall_score: float = Field(..., ge=0, le=100)
    passed: bool
    skill_evaluations: list[SkillEvaluationResult]
    verified_skills_awarded: list[str]
    detailed_feedback: str


# ---------------------------------------------------------------------------
# 5. Matching & Notifications (Matching Agent)
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
        description="True only if real company/role context retrieved via RAG was found and used in scoring.",
    )
    grounding_sources: list[str] = Field(
        default_factory=list, description="Company/job posting IDs used to ground this response, if any."
    )


class JobMatchNotification(BaseModel):
    recipient_type: Literal["student", "company"]
    recipient_id: str
    title: str
    message: str
    action_url: str


class EnhancedMatchResponse(BaseModel):
    parsed_requirements: ParsedRequirements
    ranked_matches: list[CandidateMatch]
    notifications: list[JobMatchNotification] = []
    grounded: bool = False
    grounding_sources: list[str] = []


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


# ---------------------------------------------------------------------------
# 6. Web Scraper Agent & Registered Company Models
# ---------------------------------------------------------------------------


class BatchScrapeCompaniesRequest(BaseModel):
    companies: list[str] = Field(
        ..., min_length=1, description="List of company names or website URLs to scrape"
    )
    max_postings_per_company: int = Field(default=8, ge=1, le=20)


class ScrapedCompanySummary(BaseModel):
    company_name: str
    website_url: str
    industry: str
    status: Literal["success", "partial", "failed"]
    jobs_scraped: int
    error: str | None = None


class BatchScrapeCompaniesResponse(BaseModel):
    total_requested: int
    successfully_scraped: int
    failed: int
    companies: list[ScrapedCompanySummary]


class RegisterCompanyRequest(BaseModel):
    company_name: str = Field(..., min_length=1)
    website_url: str = Field(..., min_length=1)
    industry: str
    company_size: str
    tech_stack: list[str]
    locations: list[str]
    description: str
    contact_email: str | None = None
    postings: list[dict] = Field(default_factory=list)


class RegisterCompanyResponse(BaseModel):
    company_id: str
    status: Literal["created", "updated", "unchanged"]
    jobs_created: int
    jobs_updated: int


# ---------------------------------------------------------------------------
# Unified Multi-Agent Orchestrator
# ---------------------------------------------------------------------------

AgentRequestType = Literal[
    "analyze_profile",
    "generate_roadmap",
    "recommend_learning",
    "generate_assessment",
    "evaluate_assessment",
    "match_candidates",
    "suggest_jobs",
    "scrape_companies",
    "register_company",
    "full_student_pipeline",
]


class OrchestrateRequest(BaseModel):
    request_type: AgentRequestType
    payload: dict = Field(..., description="Request payload corresponding to the request_type")


class OrchestrateResponse(BaseModel):
    request_type: str
    status: Literal["success", "error"]
    result: dict
    execution_time_seconds: float = 0.0
