/**
 * Tokenizer tests.
 *
 * The tiling invariant and the fail-closed cases matter more than any single
 * syntax case: the payload remediator is only allowed to cut because the lexer
 * proves every significant character belongs to exactly one statement, and
 * refuses to answer at all when it cannot.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import * as L from "../src/jslex.js";

const stmts = (src, opts) => L.lexJs(src, opts).statements;
const count = (src, opts) => stmts(src, opts).length;

// ─── invariants ────────────────────────────────────────────────────────────────

test("all three views are exactly the length of the input", () => {
  const samples = [
    "const a = 1;\n",
    "// comment only\n",
    "const s = 'str'; /* block */ const r = /re/g;\n",
    "const t = `a${b}c`;\n",
    "\uFEFF#!/usr/bin/env node\nconst a = 1;\n",
    "",
  ];
  for (const src of samples) {
    const v = L.views(src);
    assert.equal(v.ok, true, `should lex: ${JSON.stringify(src)}`);
    assert.equal(v.code.length, src.length, "code view length");
    assert.equal(v.literals.length, src.length, "literals view length");
    assert.equal(v.comments.length, src.length, "comments view length");
  }
});

test("statements plus gaps reconstruct the input, and gaps hold no code", () => {
  const src =
    "import x from 'y';\n\n" +
    "// a banner comment\n" +
    "export default { a: 1 };\n\n\n" +
    "trailing();\n";
  const lex = L.lexJs(src);
  assert.equal(lex.ok, true);
  let rebuilt = "";
  let cursor = 0;
  for (const st of lex.statements) {
    rebuilt += src.slice(cursor, st.start) + src.slice(st.start, st.end);
    // Every gap must be whitespace or comments only — never significant code.
    assert.equal(
      lex.code.slice(cursor, st.start).trim(),
      "",
      "gap before a statement must contain no code",
    );
    cursor = st.end;
  }
  rebuilt += src.slice(cursor);
  assert.equal(rebuilt, src, "statements interleaved with gaps must rebuild the input");
});

test("line numbers agree across every view and the original text", () => {
  const src = "const a = '\\n';\n/* one\ntwo */\nconst b = `x\ny`;\nconst c = 1;\n";
  const v = L.views(src);
  const lines = (s) => s.split("\n").length;
  assert.equal(lines(v.code), lines(src), "code view line count");
  assert.equal(lines(v.literals), lines(src), "literals view line count");
  assert.equal(lines(v.comments), lines(src), "comments view line count");
});

// ─── view separation ───────────────────────────────────────────────────────────

test("evidence inside a string is visible to literals but not to code", () => {
  const v = L.views('const h = require("node:http");\n');
  assert.ok(v.literals.includes("node:http"), "literals view keeps string contents");
  assert.ok(!v.code.includes("node:http"), "code view blanks string contents");
});

test("a token mentioned only in a comment scores in no capability view", () => {
  // This is the shape of the doc comments in fonts.js and index.js.
  const v = L.views("// global['!']=1; require('x'); eval('y')\nconst a = 1;\n");
  assert.ok(v.comments.includes("eval("), "comments view keeps comment contents");
  assert.ok(!v.code.includes("eval("), "code view must not see a commented token");
  assert.ok(!v.literals.includes("eval("), "literals view must not see a commented token");
  assert.ok(!v.code.includes("global"), "code view must not see a commented identifier");
});

test("regex contents are blanked in both the code and literals views", () => {
  // src/scanner.js contains /\bnode\b\s+-e\b/i as a real regex literal; it must
  // never be mistaken for the payload string it is written to detect.
  const v = L.views("const re = /node -e/i;\n");
  assert.ok(!v.code.includes("node -e"), "code view blanks regex bodies");
  assert.ok(!v.literals.includes("node -e"), "literals view never reveals regex bodies");
});

test("template chunks reach the literals view while interpolations stay code", () => {
  const v = L.views("const s = `pre ${x} node:http post`;\n");
  assert.ok(v.literals.includes("node:http"), "cooked chunks are literal contents");
  assert.ok(!v.code.includes("node:http"), "cooked chunks are blanked from code");
  assert.ok(v.code.includes("x"), "the interpolated expression stays visible as code");
});

// ─── the export-boundary bug this work exists to fix ───────────────────────────

test("export default inside a comment or a string is not an export statement", () => {
  const src =
    "// export default {}\n" +
    'const s = "export default x";\n' +
    "export default { p: 1 };\n";
  const lex = L.lexJs(src);
  const exports = lex.statements.filter((s) => s.kind === "export");
  assert.equal(exports.length, 1, "only the real export should be classified as one");
  assert.ok(exports[0].start > src.indexOf('"export default x"'), "the real export is last");
});

