# Developer Operations and Testing

> Category: Operations | Version: 1.0 | Date: August 2026 | Status: Active

Runtime setup, supported entry points, unit-test boundaries, and benchmark operations.

**Related:**
- [System architecture](../architecture/system-architecture.md)
- [Search and retrieval pipeline](../search/search-retrieval-pipeline.md)
- [Local web and SSE jobs](../web/local-web-sse-jobs.md)
- [Provider and credential model](../security/provider-credential-model.md)

---

## Runtime setup and entry points

The project combines Python 3.9+ with Bun. Python installs one runtime dependency, `openai==2.48.0`, and exposes the `ghitty` console script (`pyproject.toml:5-17`). Bun serves the local UI with `bun run start`; `bun run dev` watches `server.ts` (`package.json:7-16`). The full installation and credential startup commands are maintained in `README.md:5-45`.

The CLI accepts a topic plus `--results-per-query` (1–100, default 25), `--top` (1–50, default 10), optional `--model`, and optional `--grep-evidence` (`repo_finder.py:444-451`). Progress is written to stderr and the final document to stdout (`repo_finder.py:402-440`, `repo_finder.py:454-466`).

## Unit tests

The Python suite uses `unittest`, although the repository-level test command is `python3 -m unittest discover -s tests -v` (`tests/test_repo_finder.py:1-8`, `README.md:57-61`). Tests cover:

- query normalization and fork exclusion;
- archived-result preservation and provenance merging;
- GitHub rate-limit waiting and invalid-token fallback;
- Grep row validation and snippet bounds;
- provider credential requirements and OpenRouter SDK configuration;
- oversized-topic rejection before network access (`tests/test_repo_finder.py:11-133`).

The tests mock external requests and SDK calls. They do not exercise the Bun API, SSE replay/cancellation, browser rendering, live GitHub/model integrations, or accessibility behavior. `DESIGN.md:26-28` also records browser and accessibility checks as unverified.

## Benchmark

`python3 benchmarks/run_benchmark.py` runs three fixed topics: image generation, LLM agent orchestration, and Splunk/Cribl pipeline tooling. For each, it compares a literal GitHub search with `repo_finder.run`, records expanded candidate counts and top picks absent from the literal top 25, and writes timestamped JSON under ignored `benchmark-results/` (`benchmarks/run_benchmark.py:14-44`). A model-provider key is required; `GITHUB_TOKEN` remains optional (`benchmarks/run_benchmark.py:19-28`).

`benchmarks/grep_evidence.json` is imported evidence captured outside this process. Keep its row shape compatible with `load_grep_evidence`: topic key to rows containing `full_name`, matching GitHub blob `url`, `probe`, and `snippet` (`repo_finder.py:348-380`).

## Change checklist

1. Keep Python behavior and CLI output backward-compatible with the web worker's single-JSON stdout assumption (`server.ts:95-106`).
2. Add or update mocked Python unit tests for discovery behavior (`tests/test_repo_finder.py`).
3. When changing web jobs, validate create, replay, completion, failure, reconnect, and cancellation paths documented in [Local web and SSE jobs](../web/local-web-sse-jobs.md).
4. Use the package's `check` script for TypeScript/Biome changes and the unittest command for Python changes (`package.json:7-11`, `README.md:57-61`).
5. Run the benchmark only when credentials and live-service variability are acceptable; its output is not a deterministic unit test (`benchmarks/run_benchmark.py:19-44`).
