/**
 * PolinRider detection. Produces a structured Findings report consumed by the
 * remediator and the reporter. PURE with respect to the target repo: it only
 * reads files (as inert text/bytes) and pattern-matches. It never executes
 * target content, spawns processes, or makes network calls.
 *
 * Detection is CONTENT-CONFIRMED: a repo is marked `infected` only when a known
 * signature / IOC actually matches. The mere co-presence of tasks.json +
 * launch.json + public/fonts raises `coPresenceAmplified` (a reporting hint) but
 * never, on its own, marks a repo infected or produces a removable finding.
 *
 * @typedef {Object} Finding
 * @property {string} id
 * @property {'js'|'vscode'|'font'|'package'|'artifact'|'gitignore'} category
 * @property {string} file                 repo-relative path
 * @property {'high'|'low'} confidence
 * @property {'strip-js-payload'|'edit-vscode'|'delete-font'|'remove-font-set'|'remove-dir'|'remove-artifact'|'fix-gitignore'|'manual-review'} action
 * @property {boolean} contentConfirmed    true only when a known signature matched
 * @property {string} description
 * @property {Object} [edit]               action parameters for the remediator
 *
 * @typedef {Object} Findings
 * @property {string} repoDir
 * @property {'clean'|'suspicious'|'infected'} severity
 * @property {boolean} hasContentConfirmed
 * @property {boolean} coPresenceAmplified
 * @property {Finding[]} findings
 * @property {string[]} manualReview
 */

import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import * as sig from "./signatures.js";
import { parseJsonc, getMember } from "./jsonc.js";
import { collectByExtension } from "./walk.js";
import { looksSuspicious, collectFontReferences, isReferenced } from "./fonts.js";
import { buildExcluder } from "./exclude.js";

/**
 * Scan a single repository directory.
 * @param {string} repoDir
 * @param {{ exclude?: string[]|string }} [opts]  paths/globs to skip (repo-relative).
 *   Useful so a repo can scan itself while ignoring files that legitimately
 *   contain signatures (e.g. this tool's own src/signatures.js + fixtures).
 * @returns {Promise<Findings>}
 */
export async function scanRepo(repoDir, opts = {}) {
  const findings = [];
  const rel = (p) => path.relative(repoDir, p) || path.basename(p);
  const matchExcluded = buildExcluder(opts.exclude);
  const isExcluded = (abs) =>
    matchExcluded(path.relative(repoDir, abs).split(path.sep).join("/"));

  await detectJsPayloads(repoDir, findings, rel, isExcluded);
  await detectVscode(repoDir, findings, rel, isExcluded);
  await detectFonts(repoDir, findings, rel, isExcluded);
  await detectPackageJson(repoDir, findings, isExcluded);
  await detectArtifacts(repoDir, findings, isExcluded);

  const coPresenceAmplified =
    existsSync(path.join(repoDir, ".vscode", "tasks.json")) &&
    existsSync(path.join(repoDir, ".vscode", "launch.json")) &&
    sig.FONT_DIRS.some((d) => existsSync(path.join(repoDir, d)));

  const hasContentConfirmed = findings.some((f) => f.contentConfirmed);
  let severity = "clean";
  if (hasContentConfirmed) severity = "infected";
  else if (findings.length > 0 || coPresenceAmplified) severity = "suspicious";

  const manualReview = findings
    .filter((f) => f.action === "manual-review")
    .map((f) => `${f.file}: ${f.description}`);

  return { repoDir, severity, hasContentConfirmed, coPresenceAmplified, findings, manualReview };
}

// ─── JS payload (appended obfuscated blob) ──────────────────────────────────────

/** Find the byte offset where the appended payload begins, or -1. */
export function locatePayloadOffset(text, variant) {
  let lastExport = -1;
  const re = new RegExp(sig.EXPORT_MARKER_RE.source, "g");
  let m;
  while ((m = re.exec(text))) lastExport = m.index;
  const from = lastExport >= 0 ? lastExport : 0;
  const tailMatch = new RegExp(variant.startRe.source).exec(text.slice(from));
  if (tailMatch) return from + tailMatch.index;
  const anyMatch = new RegExp(variant.startRe.source).exec(text);
  return anyMatch ? anyMatch.index : -1;
}

