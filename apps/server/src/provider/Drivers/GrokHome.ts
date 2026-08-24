import type { GrokSettings, ProviderInstanceId } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Path from "effect/Path";

import { expandHomePath } from "../../pathExpansion.ts";

export const resolveGrokHomePath = Effect.fn("resolveGrokHomePath")(function* (
  config: Pick<GrokSettings, "homePath">,
): Effect.fn.Return<string, never, Path.Path> {
  const path = yield* Path.Path;
  const homePath = config.homePath.trim();
  if (homePath.length === 0) return "";
  return path.resolve(expandHomePath(homePath));
});

export const makeGrokEnvironment = Effect.fn("makeGrokEnvironment")(function* (
  config: Pick<GrokSettings, "homePath">,
  baseEnv?: NodeJS.ProcessEnv,
): Effect.fn.Return<NodeJS.ProcessEnv, never, Path.Path> {
  const resolvedBaseEnv = baseEnv ?? process.env;
  const homePath = config.homePath.trim();
  if (homePath.length === 0) {
    // Copy so we never mutate process.env. Set GROK_HOME to undefined (do
    // not delete) so ACP extendEnv `{...process.env, ...options.env}`
    // overwrites an ambient GROK_HOME instead of restoring it.
    return {
      ...resolvedBaseEnv,
      GROK_HOME: undefined,
    };
  }
  const resolvedHomePath = yield* resolveGrokHomePath(config);
  return {
    ...resolvedBaseEnv,
    // Isolate this instance via GROK_HOME rather than HOME. Overriding HOME
    // relocates shell/keychain lookups; GROK_HOME points the Grok CLI at its
    // config dir directly while leaving HOME intact.
    GROK_HOME: resolvedHomePath,
  };
});

export const makeGrokContinuationKey = Effect.fn("makeGrokContinuationKey")(function* (
  instanceId: ProviderInstanceId | string,
  config: Pick<GrokSettings, "homePath">,
): Effect.fn.Return<string, never, Path.Path> {
  const resolvedHomePath = yield* resolveGrokHomePath(config);
  if (resolvedHomePath.length === 0) {
    return `grok:instance:${instanceId}`;
  }
  return `grok:instance:${instanceId}:home:${resolvedHomePath}`;
});
