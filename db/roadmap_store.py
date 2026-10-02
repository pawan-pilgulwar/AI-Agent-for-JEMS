"""Database caching and persistence store for Roadmap Agent and Learning Agent outputs.

Stores generated roadmaps in `student_roadmaps` and curated learning materials in
`learning_recommendations` so that repeated requests return immediately from MongoDB
without LLM delay or fluctuating outputs.
"""

import hashlib
import logging
from datetime import datetime, timezone
from typing import Any

from db.mongo_client import (
    LEARNING_RECOMMENDATIONS_COLLECTION,
    STUDENT_ROADMAPS_COLLECTION,
    get_database,
)

logger = logging.getLogger(__name__)


def compute_roadmap_cache_key(
    career_objective: str,
    target_role: str | None,
    current_skills: list[str],
    skill_gaps: list[str],
    timeline_weeks: int = 12,
    user_id: str | None = None,
) -> str:
    norm_cur = sorted(s.strip().lower() for s in current_skills)
    norm_gaps = sorted(s.strip().lower() for s in skill_gaps)
    raw = f"{user_id or 'global'}|{career_objective.strip().lower()}|{(target_role or '').strip().lower()}|{timeline_weeks}|{','.join(norm_cur)}|{','.join(norm_gaps)}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def compute_learning_cache_key(
    career_objective: str,
    target_role: str | None,
    skills_to_learn: list[str],
    user_id: str | None = None,
) -> str:
    norm_skills = sorted(s.strip().lower() for s in skills_to_learn)
    raw = f"{user_id or 'global'}|{career_objective.strip().lower()}|{(target_role or '').strip().lower()}|{','.join(norm_skills)}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


async def get_cached_roadmap(cache_key: str) -> dict[str, Any] | None:
    try:
        db = get_database()
        doc = await db[STUDENT_ROADMAPS_COLLECTION].find_one({"_id": cache_key})
        if doc and "roadmap" in doc:
            logger.info("Cache hit for student roadmap with key=%s", cache_key)
            return doc["roadmap"]
    except Exception:
        logger.warning("Failed to check roadmap cache for %s", cache_key, exc_info=True)
    return None


async def save_roadmap(
    cache_key: str,
    roadmap_data: dict[str, Any],
    user_id: str | None = None,
    career_objective: str = "",
    target_role: str | None = None,
) -> None:
    try:
        db = get_database()
        now = datetime.now(timezone.utc)
        doc = {
            "_id": cache_key,
            "user_id": user_id,
            "career_objective": career_objective,
            "target_role": target_role,
            "roadmap": roadmap_data,
            "cached_at": now,
            "updated_at": now,
        }
        await db[STUDENT_ROADMAPS_COLLECTION].replace_one({"_id": cache_key}, doc, upsert=True)
        logger.info("Persisted student roadmap cache with key=%s", cache_key)
    except Exception:
        logger.exception("Failed to persist student roadmap cache for %s", cache_key)


async def get_cached_learning_recommendation(cache_key: str) -> dict[str, Any] | None:
    try:
        db = get_database()
        doc = await db[LEARNING_RECOMMENDATIONS_COLLECTION].find_one({"_id": cache_key})
        if doc and "recommendations" in doc:
            logger.info("Cache hit for learning recommendations with key=%s", cache_key)
            return doc["recommendations"]
    except Exception:
        logger.warning("Failed to check learning recommendations cache for %s", cache_key, exc_info=True)
    return None


async def save_learning_recommendation(
    cache_key: str,
    recommendations_data: dict[str, Any],
    user_id: str | None = None,
    career_objective: str = "",
    target_role: str | None = None,
) -> None:
    try:
        db = get_database()
        now = datetime.now(timezone.utc)
        doc = {
            "_id": cache_key,
            "user_id": user_id,
            "career_objective": career_objective,
            "target_role": target_role,
            "recommendations": recommendations_data,
            "cached_at": now,
            "updated_at": now,
        }
        await db[LEARNING_RECOMMENDATIONS_COLLECTION].replace_one({"_id": cache_key}, doc, upsert=True)
        logger.info("Persisted learning recommendations cache with key=%s", cache_key)
    except Exception:
        logger.exception("Failed to persist learning recommendations cache for %s", cache_key)

