# Exponentor Agents API Guide (v2)

This guide explains every API in your `analyzer` service: the five AI agents, the assessment system (MCQ, multi-select, written answers and coding questions), and the code runner (Judge0). For each one you get what it does, what to send, what you get back, and a small example you can paste.

- **Base URL from your computer:** `http://localhost:8080`
- **Base URL from another container in the same compose file:** `http://analyzer:8080`
- **Interactive page (try every API in the browser):** `http://localhost:8080/docs`
- **Judge0 (code runner), direct:** `http://localhost:2358`
- **Format:** every request and response is JSON. Send the header `Content-Type: application/json`.
- **Login:** none. The ports are bound to `127.0.0.1`, so only your own machine can reach them.

> The sample responses below show the **shape** of an answer. Text written by the AI model (questions, feedback, roadmaps) will differ every time.

---

## 1. All endpoints at a glance

| Endpoint | Job | Needs the AI model | Needs Judge0 |
|---|---|---|---|
| `GET /health` | Check the service is up | no | no |
| `POST /agents/prereqs` | Company skills to prerequisite tree | yes | no |
| `POST /agents/profile` | GitHub / LeetCode / HackerRank data to skills | yes | no |
| `POST /agents/roadmap` | Prerequisites + target skill to a detailed syllabus | yes | no |
| `POST /agents/assessment` | Simple MCQ questions only (older endpoint) | yes | no |
| `POST /agents/match` | Explain why a student fits a company | yes | no |
| `POST /assessment/generate` | Make a mixed question paper | yes | yes (coding) |
| `POST /assessment/run-code` | Run a student's code once (the "Run" button) | no | yes |
| `POST /assessment/grade` | Grade a whole submission | yes (written answers) | yes (coding) |
| `POST /assessment/grade-text` | Grade one written answer | yes | no |
| Judge0 `POST /submissions` | Run code directly (for testing) | no | yes |

---

## 2. Project files and setup

```
exponentor\
  docker-compose.yml
  .env                  <- LLM_API_KEY=...
  judge0.conf
  analyzer\
    Dockerfile
    requirements.txt    <- fastapi, uvicorn, openai, httpx (one per line)
    llm.py              <- talks to the AI model
    judge.py            <- talks to Judge0
    assessment.py       <- the /assessment/* endpoints
    main.py             <- the /agents/* endpoints, plus it loads assessment.py
```

The `analyzer` service in `docker-compose.yml` must know where Judge0 is:

```yaml
  analyzer:
    build: ./analyzer
    restart: unless-stopped
    environment:
      LLM_API_KEY: ${LLM_API_KEY}
      JUDGE0_URL: http://judge0-server:2358
    ports:
      - "127.0.0.1:8080:8080"
    depends_on: [llm-analysis, judge0-server]
    networks: [appnet]
```

Check everything is running (from the `exponentor` folder):

```powershell
docker compose ps
Invoke-RestMethod http://localhost:8080/health
```

Expected: `ok : True`. After any code change: `docker compose up -d --build analyzer`.

---

## 3. Three ways to call the APIs

### A. The browser page (easiest)

1. Open `http://localhost:8080/docs`.
2. Click an endpoint, then **Try it out**. The body box is pre-filled with an example.
3. Edit it if you like. **Double quotes only, no trailing commas**, otherwise you get a `422` error.
4. Click **Execute**. Some calls take 30-90 seconds.
5. The result appears under **Server response**.

### B. PowerShell

Paste this helper once per PowerShell window:

```powershell
function Call-Agent($path, $json) {
  Invoke-RestMethod -Method Post -Uri "http://localhost:8080$path" `
    -ContentType "application/json" -Body $json -TimeoutSec 300 | ConvertTo-Json -Depth 20
}
```

Then call an endpoint. Use a single-quoted here-string (`@' ... '@`) so quotes inside the JSON stay untouched:

```powershell
Call-Agent "/agents/prereqs" @'
{"skills": ["Spring Boot", "React"]}
'@
```

### C. From code

**Python**
```python
import requests

