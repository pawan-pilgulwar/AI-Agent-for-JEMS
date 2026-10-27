"""
Learning path agent: turns a roadmap (from /agents/roadmap) into a personal learning path.

  POST /learning/path    roadmap steps + learner      -> one module per step, one lesson per topic
  POST /learning/lesson  one topic + learner          -> narrated video script, quick check, YouTube videos
  POST /learning/notes   one topic + learner          -> structured revision notes
  GET  /learning/health                               -> is the vLLM server up, which model it serves

Every LLM call here goes to the self-hosted vLLM server (agent "learning" in llm.py), never to Gemini.
A small local model finishes small answers reliably, so each answer is kept short: one call per module
for the plan, and separate calls for the slides, the quick check and each half of the notes.

Personalisation comes from the `learner` the app sends, built ONLY from data the app controls:
  level        beginner | intermediate | advanced   (profile, claimed skill level, quiz and test results)
  style        visual | example | handson | theory | mix   (chosen at signup)
  known        subtopics the student has already shown they know -> recapped in one line
  weak         subtopics the student got wrong in a quick check or module test -> re-explained
The module test itself is NOT written here: the app calls /assessment/generate with the plan's test topics,
so it is graded by the same code as every other AI test.
"""
import html
import os
import re
from concurrent.futures import ThreadPoolExecutor
from typing import Literal
from urllib.parse import quote_plus

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict

from assessment import _shuffle_options
from llm import AGENTS, LLMUnavailable, call_agent

router = APIRouter(prefix="/learning", tags=["learning"])

STR = {"type": "string"}
INT = {"type": "integer"}


def arr(x):
    return {"type": "array", "items": x}


Level = Literal["beginner", "intermediate", "advanced"]
Style = Literal["visual", "example", "handson", "theory", "mix"]

LEVEL_GUIDE = {
    "beginner": "BEGINNER: assume no prior knowledge of this skill. Define every term the first time it appears, "
                "use everyday analogies, small steps and one idea per slide.",
    "intermediate": "INTERMEDIATE: knows the basics. Do not define common terms; focus on practical use, real-world "
                    "patterns and best practices.",
    "advanced": "ADVANCED: already comfortable with the basics. Move fast through them and focus on internals, "
                "trade-offs, performance, edge cases and production pitfalls.",
}
STYLE_GUIDE = {
    "visual": "VISUAL learner: describe each idea as a picture or a flow, e.g. 'Browser -> Load balancer -> Server', "
              "and compare things side by side.",
    "example": "EXAMPLE-BASED learner: every concept comes with a tiny concrete example (code, command or worked case).",
    "handson": "HANDS-ON learner: include practical steps the student can try right away in 5 minutes.",
    "theory": "THEORY-FIRST learner: start from definitions and principles, then show where they apply.",
    "mix": "MIXED style: balance a clear explanation, one example and one practical tip.",
}
DEFAULT_MINUTES = {"beginner": 45, "intermediate": 35, "advanced": 25}
TEST_DIFFICULTY = {"beginner": "mixed", "intermediate": "mixed", "advanced": "medium"}

YOUTUBE_KEY = os.getenv("YOUTUBE_API_KEY", "").strip()
VIDEO_ID = re.compile(r"^[A-Za-z0-9_-]{11}$")


# --------------------------------------------------------------------------------------
# Request shapes
# --------------------------------------------------------------------------------------
class Learner(BaseModel):
    level: Level = "beginner"
    style: Style = "mix"
    target_role: str = ""
    known: list[str] = []
    weak: list[str] = []


class TopicIn(BaseModel):
    name: str
    why: str = ""
    subtopics: list[str] = []
    practice: list[str] = []


class StepIn(BaseModel):
    skill: str
    role: str = "prerequisite"
    summary: str = ""
    why_learn: str = ""
    topics: list[TopicIn]
    project: str = ""
    resources: list[str] = []
    level: Level | None = None          # per-module override of learner.level


