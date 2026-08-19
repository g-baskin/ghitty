---
type: entity
title: "emit"
entity_type: function
status: mature
created: 2026-08-18
updated: 2026-08-18
path: "server.ts"
language: ts
depends_on: []
used_by: ["[[entities/run-search]]", "[[entities/cancel-job]]"]
last_commit_hash: "c8a8d20507abc4ad18725de72e1eba9f7dca757c"
tested_by: []
tags:
  - entity
related: ["[[concepts/in-memory-job-lifecycle-and-sse-replay]]"]
sources: []
---

# emit

## Overview

Records a job event and broadcasts it to current SSE subscribers. (`server.ts:39-50`).

## Signature / Definition

```ts
(job: Job, type: string, data: unknown): void
```

## Behavior

It appends the event before encoding one SSE frame, then enqueues that frame for each subscriber; controllers that throw are removed (`server.ts:39-50`).

## Connections

- **depends_on:** none
- **used_by:** [[entities/run-search]], [[entities/cancel-job]]
- **related concepts:** [[concepts/in-memory-job-lifecycle-and-sse-replay]]

## Tested by

No source test relationship is documented.

## History

- **Created / last touched:** commit `c8a8d20507abc4ad18725de72e1eba9f7dca757c` by AutomationGod on 2026-08-18.

## Sources

- `server.ts` (lines 39–50)
