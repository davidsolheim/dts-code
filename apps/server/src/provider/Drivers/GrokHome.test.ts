import * as NodeOS from "node:os";

import * as NodeServices from "@effect/platform-node/NodeServices";
import { describe, expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Path from "effect/Path";

import { IdentityAlias } from "@t3tools/contracts";
import * as Schema from "effect/Schema";

import { envFor, overlayProcessEnv } from "../../identity/envFor.ts";
import { buildGrokAcpSpawnInput } from "../acp/GrokAcpSupport.ts";
import { makeGrokContinuationKey, makeGrokEnvironment, resolveGrokHomePath } from "./GrokHome.ts";

const decodeIdentityAlias = Schema.decodeUnknownSync(IdentityAlias);

it.layer(NodeServices.layer)("GrokHome", (it) => {
  describe("Grok home resolution", () => {
    it.effect("leaves GROK_HOME unset when no home override is configured", () =>
      Effect.gen(function* () {
        const env = yield* makeGrokEnvironment({ homePath: "" });
        expect(yield* resolveGrokHomePath({ homePath: "" })).toBe("");
        expect(env).not.toBe(process.env);
        expect(env.GROK_HOME).toBeUndefined();
        expect("GROK_HOME" in env).toBe(true);
        expect(yield* makeGrokContinuationKey("grok", { homePath: "" })).toBe("grok:instance:grok");
      }),
    );

    it.effect("strips leaked GROK_HOME from the default instance without mutating HOME", () =>
      Effect.gen(function* () {
        const leaked = {
          HOME: "/Users/example",
          PATH: "/usr/bin",
          GROK_HOME: "/leaked/grok-home",
        };
        const defaultEnv = yield* makeGrokEnvironment({ homePath: "" }, leaked);
        expect(defaultEnv).not.toBe(leaked);
        expect(defaultEnv.GROK_HOME).toBeUndefined();
        expect("GROK_HOME" in defaultEnv).toBe(true);
        expect(defaultEnv.HOME).toBe("/Users/example");
        expect(leaked.GROK_HOME).toBe("/leaked/grok-home");

        const spawnDefault = buildGrokAcpSpawnInput(
          { binaryPath: "grok" },
          "/tmp/project",
          defaultEnv,
        );
        expect(spawnDefault.env?.GROK_HOME).toBeUndefined();
        expect(spawnDefault.env?.HOME).toBe("/Users/example");
      }),
    );

    it.effect("empty home overwrites ambient GROK_HOME under ACP extendEnv merge", () =>
      Effect.gen(function* () {
        const processEnv = {
          HOME: "/Users/example",
          PATH: "/usr/bin",
          GROK_HOME: "/ambient/grok-home",
        };
        const optionsEnv = yield* makeGrokEnvironment({ homePath: "" }, processEnv);
        const merged = { ...processEnv, ...optionsEnv };

        expect(optionsEnv).not.toBe(processEnv);
        expect(merged.GROK_HOME).toBeUndefined();
        expect(merged.HOME).toBe("/Users/example");
        expect(processEnv.GROK_HOME).toBe("/ambient/grok-home");
      }),
    );

    it.effect("two configs produce different GROK_HOME in spawn env", () =>
      Effect.gen(function* () {
        const path = yield* Path.Path;
        const tetonHome = "~/.grok-teton";
        const resolvedTeton = path.resolve(NodeOS.homedir(), ".grok-teton");
        const resolvedAlt = path.resolve("/tmp/grok-alt");
        const baseEnv = { HOME: "/Users/example", PATH: "/usr/bin" };

        const tetonEnv = yield* makeGrokEnvironment({ homePath: tetonHome }, baseEnv);
        const altEnv = yield* makeGrokEnvironment({ homePath: "/tmp/grok-alt" }, baseEnv);
        const defaultEnv = yield* makeGrokEnvironment({ homePath: "" }, baseEnv);

        expect(tetonEnv.GROK_HOME).toBe(resolvedTeton);
        expect(altEnv.GROK_HOME).toBe(resolvedAlt);
        expect(tetonEnv.GROK_HOME).not.toBe(altEnv.GROK_HOME);
        expect(defaultEnv.GROK_HOME).toBeUndefined();

        expect(tetonEnv.HOME).toBe("/Users/example");
        expect(altEnv.HOME).toBe("/Users/example");
        expect(defaultEnv.HOME).toBe("/Users/example");

        const spawnTeton = buildGrokAcpSpawnInput({ binaryPath: "grok" }, "/tmp/project", tetonEnv);
        const spawnAlt = buildGrokAcpSpawnInput({ binaryPath: "grok" }, "/tmp/project", altEnv);
        const spawnDefault = buildGrokAcpSpawnInput(
          { binaryPath: "grok" },
          "/tmp/project",
          defaultEnv,
        );
        expect(spawnTeton.env?.GROK_HOME).toBe(resolvedTeton);
        expect(spawnAlt.env?.GROK_HOME).toBe(resolvedAlt);
        expect(spawnTeton.env?.GROK_HOME).not.toBe(spawnAlt.env?.GROK_HOME);
        expect(spawnTeton.env?.HOME).toBe("/Users/example");
        expect(spawnDefault.env?.GROK_HOME).toBeUndefined();
        expect(spawnDefault.env?.HOME).toBe("/Users/example");
      }),
    );

    it.effect("stamps continuation with resolved home only when GROK_HOME is set", () =>
      Effect.gen(function* () {
        const path = yield* Path.Path;
        const homePath = "~/.grok-teton";
        const resolved = path.resolve(NodeOS.homedir(), ".grok-teton");
        const resolvedAlt = path.resolve("/tmp/grok-alt");

        expect(yield* resolveGrokHomePath({ homePath })).toBe(resolved);
        expect(yield* makeGrokContinuationKey("grok-work", { homePath })).toBe(
          `grok:instance:grok-work:home:${resolved}`,
        );
        expect(yield* makeGrokContinuationKey("grok-work", { homePath: "/tmp/grok-alt" })).toBe(
          `grok:instance:grok-work:home:${resolvedAlt}`,
        );
        expect(yield* makeGrokContinuationKey("grok-work", { homePath })).not.toBe(
          yield* makeGrokContinuationKey("grok-work", { homePath: "/tmp/grok-alt" }),
        );
        expect(yield* makeGrokContinuationKey("grok-work", { homePath: "" })).toBe(
          "grok:instance:grok-work",
        );
      }),
    );

    it.effect("spawn env includes alias GROK_HOME after overlay", () =>
      Effect.gen(function* () {
        const path = yield* Path.Path;
        const instanceHome = path.resolve("/tmp/instance-grok");
        const aliasHome = path.resolve("/tmp/alias-grok");
        const instanceEnv = yield* makeGrokEnvironment(
          { homePath: instanceHome },
          {
            PATH: "/usr/bin",
            GROK_HOME: "/ambient-grok",
          },
        );
        const aliasEnv = yield* envFor(
          decodeIdentityAlias({
            id: "work",
            displayName: "Work",
            grokHome: aliasHome,
          }),
        );
        const spawn = buildGrokAcpSpawnInput(
          { binaryPath: "grok" },
          "/tmp/project",
          overlayProcessEnv(instanceEnv, aliasEnv),
        );
        expect(spawn.env?.GROK_HOME).toBe(aliasHome);
        expect(spawn.env?.GROK_HOME).not.toBe(instanceHome);
      }),
    );
  });
});
