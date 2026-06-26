/**
 * Bundle the GitHub Action entrypoint (src/ci.js) into a single self-contained
 * dist/ci.mjs that the action runner executes with no install step.
 *
 * The banner shims `require`/`__dirname`/`__filename` because some transitive
 * CJS deps of execa (e.g. cross-spawn) call `require('child_process')`, which
 * does not exist in an ESM bundle without this.
 */
import { build } from "esbuild";

const banner = [
  "import { createRequire as __createRequire } from 'node:module';",
  "import { fileURLToPath as __fileURLToPath } from 'node:url';",
  "import { dirname as __pathDirname } from 'node:path';",
  "const require = __createRequire(import.meta.url);",
  "const __filename = __fileURLToPath(import.meta.url);",
  "const __dirname = __pathDirname(__filename);",
].join("\n");

await build({
  entryPoints: ["src/ci.js"],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  outfile: "dist/ci.mjs",
  banner: { js: banner },
  legalComments: "none",
});

console.log("built dist/ci.mjs");
