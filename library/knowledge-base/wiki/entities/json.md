---
type: entity
title: "json"
entity_type: function
status: mature
created: 2026-08-18
updated: 2026-08-18
path: "server.ts"
language: ts
depends_on: []
used_by: ["[[entities/server-fetch]]", "[[entities/create-job]]", "[[entities/cancel-job]]"]
last_commit_hash: "c8a8d20507abc4ad18725de72e1eba9f7dca757c"
tested_by: []
tags:
  - entity
related: []
sources: []
---

# json

## Overview

Builds a JSON `Response` with the requested status and shared security headers. (`server.ts:31-33`).

## Signature / Definition

```ts
(data: unknown, status = 200): Response
```

## Behavior

It delegates serialization to `Response.json`, giving success and error responses consistent security headers (`server.ts:31-33`).

## Connections

- **depends_on:** none
- **used_by:** [[entities/server-fetch]], [[entities/create-job]], [[entities/cancel-job]]

## Tested by

No source test relationship is documented.

## History

- **Created / last touched:** commit `c8a8d20507abc4ad18725de72e1eba9f7dca757c` by AutomationGod on 2026-08-18.

## Sources

- `server.ts` (lines 31–33)