test("an export statement's range covers its whole body", () => {
  const src = "export function f() {\n  const a = 1;\n  return a;\n}\n";
  const lex = L.lexJs(src);
  assert.equal(lex.statements.length, 1, "a function declaration is one statement");
  assert.equal(lex.statements[0].kind, "export");
  assert.equal(lex.statements[0].end, src.trimEnd().length, "range reaches the closing brace");
});

// ─── regex versus division ─────────────────────────────────────────────────────

test("regex and division are told apart in the ambiguous positions", () => {
  assert.equal(count("const r = /[/*]/g; const s = 1;\n"), 2, "slash inside a character class");
  assert.equal(L.lexJs("const x = a / b / c;\n").ok, true, "division chain");
  assert.equal(L.lexJs("if (x) /re/.test(y);\n").ok, true, "regex after a control-head paren");
  assert.equal(L.lexJs("const o = {}/2;\n").ok, true, "division after an object brace");
  assert.equal(L.lexJs("{ let a = 1 }\n/re/.test(x);\n").ok, true, "regex after a block brace");

  // Each snippet is valid JS placing a regex literal after a different token.
  const positions = [
    ["open paren", "f(/re/.test(x));\n"],
    ["comma", "f(a, /re/.test(x));\n"],
    ["assignment", "const r = /re/;\n"],
    ["open bracket", "const arr = [/re/];\n"],
    ["return", "function g() { return /re/.test(x); }\n"],
    ["typeof", "const t = typeof /re/;\n"],
    ["case label", "switch (a) { case 1: /re/.test(x); break; }\n"],
    ["logical and", "const b = a && /re/.test(x);\n"],
    ["ternary", "const c = a ? /re/.test(x) : /re2/.test(y);\n"],
    ["statement start", "/re/.test(x);\n"],
    ["arrow body", "const h = () => /re/.test(x);\n"],
    ["not operator", "const d = !/re/.test(x);\n"],
  ];
  for (const [label, src] of positions) {
    assert.equal(L.lexJs(src).ok, true, `regex after ${label}: ${src.trim()}`);
  }

  // And the mirror: a slash that really is division must not eat the line.
  assert.equal(L.lexJs("const q = (a + b) / c;\n").ok, true, "division after a group");
  assert.equal(L.lexJs("const q = arr[0] / c;\n").ok, true, "division after an index");
  assert.equal(L.lexJs("const q = i++ / c;\n").ok, true, "division after a postfix increment");
});

test("numeric literals are consumed whole", () => {
  for (const src of [
    "const a = 0x1e/2;\n", "const b = 1_000n;\n", "const c = .5;\n",
    "const d = 1e-5;\n", "const e = 0b1010;\n", "const f = 0o777;\n",
  ]) {
    assert.equal(L.lexJs(src).ok, true, src.trim());
  }
});

test("optional chaining is not munched when a digit follows", () => {
  assert.equal(L.lexJs("const c = a?.5:1;\n").ok, true, "a?.5:1 is a conditional");
  assert.equal(L.lexJs("const c = a?.b;\n").ok, true, "a?.b is optional chaining");
});

// ─── statement splitting ───────────────────────────────────────────────────────

test("constructs that look like two statements stay one", () => {
  assert.equal(count("if (a) { x(); } else { y(); }\n"), 1, "if/else");
  assert.equal(count("do { x(); } while (a);\n"), 1, "do/while");
  assert.equal(count("try { a(); } catch (e) { b(); } finally { c(); }\n"), 1, "try/catch/finally");
  assert.equal(count("x = function(){}\n.bind(y);\n"), 1, "chained call after a function expression");
  assert.equal(count("@dec\nclass X {}\n"), 1, "a decorator stays with its class");
  assert.equal(count("switch (a) { case 1: break; }\n"), 1, "switch");
});

test("a semicolon-free payload tail is still split from the export", () => {
  // The injected payload is what makes this matter: no semicolon after the
  // export, then a new statement on the next line.
  const lex = L.lexJs("export default {}\nglobal.i = 1\nconst http = 2\n");
  assert.equal(lex.ok, true);
  assert.equal(lex.statements.length, 3, "ASI splits the appended statements");
  assert.equal(lex.statements[0].kind, "export");
});

