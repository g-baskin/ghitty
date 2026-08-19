---
type: entity
title: "runSearch"
entity_type: function
status: mature
created: 2026-08-18
updated: 2026-08-18
path: "server.ts"
language: ts
depends_on: ["[[entities/emit]]", "[[entities/read-stream]]", "[[entities/is-canceled]]"]
used_by: ["[[entities/create-job]]"]
last_commit_hash: "c8a8d20507abc4ad18725de72e1eba9f7dca757c"
tested_by: []
tags:
  - entity
related: ["[[concepts/in-memory-job-lifecycle-and-sse-replay]]"]
sources: []
---

# runSearch

## Overview

Runs the Python repository finder and turns process activity into stored SSE events. (`server.ts:81-119`).

## Signature / Definition

```ts
(job: Job): Promise<void>
```

## Behavior

It marks the job running, spawns `repo_finder.py`, emits stderr as progress, and parses stdout on success. Failures emit error/status events unless canceled; cleanup clears the process and schedules eviction (`server.ts:81-118`).

## Connections

- **depends_on:** [[entities/emit]], [[entities/read-stream]], [[entities/is-canceled]]
- **used_by:** [[entities/create-job]]
- **related concepts:** [[concepts/in-memory-job-lifecycle-and-sse-replay]]

## Tested by

No source test relationship is documented.

## History

- **Created / last touched:** commit `c8a8d20507abc4ad18725de72e1eba9f7dca757c` by AutomationGod on 2026-08-18.

## Sources

- `server.ts` (lines 81–119)
