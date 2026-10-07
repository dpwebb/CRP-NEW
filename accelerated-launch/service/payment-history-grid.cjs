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
const CODE_RE = /^[A-Za-z0-9*#.?/-]{1,4}$/;
const MONTH_TOKEN_RE = /^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|SEPT|OCT|NOV|DEC)$/i;
const YEAR_RE = /^[1-9]\d{3}$/;
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

/* Only an exact, physically separate row label opens the labelled table path. Short damaged tokens are kept
   on that path as unresolved readings; they are never corrected to a month or payment code. */
function labelledRow(words, label) {
  if (!words || words.length < 2 || String(words[0].text).toUpperCase() !== label.toUpperCase()) return null;
  const data = words.slice(1);
  if (!(words[0].x1 <= data[0].x0) || data.some((w) => !/^\S{1,12}$/.test(w.text))) return null;
  return { words: data, label: words[0] };
}

function sourceLocation(words, page) {
  const list = (Array.isArray(words) ? words : [words]).filter(Boolean);
  const coord = (key, fn) => {
    const values = list.map((w) => w[key]).filter(Number.isFinite);
    return values.length ? fn(...values) : null;
  };
  return { page: page && page.page || null, source: page && page.source || null,
    x0: coord('x0', Math.min), x1: coord('x1', Math.max), y0: coord('y0', Math.min), y1: coord('y1', Math.max),
    raw: list.map((w) => w.text).join(' '), trusted: list.every((w) => wordTrust(w).trusted),
    ...(list.some((w) => typeof w.confidence === 'number')
      ? { confidence: Math.min(...list.filter((w) => typeof w.confidence === 'number').map((w) => w.confidence)) } : {}) };
}

/* A year applies to month-only columns only when it is printed in this exact history heading. Neither the
   report date nor a previous grid/page supplies a year. Competing/damaged heading years remain unresolved. */
