import { accessSync, constants, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { delimiter, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";

const MAX_INPUT_BYTES = 16_384;
const MAX_PROBES = 10;
const MAX_PROBE_LENGTH = 256;
const MAX_RESULTS = 20;
const MAX_SNIPPET_LENGTH = 4_000;
const TOOL_TIMEOUT_MS = 10_000;
const REPO_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const moduleRequire = createRequire(import.meta.url);
const SPDX_LICENSE_IDS = new Set<string>(
  ["spdx-license-ids/index.json", "spdx-license-ids/deprecated.json"].flatMap((module) => {
    const value: unknown = JSON.parse(readFileSync(moduleRequire.resolve(module), "utf8"));
    if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
      throw new Error(`Invalid SPDX license data in ${module}`);
    }
    return value;
  }),
);
const CFM_ENV_KEYS = [
  "CFM_BACKEND",
  "CFM_REPOS_DIR",
  "CFM_SOURCEGRAPH_URL",
  "CFM_SOURCEGRAPH_TOKEN",
  "CFM_GITHUB_TOKEN",
  "CFM_DISABLE_LICENSE",
  "CFM_SKIP_NETWORK",
] as const;

export interface CodeMatch {
  repo: string;
  file: string;
  link: string;
  snippet: string;
  license: string;
  stars?: number;
  updated_at?: string;
}

export interface BridgeResponse {
  results: Record<string, CodeMatch[]>;
  failures: Record<string, string>;
}

export function parseRequest(value: unknown): string[] {
  if (!value || typeof value !== "object" || !Array.isArray((value as { probes?: unknown }).probes)) {
    throw new Error("Request must contain a probes array");
  }
  const probes = (value as { probes: unknown[] }).probes;
  if (probes.length < 1 || probes.length > MAX_PROBES) {
    throw new Error(`Request must contain 1-${MAX_PROBES} probes`);
  }
  return probes.map((probe) => {
    if (typeof probe !== "string") throw new Error("Every probe must be text");
    const cleaned = probe.trim();
    if (cleaned.length < 3 || cleaned.length > MAX_PROBE_LENGTH || cleaned.includes("\0")) {
      throw new Error(`Every probe must be 3-${MAX_PROBE_LENGTH} characters without NUL bytes`);
    }
    return cleaned;
  });
}

export function parseSearchOutput(text: string): CodeMatch[] {
  if (/^(?:No results found|End of results\.)/m.test(text)) return [];
  const starts = [...text.matchAll(/^Repo: (.+)$/gm)];
  const rows: CodeMatch[] = [];
  for (let index = 0; index < starts.length && rows.length < MAX_RESULTS; index += 1) {
    const start = starts[index];
    const block = text.slice(start.index, starts[index + 1]?.index ?? text.length).trim();
    const lines = block.split("\n");
    const repoHeader = parseRepoHeader(lines[0] ?? "");
    const file = lines.find((line) => line.startsWith("File: "))?.slice(6).trim() ?? "";
    const link = lines.find((line) => line.startsWith("Link: "))?.slice(6).trim() ?? "";
    if (!repoHeader || !isValidFile(file) || !isValidLink(link, repoHeader.repo)) continue;
    const snippetStart = lines.findIndex((line) => line.startsWith("Link: ")) + 1;
    const snippet = lines.slice(snippetStart).join("\n").trim().slice(0, MAX_SNIPPET_LENGTH);
    if (!snippet) continue;
    rows.push({ ...repoHeader, file, link, snippet });
  }
  return rows;
}

function parseRepoHeader(line: string): Omit<CodeMatch, "file" | "link" | "snippet"> | undefined {
  const match = /^Repo: ([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)(?: \(([^)]*)\))?$/.exec(line);
  if (!match || !isValidRepositoryName(match[1])) return undefined;
  const metadata = (match[2] ?? "").split(",").map((part) => part.trim());
  const license = metadata.find((part) => isRecognizedLicense(part));
  if (!license) return undefined;
  const starsText = metadata.find((part) => part.startsWith("★"))?.slice(1);
  const updated_at = metadata.find((part) => part.startsWith("updated "))?.slice(8);
  const stars = starsText ? parseStars(starsText) : undefined;
  return {
    repo: match[1],
    license,
    ...(stars === undefined ? {} : { stars }),
    ...(updated_at && /^\d{4}-\d{2}-\d{2}$/.test(updated_at) ? { updated_at } : {}),
  };
}

function isValidRepositoryName(value: string): boolean {
  return REPO_PATTERN.test(value) && value.split("/").every((part) => part !== "." && part !== "..");
}

function isRecognizedLicense(value: string): boolean {
  return SPDX_LICENSE_IDS.has(value);
}

function isValidFile(file: string): boolean {
  return file.length > 0 && file.length <= 500 && !file.includes("\0") && !file.includes("\r");
}

function isValidLink(link: string, repo: string): boolean {
  if (link.length > 2_048) return false;
  try {
    const url = new URL(link);
    return url.protocol === "https:" && url.hostname === "github.com" && url.pathname.startsWith(`/${repo}/blob/`);
  } catch {
    return false;
  }
}

function parseStars(value: string): number | undefined {
  const match = /^(\d+(?:\.\d+)?)(k)?$/.exec(value);
  if (!match) return undefined;
  const stars = Number(match[1]) * (match[2] ? 1_000 : 1);
  return Number.isSafeInteger(stars) ? stars : undefined;
}

function resolveNodeBinary(): string {
  if (process.release.name === "node" && isAbsolute(process.execPath)) return process.execPath;
  for (const directory of (process.env.PATH ?? "").split(delimiter)) {
    if (!directory) continue;
    const candidate = join(directory, process.platform === "win32" ? "node.exe" : "node");
    try {
      accessSync(candidate, constants.X_OK);
      return resolve(candidate);
    } catch {
      // Keep looking for the first executable Node binary.
    }
  }
  throw new Error("Node.js is required to start kencode-search");
}

function serverEnvironment(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const key of CFM_ENV_KEYS) {
    const value = process.env[key];
    if (value !== undefined) env[key] = value;
  }
  if (!env.CFM_GITHUB_TOKEN && process.env.GITHUB_TOKEN) env.CFM_GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  return env;
}

