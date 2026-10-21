"""Thin helper around Judge0 (the code-execution sandbox)."""
import os
import httpx

JUDGE0_URL = os.getenv("JUDGE0_URL", "http://judge0-server:2358")

# Language ids for Judge0 1.13.1. Check yours with:  GET http://localhost:2358/languages
LANGS = {
    "python": 71,       # Python 3.8.1
    "java": 62,         # OpenJDK 13 (the public class must be named Main)
    "cpp": 54,          # C++ (GCC 9.2.0)
    "c": 50,            # C (GCC 9.2.0)
    "javascript": 63,   # Node.js 12
}
MIN_MEMORY_KB = {LANGS["java"]: 512000, LANGS["javascript"]: 1024000}


class JudgeError(Exception):
    """Judge0 could not be reached or returned something unusable."""


def run_once(language, source_code, stdin="", cpu_time=3.0, memory_kb=256000):
    """Run one program and return its result. Raises ValueError for an unknown language
    and JudgeError if Judge0 itself fails."""
    lang_id = LANGS.get(str(language).lower())
    if lang_id is None:
        raise ValueError(f"Unsupported language '{language}'. Use one of: {', '.join(LANGS)}")
    # Memory is capped per process as address space (cgroup v2 workaround in judge0.conf), and the
    # JVM and V8 reserve far more than they touch, so they need a higher cap just to start.
    memory_kb = max(memory_kb, MIN_MEMORY_KB.get(lang_id, 0))
    payload = {
        "source_code": source_code,
        "language_id": lang_id,
        "stdin": stdin,
        "cpu_time_limit": cpu_time,
        "memory_limit": memory_kb,
    }
    try:
        r = httpx.post(
            f"{JUDGE0_URL}/submissions",
            params={"base64_encoded": "false", "wait": "true"},
            json=payload,
            timeout=60,
        )
        r.raise_for_status()
        d = r.json()
    except (httpx.HTTPError, ValueError) as e:
        raise JudgeError(f"Judge0 request failed: {e}") from e
    return {
        "status_id": d["status"]["id"],          # 3 = ran fine, 5 = time limit, 6 = compile error, 7-12 = runtime error
        "status": d["status"]["description"],
        "stdout": d.get("stdout") or "",
        "stderr": d.get("stderr") or "",
        "compile_output": d.get("compile_output") or "",
        "time": d.get("time"),
        "memory": d.get("memory"),
    }


def normalize(text):
    """Make output comparison fair: ignore trailing spaces and trailing blank lines."""
    lines = (text or "").replace("\r\n", "\n").replace("\r", "\n").strip().split("\n")
    return "\n".join(line.rstrip() for line in lines)