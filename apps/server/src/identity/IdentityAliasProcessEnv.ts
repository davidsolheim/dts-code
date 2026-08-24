import * as Context from "effect/Context";

/**
 * Per-fiber spawn overlay from the thread's identity alias (`envFor`).
 * Default undefined so existing sessions keep instance env only.
 */
export class IdentityAliasProcessEnv extends Context.Reference<NodeJS.ProcessEnv | undefined>(
  "t3/identity/IdentityAliasProcessEnv",
  { defaultValue: () => undefined },
) {}
