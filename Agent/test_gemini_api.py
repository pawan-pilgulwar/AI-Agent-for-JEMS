"""Send a small test prompt to Gemini using the project's existing API settings."""

from __future__ import annotations

import os
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
DEFAULT_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"
DEFAULT_MODEL = "gemini-3.8-flash"
FALLBACK_MODELS = ("gemini-3.5-flash-lite",)


def load_project_env() -> None:
    """Load unset variables from the project .env file without requiring python-dotenv."""
    env_file = ROOT / ".env"
    if not env_file.is_file():
        return

    for line in env_file.read_text(encoding="utf-8-sig").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[len("export ") :].lstrip()
        name, separator, value = line.partition("=")
        name = name.strip()
        value = value.strip()
        if separator and name and name not in os.environ:
            if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
                value = value[1:-1]
            os.environ[name] = value


def _first_setting(*names: str, default: str) -> str:
    for name in names:
        value = os.getenv(name, "").strip()
        if value:
            return value
    return default


def _provider_error(exc: Exception) -> str:
    body = getattr(exc, "body", None)
    if isinstance(body, list) and body:
        body = body[0]
    if isinstance(body, dict):
        body = body.get("error", body)
        if isinstance(body, dict) and body.get("message"):
            return str(body["message"])
    return str(exc)


def _get_api_keys() -> tuple[list[str], str]:
    """Read Google and legacy project key variables without modifying key contents."""
    for name in ("GEMINI_API_KEY", "GOOGLE_API_KEY", "LLM_API_KEY", "LLM_API_KEYS"):
        value = os.getenv(name, "").strip()
        if value:
            keys = list(dict.fromkeys(key.strip() for key in value.split(",") if key.strip()))
            if keys:
                return keys, name
    return [], ""


def main() -> int:
    load_project_env()

    try:
        from openai import (
            APIConnectionError,
            APIStatusError,
            AuthenticationError,
            NotFoundError,
            OpenAI,
            PermissionDeniedError,
            RateLimitError,
        )
    except ImportError:
        print("The OpenAI Python client is not installed.")
        print("Install it with: py -m pip install openai")
        return 1

    keys, key_source = _get_api_keys()
    if not keys:
        print(
            "No API key found. Set GEMINI_API_KEY, GOOGLE_API_KEY, "
            "LLM_API_KEY or LLM_API_KEYS in the project .env file."
        )
        return 1

    base_url = _first_setting("PREREQS_URL", "LLM_URL", default=DEFAULT_URL)
    model = _first_setting("PREREQS_MODEL", "LLM_MODEL", default=DEFAULT_MODEL)
    models = [model]
    if "generativelanguage.googleapis.com" in base_url:
        models.extend(candidate for candidate in FALLBACK_MODELS if candidate not in models)

    print(f"Testing Gemini API at {base_url}")
    key_type = "AQ authorization-format" if keys[0].startswith("AQ.") else "standard/other"
    print(f"Using {key_type} key from {key_source}; the key is passed unchanged.")
    client = OpenAI(base_url=base_url, api_key=keys[0], timeout=45, max_retries=1)

    for index, model_name in enumerate(models):
        try:
            response = client.chat.completions.create(
                model=model_name,
                messages=[
                    {
                        "role": "user",
                        "content": "Reply with one short sentence confirming you received this test.",
                    }
                ],
            )
            reply = response.choices[0].message.content
            print(f"Connected successfully. Model: {model_name}")
            print(f"Model reply: {reply or '[empty response]'}")
            return 0
        except NotFoundError as exc:
            if index == len(models) - 1:
                print(f"Model unavailable: {_provider_error(exc)}")
                print("Set LLM_MODEL to a model available to this API key/project.")
                return 1
            print(f"Model {model_name!r} unavailable; trying the next configured Gemini model.")
        except AuthenticationError as exc:
            print(f"Authentication failed: {_provider_error(exc)}")
            print("Check that the API key is current and belongs to an enabled Gemini API project.")
            return 1
        except PermissionDeniedError as exc:
            print(f"Google denied access to this project: {_provider_error(exc)}")
            print("A different key in the same denied project may not resolve this.")
            return 1
        except RateLimitError as exc:
            print(f"API quota or rate limit reached: {_provider_error(exc)}")
            return 1
        except APIConnectionError as exc:
            cause = exc.__cause__
            detail = f" ({type(cause).__name__}: {cause})" if cause else ""
            print(f"Could not connect to the API endpoint: {exc}{detail}")
            print("Check internet access, DNS, proxy/VPN settings, and the configured URL.")
            return 1
        except APIStatusError as exc:
            print(f"API returned HTTP {exc.status_code}: {_provider_error(exc)}")
            return 1

    return 1


if __name__ == "__main__":
    sys.exit(main())
