/**
 * Surgical remediation. Consumes a Findings report and removes ONLY what is
 * confirmed malicious, preserving legitimate code, tasks, launch configs, and
 * fonts. Every edit is re-verified against the current file content at apply
 * time, so a stale finding can never truncate the wrong bytes.
 *
 * dryRun=true records what WOULD change without touching any file.
 *
 * @typedef {Object} RemediationResult
 * @property {boolean} changed       true iff files were actually modified/deleted
 * @property {boolean} dryRun
 * @property {Array} applied         findings (or hygiene steps) that were acted on
 * @property {Array<{finding:Object, reason:string}>} skipped
 * @property {string[]} filesModified
 * @property {string[]} filesDeleted
 * @property {string[]} notes        hygiene actions (gitignore, env untracking)
 */

import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import * as sig from "./signatures.js";
import { locatePayloadOffset } from "./scanner.js";
import { safeGit } from "./safe-exec.js";

/**
 * @param {string} repoDir
 * @param {import('./scanner.js').Findings} findings
 * @param {{ dryRun?: boolean, git?: Function }} [opts]
 * @returns {Promise<RemediationResult>}
 */
export async function remediate(repoDir, findings, opts = {}) {
  const { dryRun = false, git = safeGit } = opts;
  const result = {
    changed: false,
    dryRun,
    applied: [],
    skipped: [],
    filesModified: [],
    filesDeleted: [],
    notes: [],
  };

  for (const f of findings.findings) {
    switch (f.action) {
      case "strip-js-payload":
        await stripJsPayload(repoDir, f, result, dryRun);
        break;
      case "remove-dir":
        await deleteDir(f, result, dryRun);
        break;
      case "delete-font":
      case "remove-artifact":
        await deleteFile(f, result, dryRun);
        break;
      case "remove-font-set":
        await deleteFileSet(f, result, dryRun);
        break;
      case "fix-gitignore":
        // handled by the always-on gitignore hygiene step below
        break;
      case "manual-review":
        result.skipped.push({ finding: f, reason: "manual review required — not auto-removed" });
        break;
      default:
        result.skipped.push({ finding: f, reason: `unknown action "${f.action}"` });
    }
  }

  // Hygiene (idempotent): undo the malware's .gitignore tampering and unexpose
  // any committed secrets. Mirrors the original remediate.sh behavior.
  await hardenGitignore(repoDir, result, dryRun);
  await untrackEnvFiles(repoDir, result, dryRun, git);

  result.changed =
    !dryRun && (result.filesModified.length > 0 || result.filesDeleted.length > 0);
  return result;
}

function recordModified(result, file) {
  if (!result.filesModified.includes(file)) result.filesModified.push(file);
}
function recordDeleted(result, file) {
  if (!result.filesDeleted.includes(file)) result.filesDeleted.push(file);
}

// ─── strip-js-payload ────────────────────────────────────────────────────────────

async function stripJsPayload(repoDir, f, result, dryRun) {
  const absPath = f.edit?.absPath ?? path.join(repoDir, f.file);
  let text;
  try {
    text = await fs.readFile(absPath, "utf8");
  } catch {
    result.skipped.push({ finding: f, reason: "file unreadable" });
    return;
  }
  // Re-locate against current content rather than trusting the stored offset.
  const variant = sig.JS_VARIANTS.find((v) => v.id === f.edit?.variantId);
  const offset = variant ? locatePayloadOffset(text, variant) : f.edit?.offset ?? -1;
  if (!(offset > 0) || offset > text.length) {
    result.skipped.push({ finding: f, reason: "could not locate payload start safely" });
    return;
  }
  const kept = text.slice(0, offset).replace(/\s+$/, "");
  if (kept.length === 0) {
    result.skipped.push({ finding: f, reason: "stripping would empty the file" });
    return;
  }
  if (!dryRun) await fs.writeFile(absPath, kept + "\n", "utf8");
  result.applied.push(f);
  recordModified(result, f.file);
}

