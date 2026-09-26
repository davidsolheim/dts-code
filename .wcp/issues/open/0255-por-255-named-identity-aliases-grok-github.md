---
id: "0255"
title: "Named identity aliases (Grok + GitHub)"
status: open
priority: normal
assignee:
lease_expires:
scope: "Imported from Linear POR-255. Stay inside that description."
acceptance: "Add named identity aliases so different threads/tabs stay authenticated as different Grok users and GitHub (`gh`) users at the same time, without `gh auth switch` or grok login..."
files: []
commit:
reason:
created: "2026-08-24T12:51:00.742Z"
linear_id: "POR-255"
linear_url: "https://linear.app/teton-web-ventures/issue/POR-255/named-identity-aliases-grok-github"
linear_status: "Backlog"
linear_status_type: "backlog"
linear_team: "POR"
linear_project: "dts-code"
linear_assignee: ""
linear_labels: ["Feature"]
linear_priority: "Medium"
linear_parent: ""
linear_cycle: ""
linear_due: ""
linear_updated: "2026-08-24T17:47:36.129Z"
linear_archived: false
notion_page_id:
notion_url:
---

## Linear import

- Identifier: POR-255
- URL: https://linear.app/teton-web-ventures/issue/POR-255/named-identity-aliases-grok-github
- Linear status: Backlog (backlog)
- Queue status: open
- Team: Portfolio (POR)
- Project: dts-code
- Assignee: unassigned
- Labels: Feature
- Parent: none
- Priority: Medium
- Estimate: none
- Cycle: none
- Due: none
- Created: 2026-08-24T12:51:00.742Z
- Updated: 2026-08-24T17:47:36.129Z
- Completed: no
- Canceled: no
- Archived: no
- Branch: david/por-255-named-identity-aliases-grok-github

Queue status follows Water Cooler Protocol. Todo, In Progress, In Review, Triage, and Backlog are `open` so the import does not take a ticket lease or start a review. Done, Canceled, and Blocked use those folders. `linear_status` is the Linear status at import.

## Description

Add named identity aliases so different threads/tabs stay authenticated as different Grok users and GitHub (`gh`) users at the same time, without `gh auth switch` or grok login mutating global state.

An **alias** is a spawn context (env injected into processes), not a shell profile and not a new agent driver. Identity lives on the server. Remote clients (phone/web) execute there.

## Why

Grok already supports multiple provider instances (`supportsMultipleInstances: true`) and can isolate via `GROK_HOME`. GitHub is a single global `gh`: `GitHubCli.execute` runs with cwd only, no env. Integrated terminals inherit the server process env. Two Grok tabs can be two Grok users, but `gh pr create` / clone / publish / terminal `gh` all use whichever GitHub account is active on the host.

## User model

* Alias fields: `displayName`, `accentColor`, `grokHome` → `GROK_HOME`, `ghConfigDir` → `GH_CONFIG_DIR`, optional `gitAuthor` → `GIT_AUTHOR_*` / `GIT_COMMITTER_*`, `extraEnv`
* Bind alias on the thread, with an **explicit project** `defaultAliasId` (same pattern as `defaultModelSelection`). New threads copy it; per-thread override allowed. No org/path heuristic.
* Show the alias on the thread chip the way provider accent colors already work.

## Merge and continuation

* Merge order (later wins): `process.env` → provider instance `environment` → alias `envFor`
* Grok continuation keeps per-`instanceId` and also includes resolved `GROK_HOME` when set. Switching alias/home is a new continuation group.
* Checkpoint git identity stays `T3 Code`. Do not key checkpoints on alias git author.

## Ship order (one slice per PR)

1. [POR-256](https://linear.app/teton-web-ventures/issue/POR-256) — Grok `GROK_HOME` (first-class instance field)
2. [POR-257](https://linear.app/teton-web-ventures/issue/POR-257) — GitHub CLI env passthrough (`GH_CONFIG_DIR`) — the real gap; do not ship UI that still calls global `gh`
3. [POR-258](https://linear.app/teton-web-ventures/issue/POR-258) — Alias object + project/thread binding + `envFor` wiring
4. [POR-259](https://linear.app/teton-web-ventures/issue/POR-259) — Terminals + settings UI + thread chip + per-alias Source Control auth + docs

Stop after slice 2 if needed.

## Out of scope

`gh auth switch`, Codex-style shadow homes, a new Grok driver, secrets in git, logging out of default `~/.grok` / `~/.config/gh`, auto-matching repos to aliases, changing checkpoint git identity.

## Definition of done

* Two aliases logged in once each (`GROK_HOME=... grok login`, `GH_CONFIG_DIR=... gh auth login`) remain logged in simultaneously.
* Two threads, different aliases: Grok status and `gh auth status` disagree with each other and match their alias.
* `gh pr` / clone / publish for a thread uses that thread’s `GH_CONFIG_DIR`.
* An integrated terminal for that thread sees the same `GH_CONFIG_DIR` and `GROK_HOME`.
* Switching the machine’s default gh/grok login does not rewrite the other alias’s homes.
* Source Control UI can show the GitHub account for the current alias, not only the process-global one.
* User docs for aliases + Grok multi-home; short note in `docs/user/source-control.md`.
* Tests for env plumbing; no drive-by refactors.