class PathIn(BaseModel):
    target_skill: str | None = None
    steps: list[StepIn]
    learner: Learner = Learner()
    model_config = ConfigDict(json_schema_extra={"examples": [{
        "target_skill": "Spring Boot",
        "steps": [{"skill": "Core Java", "role": "prerequisite", "summary": "Java language basics.",
                   "topics": [{"name": "Classes and objects", "subtopics": ["fields", "constructors", "methods"]},
                              {"name": "Collections", "subtopics": ["List", "Map", "Set", "iteration"]}]}],
        "learner": {"level": "beginner", "style": "example", "target_role": "Backend Developer"}}]})


class LessonIn(BaseModel):
    skill: str                           # the module (roadmap step) this lesson belongs to
    topic: TopicIn
    learner: Learner = Learner()
    objective: str = ""                  # from the plan, when there is one
    focus: list[str] = []
    videos: bool = True
    model_config = ConfigDict(json_schema_extra={"examples": [{
        "skill": "Core Java",
        "topic": {"name": "Collections", "subtopics": ["List", "Map", "Set", "iteration"],
                  "practice": ["Count word frequencies in a sentence with a HashMap"]},
        "learner": {"level": "beginner", "style": "example", "weak": ["Map"]}}]})


class NotesIn(BaseModel):
    skill: str
    topic: TopicIn
    learner: Learner = Learner()
    focus: list[str] = []
    model_config = ConfigDict(json_schema_extra={"examples": [{
        "skill": "Core Java",
        "topic": {"name": "Collections", "subtopics": ["List", "Map", "Set", "iteration"]},
        "learner": {"level": "intermediate", "style": "theory"}}]})


# --------------------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------------------
def _clip(s, n):
    return re.sub(r"\s+", " ", str(s or "")).strip()[:n]


def _norm(s):
    return _clip(s, 300).lower()


def _pick(names, allowed):
    """Keep only names that appear in `allowed` (case-insensitive), spelled as in `allowed`, no repeats."""
    lookup = {_norm(a): a for a in allowed}
    out = []
    for n in names or []:
        hit = lookup.get(_norm(n))
        if hit and hit not in out:
            out.append(hit)
    return out


def learner_text(learner: Learner, level: str):
    lines = [f"Student level: {LEVEL_GUIDE[level]}", f"Learning style: {STYLE_GUIDE[learner.style]}"]
    if learner.target_role.strip():
        lines.append(f"The student is preparing for a {_clip(learner.target_role, 80)} role: take examples from "
                     f"that kind of work.")
    return "\n".join(lines)


def topic_text(skill, topic: TopicIn, learner: Learner, focus=None):
    subs = [_clip(s, 200) for s in topic.subtopics][:10]
    known = _pick(learner.known, subs)
    weak = _pick(learner.weak, subs + [topic.name])
    focus = [f for f in _pick(focus or [], subs) if f not in known]
    lines = [f"Module (skill): {_clip(skill, 120)}", f"Topic: {_clip(topic.name, 200)}",
             "Subtopics: " + ("; ".join(subs) if subs else "(choose the essential ones)")]
    if topic.why:
        lines.append(f"Why it matters: {_clip(topic.why, 400)}")
    if focus:
        lines.append("FOCUS subtopics (spend the most time here): " + "; ".join(focus))
    if known:
        lines.append("ALREADY KNOWN (one recap sentence at most): " + "; ".join(known))
    if weak:
        lines.append("GOT WRONG BEFORE (explain again in a new way): " + "; ".join(weak))
    return "\n".join(lines), subs, weak


# --------------------------------------------------------------------------------------
# 1) Plan: roadmap step -> module of lessons
# --------------------------------------------------------------------------------------
PLAN_SYSTEM = (
    "You are a personal tutor planning ONE module of a student's learning path. The lessons are fixed: one lesson "
    "per topic, in the given order, numbered from 0. For EVERY lesson write, for THIS student:\n"
    "1. index: the lesson number.\n"
    "2. objective: one sentence starting 'You will be able to', concrete and checkable.\n"
    "3. focus: 2 to 4 of that topic's subtopics that deserve the most time for this student, copied exactly.\n"
    "4. approach: one sentence on how the lesson teaches it for this student's level and learning style.\n"
    "5. minutes: realistic study minutes for the lesson including practice, between 10 and 90.\n"
    "Also write intro (2 sentences, talking to the student as 'you': what this module gives them) and "
    "test_topics (3 to 6 topic names, copied exactly, that the end-of-module test must check)."
)
PLAN_SCHEMA = {"type": "object", "properties": {
    "intro": STR,
    "lessons": arr({"type": "object", "properties": {
        "index": INT, "objective": STR, "focus": arr(STR), "approach": STR, "minutes": INT},
        "required": ["index", "objective", "focus", "approach", "minutes"]}),
    "test_topics": arr(STR)},
    "required": ["intro", "lessons", "test_topics"]}


