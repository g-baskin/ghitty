---
type: entity
title: "startSearch"
entity_type: function
status: mature
created: 2026-08-18
updated: 2026-08-18
path: "public/app.js"
language: js
depends_on: ["[[entities/set-busy]]", "[[entities/watch-job]]", "[[entities/show-error]]", "[[entities/finish]]"]
used_by: ["[[entities/search-form-submit-handler]]"]
last_commit_hash: "c8a8d20507abc4ad18725de72e1eba9f7dca757c"
tested_by: []
tags:
  - entity
related: ["[[concepts/browser-search-and-rendering-flow]]"]
sources: []
---

# startSearch

## Overview

Resets the UI and requests creation of a search job. (`public/app.js:161-187`).

## Signature / Definition

```js
(topic)
```

## Behavior

It clears prior output, enters busy state, POSTs JSON, stores the returned ID, and watches it. Failures are shown and finalized before focus returns to the input (`public/app.js:161-187`).

## Connections

- **depends_on:** [[entities/set-busy]], [[entities/watch-job]], [[entities/show-error]], [[entities/finish]]
- **used_by:** [[entities/search-form-submit-handler]]
- **related concepts:** [[concepts/browser-search-and-rendering-flow]]

## Tested by

No source test relationship is documented.

## History

- **Created / last touched:** commit `c8a8d20507abc4ad18725de72e1eba9f7dca757c` by AutomationGod on 2026-08-18.

## Sources

- `public/app.js` (lines 161–187)
