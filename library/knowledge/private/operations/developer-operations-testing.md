# Developer Operations and Testing

> Category: Operations | Version: 1.1 | Date: August 2026 | Status: Active

Runtime setup, MCP subprocess operations, supported entry points, test boundaries, and benchmarks.

**Related:**
- [System architecture](../architecture/system-architecture.md)
- [Search and retrieval pipeline](../search/search-retrieval-pipeline.md)
- [Local web and SSE jobs](../web/local-web-sse-jobs.md)
- [Provider and credential model](../security/provider-credential-model.md)

---

## Runtime setup and entry points

The project combines Python 3.9+ with Bun and Node.js. Python pins `openai==2.48.0`; Bun pins
`@kenkaiiii/kencode-search@0.1.18` and `@modelcontextprotocol/sdk@1.30.0` (`pyproject.toml:5-17`,
`package.json:14-22`). `bun run start` serves the local UI, and `bun run dev` watches `server.ts`.

The CLI accepts a topic, `--results-per-query`, `--top`, optional `--model`, opt-in `--live-mcp`, and optional
file-based `--grep-evidence` (`repo_finder.py:788-796`). The web worker always supplies `--live-mcp`
(`server.ts:108-126`). Progress is written to stderr and the final JSON document to stdout.

## Unit tests

The deterministic suites are `bun test` and `python3 -m unittest discover -s tests -v`. Coverage includes:

- KenCode labeled-output parsing, no-results handling, malformed/unlicensed blocks, and input/result/snippet bounds (`tests/grep_mcp.test.ts`);
- query normalization, intent/search-plan validation, and malformed adaptive-query rejection;
- public GitHub and SPDX filtering, archive preservation, provenance/license merging, rate limits, and invalid-token fallback;
- argv-only bridge invocation, restricted environment forwarding, loaded/no-match/partial/error states, and malformed bridge rows (`tests/test_repo_finder.py:96-318`);
- file-evidence compatibility and exclusion of unlicensed file-only rows from production ranking (`tests/test_repo_finder.py:341-399`);
- provider credential requirements, OpenRouter SDK configuration, and oversized-topic rejection.

The tests mock external requests, SDK calls, and the Python-to-Bun subprocess. The explicit live smoke test below
exercises the real stdio server and public index. Browser rendering, SSE replay/cancellation, and accessibility still
require integration or browser checks; `DESIGN.md:26-28` records the accessibility gap.

## Benchmark

`python3 benchmarks/run_benchmark.py` runs three fixed topics and writes timestamped JSON under ignored
`benchmark-results/`. `benchmarks/grep_evidence.json` remains an optional file-based fixture. Its rows may include
`license`; rows without a recognized SPDX identifier still load for compatibility but cannot enter production
ranking unless merged evidence establishes a valid repository license (`repo_finder.py:495-541`,
`repo_finder.py:742-756`).

## Change checklist

1. Keep stdout as one JSON document; MCP/server logs belong on stderr.
2. Add deterministic TypeScript parser tests and mocked Python boundary tests for bridge changes.
3. Run `bun run format`, then re-read formatter-mutated files.
4. Run `bun run check`, `bun test`, and `python3 -m unittest discover -s tests -v`.
5. Run `printf '{"probes":["useState("]}' | bun run grep_mcp.ts` when network access is acceptable; verify every returned row has repository, file, link, snippet, and license.
6. Run `git diff --check` and inspect the complete diff before commit.
7. Run the benchmark only when model credentials and live-service variability are acceptable.
