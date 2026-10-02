import logging
import re
from typing import Any, Literal

from config import get_settings
from db.mongo_client import (
    COMPANIES_COLLECTION,
    COMPANY_EMBEDDING_FIELD,
    JOB_EMBEDDING_FIELD,
    JOB_POSTINGS_COLLECTION,
    REGISTERED_COMPANIES_COLLECTION,
    REGISTERED_JOBS_COLLECTION,
    SCRAPED_COMPANIES_COLLECTION,
    SCRAPED_JOBS_COLLECTION,
    get_database,
)
from tools.embedding_tool import EmbeddingTool

logger = logging.getLogger(__name__)

COMPANY_PROJECTION = {
    "_id": 1,
    "domain": 1,
    "company_name": 1,
    "industry": 1,
    "company_size": 1,
    "tech_stack": 1,
    "locations": 1,
    "description": 1,
    "source_type": 1,
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
    "source_type": 1,
    "status": 1,
}


class RagRetrievalTool:
    def __init__(self) -> None:
        self.embedder = EmbeddingTool()

    async def _query_collection_vector_search(
        self,
        collection_name: str,
        index_name: str,
        embedding_field: str,
        query_vector: list[float],
        projection: dict[str, Any],
        top_k: int,
        filter_dict: dict[str, Any] | None = None,
        source_label: str = "general",
    ) -> list[dict[str, Any]]:
        db = get_database()
        collection = db[collection_name]

        vector_search_stage: dict[str, Any] = {
            "index": index_name,
            "path": embedding_field,
            "queryVector": query_vector,
            "numCandidates": max(top_k * 10, 100),
            "limit": top_k,
        }
        if filter_dict:
            vector_search_stage["filter"] = filter_dict

        pipeline = [
            {"$vectorSearch": vector_search_stage},
            {"$project": {**projection, "score": {"$meta": "vectorSearchScore"}}},
        ]

        try:
            cursor = collection.aggregate(pipeline)
            results = await cursor.to_list(length=top_k)
            for doc in results:
                doc["_id"] = str(doc["_id"])
                if "source_type" not in doc:
                    doc["source_type"] = source_label
            return results
        except Exception as exc:
            # Fallback for environments where Atlas Vector Index is not yet provisioned
            logger.debug(
                "Atlas vector search on %s failed (%s), falling back to standard find",
                collection_name,
                exc,
            )
            query = filter_dict or {}
            cursor = collection.find(query, projection).limit(top_k)
            fallback_results = await cursor.to_list(length=top_k)
            for doc in fallback_results:
                doc["_id"] = str(doc["_id"])
                doc["score"] = 0.5
                if "source_type" not in doc:
                    doc["source_type"] = source_label
            return fallback_results

    async def retrieve_jobs(
        self,
        query_text: str,
        top_k: int | None = None,
        only_open: bool = True,
        scope: Literal["both", "registered", "scraped"] = "both",
    ) -> list[dict[str, Any]]:
        """Retrieve relevant jobs from registered companies, scraped companies, or both."""
        settings = get_settings()
        top_k = top_k or settings.rag_top_k
        query_vector = self.embedder.embed(query_text)
        filter_dict = {"status": "open"} if only_open else None

        results: list[dict[str, Any]] = []

        if scope in ("both", "registered"):
            reg_jobs = await self._query_collection_vector_search(
                collection_name=REGISTERED_JOBS_COLLECTION,
                index_name=settings.vector_index_name_registered_jobs,
                embedding_field=JOB_EMBEDDING_FIELD,
                query_vector=query_vector,
                projection=JOB_PROJECTION,
                top_k=top_k,
                filter_dict=filter_dict,
                source_label="registered",
            )
            results.extend(reg_jobs)

        if scope in ("both", "scraped"):
            scraped_jobs = await self._query_collection_vector_search(
                collection_name=SCRAPED_JOBS_COLLECTION,
                index_name=settings.vector_index_name_scraped_jobs,
                embedding_field=JOB_EMBEDDING_FIELD,
                query_vector=query_vector,
                projection=JOB_PROJECTION,
                top_k=top_k,
                filter_dict=filter_dict,
                source_label="scraped",
            )
            results.extend(scraped_jobs)

        # Also fallback to legacy job_postings collection if new collections returned nothing
        if not results:
            legacy_jobs = await self._query_collection_vector_search(
                collection_name=JOB_POSTINGS_COLLECTION,
                index_name=settings.vector_index_name_jobs,
                embedding_field=JOB_EMBEDDING_FIELD,
                query_vector=query_vector,
                projection=JOB_PROJECTION,
                top_k=top_k,
                filter_dict=filter_dict,
                source_label="legacy",
            )
            results.extend(legacy_jobs)

        # Deduplicate and sort by score descending
        deduped = {}
        for item in results:
            item_id = item.get("_id")
            if item_id not in deduped or item.get("score", 0) > deduped[item_id].get("score", 0):
                deduped[item_id] = item

        sorted_results = sorted(deduped.values(), key=lambda x: x.get("score", 0), reverse=True)
        return sorted_results[:top_k]

    async def retrieve_companies(
        self,
        query_text: str,
        top_k: int | None = None,
        scope: Literal["both", "registered", "scraped"] = "both",
    ) -> list[dict[str, Any]]:
        """Retrieve relevant companies from registered companies, scraped companies, or both."""
        settings = get_settings()
        top_k = top_k or settings.rag_top_k
        query_vector = self.embedder.embed(query_text)

        results: list[dict[str, Any]] = []

        if scope in ("both", "registered"):
            reg_companies = await self._query_collection_vector_search(
                collection_name=REGISTERED_COMPANIES_COLLECTION,
                index_name=settings.vector_index_name_registered_companies,
                embedding_field=COMPANY_EMBEDDING_FIELD,
                query_vector=query_vector,
                projection=COMPANY_PROJECTION,
                top_k=top_k,
                source_label="registered",
            )
            results.extend(reg_companies)

        if scope in ("both", "scraped"):
            scraped_companies = await self._query_collection_vector_search(
                collection_name=SCRAPED_COMPANIES_COLLECTION,
                index_name=settings.vector_index_name_scraped_companies,
                embedding_field=COMPANY_EMBEDDING_FIELD,
                query_vector=query_vector,
                projection=COMPANY_PROJECTION,
                top_k=top_k,
                source_label="scraped",
            )
            results.extend(scraped_companies)

        if not results:
            legacy_companies = await self._query_collection_vector_search(
                collection_name=COMPANIES_COLLECTION,
                index_name=settings.vector_index_name_companies,
                embedding_field=COMPANY_EMBEDDING_FIELD,
                query_vector=query_vector,
                projection=COMPANY_PROJECTION,
                top_k=top_k,
                source_label="legacy",
            )
            results.extend(legacy_companies)

        deduped = {}
        for item in results:
            item_id = item.get("_id")
            if item_id not in deduped or item.get("score", 0) > deduped[item_id].get("score", 0):
                deduped[item_id] = item

        sorted_results = sorted(deduped.values(), key=lambda x: x.get("score", 0), reverse=True)
        return sorted_results[:top_k]

    async def find_company_by_name(self, company_name: str) -> dict[str, Any] | None:
        """Looks up company by name across registered, scraped, and legacy collections."""
        db = get_database()
        pattern = f"^{re.escape(company_name.strip())}$"
        query = {"company_name": {"$regex": pattern, "$options": "i"}}

        # Check registered first
        doc = await db[REGISTERED_COMPANIES_COLLECTION].find_one(query)
        if doc is not None:
            doc["_id"] = str(doc["_id"])
            doc["source_type"] = "registered"
            return doc

        # Then scraped
        doc = await db[SCRAPED_COMPANIES_COLLECTION].find_one(query)
        if doc is not None:
            doc["_id"] = str(doc["_id"])
            doc["source_type"] = "scraped"
            return doc

        # Fallback to legacy
        doc = await db[COMPANIES_COLLECTION].find_one(query)
        if doc is not None:
            doc["_id"] = str(doc["_id"])
            doc["source_type"] = "legacy"
            return doc

        return None
