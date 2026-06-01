/**
 * Subprocess allowlist — the single choke point for every external process.
 *
 * The V8 flag (--disallow-code-generation-from-strings) cannot stop a spawned
 * `node -e "<payload>"` or `bash -c "<payload>"`; this wrapper can, and does, by
 * permitting ONLY `git` and `gh` with an allowlisted set of subcommands. Every
 * subprocess in the tool MUST go through here — never call execa/spawn directly.
 *
 * It also hardens git itself: hooks disabled, system/global config ignored,
 * non-interactive, and `--no-verify` on commit/push — so a repo can never get
 * code to run via a git hook during clone/commit/push.
 */

import { execa } from "execa";
import os from "node:os";

// command → set of allowed first subcommands.
const ALLOWED = new Map([
  [
    "git",
    new Set([
      "clone",
      "config",
      "checkout",
      "add",
      "diff",
      "commit",
      "push",
      "rm",
      "reflog",
      "rev-parse",
      "status",
      "ls-files",
    ]),
  ],
  ["gh", new Set(["api", "pr"])],
]);

// git global options that consume the FOLLOWING token as their value.
const GIT_VALUE_OPTS = new Set([
  "-C",
  "-c",
  "--git-dir",
  "--work-tree",
  "--namespace",
  "--exec-path",
]);

// Disable hooks on every git call. os.devNull is not a hooks directory, so git
// finds no hooks and runs none. Cross-platform (/dev/null | \\.\nul).
const HOOK_GUARD = ["-c", `core.hooksPath=${os.devNull}`];

export class CommandNotAllowedError extends Error {
  constructor(message) {
    super(message);
    this.name = "CommandNotAllowedError";
  }
}

/** Return the first non-option token (the subcommand), skipping value-options. */
function firstSubcommand(args, valueOpts) {
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (typeof a !== "string") continue;
    if (!a.startsWith("-")) return a;
    if (a.includes("=")) continue; // --opt=value is a single token
    if (valueOpts && valueOpts.has(a)) i++; // option consumes the next token
  }
  return undefined;
}

/**
 * Validate a command + args against the allowlist. Throws CommandNotAllowedError
 * synchronously on any violation. Exported so callers/tests can pre-validate.
 */
export function assertAllowed(cmd, args = []) {
  if (typeof cmd !== "string" || cmd.length === 0) {
    throw new CommandNotAllowedError("command must be a non-empty string");
  }
  if (cmd.includes("/") || cmd.includes("\\")) {
    throw new CommandNotAllowedError(
      `refusing path-bearing command "${cmd}" — only the bare names "git"/"gh" are allowed`,
    );
  }
  if (!ALLOWED.has(cmd)) {
    throw new CommandNotAllowedError(
      `command "${cmd}" is not on the allowlist (allowed: git, gh)`,
    );
  }
  const sub = firstSubcommand(args, cmd === "git" ? GIT_VALUE_OPTS : null);
  if (!sub || !ALLOWED.get(cmd).has(sub)) {
    throw new CommandNotAllowedError(
      `subcommand "${sub ?? "(none)"}" is not allowed for "${cmd}"`,
    );
  }
  return { cmd, sub };
}

/**
 * Run an allowlisted command. Not declared `async` so allowlist violations throw
 * synchronously (before any process is spawned); on success it returns execa's
 * promise. Defaults to reject:false so callers inspect `exitCode` themselves.
 */
export function safeExec(cmd, args = [], opts = {}) {
  assertAllowed(cmd, args);
  return execa(cmd, args, { reject: false, shell: false, ...opts });
}

function gitEnv(extra) {
  return {
    ...extra,
    GIT_CONFIG_NOSYSTEM: "1", // ignore /etc/gitconfig
    GIT_CONFIG_GLOBAL: os.devNull, // ignore ~/.gitconfig (no hijacked hooksPath)
    GIT_TERMINAL_PROMPT: "0", // never block on an interactive credential prompt
  };
}

/**
 * Build the final git argv: prepend hook-disabling config and append
 * `--no-verify` to commit/push. Pure — exported for testing.
 */
export function buildGitArgs(args = []) {
  const finalArgs = [...HOOK_GUARD, ...args];
  const sub = firstSubcommand(finalArgs, GIT_VALUE_OPTS);
  if ((sub === "commit" || sub === "push") && !finalArgs.includes("--no-verify")) {
    finalArgs.push("--no-verify");
  }
  return finalArgs;
}

/**
 * Run git with hooks disabled and config sanitized. The GH token is
 * intentionally NOT placed in git's environment — clone/push carry auth in the
 * tokenized URL instead.
 */
export function safeGit(args = [], opts = {}) {
  return safeExec("git", buildGitArgs(args), { ...opts, env: gitEnv(opts.env) });
}

/**
 * Run gh with the GitHub token scoped to THIS process only (not leaked to git or
 * any other child). Token defaults to GH_TOKEN but can be injected for testing.
 */
export function safeGh(args = [], opts = {}, token = process.env.GH_TOKEN) {
  const env = { ...opts.env };
  if (token) {
    env.GH_TOKEN = token;
    env.GITHUB_TOKEN = token;
  }
  return safeExec("gh", args, { ...opts, env });
}
