import * as NodeServices from "@effect/platform-node/NodeServices";
import { expect, it } from "@effect/vitest";
import { IdentityAliasId } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";

import * as GitHubCli from "../sourceControl/GitHubCli.ts";
import { ProjectionSnapshotQuery } from "../orchestration/Services/ProjectionSnapshotQuery.ts";
import { ServerSettingsService } from "../serverSettings.ts";
import { IdentityAliasProcessEnv } from "./IdentityAliasProcessEnv.ts";
import { provideIdentityAliasProcessEnv } from "./provideIdentityAliasGitHubCliEnv.ts";
import {
  resolveIdentityAliasEnvForCwd,
  resolveIdentityAliasEnvFromBinding,
} from "./resolveIdentityAliasEnv.ts";

const asAliasId = Schema.decodeUnknownSync(IdentityAliasId);

it.layer(NodeServices.layer)("resolveIdentityAliasEnv", (it) => {
  it.effect("returns undefined when no alias is bound", () =>
    Effect.gen(function* () {
      const env = yield* resolveIdentityAliasEnvFromBinding(undefined);
      expect(env).toBeUndefined();
    }).pipe(Effect.provide(ServerSettingsService.layerTest())),
  );

  it.effect("fail-closes GH_CONFIG_DIR when aliasId is bound but missing", () =>
    Effect.gen(function* () {
      const env = yield* resolveIdentityAliasEnvFromBinding("work");
      expect(env).toEqual({ GH_CONFIG_DIR: undefined });
      expect(env !== undefined && "GH_CONFIG_DIR" in env).toBe(true);
    }).pipe(Effect.provide(ServerSettingsService.layerTest())),
  );

  it.effect("resolves envFor when the alias exists", () =>
    Effect.gen(function* () {
      const path = yield* Path.Path;
      const env = yield* resolveIdentityAliasEnvFromBinding("work");
      expect(env?.GH_CONFIG_DIR).toBe(path.resolve("/tmp/alias-gh"));
      expect(env?.GIT_AUTHOR_NAME).toBe("Work Bot");
    }).pipe(
      Effect.provide(
        ServerSettingsService.layerTest({
          identityAliases: {
            work: {
              id: "work",
              displayName: "Work",
              grokHome: "",
              ghConfigDir: "/tmp/alias-gh",
              gitAuthor: { name: "Work Bot", email: "work@example.com" },
            },
          },
        }),
      ),
    ),
  );

  it.effect("cwd lookup uses the projection binding without startSession", () =>
    Effect.gen(function* () {
      const path = yield* Path.Path;
      const env = yield* resolveIdentityAliasEnvForCwd("/repo");
      expect(env?.GH_CONFIG_DIR).toBe(path.resolve("/tmp/alias-gh"));
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          ServerSettingsService.layerTest({
            identityAliases: {
              work: {
                id: "work",
                displayName: "Work",
                grokHome: "",
                ghConfigDir: "/tmp/alias-gh",
              },
            },
          }),
          Layer.succeed(ProjectionSnapshotQuery, {
            getCommandReadModel: () => Effect.die("unused"),
            getSnapshot: () => Effect.die("unused"),
            getShellSnapshot: () => Effect.die("unused"),
            getArchivedShellSnapshot: () => Effect.die("unused"),
            getSnapshotSequence: () => Effect.die("unused"),
            getCounts: () => Effect.die("unused"),
            getActiveProjectByWorkspaceRoot: () => Effect.succeed(Option.none()),
            getProjectShellById: () => Effect.succeed(Option.none()),
            getFirstActiveThreadIdByProjectId: () => Effect.succeed(Option.none()),
            getIdentityAliasBindingForCwd: () => Effect.succeed(Option.some(asAliasId("work"))),
            getThreadCheckpointContext: () => Effect.succeed(Option.none()),
            getFullThreadDiffContext: () => Effect.succeed(Option.none()),
            getThreadShellById: () => Effect.succeed(Option.none()),
            getThreadDetailById: () => Effect.succeed(Option.none()),
            getThreadDetailSnapshot: () => Effect.succeed(Option.none()),
            searchThreads: () => Effect.succeed({ matches: [] }),
          }),
        ),
      ),
    ),
  );

  it.effect("provideIdentityAliasProcessEnv sets both tags without startSession", () =>
    Effect.gen(function* () {
      const githubEnv = yield* GitHubCli.GitHubCliProcessEnv;
      const aliasEnv = yield* IdentityAliasProcessEnv;
      expect(githubEnv?.GH_CONFIG_DIR).toBe("/tmp/alias-gh");
      expect(aliasEnv?.GIT_AUTHOR_NAME).toBe("Work Bot");
    }).pipe(
      provideIdentityAliasProcessEnv({
        GH_CONFIG_DIR: "/tmp/alias-gh",
        GIT_AUTHOR_NAME: "Work Bot",
      }),
    ),
  );
});
