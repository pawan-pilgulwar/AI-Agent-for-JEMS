"""Stage-1 (deterministic) candidate retrieval via MongoDB Atlas Vector Search.

The Next.js backend passes the candidate pool directly in the request body
rather than by reference, so this tool first upserts each candidate's profile
embedding into the `candidates` collection (keyed by `user_id`), then runs a
`$vectorSearch` aggregation -- filtered down to just this request's candidate
pool -- to retrieve the top-N most similar candidates. No cosine similarity is
computed in Python; ranking is done entirely by the `$vectorSearch` stage.
"""

from typing import Any

from config import get_settings
from db.mongo_client import CANDIDATES_COLLECTION, EMBEDDING_FIELD, get_database
from tools.embedding_tool import EmbeddingTool


def _candidate_user_id(candidate: dict[str, Any]) -> str:
    return str(candidate.get("user_id") or candidate.get("id") or candidate.get("_id"))


def _candidate_text(candidate: dict[str, Any]) -> str:
    parts = [
        candidate.get("resume_text", ""),
        " ".join(candidate.get("skills", []) or []),
        candidate.get("summary", ""),
    ]
    return "\n".join(p for p in parts if p)


class VectorSearchTool:
    def __init__(self) -> None:
        self.embedder = EmbeddingTool()

    async def upsert_candidate_embeddings(self, candidates: list[dict[str, Any]]) -> list[str]:
        """Embeds and upserts each candidate's profile text. Returns the list
        of user_ids upserted, to be used as the vector search filter."""
        db = get_database()
        collection = db[CANDIDATES_COLLECTION]

        texts = [_candidate_text(c) for c in candidates]
        embeddings = self.embedder.embed_batch(texts)

        user_ids: list[str] = []
        for candidate, embedding in zip(candidates, embeddings):
            user_id = _candidate_user_id(candidate)
            user_ids.append(user_id)
            doc = dict(candidate)
            doc["user_id"] = user_id
            doc[EMBEDDING_FIELD] = embedding
            await collection.update_one({"user_id": user_id}, {"$set": doc}, upsert=True)

        return user_ids

    async def top_n_candidates(
        self, query_text: str, candidate_user_ids: list[str], top_n: int | None = None
    ) -> list[dict[str, Any]]:
        settings = get_settings()
        top_n = top_n or settings.match_top_n

        db = get_database()
        collection = db[CANDIDATES_COLLECTION]
        query_vector = self.embedder.embed(query_text)

        pipeline = [
            {
                "$vectorSearch": {
                    "index": settings.vector_index_name,
                    "path": EMBEDDING_FIELD,
                    "queryVector": query_vector,
                    "filter": {"user_id": {"$in": candidate_user_ids}},
                    "numCandidates": max(top_n * 10, 100),
                    "limit": top_n,
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "user_id": 1,
                    "resume_text": 1,
                    "skills": 1,
                    "summary": 1,
                    "vector_score": {"$meta": "vectorSearchScore"},
                }
            },
        ]

        cursor = collection.aggregate(pipeline)
        return await cursor.to_list(length=top_n)
