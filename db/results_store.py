"""Persists LLM crew outputs to MongoDB Atlas for audit/history purposes.

Writes are best-effort: a failure to persist a result must never prevent the
API from returning that result to the caller.
"""

import logging
from datetime import datetime, timezone
from typing import Any

from db.mongo_client import get_database

logger = logging.getLogger(__name__)

LEARNING_PATH_RESULTS_COLLECTION = "learning_path_results"
MATCH_RESULTS_COLLECTION = "match_results"


async def save_learning_path_result(
    *,
    user_profile: dict[str, Any],
    career_objective: str,
    current_skills: list[str],
    skill_gaps: list[str],
    learning_path: list[dict[str, Any]],
    target_resume_skills: list[str],
) -> None:
    doc = {
        "user_id": user_profile.get("user_id") or user_profile.get("_id"),
        "career_objective": career_objective,
        "current_skills": current_skills,
        "skill_gaps": skill_gaps,
        "learning_path": learning_path,
        "target_resume_skills": target_resume_skills,
        "created_at": datetime.now(timezone.utc),
    }
    try:
        db = get_database()
        await db[LEARNING_PATH_RESULTS_COLLECTION].insert_one(doc)
    except Exception:
        logger.exception("Failed to persist learning path result")


async def save_match_result(
    *,
    role_title: str,
    job_description: str,
    parsed_requirements: dict[str, Any],
    ranked_matches: list[dict[str, Any]],
) -> None:
    doc = {
        "role_title": role_title,
        "job_description": job_description,
        "parsed_requirements": parsed_requirements,
        "ranked_matches": ranked_matches,
        "created_at": datetime.now(timezone.utc),
    }
    try:
        db = get_database()
        await db[MATCH_RESULTS_COLLECTION].insert_one(doc)
    except Exception:
        logger.exception("Failed to persist match result")
