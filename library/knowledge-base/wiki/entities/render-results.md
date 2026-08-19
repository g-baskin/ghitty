---
type: entity
title: "renderResults"
entity_type: function
status: mature
created: 2026-08-18
updated: 2026-08-18
path: "public/app.js"
language: js
depends_on: ["[[entities/badge]]", "[[entities/paragraph]]", "[[entities/render-evidence]]"]
used_by: ["[[entities/watch-job]]"]
last_commit_hash: "c8a8d20507abc4ad18725de72e1eba9f7dca757c"
tested_by: []
tags:
  - entity
related: ["[[concepts/browser-search-and-rendering-flow]]"]
sources: []
---

# renderResults

## Overview

Renders ranked repository results and supporting metadata. (`public/app.js:69-130`).

## Signature / Definition

```js
(payload)
```

## Behavior

It clears old cards, handles empty picks, and builds cards with rank, safe link, badges, explanations, translation, and evidence; then reveals and scrolls to results with reduced-motion support (`public/app.js:69-130`).

## Connections

- **depends_on:** [[entities/badge]], [[entities/paragraph]], [[entities/render-evidence]]
- **used_by:** [[entities/watch-job]]
- **related concepts:** [[concepts/browser-search-and-rendering-flow]]

## Tested by

No source test relationship is documented.

## History

- **Created / last touched:** commit `c8a8d20507abc4ad18725de72e1eba9f7dca757c` by AutomationGod on 2026-08-18.

## Sources

- `public/app.js` (lines 69–130)