async function detectJsPayloads(repoDir, findings, rel, isExcluded) {
  const files = await collectByExtension(repoDir, sig.JS_EXTENSIONS);
  for (const file of files) {
    if (isExcluded(file)) continue;
    let text;
    try {
      text = await fs.readFile(file, "utf8");
    } catch {
      continue;
    }

    // 1. Known variants — content-confirmed via signature + a numeric seed.
    let matchedKnown = false;
    for (const variant of sig.JS_VARIANTS) {
      const confirmed =
        text.includes(variant.signature) && variant.seeds.some((s) => text.includes(s));
      if (!confirmed) continue;
      matchedKnown = true;
      const offset = locatePayloadOffset(text, variant);
      const canStrip = offset > 0;
      findings.push({
        id: `js.payload.${variant.id}`,
        category: "js",
        file: rel(file),
        confidence: "high",
        action: canStrip ? "strip-js-payload" : "manual-review",
        contentConfirmed: true,
        description: canStrip
          ? `${variant.label} appended at offset ${offset} — will strip from there to EOF`
          : `${variant.label} detected but its start offset could not be located safely — strip manually`,
        edit: canStrip ? { absPath: file, offset, variantId: variant.id } : undefined,
      });
      break; // one variant finding per file is enough
    }
    if (matchedKnown) continue;

    // 2. Generic heuristic for UNKNOWN variants → manual review only, never auto-strip.
    let lastExport = -1;
    const re = new RegExp(sig.EXPORT_MARKER_RE.source, "g");
    let m;
    while ((m = re.exec(text))) lastExport = m.index;
    const tail = lastExport >= 0 ? text.slice(lastExport) : text;
    const h = sig.GENERIC_HEURISTIC;
    if (h.globalAssignRe.test(tail) && h.obfArrayRe.test(tail) && h.evalRe.test(tail)) {
      findings.push({
        id: "js.payload.heuristic",
        category: "js",
        file: rel(file),
        confidence: "low",
        action: "manual-review",
        contentConfirmed: false,
        description:
          "Obfuscated code appended after the last export (global[...] assignment + obfuscated array + eval). Possible unknown PolinRider variant — review manually.",
      });
    }
  }
}

// ─── .vscode task / launch weaponization ────────────────────────────────────────

/** Decide whether one task/launch entry is malicious. */
export function classifyVscodeEntry(entryValue) {
  const hay = JSON.stringify(entryValue ?? "");
  if (sig.isC2Host(hay)) return { bad: true, reason: "references a known PolinRider C2 host" };
  if (sig.isFetchToShell(hay))
    return { bad: true, reason: "fetches a remote script and pipes it to a shell" };
  if (sig.commandExecutesAsset(hay))
    return { bad: true, reason: "executes a font/asset file as code (e.g. `node ./public/fonts/…`)" };
  if (entryValue?.runOptions?.runOn === "folderOpen") {
    if (sig.ANY_URL_RE.test(hay))
      return { bad: true, reason: "auto-runs on folderOpen and contacts an external URL" };
    if (sig.INTERPRETER_RE.test(hay))
      return { bad: true, reason: "auto-runs a script interpreter on folderOpen" };
  }
  return { bad: false };
}

async function detectVscode(repoDir, findings, rel, isExcluded) {
  const vscodeDir = path.join(repoDir, ".vscode");
  if (!existsSync(vscodeDir) || isExcluded(vscodeDir)) return;

  const targets = [
    { name: "tasks.json", arrayKey: "tasks" },
    { name: "launch.json", arrayKey: "configurations" },
  ];
  const reasons = new Set();

  for (const { name, arrayKey } of targets) {
    const file = path.join(vscodeDir, name);
    if (!existsSync(file) || isExcluded(file)) continue;
    let text;
    try {
      text = await fs.readFile(file, "utf8");
    } catch {
      continue;
    }
    const parsed = parseJsonc(text);
    if (!parsed.ok) {
      // Can't parse → fall back to scanning the raw text for malicious markers.
      if (sig.isC2Host(text) || sig.isFetchToShell(text) || sig.commandExecutesAsset(text)) {
        reasons.add(`malicious content in ${name}`);
      }
      continue;
    }
    const arr = Array.isArray(parsed.value?.[arrayKey]) ? parsed.value[arrayKey] : [];
    for (const entry of arr) {
      const c = classifyVscodeEntry(entry);
      if (c.bad) reasons.add(`${name}: ${c.reason}`);
    }
  }

  if (reasons.size === 0) return;
  // Policy: any malicious .vscode entry → remove the entire .vscode directory.
  findings.push({
    id: "vscode.malicious",
    category: "vscode",
    file: ".vscode",
    confidence: "high",
    action: "remove-dir",
    contentConfirmed: true,
    description: `Malicious .vscode configuration (${[...reasons].join("; ")}) — removing the entire .vscode directory`,
    edit: { absPath: vscodeDir },
  });
}