r = requests.post(
    "http://localhost:8080/agents/prereqs",
    json={"skills": ["Spring Boot", "React"]},
    timeout=300,
)
r.raise_for_status()
print(r.json())
```

**JavaScript (Next.js server side or an API route)**
```javascript
const res = await fetch("http://analyzer:8080/agents/prereqs", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ skills: ["Spring Boot", "React"] }),
});
if (!res.ok) throw new Error(await res.text());
const data = await res.json();
```

Call the analyzer from your **server code**, not from the student's browser. It has no login, so it must stay private.

---

## 4. Agent endpoints

### 4.1 `GET /health`

```powershell
Invoke-RestMethod http://localhost:8080/health
```
```json
{ "ok": true }
```

### 4.2 `POST /agents/prereqs`

**Use it when:** a company (through the TPO) gives you the skills it needs, and you want the foundations a student must know for each skill.

| Field | Type | Required | Meaning |
|---|---|---|---|
| `skills` | list of strings | yes | One or more skills |

```json
{ "skills": ["Spring Boot", "React"] }
```

**Response** (shortened; a real answer has 6-10 items per skill)
```json
{
  "skills": [
    {
      "skill": "Spring Boot",
      "prerequisites": [
        { "name": "Core Java", "level": "basic", "depends_on": [],
          "topics": ["Syntax and data types", "Control flow", "Methods", "Exceptions"] },
        { "name": "OOP concepts", "level": "basic", "depends_on": ["Core Java"],
          "topics": ["Classes and objects", "Inheritance", "Polymorphism", "Interfaces"] },
        { "name": "Spring Core (DI)", "level": "intermediate", "depends_on": ["OOP concepts"],
          "topics": ["Beans", "Dependency injection", "Annotations"] }
      ]
    }
  ]
}
```

| Field | Meaning |
|---|---|
| `name` | One testable skill |
| `level` | `basic`, `intermediate` or `advanced` |
| `depends_on` | Names of other items in the same list to learn first. Empty = foundation. |
| `topics` | 3-5 topics you can pass to `/assessment/generate` |
| `warnings` | **Only present** if the tree is still broken after 3 tries. A human should fix it. |

**Notes:** it can take 15-60 seconds per skill (up to 3 tries). Have the TPO approve each tree once, then **save it in MongoDB** and reuse it.

### 4.3 `POST /agents/profile`

**Use it when:** you have collected data from a student's GitHub, LeetCode and HackerRank and want the skills that data proves.

| Field | Type | Meaning |
|---|---|---|
| `github` | object (optional) | Repos: languages, contributors, commit share, dependencies |
| `leetcode` | object (optional) | Solved counts and topic counts |
| `hackerrank` | object (optional) | Badges or certificates |

```json
{
  "github": {
    "repos": [
      { "name": "college-portal", "languages": { "Java": 82000, "HTML": 9000 },
        "contributors": 2, "my_commit_share": 0.7,
        "dependencies": ["spring-boot-starter-web", "mysql-connector"] }
    ]
  },
  "leetcode": {
    "solved": { "easy": 60, "medium": 35, "hard": 4 },
    "topics": { "Array": 40, "Dynamic Programming": 8, "Graph": 5 }
  },
  "hackerrank": { "badges": { "Java": 4, "Problem Solving": 3 } }
}
```

**Response**
```json
{
  "skills": [
    { "name": "Java", "level": "intermediate", "confidence": 80,
      "evidence": "college-portal: 82,000 bytes of Java, 70% of commits by the student; HackerRank Java badge" },
    { "name": "Data Structures", "level": "intermediate", "confidence": 70,
      "evidence": "LeetCode: 99 solved, 40 Array and 8 Dynamic Programming" }
  ],
  "summary": "Comfortable with Java; solid array practice; limited graph and DP depth."
}
```

**Notes:** the model is told to use only the data you send. Treat LeetCode and HackerRank data as *evidence*, not proof. A skill is **verified** only after an assessment or faculty exam.

### 4.4 `POST /agents/roadmap`

**Use it when:** a student wants to learn a skill (e.g. Cloud Computing). Send the prerequisites from `/agents/prereqs` **and** the target skill. You get a full syllabus for every prerequisite first, then for the target skill.

| Field | Type | Required | Meaning |
|---|---|---|---|
| `missing_skills` | list of strings | no* | Prerequisites the student is missing, **already in prerequisite order** |
| `target_skill` | string | no* | The skill the student wants to learn. Always added as the **last** step |

\* Send at least one of the two.

```json
{
  "missing_skills": ["Linux basics", "Computer networking", "Virtualization", "Python scripting"],
  "target_skill": "Cloud Computing"
}
```

**Response**
```json
{
  "target_skill": "Cloud Computing",
  "total_weeks": 16,
  "steps": [
    { "skill": "Linux basics", "role": "prerequisite", "weeks": 3,
      "summary": "Cloud servers run Linux, so you need the shell to manage them.",
      "why_learn": "Almost every cloud server you launch is a Linux machine with no screen. Without the shell you cannot install software, read logs or fix a broken server.",
      "used_in": ["SSH into an EC2 instance to install and start a web server",
                  "Reading /var/log files to find why an app crashed in the cloud",
                  "Writing user-data scripts that set up a VM when it boots"],
      "topics": [
        { "name": "File system and navigation",
          "why": "Logs, config files and app code on every cloud VM live in this directory tree.",
          "subtopics": ["Directory tree: /etc, /var, /home", "ls, cd, pwd, find", "Absolute vs relative paths", "Links: hard and symbolic"],
          "practice": ["Find every .log file larger than 1 MB under /var"] }
      ],
      "project": "Set up a Linux VM, create users, and serve a static site with nginx.",
      "resources": ["The Linux Command Line (free book)", "Linux Journey"] },
    { "skill": "Cloud Computing", "role": "target", "weeks": 6, "...": "..." }
  ]
}
```

**Notes:** every step has `why_learn` and `used_in` (why the student needs it and where it is used in the target skill), and every topic has a one-line `why`. The order you send is kept; duplicates are removed and the target skill is moved to the end. Each step is written by a separate model call (up to 4 at once), with 6-10 topics and 4-8 subtopics per topic; a step that comes back too thin is retried once and then gets a `warnings` list. Expect 30-120 seconds. Resources are suggestions without links, so check them before showing students.

### 4.5 `POST /agents/assessment` (simple, MCQ only)

Kept for compatibility. For real tests use `/assessment/generate` (section 5), which supports all question types and checks the questions.

```json
{ "skill": "Core Java", "topics": ["classes", "inheritance"], "count": 5 }
```
```json
{
  "questions": [
    { "question": "Which keyword is used to inherit a class in Java?",
      "options": ["implements", "extends", "inherits", "super"],
      "answer_index": 1, "topic": "inheritance", "difficulty": "easy" }
  ]
}
```

### 4.6 `POST /agents/match`

**Use it when:** your code has already **calculated** a match score and you want a short explanation for the TPO.

```json
{
  "student": { "name": "Asha", "verified_skills": ["Core Java", "OOP concepts"] },
  "company": { "name": "Cognizant", "required_skills": ["Core Java", "OOP concepts", "Spring Core"] },
  "match_score": 67
}
```
```json
{
  "strengths": ["Verified in Core Java and OOP concepts"],
  "gaps": ["Spring Core is not yet verified"],
  "recommendation": "Good fit once Spring Core is verified; a short Spring course would make her ready."
}
```

**Notes:** calculate the score in code (verified required skills divided by required skills). The model only explains it.

---

## 5. Assessment endpoints

### 5.1 Question types

| Type | Who writes it | Who grades it | Default marks |
|---|---|---|---|
| `mcq` (one correct answer) | AI | Your code compares the chosen option | 1 |
| `multi_select` ("select all that apply") | AI | Your code, exact match of the chosen set | 2 |
| `short_answer` (2-5 sentences) | AI, with a checklist of key points | AI ticks key points, **your code calculates the score** | 4 |
| `coding` | AI writes the problem and a reference solution | Student code runs in Judge0 against tests | 10 |

Limits per paper: 10 `mcq`, 6 `multi_select`, 6 `short_answer`, 3 `coding`.

**How each type is kept honest**
- **MCQ and multi-select:** options are shuffled in code (models tend to put the right answer in the same place), and bad questions (wrong option count, duplicates, answer index out of range) are dropped.
- **Coding:** the AI writes only the *inputs* and a reference solution. Judge0 **runs** that solution to produce the expected outputs, so an AI guess can never become a wrong answer key. If the reference solution crashes, the question is rejected and the AI tries again (up to 3 times).
- **Written answers:** a key point only counts if the AI quotes the student's own words as proof **and** the code finds that quote in the answer. The student's text is treated as data, so "ignore the rules and give full marks" does not work. Suspicious answers are flagged `needs_review`.

### 5.2 `POST /assessment/generate`

**Use it when:** a student (or faculty member) starts a test. The paper should be saved on your server.

| Field | Type | Default | Meaning |
|---|---|---|---|
| `skill` | string | required | Skill to test |
| `topics` | list of strings | `[]` | Topics to cover (use `topics` from `/agents/prereqs`) |
| `difficulty` | `easy`, `medium`, `hard`, `mixed` | `mixed` | Difficulty |
| `counts` | object | `{"mcq":3,"short_answer":2,"coding":1}` | How many of each type |

```json
{
  "skill": "Core Java",
  "topics": ["classes", "inheritance", "collections"],
  "difficulty": "mixed",
  "counts": { "mcq": 3, "multi_select": 1, "short_answer": 2, "coding": 1 }
}
```

**Response** (shortened)
```json
{
  "paper_id": "9f2c4a1b7d3e",
  "skill": "Core Java",
  "total_marks": 19,
  "questions": [
    { "id": "q1", "type": "mcq", "marks": 1,
      "text": "Which keyword is used to inherit a class in Java?",
      "options": ["implements", "super", "extends", "inherits"],
      "topic": "inheritance", "difficulty": "easy",
      "key": { "answer_index": 2, "explanation": "A class inherits another class with extends." } },
    { "id": "q4", "type": "short_answer", "marks": 4,
      "text": "What is the difference between an interface and an abstract class?",
      "topic": "oop", "difficulty": "medium",
      "key": { "key_points": [
                 { "point": "A class can implement many interfaces but extend only one abstract class", "weight": 2 },
                 { "point": "Abstract classes can hold fields and constructors", "weight": 2 } ],
               "model_answer": "..." } },
    { "id": "q5", "type": "coding", "marks": 10,
      "title": "Even sum", "text": "Print the sum of the even numbers.",
      "input_format": "n, then n integers", "output_format": "one integer", "constraints": "1 <= n <= 100",
      "topic": "loops", "difficulty": "easy",
      "samples": [ { "input": "3\n1 2 4\n", "expected": "6" } ],
      "hidden":  [ { "input": "1\n2\n", "expected": "2" }, { "input": "2\n1 3\n", "expected": "0" } ] }
  ],
  "student_paper": [
    { "id": "q1", "type": "mcq", "marks": 1, "text": "Which keyword is used to inherit a class in Java?",
      "options": ["implements", "super", "extends", "inherits"], "topic": "inheritance", "difficulty": "easy" },
    { "id": "q5", "type": "coding", "marks": 10, "title": "Even sum", "text": "Print the sum of the even numbers.",
      "input_format": "n, then n integers", "output_format": "one integer", "constraints": "1 <= n <= 100",
      "samples": [ { "input": "3\n1 2 4\n", "expected": "6" } ],
      "languages": ["python", "java", "cpp", "c", "javascript"],
      "notes": "Read from standard input, print to standard output. In Java, name the class Main." }
  ],
  "warnings": []
}
```

| Field | Meaning |
|---|---|
| `questions` | The **full** paper with answer keys and hidden tests. **Save this in MongoDB. Never send it to the browser.** |
| `student_paper` | The safe version for the student: no keys, no hidden tests |
| `warnings` | For example "Asked for 2 'short_answer' question(s) but only 1 passed the checks." |
| `total_marks` | Sum of marks |

**Notes:** a paper with a coding question takes about 30-90 seconds, so show a loading screen. If Judge0 is down you get `502`.

### 5.3 `POST /assessment/run-code`

**Use it when:** the student presses **Run** in the code editor and wants to try their program with their own input. It does not grade anything.

| Field | Type | Default | Meaning |
|---|---|---|---|
| `language` | `python`, `java`, `cpp`, `c`, `javascript` | `python` | Language |
| `source_code` | string | required | The program (max 20,000 characters) |
| `stdin` | string | `""` | Input given to the program (max 10,000 characters) |

```powershell
Call-Agent "/assessment/run-code" @'
{"language":"python","source_code":"n = int(input())\nprint(n * 2)","stdin":"21\n"}
'@
```

**Response**
```json
{
  "status_id": 3,
  "status": "Accepted",
  "stdout": "42\n",
  "stderr": "",
  "compile_output": "",
  "time": "0.01",
  "memory": 3300
}
```

| `status_id` | Meaning |
|---|---|
| 3 | Program ran fine (check `stdout`) |
| 5 | Time limit exceeded |
| 6 | Compile error (see `compile_output`) |
| 7 - 12 | Runtime error (see `stderr`) |
| 13 | Judge0 internal error |

### 5.4 `POST /assessment/grade`

**Use it when:** the student submits the test.

| Field | Type | Default | Meaning |
|---|---|---|---|
| `paper` | list | required | The `questions` list you saved from `/assessment/generate` (with keys) |
| `answers` | object | required | Question id to the student's answer (formats below) |
| `pass_percent` | number | `60` | Percentage needed for `passed: true` |

**Answer formats**

| Type | Format | Example |
|---|---|---|
| `mcq` | option index (starts at 0) | `"q1": 2` |
| `multi_select` | list of option indexes | `"q2": [0, 2, 4]` |
| `short_answer` | text | `"q3": "A class can implement many interfaces..."` |
| `coding` | object with language and code | `"q4": {"language": "python", "source_code": "print(1)"}` |

An unanswered question scores 0.

**Small example you can run right now** (no AI needed; this uses only Judge0): one MCQ and one coding question with ready-made tests.

```powershell
Call-Agent "/assessment/grade" @'
{
  "paper": [
    { "id": "q1", "type": "mcq", "marks": 1,
      "text": "Which keyword is used to inherit a class in Java?",
      "options": ["implements", "extends", "inherits", "super"],
      "key": { "answer_index": 1, "explanation": "A class inherits another class with extends." } },
    { "id": "q2", "type": "coding", "marks": 10,
      "text": "Read an integer n and print n * 2.",
      "samples": [ { "input": "21\n", "expected": "42" } ],
      "hidden":  [ { "input": "0\n", "expected": "0" }, { "input": "-4\n", "expected": "-8" } ] }
  ],
  "answers": {
    "q1": 1,
    "q2": { "language": "python", "source_code": "n = int(input())\nprint(n * 2)" }
  },
  "pass_percent": 60
}
'@
```

**Response**
```json
{
  "score": 11.0,
  "total": 11.0,
  "percent": 100.0,
  "passed": true,
  "needs_review": [],
  "results": [
    { "id": "q1", "type": "mcq", "max": 1, "score": 1.0, "correct": true,
      "explanation": "A class inherits another class with extends." },
    { "id": "q2", "type": "coding", "max": 10, "score": 10.0, "detail": "Passed 3 of 3 tests.",
      "tests": [
        { "test": "sample 1", "passed": true, "status": "Accepted", "time": "0.01" },
        { "test": "hidden 2", "passed": true, "status": "Accepted", "time": "0.01" },
        { "test": "hidden 3", "passed": true, "status": "Accepted", "time": "0.01" }
      ] }
  ]
}
```

If the code is wrong, the response says which tests failed. For a **sample** test that fails, you also get what the program printed:
```json
{ "test": "sample 1", "passed": false, "status": "Accepted", "time": "0.01",
  "your_output": "23", "expected": "42", "error": "" }
