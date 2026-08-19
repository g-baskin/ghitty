---
type: entity
title: "renderEvidence"
entity_type: function
status: mature
created: 2026-08-18
updated: 2026-08-18
path: "public/app.js"
language: js
depends_on: []
used_by: ["[[entities/render-results]]"]
last_commit_hash: "c8a8d20507abc4ad18725de72e1eba9f7dca757c"
tested_by: []
tags:
  - entity
related: ["[[concepts/browser-search-and-rendering-flow]]"]
sources: []
---

# renderEvidence

## Overview

Adds source-code evidence blocks for a ranked repository. (`public/app.js:51-67`).

## Signature / Definition

```js
(container, evidence)
```

## Behavior

Each block has a heading, escaped snippet, and external link protected with `noopener noreferrer` (`public/app.js:51-67`).

## Connections

- **depends_on:** none
- **used_by:** [[entities/render-results]]
- **related concepts:** [[concepts/browser-search-and-rendering-flow]]

## Tested by

No source test relationship is documented.

## History

- **Created / last touched:** commit `c8a8d20507abc4ad18725de72e1eba9f7dca757c` by AutomationGod on 2026-08-18.

## Sources

- `public/app.js` (lines 51–67)