// ─── Font payload carriers ───────────────────────────────────────────────────────

/** Map a font file to the fonts directory that should be removed wholesale, or null. */
export function fontDirToRemove(repoDir, fontAbsPath) {
  const parts = path.relative(repoDir, fontAbsPath).split(path.sep);
  const idx = parts.lastIndexOf("fonts");
  if (idx >= 0) return path.join(repoDir, ...parts.slice(0, idx + 1)); // .../fonts
  return null; // not inside a fonts/ dir → caller falls back to deleting the file
}

async function detectFonts(repoDir, findings, rel, isExcluded) {
  const fontFiles = await collectByExtension(repoDir, sig.FONT_EXTENSIONS);
  if (fontFiles.length === 0) return;
  const haystack = await collectFontReferences(repoDir);

  // Group fonts by their leaf `fonts/` dir. A dir is tracked when it holds either a
  // suspicious font OR a Font-Awesome-named font (the malware's disguise names).
  const groups = new Map(); // absDir → { confirmed:[], suspect:[] }
  const orphans = []; // suspicious/fa fonts with no fonts/ ancestor

  const ensureGroup = (dir) => {
    if (!groups.has(dir)) groups.set(dir, { confirmed: [], suspect: [] });
    return groups.get(dir);
  };

  for (const file of fontFiles) {
    if (isExcluded(file)) continue;
    const isFa = sig.isFaFamilyName(path.basename(file));
    let susp;
    try {
      susp = looksSuspicious(await fs.readFile(file), path.extname(file));
    } catch {
      continue;
    }
    const referenced = isReferenced(haystack, file);
    const isCarrier = susp.bad && susp.hasCodeStrings; // not a valid font + code payload
    const dir = fontDirToRemove(repoDir, file);

    // Referenced fonts are wired into the build, so they are never auto-deleted.
    // But "referenced" is not a clean bill of health: a referenced file that is
    // NOT a valid font yet carries a code payload is a carrier hiding in plain
    // sight → surface it for manual review rather than silently trusting it.
    if (referenced) {
      if (isCarrier) {
        findings.push({
          id: "font.referenced-carrier",
          category: "font",
          file: rel(file),
          confidence: "high",
          action: "manual-review",
          contentConfirmed: false,
          description: `Referenced file that is not a valid font but contains a code payload (${susp.reasons.join("; ")}). It is imported by the build, so it is not auto-removed — review and remove it manually.`,
        });
      }
      // A referenced fa-named font still registers its dir so the disguise (medium)
      // check fires, but it is never treated as a deletable carrier.
      if (isFa && dir) ensureGroup(dir);
      continue;
    }

    if (!susp.bad && !isFa) continue; // valid, inert, non-disguise, unreferenced → leave it

    const entry = { file, reasons: susp.reasons };
    if (dir) {
      const g = ensureGroup(dir);
      if (isCarrier) g.confirmed.push(entry);
      else if (susp.bad) g.suspect.push(entry);
      // (fa-named-but-valid fonts add nothing here; emit() re-discovers them by name)
    } else if (isCarrier) {
      orphans.push({ ...entry, kind: "carrier" });
    } else if (susp.bad || isFa) {
      orphans.push({ ...entry, kind: "review", isFa });
    }
  }

  for (const [dir, group] of groups) {
    await emitFontDirFinding(dir, group, findings, rel, isExcluded);
  }

  // Fonts outside any `fonts/` dir: a confirmed carrier is deleted on its own; a
  // bare fa-named or unrecognized file is flagged for manual review only.
  for (const o of orphans) {
    if (o.kind === "carrier") {
      findings.push({
        id: "font.carrier",
        category: "font",
        file: rel(o.file),
        confidence: "high",
        action: "delete-font",
        contentConfirmed: true,
        description: `Unreferenced font carrier (JS payload): ${o.reasons.join("; ")}`,
        edit: { absPath: o.file },
      });
    } else {
      findings.push({
        id: "font.review",
        category: "font",
        file: rel(o.file),
        confidence: "low",
        action: "manual-review",
        contentConfirmed: false,
        description: o.isFa
          ? "Font-Awesome-named font (a known PolinRider disguise) with no payload detected — review manually."
          : `Unreferenced file that is not a valid font (${o.reasons.join("; ")}) — review manually.`,
      });
    }
  }
}

