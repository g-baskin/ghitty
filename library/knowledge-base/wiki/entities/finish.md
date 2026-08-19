---
type: entity
title: "finish"
entity_type: function
status: mature
created: 2026-08-18
updated: 2026-08-18
path: "public/app.js"
language: js
depends_on: ["[[entities/set-busy]]"]
used_by: ["[[entities/watch-job]]", "[[entities/start-search]]"]
last_commit_hash: "c8a8d20507abc4ad18725de72e1eba9f7dca757c"
tested_by: []
tags:
  - entity
related: ["[[concepts/browser-search-and-rendering-flow]]"]
sources: []
---

# finish

## Overview

Returns the UI to its idle state after a terminal outcome. (`public/app.js:132-138`).

## Signature / Definition

```js
(message)
```

## Behavior

It clears busy controls, reports the message, closes EventSource, and clears active job state (`public/app.js:132-138`).

## Connections

- **depends_on:** [[entities/set-busy]]
- **used_by:** [[entities/watch-job]], [[entities/start-search]]
- **related concepts:** [[concepts/browser-search-and-rendering-flow]]

## Tested by

No source test relationship is documented.

## History

- **Created / last touched:** commit `c8a8d20507abc4ad18725de72e1eba9f7dca757c` by AutomationGod on 2026-08-18.

## Sources

- `public/app.js` (lines 132–138)
