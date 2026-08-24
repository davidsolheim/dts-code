/**
 * Identity aliases — spawn-context env overlays, not a new agent driver.
 *
 * Persisted alongside provider instances in `ServerSettings`. Threads bind
 * an optional alias; Grok/GitHub/git user commits overlay `envFor(alias)`.
 *
 * @module identityAlias
 */
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { TrimmedNonEmptyString, TrimmedString } from "./baseSchemas.ts";
import { ProviderInstanceEnvironment } from "./providerInstance.ts";

const IDENTITY_ALIAS_SLUG_MAX_CHARS = 64;
const IDENTITY_ALIAS_SLUG_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]*$/;

const identityAliasSlugSchema = TrimmedNonEmptyString.check(
  Schema.isMaxLength(IDENTITY_ALIAS_SLUG_MAX_CHARS),
  Schema.isPattern(IDENTITY_ALIAS_SLUG_PATTERN),
);

export const IdentityAliasId = identityAliasSlugSchema.pipe(Schema.brand("IdentityAliasId"));
export type IdentityAliasId = typeof IdentityAliasId.Type;

export const IdentityAliasGitAuthor = Schema.Struct({
  name: TrimmedNonEmptyString,
  email: TrimmedNonEmptyString,
});
export type IdentityAliasGitAuthor = typeof IdentityAliasGitAuthor.Type;

export const IdentityAlias = Schema.Struct({
  id: IdentityAliasId,
  displayName: TrimmedNonEmptyString,
  accentColor: Schema.optional(TrimmedNonEmptyString),
  grokHome: TrimmedString.pipe(Schema.withDecodingDefault(Effect.succeed(""))),
  ghConfigDir: TrimmedString.pipe(Schema.withDecodingDefault(Effect.succeed(""))),
  gitAuthor: Schema.optional(IdentityAliasGitAuthor),
  extraEnv: Schema.optionalKey(ProviderInstanceEnvironment),
});
export type IdentityAlias = typeof IdentityAlias.Type;

export const IdentityAliasMap = Schema.Record(IdentityAliasId, IdentityAlias).check(
  Schema.makeFilter((input) => {
    for (const [key, alias] of Object.entries(input)) {
      if (key !== alias.id) {
        return `identity alias map key '${key}' must equal alias.id '${alias.id}'`;
      }
    }
    return true;
  }),
);
export type IdentityAliasMap = typeof IdentityAliasMap.Type;
