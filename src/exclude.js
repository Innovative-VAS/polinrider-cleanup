/**
 * Build a path matcher from a list of ignore patterns, so a scan can skip files
 * that are known-legitimate but would otherwise match (e.g. this very tool's own
 * signature definitions and payload fixtures). Dependency-free — a minimal glob.
 *
 * Patterns are matched against POSIX, repo-relative paths. Supported forms:
 *   - exact file:   src/signatures.js
 *   - directory:    dist        (or dist/  — matches everything under it)
 *   - glob:         test/**      **\/fixtures/**      *.min.js
 *     `*` matches within a path segment; `**` matches across segments.
 */

const normalize = (p) =>
  (p || "").replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+$/, "");

function globToRegExp(glob) {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        re += ".*"; // ** → any chars, including "/"
        i++;
      } else {
        re += "[^/]*"; // * → any chars except "/"
      }
    } else if (c === "?") {
      re += "[^/]";
    } else if ("\\^$.|+()[]{}".includes(c)) {
      re += "\\" + c;
    } else {
      re += c;
    }
  }
  return new RegExp("^" + re + "$");
}

/**
 * @param {string[]|string} patterns  array, or comma/newline-separated string
 * @returns {(relPosixPath: string) => boolean}
 */
export function buildExcluder(patterns) {
  const list = Array.isArray(patterns)
    ? patterns
    : String(patterns || "").split(/[,\n]/);
  const specs = list
    .map((p) => normalize(p.trim?.() ?? p))
    .filter(Boolean)
    .map((n) => ({ prefix: n, re: globToRegExp(n) }));

  if (specs.length === 0) return () => false;
  return (rel) => {
    const r = (rel || "").replace(/\\/g, "/");
    return specs.some((s) => r === s.prefix || r.startsWith(s.prefix + "/") || s.re.test(r));
  };
}
