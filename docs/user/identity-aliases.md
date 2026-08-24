# Identity aliases

Identity aliases are named overlays for Grok, GitHub, git author, and integrated terminals. They
live on the server. Switching a thread's alias does not log you in; it points those tools at a home
you already logged into.

## Login once per home

Each alias can set `GROK_HOME` and `GH_CONFIG_DIR`. Log in on the machine that runs T3 Code, in those
directories, before you use the alias.

Grok:

```bash
GROK_HOME=~/.grok-work grok login
```

GitHub CLI:

```bash
GH_CONFIG_DIR=~/.config/gh-work gh auth login
```

T3 Code does not run `gh auth switch`. Source Control settings probe `gh auth status` for each
alias's `GH_CONFIG_DIR` (and for the unbound default) and show who is authenticated **for this
alias**, using `gh` on the server.

For a second Grok account as its own provider instance, see [Grok](./providers-grok.md).

## Git author is not GitHub auth

An alias can set git author name and email (`GIT_AUTHOR_*` / `GIT_COMMITTER_*`). That only changes
commit attribution for agent git commits. It does not change GitHub CLI login. Use `GH_CONFIG_DIR`
plus `gh auth login` for pull requests and clone.

## Where to set them

- **Settings → Providers → Identity aliases** — create, edit, and delete aliases (display name,
  accent, `GROK_HOME`, `GH_CONFIG_DIR`, git author, extra environment).
- **Project settings → New threads** — optional default alias for new threads in that project. Clear
  it to leave new threads unbound.
- **Composer identity chip** — switch or clear the alias on an existing thread. If `GROK_HOME`
  changes, T3 Code starts a new continuation group (the Grok session stops) so the next turn uses
  the new home.
