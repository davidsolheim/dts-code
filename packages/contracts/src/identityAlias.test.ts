import { describe, expect, it } from "vite-plus/test";
import * as Schema from "effect/Schema";

import { IdentityAlias, IdentityAliasId, IdentityAliasMap } from "./identityAlias.ts";

const decodeIdentityAliasId = Schema.decodeUnknownSync(IdentityAliasId);
const decodeIdentityAlias = Schema.decodeUnknownSync(IdentityAlias);
const decodeIdentityAliasMap = Schema.decodeUnknownSync(IdentityAliasMap);

describe("IdentityAliasId", () => {
  it.each(["work", "teton", "alias-1", "personal_gh"])("accepts %s", (id) => {
    expect(decodeIdentityAliasId(id)).toBe(id);
  });

  it.each(["", "1work", "-work", "has space"])("rejects %s", (id) => {
    expect(() => decodeIdentityAliasId(id)).toThrow();
  });
});

describe("IdentityAlias", () => {
  it("decodes with empty homes omitted from forcing a custom path", () => {
    const alias = decodeIdentityAlias({
      id: "work",
      displayName: "Work",
    });
    expect(alias.grokHome).toBe("");
    expect(alias.ghConfigDir).toBe("");
    expect(alias.extraEnv).toBeUndefined();
  });

  it("round-trips extraEnv including the sensitive flag", () => {
    const alias = decodeIdentityAlias({
      id: "work",
      displayName: "Work",
      grokHome: "~/.grok-work",
      ghConfigDir: "~/.config/gh-work",
      extraEnv: [{ name: "TOKEN", value: "secret", sensitive: true }],
    });
    expect(alias.extraEnv?.[0]).toMatchObject({
      name: "TOKEN",
      value: "secret",
      sensitive: true,
    });
  });
});

describe("IdentityAliasMap", () => {
  it("rejects a map whose key does not equal alias.id", () => {
    expect(() =>
      decodeIdentityAliasMap({
        work: {
          id: "personal",
          displayName: "Personal",
        },
      }),
    ).toThrow();
  });

  it("accepts a map whose key equals alias.id", () => {
    const decoded = decodeIdentityAliasMap({
      work: {
        id: "work",
        displayName: "Work",
      },
    });
    expect(decoded.work?.id).toBe("work");
  });
});
