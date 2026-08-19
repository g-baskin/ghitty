---
type: entity
title: "server"
entity_type: module
status: mature
created: 2026-08-18
updated: 2026-08-18
path: "server.ts"
language: ts
last_commit_hash: "c8a8d20507abc4ad18725de72e1eba9f7dca757c"
depends_on:
  - "[[entities/repo_finder]]"
  - "[[entities/server-fetch]]"
used_by: []
tested_by: []
tags:
  - entity
  - web
related:
  - "[[concepts/in-memory-job-lifecycle-and-sse-replay]]"
sources: []
exports: []
imports:
  - "node:path"
---

# server

## Overview

`server.ts` is the Bun entry module for the loopback web application. It serves a fixed static-file allowlist and exposes in-memory job creation, SSE subscription, and cancellation routes (`server.ts:189-216`).

## Exports

The module has no exports; it starts `Bun.serve` at module evaluation and logs its local URL (`server.ts:195-218`).

## Imports

It imports `join` from `node:path`; the remaining platform APIs come from Bun and web globals (`server.ts:1-6`).

## Behavior

- Binds to `127.0.0.1` on `PORT` or 3000 and sets a 120-second idle timeout (`server.ts:6-7`, `server.ts:195-199`).
- Stores jobs, event history, subscribers, and the active subprocess in memory (`server.ts:11-22`).
- Spawns `repo_finder.py`, forwards stderr as progress, and parses stdout as the final JSON result (`server.ts:81-118`).
- Applies security headers to API and static responses (`server.ts:24-33`, `server.ts:169-175`, `server.ts:202-205`).

## Connections

- **depends_on:** [[entities/repo_finder]] through the Python subprocess invocation (`server.ts:84-93`), and [[entities/server-fetch]] as its request-routing callback (`server.ts:195-216`).
- **related concept:** [[concepts/in-memory-job-lifecycle-and-sse-replay]].
- **used_by:** no source-level importer; this is the Bun package entry point (`package.json:7-10`).

## Tested by

No Bun server test is present under `tests/`; the current suite imports the Python module (`tests/test_repo_finder.py:1-8`).

## History

- **Created / last touched:** commit `c8a8d20507abc4ad18725de72e1eba9f7dca757c` by AutomationGod on 2026-08-18.

## Sources

- `server.ts:1-218`
- `package.json:7-10`
