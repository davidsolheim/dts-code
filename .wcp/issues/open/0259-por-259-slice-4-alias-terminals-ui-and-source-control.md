---
id: "0259"
title: "Slice 4: Alias terminals, UI, and Source Control"
status: open
priority: normal
assignee:
lease_expires:
scope: "Imported from Linear POR-259. Stay inside that description."
acceptance: "Surface aliases in UI and inject alias env into integrated terminals. Source Control must show GitHub auth per alias, not one process-global row. Do not ship this if GitHub stil..."
files: []
commit:
reason:
created: "2026-08-24T12:52:39.241Z"
linear_id: "POR-259"
linear_url: "https://linear.app/teton-web-ventures/issue/POR-259/slice-4-alias-terminals-ui-and-source-control"
linear_status: "In Review"
linear_status_type: "started"
linear_team: "POR"
linear_project: "dts-code"
linear_assignee: "David Solheim <david@tetonweb.com>"
linear_labels: ["Feature"]
linear_priority: "Medium"
linear_parent: "POR-255"
linear_cycle: ""
linear_due: ""
linear_updated: "2026-08-24T18:41:49.104Z"
linear_archived: false
notion_page_id:
notion_url:
---

## Linear import

- Identifier: POR-259
- URL: https://linear.app/teton-web-ventures/issue/POR-259/slice-4-alias-terminals-ui-and-source-control
- Linear status: In Review (started)
- Queue status: open
- Team: Portfolio (POR)
- Project: dts-code
- Assignee: David Solheim <david@tetonweb.com>
- Labels: Feature
- Parent: POR-255 — Named identity aliases (Grok + GitHub)
- Priority: Medium
- Estimate: none
- Cycle: none
- Due: none
- Created: 2026-08-24T12:52:39.241Z
- Updated: 2026-08-24T18:41:49.104Z
- Completed: no
- Canceled: no
- Archived: no
- Branch: david/por-259-slice-4-alias-terminals-ui-and-source-control

Queue status follows Water Cooler Protocol. Todo, In Progress, In Review, Triage, and Backlog are `open` so the import does not take a ticket lease or start a review. Done, Canceled, and Blocked use those folders. `linear_status` is the Linear status at import.

## Description

Surface aliases in UI and inject alias env into integrated terminals. Source Control must show GitHub auth per alias, not one process-global row. Do not ship this if GitHub still uses `process.env` only (blocked by slice 3).

Parent: [POR-255](https://linear.app/teton-web-ventures/issue/POR-255/named-identity-aliases-grok-github)

## Terminals

`apps/server/src/terminal/Manager.ts` `createTerminalSpawnEnv` is thread-scoped. Resolve the thread’s alias **on the server** and overlay `envFor` after scrub. Do not rely on the client’s `runtimeEnv` for identity (phone/web are not the auth machine).

## Settings

Alias list/editor beside provider instances. Reuse display name, accent swatches, and env-row patterns from `AddProviderInstanceDialog.tsx` / `ProviderInstanceCard.tsx`.

* First-class fields: `grokHome`, `ghConfigDir`, git author
* `extraEnv` as escape hatch
* Project settings: default alias picker (web + mobile if those screens exist)

## Thread chip

Show alias accent/initials the way `ProviderInstanceIcon` works today. Same on composer/picker and mobile thread list if that chip exists. Switching alias uses the continuation-group gate (new group when `GROK_HOME` changes).

## Source Control

Probe `gh auth status` **per alias** `GH_CONFIG_DIR` (plus the unbound default). Copy: authenticated as X **for this alias**, using `gh` on the server. No login button that runs `gh auth switch`.

## Docs

* `docs/user/identity-aliases.md`: login once per home (`GROK_HOME=... grok login`, `GH_CONFIG_DIR=... gh auth login`); git author ≠ gh auth
* Short note in `docs/user/source-control.md`
* Grok multi-home is already slice 1 (`docs/user/providers-grok.md`)

## Surfaces

Web UI; desktop wraps web; mobile chip + project default if those screens exist. Identity stays server-side.
