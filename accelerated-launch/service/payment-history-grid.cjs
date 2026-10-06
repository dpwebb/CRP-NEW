'use strict';
/**
 * payment-history-grid.cjs — OWNER-ACCEPT-009 geometry-aware payment-history grid assembly.
 *
 * Reads a payment-history TABLE from positioned words (native `pdftotext -bbox` boxes or local OCR word
 * evidence): separate month/year headings, code cells and a printed legend, associated by their POSITIONS.
 * It never flattens a table into a guessed chronological order, never guesses a period, legend meaning or account
 * association when alignment is ambiguous, and preserves raw cells, printed meanings, source coordinates and
 * uncertainty.
 */

const MONTH_RE = /^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|SEPT|OCT|NOV|DEC|\d{4}|\d{1,2}\/\d{4}|\d{4}-\d{1,2})$/i;
const CODE_RE = /^[A-Za-z0-9*#.-]{1,4}$/;
const HEADER_RE = /PAYMENT\s+HISTORY|PAYMENT\s+PROFILE|REPAYMENT\s+HISTORY|HISTORY\s+OF\s+PAYMENTS/i;
const ACCOUNT_RE = /CREDITOR|LENDER|PROVIDER|OPENED|ACCOUNT|TRADELINE/i;
const CONTINUATION_RE = /CONTINUED|CONT'D|CONT\./i;
const LEGEND_PAIR_RE = /([A-Z0-9]{1,4})\s*=\s*([A-Za-z0-9][A-Za-z0-9\s\/-]*?)(?=\s+[A-Z0-9]{1,4}\s*=|\s*$)/g;

/* Group words into rows by their top edge. The tolerance is derived from the median word height, so the same
   logic works for native point coordinates and OCR pixel coordinates. Words within ~0.7 word-heights of one
   another share a row. */
function rowsOf(words) {
  const sorted = [...(words || [])].sort((a, b) => (a.y0 - b.y0) || (a.x0 - b.x0));
  if (!sorted.length) return [];
  const heights = sorted.map((w) => ((w.y1 != null ? w.y1 : w.y0) - w.y0)).filter((h) => h > 0).sort((a, b) => a - b);
  const median = heights.length ? heights[Math.floor(heights.length / 2)] : 10;
  const tol = Math.max(2, Math.min(20, median * 0.7));
  const rows = [];
  for (const w of sorted) {
    const last = rows[rows.length - 1];
    if (last && Math.abs(last.y0 - w.y0) <= tol) {
      last.words.push(w);
      last.y0 = Math.min(last.y0, w.y0);
    } else {
      rows.push({ y0: w.y0, words: [w] });
    }
  }
  for (const r of rows) r.words.sort((a, b) => a.x0 - b.x0);
  return rows;
}

function rowText(row) { return (row.words || []).map((w) => w.text).join(' '); }

/* C3: a positioned word's trust. Native text-layer words carry no recorded confidence and are trustworthy by
   construction; a local-OCR word carries its own `trusted` decision (confidence vs the recorded floor). An OCR
   word with a confidence but no trust decision is treated as untrusted (unknown trust state), never as native. */
function wordTrust(w) {
  if (!w) return { trusted: true, reason: null };
  if (typeof w.trusted === 'boolean') return { trusted: w.trusted, reason: w.trusted ? null : 'BELOW_CONFIDENCE_FLOOR' };
  if (typeof w.confidence === 'number') return { trusted: false, reason: 'UNKNOWN_TRUST_STATE' };
  return { trusted: true, reason: null }; // native text layer
}

function isHeaderRow(words) { return words.length > 0 && words.every((w) => MONTH_RE.test(w.text)); }
function isCellRow(words) { return words.length > 0 && words.every((w) => CODE_RE.test(w.text) && !MONTH_RE.test(w.text)); }

/* Parse a printed `code=meaning` legend. Non-ASCII OCR artifacts are replaced ONLY for matching (never to change
   a printed code), every replacement is RECORDED so the transformation is not silent, and a legend whose code or
   meaning is materially uncertain is left unresolved. */
function parseLegend(text) {
  const src = String(text || '');
  const transformed = [];
  const clean = src.replace(/[^\x20-\x7E]/g, (ch) => { transformed.push({ from: ch, to: ' ' }); return ' '; });
  const legend = [];
  const re = new RegExp(LEGEND_PAIR_RE.source, 'g');
  let m;
  while ((m = re.exec(clean))) legend.push({ code: m[1].toUpperCase(), meaning: m[2].trim() });
  return { legend, transformed, original: src };
}

/* Group a heading row's words into PERIODS, pairing a month token with a following year token when the row
   prints "JAN 2024 FEB 2024 …" as separate positioned words. Otherwise every word is its own period. */
function groupHeaderPeriods(words) {
  if (!words || !words.length) return [];
  const isYear = (w) => /^\d{4}$/.test(w.text);
  const isMonth = (w) => /^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|SEPT|OCT|NOV|DEC)$/i.test(w.text);
  const periods = [];
  let i = 0;
  while (i < words.length) {
    if (isMonth(words[i]) && i + 1 < words.length && isYear(words[i + 1])) {
      periods.push({ text: `${words[i].text} ${words[i + 1].text}`, x0: words[i].x0, x1: words[i + 1].x1 });
      i += 2;
    } else {
      periods.push({ text: words[i].text, x0: words[i].x0, x1: words[i].x1 });
      i += 1;
    }
  }
  return periods;
}

