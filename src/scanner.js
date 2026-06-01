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
 * @property {'strip-js-payload'|'edit-vscode'|'delete-font'|'remove-artifact'|'fix-gitignore'|'manual-review'} action
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

/**
 * Scan a single repository directory.
 * @param {string} repoDir
 * @returns {Promise<Findings>}
 */
export async function scanRepo(repoDir) {
  const findings = [];
  const rel = (p) => path.relative(repoDir, p) || path.basename(p);

  await detectJsPayloads(repoDir, findings, rel);
  await detectVscode(repoDir, findings, rel);
  await detectFonts(repoDir, findings, rel);
  await detectPackageJson(repoDir, findings);
  await detectArtifacts(repoDir, findings);

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

async function detectJsPayloads(repoDir, findings, rel) {
  const files = await collectByExtension(repoDir, sig.JS_EXTENSIONS);
  for (const file of files) {
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
  if (entryValue?.runOptions?.runOn === "folderOpen" && sig.ANY_URL_RE.test(hay)) {
    return { bad: true, reason: "auto-runs on folderOpen and contacts an external URL" };
  }
  return { bad: false };
}

async function detectVscode(repoDir, findings, rel) {
  const targets = [
    { name: "tasks.json", arrayKey: "tasks" },
    { name: "launch.json", arrayKey: "configurations" },
  ];
  for (const { name, arrayKey } of targets) {
    const file = path.join(repoDir, ".vscode", name);
    if (!existsSync(file)) continue;
    let text;
    try {
      text = await fs.readFile(file, "utf8");
    } catch {
      continue;
    }
    const parsed = parseJsonc(text);
    if (!parsed.ok) {
      // Can't parse → can't surgically edit. Flag only if it smells malicious.
      if (sig.isC2Host(text) || sig.isFetchToShell(text)) {
        findings.push({
          id: `vscode.unparseable.${arrayKey}`,
          category: "vscode",
          file: rel(file),
          confidence: "high",
          action: "manual-review",
          contentConfirmed: true,
          description: `Malicious-looking content in an unparseable ${name} — review and remove manually`,
        });
      }
      continue;
    }
    const arr = Array.isArray(parsed.value?.[arrayKey]) ? parsed.value[arrayKey] : [];
    const badIndices = [];
    arr.forEach((entry, idx) => {
      if (classifyVscodeEntry(entry).bad) badIndices.push(idx);
    });
    if (badIndices.length === 0) continue;
    const reasons = [...new Set(badIndices.map((i) => classifyVscodeEntry(arr[i]).reason))];
    const noun = arrayKey === "configurations" ? "launch configuration" : "task";
    const plural = badIndices.length === 1 ? noun : `${noun}s`;
    findings.push({
      id: `vscode.${arrayKey}`,
      category: "vscode",
      file: rel(file),
      confidence: "high",
      action: "edit-vscode",
      contentConfirmed: true,
      description: `${badIndices.length} malicious ${plural} (${reasons.join("; ")})`,
      edit: { absPath: file, arrayKey, indices: badIndices, total: arr.length },
    });
  }
}

// ─── Font payload carriers ───────────────────────────────────────────────────────

async function detectFonts(repoDir, findings, rel) {
  const fontFiles = await collectByExtension(repoDir, sig.FONT_EXTENSIONS);
  if (fontFiles.length === 0) return;
  const haystack = await collectFontReferences(repoDir);
  for (const file of fontFiles) {
    if (isReferenced(haystack, file)) continue; // referenced → keep, never flag
    let buf;
    try {
      buf = await fs.readFile(file);
    } catch {
      continue;
    }
    const susp = looksSuspicious(buf, path.extname(file));
    if (!susp.bad) continue; // unreferenced but a valid, inert font → keep
    findings.push({
      id: "font.carrier",
      category: "font",
      file: rel(file),
      confidence: "high",
      action: "delete-font",
      contentConfirmed: true,
      description: `Unreferenced suspicious font: ${susp.reasons.join("; ")}`,
      edit: { absPath: file },
    });
  }
}

// ─── package.json impostor deps / malicious lifecycle scripts ────────────────────

async function detectPackageJson(repoDir, findings) {
  const file = path.join(repoDir, "package.json");
  if (!existsSync(file)) return;
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

async function detectArtifacts(repoDir, findings) {
  for (const name of sig.ARTIFACT_FILES) {
    if (existsSync(path.join(repoDir, name))) {
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
  if (existsSync(gitignore)) {
    try {
      const lines = (await fs.readFile(gitignore, "utf8")).split(/\r?\n/);
      if (lines.some((l) => l.trim() === sig.GITIGNORE_INJECT)) {
        findings.push({
          id: "gitignore.config-bat",
          category: "gitignore",
          file: ".gitignore",
          confidence: "high",
          action: "fix-gitignore",
          contentConfirmed: true,
          description: "`config.bat` injected into .gitignore (malware hides itself from git)",
        });
      }
    } catch {
      /* ignore */
    }
  }
}
