---
type: entity
title: "example topic click handler"
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
related: ["[[concepts/browser-search-and-rendering-flow]]"]
sources: []
---

# example topic click handler

## Overview

Copies a suggested topic into the search field. (`public/app.js:210-215`).

## Signature / Definition

```js
()
```

## Behavior

Each `[data-topic]` handler copies its dataset value and focuses the input (`public/app.js:210-215`).

## Connections

- **depends_on:** none
- **used_by:** module wiring or platform callback
- **related concepts:** [[concepts/browser-search-and-rendering-flow]]

## Tested by

No source test relationship is documented.

## History

- **Created / last touched:** commit `c8a8d20507abc4ad18725de72e1eba9f7dca757c` by AutomationGod on 2026-08-18.

## Sources

- `public/app.js` (lines 210–215)
