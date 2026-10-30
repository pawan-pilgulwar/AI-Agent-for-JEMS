import os, json, re, time, threading
from openai import OpenAI, BadRequestError, APIConnectionError, APITimeoutError, APIStatusError


class LLMUnavailable(RuntimeError):
    """The local vLLM server or model was unavailable or failed to respond."""


# Unified vLLM server and model configuration
DEFAULT_URL = os.getenv("LLM_URL", "http://vllm:8000/v1")
DEFAULT_MODEL = os.getenv("LLM_MODEL", "vllm")
API_KEY = os.getenv("LLM_API_KEY", "EMPTY")

# GPU concurrency limit & timeouts
_slots = threading.BoundedSemaphore(int(os.getenv("LLM_MAX_CONCURRENCY", "4")))
REQUEST_TIMEOUT = float(os.getenv("LLM_TIMEOUT", "180"))
MAX_RETRIES = int(os.getenv("LLM_RETRIES", "2"))
DEFAULT_MAX_TOKENS = int(os.getenv("LLM_MAX_TOKENS", "2048"))
USE_GUIDED_JSON = os.getenv("LLM_GUIDED_JSON", "1") != "0"

# All agents use the single unified vLLM model
AGENTS = {
    "prereqs":    (DEFAULT_URL, DEFAULT_MODEL),
    "profile":    (DEFAULT_URL, DEFAULT_MODEL),
    "roadmap":    (DEFAULT_URL, DEFAULT_MODEL),
    "assessment": (DEFAULT_URL, DEFAULT_MODEL),
    "coding":     (DEFAULT_URL, DEFAULT_MODEL),
    "grader":     (DEFAULT_URL, DEFAULT_MODEL),
    "match":      (DEFAULT_URL, DEFAULT_MODEL),
    "learning":   (DEFAULT_URL, DEFAULT_MODEL),
}

# Cached OpenAI client
_client = None


def _get_client():
    global _client
    if _client is None:
        _client = OpenAI(base_url=DEFAULT_URL, api_key=API_KEY, timeout=REQUEST_TIMEOUT, max_retries=0)
    return _client


JSON_RULES = (
    "\n\nOUTPUT FORMAT: Reply with ONE JSON object and nothing else: no markdown, no code fences, no "
    "explanation. It must match this JSON Schema (include every required field):\n"
)


def call_agent(agent, system, user, schema, temperature=0.2):
    client = _get_client()

    messages = [
        {"role": "system", "content": system + JSON_RULES + json.dumps(schema)},
        {"role": "user", "content": user},
    ]

    max_tokens = int(os.getenv(f"{agent.upper()}_MAX_TOKENS", str(DEFAULT_MAX_TOKENS)))
    extra = {"max_tokens": max_tokens}
    if USE_GUIDED_JSON:
        extra["response_format"] = {"type": "json_schema", "json_schema": {"name": agent, "schema": schema}}

    for attempt in range(MAX_RETRIES + 1):
        try:
            with _slots:
                try:
                    r = client.chat.completions.create(
                        model=DEFAULT_MODEL,
                        temperature=temperature,
                        messages=messages,
                        **extra
                    )
                except BadRequestError as exc:
                    # If guided decoding failed due to schema syntax in vLLM, retry without response_format
                    if "response_format" in extra:
                        extra_fallback = {"max_tokens": max_tokens}
                        r = client.chat.completions.create(
                            model=DEFAULT_MODEL,
                            temperature=temperature,
                            messages=messages,
                            **extra_fallback
                        )
                    else:
                        raise

            data = _parse_json(r.choices[0].message.content)
            if data is not None:
                return data

            if attempt < MAX_RETRIES:
                time.sleep(1)
                continue
            raise LLMUnavailable(f"Model '{DEFAULT_MODEL}' at {DEFAULT_URL} did not return valid JSON.")

        except APIConnectionError as exc:
            raise LLMUnavailable(f"Could not reach vLLM server at {DEFAULT_URL}: {exc.__cause__ or exc}. "
                                 f"Ensure the vLLM container is running and healthy.")
        except APITimeoutError:
            raise LLMUnavailable(f"vLLM request timed out after {REQUEST_TIMEOUT:.0f}s for agent '{agent}'.")
        except APIStatusError as exc:
            raise LLMUnavailable(f"vLLM server error ({exc.status_code}): {_error_message(exc)}")

    raise LLMUnavailable(f"LLM call for '{agent}' failed after {MAX_RETRIES} attempts.")


def _parse_json(text):
    """Extract and parse the JSON object from the model output."""
    if not text:
        return None
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip())
    try:
        data = json.loads(cleaned)
        return data if isinstance(data, dict) else None
    except ValueError:
        start, end = cleaned.find("{"), cleaned.rfind("}")
        if start != -1 and end > start:
            try:
                data = json.loads(cleaned[start:end + 1])
                return data if isinstance(data, dict) else None
            except ValueError:
                return None
    return None


def _error_message(exc):
    body = getattr(exc, "body", None)
    if isinstance(body, list) and body:
        body = body[0]
    if isinstance(body, dict):
        body = body.get("error", body)
        if isinstance(body, dict):
            return body.get("message", str(body))
    return str(exc)
