import {
  IdentityAliasId,
  type IdentityAlias,
  type IdentityAliasGitAuthor,
  type IdentityAliasMap,
} from "@t3tools/contracts";

export function listIdentityAliases(
  map: IdentityAliasMap | undefined,
): ReadonlyArray<IdentityAlias> {
  return Object.values(map ?? {}).toSorted((left, right) =>
    left.displayName.localeCompare(right.displayName),
  );
}

export function slugifyIdentityAliasId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/^[0-9]/, "a$&")
    .slice(0, 64);
}

export function nextIdentityAliasId(
  displayName: string,
  existing: ReadonlySet<string>,
): IdentityAliasId | null {
  const base = slugifyIdentityAliasId(displayName);
  if (base.length === 0) return null;
  let candidate = base;
  let suffix = 2;
  while (existing.has(candidate)) {
    const extra = `_${suffix}`;
    candidate = `${base.slice(0, Math.max(1, 64 - extra.length))}${extra}`;
    suffix += 1;
  }
  return IdentityAliasId.make(candidate);
}

export function commitIdentityAliasGitAuthor(draft: {
  readonly name: string;
  readonly email: string;
}): IdentityAliasGitAuthor | undefined {
  const name = draft.name.trim();
  const email = draft.email.trim();
  if (name.length === 0 || email.length === 0) {
    return undefined;
  }
  return { name, email };
}

export function shouldShowIdentityAliasControl(input: {
  readonly aliasCount: number;
  readonly boundAliasId: string | null | undefined;
}): boolean {
  return input.aliasCount > 0 || (input.boundAliasId != null && input.boundAliasId.length > 0);
}
