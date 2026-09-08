/**
 * Payload assessment: what does this code DO, WHERE does it sit, and does it
 * look machine-generated?
 *
 * This module is PURE — no file I/O, no network, no execution of anything it
 * reads. It contains only scoring logic and policy; every literal
 * indicator-of-compromise token lives in signatures.js, which is the one src
 * file excluded from the CI self-scan. Putting a token string here would make
 * the tool flag its own source. test/selfscan.test.js enforces that.
 *
 * The governing rule is that POSITION IS A NECESSARY GATE and CAPABILITY IS THE
 * CONFIRMING GATE. Capability evidence inside a file's normal body is never a
 * finding: this repo's own safe-exec.js and ci.js legitimately spawn processes.
 * Only code sitting where legitimate code does not sit is even considered, and
 * only then does what it does decide the verdict.
 */

import * as sig from "./signatures.js";
import {
  bindingsOf, lexJs, referencesOf, regionOf, regionOfStatements, verifySplice,
} from "./jslex.js";

/** Statement kinds that can never be payload — they define the module's shape. */
const STRUCTURAL_KINDS = new Set(["import", "export", "module-exports", "directive"]);

/** First tokens that cannot legally begin a statement. */
const ILLEGAL_STATEMENT_START = new Set([
  ")", "]", "}", ",", ".", "?.", "=>", ":", "=", "==", "===", "!=", "!==",
  "&&", "||", "??", "*", "/", "%", "**", "<", ">", "<=", ">=", "|", "&", "^",
  "+=", "-=", "*=", "/=", "%=", "&&=", "||=", "??=",
]);

/** Whole-word search without building a RegExp from a string. */
function containsWord(hay, word) {
  if (!hay || !word) return false;
  let from = 0;
  for (;;) {
    const at = hay.indexOf(word, from);
    if (at < 0) return false;
    const before = at === 0 ? "" : hay[at - 1];
    const after = at + word.length >= hay.length ? "" : hay[at + word.length];
    const isPart = (c) => c !== "" && /[A-Za-z0-9_$]/.test(c);
    if (!isPart(before) && !isPart(after)) return true;
    from = at + 1;
  }
}

/** Select the haystack a rule is allowed to see. There is deliberately no raw or comment view. */
function pickView(region, view) {
  if (view === "code") return region.code;
  if (view === "literals") return region.literals;
  if (view === "any") return `${region.code}\n${region.literals}`;
  return null;
}

/**
 * Score what a region of code DOES.
 *
 * Only the highest-weight hit per `group` is counted, so requiring http, https
 * and net scores 3 rather than 9. That makes `score` mean "how many distinct
 * dangerous things this does" and makes `distinct` a real diversity metric.
 * Rules flagged `weak` add to the score but not to `distinct`, so a
 * high-false-positive corroborator can never satisfy the diversity floor alone.
 *
 * @param {object} region  from jslex regionOf / regionOfStatements
 * @param {{ rules?, riskyModules?, variantSets? }} [opts]  injectable for tests
 */
