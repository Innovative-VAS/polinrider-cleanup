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
  LOW_SIGNAL_TAIL,
  infectedConfig,
  infectedDotNotation,
  DOT_NOTATION_PAYLOAD,
  LEGIT_SHIM_CONFIG,
  ORPHAN_SHIM_CONFIG,
  HARMLESS_TAIL,
  MAIN_GUARD_TAIL,
  COMMENTED_EXPORT_DECOY,
  decoyTrailingComment,
  MINIFIED_VENDOR_UMD,
  MINIFIED_VENDOR_ESM,
  goodFont,
  evilFont,
  validSfnt,
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

test("unknown obfuscated payload after the export → confirmed strip, infected", async () => {
  // BEHAVIOUR CHANGE, deliberate. This fixture matches no signature and no seed,
  // and the old detector could only ever flag it for manual review — which is
  // precisely why a rotated payload survived a cleanup run. Position plus
  // capability now confirm it on its own merits.
  const repo = await makeRepo({ "src/App.js": infectedConfig(GENERIC_PAYLOAD) });
  const f = await scanRepo(repo);
  const finding = byId(f, "js.payload.injected");
  assert.ok(finding, "expected a structurally confirmed finding");
  assert.equal(finding.action, "strip-js-payload");
  assert.equal(finding.contentConfirmed, true);
  assert.equal(f.severity, "infected");
  assert.ok(finding.edit.offset > 0, "annotation offset points at the payload");
});

