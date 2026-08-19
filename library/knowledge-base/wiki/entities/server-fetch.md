---
type: entity
title: "Bun.serve fetch handler"
entity_type: endpoint
status: mature
created: 2026-08-18
updated: 2026-08-18
path: "server.ts"
language: ts
depends_on: ["[[entities/json]]", "[[entities/create-job]]", "[[entities/stream-job]]", "[[entities/cancel-job]]"]
used_by: []
last_commit_hash: "c8a8d20507abc4ad18725de72e1eba9f7dca757c"
tested_by: []
tags:
  - entity
related: ["[[concepts/in-memory-job-lifecycle-and-sse-replay]]"]
sources: []
---

# Bun.serve fetch handler

## Overview

Routes loopback requests to static assets and the job API. (`server.ts:195-216`).

## Signature / Definition

```ts
(request: Request): Promise<Response>
```

## Behavior

Allowlisted GET paths serve files. POST creates jobs; GET `/events` streams a known job; DELETE cancels it. Unknown resources and unsupported methods receive JSON errors (`server.ts:189-216`).

## Connections

- **depends_on:** [[entities/json]], [[entities/create-job]], [[entities/stream-job]], [[entities/cancel-job]]
- **used_by:** module wiring or platform callback
- **related concepts:** [[concepts/in-memory-job-lifecycle-and-sse-replay]]

## Tested by

No source test relationship is documented.

## History

- **Created / last touched:** commit `c8a8d20507abc4ad18725de72e1eba9f7dca757c` by AutomationGod on 2026-08-18.

## Sources

- `server.ts` (lines 195–216)
