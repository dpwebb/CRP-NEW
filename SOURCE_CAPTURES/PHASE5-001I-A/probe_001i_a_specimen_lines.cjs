'use strict';
/**
 * probe_001i_a_specimen_lines.cjs — read-only structural probe of the pinned presentation.
 *
 * PHASE5-001I-A. This probe exists to design and evidence the locators. It is read-only with respect to
 * the legacy repository and it deliberately does NOT print report content:
 *
 *   - for the contract's row labels it prints the label, whether a value follows, and the value's broad
 *     class (DATE / NUMERIC / ALPHA / ALPHANUMERIC / EMPTY) — never the value;
 *   - it prints the raw token of exactly the two dates this unit's bounded scope reads, both of which
 *     PROD-003's register already records (Request Date; Last Payment Date);
 *   - it never prints a page's free text, a name, an address, an account number or any other identifier.
 *
 * Run: node SOURCE_CAPTURES/PHASE5-001I-A/probe_001i_a_specimen_lines.cjs
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PDFTOTEXT = 'pdftotext';
const { readPinnedPresentationPointer } = require('../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');
const POINTER = readPinnedPresentationPointer();
const SPECIMEN = POINTER.absolute_path;
const SPECIMEN_SHA256 = POINTER.sha256;

// The contract's collection-record row set, as PROD-003's register records it (FACT-01 location).
const ROW_LABELS = [
  'Date Assigned', 'Member Name', 'Phone Number', 'Member Number', 'First Delinquency',
  'Account Number', 'Amount', 'Status', 'Balance', 'Narrative', 'Date Paid/Settled',
  'Date Verified', 'Last Payment Date'
];
const VALUES_PRINTED_FOR = new Set(['Last Payment Date', 'Request Date', 'First Delinquency', 'Date Assigned']);

function textOfPage(page, file) {
  return execFileSync(PDFTOTEXT, ['-f', String(page), '-l', String(page), '-layout', file, '-'], { encoding: 'utf8' });
}

function valueClass(v) {
  if (v === '') return 'EMPTY';
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(v)) return 'DATE_DDDD/DD/DD';
  if (/^[\d,.\-$]+$/.test(v)) return 'NUMERIC';
  if (/^[A-Za-z][A-Za-z .&'\-]*$/.test(v)) return 'ALPHA';
  return 'ALPHANUMERIC_OR_OTHER';
}

function classify(label, rest) {
  const v = rest.trim();
  if (VALUES_PRINTED_FOR.has(label) && /^\d{4}\/\d{2}\/\d{2}$/.test(v)) {
    return `class=DATE_DDDD/DD/DD printed_token=${v}`;
  }
  return `class=${valueClass(v)}`;
}

function labelLines(page, file) {
  const lines = textOfPage(page, file).split('\n');
  const out = [];
  lines.forEach((line, index) => {
    for (const label of ROW_LABELS) {
      const at = line.indexOf(label);
      if (at === -1) continue;
      const rest = line.slice(at + label.length);
      out.push(`page ${page} line ${index + 1}: label="${label}" value_present=${rest.trim().length > 0} ${classify(label, rest)}`);
    }
    if (/Request Date/i.test(line)) {
      const at = line.indexOf('Request Date');
      out.push(`page ${page} line ${index + 1}: label="Request Date" raw_slice="${line.slice(Math.max(0, at), at + 34).replace(/\s+$/, '')}"`);
    }
  });
  return { lineCount: lines.length, chars: textOfPage(page, file).length, hits: out };
}

const report = { specimen_sha256: SPECIMEN_SHA256, pages_probed: [], pages: {} };
const pageCount = 22;
for (const page of [1, 16, 17, 22]) {
  const { lineCount, chars, hits } = labelLines(page, SPECIMEN);
  report.pages[page] = { lineCount, chars, hits };
}
report.pages_probed = Object.keys(report.pages).map(Number);
report.page_count_nominal = pageCount;

const sha = require('crypto').createHash('sha256').update(fs.readFileSync(SPECIMEN)).digest('hex').toUpperCase();
report.specimen_sha256_measured = sha;
report.specimen_digest_matches_pin = sha === SPECIMEN_SHA256;
report.probe_tool = execFileSync(PDFTOTEXT, ['-v'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).split('\n')[0];

const outDir = path.join(__dirname);
fs.writeFileSync(path.join(outDir, 'probe_specimen_lines.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
for (const page of report.pages_probed) {
  console.log(`=== page ${page} (${report.pages[page].lineCount} lines, ${report.pages[page].chars} chars) ===`);
  for (const h of report.pages[page].hits) console.log(h);
}
console.log(report.probe_tool);
console.log(`specimen digest matches pin: ${report.specimen_digest_matches_pin}`);