def plan_module(step: StepIn, learner: Learner, target):
    level = step.level or learner.level
    topics = step.topics[:15]
    listing = "\n".join(
        f"{i}. {_clip(t.name, 200)} | subtopics: {'; '.join(_clip(s, 120) for s in t.subtopics[:10])}"
        for i, t in enumerate(topics))
    user = (f"{learner_text(learner, level)}\n\n"
            + (f"Final goal of the whole path: {_clip(target, 120)}\n" if target else "")
            + f"Module: {_clip(step.skill, 120)} ({'target skill' if step.role == 'target' else 'prerequisite'})\n"
            + (f"Module summary: {_clip(step.summary, 600)}\n" if step.summary else "")
            + f"Lessons:\n{listing}")
    warnings = []
    planned = True
    try:
        data = call_agent("learning", PLAN_SYSTEM, user, PLAN_SCHEMA, temperature=0.3)
    except LLMUnavailable as exc:   # the module still gets a usable plan from the syllabus alone
        data, planned = {}, False
        warnings.append(f"Planner unavailable for {step.skill}: {exc}")
    got = {}
    for item in data.get("lessons") or []:
        if isinstance(item, dict) and isinstance(item.get("index"), int):
            got.setdefault(item["index"], item)
    lessons = []
    for i, t in enumerate(topics):
        subs = [_clip(s, 200) for s in t.subtopics][:10]
        known = _pick(learner.known, subs)
        g = got.get(i, {})
        focus = [f for f in _pick(g.get("focus"), subs) if f not in known][:4]
        if not focus:
            focus = [s for s in subs if s not in known][:3]
        try:
            minutes = int(g.get("minutes") or 0)
        except (TypeError, ValueError):
            minutes = 0
        lessons.append({
            "topic": _clip(t.name, 200),
            "objective": _clip(g.get("objective"), 300) or (f"You will be able to explain and use {t.name}."),
            "focus": focus,
            "skip": known,
            "approach": _clip(g.get("approach"), 300),
            "minutes": max(10, min(90, minutes)) if minutes else DEFAULT_MINUTES[level],
            "video_query": video_query(step.skill, t.name, level),
        })
    if len(got) < len(topics):
        warnings.append(f"{len(topics) - len(got)} lesson(s) of {step.skill} were planned from the syllabus only.")
    names = [lsn["topic"] for lsn in lessons]
    test_topics = _pick(data.get("test_topics"), names) or names[:6]
    return {
        "skill": _clip(step.skill, 120),
        "role": "target" if step.role == "target" else "prerequisite",
        "level": level,
        "intro": _clip(data.get("intro"), 600) or _clip(step.summary, 600),
        "lessons": lessons,
        "test": {"topics": test_topics[:6], "difficulty": TEST_DIFFICULTY[level]},
        "planned": planned,
        "warnings": warnings,
    }


@router.post("/path")
def path(body: PathIn):
    """One module per roadmap step, one lesson per topic, planned for this learner."""
    steps = [s for s in body.steps if s.topics][:15]
    if not steps:
        raise HTTPException(422, "Give at least one roadmap step with topics.")
    with ThreadPoolExecutor(max_workers=4) as pool:
        modules = list(pool.map(lambda s: plan_module(s, body.learner, body.target_skill), steps))
    if not any(m["planned"] for m in modules):
        # Nothing came from the model (vLLM down or out of memory): fail, so the caller retries later.
        raise LLMUnavailable(modules[0]["warnings"][0])
    return {"target_skill": body.target_skill, "model": AGENTS["learning"][1],
            "total_minutes": sum(lsn["minutes"] for m in modules for lsn in m["lessons"]), "modules": modules}


