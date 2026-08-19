---
type: concept
title: "Browser search and rendering flow"
complexity: intermediate
domain: "web"
aliases: []
created: 2026-08-18
updated: 2026-08-18
status: mature
tags:
  - concept
related: ["[[concepts/in-memory-job-lifecycle-and-sse-replay]]"]
sources: []
---

# Browser search and rendering flow

## Definition

The browser converts topic input into an asynchronous job request, consumes typed SSE updates, and builds result DOM nodes without HTML-string interpolation (`public/app.js:17-187`).

## How it works

[[entities/search-form-submit-handler]] normalizes input and calls [[entities/start-search]], which creates the job and delegates streaming to [[entities/watch-job]]. Progress reaches [[entities/append-progress]], results reach [[entities/render-results]], and terminal status reaches [[entities/finish]] (`public/app.js:140-198`).

## Why it matters

Separating transport handling from DOM construction keeps cleanup consistent and renders server-provided strings through `textContent` (`public/app.js:24-159`).

## Examples in this codebase

- [[entities/run-search]] and [[entities/stream-job]] — server lifecycle and delivery.
- [[entities/watch-job]] and [[entities/render-results]] — browser consumption and presentation.

## Connections

- **involves entities:** [[entities/create-job]], [[entities/run-search]], [[entities/stream-job]], [[entities/watch-job]], [[entities/render-results]].
- **related concepts:** [[concepts/in-memory-job-lifecycle-and-sse-replay]]

## Sources

- `public/app.js` (lines 17–208)
- commit `c8a8d20507abc4ad18725de72e1eba9f7dca757c` — Add recall-first repository finder (2026-08-18)
