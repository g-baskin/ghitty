---
type: entity
title: "cancelJob"
entity_type: function
status: mature
created: 2026-08-18
updated: 2026-08-18
path: "server.ts"
language: ts
depends_on: ["[[entities/json]]", "[[entities/emit]]"]
used_by: ["[[entities/server-fetch]]"]
last_commit_hash: "c8a8d20507abc4ad18725de72e1eba9f7dca757c"
tested_by: []
tags:
  - entity
related: ["[[concepts/in-memory-job-lifecycle-and-sse-replay]]"]
sources: []
---

# cancelJob

## Overview

Cancels a queued or running job and terminates its subprocess when present. (`server.ts:179-187`).

## Signature / Definition

```ts
(job: Job): Response
```

## Behavior

Terminal jobs receive 409. Active jobs become canceled, their process is killed, a canceled status event is emitted, and JSON confirmation is returned (`server.ts:179-186`).

## Connections

- **depends_on:** [[entities/json]], [[entities/emit]]
- **used_by:** [[entities/server-fetch]]
- **related concepts:** [[concepts/in-memory-job-lifecycle-and-sse-replay]]

## Tested by

No source test relationship is documented.

## History

- **Created / last touched:** commit `c8a8d20507abc4ad18725de72e1eba9f7dca757c` by AutomationGod on 2026-08-18.

## Sources

- `server.ts` (lines 179–187)
