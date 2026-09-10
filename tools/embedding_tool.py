"""Generates text embeddings via a local sentence-transformers model.

This runs entirely on CPU and requires no API key. Used both to embed
candidate profile/resume text (written to MongoDB alongside each candidate
document) and to embed parsed job requirements at query time for
`$vectorSearch`.
"""

from functools import lru_cache

from sentence_transformers import SentenceTransformer

from config import get_settings


@lru_cache
def _load_model() -> SentenceTransformer:
    settings = get_settings()
    return SentenceTransformer(settings.embedding_model)


class EmbeddingTool:
    """Thin wrapper around a lazily-loaded, process-wide SentenceTransformer."""

    def embed(self, text: str) -> list[float]:
        model = _load_model()
        vector = model.encode(text, normalize_embeddings=True)
        return vector.tolist()

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        model = _load_model()
        vectors = model.encode(texts, normalize_embeddings=True)
        return [v.tolist() for v in vectors]
