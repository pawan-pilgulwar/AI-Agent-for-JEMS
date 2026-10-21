import json
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel, ConfigDict
from llm import call_agent, LLMUnavailable
from assessment import router as assessment_router

app = FastAPI(title="Exponentor Agents")
app.include_router(assessment_router)   # adds /assessment/generate, /run-code, /grade, /grade-text


@app.exception_handler(LLMUnavailable)
def llm_unavailable(_request, exc):
    return JSONResponse(status_code=502, content={"detail": str(exc)})

STR = {"type": "string"}
def arr(x): return {"type": "array", "items": x}


# ---------- request shapes (these give /docs a ready example) ----------
class PrereqsIn(BaseModel):
    skills: list[str]
    model_config = ConfigDict(json_schema_extra={"examples": [{"skills": ["Spring Boot", "React"]}]})

class ProfileIn(BaseModel):
    github: dict | None = None
    leetcode: dict | None = None
    hackerrank: dict | None = None
    model_config = ConfigDict(json_schema_extra={"examples": [{
        "github": {"repos": [{"name": "college-portal", "languages": {"Java": 82000, "HTML": 9000},
                              "contributors": 2, "my_commit_share": 0.7,
                              "dependencies": ["spring-boot-starter-web", "mysql-connector"]}]},
        "leetcode": {"solved": {"easy": 60, "medium": 35, "hard": 4},
                     "topics": {"Array": 40, "Dynamic Programming": 8, "Graph": 5}},
        "hackerrank": {"badges": {"Java": 4, "Problem Solving": 3}}}]})

class RoadmapIn(BaseModel):
    missing_skills: list[str] = []
    target_skill: str | None = None     # added as the last step, after all its prerequisites
    model_config = ConfigDict(json_schema_extra={"examples": [{
        "missing_skills": ["Linux basics", "Computer networking", "Virtualization", "Python scripting"],
        "target_skill": "Cloud Computing"}]})

class AssessmentIn(BaseModel):
    skill: str
    topics: list[str] = []
    count: int = 5
    model_config = ConfigDict(json_schema_extra={"examples": [{
        "skill": "Core Java", "topics": ["classes", "inheritance", "collections"], "count": 5}]})

class MatchIn(BaseModel):
    student: dict
    company: dict
    match_score: float | None = None
    model_config = ConfigDict(json_schema_extra={"examples": [{
        "student": {"name": "Asha", "verified_skills": ["Core Java", "OOP concepts"]},
        "company": {"name": "Cognizant", "required_skills": ["Core Java", "OOP concepts", "Spring Core"]},
        "match_score": 67}]})


@app.get("/health")
def health():
    return {"ok": True}


# ---------- test console: open http://localhost:8080/ui ----------
UI_FILE = Path(__file__).with_name("ui.html")

@app.get("/ui", include_in_schema=False)
def ui():
    return HTMLResponse(UI_FILE.read_text(encoding="utf-8"))


# ---------- 1) PREREQS AGENT: company skills -> prerequisite tree ----------
PREREQ_SYSTEM = (
    "You are a curriculum expert for engineering students. Given ONE technology skill, list every skill a "
    "student must learn BEFORE starting it, as a dependency graph.\n"
    "Rules:\n"
    "1. Give 6 to 10 items, ordered from the most basic foundation to the closest to the target skill.\n"
    "2. Every item must be one learnable skill that can be tested in an exam (e.g. 'Core Java', 'OOP concepts', "
    "'SQL basics').\n"
    "3. Every name in depends_on MUST exactly match the name of another item in your own list. Foundation "
    "items have an empty depends_on list. Never reference a skill you did not list.\n"
    "4. level means the depth the student needs BEFORE the target skill: 'basic' for foundations, "
    "'intermediate' for direct requirements. Use 'advanced' only if truly required.\n"
    "5. Include the skills real projects need: language basics, core concepts, build tools, databases, "
    "web/API basics, Git. Do NOT list IDEs, operating systems, hardware, or advanced design patterns.\n"
    "6. Give 3 to 5 specific topics to test for each item."
)

PREREQ_ITEM = {"type": "object", "properties": {
    "name": STR,
    "level": {"type": "string", "enum": ["basic", "intermediate", "advanced"]},
    "depends_on": arr(STR),
    "topics": arr(STR)},
    "required": ["name", "level", "depends_on", "topics"]}

