import type { IdentityAlias } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Path from "effect/Path";

import { expandHomePath } from "../pathExpansion.ts";
import { mergeProviderInstanceEnvironment } from "../provider/ProviderInstanceEnvironment.ts";

export const GIT_AUTHOR_ENV_KEYS = [
  "GIT_AUTHOR_NAME",
  "GIT_AUTHOR_EMAIL",
  "GIT_COMMITTER_NAME",
  "GIT_COMMITTER_EMAIL",
] as const;

export function overlayProcessEnv(
  base: NodeJS.ProcessEnv,
  overlay: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv {
  return { ...base, ...overlay };
}

export function pickGitAuthorEnv(
  env: NodeJS.ProcessEnv | undefined,
): NodeJS.ProcessEnv | undefined {
  if (env === undefined) {
    return undefined;
  }
  const picked: NodeJS.ProcessEnv = {};
  for (const key of GIT_AUTHOR_ENV_KEYS) {
    if (Object.hasOwn(env, key)) {
      picked[key] = env[key];
    }
  }
  return Object.keys(picked).length > 0 ? picked : undefined;
}

export const envFor = Effect.fn("envFor")(function* (alias: IdentityAlias) {
  const path = yield* Path.Path;
  const env: NodeJS.ProcessEnv = {};

  const grokHome = alias.grokHome.trim();
  if (grokHome.length > 0) {
    env.GROK_HOME = path.resolve(expandHomePath(grokHome));
  }

  const ghConfigDir = alias.ghConfigDir.trim();
  if (ghConfigDir.length > 0) {
    env.GH_CONFIG_DIR = path.resolve(expandHomePath(ghConfigDir));
  } else {
    env.GH_CONFIG_DIR = undefined;
  }

  if (alias.gitAuthor !== undefined) {
    env.GIT_AUTHOR_NAME = alias.gitAuthor.name;
    env.GIT_AUTHOR_EMAIL = alias.gitAuthor.email;
    env.GIT_COMMITTER_NAME = alias.gitAuthor.name;
    env.GIT_COMMITTER_EMAIL = alias.gitAuthor.email;
  }

  // Always return a fresh object so two aliases cannot share or mutate one map.
  return { ...mergeProviderInstanceEnvironment(alias.extraEnv, env) };
});
