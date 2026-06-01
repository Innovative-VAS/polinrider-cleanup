// Probe run in a child process so the safety guards don't pollute the main test
// runner. Importing safety.js installs the guards as a side effect. Exits 0 only
// if every escape hatch is blocked.
import "../src/safety.js";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

assert.throws(() => globalThis.eval("1+1"), /disabled|disallow/i, "direct eval not blocked");
const indirect = eval;
assert.throws(() => indirect("1+1"), "indirect eval not blocked");
assert.throws(() => new Function("return 1"), "Function constructor not blocked");
assert.throws(() => function () {}.constructor("return 1"), "fn.constructor not blocked");
assert.throws(() => require("node:vm"), "require(node:vm) not blocked");
assert.throws(() => require("vm"), "require(vm) not blocked");
assert.throws(() => process.binding("spawn_sync"), "process.binding not blocked");

console.log("safety-probe OK");
