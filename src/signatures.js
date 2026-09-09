/**
 * PolinRider indicator-of-compromise (IOC) catalog.
 *
 * This module is PURE DATA plus a few side-effect-free helpers. It performs
 * NO file I/O, NO network access, and NEVER executes any string. Detection and
 * remediation logic lives in scanner.js / remediator.js and consumes these.
 *
 * Update this file as the malware rotates its signatures — it is the single
 * source of truth that scanner, remediator, and the tests all read from.
 */

// ─── JS payload variants ──────────────────────────────────────────────────────
//
// PolinRider appends one obfuscated blob to the END of a file, after the last
// legitimate export.
//
// These entries no longer DETECT anything: detection is structural (see the
// position/capability/form model below), which is what lets a rotated payload
// be caught at all. A signature match now does two things only — it LABELS the
// finding with the variant's name, and it exempts the finding from the
// certainty floors, because a match is positive identification rather than an
// inference. Adding a new variant here is optional, not required.

export const JS_VARIANTS = [
  {
    id: "original",
    label: "PolinRider payload (original variant)",
    confidence: "high",
    signature: "rmcej%otb%", // appears as ("rmcej%otb%",2857687)
    decoder: "_$_1e42",
    seeds: ["2857687", "2667686"],
  },
  {
    id: "rotated",
    label: "PolinRider payload (rotated variant)",
    confidence: "high",
    signature: "Cot%3t=shtP",
    decoder: "MDy",
    seeds: ["1111436", "3896884"],
  },
];

