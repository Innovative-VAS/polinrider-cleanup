/**
 * Dependency-free character-level scanner for JS / TS / JSX source.
 *
 * This module NEVER executes, imports, or requires the text it reads.
 * It answers two questions the payload detector needs:
 *
 *   1. Where does each TOP-LEVEL statement begin and end?
 *      The malware appends itself after the file's last export. Statement ranges
 *      bracket significant characters only, so whitespace and blank-line padding
 *      between statements belong to NO statement — which is what makes the
 *      injector's padding leave with the payload automatically.
 *
 *   2. Which characters are code, which are literal contents, which are comments?
 *      Three co-indexed views answer this. All three are EXACTLY the same length
 *      as the input, with offsets mapping 1:1, so a match found in any view can
 *      be reported against the original text.
 *
 *        code      code + literal DELIMITERS; literal contents and comments blanked
 *        literals  string/template CONTENTS only
 *        comments  comment CONTENTS only
 *
 *      Separating these is what lets the detector find `require("node:http")`
 *      (evidence living inside a string) while a doc comment that merely quotes
 *      `eval(...)` scores nothing. Regex-literal contents are blanked in BOTH the
 *      code and literals views — a pattern is not evidence of behaviour.
 *
 * Line terminators are preserved verbatim in every view, so line numbers are
 * identical across all of them and against the original text.
 *
 * FAIL CLOSED. On any internal inconsistency this returns `{ ok: false, reason }`
 * and callers MUST degrade to reporting only — never an automated edit. Being
 * wrong about a boundary is acceptable; cutting at a wrong boundary is not.
 */

/** Guard rails. Exceeding any of these fails closed rather than guessing. */
export const LEX_LIMITS = {
  maxBytes: 2 * 1024 * 1024,
  maxRegexSpan: 512,
  maxDelimiterDepth: 256,
  maxTemplateDepth: 32,
  maxStatements: 50_000,
};

/**
 * Names that are ambient rather than module-scoped. Derived from the running
 * runtime instead of written out, so `eval`, `Function`, `Buffer`, `process`,
 * `URL` and `AbortController` never appear as literal strings in a file this
 * tool scans — self-scan hygiene for free.
 */
export const AMBIENT_GLOBALS = new Set([
  ...Object.getOwnPropertyNames(globalThis),
  "module",
  "exports",
  "require",
  "__dirname",
  "__filename",
  "arguments",
  "describe",
  "it",
  "test",
  "expect",
  "beforeEach",
  "afterEach",
  "before",
  "after",
]);

// Keywords after which a `/` opens a regex literal rather than dividing.
const KW_EXPR_BEFORE = new Set([
  "return", "typeof", "instanceof", "in", "of", "new", "delete", "void",
  "throw", "case", "do", "else", "yield", "await",
]);

// Keywords that CONTINUE an expression across a newline, so ASI must not fire.
const KW_CONTINUES = new Set([
  "in", "instanceof", "of", "as", "satisfies", "else", "catch", "finally",
  "while", "extends", "implements", "from",
]);

// Tokens that can legally end a statement (the ASI "previous" condition).
const KW_CAN_END = new Set([
  "return", "break", "continue", "this", "true", "false", "null",
  "undefined", "super", "debugger",
]);

// Keywords that cannot end a statement, so ASI must not fire after them.
const KW_CANNOT_END = new Set([
  "new", "typeof", "void", "delete", "await", "yield", "case", "do",
  "const", "let", "var", "function", "class", "import", "export",
  "if", "for", "while", "switch", "try", "throw", "extends",
]);

// First tokens whose statement is terminated by its own closing brace.
const BLOCK_STARTERS = new Set([
  "function", "async", "class", "abstract", "if", "for", "while", "switch",
  "try", "enum", "namespace", "module", "declare", "interface", "type", "{",
]);

// After a depth-0 `}`, any of these means the statement continues.
const CONTINUES_AFTER_BRACE = new Set([
  "else", "catch", "finally", "while", ",", ".", "?.", "(", "[", "`", "=>",
  "?", ":", ";", "=", "==", "===", "!=", "!==", "+", "-", "*", "/", "%",
  "**", "&&", "||", "??", "&", "|", "^", "<", ">", "<=", ">=",
  "instanceof", "in",
]);

// Punctuators, longest first so maximal munch is a simple ordered scan.
const PUNCTUATORS = [
  ">>>=", "...", "===", "!==", "**=", "<<=", ">>=", "&&=", "||=", "??=", ">>>",
  "=>", "==", "!=", "<=", ">=", "&&", "||", "??", "?.", "++", "--", "+=", "-=",
  "*=", "/=", "%=", "&=", "|=", "^=", "<<", ">>", "**",
  "{", "}", "(", ")", "[", "]", ";", ",", "<", ">", "+", "-", "*", "/", "%",
  "&", "|", "^", "!", "~", "?", ":", "=", ".", "@",
];

