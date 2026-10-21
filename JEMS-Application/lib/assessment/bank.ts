/**
 * Skill-test question bank used by the Assessment Agent to *verify* a skill a
 * student has claimed. Static and rule-based (no LLM): the server picks a
 * seeded subset per attempt and grades it; answer keys never leave the server.
 *
 * `answer` is the index into `options`. Keep questions factual and unambiguous.
 */

export interface BankQuestion {
  q: string;
  options: string[];
  answer: number;
}

export const SKILL_BANK: Record<string, BankQuestion[]> = {
  HTML5: [
    { q: "Which element is the correct semantic choice for the main navigation links of a page?", options: ["<div>", "<nav>", "<section>", "<menu>"], answer: 1 },
    { q: "What does the `alt` attribute on an <img> provide?", options: ["A tooltip only", "The image caption", "Alternative text for accessibility and when the image fails to load", "The image's file name"], answer: 2 },
    { q: "Which input type gives a native date picker in modern browsers?", options: ["type=\"calendar\"", "type=\"date\"", "type=\"datetime\"", "type=\"day\""], answer: 1 },
    { q: "Which element represents self-contained content that could be distributed independently, like a blog post?", options: ["<article>", "<aside>", "<main>", "<span>"], answer: 0 },
    { q: "What is the purpose of the <label for=\"id\"> attribute?", options: ["Styles the input", "Associates the label with a form control so clicking it focuses the control", "Validates the input", "Groups radio buttons"], answer: 1 },
    { q: "Which attribute makes a script load without blocking HTML parsing and execute after parsing completes?", options: ["async", "defer", "lazy", "module"], answer: 1 },
    { q: "How many <h1> elements does HTML5 recommend as the top-level heading of a document outline?", options: ["Exactly one main heading", "One per paragraph", "At least three", "None — use <title> instead"], answer: 0 },
    { q: "Which element should wrap a figure's caption?", options: ["<caption>", "<figcaption>", "<legend>", "<summary>"], answer: 1 },
    { q: "What does the `required` attribute on a form field do?", options: ["Makes the field read-only", "Prevents form submission until the field has a value", "Encrypts the value", "Auto-fills the value"], answer: 1 },
    { q: "Which element is used for content tangentially related to the main content, like a sidebar?", options: ["<aside>", "<footer>", "<header>", "<details>"], answer: 0 },
  ],
  CSS3: [
    { q: "In Flexbox, which property aligns items along the main axis?", options: ["align-items", "justify-content", "align-content", "place-items"], answer: 1 },
    { q: "Which CSS unit is relative to the root element's font size?", options: ["em", "rem", "vh", "%"], answer: 1 },
    { q: "What does `grid-template-columns: repeat(3, 1fr)` create?", options: ["Three rows of equal height", "Three equal-width columns", "One column three times wider", "Three columns of 1px"], answer: 1 },
    { q: "Which selector has the highest specificity?", options: ["`.card`", "`div`", "`#main`", "`*`"], answer: 2 },
    { q: "What is the default value of `position`?", options: ["relative", "absolute", "static", "fixed"], answer: 2 },
    { q: "Which media query targets viewports at most 640px wide?", options: ["@media (min-width: 640px)", "@media (max-width: 640px)", "@media (width > 640px)", "@media screen and (640px)"], answer: 1 },
    { q: "What does `box-sizing: border-box` change?", options: ["Padding and border are included in the element's width and height", "Margins collapse", "The element becomes inline", "Borders are removed"], answer: 0 },
    { q: "Which property creates space *inside* an element's border?", options: ["margin", "gap", "padding", "outline"], answer: 2 },
    { q: "How do you declare a CSS custom property?", options: ["$primary: red;", "--primary: red;", "@primary: red;", "var primary = red;"], answer: 1 },
    { q: "Which value of `display` removes an element from layout entirely?", options: ["hidden", "none", "invisible", "collapse"], answer: 1 },
  ],
  JavaScript: [
    { q: "What is the output of `typeof null`?", options: ["\"null\"", "\"undefined\"", "\"object\"", "\"boolean\""], answer: 2 },
    { q: "Which statement about `const` is true?", options: ["The variable can be reassigned", "The binding cannot be reassigned, but object contents can still change", "It creates an immutable object", "It is function-scoped"], answer: 1 },
    { q: "What does `Promise.all([...])` do?", options: ["Resolves when the first promise resolves", "Resolves when all promises resolve, rejects if any rejects", "Runs promises one after another", "Cancels pending promises"], answer: 1 },
    { q: "What does `[1, 2, 3].map(x => x * 2)` return?", options: ["6", "[2, 4, 6]", "[1, 2, 3, 2, 4, 6]", "undefined"], answer: 1 },
    { q: "Which comparison is strict (no type coercion)?", options: ["==", "===", "=", "eq"], answer: 1 },
    { q: "What is a closure?", options: ["A function bundled with access to its lexical scope", "A loop that never ends", "An object with no prototype", "A way to close the browser tab"], answer: 0 },
    { q: "What does `await` do inside an `async` function?", options: ["Blocks the whole thread", "Pauses the function until the promise settles, without blocking the event loop", "Converts a value to a string", "Throws if the value is not a promise"], answer: 1 },
    { q: "What does `Array.prototype.filter` return?", options: ["The first matching element", "A new array with elements that pass the test", "The same array, mutated", "A boolean"], answer: 1 },
    { q: "Which of these is NOT a primitive type?", options: ["string", "number", "object", "symbol"], answer: 2 },
    { q: "What is the result of `0.1 + 0.2 === 0.3`?", options: ["true", "false", "NaN", "TypeError"], answer: 1 },
  ],
  TypeScript: [
    { q: "What does the `?` in `name?: string` mean in an interface?", options: ["The property is nullable", "The property is optional", "The property is read-only", "The property is a getter"], answer: 1 },
    { q: "Which type means 'this value can be anything, and I'll narrow it before use'?", options: ["any", "unknown", "never", "object"], answer: 1 },
    { q: "What does `Partial<T>` produce?", options: ["A type with all properties of T optional", "A type with half of T's properties", "A readonly version of T", "A union of T's keys"], answer: 0 },
    { q: "What is a discriminated union?", options: ["A union of types that share a literal `kind`-style property used to narrow", "A union that excludes null", "Two interfaces merged together", "A generic constraint"], answer: 0 },
    { q: "What does `as const` do to `[\"a\", \"b\"]`?", options: ["Makes it a mutable string[]", "Infers the readonly tuple type `readonly [\"a\", \"b\"]`", "Converts it to a Set", "Throws a compile error"], answer: 1 },
    { q: "Which keyword declares a generic type parameter?", options: ["<T>", "template", "generic", "typeof"], answer: 0 },
    { q: "What is the type of `x` after `if (typeof x === \"string\")` when x: string | number?", options: ["string | number", "string", "number", "unknown"], answer: 1 },
    { q: "What does the `never` type represent?", options: ["A value that may be undefined", "A value that never occurs (e.g. a function that always throws)", "An empty object", "Any falsy value"], answer: 1 },
    { q: "Which utility type picks a subset of properties from T?", options: ["Pick<T, K>", "Omit<T, K>", "Record<K, T>", "Extract<T, U>"], answer: 0 },
    { q: "What does `strictNullChecks` enforce?", options: ["Strings cannot be empty", "null and undefined are not assignable to other types unless allowed", "All variables must be initialised", "No implicit any"], answer: 1 },
  ],
  React: [
    { q: "Why must hooks be called at the top level of a component?", options: ["For performance", "So React can preserve hook order between renders", "Because JSX requires it", "To avoid closures"], answer: 1 },
    { q: "What does `useEffect(() => {...}, [])` do?", options: ["Runs on every render", "Runs once after the first render (and cleanup on unmount)", "Runs before render", "Never runs"], answer: 1 },
    { q: "Why do list items need a stable `key`?", options: ["For CSS styling", "So React can match elements between renders and avoid remounts", "To enable keyboard navigation", "Keys are optional decoration"], answer: 1 },
    { q: "What is 'lifting state up'?", options: ["Moving state to a global store", "Moving shared state to the closest common ancestor component", "Storing state in localStorage", "Using a class component"], answer: 1 },
    { q: "What does `useMemo` do?", options: ["Caches a computed value between renders until dependencies change", "Memoises a component", "Persists state across reloads", "Delays rendering"], answer: 0 },
    { q: "A controlled input is one whose value…", options: ["is set by the DOM", "is driven by React state via `value` + `onChange`", "cannot be changed", "uses a ref"], answer: 1 },
    { q: "What triggers a re-render of a function component?", options: ["Calling the function again manually", "A state or prop change (or a parent re-render)", "A CSS change", "A console.log"], answer: 1 },
    { q: "What does `React.memo` do?", options: ["Skips re-rendering a component when its props are shallowly equal", "Caches API responses", "Creates a memo note", "Prevents state updates"], answer: 0 },
    { q: "Which is the correct way to update state based on the previous value?", options: ["setCount(count + 1) always", "setCount(prev => prev + 1)", "count++", "this.state.count += 1"], answer: 1 },
    { q: "What is the purpose of React Context?", options: ["Server rendering", "Passing data through the tree without prop drilling", "Handling HTTP requests", "Replacing CSS"], answer: 1 },
  ],
  "Node.js": [
    { q: "Node.js runs JavaScript using which engine?", options: ["SpiderMonkey", "V8", "JavaScriptCore", "Chakra"], answer: 1 },
    { q: "Which module is used to work with file paths in a cross-platform way?", options: ["fs", "url", "path", "os"], answer: 2 },
    { q: "What is the event loop responsible for?", options: ["Compiling JS to machine code", "Scheduling callbacks and non-blocking I/O on a single thread", "Managing npm packages", "Rendering HTML"], answer: 1 },
    { q: "What does `npm install --save-dev` do?", options: ["Installs globally", "Adds the package to devDependencies", "Installs without saving", "Installs the latest Node version"], answer: 1 },
    { q: "Which object holds environment variables in Node?", options: ["process.env", "global.env", "os.env", "require('env')"], answer: 0 },
    { q: "What does `module.exports` do in CommonJS?", options: ["Imports a module", "Defines what a module exposes to `require()`", "Runs the module", "Caches the module"], answer: 1 },
    { q: "Which is a correct way to read a file without blocking the event loop?", options: ["fs.readFileSync", "fs.readFile with a callback or fs.promises.readFile", "require(file)", "JSON.parse(file)"], answer: 1 },
    { q: "What is middleware in Express?", options: ["A database driver", "A function with access to req, res and next that runs in the request pipeline", "A template engine", "A CSS preprocessor"], answer: 1 },
    { q: "What does `package-lock.json` guarantee?", options: ["Faster code", "Reproducible dependency versions across installs", "Security scanning", "TypeScript support"], answer: 1 },
    { q: "Which HTTP status code means 'Created'?", options: ["200", "201", "204", "301"], answer: 1 },
  ],
  SQL: [
    { q: "Which clause filters rows *after* aggregation?", options: ["WHERE", "HAVING", "GROUP BY", "ORDER BY"], answer: 1 },
    { q: "What does an INNER JOIN return?", options: ["All rows from both tables", "Only rows with matching keys in both tables", "All rows from the left table", "A cartesian product"], answer: 1 },
    { q: "Which statement removes all rows from a table but keeps its structure?", options: ["DROP TABLE", "DELETE FROM t (or TRUNCATE)", "REMOVE t", "CLEAR t"], answer: 1 },
    { q: "What is a primary key?", options: ["Any indexed column", "A column (or set) that uniquely identifies each row and cannot be NULL", "The first column", "A foreign reference"], answer: 1 },
    { q: "What does `SELECT COUNT(*) FROM users WHERE age > 30` return?", options: ["All users over 30", "The number of users over 30", "The oldest user", "An error"], answer: 1 },
    { q: "Why add an index to a column?", options: ["To enforce uniqueness only", "To speed up lookups and sorts on that column", "To compress data", "To allow NULLs"], answer: 1 },
    { q: "What does a LEFT JOIN include that an INNER JOIN does not?", options: ["Rows from the right table with no match", "Rows from the left table with no match (NULLs on the right)", "Duplicate rows", "Nothing extra"], answer: 1 },
    { q: "Which is the correct order of clauses?", options: ["SELECT → FROM → WHERE → GROUP BY → HAVING → ORDER BY", "SELECT → WHERE → FROM → ORDER BY", "FROM → SELECT → WHERE", "SELECT → ORDER BY → WHERE → FROM"], answer: 0 },
    { q: "What does a transaction's ROLLBACK do?", options: ["Commits changes", "Undoes changes made since the transaction began", "Deletes the table", "Creates a backup"], answer: 1 },
    { q: "What is a foreign key?", options: ["A key from another database", "A column referencing the primary key of another table to enforce a relationship", "An encrypted key", "An auto-increment column"], answer: 1 },
  ],
  Python: [
    { q: "What does `len([1, 2, 3])` return?", options: ["2", "3", "[3]", "None"], answer: 1 },
    { q: "Which data structure is ordered and mutable?", options: ["tuple", "set", "list", "frozenset"], answer: 2 },
    { q: "What does a list comprehension `[x*x for x in range(3)]` produce?", options: ["[0, 1, 4]", "[1, 4, 9]", "[0, 1, 2]", "(0, 1, 4)"], answer: 0 },
    { q: "What is the purpose of `if __name__ == \"__main__\":`?", options: ["Declares the main class", "Runs the block only when the file is executed directly, not when imported", "Imports the main module", "Defines an entry point for pip"], answer: 1 },
    { q: "Which keyword defines a generator function?", options: ["return", "yield", "async", "lambda"], answer: 1 },
    { q: "What does `dict.get(key, default)` do?", options: ["Raises KeyError if missing", "Returns the value or `default` if the key is missing", "Sets the key", "Deletes the key"], answer: 1 },
    { q: "How are code blocks delimited in Python?", options: ["Curly braces", "Indentation", "BEGIN/END", "Parentheses"], answer: 1 },
    { q: "What does `with open(path) as f:` guarantee?", options: ["The file is read fully", "The file is closed when the block exits, even on error", "The file is created", "The file is locked forever"], answer: 1 },
    { q: "In pandas, what does `df.head()` return?", options: ["The column names", "The first 5 rows", "The last row", "The DataFrame shape"], answer: 1 },
    { q: "What is a virtual environment for?", options: ["Running Python in the browser", "Isolating a project's dependencies from the system Python", "Speeding up code", "Compiling to C"], answer: 1 },
  ],
  Java: [
    { q: "Which keyword prevents a class from being subclassed?", options: ["static", "final", "abstract", "sealed off"], answer: 1 },
    { q: "What is the difference between `==` and `.equals()` for Strings?", options: ["No difference", "`==` compares references, `.equals()` compares content", "`.equals()` compares references", "`==` is faster and preferred"], answer: 1 },
    { q: "Which collection does not allow duplicate elements?", options: ["ArrayList", "LinkedList", "HashSet", "Vector"], answer: 2 },
    { q: "What does the JVM do?", options: ["Compiles Java to native code ahead of time only", "Executes bytecode and manages memory (garbage collection)", "Formats source code", "Manages Maven dependencies"], answer: 1 },
    { q: "What is an interface in Java?", options: ["A class with only private fields", "A contract of abstract methods (and default methods) a class can implement", "A GUI component", "A database connection"], answer: 1 },
    { q: "Which exception type must be declared or caught?", options: ["RuntimeException", "Checked exceptions (e.g. IOException)", "Error", "NullPointerException"], answer: 1 },
    { q: "In Spring Boot, which annotation marks a class as a REST controller?", options: ["@Service", "@RestController", "@Entity", "@Bean"], answer: 1 },
    { q: "What does `static` mean on a method?", options: ["It belongs to the class, not an instance", "It cannot be called", "It is thread-safe", "It returns void"], answer: 0 },
    { q: "Which is the correct entry point signature?", options: ["public void main()", "public static void main(String[] args)", "static main(String args)", "void Main(string[] a)"], answer: 1 },
    { q: "What does dependency injection achieve?", options: ["Faster compilation", "Decoupling a class from how its collaborators are created", "Automatic testing", "Encryption"], answer: 1 },
  ],
  Git: [
    { q: "What does `git commit` do?", options: ["Uploads changes to the remote", "Records a snapshot of staged changes in the local repository", "Discards changes", "Creates a branch"], answer: 1 },
    { q: "Which command stages a file?", options: ["git stage-file", "git add <file>", "git commit <file>", "git push <file>"], answer: 1 },
    { q: "What is a branch?", options: ["A copy of the repository on disk", "A movable pointer to a commit, allowing parallel lines of work", "A remote server", "A tag"], answer: 1 },
    { q: "What does `git pull` do?", options: ["Only downloads objects", "Fetches from the remote and merges (or rebases) into the current branch", "Deletes local changes", "Creates a pull request"], answer: 1 },
    { q: "How do you see uncommitted changes?", options: ["git log", "git status / git diff", "git show HEAD~1", "git branch"], answer: 1 },
    { q: "What is a merge conflict?", options: ["A network error", "Two branches changed the same lines and Git needs a human to choose", "A corrupted repository", "A missing remote"], answer: 1 },
    { q: "What does `.gitignore` do?", options: ["Deletes files", "Lists paths Git should not track", "Hides the repo", "Ignores commits"], answer: 1 },
    { q: "What does `git rebase` do compared to merge?", options: ["Replays commits on top of another base, giving a linear history", "Deletes commits", "Creates a merge commit always", "Only works on remotes"], answer: 0 },
    { q: "Which command creates and switches to a new branch?", options: ["git branch -m new", "git switch -c new (or git checkout -b new)", "git new branch", "git merge new"], answer: 1 },
    { q: "What is the purpose of a pull request?", options: ["To download code", "To propose and review changes before merging into a shared branch", "To pull a branch to your machine", "To tag a release"], answer: 1 },
  ],
  Docker: [
    { q: "What is a Docker image?", options: ["A running process", "A read-only template used to create containers", "A virtual machine", "A network"], answer: 1 },
    { q: "Which file defines how an image is built?", options: ["docker-compose.yml", "Dockerfile", "package.json", "image.cfg"], answer: 1 },
    { q: "What does `docker run -p 8080:80 nginx` do?", options: ["Builds nginx", "Runs nginx mapping host port 8080 to container port 80", "Pulls nginx only", "Opens port 8080 in the container only"], answer: 1 },
    { q: "How do containers differ from virtual machines?", options: ["Containers share the host kernel; VMs virtualise hardware with their own OS", "Containers are slower", "VMs share the kernel", "No difference"], answer: 0 },
    { q: "What is a volume for?", options: ["Increasing CPU", "Persisting data outside the container's writable layer", "Networking", "Logging"], answer: 1 },
    { q: "What does `docker compose up` do?", options: ["Builds one image", "Starts all services defined in the compose file", "Uploads images to a registry", "Updates Docker"], answer: 1 },
    { q: "Which instruction sets the command run when the container starts?", options: ["RUN", "CMD (or ENTRYPOINT)", "COPY", "EXPOSE"], answer: 1 },
    { q: "Why use multi-stage builds?", options: ["To run multiple containers", "To keep final images small by copying only build artefacts", "To speed up networking", "To enable GPU"], answer: 1 },
    { q: "What does `docker ps` list?", options: ["All images", "Running containers", "Volumes", "Networks"], answer: 1 },
    { q: "Where are images pushed for sharing?", options: ["A registry such as Docker Hub", "GitHub Issues", "A volume", "The kernel"], answer: 0 },
  ],
  AWS: [
    { q: "Which service provides resizable virtual servers?", options: ["S3", "EC2", "Route 53", "CloudFront"], answer: 1 },
    { q: "S3 is best described as…", options: ["A relational database", "Object storage", "A message queue", "A CDN"], answer: 1 },
    { q: "What does IAM manage?", options: ["Billing", "Identities, roles and permissions", "DNS", "Load balancing"], answer: 1 },
    { q: "Which service runs code without provisioning servers?", options: ["Lambda", "EC2", "EBS", "VPC"], answer: 0 },
    { q: "What is a VPC?", options: ["A virtual private network you define for AWS resources", "A payment card", "A database engine", "A monitoring tool"], answer: 0 },
    { q: "Which service is a managed relational database?", options: ["DynamoDB", "RDS", "SQS", "SNS"], answer: 1 },
    { q: "What is an Availability Zone?", options: ["A pricing tier", "One or more isolated data centres within a Region", "A security group", "An S3 bucket type"], answer: 1 },
    { q: "Which service distributes incoming traffic across targets?", options: ["Elastic Load Balancing", "CloudWatch", "Glacier", "KMS"], answer: 0 },
    { q: "What does CloudWatch do?", options: ["Stores objects", "Monitoring, logs and alarms", "Manages DNS", "Runs containers"], answer: 1 },
    { q: "What is the principle of least privilege in IAM?", options: ["Give every user admin", "Grant only the permissions needed for a task", "Use one shared root account", "Disable MFA"], answer: 1 },
  ],
};

