/**
 * Capability, form and position-gate tests.
 *
 * The most important tests here are the calibration cases: this repo's own
 * source must score zero. A detector that flags its own scanner is worse than
 * no detector, and these assertions are what stop a broadened rule from
 * shipping.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import * as L from "../src/jslex.js";
import * as C from "../src/capability.js";
import * as sig from "../src/signatures.js";
import {
  LEGIT_CONFIG, ORIGINAL_PAYLOAD, ROTATED_PAYLOAD, GENERIC_PAYLOAD, infectedConfig,
  SHIM_PREFIX, DOT_NOTATION_PAYLOAD, infectedDotNotation, LEGIT_SHIM_CONFIG,
  ORPHAN_SHIM_CONFIG, LOW_SIGNAL_TAIL, FS_ONLY_TAIL, HARMLESS_TAIL, MAIN_GUARD_TAIL,
  HANDWRITTEN_DEV_TAIL, COMMENTED_EXPORT_DECOY, decoyTrailingComment,
  MINIFIED_VENDOR_UMD, MINIFIED_VENDOR_ESM,
} from "./helpers.js";

const REPO = path.resolve(import.meta.dirname, "..");

/** Run the whole pure pipeline the scanner will run, without touching disk. */
function assess(text, relPath = "postcss.config.mjs") {
  const lex = L.lexJs(text, { ext: path.extname(relPath) });
  const partition = C.partitionTopLevel(text, lex);
  const stmts = lex.ok && partition.ok ? partition.payload.map((p) => p.st) : [];
  const region = stmts.length ? L.regionOfStatements(lex, stmts) : L.regionOf(lex.ok ? lex : { text, code: text, literals: text, comments: "", skips: [], specifiers: [] }, 0, 0);
  const capability = C.scoreCapabilities(region);
  const form = C.scoreForm(region, text, { statements: stmts });
  const knownVariantId =
    sig.JS_VARIANTS.find((v) => text.includes(v.signature) && v.seeds.some((s) => text.includes(s)))?.id ?? null;
  const verdict = C.verdictForFile({
    relPath, fileText: text, lex, partition, capability, form, knownVariantId,
  });
  return { lex, partition, capability, form, verdict };
}

// ─── calibration: our own source must score nothing ────────────────────────────

test("this repo's own source files produce no verdict", () => {
  const files = [
    "src/ci.js", "src/index.js", "src/scanner.js", "src/remediator.js",
    "src/safe-exec.js", "src/safety.js", "src/fonts.js", "src/sarif.js",
    "src/report.js", "src/walk.js", "src/exclude.js", "src/jsonc.js",
    "src/jslex.js", "src/capability.js", "src/signatures.js",
    "bin/polinrider.js", "scripts/build-action.mjs",
  ];
  for (const rel of files) {
    const text = fs.readFileSync(path.join(REPO, rel), "utf8");
    const { lex, verdict } = assess(text, rel);
    assert.equal(lex.ok, true, `${rel} must tokenize (reason: ${lex.reason})`);
    assert.equal(verdict.verdict, "none", `${rel} must produce no verdict, got: ${verdict.reason}`);
  }
});

test("the run-if-invoked-directly trailer scores exactly zero", () => {
  // This is the shape of src/ci.js and src/index.js: a statement positioned
  // AFTER the last export by construction. It is the single most important
  // false-positive case in the repo.
  const text =
    LEGIT_CONFIG +
    "\nconst invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);\n" +
    "if (invokedDirectly) { run().then((code) => process.exit(code)).catch(() => process.exit(1)); }\n";
  const { capability, form, verdict } = assess(text);
  assert.equal(capability.score, 0, "no capability in an ordinary main-guard");
  assert.equal(form.score, 0, "hand-written code registers no form anomaly");
  assert.equal(verdict.verdict, "none");
});

