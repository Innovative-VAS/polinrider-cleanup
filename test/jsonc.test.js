import { test, after } from "node:test";
import assert from "node:assert/strict";
import { parseJsonc, getMember, removeArrayElements } from "../src/jsonc.js";
import { cleanupAll } from "./helpers.js";

after(cleanupAll);

test("parses JSONC with line + block comments and trailing commas", () => {
  const text = `{
    // a comment
    "version": "2.0.0", /* inline */
    "tasks": [
      { "label": "a" },
      { "label": "b" }, // trailing comma below
    ],
  }`;
  const r = parseJsonc(text);
  assert.equal(r.ok, true, r.error?.message);
  assert.equal(r.value.version, "2.0.0");
  assert.equal(r.value.tasks.length, 2);
});

test("handles a BOM and comment-like sequences inside strings", () => {
  const text = `﻿{ "url": "http://x/y // not a comment", "n": 1 }`;
  const r = parseJsonc(text);
  assert.equal(r.ok, true, r.error?.message);
  assert.equal(r.value.url, "http://x/y // not a comment");
  assert.equal(r.value.n, 1);
});

test("reports failure (not throw) on malformed input", () => {
  const r = parseJsonc(`{ "a": }`);
  assert.equal(r.ok, false);
  assert.ok(r.error instanceof Error);
});

test("getMember returns the value node for a key", () => {
  const r = parseJsonc(`{ "tasks": [1, 2, 3] }`);
  const node = getMember(r.ast, "tasks");
  assert.equal(node.type, "array");
  assert.equal(node.elements.length, 3);
});

test("removeArrayElements deletes the target element and keeps valid JSON", () => {
  const text = `{
  "version": "2.0.0",
  "tasks": [
    { "label": "build" },
    { "label": "evil" }
  ]
}`;
  const r = parseJsonc(text);
  const arr = getMember(r.ast, "tasks");
  const edited = removeArrayElements(text, arr, [1]);
  const reparsed = parseJsonc(edited);
  assert.equal(reparsed.ok, true, reparsed.error?.message);
  assert.equal(reparsed.value.tasks.length, 1);
  assert.equal(reparsed.value.tasks[0].label, "build");
  assert.equal(reparsed.value.version, "2.0.0");
});

test("removeArrayElements can remove the first element too", () => {
  const text = `{ "tasks": [ { "label": "evil" }, { "label": "keep" } ] }`;
  const r = parseJsonc(text);
  const arr = getMember(r.ast, "tasks");
  const edited = removeArrayElements(text, arr, [0]);
  const reparsed = parseJsonc(edited);
  assert.equal(reparsed.ok, true, reparsed.error?.message);
  assert.deepEqual(reparsed.value.tasks.map((t) => t.label), ["keep"]);
});

test("removeArrayElements handles removing adjacent elements", () => {
  const text = `{ "tasks": [ {"i":0}, {"i":1}, {"i":2}, {"i":3} ] }`;
  const r = parseJsonc(text);
  const arr = getMember(r.ast, "tasks");
  const edited = removeArrayElements(text, arr, [1, 2]);
  const reparsed = parseJsonc(edited);
  assert.equal(reparsed.ok, true, reparsed.error?.message);
  assert.deepEqual(reparsed.value.tasks.map((t) => t.i), [0, 3]);
});
