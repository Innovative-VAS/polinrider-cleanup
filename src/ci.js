import "./safety.js"; // MUST be first — neutralizes eval/Function/vm at import time.

/**
 * GitHub Action frontend (CI mode).
 *
 * Scans the ALREADY-CHECKED-OUT repository (no clone, no org listing) and, based
 * on `mode`, fails the check, cleans the working tree, or opens a cleanup PR.
 * Reuses the same engine as the org-sweep CLI — scanRepo() + remediate() + the
 * report builders — all of which operate on a plain local directory.
 *
 *   mode=check  Scan only. Exit non-zero when severity meets `fail-on` so a
 *               required status check blocks an infected merge. No token needed.
 *   mode=fix    Scan → surgically remediate the working tree. With commit=true
 *               (and on a push event) also commit + push the cleanup back.
 *   mode=pr     Scan → remediate → open a cleanup PR (mirrors the CLI's openPR).
 *
 * Inputs arrive as INPUT_* env vars (GitHub Actions convention). Each setting
 * also falls back to its legacy env name (GH_TOKEN, DRY_RUN, AUTO_MERGE,
 * MERGE_METHOD, BRANCH_PREFIX) so consumers can configure via `with:` or `env:`.
 *
 * SAFETY: no target file content is ever require()'d/import()'d/eval()'d; every
 * subprocess still goes through src/safe-exec.js (git/gh only).
 */

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scanRepo } from "./scanner.js";
import { remediate } from "./remediator.js";
import { buildPrBody, PR_TITLE, findingLines, resultLines } from "./report.js";
import { safeGit, safeGh } from "./safe-exec.js";
import { buildSarif } from "./sarif.js";

const BOT_EMAIL = "polinrider-cleanup-bot@users.noreply.github.com";
const BOT_NAME = "PolinRider Cleanup Bot";
const PROJECT_URL = "https://github.com/Innovative-VAS/polinrider-cleanup";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const oneLine = (s) => (s || "").trim().split("\n")[0];

// ─── Inputs (INPUT_* with legacy-env fallback) ───────────────────────────────

/** Mirror @actions/core.getInput: INPUT_<NAME>, uppercased, spaces→underscore. */
function input(name) {
  const v = process.env[`INPUT_${name.replace(/ /g, "_").toUpperCase()}`];
  return v === undefined ? "" : v.trim();
}
const bool = (v) => /^(true|1|yes|on)$/i.test(String(v).trim());

export function resolveSettings() {
  const commentRaw = input("comment-on-pr");
  return {
    mode: (input("mode") || "check").toLowerCase(),
    scanPath: input("path") || ".",
    exclude: input("exclude") || process.env.POLINRIDER_EXCLUDE || "",
    token: input("token") || process.env.GH_TOKEN || process.env.GITHUB_TOKEN || "",
    failOn: (input("fail-on") || "infected").toLowerCase(),
    commit: bool(input("commit")), // default false
    commentOnPr: commentRaw === "" ? true : bool(commentRaw),
    sarifFile: input("sarif-file") || process.env.SARIF_FILE || "",
    dryRun: input("dry-run") ? bool(input("dry-run")) : process.env.DRY_RUN === "true",
    autoMerge: input("auto-merge") ? bool(input("auto-merge")) : process.env.AUTO_MERGE === "true",
    mergeMethod: (input("merge-method") || process.env.MERGE_METHOD || "squash").toLowerCase(),
    branchPrefix: input("branch-prefix") || process.env.BRANCH_PREFIX || "fix/polinrider-cleanup",
  };
}

// ─── GitHub Actions I/O (outputs, summary, annotations) ──────────────────────

function setOutput(name, value) {
  const file = process.env.GITHUB_OUTPUT;
  if (!file) return;
  try {
    fs.appendFileSync(file, `${name}=${value}\n`);
  } catch {
    /* ignore — outputs are best-effort */
  }
}

function appendSummary(md) {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (!file) return;
  try {
    fs.appendFileSync(file, md.endsWith("\n") ? md : md + "\n");
  } catch {
    /* ignore */
  }
}

// Workflow-command escaping differs between the message and property values.
const escData = (s) => String(s).replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
const escProp = (s) => escData(s).replace(/,/g, "%2C").replace(/:/g, "%3A");

