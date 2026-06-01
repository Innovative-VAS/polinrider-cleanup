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

test("malicious .vscode task flagged; legit task not", async () => {
  const repo = await makeRepo({ ".vscode/tasks.json": INFECTED_TASKS });
  const f = await scanRepo(repo);
  const finding = byId(f, "vscode.tasks");
  assert.ok(finding, "expected vscode finding");
  assert.equal(finding.contentConfirmed, true);
  assert.deepEqual(finding.edit.indices, [1]); // only the curl|bash task
  assert.equal(finding.edit.total, 2);
});

test("unreferenced suspicious font flagged; referenced/valid font kept", async () => {
  const repo = await makeRepo({
    "public/fonts/evil.woff2": evilFont(),
    "public/fonts/good.woff2": goodFont(),
    "src/app.css": `@font-face{src:url('/fonts/good.woff2');}`,
  });
  const f = await scanRepo(repo);
  const fontFindings = f.findings.filter((x) => x.category === "font");
  assert.equal(fontFindings.length, 1);
  assert.match(fontFindings[0].file, /evil\.woff2$/);
});

test("artifacts + .gitignore injection detected", async () => {
  const repo = await makeRepo({
    "temp_auto_push.bat": "echo malware",
    "config.bat": "echo orchestrator",
    ".gitignore": "node_modules\nconfig.bat\n",
  });
  const f = await scanRepo(repo);
  assert.ok(byId(f, "artifact.temp_auto_push.bat"));
  assert.ok(byId(f, "artifact.config.bat"));
  assert.ok(byId(f, "gitignore.config-bat"));
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
