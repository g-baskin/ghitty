---
type: entity
title: "setBusy"
entity_type: function
status: mature
created: 2026-08-18
updated: 2026-08-18
path: "public/app.js"
language: js
depends_on: []
used_by: ["[[entities/start-search]]", "[[entities/finish]]"]
last_commit_hash: "c8a8d20507abc4ad18725de72e1eba9f7dca757c"
tested_by: []
tags:
  - entity
related: ["[[concepts/browser-search-and-rendering-flow]]"]
sources: []
---

# setBusy

## Overview

Synchronizes form controls with whether a search is active. (`public/app.js:17-22`).

## Signature / Definition

```js
(isBusy)
```

## Behavior

It disables submission and topic editing, reveals cancellation, and changes the submit label while busy (`public/app.js:17-22`).

## Connections

- **depends_on:** none
- **used_by:** [[entities/start-search]], [[entities/finish]]
- **related concepts:** [[concepts/browser-search-and-rendering-flow]]

## Tested by

No source test relationship is documented.

## History

- **Created / last touched:** commit `c8a8d20507abc4ad18725de72e1eba9f7dca757c` by AutomationGod on 2026-08-18.

## Sources

- `public/app.js` (lines 17–22)