function annotate(level, { file, line, title, message }) {
  const props = [];
  if (file) props.push(`file=${escProp(file)}`);
  if (line) props.push(`line=${line}`);
  if (title) props.push(`title=${escProp(title)}`);
  console.log(`::${level}${props.length ? " " + props.join(",") : ""}::${escData(message)}`);
}
const notice = (m) => console.log(`::notice::${escData(m)}`);
const warn = (m) => console.log(`::warning::${escData(m)}`);

// ─── Severity / line helpers ─────────────────────────────────────────────────

const SEVERITY_RANK = { clean: 0, suspicious: 1, infected: 2 };

export function failThreshold(failOn) {
  if (failOn === "never") return Infinity;
  if (failOn === "suspicious") return SEVERITY_RANK.suspicious;
  return SEVERITY_RANK.infected; // default + "infected"
}

/** 1-based line for a finding that carries a char offset (js payloads), else 1. */
function findingLine(repoDir, f) {
  const offset = f.edit?.offset;
  if (!(offset > 0)) return 1;
  try {
    const text = fs.readFileSync(path.join(repoDir, f.file), "utf8");
    if (offset > text.length) return 1;
    return text.slice(0, offset).split("\n").length;
  } catch {
    return 1;
  }
}

/** Repo-root-relative path so GitHub maps the annotation onto the PR diff. */
function annotationPath(workspace, repoDir, relFile) {
  return path.relative(workspace, path.join(repoDir, relFile)) || relFile;
}

function emitAnnotations(workspace, repoDir, findings) {
  for (const f of findings.findings) {
    annotate(f.contentConfirmed ? "error" : "warning", {
      file: annotationPath(workspace, repoDir, f.file),
      line: findingLine(repoDir, f),
      title: f.contentConfirmed ? "PolinRider malware" : "PolinRider (review)",
      message: f.description,
    });
  }
}

// ─── Run report (job summary + PR comment body) ──────────────────────────────

export function buildSummary({ settings, findings, result }) {
  const icon = findings.severity === "infected" ? "🔴" : findings.severity === "suspicious" ? "🟡" : "🟢";
  const out = [
    "## 🛡️ PolinRider Malware Scan",
    "",
    `**Mode:** \`${settings.mode}\`${settings.dryRun ? " (dry run)" : ""} · **Severity:** ${icon} \`${findings.severity}\` · **Findings:** ${findings.findings.length}`,
    "",
  ];
  if (findings.findings.length) {
    out.push("### Findings");
    for (const l of findingLines(findings)) out.push(`- ${l}`);
    out.push("");
  } else {
    out.push("No PolinRider signatures found. ✅", "");
  }
  if (result) {
    out.push(settings.dryRun ? "### Planned remediation (dry run)" : "### Remediation");
    const lines = resultLines(result);
    if (lines.length) for (const l of lines) out.push(`- ${l}`);
    else out.push("- (no changes)");
    out.push("");
  }
  if (findings.manualReview.length) {
    out.push("### Needs manual review");
    for (const m of findings.manualReview) out.push(`- ${m}`);
    out.push("");
  }
  out.push("---", `_Generated by [polinrider-cleanup](${PROJECT_URL})._`);
  return out.join("\n");
}

// ─── git identity / commit-back / PR (fix & pr modes) ────────────────────────

async function configureIdentity(repoDir) {
  await safeGit(["-C", repoDir, "config", "user.email", BOT_EMAIL]);
  await safeGit(["-C", repoDir, "config", "user.name", BOT_NAME]);
}
const tokenUrl = (fullName, token) => `https://x-access-token:${token}@github.com/${fullName}.git`;

