# Provider and Credential Model

> Category: Security | Version: 1.0 | Date: August 2026 | Status: Active

How model and GitHub providers are selected, authenticated, and inherited by local processes.

**Related:**
- [System architecture](../architecture/system-architecture.md)
- [Search and retrieval pipeline](../search/search-retrieval-pipeline.md)
- [Developer operations and testing](../operations/developer-operations-testing.md)

---

## Model provider selection

`REPO_FINDER_PROVIDER` accepts `auto`, `openai`, or `openrouter`. In auto mode, the presence of `OPENAI_API_KEY` selects OpenAI; otherwise OpenRouter is selected. Therefore OpenAI wins when both keys are present (`repo_finder.py:170-179`).

| Provider | Credential | Base URL | Default model |
|---|---|---|---|
| OpenAI | `OPENAI_API_KEY` | `https://api.openai.com/v1` | `gpt-5.6` |
| OpenRouter | `OPENROUTER_API_KEY` | `https://openrouter.ai/api/v1` | `~openai/gpt-latest` |

The defaults and URLs are constants (`repo_finder.py:21-25`). `REPO_FINDER_MODEL` or `--model` overrides the default. Both providers use the pinned OpenAI SDK and strict structured-output schemas; OpenRouter additionally requests providers that support required parameters (`repo_finder.py:180-205`, `pyproject.toml:5-14`).

## GitHub authentication

`GITHUB_TOKEN` is optional. When present it is sent as a bearer token to GitHub Search. If GitHub returns exactly HTTP 401, the request is retried without the token; other errors follow normal retry/error handling (`repo_finder.py:255-273`, `repo_finder.py:299-304`). Anonymous requests are valid but have lower rate limits.

## Process boundary

The CLI reads credentials only from environment variables. The Bun server passes `Bun.env` unchanged to the Python subprocess, so keys available to the server are available to each worker (`repo_finder.py:170-188`, `server.ts:84-93`). Credentials are not sent to the browser by application code; browser requests contain only the topic and job identifier (`public/app.js:161-179`).

## Local handling

The documented preferred local flow loads OpenRouter from macOS Keychain only for the Bun process invocation; `GITHUB_TOKEN` can come from `gh auth token`. The simpler `.env` option is gitignored but plaintext (`README.md:15-24`). `.env.example` names supported variables; no application code writes credentials.

## Operational cautions

- Treat subprocess stderr and model/GitHub errors as potentially sensitive operational output; the server forwards stderr lines to connected browsers as progress (`server.ts:95-98`).
- Model prompts include candidate metadata and imported code snippets, so this data is transmitted to the selected model provider during adaptive search and ranking (`repo_finder.py:329-337`, `repo_finder.py:383-390`).
- The server binds loopback and supplies a restrictive CSP, but it has no user authentication; do not change the bind address without adding an access-control design (`server.ts:24-29`, `server.ts:195-199`).