```
Hidden tests only show pass or fail, never their inputs or outputs.

**Result fields**

| Field | Meaning |
|---|---|
| `score`, `total`, `percent` | Marks and percentage |
| `passed` | `percent >= pass_percent` |
| `needs_review` | Question ids a faculty member should look at (suspicious written answer, quote not found, code runner down) |
| `results[].score` | Marks for that question. Coding gives partial marks per test passed. |
| `results[].explanation` | For MCQ and multi-select: why the answer is right |

### 5.5 `POST /assessment/grade-text`

**Use it when:** you want to grade one written answer on its own (also handy for testing).

| Field | Type | Meaning |
|---|---|---|
| `question` | string | The question text |
| `key_points` | list | `[{"point": "...", "weight": 2}, ...]` (weight 1-3) |
| `answer` | string | The student's answer (max 4,000 characters are used) |
| `max_marks` | number | Default 4 |

```powershell
Call-Agent "/assessment/grade-text" @'
{
  "question": "What is the difference between an interface and an abstract class in Java?",
  "key_points": [
    { "point": "A class can implement many interfaces but extend only one abstract class", "weight": 2 },
    { "point": "Abstract classes can hold fields and constructors; interfaces mainly declare behaviour", "weight": 2 }
  ],
  "answer": "A class can implement multiple interfaces but it can extend only one abstract class. Abstract classes can also have fields and constructors.",
  "max_marks": 4
}
'@
```

**Response**
```json
{
  "score": 4.0,
  "max": 4,
  "feedback": "Clear answer that covers both main differences.",
  "covered": [
    "A class can implement many interfaces but extend only one abstract class",
    "Abstract classes can hold fields and constructors; interfaces mainly declare behaviour"
  ],
  "missing": [],
  "wrong_statements": [],
  "needs_review": false
}
```

**How the score is made:** score = marks x (weight of covered points / total weight). A point is covered only if the AI's quote is really found in the answer. The AI never types the final number. Answers under 10 characters score 0 without calling the AI.

### 5.6 Full test flow in PowerShell

This generates a small paper, shows what the student sees, then grades a (deliberately weak) submission. It needs the AI model and Judge0 running.

```powershell
$base = "http://localhost:8080"