export const JS_EXTENSIONS = [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"];

// Config files PolinRider is documented to target. Used for labeling/priority;
// the scanner sweeps all JS/TS files regardless (content-confirmed = no FPs).
export const CONFIG_FILES = [
  "postcss.config.mjs",
  "postcss.config.js",
  "tailwind.config.js",
  "eslint.config.mjs",
  "next.config.mjs",
  "next.config.ts",
  "babel.config.js",
  "jest.config.js",
];

// ─── .vscode task/launch weaponization ─────────────────────────────────────────
//
// Malicious tasks fetch a remote script and pipe it to a shell, often auto-run
// via runOptions.runOn = "folderOpen". Legitimate tasks run LOCAL commands
// (npm run build, tsc, etc.) and are never flagged.

export const C2_HOSTS = [
  "default-configuration.vercel.app",
  "vscode-settings-bootstrap.vercel.app",
  "vscode-settings-config.vercel.app",
  "vscode-bootstrapper.vercel.app",
  "vscode-load-config.vercel.app",
  "260120.vercel.app",
];

// Broader patterns for sibling C2 domains in the same family.
export const C2_HOST_RES = [
  /vscode-settings-[a-z0-9-]*\.vercel\.app/i,
  /vscode-[a-z0-9-]*(?:config|bootstrap|loader?)[a-z0-9-]*\.vercel\.app/i,
];

// A remote fetch (downloads code from the network).
export const NET_FETCH_RES = [
  /\bcurl\b/i,
  /\bwget\b/i,
  /\bInvoke-WebRequest\b/i,
  /\biwr\b/i,
  /\bNew-Object\s+Net\.WebClient/i,
  /\bDownloadString\b/i,
];

// Piping/handing fetched bytes to an interpreter (executes downloaded code).
export const PIPE_SHELL_RES = [
  /\|\s*(?:bash|sh|zsh|dash)\b/i,
  /\b(?:bash|sh|zsh|dash)\s+-c\b/i,
  /\bIEX\b/i, // PowerShell Invoke-Expression
  /\bInvoke-Expression\b/i,
  /\bnode\b\s+-e\b/i,
  /\beval\b/i,
];

export const ANY_URL_RE = /https?:\/\/[^\s"'`)]+/i;

// A raw script interpreter (as opposed to a package-manager wrapper like npm).
export const INTERPRETER_RE =
  /\b(?:node|deno|bun|python3?|ruby|php|osascript|bash|sh|zsh|dash|pwsh|powershell|cmd)\b/i;

// Running an interpreter against an asset/font path — never legitimate. This is
// the real PolinRider .vscode vector: a folderOpen task does `node ./public/fonts/x.woff2`.
export const ASSET_EXEC_RE =
  /(?:public[\\/]+fonts|[\\/]fonts[\\/]|\bstatic[\\/]|\bassets[\\/])|\.(?:woff2?|ttf|eot|otf)\b/i;

// ─── Font payload carrier ──────────────────────────────────────────────────────
//
// A font dropped into public/fonts that no CSS/HTML/JS references AND whose
// bytes don't look like a real font (bad magic) or contain JS-like strings.

export const FONT_EXTENSIONS = [".woff2", ".woff", ".ttf", ".otf", ".eot", ".ttc"];

// First 4 bytes of a legitimate font file, keyed by format.
export const FONT_MAGIC = {
  woff2: [0x77, 0x4f, 0x46, 0x32], // wOF2
  woff: [0x77, 0x4f, 0x46, 0x46], // wOFF
  otf: [0x4f, 0x54, 0x54, 0x4f], // OTTO
  ttf: [0x00, 0x01, 0x00, 0x00],
  ttc: [0x74, 0x74, 0x63, 0x66], // ttcf
  true: [0x74, 0x72, 0x75, 0x65], // 'true' (legacy TrueType)
  eot: null, // EOT has no single stable magic; treat presence-only
};

// Code-execution strings that should NEVER appear in a real font file. These are
// the signal that an unparseable "font" is actually an appended JS payload.
//
// NOTE: plain URLs and long base64-looking runs are deliberately NOT here — real
// fonts legitimately embed license/vendor URLs in their `name` table, and binary
// glyph data trivially produces long [A-Za-z0-9+/] runs. Both caused false
// positives on genuine fonts (e.g. commercial .otf files). Structural validation
// in fonts.js is the primary "is this a real font?" signal now; these strings only
// corroborate a file that already failed to parse as a font.
export const FONT_BADNESS_RES = [
  /eval\s*\(/,
  /global\s*\[/,
  /require\s*\(/,
  /child_process/,
  /process\.(?:env|binding)/,
  /function\s*\(/,
  /\bnode\b\s+-e\b/,
];

// PolinRider disguises its font carrier under Font-Awesome filenames (the exact
// names real Font Awesome ships: fa-brands-400, fa-solid-900, fa-regular-400, …).
// Presence of these names is a disguise indicator; content (see fonts.js) decides
// whether a given file is an actual payload or just a legitimate Font Awesome font.
export const FA_FONT_NAME_RE =
  /^fa-(?:brands|solid|regular|light|thin|duotone)-\d+\.(?:eot|svg|ttf|otf|woff2?)$/i;

// Files the malware drops alongside its font carrier that should go with it.
export const FONT_DROP_SIDECARS = ["readme.md"];

// Directories where the font-carrier variant is dropped.
export const FONT_DIRS = ["public/fonts", "static", "static/fonts", "assets/fonts", "src/assets/fonts"];

// File types that can reference a font via @font-face / url(...) / import.
export const FONT_REF_EXTENSIONS = [
  ".css",
  ".scss",
  ".sass",
  ".less",
  ".styl",
  ".html",
  ".htm",
  ".vue",
  ".svelte",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
  ".json",
];

// ─── package.json impostor dependencies ────────────────────────────────────────

export const IMPOSTOR_DEPS = [
  "tailwindcss-style-animate",
  "tailwind-mainanimation",
  "tailwind-autoanimation",
];

// Lifecycle scripts that fetch + execute remote code during `npm install`.
export const SUSPICIOUS_LIFECYCLE_SCRIPTS = ["preinstall", "install", "postinstall"];

// ─── Standalone artifacts ───────────────────────────────────────────────────────

export const ARTIFACT_FILES = [
  "temp_auto_push.bat",
  "temp_interactive_push.bat",
  "config.bat",
  "branch_structure.json",
];

// Lines PolinRider injects into .gitignore to hide its own artifacts from git.
export const GITIGNORE_INJECTED = [
  "config.bat",
  "temp_auto_push.bat",
  "temp_interactive_push.bat",
  "branch_structure.json",
];

export const ENV_PATTERNS = [
  ".env",
  ".env.local",
  ".env.*.local",
  ".env.production",
  ".env.development",
];

// ─── Helpers (pure) ─────────────────────────────────────────────────────────────

/** True if `host` matches any known C2 host or family regex. */
export function isC2Host(text) {
  if (typeof text !== "string") return false;
  if (C2_HOSTS.some((h) => text.includes(h))) return true;
  return C2_HOST_RES.some((re) => re.test(text));
}

/** True if `text` looks like a remote-fetch-piped-to-interpreter command. */
export function isFetchToShell(text) {
  if (typeof text !== "string") return false;
  const fetches = NET_FETCH_RES.some((re) => re.test(text)) || ANY_URL_RE.test(text);
  const pipes = PIPE_SHELL_RES.some((re) => re.test(text));
  return fetches && pipes;
}

/** True if `text` runs a script interpreter against a font/asset path (e.g. `node ./public/fonts/x.woff2`). */
export function commandExecutesAsset(text) {
  if (typeof text !== "string") return false;
  return INTERPRETER_RE.test(text) && ASSET_EXEC_RE.test(text);
}

/** True if `basename` matches the Font-Awesome family naming the malware disguises itself as. */
export function isFaFamilyName(basename) {
  return typeof basename === "string" && FA_FONT_NAME_RE.test(basename);
}

/** True if `basename` is a sidecar file the malware drops with its font carrier (e.g. README.md). */
export function isFontDropSidecar(basename) {
  return typeof basename === "string" && FONT_DROP_SIDECARS.includes(basename.toLowerCase());
}

// ═══════════════════════════════════════════════════════════════════════════════
// Structural payload detection: position + capability + form
// ═══════════════════════════════════════════════════════════════════════════════
//
// The malware rotates its signature strings, so the JS_VARIANTS catalog above is
// used only to LABEL a finding, never to decide whether one exists. Detection
// rests on three things the attacker cannot drop without breaking the payload:
//
//   POSITION    it must run on module load without disturbing the real export,
//               so it lands outside the file's legitimate region.
//   CAPABILITY  it must reach the network and spawn processes, or it earns nothing.
//   FORM        it is machine-generated, not hand-written.
//
// Position is a NECESSARY gate and capability is the CONFIRMING gate: capability
// evidence inside a file's normal body is never a finding on its own.
//
// Everything below is pure data. It lives here because this is the only src file
// excluded from the CI self-scan (see .github/workflows/ci.yml) — detection logic
// modules (jslex.js, capability.js) must contain NO literal IOC tokens, or the
// tool flags its own source. test/selfscan.test.js enforces that.

/**
 * Recognizes a statement that exports something. Matched ANCHORED against one
 * top-level statement's CODE VIEW (string/template/comment contents blanked), so
 * an `export default` inside a comment or string can never be mistaken for the
 * real boundary — the bug that made the old raw-text EXPORT_MARKER_RE evadable.
 */
export const EXPORT_STATEMENT_RE =
  /^(?:export\b|module\s*\.\s*exports\b|exports\s*\.\s*[A-Za-z_$][\w$]*\s*=|Object\s*\.\s*defineProperty\s*\(\s*exports\b)/;

// ─── Capability: risky module specifiers ────────────────────────────────────────
//
// Node core modules whose mere USE is a capability. Matched by EXACT specifier
// equality (with or without the `node:` prefix) against specifiers that jslex.js
// extracts structurally from the token stream — never by regex over text. A regex
// for "http" over string contents would match inside every https:// URL; exact
// specifier matching cannot.
//
// fs / path / url / os are deliberately ABSENT: config files use them constantly.

export const RISKY_MODULES = new Map([
  ["child_process", { weight: 3, group: "proc", label: "spawns OS subprocesses" }],
  ["http", { weight: 3, group: "net", label: "raw HTTP client" }],
  ["https", { weight: 3, group: "net", label: "raw HTTPS client" }],
  ["net", { weight: 3, group: "net", label: "raw TCP sockets" }],
  ["tls", { weight: 3, group: "net", label: "raw TLS sockets" }],
  ["dgram", { weight: 3, group: "net", label: "UDP sockets" }],
  ["dns", { weight: 3, group: "net", label: "DNS resolution" }],
  ["vm", { weight: 3, group: "dyncode", label: "runs code in a VM context" }],
  ["worker_threads", { weight: 2, group: "proc", label: "spawns worker threads" }],
  ["zlib", { weight: 2, group: "obf", label: "decompresses embedded blobs" }],
]);

// ─── Capability: behavioural rules ──────────────────────────────────────────────
//
// view:  "code"     → the code view (literal contents AND comments blanked)
//        "literals" → string/template CONTENTS only
//        "any"      → code ∪ literals
//        There is deliberately NO "comments" or "raw" view: a token mentioned in
//        prose can never score. This is what keeps the doc comments in fonts.js
//        and index.js — which quote `global['!']=…; require(…); eval(…)` — at zero.
//
// weight: 3 = process / network / dynamic-code primitive
//         2 = drainer- or obfuscation-specific
//         1 = weak corroboration (also marked `weak`, see below)
//         0 = member of a pair rule; never scores alone
//
// group:  at most ONE hit per group is counted, so http+https+net scores 3 rather
//         than 9. This makes `score` mean "how many distinct dangerous things it
//         does" and makes the `distinct` diversity metric meaningful.
//
// weak:   contributes to `score` but NOT to `distinct`, so a high-false-positive
//         corroborator can never satisfy the diversity floor on its own.
//
// requires: pair rule — every member must hit within the SAME top-level statement.
//
// wholeLiteral: tested against each string literal's full contents, not as a
//         substring, which is what keeps a date like "12-2024-1" from matching a
//         campaign id.

export const CAPABILITY_RULES = [
  // ── weight 3: primitives ──
  {
    id: "proc.exec",
    weight: 3,
    group: "proc",
    view: "code",
    label: "executes a shell command",
    re: /\b(?:execSync|execFileSync|execFile|spawnSync|spawn|fork)\s*\(/,
  },
  {
    id: "net.request",
    weight: 3,
    group: "net",
    view: "code",
    label: "issues a raw outbound request",
    re: /\.\s*(?:request|createConnection)\s*\(|\bnew\s+[A-Za-z_$][\w$]*\s*\.\s*Agent\b/,
  },
  {
    id: "code.dynamic",
    weight: 3,
    group: "dyncode",
    view: "code",
    label: "generates code from a string",
    re: /\beval\s*\(|\bnew\s+Function\s*\(/,
  },
  {
    id: "code.vm",
    weight: 3,
    group: "dyncode",
    view: "code",
    label: "compiles code via the vm module",
    re: /\b(?:runInNewContext|runInThisContext|compileFunction)\s*\(/,
  },

  // ── weight 3: injector markers (the highest-precision rules available) ──
  //
  // Legitimate code has no reason to stash require/module on the global object.
  // Polyfills do `global.fetch = …`; they never do `global.r = require`.
  {
    id: "marker.global-require",
    weight: 3,
    group: "marker",
    view: "code",
    label: "stashes require/module on the global object",
    re: /\bglobal(?:This)?\s*\.\s*[A-Za-z_$][\w$]{0,3}\s*=\s*(?:require|module)\b/,
  },

  // ── weight 2: drainer / obfuscation specifics ──
  {
    id: "marker.global-beacon",
    weight: 2,
    group: "marker",
    view: "code",
    label: "assigns a short opaque id to a global",
    // Matched on the code view, where a literal keeps its quotes but its contents
    // are blanked to spaces — so the shape still matches without the value leaking.
    re: /\bglobal\s*(?:\.\s*[A-Za-z_$][\w$]{0,3}|\[\s*(['"])[^'"]{1,12}\1\s*\])\s*=\s*(['"])[^'"]{1,24}\2/,
  },
  {
    id: "marker.campaign-id",
    weight: 2,
    group: "marker",
    view: "literals",
    wholeLiteral: true,
    label: "campaign identifier string",
    re: /^[A-Z]?\d{1,2}-\d{3,6}-\d{1,3}$/,
  },
  {
    id: "obf.string-array",
    weight: 2,
    group: "obf",
    view: "code",
    label: "string-array obfuscator table",
    re: /\bvar\s+_\$?_?[A-Za-z0-9$]{2,}\s*=\s*\[|\b_0x[0-9a-f]{4,}\s*=\s*\[/,
  },
  {
    id: "obf.zlib-call",
    weight: 2,
    group: "obf",
    view: "code",
    label: "decompresses a response body",
    re: /\bcreate(?:Gunzip|Unzip|Inflate(?:Raw)?|BrotliDecompress)\s*\(|\b(?:gunzip|inflate|brotliDecompress)(?:Sync)?\s*\(/,
  },
  {
    id: "chain.wallet",
    weight: 2,
    group: "chain",
    view: "literals",
    label: "embeds a 20-byte hex address (wallet)",
    re: /(?:^|[^0-9a-fA-Fx])0x[0-9a-fA-F]{40}(?![0-9a-fA-F])/,
  },
  {
    id: "chain.rpc-method",
    weight: 2,
    group: "chain",
    view: "literals",
    label: "calls Ethereum JSON-RPC methods",
    re: /\beth_[a-z][a-zA-Z]{3,}\b/,
  },
  {
    id: "chain.jsonrpc",
    weight: 2,
    group: "chain",
    view: "literals",
    label: "JSON-RPC envelope",
    re: /\bjsonrpc\b/,
  },
  {
    // Set structurally by jslex specifier extraction, not by regex: a specifier
    // written with \x / \u escapes or string concatenation is itself evidence.
    id: "obf.spec-escape",
    weight: 2,
    group: "obf",
    view: null,
    label: "module specifier hidden behind escapes or concatenation",
  },

  // ── pair rules ──
  {
    id: "obf.base64-xor",
    weight: 2,
    group: "obf",
    requires: ["_b64", "_xor"],
    label: "base64-decodes then XOR-decrypts a blob",
  },
  { id: "_b64", weight: 0, view: "any", re: /\bbase64\b|\batob\s*\(|\bfromCharCode\s*\(/ },
  {
    id: "_xor",
    weight: 0,
    view: "code",
    re: /\^=\s*[A-Za-z_$][\w$]*\s*(?:\.\s*charCodeAt\s*\(|\[)|\^\s*[A-Za-z_$][\w$]*\s*\.\s*charCodeAt\s*\(/,
  },

  // ── weight 1: corroboration (weak — excluded from the `distinct` count) ──
  //
  // `process.env` beside a URL is everywhere in legitimate code
  // (`const API = process.env.API_URL ?? "https://api.example.com"`), so it may
  // add to the score but must never help satisfy the diversity floor.
  {
    id: "exfil.env-url",
    weight: 1,
    group: "exfil",
    weak: true,
    requires: ["_env", "_url"],
    label: "reads env vars beside a hardcoded outbound URL",
  },
  { id: "_env", weight: 0, view: "code", re: /\bprocess\s*\.\s*env\b/ },
  { id: "_url", weight: 0, view: "literals", re: /\bhttps?:\/\/[A-Za-z0-9.-]+/ },

  {
    id: "evade.user-agent",
    weight: 1,
    group: "evade",
    weak: true,
    view: "literals",
    label: "spoofs a browser User-Agent",
    re: /Mozilla\/5\.0|\bUser-Agent\b/i,
  },
  {
    id: "evade.race",
    weight: 1,
    group: "evade",
    weak: true,
    requires: ["_abort", "_any"],
    label: "races several endpoints with abort",
  },
  { id: "_abort", weight: 0, view: "code", re: /\bAbort(?:Controller|Signal)\b/ },
  { id: "_any", weight: 0, view: "code", re: /\bPromise\s*\.\s*any\s*\(/ },
];

// ─── Capability: variant identifier fingerprints ────────────────────────────────
//
// The rotated drainer variant carries no stable obfuscator string, but its
// SCREAMING_SNAKE constants are distinctive. Counted as whole words in one
// statement's code view. Weight 5 clears the "anywhere" bar single-handedly —
// but still only INSIDE a positional candidate, so a file that legitimately
// mentions all of these outside the payload region reports nothing.

export const VARIANT_IDENT_SETS = [
  {
    id: "drainer-rpc",
    label: "PolinRider payload (RPC drainer variant)",
    weight: 5,
    group: "variant",
    minHits: 3,
    view: "code",
    idents: [
      "BLOCK_MULTIPLE",
      "NONCE_FANOUT",
      "RPC_ENDPOINTS",
      "SEARCH_FLOOR",
      "INDEXER_URL",
      "linkAbort",
      "ETH_RPC_URL",
    ],
  },
];

// ─── Position: idiomatic post-export tails ──────────────────────────────────────
//
// "Run if invoked directly", HMR acceptors, custom-element registration. Applied
// as a TIE-BREAKER ONLY: a statement is exempt from candidacy only while its own
// capability score is below VERDICT_THRESHOLDS.configCapability, so malware
// cannot buy immunity by wrapping its payload in a main-guard.

export const BENIGN_TAIL_RES = [
  /\bimport\s*\.\s*meta\s*\.\s*(?:url|main)\b/,
  /\brequire\s*\.\s*main\s*===\s*module\b/,
  /\bmodule\s*===\s*require\s*\.\s*main\b/,
  /\bimport\s*\.\s*meta\s*\.\s*hot\b|\bmodule\s*\.\s*hot\b/,
  /\bcustomElements\s*\.\s*define\s*\(/,
  /\bself\s*\.\s*addEventListener\s*\(/,
  /\bprocess\s*\.\s*on\s*\(/,
];

// ─── Position: prepended shims ──────────────────────────────────────────────────
//
// Helper statements the injector PREPENDS so its CommonJS payload can run inside
// an ESM file. Matched against a whitespace-normalized WHOLE statement (anchored),
// and removed only when nothing surviving references what they introduce AND a
// payload statement does.

export const PAYLOAD_SHIMS = [
  {
    id: "shim.createRequire-import",
    introduces: ["createRequire"],
    re: /^import\s?\{\s?createRequire\s?\}\s?from\s?['"](?:node:)?module['"]\s?;?$/,
  },
  {
    id: "shim.createRequire-const",
    introduces: ["require"],
    re: /^(?:const|let|var)\s\S*require\s?=\s?createRequire\s?\(\s?import\s?\.\s?meta\s?\.\s?url\s?\)\s?;?$/,
  },
];

// ─── Form: is this machine-generated? ───────────────────────────────────────────
//
// Deliberately NOT included: a blank-line-padding rule (padding is already a
// POSITIONAL flag, and scoring it twice would let padding alone satisfy the form
// floor) and any entropy/Shannon metric (minified and obfuscated JS have
// indistinguishable entropy — a tunable with no discriminating power).

export const FORM_RULES = {
  // First matching tier wins.
  longLine: [
    { chars: 2000, weight: 2, label: "a single line over 2000 characters" },
    { chars: 400, weight: 1, label: "a single line over 400 characters" },
  ],
  noComments: { minBytes: 800, weight: 1, label: "no comments in a large region" },
  punctDense: { min: 0.55, weight: 1, label: "dense punctuation (minified)" },
  // The absolute floors matter: a bare ratio would fire on any tiny file.
  byteShare: {
    minFileBytes: 400,
    minRegionBytes: 500,
    min: 0.5,
    weight: 1,
    label: "region is most of the file",
  },
  identObfuscated: {
    minIdents: 20,
    min: 0.5,
    weight: 1,
    label: "mostly single-character identifiers",
  },
  singleStatementBulk: {
    minBytes: 2000,
    weight: 1,
    label: "one enormous statement",
  },
};

// ─── Verdict thresholds ─────────────────────────────────────────────────────────
//
// minDistinct and minForm are FLOORS on auto-strip, not on detection. They can
// only move an outcome from confirmed to manual-review, never the reverse, so
// they cannot introduce a false positive by construction. Both are calibrated
// against real files in this repo:
//
//   minDistinct  ci.js ends with `if (invokedDirectly) { run()… }` AFTER its last
//                export. A config file shaped like that calling execSync scores
//                capability 3 / distinct 1 — without this floor the bare
//                `isConfig && cap >= 3` rule would auto-strip a legitimate
//                main-guard.
//   minForm      A hand-written post-export dev block using node:http scores
//                capability 4 / distinct 2 / form 0, clearing both the config
//                threshold and the diversity floor. Only the form floor stops it.
//                Hand-written code is formatted; injected payloads are minified.

export const VERDICT_THRESHOLDS = {
  configCapability: 3,
  anywhereCapability: 5,
  capabilityWithForm: { capability: 3, form: 2 },
  reviewCapability: 1,
  reviewForm: 3,
  minDistinct: 2,
  minForm: 1,
  // Files with no export boundary at all, and files jslex cannot tokenize, have
  // no position gate — they are reportable only at a deliberately high bar, and
  // are NEVER auto-stripped. bin/polinrider.js has no export and scores
  // capability ~7 with form 0; the form conjunct is what keeps it clean.
  noAnchor: { capability: 6, form: 2 },
  unlexable: { capability: 6, form: 2 },
};

// ─── Config basenames (matched at ANY depth) ────────────────────────────────────
//
// The reported infection was packages/ui/postcss.config.mjs, not ./postcss.config.mjs,
// so matching is on the BASENAME regardless of directory depth.

const CONFIG_STEMS = [
  "postcss.config", "tailwind.config", "windi.config", "uno.config", "panda.config",
  "next.config", "nuxt.config", "svelte.config", "astro.config", "remix.config",
  "vite.config", "vitest.config", "rollup.config", "webpack.config", "metro.config",
  "babel.config", "jest.config", "jest.setup", "karma.conf", "tsup.config",
  "esbuild.config", "playwright.config", "cypress.config", "wdio.conf",
  "eslint.config", ".eslintrc", "prettier.config", ".prettierrc",
  "stylelint.config", "commitlint.config", "lint-staged.config",
  "drizzle.config", "knex.config", "knexfile", "prisma.config",
  "gatsby-config", "gatsby-node", "gatsby-browser", "gatsby-ssr",
  "expo.config", "app.config", "capacitor.config", "ecosystem.config",
  "release.config", "graphql.config", "sanity.config", "sanity.cli",
  "payload.config", "orval.config", "knip.config", "nx.config",
  "middleware", "instrumentation",
  "sentry.client.config", "sentry.server.config", "sentry.edge.config",
];

const CONFIG_EXTS = [".js", ".cjs", ".mjs", ".jsx", ".ts", ".mts", ".cts", ".tsx"];

export const CONFIG_BASENAMES = new Set(
  CONFIG_STEMS.flatMap((stem) => CONFIG_EXTS.map((ext) => stem + ext)),
);

/** Catch-all for `<anything>.config|conf|rc.<jsext>` not enumerated above. */
export const CONFIG_BASENAME_RE = /^\.?[\w.-]*\.?(?:config|conf|rc)\.(?:[cm]?[jt]sx?)$/i;

/** True if `p`'s BASENAME is a build/tool config the malware targets, at any depth. */
export function isConfigBasename(p) {
  const base = String(p || "").replace(/\\/g, "/").split("/").pop() || "";
  return CONFIG_BASENAMES.has(base) || CONFIG_BASENAME_RE.test(base);
}
