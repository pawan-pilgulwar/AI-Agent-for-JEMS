"""Shared Motor (async MongoDB) client + Atlas Vector Search index helper.

Design decision (documented further in README): candidate embeddings are stored
as a field directly on each candidate's existing document in the `candidates`
collection, rather than in a separate `candidate_embeddings` collection. This
keeps a single source of truth per candidate and avoids a join/lookup at query
time -- `$vectorSearch` runs directly against `candidates`. If the candidate
pool grows large enough that re-embedding on every profile edit becomes
expensive, splitting embeddings into their own collection keyed by user_id is
the natural next step, but it is not needed at this scale.
"""

import logging

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from config import get_settings

logger = logging.getLogger(__name__)

CANDIDATES_COLLECTION = "candidates"
EMBEDDING_FIELD = "profile_embedding"
EMBEDDING_DIMENSIONS = 384  # all-MiniLM-L6-v2 output size

_client: AsyncIOMotorClient | None = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        settings = get_settings()
        _client = AsyncIOMotorClient(settings.mongodb_uri)
    return _client


def get_database() -> AsyncIOMotorDatabase:
    settings = get_settings()
    return get_client()[settings.mongodb_db_name]


async def ensure_vector_index() -> None:
    """Best-effort creation of the Atlas Vector Search index on startup.

    Atlas Search/Vector Search indexes are normally created once via the
    Atlas UI or Atlas Admin API (see README) -- M0 free-tier clusters do not
    always expose driver-based `createSearchIndex` support. This helper tries
    the driver call and logs a warning (never raises) if it isn't available,
    so the service still starts up cleanly and the index can be created
    manually instead.
    """
    settings = get_settings()
    db = get_database()
    collection = db[CANDIDATES_COLLECTION]

    index_model = {
        "name": settings.vector_index_name,
        "type": "vectorSearch",
        "definition": {
            "fields": [
                {
                    "type": "vector",
                    "path": EMBEDDING_FIELD,
                    "numDimensions": EMBEDDING_DIMENSIONS,
                    "similarity": "cosine",
                },
                {
                    "type": "filter",
                    "path": "user_id",
                },
            ]
        },
    }

    try:
        existing = await collection.list_search_indexes().to_list(length=None)
        if any(idx.get("name") == settings.vector_index_name for idx in existing):
            logger.info("Vector search index '%s' already exists.", settings.vector_index_name)
            return
        await collection.create_search_index(index_model)
        logger.info("Created vector search index '%s'.", settings.vector_index_name)
    except Exception as exc:  # noqa: BLE001 - best-effort, never block startup
        logger.warning(
            "Could not auto-create Atlas Vector Search index '%s' (%s). "
            "Create it manually via the Atlas UI or Admin API -- see README.",
            settings.vector_index_name,
            exc,
        )
