'use strict';
/**
 * an-payment-history-grid.cjs — OWNER-ACCEPT-009 geometry-aware payment-history grid assembly. Exercises a REAL
 * positioned-word PDF (separate month/year headings, cells and legend, not an inline period=code string) through
 * pdftotext -bbox positional extraction and the grid assembler, and verifies the downstream consistency check.
 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { buildWordPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');
const { buildPdfDocumentModel } = require('../../../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');
const generalIntake = require('../../general-intake.cjs');

function writeModel(words) {
  const pdf = buildWordPdf([{ words }]);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'crp-grid-'));
  const file = path.join(tmp, 'grid.pdf');
  fs.writeFileSync(file, pdf);
  try { return { model: buildPdfDocumentModel(file), tmp }; } catch (e) { fs.rmSync(tmp, { recursive: true, force: true }); throw e; }
}

function writeModelPages(pageWords) {
  const pdf = buildWordPdf(pageWords.map((words) => ({ words })));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'crp-grid-'));
  const file = path.join(tmp, 'grid.pdf');
  fs.writeFileSync(file, pdf);
  try { return { model: buildPdfDocumentModel(file), tmp }; } catch (e) { fs.rmSync(tmp, { recursive: true, force: true }); throw e; }
}

/* A minimal grid's heading + header + cells + legend, WITHOUT a bureau header or account line, marked as a
   continuation ("Continued") so the account context carries from the preceding page. */
function continuationWords(yBase) {
  return [
    { text: 'Payment', x: 40, y: yBase }, { text: 'History', x: 100, y: yBase }, { text: 'Continued', x: 160, y: yBase },
    { text: 'JAN', x: 40, y: yBase + 20 }, { text: 'FEB', x: 90, y: yBase + 20 }, { text: 'MAR', x: 140, y: yBase + 20 },
    { text: 'OK', x: 40, y: yBase + 35 }, { text: 'OK', x: 90, y: yBase + 35 }, { text: '30', x: 140, y: yBase + 35 },
    { text: 'Key:', x: 40, y: yBase + 55 }, { text: 'OK=Paid', x: 80, y: yBase + 55 }, { text: 'as', x: 140, y: yBase + 55 }, { text: 'agreed', x: 160, y: yBase + 55 }, { text: '30=30', x: 200, y: yBase + 55 }, { text: 'days', x: 250, y: yBase + 55 }, { text: 'late', x: 285, y: yBase + 55 }
  ];
}

function gridWords(yBase, creditor) {
  const c = creditor || 'A';
  return [
    { text: 'Equifax', x: 40, y: 30 }, { text: 'Consumer', x: 90, y: 30 }, { text: 'Credit', x: 160, y: 30 }, { text: 'Report', x: 200, y: 30 },
    { text: 'Report', x: 40, y: 44 }, { text: 'Date:', x: 90, y: 44 }, { text: 'June', x: 130, y: 44 }, { text: '12,', x: 165, y: 44 }, { text: '2026', x: 190, y: 44 },
    { text: 'Creditor', x: 40, y: yBase }, { text: c, x: 100, y: yBase }, { text: 'Opened', x: 112, y: yBase }, { text: '01/01/2020', x: 160, y: yBase },
    { text: 'Payment', x: 40, y: yBase + 20 }, { text: 'History', x: 100, y: yBase + 20 },
    { text: 'JAN', x: 40, y: yBase + 40 }, { text: 'FEB', x: 90, y: yBase + 40 }, { text: 'MAR', x: 140, y: yBase + 40 }, { text: 'APR', x: 190, y: yBase + 40 },
    { text: 'OK', x: 40, y: yBase + 55 }, { text: 'OK', x: 90, y: yBase + 55 }, { text: '30', x: 140, y: yBase + 55 }, { text: 'CO', x: 190, y: yBase + 55 },
    { text: 'Key:', x: 40, y: yBase + 75 }, { text: 'OK=Paid', x: 80, y: yBase + 75 }, { text: 'as', x: 140, y: yBase + 75 }, { text: 'agreed', x: 160, y: yBase + 75 },
    { text: '30=30', x: 200, y: yBase + 75 }, { text: 'days', x: 250, y: yBase + 75 }, { text: 'late', x: 285, y: yBase + 75 },
    { text: 'CO=Charged', x: 315, y: yBase + 75 }, { text: 'off', x: 390, y: yBase + 75 }
  ];
}