# 1) Generate a small paper (up to 1-2 minutes because of the coding question)
$req = '{"skill":"Core Java","topics":["classes","inheritance"],"counts":{"mcq":2,"short_answer":1,"coding":1}}'
$paper = Invoke-RestMethod -Method Post -Uri "$base/assessment/generate" -ContentType "application/json" -Body $req -TimeoutSec 300
$paper.warnings

# 2) What the student sees (no answers, no hidden tests)
$paper.student_paper | ConvertTo-Json -Depth 10

# 3) Pretend to be the student
$answers = @{}
foreach ($q in $paper.questions) {
  if ($q.type -eq "mcq")          { $answers[$q.id] = 0 }
  if ($q.type -eq "short_answer") { $answers[$q.id] = "Write your answer here in two or three sentences." }
  if ($q.type -eq "coding")       { $answers[$q.id] = @{ language = "python"; source_code = "print(0)" } }
}

# 4) Grade it
$body = @{ paper = $paper.questions; answers = $answers; pass_percent = 60 } | ConvertTo-Json -Depth 20
Invoke-RestMethod -Method Post -Uri "$base/assessment/grade" -ContentType "application/json" -Body $body -TimeoutSec 300 | ConvertTo-Json -Depth 10
```

---

## 6. Judge0 directly (the code runner)

The analyzer calls Judge0 for you, but you can call it yourself to test that it works. It is on `http://localhost:2358`.

