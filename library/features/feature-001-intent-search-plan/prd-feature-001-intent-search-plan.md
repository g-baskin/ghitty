# Feature: Intent/Search-Plan Refactoring

> Category: Search | Version: 1.1 | Date: August 2026 | Status: Completed

Creates a bounded intent/search plan, executes its literal probes through live KenCode MCP, and ranks only public
repositories with recognized SPDX licenses.

**Related:**
- [Search and retrieval pipeline](../../knowledge/private/search/search-retrieval-pipeline.md)
- [System architecture](../../knowledge/private/architecture/system-architecture.md)
- [Developer operations and testing](../../knowledge/private/operations/developer-operations-testing.md)
- [Provider and credential model](../../knowledge/private/security/provider-credential-model.md)

---

## Context / Problem

The original `expand_topic()` stage produced interpretations, GitHub queries, and code probes but lacked explicit
validation on model-generated syntax. Later, the web worker passed `benchmarks/grep_evidence.json` into production,
which made pre-captured rows look like live code evidence. Candidates could also rank without a recognized license,
so a public search result was not necessarily safely reusable open source.

## Decision

1. Keep `create_search_plan()` as the primary intent stage and `expand_topic()` as its compatibility alias.
2. Validate and bound interpretations, technical concepts, GitHub queries, and literal code probes before I/O.
3. Execute probes through the project-pinned `@kenkaiiii/kencode-search` stdio server via a small TypeScript MCP client.
4. Keep `--grep-evidence` only as explicitly file-based compatibility input.
5. Rank a candidate only when it is not marked private and has a non-empty SPDX identifier other than
   `NOASSERTION` or `OTHER`.

## Implementation

### Search plan

`INTENT_SEARCH_PLAN_SCHEMA` requires 1–4 interpretations, 1–10 technical concepts, 8–12 GitHub queries, and 3–10
code probes (`repo_finder.py:37-46`). `create_search_plan()` builds and validates the plan
(`repo_finder.py:279-315`); the three boundary validators reject malformed terms, unsupported GitHub syntax, and
generic/non-literal probes (`repo_finder.py:318-343`).

### MCP boundary

`grep_mcp.ts` reads at most 16 KiB of JSON containing 1–10 probes, then revalidates each probe
(`grep_mcp.ts:9-58`, `grep_mcp.ts:151-161`). It resolves the project-installed server entry point, starts it with an
executable Node binary through `StdioClientTransport`, calls `searchCode` sequentially with 20-result, context,
diversity, and 10-second per-call bounds, and closes the client in `finally` (`grep_mcp.ts:126-149`,
`grep_mcp.ts:163-206`).

The parser accepts only documented `Repo:`, `File:`, and `Link:` blocks. It bounds files, links, snippets, and rows;
requires an HTTPS GitHub blob URL matching the repository; and rejects missing, `NOASSERTION`, or `OTHER` licenses
(`grep_mcp.ts:60-123`).

Python invokes the bridge with an argv array and `shell=False` semantics, a 120-second process timeout, a 2 MB stdout
cap, and a restricted environment. It validates the JSON again and returns `loaded`, `no-matches`, `partial`,
`error`, or `disabled` without aborting successful GitHub metadata discovery (`repo_finder.py:544-688`).

### Open-source gate and ranking

`Candidate` preserves `license` and public/private state in ranking records (`repo_finder.py:90-134`). GitHub rows
are validated as non-private, canonical GitHub repositories with recognized SPDX identifiers before becoming
candidates (`repo_finder.py:350-432`). KenCode rows pass the same repository/license rule before merge
(`repo_finder.py:559-634`). The merged set is filtered again immediately before ranking
(`repo_finder.py:752-756`).

`run()` reports live evidence separately from file evidence and serializes each pick's `license` and
`evidence_type` (`repo_finder.py:712-785`). The web worker enables `--live-mcp` and no longer injects the benchmark
file (`server.ts:108-126`). Result cards expose exact evidence source labels and licenses
(`public/app.js:73-99`, `public/app.js:128-157`).

## Output Contract

```json
{
  "code_evidence": {
    "source": "kencode-search",
    "status": "loaded | no-matches | partial | error | disabled",
    "probe_count": 3,
    "candidate_count": 12,
    "failures": {}
  },
  "static_evidence": {
    "source": "file",
    "status": "not-provided | loaded | no-matches",
    "candidate_count": 0
  },
  "picks": [
    {
      "url": "https://github.com/owner/repo",
      "license": "Apache-2.0",
      "evidence_type": "both | code-match | metadata-match"
    }
  ]
}
```

## Failure Behavior

- Missing Bun/Node, bridge timeout, malformed output, or a global MCP error sets `code_evidence.status` to `error`.
- A failed subset of probes plus at least one valid match sets `partial`; failures remain keyed by probe.
- Live evidence failure does not erase licensed GitHub metadata results.
- Unlicensed or private rows fail closed and never reach model ranking.
- Static rows without licenses still load for benchmark compatibility but cannot rank unless merged repository
  evidence establishes a valid license.

## Verification

Parser and boundary tests live in `tests/grep_mcp.test.ts`. Python coverage for public/SPDX filtering, safe subprocess
arguments/environment, MCP states, malformed rows, merging, and static compatibility lives at
`tests/test_repo_finder.py:96-318` and `tests/test_repo_finder.py:341-399`.

```bash
bun run format
bun run check
bun test
python3 -m unittest discover -s tests -v
printf '{"probes":["useState("]}' | bun run grep_mcp.ts
git diff --check
```

## Backward Compatibility

- `expand_topic()` remains an alias for `create_search_plan()`.
- `--grep-evidence` and `static_evidence` remain available but are explicitly file-based.
- Existing evidence types remain `metadata-match`, `code-match`, and `both`; `license` and `code_evidence` are
  additive output fields.
