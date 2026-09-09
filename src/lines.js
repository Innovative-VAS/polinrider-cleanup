/**
 * Char offset to 1-based line number.
 *
 * This existed twice, byte-for-byte, in ci.js (`findingLine`) and sarif.js
 * (`lineFor`). Both convert a finding's `edit.offset` into the line an
 * annotation or SARIF region points at, so they must agree — keeping one copy
 * is the only way to guarantee that.
 *
 * Reads the file because a char offset alone cannot be turned into a line.
 * Every failure path returns 1 (file level), never throws.
 */

import fs from "node:fs";
import path from "node:path";

/**
 * @param {string} repoDir            directory the finding's `file` is relative to
 * @param {{file: string, edit?: {offset?: number}}} finding
 * @returns {number} 1-based line, or 1 when there is no usable offset
 */
export function findingStartLine(repoDir, finding) {
  const offset = finding?.edit?.offset;
  if (!(offset > 0) || !repoDir) return 1;
  try {
    const text = fs.readFileSync(path.join(repoDir, finding.file), "utf8");
    if (offset > text.length) return 1;
    return text.slice(0, offset).split("\n").length;
  } catch {
    return 1;
  }
}
