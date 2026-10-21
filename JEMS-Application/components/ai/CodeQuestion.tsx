"use client";

import { useState } from "react";
import { CircleCheck, CircleX, LoaderCircle, Play, TestTube2 } from "lucide-react";
import type { CodingLanguage, RunCodeResponse, StudentQuestion } from "@/lib/agent/types";

export const STARTER_CODE: Record<CodingLanguage, string> = {
  python: "import sys\n\ndata = sys.stdin.read().split()\n# write your solution here\n",
  java: "import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // write your solution here\n    }\n}\n",
  cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // write your solution here\n    return 0;\n}\n",
  c: "#include <stdio.h>\n\nint main(void) {\n    // write your solution here\n    return 0;\n}\n",
  javascript: "const input = require('fs').readFileSync(0, 'utf8').trim().split(/\\s+/);\n// write your solution here\n",
};

const LANG_LABEL: Record<string, string> = { python: "Python 3", java: "Java", cpp: "C++", c: "C", javascript: "JavaScript (Node)" };

const normalize = (s: string) => s.replace(/\r\n/g, "\n").split("\n").map((l) => l.trimEnd()).join("\n").trim();

async function runOnce(language: CodingLanguage, source_code: string, stdin: string): Promise<RunCodeResponse> {
  const res = await fetch("/api/student/ai/run-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language, source_code, stdin }),
  });
  const data = (await res.json().catch(() => ({}))) as { run?: RunCodeResponse; error?: string };
  if (!res.ok || !data.run) throw new Error(data.error || "Could not run the code.");
  return data.run;
}

/**
 * Coding question: language picker, editor, a "Run" with custom input and a
 * "Test on samples" check. Runs go through the Agent's Judge0 runner and
 * grade nothing — the real grading (hidden tests too) happens on submit.
 */