const NBSP = "\u00a0";
const BOM = "\ufeff";
const LS = "\u2028";
const PS = "\u2029";

const isLineTerm = (ch) => ch === "\n" || ch === "\r" || ch === LS || ch === PS;

// Only CR and LF terminate a string literal. Since ES2019 U+2028 and U+2029 are
// legal INSIDE string literals even though they are line terminators elsewhere.
// This module's own source contains them, so getting this wrong would leave the
// tokenizer unable to read itself.
const endsStringLiteral = (ch) => ch === "\n" || ch === "\r";
const isSpace = (ch) =>
  ch === " " || ch === "\t" || ch === "\v" || ch === "\f" ||
  ch === NBSP || ch === BOM || isLineTerm(ch);
const isDigit = (ch) => ch >= "0" && ch <= "9";
const isIdentStart = (ch) =>
  (ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") ||
  ch === "_" || ch === "$" || ch === "#" || ch.charCodeAt(0) > 127;
const isIdentPart = (ch) => isIdentStart(ch) || isDigit(ch);

/**
 * The single primitive. One pass over `text`.
 *
 * @param {string} text
 * @param {{ ext?: string }} [opts]  file extension; used only for the JSX guard
 */
export function lexJs(text, opts = {}) {
  let res;
  try {
    res = lexInner(text, opts);
  } catch (err) {
    // A crash in the lexer must never crash a scan.
    res = fail("internal", `${err?.message ?? err}`);
  }
  // A JSX/TSX file stays flagged even when the lex failed, so callers that only
  // consult `jsxSuspected` still see the blocker.
  if (!res.ok && /\.[jt]sx$/i.test(opts.ext || "")) res.jsxSuspected = true;
  return res;
}

function fail(reason, detail) {
  return {
    ok: false,
    reason,
    detail,
    text: null,
    code: null,
    literals: null,
    comments: null,
    skips: [],
    tokens: [],
    statements: [],
    specifiers: [],
    preamble: { bom: false, shebangEnd: 0 },
    jsxSuspected: false,
    stats: null,
  };
}

function lexInner(text, opts) {
  if (typeof text !== "string") return fail("not-a-string");
  const n = text.length;
  if (n > LEX_LIMITS.maxBytes) return fail("file-too-large");

  // Three views, same length as the input. Blanked characters become spaces,
  // except line terminators which are preserved so line numbers agree.
  const code = text.split("");
  const literals = new Array(n);
  const comments = new Array(n);
  for (let k = 0; k < n; k++) {
    const filler = isLineTerm(text[k]) ? text[k] : " ";
    literals[k] = filler;
    comments[k] = filler;
  }
  const blankCode = (from, to) => {
    for (let k = from; k < to; k++) if (!isLineTerm(text[k])) code[k] = " ";
  };
  const revealIn = (view, from, to) => {
    for (let k = from; k < to; k++) view[k] = text[k];
  };

  const skips = [];
  const tokens = [];
  const statements = [];
  const stack = [];
  const tmplStack = [];
  let depth = 0;
  let jsxSuspected = /\.[jt]sx$/i.test(opts.ext || "");

  let i = 0;
  const preamble = { bom: false, shebangEnd: 0 };
  if (n > 0 && text.charCodeAt(0) === 0xfeff) {
    preamble.bom = true;
    i = 1;
  }
  if (text.startsWith("#!", i)) {
    let j = i;
    while (j < n && !isLineTerm(text[j])) j++;
    blankCode(i, j);
    preamble.shebangEnd = j;
    i = j;
  }

  let prev = null; // previous SIGNIFICANT token
  let sawNewline = false;
  let stmtStart = -1;
  let stmtFirst = null;

  const pushToken = (type, start, end, extra) => {
    const tok = {
      type,
      value: type === "punct" || type === "ident" ? text.slice(start, end) : "",
      start,
      end,
      ...extra,
    };
    tokens.push(tok);
    return tok;
  };

  /** Next significant character after whitespace/comments, plus its word form. */
  const peekSignificant = (from) => {
    let k = from;
    while (k < n) {
      const ch = text[k];
      if (isSpace(ch)) { k++; continue; }
      if (ch === "/" && text[k + 1] === "/") {
        while (k < n && !isLineTerm(text[k])) k++;
        continue;
      }
      if (ch === "/" && text[k + 1] === "*") {
        const close = text.indexOf("*/", k + 2);
        if (close < 0) return null;
        k = close + 2;
        continue;
      }
      break;
    }
    if (k >= n) return null;
    if (isIdentStart(text[k])) {
      let e = k;
      while (e < n && isIdentPart(text[e])) e++;
      return { at: k, word: text.slice(k, e) };
    }
    for (const p of PUNCTUATORS) if (text.startsWith(p, k)) return { at: k, word: p };
    return { at: k, word: text[k] };
  };

  const closeStatement = (end, terminator) => {
    if (stmtStart < 0) return;
    if (statements.length >= LEX_LIMITS.maxStatements) throw new Error("too-many-statements");
    statements.push({
      start: stmtStart,
      end,
      index: statements.length,
      firstToken: stmtFirst ?? "",
      terminator,
      kind: "expression",
      line: 0,
      gapBefore: { chars: 0, newlines: 0, hasComment: false },
      asiRisky: terminator === "asi",
    });
    stmtStart = -1;
    stmtFirst = null;
  };

  /** True if a `/` here opens a regex literal rather than dividing. */
  const regexAllowed = () => {
    if (!prev) return true;
    if (prev.type === "ident") return KW_EXPR_BEFORE.has(prev.value);
    if (prev.type === "num" || prev.type === "str" || prev.type === "tpl" || prev.type === "regex") {
      return false;
    }
    const v = prev.value;
    if (v === "++" || v === "--") return false;
    if (v === ")") return prev.controlHead === true;
    if (v === "]") return false;
    if (v === "}") return prev.blockClose === true;
    return true;
  };

  /** Scan one cooked chunk of a template literal starting at `from`. */
  const scanTemplateChunk = (from) => {
    const frame = tmplStack[tmplStack.length - 1];
    let j = from;
    while (j < n) {
      const c = text[j];
      if (c === "\\") { j += 2; continue; }
      if (c === "$" && text[j + 1] === "{") {
        skips.push({ kind: "tpl", start: frame.chunkStart - 1, end: j, bodyStart: frame.chunkStart, bodyEnd: j });
        revealIn(literals, frame.chunkStart, j);
        blankCode(frame.chunkStart, j);
        if (depth >= LEX_LIMITS.maxDelimiterDepth) return { error: "depth-limit" };
        stack.push({ char: "{", kind: "tpl-sub", controlHead: false });
        depth++;
        prev = pushToken("punct", j, j + 2);
        prev.value = "{";
        sawNewline = false;
        return { next: j + 2 };
      }
      if (c === "`") {
        skips.push({ kind: "tpl", start: frame.chunkStart - 1, end: j + 1, bodyStart: frame.chunkStart, bodyEnd: j });
        revealIn(literals, frame.chunkStart, j);
        blankCode(frame.chunkStart, j);
        tmplStack.pop();
        prev = pushToken("tpl", j, j + 1);
        sawNewline = false;
        return { next: j + 1 };
      }
      j++;
    }
    return { error: "unterminated-template" };
  };

  while (i < n) {
    const ch = text[i];

    if (isSpace(ch)) {
      if (isLineTerm(ch)) sawNewline = true;
      i++;
      continue;
    }

    // ── comments ──
    if (ch === "/" && text[i + 1] === "/") {
      const start = i;
      let j = i + 2;
      while (j < n && !isLineTerm(text[j])) j++;
      skips.push({ kind: "line-comment", start, end: j, bodyStart: start + 2, bodyEnd: j });
      revealIn(comments, start + 2, j);
      blankCode(start, j);
      i = j;
      continue;
    }
    if (ch === "/" && text[i + 1] === "*") {
      const start = i;
      const close = text.indexOf("*/", i + 2);
      if (close < 0) return fail("unterminated-comment");
      const end = close + 2;
      // Block comments never nest.
      skips.push({ kind: "block-comment", start, end, bodyStart: start + 2, bodyEnd: close });
      revealIn(comments, start + 2, close);
      blankCode(start, end);
      // A multi-line comment counts as a line terminator for ASI purposes.
      for (let k = start; k < end; k++) if (isLineTerm(text[k])) sawNewline = true;
      i = end;
      continue;
    }

    // ── ASI: close the current statement before consuming this token ──
    if (depth === 0 && stmtStart >= 0 && sawNewline && prev) {
      const prevCanEnd =
        prev.type === "num" || prev.type === "str" || prev.type === "tpl" ||
        prev.type === "regex" ||
        (prev.type === "ident" &&
          (KW_CAN_END.has(prev.value) || !KW_CANNOT_END.has(prev.value)) &&
          !KW_CONTINUES.has(prev.value)) ||
        (prev.type === "punct" &&
          (prev.value === ")" || prev.value === "]" || prev.value === "}" ||
            prev.value === "++" || prev.value === "--"));

      // Only an identifier/keyword or a decorator can START a new statement here.
      // Everything else is treated as a continuation, because merging statements
      // is safe while splitting one in half is not.
      let nextCannotContinue = false;
      if (isIdentStart(ch)) {
        let e = i;
        while (e < n && isIdentPart(text[e])) e++;
        nextCannotContinue = !KW_CONTINUES.has(text.slice(i, e));
      } else if (ch === "@") {
        nextCannotContinue = true;
      }

      // Decorators must never be split from the declaration they annotate.
      if (prevCanEnd && nextCannotContinue && stmtFirst !== "@") {
        closeStatement(prev.end, "asi");
      }
    }

    if (depth === 0 && stmtStart < 0) {
      stmtStart = i;
      stmtFirst = null;
    }

    // ── string literals ──
    if (ch === "'" || ch === '"') {
      const start = i;
      let j = i + 1;
      let closed = false;
      while (j < n) {
        const c = text[j];
        // A backslash-newline is a line continuation, not a terminator.
        if (c === "\\") { j += 2; continue; }
        if (c === ch) { closed = true; break; }
        if (endsStringLiteral(c)) return fail("unterminated-string");
        j++;
      }
      if (!closed) return fail("unterminated-string");
      skips.push({ kind: ch === "'" ? "sq" : "dq", start, end: j + 1, bodyStart: start + 1, bodyEnd: j });
      revealIn(literals, start + 1, j);
      blankCode(start + 1, j);
      prev = pushToken("str", start, j + 1);
      if (stmtFirst === null) stmtFirst = "str";
      sawNewline = false;
      i = j + 1;
      continue;
    }

    // ── template literals (with nested ${} interpolation) ──
    if (ch === "`") {
      if (tmplStack.length >= LEX_LIMITS.maxTemplateDepth) return fail("template-depth-limit");
      const start = i;
      tmplStack.push({ start, chunkStart: i + 1 });
      prev = pushToken("tpl", start, start + 1);
      if (stmtFirst === null) stmtFirst = "tpl";
      sawNewline = false;
      const res = scanTemplateChunk(i + 1);
      if (res.error) return fail(res.error);
      i = res.next;
      continue;
    }

    // ── regex literal or division ──
    if (ch === "/" && regexAllowed()) {
      const start = i;
      let j = i + 1;
      let inClass = false;
      let closed = false;
      while (j < n) {
        const c = text[j];
        if (c === "\\") { j += 2; continue; }
        if (isLineTerm(c)) break;
        if (c === "[") inClass = true;
        else if (c === "]") inClass = false;
        else if (c === "/" && !inClass) { closed = true; break; }
        j++;
      }
      if (!closed) return fail("unterminated-regex");
      let e = j + 1;
      while (e < n && /[dgimsuvy]/.test(text[e])) e++;
      // A "regex" this long is far more likely a misparsed division.
      if (e - start > LEX_LIMITS.maxRegexSpan) return fail("regex-span-too-long");
      skips.push({ kind: "regex", start, end: e, bodyStart: start + 1, bodyEnd: j });
      // Blanked in the code view and revealed in NEITHER literals nor comments.
      blankCode(start + 1, j);
      prev = pushToken("regex", start, e);
      if (stmtFirst === null) stmtFirst = "regex";
      sawNewline = false;
      i = e;
      continue;
    }

    // ── numeric literals (consumed whole so `0x1e/2` cannot confuse `/`) ──
    if (isDigit(ch) || (ch === "." && isDigit(text[i + 1]))) {
      const start = i;
      let j = i;
      if (ch === "0" && /[xXbBoO]/.test(text[j + 1] || "")) {
        j += 2;
        while (j < n && /[0-9a-fA-F_]/.test(text[j])) j++;
      } else {
        while (j < n && /[0-9_]/.test(text[j])) j++;
        if (text[j] === ".") { j++; while (j < n && /[0-9_]/.test(text[j])) j++; }
        if (/[eE]/.test(text[j] || "")) {
          j++;
          if (text[j] === "+" || text[j] === "-") j++;
          while (j < n && /[0-9_]/.test(text[j])) j++;
        }
      }
      if (text[j] === "n") j++; // BigInt
      prev = pushToken("num", start, j);
      if (stmtFirst === null) stmtFirst = "num";
      sawNewline = false;
      i = j;
      continue;
    }

    // ── identifiers and keywords ──
    if (isIdentStart(ch)) {
      const start = i;
      let j = i;
      while (j < n && isIdentPart(text[j])) j++;
      prev = pushToken("ident", start, j);
      if (stmtFirst === null) stmtFirst = prev.value;
      sawNewline = false;
      i = j;
      continue;
    }

    // ── JSX guard ──
    //
    // `<Foo attr="/">` lexes fine; JSX TEXT CHILDREN do not — `<p>It's 50% off</p>`
    // opens a bogus string literal. Rather than implement a JSX mode, flag the
    // file so callers withhold automated edits. Detection still works end to end.
    if (ch === "<" && !jsxSuspected && regexAllowed() && /[A-Za-z_$>]/.test(text[i + 1] || "")) {
      jsxSuspected = true;
    }

    // ── punctuators ──
    let punct = null;
    for (const p of PUNCTUATORS) {
      if (text.startsWith(p, i)) { punct = p; break; }
    }
    // Unknown character: treat as a one-char punctuator rather than failing.
    if (punct === null) punct = ch;
    // Per spec, `?.` is not optional chaining when a digit follows (`a?.5:1`).
    if (punct === "?." && isDigit(text[i + 2] || "")) punct = "?";

    const start = i;
    const end = i + punct.length;

    if (punct === "(" || punct === "[" || punct === "{") {
      if (depth >= LEX_LIMITS.maxDelimiterDepth) return fail("depth-limit");
      const kind = punct === "{" ? braceKind(prev, stmtStart === start) : "group";
      const controlHead =
        punct === "(" && prev?.type === "ident" &&
        (prev.value === "if" || prev.value === "while" || prev.value === "for" || prev.value === "with");
      stack.push({ char: punct, kind, controlHead });
      depth++;
      prev = pushToken("punct", start, end);
      sawNewline = false;
      i = end;
      continue;
    }

    if (punct === ")" || punct === "]" || punct === "}") {
      if (depth === 0 || stack.length === 0) return fail("unbalanced-close");
      const frame = stack.pop();
      const expected = punct === ")" ? "(" : punct === "]" ? "[" : "{";
      if (frame.char !== expected) return fail("mismatched-delimiter");
      depth--;
      prev = pushToken("punct", start, end, {
        controlHead: frame.controlHead,
        blockClose: punct === "}" && (frame.kind === "block" || frame.kind === "body"),
      });
      if (stmtFirst === null) stmtFirst = punct;
      sawNewline = false;
      i = end;

      // A `}` closing a `${...}` returns us to the enclosing template literal,
      // whose next cooked chunk starts here. Without this the outer template's
      // closing backtick would be read as opening a NEW template.
      if (frame.kind === "tpl-sub") {
        const tpl = tmplStack[tmplStack.length - 1];
        if (!tpl) return fail("unterminated-template");
        tpl.chunkStart = end;
        const res = scanTemplateChunk(end);
        if (res.error) return fail(res.error);
        i = res.next;
        continue;
      }

      if (punct === "}" && depth === 0 && prev.blockClose && BLOCK_STARTERS.has(stmtFirst)) {
        const nxt = peekSignificant(end);
        if (!nxt || !CONTINUES_AFTER_BRACE.has(nxt.word)) closeStatement(end, "}");
      }
      continue;
    }

    prev = pushToken("punct", start, end);
    if (stmtFirst === null) stmtFirst = punct;
    sawNewline = false;
    i = end;

    if (punct === ";" && depth === 0) closeStatement(end, ";");
  }

  if (depth !== 0 || stack.length !== 0) return fail("unbalanced-eof");
  if (tmplStack.length !== 0) return fail("unterminated-template");
  if (stmtStart >= 0) closeStatement(prev ? prev.end : n, "eof");

  const codeStr = code.join("");

  // Self-check: every significant character of the CODE view outside the preamble
  // must lie in exactly one statement range. Comments are already whitespace in
  // this view, so they are correctly excluded. This is what makes "splice out the
  // payload ranges, every other byte identical" provable rather than hopeful.
  {
    let s = 0;
    for (let k = preamble.shebangEnd; k < n; k++) {
      if (isSpace(codeStr[k])) continue;
      while (s < statements.length && statements[s].end <= k) s++;
      if (s >= statements.length || k < statements[s].start) {
        return fail("untiled-significant-text", `offset ${k}`);
      }
    }
  }

  const lineStarts = [0];
  for (let k = 0; k < n; k++) if (text[k] === "\n") lineStarts.push(k + 1);
  const lineOf = (off) => {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid] <= off) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };

  // Statement metadata. `gapBefore` is where the injector's padding lives.
  for (let k = 0; k < statements.length; k++) {
    const st = statements[k];
    st.line = lineOf(st.start);
    st.kind = classifyStatement(codeStr.slice(st.start, st.end), st.firstToken);
    const gapFrom = k === 0 ? preamble.shebangEnd : statements[k - 1].end;
    const gapRaw = text.slice(gapFrom, st.start);
    st.gapBefore = {
      chars: gapRaw.length,
      newlines: (gapRaw.match(/\n/g) || []).length,
      hasComment: skips.some(
        (sk) =>
          (sk.kind === "line-comment" || sk.kind === "block-comment") &&
          sk.start >= gapFrom && sk.end <= st.start,
      ),
    };
  }

  const lex = {
    ok: true,
    reason: null,
    text,
    code: codeStr,
    literals: literals.join(""),
    comments: comments.join(""),
    skips,
    tokens,
    statements,
    preamble,
    jsxSuspected,
    lineStarts,
    specifiers: [],
    stats: { lines: lineStarts.length, statements: statements.length },
  };
  lex.specifiers = extractSpecifiers(lex);
  return lex;
}