# --------------------------------------------------------------------------------------
# 2) Lesson: narrated video script + quick check + real videos
# --------------------------------------------------------------------------------------
SLIDES_SYSTEM = (
    "You are a friendly expert teacher writing the script of a short narrated video lesson for ONE student. "
    "Rules:\n"
    "1. 5 to 8 slides. The first slide says what the student will learn and why it matters to them. The last "
    "slide recaps the key takeaways.\n"
    "2. Each slide has: title (3 to 7 words); bullets (2 to 4 short bullets, at most 12 words each); narration "
    "(2 to 4 spoken sentences, 40 to 90 words, plain speech: no markdown, no symbols, no code read aloud); "
    "example (a short code snippet, command or worked example of at most 8 lines, or an empty string).\n"
    "3. Spend the most slides on the FOCUS subtopics. ALREADY KNOWN subtopics get one recap sentence at most.\n"
    "4. For each subtopic the student GOT WRONG BEFORE, add one slide titled 'Fixing a mix-up: <subtopic>' that "
    "explains it again in a different way with a simple example.\n"
    "5. Talk to the student as 'you'. Be technically accurate: leave a detail out rather than guess."
)
SLIDES_SCHEMA = {"type": "object", "properties": {"slides": arr({"type": "object", "properties": {
    "title": STR, "bullets": arr(STR), "narration": STR, "example": STR},
    "required": ["title", "bullets", "narration", "example"]})}, "required": ["slides"]}

CHECK_SYSTEM = (
    "You write a quick understanding check for the end of a video lesson. Write 3 single-answer multiple-choice "
    "questions about the topic, at the student's level. Each has exactly 4 distinct options and ONE correct answer; "
    "wrong options are plausible. No 'all of the above' or 'none of the above'. 'subtopic' is copied exactly from "
    "the subtopic list. Add a one-sentence explanation of the right answer."
)
CHECK_SCHEMA = {"type": "object", "properties": {"questions": arr({"type": "object", "properties": {
    "question": STR, "options": arr(STR), "answer_index": INT, "subtopic": STR, "explanation": STR},
    "required": ["question", "options", "answer_index", "subtopic", "explanation"]})}, "required": ["questions"]}


def clean_slides(data):
    out = []
    for s in (data or {}).get("slides") or []:
        if not isinstance(s, dict):
            continue
        narration = _clip(s.get("narration"), 700)
        if not narration:
            continue
        example = str(s.get("example") or "").strip()[:800]
        out.append({"title": _clip(s.get("title"), 90) or "Slide",
                    "bullets": [_clip(b, 140) for b in (s.get("bullets") or []) if _clip(b, 140)][:5],
                    "narration": narration,
                    "example": example})
    return out[:9]


def make_slides(context, level_text):
    user = f"{level_text}\n\n{context}"
    slides = []
    for _ in range(2):
        slides = clean_slides(call_agent("learning", SLIDES_SYSTEM, user, SLIDES_SCHEMA, temperature=0.4))
        if len(slides) >= 4:
            return slides
        user = (f"{level_text}\n\n{context}\n\nYour previous answer had only {len(slides)} usable slides. "
                f"Write 5 to 8 complete slides.")
    if len(slides) < 3:
        raise HTTPException(502, "The learning model did not write a usable lesson. Please try again.")
    return slides


def make_check(context, level_text, subs, topic_name):
    data = call_agent("learning", CHECK_SYSTEM, f"{level_text}\n\n{context}", CHECK_SCHEMA, temperature=0.4)
    out, seen = [], set()
    for q in data.get("questions") or []:
        if not isinstance(q, dict):
            continue
        opts = [_clip(o, 200) for o in q.get("options") or []]
        ans = q.get("answer_index")
        text = _clip(q.get("question"), 400)
        if not text or len(opts) != 4 or len({o.lower() for o in opts}) != 4 or not isinstance(ans, int) \
                or not 0 <= ans < 4 or text.lower() in seen:
            continue
        seen.add(text.lower())
        opts, (ans,) = _shuffle_options(opts, [ans])
        sub = (_pick([q.get("subtopic")], subs) or [topic_name])[0]
        out.append({"question": text, "options": opts, "answer_index": ans, "subtopic": sub,
                    "explanation": _clip(q.get("explanation"), 400)})
    return out[:3]


