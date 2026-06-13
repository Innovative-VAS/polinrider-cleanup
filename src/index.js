import "./safety.js"; // MUST be the first import — installs runtime guards.

/**
 * PolinRider Org Cleanup CLI (consolidated, hardened).
 *
 * Flow per repo:
 *   1. Clone default branch into WORKSPACE/<repo> (shallow, hooks disabled)
 *   2. Scan in-process (reads files as inert text — never executes them)
 *   3. If infected → surgically remediate
 *   4. Commit changes on a new branch and open a PR via gh
 *
 * Required env: GH_TOKEN, and exactly one of GH_ORG (organization) or GH_USER
 * (personal account). Optional: DRY_RUN, WORKSPACE, BRANCH_PREFIX.
 *
 * SAFETY: every subprocess goes through src/safe-exec.js (git/gh only). No
 * target file content is ever require()'d, import()'d, eval()'d, or exec()'d.
 */

import chalk from "chalk";
import ora from "ora";
import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { safeGit, safeGh } from "./safe-exec.js";
import { scanRepo } from "./scanner.js";
import { remediate } from "./remediator.js";
import { buildPrBody, PR_TITLE, findingLines, resultLines, buildRunJson, buildRunMarkdown } from "./report.js";
import { hardeningStatus } from "./safety.js";

// ─── Config (resolved inside main() so importing this module is side-effect-free) ─

let ACCOUNT, TOKEN, DRY_RUN, WORKSPACE, BRANCH_PREFIX;
let AUTO_MERGE, MERGE_METHOD, REPORTS_DIR, reportBase, reportStamp;
let reportWarned = false;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function env(name) {
  const val = process.env[name];
  if (!val) {
    console.error(chalk.red(`✖ Missing required env var: ${name}`));
    process.exit(2);
  }
  return val;
}

// The target account is EITHER a GitHub org (GH_ORG) or a personal user account
// (GH_USER). Set exactly one — comment out the other in your .env. The resolved
// `owner` is used both to list repos and to prefix bare GH_REPO entries.
function resolveAccount() {
  const org = (process.env.GH_ORG || "").trim();
  const user = (process.env.GH_USER || "").trim();
  if (org && user) {
    console.error(chalk.red("✖ Set only one of GH_ORG or GH_USER, not both"));
    process.exit(2);
  }
  if (!org && !user) {
    console.error(
      chalk.red("✖ Set GH_ORG (organization) or GH_USER (personal account)"),
    );
    process.exit(2);
  }
  return user ? { kind: "user", owner: user } : { kind: "org", owner: org };
}

function section(title) {
  console.log("\n" + chalk.bold.underline(title));
}
function indent(lines, color = chalk.gray) {
  for (const l of lines) console.log("    " + color(l));
}

// ─── Clone ───────────────────────────────────────────────────────────────────

async function cloneRepo(fullName) {
  const repoName = fullName.split("/")[1];
  const dest = path.join(WORKSPACE, repoName);
  if (existsSync(dest)) await fs.rm(dest, { recursive: true, force: true });

  const url = `https://x-access-token:${TOKEN}@github.com/${fullName}.git`;
  const clone = await safeGit(["clone", "--depth=1", url, dest]);
  if (clone.exitCode !== 0) throw new Error(`clone failed: ${clone.stderr}`);

  await safeGit(["-C", dest, "config", "user.email", "polinrider-cleanup-bot@users.noreply.github.com"]);
  await safeGit(["-C", dest, "config", "user.name", "PolinRider Cleanup Bot"]);
  return dest;
}

// ─── Commit + push + PR ────────────────────────────────────────────────────────