**Run a program**
```powershell
$body = '{"source_code":"print(\"hello\")","language_id":71}'
Invoke-RestMethod -Method Post -Uri "http://localhost:2358/submissions?base64_encoded=false&wait=true" -ContentType "application/json" -Body $body
```

`wait=true` makes Judge0 wait and return the result straight away.

**Response**
```json
{
  "stdout": "hello\n",
  "time": "0.007",
  "memory": 3348,
  "stderr": null,
  "token": "fbcf7714-546e-48a2-bf3d-a41aad3003cc",
  "compile_output": null,
  "message": null,
  "status": { "id": 3, "description": "Accepted" }
}
```

**Send input to the program** with `stdin`:
```powershell
$body = '{"source_code":"n = int(input())\nprint(n * 2)","language_id":71,"stdin":"21\n"}'
Invoke-RestMethod -Method Post -Uri "http://localhost:2358/submissions?base64_encoded=false&wait=true" -ContentType "application/json" -Body $body
```

**Language ids** (Judge0 1.13.1; confirm yours with `Invoke-RestMethod http://localhost:2358/languages`)

| Language | `language_id` | Name used in the analyzer |
|---|---|---|
| Python 3.8 | 71 | `python` |
| Java (OpenJDK 13) | 62 | `java` |
| C++ (GCC 9.2) | 54 | `cpp` |
| C (GCC 9.2) | 50 | `c` |
| JavaScript (Node.js 12) | 63 | `javascript` |

