'use strict';
/**
 * probe_001i_a_section_map.cjs — read-only section map of the pinned presentation.
 *
 * PHASE5-001I-A. Prints per-page structure only: character count, whether the page prints the
 * `Collections` heading as a line of its own, and how many times each contract row label occurs.
 * No value, no name, no account number and no free text is printed or written.
 *
 * Run: node SOURCE_CAPTURES/PHASE5-001I-A/probe_001i_a_section_map.cjs
 */

const { execFileSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PDFTOTEXT = 'pdftotext';
const { readPinnedPresentationPointer } = require('../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');
const POINTER = readPinnedPresentationPointer();
const SPECIMEN = POINTER.absolute_path;
const SPECIMEN_SHA256 = POINTER.sha256;
const ROW_LABELS = [
  'Date Assigned', 'Member Name', 'Phone Number', 'Member Number', 'First Delinquency',
  'Account Number', 'Amount', 'Status', 'Balance', 'Narrative', 'Date Paid/Settled',
  'Date Verified', 'Last Payment Date'
];
const PAGE_COUNT = 22;

function rawPage(page) {
  return execFileSync(PDFTOTEXT, ['-f', String(page), '-l', String(page), '-layout', SPECIMEN, '-'], { encoding: 'utf8' });
}

const pages = [];
for (let page = 1; page <= PAGE_COUNT; page += 1) {
  const text = rawPage(page);
  const lines = text.split('\n');
  const counts = {};
  for (const label of ROW_LABELS) {
    const n = lines.filter((l) => l.includes(label)).length;
    if (n > 0) counts[label] = n;
  }
  pages.push({
    page,
    chars: text.length,
    line_count: lines.length,
    prints_collections_heading: lines.some((l) => l.trim() === 'Collections'),
    row_label_occurrences: counts,
    row_label_total: Object.values(counts).reduce((a, b) => a + b, 0)
  });
}

const sha = crypto.createHash('sha256').update(fs.readFileSync(SPECIMEN)).digest('hex').toUpperCase();
const doc = {
  artifact: 'probe_specimen_section_map.json',
  work_order: 'PHASE5-001I-A',
  created_utc: new Date().toISOString().slice(0, 10),
  purpose: 'per-page structural map of the pinned presentation: heading presence and contract row-label occurrences, with no value and no report content recorded',
  specimen_artifact_id: 'LEG-CONSUMER-EQ-CA',
  specimen_sha256_expected: SPECIMEN_SHA256,
  specimen_sha256_measured: sha,
  specimen_digest_matches_pin: sha === SPECIMEN_SHA256,
  extraction_method: 'pdftotext (poppler) -f <page> -l <page> -layout <file> -',
  page_count: PAGE_COUNT,
  row_labels: ROW_LABELS,
  pages,
  pages_printing_the_collections_heading: pages.filter((p) => p.prints_collections_heading).map((p) => p.page),
  pages_printing_any_contract_row_label: pages.filter((p) => p.row_label_total > 0).map((p) => p.page),
  created_by: 'PHASE5-001I-A'
};
fs.writeFileSync(path.join(__dirname, 'probe_specimen_section_map.json'), JSON.stringify(doc, null, 2) + '\n', 'utf8');

for (const p of pages) {
  const labels = Object.keys(p.row_label_occurrences).map((k) => `${k}×${p.row_label_occurrences[k]}`).join(', ');
  console.log(`page ${String(p.page).padStart(2)}: chars=${String(p.chars).padStart(5)} lines=${String(p.line_count).padStart(3)} collections_heading=${p.prints_collections_heading ? 'Y' : 'n'} labels=${labels || '-'}`);
}
console.log(`specimen digest matches pin: ${doc.specimen_digest_matches_pin}`);
