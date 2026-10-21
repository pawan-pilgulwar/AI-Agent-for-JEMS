
import os, json, re, time, threading, itertools
from openai import (OpenAI, NotFoundError, RateLimitError, PermissionDeniedError, AuthenticationError,
                    BadRequestError, APIStatusError, APIConnectionError, APITimeoutError)


class LLMUnavailable(RuntimeError):
    """Every configured key was rejected or rate-limited by the provider."""


# One or more API keys, comma-separated. When a key hits its rate limit (HTTP 429) or is
# rejected (HTTP 400/401/403), the call is retried with the next key. A single key in LLM_API_KEY or
# GEMINI_API_KEY also works. Both Gemini key formats (classic "AIza..." and newer "AQ....") are passed
# to Google exactly as given; there is no prefix check.
KEYS = [k.strip() for k in (os.getenv("LLM_API_KEYS") or os.getenv("LLM_API_KEY")
                            or os.getenv("GEMINI_API_KEY") or "").split(",") if k.strip()]
_next_key = itertools.count()

# The roadmap agent fans out ~30 calls at once, far above Gemini's free-tier per-minute limit.
# Cap how many requests are in flight, and on a 429 wait (as long as Google asks) and try again.
_slots = threading.BoundedSemaphore(int(os.getenv("LLM_MAX_CONCURRENCY", "3")))
RATE_LIMIT_RETRIES = int(os.getenv("LLM_RATE_LIMIT_RETRIES", "4"))
# Seconds to wait for one reply. A stalled call moves on to the next model/key instead of hanging
# the request (the UI gives up after a few minutes).
REQUEST_TIMEOUT = float(os.getenv("LLM_TIMEOUT", "120"))

# (key, model) -> time.time() when its daily quota resets. Skipped until then, so an exhausted main
# model does not cost a wasted round trip before every fallback call.
_exhausted = {}

# Default: Google Gemini through its OpenAI-compatible endpoint (no GPU needed).
DEFAULT_URL = os.getenv("LLM_URL", "https://generativelanguage.googleapis.com/v1beta/openai/")
DEFAULT_MODEL = os.getenv("LLM_MODEL", "gemini-3.8-flash")
# Tried in order when the main model is overloaded (503), out of quota (429) or missing (404).
# Override with LLM_FALLBACK_MODELS (comma-separated).
FALLBACK_MODELS = [m.strip() for m in os.getenv("LLM_FALLBACK_MODELS", "gemini-3.5-flash-lite").split(",")
                   if m.strip()]


def _cfg(url_var, model_var):
    return (os.getenv(url_var, DEFAULT_URL), os.getenv(model_var, DEFAULT_MODEL))


# agent name -> (base_url, model_name). Override per agent with e.g. CODING_MODEL=...
AGENTS = {
    "prereqs":    _cfg("PREREQS_URL", "PREREQS_MODEL"),
    "profile":    _cfg("PROFILE_URL", "PROFILE_MODEL"),
    "roadmap":    _cfg("ROADMAP_URL", "ROADMAP_MODEL"),
    "assessment": _cfg("ASSESS_URL", "ASSESS_MODEL"),    # writes MCQ, multi-select, short-answer questions
    "coding":     _cfg("CODING_URL", "CODING_MODEL"),    # writes coding problems (a code model fits best)
    "grader":     _cfg("GRADER_URL", "GRADER_MODEL"),    # checks written answers against key points
    "match":      _cfg("MATCH_URL", "MATCH_MODEL"),
}

# The request is a plain chat call, the same as test_gemini_api.py. Gemini's OpenAI-compatible
# endpoint rejects many JSON schemas in response_format with HTTP 400, so the schema goes into
# the prompt instead and the JSON is parsed from the reply text.
JSON_RULES = (
    "\n\nOUTPUT FORMAT: Reply with ONE JSON object and nothing else: no markdown, no code fences, no "
    "explanation. It must match this JSON Schema (include every required field):\n"
)


