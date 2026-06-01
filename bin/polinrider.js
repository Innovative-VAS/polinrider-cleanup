#!/usr/bin/env node
/**
 * Hardened launcher.
 *
 * A `#!/usr/bin/env node` shebang cannot self-apply V8 flags after the process
 * has already started, so this launcher re-spawns Node WITH the hardening flags
 * and then runs the orchestrator. The flags are also propagated via NODE_OPTIONS
 * so they would inherit to any further child (there are none — the subprocess
 * allowlist forbids spawning node — but it keeps the guarantee).
 *
 *   --disallow-code-generation-from-strings  → eval() / new Function() throw
 *   --frozen-intrinsics  (opt-in: POLINRIDER_FROZEN=1) → freeze built-in protos
 */

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const CODEGEN_FLAG = "--disallow-code-generation-from-strings";
const FLAGS = [CODEGEN_FLAG];
if (process.env.POLINRIDER_FROZEN === "1") FLAGS.push("--frozen-intrinsics");

const here = path.dirname(fileURLToPath(import.meta.url));
const entry = path.resolve(here, "../src/index.js");

const flagsActive =
  process.execArgv.includes(CODEGEN_FLAG) ||
  (process.env.NODE_OPTIONS || "").includes(CODEGEN_FLAG);

if (flagsActive) {
  // Flags are already in effect for this process — run the orchestrator here.
  const mod = await import(entry);
  await mod.main().catch((err) => {
    console.error("Fatal error:", err.message);
    process.exit(2);
  });
} else {
  // Re-spawn Node with the flags applied at process start, running src/index.js
  // directly (it auto-runs main() when invoked as the entry point).
  const nodeOptions = [process.env.NODE_OPTIONS, CODEGEN_FLAG].filter(Boolean).join(" ");
  const child = spawnSync(process.execPath, [...FLAGS, entry, ...process.argv.slice(2)], {
    stdio: "inherit",
    env: { ...process.env, NODE_OPTIONS: nodeOptions, POLINRIDER_HARDENED: "1" },
  });
  if (child.error) {
    console.error("Failed to launch hardened process:", child.error.message);
    process.exit(2);
  }
  process.exit(child.status ?? 1);
}
