---
id: "0258"
title: "Slice 3: Identity alias object and thread binding"
status: open
priority: normal
assignee:
lease_expires:
scope: "Imported from Linear POR-258. Stay inside that description."
acceptance: "Persist aliases next to provider instances and bind them on project/thread. Resolve to env and pass into Grok spawn, GitHub CLI, and user-facing git commits."
files: []
commit:
reason:
created: "2026-08-24T12:52:18.047Z"
linear_id: "POR-258"
linear_url: "https://linear.app/teton-web-ventures/issue/POR-258/slice-3-identity-alias-object-and-thread-binding"
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
linear_updated: "2026-08-24T17:47:35.767Z"
linear_archived: false
notion_page_id:
notion_url:
---

## Linear import

- Identifier: POR-258
- URL: https://linear.app/teton-web-ventures/issue/POR-258/slice-3-identity-alias-object-and-thread-binding
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
- Created: 2026-08-24T12:52:18.047Z
- Updated: 2026-08-24T17:47:35.767Z
- Completed: no
- Canceled: no
- Archived: no
- Branch: david/por-258-slice-3-identity-alias-object-and-thread-binding

Queue status follows Water Cooler Protocol. Todo, In Progress, In Review, Triage, and Backlog are `open` so the import does not take a ticket lease or start a review. Done, Canceled, and Blocked use those folders. `linear_status` is the Linear status at import.

## Description

Persist aliases next to provider instances and bind them on project/thread. Resolve to env and pass into Grok spawn, GitHub CLI, and user-facing git commits.

Parent: [POR-255](https://linear.app/teton-web-ventures/issue/POR-255/named-identity-aliases-grok-github)

Blocked by slice 1 (`GROK_HOME`) and slice 2 (`GitHubCli` env). An alias is spawn-context env, not a new agent driver.

## Schema

* `IdentityAliasId`, `IdentityAlias` next to `packages/contracts/src/providerInstance.ts`: `id`, `displayName`, `accentColor?`, `grokHome`, `ghConfigDir`, optional `gitAuthor: { name, email }`, `extraEnv` reusing `ProviderInstanceEnvironment` (sensitive flag as today).
* `ServerSettings.identityAliases` map in `settings.ts` (same store as `providerInstances`, `{T3 home}/userdata/settings.json`).
* `OrchestrationProject.defaultAliasId` (optional, like `defaultModelSelection`). Explicit project field only — no org/path heuristic.
* `OrchestrationThread.aliasId` (optional). New threads copy project default. Override via the existing thread meta-update path (extend the command/event/projection that already updates `modelSelection`).

## `envFor(alias)`

Small server module: resolve/expand `grokHome` → `GROK_HOME`, `ghConfigDir` → `GH_CONFIG_DIR`, git author → `GIT_AUTHOR_*` / `GIT_COMMITTER_*`, then `mergeProviderInstanceEnvironment(extraEnv)`. Empty paths omit vars so default `~/.grok` / `~/.config/gh` still work without logging out.

Merge order (later wins): `process.env` → provider instance `environment` → alias `envFor`.

## Wire (server execution boundary)

* Grok spawn: overlay `envFor` on instance env (alias wins). Continuation uses resolved `GROK_HOME` after overlay.
* GitHub: provide `GitHubCliProcessEnv` from the thread’s alias for GitManager / clone / publish / PR CLI.
* User-facing `git commit` in `GitVcsDriverCore` / `GitManager.ts`: pass git author env when set. **Do not** change checkpoint `commitEnv` (stays T3 Code).

## Tests

`envFor` merge; two aliases do not clobber; GitHub execute/probe sees `GH_CONFIG_DIR`; Grok spawn env includes alias `GROK_HOME`.

## Out of scope

Pretty alias settings UI, thread chip, terminal overlay, Source Control per-alias rows (slice 4). Do not ship UI that still calls global `gh`.