PREREQ_SCHEMA = {"type": "object", "properties": {
    "skill": STR, "prerequisites": arr(PREREQ_ITEM)},
    "required": ["skill", "prerequisites"]}


def validate_tree(tree):
    problems = []
    items = [p for p in tree.get("prerequisites") or [] if isinstance(p, dict) and p.get("name")]
    tree["prerequisites"] = items
    for p in items:
        p.setdefault("level", "basic")
        p["depends_on"] = p.get("depends_on") or []
        p["topics"] = p.get("topics") or []
    names = {p["name"].strip().lower() for p in items}
    if len(items) < 6:
        problems.append(f"Only {len(items)} items, need at least 6.")
    for p in items:
        for d in p["depends_on"]:
            if d.strip().lower() not in names:
                problems.append(f"'{p['name']}' depends on '{d}', which is not in your list. "
                                f"Add '{d}' as its own item or remove it.")
    return problems


def build_tree(skill):
    user = f"Skill: {skill}"
    tree = None
    problems = []
    for _ in range(3):
        tree = call_agent("prereqs", PREREQ_SYSTEM, user, PREREQ_SCHEMA, temperature=0.2)
        problems = validate_tree(tree)
        if not problems:
            return tree
        user = (f"Skill: {skill}\nYour previous answer had these problems. Fix all of them:\n- "
                + "\n- ".join(problems))
    tree["warnings"] = problems
    return tree


@app.post("/agents/prereqs")
def prereqs(body: PrereqsIn):
    return {"skills": [build_tree(s) for s in body.skills]}


# ---------- 2) PROFILE AGENT ----------
@app.post("/agents/profile")
def profile(body: ProfileIn):
    system = ("You analyze a student's coding profile data. List the skills the data actually proves. "
              "For each skill give a level (basic/intermediate/advanced), a confidence 0-100, and the evidence "
              "taken ONLY from the data given. Do not invent skills that are not supported by the data.")
    schema = {"type": "object", "properties": {
        "skills": arr({"type": "object", "properties": {
            "name": STR, "level": {"type": "string", "enum": ["basic", "intermediate", "advanced"]},
            "confidence": {"type": "integer"}, "evidence": STR},
            "required": ["name", "level", "confidence", "evidence"]}),
        "summary": STR}, "required": ["skills", "summary"]}
    return call_agent("profile", system, json.dumps(body.model_dump()), schema)


# ---------- 3) ROADMAP AGENT: prerequisites + target skill -> detailed syllabus ----------
# A whole step in one answer (8 topics x 6 subtopics + practice + why) is too long for the 14B model:
# it stops after ~3 topics. So each step is built in small calls the model can always finish:
#   1. outline: topic names + summary/motivation/project/resources
#   2. top-up:  if fewer than MIN_TOPICS names came back, ask for the missing ones and append them
#   3. detail:  one call per topic (in parallel) for its why, subtopics and practice
MIN_TOPICS, MAX_TOPICS = 6, 10
MIN_SUBTOPICS = 4

MOTIVATION_RULES = (
    "MOTIVATION. Students get bored by theory and ask 'why am I learning this, where will I ever use it?'. "
    "Answer that honestly and concretely, talking to the student as 'you'. Be specific, never generic lines "
    "like 'it is important' or 'it builds a strong foundation'."
)

OUTLINE_SYSTEM = (
    "You are a senior curriculum designer. Plan ONE step of a student's learning roadmap. The student follows "
    "the steps in order, so earlier steps are already learned.\n"
    "Rules:\n"
    f"1. topics: {MIN_TOPICS} to {MAX_TOPICS} topic names in learning order, covering the skill end to end, from "
    "first concepts to job-ready use. Each name is specific (e.g. 'VPC networking: subnets, route tables, "
    "gateways'), never vague like 'Basics' or 'Advanced concepts'.\n"
    "2. If the step is a PREREQUISITE, cover it to the depth the target skill needs and say in the summary why "
    "the target needs it. If it is the TARGET skill, go deep: core services/concepts, hands-on tooling, "
    "security, best practices and real-world use.\n"
    "3. Do not repeat topics that belong to earlier steps; build on them instead.\n"
    "4. project: one small project for the whole step.\n"
    "5. weeks is a realistic duration at about 10 study hours per week.\n"
    "6. resources: 2-4 free resources (official docs, well-known free courses or books). No made-up links.\n"
    f"7. {MOTIVATION_RULES}\n"
    "   - why_learn: 2-3 sentences. For a PREREQUISITE, explain exactly how it unlocks the target skill and what "
    "goes wrong without it. For the TARGET skill, explain the jobs and real products that depend on it.\n"
    "   - used_in: 3-5 real situations where this is used, each naming the concrete task "
    "(e.g. 'Opening port 443 in an AWS security group is TCP/IP ports in action', "
    "'Debugging why a container cannot reach the database is DNS and routing'). "
    "For a prerequisite, tie each one to the target skill."
)

