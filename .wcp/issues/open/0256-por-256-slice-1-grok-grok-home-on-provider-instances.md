---
id: "0256"
title: "Slice 1: Grok GROK_HOME on provider instances"
status: open
priority: normal
assignee:
lease_expires:
scope: "Imported from Linear POR-256. Stay inside that description."
acceptance: "First-class `GROK_HOME` on Grok provider instances so two Grok users can stay logged in at once. Isolation is a full home (`GROK_HOME`), not Codex shadow-home. Do not rewrite `H..."
files: []
commit:
reason:
created: "2026-08-24T12:51:47.816Z"
linear_id: "POR-256"
linear_url: "https://linear.app/teton-web-ventures/issue/POR-256/slice-1-grok-grok-home-on-provider-instances"
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
linear_updated: "2026-08-24T13:57:51.621Z"
linear_archived: false
notion_page_id:
notion_url:
---

## Linear import

- Identifier: POR-256
- URL: https://linear.app/teton-web-ventures/issue/POR-256/slice-1-grok-grok-home-on-provider-instances
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
- Created: 2026-08-24T12:51:47.816Z
- Updated: 2026-08-24T13:57:51.621Z
- Completed: no
- Canceled: no
- Archived: no
- Branch: david/por-256-slice-1-grok-grok_home-on-provider-instances

Queue status follows Water Cooler Protocol. Todo, In Progress, In Review, Triage, and Backlog are `open` so the import does not take a ticket lease or start a review. Done, Canceled, and Blocked use those folders. `linear_status` is the Linear status at import.

## Description

First-class `GROK_HOME` on Grok provider instances so two Grok users can stay logged in at once. Isolation is a full home (`GROK_HOME`), not Codex shadow-home. Do not rewrite `HOME`.

Parent: [POR-255](https://linear.app/teton-web-ventures/issue/POR-255/named-identity-aliases-grok-github)

## Work

* Add `homePath` on `GrokSettings` in `packages/contracts/src/settings.ts`, Claude-shaped annotations (`title: "GROK_HOME path"`, placeholder `~/.grok`, form order `binaryPath` → `homePath`). Provider instance card picks this up via `ProviderSettingsForm`.
* New `makeGrokEnvironment` mirroring `apps/server/src/provider/Drivers/ClaudeHome.ts`: expand `~`, set `GROK_HOME` only.
* Wire after `mergeProviderInstanceEnvironment` in `GrokDriver.ts` so probes, ACP spawn (`GrokAcpSupport.ts`), and text-gen see it.
* Continuation: if resolved home is non-empty, `continuationKey` becomes `grok:instance:{id}:home:{resolvedPath}`; otherwise keep `grok:instance:{id}`.
* Docs: `docs/user/providers-grok.md` modeled on `docs/user/providers-claude.md` (`GROK_HOME=... grok login`, do not log out of `~/.grok`).

## Proof

* Unit test: two configs produce different `GROK_HOME` in spawn env.
* Manual: two Grok instances (`~/.grok-teton` vs default) report different auth.

## Out of scope

GitHub `GH_CONFIG_DIR`, alias object, terminals, settings chrome for aliases. Environment-variable rows on an instance already reach spawn; this slice makes `GROK_HOME` first-class like Claude’s `CLAUDE_CONFIG_DIR`.