function readEvent() {
  const p = process.env.GITHUB_EVENT_PATH;
  if (!p) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

/** fix + commit=true → commit the cleaned tree and push it back to the branch. */
async function commitBack(repoDir, settings) {
  const event = process.env.GITHUB_EVENT_NAME || "";
  if (event.startsWith("pull_request")) {
    warn("commit skipped on pull_request events (detached HEAD / forks can't be pushed). Use mode: pr, or run fix on push events.");
    return false;
  }
  const fullName = process.env.GITHUB_REPOSITORY;
  if (!fullName || !settings.token) {
    warn("commit skipped — GITHUB_REPOSITORY or token unavailable.");
    return false;
  }
  let branch = process.env.GITHUB_REF_NAME;
  if (!branch) {
    const rp = await safeGit(["-C", repoDir, "rev-parse", "--abbrev-ref", "HEAD"]);
    branch = rp.stdout.trim();
  }
  if (!branch || branch === "HEAD") {
    warn("commit skipped — could not resolve a branch to push to (detached HEAD).");
    return false;
  }
  await configureIdentity(repoDir);
  await safeGit(["-C", repoDir, "add", "-A"]);
  const staged = await safeGit(["-C", repoDir, "diff", "--cached", "--name-only"]);
  if (!staged.stdout.trim()) return false;
  const commit = await safeGit([
    "-C", repoDir, "commit", "-m",
    "security: remove PolinRider malware artifacts\n\nAutomated cleanup by the polinrider-cleanup action.",
  ]);
  if (commit.exitCode !== 0) {
    warn(`commit failed: ${oneLine(commit.stderr)}`);
    return false;
  }
  const push = await safeGit(["-C", repoDir, "push", tokenUrl(fullName, settings.token), `HEAD:${branch}`]);
  if (push.exitCode !== 0) {
    warn(`push to ${branch} failed (protected branch?): ${oneLine(push.stderr)}`);
    return false;
  }
  notice(`Cleaned files committed and pushed to ${branch}.`);
  return true;
}

/** pr mode → new branch, commit, push, open PR. Mirrors index.js openPR(). */
async function openCleanupPr(repoDir, settings, findings, result) {
  const fullName = process.env.GITHUB_REPOSITORY;
  if (!fullName) throw new Error("GITHUB_REPOSITORY is not set");
  if (!settings.token) throw new Error("a token is required for mode: pr (set `token:` or GH_TOKEN)");

  const branch = `${settings.branchPrefix}-${Date.now()}`;
  await configureIdentity(repoDir);
  const co = await safeGit(["-C", repoDir, "checkout", "-b", branch]);
  if (co.exitCode !== 0) throw new Error(`branch creation failed: ${oneLine(co.stderr)}`);
  await safeGit(["-C", repoDir, "add", "-A"]);
  const staged = await safeGit(["-C", repoDir, "diff", "--cached", "--name-only"]);
  if (!staged.stdout.trim()) return { skipped: true, reason: "no staged changes after remediation" };
  const commit = await safeGit([
    "-C", repoDir, "commit", "-m",
    `${PR_TITLE}\n\nAutomated surgical cleanup by the polinrider-cleanup action.`,
  ]);
  if (commit.exitCode !== 0) throw new Error(`commit failed: ${oneLine(commit.stderr)}`);
  const push = await safeGit(["-C", repoDir, "push", tokenUrl(fullName, settings.token), branch]);
  if (push.exitCode !== 0) throw new Error(`push failed: ${oneLine(push.stderr)}`);

  const body = buildPrBody({ findings, result });
  const base = ["pr", "create", "--repo", fullName, "--title", PR_TITLE, "--body", body, "--head", branch];
  let pr = await safeGh([...base, "--label", "security"], {}, settings.token);
  if (pr.exitCode !== 0) pr = await safeGh(base, {}, settings.token); // retry without label (may not exist)
  if (pr.exitCode !== 0) throw new Error(`PR creation failed: ${oneLine(pr.stderr)}`);
  const url = pr.stdout.trim();

  if (!settings.autoMerge) return { url, merged: false, mergeError: null };
  const mergeArgs = ["pr", "merge", url, `--${settings.mergeMethod}`, "--delete-branch"];
  let merge = await safeGh(mergeArgs, {}, settings.token);
  if (merge.exitCode !== 0) {
    await sleep(3000);
    merge = await safeGh(mergeArgs, {}, settings.token);
  }
  if (merge.exitCode === 0) return { url, merged: true, mergeError: null };
  return { url, merged: false, mergeError: oneLine(merge.stderr || merge.stdout) || "merge failed" };
}

/** Post the run report as a PR comment when on a pull_request event. */
async function postPrComment(settings, summaryMd) {
  if (!settings.commentOnPr) return;
  if (!(process.env.GITHUB_EVENT_NAME || "").startsWith("pull_request")) return;
  if (!settings.token) return;
  const ev = readEvent();
  const num = ev?.pull_request?.number ?? ev?.number;
  const fullName = process.env.GITHUB_REPOSITORY;
  if (!num || !fullName) return;
  const res = await safeGh(
    ["pr", "comment", String(num), "--repo", fullName, "--body", summaryMd],
    {},
    settings.token,
  );
  if (res.exitCode !== 0) warn(`could not post PR comment (needs pull-requests: write): ${oneLine(res.stderr)}`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

export async function run() {
  const settings = resolveSettings();
  if (!["check", "fix", "pr"].includes(settings.mode)) {
    console.log(`::error::invalid mode "${settings.mode}" (expected check | fix | pr)`);
    return 2;
  }
  const workspace = process.env.GITHUB_WORKSPACE || process.cwd();
  const repoDir = path.resolve(workspace, settings.scanPath);
  console.log(
    `PolinRider scan — mode=${settings.mode} path=${path.relative(workspace, repoDir) || "."}` +
      `${settings.dryRun ? " (dry run)" : ""}`,
  );

  const findings = await scanRepo(repoDir, { exclude: settings.exclude });
  emitAnnotations(workspace, repoDir, findings);

  let result = null;
  let prUrl = "";
  let changed = false;

  if ((settings.mode === "fix" || settings.mode === "pr") && findings.severity === "infected") {
    result = await remediate(repoDir, findings, { dryRun: settings.dryRun });
    changed = result.changed;

    if (settings.mode === "fix" && settings.commit && !settings.dryRun && changed) {
      await commitBack(repoDir, settings);
    }

    if (settings.mode === "pr" && !settings.dryRun) {
      if (changed) {
        try {
          const pr = await openCleanupPr(repoDir, settings, findings, result);
          if (pr.skipped) {
            warn(`PR skipped: ${pr.reason}`);
          } else {
            prUrl = pr.url;
            if (pr.merged) notice(`Cleanup PR merged: ${prUrl}`);
            else if (pr.mergeError) warn(`Cleanup PR opened (auto-merge blocked: ${pr.mergeError}): ${prUrl}`);
            else notice(`Cleanup PR opened: ${prUrl}`);
          }
        } catch (e) {
          warn(`PR mode failed: ${e.message}`);
        }
      } else {
        warn("Infected, but only manual-review items remain — no automated changes to open a PR for.");
      }
    }
  }

  // Optional SARIF for code-scanning upload.
  if (settings.sarifFile) {
    try {
      const sarif = buildSarif(findings, { repoRoot: workspace, repoDir });
      const dest = path.resolve(settings.sarifFile);
      await fsp.mkdir(path.dirname(dest), { recursive: true });
      await fsp.writeFile(dest, JSON.stringify(sarif, null, 2));
      setOutput("sarif-file", settings.sarifFile);
    } catch (e) {
      warn(`could not write SARIF: ${e.message}`);
    }
  }

  // Report: job summary + PR comment.
  const summaryMd = buildSummary({ settings, findings, result });
  appendSummary(summaryMd);
  await postPrComment(settings, summaryMd);

  // Outputs.
  const remediated = !!(result && (result.filesModified.length || result.filesDeleted.length));
  setOutput("severity", findings.severity);
  setOutput("infected", String(findings.severity === "infected"));
  setOutput("findings-count", String(findings.findings.length));
  setOutput("changed", String(changed));
  setOutput("remediated", String(remediated));
  if (prUrl) setOutput("pr-url", prUrl);

  // Exit code.
  const threshold = failThreshold(settings.failOn);
  const sev = SEVERITY_RANK[findings.severity] ?? 0;
  const wouldFailSeverity = threshold !== Infinity && sev >= threshold;
  let code = 0;
  if (settings.mode === "check" || settings.dryRun) {
    code = wouldFailSeverity ? 1 : 0;
  } else if (settings.mode === "fix") {
    // Cleaned what it could; fail only if confirmed items remain unresolved.
    const unresolved =
      findings.findings.filter((f) => f.contentConfirmed && f.action === "manual-review").length +
      (result?.skipped?.filter((s) => s.finding.contentConfirmed).length ?? 0);
    code = threshold !== Infinity && findings.severity === "infected" && unresolved > 0 ? 1 : 0;
  } else if (settings.mode === "pr") {
    // PR opened (or nothing to fix). Fail only if infected and no PR was opened.
    code = threshold !== Infinity && findings.severity === "infected" && !prUrl ? 1 : 0;
  }

  console.log(
    findings.severity === "infected"
      ? `Result: INFECTED — ${findings.findings.length} finding(s).`
      : findings.severity === "suspicious"
        ? "Result: suspicious file layout — no confirmed payload."
        : "Result: clean.",
  );
  return code;
}

// Auto-run when invoked directly (the bundled action, or `node src/ci.js`), but
// NOT when imported by a test.
const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  run()
    .then((code) => process.exit(code))
    .catch((err) => {
      console.log(`::error::${escData(err.message)}`);
      process.exit(1);
    });
}