/**
 * List everything under `dir`. `allEntries` includes files, sub-directories AND
 * symlinks (symlinks are recorded but never followed, matching the walker's safety
 * guarantee); `regularFiles` are the real files only — the pool we may remove.
 */
async function listTree(dir) {
  const allEntries = [];
  const regularFiles = [];
  const rec = async (d) => {
    let entries;
    try {
      entries = await fs.readdir(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const full = path.join(d, ent.name);
      allEntries.push(full);
      if (ent.isSymbolicLink()) continue; // counts as "present", but not followed or removed
      if (ent.isDirectory()) await rec(full);
      else if (ent.isFile()) regularFiles.push(full);
    }
  };
  await rec(dir);
  return { allEntries, regularFiles };
}

/**
 * Decide what to remove for one `fonts/` directory that contains a suspicious or
 * disguise-named font.
 *
 * - A confirmed carrier (unreferenced JS payload) makes the dir `infected`: remove
 *   the carrier(s) PLUS the whole `fa-*` disguise set PLUS README sidecars. If that
 *   set is the entire directory, remove the directory; otherwise remove just those
 *   files and keep the clean fonts.
 * - No carrier but `fa-*` names present (or an unrecognized blob) → `suspicious`
 *   manual-review only; nothing is auto-removed.
 */
async function emitFontDirFinding(dir, group, findings, rel, isExcluded) {
  // Enumerate the dir INCLUDING symlinks and sub-directory entries. `allEntries`
  // is used only to decide "is anything here besides the removal set?" — a symlink
  // or a sub-directory (e.g. a clean gill-sans/) must count so we never escalate to
  // a whole-dir removal that would take a clean font with it. `regularFiles` is the
  // pool of real files we may actually remove.
  const { allEntries, regularFiles } = await listTree(dir);
  const faAll = regularFiles.filter((f) => !isExcluded(f) && sig.isFaFamilyName(path.basename(f)));

  if (group.confirmed.length > 0) {
    const carrierReasons = [...new Set(group.confirmed.flatMap((e) => e.reasons))].join("; ");
    // Scope the disguise sweep to the carrier's OWN directory: remove fa-* files and
    // README sidecars that sit beside a carrier, never ones in a nested clean subdir.
    const carrierDirs = new Set(group.confirmed.map((e) => path.dirname(e.file)));
    const inScope = (f) => carrierDirs.has(path.dirname(f)) && !isExcluded(f);
    const faFiles = faAll.filter(inScope);
    const sidecars = regularFiles.filter((f) => inScope(f) && sig.isFontDropSidecar(path.basename(f)));

    const removalAbs = new Set([...group.confirmed.map((e) => e.file), ...faFiles, ...sidecars]);
    const remaining = allEntries.filter((f) => !removalAbs.has(f)); // anything clean to preserve

    if (remaining.length === 0) {
      findings.push({
        id: "font.carrier-dir",
        category: "font",
        file: rel(dir),
        confidence: "high",
        action: "remove-dir",
        contentConfirmed: true,
        description: `Font carrier(s) found — removing the entire ${rel(dir)} directory (${carrierReasons})`,
        edit: { absPath: dir },
      });
    } else {
      const removals = [...removalAbs].map((abs) => ({ abs, rel: rel(abs) }));
      findings.push({
        id: "font.carrier-set",
        category: "font",
        file: rel(dir),
        confidence: "high",
        action: "remove-font-set",
        contentConfirmed: true,
        description:
          `Font carrier(s) in ${rel(dir)} (${carrierReasons}) — removing ${removals.length} ` +
          `malicious/disguise file(s): ${removals.map((r) => path.basename(r.rel)).join(", ")}. ` +
          `Preserving ${remaining.length} clean entr${remaining.length === 1 ? "y" : "ies"}.`,
        edit: { removals },
      });
    }
    return;
  }

  // No confirmed carrier: fa-disguise names and/or an unrecognized blob → medium.
  const bits = [];
  if (faAll.length) {
    bits.push(
      `Font-Awesome-named font(s) present (${faAll.map((f) => path.basename(f)).join(", ")}) — a known PolinRider disguise`,
    );
  }
  if (group.suspect.length) {
    bits.push(`unrecognized non-font file(s): ${group.suspect.map((e) => path.basename(e.file)).join(", ")}`);
  }
  if (bits.length === 0) return;
  findings.push({
    id: "font.review",
    category: "font",
    file: rel(dir),
    confidence: "low",
    action: "manual-review",
    contentConfirmed: false,
    description: `${bits.join("; ")}. No payload detected — review manually to confirm these are legitimate.`,
  });
}

// ─── package.json impostor deps / malicious lifecycle scripts ────────────────────

async function detectPackageJson(repoDir, findings, isExcluded) {
  const file = path.join(repoDir, "package.json");
  if (!existsSync(file) || isExcluded(file)) return;
  let pkg;
  try {
    pkg = JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return; // malformed package.json — out of scope here
  }
  const depSections = ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"];
  const impostors = new Set();
  for (const section of depSections) {
    const deps = pkg[section];
    if (!deps || typeof deps !== "object") continue;
    for (const name of Object.keys(deps)) {
      if (sig.IMPOSTOR_DEPS.includes(name)) impostors.add(name);
    }
  }
  if (impostors.size > 0) {
    findings.push({
      id: "package.impostor-deps",
      category: "package",
      file: "package.json",
      confidence: "high",
      action: "manual-review",
      contentConfirmed: true,
      description: `Known PolinRider impostor dependenc${impostors.size === 1 ? "y" : "ies"}: ${[...impostors].join(", ")}. Remove the package(s) and audit lockfiles manually.`,
    });
  }

  const scripts = pkg.scripts && typeof pkg.scripts === "object" ? pkg.scripts : {};
  for (const hook of sig.SUSPICIOUS_LIFECYCLE_SCRIPTS) {
    const cmd = scripts[hook];
    if (typeof cmd === "string" && (sig.isFetchToShell(cmd) || /\bnode\b\s+-e\b/i.test(cmd))) {
      findings.push({
        id: `package.script.${hook}`,
        category: "package",
        file: "package.json",
        confidence: "high",
        action: "manual-review",
        contentConfirmed: true,
        description: `"${hook}" lifecycle script fetches and executes remote code: ${cmd}`,
      });
    }
  }
}

// ─── Standalone artifacts + .gitignore injection ─────────────────────────────────

async function detectArtifacts(repoDir, findings, isExcluded) {
  for (const name of sig.ARTIFACT_FILES) {
    if (existsSync(path.join(repoDir, name)) && !isExcluded(path.join(repoDir, name))) {
      findings.push({
        id: `artifact.${name}`,
        category: "artifact",
        file: name,
        confidence: "high",
        action: "remove-artifact",
        contentConfirmed: true,
        description:
          name === "config.bat"
            ? "Hidden malware orchestrator"
            : "Malware propagation script",
        edit: { absPath: path.join(repoDir, name) },
      });
    }
  }

  const gitignore = path.join(repoDir, ".gitignore");
  if (existsSync(gitignore) && !isExcluded(gitignore)) {
    try {
      const lines = (await fs.readFile(gitignore, "utf8")).split(/\r?\n/).map((l) => l.trim());
      const injected = sig.GITIGNORE_INJECTED.filter((p) => lines.includes(p));
      if (injected.length) {
        findings.push({
          id: "gitignore.injected",
          category: "gitignore",
          file: ".gitignore",
          confidence: "high",
          action: "fix-gitignore",
          contentConfirmed: true,
          description: `malware-injected .gitignore entr${injected.length === 1 ? "y" : "ies"}: ${injected.join(", ")}`,
        });
      }
    } catch {
      /* ignore */
    }
  }
}
