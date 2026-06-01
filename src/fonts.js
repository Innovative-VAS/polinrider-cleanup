/**
 * Font payload-carrier analysis.
 *
 * PolinRider has a variant that drops a malicious file into public/fonts (or
 * static/, assets/fonts/). We flag a font ONLY when it is both:
 *   1. unreferenced — no CSS/HTML/JS in the repo mentions its filename, and
 *   2. suspicious   — its bytes lack valid font magic, or contain JS-like
 *                     strings / a long base64 blob that a real font never would.
 *
 * Reading the file as a Buffer and scanning bytes never executes anything.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { collectByExtension } from "./walk.js";
import { FONT_MAGIC, FONT_BADNESS_RES, FONT_REF_EXTENSIONS } from "./signatures.js";

const NO_RELIABLE_MAGIC = new Set([".eot"]); // EOT lacks a single stable magic
const BYTE_SCAN_LIMIT = 256 * 1024; // scan at most 256 KB for embedded strings
const REF_HAYSTACK_LIMIT = 8 * 1024 * 1024; // cap concatenated reference text

/** Identify a font format from the first 4 bytes, or 'unknown'. */
export function readMagic(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 4) return "unknown";
  for (const [fmt, sig] of Object.entries(FONT_MAGIC)) {
    if (!sig) continue;
    if (sig.every((b, idx) => buf[idx] === b)) return fmt;
  }
  return "unknown";
}

/**
 * Inspect font bytes for signs it isn't a real font.
 * @param {Buffer} buf
 * @param {string} [ext] file extension (e.g. ".woff2") — relaxes the magic
 *   requirement for formats without a reliable magic number.
 * @returns {{ bad: boolean, magic: string, reasons: string[] }}
 */
export function looksSuspicious(buf, ext = "") {
  const reasons = [];
  const magic = readMagic(buf);
  if (magic === "unknown" && !NO_RELIABLE_MAGIC.has(ext.toLowerCase())) {
    reasons.push("no recognizable font magic bytes");
  }
  const window = buf.subarray(0, Math.min(buf.length, BYTE_SCAN_LIMIT)).toString("latin1");
  if (FONT_BADNESS_RES.some((re) => re.test(window))) {
    reasons.push("contains embedded code-like strings a real font never has (eval/require/URL/etc.)");
  }
  if (/[A-Za-z0-9+/]{200,}={0,2}/.test(window)) {
    reasons.push("contains a long base64-like blob");
  }
  return { bad: reasons.length > 0, magic, reasons };
}

/**
 * Build a lowercased haystack of every file that could reference a font, so we
 * can cheaply test whether a font filename is used anywhere. Conservative by
 * design: a substring match counts as "referenced" (we'd rather keep a file
 * than wrongly delete a legitimate, referenced font).
 */
export async function collectFontReferences(repoDir) {
  const files = await collectByExtension(repoDir, FONT_REF_EXTENSIONS);
  let haystack = "";
  for (const f of files) {
    if (haystack.length > REF_HAYSTACK_LIMIT) break;
    try {
      haystack += "\n" + (await fs.readFile(f, "utf8")).toLowerCase();
    } catch {
      /* unreadable file → skip */
    }
  }
  return haystack;
}

/** True if the font's basename appears anywhere in the reference haystack. */
export function isReferenced(haystack, fontPath) {
  return haystack.includes(path.basename(fontPath).toLowerCase());
}