/** Skills that have a bank — i.e. can be verified by a skill test right now. */
export const TESTABLE_SKILLS = Object.keys(SKILL_BANK);

const norm = (s: string) => s.trim().toLowerCase();

// Accept common spellings when looking up a bank.
const BANK_ALIASES: Record<string, string> = {
  html: "HTML5", "html5": "HTML5",
  css: "CSS3", css3: "CSS3", "css / tailwind": "CSS3", "tailwind css": "CSS3",
  js: "JavaScript", javascript: "JavaScript", "es6+": "JavaScript",
  ts: "TypeScript", typescript: "TypeScript",
  react: "React", "react.js": "React", reactjs: "React", hooks: "React",
  node: "Node.js", nodejs: "Node.js", "node.js": "Node.js", "express.js": "Node.js", express: "Node.js",
  sql: "SQL", postgresql: "SQL", postgres: "SQL", mysql: "SQL",
  python: "Python", pandas: "Python",
  java: "Java", "spring boot": "Java",
  git: "Git",
  docker: "Docker",
  aws: "AWS",
};

/** The bank key for a skill name, or null if no test exists for it. */
export function bankFor(skill: string): string | null {
  const k = norm(skill);
  if (SKILL_BANK[skill]) return skill;
  const alias = BANK_ALIASES[k];
  if (alias && SKILL_BANK[alias]) return alias;
  const direct = TESTABLE_SKILLS.find((s) => norm(s) === k);
  return direct ?? null;
}
