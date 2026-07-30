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
// legitimate `export default` / `module.exports`. A variant is "content
// confirmed" only when its unique `signature` AND at least one of its numeric
// `seeds` are present — never on a bare `global[...]` substring (which appears
// in plenty of legitimate code). `startRe` locates the first byte of the
// appended blob so the remediator can strip exactly from there to EOF.

export const JS_VARIANTS = [
  {
    id: "original",
    label: "PolinRider payload (original variant)",
    confidence: "high",
    signature: "rmcej%otb%", // appears as ("rmcej%otb%",2857687)
    decoder: "_$_1e42",
    seeds: ["2857687", "2667686"],
    startRe: /global\s*\[\s*(['"])!\1\s*\]\s*=/,
  },
  {
    id: "rotated",
    label: "PolinRider payload (rotated variant)",
    confidence: "high",
    signature: "Cot%3t=shtP",
    decoder: "MDy",
    seeds: ["1111436", "3896884"],
    startRe: /global\s*\[\s*(['"])_V\1\s*\]\s*=/,
  },
];

// Marks the end of legitimate code; the payload is appended after the LAST one.
export const EXPORT_MARKER_RE = /(?:export\s+default|module\.exports)/g;

// Low-confidence heuristic for UNKNOWN future variants. When an obfuscated blob
// is appended after the exports, we flag it for MANUAL REVIEW only — never an
// automatic strip (avoids damaging legitimate-but-unusual code).
export const GENERIC_HEURISTIC = {
  globalAssignRe: /global\s*\[\s*(['"]).{1,12}?\1\s*\]\s*=/,
  obfArrayRe: /\bvar\s+_\$?_?[A-Za-z0-9$_]+\s*=\s*\[/, // e.g. var _$_1e42=[...]
  evalRe: /\beval\s*\(/,
};

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