OUTLINE_SCHEMA = {"type": "object", "properties": {
    "weeks": {"type": "integer"},
    "summary": STR,
    "why_learn": STR,
    "used_in": {"type": "array", "items": STR, "minItems": 3, "maxItems": 5},
    "topics": {"type": "array", "items": STR, "minItems": MIN_TOPICS, "maxItems": MAX_TOPICS},
    "project": STR,
    "resources": arr(STR)},
    "required": ["weeks", "summary", "why_learn", "used_in", "topics", "project", "resources"]}

MORE_TOPICS_SYSTEM = (
    "You are a senior curriculum designer. A syllabus for one skill is missing topics. Give ONLY the new topic "
    "names that should come after the existing ones, in learning order, so the syllabus covers the skill end "
    "to end. Each name is specific, never vague like 'Basics'. Never repeat an existing topic."
)

MORE_TOPICS_SCHEMA = {"type": "object", "properties": {"topics": arr(STR)}, "required": ["topics"]}

TOPIC_SYSTEM = (
    "You are a senior curriculum designer. Write the detail for ONE topic of a student's syllabus.\n"
    "Rules:\n"
    f"1. subtopics: {MIN_SUBTOPICS} to 8 concrete items: specific concepts, commands, services, APIs or "
    "techniques (e.g. 'IAM policies: JSON structure, allow/deny'), never vague words like 'basics'.\n"
    "2. practice: 1-2 practice tasks the student can actually do.\n"
    "3. Stay inside this topic; the other topics of the syllabus are covered separately.\n"
    f"4. why: one sentence saying where THIS topic shows up later in real work or in the target skill. "
    f"{MOTIVATION_RULES}"
)

TOPIC_SCHEMA = {"type": "object", "properties": {
    "why": STR,
    "subtopics": {"type": "array", "items": STR, "minItems": MIN_SUBTOPICS, "maxItems": 8},
    "practice": {"type": "array", "items": STR, "minItems": 1, "maxItems": 2}},
    "required": ["why", "subtopics", "practice"]}


def clean_names(names):
    out, seen = [], set()
    for n in names or []:
        n = (n or "").strip()
        if n and n.lower() not in seen:
            seen.add(n.lower())
            out.append(n)
    return out


def build_outline(base):
    user, outline = base, None
    for _ in range(2):
        outline = call_agent("roadmap", OUTLINE_SYSTEM, user, OUTLINE_SCHEMA, temperature=0.3)
        outline["topics"] = clean_names(outline.get("topics"))
        if (outline["topics"] and (outline.get("why_learn") or "").strip()
                and len(outline.get("used_in") or []) >= 3):
            break
        user = base + "\nYour previous answer was missing topics, why_learn or used_in. Give all of them."
    # Top up the topic list in code, so a short answer can never leave the step thin.
    for _ in range(3):
        missing = MIN_TOPICS - len(outline["topics"])
        if missing <= 0:
            break
        have = "\n".join(f"- {t}" for t in outline["topics"]) or "(none yet)"
        extra = call_agent("roadmap", MORE_TOPICS_SYSTEM,
                           f"{base}\n\nExisting topics:\n{have}\n\n"
                           f"Give {missing} to {MAX_TOPICS - len(outline['topics'])} more topics.",
                           MORE_TOPICS_SCHEMA, temperature=0.4)
        outline["topics"] = clean_names(outline["topics"] + (extra.get("topics") or []))[:MAX_TOPICS]
    return outline