test("the logic modules use no literal indicator tokens in their code", () => {
  // The CI self-scan excludes only signatures.js, so a token used for matching
  // in a logic module would make the tool flag its own source. Prose is fine —
  // comments never score — so the check runs on the CODE VIEW, which also
  // dogfoods the tokenizer against its own source.
  for (const rel of ["src/capability.js", "src/jslex.js"]) {
    const src = fs.readFileSync(path.join(REPO, rel), "utf8");
    const view = L.views(src, { ext: ".js" });
    assert.equal(view.ok, true, `${rel} must tokenize`);
    for (const mod of sig.RISKY_MODULES.keys()) {
      assert.ok(
        !view.code.includes(mod),
        `${rel} must not use the token "${mod}" in code (only signatures.js may)`,
      );
    }
  }
});

// ─── capability scoring ────────────────────────────────────────────────────────

test("the rotated variant scores high with no eval and no string array", () => {
  // The regression at the heart of this work: the payload that slipped through.
  const { capability } = assess(infectedDotNotation());
  assert.ok(
    !DOT_NOTATION_PAYLOAD.includes("eval("),
    "fixture must not rely on eval, or it proves nothing",
  );
  assert.ok(
    capability.score >= sig.VERDICT_THRESHOLDS.anywhereCapability,
    `expected >= ${sig.VERDICT_THRESHOLDS.anywhereCapability}, got ${capability.score}`,
  );
  assert.ok(capability.distinct >= 2, "evidence must span several capability groups");
});

test("a global write is detected in dot and bracket notation alike", () => {
  const marker = (src) =>
    assess(LEGIT_CONFIG + "\n" + src).capability.hits.some((h) => h.id.startsWith("marker.global"));
  assert.equal(marker(`global.i = 'abc';`), true, "dot notation - the rotated form");
  assert.equal(marker(`global['!'] = 'abc';`), true, "bracket notation - the original form");
  assert.equal(marker(`global.r = require;`), true, "stashing require on the global");
  assert.equal(marker(`if (global.x === 1) { void 0; }`), false, "a comparison is not a write");
});

test("module specifiers are matched exactly, not as substrings", () => {
  const ids = (src) => assess(LEGIT_CONFIG + "\n" + src).capability.hits.map((h) => h.id);
  assert.ok(ids(`const h = require("node:http");`).includes("mod.http"), "node: prefix stripped");
  assert.ok(ids(`const h = require("http");`).includes("mod.http"), "bare specifier");
  assert.ok(
    !ids(`const u = "https://example.invalid/http";`).includes("mod.http"),
    "a URL containing 'http' is not the http module",
  );
});

test("a token appearing only in a comment scores nothing", () => {
  const text =
    LEGIT_CONFIG +
    "\n// this mentions child_process, eval( and global['!'] = 1 in prose only\n" +
    "/* and require(\"node:http\") in a block comment */\n" +
    "const harmless = 1;\n";
  const { capability } = assess(text);
  assert.equal(capability.score, 0, "prose must never score");
});

test("requiring http, https and net counts once, not three times", () => {
  const one = assess(LEGIT_CONFIG + '\nconst a = require("node:http");').capability;
  const three = assess(
    LEGIT_CONFIG +
      '\nconst a = require("node:http"), b = require("node:https"), c = require("node:net");',
  ).capability;
  assert.equal(three.score, one.score, "group capping: one idea scores once");
  assert.equal(three.distinct, one.distinct, "and contributes one distinct group");
});

test("weak rules add to the score but not to the diversity count", () => {
  const { capability } = assess(LOW_SIGNAL_TAIL);
  assert.equal(capability.score, 1, "an env read beside a URL is worth one point");
  assert.equal(capability.distinct, 0, "but must not satisfy the diversity floor");
});

test("a campaign id must match a whole literal, not a substring", () => {
  const has = (src) =>
    assess(LEGIT_CONFIG + "\n" + src).capability.hits.some((h) => h.id === "marker.campaign-id");
  assert.equal(has(`global.i = '8-270-2';`), true, "a bare campaign id");
  assert.equal(has(`const d = "shipped on 12-2024-1 by the team";`), false, "a date inside prose");
});

// ─── form scoring ──────────────────────────────────────────────────────────────

