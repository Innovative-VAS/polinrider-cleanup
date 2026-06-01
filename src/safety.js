/**
 * Runtime safety guards — defense-in-depth so the PolinRider payload can never
 * execute, even if it somehow reaches a code path.
 *
 * This module installs its guards as an IMPORT SIDE EFFECT and MUST be the very
 * first import of the entry point (`src/index.js`). Because ESM hoists imports,
 * "first import line" is sufficient — the guards run before any other module's
 * top-level code.
 *
 * Layering (see the project plan):
 *   • Layer 2 (the V8 flag `--disallow-code-generation-from-strings`, applied by
 *     bin/polinrider.js) is the AUTHORITATIVE block for eval / Function. It is
 *     verified to make eval(), new Function(), and the Async/Generator function
 *     constructors throw EvalError.
 *   • This module is the Layer-3 FALLBACK for when the process is launched
 *     WITHOUT that flag (e.g. `node src/index.js`, or an `import` from a test
 *     runner that wasn't started with the flag). It neutralizes the same escape
 *     hatches in-process, plus `node:vm` and `process.binding`, which the flag
 *     does NOT cover.
 *
 * The real protection is the architectural invariant: target file content is
 * only ever read as an inert string/Buffer and pattern-matched — never passed
 * to require/import/eval/Function/vm/child_process. These guards exist so a
 * mistake can't become an execution.
 */

import Module from "node:module";

const ERR = "PolinRider safety:";

function makeBlocked(what) {
  return function blocked() {
    throw new EvalError(`${ERR} dynamic code generation via ${what} is disabled`);
  };
}

function lockGlobal(name, value) {
  try {
    Object.defineProperty(globalThis, name, {
      value,
      configurable: false,
      writable: false,
      enumerable: false,
    });
    return true;
  } catch {
    return false;
  }
}

// ─── 1. Block eval() (direct and indirect) ─────────────────────────────────────
// Replacing globalThis.eval blocks both `eval(x)` and `(0, eval)(x)`, since both
// resolve the global binding at call time.
lockGlobal("eval", makeBlocked("eval"));

// ─── 2. Block the Function constructor family ──────────────────────────────────
// Preserve Function.prototype so `instanceof`, `.bind`, `.call`, etc. keep
// working; only the string→code construction paths are neutralized.
const RealFunction = Function;
const BlockedFunction = makeBlocked("Function");
try {
  Object.defineProperty(BlockedFunction, "prototype", {
    value: RealFunction.prototype,
    writable: false,
  });
} catch {
  /* prototype already non-configurable on some engines — fine */
}
lockGlobal("Function", BlockedFunction);

// Close the `(function(){}).constructor("code")` escape, plus the async /
// generator equivalents, by pointing each prototype's `.constructor` at the
// blocked stub. Wrapped per-item so one failure can't abort the rest.
function blockConstructorOf(sample) {
  try {
    const proto = Object.getPrototypeOf(sample);
    Object.defineProperty(proto, "constructor", {
      value: BlockedFunction,
      configurable: true,
      writable: true,
    });
  } catch {
    /* ignore */
  }
}
blockConstructorOf(function () {});
blockConstructorOf(async function () {});
blockConstructorOf(function* () {});
blockConstructorOf(async function* () {});

// ─── 3. Block the node:vm module ───────────────────────────────────────────────
// The V8 flag does NOT cover vm.runInNewContext / runInThisContext /
// compileFunction (verified). Reaching vm requires attacker code to already be
// executing — which the allowlist + eval block prevent — but we close the most
// likely path (a malicious CommonJS dependency calling require('vm')).
const originalLoad = Module._load;
Module._load = function patchedLoad(request, ...rest) {
  if (request === "vm" || request === "node:vm") {
    throw new Error(`${ERR} the node:vm module is blocked`);
  }
  return originalLoad.call(this, request, ...rest);
};
// NOTE: dynamic ESM `import('node:vm')` is not interceptable in-process without a
// loader hook (cross-version-fragile on Node 20.0–20.5). Documented residual —
// it is unreachable without already-executing attacker ESM, which the other
// layers prevent.

// ─── 4. Neutralize the legacy process.binding escape hatch ──────────────────────
const blockBinding = function blockedBinding() {
  throw new Error(`${ERR} process.binding is blocked`);
};
for (const key of ["binding", "_linkedBinding"]) {
  try {
    Object.defineProperty(process, key, {
      value: blockBinding,
      configurable: false,
      writable: false,
    });
  } catch {
    /* ignore */
  }
}

/**
 * Diagnostic helper (used by tests and the orchestrator banner). Returns a
 * snapshot of which guards are active and whether the V8 codegen flag is on.
 */
export function hardeningStatus() {
  let evalBlocked = false;
  try {
    // eslint-disable-next-line no-eval
    globalThis.eval("1+1");
  } catch {
    evalBlocked = true;
  }
  return {
    evalBlocked,
    codegenFlag: process.execArgv.includes("--disallow-code-generation-from-strings") ||
      (process.env.NODE_OPTIONS || "").includes("--disallow-code-generation-from-strings"),
    hardenedLaunch: process.env.POLINRIDER_HARDENED === "1",
  };
}