def build_topic(base, names, j):
    listing = "\n".join(f"{i + 1}. {n}" for i, n in enumerate(names))
    user = f"{base}\n\nThis step's topics:\n{listing}\n\nWrite the detail for topic {j + 1}: {names[j]}"
    topic, problems = None, []
    for _ in range(2):
        topic = call_agent("roadmap", TOPIC_SYSTEM, user, TOPIC_SCHEMA, temperature=0.3)
        problems = []
        if len(topic.get("subtopics") or []) < MIN_SUBTOPICS:
            problems.append(f"Topic '{names[j]}' has fewer than {MIN_SUBTOPICS} subtopics.")
        if not (topic.get("why") or "").strip():
            problems.append(f"Topic '{names[j]}' has no why.")
        if not problems:
            break
        user += "\nYour previous answer was too thin. Fix: " + " ".join(problems)
    return ({"name": names[j], "why": topic.get("why") or "",
             "subtopics": topic.get("subtopics") or [], "practice": topic.get("practice") or []},
            problems)


def build_step(skill, order, index, target):
    role = "TARGET skill" if target and skill.lower() == target.lower() else "PREREQUISITE"
    plan = "\n".join(f"{i + 1}. {s}" for i, s in enumerate(order))
    base = (f"Full roadmap, in order:\n{plan}\n\n"
            + (f"Final target skill: {target}\n" if target else "")
            + f"Step {index + 1}: {skill} ({role}).")
    outline = build_outline(base)
    names = outline["topics"]
    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(lambda j: build_topic(base, names, j), range(len(names))))
    problems = [p for _, ps in results for p in ps]
    if len(names) < MIN_TOPICS:
        problems.insert(0, f"Only {len(names)} topics, give {MIN_TOPICS} to {MAX_TOPICS}.")
    if not (outline.get("why_learn") or "").strip() or len(outline.get("used_in") or []) < 3:
        problems.append("Explain why_learn and give 3 to 5 concrete used_in situations.")
    step = {
        "skill": skill,                         # keep the caller's exact name
        "role": "target" if role == "TARGET skill" else "prerequisite",
        "weeks": max(1, int(outline.get("weeks") or 1)),
        "summary": outline.get("summary") or "",
        "why_learn": outline.get("why_learn") or "",
        "used_in": outline.get("used_in") or [],
        "topics": [t for t, _ in results],
        "project": outline.get("project") or "",
        "resources": outline.get("resources") or [],
    }
    if problems:
        step["warnings"] = problems
    return step


@app.post("/agents/roadmap")
def roadmap(body: RoadmapIn):
    target = (body.target_skill or "").strip() or None
    order, seen = [], {target.lower()} if target else set()
    for s in (x.strip() for x in body.missing_skills):
        if s and s.lower() not in seen:
            seen.add(s.lower())
            order.append(s)
    if target:                                  # the target always comes last
        order.append(target)
    if not order:
        raise HTTPException(422, "Give missing_skills, target_skill, or both.")
    with ThreadPoolExecutor(max_workers=4) as pool:
        steps = list(pool.map(lambda i: build_step(order[i], order, i, target), range(len(order))))
    return {"target_skill": target, "total_weeks": sum(s["weeks"] for s in steps), "steps": steps}


# ---------- 4) ASSESSMENT AGENT (simple MCQ only; use /assessment/* for full papers) ----------
@app.post("/agents/assessment")
def assessment(body: AssessmentIn):
    system = ("You write exam questions. Create multiple-choice questions for the given skill and topics, "
              "with 4 options and exactly one correct answer. Mix easy and medium difficulty.")
    schema = {"type": "object", "properties": {
        "questions": arr({"type": "object", "properties": {
            "question": STR, "options": arr(STR), "answer_index": {"type": "integer"},
            "topic": STR, "difficulty": {"type": "string", "enum": ["easy", "medium", "hard"]}},
            "required": ["question", "options", "answer_index", "topic", "difficulty"]})},
        "required": ["questions"]}
    user = f"Skill: {body.skill}\nTopics: {', '.join(body.topics)}\nCount: {body.count}"
    return call_agent("assessment", system, user, schema, temperature=0.4)


# ---------- 5) MATCH AGENT ----------
@app.post("/agents/match")
def match(body: MatchIn):
    system = ("You explain to a placement officer why a student fits a company. Use ONLY the given data. "
              "Be short and specific: strengths, gaps, and a recommendation.")
    schema = {"type": "object", "properties": {
        "strengths": arr(STR), "gaps": arr(STR), "recommendation": STR},
        "required": ["strengths", "gaps", "recommendation"]}
    return call_agent("match", system, json.dumps(body.model_dump()), schema)