"""Shared helper for pulling a JSON object out of an LLM's raw text output.

Small open-source models don't reliably emit *only* JSON even when asked to --
they sometimes wrap it in prose or a markdown code fence. This extracts the
first top-level {...} block and parses it, raising ValueError on failure so
callers can turn it into a clean 502 instead of a raw traceback.
"""

import json
import re


def extract_json_object(text: str) -> dict:
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    candidate = fenced.group(1) if fenced else None

    if candidate is None:
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            candidate = text[start : end + 1]

    if candidate is None:
        raise ValueError("No JSON object found in LLM output")

    return json.loads(candidate)