def call_agent(agent, system, user, schema, temperature=0.2):
    if not KEYS:
        raise RuntimeError("No LLM API key set. Put your key(s) in LLM_API_KEYS (comma-separated) "
                           "or GEMINI_API_KEY.")
    url, model = AGENTS[agent]
    model_names = list(dict.fromkeys([model, *FALLBACK_MODELS]))
    messages = [
        {"role": "system", "content": system + JSON_RULES + json.dumps(schema)},
        {"role": "user", "content": user},
    ]
    start = next(_next_key)  # spread load across keys, round-robin
    failures = []
    for i in range(len(KEYS)):
        key = KEYS[(start + i) % len(KEYS)]
        key_label = f"key #{(start + i) % len(KEYS) + 1} (...{key[-4:]})"
        client = OpenAI(base_url=url, api_key=key, timeout=REQUEST_TIMEOUT, max_retries=0)
        for model_name in model_names:
            until = _exhausted.get((key, model_name), 0)
            if until > time.time():
                failures.append(f"{key_label}: {model_name} out of daily quota for {int(until - time.time())}s more")
                continue
            try:
                for _ in range(2):  # one retry if the reply is not valid JSON
                    r = _create(client, model=model_name, temperature=temperature, messages=messages)
                    data = _parse_json(r.choices[0].message.content)
                    if data is not None:
                        return data
                failures.append(f"{key_label}: {model_name} did not return valid JSON")
            except NotFoundError as exc:
                failures.append(f"{model_name}: not found - {_error_message(exc)}")
            except BadRequestError as exc:
                msg = _error_message(exc)
                # Gemini reports a bad or expired key as HTTP 400: "API key not valid" for AIza... keys,
                # "Invalid Auth key" for AQ.... keys.
                if re.search(r"api key|auth key|authorization", msg, re.I):
                    failures.append(f"{key_label}: rejected (400) - {msg}")
                    break
                failures.append(f"{key_label}: {model_name} rejected the request (400) - {msg}")
            except RateLimitError as exc:
                # Gemini quotas are per model, so the next model on the same key may still work.
                delay = _retry_delay(_error_message(exc), 0)
                if delay > 60:
                    _exhausted[(key, model_name)] = time.time() + delay
                failures.append(f"{key_label}: {model_name} rate limited (429) - {_error_message(exc)}")
            except (PermissionDeniedError, AuthenticationError) as exc:
                # 403 "Your project has been denied access" is a block on the whole Google Cloud
                # project, so every key created in that project fails the same way.
                failures.append(f"{key_label}: rejected ({exc.status_code}) - {_error_message(exc)}")
                break
            except APIStatusError as exc:
                failures.append(f"{key_label}: {model_name} HTTP {exc.status_code} - {_error_message(exc)}")
            except APITimeoutError:
                failures.append(f"{key_label}: {model_name} timed out after {REQUEST_TIMEOUT:.0f}s")
            except APIConnectionError as exc:
                raise LLMUnavailable(f"Could not reach {url}: {exc.__cause__ or exc}")
    raise LLMUnavailable(f"LLM call for '{agent}' failed at {url}: " + "; ".join(failures))


def _create(client, **kwargs):
    """chat.completions.create with a concurrency cap and waiting out per-minute rate limits."""
    for attempt in range(RATE_LIMIT_RETRIES + 1):
        try:
            with _slots:
                return client.chat.completions.create(**kwargs)
        except RateLimitError as exc:
            delay = _retry_delay(_error_message(exc), attempt)
            # A daily quota ("retry in 5h25m...") will not reset by waiting a minute, so fail fast on it.
            if attempt == RATE_LIMIT_RETRIES or delay > 60:
                raise
            time.sleep(delay)


def _retry_delay(msg, attempt):
    """Seconds Gemini asks us to wait, e.g. "Please retry in 23.4s." or "retry in 5h25m21.3s"."""
    backoff = 5 * 2 ** attempt   # 5, 10, 20, 40s: spans a full per-minute quota window
    m = re.search(r"retry in ((?:[\d.]+(?:ms|[hms])\s*)+)", msg, re.I)
    if not m:
        return backoff
    units = {"h": 3600, "m": 60, "s": 1, "ms": 0.001}
    asked = sum(float(n) * units[u.lower()]
                for n, u in re.findall(r"([\d.]+)(ms|[hms])", m.group(1), re.I))
    # Google's hint is often far too short while other threads keep using the same quota.
    return max(asked + 1, backoff)


def _parse_json(text):
    """Return the JSON object in the reply, tolerating code fences or text around it."""
    if not text:
        return None
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip())
    try:
        data = json.loads(text)
    except ValueError:
        start, end = text.find("{"), text.rfind("}")
        if start == -1 or end <= start:
            return None
        try:
            data = json.loads(text[start:end + 1])
        except ValueError:
            return None
    return data if isinstance(data, dict) else None


def _error_message(exc):
    body = exc.body
    if isinstance(body, list) and body:
        body = body[0]
    if isinstance(body, dict):
        body = body.get("error", body)
        if isinstance(body, dict):
            return body.get("message", str(body))
    return str(exc)
