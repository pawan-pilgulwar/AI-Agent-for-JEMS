"""Assessment and verified skills store for MongoDB Atlas.

Supports the Assessment Agent:
- Persisting generated assessment tests/challenges
- Storing test evaluations and scores
- Maintaining verified skills badge portfolio on student candidate records
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from db.mongo_client import (
    ASSESSMENTS_COLLECTION,
    CANDIDATES_COLLECTION,
    VERIFIED_SKILLS_COLLECTION,
    get_database,
)

logger = logging.getLogger(__name__)


async def save_assessment_test(
    *,
    user_id: str | None,
    skills: list[str],
    role_category: str,
    difficulty: str,
    questions: list[dict[str, Any]],
) -> str:
    """Saves a newly generated assessment test for a student."""
    test_id = str(uuid.uuid4())
    doc = {
        "_id": test_id,
        "user_id": user_id,
        "skills": skills,
        "role_category": role_category,
        "difficulty": difficulty,
        "questions": questions,
        "created_at": datetime.now(timezone.utc),
        "status": "pending",
    }
    db = get_database()
    try:
        await db[ASSESSMENTS_COLLECTION].insert_one(doc)
    except Exception:
        logger.exception("Failed to persist assessment test %s", test_id)
    return test_id


async def save_assessment_evaluation(
    *,
    test_id: str | None,
    user_id: str,
    overall_score: float,
    skill_evaluations: list[dict[str, Any]],
    verified_skills: list[str],
    feedback: str,
) -> None:
    """Saves evaluation results and updates the verified skills for the student."""
    db = get_database()
    now = datetime.now(timezone.utc)

    # 1. Update assessment record if test_id exists
    if test_id:
        try:
            await db[ASSESSMENTS_COLLECTION].update_one(
                {"_id": test_id},
                {
                    "$set": {
                        "status": "completed",
                        "score": overall_score,
                        "skill_evaluations": skill_evaluations,
                        "feedback": feedback,
                        "evaluated_at": now,
                    }
                },
            )
        except Exception:
            logger.exception("Failed to update assessment record %s", test_id)

    # 2. Record in verified_skills collection
    try:
        for skill_eval in skill_evaluations:
            skill_name = skill_eval.get("skill", "").strip().lower()
            if not skill_name:
                continue
            is_verified = skill_eval.get("verified", False) or (skill_eval.get("score", 0) >= 60)
            verified_doc = {
                "user_id": user_id,
                "skill": skill_name,
                "score": skill_eval.get("score", 0),
                "proficiency_level": skill_eval.get("proficiency_level", "competent"),
                "is_verified": is_verified,
                "verified_at": now,
                "feedback": skill_eval.get("feedback", ""),
            }
            await db[VERIFIED_SKILLS_COLLECTION].update_one(
                {"user_id": user_id, "skill": skill_name},
                {"$set": verified_doc},
                upsert=True,
            )
    except Exception:
        logger.exception("Failed to update verified_skills collection for user %s", user_id)

    # 3. Update candidate document in candidates collection
    try:
        candidate = await db[CANDIDATES_COLLECTION].find_one({"user_id": user_id})
        if candidate:
            existing_verified = set(candidate.get("verified_skills", []))
            existing_verified.update(s.lower() for s in verified_skills)
            await db[CANDIDATES_COLLECTION].update_one(
                {"user_id": user_id},
                {
                    "$set": {
                        "verified_skills": sorted(existing_verified),
                        "latest_assessment_score": overall_score,
                        "last_assessed_at": now,
                    }
                },
            )
    except Exception:
        logger.exception("Failed to update candidate record %s with verified skills", user_id)


async def get_verified_skills(user_id: str) -> list[dict[str, Any]]:
    """Retrieves all verified skills for a candidate."""
    db = get_database()
    cursor = db[VERIFIED_SKILLS_COLLECTION].find({"user_id": user_id, "is_verified": True})
    results = await cursor.to_list(length=100)
    for doc in results:
        doc["_id"] = str(doc["_id"])
    return results
