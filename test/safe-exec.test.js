import { test } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import { assertAllowed, CommandNotAllowedError, safeExec, buildGitArgs } from "../src/safe-exec.js";

test("rejects non-allowlisted commands (no node/bash/sh/npm/etc.)", () => {
  for (const cmd of ["node", "nodejs", "bash", "sh", "zsh", "npm", "npx", "yarn", "pnpm", "deno", "bun", "python", "env"]) {
    assert.throws(() => assertAllowed(cmd, ["-e", "payload"]), CommandNotAllowedError, cmd);
  }
});

test("rejects path-bearing commands", () => {
  assert.throws(() => assertAllowed("/usr/bin/git", ["status"]), CommandNotAllowedError);
  assert.throws(() => assertAllowed("./git", ["status"]), CommandNotAllowedError);
  assert.throws(() => assertAllowed("git\\..\\node", ["x"]), CommandNotAllowedError);
});

test("rejects disallowed subcommands for git and gh", () => {
  assert.throws(() => assertAllowed("git", ["daemon"]), CommandNotAllowedError);
  assert.throws(() => assertAllowed("git", ["-C", "/x", "for-each-ref"]), CommandNotAllowedError);
  assert.throws(() => assertAllowed("gh", ["auth", "token"]), CommandNotAllowedError);
  assert.throws(() => assertAllowed("gh", []), CommandNotAllowedError);
});

test("allows expected subcommands, skipping leading -C/-c value options", () => {
  assert.deepEqual(assertAllowed("git", ["-C", "/x", "commit", "-m", "y"]), { cmd: "git", sub: "commit" });
  assert.deepEqual(assertAllowed("git", ["-c", "core.hooksPath=/dev/null", "clone", "url", "d"]), {
    cmd: "git",
    sub: "clone",
  });
  assert.deepEqual(assertAllowed("gh", ["api", "orgs/x/repos"]), { cmd: "gh", sub: "api" });
  assert.deepEqual(assertAllowed("gh", ["pr", "create"]), { cmd: "gh", sub: "pr" });
});

test("safeExec throws synchronously (not a rejected promise) on a violation", () => {
  assert.throws(() => safeExec("node", ["-e", "1"]), CommandNotAllowedError);
});

test("buildGitArgs disables hooks and adds --no-verify to commit/push only", () => {
  const commit = buildGitArgs(["-C", "/x", "commit", "-m", "msg"]);
  assert.equal(commit[0], "-c");
  assert.ok(commit[1] === `core.hooksPath=${os.devNull}`);
  assert.ok(commit.includes("--no-verify"));

  const push = buildGitArgs(["-C", "/x", "push", "url", "branch"]);
  assert.ok(push.includes("--no-verify"));

  const clone = buildGitArgs(["clone", "--depth=1", "url", "d"]);
  assert.ok(!clone.includes("--no-verify"), "clone must not get --no-verify");
  assert.equal(clone[0], "-c");
  assert.ok(clone[1].startsWith("core.hooksPath="));
});
