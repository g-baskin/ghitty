# Ghitty

Recall-first GitHub repository discovery using OpenAI-compatible structured outputs, adaptive query expansion, GitHub Search, and code evidence from Ken's Grep MCP.

![Ghitty scanning a network of software repositories for evidence-backed matches](assets/ghitty-hero.png)

## How Ghitty searches

One topic fans out across languages, metadata, adjacent ecosystems, and code evidence before Ghitty ranks the strongest matches.

![Ghitty expanding a query into broad search paths and converging on evidence-backed repository matches](assets/ghitty-search-pipeline.png)

## Run the local web app

Install both runtimes once:

```bash
bun install
python3 -m venv .venv && source .venv/bin/activate
pip install .
```

Store keys in macOS Keychain so they remain encrypted at rest, then start the app with the key available only to the local Bun server and its Python worker:

```bash
security add-generic-password -U -a "$USER" -s repo-finder-openrouter -w
export GITHUB_TOKEN="$(gh auth token)" # optional; requires an authenticated GitHub CLI
OPENROUTER_API_KEY="$(security find-generic-password -a "$USER" -s repo-finder-openrouter -w)" \
  PORT=3001 bun run start
```

`GITHUB_TOKEN` raises GitHub metadata and KenCode license-lookup limits. The MCP bridge maps it to
`CFM_GITHUB_TOKEN` unless that dedicated variable is already set; model-provider keys are not forwarded to KenCode.

Open <http://localhost:3001>. Every web search enables live KenCode MCP evidence. Choose a model at
<http://localhost:3001/settings>; the non-sensitive preference stays in browser storage. For a simpler setup, copy
`.env.example` to `.env` and add the key there; `.env` is gitignored but remains plaintext.

Ghitty defaults to `openai/gpt-oss-120b`, the cheapest model that passed all three live strict-JSON planning checks. OpenRouter listed it at $0.03/M input tokens and $0.17/M output tokens on 2026-08-18. The settings page also offers faster `google/gemini-2.5-flash-lite` and higher-quality `openai/gpt-5-mini`; verify current prices before production use.

## Run one CLI search

```bash
ghitty "image generation" --live-mcp
```

Keys are read only from environment variables. `REPO_FINDER_PROVIDER` accepts `openai` or `openrouter`; automatic selection prefers OpenAI when both keys exist. Output is JSON; query progress and skipped requests go to stderr. Omit `--live-mcp` only for an intentional metadata-only run.

## Scores, all results, save, and export

Every eligible repository receives a deterministic score out of 100 before the model writes explanations:

- concept relevance: 30 points
- distinct GitHub query coverage: 30 points
- distinct code-probe evidence: 30 points
- maintenance state: 10 points

Stars never affect ranking. Results sort by score, then repository name for ties. The web app shows the top 10 by default and can expand to every scored candidate, up to the 100-candidate safety cap; each card exposes its factual score breakdown.

Completed searches can be saved in IndexedDB in the current browser and reopened without a network request. Browser-local saves disappear when site data is cleared. **Export JSON** downloads the same versioned snapshot as a portable copy; saving first is not required.

## Evidence and open-source gate

`create_search_plan()` emits 3–10 validated literal probes. Python sends one bounded JSON request to
`grep_mcp.ts`; the bridge starts the project-pinned `@kenkaiiii/kencode-search` stdio server through the pinned MCP
SDK, calls `searchCode` sequentially, and returns bounded labeled matches. A timeout, missing Bun/Node, malformed
response, or tool error is reported in `code_evidence`; licensed GitHub metadata can still rank.

A repository reaches ranking only when it is not marked private and has a non-empty SPDX identifier other than
`NOASSERTION` or `OTHER`. Picks expose `license` plus `evidence_type`; the UI distinguishes GitHub metadata, live
KenCode matches, and deliberately supplied file evidence.

`--grep-evidence benchmarks/grep_evidence.json` remains available for benchmark fixtures. Unlicensed file-only rows
load for backward compatibility but cannot enter production ranking.

## Run the benchmark

```bash
python3 benchmarks/run_benchmark.py
```

The benchmark compares literal GitHub search with the expanded hybrid pipeline for `image generation`, `llm agent orchestration`, and `splunk/cribl pipeline tooling`. Reports are written under ignored `benchmark-results/`.

## Verification

```bash
bun run format
bun run check
bun test
python3 -m unittest discover -s tests -v
printf '{"probes":["useState("]}' | bun run grep_mcp.ts
git diff --check
```

## License

Ghitty is licensed under the [GNU Affero General Public License v3.0](LICENSE) (`AGPL-3.0-only`). Network deployments of modified versions must offer their corresponding source code to users.