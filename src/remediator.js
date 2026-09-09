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
import { assessJsText } from "./capability.js";
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

/** Two range lists describe the same edit. */
function rangesAgree(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  const key = (r) => `${r.start}:${r.end}:${r.role ?? ""}`;
  const left = a.map(key).sort();
  const right = b.map(key).sort();
  return left.every((k, i) => k === right[i]);
}

async function stripJsPayload(repoDir, f, result, dryRun) {
  const absPath = f.edit?.absPath ?? path.join(repoDir, f.file);
  const skip = (reason) => result.skipped.push({ finding: f, reason });

  let text;
  try {
    text = await fs.readFile(absPath, "utf8");
  } catch {
    return skip("file unreadable");
  }

  // Re-derive the ENTIRE plan from the current bytes rather than trusting the
  // offsets recorded at scan time. This preserves the property that a stale
  // finding can never truncate the wrong thing, and is strictly stronger than
  // re-running a regex: the tokenizer, the position gate, the capability score
  // and the splice post-condition all have to agree again, now.
  const assessment = assessJsText(text, f.file);
  const v = assessment.verdict;

  if (!assessment.lex.ok) {
    return skip(`could not tokenize the file safely (${assessment.lex.reason}) — refusing to strip`);
  }
  if (v.verdict !== "confirmed" && v.verdict !== "shim-only") {
    return skip(`re-verification says "${v.verdict}" — the file changed since the scan`);
  }
  if (assessment.ranges.length === 0) {
    return skip("nothing to strip after re-verification");
  }
  // Only appended payloads and prepended shims are auto-strippable.
  if (assessment.ranges.some((r) => r.role !== "payload" && r.role !== "shim")) {
    return skip("unrecognised edit role — refusing to strip");
  }
  if (f.edit?.ranges?.length && !rangesAgree(f.edit.ranges, assessment.ranges)) {
    return skip("payload location moved since the scan — re-scan and retry");
  }

  // keptText is non-null only when verifySplice succeeded, which already
  // guarantees the result re-tokenizes, keeps its export, and is not empty.
  const kept = assessment.keptText;
  if (kept == null) {
    return skip(`splice post-condition failed (${v.blockers.join(", ") || "unknown"})`);
  }
  if (kept.trim().length === 0) return skip("stripping would empty the file");
  if (kept === text) return skip("no change");

  if (!dryRun) await fs.writeFile(absPath, kept, "utf8");
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