test("form and capability are independent axes", () => {
  // A minified vendor bundle is all form and no capability. It must never be
  // flagged, and the reason must be the POSITION gate, not a low score.
  const { partition, form, verdict } = assess(MINIFIED_VENDOR_UMD, "vendor.js");
  assert.equal(verdict.verdict, "none");
  assert.equal(partition.payload.length, 0, "no top-level export means no candidate region");
  assert.equal(form.score, 0, "an empty candidate region has no form");

  // Scored directly, the same bytes do register as machine-generated.
  const lex = L.lexJs(MINIFIED_VENDOR_UMD);
  const whole = L.regionOf(lex, 0, MINIFIED_VENDOR_UMD.length);
  const direct = C.scoreForm(whole, MINIFIED_VENDOR_UMD, { statements: lex.statements });
  assert.ok(direct.score >= 3, `minified code should look machine-generated, got ${direct.score}`);
  assert.equal(C.scoreCapabilities(whole).score, 0, "but it does nothing privileged");
});

test("a minified bundle whose exports come last has no candidate tail", () => {
  const { partition, verdict } = assess(MINIFIED_VENDOR_ESM, "vendor.js");
  assert.equal(partition.payload.length, 0);
  assert.equal(verdict.verdict, "none");
});

// ─── the position gate ────────────────────────────────────────────────────────

test("the export boundary is the end of the last export statement", () => {
  const text = "export function f() {\n  const a = 1;\n  return a;\n}\n";
  const { partition } = assess(text, "src/util.js");
  assert.equal(partition.anchor.end, text.trimEnd().length, "the whole body is inside the export");
  assert.equal(partition.payload.length, 0, "so there is no candidate tail");
});

test("export default in a comment or string cannot move the boundary", () => {
  const { verdict } = assess(COMMENTED_EXPORT_DECOY);
  assert.equal(verdict.verdict, "none");
});

test("a trailing comment claiming to be an export cannot hide a payload", () => {
  // The evasion direction: the old raw-text boundary search took the LAST
  // textual match, so a comment after the payload moved the boundary past it.
  const { verdict } = assess(decoyTrailingComment(DOT_NOTATION_PAYLOAD));
  assert.equal(verdict.verdict, "confirmed", "a comment is not a statement");
});

test("capability evidence alone, inside the module, is never a finding", () => {
  const text =
    'import { execSync } from "node:child_process";\n' +
    'export default { sha: execSync("git rev-parse HEAD").toString() };\n';
  const { partition, verdict } = assess(text, "next.config.js");
  assert.equal(partition.payload.length, 0, "nothing sits outside the module region");
  assert.equal(verdict.verdict, "none", "a config may legitimately shell out inside its export");
});

test("a post-export helper referenced by the export is demoted, not cut", () => {
  const text =
    "export default { alias: resolveAlias() };\n" +
    'function resolveAlias() { return require("node:child_process"); }\n';
  const { partition, verdict } = assess(text, "vite.config.js");
  assert.ok(partition.flags.demoted.length >= 1, "the linkage rule must fire");
  assert.equal(partition.payload.length, 0, "the helper stays in the module");
  assert.equal(verdict.verdict, "none");
});

test("padding behind a comment banner is not treated as injection padding", () => {
  const text =
    LEGIT_CONFIG +
    "\n\n\n\n// ── extra setup ───────────────────────\n\n\n\n" +
    "const harmless = 1;\nexport { harmless };\n";
  const { verdict } = assess(text);
  assert.equal(verdict.verdict, "none");
});

// ─── the verdict ladder and its floors ────────────────────────────────────────

test("the real-world payload shape is confirmed for automatic removal", () => {
  const { verdict } = assess(infectedDotNotation());
  assert.equal(verdict.verdict, "confirmed");
  assert.equal(verdict.contentConfirmed, true);
  assert.equal(verdict.action, "strip-js-payload");
  assert.deepEqual(verdict.blockers, []);
  assert.equal(verdict.ranges.filter((r) => r.role === "shim").length, 2, "both shim statements");
  assert.equal(verdict.ranges.filter((r) => r.role === "payload").length, 1, "one payload range");
});

test("a legitimate main-guard is reported but never cut", () => {
  const { verdict } = assess(MAIN_GUARD_TAIL);
  assert.equal(verdict.action, "manual-review");
  assert.ok(verdict.blockers.includes("single-capability-group"), "the diversity floor holds");
  assert.equal(verdict.contentConfirmed, false, "and it must not mark the repo infected");
});