test("a single weak signal after the export → review only, suspicious", async () => {
  // The review tier that GENERIC_PAYLOAD used to cover: reported, never cut,
  // and not enough to mark a repo infected.
  const repo = await makeRepo({ "postcss.config.mjs": LOW_SIGNAL_TAIL });
  const f = await scanRepo(repo);
  const finding = byId(f, "js.payload.suspect-tail");
  assert.ok(finding, "expected a suspect-tail finding");
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

test("carrier + referenced clean font in public/fonts → remove-font-set preserves the clean font", async () => {
  const repo = await makeRepo({
    "public/fonts/evil.woff2": evilFont(),
    "public/fonts/good.woff2": goodFont(),
    "src/app.css": `@font-face{src:url('/fonts/good.woff2');}`,
  });
  const f = await scanRepo(repo);
  const fontFindings = f.findings.filter((x) => x.category === "font");
  assert.equal(fontFindings.length, 1);
  assert.equal(fontFindings[0].action, "remove-font-set");
  assert.equal(f.severity, "infected");
  const removed = fontFindings[0].edit.removals.map((r) => r.rel);
  assert.ok(removed.some((p) => /evil\.woff2$/.test(p)), "evil font removed");
  assert.ok(!removed.some((p) => /good\.woff2$/.test(p)), "referenced clean font preserved");
});

test("infected fa font in a mixed dir → remove infected + fa-set + README, keep clean non-fa fonts", async () => {
  const repo = await makeRepo({
    "public/fonts/fa-solid-400.woff2": evilFont(), // JS carrier disguised as Font Awesome
    "public/fonts/fa-brands-400.woff2": goodFont(), // clean FA sibling (still removed)
    "public/fonts/fa-regular-400.ttf": validSfnt(), // clean FA sibling (still removed)
    "public/fonts/README.md": "# Font Awesome",
    "public/fonts/gill-sans/GillSans-Bold.otf": validSfnt("Copyright"), // clean, NOT fa → keep
    "public/fonts/gill-sans/README.md": "# Gill Sans license", // nested legit README → keep
  });
  const f = await scanRepo(repo);
  assert.equal(f.severity, "infected");
  const finding = byId(f, "font.carrier-set");
  assert.ok(finding, "expected remove-font-set finding");
  assert.equal(finding.action, "remove-font-set");
  assert.equal(finding.contentConfirmed, true);
  const removed = finding.edit.removals.map((r) => r.rel);
  assert.equal(removed.length, 4, JSON.stringify(removed));
  for (const name of ["fa-solid-400.woff2", "fa-brands-400.woff2", "fa-regular-400.ttf", "README.md"]) {
    assert.ok(removed.some((p) => p.endsWith(name)), `${name} should be removed`);
  }
  // The nested clean subdir — including its own README — must be untouched.
  assert.ok(!removed.some((p) => p.includes("gill-sans")), "gill-sans must be preserved");
});

test("referenced file that is a JS payload (not a valid font) → manual review, never auto-deleted", async () => {
  const repo = await makeRepo({
    "public/fonts/webfont.woff2": evilFont(), // JS payload, but wired into the build
    "src/app.js": `import "./public/fonts/webfont.woff2";`,
  });
  const f = await scanRepo(repo);
  const finding = byId(f, "font.referenced-carrier");
  assert.ok(finding, "referenced carrier must be surfaced, not silently trusted");
  assert.equal(finding.action, "manual-review");
  assert.equal(finding.contentConfirmed, false);
  assert.equal(f.severity, "suspicious");
  const autoRemoved = ["delete-font", "remove-font-set", "remove-dir"];
  assert.ok(
    !f.findings.some((x) => autoRemoved.includes(x.action)),
    "a referenced file must never be auto-deleted",
  );
});

test("dir of only infected + fa-set + README → whole-dir removal", async () => {
  const repo = await makeRepo({
    "public/fonts/fa-solid-400.woff2": evilFont(),
    "public/fonts/fa-brands-400.woff2": goodFont(),
    "public/fonts/README.md": "# FA",
  });
  const f = await scanRepo(repo);
  assert.equal(f.severity, "infected");
  const finding = byId(f, "font.carrier-dir");
  assert.ok(finding, "expected whole-dir removal");
  assert.equal(finding.action, "remove-dir");
  assert.match(finding.edit.absPath, /public[\\/]fonts$/);
});

test("valid fa-named fonts, no payload → medium (suspicious) manual review, no removal", async () => {
  const repo = await makeRepo({
    "public/fonts/fa-solid-900.woff2": goodFont(),
    "public/fonts/fa-brands-400.ttf": validSfnt(),
  });
  const f = await scanRepo(repo);
  assert.equal(f.severity, "suspicious");
  assert.equal(f.hasContentConfirmed, false);
  const finding = byId(f, "font.review");
  assert.ok(finding, "expected fa manual-review finding");
  assert.equal(finding.action, "manual-review");
  assert.equal(finding.contentConfirmed, false);
});

test("unreferenced but structurally valid non-fa fonts → clean, no findings", async () => {
  const repo = await makeRepo({
    "public/fonts/inter.woff2": goodFont(),
    "public/fonts/roboto.otf": validSfnt("Copyright"),
  });
  const f = await scanRepo(repo);
  assert.equal(f.severity, "clean");
  assert.equal(f.findings.filter((x) => x.category === "font").length, 0);
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

// ─── structural detection (signature-independent) ───────────────────────────────

test("rotated payload in a nested monorepo path is detected", async () => {
  // The exact regression: a real infection at packages/ui/postcss.config.mjs was
  // reported clean because the payload carried no known signature. Traversal was
  // never the problem, so this asserts detection at depth, not reachability.
  const repo = await makeRepo({
    "packages/ui/postcss.config.mjs": infectedDotNotation(),
    "apps/web/next.config.mjs": LEGIT_CONFIG,
  });
  const f = await scanRepo(repo);
  assert.equal(f.severity, "infected");

  const finding = byId(f, "js.payload.injected");
  assert.ok(finding, "expected a structurally confirmed finding");
  assert.equal(finding.file, "packages/ui/postcss.config.mjs");
  assert.equal(finding.action, "strip-js-payload");
  assert.equal(finding.contentConfirmed, true);
  assert.ok(finding.edit.offset > 0, "offset points at the payload, not the shim");
  assert.equal(finding.edit.ranges.filter((r) => r.role === "shim").length, 2);
  assert.equal(finding.edit.ranges.filter((r) => r.role === "payload").length, 1);
  assert.equal(f.findings.filter((x) => x.category === "js").length, 1, "one js finding per file");
});

test("the finding names the evidence that confirmed it", async () => {
  // An automatic edit has to be auditable: the report must say WHY, not just that
  // some variant matched.
  const repo = await makeRepo({ "postcss.config.mjs": infectedDotNotation() });
  const f = await scanRepo(repo);
  const finding = byId(f, "js.payload.injected");
  assert.match(finding.description, /capability \d+/, "carries the score");
  assert.match(finding.description, /subprocess|HTTP|global/i, "names at least one behaviour");
  assert.ok(finding.evidence.capability >= 5, "evidence is machine-readable too");
});

test("the payload is detected with no signature, no seed and no eval", async () => {
  assert.ok(!DOT_NOTATION_PAYLOAD.includes("eval("), "fixture must not use eval");
  const repo = await makeRepo({ "tailwind.config.js": infectedDotNotation() });
  const f = await scanRepo(repo);
  assert.equal(f.severity, "infected");
});

test("a trailing comment claiming to be an export cannot hide a payload", async () => {
  const repo = await makeRepo({
    "postcss.config.mjs": decoyTrailingComment(DOT_NOTATION_PAYLOAD),
  });
  const f = await scanRepo(repo);
  assert.equal(f.severity, "infected", "a comment is not a statement");
});

// ─── the false-positive guards ──────────────────────────────────────────────────

test("clean and idiomatic files produce no js findings", async () => {
  const repo = await makeRepo({
    "postcss.config.mjs": LEGIT_CONFIG,
    "next.config.mjs": LEGIT_SHIM_CONFIG,
    "babel.config.js": HARMLESS_TAIL,
    "eslint.config.mjs": COMMENTED_EXPORT_DECOY,
    "vendor/umd.js": MINIFIED_VENDOR_UMD,
    "vendor/esm.js": MINIFIED_VENDOR_ESM,
  });
  const f = await scanRepo(repo);
  assert.deepEqual(
    f.findings.filter((x) => x.category === "js"),
    [],
    "none of these may be flagged",
  );
  assert.equal(f.severity, "clean");
});

test("a legitimate main-guard after the export is never auto-stripped", async () => {
  const repo = await makeRepo({ "postcss.config.mjs": MAIN_GUARD_TAIL });
  const f = await scanRepo(repo);
  const js = f.findings.filter((x) => x.category === "js");
  for (const finding of js) {
    assert.equal(finding.action, "manual-review", "must never be an automatic edit");
    assert.equal(finding.contentConfirmed, false);
  }
  assert.notEqual(f.severity, "infected");
});

test("an orphan shim is suspicious and auto-fixable, not infected", async () => {
  const repo = await makeRepo({ "postcss.config.mjs": ORPHAN_SHIM_CONFIG });
  const f = await scanRepo(repo);
  const finding = byId(f, "js.shim.orphan");
  assert.ok(finding, "expected an orphan-shim finding");
  assert.equal(finding.autoFix, true);
  assert.equal(finding.contentConfirmed, false);
  assert.equal(f.severity, "suspicious");
  assert.equal(f.hasAutoFixable, true);
});

test("a JSX file is reported but never marked for automatic removal", async () => {
  const repo = await makeRepo({ "src/Widget.jsx": infectedDotNotation() });
  const f = await scanRepo(repo);
  for (const finding of f.findings.filter((x) => x.category === "js")) {
    assert.equal(finding.action, "manual-review", "JSX is never safe to cut automatically");
  }
});
