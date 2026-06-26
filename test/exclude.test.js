import { test } from "node:test";
import assert from "node:assert/strict";
import { buildExcluder } from "../src/exclude.js";

test("empty patterns → nothing excluded", () => {
  const ex = buildExcluder("");
  assert.equal(ex("anything.js"), false);
  assert.equal(buildExcluder([])("a/b.js"), false);
  assert.equal(buildExcluder(undefined)("a/b.js"), false);
});

test("exact file match", () => {
  const ex = buildExcluder(["src/signatures.js"]);
  assert.equal(ex("src/signatures.js"), true);
  assert.equal(ex("src/scanner.js"), false);
  assert.equal(ex("other/src/signatures.js"), false);
});

test("bare directory matches everything under it", () => {
  const ex = buildExcluder(["dist"]);
  assert.equal(ex("dist"), true);
  assert.equal(ex("dist/ci.mjs"), true);
  assert.equal(ex("dist/nested/x.js"), true);
  assert.equal(ex("distinct.js"), false); // prefix must be a path boundary
});

test("trailing slash and ** behave like a directory", () => {
  for (const pat of ["test/", "test/**"]) {
    const ex = buildExcluder([pat]);
    assert.equal(ex("test/helpers.js"), true, pat);
    assert.equal(ex("test/sub/a.js"), true, pat);
    assert.equal(ex("tests.js"), false, pat);
  }
});

test("single * stays within a path segment", () => {
  const ex = buildExcluder(["*.min.js"]);
  assert.equal(ex("app.min.js"), true);
  assert.equal(ex("vendor/app.min.js"), false); // * does not cross "/"
  assert.equal(buildExcluder(["vendor/*.js"])("vendor/a.js"), true);
  assert.equal(buildExcluder(["vendor/*.js"])("vendor/sub/a.js"), false);
});

test("comma/newline separated string + whitespace", () => {
  const ex = buildExcluder("src/signatures.js, test/** \n dist/**");
  assert.equal(ex("src/signatures.js"), true);
  assert.equal(ex("test/helpers.js"), true);
  assert.equal(ex("dist/ci.mjs"), true);
  assert.equal(ex("src/scanner.js"), false);
});

test("** crosses path segments", () => {
  const ex = buildExcluder(["**/fixtures/**"]);
  assert.equal(ex("a/b/fixtures/c.js"), true);
  assert.equal(ex("fixtures/c.js"), false); // leading **/ requires a segment before
  assert.equal(buildExcluder(["**/fixtures/**", "fixtures/**"])("fixtures/c.js"), true);
});