/* For each heading period, find the cell word whose x-centre is nearest, within a tolerance derived from the
   LOCAL column spacing (never a single absolute unit shared between native points and OCR pixels). C2: a
   positioned code cell is accepted for AT MOST ONE period — an ambiguous tie (equidistant to two columns), a
   column with no cell, and a column with multiple competing cells are all left UNRESOLVED. C3: a code whose word
   is below the confidence floor (untrusted) is withheld (raw preserved, never resolved into a delinquency). */
function zipHeaderToCells(headerWords, cellWords, legend) {
  const map = new Map((legend || []).map((l) => [l.code, l.meaning]));
  const periods = groupHeaderPeriods(headerWords);
  const centers = periods.map((h) => ({ text: h.text, x0: h.x0, x1: h.x1, cx: (h.x0 + h.x1) / 2 }));
  if (!centers.length) return [];

  // Local column spacing from the heading itself, in the heading's own coordinate units.
  const gaps = [];
  for (let i = 1; i < centers.length; i++) gaps.push(centers[i].cx - centers[i - 1].cx);
  const sortedGaps = gaps.filter((g) => g > 0).sort((a, b) => a - b);
  const spacing = sortedGaps.length ? sortedGaps[Math.floor(sortedGaps.length / 2)] : 0;
  const minGap = sortedGaps.length ? sortedGaps[0] : 0;
  const tol = spacing > 0 ? Math.min(spacing * 0.4, minGap * 0.5) : 0;

  // Assign each cell to at most one column; a tie between two columns is rejected.
  const columnCells = centers.map(() => []);
  for (const c of cellWords) {
    const cx = (c.x0 + c.x1) / 2;
    let nearest = -1, nearestDist = Infinity, secondDist = Infinity;
    for (let i = 0; i < centers.length; i++) {
      const d = Math.abs(cx - centers[i].cx);
      if (d < nearestDist) { secondDist = nearestDist; nearestDist = d; nearest = i; }
      else if (d < secondDist) secondDist = d;
    }
    if (nearest < 0) continue;
    const tie = (secondDist - nearestDist) < 1e-6;
    if (tie) continue;                     // ambiguous tie: the cell cannot be attributed to one period
    if (nearestDist > tol) continue;       // incompatible alignment: outside the local column spacing
    columnCells[nearest].push(c);
  }

  const cells = [];
  for (let i = 0; i < centers.length; i++) {
    const col = columnCells[i];
    if (!col.length) {
      cells.push({ period: centers[i].text, code: null, meaning: null, uncertain: true, x: centers[i].cx, reason: 'NO_CELL' });
      continue;
    }
    if (col.length > 1) {
      cells.push({ period: centers[i].text, code: null, meaning: null, uncertain: true, x: centers[i].cx, reason: 'AMBIGUOUS_MULTIPLE_CELLS' });
      continue;
    }
    const best = col[0];
    const trust = wordTrust(best);
    const rawCode = best.text.toUpperCase();
    if (!trust.trusted) {
      cells.push({ period: centers[i].text, code: null, meaning: null, uncertain: true, raw_code: rawCode, x: centers[i].cx, source_x0: best.x0, source_x1: best.x1, source_y0: best.y0, reason: trust.reason });
      continue;
    }
    const known = map.has(rawCode);
    cells.push({ period: centers[i].text, code: rawCode, meaning: known ? map.get(rawCode) : null, uncertain: !known, x: centers[i].cx, source_x0: best.x0, source_x1: best.x1, source_y0: best.y0 });
  }
  return cells;
}