export function scoreCapabilities(region, opts = {}) {
  const rules = opts.rules ?? sig.CAPABILITY_RULES;
  const risky = opts.riskyModules ?? sig.RISKY_MODULES;
  const variantSets = opts.variantSets ?? sig.VARIANT_IDENT_SETS;

  const raw = [];
  const byId = new Map(rules.map((r) => [r.id, r]));

  // ── module specifiers, matched by EXACT equality (never by regex over text) ──
  let sawObfuscatedSpecifier = false;
  for (const spec of region.specifiers ?? []) {
    if (spec.obfuscated) sawObfuscatedSpecifier = true;
    const bare = String(spec.spec).replace(/^node:/, "");
    const info = risky.get(bare);
    if (info) {
      raw.push({
        id: `mod.${bare}`,
        weight: info.weight,
        group: info.group,
        label: info.label,
        weak: false,
      });
    }
  }
  if (sawObfuscatedSpecifier) {
    const r = byId.get("obf.spec-escape");
    if (r) raw.push({ id: r.id, weight: r.weight, group: r.group, label: r.label, weak: !!r.weak });
  }

  // ── single rules, plus collection of weight-0 pair members ──
  const memberHit = new Set();
  for (const rule of rules) {
    if (!rule.re) continue;
    let matched = false;
    if (rule.wholeLiteral) {
      // Tested against each literal's FULL contents, so a date like "12-2024-1"
      // cannot match a campaign id as a substring.
      matched = (region.literalBodies ?? []).some((body) => rule.re.test(body));
    } else {
      const hay = pickView(region, rule.view);
      matched = hay ? rule.re.test(hay) : false;
    }
    if (!matched) continue;
    if (rule.weight === 0) memberHit.add(rule.id);
    else raw.push({ id: rule.id, weight: rule.weight, group: rule.group, label: rule.label, weak: !!rule.weak });
  }

  // ── pair rules: every member must have hit within this same region ──
  for (const rule of rules) {
    if (!Array.isArray(rule.requires)) continue;
    if (rule.requires.every((id) => memberHit.has(id))) {
      raw.push({ id: rule.id, weight: rule.weight, group: rule.group, label: rule.label, weak: !!rule.weak });
    }
  }

  // ── variant identifier fingerprints ──
  for (const set of variantSets) {
    const hay = pickView(region, set.view);
    if (!hay) continue;
    const found = set.idents.filter((ident) => containsWord(hay, ident));
    if (found.length >= set.minHits) {
      raw.push({
        id: `variant.${set.id}`,
        weight: set.weight,
        group: set.group,
        label: `${set.label} (${found.length}/${set.idents.length} markers)`,
        weak: false,
      });
    }
  }

  // ── group capping ──
  const best = new Map();
  for (const h of raw) {
    const key = h.group ?? `~${h.id}`;
    const cur = best.get(key);
    if (!cur || h.weight > cur.weight) best.set(key, h);
  }
  let score = 0;
  const distinctGroups = new Set();
  for (const [key, h] of best) {
    score += h.weight;
    if (!h.weak) distinctGroups.add(key);
  }
  const countedIds = new Set([...best.values()].map((h) => h.id));

  return {
    score,
    distinct: distinctGroups.size,
    hits: raw.map((h) => ({ ...h, counted: countedIds.has(h.id) })),
    degraded: false,
  };
}

/**
 * Score whether a region looks machine-generated.
 *
 * This axis is independent of capability and is what separates an injected,
 * minified blob from a hand-written block of code that happens to do something
 * privileged. Deliberately absent: a blank-line-padding rule (padding is
 * already a POSITIONAL signal, and scoring it twice would let padding alone
 * satisfy the form floor) and any entropy metric (minified and obfuscated JS
 * have indistinguishable entropy).
 *
 * @param {object} region      the candidate region
 * @param {string} fileText    the whole file, for the byte-share baseline
 * @param {{ statements?: Array<{start:number,end:number}>, rules?: object }} [opts]
 */
