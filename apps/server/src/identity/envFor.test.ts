import * as NodeOS from "node:os";

import * as NodeServices from "@effect/platform-node/NodeServices";
import { describe, expect, it } from "@effect/vitest";
import { IdentityAlias } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";

import {
  envFor,
  overlayIdentityAliasSpawnEnv,
  overlayProcessEnv,
  pickGitAuthorEnv,
} from "./envFor.ts";

const decodeIdentityAlias = Schema.decodeUnknownSync(IdentityAlias);

it.layer(NodeServices.layer)("envFor", (it) => {
  it.effect("merges process then instance then alias, with extraEnv last", () =>
    Effect.gen(function* () {
      const path = yield* Path.Path;
      const alias = decodeIdentityAlias({
        id: "work",
        displayName: "Work",
        grokHome: "/tmp/alias-grok",
        ghConfigDir: "/tmp/alias-gh",
        gitAuthor: { name: "Work Bot", email: "work@example.com" },
        extraEnv: [{ name: "GROK_HOME", value: "/tmp/extra-grok", sensitive: false }],
      });
      const aliasEnv = yield* envFor(alias);
      const processEnv = { PATH: "/bin", GROK_HOME: "/ambient-grok", GH_CONFIG_DIR: "/ambient-gh" };
      const instanceEnv = { PATH: "/bin", GROK_HOME: "/instance-grok", CUSTOM: "instance" };
      const merged = overlayProcessEnv(overlayProcessEnv(processEnv, instanceEnv), aliasEnv);

      expect(merged.PATH).toBe("/bin");
      expect(merged.CUSTOM).toBe("instance");
      expect(merged.GROK_HOME).toBe("/tmp/extra-grok");
      expect(merged.GH_CONFIG_DIR).toBe(path.resolve("/tmp/alias-gh"));
      expect(merged.GIT_AUTHOR_NAME).toBe("Work Bot");
      expect(merged.GIT_AUTHOR_EMAIL).toBe("work@example.com");
      expect(merged.GIT_COMMITTER_NAME).toBe("Work Bot");
      expect(merged.GIT_COMMITTER_EMAIL).toBe("work@example.com");
      expect(pickGitAuthorEnv(aliasEnv)).toEqual({
        GIT_AUTHOR_NAME: "Work Bot",
        GIT_AUTHOR_EMAIL: "work@example.com",
        GIT_COMMITTER_NAME: "Work Bot",
        GIT_COMMITTER_EMAIL: "work@example.com",
      });
    }),
  );

  it.effect("omits empty grokHome, unsets empty ghConfigDir, and does not return process.env", () =>
    Effect.gen(function* () {
      const alias = decodeIdentityAlias({
        id: "personal",
        displayName: "Personal",
      });
      const aliasEnv = yield* envFor(alias);
      expect(aliasEnv).not.toBe(process.env);
      expect("GROK_HOME" in aliasEnv).toBe(false);
      expect(aliasEnv.GROK_HOME).toBeUndefined();
      expect("GH_CONFIG_DIR" in aliasEnv).toBe(true);
      expect(aliasEnv.GH_CONFIG_DIR).toBeUndefined();
      expect(pickGitAuthorEnv(aliasEnv)).toBeUndefined();

      const overlaid = overlayProcessEnv(
        { GROK_HOME: "/ambient-grok", GH_CONFIG_DIR: "/ambient-gh" },
        aliasEnv,
      );
      expect("GROK_HOME" in overlaid).toBe(true);
      expect(overlaid.GROK_HOME).toBe("/ambient-grok");
      expect("GH_CONFIG_DIR" in overlaid).toBe(true);
      expect(overlaid.GH_CONFIG_DIR).toBeUndefined();
    }),
  );

  it.effect("expands and resolves grokHome and ghConfigDir", () =>
    Effect.gen(function* () {
      const path = yield* Path.Path;
      const alias = decodeIdentityAlias({
        id: "home",
        displayName: "Home",
        grokHome: "~/.grok-work",
        ghConfigDir: "~/.config/gh-work",
      });
      const aliasEnv = yield* envFor(alias);
      expect(aliasEnv.GROK_HOME).toBe(path.resolve(NodeOS.homedir(), ".grok-work"));
      expect(aliasEnv.GH_CONFIG_DIR).toBe(path.resolve(NodeOS.homedir(), ".config/gh-work"));
    }),
  );

  it.effect("two aliases return isolated env objects", () =>
    Effect.gen(function* () {
      const path = yield* Path.Path;
      const work = decodeIdentityAlias({
        id: "work",
        displayName: "Work",
        grokHome: "/tmp/work-grok",
        ghConfigDir: "/tmp/work-gh",
      });
      const personal = decodeIdentityAlias({
        id: "personal",
        displayName: "Personal",
        grokHome: "/tmp/personal-grok",
        ghConfigDir: "/tmp/personal-gh",
      });
      const workEnv = yield* envFor(work);
      const personalEnv = yield* envFor(personal);
      expect(workEnv).not.toBe(personalEnv);
      workEnv.GROK_HOME = "/mutated";
      expect(personalEnv.GROK_HOME).toBe(path.resolve("/tmp/personal-grok"));
      expect(personalEnv.GH_CONFIG_DIR).toBe(path.resolve("/tmp/personal-gh"));
    }),
  );

  it.effect("spawn overlay writes empty strings for unset identity keys", () =>
    Effect.gen(function* () {
      const aliasEnv = yield* envFor(
        decodeIdentityAlias({
          id: "personal",
          displayName: "Personal",
        }),
      );
      const spawned = overlayIdentityAliasSpawnEnv(
        { PATH: "/bin", GH_CONFIG_DIR: "/host-gh", GROK_HOME: "/host-grok" },
        aliasEnv,
      );
      expect(spawned.GH_CONFIG_DIR).toBe("");
      expect(spawned.GROK_HOME).toBe("");
      expect(spawned.PATH).toBe("/bin");
      expect("GIT_AUTHOR_NAME" in spawned).toBe(false);
    }),
  );

  it.effect(
    "spawn overlay omits git author keys when alias has GH_CONFIG_DIR but no gitAuthor",
    () =>
      Effect.gen(function* () {
        const path = yield* Path.Path;
        const aliasEnv = yield* envFor(
          decodeIdentityAlias({
            id: "work",
            displayName: "Work",
            ghConfigDir: "/tmp/alias-gh",
          }),
        );
        const spawned = overlayIdentityAliasSpawnEnv(
          {
            PATH: "/bin",
            GH_CONFIG_DIR: "/host-gh",
            GROK_HOME: "/host-grok",
            GIT_AUTHOR_NAME: "Host User",
            GIT_AUTHOR_EMAIL: "host@example.com",
            GIT_COMMITTER_NAME: "Host User",
            GIT_COMMITTER_EMAIL: "host@example.com",
          },
          aliasEnv,
        );
        expect(spawned.GH_CONFIG_DIR).toBe(path.resolve("/tmp/alias-gh"));
        expect(spawned.GROK_HOME).toBe("");
        expect("GIT_AUTHOR_NAME" in spawned).toBe(false);
        expect("GIT_AUTHOR_EMAIL" in spawned).toBe(false);
        expect("GIT_COMMITTER_NAME" in spawned).toBe(false);
        expect("GIT_COMMITTER_EMAIL" in spawned).toBe(false);
      }),
  );
});