export default function CodeQuestion({
  q,
  value,
  onChange,
  disabled,
}: {
  q: StudentQuestion;
  value: { language: CodingLanguage; source_code: string } | undefined;
  onChange: (v: { language: CodingLanguage; source_code: string }) => void;
  disabled?: boolean;
}) {
  const languages = ((q.languages?.length ? q.languages : Object.keys(STARTER_CODE)) as CodingLanguage[]).filter((l) => l in STARTER_CODE);
  const language = value?.language ?? languages[0] ?? "python";
  const code = value?.source_code ?? STARTER_CODE[language];
  const [stdin, setStdin] = useState(q.samples?.[0]?.input ?? "");
  const [busy, setBusy] = useState<"run" | "samples" | null>(null);
  const [output, setOutput] = useState<RunCodeResponse | null>(null);
  const [sampleResults, setSampleResults] = useState<{ passed: boolean; got: string; expected: string; status: string }[] | null>(null);
  const [error, setError] = useState("");

  const setLanguage = (l: CodingLanguage) => {
    // Swap the starter only if the student hasn't written anything yet.
    const untouched = !value || value.source_code === STARTER_CODE[value.language];
    onChange({ language: l, source_code: untouched ? STARTER_CODE[l] : code });
  };

  const run = async () => {
    setBusy("run");
    setError("");
    setSampleResults(null);
    try {
      setOutput(await runOnce(language, code, stdin));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not run the code.");
    } finally {
      setBusy(null);
    }
  };

  const testSamples = async () => {
    setBusy("samples");
    setError("");
    setOutput(null);
    try {
      const out = [];
      for (const s of q.samples ?? []) {
        const r = await runOnce(language, code, s.input);
        out.push({ passed: r.status_id === 3 && normalize(r.stdout) === normalize(s.expected), got: r.status_id === 3 ? r.stdout : r.compile_output || r.stderr || r.status, expected: s.expected, status: r.status });
      }
      setSampleResults(out);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not run the code.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      {(q.input_format || q.output_format || q.constraints) && (
        <dl className="grid grid-cols-1 gap-2 rounded-lg bg-surface-2 p-3 text-xs sm:grid-cols-3">
          {q.input_format && <div><dt className="font-semibold text-navy">Input</dt><dd className="mt-0.5 whitespace-pre-wrap text-mediumgray">{q.input_format}</dd></div>}
          {q.output_format && <div><dt className="font-semibold text-navy">Output</dt><dd className="mt-0.5 whitespace-pre-wrap text-mediumgray">{q.output_format}</dd></div>}
          {q.constraints && <div><dt className="font-semibold text-navy">Constraints</dt><dd className="mt-0.5 whitespace-pre-wrap text-mediumgray">{q.constraints}</dd></div>}
        </dl>
      )}
      {q.samples && q.samples.length > 0 && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {q.samples.map((s, i) => (
            <div key={i} className="rounded-lg border border-lightgray p-2.5 text-xs">
              <p className="font-semibold text-navy">Sample {i + 1}</p>
              <p className="mt-1 text-mediumgray">Input</p>
              <pre className="mt-0.5 overflow-x-auto rounded bg-surface p-2 font-mono text-[12px] text-navy">{s.input || "(empty)"}</pre>
              <p className="mt-1 text-mediumgray">Expected output</p>
              <pre className="mt-0.5 overflow-x-auto rounded bg-surface p-2 font-mono text-[12px] text-navy">{s.expected}</pre>
            </div>
          ))}
        </div>
      )}
      {q.notes && <p className="text-[11px] text-mediumgray">{q.notes}</p>}

      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-xs font-medium text-navy">
          Language
          <select value={language} disabled={disabled} onChange={(e) => setLanguage(e.target.value as CodingLanguage)} className="h-8 rounded-md border border-lightgray bg-white px-2 text-xs text-navy outline-none focus:border-slate">
            {languages.map((l) => <option key={l} value={l}>{LANG_LABEL[l] ?? l}</option>)}
          </select>
        </label>
        <span className="text-[11px] text-mediumgray">{code.length.toLocaleString()} / 20,000</span>
      </div>
      <textarea
        value={code}
        disabled={disabled}
        onChange={(e) => onChange({ language, source_code: e.target.value.slice(0, 20_000) })}
        onKeyDown={(e) => {
          if (e.key !== "Tab") return;
          e.preventDefault();
          const el = e.currentTarget;
          const { selectionStart: a, selectionEnd: b } = el;
          const next = code.slice(0, a) + "    " + code.slice(b);
          onChange({ language, source_code: next });
          requestAnimationFrame(() => el.setSelectionRange(a + 4, a + 4));
        }}
        spellCheck={false}
        aria-label="Code editor"
        className="h-72 w-full resize-y rounded-lg border border-lightgray bg-[#0f172a] p-3 font-mono text-[13px] leading-relaxed text-slate-100 outline-none focus:border-slate focus:ring-2 focus:ring-slate/15 disabled:opacity-70"
      />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto]">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-navy">Custom input (stdin)</span>
          <textarea value={stdin} onChange={(e) => setStdin(e.target.value.slice(0, 10_000))} rows={3} className="w-full rounded-lg border border-lightgray bg-white p-2 font-mono text-[12px] text-navy outline-none focus:border-slate" />
        </label>
        <div className="flex gap-2 self-end lg:flex-col">
          <button type="button" onClick={run} disabled={disabled || !!busy} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-lightgray bg-white px-4 py-2 text-xs font-semibold text-navy transition-colors hover:border-slate hover:text-slate disabled:opacity-60">
            {busy === "run" ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />} Run
          </button>
          {q.samples && q.samples.length > 0 && (
            <button type="button" onClick={testSamples} disabled={disabled || !!busy} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-lightgray bg-white px-4 py-2 text-xs font-semibold text-navy transition-colors hover:border-slate hover:text-slate disabled:opacity-60">
              {busy === "samples" ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <TestTube2 className="h-3.5 w-3.5" />} Test on samples
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
      {output && (
        <div className="rounded-lg border border-lightgray text-xs">
          <p className={`border-b border-lightgray px-3 py-1.5 font-semibold ${output.status_id === 3 ? "text-emerald" : "text-red-600"}`}>
            {output.status}{output.time ? ` · ${output.time}s` : ""}
          </p>
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap p-3 font-mono text-[12px] text-navy">{output.stdout || output.compile_output || output.stderr || "(no output)"}</pre>
        </div>
      )}
      {sampleResults && (
        <ul className="space-y-1.5 text-xs">
          {sampleResults.map((r, i) => (
            <li key={i} className={`rounded-lg border p-2 ${r.passed ? "border-emerald/30 bg-emerald/5" : "border-red-200 bg-red-50"}`}>
              <span className={`inline-flex items-center gap-1 font-semibold ${r.passed ? "text-emerald" : "text-red-600"}`}>
                {r.passed ? <CircleCheck className="h-3.5 w-3.5" /> : <CircleX className="h-3.5 w-3.5" />} Sample {i + 1}: {r.passed ? "passed" : r.status === "Accepted" ? "wrong answer" : r.status}
              </span>
              {!r.passed && <pre className="mt-1 whitespace-pre-wrap font-mono text-[11px] text-navy">got: {r.got.slice(0, 300) || "(nothing)"}{"\n"}expected: {r.expected}</pre>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
