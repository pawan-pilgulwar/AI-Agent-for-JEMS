/**
 * Server-side client for the Agent service (`Agent/analyzer`).
 *
 * The Agent has no login of its own, so it must only ever be called from this
 * server — never from the browser. Its base URL comes from `AGENT_BASE_URL`
 * (localhost during development, the hosted URL in production). Every call
 * has a hard timeout (`AGENT_TIMEOUT_MS`, default 300 s) and failures are
 * normalised into `AgentError`, which tells the task runner whether a retry
 * could help. `/agents/roadmap` makes dozens of rate-limited LLM calls, so it
 * gets its own, longer limit (`AGENT_ROADMAP_TIMEOUT_MS`, default 750 s).
 */

import http from "node:http";
import https from "node:https";
import type {
  GenerateRequest,
  GenerateResponse,
  GradeRequest,
  GradeResponse,
  GradeTextRequest,
  GradeTextResponse,
  MatchRequest,
  MatchResponse,
  PrereqsRequest,
  PrereqsResponse,
  ProfileRequest,
  ProfileResponse,
  RoadmapRequest,
  RoadmapResponse,
  RunCodeRequest,
  RunCodeResponse,
  SimpleAssessmentRequest,
  SimpleAssessmentResponse,
} from "./types";

const DEFAULT_TIMEOUT_MS = 300_000;
const DEFAULT_ROADMAP_TIMEOUT_MS = 750_000;

export class AgentError extends Error {
  /** HTTP status from the Agent, or 0 for network / timeout failures. */
  readonly status: number;
  /** True when retrying later could succeed (network, timeout, 5xx, 429). */
  readonly transient: boolean;

  constructor(message: string, status: number, transient: boolean) {
    super(message);
    this.name = "AgentError";
    this.status = status;
    this.transient = transient;
  }
}

export function agentBaseUrl(): string {
  return (process.env.AGENT_BASE_URL || "http://localhost:8080").replace(/\/+$/, "");
}

function envMs(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function timeoutMs(): number {
  return envMs("AGENT_TIMEOUT_MS", DEFAULT_TIMEOUT_MS);
}

/** Pulls a readable message out of a FastAPI error body (`{detail: ...}`). */
function errorMessage(status: number, body: string): string {
  try {
    const data = JSON.parse(body) as { detail?: unknown };
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail)) {
      return data.detail
        .map((d) => (typeof d === "object" && d && "msg" in d ? String((d as { msg: unknown }).msg) : String(d)))
        .join("; ");
    }
  } catch {
    // not JSON — fall through
  }
  return body.slice(0, 300) || `Agent responded with HTTP ${status}.`;
}

/**
 * One HTTP exchange with the Agent. Uses `node:http(s)` rather than `fetch`:
 * Node's fetch (undici) gives up after 300 s without response headers and
 * reports only "fetch failed", but the Agent sends no headers until a long
 * job such as `/agents/roadmap` is done. Here the caller's signal is the only
 * limit.
 */
function send(
  method: string,
  url: URL,
  headers: Record<string, string>,
  payload: string | undefined,
  signal: AbortSignal,
): Promise<{ status: number; text: string }> {
  const lib = url.protocol === "https:" ? https : http;
  return new Promise((resolve, reject) => {
    const req = lib.request(url, { method, headers, signal }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => resolve({ status: res.statusCode ?? 0, text: Buffer.concat(chunks).toString("utf8") }));
      res.on("error", reject);
    });
    req.on("error", reject);
    req.end(payload);
  });
}

async function request<T>(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
  opts: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<T> {
  const controller = new AbortController();
  const limit = opts.timeoutMs ?? timeoutMs();
  const timer = setTimeout(() => controller.abort(new Error("timeout")), limit);
  const onAbort = () => controller.abort(opts.signal?.reason);
  opts.signal?.addEventListener("abort", onAbort, { once: true });

  const payload = body === undefined ? undefined : JSON.stringify(body);
  const headers: Record<string, string> = { Accept: "application/json" };
  if (payload !== undefined) {
    headers["Content-Type"] = "application/json";
    headers["Content-Length"] = String(Buffer.byteLength(payload));
  }
  if (process.env.AGENT_API_KEY) headers.Authorization = `Bearer ${process.env.AGENT_API_KEY}`;

  let res: { status: number; text: string };
  try {
    res = await send(method, new URL(`${agentBaseUrl()}${path}`), headers, payload, controller.signal);
  } catch (err) {
    if (opts.signal?.aborted) throw new AgentError("The AI task was cancelled.", 0, false);
    // A timeout is not retried: the Agent keeps working on the abandoned
    // request, so a retry would compete with it for the same LLM quota and
    // time out again.
    const timedOut = controller.signal.aborted;
    throw new AgentError(
      timedOut
        ? `The AI agent did not answer within ${Math.round(limit / 1000)} seconds.`
        : `Could not reach the AI agent at ${agentBaseUrl()} (${err instanceof Error ? err.message : "network error"}).`,
      0,
      !timedOut,
    );
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener("abort", onAbort);
  }

  const ok = res.status >= 200 && res.status < 300;
  if (!ok) {
    const transient = res.status >= 500 || res.status === 429 || res.status === 408;
    throw new AgentError(errorMessage(res.status, res.text), res.status, transient);
  }
  try {
    return JSON.parse(res.text) as T;
  } catch {
    throw new AgentError("The AI agent returned a response that is not valid JSON.", res.status, true);
  }
}

type CallOpts = { signal?: AbortSignal };

/** One function per Agent endpoint (see `Agent/postman/`). */
export const agent = {
  health: () => request<{ ok: boolean }>("GET", "/health", undefined, { timeoutMs: 5_000 }),

  prereqs: (body: PrereqsRequest, o?: CallOpts) => request<PrereqsResponse>("POST", "/agents/prereqs", body, o),
  profile: (body: ProfileRequest, o?: CallOpts) => request<ProfileResponse>("POST", "/agents/profile", body, o),
  roadmap: (body: RoadmapRequest, o?: CallOpts) =>
    request<RoadmapResponse>("POST", "/agents/roadmap", body, {
      ...o,
      timeoutMs: envMs("AGENT_ROADMAP_TIMEOUT_MS", DEFAULT_ROADMAP_TIMEOUT_MS),
    }),
  simpleAssessment: (body: SimpleAssessmentRequest, o?: CallOpts) =>
    request<SimpleAssessmentResponse>("POST", "/agents/assessment", body, o),
  match: (body: MatchRequest, o?: CallOpts) => request<MatchResponse>("POST", "/agents/match", body, o),

  generatePaper: (body: GenerateRequest, o?: CallOpts) =>
    request<GenerateResponse>("POST", "/assessment/generate", body, o),
  /** Interactive "Run" button — short timeout, it is a single Judge0 run. */
  runCode: (body: RunCodeRequest, o?: CallOpts) =>
    request<RunCodeResponse>("POST", "/assessment/run-code", body, { ...o, timeoutMs: 60_000 }),
  gradePaper: (body: GradeRequest, o?: CallOpts) => request<GradeResponse>("POST", "/assessment/grade", body, o),
  gradeText: (body: GradeTextRequest, o?: CallOpts) =>
    request<GradeTextResponse>("POST", "/assessment/grade-text", body, o),
};
