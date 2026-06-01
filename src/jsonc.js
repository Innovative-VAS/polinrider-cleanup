/**
 * Tolerant JSONC parser for VS Code config files (which legitimately contain
 * // and /* *\/ comments and trailing commas), plus an offset-based array
 * splicer used for surgical removal of malicious task/launch entries.
 *
 * SAFETY: this parser is hand-written and uses ONLY string scanning + the
 * built-in JSON.parse (on isolated string literals). It NEVER uses eval, the
 * Function constructor, or node:vm. Parsing an attacker-controlled .vscode file
 * therefore cannot execute anything.
 *
 * The AST records source offsets so the remediator can remove only the
 * malicious entries and leave the surrounding bytes (and other entries) intact.
 */

/**
 * @typedef {Object} Node
 * @property {'object'|'array'|'string'|'number'|'boolean'|'null'} type
 * @property {*} value           Decoded JS value of this node.
 * @property {number} start      Offset of the first character (inclusive).
 * @property {number} end        Offset just past the last character (exclusive).
 * @property {Array} [elements]  For arrays: child value Nodes, in order.
 * @property {Array} [members]   For objects: { key, keyNode, valueNode } entries.
 */

/**
 * Parse JSONC text.
 * @returns {{ ok: boolean, value: *, ast: Node|null, error: Error|null }}
 */
export function parseJsonc(text) {
  let i = 0;
  const n = text.length;

  const fail = (msg) => {
    const e = new Error(`JSONC parse error at offset ${i}: ${msg}`);
    e.offset = i;
    return e;
  };

  function skipWs() {
    while (i < n) {
      const c = text[i];
      if (c === " " || c === "\t" || c === "\n" || c === "\r" || c === "﻿") {
        i++;
        continue;
      }
      if (c === "/" && text[i + 1] === "/") {
        i += 2;
        while (i < n && text[i] !== "\n") i++;
        continue;
      }
      if (c === "/" && text[i + 1] === "*") {
        i += 2;
        while (i < n && !(text[i] === "*" && text[i + 1] === "/")) i++;
        i += 2;
        continue;
      }
      break;
    }
  }

  function parseString() {
    const start = i;
    if (text[i] !== '"') throw fail("expected string");
    i++;
    while (i < n) {
      const c = text[i];
      if (c === "\\") {
        i += 2;
        continue;
      }
      if (c === '"') {
        i++;
        break;
      }
      i++;
    }
    const raw = text.slice(start, i);
    let value;
    try {
      value = JSON.parse(raw); // decode escapes safely; no code execution
    } catch {
      throw fail("invalid string literal");
    }
    return { type: "string", value, start, end: i };
  }

  function parseNumber() {
    const start = i;
    const m = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(text.slice(i));
    if (!m) throw fail("invalid number");
    i += m[0].length;
    return { type: "number", value: Number(m[0]), start, end: i };
  }

  function parseObject() {
    const start = i;
    i++; // {
    const members = [];
    const value = {};
    skipWs();
    while (text[i] !== "}") {
      if (i >= n) throw fail("unterminated object");
      const keyNode = parseString();
      skipWs();
      if (text[i] !== ":") throw fail("expected ':'");
      i++;
      const valueNode = parseValue();
      members.push({ key: keyNode.value, keyNode, valueNode });
      value[keyNode.value] = valueNode.value;
      skipWs();
      if (text[i] === ",") {
        i++;
        skipWs();
      } else break;
    }
    if (text[i] !== "}") throw fail("expected '}'");
    i++;
    return { type: "object", members, value, start, end: i };
  }

  function parseArray() {
    const start = i;
    i++; // [
    const elements = [];
    const value = [];
    skipWs();
    while (text[i] !== "]") {
      if (i >= n) throw fail("unterminated array");
      const el = parseValue();
      elements.push(el);
      value.push(el.value);
      skipWs();
      if (text[i] === ",") {
        i++;
        skipWs();
      } else break;
    }
    if (text[i] !== "]") throw fail("expected ']'");
    i++;
    return { type: "array", elements, value, start, end: i };
  }

  function parseValue() {
    skipWs();
    if (i >= n) throw fail("unexpected end of input");
    const c = text[i];
    if (c === "{") return parseObject();
    if (c === "[") return parseArray();
    if (c === '"') return parseString();
    if (c === "-" || (c >= "0" && c <= "9")) return parseNumber();
    if (text.startsWith("true", i)) {
      const s = i;
      i += 4;
      return { type: "boolean", value: true, start: s, end: i };
    }
    if (text.startsWith("false", i)) {
      const s = i;
      i += 5;
      return { type: "boolean", value: false, start: s, end: i };
    }
    if (text.startsWith("null", i)) {
      const s = i;
      i += 4;
      return { type: "null", value: null, start: s, end: i };
    }
    throw fail(`unexpected character ${JSON.stringify(c)}`);
  }

  try {
    skipWs();
    const ast = parseValue();
    skipWs();
    if (i < n) throw fail("trailing content after top-level value");
    return { ok: true, value: ast.value, ast, error: null };
  } catch (error) {
    return { ok: false, value: undefined, ast: null, error };
  }
}

/**
 * Return the member's value Node for `key` on an object Node, or undefined.
 */
export function getMember(objectNode, key) {
  if (!objectNode || objectNode.type !== "object") return undefined;
  const m = objectNode.members.find((mem) => mem.key === key);
  return m ? m.valueNode : undefined;
}

/**
 * Remove the array elements at `indicesToRemove` from `text`, given the array's
 * AST Node. Removes each element together with one adjacent separator (the
 * comma + surrounding whitespace) by deleting the span up to the next element's
 * start — so the result stays valid JSON and the surviving elements keep their
 * exact source bytes. Overlapping spans (e.g. removing adjacent elements) are
 * merged before applying.
 *
 * @returns {string} the edited text
 */
export function removeArrayElements(text, arrayNode, indicesToRemove) {
  if (!arrayNode || arrayNode.type !== "array") {
    throw new Error("removeArrayElements: arrayNode must be an array Node");
  }
  const remove = new Set(indicesToRemove);
  const els = arrayNode.elements;
  const spans = [];
  for (let k = 0; k < els.length; k++) {
    if (!remove.has(k)) continue;
    if (k < els.length - 1) {
      spans.push([els[k].start, els[k + 1].start]); // element + trailing comma/ws
    } else if (k > 0) {
      spans.push([els[k - 1].end, els[k].end]); // leading comma/ws + last element
    } else {
      spans.push([els[k].start, els[k].end]); // sole element
    }
  }
  if (spans.length === 0) return text;

  // Merge overlapping/adjacent spans, then delete from the end backward so
  // earlier offsets stay valid.
  spans.sort((a, b) => a[0] - b[0]);
  const merged = [spans[0].slice()];
  for (let s = 1; s < spans.length; s++) {
    const last = merged[merged.length - 1];
    if (spans[s][0] <= last[1]) last[1] = Math.max(last[1], spans[s][1]);
    else merged.push(spans[s].slice());
  }
  merged.sort((a, b) => b[0] - a[0]);
  let out = text;
  for (const [start, end] of merged) out = out.slice(0, start) + out.slice(end);
  return out;
}