/** Decide what a `{` opens. Ambiguity resolves to "object", which never ends a statement. */
function braceKind(prev, atStatementStart) {
  if (atStatementStart || !prev) return "block";
  if (prev.type === "punct") {
    const v = prev.value;
    if (v === ")") return "body";
    if (v === "}" || v === ";") return "block";
    return "object";
  }
  if (prev.type === "ident") {
    const v = prev.value;
    if (v === "else" || v === "do" || v === "try" || v === "finally") return "block";
    if (v === "return" || v === "typeof" || v === "case") return "object";
    return "body"; // `class X {`, `namespace N {`, `enum E {`
  }
  return "object";
}

function classifyStatement(codeSlice, firstToken) {
  const s = codeSlice.trimStart();
  if (firstToken === "import") return "import";
  if (firstToken === "export") return "export";
  if (/^module\s*\.\s*exports\b/.test(s)) return "module-exports";
  if (/^exports\s*\.\s*[A-Za-z_$][\w$]*\s*=/.test(s)) return "module-exports";
  if (/^Object\s*\.\s*defineProperty\s*\(\s*exports\b/.test(s)) return "module-exports";
  if (firstToken === "str") return "directive";
  if (firstToken === "{") return "block";
  if (firstToken === ";") return "empty";
  if (
    firstToken === "const" || firstToken === "let" || firstToken === "var" ||
    firstToken === "function" || firstToken === "class" || firstToken === "enum" ||
    firstToken === "type" || firstToken === "interface" || firstToken === "namespace" ||
    firstToken === "declare" || firstToken === "async"
  ) {
    return "declaration";
  }
  return "expression";
}

/**
 * Module specifiers, extracted STRUCTURALLY from the token stream rather than by
 * regex over text. This is what lets `require("node:http")` be matched by exact
 * string equality — a regex for "http" over string contents would also match
 * inside every https:// URL.
 */
function extractSpecifiers(lex) {
  const out = [];
  const { tokens, text } = lex;
  const litOf = (tok) => text.slice(tok.start + 1, tok.end - 1);
  const escaped = (tok) => /\\x|\\u|\\[0-7]/.test(text.slice(tok.start, tok.end));

  for (let k = 0; k < tokens.length; k++) {
    const t = tokens[k];
    if (t.type !== "ident") continue;

    if ((t.value === "require" || t.value === "import") && tokens[k + 1]?.value === "(") {
      const arg = tokens[k + 2];
      if (arg?.type === "str") {
        out.push({
          spec: litOf(arg),
          raw: litOf(arg),
          start: arg.start,
          end: arg.end,
          form: t.value === "require" ? "require" : "dynamic-import",
          // An escaped or concatenated specifier is itself evidence of hiding.
          obfuscated: escaped(arg) || tokens[k + 3]?.value === "+",
        });
      }
      continue;
    }

    if (t.value === "import") {
      for (let j = k + 1; j < tokens.length && j < k + 64; j++) {
        if (tokens[j].type === "str") {
          out.push({
            spec: litOf(tokens[j]),
            raw: litOf(tokens[j]),
            start: tokens[j].start,
            end: tokens[j].end,
            form: "import",
            obfuscated: escaped(tokens[j]),
          });
          break;
        }
        if (tokens[j].value === ";") break;
      }
    }
  }
  return out;
}

// ── Public wrappers ────────────────────────────────────────────────────────────

// Single-slot identity cache. Strings are immutable and the scanner processes one
// file at a time, so this is enough to stop the wrappers re-lexing.
let _cache = { text: null, ext: null, res: null };

function lexCached(text, opts = {}) {
  const ext = opts.ext || "";
  if (_cache.text === text && _cache.ext === ext) return _cache.res;
  const res = lexJs(text, opts);
  _cache = { text, ext, res };
  return res;
}

/**
 * The three co-indexed views. On failure `code` is null — a partially built view
 * is worse than none, because a match's blanking state would be unknown.
 */
export function views(text, opts = {}) {
  const lex = lexCached(text, opts);
  return lex.ok
    ? { ok: true, code: lex.code, literals: lex.literals, comments: lex.comments }
    : { ok: false, reason: lex.reason, code: null, literals: null, comments: null };
}

export function codeView(text, opts = {}) {
  const lex = lexCached(text, opts);
  return lex.ok ? { ok: true, code: lex.code } : { ok: false, reason: lex.reason, code: null };
}

export function topLevelStatements(text, opts = {}) {
  const lex = lexCached(text, opts);
  return lex.ok
    ? { ok: true, statements: lex.statements }
    : { ok: false, reason: lex.reason, statements: [] };
}

/** 1-based line number for a character offset. */
export function offsetToLine(text, offset) {
  if (!(offset > 0)) return 1;
  return text.slice(0, Math.min(offset, text.length)).split("\n").length;
}

/**
 * A slice of the file in every view, plus the literal bodies and module
 * specifiers it contains. `literalBodies` exists for rules that must match a
 * WHOLE literal rather than a substring.
 */
export function regionOf(lex, start, end) {
  const lo = Math.max(0, start);
  const hi = Math.min(lex.text.length, end);
  return {
    start: lo,
    end: hi,
    raw: lex.text.slice(lo, hi),
    code: lex.code.slice(lo, hi),
    literals: lex.literals.slice(lo, hi),
    comments: lex.comments.slice(lo, hi),
    bytes: hi - lo,
    literalBodies: lex.skips
      .filter(
        (s) => (s.kind === "sq" || s.kind === "dq" || s.kind === "tpl") &&
          s.bodyStart >= lo && s.bodyEnd <= hi,
      )
      .map((s) => lex.text.slice(s.bodyStart, s.bodyEnd)),
    specifiers: lex.specifiers.filter((s) => s.start >= lo && s.end <= hi),
  };
}

/** The region spanning a set of statements, from the lowest start to the highest end. */
export function regionOfStatements(lex, stmts) {
  if (!stmts.length) return regionOf(lex, 0, 0);
  let lo = Infinity;
  let hi = -Infinity;
  for (const s of stmts) {
    if (s.start < lo) lo = s.start;
    if (s.end > hi) hi = s.end;
  }
  return regionOf(lex, lo, hi);
}

const tokensIn = (lex, stmt) =>
  lex.tokens.filter((t) => t.start >= stmt.start && t.end <= stmt.end);

/**
 * Top-level names a statement introduces. Deliberately OVER-collects: more
 * bindings means more linkage demotions, which is the safe direction.
 */
export function bindingsOf(lex, stmt) {
  const out = new Set();
  const toks = tokensIn(lex, stmt);
  if (!toks.length || toks[0].type !== "ident") return out;
  const first = toks[0].value;

  if (first === "const" || first === "let" || first === "var") {
    let d = 0;
    let expectName = true;
    for (let k = 1; k < toks.length; k++) {
      const t = toks[k];
      if (t.type === "punct") {
        if (t.value === "(" || t.value === "[" || t.value === "{") d++;
        else if (t.value === ")" || t.value === "]" || t.value === "}") d--;
        else if (t.value === "=" && d === 0) expectName = false;
        else if (t.value === "," && d <= 0) expectName = true;
        continue;
      }
      if (t.type === "ident" && expectName) out.add(t.value);
    }
    return out;
  }

  if (
    first === "function" || first === "class" || first === "enum" ||
    first === "namespace" || first === "interface" || first === "type" ||
    first === "async"
  ) {
    for (let k = 1; k < toks.length; k++) {
      if (toks[k].type === "ident" && toks[k].value !== "function") {
        out.add(toks[k].value);
        break;
      }
    }
  }
  return out;
}

/**
 * Non-ambient identifiers referenced by a set of statements. Property names are
 * excluded (they are not references to bindings). Deliberately over-collects.
 */
export function referencesOf(lex, stmts) {
  const out = new Set();
  for (const stmt of stmts) {
    const toks = tokensIn(lex, stmt);
    for (let k = 0; k < toks.length; k++) {
      const t = toks[k];
      if (t.type !== "ident") continue;
      const p = toks[k - 1];
      if (p && p.type === "punct" && (p.value === "." || p.value === "?.")) continue;
      if (AMBIENT_GLOBALS.has(t.value)) continue;
      out.add(t.value);
    }
  }
  return out;
}

export function specifiersOf(lex, stmt) {
  return lex.specifiers.filter((s) => s.start >= stmt.start && s.end <= stmt.end);
}

/** Splice ranges out of `text`, highest offset first so earlier offsets stay valid. */
export function sliceOut(text, ranges) {
  const sorted = [...ranges].sort((a, b) => b.start - a.start);
  let out = text;
  let removed = 0;
  for (const r of sorted) {
    if (!Number.isInteger(r.start) || !Number.isInteger(r.end)) return null;
    if (r.start < 0 || r.end < r.start || r.end > out.length) return null;
    removed += r.end - r.start;
    out = out.slice(0, r.start) + out.slice(r.end);
  }
  return { kept: out, removedBytes: removed };
}

/**
 * The post-condition that makes cutting safe.
 *
 * Validates the ranges, absorbs the whitespace padding at each seam, splices,
 * then RE-LEXES the result and requires it to be well-formed with exactly the
 * expected statement count and its export boundary intact. Re-lexing catches
 * essentially every conceivable mis-split, which is why the lexer is allowed to
 * be wrong while the system is not allowed to cut wrongly.
 *
 * @param {string} text
 * @param {Array<{start:number,end:number}>} ranges
 * @param {{ lex?: object, expectExport?: boolean, ext?: string }} [opts]
 */
export function verifySplice(text, ranges, opts = {}) {
  if (!Array.isArray(ranges) || ranges.length === 0) return { ok: false, reason: "no-ranges" };

  const lex = opts.lex ?? lexCached(text, { ext: opts.ext });
  if (!lex.ok) return { ok: false, reason: `lex-failed:${lex.reason}` };

  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  for (let k = 0; k < sorted.length; k++) {
    const r = sorted[k];
    if (!Number.isInteger(r.start) || !Number.isInteger(r.end)) {
      return { ok: false, reason: "range-not-integer" };
    }
    if (r.start < 0 || r.end > text.length || r.end <= r.start) {
      return { ok: false, reason: "range-out-of-bounds" };
    }
    if (r.start < lex.preamble.shebangEnd) return { ok: false, reason: "range-crosses-shebang" };
    if (k > 0 && r.start < sorted[k - 1].end) return { ok: false, reason: "ranges-overlap" };
  }

  // A range must cover whole statements. This is the check that refuses a
  // mid-statement cut outright rather than hoping the result still parses.
  for (const st of lex.statements) {
    for (const r of sorted) {
      const overlaps = st.start < r.end && st.end > r.start;
      const contained = st.start >= r.start && st.end <= r.end;
      if (overlaps && !contained) return { ok: false, reason: "range-splits-a-statement" };
    }
  }

  // Coalesce ranges separated by nothing but whitespace and comments. Two
  // adjacent statements (the injector's two shim lines, say) would otherwise
  // each grow into the gap between them during seam normalisation and be
  // rejected as overlapping. The gap is measured on the CODE view, so merging
  // can never swallow a statement — only blank space and comments.
  const merged = [];
  for (const r of sorted) {
    const last = merged[merged.length - 1];
    if (last && lex.code.slice(last.end, r.start).trim() === "") {
      last.end = Math.max(last.end, r.end);
      continue;
    }
    merged.push({ ...r });
  }

  // Seam normalisation: pull each range's start back over the blank-line padding
  // that precedes it, and its end forward over the rest of its final line. This
  // removes the injector's padding along with the payload while leaving every
  // retained byte untouched.
  const floor = lex.preamble.shebangEnd;
  const extended = merged.map((r) => {
    let start = r.start;
    for (;;) {
      const before = text.slice(floor, start);
      const m = /(?:[ \t]*(?:\r?\n)[ \t]*)$|[ \t]+$/.exec(before);
      if (!m || m[0].length === 0) break;
      start -= m[0].length;
      if (start <= floor) { start = floor; break; }
    }
    // Forward: finish the range's own line, then absorb any wholly blank lines
    // that follow. Without the second part, removing a prepended shim would
    // leave behind the blank line that separated it from the real code.
    let end = r.end;
    while (end < text.length && /[ \t]/.test(text[end])) end++;
    if (text[end] === "\r") end++;
    if (text[end] === "\n") end++;
    for (;;) {
      const m = /^[ \t]*\r?\n/.exec(text.slice(end));
      if (!m) break;
      end += m[0].length;
    }
    return { start: Math.max(start, floor), end, role: r.role };
  });
  // Clamp rather than fail: extension is a convenience, so a range that grew
  // into its predecessor is trimmed back instead of abandoning the whole splice.
  for (let k = 1; k < extended.length; k++) {
    if (extended[k].start < extended[k - 1].end) extended[k].start = extended[k - 1].end;
    if (extended[k].end <= extended[k].start) {
      return { ok: false, reason: "ranges-collapsed-after-extension" };
    }
  }

  const spliced = sliceOut(text, extended);
  if (!spliced) return { ok: false, reason: "splice-invalid" };

  const kept = spliced.kept.replace(/\s+$/, "") + "\n";
  if (kept.trim().length === 0) return { ok: false, reason: "would-empty-file" };

  const after = lexJs(kept, { ext: opts.ext });
  if (!after.ok) return { ok: false, reason: `result-unlexable:${after.reason}` };

  const removedStatements = lex.statements.filter((s) =>
    extended.some((r) => s.start >= r.start && s.end <= r.end),
  ).length;
  const expected = lex.statements.length - removedStatements;
  if (after.statements.length !== expected) {
    return { ok: false, reason: `statement-count-mismatch:${after.statements.length}!=${expected}` };
  }

  if (
    opts.expectExport &&
    !after.statements.some((s) => s.kind === "export" || s.kind === "module-exports")
  ) {
    return { ok: false, reason: "no-export-remains" };
  }

  return { ok: true, kept, removedBytes: spliced.removedBytes, ranges: extended };
}
