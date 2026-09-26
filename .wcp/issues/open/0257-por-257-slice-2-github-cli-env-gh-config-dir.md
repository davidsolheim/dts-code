---
id: "0257"
title: "Slice 2: GitHub CLI env (GH_CONFIG_DIR)"
status: open
priority: normal
assignee:
lease_expires:
scope: "Imported from Linear POR-257. Stay inside that description."
acceptance: "Thread env through GitHub CLI so `GH_CONFIG_DIR` can isolate accounts. This is the real gap: `VcsProcess.run` already accepts `env`; `GitHubCli.execute` does not pass it. Discov..."
files: []
commit:
reason:
created: "2026-08-24T12:51:48.878Z"
linear_id: "POR-257"
linear_url: "https://linear.app/teton-web-ventures/issue/POR-257/slice-2-github-cli-env-gh-config-dir"
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
linear_updated: "2026-08-24T14:50:14.618Z"
linear_archived: false
notion_page_id:
notion_url:
---

## Linear import

- Identifier: POR-257
- URL: https://linear.app/teton-web-ventures/issue/POR-257/slice-2-github-cli-env-gh-config-dir
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
- Created: 2026-08-24T12:51:48.878Z
- Updated: 2026-08-24T14:50:14.618Z
- Completed: no
- Canceled: no
- Archived: no
- Branch: david/por-257-slice-2-github-cli-env-gh_config_dir

Queue status follows Water Cooler Protocol. Todo, In Progress, In Review, Triage, and Backlog are `open` so the import does not take a ticket lease or start a review. Done, Canceled, and Blocked use those folders. `linear_status` is the Linear status at import.

## Description

Thread env through GitHub CLI so `GH_CONFIG_DIR` can isolate accounts. This is the real gap: `VcsProcess.run` already accepts `env`; `GitHubCli.execute` does not pass it. Discovery/auth probe currently uses process-global `gh`.

Parent: [POR-255](https://linear.app/teton-web-ventures/issue/POR-255/named-identity-aliases-grok-github)

Do **not** use `gh auth switch`. Isolation is `GH_CONFIG_DIR` only. Do not ship alias UI in this slice.

## Work

* Add optional `env` on `GitHubCli.execute` and spread into `VcsProcess.run` (same as git). Wrapper methods (`createPullRequest`, `getRepositoryCloneUrls`, …) forward optional `env`.
* Do **not** thread `env` through every `github.execute` in `GitHubPullRequestCli.ts`. Add a small Effect context service (e.g. `GitHubCliProcessEnv`) that Live `execute` merges when present. Tests pass `env` explicitly on `execute`.
* `probeSourceControlProvider` accepts optional `env` for version + `gh auth status --json hosts`. Settings UI stays global until slice 4.

## Proof (failing test first)

* Two temp dirs: `GitHubCli.execute` / auth probe with `{ GH_CONFIG_DIR: dirA }` vs `dirB` do not share accounts.
* Update `GitHubCli.test.ts` to assert `env` is forwarded.
* Parse coverage stays in `gitHubAuthStatus.ts` / existing provider tests.

## Key files

* `apps/server/src/sourceControl/GitHubCli.ts`
* `apps/server/src/sourceControl/SourceControlProviderDiscovery.ts`
* `apps/server/src/sourceControl/gitHubAuthStatus.ts`
* `apps/server/src/vcs/VcsProcess.ts`

## Out of scope

Alias persistence, Source Control per-alias UI, terminals.
