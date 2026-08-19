---
type: entity
title: "createJob"
entity_type: function
status: mature
created: 2026-08-18
updated: 2026-08-18
path: "server.ts"
language: ts
depends_on: ["[[entities/json]]", "[[entities/run-search]]"]
used_by: ["[[entities/server-fetch]]"]
last_commit_hash: "c8a8d20507abc4ad18725de72e1eba9f7dca757c"
tested_by: []
tags:
  - entity
related: ["[[concepts/in-memory-job-lifecycle-and-sse-replay]]"]
sources: []
---

# createJob

## Overview

Validates a search request, creates an in-memory job, and starts its subprocess asynchronously. (`server.ts:121-151`).

## Signature / Definition

```ts
(request: Request): Promise<Response>
```

## Behavior

It rejects oversized or non-JSON requests, limits running jobs to ten, normalizes a 1–200 character topic, stores a queued job, starts `runSearch`, and returns its UUID with status 202 (`server.ts:121-150`).

## Connections

- **depends_on:** [[entities/json]], [[entities/run-search]]
- **used_by:** [[entities/server-fetch]]
- **related concepts:** [[concepts/in-memory-job-lifecycle-and-sse-replay]]

## Tested by

No source test relationship is documented.

## History

- **Created / last touched:** commit `c8a8d20507abc4ad18725de72e1eba9f7dca757c` by AutomationGod on 2026-08-18.

## Sources

- `server.ts` (lines 121–151)
