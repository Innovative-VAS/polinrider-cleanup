/**
 * Font payload-carrier analysis.
 *
 * PolinRider has a variant that drops a malicious file into public/fonts (or
 * static/, assets/fonts/). We flag a font ONLY when it is both:
 *   1. unreferenced — no CSS/HTML/JS in the repo mentions its filename, and
 *   2. suspicious   — it does NOT parse as a structurally valid font.
 *
 * "Structurally valid" is the primary signal: a real font has valid magic AND a
 * well-formed table directory / header whose declared extents stay inside the
 * file. A genuine font is trusted unconditionally — even when its bytes happen to
 * contain a license URL or a long base64-looking run of binary glyph data (both
 * of which previously caused false positives on legitimate fonts).
 *
 * The real carrier is the opposite of a font: it has no font magic at all — it is
 * readable JavaScript text (`global['!']=…; require(…); eval(…)`). Such a file
 * fails structural validation, and the presence of code-execution strings
 * (FONT_BADNESS_RES) confirms it is an appended payload rather than a merely
 * corrupt font.
 *
 * Reading the file as a Buffer and scanning bytes never executes anything.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { collectByExtension, DEFAULT_EXCLUDE } from "./walk.js";
import { FONT_MAGIC, FONT_BADNESS_RES, FONT_REF_EXTENSIONS } from "./signatures.js";

// A reference inside .vscode (e.g. a malicious task pointing at its payload font)
// must NOT count as legitimate usage.
const REF_EXCLUDE = new Set([...DEFAULT_EXCLUDE, ".vscode"]);

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
 * Validate a buffer's font structure from its header/table directory alone.
 * Pure and byte-only: never executes anything, never allocates based on the
 * file's own declared sizes.
 *
 * A recognized magic whose declared extents stay within the file is treated as a
 * genuine font. When the magic is recognized but the specific variant is one we
 * don't fully parse, we give the benefit of the doubt (valid) — the downstream
 * blast radius is file deletion, so we only reject when we are confident the
 * bytes are NOT a font.
 *
 * @param {Buffer} buf
 * @returns {{ valid: boolean, format: string, reason?: string }}
 */
export function parseFontStructure(buf) {
  const format = readMagic(buf);
  if (format === "unknown") {
    return { valid: false, format, reason: "no recognizable font magic bytes" };
  }

  // WOFF / WOFF2: header declares the total file length at offset 8 and the table
  // count at offset 12 — both trivially cross-checkable against the actual bytes.
  if (format === "woff" || format === "woff2") {
    if (buf.length >= 14 && buf.readUInt32BE(8) === buf.length && buf.readUInt16BE(12) > 0) {
      return { valid: true, format };
    }
    return { valid: false, format, reason: `malformed ${format} header (declared length or table count invalid)` };
  }

  // TrueType Collection: numFonts at offset 8, then that many sfnt-header offsets.
  if (format === "ttc") {
    if (buf.length >= 12) {
      const numFonts = buf.readUInt32BE(8);
      if (numFonts >= 1 && numFonts <= 256 && 12 + numFonts * 4 <= buf.length) {
        let ok = true;
        for (let i = 0; i < numFonts; i++) {
          if (buf.readUInt32BE(12 + i * 4) + 12 > buf.length) {
            ok = false;
            break;
          }
        }
        if (ok) return { valid: true, format };
      }
    }
    return { valid: false, format, reason: "malformed TrueType Collection header" };
  }

  // sfnt (ttf / otf / legacy 'true'): numTables at offset 4, then a 16-byte table
  // directory. Every table's (offset + length) must stay within the file.
  const numTables = buf.length >= 6 ? buf.readUInt16BE(4) : 0;
  const dirEnd = 12 + numTables * 16;
  if (numTables < 1 || numTables > 4096 || dirEnd > buf.length) {
    return { valid: false, format, reason: "malformed font table directory" };
  }
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16;
    if (buf.readUInt32BE(rec + 8) + buf.readUInt32BE(rec + 12) > buf.length) {
      return { valid: false, format, reason: "font table points past end of file" };
    }
  }
  return { valid: true, format };
}

/** Scan a font's leading bytes for code-execution strings a real font never has. */
function scanCodeStrings(buf) {
  const window = buf.subarray(0, Math.min(buf.length, BYTE_SCAN_LIMIT)).toString("latin1");
  return FONT_BADNESS_RES.some((re) => re.test(window))
    ? ["contains embedded code-like strings a real font never has (eval/require/global[/etc.)"]
    : [];
}

/**
 * Inspect font bytes for signs it isn't a real font.
 *
 * A structurally valid font is trusted unconditionally (never `bad`). Otherwise
 * the file is flagged, and `hasCodeStrings` tells the caller whether it also
 * carries a code payload — the difference between a confirmed carrier (auto-remove)
 * and a merely unrecognized blob (manual review).
 *
 * @param {Buffer} buf
 * @param {string} [ext] file extension (e.g. ".woff2"). Formats without a reliable
 *   magic number (.eot) can only be flagged by embedded code strings.
 * @returns {{ bad: boolean, magic: string, reasons: string[], hasCodeStrings: boolean }}
 */
export function looksSuspicious(buf, ext = "") {
  // EOT has no single stable magic; never reject it structurally — only an
  // embedded code payload makes an .eot suspicious.
  if (NO_RELIABLE_MAGIC.has(ext.toLowerCase())) {
    const reasons = scanCodeStrings(buf);
    return { bad: reasons.length > 0, magic: readMagic(buf), reasons, hasCodeStrings: reasons.length > 0 };
  }

  const struct = parseFontStructure(buf);
  if (struct.valid) {
    return { bad: false, magic: struct.format, reasons: [], hasCodeStrings: false };
  }

  const codeReasons = scanCodeStrings(buf);
  return {
    bad: true,
    magic: struct.format,
    reasons: [struct.reason, ...codeReasons],
    hasCodeStrings: codeReasons.length > 0,
  };
}

/**
 * Build a lowercased haystack of every file that could reference a font, so we
 * can cheaply test whether a font filename is used anywhere. Conservative by
 * design: a substring match counts as "referenced" (we'd rather keep a file
 * than wrongly delete a legitimate, referenced font).
 */
export async function collectFontReferences(repoDir) {
  const files = await collectByExtension(repoDir, FONT_REF_EXTENSIONS, { exclude: REF_EXCLUDE });
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
