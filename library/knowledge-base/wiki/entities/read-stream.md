---
type: entity
title: "readStream"
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
related: []
sources: []
---

# readStream

## Overview

Consumes a byte stream as text while optionally reporting complete nonblank lines. (`server.ts:52-79`).

## Signature / Definition

```ts
(stream: ReadableStream<Uint8Array>, onLine?: (line: string) => void): Promise<string>
```

## Behavior

It incrementally decodes chunks, enforces the 5 MB limit, preserves partial lines between chunks, and reports the final tail (`server.ts:52-79`).

## Connections

- **depends_on:** none
- **used_by:** [[entities/run-search]]

## Tested by

No source test relationship is documented.

## History

- **Created / last touched:** commit `c8a8d20507abc4ad18725de72e1eba9f7dca757c` by AutomationGod on 2026-08-18.

## Sources

- `server.ts` (lines 52–79)
