import { join } from "node:path";

const root = import.meta.dir;
const publicDir = join(root, "public");
const encoder = new TextEncoder();
const port = Number(Bun.env.PORT ?? 3000);
const hostname = Bun.env.HOST ?? "127.0.0.1";
const MAX_REQUEST_BYTES = 4096;
const MAX_OUTPUT_BYTES = 5_000_000;
const MAX_JOBS = 10;
const DEFAULT_OPENROUTER_MODEL = "openai/gpt-oss-120b";
const OPENROUTER_MODELS = [
  {
    id: DEFAULT_OPENROUTER_MODEL,
    name: "GPT OSS 120B",
    inputPerMillion: 0.03,
    outputPerMillion: 0.17,
    description: "Recommended lowest-cost model; passed all three live Ghitty planning checks.",
  },
  {
    id: "google/gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash Lite",
    inputPerMillion: 0.1,
    outputPerMillion: 0.4,
    description: "Fastest option, but less consistent on niche multilingual expansion.",
  },
  {
    id: "openai/gpt-5-mini",
    name: "GPT-5 Mini",
    inputPerMillion: 0.25,
    outputPerMillion: 2,
    description: "Higher-quality ranking when latency and cost matter less.",
  },
] as const;
const openRouterModelIds = new Set<string>(OPENROUTER_MODELS.map((model) => model.id));

type JobStatus = "queued" | "running" | "completed" | "failed" | "canceled";
type JobEvent = { type: string; data: unknown };
type Job = {
  id: string;
  topic: string;
  model: string;
  status: JobStatus;
  events: JobEvent[];
  subscribers: Set<ReadableStreamDefaultController<Uint8Array>>;
  process?: ReturnType<typeof Bun.spawn>;
};

const jobs = new Map<string, Job>();

const securityHeaders = {
  "Content-Security-Policy":
    "default-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: securityHeaders });
}

function isCanceled(job: Job): boolean {
  return job.status === "canceled";
}

function emit(job: Job, type: string, data: unknown): void {
  const event = { type, data };
  job.events.push(event);
  const chunk = encoder.encode(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
  for (const subscriber of job.subscribers) {
    try {
      subscriber.enqueue(chunk);
    } catch {
      job.subscribers.delete(subscriber);
    }
  }
}

async function readStream(
  stream: ReadableStream<Uint8Array>,
  onLine?: (line: string) => void,
): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let pending = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    text += chunk;
    if (text.length > MAX_OUTPUT_BYTES) {
      throw new Error("Process output exceeded 5 MB");
    }
    if (onLine) {
      pending += chunk;
      const lines = pending.split("\n");
      pending = lines.pop() ?? "";
      for (const line of lines) if (line.trim()) onLine(line.trim());
    }
  }
  const tail = decoder.decode();
  text += tail;
  if (onLine && `${pending}${tail}`.trim()) onLine(`${pending}${tail}`.trim());
  return text;
}

async function runSearch(job: Job): Promise<void> {
  job.status = "running";
  emit(job, "status", { state: "running", message: "Expanding the search topic" });
  const process = Bun.spawn(
    [
      "python3",
      join(root, "repo_finder.py"),
      job.topic,
      "--model",
      job.model,
      "--grep-evidence",
      join(root, "benchmarks", "grep_evidence.json"),
    ],
    {
      cwd: root,
      env: { ...Bun.env, REPO_FINDER_PROVIDER: "openrouter" },
      stdout: "pipe",
      stderr: "pipe",
    },
  );
  job.process = process;
  try {
    const stderrTask = readStream(process.stderr, (line) =>
      emit(job, "progress", { message: line }),
    );
    const stdoutTask = readStream(process.stdout);
    const [stderr, stdout, exitCode] = await Promise.all([stderrTask, stdoutTask, process.exited]);
    if (isCanceled(job)) return;
    if (exitCode !== 0) {
      throw new Error(stderr.trim().split("\n").at(-1) || `Search exited with code ${exitCode}`);
    }
    const result = JSON.parse(stdout) as unknown;
    job.status = "completed";
    emit(job, "result", result);
    emit(job, "status", { state: "completed", message: "Search complete" });
  } catch (error) {
    if (isCanceled(job)) return;
    job.status = "failed";
    const message = error instanceof Error ? error.message : "Search failed";
    emit(job, "job-error", { message });
    emit(job, "status", { state: "failed", message: "Search failed" });
  } finally {
    job.process = undefined;
    setTimeout(() => jobs.delete(job.id), 15 * 60 * 1000);
  }
}

