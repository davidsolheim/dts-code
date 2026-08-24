import { assert, it, afterEach, describe, expect, vi } from "@effect/vitest";
import * as NodeServices from "@effect/platform-node/NodeServices";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as PlatformError from "effect/PlatformError";
import * as Schema from "effect/Schema";
import { ChildProcessSpawner } from "effect/unstable/process";
import { IdentityAlias, VcsProcessExitError, VcsProcessSpawnError } from "@t3tools/contracts";

import { envFor } from "../identity/envFor.ts";
import { provideIdentityAliasProcessEnv } from "../identity/provideIdentityAliasGitHubCliEnv.ts";

import * as VcsProcess from "../vcs/VcsProcess.ts";
import * as GitHubCli from "./GitHubCli.ts";
import { parseGitHubAuthStatus } from "./gitHubAuthStatus.ts";
import * as GitHubSourceControlProvider from "./GitHubSourceControlProvider.ts";
import { probeSourceControlProvider } from "./SourceControlProviderDiscovery.ts";

const executeRunInput = (input: {
  readonly args: ReadonlyArray<string>;
  readonly env?: NodeJS.ProcessEnv;
}) => ({
  operation: "GitHubCli.execute",
  command: "gh",
  args: input.args,
  cwd: "/repo",
  timeoutMs: 30_000,
  ...(input.env !== undefined ? { env: input.env } : {}),
});

const authHostsJson = (login: string) =>
  JSON.stringify({
    hosts: {
      "github.com": [
        {
          state: "success",
          active: true,
          host: "github.com",
          login,
        },
      ],
    },
  });

const processOutput = (stdout: string): VcsProcess.VcsProcessOutput => ({
  exitCode: ChildProcessSpawner.ExitCode(0),
  stdout,
  stderr: "",
  stdoutTruncated: false,
  stderrTruncated: false,
});

const mockRun = vi.fn<VcsProcess.VcsProcess["Service"]["run"]>();

const layer = GitHubCli.layer.pipe(
  Layer.provide(
    Layer.mock(VcsProcess.VcsProcess)({
      run: mockRun,
    }),
  ),
);

afterEach(() => {
  mockRun.mockReset();
});

