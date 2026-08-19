# Feature: Intent/Search-Plan Refactoring

> Category: Search | Version: 1.0 | Date: August 2026 | Status: Completed

Renames the intent stage from "expand topic" to "create search plan," adds a `technical_concepts` output, tightens
validation on model-generated queries and probes, and expands the `run()` output contract with
`original_request`, `search_plan`, and `static_evidence` fields.

**Related:**
- [Search and retrieval pipeline](../../knowledge/private/search/search-retrieval-pipeline.md)
- [System architecture](../../knowledge/private/architecture/system-architecture.md)
- [Developer operations and testing](../../knowledge/private/operations/developer-operations-testing.md)

---

## Context / Problem

The original `expand_topic()` stage produced interpretations, GitHub queries, and code probes but lacked
explicit validation on model-generated syntax. Parenthesized or heavily OR'd GitHub queries could slip
through to the API and fail. There was no structured tracking of whether static code evidence was
provided or matched. The function name "expand topic" did not describe the stage's actual job: producing
a concrete, bounded search plan from a freeform request.

## Decision

Rename the stage to `create_search_plan()`, keeping `expand_topic()` as a backward-compatible alias.
Add a required `technical_concepts` field to both the schema and the prompt so downstream code has
a vocabulary list explicitly separated from interpretations. Bound `interpretations` to a maximum of 4.
Add three boundary validators that reject malformed model output before it reaches the GitHub API or
is stored in the result. Replace the false "Grep MCP unavailable" message with accurate
`static_evidence` status reporting.

## Implementation

**Schema** — `repo_finder.py:31-41`
`INTENT_SEARCH_PLAN_SCHEMA` (renamed from `EXPANSION_SCHEMA`) requires four arrays:
`interpretations` (1-4), `technical_concepts` (1-10), `github_queries` (8-12), `code_probes` (3-10).

**Primary function** — `repo_finder.py:264-295`
`create_search_plan(request, model)` sends a prompt that:
- Labels the quoted request as untrusted data (line 266).
- Asks for interpretations, technical concepts, GitHub queries, and code probes (lines 267-276).
- Passes the response through each validator and dedupe before returning (lines 278-295).

**Backward alias** — `repo_finder.py:298-300`
`expand_topic(topic, model)` delegates to `create_search_plan`.

**Boundary validators** — `repo_finder.py:303-328`
- `validate_plan_term(value, label)` (line 303): rejects non-strings and lengths outside 1–256.
- `validate_github_query(query)` (line 312): rejects parentheses and >1 `OR` before normalizing.
- `validate_probe(probe)` (line 320): rejects non-strings, lengths outside 3–256, and generic
  terms (`ai`, `agent`, `pipeline`).

**Adaptive query hardening** — `repo_finder.py:409-425`
`discover_queries()` passes each model-generated adaptive query through `validate_github_query()`
(line 422) instead of bare `normalize_query()`, catching malformed syntax before the second API call.

**`run()` output expansion** — `repo_finder.py:484-533`
The return dict now includes:
- `original_request` (line 509)
- `search_plan` — the full plan dict (line 511)
- `technical_concepts` (line 513)
- `static_evidence` with `status` and `candidate_count` (lines 498-505, line 517)

Accurate stderr messages replace the false "Grep MCP unavailable" text (lines 499, 502, 505).

## Verification

Four new tests in `tests/test_repo_finder.py`:

| Test | Line | What it proves |
|------|------|----------------|
| `test_create_search_plan_preserves_request_and_builds_explicit_intent` | 16 | Round-trips a mocked model response; verifies `original_request` preservation, whitespace trimming, `fork:false` appending, schema usage, and prompt content. |
| `test_create_search_plan_rejects_invalid_github_syntax` | 44 | A query with `(x OR y) OR z` raises `RepoFinderError("unsupported syntax")` before any API call. |
| `test_run_rejects_malformed_adaptive_query_before_second_api_call` | 55 | An adaptive query with invalid parentheses fails during `discover_queries()`; `fetch_queries` is called only once (first wave). |
| `test_run_reports_static_evidence_not_provided` | 75 | When `grep_evidence` is `None`, `run()` returns `static_evidence.status == "not-provided"` and prints an accurate stderr message. |

Run all tests:
```
pytest tests/test_repo_finder.py -v
```

## Output Contract

**Search plan dict** (returned by `create_search_plan`):
```json
{
  "original_request": "<freeform request string>",
  "interpretations": ["<1-4 short strings>"],
  "technical_concepts": ["<1-10 vocabulary terms>"],
  "github_queries": ["<8-12 queries ending in fork:false>"],
  "code_probes": ["<3-10 literal source strings>"]
}
```

**`run()` result** (new/changed fields):
```json
{
  "original_request": "<topic string>",
  "topic": "<topic string>",
  "search_plan": { "<full search plan dict above>" },
  "technical_concepts": ["<from plan>"],
  "static_evidence": {
    "status": "not-provided | loaded | no-matches",
    "candidate_count": 0
  },
  "...": "other existing fields unchanged"
}
```

## Consequences

**Enables:**
- Downstream consumers can distinguish model vocabulary (`technical_concepts`) from user intent
  (`interpretations`) without re-parsing the plan.
- Accurate `static_evidence.status` replaces a misleading availability flag; callers can branch
  on `not-provided` vs. `loaded` vs. `no-matches`.
- `original_request` is always preserved in both the plan and the `run()` result, enabling audit
  trails without reconstructing it from the CLI arguments.

**Changed behavior:**
- Model-generated GitHub queries and adaptive queries with parentheses or >1 `OR` are now rejected
  with a clear error instead of being sent to the GitHub API and silently failing.
- Generic code probes (`ai`, `agent`, `pipeline`) are rejected as non-literal.

**Backward compatibility:**
- `expand_topic()` remains as a one-line alias (line 298-300); existing callers are unaffected.
- The `run()` return dict is a superset of the previous shape; no existing keys were removed or
  renamed.
