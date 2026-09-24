from functools import lru_cache
import os

from crewai import LLM
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    ollama_base_url: str = os.environ.get("OLLAMA_BASE_URL", "http://ollama:11434")
    ollama_model: str = os.environ.get("OLLAMA_MODEL", "llama3.2:1b")

    embedding_model: str = os.environ.get("EMBEDDING_MODEL", "all-MiniLM-L6-v2")

    mongodb_uri: str = os.environ.get("MONGODB_URI", "mongodb://localhost:27017")
    mongodb_db_name: str = os.environ.get("MONGODB_DB_NAME", "jems")
    vector_index_name: str = os.environ.get("VECTOR_INDEX_NAME", "jems_vector_index")

    match_top_n: int = os.environ.get("MATCH_TOP_N", 5)

    rag_top_k: int = os.environ.get("RAG_TOP_K", 5)
    scrape_rate_limit_seconds: float = os.environ.get("SCRAPE_RATE_LIMIT_SECONDS", 2)
    scrape_user_agent: str = os.environ.get(
        "SCRAPE_USER_AGENT", "JemsBot/1.0 (+https://jems.exponentor.com/bot-info)"
    )
    vector_index_name_companies: str = os.environ.get(
        "VECTOR_INDEX_NAME_COMPANIES", "companies_vector_index"
    )
    vector_index_name_jobs: str = os.environ.get(
        "VECTOR_INDEX_NAME_JOBS", "job_postings_vector_index"
    )

    @property
    def litellm_model(self) -> str:
        """CrewAI/LiteLLM provider string. This is the only place a paid model
        (e.g. "anthropic/claude-sonnet-5" or "openai/gpt-4o") needs to be swapped
        in later for production-quality reasoning — nothing else in the
        architecture changes."""
        return f"ollama/{self.ollama_model}"

    @property
    def crew_llm(self) -> LLM:
        """The LLM instance agents should use. Built with an explicit base_url
        so the Ollama endpoint always resolves to `ollama_base_url` (e.g. the
        `ollama` service in docker-compose), regardless of which env var name
        the installed crewai version expects for that override."""
        return LLM(model=self.litellm_model, base_url=self.ollama_base_url)


@lru_cache
def get_settings() -> Settings:
    return Settings()
