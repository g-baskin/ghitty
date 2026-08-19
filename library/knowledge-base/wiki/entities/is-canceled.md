---
type: entity
title: "isCanceled"
entity_type: function
status: mature
created: 2026-08-18
updated: 2026-08-18
path: "server.ts"
language: ts
depends_on: []
used_by: ["[[entities/run-search]]"]
last_commit_hash: "c8a8d20507abc4ad18725de72e1eba9f7dca757c"
tested_by: []
tags:
  - entity
related: ["[[concepts/in-memory-job-lifecycle-and-sse-replay]]"]
sources: []
---

# isCanceled

## Overview

Reports whether an in-memory job has reached the canceled state. (`server.ts:35-37`).

## Signature / Definition

```ts
(job: Job): boolean
```

## Behavior

It performs a status equality check and has no side effects (`server.ts:35-37`).

## Connections

- **depends_on:** none
- **used_by:** [[entities/run-search]]
- **related concepts:** [[concepts/in-memory-job-lifecycle-and-sse-replay]]

## Tested by

No source test relationship is documented.

## History

- **Created / last touched:** commit `c8a8d20507abc4ad18725de72e1eba9f7dca757c` by AutomationGod on 2026-08-18.

## Sources

- `server.ts` (lines 35–37)
