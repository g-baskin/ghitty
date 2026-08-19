---
type: entity
title: "public/app"
entity_type: module
status: mature
created: 2026-08-18
updated: 2026-08-18
path: "public/app.js"
language: js
depends_on: ["[[entities/server-fetch]]"]
used_by: []
last_commit_hash: "c8a8d20507abc4ad18725de72e1eba9f7dca757c"
tested_by: []
tags:
  - entity
  - web
related: ["[[concepts/browser-search-and-rendering-flow]]", "[[concepts/in-memory-job-lifecycle-and-sse-replay]]"]
sources: []
exports: []
imports: []
---

# public/app

## Overview

`public/app.js` is the browser entry module for starting searches, following events, canceling work, and rendering ranked results (`public/app.js:1-215`).

## Exports

The browser script declares no exports (`public/app.js:1-215`).

## Behavior

It captures page controls, maintains active job/EventSource state, defines rendering and lifecycle functions, and installs submit, cancel, and example handlers (`public/app.js:1-215`).

## Connections

- **depends_on:** [[entities/server-fetch]] through HTTP and SSE requests (`public/app.js:140-179`, `public/app.js:200-205`).
- **related concepts:** [[concepts/browser-search-and-rendering-flow]], [[concepts/in-memory-job-lifecycle-and-sse-replay]].

## Tested by

No source test relationship is documented.

## History

- **Created / last touched:** commit `c8a8d20507abc4ad18725de72e1eba9f7dca757c` by AutomationGod on 2026-08-18.

## Sources

- `public/app.js` (lines 1–215)
