---
type: concept
title: "In-memory job lifecycle and SSE replay"
complexity: intermediate
domain: "web"
aliases: []
created: 2026-08-18
updated: 2026-08-18
status: mature
tags:
  - concept
related: ["[[concepts/browser-search-and-rendering-flow]]"]
sources: []
---

# In-memory job lifecycle and SSE replay

## Definition

A search is a process-local job whose status, event history, subscribers, and optional subprocess are retained together (`server.ts:11-22`).

## How it works

[[entities/create-job]] stores a queued job and [[entities/run-search]] advances it. [[entities/cancel-job]] provides cancellation. [[entities/emit]] persists events before broadcast, while [[entities/stream-job]] replays history to each new subscriber (`server.ts:39-50`, `server.ts:121-186`). [[entities/watch-job]] consumes these events (`public/app.js:140-159`).

## Why it matters

Late or reconnecting clients can recover prior events while the server remains alive. State is not durable, and finished jobs are scheduled for deletion after 15 minutes (`server.ts:22`, `server.ts:115-118`).

## Examples in this codebase

- [[entities/run-search]] and [[entities/stream-job]] — server lifecycle and delivery.
- [[entities/watch-job]] and [[entities/render-results]] — browser consumption and presentation.

## Connections

- **involves entities:** [[entities/create-job]], [[entities/run-search]], [[entities/stream-job]], [[entities/watch-job]], [[entities/render-results]].
- **related concepts:** [[concepts/browser-search-and-rendering-flow]]

## Sources

- `server.ts` (lines 11–186)
- commit `c8a8d20507abc4ad18725de72e1eba9f7dca757c` — Add recall-first repository finder (2026-08-18)
