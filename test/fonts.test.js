import { test, after } from "node:test";
import assert from "node:assert/strict";
import { readMagic, parseFontStructure, looksSuspicious, collectFontReferences, isReferenced } from "../src/fonts.js";
import { makeRepo, goodFont, evilFont, validSfnt, validWoff2, REAL_FONT_STRINGS, cleanupAll } from "./helpers.js";

after(cleanupAll);

test("readMagic recognizes common font formats", () => {
  assert.equal(readMagic(Buffer.from("wOF2....")), "woff2");
  assert.equal(readMagic(Buffer.from("wOFF....")), "woff");
  assert.equal(readMagic(Buffer.from("OTTO....")), "otf");
  assert.equal(readMagic(Buffer.from([0x00, 0x01, 0x00, 0x00, 0x00])), "ttf");
  assert.equal(readMagic(Buffer.from("nope....")), "unknown");
});

test("parseFontStructure accepts a well-formed sfnt and woff2", () => {
  assert.equal(parseFontStructure(validSfnt()).valid, true);
  assert.equal(parseFontStructure(validWoff2()).valid, true);
});

test("parseFontStructure rejects unknown magic and malformed headers", () => {
  assert.equal(parseFontStructure(Buffer.from("global['!']=1;")).valid, false);
  // wOF2 magic but a declared length that doesn't match the byte length:
  const badWoff2 = Buffer.concat([Buffer.from("wOF2", "latin1"), Buffer.alloc(256, 0x10)]);
  assert.equal(parseFontStructure(badWoff2).valid, false);
  // OTTO magic but a table directory that runs past EOF:
  const badSfnt = Buffer.alloc(16);
  badSfnt.write("OTTO", 0, "latin1");
  badSfnt.writeUInt16BE(50, 4); // 50 tables can't fit in 16 bytes
  assert.equal(parseFontStructure(badSfnt).valid, false);
});

test("looksSuspicious flags a fake font with a JS payload as a confirmed carrier", () => {
  const r = looksSuspicious(evilFont(), ".woff2");
  assert.equal(r.bad, true);
  assert.equal(r.hasCodeStrings, true);
  assert.ok(r.reasons.length >= 1);
});

test("looksSuspicious passes a valid, inert font", () => {
  const r = looksSuspicious(goodFont(), ".woff2");
  assert.equal(r.bad, false, JSON.stringify(r.reasons));
});

test("looksSuspicious does NOT flag a real font that embeds a license URL + base64-like run", () => {
  // Regression: a genuine .otf (valid OTTO structure) whose name table holds a
  // vendor URL, plus binary glyph data that looks base64-ish, must stay clean.
  const r = looksSuspicious(validSfnt(REAL_FONT_STRINGS), ".otf");
  assert.equal(r.bad, false, JSON.stringify(r.reasons));
  assert.equal(r.hasCodeStrings, false);
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