export function scoreForm(region, fileText, opts = {}) {
  const R = opts.rules ?? sig.FORM_RULES;
  const raw = region.raw ?? "";
  const lines = raw.split("\n");

  const maxLineLen = lines.reduce((m, l) => Math.max(m, l.length), 0);
  const regionBytes = region.bytes ?? raw.length;
  const fileBytes = (fileText ?? "").length;

  // Comment density comes from the comments view — the only thing it is used for.
  const commentChars = (region.comments ?? "").replace(/\s/g, "").length;

  // Punctuation density is measured on RAW: on the code view, blanking a long
  // base64 literal removes its alphanumerics and artificially inflates the ratio.
  const punct = (raw.match(/[^\w\s]/g) || []).length;
  const alnum = (raw.match(/[A-Za-z0-9]/g) || []).length;
  const punctRatio = punct / Math.max(1, alnum);

  // Identifier stats come from the code view so words inside strings don't count.
  const idents = (region.code ?? "").match(/[A-Za-z_$][A-Za-z0-9_$]*/g) || [];
  const shortIdents = idents.filter((s) => s.length <= 2).length;
  const shortIdentRatio = idents.length ? shortIdents / idents.length : 0;

  const byteShare = fileBytes > 0 ? regionBytes / fileBytes : 0;
  const largestStatementBytes = (opts.statements ?? []).reduce(
    (m, s) => Math.max(m, s.end - s.start),
    0,
  );

  const hits = [];
  const add = (id, weight, label, value) => hits.push({ id, weight, label, value });

  for (const tier of R.longLine) {
    if (maxLineLen >= tier.chars) {
      add("form.long-line", tier.weight, tier.label, maxLineLen);
      break; // first (highest) matching tier wins
    }
  }
  if (regionBytes >= R.noComments.minBytes && commentChars === 0) {
    add("form.no-comments", R.noComments.weight, R.noComments.label, regionBytes);
  }
  if (punctRatio >= R.punctDense.min) {
    add("form.punct-dense", R.punctDense.weight, R.punctDense.label, +punctRatio.toFixed(2));
  }
  if (
    fileBytes >= R.byteShare.minFileBytes &&
    regionBytes >= R.byteShare.minRegionBytes &&
    byteShare >= R.byteShare.min
  ) {
    add("form.byte-share", R.byteShare.weight, R.byteShare.label, +byteShare.toFixed(2));
  }
  if (idents.length >= R.identObfuscated.minIdents && shortIdentRatio >= R.identObfuscated.min) {
    add("form.ident-obfuscated", R.identObfuscated.weight, R.identObfuscated.label, +shortIdentRatio.toFixed(2));
  }
  if (largestStatementBytes >= R.singleStatementBulk.minBytes) {
    add("form.single-statement-bulk", R.singleStatementBulk.weight, R.singleStatementBulk.label, largestStatementBytes);
  }

  return {
    score: hits.reduce((s, h) => s + h.weight, 0),
    hits,
    metrics: {
      maxLineLen,
      lineCount: lines.length,
      regionBytes,
      byteShare,
      commentChars,
      punctRatio,
      shortIdentRatio,
      largestStatementBytes,
    },
  };
}

/** Cheap double-check that a statement's delimiters balance within its own range. */
function balanced(codeSlice) {
  let p = 0;
  let b = 0;
  let c = 0;
  for (const ch of codeSlice) {
    if (ch === "(") p++;
    else if (ch === ")") p--;
    else if (ch === "[") b++;
    else if (ch === "]") b--;
    else if (ch === "{") c++;
    else if (ch === "}") c--;
    if (p < 0 || b < 0 || c < 0) return false;
  }
  return p === 0 && b === 0 && c === 0;
}

/**
 * The position gate: split a file's top-level statements into the legitimate
 * module and anything sitting where legitimate code does not sit.
 *
 * @param {string} text
 * @param {object} lex   a successful jslex result
 * @param {{ shims?: object[] }} [opts]
 */
