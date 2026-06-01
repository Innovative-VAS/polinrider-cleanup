/**
 * Minimal recursive file walker shared by the scanner and font analysis.
 *
 * SAFETY: never follows symlinks — a malicious repo can't use a symlink to
 * redirect our reads outside the cloned working tree. Reads nothing here; it
 * only yields paths. Excludes .git and node_modules by default.
 */

import fs from "node:fs/promises";
import path from "node:path";

export const DEFAULT_EXCLUDE = new Set([".git", "node_modules"]);

/**
 * Async-generate absolute file paths under `root`.
 * @param {string} root
 * @param {{ exclude?: Set<string> }} [opts]
 */
export async function* walkFiles(root, { exclude = DEFAULT_EXCLUDE } = {}) {
  let entries;
  try {
    entries = await fs.readdir(root, { withFileTypes: true });
  } catch {
    return; // unreadable directory → yield nothing
  }
  for (const ent of entries) {
    if (ent.isSymbolicLink()) continue;
    const full = path.join(root, ent.name);
    if (ent.isDirectory()) {
      if (exclude.has(ent.name)) continue;
      yield* walkFiles(full, { exclude });
    } else if (ent.isFile()) {
      yield full;
    }
  }
}

/** Collect paths whose extension is in `extensions` (lowercased, with dot). */
export async function collectByExtension(root, extensions, opts) {
  const exts = new Set(extensions.map((e) => e.toLowerCase()));
  const out = [];
  for await (const file of walkFiles(root, opts)) {
    if (exts.has(path.extname(file).toLowerCase())) out.push(file);
  }
  return out;
}
