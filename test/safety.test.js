import { test } from "node:test";
import assert from "node:assert/strict";
import { execa } from "execa";
import { fileURLToPath } from "node:url";

const probe = fileURLToPath(new URL("./_safety-probe.mjs", import.meta.url));
const entry = fileURLToPath(new URL("../src/index.js", import.meta.url));

test("Layer 3 in-code guards block eval / Function / vm / process.binding", async () => {
  const r = await execa(process.execPath, [probe], { reject: false });
  assert.equal(r.exitCode, 0, r.stderr || r.stdout);
  assert.match(r.stdout, /safety-probe OK/);
});

test("Layer 2 V8 flag also blocks codegen (defense in depth)", async () => {
  const r = await execa(process.execPath, ["--disallow-code-generation-from-strings", probe], {
    reject: false,
  });
  assert.equal(r.exitCode, 0, r.stderr || r.stdout);
});

test("orchestrator imports cleanly under the hardening flag (dependency canary)", async () => {
  // Import index.js (without running main) under the flag. If execa/chalk/ora or
  // any transitive dep needs eval/new Function at import time, this exits non-zero.
  const code = `await import(${JSON.stringify(entry)}); console.log("import OK");`;
  const r = await execa(
    process.execPath,
    ["--disallow-code-generation-from-strings", "--input-type=module", "-e", code],
    { reject: false },
  );
  assert.equal(r.exitCode, 0, r.stderr || r.stdout);
  assert.match(r.stdout, /import OK/);
});
