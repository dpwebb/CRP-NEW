/**
 * lib_001o.js — PHASE5-001O parsing helpers (read-only, no legal interpretation).
 *
 * Shared by build_001o_coverage_ledger.js. A join to the legacy corpus is made only on an exact
 * recorded string basis; nothing here infers, normalises or broadens a recorded value.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = "C:\\CRP-NEW";
const OUT = path.join(ROOT, "SOURCE_CAPTURES", "PHASE5-001O");
const LEG = "C:\\Users\\webbd\\crp-credit-app";
const LEG_LC = path.join(LEG, "packages", "backend", "src", "services", "legalCorpus");

const read = (p) => fs.readFileSync(p, "utf8");
const readBuf = (p) => fs.readFileSync(p);
const sha256 = (p) => crypto.createHash("sha256").update(readBuf(p)).digest("hex").toUpperCase();
const bytes = (p) => fs.statSync(p).size;

function fencedJsonAfter(text, heading) {
  const h = text.indexOf(heading);
  if (h < 0) throw new Error("heading not found: " + heading);
  const start = text.indexOf("```json", h);
  const bodyStart = text.indexOf("\n", start) + 1;
  const end = text.indexOf("```", bodyStart);
  return text.slice(bodyStart, end);
}

function skipString(text, i) {
  const quote = text[i];
  let j = i + 1;
  while (j < text.length) {
    if (text[j] === "\\") {
      j += 2;
      continue;
    }
    if (text[j] === quote) return j + 1;
    j += 1;
  }
  return text.length;
}

function scanBalanced(text, openIndex, openChar, closeChar) {
  let depth = 0;
  let i = openIndex;
  while (i < text.length) {
    const c = text[i];
    if (c === "/" && text[i + 1] === "/") {
      const nl = text.indexOf("\n", i);
      i = nl < 0 ? text.length : nl + 1;
      continue;
    }
    if (c === "/" && text[i + 1] === "*") {
      const endC = text.indexOf("*/", i + 2);
      i = endC < 0 ? text.length : endC + 2;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      i = skipString(text, i);
      continue;
    }
    if (c === openChar) depth += 1;
    else if (c === closeChar) {
      depth -= 1;
      if (depth === 0) return i;
    }
    i += 1;
  }
  return -1;
}

/** Every brace-balanced object literal in the text, with its start offset. */
function objectLiterals(text) {
  const out = [];
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (c === "/" && (text[i + 1] === "/" || text[i + 1] === "*")) {
      if (text[i + 1] === "/") {
        const nl = text.indexOf("\n", i);
        i = nl < 0 ? text.length : nl;
      } else {
        const e = text.indexOf("*/", i + 2);
        i = e < 0 ? text.length : e + 1;
      }
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      i = skipString(text, i) - 1;
      continue;
    }
    if (c === "{") {
      const end = scanBalanced(text, i, "{", "}");
      if (end > i) out.push({ start: i, end: end + 1, raw: text.slice(i, end + 1) });
    }
  }
  return out;
}

function unescapeStringLiteral(body) {
  return body
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, "\\");
}

module.exports = {
  ROOT,
  OUT,
  LEG,
  LEG_LC,
  read,
  readBuf,
  sha256,
  bytes,
  fencedJsonAfter,
  skipString,
  scanBalanced,
  objectLiterals,
  unescapeStringLiteral,
  callArgs,
  buildConstants,
  fieldValue,
  fieldArray,
  parseCsv,
  parseDelimited,
  blockRegions,
  extractLegacy,
};

/** Delimited parse for TSV-style registries: one field per delimiter, no inline quoting beyond doubling. */
function parseDelimited(text, delim) {
  return text
    .split(/\r?\n/)
    .filter((l) => l.length > 0)
    .map((l) => l.split(delim));
}

