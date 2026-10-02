from functools import lru_cache
import os

from crewai import LLM
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    ollama_base_url: str = os.environ.get("OLLAMA_BASE_URL", "http://ollama:11434")
    ollama_model: str = os.environ.get("OLLAMA_MODEL", "qwen3:30b")
    fast_llm_model: str = os.environ.get("FAST_LLM_MODEL", "llama3.2:1b")
    reasoning_llm_model: str = os.environ.get("REASONING_LLM_MODEL", "qwen3:30b")

    embedding_model: str = os.environ.get("EMBEDDING_MODEL", "all-MiniLM-L6-v2")

    mongodb_uri: str = os.environ.get("MONGODB_URI", "mongodb://localhost:27017")
    mongodb_db_name: str = os.environ.get("MONGODB_DB_NAME", "jems")
    vector_index_name: str = os.environ.get("VECTOR_INDEX_NAME", "jems_vector_index")

    match_top_n: int = int(os.environ.get("MATCH_TOP_N", 5))

    rag_top_k: int = int(os.environ.get("RAG_TOP_K", 5))
    scrape_rate_limit_seconds: float = float(os.environ.get("SCRAPE_RATE_LIMIT_SECONDS", 2))
    scrape_user_agent: str = os.environ.get(
        "SCRAPE_USER_AGENT", "JemsBot/1.0 (+https://jems.exponentor.com/bot-info)"
    )
    vector_index_name_companies: str = os.environ.get(
        "VECTOR_INDEX_NAME_COMPANIES", "companies_vector_index"
    )
    vector_index_name_jobs: str = os.environ.get(
        "VECTOR_INDEX_NAME_JOBS", "job_postings_vector_index"
    )
    vector_index_name_registered_companies: str = os.environ.get(
        "VECTOR_INDEX_NAME_REGISTERED_COMPANIES", "registered_companies_vector_index"
    )
    vector_index_name_registered_jobs: str = os.environ.get(
        "VECTOR_INDEX_NAME_REGISTERED_JOBS", "registered_jobs_vector_index"
    )
    vector_index_name_scraped_companies: str = os.environ.get(
        "VECTOR_INDEX_NAME_SCRAPED_COMPANIES", "scraped_companies_vector_index"
    )
    vector_index_name_scraped_jobs: str = os.environ.get(
        "VECTOR_INDEX_NAME_SCRAPED_JOBS", "scraped_jobs_vector_index"
    )

    @property
    def litellm_model(self) -> str:
        """Default CrewAI/LiteLLM provider string."""
        return f"ollama/{self.ollama_model}"

    @property
    def crew_llm(self) -> LLM:
        """The default LLM instance agents should use."""
        return self.get_llm("default")

    def get_llm(self, tier: str = "default") -> LLM:
        """Provides tiered LLM instances via LiteLLM for efficiency:
        - 'fast': for fast extraction, parsing, scraping summaries (e.g. llama3.2:1b)
        - 'reasoning': for deep matching, gap analysis, roadmap, assessment (e.g. qwen3:30b)
        - 'default': standard system model
        """
        if tier == "fast":
            model_name = self.fast_llm_model or self.ollama_model
        elif tier == "reasoning":
            model_name = self.reasoning_llm_model or self.ollama_model
        else:
            model_name = self.ollama_model

        provider_model = model_name if "/" in model_name else f"ollama/{model_name}"
        return LLM(model=provider_model, base_url=self.ollama_base_url)


@lru_cache
def get_settings() -> Settings:
    return Settings()