export function partitionTopLevel(text, lex, opts = {}) {
  const empty = {
    ok: false,
    anchor: null,
    payload: [],
    kept: [],
    shims: [],
    preAnchor: [],
    flags: { interleaved: false, midFile: false, noAnchor: true, demoted: [] },
  };
  if (!lex?.ok) return { ...empty, reason: `lex-failed:${lex?.reason ?? "unknown"}` };

  const statements = lex.statements;

  // ── the anchor: the LAST statement that exports something ──
  //
  // Taking the statement's `end` rather than a marker's index means
  // `export function f() { ...150 lines... }` consumes its own body, and because
  // the classification ran on the code view, an `export default` written inside
  // a comment or a string can never become the boundary.
  let anchor = null;
  for (const st of statements) {
    if (st.kind === "export" || st.kind === "module-exports") anchor = st;
  }

  // The trailing run: statements after the last structural statement. A payload
  // appended to the end of a file lives here.
  const trailing = new Set();
  for (let k = statements.length - 1; k >= 0; k--) {
    if (STRUCTURAL_KINDS.has(statements[k].kind)) break;
    trailing.add(statements[k].index);
  }

  const isPadded = (st) => {
    const g = st.gapBefore;
    // A comment in the gap means a human separated two sections, not that
    // something was appended behind blank lines.
    if (g.hasComment) return false;
    return g.newlines >= 3 || (g.chars >= 200 && g.newlines >= 2);
  };

  const candidates = [];
  const preAnchor = [];

  for (const st of statements) {
    const positional = [];
    if (anchor && st.start >= anchor.end && trailing.has(st.index)) positional.push("post-export");
    if (isPadded(st)) positional.push("padded");
    if (positional.length === 0) continue;

    // Hard candidacy invariants. Failing any of these means the statement is
    // never eligible to be cut, regardless of how it scores.
    if (STRUCTURAL_KINDS.has(st.kind)) continue;
    const codeSlice = lex.code.slice(st.start, st.end);
    if (containsWord(codeSlice, "import") || containsWord(codeSlice, "export")) continue;
    if (!balanced(codeSlice)) continue;
    if (ILLEGAL_STATEMENT_START.has(st.firstToken)) continue;

    if (anchor && st.start < anchor.end) {
      // Positionally odd but BEFORE the export boundary: reportable, never cut.
      preAnchor.push({ st, positional });
      continue;
    }
    candidates.push({ st, positional });
  }

  // ── benign-tail exemption ──
  //
  // "Run if invoked directly", HMR acceptors and friends are idiomatic after an
  // export. This is a TIE-BREAKER only: the exemption lapses once a statement's
  // own capability reaches the config threshold, so malware cannot buy immunity
  // by wrapping its payload in a main-guard.
  const surviving = [];
  for (const cand of candidates) {
    const region = regionOf(lex, cand.st.start, cand.st.end);
    const own = scoreCapabilities(region);
    const benign = sig.BENIGN_TAIL_RES.some((re) => re.test(region.code));
    if (benign && own.score < sig.VERDICT_THRESHOLDS.configCapability) continue;
    surviving.push(cand);
  }

  // ── linkage: never remove a statement the surviving code depends on ──
  //
  // This is what protects legitimate post-export helper functions: a
  // `function resolveAlias(){}` below an export that references it gets demoted
  // back into the module. The real payload declares only names it uses itself.
  let payload = surviving.slice();
  const demoted = [];
  for (;;) {
    const payloadIdx = new Set(payload.map((p) => p.st.index));
    const keptStmts = statements.filter((s) => !payloadIdx.has(s.index));
    const keptRefs = referencesOf(lex, keptStmts);
    const guilty = payload.find((p) => {
      for (const name of bindingsOf(lex, p.st)) if (keptRefs.has(name)) return true;
      return false;
    });
    if (!guilty) break;
    demoted.push({ index: guilty.st.index, why: "referenced by surviving code" });
    payload = payload.filter((p) => p.st.index !== guilty.st.index);
  }

  const payloadIdx = new Set(payload.map((p) => p.st.index));
  const kept = statements.filter((s) => !payloadIdx.has(s.index));

  // ── prepended shims ──
  //
  // The injector prepends a createRequire shim so its CommonJS payload can run
  // inside an ESM file. It is removable only when nothing that survives still
  // uses what it introduces.
  const shimDefs = opts.shims ?? sig.PAYLOAD_SHIMS;
  const shimMatches = [];
  for (const st of statements) {
    if (payloadIdx.has(st.index)) continue;
    if (anchor && st.start >= anchor.end) continue; // a shim is a prologue
    // Matched against the RAW statement, because the shim's identity includes
    // its module specifier ('module') and the code view blanks string contents.
    // The patterns are anchored whole-statement shapes, so this is tight: a
    // statement carrying anything extra simply does not match and is kept.
    const normalized = lex.text.slice(st.start, st.end).replace(/\s+/g, " ").trim();
    const def = shimDefs.find((s) => s.re.test(normalized));
    if (def) shimMatches.push({ st, shimId: def.id, introduces: def.introduces });
  }

  const shims = [];
  if (shimMatches.length > 0) {
    const shimIdx = new Set(shimMatches.map((s) => s.st.index));
    // Search the CODE VIEW of everything that survives except the shims
    // themselves, so a `require(` sitting inside a string cannot keep a dead
    // shim alive. `referencesOf` is deliberately NOT used here: it filters out
    // ambient names, and `require` — the very name in question — is one of them.
    const survivingCode = kept
      .filter((s) => !shimIdx.has(s.index))
      .map((s) => lex.code.slice(s.start, s.end))
      .join("\n");
    const stillUsed = shimMatches.some((s) =>
      s.introduces.some((name) => containsWord(survivingCode, name)),
    );
    if (!stillUsed) shims.push(...shimMatches);
  }

  const lastPayload = payload.length ? payload[payload.length - 1].st : null;
  const firstPayload = payload.length ? payload[0].st : null;

  const flags = {
    // A structural statement appearing after the payload means the payload is
    // wedged between real module code, not appended to the end.
    interleaved: !!firstPayload &&
      kept.some((s) => STRUCTURAL_KINDS.has(s.kind) && s.start > firstPayload.start),
    midFile: !anchor && !!lastPayload &&
      lex.code.slice(lastPayload.end).trim().length > 0,
    noAnchor: anchor === null,
    demoted,
  };

  return {
    ok: true,
    reason: null,
    anchor: anchor ? { start: anchor.start, end: anchor.end, kind: anchor.kind } : null,
    payload,
    kept,
    shims,
    preAnchor,
    flags,
  };
}

