---
type: entity
title: "cancel button click handler"
entity_type: function
status: mature
created: 2026-08-18
updated: 2026-08-18
path: "public/app.js"
language: js
depends_on: []
used_by: []
last_commit_hash: "c8a8d20507abc4ad18725de72e1eba9f7dca757c"
tested_by: []
tags:
  - entity
related: ["[[concepts/in-memory-job-lifecycle-and-sse-replay]]", "[[concepts/browser-search-and-rendering-flow]]"]
sources: []
---

# cancel button click handler

## Overview

Requests cancellation of the active job. (`public/app.js:200-208`).

## Signature / Definition

```js
async ()
```

## Behavior

It returns without an active job; otherwise it disables the button around a DELETE request and restores it in `finally` (`public/app.js:200-208`).

## Connections

- **depends_on:** none
- **used_by:** module wiring or platform callback
- **related concepts:** [[concepts/in-memory-job-lifecycle-and-sse-replay]], [[concepts/browser-search-and-rendering-flow]]

## Tested by

No source test relationship is documented.

## History

- **Created / last touched:** commit `c8a8d20507abc4ad18725de72e1eba9f7dca757c` by AutomationGod on 2026-08-18.

## Sources

- `public/app.js` (lines 200–208)