/* A vertical grid: each row below the heading is "PERIOD CODE" on the SAME line (period at left, code at right). */
function verticalGrid(rows, startIndex) {
  /* C4: the legend row is searched only WITHIN this grid's section — from the heading down to the next account
     line — so another account's legend is never borrowed. */
  let legendRow = null;
  for (let j = startIndex + 1; j < rows.length; j++) {
    const t = rowText(rows[j]);
    if (ACCOUNT_RE.test(t)) break;                 // the next account's section begins here
    if (/[A-Z0-9]{1,4}\s*=/.test(t)) { legendRow = rows[j]; break; }
  }
  const legendResult = legendRow ? parseLegend(rowText(legendRow)) : { legend: [], transformed: [] };
  const pairs = [];
  for (let j = startIndex + 1; j < rows.length; j++) {
    const t = rowText(rows[j]);
    if (ACCOUNT_RE.test(t)) break;                 // the next account's section begins here
    if (/[A-Z0-9]{1,4}\s*=/.test(t)) continue; // legend row
    const w = rows[j].words;
    if (w.length === 2 && MONTH_RE.test(w[0].text) && CODE_RE.test(w[1].text)) {
      const codeWord = w[1];
      const code = codeWord.text.toUpperCase();
      const map = new Map(legendResult.legend.map((l) => [l.code, l.meaning]));
      const trust = wordTrust(codeWord);
      const known = map.has(code);
      if (!trust.trusted) {
        pairs.push({ period: w[0].text, code: null, meaning: null, uncertain: true, raw_code: code, source_x0: codeWord.x0, source_x1: codeWord.x1, source_y0: codeWord.y0, reason: trust.reason });
      } else {
        pairs.push({ period: w[0].text, code, meaning: known ? map.get(code) : null, uncertain: !known, source_x0: codeWord.x0, source_x1: codeWord.x1, source_y0: codeWord.y0 });
      }
    } else {
      break; // the run of "PERIOD CODE" rows ends
    }
  }
  return { pairs, legend: legendResult.legend, transformed: legendResult.transformed };
}

/* C4: the bureau/report section a page belongs to, from its own text lines. Two grids on different pages may
   continue across the page boundary ONLY when they share the same section; distinct bureau or report-date
   sections never continue. */
function pageSectionKey(page) {
  const lines = ((page && page.lines) || []).map((l) => String(l && (l.text != null ? l.text : l)).trim()).filter(Boolean);
  const bureau = lines.find((l) => /EQUIFAX|TRANSUNION|EXPERIAN|ILLION/i.test(l)) || null;
  const reportDate = lines.find((l) => /REPORT\s+DATE|DATE\s+OF\s+REPORT|PREPARED\s+DATE|FILE\s+DATE/i.test(l)) || null;
  if (!bureau && !reportDate) return null;
  return [bureau, reportDate].filter(Boolean).join('|');
}

/* Continuation across pages may happen only when the sections are NOT known to differ. A continuation page that
   does not repeat its bureau/report date has an unknown section (null) and does not contradict the prior page;
   a page that prints a DIFFERENT bureau or report date is a distinct section and never continues. */
function sameSection(a, b) {
  if (a == null || b == null) return true; // unknown on one side is not a contradiction
  return a === b;
}