**Status ids:** 3 Accepted (ran fine), 4 Wrong Answer (only when you pass `expected_output`), 5 Time Limit Exceeded, 6 Compilation Error, 7-12 Runtime Error, 13 Internal Error.

**Notes**
- With no `expected_output`, status 3 only means the program **ran without errors**. The analyzer compares the output with the expected output itself.
- In Java, name the class `Main`.
- Judge0 runs code in a sandbox, but it should never be exposed to the internet. Keep port 2358 on `127.0.0.1`.

---

## 7. A typical flow (how the pieces fit)

```
1. Company sends skills to the TPO            -> POST /agents/prereqs        -> TPO approves -> save tree in MongoDB
2. Student connects GitHub / LeetCode / HR    -> (your connectors fetch data) -> POST /agents/profile
3. Your code compares profile and tree        -> list of missing skills (plain code, no endpoint yet)
4. Sort missing skills (prerequisites first)  -> POST /agents/roadmap (with target_skill)
5. Student starts a test                      -> POST /assessment/generate   -> save `questions`, show `student_paper`
6. Student runs code while solving            -> POST /assessment/run-code
7. Student submits                            -> POST /assessment/grade      -> save result; mark skill verified if passed
8. Faculty exams (CT1, CT2, practicals)       -> faculty marks also mark skills verified
9. Your code calculates the match score       -> POST /agents/match          -> TPO sees ranking and explanation
```

