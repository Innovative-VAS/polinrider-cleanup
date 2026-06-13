import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRunJson, buildRunMarkdown } from "../src/report.js";

function sampleRun(overrides = {}) {
  return {
    scannedAt: "2026-06-01T12:00:00.000Z",
    scannedAtHuman: "Mon Jun 01 2026 12:00:00",
    account: { kind: "org", owner: "Innovative-VAS" },
    dryRun: false,
    autoMerge: true,
    mergeMethod: "squash",
    totals: { total: 4, clean: 1, infected: 3, remediated: 2, merged: 1, prOpened: 2, manualOnly: 1, errors: 1 },
    repos: [
      { repo: "Innovative-VAS/clean-app", severity: "clean", findings: [], deleted: [], modified: [], notes: [], manualReview: [], pr: null, error: null },
      {
        repo: "Innovative-VAS/web", severity: "infected",
        findings: [{ file: ".vscode", action: "remove-dir", confidence: "high", contentConfirmed: true, description: "malicious task" }],
        deleted: [".vscode", "public/fonts"], modified: ["vite.config.js"], notes: ["removed malware-injected entries from .gitignore"], manualReview: [],
        pr: { url: "https://github.com/Innovative-VAS/web/pull/7", merged: true, mergeError: null }, error: null,
      },
      {
        repo: "Innovative-VAS/api", severity: "infected",
        findings: [], deleted: [], modified: ["postcss.config.mjs"], notes: [], manualReview: [],
        pr: { url: "https://github.com/Innovative-VAS/api/pull/3", merged: false, mergeError: "required status checks have not passed" }, error: null,
      },
      { repo: "Innovative-VAS/mob", severity: "infected", findings: [], deleted: [], modified: [], notes: [], manualReview: ["package.json: impostor dependency"], pr: null, error: null },
    ],
    ...overrides,
  };
}

test("buildRunMarkdown renders clickable PR links and merge status", () => {
  const md = buildRunMarkdown(sampleRun());
  assert.match(md, /\[#7\]\(https:\/\/github\.com\/Innovative-VAS\/web\/pull\/7\)/);
  assert.match(md, /✅ merged/);
  assert.match(md, /⚠️ merge blocked/);
  assert.match(md, /\| Repository \| Pull request \| Status \| Changes \|/);
  assert.match(md, /removed: \.vscode, public\/fonts/);
});

test("buildRunMarkdown surfaces a Needs attention section", () => {
  const md = buildRunMarkdown(sampleRun());
  assert.match(md, /## Needs attention/);
  assert.match(md, /auto-merge blocked: required status checks/);
  assert.match(md, /manual review: package\.json: impostor dependency/);
});

test("buildRunMarkdown reflects account, mode, and totals", () => {
  const md = buildRunMarkdown(sampleRun());
  assert.match(md, /\*\*Account:\*\* org `Innovative-VAS`/);
  assert.match(md, /auto-merge: on \(squash\)/);
  assert.match(md, /\| PRs merged \| 1 \|/);
});

test("dry-run mode is labeled and omits the merged row", () => {
  const md = buildRunMarkdown(sampleRun({ dryRun: true, autoMerge: false }));
  assert.match(md, /DRY RUN/);
  assert.match(md, /auto-merge: off/);
  assert.ok(!md.includes("PRs merged"));
});

test("buildRunJson tags a schema and preserves the repos array", () => {
  const run = sampleRun();
  const json = buildRunJson(run);
  assert.equal(json.schema, "polinrider-run/1");
  assert.equal(json.repos.length, 4);
  assert.equal(json.totals.merged, 1);
  // round-trips through JSON
  assert.deepEqual(JSON.parse(JSON.stringify(json)).account, { kind: "org", owner: "Innovative-VAS" });
});