async function openPR(repoDir, fullName, findings, result) {
  const branch = `${BRANCH_PREFIX}-${Date.now()}`;

  const checkout = await safeGit(["-C", repoDir, "checkout", "-b", branch]);
  if (checkout.exitCode !== 0) throw new Error(`branch creation failed: ${checkout.stderr}`);

  await safeGit(["-C", repoDir, "add", "-A"]);
  const staged = await safeGit(["-C", repoDir, "diff", "--cached", "--name-only"]);
  if (!staged.stdout.trim()) return { skipped: true, reason: "no staged changes after remediation" };

  const commit = await safeGit([
    "-C", repoDir, "commit",
    "-m", "security: remove PolinRider malware artifacts\n\nAutomated surgical cleanup by polinrider-remover.",
  ]);
  if (commit.exitCode !== 0) throw new Error(`commit failed: ${commit.stderr}`);

  const push = await safeGit([
    "-C", repoDir, "push",
    `https://x-access-token:${TOKEN}@github.com/${fullName}.git`,
    branch,
  ]);
  if (push.exitCode !== 0) throw new Error(`push failed: ${push.stderr}`);

  const body = buildPrBody({ findings, result });
  const baseArgs = ["pr", "create", "--repo", fullName, "--title", PR_TITLE, "--body", body, "--head", branch];
  let pr = await safeGh([...baseArgs, "--label", "security"]);
  if (pr.exitCode !== 0) pr = await safeGh(baseArgs); // retry without label (may not exist)
  if (pr.exitCode !== 0) throw new Error(`PR creation failed: ${pr.stderr}`);
  const url = pr.stdout.trim();

  if (!AUTO_MERGE) return { url, merged: false, mergeError: null };

  // Respect branch protection: a direct merge fails where reviews/checks are
  // required — that's reported, not bypassed. Retry once for mergeability lag.
  const mergeArgs = ["pr", "merge", url, `--${MERGE_METHOD}`, "--delete-branch"];
  let merge = await safeGh(mergeArgs);
  if (merge.exitCode !== 0) {
    await sleep(3000);
    merge = await safeGh(mergeArgs);
  }
  if (merge.exitCode === 0) return { url, merged: true, mergeError: null };
  return { url, merged: false, mergeError: (merge.stderr || merge.stdout || "merge failed").trim().split("\n")[0] };
}

// ─── Resolve target repos ──────────────────────────────────────────────────────
//
// Set GH_REPO (alias GH_REPOS) to a comma-separated list to scope a pilot run to
// specific repos and skip the listing. Each entry may be "name" (the account
// owner — GH_ORG or GH_USER — is prefixed) or "owner/name". Unset → scan every
// repo for the configured account (org repos, or the user's owned repos).

const REPO_RE = /^[\w.-]+\/[\w.-]+$/;

