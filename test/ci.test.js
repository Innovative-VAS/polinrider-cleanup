/**
 * Tests for the GitHub Action frontend (src/ci.js). Exercises input parsing,
 * exit-code policy, reporting, and the SARIF builder against real fixtures.
 * The git/gh-dependent paths (fix+commit, pr mode) are validated by the
 * integration workflow, not here.
 */
import { test, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { run, resolveSettings, failThreshold, buildSummary } from "../src/ci.js";
import { buildSarif } from "../src/sarif.js";
import { scanRepo } from "../src/scanner.js";
import {
  makeRepo,
  mkTmpDir,
  cleanupAll,
  LEGIT_CONFIG,
  INFECTED_TASKS,
  ORIGINAL_PAYLOAD,
  GENERIC_PAYLOAD,
  infectedConfig,
} from "./helpers.js";

after(cleanupAll);

// Every env key run() / resolveSettings() may read — cleared between tests so
// values can't leak across cases.
const MANAGED = [
  "GITHUB_WORKSPACE", "GITHUB_OUTPUT", "GITHUB_STEP_SUMMARY", "GITHUB_EVENT_NAME",
  "GITHUB_EVENT_PATH", "GITHUB_REPOSITORY", "GITHUB_REF_NAME",
  "DRY_RUN", "AUTO_MERGE", "MERGE_METHOD", "BRANCH_PREFIX", "GH_TOKEN", "GITHUB_TOKEN", "SARIF_FILE",
];
function clearEnv() {
  for (const k of Object.keys(process.env)) if (k.startsWith("INPUT_")) delete process.env[k];
  for (const k of MANAGED) delete process.env[k];
}
beforeEach(clearEnv);
after(clearEnv);

/** Set INPUT_* env from a {name: value} map (GitHub Actions convention). */
function setInputs(inputs) {
  for (const [k, v] of Object.entries(inputs)) {
    process.env[`INPUT_${k.replace(/ /g, "_").toUpperCase()}`] = String(v);
  }
}

/** Run the action against a workspace dir; returns { code, outputs, summary }. */
async function runAction(workspace, inputs = {}, extraEnv = {}) {
  const io = mkTmpDir("ci-io-");
  const outFile = path.join(io, "out");
  const sumFile = path.join(io, "sum");
  fs.writeFileSync(outFile, "");
  fs.writeFileSync(sumFile, "");
  process.env.GITHUB_WORKSPACE = workspace;
  process.env.GITHUB_OUTPUT = outFile;
  process.env.GITHUB_STEP_SUMMARY = sumFile;
  Object.assign(process.env, extraEnv);
  setInputs(inputs);

  const code = await run();

  const outputs = Object.fromEntries(
    fs.readFileSync(outFile, "utf8").split("\n").filter(Boolean).map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
  );
  return { code, outputs, summary: fs.readFileSync(sumFile, "utf8") };
}

const INFECTED_FILES = {
  "App.js": infectedConfig(ORIGINAL_PAYLOAD),
  ".vscode/tasks.json": INFECTED_TASKS,
  "config.bat": "",
};

// ─── resolveSettings ───────────────────────────────────────────────────────────

test("resolveSettings: defaults", () => {
  const s = resolveSettings();
  assert.equal(s.mode, "check");
  assert.equal(s.scanPath, ".");
  assert.equal(s.failOn, "infected");
  assert.equal(s.commit, false);
  assert.equal(s.commentOnPr, true);
  assert.equal(s.mergeMethod, "squash");
  assert.equal(s.branchPrefix, "fix/polinrider-cleanup");
});

test("resolveSettings: INPUT_* parsing incl. hyphenated names", () => {
  setInputs({ mode: "FIX", "fail-on": "Suspicious", commit: "true", "comment-on-pr": "false", "merge-method": "REBASE" });
  const s = resolveSettings();
  assert.equal(s.mode, "fix");
  assert.equal(s.failOn, "suspicious");
  assert.equal(s.commit, true);
  assert.equal(s.commentOnPr, false);
  assert.equal(s.mergeMethod, "rebase");
});

test("resolveSettings: legacy env fallback + INPUT precedence", () => {
  process.env.DRY_RUN = "true";
  process.env.AUTO_MERGE = "true";
  process.env.GH_TOKEN = "legacy-token";
  let s = resolveSettings();
  assert.equal(s.dryRun, true);
  assert.equal(s.autoMerge, true);
  assert.equal(s.token, "legacy-token");
  // An explicit input wins over the token env var.
  setInputs({ token: "input-token" });
  s = resolveSettings();
  assert.equal(s.token, "input-token");
});

// ─── failThreshold ─────────────────────────────────────────────────────────────

test("failThreshold ranks", () => {
  assert.equal(failThreshold("never"), Infinity);
  assert.equal(failThreshold("suspicious"), 1);
  assert.equal(failThreshold("infected"), 2);
  assert.equal(failThreshold("anything-else"), 2);
});

// ─── check mode exit codes ─────────────────────────────────────────────────────

test("check: infected → exit 1 + outputs", async () => {
  const repo = await makeRepo(INFECTED_FILES);
  const { code, outputs, summary } = await runAction(repo, { mode: "check" });
  assert.equal(code, 1);
  assert.equal(outputs.severity, "infected");
  assert.equal(outputs.infected, "true");
  assert.equal(outputs["findings-count"], "3");
  assert.equal(outputs.changed, "false");
  assert.match(summary, /PolinRider Malware Scan/);
  assert.match(summary, /infected/);
});

test("check: clean → exit 0", async () => {
  const repo = await makeRepo({ "postcss.config.js": LEGIT_CONFIG });
  const { code, outputs } = await runAction(repo, { mode: "check" });
  assert.equal(code, 0);
  assert.equal(outputs.severity, "clean");
  assert.equal(outputs.infected, "false");
});

test("check: fail-on=never never fails, even when infected", async () => {
  const repo = await makeRepo(INFECTED_FILES);
  const { code, outputs } = await runAction(repo, { mode: "check", "fail-on": "never" });
  assert.equal(code, 0);
  assert.equal(outputs.infected, "true");
});

test("check: exclude skips flagged files", async () => {
  // A vendored copy that legitimately carries a signature would false-positive;
  // excluding it makes the scan clean, while a real infection elsewhere still fails.
  const repo = await makeRepo({
    "vendor/sig-sample.js": infectedConfig(ORIGINAL_PAYLOAD),
  });
  const withoutExclude = await runAction(repo, { mode: "check" });
  assert.equal(withoutExclude.code, 1);
  assert.equal(withoutExclude.outputs.severity, "infected");

  const withExclude = await runAction(repo, { mode: "check", exclude: "vendor/**" });
  assert.equal(withExclude.code, 0);
  assert.equal(withExclude.outputs.severity, "clean");
});

test("check: suspicious repo fails only at fail-on=suspicious", async () => {
  const repo = await makeRepo({ "weird.js": `export const x = 1;\n${GENERIC_PAYLOAD}` });
  const def = await runAction(repo, { mode: "check" }); // fail-on=infected
  assert.equal(def.outputs.severity, "suspicious");
  assert.equal(def.code, 0);
  const strict = await runAction(repo, { mode: "check", "fail-on": "suspicious" });
  assert.equal(strict.code, 1);
});

// ─── fix mode (no commit) ──────────────────────────────────────────────────────

test("fix: cleans the working tree, exit 0, re-scan clean", async () => {
  const repo = await makeRepo(INFECTED_FILES);
  const { code, outputs } = await runAction(repo, { mode: "fix" });
  assert.equal(code, 0);
  assert.equal(outputs.changed, "true");
  assert.equal(outputs.remediated, "true");
  // Payload stripped, legit config kept; malware artifacts gone.
  assert.match(fs.readFileSync(path.join(repo, "App.js"), "utf8"), /tailwindcss/);
  assert.ok(!fs.existsSync(path.join(repo, ".vscode")));
  assert.ok(!fs.existsSync(path.join(repo, "config.bat")));
  const rescan = await scanRepo(repo);
  assert.equal(rescan.severity, "clean");
});

test("fix: confirmed-but-manual-review item leaves exit 1", async () => {
  // An impostor dep is content-confirmed but action=manual-review — fix can't
  // auto-remove it, so the check must still fail. (Note: remediate also runs
  // .gitignore hygiene, so `changed` may be true; the contract under test is the
  // exit code and that the impostor dep is NOT silently stripped.)
  const repo = await makeRepo({
    "package.json": JSON.stringify({ name: "x", dependencies: { "tailwindcss-style-animate": "^1.0.0" } }),
  });
  const { code, outputs } = await runAction(repo, { mode: "fix" });
  assert.equal(outputs.severity, "infected");
  assert.equal(code, 1); // unresolved confirmed item → fail
  assert.match(fs.readFileSync(path.join(repo, "package.json"), "utf8"), /tailwindcss-style-animate/);
});

// ─── SARIF ─────────────────────────────────────────────────────────────────────

test("buildSarif: shape + js-payload line from offset", async () => {
  const repo = await makeRepo(INFECTED_FILES);
  const findings = await scanRepo(repo);
  const sarif = buildSarif(findings, { repoRoot: repo, repoDir: repo });
  assert.equal(sarif.version, "2.1.0");
  const driver = sarif.runs[0].tool.driver;
  assert.equal(driver.name, "polinrider-cleanup");
  assert.equal(sarif.runs[0].results.length, findings.findings.length);
  const js = sarif.runs[0].results.find((r) => r.ruleId.startsWith("js.payload"));
  assert.equal(js.level, "error");
  assert.equal(js.locations[0].physicalLocation.artifactLocation.uri, "App.js");
  assert.equal(js.locations[0].physicalLocation.region.startLine, 5);
});

// ─── buildSummary ──────────────────────────────────────────────────────────────

test("buildSummary: includes remediation section when result present", async () => {
  const repo = await makeRepo(INFECTED_FILES);
  const findings = await scanRepo(repo);
  const md = buildSummary({
    settings: { mode: "fix", dryRun: false },
    findings,
    result: { dryRun: false, applied: [], notes: ["did a thing"], skipped: [], filesModified: [], filesDeleted: [] },
  });
  assert.match(md, /### Findings/);
  assert.match(md, /### Remediation/);
  assert.match(md, /did a thing/);
});