async function createJob(request: Request): Promise<Response> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_REQUEST_BYTES) return json({ error: "Request is too large" }, 413);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return json({ error: "Content-Type must be application/json" }, 415);
  }
  if ([...jobs.values()].filter((job) => job.status === "running").length >= MAX_JOBS) {
    return json({ error: "Too many searches are already running" }, 429);
  }
  let payload: unknown;
  try {
    const body = await request.text();
    if (encoder.encode(body).byteLength > MAX_REQUEST_BYTES) {
      return json({ error: "Request is too large" }, 413);
    }
    payload = JSON.parse(body);
  } catch {
    return json({ error: "Request body must be valid JSON" }, 400);
  }
  const rawTopic =
    typeof payload === "object" && payload !== null && "topic" in payload ? payload.topic : null;
  const topic = typeof rawTopic === "string" ? rawTopic.trim().replace(/\s+/g, " ") : "";
  if (!topic || topic.length > 200)
    return json({ error: "Topic must contain 1-200 characters" }, 400);
  const rawModel =
    typeof payload === "object" && payload !== null && "model" in payload ? payload.model : null;
  const model = typeof rawModel === "string" && rawModel ? rawModel : DEFAULT_OPENROUTER_MODEL;
  if (!openRouterModelIds.has(model)) return json({ error: "Unsupported model selection" }, 400);

  const id = crypto.randomUUID();
  const job: Job = { id, topic, model, status: "queued", events: [], subscribers: new Set() };
  jobs.set(id, job);
  void runSearch(job);
  return json({ id }, 202);
}

function streamJob(job: Job): Response {
  let controllerRef: ReadableStreamDefaultController<Uint8Array> | undefined;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controllerRef = controller;
      job.subscribers.add(controller);
      for (const event of job.events) {
        controller.enqueue(
          encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`),
        );
      }
    },
    cancel() {
      if (controllerRef) job.subscribers.delete(controllerRef);
    },
  });
  return new Response(stream, {
    headers: {
      ...securityHeaders,
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
    },
  });
}

function cancelJob(job: Job): Response {
  if (job.status !== "queued" && job.status !== "running") {
    return json({ error: "Only active searches can be canceled" }, 409);
  }
  job.status = "canceled";
  job.process?.kill();
  emit(job, "status", { state: "canceled", message: "Search canceled" });
  return json({ status: "canceled" });
}

const staticFiles = new Map<string, readonly [string, string]>([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/settings", ["settings.html", "text/html; charset=utf-8"]],
  ["/settings/", ["settings.html", "text/html; charset=utf-8"]],
  ["/app.js", ["app.js", "text/javascript; charset=utf-8"]],
  ["/settings.js", ["settings.js", "text/javascript; charset=utf-8"]],
  ["/styles.css", ["styles.css", "text/css; charset=utf-8"]],
]);

Bun.serve({
  hostname,
  idleTimeout: 120,
  port,
  async fetch(request) {
    const url = new URL(request.url);
    const staticFile = staticFiles.get(url.pathname);
    if (request.method === "GET" && staticFile) {
      return new Response(Bun.file(join(publicDir, staticFile[0])), {
        headers: {
          ...securityHeaders,
          "Cache-Control": "no-store",
          "Content-Type": staticFile[1],
        },
      });
    }
    if (url.pathname === "/api/models" && request.method === "GET") {
      return json({ defaultModel: DEFAULT_OPENROUTER_MODEL, models: OPENROUTER_MODELS });
    }
    if (url.pathname === "/api/jobs" && request.method === "POST") return createJob(request);
    const match = url.pathname.match(/^\/api\/jobs\/([0-9a-f-]+)(?:\/events)?$/);
    if (!match) return json({ error: "Not found" }, 404);
    const job = jobs.get(match[1]);
    if (!job) return json({ error: "Search not found" }, 404);
    if (url.pathname.endsWith("/events") && request.method === "GET") return streamJob(job);
    if (request.method === "DELETE") return cancelJob(job);
    return json({ error: "Method not allowed" }, 405);
  },
});

console.log(`Ghitty running at http://localhost:${port}`);
