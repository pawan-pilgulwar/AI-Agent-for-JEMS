import json
import logging
from typing import Any

from crewai import Crew, Process, Task
from pydantic import BaseModel

from agents.assessment_agent import build_assessment_agent
from crews._json_utils import extract_json_object
from models.schemas import AssessmentQuestion, SkillEvaluationResult

logger = logging.getLogger(__name__)


class GenerateTestCrewOutput(BaseModel):
    questions: list[AssessmentQuestion]


class EvaluateTestCrewOutput(BaseModel):
    overall_score: float
    passed: bool
    skill_evaluations: list[SkillEvaluationResult]
    verified_skills_awarded: list[str]
    detailed_feedback: str


GENERATE_TEST_TASK_DESCRIPTION = """\
Create a rigorous, cheat-resistant skill assessment test.

Target Skills: {skills}
Role Domain: "{role_category}"
Difficulty Tier: "{difficulty}"
Number of Questions: {num_questions}

Instructions:
1. Generate exactly {num_questions} high-quality questions evenly distributed across the target skills.
2. Mix question types:
   - "multiple_choice": conceptual depth with 4 realistic options (A, B, C, D)
   - "code_analysis": code snippet with intentional bug or complexity question
   - "scenario": real-world engineering trade-off or architectural decision
3. For each question:
   - question_id: integer starting from 1
   - skill: which targeted skill this evaluates
   - question_text: clear problem statement
   - options: list of options (for multiple_choice) or empty list
   - correct_answer: concise description of the ideal answer
   - evaluation_rubric: scoring criteria (what distinguishes a great answer from a poor one)

Respond with ONLY a JSON object, no prose, matching this structure:
{{
  "questions": [
    {{
      "question_id": 1,
      "skill": "Python",
      "question_text": "...",
      "question_type": "multiple_choice",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correct_answer": "B) ...",
      "evaluation_rubric": "Full marks for identifying the memory overhead of generators vs lists."
    }}
  ]
}}
"""

EVALUATE_TEST_TASK_DESCRIPTION = """\
Evaluate the candidate's submitted answers to the skill validation assessment.

Tested Skills: {skills}

Questions and Evaluation Criteria:
{questions_json}

Candidate Submissions:
{submissions_json}

Instructions:
1. Grade each candidate answer against the correct answer and evaluation rubric.
2. Evaluate each tested skill individually:
   - score: 0 to 100
   - proficiency_level: "beginner" (<50), "intermediate" (50-74), "advanced" (75-89), or "expert" (90+)
   - verified: true if score >= 60, false otherwise
   - feedback: specific constructive feedback on strengths and shortcomings
3. Calculate the overall_score (weighted average, 0-100).
4. passed: true if overall_score >= 60, false otherwise.
5. verified_skills_awarded: list of skills that earned verified status (score >= 60).
6. Provide detailed_feedback summarizing recommendations for the student's portfolio.

Respond with ONLY a JSON object, no prose, matching this structure:
{{
  "overall_score": 82.5,
  "passed": true,
  "skill_evaluations": [
    {{
      "skill": "Python",
      "score": 85.0,
      "proficiency_level": "advanced",
      "verified": true,
      "feedback": "Demonstrated strong understanding of concurrency and generator pipelines."
    }}
  ],
  "verified_skills_awarded": ["Python"],
  "detailed_feedback": "..."
}}
"""


def run_assessment_generation_crew(
    skills: list[str],
    role_category: str = "software engineering",
    difficulty: str = "intermediate",
    num_questions: int = 5,
) -> list[dict[str, Any]]:
    agent = build_assessment_agent()

    task = Task(
        description=GENERATE_TEST_TASK_DESCRIPTION.format(
            skills=", ".join(skills),
            role_category=role_category,
            difficulty=difficulty,
            num_questions=num_questions,
        ),
        expected_output="A single JSON object matching GenerateTestCrewOutput.",
        agent=agent,
        output_pydantic=GenerateTestCrewOutput,
    )

    crew = Crew(agents=[agent], tasks=[task], process=Process.sequential, verbose=False)
    result = crew.kickoff()

    if result.pydantic is not None:
        parsed = result.pydantic.model_dump()
    else:
        parsed = extract_json_object(str(result))

    return parsed.get("questions", [])


def run_assessment_evaluation_crew(
    skills: list[str],
    submissions: list[dict[str, Any]],
    questions: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    agent = build_assessment_agent()
    questions = questions or []

    task = Task(
        description=EVALUATE_TEST_TASK_DESCRIPTION.format(
            skills=", ".join(skills),
            questions_json=json.dumps(questions, default=str),
            submissions_json=json.dumps(submissions, default=str),
        ),
        expected_output="A single JSON object matching EvaluateTestCrewOutput.",
        agent=agent,
        output_pydantic=EvaluateTestCrewOutput,
    )

    crew = Crew(agents=[agent], tasks=[task], process=Process.sequential, verbose=False)
    result = crew.kickoff()

    if result.pydantic is not None:
        parsed = result.pydantic.model_dump()
    else:
        parsed = extract_json_object(str(result))

    return {
        "overall_score": float(parsed.get("overall_score", 0.0)),
        "passed": bool(parsed.get("passed", False)),
        "skill_evaluations": parsed.get("skill_evaluations", []),
        "verified_skills_awarded": parsed.get("verified_skills_awarded", []),
        "detailed_feedback": parsed.get("detailed_feedback", ""),
    }