Steps 2, 3, 8 and the score in step 9 are **code you still need to write**. The APIs cover the AI and code-running parts only.

---

## 8. Errors and fixes

| What you see | What it means | Fix |
|---|---|---|
| `422` with `json_invalid` | The JSON you sent is not valid (single quotes, missing quotes, trailing comma, curly quotes) | Retype using double quotes only |
| `422` with `Field required` | A required field is missing or the body is empty | Check the request table for that endpoint |
| `422` "Unknown question type" | `counts` has a type other than `mcq`, `multi_select`, `short_answer`, `coding` | Fix the key names |
| `422` "Unsupported language" | Language is not one of `python`, `java`, `cpp`, `c`, `javascript` | Use one of those |
| `413` | Code (over 20,000 characters) or input (over 10,000) is too long | Shorten it |
| `502` "Code runner (Judge0) is not reachable" | The analyzer cannot reach Judge0 | `docker compose ps`; check `judge0-server` and `judge0-worker` are running and `JUDGE0_URL` is set |
| `500 Internal Server Error` | Something failed inside | `docker compose logs analyzer --tail 30` |
| Connection refused | The analyzer is not running | `docker compose up -d --build analyzer`, then check logs |
| Very slow or time out | The model is busy, or coding generation is retrying | Wait up to 2 minutes; use a long timeout (300 s) |
| `/docs` box shows `additionalProp1` | An old `main.py` is running | Replace `analyzer/main.py`, rebuild, press Ctrl+F5 |
| `generate` returns fewer questions than asked | Some failed the checks (see `warnings`) | Ask for a few extra, or call it again |
| `needs_review` is not empty | A written answer looked suspicious, or the AI's proof quote was not found | A faculty member should read those answers |
| `prereqs` answer contains `warnings` | The tree is still weak after 3 tries | Edit it by hand (TPO review) or try again |
| Analyzer crashes with `ModuleNotFoundError` | A file or package is missing | Check all 4 `.py` files are in `analyzer\` and `requirements.txt` has `httpx` |
| GPU out of memory in `llm-analysis` logs | Another program is using the GPU | Close it, then `docker compose up -d llm-analysis` |

---

## 9. Choosing which model each agent uses

By default, every agent uses the `analysis` model at `http://llm-analysis:8000/v1`. To give an agent its own model, add variables to the `analyzer` service in `docker-compose.yml`. For example, use a code model for coding questions (after you add an `llm-coder` service):

