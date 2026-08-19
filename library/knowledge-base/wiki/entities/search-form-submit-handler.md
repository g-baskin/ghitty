---
type: entity
title: "search form submit handler"
entity_type: function
status: mature
created: 2026-08-18
updated: 2026-08-18
path: "public/app.js"
language: js
depends_on: ["[[entities/show-error]]", "[[entities/start-search]]"]
used_by: []
last_commit_hash: "c8a8d20507abc4ad18725de72e1eba9f7dca757c"
tested_by: []
tags:
  - entity
related: ["[[concepts/browser-search-and-rendering-flow]]"]
sources: []
---

# search form submit handler

## Overview

Validates and starts a search from form submission. (`public/app.js:189-198`).

## Signature / Definition

```js
(event)
```

## Behavior

It prevents navigation, normalizes whitespace, focuses after an empty-topic error, and otherwise starts the search (`public/app.js:189-198`).

## Connections

- **depends_on:** [[entities/show-error]], [[entities/start-search]]
- **used_by:** module wiring or platform callback
- **related concepts:** [[concepts/browser-search-and-rendering-flow]]

## Tested by

No source test relationship is documented.

## History

- **Created / last touched:** commit `c8a8d20507abc4ad18725de72e1eba9f7dca757c` by AutomationGod on 2026-08-18.

## Sources

- `public/app.js` (lines 189–198)
