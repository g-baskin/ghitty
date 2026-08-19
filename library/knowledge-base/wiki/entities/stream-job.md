---
type: entity
title: "streamJob"
entity_type: function
status: mature
created: 2026-08-18
updated: 2026-08-18
path: "server.ts"
language: ts
depends_on: []
used_by: ["[[entities/server-fetch]]"]
last_commit_hash: "c8a8d20507abc4ad18725de72e1eba9f7dca757c"
tested_by: []
tags:
  - entity
related: ["[[concepts/in-memory-job-lifecycle-and-sse-replay]]"]
sources: []
---

# streamJob

## Overview

Creates an SSE response, replaying job history before live events. (`server.ts:153-177`).

## Signature / Definition

```ts
(job: Job): Response
```

## Behavior

The stream start callback registers its controller and enqueues stored events in order; cancellation unregisters it. The response disables caching and uses `text/event-stream` (`server.ts:153-176`).

## Connections

- **depends_on:** none
- **used_by:** [[entities/server-fetch]]
- **related concepts:** [[concepts/in-memory-job-lifecycle-and-sse-replay]]

## Tested by

No source test relationship is documented.

## History

- **Created / last touched:** commit `c8a8d20507abc4ad18725de72e1eba9f7dca757c` by AutomationGod on 2026-08-18.

## Sources

- `server.ts` (lines 153–177)
