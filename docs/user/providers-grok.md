# Grok

This guide is for people who want to use more than one Grok setup in T3 Code. For Claude, see
[Claude](./providers-claude.md). For Codex, see [Codex](./providers-codex.md). For first-time
setup, see [Install T3 Code](./install.md).

Common reasons:

- use separate work and personal Grok accounts
- keep two Grok users logged in at the same time
- try a different Grok CLI configuration without disturbing your main setup

## I Only Use One Grok Account

Use the default provider.

Log in with the Grok CLI normally:

```bash
grok login
```

In T3 Code Settings, your Grok provider can stay like this:

```text
Display name: Grok
Binary path: grok
GROK_HOME path: empty
```

An empty `GROK_HOME path` means T3 Code uses the Grok CLI's normal home (`~/.grok`).

When you set this field, T3 Code points the Grok CLI at that directory with the `GROK_HOME`
environment variable. It does not change `HOME`, so your system keychain and the rest of your
environment stay as they are.

## I Want Work And Personal Grok Accounts

Use a different Grok home for each account. Isolation is a full home (`GROK_HOME`), not a shared
shadow home.

Example:

```text
default home (~/.grok)    work account
~/.grok-teton             personal or second account
```

### Set Up The First Account

Log in normally:

```bash
grok login
```

In T3 Code Settings:

```text
Display name: Grok Work
Binary path: grok
GROK_HOME path: empty
```

Do not log out of `~/.grok` when you add a second account. Each home keeps its own login.

### Set Up The Second Account

Log in with a separate home:

```bash
mkdir -p ~/.grok-teton
GROK_HOME=~/.grok-teton grok login
```

Use `GROK_HOME`, not `HOME`. Setting `HOME` writes the login somewhere T3 Code does not look.

Then add another Grok provider in T3 Code:

```text
Display name: Grok Personal
Binary path: grok
GROK_HOME path: ~/.grok-teton
```

Distinguish instances by display name and `GROK_HOME path`. Settings does not show which Grok
account is logged in.

## Can I Switch Grok Accounts In An Existing Thread?

Usually, no.

T3 Code can continue a Grok thread only with **that same Grok provider instance**. Changing that
instance's `GROK_HOME path` starts a new continuation group.

An empty `GROK_HOME path` and a typed `~/.grok` are different keys, even though both use the CLI's
normal home on disk.

## I Want Different Grok Settings, Not A Different Account

Create another Grok provider with the same account if you want a named preset.

If the preset needs different Grok files, give it a different `GROK_HOME path`. If it needs
different API keys or other variables, use Environment variables.
