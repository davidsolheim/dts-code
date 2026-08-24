import type { IdentityAliasId } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Path from "effect/Path";

import { ProjectionSnapshotQuery } from "../orchestration/Services/ProjectionSnapshotQuery.ts";
import { ServerSettingsService } from "../serverSettings.ts";
import { envFor } from "./envFor.ts";

/** Overlay when a thread is bound to an alias that is no longer in settings. */
export const missingIdentityAliasEnv: NodeJS.ProcessEnv = {
  GH_CONFIG_DIR: undefined,
};

/**
 * Resolve `envFor(alias)` for a bound alias id.
 *
 * Unbound (`null` / empty) stays ambient. A bound id missing from settings
 * fail-closes by unsetting `GH_CONFIG_DIR` so host `gh` cannot leak.
 */
export const resolveIdentityAliasEnvFromBinding = Effect.fn("resolveIdentityAliasEnvFromBinding")(
  function* (aliasId: string | null | undefined) {
    if (aliasId == null || aliasId.length === 0) {
      return undefined;
    }
    const settings = yield* ServerSettingsService;
    const current = yield* settings.getSettings;
    const alias = current.identityAliases[aliasId];
    if (alias === undefined) {
      return { ...missingIdentityAliasEnv };
    }
    return yield* envFor(alias);
  },
);

/**
 * Map a workspace or worktree cwd to the thread/project alias binding.
 *
 * Lookup failures stay ambient rather than failing the git/source-control RPC.
 */
export const resolveIdentityAliasEnvForCwd = Effect.fn("resolveIdentityAliasEnvForCwd")(function* (
  cwd: string | undefined,
) {
  if (cwd == null || cwd.trim().length === 0) {
    return undefined;
  }
  const path = yield* Path.Path;
  const snapshotQuery = yield* ProjectionSnapshotQuery;
  const binding = yield* snapshotQuery
    .getIdentityAliasBindingForCwd(path.resolve(cwd))
    .pipe(Effect.catch(() => Effect.succeed(Option.none<IdentityAliasId>())));
  return yield* resolveIdentityAliasEnvFromBinding(Option.getOrUndefined(binding)).pipe(
    Effect.catch(() => Effect.succeed(undefined)),
  );
});