test("nested template literals do not swallow the rest of the file", () => {
  assert.equal(count("const a = `x${`y${z}`}w`; const b = 2;\n"), 2, "two levels");
  assert.equal(L.lexJs("const s = `has ${ `${ `${x}` }` } deep`;\n").ok, true, "three levels");
  assert.equal(L.lexJs("const q = tag`a${b}c`;\n").ok, true, "tagged template");
});

test("TypeScript and JSX-free modern syntax lexes", () => {
  for (const src of [
    "export enum E { A = 1, B }\n",
    "namespace N { const a = 1; }\n",
    "declare module \"x\" { }\n",
    "type T = A | B;\n",
    "interface I { m(): void }\n",
    "const f = <T,>(x: T) => x;\n",
    "const y = z satisfies W;\n",
    "const c = v as const;\n",
    "const p = q!.foo;\n",
    "class C { #priv = 1; get v() { return this.#priv; } }\n",
    "const n = a ?? b?.c;\n",
  ]) {
    assert.equal(L.lexJs(src, { ext: ".ts" }).ok, true, src.trim());
  }
});

test("preamble forms are handled", () => {
  assert.equal(L.lexJs("#!/usr/bin/env node\nconst a=1;\n").preamble.shebangEnd, 19, "shebang");
  assert.equal(L.lexJs("\uFEFFconst a=1;\n").preamble.bom, true, "BOM");
  assert.equal(L.lexJs("\uFEFF#!/usr/bin/env node\nconst a=1;\n").ok, true, "BOM plus shebang");
  assert.equal(L.lexJs("const a=1;\r\nconst b=2;\r\n").statements.length, 2, "CRLF");
});

test("empty, blank and comment-only inputs lex to no statements", () => {
  for (const src of ["", "   \n\n", "// just a comment\n", "/* only a block */\n"]) {
    const lex = L.lexJs(src);
    assert.equal(lex.ok, true, `should lex: ${JSON.stringify(src)}`);
    assert.equal(lex.statements.length, 0, `no statements in: ${JSON.stringify(src)}`);
  }
});

// ─── fail closed ───────────────────────────────────────────────────────────────

test("malformed input fails closed with a specific reason", () => {
  const cases = [
    ["const a = 'oops;\n", "unterminated-string"],
    ["/* nope\n", "unterminated-comment"],
    ["const t = `open;\n", "unterminated-template"],
    ["}\n", "unbalanced-close"],
    ["function f() {\n", "unbalanced-eof"],
    ["const a = (1];\n", "mismatched-delimiter"],
  ];
  for (const [src, reason] of cases) {
    const lex = L.lexJs(src);
    assert.equal(lex.ok, false, `must fail: ${JSON.stringify(src)}`);
    assert.equal(lex.reason, reason, `reason for ${JSON.stringify(src)}`);
  }
});

test("a failed lex exposes no views at all", () => {
  const v = L.views("const a = 'unterminated\n");
  assert.equal(v.ok, false);
  assert.equal(v.code, null, "a partial view is worse than none");
  assert.equal(v.literals, null);
});

test("an oversized file fails closed rather than being scanned", () => {
  const lex = L.lexJs("a".repeat(L.LEX_LIMITS.maxBytes + 1));
  assert.equal(lex.ok, false);
  assert.equal(lex.reason, "file-too-large");
});

test("JSX text children never yield a usable lex", () => {
  // Either the lex fails or the file is flagged; both withhold automated edits.
  const lex = L.lexJs("const a = <p>It's 50% off</p>;\n", { ext: ".jsx" });
  assert.ok(!lex.ok || lex.jsxSuspected, "must not present as safely cuttable");
  assert.equal(lex.jsxSuspected, true, "a .jsx file stays flagged even when the lex failed");
});

test("JSX is suspected from content even without the extension", () => {
  const lex = L.lexJs("const el = <div className='x' />;\n");
  assert.equal(lex.jsxSuspected, true);
});

// ─── specifiers, bindings, references ──────────────────────────────────────────

test("module specifiers are extracted structurally, not by regex", () => {
  const lex = L.lexJs('const h = require("node:http"); const u = "https://x/http";\n');
  assert.deepEqual(
    lex.specifiers.map((s) => s.spec),
    ["node:http"],
    "a URL containing 'http' must not register as the http module",
  );
});

test("every specifier form is recognised", () => {
  const lex = L.lexJs(
    'import a from "mod-a";\nconst b = require("mod-b");\nconst c = await import("mod-c");\n',
  );
  assert.deepEqual(lex.specifiers.map((s) => s.spec).sort(), ["mod-a", "mod-b", "mod-c"]);
  assert.deepEqual(lex.specifiers.map((s) => s.form).sort(), ["dynamic-import", "import", "require"]);
});

