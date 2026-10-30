"""Test connectivity to the local vLLM API server."""

import os
import sys
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parent


def load_project_env():
    """Load variables from .env if present."""
    env_file = ROOT / ".env"
    if not env_file.is_file():
        return
    for line in env_file.read_text(encoding="utf-8-sig").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        k, sep, v = line.partition("=")
        if sep and k.strip() and k.strip() not in os.environ:
            val = v.strip().strip("'\"")
            os.environ[k.strip()] = val


def main():
    load_project_env()

    try:
        from openai import OpenAI, APIConnectionError, APIStatusError
    except ImportError:
        print("The OpenAI Python package is required. Run: pip install openai")
        return 1

    # In docker-compose LLM_URL is "http://vllm:8000/v1"; when testing from host, use 127.0.0.1:8000
    base_url = os.getenv("LLM_URL", "http://127.0.0.1:8000/v1")
    if "http://vllm:8000" in base_url:
        base_url = base_url.replace("http://vllm:8000", "http://127.0.0.1:8000")

    model = os.getenv("LLM_MODEL", "vllm")
    api_key = os.getenv("LLM_API_KEY", "EMPTY")

    print(f"Testing vLLM API endpoint: {base_url}")
    print(f"Target model: {model}")

    client = OpenAI(base_url=base_url, api_key=api_key, timeout=30)

    t0 = time.perf_counter()
    try:
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": "Reply with 'vLLM is ready' and nothing else."}],
            max_tokens=20,
        )
        elapsed = time.perf_counter() - t0
        reply = (response.choices[0].message.content or "").strip()
        print(f"Success ({elapsed:.2f}s)!")
        print(f"Model reply: {reply}")
        return 0
    except APIConnectionError as exc:
        print(f"Connection failed: Could not reach {base_url}.")
        print("Make sure the vLLM container is running: docker compose ps")
        return 1
    except APIStatusError as exc:
        print(f"vLLM server error ({exc.status_code}): {getattr(exc, 'message', str(exc))}")
        return 1
    except Exception as exc:
        print(f"Error: {exc}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