function headingYear(row) {
  const text = rowText(row);
  const m = /^(.*?)\s+PAYMENT\s+HISTORY(?:\s+(?:CONTINUED|CONT'D|CONT\.))?$/i.exec(text);
  if (!m || !/^\d/.test(m[1])) return null;
  const prefix = row.words.slice(0, m[1].trim().split(/\s+/).length);
  return { words: prefix, text: prefix.length === 1 && YEAR_RE.test(prefix[0].text) ? prefix[0].text : null,
    trusted: prefix.length === 1 && YEAR_RE.test(prefix[0].text) && wordTrust(prefix[0]).trusted };
}

function noPerformanceMeaning(meaning) { return /^(?:UNKNOWN|NOT REPORTED|NO (?:DATA|PAYMENT HISTORY)|N\/R|[-?])$/i.test(String(meaning || '').trim()); }

/* Read the grid's own printed key. A report-wide key before the account, a neighboring account's key and a key
   on another page are outside this scope. Repeated/conflicting meanings are retained instead of last-wins. */
function sectionLegend(rows, startIndex, endIndex, page) {
  const entries = [], transformations = [], keyRows = new Set();
  for (let j = startIndex + 1; j < endIndex; j++) {
    const row = rows[j], text = rowText(row);
    if (/[A-Z0-9]{1,4}\s*=/.test(text)) {
      const parsed = parseLegend(text);
      transformations.push(...parsed.transformed);
      const location = sourceLocation(row.words, page);
      for (const item of parsed.legend) entries.push({ ...item, location, trusted: location.trusted,
        performance_usable: !noPerformanceMeaning(item.meaning) });
      keyRows.add(j);
    } else if (/^RATINGS\s+KEY:?$/i.test(text)) {
      const heading = sourceLocation(row.words, page);
      keyRows.add(j);
      for (let k = j + 1; k < endIndex; k++) {
        const own = rows[k].words;
        if (own.length < 2 || !CODE_RE.test(own[0].text) || !(own[0].x1 < own[1].x0)) break;
        const location = sourceLocation(own, page), codeLocation = sourceLocation(own[0], page), meaningLocation = sourceLocation(own.slice(1), page);
        const meaning = own.slice(1).map((w) => w.text).join(' ');
        entries.push({ code: own[0].text.toUpperCase(), meaning, location, code_location: codeLocation,
          meaning_location: meaningLocation, heading_location: heading, trusted: heading.trusted && location.trusted,
          performance_usable: !noPerformanceMeaning(meaning) });
        keyRows.add(k);
      }
    }
  }
  const legend = [];
  for (const code of new Set(entries.map((e) => e.code))) {
    const alternatives = entries.filter((e) => e.code === code);
    const conflict = new Set(alternatives.map((e) => e.meaning.trim().toUpperCase())).size > 1;
    const trusted = alternatives.every((e) => e.trusted) && !conflict;
    legend.push({ ...alternatives[0], trusted, ...(alternatives.length > 1 ? { alternatives } : {}),
      ...(conflict ? { meaning: null, reason: 'CONFLICTING_LEGEND', performance_usable: false }
        : !trusted ? { reason: 'UNTRUSTED_LEGEND', performance_usable: false } : {}) });
  }
  return { legend, transformed: transformations, keyRows };
}

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
function groupHeaderPeriods(words, year) {
  if (!words || !words.length) return [];
  const periods = [];
  let i = 0;
  while (i < words.length) {
    const month = words[i];
    if (MONTH_TOKEN_RE.test(month.text) && i + 1 < words.length && !MONTH_TOKEN_RE.test(words[i + 1].text)
      && /^(?:[A-Za-z0-9]{4}|\d{3})$/.test(words[i + 1].text)) {
      const ownYear = words[i + 1];
      const conflict = i + 2 < words.length && /^\d{4}$/.test(words[i + 2].text);
      periods.push({ text: `${month.text} ${ownYear.text}`, raw: `${month.text} ${ownYear.text}`,
        x0: month.x0, x1: ownYear.x1, monthWords: [month], yearWords: [ownYear],
        trusted: wordTrust(month).trusted && wordTrust(ownYear).trusted && YEAR_RE.test(ownYear.text)
          && !conflict && (!year || year.trusted && year.text === ownYear.text),
        reason: !YEAR_RE.test(ownYear.text) ? 'INVALID_PERIOD_YEAR' : conflict ? 'AMBIGUOUS_PERIOD_YEAR' : year && (!year.trusted || year.text !== ownYear.text)
          ? 'CONFLICTING_HEADING_YEAR' : null });
      i += 2;
    } else {
      const dated = /^(?:(\d{1,2})\/(\d{4})|(\d{4})-(\d{1,2}))$/.exec(month.text);
      const valid = MONTH_TOKEN_RE.test(month.text) || dated && Number(dated[1] || dated[4]) >= 1
        && Number(dated[1] || dated[4]) <= 12 && YEAR_RE.test(dated[2] || dated[3]);
      const usesHeadingYear = MONTH_TOKEN_RE.test(month.text) && year;
      periods.push({ text: usesHeadingYear && year.text ? `${month.text} ${year.text}` : month.text,
        raw: month.text, x0: month.x0, x1: month.x1, monthWords: [month], yearWords: usesHeadingYear ? year.words : [],
        trusted: valid && wordTrust(month).trusted && (!usesHeadingYear || year.trusted),
        reason: !valid ? 'INVALID_PERIOD' : usesHeadingYear && !year.trusted ? 'UNRESOLVED_HEADING_YEAR' : null });
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
function zipHeaderToCells(headerWords, cellWords, legend, context = {}) {
  const periods = groupHeaderPeriods(headerWords, context.year);
  const centers = periods.map((h) => ({ ...h, cx: (h.x0 + h.x1) / 2 }));
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
      cells.push(readCell(centers[i], null, legend, context, 'NO_CELL'));
      continue;
    }
    if (col.length > 1) {
      cells.push({ ...readCell(centers[i], null, legend, context, 'AMBIGUOUS_MULTIPLE_CELLS'),
        competing_cells: col.map((w) => sourceLocation(w, context.page)) });
      continue;
    }
    cells.push(readCell(centers[i], col[0], legend, context));
  }
  return cells;
}

function readCell(period, word, legend, context, failure) {
  const code = word && String(word.text).toUpperCase();
  const entries = (legend || []).filter((l) => l.code === code);
  const conflicting = new Set(entries.map((l) => l.meaning)).size > 1;
  const entry = entries[0];
  const headingTrusted = !context.heading || context.heading.words.every((w) => wordTrust(w).trusted);
  const labelsTrusted = [context.headerLabel, context.cellLabel].filter(Boolean).every((w) => wordTrust(w).trusted);
  const missingYear = (context.headerLabel || context.cellLabel) && MONTH_TOKEN_RE.test(period.raw) && !period.yearWords.length;
  const periodTrusted = period.trusted && headingTrusted && labelsTrusted && !context.periodAmbiguous && !missingYear;
  const periodLocation = { month: sourceLocation(period.monthWords, context.page),
    year: period.yearWords.length ? sourceLocation(period.yearWords, context.page) : null,
    ...(context.headerLabel ? { label: sourceLocation(context.headerLabel, context.page) } : {}),
    ...(context.heading ? { heading: sourceLocation(context.heading.words, context.page) } : {}) };
  if (context.headerLabel) periodLocation.month.source_field = context.headerLabel.text;
  const location = word ? sourceLocation(word, context.page) : null;
  const reason = failure || (!periodTrusted ? period.reason || (missingYear ? 'MISSING_PERIOD_YEAR' : 'UNTRUSTED_OR_AMBIGUOUS_PERIOD') : null)
    || (word && !wordTrust(word).trusted ? wordTrust(word).reason : null)
    || (word && !CODE_RE.test(word.text) ? 'INVALID_CODE' : null)
    || (conflicting ? 'CONFLICTING_LEGEND' : entry && (entry.trusted === false || entry.location?.trusted === false)
      ? entry.reason || 'UNTRUSTED_LEGEND' : !entry || !entry.meaning ? 'UNKNOWN_CODE' : null);
  return { period: periodTrusted ? period.text : null, raw_period: period.raw, period_location: periodLocation,
    code: word && CODE_RE.test(word.text) && wordTrust(word).trusted ? code : null,
    raw_code: word ? word.text : null, meaning: reason ? null : entry.meaning, uncertain: !!reason,
    performance_usable: !reason && entry.performance_usable !== false && !noPerformanceMeaning(entry.meaning),
    x: period.cx, source_field: context.cellLabel ? context.cellLabel.text : 'Payment History',
    ...(location ? { location, source_x0: word.x0, source_x1: word.x1, source_y0: word.y0,
      ...(context.cellLabel ? { row_label_location: sourceLocation(context.cellLabel, context.page) } : {}) } : {}),
    ...(entry ? { legend_location: entry.location || null, printed_definition: entry } : {}),
    ...(reason ? { reason } : {}) };
}

/* A vertical grid: each row below the heading is "PERIOD CODE" on the SAME line (period at left, code at right). */
function verticalGrid(rows, startIndex, page, suppliedLegend, suppliedEnd) {
  /* C4: the legend row is searched only WITHIN this grid's section — from the heading down to the next account
     line — so another account's legend is never borrowed. */
  let end = suppliedEnd || rows.length;
  for (let j = startIndex + 1; j < end; j++) {
    if (ACCOUNT_RE.test(rowText(rows[j])) || HEADER_RE.test(rowText(rows[j]))) { end = j; break; }
  }
  const legendResult = suppliedLegend || sectionLegend(rows, startIndex, end, page);
  const pairs = [];
  for (let j = startIndex + 1; j < end; j++) {
    const t = rowText(rows[j]);
    if (ACCOUNT_RE.test(t)) break;                 // the next account's section begins here
    if (legendResult.keyRows.has(j)) continue;
    const w = rows[j].words;
    if (w.length === 2 && MONTH_RE.test(w[0].text) && CODE_RE.test(w[1].text)) {
      const period = groupHeaderPeriods([w[0]], headingYear(rows[startIndex]))[0];
      pairs.push(readCell(period, w[1], legendResult.legend, { page, heading: rows[startIndex] }));
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
      let end = rows.length;
      for (let j = i + 1; j < rows.length; j++) {
        const t = rowText(rows[j]);
        if (ACCOUNT_RE.test(t) || HEADER_RE.test(t)) { end = j; break; }
      }
      const legendResult = sectionLegend(rows, i, end, page);
      let headerRow = null, cellRow = null, headerLabel = null, cellLabel = null;
      let periodAmbiguous = false;
      const ratingRows = [];
      for (let j = i + 1; j < end; j++) {
        if (legendResult.keyRows.has(j)) continue;
        const category = labelledRow(rows[j].words, 'Category:');
        const rating = labelledRow(rows[j].words, 'Rating:');
        if (category || isHeaderRow(rows[j].words)) {
          if (headerRow) periodAmbiguous = true;
          else { headerRow = { ...rows[j], words: category ? category.words : rows[j].words }; headerLabel = category && category.label; }
        } else if (headerRow && rating) {
          ratingRows.push(rating);
        } else if (headerRow && !cellRow && isCellRow(rows[j].words)) cellRow = rows[j];
      }
      if (ratingRows.length) {
        cellRow = { words: ratingRows.flatMap((r) => r.words) };
        cellLabel = ratingRows[0].label;
        // Two competing Rating rows are ambiguous even if only one happens to have a readable code.
        if (ratingRows.length > 1) periodAmbiguous = true;
      } else if (headerLabel) {
        // A labelled financial table needs its explicit Rating row; numeric amounts are not performance codes.
        cellRow = null;
      }

      let accountText = null;
      let cells = null;
      let layout = null;
      let legend = legendResult.legend;

      if (headerRow && cellRow) {
        cells = zipHeaderToCells(headerRow.words, cellRow.words, legend, { page, heading: rows[i],
          year: headingYear(rows[i]), headerLabel, cellLabel, periodAmbiguous });
        layout = 'HORIZONTAL';
      } else {
        // 2) Vertical: "PERIOD CODE" rows.
        const v = verticalGrid(rows, i, page, legendResult, end);
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