def video_query(skill, topic, level):
    q = topic if _norm(skill) in _norm(topic) else f"{topic} {skill}"
    return _clip(f"{q} tutorial" + {"beginner": " for beginners", "advanced": " in depth"}.get(level, ""), 150)


def find_videos(query, n=3):
    """Real, embeddable YouTube videos (YouTube Data API v3, free quota). Without a key, only a search link."""
    out = {"query": query, "search_url": "https://www.youtube.com/results?search_query=" + quote_plus(query),
           "videos": []}
    if not YOUTUBE_KEY:
        return out, []
    try:
        r = httpx.get("https://www.googleapis.com/youtube/v3/search", timeout=10, params={
            "part": "snippet", "type": "video", "q": query, "maxResults": n, "videoEmbeddable": "true",
            "videoDuration": "medium", "safeSearch": "strict", "relevanceLanguage": "en", "key": YOUTUBE_KEY})
        r.raise_for_status()
        for item in r.json().get("items") or []:
            vid = (item.get("id") or {}).get("videoId", "")
            sn = item.get("snippet") or {}
            if not VIDEO_ID.match(vid):
                continue
            out["videos"].append({"video_id": vid, "title": html.unescape(_clip(sn.get("title"), 200)),
                                  "channel": html.unescape(_clip(sn.get("channelTitle"), 120)),
                                  "url": f"https://www.youtube.com/watch?v={vid}"})
        return out, []
    except (httpx.HTTPError, ValueError) as exc:
        return out, [f"YouTube search failed: {exc}"]


@router.post("/lesson")
def lesson(body: LessonIn):
    """A narrated slide lesson written for this learner, a 3-question quick check and matching real videos."""
    level = body.learner.level
    context, subs, weak = topic_text(body.skill, body.topic, body.learner, body.focus)
    if body.objective:
        context += f"\nLesson objective: {_clip(body.objective, 300)}"
    level_text = learner_text(body.learner, level)
    with ThreadPoolExecutor(max_workers=3) as pool:
        slides_f = pool.submit(make_slides, context, level_text)
        check_f = pool.submit(make_check, context, level_text, subs, _clip(body.topic.name, 200))
        videos_f = pool.submit(find_videos, video_query(body.skill, body.topic.name, level)) if body.videos else None
        slides = slides_f.result()
        warnings = []
        try:
            check = check_f.result()
        except HTTPException:
            raise
        except Exception as exc:     # the lesson is still worth showing without its quick check
            check = []
            warnings.append(f"Quick check unavailable: {exc}")
        videos, vw = videos_f.result() if videos_f else (None, [])
    warnings += vw
    if not check:
        warnings.append("No quick-check question passed validation.")
    return {"topic": body.topic.name, "level": level, "style": body.learner.style, "remedial": weak,
            "slides": slides, "quick_check": check, "videos": videos, "warnings": warnings}


# --------------------------------------------------------------------------------------
# 3) Notes
# --------------------------------------------------------------------------------------
NOTES_SYSTEM = (
    "You write clear revision notes on ONE topic for ONE student. Rules:\n"
    "1. overview: 2 or 3 sentences: what it is and where the student will use it.\n"
    "2. sections: one section per subtopic, in the given order, heading = the subtopic. 'points' are 2 to 5 "
    "complete explanatory sentences (not fragments). 'example' is a short code snippet, command or worked example "
    "of at most 12 lines, or an empty string when no example fits.\n"
    "3. ALREADY KNOWN subtopics get a single short point. FOCUS and GOT WRONG BEFORE subtopics get the most depth.\n"
    "4. Be technically accurate. No links, no markdown."
)
NOTES_SCHEMA = {"type": "object", "properties": {
    "overview": STR,
    "sections": arr({"type": "object", "properties": {"heading": STR, "points": arr(STR), "example": STR},
                     "required": ["heading", "points", "example"]})},
    "required": ["overview", "sections"]}

