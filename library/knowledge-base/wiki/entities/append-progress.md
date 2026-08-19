---
type: entity
title: "appendProgress"
entity_type: function
status: mature
created: 2026-08-18
updated: 2026-08-18
path: "public/app.js"
language: js
depends_on: []
used_by: ["[[entities/watch-job]]"]
last_commit_hash: "c8a8d20507abc4ad18725de72e1eba9f7dca757c"
tested_by: []
tags:
  - entity
related: ["[[concepts/browser-search-and-rendering-flow]]"]
sources: []
---

# appendProgress

## Overview

Appends one progress message to the activity list. (`public/app.js:29-35`).

## Signature / Definition

```js
(message)
```

## Behavior

It creates a text-only item, retains at most 40 entries, and scrolls to the newest (`public/app.js:29-35`).

## Connections

- **depends_on:** none
- **used_by:** [[entities/watch-job]]
- **related concepts:** [[concepts/browser-search-and-rendering-flow]]

## Tested by

No source test relationship is documented.

## History

- **Created / last touched:** commit `c8a8d20507abc4ad18725de72e1eba9f7dca757c` by AutomationGod on 2026-08-18.

## Sources

- `public/app.js` (lines 29–35)