async function run(t, check) {
  /* 1. A clean table: separate positioned headings, cells and legend are decoded with their source coordinates. */
  {
    const { model, tmp } = writeModel(gridWords(70));
    try {
      const ext = generalIntake.extract(model, { country: 'US' });
      const rec = (ext.records || []).find((r) => r.facts && Array.isArray(r.facts['account.paymentHistoryCells']));
      check.ok(rec, 'a positioned-word table is read into a record');
      check.equal(rec && rec.facts['account.paymentHistoryLegend'].length, 3, 'the printed legend is decoded');
      check.equal(rec && rec.facts['account.paymentHistoryCells'].length, 4, 'the four cells are associated with their periods');
      check.ok(rec && rec.facts['account.paymentHistoryCells'].every((c) => c.meaning !== null && c.uncertain === false), 'every cell is decoded from the printed legend');
      check.ok(rec && rec.facts['account.paymentHistoryCells'].every((c) => typeof c.source_x0 === 'number' && typeof c.source_y0 === 'number'), 'each cell preserves its source coordinates');
      check.equal(rec && rec.facts['account.reported_identity'], 'CREDITOR A', 'the grid is associated with its account');
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  }

  /* 2. An unfamiliar code stays unresolved, never guessed. */
  {
    const words = gridWords(70);
    words[19] = { text: 'X9', x: 140, y: 125 };
    const { model, tmp } = writeModel(words);
    try {
      const ext = generalIntake.extract(model, { country: 'US' });
      const rec = (ext.records || []).find((r) => r.facts && Array.isArray(r.facts['account.paymentHistoryCells']));
      const cell = rec && rec.facts['account.paymentHistoryCells'].find((c) => c.period === 'MAR');
      check.ok(cell && cell.meaning === null && cell.uncertain === true, 'an unfamiliar code keeps UNKNOWN meaning, never guessed');
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  }

  /* 3. Two nearby accounts keep their histories separate. */
  {
    const words = gridWords(70, 'A').concat(gridWords(220, 'B'));
    const { model, tmp } = writeModel(words);
    try {
      const ext = generalIntake.extract(model, { country: 'US' });
      const recs = (ext.records || []).filter((r) => r.facts && Array.isArray(r.facts['account.paymentHistoryCells']));
      check.equal(recs.length, 2, 'two grids on one page are read into two records');
      check.ok(recs.every((r) => r.facts['account.paymentHistoryCells'].length === 4), 'each grid keeps its own four cells');
      check.ok(recs.some((r) => r.facts['account.reported_identity'] === 'CREDITOR A') && recs.some((r) => r.facts['account.reported_identity'] === 'CREDITOR B'), 'and each grid is associated with its own account');
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  }

  /* 4. Vertical layout: "PERIOD CODE" rows on the same line. */
  {
    const words = [
      { text: 'Equifax', x: 40, y: 30 }, { text: 'Consumer', x: 90, y: 30 }, { text: 'Credit', x: 160, y: 30 }, { text: 'Report', x: 200, y: 30 },
      { text: 'Report', x: 40, y: 44 }, { text: 'Date:', x: 90, y: 44 }, { text: 'June', x: 130, y: 44 }, { text: '12,', x: 165, y: 44 }, { text: '2026', x: 190, y: 44 },
      { text: 'Creditor', x: 40, y: 70 }, { text: 'A', x: 100, y: 70 }, { text: 'Opened', x: 112, y: 70 }, { text: '01/01/2020', x: 160, y: 70 },
      { text: 'Payment', x: 40, y: 90 }, { text: 'History', x: 100, y: 90 },
      { text: 'JAN', x: 40, y: 110 }, { text: 'OK', x: 110, y: 110 },
      { text: 'FEB', x: 40, y: 125 }, { text: 'OK', x: 110, y: 125 },
      { text: 'MAR', x: 40, y: 140 }, { text: '30', x: 110, y: 140 },
      { text: 'Key:', x: 40, y: 165 }, { text: 'OK=Paid', x: 80, y: 165 }, { text: 'as', x: 140, y: 165 }, { text: 'agreed', x: 160, y: 165 }, { text: '30=30', x: 200, y: 165 }, { text: 'days', x: 250, y: 165 }, { text: 'late', x: 285, y: 165 }
    ];
    const { model, tmp } = writeModel(words);
    try {
      const ext = generalIntake.extract(model, { country: 'US' });
      const rec = (ext.records || []).find((r) => r.facts && Array.isArray(r.facts['account.paymentHistoryCells']));
      check.ok(rec, 'a vertical grid is read into a record');
      check.equal(rec && rec.facts['account.paymentHistoryCells'].length, 3, 'the vertical period/code rows are associated');
      check.equal(rec && rec.facts['account.paymentHistoryGrid'].layout, 'VERTICAL', 'the vertical layout is recorded');
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  }

  /* 5. Wrapped headings: "JAN 2024" printed as two positioned words pair into one period. */
  {
    const words = [
      { text: 'Equifax', x: 40, y: 30 }, { text: 'Consumer', x: 90, y: 30 }, { text: 'Credit', x: 160, y: 30 }, { text: 'Report', x: 200, y: 30 },
      { text: 'Report', x: 40, y: 44 }, { text: 'Date:', x: 90, y: 44 }, { text: 'June', x: 130, y: 44 }, { text: '12,', x: 165, y: 44 }, { text: '2026', x: 190, y: 44 },
      { text: 'Creditor', x: 40, y: 70 }, { text: 'A', x: 100, y: 70 }, { text: 'Opened', x: 112, y: 70 }, { text: '01/01/2020', x: 160, y: 70 },
      { text: 'Payment', x: 40, y: 90 }, { text: 'History', x: 100, y: 90 },
      { text: 'JAN', x: 40, y: 110 }, { text: '2024', x: 75, y: 110 }, { text: 'FEB', x: 120, y: 110 }, { text: '2024', x: 155, y: 110 },
      { text: 'OK', x: 55, y: 125 }, { text: 'OK', x: 135, y: 125 },
      { text: 'Key:', x: 40, y: 145 }, { text: 'OK=Paid', x: 80, y: 145 }, { text: 'as', x: 140, y: 145 }, { text: 'agreed', x: 160, y: 145 }
    ];
    const { model, tmp } = writeModel(words);
    try {
      const ext = generalIntake.extract(model, { country: 'US' });
      const rec = (ext.records || []).find((r) => r.facts && Array.isArray(r.facts['account.paymentHistoryCells']));
      const cells = rec && rec.facts['account.paymentHistoryCells'];
      check.ok(cells && cells.some((c) => c.period === 'JAN 2024'), 'a wrapped "JAN 2024" heading pairs into one period');
      check.equal(cells.length, 2, 'two wrapped periods are read');
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  }

  /* 6. Continuation: page 2 prints a repeated grid with no account line; the account context carries from page 1. */
  {
    const page1 = gridWords(70, 'A');
    const page2 = continuationWords(70);
    const { model, tmp } = writeModelPages([page1, page2]);
    try {
      const ext = generalIntake.extract(model, { country: 'US' });
      const recs = (ext.records || []).filter((r) => r.facts && Array.isArray(r.facts['account.paymentHistoryCells']));
      const page2Rec = recs.find((r) => r.facts['account.paymentHistoryGrid'] && r.facts['account.paymentHistoryGrid'].page === 2);
      check.ok(page2Rec, 'a continuation grid on page 2 is read');
      check.equal(page2Rec && page2Rec.facts['account.reported_identity'], 'CREDITOR A', 'the continuation carries the same account context from page 1');
      check.ok(page2Rec && page2Rec.facts['account.paymentHistoryGrid'].continued_from_page === 1, 'and records the page it continued from');
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  }

  /* 7. A new account on page 2 does NOT borrow page 1's account or legend. */
  {
    const page1 = gridWords(70, 'A');
    const page2 = gridWords(70, 'B');
    const { model, tmp } = writeModelPages([page1, page2]);
    try {
      const ext = generalIntake.extract(model, { country: 'US' });
      const recs = (ext.records || []).filter((r) => r.facts && Array.isArray(r.facts['account.paymentHistoryCells']));
      const page2Rec = recs.find((r) => r.facts['account.paymentHistoryGrid'] && r.facts['account.paymentHistoryGrid'].page === 2);
      check.equal(page2Rec && page2Rec.facts['account.reported_identity'], 'CREDITOR B', 'a new account on the next page keeps its own account');
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  }

  /* 8. No continuation marker → the account context is NOT borrowed (grid stays unresolved). */
  {
    const page1 = gridWords(70, 'A');
    const page2 = [
      { text: 'Payment', x: 40, y: 70 }, { text: 'History', x: 100, y: 70 },
      { text: 'JAN', x: 40, y: 90 }, { text: 'FEB', x: 90, y: 90 },
      { text: 'OK', x: 40, y: 105 }, { text: 'OK', x: 90, y: 105 },
      { text: 'Key:', x: 40, y: 125 }, { text: 'OK=Paid', x: 80, y: 125 }, { text: 'as', x: 140, y: 125 }, { text: 'agreed', x: 160, y: 125 }
    ];
    const { model, tmp } = writeModelPages([page1, page2]);
    try {
      const ext = generalIntake.extract(model, { country: 'US' });
      const recs = (ext.records || []).filter((r) => r.facts && Array.isArray(r.facts['account.paymentHistoryCells']));
      const page2Rec = recs.find((r) => r.facts['account.paymentHistoryGrid'] && r.facts['account.paymentHistoryGrid'].page === 2);
      check.ok(!page2Rec || page2Rec.facts['account.paymentHistoryGrid'].continued_from_page == null, 'a page-2 grid with no continuation marker does not borrow the page-1 account');
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  }

  return { grid_verified: true };
}

module.exports = { run, id: 'an-payment-history-grid', title: 'OWNER-ACCEPT-009: geometry-aware payment-history grid assembly' };