EXTRA_SYSTEM = (
    "For ONE topic of a student's revision notes write: key_terms (4 to 8 terms, each with a one-sentence "
    "meaning), common_mistakes (3 to 5 specific mistakes, each saying how to avoid it), summary (4 to 6 one-line "
    "takeaways) and self_check (3 to 5 open questions the student should be able to answer after studying). "
    "Be technically accurate. No links, no markdown."
)
EXTRA_SCHEMA = {"type": "object", "properties": {
    "key_terms": arr({"type": "object", "properties": {"term": STR, "meaning": STR}, "required": ["term", "meaning"]}),
    "common_mistakes": arr(STR), "summary": arr(STR), "self_check": arr(STR)},
    "required": ["key_terms", "common_mistakes", "summary", "self_check"]}


def _strs(v, n, ln):
    return [x for x in (_clip(s, ln) for s in (v or [])) if x][:n]


def make_sections(context, level_text):
    user = f"{level_text}\n\n{context}"
    data, sections = {}, []
    for _ in range(2):
        data = call_agent("learning", NOTES_SYSTEM, user, NOTES_SCHEMA, temperature=0.3)
        sections = []
        for s in data.get("sections") or []:
            if not isinstance(s, dict):
                continue
            points = _strs(s.get("points"), 6, 600)
            if points:
                sections.append({"heading": _clip(s.get("heading"), 160) or "Notes", "points": points,
                                 "example": str(s.get("example") or "").strip()[:1200]})
        if len(sections) >= 2:
            break
        user = f"{level_text}\n\n{context}\n\nYour previous answer had too few sections. Write one per subtopic."
    if not sections:
        raise HTTPException(502, "The learning model did not write usable notes. Please try again.")
    return _clip(data.get("overview"), 800), sections[:10]


@router.post("/notes")
def notes(body: NotesIn):
    """Revision notes for one topic, at this learner's level and in their learning style."""
    context, _subs, weak = topic_text(body.skill, body.topic, body.learner, body.focus)
    level_text = learner_text(body.learner, body.learner.level)
    with ThreadPoolExecutor(max_workers=2) as pool:
        main_f = pool.submit(make_sections, context, level_text)
        extra_f = pool.submit(call_agent, "learning", EXTRA_SYSTEM, f"{level_text}\n\n{context}", EXTRA_SCHEMA, 0.3)
        overview, sections = main_f.result()
        warnings = []
        try:
            extra = extra_f.result()
        except HTTPException:
            raise
        except Exception as exc:
            extra = {}
            warnings.append(f"Key terms and summary unavailable: {exc}")
    terms = [{"term": _clip(t.get("term"), 80), "meaning": _clip(t.get("meaning"), 300)}
             for t in extra.get("key_terms") or [] if isinstance(t, dict) and _clip(t.get("term"), 80)][:8]
    return {
        "topic": body.topic.name, "level": body.learner.level, "style": body.learner.style, "remedial": weak,
        "overview": overview, "sections": sections, "key_terms": terms,
        "common_mistakes": _strs(extra.get("common_mistakes"), 6, 400),
        "summary": _strs(extra.get("summary"), 8, 300),
        "self_check": _strs(extra.get("self_check"), 6, 300),
        "practice": _strs(body.topic.practice, 4, 400),
        "warnings": warnings,
    }


@router.get("/health")
def health():
    """Whether the vLLM server behind the learning agent is up and which model it serves."""
    url, model = AGENTS["learning"]
    try:
        r = httpx.get(f"{url.rstrip('/')}/models", timeout=5,
                      headers={"Authorization": f"Bearer {os.getenv('LEARNING_API_KEY', 'EMPTY')}"})
        r.raise_for_status()
        served = [m.get("id") for m in r.json().get("data") or []]
        return {"ok": model in served, "url": url, "model": model, "served": served,
                "youtube": bool(YOUTUBE_KEY)}
    except (httpx.HTTPError, ValueError) as exc:
        return {"ok": False, "url": url, "model": model, "error": str(exc), "youtube": bool(YOUTUBE_KEY)}
