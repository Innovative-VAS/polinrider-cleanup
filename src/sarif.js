/**
 * Build a minimal SARIF 2.1.0 report from a Findings object so consumers can
 * upload results to GitHub code scanning (github/codeql-action/upload-sarif) and
 * see them in the Security tab / inline on the PR.
 *
 * Pure with respect to the repo: it only reads files to convert a js-payload's
 * char offset into a 1-based line. Every other finding is file-level (startLine 1).
 */

import fs from "node:fs";
import path from "node:path";

const PROJECT_URL = "https://github.com/Innovative-VAS/polinrider-cleanup";
const levelOf = (f) => (f.contentConfirmed ? "error" : "warning");

/** 1-based start line for findings that carry a char offset, else 1. */
function lineFor(repoDir, f) {
  const offset = f.edit?.offset;
  if (!(offset > 0) || !repoDir) return 1;
  try {
    const text = fs.readFileSync(path.join(repoDir, f.file), "utf8");
    if (offset > text.length) return 1;
    return text.slice(0, offset).split("\n").length;
  } catch {
    return 1;
  }
}

/** Repo-root-relative, forward-slashed URI (SARIF artifactLocation). */
function uriFor(repoRoot, repoDir, relFile) {
  const abs = path.join(repoDir || repoRoot, relFile);
  const rel = path.relative(repoRoot || repoDir, abs) || relFile;
  return rel.split(path.sep).join("/");
}

/**
 * @param {import('./scanner.js').Findings} findings
 * @param {{ repoRoot?: string, repoDir?: string }} [opts]
 */
export function buildSarif(findings, opts = {}) {
  const root = opts.repoRoot || opts.repoDir || findings.repoDir;
  const dir = opts.repoDir || findings.repoDir || root;

  const rules = new Map();
  const results = findings.findings.map((f) => {
    if (!rules.has(f.id)) {
      rules.set(f.id, {
        id: f.id,
        name: f.id,
        shortDescription: { text: `PolinRider ${f.category} artifact` },
        fullDescription: { text: f.description },
        defaultConfiguration: { level: levelOf(f) },
        helpUri: PROJECT_URL,
        properties: { tags: ["security", "malware", "polinrider", f.category] },
      });
    }
    return {
      ruleId: f.id,
      level: levelOf(f),
      message: { text: f.description },
      locations: [
        {
          physicalLocation: {
            artifactLocation: { uri: uriFor(root, dir, f.file) },
            region: { startLine: lineFor(dir, f) },
          },
        },
      ],
      properties: { confidence: f.confidence, contentConfirmed: f.contentConfirmed, action: f.action },
    };
  });

  return {
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: "polinrider-cleanup",
            informationUri: PROJECT_URL,
            rules: [...rules.values()],
          },
        },
        results,
      },
    ],
  };
}
