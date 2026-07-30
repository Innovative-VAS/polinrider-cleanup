import { test, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { scanRepo } from "../src/scanner.js";
import { remediate } from "../src/remediator.js";
import {
  makeRepo,
  cleanupAll,
  LEGIT_CONFIG,
  INFECTED_TASKS_NODE,
  ORIGINAL_PAYLOAD,
  ROTATED_PAYLOAD,
  infectedConfig,
  goodFont,
  evilFont,
} from "./helpers.js";

after(cleanupAll);

// git not needed for these (no .git dir) — stub returns "not tracked".
const noGit = async () => ({ exitCode: 1, stdout: "", stderr: "" });

test("strips original payload, leaving the legit config byte-identical", async () => {
  const repo = await makeRepo({ "postcss.config.mjs": infectedConfig(ORIGINAL_PAYLOAD) });
  const findings = await scanRepo(repo);
  const result = await remediate(repo, findings, { git: noGit });
  assert.equal(result.changed, true);
  const out = await fs.readFile(path.join(repo, "postcss.config.mjs"), "utf8");
  assert.ok(!out.includes("rmcej%otb%"), "payload signature should be gone");
  assert.ok(!out.includes("global['!']"), "payload start should be gone");
  assert.equal(out, LEGIT_CONFIG.replace(/\s+$/, "") + "\n", "legit config preserved verbatim");
});

test("strips rotated payload", async () => {
  const repo = await makeRepo({ "tailwind.config.js": infectedConfig(ROTATED_PAYLOAD) });
  const findings = await scanRepo(repo);
  await remediate(repo, findings, { git: noGit });
  const out = await fs.readFile(path.join(repo, "tailwind.config.js"), "utf8");
  assert.ok(!out.includes("Cot%3t=shtP"));
  assert.ok(!out.includes("global['_V']"));
});

test("removes the entire .vscode directory when a malicious task is found", async () => {
  const repo = await makeRepo({
    ".vscode/tasks.json": INFECTED_TASKS_NODE,
    ".vscode/settings.json": `{ "editor.tabSize": 2 }`,
  });
  const findings = await scanRepo(repo);
  await remediate(repo, findings, { git: noGit });
  assert.equal(existsSync(path.join(repo, ".vscode")), false, ".vscode removed entirely");
});

test("removes the carrier but preserves a referenced clean font (remove-font-set)", async () => {
  const repo = await makeRepo({
    "public/fonts/evil.woff2": evilFont(),
    "public/fonts/good.woff2": goodFont(),
    "src/app.css": `@font-face{src:url('/fonts/good.woff2');}`,
  });
  const findings = await scanRepo(repo);
  const result = await remediate(repo, findings, { git: noGit });
  assert.equal(result.changed, true);
  assert.equal(existsSync(path.join(repo, "public/fonts/evil.woff2")), false, "carrier removed");
  assert.equal(existsSync(path.join(repo, "public/fonts/good.woff2")), true, "clean font preserved");
  assert.equal(existsSync(path.join(repo, "public/fonts")), true, "fonts dir kept");
});

test("removes the whole fonts dir when it is entirely malware (remove-dir)", async () => {
  const repo = await makeRepo({
    "public/fonts/fa-solid-400.woff2": evilFont(),
    "public/fonts/fa-brands-400.woff2": goodFont(),
    "public/fonts/README.md": "# Font Awesome",
  });
  const findings = await scanRepo(repo);
  await remediate(repo, findings, { git: noGit });
  assert.equal(existsSync(path.join(repo, "public/fonts")), false, "fonts dir removed");
  assert.equal(existsSync(path.join(repo, "public")), true, "only the fonts dir is removed");
});

test("removes artifacts and strips all injected .gitignore lines", async () => {
  const repo = await makeRepo({
    "temp_auto_push.bat": "x",
    "temp_interactive_push.bat": "x",
    "config.bat": "x",
    "branch_structure.json": "{}",
    ".gitignore": "node_modules\nconfig.bat\ntemp_auto_push.bat\ntemp_interactive_push.bat\nbranch_structure.json\n",
  });
  const findings = await scanRepo(repo);
  await remediate(repo, findings, { git: noGit });
  for (const a of ["temp_auto_push.bat", "temp_interactive_push.bat", "config.bat", "branch_structure.json"]) {
    assert.equal(existsSync(path.join(repo, a)), false, `${a} removed`);
  }
  const gi = (await fs.readFile(path.join(repo, ".gitignore"), "utf8")).split(/\r?\n/);
  for (const inj of ["config.bat", "temp_auto_push.bat", "temp_interactive_push.bat", "branch_structure.json"]) {
    assert.ok(!gi.includes(inj), `${inj} removed from .gitignore`);
  }
  assert.ok(gi.includes(".env"), ".env pattern ensured");
});

test("dry run reports planned changes without writing", async () => {
  const repo = await makeRepo({ "postcss.config.mjs": infectedConfig(ORIGINAL_PAYLOAD) });
  const findings = await scanRepo(repo);
  const before = await fs.readFile(path.join(repo, "postcss.config.mjs"), "utf8");
  const result = await remediate(repo, findings, { dryRun: true, git: noGit });
  assert.equal(result.changed, false);
  assert.ok(result.applied.length >= 1);
  const after = await fs.readFile(path.join(repo, "postcss.config.mjs"), "utf8");
  assert.equal(after, before, "dry run must not modify the file");
});

test("does not touch unrelated files when remediating", async () => {
  const repo = await makeRepo({
    "postcss.config.mjs": infectedConfig(ORIGINAL_PAYLOAD),
    "README.md": "# Hello\nThis file is innocent.\n",
    "src/util.js": `export const add = (a, b) => a + b;\n`,
  });
  const readmeBefore = await fs.readFile(path.join(repo, "README.md"), "utf8");
  const utilBefore = await fs.readFile(path.join(repo, "src/util.js"), "utf8");
  const findings = await scanRepo(repo);
  await remediate(repo, findings, { git: noGit });
  assert.equal(await fs.readFile(path.join(repo, "README.md"), "utf8"), readmeBefore);
  assert.equal(await fs.readFile(path.join(repo, "src/util.js"), "utf8"), utilBefore);
});

test("manual-review-only infection makes no automated file changes", async () => {
  const repo = await makeRepo({
    "package.json": JSON.stringify({ name: "x", dependencies: { "tailwind-autoanimation": "1.0.0" } }),
    ".gitignore": ".env\n.env.local\n.env.*.local\n.env.production\n.env.development\n",
  });
  const findings = await scanRepo(repo);
  assert.equal(findings.severity, "infected");
  const result = await remediate(repo, findings, { git: noGit });
  assert.equal(result.changed, false, "no auto-fixable changes for an impostor dep");
  assert.equal(result.skipped.length >= 1, true);
});
