---
type: entity
title: "watchJob"
entity_type: function
status: mature
created: 2026-08-18
updated: 2026-08-18
path: "public/app.js"
language: js
depends_on: ["[[entities/append-progress]]", "[[entities/render-results]]", "[[entities/show-error]]", "[[entities/finish]]"]
used_by: ["[[entities/start-search]]"]
last_commit_hash: "c8a8d20507abc4ad18725de72e1eba9f7dca757c"
tested_by: []
tags:
  - entity
related: ["[[concepts/in-memory-job-lifecycle-and-sse-replay]]", "[[concepts/browser-search-and-rendering-flow]]"]
sources: []
---

# watchJob

## Overview

Subscribes to progress, result, status, and error events for one job. (`public/app.js:140-159`).

## Signature / Definition

```js
(id)
```

## Behavior

It parses typed event payloads, invokes renderers, finishes on terminal status, displays job errors, and reports reconnection while active (`public/app.js:140-159`).

## Connections

- **depends_on:** [[entities/append-progress]], [[entities/render-results]], [[entities/show-error]], [[entities/finish]]
- **used_by:** [[entities/start-search]]
- **related concepts:** [[concepts/in-memory-job-lifecycle-and-sse-replay]], [[concepts/browser-search-and-rendering-flow]]

## Tested by

No source test relationship is documented.

## History

- **Created / last touched:** commit `c8a8d20507abc4ad18725de72e1eba9f7dca757c` by AutomationGod on 2026-08-18.

## Sources

- `public/app.js` (lines 140–159)