/**
 * The verdict ladder.
 *
 * `blockers` is the important part: each one can only move an outcome from
 * confirmed to manual-review, never the other way, so adding a blocker cannot
 * introduce a false positive by construction. A blocked payload is still
 * reported — and when the evidence is overwhelming it is still marked
 * content-confirmed, so CI still fails. We never silently pass a real payload;
 * we only decline to cut it automatically, and we say why.
 *
 * @param {{
 *   relPath: string, fileText: string, lex: object, partition: object,
 *   capability: object, form: object, knownVariantId?: string|null,
 *   spliceOk?: boolean|null, spliceReason?: string|null,
 * }} input
 */
export function verdictForFile(input) {
  const {
    relPath, fileText, lex, partition, capability, form,
    knownVariantId = null, spliceOk = null, spliceReason = null,
  } = input;
  const T = sig.VERDICT_THRESHOLDS;

  const none = (reason) => ({
    verdict: "none",
    contentConfirmed: false,
    confidence: "low",
    action: null,
    ranges: [],
    score: { capability: 0, distinct: 0, form: 0 },
    reasons: [],
    blockers: [],
    reason: reason ?? null,
  });

  const cap = capability?.score ?? 0;
  const dist = capability?.distinct ?? 0;
  const frm = form?.score ?? 0;
  const score = { capability: cap, distinct: dist, form: frm };

  const evidence = [
    ...(capability?.hits ?? []).filter((h) => h.counted).map((h) => h.label),
    ...(form?.hits ?? []).map((h) => h.label),
  ];

  // ── no position gate available: report only, at a deliberately high bar ──
  if (!lex?.ok || !partition?.ok) {
    if (cap >= T.unlexable.capability && frm >= T.unlexable.form) {
      return {
        verdict: "manual-review",
        contentConfirmed: false,
        confidence: "low",
        action: "manual-review",
        ranges: [],
        score,
        reasons: evidence,
        blockers: ["region-unlexable"],
        reason: `could not be tokenized safely (${lex?.reason ?? partition?.reason}) but scores high on capability — review manually`,
      };
    }
    return none(`not tokenizable (${lex?.reason ?? partition?.reason})`);
  }

  const hasPayload = partition.payload.length > 0;
  const hasShim = partition.shims.length > 0;

  // ── THE HARD GATE: capability evidence alone is never a finding ──
  if (!hasPayload) {
    if (hasShim) {
      return {
        verdict: "shim-only",
        contentConfirmed: false,
        confidence: "low",
        action: "strip-js-payload",
        autoFix: true,
        ranges: partition.shims.map((s) => ({ start: s.st.start, end: s.st.end, role: "shim" })),
        score,
        reasons: ["an injected createRequire shim remains with no payload and nothing using it"],
        blockers: [],
        reason:
          "leftover createRequire shim injected by PolinRider — the payload is already gone and nothing remaining uses require",
      };
    }
    // Positionally odd code before the export boundary, if it scores at all.
    if (partition.preAnchor.length > 0 && cap >= T.anywhereCapability) {
      return {
        verdict: "manual-review",
        contentConfirmed: false,
        confidence: "low",
        action: "manual-review",
        ranges: [],
        score,
        reasons: evidence,
        blockers: ["payload-before-export-boundary"],
        reason: "privileged code sits before the export boundary — reported, never auto-removed",
      };
    }
    return none("no code outside the legitimate module region");
  }

  const isConfig = sig.isConfigBasename(relPath);
  const autoStrip =
    (isConfig && cap >= T.configCapability) ||
    cap >= T.anywhereCapability ||
    (cap >= T.capabilityWithForm.capability && frm >= T.capabilityWithForm.form);

  const blockers = [];
  if (autoStrip) {
    // Two classes of blocker, and the distinction matters.
    //
    // CERTAINTY blockers ask "is this really malware?" They exist to stop the
    // detector INFERRING guilt from a single privileged call in hand-written
    // code. A matching known signature is not an inference — it is positive
    // identification — so a known variant is exempt from them. Without this
    // exemption the small legacy one-line payloads, which are too short to
    // register any form anomaly, would stop being auto-stripped.
    if (!knownVariantId) {
      if (dist < T.minDistinct) blockers.push("single-capability-group");
      if (frm < T.minForm) blockers.push("no-form-anomaly");
    }
    // SAFETY blockers ask "is cutting here safe?" Nothing exempts these.
    if (lex.jsxSuspected) blockers.push("jsx-unsafe-to-cut");
    if (capability?.degraded) blockers.push("region-unlexable");
    if (partition.flags.noAnchor) blockers.push("no-export-boundary");
    if (partition.flags.midFile) blockers.push("payload-not-at-file-tail");
    if (partition.flags.interleaved && cap < T.anywhereCapability) {
      blockers.push("interleaved-needs-more-evidence");
    }
    if (partition.flags.demoted.length > 0 && cap < T.anywhereCapability) {
      blockers.push("linkage-demotions-present");
    }
    if (spliceOk === false) blockers.push(`splice-postcondition-failed:${spliceReason ?? "unknown"}`);
  }

  const ranges = input.ranges ?? candidateRanges(partition, fileText);

  if (autoStrip && blockers.length === 0) {
    return {
      verdict: "confirmed",
      contentConfirmed: true,
      confidence: "high",
      action: "strip-js-payload",
      ranges,
      score,
      reasons: evidence,
      blockers: [],
      reason: describe(evidence, score, partition),
    };
  }

  if (cap >= T.reviewCapability || frm >= T.reviewForm) {
    return {
      verdict: "manual-review",
      contentConfirmed: knownVariantId != null || (cap >= T.anywhereCapability && dist >= T.minDistinct),
      confidence: cap >= T.configCapability ? "high" : "low",
      action: "manual-review",
      ranges: [],
      score,
      reasons: evidence,
      blockers,
      reason: `${describe(evidence, score, partition)}${
        blockers.length ? ` — not auto-removed (${blockers.join(", ")})` : ""
      }`,
    };
  }

  return none("code after the export boundary, but it does nothing privileged");
}

