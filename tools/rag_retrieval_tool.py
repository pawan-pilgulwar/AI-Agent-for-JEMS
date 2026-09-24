"""Shared RAG retrieval used by all four agents to ground output in real,
ingested data instead of LLM recall.

Embeds a text query with the same `tools/embedding_tool.py` model used
everywhere else, then runs `$vectorSearch` against `companies` and/or
`job_postings` (populated by `db/company_store.py` via the Company
Intelligence Agent ingestion flow) to return the top-k most relevant real
documents. No ranking happens in Python -- Atlas does it, same as
`tools/vector_search_tool.py`.
"""

import re
from typing import Any

from config import get_settings
from db.mongo_client import (
    COMPANIES_COLLECTION,
    COMPANY_EMBEDDING_FIELD,
    JOB_EMBEDDING_FIELD,
    JOB_POSTINGS_COLLECTION,
    get_database,
)
from tools.embedding_tool import EmbeddingTool

COMPANY_PROJECTION = {
    "_id": 1,
    "domain": 1,
    "company_name": 1,
    "industry": 1,
    "company_size": 1,
    "tech_stack": 1,
    "locations": 1,
    "description": 1,
}

JOB_PROJECTION = {
    "_id": 1,
    "company_id": 1,
    "company_name": 1,
    "title": 1,
    "description": 1,
    "required_skills": 1,
    "nice_to_have_skills": 1,
    "experience_level": 1,
    "location": 1,
    "employment_type": 1,
    "source_url": 1,
    "status": 1,
}


class RagRetrievalTool:
    def __init__(self) -> None:
        self.embedder = EmbeddingTool()

    async def retrieve_jobs(
        self, query_text: str, top_k: int | None = None, only_open: bool = True
    ) -> list[dict[str, Any]]:
        settings = get_settings()
        top_k = top_k or settings.rag_top_k

        db = get_database()
        collection = db[JOB_POSTINGS_COLLECTION]
        query_vector = self.embedder.embed(query_text)

        vector_search_stage: dict[str, Any] = {
            "index": settings.vector_index_name_jobs,
            "path": JOB_EMBEDDING_FIELD,
            "queryVector": query_vector,
            "numCandidates": max(top_k * 10, 100),
            "limit": top_k,
        }
        if only_open:
            vector_search_stage["filter"] = {"status": "open"}

        pipeline = [
            {"$vectorSearch": vector_search_stage},
            {"$project": {**JOB_PROJECTION, "score": {"$meta": "vectorSearchScore"}}},
        ]

        cursor = collection.aggregate(pipeline)
        results = await cursor.to_list(length=top_k)
        for doc in results:
            doc["_id"] = str(doc["_id"])
        return results

    async def retrieve_companies(self, query_text: str, top_k: int | None = None) -> list[dict[str, Any]]:
        settings = get_settings()
        top_k = top_k or settings.rag_top_k

        db = get_database()
        collection = db[COMPANIES_COLLECTION]
        query_vector = self.embedder.embed(query_text)

        pipeline = [
            {
                "$vectorSearch": {
                    "index": settings.vector_index_name_companies,
                    "path": COMPANY_EMBEDDING_FIELD,
                    "queryVector": query_vector,
                    "numCandidates": max(top_k * 10, 100),
                    "limit": top_k,
                }
            },
            {"$project": {**COMPANY_PROJECTION, "score": {"$meta": "vectorSearchScore"}}},
        ]

        cursor = collection.aggregate(pipeline)
        results = await cursor.to_list(length=top_k)
        for doc in results:
            doc["_id"] = str(doc["_id"])
        return results

    async def find_company_by_name(self, company_name: str) -> dict[str, Any] | None:
        """Exact-ish (case-insensitive) lookup used by the Requirements Analyzer
        to cross-check the *specific* company a job description names, rather
        than a semantic nearest-neighbor match."""
        db = get_database()
        collection = db[COMPANIES_COLLECTION]
        pattern = f"^{re.escape(company_name.strip())}$"
        doc = await collection.find_one({"company_name": {"$regex": pattern, "$options": "i"}})
        if doc is not None:
            doc["_id"] = str(doc["_id"])
        return doc