// ─── remove-dir (whole .vscode / fonts directory) ───────────────────────────────

async function deleteDir(f, result, dryRun) {
  const absPath = f.edit?.absPath;
  if (!absPath || !existsSync(absPath)) {
    result.skipped.push({ finding: f, reason: "already gone" });
    return;
  }
  if (!dryRun) await fs.rm(absPath, { recursive: true, force: true });
  result.applied.push(f);
  recordDeleted(result, f.file);
}

// ─── delete-font / remove-artifact ───────────────────────────────────────────────

async function deleteFile(f, result, dryRun) {
  const absPath = f.edit?.absPath;
  if (!absPath || !existsSync(absPath)) {
    result.skipped.push({ finding: f, reason: "already gone" });
    return;
  }
  if (!dryRun) await fs.rm(absPath, { force: true });
  result.applied.push(f);
  recordDeleted(result, f.file);
}

// ─── remove-font-set (carrier + its fa-* disguise siblings + README) ─────────────
//
// Removes a specific set of files inside a fonts/ dir while preserving the clean
// fonts that share it. Each path is deleted individually and recorded by its
// repo-relative name.

async function deleteFileSet(f, result, dryRun) {
  const removals = Array.isArray(f.edit?.removals) ? f.edit.removals : [];
  let any = false;
  for (const { abs, rel } of removals) {
    if (!abs || !existsSync(abs)) continue;
    if (!dryRun) await fs.rm(abs, { force: true });
    recordDeleted(result, rel);
    any = true;
  }
  if (any) result.applied.push(f);
  else result.skipped.push({ finding: f, reason: "already gone" });
}

// ─── .gitignore hygiene ──────────────────────────────────────────────────────────

async function hardenGitignore(repoDir, result, dryRun) {
  const file = path.join(repoDir, ".gitignore");
  let content = "";
  try {
    content = await fs.readFile(file, "utf8");
  } catch {
    content = "";
  }
  let lines = content.length ? content.split(/\r?\n/) : [];
  const original = lines.join("\n");

  // 1. Remove every malware-injected line (config.bat, temp_*.bat, branch_structure.json).
  lines = lines.filter((l) => !sig.GITIGNORE_INJECTED.includes(l.trim()));
  // 2. Ensure standard .env patterns are ignored (malware removes them to expose secrets).
  const present = new Set(lines.map((l) => l.trim()));
  for (const pat of sig.ENV_PATTERNS) {
    if (!present.has(pat)) {
      lines.push(pat);
      present.add(pat);
    }
  }
  const next = lines.join("\n");
  if (next === original) return; // nothing to change

  if (!dryRun) {
    await fs.writeFile(file, next.endsWith("\n") ? next : next + "\n", "utf8");
  }
  recordModified(result, ".gitignore");
  result.notes.push(
    `${dryRun ? "would remove" : "removed"} malware-injected entries from .gitignore and ensure${
      dryRun ? "" : "d"
    } .env patterns are ignored`,
  );
}

// ─── committed .env untracking ─────────────────────────────────────────────────────

async function untrackEnvFiles(repoDir, result, dryRun, git) {
  if (!existsSync(path.join(repoDir, ".git"))) return;
  const literals = sig.ENV_PATTERNS.filter((p) => !p.includes("*"));
  for (const pat of literals) {
    if (!existsSync(path.join(repoDir, pat))) continue;
    const tracked = await git(["-C", repoDir, "ls-files", "--error-unmatch", pat]);
    if (tracked.exitCode !== 0) continue; // not committed → nothing to untrack
    if (dryRun) {
      result.notes.push(`would untrack ${pat} from the git index`);
      continue;
    }
    const rm = await git(["-C", repoDir, "rm", "--cached", "--force", pat]);
    if (rm.exitCode === 0) {
      result.notes.push(`untracked ${pat} from the git index`);
      recordModified(result, pat);
    }
  }
}