test("a hand-written post-export dev block is reported but never cut", () => {
  // Privileged and positionally odd, but formatted: form 0. Only the form floor
  // stands between this and an automatic edit to legitimate code.
  const { capability, form, verdict } = assess(HANDWRITTEN_DEV_TAIL);
  assert.ok(capability.score >= sig.VERDICT_THRESHOLDS.configCapability, "it does clear the threshold");
  assert.equal(form.score, 0, "but it does not look machine-generated");
  assert.equal(verdict.action, "manual-review");
  assert.ok(verdict.blockers.includes("no-form-anomaly"));
});

test("a single weak hit lands in the review tier without confirming", () => {
  const { verdict } = assess(LOW_SIGNAL_TAIL);
  assert.equal(verdict.action, "manual-review");
  assert.equal(verdict.contentConfirmed, false);
});

test("harmless trailing code produces no finding at all", () => {
  assert.equal(assess(HARMLESS_TAIL).verdict.verdict, "none");
  assert.equal(assess(FS_ONLY_TAIL).verdict.verdict, "none");
});

test("a known signature is exempt from the certainty floors but not the safety ones", () => {
  // The legacy one-liners are too short to register any form anomaly. A matching
  // signature is positive identification rather than inference, so it still
  // strips — this is what keeps the original and rotated variants working.
  for (const [payload, file] of [
    [ORIGINAL_PAYLOAD, "postcss.config.mjs"],
    [ROTATED_PAYLOAD, "tailwind.config.js"],
  ]) {
    const { form, verdict } = assess(infectedConfig(payload), file);
    assert.equal(form.score, 0, "the legacy payloads are too small for a form signal");
    assert.equal(verdict.verdict, "confirmed", `${file} should still auto-strip`);
    assert.equal(verdict.contentConfirmed, true);
  }
});

test("an unknown obfuscated payload after the boundary is confirmed on its own merits", () => {
  // No signature, no seed - confirmed structurally. This is the behaviour the
  // old GENERIC_HEURISTIC could not reach.
  const { verdict } = assess(infectedConfig(GENERIC_PAYLOAD), "src/App.js");
  assert.equal(verdict.verdict, "confirmed");
  assert.equal(verdict.contentConfirmed, true);
});

test("a file with no export boundary is never auto-stripped", () => {
  const text = 'const a = 1;\n\n\n\nglobal.r = require;\nrequire("node:child_process").execSync("x");\n';
  const { partition, verdict } = assess(text, "script.js");
  assert.equal(partition.flags.noAnchor, true);
  assert.notEqual(verdict.verdict, "confirmed", "no position gate means no automatic cut");
});

test("a JSX file is reported but never auto-stripped", () => {
  const text = infectedDotNotation();
  const { verdict } = assess(text, "src/Thing.jsx");
  assert.notEqual(verdict.verdict, "confirmed");
  assert.ok(
    verdict.blockers.includes("jsx-unsafe-to-cut") || verdict.blockers.includes("region-unlexable"),
    `expected a JSX safety blocker, got ${JSON.stringify(verdict.blockers)}`,
  );
});

// ─── shims ─────────────────────────────────────────────────────────────────────

test("a shim is preserved when the surviving code really uses require", () => {
  const { partition, verdict } = assess(LEGIT_SHIM_CONFIG);
  assert.equal(partition.shims.length, 0, "the shim is load-bearing here");
  assert.equal(verdict.verdict, "none");
});

test("an orphan shim is auto-fixable but does not mark the repo infected", () => {
  const { partition, verdict } = assess(ORPHAN_SHIM_CONFIG);
  assert.equal(partition.shims.length, 2, "both injected statements");
  assert.equal(verdict.verdict, "shim-only");
  assert.equal(verdict.action, "strip-js-payload");
  assert.equal(verdict.autoFix, true);
  assert.equal(verdict.contentConfirmed, false, "residue alone is not an infection");
});

test("a require( inside a string cannot keep a dead shim alive", () => {
  const text = SHIM_PREFIX + '\nconst note = "call require() later";\n' + LEGIT_CONFIG;
  const { partition } = assess(text);
  assert.equal(partition.shims.length, 2, "a mention in a string is not a use");
});
