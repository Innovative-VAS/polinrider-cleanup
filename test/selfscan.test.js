/**
 * The guardrail that makes automatic removal safe to ship.
 *
 * The detector auto-strips code, so a false positive on ordinary source is the
 * worst failure mode available to it. This repo is the nearest realistic
 * corpus: a scanner full of privileged calls, subprocess handling, regex
 * literals holding malware patterns, and doc comments quoting payload code.
 * If a rule is ever broadened too far, it lands here first.
 *
 * It also converts the exclude list in .github/workflows/ci.yml from a comment
 * into a checked fact.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { scanRepo } from "../src/scanner.js";

const REPO = path.resolve(import.meta.dirname, "..");

// MUST stay identical to the `exclude:` block of the self-scan job in
// .github/workflows/ci.yml. Anything excluded is a blind spot, so the list is
// deliberately tiny: the signature catalog (the only home for literal IOC
// tokens), the test fixtures, and the bundle that inlines both.
const CI_EXCLUDE = ["src/signatures.js", "test/**", "dist/**"];

test("this repo scans itself clean with the CI exclude list", async () => {
  const findings = await scanRepo(REPO, { exclude: CI_EXCLUDE });
  assert.deepEqual(
    findings.findings.filter((f) => f.category === "js"),
    [],
    "a false positive on our own source would land here first",
  );
  assert.equal(findings.severity, "clean");
});

test("the CI workflow's exclude list still matches the one asserted here", () => {
  const workflow = fs.readFileSync(path.join(REPO, ".github/workflows/ci.yml"), "utf8");
  for (const pattern of CI_EXCLUDE) {
    assert.ok(
      workflow.includes(pattern),
      `ci.yml must still exclude ${pattern}; update both together or the guardrail drifts`,
    );
  }
});

test("every source file the detector reads can be tokenized", async () => {
  // A file the tokenizer cannot read is a file the detector cannot protect.
  const { lexJs } = await import("../src/jslex.js");
  const dirs = ["src", "bin", "scripts"];
  for (const dir of dirs) {
    for (const name of fs.readdirSync(path.join(REPO, dir))) {
      if (!/\.(m?js|cjs|ts)$/.test(name)) continue;
      const rel = path.join(dir, name);
      const text = fs.readFileSync(path.join(REPO, rel), "utf8");
      const lex = lexJs(text, { ext: path.extname(name) });
      assert.equal(lex.ok, true, `${rel} must tokenize (failed: ${lex.reason})`);
    }
  }
});