/** Assemble every payment-history grid a page prints, from positioned words (horizontal and vertical). */
function assembleGrids(pages) {
  const grids = [];
  for (const page of pages || []) {
    const words = page.words || [];
    if (!words.length) continue;
    const rows = rowsOf(words);
    for (let i = 0; i < rows.length; i++) {
      const heading = rowText(rows[i]);
      if (!HEADER_RE.test(heading)) continue;

      // 1) Horizontal: a heading row of periods + a separate cell row.
      let legendResult = { legend: [], transformed: [] };
      let headerRow = null, cellRow = null;
      for (let j = i + 1; j < rows.length; j++) {
        const t = rowText(rows[j]);
        if (ACCOUNT_RE.test(t)) break; // C4: the next account's section begins here — do not borrow its legend/cells
        if (!legendResult.legend.length && /[A-Z0-9]{1,4}\s*=/.test(t)) legendResult = parseLegend(t);
        else if (!headerRow && isHeaderRow(rows[j].words)) headerRow = rows[j];
        else if (headerRow && !cellRow && isCellRow(rows[j].words)) cellRow = rows[j];
        if (legendResult.legend.length && headerRow && cellRow) break;
      }

      let accountText = null;
      let cells = null;
      let layout = null;
      let legend = legendResult.legend;

      if (headerRow && cellRow) {
        cells = zipHeaderToCells(headerRow.words, cellRow.words, legend);
        layout = 'HORIZONTAL';
      } else {
        // 2) Vertical: "PERIOD CODE" rows.
        const v = verticalGrid(rows, i);
        if (v.pairs.length) {
          cells = v.pairs;
          legend = v.legend;
          legendResult.transformed = v.transformed;
          layout = 'VERTICAL';
        }
      }
      if (!cells || !cells.length) continue; // ambiguous alignment: leave the grid unresolved, never guess

      for (let j = i - 1; j >= 0; j--) {
        const t = rowText(rows[j]);
        if (ACCOUNT_RE.test(t)) { accountText = t; break; }
      }

      grids.push({
        page: page.page,
        source: page.source || null,
        section_key: pageSectionKey(page),
        account: accountText,
        heading: heading,
        layout,
        cells,
        legend,
        legend_transformations: legendResult.transformed,
        location: { page: page.page, source: page.source || null, y_heading: rows[i].y0 }
      });
    }
  }
  /* OWNER-ACCEPT-009 item 1 + C4: continuation across pages. Account context is carried ONLY on POSITIVE
     report-supported continuation evidence — page adjacency, the same source AND the same bureau/report section,
     the ABSENCE of a new account heading, AND a printed continuation marker ("Continued"/"Cont'd") on either side.
     C4: the match must be UNIQUE — when the previous page carries more than one account-carrying grid (or zero),
     the continuation is ambiguous and the grid stays unresolved. A generic marker plus adjacency is not enough. */
  const gridsByPage = new Map();
  for (const g of grids) {
    if (!gridsByPage.has(g.page)) gridsByPage.set(g.page, []);
    gridsByPage.get(g.page).push(g);
  }
  for (const g of grids) {
    if (g.account) continue;
    const prevGrids = gridsByPage.get(g.page - 1) || [];
    const marker = CONTINUATION_RE.test(g.heading || '') || prevGrids.some((pg) => CONTINUATION_RE.test(pg.heading || pg.account || ''));
    if (!marker) continue;
    const candidates = prevGrids.filter((pg) => pg.account && pg.source === g.source && sameSection(pg.section_key, g.section_key));
    if (candidates.length !== 1) continue; // zero or multiple matching grids: ambiguous, never borrowed
    const prev = candidates[0];
    g.account = prev.account;
    g.continued_from_page = prev.page;
    if (!g.legend.length) { g.legend = prev.legend; g.legend_transformations = prev.legend_transformations; }
  }
  return grids;
}

module.exports = { assembleGrids, rowsOf, isHeaderRow, isCellRow, parseLegend, zipHeaderToCells, groupHeaderPeriods, verticalGrid, wordTrust, pageSectionKey, sameSection };
