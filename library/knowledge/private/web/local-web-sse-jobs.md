# Local Web and SSE Jobs

> Category: Web | Version: 1.0 | Date: August 2026 | Status: Active

The in-memory job protocol joining the browser, Bun server, and Python search subprocess.

**Related:**
- [System architecture](../architecture/system-architecture.md)
- [Search and retrieval pipeline](../search/search-retrieval-pipeline.md)
- [Provider and credential model](../security/provider-credential-model.md)

---

## Request flow

```mermaid
sequenceDiagram
    participant UI as Browser
    participant Bun as Bun server
    participant Py as repo_finder.py
    UI->>Bun: POST /api/jobs {topic}
    Bun-->>UI: 202 {id}
    Bun->>Py: spawn python3 ... --grep-evidence ...
    UI->>Bun: GET /api/jobs/{id}/events
    Py-->>Bun: stderr progress lines
    Bun-->>UI: SSE progress
    Py-->>Bun: JSON stdout and exit code
    Bun-->>UI: SSE result
    Bun-->>UI: SSE status completed
```

`POST /api/jobs` requires JSON, normalizes whitespace, enforces a 1–200 character topic and 4 KB body, and returns a UUID with status 202. It rejects new work when ten jobs are currently running (`server.ts:121-150`). The queued state is brief because `runSearch` is started immediately and sets the job to running (`server.ts:81-94`).

The worker command always invokes `python3 repo_finder.py <topic> --grep-evidence benchmarks/grep_evidence.json` with the server environment and repository root as its working directory (`server.ts:84-93`). stderr non-empty lines become `progress` events; stdout is collected and parsed as one JSON result (`server.ts:52-78`, `server.ts:95-108`).

## SSE behavior

Events use named SSE frames: `status`, `progress`, `result`, and `job-error`. Every event is stored and replayed to later subscribers before live delivery (`server.ts:39-49`, `server.ts:153-176`). The browser uses `EventSource`, renders progress, renders a result event, closes on terminal status, and lets EventSource reconnect after interruption (`public/app.js:140-159`).

## Cancellation and terminal states

`DELETE /api/jobs/{id}` accepts only queued or running jobs. It sets `canceled`, kills the subprocess if assigned, and emits terminal status; completed, failed, or already canceled jobs return 409 (`server.ts:179-187`). The browser exposes cancellation only while busy (`public/app.js:17-22`, `public/app.js:200-208`).

A nonzero worker exit uses the final stderr line as the error when available. Parse, stream-limit, and subprocess failures emit `job-error` followed by failed status (`server.ts:95-115`). Only completed and failed paths schedule deletion after 15 minutes; cancellation returns early from the worker's `try`, but still passes through `finally`, so it is also scheduled (`server.ts:100-118`).

## HTTP surface

- `GET /`, `/app.js`, `/styles.css` — fixed static allowlist (`server.ts:189-205`).
- `POST /api/jobs` — create a search (`server.ts:207-208`).
- `GET /api/jobs/{id}/events` — subscribe/replay (`server.ts:208-213`).
- `DELETE /api/jobs/{id}` — cancel active work (`server.ts:208-214`).

Unknown paths return 404 and unsupported methods on a known job path return 405 (`server.ts:208-215`).