async function readRequest(): Promise<string[]> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of process.stdin) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_INPUT_BYTES) throw new Error("Request exceeds input limit");
    chunks.push(buffer);
  }
  return parseRequest(JSON.parse(Buffer.concat(chunks).toString("utf8")));
}

async function runBridge(probes: string[]): Promise<BridgeResponse> {
  const serverPath = moduleRequire.resolve("@kenkaiiii/kencode-search");
  const transport = new StdioClientTransport({
    command: resolveNodeBinary(),
    args: [serverPath],
    env: serverEnvironment(),
    stderr: "ignore",
    maxBufferSize: 2_000_000,
  });
  const client = new Client({ name: "ghitty", version: "0.1.0" });
  const response: BridgeResponse = { results: {}, failures: {} };
  try {
    await client.connect(transport);
    for (const probe of probes) {
      try {
        const result = await client.callTool(
          {
            name: "searchCode",
            arguments: { query: probe, maxResults: MAX_RESULTS, contextLines: 3, maxFilesPerRepo: 2 },
          },
          CallToolResultSchema,
          { timeout: TOOL_TIMEOUT_MS, maxTotalTimeout: TOOL_TIMEOUT_MS },
        );
        if (result.isError) throw new Error("searchCode returned an error");
        const content = Array.isArray(result.content) ? result.content : [];
        const text = content
          .filter(
            (item: unknown): item is { type: "text"; text: string } =>
              !!item &&
              typeof item === "object" &&
              (item as { type?: unknown }).type === "text" &&
              typeof (item as { text?: unknown }).text === "string",
          )
          .map((item) => item.text)
          .join("\n");
        response.results[probe] = parseSearchOutput(text);
      } catch (error) {
        response.failures[probe] = error instanceof Error ? error.message.slice(0, 300) : "Unknown MCP error";
      }
    }
  } finally {
    await client.close().catch(() => undefined);
  }
  return response;
}

async function main(): Promise<void> {
  try {
    const probes = await readRequest();
    process.stdout.write(`${JSON.stringify(await runBridge(probes))}\n`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Bridge failed");
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