describe("GitHubCli.layer", () => {
  it("does not classify a missing cwd as an unavailable gh executable", () => {
    const context = { command: "gh", cwd: "/repo" } as const;
    const missingCwd = new VcsProcessSpawnError({
      operation: "GitHubCli.execute",
      command: "gh",
      cwd: context.cwd,
      cause: PlatformError.systemError({
        _tag: "NotFound",
        module: "FileSystem",
        method: "access",
        pathOrDescriptor: context.cwd,
      }),
    });

    const commandFailure = GitHubCli.fromVcsError(context, missingCwd);

    assert.equal(commandFailure._tag, "GitHubCliCommandError");
    assert.strictEqual(commandFailure.cause, missingCwd);
    assert.notProperty(commandFailure, "operation");
  });

  it.effect("parses pull request view output", () =>
    Effect.gen(function* () {
      mockRun.mockReturnValueOnce(
        Effect.succeed(
          processOutput(
            // @effect-diagnostics-next-line preferSchemaOverJson:off
            JSON.stringify({
              number: 42,
              title: "Add PR thread creation",
              url: "https://github.com/pingdotgg/codething-mvp/pull/42",
              baseRefName: "main",
              headRefName: "feature/pr-threads",
              state: "OPEN",
              mergedAt: null,
              isCrossRepository: true,
              headRepository: {
                nameWithOwner: "octocat/codething-mvp",
              },
              headRepositoryOwner: {
                login: "octocat",
              },
            }),
          ),
        ),
      );

      const gh = yield* GitHubCli.GitHubCli;
      const result = yield* gh.getPullRequest({
        cwd: "/repo",
        reference: "#42",
      });

      assert.deepStrictEqual(result, {
        number: 42,
        title: "Add PR thread creation",
        url: "https://github.com/pingdotgg/codething-mvp/pull/42",
        baseRefName: "main",
        headRefName: "feature/pr-threads",
        state: "open",
        isCrossRepository: true,
        headRepositoryNameWithOwner: "octocat/codething-mvp",
        headRepositoryOwnerLogin: "octocat",
      });
      expect(mockRun).toHaveBeenCalledWith({
        operation: "GitHubCli.execute",
        command: "gh",
        args: [
          "pr",
          "view",
          "#42",
          "--json",
          "number,title,url,baseRefName,headRefName,state,mergedAt,isCrossRepository,headRepository,headRepositoryOwner",
        ],
        cwd: "/repo",
        timeoutMs: 30_000,
      });
    }).pipe(Effect.provide(layer)),
  );

  it.effect("trims pull request fields decoded from gh json", () =>
    Effect.gen(function* () {
      mockRun.mockReturnValueOnce(
        Effect.succeed(
          processOutput(
            // @effect-diagnostics-next-line preferSchemaOverJson:off
            JSON.stringify({
              number: 42,
              title: "  Add PR thread creation  \n",
              url: " https://github.com/pingdotgg/codething-mvp/pull/42 ",
              baseRefName: " main ",
              headRefName: "\tfeature/pr-threads\t",
              state: "OPEN",
              mergedAt: null,
              isCrossRepository: true,
              headRepository: {
                nameWithOwner: " octocat/codething-mvp ",
              },
              headRepositoryOwner: {
                login: " octocat ",
              },
            }),
          ),
        ),
      );

      const gh = yield* GitHubCli.GitHubCli;
      const result = yield* gh.getPullRequest({
        cwd: "/repo",
        reference: "#42",
      });

      assert.deepStrictEqual(result, {
        number: 42,
        title: "Add PR thread creation",
        url: "https://github.com/pingdotgg/codething-mvp/pull/42",
        baseRefName: "main",
        headRefName: "feature/pr-threads",
        state: "open",
        isCrossRepository: true,
        headRepositoryNameWithOwner: "octocat/codething-mvp",
        headRepositoryOwnerLogin: "octocat",
      });
    }).pipe(Effect.provide(layer)),
  );

  it.effect("skips invalid entries when parsing pr lists", () =>
    Effect.gen(function* () {
      mockRun.mockReturnValueOnce(
        Effect.succeed(
          processOutput(
            // @effect-diagnostics-next-line preferSchemaOverJson:off
            JSON.stringify([
              {
                number: 0,
                title: "invalid",
                url: "https://github.com/pingdotgg/codething-mvp/pull/0",
                baseRefName: "main",
                headRefName: "feature/invalid",
              },
              {
                number: 43,
                title: "  Valid PR  ",
                url: " https://github.com/pingdotgg/codething-mvp/pull/43 ",
                baseRefName: " main ",
                headRefName: " feature/pr-list ",
                headRepository: {
                  nameWithOwner: "   ",
                },
                headRepositoryOwner: {
                  login: "   ",
                },
              },
            ]),
          ),
        ),
      );

      const gh = yield* GitHubCli.GitHubCli;
      const result = yield* gh.listOpenPullRequests({
        cwd: "/repo",
        headSelector: "feature/pr-list",
      });

      assert.deepStrictEqual(result, [
        {
          number: 43,
          title: "Valid PR",
          url: "https://github.com/pingdotgg/codething-mvp/pull/43",
          baseRefName: "main",
          headRefName: "feature/pr-list",
          state: "open",
        },
      ]);
    }).pipe(Effect.provide(layer)),
  );

  it.effect("keeps pull requests from gh versions without headRepository.nameWithOwner", () =>
    // gh < 2.47 (e.g. Ubuntu-packaged 2.46) exports headRepository as
    // {id, name} only. These entries must decode instead of being dropped,
    // with nameWithOwner rebuilt from the owner login.
    Effect.gen(function* () {
      mockRun.mockReturnValueOnce(
        Effect.succeed(
          processOutput(
            // @effect-diagnostics-next-line preferSchemaOverJson:off
            JSON.stringify([
              {
                number: 2829,
                title: "Codex turn mapping",
                url: "https://github.com/pingdotgg/codething-mvp/pull/2829",
                baseRefName: "main",
                headRefName: "t3code/codex-turn-mapping",
                state: "OPEN",
                mergedAt: null,
                isCrossRepository: false,
                headRepository: {
                  id: "R_kgDORLtfbQ",
                  name: "codething-mvp",
                },
                headRepositoryOwner: {
                  id: "MDEyOk9yZ2FuaXphdGlvbjg5MTkxNzI3",
                  login: "pingdotgg",
                },
              },
            ]),
          ),
        ),
      );

      const gh = yield* GitHubCli.GitHubCli;
      const result = yield* gh.listOpenPullRequests({
        cwd: "/repo",
        headSelector: "t3code/codex-turn-mapping",
      });

      assert.deepStrictEqual(result, [
        {
          number: 2829,
          title: "Codex turn mapping",
          url: "https://github.com/pingdotgg/codething-mvp/pull/2829",
          baseRefName: "main",
          headRefName: "t3code/codex-turn-mapping",
          state: "open",
          isCrossRepository: false,
          headRepositoryNameWithOwner: "pingdotgg/codething-mvp",
          headRepositoryOwnerLogin: "pingdotgg",
        },
      ]);
    }).pipe(Effect.provide(layer)),
  );

  it.effect("reads repository clone URLs", () =>
    Effect.gen(function* () {
      mockRun.mockReturnValueOnce(
        Effect.succeed(
          processOutput(
            // @effect-diagnostics-next-line preferSchemaOverJson:off
            JSON.stringify({
              nameWithOwner: "octocat/codething-mvp",
              url: "https://github.com/octocat/codething-mvp",
              sshUrl: "git@github.com:octocat/codething-mvp.git",
            }),
          ),
        ),
      );

      const gh = yield* GitHubCli.GitHubCli;
      const result = yield* gh.getRepositoryCloneUrls({
        cwd: "/repo",
        repository: "octocat/codething-mvp",
      });

      assert.deepStrictEqual(result, {
        nameWithOwner: "octocat/codething-mvp",
        url: "https://github.com/octocat/codething-mvp",
        sshUrl: "git@github.com:octocat/codething-mvp.git",
      });
    }).pipe(Effect.provide(layer)),
  );

  it.effect("creates repositories and parses clone URLs from create output", () =>
    Effect.gen(function* () {
      mockRun.mockReturnValueOnce(
        Effect.succeed(
          processOutput(
            "✓ Created repository octocat/codething-mvp on github.com\nhttps://github.com/octocat/codething-mvp\n",
          ),
        ),
      );

      const gh = yield* GitHubCli.GitHubCli;
      const result = yield* gh.createRepository({
        cwd: "/repo",
        repository: "octocat/codething-mvp",
        visibility: "private",
      });

      assert.deepStrictEqual(result, {
        nameWithOwner: "octocat/codething-mvp",
        url: "https://github.com/octocat/codething-mvp",
        sshUrl: "git@github.com:octocat/codething-mvp.git",
      });
      expect(mockRun).toHaveBeenCalledTimes(1);
      expect(mockRun).toHaveBeenNthCalledWith(1, {
        operation: "GitHubCli.execute",
        command: "gh",
        args: ["repo", "create", "octocat/codething-mvp", "--private"],
        cwd: "/repo",
        timeoutMs: 30_000,
      });
    }).pipe(Effect.provide(layer)),
  );

  it.effect("falls back to constructed URLs when create output omits a URL", () =>
    Effect.gen(function* () {
      mockRun.mockReturnValueOnce(Effect.succeed(processOutput("")));

      const gh = yield* GitHubCli.GitHubCli;
      const result = yield* gh.createRepository({
        cwd: "/repo",
        repository: "octocat/codething-mvp",
        visibility: "private",
      });

      assert.deepStrictEqual(result, {
        nameWithOwner: "octocat/codething-mvp",
        url: "https://github.com/octocat/codething-mvp",
        sshUrl: "git@github.com:octocat/codething-mvp.git",
      });
    }).pipe(Effect.provide(layer)),
  );

  it.effect("surfaces a friendly error when the pull request is not found", () =>
    Effect.gen(function* () {
      const cause = new VcsProcessExitError({
        operation: "GitHubCli.execute",
        command: "gh pr view",
        cwd: "/repo",
        exitCode: 1,
        failureKind: "not-found",
        detail:
          "GraphQL: Could not resolve to a PullRequest with the number of 4888. (repository.pullRequest)",
      });
      mockRun.mockReturnValueOnce(Effect.fail(cause));

      const gh = yield* GitHubCli.GitHubCli;
      const error = yield* gh
        .getPullRequest({
          cwd: "/repo",
          reference: "4888",
        })
        .pipe(Effect.flip);

      assert.equal(error.message.includes("Pull request not found"), true);
      assert.strictEqual(error._tag, "GitHubPullRequestNotFoundError");
      assert.strictEqual(error.command, "gh");
      assert.strictEqual(error.cwd, "/repo");
      assert.strictEqual(error.cause, cause);
      assert.equal(error.message.includes(cause.detail), false);
    }).pipe(Effect.provide(layer)),
  );

  it.effect("surfaces an actionable rate-limit error without exposing provider stderr", () =>
    Effect.gen(function* () {
      const cause = new VcsProcessExitError({
        operation: "GitHubCli.execute",
        command: "gh",
        cwd: "/repo",
        exitCode: 1,
        failureKind: "rate-limited",
        detail: "API rate limit exceeded.",
        stderrLength: 82,
        stderrTruncated: false,
      });
      mockRun.mockReturnValueOnce(Effect.fail(cause));

      const gh = yield* GitHubCli.GitHubCli;
      const error = yield* gh
        .listOpenPullRequests({
          cwd: "/repo",
          headSelector: "feature/rate-limited",
        })
        .pipe(Effect.flip);

      assert.strictEqual(error._tag, "GitHubCliRateLimitError");
      assert.include(error.detail, "GitHub API rate limit exceeded");
      assert.include(error.detail, "gh api rate_limit");
      assert.strictEqual(error.cause, cause);
      assert.notInclude(error.message, "user ID");
    }).pipe(Effect.provide(layer)),
  );

  it.effect("forwards execute env to VcsProcess.run", () =>
    Effect.gen(function* () {
      mockRun.mockReturnValueOnce(Effect.succeed(processOutput("gh version 2.83.0\n")));

      const gh = yield* GitHubCli.GitHubCli;
      yield* gh.execute({
        cwd: "/repo",
        args: ["--version"],
        env: { GH_CONFIG_DIR: "/tmp/gh-config-a" },
      });

      expect(mockRun).toHaveBeenCalledWith(
        executeRunInput({
          args: ["--version"],
          env: { GH_CONFIG_DIR: "/tmp/gh-config-a" },
        }),
      );
    }).pipe(Effect.provide(layer)),
  );

  it.effect("keeps undefined GH_CONFIG_DIR on execute env for extendEnv overwrite", () =>
    Effect.gen(function* () {
      mockRun.mockReturnValueOnce(Effect.succeed(processOutput("gh version 2.83.0\n")));

      const gh = yield* GitHubCli.GitHubCli;
      yield* gh.execute({
        cwd: "/repo",
        args: ["--version"],
        env: { GH_CONFIG_DIR: undefined },
      });

      expect(mockRun).toHaveBeenCalledWith(
        executeRunInput({
          args: ["--version"],
          env: { GH_CONFIG_DIR: undefined },
        }),
      );
      const env = mockRun.mock.calls[0]?.[0]?.env;
      expect(env).toHaveProperty("GH_CONFIG_DIR", undefined);
      expect(env !== undefined && "GH_CONFIG_DIR" in env).toBe(true);
    }).pipe(Effect.provide(layer)),
  );

  it.effect("forwards wrapper env to execute", () =>
    Effect.gen(function* () {
      mockRun.mockReturnValueOnce(
        Effect.succeed(processOutput("https://github.com/octocat/codething-mvp\n")),
      );

      const gh = yield* GitHubCli.GitHubCli;
      yield* gh.createRepository({
        cwd: "/repo",
        repository: "octocat/codething-mvp",
        visibility: "private",
        env: { GH_CONFIG_DIR: "/tmp/gh-config-wrapper" },
      });

      expect(mockRun).toHaveBeenCalledWith({
        operation: "GitHubCli.execute",
        command: "gh",
        args: ["repo", "create", "octocat/codething-mvp", "--private"],
        cwd: "/repo",
        timeoutMs: 30_000,
        env: { GH_CONFIG_DIR: "/tmp/gh-config-wrapper" },
      });
    }).pipe(Effect.provide(layer)),
  );

  it.effect("forwards distinct GH_CONFIG_DIR values on execute and discovery probe", () =>
    Effect.gen(function* () {
      const dirA = "/tmp/gh-config-a";
      const dirB = "/tmp/gh-config-b";

      mockRun.mockImplementation((input) => {
        if (input.args[0] === "--version") {
          return Effect.succeed(processOutput("gh version 2.83.0\n"));
        }
        const configDir = input.env?.GH_CONFIG_DIR;
        const login =
          configDir === dirA
            ? "alice-from-dir-a"
            : configDir === dirB
              ? "bob-from-dir-b"
              : "shared-account";
        return Effect.succeed(processOutput(authHostsJson(login)));
      });

      const gh = yield* GitHubCli.GitHubCli;
      const authArgs = ["auth", "status", "--json", "hosts"] as const;
      const executedA = yield* gh.execute({
        cwd: "/repo",
        args: authArgs,
        env: { GH_CONFIG_DIR: dirA },
      });
      const executedB = yield* gh.execute({
        cwd: "/repo",
        args: authArgs,
        env: { GH_CONFIG_DIR: dirB },
      });

      expect(mockRun).toHaveBeenNthCalledWith(
        1,
        executeRunInput({ args: authArgs, env: { GH_CONFIG_DIR: dirA } }),
      );
      expect(mockRun).toHaveBeenNthCalledWith(
        2,
        executeRunInput({ args: authArgs, env: { GH_CONFIG_DIR: dirB } }),
      );
      assert.deepStrictEqual(
        parseGitHubAuthStatus(executedA.stdout).accounts.map((account) => account.account),
        ["alice-from-dir-a"],
      );
      assert.deepStrictEqual(
        parseGitHubAuthStatus(executedB.stdout).accounts.map((account) => account.account),
        ["bob-from-dir-b"],
      );

      const process = { run: mockRun };
      const probedA = yield* probeSourceControlProvider({
        spec: GitHubSourceControlProvider.discovery,
        process,
        cwd: "/repo",
        env: { GH_CONFIG_DIR: dirA },
      });
      const probedB = yield* probeSourceControlProvider({
        spec: GitHubSourceControlProvider.discovery,
        process,
        cwd: "/repo",
        env: { GH_CONFIG_DIR: dirB },
      });

      expect(mockRun).toHaveBeenNthCalledWith(3, {
        operation: "source-control.discovery.probe",
        command: "gh",
        args: ["--version"],
        cwd: "/repo",
        timeoutMs: 5_000,
        maxOutputBytes: 8_000,
        appendTruncationMarker: true,
        env: { GH_CONFIG_DIR: dirA },
      });
      expect(mockRun).toHaveBeenNthCalledWith(4, {
        operation: "source-control.discovery.auth",
        command: "gh",
        args: authArgs,
        cwd: "/repo",
        allowNonZeroExit: true,
        timeoutMs: 5_000,
        maxOutputBytes: 8_000,
        appendTruncationMarker: true,
        env: { GH_CONFIG_DIR: dirA },
      });
      expect(mockRun).toHaveBeenNthCalledWith(5, {
        operation: "source-control.discovery.probe",
        command: "gh",
        args: ["--version"],
        cwd: "/repo",
        timeoutMs: 5_000,
        maxOutputBytes: 8_000,
        appendTruncationMarker: true,
        env: { GH_CONFIG_DIR: dirB },
      });
      expect(mockRun).toHaveBeenNthCalledWith(6, {
        operation: "source-control.discovery.auth",
        command: "gh",
        args: authArgs,
        cwd: "/repo",
        allowNonZeroExit: true,
        timeoutMs: 5_000,
        maxOutputBytes: 8_000,
        appendTruncationMarker: true,
        env: { GH_CONFIG_DIR: dirB },
      });

      assert.strictEqual(probedA.auth.status, "authenticated");
      assert.strictEqual(probedB.auth.status, "authenticated");
      assert.deepStrictEqual(probedA.auth.account, Option.some("alice-from-dir-a"));
      assert.deepStrictEqual(probedB.auth.account, Option.some("bob-from-dir-b"));
    }).pipe(Effect.provide(layer)),
  );

  it.effect("merges GitHubCliProcessEnv when execute omits env", () =>
    Effect.gen(function* () {
      mockRun.mockReturnValueOnce(Effect.succeed(processOutput("gh version 2.83.0\n")));

      const gh = yield* GitHubCli.GitHubCli;
      yield* gh.execute({
        cwd: "/repo",
        args: ["--version"],
      });

      expect(mockRun).toHaveBeenCalledWith(
        executeRunInput({
          args: ["--version"],
          env: { GH_CONFIG_DIR: "/tmp/gh-config-context" },
        }),
      );
    }).pipe(
      Effect.provide(layer),
      Effect.provideService(GitHubCli.GitHubCliProcessEnv, {
        GH_CONFIG_DIR: "/tmp/gh-config-context",
      }),
    ),
  );

  it.effect("lets execute env win over GitHubCliProcessEnv", () =>
    Effect.gen(function* () {
      mockRun.mockReturnValueOnce(Effect.succeed(processOutput("gh version 2.83.0\n")));

      const gh = yield* GitHubCli.GitHubCli;
      yield* gh.execute({
        cwd: "/repo",
        args: ["--version"],
        env: { GH_CONFIG_DIR: "/tmp/gh-config-execute" },
      });

      expect(mockRun).toHaveBeenCalledWith(
        executeRunInput({
          args: ["--version"],
          env: { GH_CONFIG_DIR: "/tmp/gh-config-execute" },
        }),
      );
    }).pipe(
      Effect.provide(layer),
      Effect.provideService(GitHubCli.GitHubCliProcessEnv, {
        GH_CONFIG_DIR: "/tmp/gh-config-context",
      }),
    ),
  );

  it.effect("lets execute undefined GH_CONFIG_DIR overwrite GitHubCliProcessEnv", () =>
    Effect.gen(function* () {
      mockRun.mockReturnValueOnce(Effect.succeed(processOutput("gh version 2.83.0\n")));

      const gh = yield* GitHubCli.GitHubCli;
      yield* gh.execute({
        cwd: "/repo",
        args: ["--version"],
        env: { GH_CONFIG_DIR: undefined },
      });

      expect(mockRun).toHaveBeenCalledWith(
        executeRunInput({
          args: ["--version"],
          env: { GH_CONFIG_DIR: undefined },
        }),
      );
      const env = mockRun.mock.calls[0]?.[0]?.env;
      expect(env).toHaveProperty("GH_CONFIG_DIR", undefined);
      expect(env !== undefined && "GH_CONFIG_DIR" in env).toBe(true);
    }).pipe(
      Effect.provide(layer),
      Effect.provideService(GitHubCli.GitHubCliProcessEnv, {
        GH_CONFIG_DIR: "/tmp/gh-config-context",
      }),
    ),
  );

  it.effect("execute and probe see GH_CONFIG_DIR from envFor", () =>
    Effect.gen(function* () {
      const path = yield* Path.Path;
      const configDir = path.resolve("/tmp/alias-gh-config");
      const aliasEnv = yield* envFor(
        Schema.decodeUnknownSync(IdentityAlias)({
          id: "work",
          displayName: "Work",
          ghConfigDir: "/tmp/alias-gh-config",
        }),
      );
      expect(aliasEnv.GH_CONFIG_DIR).toBe(configDir);

      mockRun.mockImplementation((input) => {
        if (input.args[0] === "--version") {
          return Effect.succeed(processOutput("gh version 2.83.0\n"));
        }
        return Effect.succeed(processOutput(authHostsJson("alias-user")));
      });

      const gh = yield* GitHubCli.GitHubCli;
      yield* gh
        .execute({
          cwd: "/repo",
          args: ["--version"],
        })
        .pipe(Effect.provideService(GitHubCli.GitHubCliProcessEnv, aliasEnv));

      expect(mockRun).toHaveBeenCalledWith(
        executeRunInput({
          args: ["--version"],
          env: { GH_CONFIG_DIR: configDir },
        }),
      );

      const probed = yield* probeSourceControlProvider({
        spec: GitHubSourceControlProvider.discovery,
        process: { run: mockRun },
        cwd: "/repo",
        env: aliasEnv,
      });
      expect(probed.auth.status).toBe("authenticated");
      expect(probed.auth.account).toEqual(Option.some("alias-user"));
      const probeAuthCall = mockRun.mock.calls.find((call) => call[0]?.args[0] === "auth");
      expect(probeAuthCall?.[0]?.env?.GH_CONFIG_DIR).toBe(configDir);
    }).pipe(Effect.provide(layer), Effect.provide(NodeServices.layer)),
  );

  it.effect("execute sees alias GH_CONFIG_DIR without startSession", () =>
    Effect.gen(function* () {
      mockRun.mockImplementation(() => Effect.succeed(processOutput("gh version 2.83.0\n")));
      const gh = yield* GitHubCli.GitHubCli;
      yield* provideIdentityAliasProcessEnv({
        GH_CONFIG_DIR: "/tmp/alias-gh-no-session",
      })(
        gh.execute({
          cwd: "/repo",
          args: ["--version"],
        }),
      );

      expect(mockRun).toHaveBeenCalledWith(
        executeRunInput({
          args: ["--version"],
          env: { GH_CONFIG_DIR: "/tmp/alias-gh-no-session" },
        }),
      );
    }).pipe(Effect.provide(layer)),
  );
});