test("an escaped specifier is flagged as obfuscated", () => {
  const lex = L.lexJs('const h = require("\\x6ettp");\n');
  assert.equal(lex.specifiers[0].obfuscated, true);
});

test("bindings and references drive the linkage rule", () => {
  const src = "const alpha = 1, beta = 2;\nfunction gamma() { return alpha; }\n";
  const lex = L.lexJs(src);
  assert.deepEqual([...L.bindingsOf(lex, lex.statements[0])].sort(), ["alpha", "beta"]);
  assert.deepEqual([...L.bindingsOf(lex, lex.statements[1])], ["gamma"]);
  const refs = L.referencesOf(lex, [lex.statements[1]]);
  assert.ok(refs.has("alpha"), "the function references alpha");
});

test("references exclude property names and ambient globals", () => {
  const lex = L.lexJs("const x = process.env.HOME; obj.alpha = 1;\n");
  const refs = L.referencesOf(lex, lex.statements);
  assert.ok(!refs.has("process"), "ambient globals are not module references");
  assert.ok(!refs.has("alpha"), "a property name is not a reference to a binding");
  assert.ok(!refs.has("env"), "a property name is not a reference to a binding");
});

// ─── verifySplice ──────────────────────────────────────────────────────────────

const CONFIG = "export default {\n  plugins: { tailwindcss: {} },\n};\n";

test("verifySplice removes a padded tail and leaves the rest byte-identical", () => {
  const src = CONFIG + "\n\n\n\n" + "global.x = 1;\n";
  const lex = L.lexJs(src);
  const tail = lex.statements[lex.statements.length - 1];
  const res = L.verifySplice(src, [{ start: tail.start, end: src.length }], { lex });
  assert.equal(res.ok, true, res.reason);
  assert.equal(res.kept, CONFIG, "the padding leaves with the payload");
});

test("verifySplice rejects a range that splits a statement", () => {
  const src = CONFIG + "\nglobal.x = 1;\n";
  const lex = L.lexJs(src);
  const tail = lex.statements[lex.statements.length - 1];
  const res = L.verifySplice(src, [{ start: tail.start + 3, end: src.length }], { lex });
  assert.equal(res.ok, false);
  assert.equal(res.reason, "range-splits-a-statement");
});

test("verifySplice rejects overlapping and out-of-bounds ranges", () => {
  const src = CONFIG + "\nglobal.x = 1;\n";
  assert.equal(L.verifySplice(src, [{ start: 5, end: 3 }]).ok, false, "inverted");
  assert.equal(L.verifySplice(src, [{ start: 0, end: src.length + 10 }]).ok, false, "past EOF");
  const overlap = L.verifySplice(src, [{ start: 0, end: 20 }, { start: 10, end: 30 }]);
  assert.equal(overlap.ok, false);
  assert.equal(overlap.reason, "ranges-overlap");
});

test("verifySplice refuses to empty a file or to drop its last export", () => {
  const src = CONFIG;
  const lex = L.lexJs(src);
  const all = { start: lex.statements[0].start, end: src.length };
  assert.equal(L.verifySplice(src, [all], { lex }).reason, "would-empty-file");

  const src2 = CONFIG + "\nglobal.x = 1;\n";
  const lex2 = L.lexJs(src2);
  const res = L.verifySplice(
    src2,
    [{ start: lex2.statements[0].start, end: lex2.statements[0].end }],
    { lex: lex2, expectExport: true },
  );
  assert.equal(res.ok, false);
  assert.equal(res.reason, "no-export-remains");
});

test("verifySplice removes a prepended shim together with an appended tail", () => {
  const shim =
    "import { createRequire } from 'module';\nconst require = createRequire(import.meta.url);\n";
  const src = shim + "\n" + CONFIG + "\n\n\n" + "global.x = require('node:http');\n";
  const lex = L.lexJs(src);
  const first = lex.statements[0];
  const second = lex.statements[1];
  const configStart = lex.statements[2].start;
  const tail = lex.statements[lex.statements.length - 1];
  const res = L.verifySplice(
    src,
    [
      { start: first.start, end: second.end },
      { start: tail.start, end: src.length },
    ],
    { lex, expectExport: true },
  );
  assert.equal(res.ok, true, res.reason);
  assert.equal(res.kept, CONFIG, "shim, padding and payload all leave; the config is untouched");
  assert.ok(configStart > 0, "the config really did start after the shim");
});
