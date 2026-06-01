import { test, after } from "node:test";
import assert from "node:assert/strict";
import { scanRepo } from "../src/scanner.js";
import {
  makeRepo,
  cleanupAll,
  LEGIT_CONFIG,
  LEGIT_TASKS,
  LEGIT_LAUNCH,
  INFECTED_TASKS,
  INFECTED_TASKS_NODE,
  ORIGINAL_PAYLOAD,
  ROTATED_PAYLOAD,
  GENERIC_PAYLOAD,
  infectedConfig,
  goodFont,
  evilFont,
} from "./helpers.js";

after(cleanupAll);

const byId = (findings, id) => findings.findings.find((f) => f.id === id);

test("clean repo → severity clean, zero findings", async () => {
  // A normal repo with legit VS Code tasks + referenced fonts (but not the full
  // tasks+launch+fonts malware triad) must come back completely clean.
  const repo = await makeRepo({
    "postcss.config.js": LEGIT_CONFIG,
    "src/App.jsx": `export default function App(){ return null; }\n`,
    ".vscode/tasks.json": LEGIT_TASKS,
    "public/fonts/inter.woff2": goodFont(),
    "src/index.css": `@font-face{src:url('/fonts/inter.woff2');}`,
    "package.json": JSON.stringify({ name: "x", dependencies: { react: "^18" } }),
    ".gitignore": ".env\nnode_modules\n",
  });
  const f = await scanRepo(repo);
  assert.equal(f.severity, "clean");
  assert.equal(f.findings.length, 0);
  assert.equal(f.hasContentConfirmed, false);
  assert.equal(f.coPresenceAmplified, false);
});

test("original variant payload → confirmed strip finding, infected", async () => {
  const repo = await makeRepo({ "postcss.config.mjs": infectedConfig(ORIGINAL_PAYLOAD) });
  const f = await scanRepo(repo);
  assert.equal(f.severity, "infected");
  const finding = byId(f, "js.payload.original");
  assert.ok(finding, "expected original-variant finding");
  assert.equal(finding.action, "strip-js-payload");
  assert.equal(finding.contentConfirmed, true);
  assert.ok(finding.edit.offset > 0);
});

test("rotated variant payload → confirmed strip finding", async () => {
  const repo = await makeRepo({ "tailwind.config.js": infectedConfig(ROTATED_PAYLOAD) });
  const f = await scanRepo(repo);
  const finding = byId(f, "js.payload.rotated");
  assert.ok(finding, "expected rotated-variant finding");
  assert.equal(finding.action, "strip-js-payload");
  assert.equal(finding.contentConfirmed, true);
});

test("generic obfuscation → manual-review only, suspicious (not infected)", async () => {
  const repo = await makeRepo({ "src/App.js": infectedConfig(GENERIC_PAYLOAD) });
  const f = await scanRepo(repo);
  const finding = byId(f, "js.payload.heuristic");
  assert.ok(finding, "expected heuristic finding");
  assert.equal(finding.action, "manual-review");
  assert.equal(finding.contentConfirmed, false);
  assert.equal(f.severity, "suspicious");
  assert.equal(f.hasContentConfirmed, false);
});

test("malicious .vscode (curl|bash C2 task) → whole-dir remove finding", async () => {
  const repo = await makeRepo({ ".vscode/tasks.json": INFECTED_TASKS, ".vscode/settings.json": "{}" });
  const f = await scanRepo(repo);
  const finding = byId(f, "vscode.malicious");
  assert.ok(finding, "expected vscode finding");
  assert.equal(finding.action, "remove-dir");
  assert.equal(finding.contentConfirmed, true);
  assert.match(finding.edit.absPath, /\.vscode$/);
  assert.equal(f.severity, "infected");
});

test("malicious .vscode (node executes a font on folderOpen) → detected", async () => {
  const repo = await makeRepo({ ".vscode/tasks.json": INFECTED_TASKS_NODE });
  const f = await scanRepo(repo);
  const finding = byId(f, "vscode.malicious");
  assert.ok(finding, "the node-runs-a-font task must be detected");
  assert.equal(finding.action, "remove-dir");
  assert.equal(f.severity, "infected");
});

test("suspicious font in public/fonts → whole public/fonts removal", async () => {
  const repo = await makeRepo({
    "public/fonts/evil.woff2": evilFont(),
    "public/fonts/good.woff2": goodFont(),
    "src/app.css": `@font-face{src:url('/fonts/good.woff2');}`,
  });
  const f = await scanRepo(repo);
  const fontFindings = f.findings.filter((x) => x.category === "font");
  assert.equal(fontFindings.length, 1);
  assert.equal(fontFindings[0].action, "remove-dir");
  assert.match(fontFindings[0].file, /public[\\/]fonts$/);
});

test("artifacts + injected .gitignore lines detected", async () => {
  const repo = await makeRepo({
    "temp_auto_push.bat": "echo malware",
    "config.bat": "echo orchestrator",
    "branch_structure.json": "{}",
    ".gitignore": "node_modules\nconfig.bat\ntemp_auto_push.bat\nbranch_structure.json\n",
  });
  const f = await scanRepo(repo);
  assert.ok(byId(f, "artifact.temp_auto_push.bat"));
  assert.ok(byId(f, "artifact.config.bat"));
  assert.ok(byId(f, "artifact.branch_structure.json"));
  assert.ok(byId(f, "gitignore.injected"));
  assert.equal(f.severity, "infected");
});

test("impostor dependency flagged for manual review (confirmed)", async () => {
  const repo = await makeRepo({
    "package.json": JSON.stringify({ name: "x", dependencies: { "tailwind-mainanimation": "1.0.0" } }),
  });
  const f = await scanRepo(repo);
  const finding = byId(f, "package.impostor-deps");
  assert.ok(finding);
  assert.equal(finding.action, "manual-review");
  assert.equal(finding.contentConfirmed, true);
  assert.equal(f.severity, "infected");
});

test("co-presence raises severity but does not mark infected without payload", async () => {
  const repo = await makeRepo({
    ".vscode/tasks.json": LEGIT_TASKS,
    ".vscode/launch.json": LEGIT_LAUNCH,
    "public/fonts/inter.woff2": goodFont(),
    "src/index.css": `@font-face{src:url('/fonts/inter.woff2');}`,
  });
  const f = await scanRepo(repo);
  assert.equal(f.coPresenceAmplified, true);
  assert.equal(f.hasContentConfirmed, false);
  assert.equal(f.severity, "suspicious");
});
