import { describe, expect, it } from "vite-plus/test";
import { IdentityAliasId } from "@t3tools/contracts";

import {
  commitIdentityAliasGitAuthor,
  listIdentityAliases,
  nextIdentityAliasId,
  shouldShowIdentityAliasControl,
  slugifyIdentityAliasId,
} from "./identityAliases";

describe("identityAliases", () => {
  it("slugifies labels into IdentityAliasId-safe ids", () => {
    expect(slugifyIdentityAliasId("Work")).toBe("work");
    expect(slugifyIdentityAliasId("Teton Web")).toBe("teton_web");
    expect(nextIdentityAliasId("Work", new Set())).toBe(IdentityAliasId.make("work"));
    expect(nextIdentityAliasId("Work", new Set(["work"]))).toBe(IdentityAliasId.make("work_2"));
  });

  it("lists aliases by display name", () => {
    const listed = listIdentityAliases({
      work: {
        id: IdentityAliasId.make("work"),
        displayName: "Work",
        grokHome: "",
        ghConfigDir: "",
      },
      home: {
        id: IdentityAliasId.make("home"),
        displayName: "Home",
        grokHome: "",
        ghConfigDir: "",
      },
    });
    expect(listed.map((alias) => alias.id)).toEqual(["home", "work"]);
  });

  it("persists git author only when both fields are filled and clears when either is emptied", () => {
    expect(commitIdentityAliasGitAuthor({ name: "", email: "" })).toBeUndefined();
    expect(commitIdentityAliasGitAuthor({ name: "Work Bot", email: "" })).toBeUndefined();
    expect(commitIdentityAliasGitAuthor({ name: "", email: "work@example.com" })).toBeUndefined();
    expect(commitIdentityAliasGitAuthor({ name: "Work Bot", email: "work@example.com" })).toEqual({
      name: "Work Bot",
      email: "work@example.com",
    });
    expect(commitIdentityAliasGitAuthor({ name: "", email: "work@example.com" })).toBeUndefined();
  });

  it("keeps the unbind control when the last alias is gone but a thread is still bound", () => {
    expect(shouldShowIdentityAliasControl({ aliasCount: 0, boundAliasId: undefined })).toBe(false);
    expect(shouldShowIdentityAliasControl({ aliasCount: 0, boundAliasId: "work" })).toBe(true);
    expect(shouldShowIdentityAliasControl({ aliasCount: 1, boundAliasId: undefined })).toBe(true);
  });
});
