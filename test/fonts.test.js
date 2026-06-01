import { test, after } from "node:test";
import assert from "node:assert/strict";
import { readMagic, looksSuspicious, collectFontReferences, isReferenced } from "../src/fonts.js";
import { makeRepo, goodFont, evilFont, cleanupAll } from "./helpers.js";

after(cleanupAll);

test("readMagic recognizes common font formats", () => {
  assert.equal(readMagic(Buffer.from("wOF2....")), "woff2");
  assert.equal(readMagic(Buffer.from("wOFF....")), "woff");
  assert.equal(readMagic(Buffer.from("OTTO....")), "otf");
  assert.equal(readMagic(Buffer.from([0x00, 0x01, 0x00, 0x00, 0x00])), "ttf");
  assert.equal(readMagic(Buffer.from("nope....")), "unknown");
});

test("looksSuspicious flags a fake font with bad magic + embedded JS", () => {
  const r = looksSuspicious(evilFont(), ".woff2");
  assert.equal(r.bad, true);
  assert.ok(r.reasons.length >= 1);
});

test("looksSuspicious passes a valid, inert font", () => {
  const r = looksSuspicious(goodFont(), ".woff2");
  assert.equal(r.bad, false, JSON.stringify(r.reasons));
});

test("looksSuspicious does not flag .eot solely for missing magic", () => {
  const eot = Buffer.alloc(64, 0x00); // no recognizable magic, but inert
  assert.equal(looksSuspicious(eot, ".eot").bad, false);
});

test("collectFontReferences + isReferenced detect a referenced font", async () => {
  const repo = await makeRepo({
    "public/fonts/inter.woff2": goodFont(),
    "src/styles.css": `@font-face{font-family:Inter;src:url('/fonts/inter.woff2') format('woff2');}`,
    "public/fonts/orphan.woff2": goodFont(),
  });
  const hay = await collectFontReferences(repo);
  assert.equal(isReferenced(hay, "public/fonts/inter.woff2"), true);
  assert.equal(isReferenced(hay, "public/fonts/orphan.woff2"), false);
});
