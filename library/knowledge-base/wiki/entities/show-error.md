---
type: entity
title: "showError"
entity_type: function
status: mature
created: 2026-08-18
updated: 2026-08-18
path: "public/app.js"
language: js
depends_on: []
used_by: ["[[entities/start-search]]", "[[entities/search-form-submit-handler]]"]
last_commit_hash: "c8a8d20507abc4ad18725de72e1eba9f7dca757c"
tested_by: []
tags:
  - entity
related: ["[[concepts/browser-search-and-rendering-flow]]"]
sources: []
---

# showError

## Overview

Displays an error in the form and live-status regions. (`public/app.js:24-27`).

## Signature / Definition

```js
(message)
```

## Behavior

It assigns `textContent` in both regions (`public/app.js:24-27`).

## Connections

- **depends_on:** none
- **used_by:** [[entities/start-search]], [[entities/search-form-submit-handler]]
- **related concepts:** [[concepts/browser-search-and-rendering-flow]]

## Tested by

No source test relationship is documented.

## History

- **Created / last touched:** commit `c8a8d20507abc4ad18725de72e1eba9f7dca757c` by AutomationGod on 2026-08-18.

## Sources

- `public/app.js` (lines 24–27)
