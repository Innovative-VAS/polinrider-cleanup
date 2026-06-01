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

// JS-like strings that should NEVER appear in a real binary font file.
export const FONT_BADNESS_RES = [
  /eval\s*\(/,
  /global\s*\[/,
  /require\s*\(/,
  /child_process/,
  /process\.(?:env|binding)/,
  /https?:\/\//,
  /function\s*\(/,
  /\bnode\b\s+-e\b/,
];

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
];

export const GITIGNORE_INJECT = "config.bat";

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