async function resolveTargetRepos() {
  const scope = (process.env.GH_REPOS || process.env.GH_REPO || "").trim();
  if (scope) {
    const repos = scope
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((r) => (r.includes("/") ? r : `${ACCOUNT.owner}/${r}`));
    const invalid = repos.filter((r) => !REPO_RE.test(r));
    if (invalid.length) {
      console.error(chalk.red(`✖ Invalid repo name(s) in GH_REPO: ${invalid.join(", ")}`));
      process.exit(2);
    }
    console.log(
      chalk.yellow(`  Scoped run — ${repos.length} repo(s) from GH_REPO: ${chalk.bold(repos.join(", "))}`),
    );
    return repos;
  }

  const spinner = ora(
    `Fetching repos for ${ACCOUNT.kind}: ${chalk.bold(ACCOUNT.owner)}`,
  ).start();
  // Org → all repos in the org. User → repos OWNED by the authenticated user
  // (affiliation=owner excludes repos you're only a collaborator/org member on).
  const endpoint =
    ACCOUNT.kind === "org"
      ? `orgs/${ACCOUNT.owner}/repos`
      : "user/repos?affiliation=owner";
  const list = await safeGh(["api", endpoint, "--paginate", "--jq", ".[].full_name"]);
  if (list.exitCode !== 0) {
    spinner.fail(`Failed to list ${ACCOUNT.kind} repos`);
    console.error(list.stderr);
    process.exit(2);
  }
  const repos = list.stdout.split("\n").map((r) => r.trim()).filter(Boolean);
  spinner.succeed(`Found ${chalk.bold(repos.length)} repositories`);
  return repos;
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export async function main() {
  ACCOUNT = resolveAccount();
  TOKEN = env("GH_TOKEN");
  DRY_RUN = process.env.DRY_RUN === "true";
  WORKSPACE = process.env.WORKSPACE || "/workspace";
  BRANCH_PREFIX = process.env.BRANCH_PREFIX || "fix/polinrider-cleanup";
  AUTO_MERGE = process.env.AUTO_MERGE === "true";
  MERGE_METHOD = (process.env.MERGE_METHOD || "squash").toLowerCase();
  if (!["squash", "merge", "rebase"].includes(MERGE_METHOD)) {
    console.error(chalk.red(`✖ MERGE_METHOD must be squash|merge|rebase (got "${MERGE_METHOD}")`));
    process.exit(2);
  }
  REPORTS_DIR = process.env.REPORTS_DIR ?? "reports"; // set empty to disable
  reportStamp = new Date();
  reportBase = REPORTS_DIR
    ? path.join(REPORTS_DIR, `polinrider-${reportStamp.toISOString().replace(/[:.]/g, "-")}`)
    : null;

  console.log(chalk.bold.cyan("\n╔══════════════════════════════════════╗"));
  console.log(chalk.bold.cyan("║   PolinRider Org Cleanup Tool v2.0   ║"));
  console.log(chalk.bold.cyan("╚══════════════════════════════════════╝"));

  const h = hardeningStatus();
  console.log(
    chalk.gray(
      `  hardening: eval ${h.evalBlocked ? "blocked" : chalk.red("OPEN")}, codegen-flag ${
        h.codegenFlag ? "on" : chalk.yellow("off")
      }, launcher ${h.hardenedLaunch ? "on" : chalk.yellow("off")}`,
    ),
  );
  if (DRY_RUN) console.log(chalk.yellow.bold("\n  ⚠  DRY RUN — no files written, no pushes or PRs\n"));

  await fs.mkdir(WORKSPACE, { recursive: true });

  const results = { total: 0, clean: 0, infected: 0, remediated: 0, prOpened: 0, merged: 0, manualOnly: 0, errors: [], prs: [], repos: [] };

  const repos = await resolveTargetRepos();
  results.total = repos.length;

  for (const fullName of repos) {
    const repoName = fullName.split("/")[1];
    section(fullName);
    let repoDir;
    const record = { repo: fullName, severity: null, findings: [], deleted: [], modified: [], notes: [], manualReview: [], pr: null, error: null };
    try {
      const cloneSpinner = ora("  Cloning...").start();
      repoDir = await cloneRepo(fullName);
      cloneSpinner.succeed(chalk.gray("  Cloned"));

      const scanSpinner = ora("  Scanning...").start();
      const findings = await scanRepo(repoDir);
      record.severity = findings.severity;
      record.findings = findings.findings.map((f) => ({
        file: f.file, action: f.action, confidence: f.confidence, contentConfirmed: f.contentConfirmed, description: f.description,
      }));
      record.manualReview = findings.manualReview;

      if (findings.severity !== "infected") {
        const note = findings.coPresenceAmplified ? " (suspicious file layout — no confirmed payload)" : "";
        scanSpinner.succeed("  " + chalk.green(`Clean — no PolinRider signatures found${note}`));
        results.clean++;
        continue;
      }
      scanSpinner.warn("  " + chalk.red.bold("INFECTED — malware signatures detected"));
      results.infected++;
      indent(findingLines(findings));

      const remSpinner = ora("  Remediating...").start();
      const result = await remediate(repoDir, findings, { dryRun: DRY_RUN });
      record.deleted = result.filesDeleted;
      record.modified = result.filesModified;
      record.notes = result.notes;
      remSpinner.succeed("  " + chalk.magenta(DRY_RUN ? "Planned remediation (dry run)" : "Remediated"));
      indent(resultLines(result));

      if (DRY_RUN) continue;

      if (!result.changed) {
        results.manualOnly++;
        results.errors.push({ repo: fullName, reason: "infected but only manual-review items — no automated fix" });
        continue;
      }
      results.remediated++;

      const prSpinner = ora("  Creating PR...").start();
      const pr = await openPR(repoDir, fullName, findings, result);
      if (pr.skipped) {
        prSpinner.warn(`  Skipped PR: ${pr.reason}`);
      } else {
        record.pr = { url: pr.url, merged: pr.merged, mergeError: pr.mergeError };
        results.prOpened++;
        results.prs.push({ repo: fullName, url: pr.url, merged: pr.merged });
        if (pr.merged) {
          results.merged++;
          prSpinner.succeed("  " + chalk.green.bold(`PR merged: ${pr.url}`));
        } else if (pr.mergeError) {
          prSpinner.warn("  " + chalk.yellow(`PR opened — auto-merge blocked (${pr.mergeError}); merge manually: ${pr.url}`));
        } else {
          prSpinner.succeed("  " + chalk.blue.bold(`PR opened: ${pr.url}`));
        }
      }
    } catch (err) {
      console.log("  " + chalk.red("✖ ") + chalk.bold(repoName) + " " + err.message);
      record.error = err.message;
      results.errors.push({ repo: fullName, reason: err.message });
    } finally {
      if (repoDir) await fs.rm(repoDir, { recursive: true, force: true }).catch(() => {});
      results.repos.push(record);
      await writeReports(results); // rewrite after every repo → live, crash-resilient trace
    }
  }

  await writeReports(results);
  printSummary(results);
  process.exit(results.infected > 0 && results.remediated < results.infected && !DRY_RUN ? 1 : 0);
}

// Persist the run report (JSON + Markdown) to REPORTS_DIR. Rewritten after every
// repo so a trace survives even if the run is interrupted. Never fails the run.
async function writeReports(results) {
  if (!REPORTS_DIR || !reportBase) return;
  const run = {
    scannedAt: reportStamp.toISOString(),
    scannedAtHuman: reportStamp.toString(),
    account: { kind: ACCOUNT.kind, owner: ACCOUNT.owner },
    dryRun: DRY_RUN,
    autoMerge: AUTO_MERGE,
    mergeMethod: MERGE_METHOD,
    totals: {
      total: results.total, clean: results.clean, infected: results.infected,
      remediated: results.remediated, merged: results.merged, prOpened: results.prOpened,
      manualOnly: results.manualOnly, errors: results.errors.length,
    },
    repos: results.repos,
  };
  try {
    await fs.mkdir(REPORTS_DIR, { recursive: true });
    const json = JSON.stringify(buildRunJson(run), null, 2);
    const md = buildRunMarkdown(run);
    await fs.writeFile(`${reportBase}.json`, json);
    await fs.writeFile(`${reportBase}.md`, md);
    await fs.writeFile(path.join(REPORTS_DIR, "latest.json"), json);
    await fs.writeFile(path.join(REPORTS_DIR, "latest.md"), md);
  } catch (e) {
    if (!reportWarned) {
      reportWarned = true;
      console.log(chalk.yellow(`  ⚠ could not write reports to ${REPORTS_DIR}: ${e.message}`));
    }
  }
}

function printSummary(results) {
  console.log("\n" + chalk.bold.cyan("══════════════════════════════════════"));
  console.log(chalk.bold("  SUMMARY"));
  console.log(chalk.bold.cyan("══════════════════════════════════════"));
  console.log(`  ${chalk.bold("Repos scanned:")}    ${results.total}`);
  console.log(`  ${chalk.green.bold("Clean:")}            ${results.clean}`);
  console.log(`  ${chalk.red.bold("Infected:")}         ${results.infected}`);
  console.log(`  ${chalk.magenta.bold("Remediated:")}       ${results.remediated}`);
  console.log(`  ${chalk.blue.bold("PRs opened:")}       ${results.prOpened}`);
  if (AUTO_MERGE) console.log(`  ${chalk.green.bold("PRs merged:")}       ${results.merged}`);
  if (results.manualOnly) console.log(`  ${chalk.yellow.bold("Manual review:")}    ${results.manualOnly}`);

  if (results.prs.length) {
    console.log("\n" + chalk.bold("  Pull Requests:"));
    for (const { repo, url, merged } of results.prs) {
      const mark = merged ? chalk.green("✔ merged") : chalk.blue("⎇ open");
      console.log(`    ${mark} ${chalk.bold(repo)}\n      ${url}`);
    }
  }
  if (results.errors.length) {
    console.log("\n" + chalk.yellow.bold("  Errors / needs manual review:"));
    for (const { repo, reason } of results.errors) console.log(`    ${chalk.yellow("⚠")} ${chalk.bold(repo)}: ${reason}`);
  }
  if (REPORTS_DIR && reportBase) {
    console.log("\n  " + chalk.gray(`Report written: ${reportBase}.md (and latest.md / .json in ${REPORTS_DIR}/)`));
  }
  console.log(chalk.bold.cyan("══════════════════════════════════════\n"));
}

// Auto-run only when executed directly (`node src/index.js`). When imported —
// by the launcher or a test — call main() explicitly instead. This keeps import
// side-effect-free (no env reads, no process.exit) so the module is testable.
const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  main().catch((err) => {
    console.error(chalk.red("\nFatal error:"), err.message);
    process.exit(2);
  });
}
