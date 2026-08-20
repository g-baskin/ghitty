# Provider and Credential Model

> Category: Security | Version: 1.1 | Date: August 2026 | Status: Active

How model, GitHub, and KenCode providers are selected, authenticated, and contained across local processes.

**Related:**
- [System architecture](../architecture/system-architecture.md)
- [Search and retrieval pipeline](../search/search-retrieval-pipeline.md)
- [Developer operations and testing](../operations/developer-operations-testing.md)

---

## Model provider selection

`REPO_FINDER_PROVIDER` accepts `auto`, `openai`, or `openrouter`. In auto mode, the presence of `OPENAI_API_KEY` selects OpenAI; otherwise OpenRouter is selected. Therefore OpenAI wins when both keys are present (`repo_finder.py:171-180`).

| Provider | Credential | Base URL | Default model |
|---|---|---|---|
| OpenAI | `OPENAI_API_KEY` | `https://api.openai.com/v1` | `gpt-5.6` |
| OpenRouter | `OPENROUTER_API_KEY` | `https://openrouter.ai/api/v1` | `openai/gpt-oss-120b` |

The defaults and URLs are constants (`repo_finder.py:21-26`). `REPO_FINDER_MODEL` or `--model` overrides the default. Both providers use the pinned OpenAI SDK and strict structured-output schemas; OpenRouter additionally requests providers that support required parameters (`repo_finder.py:186-205`, `pyproject.toml:5-14`). The web UI exposes a server-approved OpenRouter model list and persists only the selected model ID in browser storage.

## GitHub authentication

`GITHUB_TOKEN` is optional. Python sends it as a bearer token to GitHub Search; an HTTP 401 retries anonymously
(`repo_finder.py:370-388`). The MCP bridge maps it to `CFM_GITHUB_TOKEN` only when a dedicated value is absent,
raising KenCode's GitHub metadata/license lookup limits without adding another required credential
(`grep_mcp.ts:141-149`).

## Process boundaries

The Bun server inherits local credentials and starts Python with `--live-mcp`; credentials are never sent to the
browser by application code (`server.ts:108-126`). Python starts the TypeScript bridge with an argv array, no shell,
a 120-second timeout, a 2 MB stdout cap, and a restricted environment containing only `PATH`, `GITHUB_TOKEN`, and
documented `CFM_*` settings (`repo_finder.py:544-675`). The bridge resolves the project-installed server entry point
and starts it with Node over stdio (`grep_mcp.ts:126-149`, `grep_mcp.ts:163-171`).

## Local handling

The documented preferred local flow loads OpenRouter from macOS Keychain only for the Bun process invocation; `GITHUB_TOKEN` can come from `gh auth token`. The simpler `.env` option is gitignored but plaintext (`README.md:15-24`). `.env.example` names supported variables; no application code writes credentials.

## Operational cautions

- Treat subprocess stderr and model/GitHub errors as potentially sensitive operational output; the server forwards Python stderr lines to connected browsers as progress (`server.ts:128-145`). KenCode's stderr is captured by Python and is not copied into successful JSON results.
- MCP output is untrusted. Both bridge and Python validate repository names, canonical HTTPS GitHub blob links, field lengths, result counts, and recognized SPDX identifiers before ranking (`grep_mcp.ts:60-123`, `repo_finder.py:559-634`).
- Model-provider keys are omitted from the Python-to-bridge environment. Do not broaden `_bridge_environment()` without a concrete KenCode requirement (`repo_finder.py:544-556`).
- Model prompts include candidate metadata and bounded code snippets, so this data is transmitted to the selected model provider during adaptive search and ranking (`repo_finder.py:476-492`, `repo_finder.py:691-700`).
- `CFM_DISABLE_LICENSE` may intentionally reduce live matches to zero, but the final Python license gate cannot be disabled (`repo_finder.py:350-367`, `repo_finder.py:752-756`).
- The server binds loopback and has no user authentication; do not change the bind address without adding access control.