/**
 * Every range a remediator would remove: injected prologue shims first, then
 * the payload. Deterministic, so the verdict and the splice verification are
 * always reasoning about the same bytes.
 */
export function candidateRanges(partition, fileText) {
  if (!partition?.ok) return [];
  return [
    ...partition.shims.map((s) => ({ start: s.st.start, end: s.st.end, role: "shim" })),
    ...payloadRanges(partition.payload, fileText),
  ].sort((a, b) => a.start - b.start);
}

/**
 * Payload drop ranges. The trailing run extends to end-of-file so that any
 * junk after the last recognised statement leaves with it; an isolated payload
 * statement is cut on its own.
 */
function payloadRanges(payload, fileText) {
  if (payload.length === 0) return [];
  const end = (fileText ?? "").length;
  const last = payload[payload.length - 1].st;
  const reachesEnd = last.end >= end - 1 || /^\s*$/.test((fileText ?? "").slice(last.end));
  const ranges = [];
  let run = null;
  for (const p of payload) {
    if (run && p.st.index === run.lastIndex + 1) {
      run.end = p.st.end;
      run.lastIndex = p.st.index;
      continue;
    }
    run = { start: p.st.start, end: p.st.end, lastIndex: p.st.index, role: "payload" };
    ranges.push(run);
  }
  if (reachesEnd && ranges.length) ranges[ranges.length - 1].end = end;
  return ranges.map(({ start, end: e, role }) => ({ start, end: e, role }));
}

