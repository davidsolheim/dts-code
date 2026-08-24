import * as Effect from "effect/Effect";

import * as GitHubCli from "../sourceControl/GitHubCli.ts";
import { IdentityAliasProcessEnv } from "./IdentityAliasProcessEnv.ts";
import { resolveIdentityAliasEnvForCwd } from "./resolveIdentityAliasEnv.ts";

/** Provide both alias context tags for this fiber. */
export const provideIdentityAliasProcessEnv =
  (env: NodeJS.ProcessEnv | undefined) =>
  <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
    env === undefined
      ? effect
      : effect.pipe(
          Effect.provideService(IdentityAliasProcessEnv, env),
          Effect.provideService(GitHubCli.GitHubCliProcessEnv, env),
        );

/** Overlay the thread alias env onto GitHub CLI execute/probe for this fiber. */
export const provideIdentityAliasGitHubCliEnv = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
): Effect.Effect<A, E, R | IdentityAliasProcessEnv | GitHubCli.GitHubCliProcessEnv> =>
  Effect.gen(function* () {
    const aliasEnv = yield* IdentityAliasProcessEnv;
    if (aliasEnv === undefined) {
      return yield* effect;
    }
    return yield* effect.pipe(Effect.provideService(GitHubCli.GitHubCliProcessEnv, aliasEnv));
  });

/**
 * Resolve the cwd's thread/project alias and provide it for git / `gh` fibers
 * that never go through Grok `startSession`.
 */
export const withIdentityAliasEnvForCwd =
  (cwd: string | undefined) =>
  <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
    resolveIdentityAliasEnvForCwd(cwd).pipe(
      Effect.flatMap((env) => provideIdentityAliasProcessEnv(env)(effect)),
    );