```yaml
    environment:
      LLM_API_KEY: ${LLM_API_KEY}
      JUDGE0_URL: http://judge0-server:2358
      CODING_URL: http://llm-coder:8000/v1
      CODING_MODEL: coder
```

Then run `docker compose up -d --build analyzer`.

| What it does | URL variable | Model variable |
|---|---|---|
| `/agents/prereqs` | `PREREQS_URL` | `PREREQS_MODEL` |
| `/agents/profile` | `PROFILE_URL` | `PROFILE_MODEL` |
| `/agents/roadmap` | `ROADMAP_URL` | `ROADMAP_MODEL` |
| MCQ, multi-select and written question writing | `ASSESS_URL` | `ASSESS_MODEL` |
| Coding problem writing | `CODING_URL` | `CODING_MODEL` |
| Checking written answers | `GRADER_URL` | `GRADER_MODEL` |
| `/agents/match` | `MATCH_URL` | `MATCH_MODEL` |

---

## 10. Handy commands

```powershell
docker compose ps                                   # what is running
docker compose up -d --build analyzer               # rebuild after editing analyzer files
docker compose logs analyzer --tail 30              # analyzer messages
docker compose logs llm-analysis --tail 30          # model server messages
docker compose logs judge0-worker --tail 30         # code runner messages
docker compose restart analyzer                     # restart without rebuilding
docker compose config                               # check docker-compose.yml for mistakes
```

Run all of these from the `exponentor` folder.

---

## 11. Safety notes

- The analyzer and Judge0 have **no login**. Keep them bound to `127.0.0.1` and call them only from your own backend. Add authentication before exposing anything to the internet.
- **Save the full paper on the server** and send students only `student_paper`. The full paper contains the answer keys and hidden tests.
- Gemini API keys in both formats work: the classic `AIza...` keys and the newer `AQ....` keys from Google AI Studio. Put one key in `GEMINI_API_KEY`, or several (comma-separated) in `LLM_API_KEYS`. The key is sent to Google exactly as written; nothing checks its prefix.
- Keep `.env` (with `LLM_API_KEY`) private and out of GitHub. If a key was ever pasted in a chat or screenshot, generate a new one.
- AI output is a **draft**. Prerequisite trees should be approved by the TPO. Questions and written-answer grades used for real verification should be reviewed by faculty, especially anything in `needs_review`.
- Coding tests check outputs only. They do not detect copying. For real exams, add a time limit, randomise questions per student, and compare submissions for similarity.
- Student profile and answer data is personal data. Collect it with consent and store only what you need.