/** Map of every declared const name to the region of its literal, for bracketed forms (exported or not). */
function blockRegions(text) {
  const re = /(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*([\[{])/g;
  const out = {};
  let m;
  while ((m = re.exec(text)) !== null) {
    const open = m.index + m[0].length - 1;
    const close = scanBalanced(text, open, m[2], m[2] === "[" ? "]" : "}");
    if (close > open) out[m[1]] = text.slice(open, close + 1);
  }
  return out;
}

/**
 * Deterministic extraction from the located legacy legal corpus. Nothing is inferred: every value is a
 * literal (or a one-step constant) read out of the artifact named by each catalogue entry.
 */
function extractLegacy(files) {
  const out = {
    coverage: {},
    ruleRows: {},
    legalRuleRows: {},
    solRows: {},
    solRefused: [],
    provinceInstruments: [],
    authorityRows: {},
    citationRegistry: null,
  };

  for (const [name, text] of Object.entries(files)) {
    const constants = buildConstants(text);
    const regions = blockRegions(text);

    const coverage = [];
    for (const [blockName, region] of Object.entries(regions)) {
      if (!/COVERAGE$/.test(blockName)) continue;
      const callRe = /\b(cov|res)\s*\(/g;
      let c;
      while ((c = callRe.exec(region)) !== null) {
        const parsed = callArgs(region, c.index + c[0].length - 1);
        if (!parsed) continue;
        const s = (i) => {
          const a = parsed.args[i];
          if (a === undefined) return null;
          const t = a.trim();
          const str = /^("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)$/.exec(t);
          if (str) return unescapeStringLiteral(str[1].slice(1, -1));
          const id = /^([A-Za-z_$][\w$]*)$/.exec(t);
          if (id && Object.prototype.hasOwnProperty.call(constants, id[1])) return constants[id[1]];
          return null;
        };
        const ruleIds = [];
        for (let i = 4; i < parsed.args.length; i += 1) {
          const t = parsed.args[i].trim();
          if (t.startsWith("[")) {
            const re2 = /"((?:[^"\\]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;
            let s2;
            while ((s2 = re2.exec(t)) !== null) ruleIds.push(unescapeStringLiteral(s2[1] !== undefined ? s2[1] : s2[2]));
          }
        }
        coverage.push({ kind: c[1], provision: s(0), label: s(1), outcome: s(2), ruleIds });
      }
      for (const obj of objectLiterals(region)) {
        if (!/(?:^|[\s{,])provision\s*:/.test(obj.raw)) continue;
        coverage.push({
          kind: "object",
          provision: fieldValue(obj.raw, "provision", constants),
          label: fieldValue(obj.raw, "label", constants),
          outcome: fieldValue(obj.raw, "outcome", constants),
          ruleIds: fieldArray(obj.raw, "ruleIds"),
          reviewBasis: fieldValue(obj.raw, "reviewBasis", constants),
          authorityId: fieldValue(obj.raw, "authorityId", constants),
        });
      }
    }
    if (coverage.length > 0) out.coverage[name] = coverage;

    const ruleRows = [];
    for (const obj of objectLiterals(text)) {
      if (!/(?:^|[\s{,])ruleId\s*:/.test(obj.raw)) continue;
      ruleRows.push({
        ruleId: fieldValue(obj.raw, "ruleId", constants),
        jurisdiction: fieldValue(obj.raw, "jurisdiction", constants),
        authorityId: fieldValue(obj.raw, "authorityId", constants),
        citation: fieldValue(obj.raw, "citation", constants),
        provision: fieldValue(obj.raw, "provision", constants),
        subject: fieldValue(obj.raw, "subject", constants),
        canonicalFields: fieldArray(obj.raw, "canonicalFields"),
        evidenceLevel: fieldValue(obj.raw, "evidenceLevel", constants),
        possibleFindingClass: fieldValue(obj.raw, "possibleFindingClass", constants),
        implementedBy: fieldValue(obj.raw, "implementedBy", constants),
        status: fieldValue(obj.raw, "status", constants),
        effectiveFrom: fieldValue(obj.raw, "effectiveFrom", constants),
        effectiveTo: fieldValue(obj.raw, "effectiveTo", constants),
      });
    }
    if (ruleRows.length > 0) out.ruleRows[name] = ruleRows;

    const legalBlocks = ["US_RULES", "US_STATE_RULES", "CA_RULES", "PROVINCE_CONTENT_RULES", "ON_CONTENT_RULES", "AB_CONTENT_RULES", "NB_CONTENT_RULES", "BC_CONTENT_RULES", "PROVINCE_INSTRUMENTS", "UK_RULES", "AU_RULES"];
    const legalRows = [];
    const seenRows = new Set();
    const addLegalRows = (subRegion, block, key) => {
      for (const obj of objectLiterals(subRegion)) {
        if (!/(?:^|[\s{,])section\s*:/.test(obj.raw)) continue;
        const marker = key + "|" + obj.raw;
        if (seenRows.has(marker)) continue;
        seenRows.add(marker);
        legalRows.push({
          block,
          key,
          id: fieldValue(obj.raw, "id", constants),
          section: fieldValue(obj.raw, "section", constants),
          law: fieldValue(obj.raw, "law", constants),
          years: fieldValue(obj.raw, "years", constants),
          starts: fieldValue(obj.raw, "starts", constants),
          kinds: fieldArray(obj.raw, "kinds"),
          verified: fieldValue(obj.raw, "verified", constants),
        });
      }
    };
    for (const b of legalBlocks) {
      const region = regions[b];
      if (!region) continue;
      if (region.startsWith("{")) {
        // Record-keyed block: the key is the legacy jurisdiction token the rows belong to.
        const keyRe = /(?:^|\n)\s*"?([A-Za-z_$][\w$.\-]*)"?\s*:\s*\[/g;
        let k;
        const spans = [];
        while ((k = keyRe.exec(region)) !== null) {
          const open = k.index + k[0].length - 1;
          const close = scanBalanced(region, open, "[", "]");
          if (close > open) spans.push({ key: k[1], text: region.slice(open, close + 1) });
        }
        for (const s of spans) addLegalRows(s.text, b, s.key);
        for (const obj of objectLiterals(region)) {
          if (spans.some((s) => s.text.includes(obj.raw))) continue;
          if (!/(?:^|[\s{,])section\s*:/.test(obj.raw)) continue;
          const marker = "ROOT|" + obj.raw;
          if (seenRows.has(marker)) continue;
          seenRows.add(marker);
          legalRows.push({
            block: b,
            key: null,
            id: fieldValue(obj.raw, "id", constants),
            section: fieldValue(obj.raw, "section", constants),
            law: fieldValue(obj.raw, "law", constants),
            years: fieldValue(obj.raw, "years", constants),
            starts: fieldValue(obj.raw, "starts", constants),
            kinds: fieldArray(obj.raw, "kinds"),
            verified: fieldValue(obj.raw, "verified", constants),
          });
        }
      } else {
        addLegalRows(region, b, null);
      }
    }
    if (legalRows.length > 0) out.legalRuleRows[name] = legalRows;

    const solRows = [];
    for (const b of ["SOL_ROWS", "SOL_GAPS"]) {
      const region = regions[b];
      if (!region) continue;
      for (const obj of objectLiterals(region)) {
        if (!/(?:^|[\s{,])section\s*:/.test(obj.raw)) continue;
        solRows.push({
          block: b,
          jurisdiction: fieldValue(obj.raw, "jurisdiction", constants),
          years: fieldValue(obj.raw, "years", constants),
          law: fieldValue(obj.raw, "law", constants),
          section: fieldValue(obj.raw, "section", constants),
          starts: fieldValue(obj.raw, "starts", constants),
          verified: fieldValue(obj.raw, "verified", constants),
        });
      }
    }
    if (solRows.length > 0) out.solRows[name] = solRows;

    // SOL_REFUSED_UNITS: a Record<unit, recorded refusal text>.
    const refRegion = regions.SOL_REFUSED_UNITS;
    if (refRegion && refRegion.startsWith("{")) {
      const rows = [];
      const re = /(?:^|\n)\s*([A-Za-z][\w$-]*)\s*:\s*("(?:[^"\\]|\\.)*")/g;
      let r;
      while ((r = re.exec(refRegion)) !== null) rows.push({ unit: r[1], refusal_text: unescapeStringLiteral(r[2].slice(1, -1)) });
      if (rows.length > 0) out.solRefused = rows;
    }

    // PROVINCE_INSTRUMENTS: a Record<province token, instrument record>.
    const provRegion = regions.PROVINCE_INSTRUMENTS;
    if (provRegion && provRegion.startsWith("{")) {
      const rows = [];
      const keyRe = /(?:^|\n)\s*"?([A-Z]{2})"?\s*:\s*\{/g;
      let k;
      while ((k = keyRe.exec(provRegion)) !== null) {
        const open = k.index + k[0].length - 1;
        const close = scanBalanced(provRegion, open, "{", "}");
        if (close <= open) continue;
        const raw = provRegion.slice(open, close + 1);
        rows.push({
          province_token: k[1],
          instrument: fieldValue(raw, "instrument", constants),
          citation: fieldValue(raw, "citation", constants),
          url: fieldValue(raw, "url", constants) || fieldValue(raw, "source", constants),
          statute: fieldValue(raw, "statute", constants),
        });
      }
      if (rows.length > 0) out.provinceInstruments = rows;
    }

    const authorityRows = [];
    for (const obj of objectLiterals(text)) {
      if (!/(?:^|[\s{,])locatorPrefix\s*:/.test(obj.raw)) continue;
      authorityRows.push({
        id: fieldValue(obj.raw, "id", constants),
        jurisdiction: fieldValue(obj.raw, "jurisdiction", constants),
        kind: fieldValue(obj.raw, "kind", constants),
        level: fieldValue(obj.raw, "level", constants),
        instrument: fieldValue(obj.raw, "instrument", constants),
        locatorPrefix: fieldValue(obj.raw, "locatorPrefix", constants),
        sourceUrl: fieldValue(obj.raw, "sourceUrl", constants),
        retrievedOn: fieldValue(obj.raw, "retrievedOn", constants),
      });
    }
    if (authorityRows.length > 0) out.authorityRows[name] = authorityRows;

    if (/\.tsv$/i.test(name)) {
      const rows = parseDelimited(text, "\t");
      out.citationRegistry = { header: rows[0], rows: rows.slice(1) };
    }
  }

  return out;
}

/** Top-level argument slices of a call whose "(" is at openIndex. */
function callArgs(text, openIndex) {
  const closeIndex = scanBalanced(text, openIndex, "(", ")");
  if (closeIndex < 0) return null;
  const inner = text.slice(openIndex + 1, closeIndex);
  const args = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < inner.length; i += 1) {
    const c = inner[i];
    if (c === "/" && inner[i + 1] === "/") {
      const nl = inner.indexOf("\n", i);
      i = nl < 0 ? inner.length : nl;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      i = skipString(inner, i) - 1;
      continue;
    }
    if (c === "(" || c === "{" || c === "[") depth += 1;
    else if (c === ")" || c === "}" || c === "]") depth -= 1;
    else if (c === "," && depth === 0) {
      args.push(inner.slice(start, i));
      start = i + 1;
    }
  }
  const tail = inner.slice(start);
  if (tail.trim().length > 0) args.push(tail);
  return { args, inner, closeIndex };
}

/** Constant map: `const NAME = "..."`, single-quoted and backtick literals, one interpolation pass. */
function buildConstants(text) {
  const map = {};
  const re = /(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*(?::[^=;]+)?=\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)\s*;/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    map[m[1]] = unescapeStringLiteral(m[2].slice(1, -1));
  }
  const re2 = /(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*(?::[^=;]+)?=\s*`([^`]*)`\s*;/g;
  while ((m = re2.exec(text)) !== null) {
    let v = m[2];
    let changed = true;
    let guard = 0;
    while (changed && guard < 6) {
      changed = false;
      guard += 1;
      v = v.replace(/\$\{([A-Za-z_$][\w$]*)\}/g, (all, name) => {
        if (Object.prototype.hasOwnProperty.call(map, name)) {
          changed = true;
          return map[name];
        }
        return all;
      });
    }
    map[m[1]] = unescapeStringLiteral(v);
  }
  return map;
}

/** First scalar value of `field:` in an object literal, resolved through the constant map. */
function fieldValue(raw, field, constants) {
  const re = new RegExp("(?:^|[\\s{,])" + field + "\\s*:\\s*");
  const m = re.exec(raw);
  if (!m) return null;
  const rest = raw.slice(m.index + m[0].length);
  const str = /^("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/.exec(rest);
  if (str) return unescapeStringLiteral(str[1].slice(1, -1));
  const id = /^([A-Za-z_$][\w$]*)/.exec(rest);
  if (id && constants && Object.prototype.hasOwnProperty.call(constants, id[1])) return constants[id[1]];
  if (id && /^(true|false|null)$/.test(id[1])) return id[1];
  const num = /^(-?\d+(?:\.\d+)?)/.exec(rest);
  if (num) return num[1];
  return null;
}

/** Array-of-strings value of `field:[...]` in an object literal. */
function fieldArray(raw, field) {
  const re = new RegExp("(?:^|[\\s{,])" + field + "\\s*:\\s*\\[");
  const m = re.exec(raw);
  if (!m) return [];
  const open = m.index + m[0].length - 1;
  const close = scanBalanced(raw, open, "[", "]");
  if (close < 0) return [];
  const inner = raw.slice(open + 1, close);
  const out = [];
  const re2 = /"((?:[^"\\]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;
  let s;
  while ((s = re2.exec(inner)) !== null) out.push(unescapeStringLiteral(s[1] !== undefined ? s[1] : s[2]));
  return out;
}

/** Simple RFC4180-ish CSV parse. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else inQuotes = false;
      } else cell += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (c !== "\r") cell += c;
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}