function describe(evidence, score, partition) {
  const where = partition.anchor
    ? "appended after the last export"
    : "in an unbounded region";
  const what = evidence.length ? evidence.join(", ") : "no distinguishing behaviour";
  return `obfuscated code ${where}: ${what} (capability ${score.capability}, ${score.distinct} distinct, form ${score.form})`;
}

/**
 * A known-variant signature match. Used ONLY to label a finding and to exempt
 * it from the certainty floors — never to decide that a payload exists. That
 * inversion is the whole point of this rewrite: the previous detector could not
 * see a payload whose signature it did not already know.
 */
export function findKnownVariant(text) {
  return (
    sig.JS_VARIANTS.find(
      (v) => text.includes(v.signature) && v.seeds.some((s) => text.includes(s)),
    ) ?? null
  );
}

/**
 * The whole assessment for one file's text, as a pure function.
 *
 * Both the scanner (at detection time) and the remediator (at apply time) call
 * this. The remediator re-running it against the CURRENT bytes is what makes a
 * stale finding unable to truncate the wrong thing — strictly stronger than
 * re-running a regex, and cheap because nothing here touches the filesystem.
 *
 * @param {string} text
 * @param {string} relPath   repo-relative path; decides the config threshold
 * @returns {{
 *   lex: object, partition: object, capability: object, form: object,
 *   knownVariant: object|null, verdict: object,
 *   ranges: Array<{start:number,end:number,role:string}>,
 *   keptText: string|null,
 * }}
 */
export function assessJsText(text, relPath) {
  const dot = String(relPath ?? "").lastIndexOf(".");
  const ext = dot >= 0 ? relPath.slice(dot) : "";

  const lex = lexJs(text, { ext });
  const partition = partitionTopLevel(text, lex);
  const usable = lex.ok && partition.ok;

  const payloadStmts = usable ? partition.payload.map((p) => p.st) : [];

  // With no usable tokenization there is no position gate, so the whole file is
  // scored raw and marked degraded — reportable at a high bar, never cuttable.
  let region;
  let degraded = false;
  if (!lex.ok) {
    degraded = true;
    region = {
      start: 0,
      end: text.length,
      raw: text,
      code: text,
      literals: text,
      comments: "",
      bytes: text.length,
      literalBodies: [],
      specifiers: [],
    };
  } else if (payloadStmts.length > 0) {
    region = regionOfStatements(lex, payloadStmts);
    // Extend to end-of-file so trailing padding counts toward form density.
    if (region.end < text.length) region = regionOf(lex, region.start, text.length);
  } else {
    region = regionOf(lex, 0, 0);
  }

  const capability = { ...scoreCapabilities(region), degraded };
  const form = scoreForm(region, text, { statements: payloadStmts });
  const knownVariant = findKnownVariant(text);

  const ranges = candidateRanges(partition, text);

  // Verify the cut BEFORE deciding to confirm it, so a splice that would not
  // survive re-tokenization downgrades the verdict instead of being attempted.
  let spliceOk = null;
  let spliceReason = null;
  let keptText = null;
  if (usable && ranges.length > 0) {
    const vs = verifySplice(text, ranges, {
      lex,
      ext,
      expectExport: !!partition.anchor,
    });
    spliceOk = vs.ok;
    spliceReason = vs.reason ?? null;
    keptText = vs.ok ? vs.kept : null;
  }

  const verdict = verdictForFile({
    relPath,
    fileText: text,
    lex,
    partition,
    capability,
    form,
    knownVariantId: knownVariant?.id ?? null,
    ranges,
    spliceOk,
    spliceReason,
  });

  return { lex, partition, capability, form, knownVariant, verdict, ranges, keptText };
}
