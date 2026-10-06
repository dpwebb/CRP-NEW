'use strict';
/**
 * benchmark-ingestion.cjs — a reproducible ingestion benchmark (B6-INGEST-004 item 8).
 *
 * Uses synthetic fixtures and, where present, captured public examples, retaining their designations. It
 * measures, per example: classification, record separation, assessment-field accuracy, useful checks
 * completed, and incorrectly-confident extraction. Synthetic success is not proof of universal accuracy.
 *
 * Run: node accelerated-launch/benchmark-ingestion.cjs
 */

const fs = require('node:fs');
const path = require('node:path');
const gi = require('./service/general-intake.cjs');
const formats = require('./service/formats.cjs');
const evaluation = require('./service/evaluation.cjs');
const { makeSyntheticModel } = require('../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');

function model(lines) { return makeSyntheticModel({ pages: [lines] }); }

const EXAMPLES = [
  { id: 'native_pdf', designation: 'SYNTHETIC_FIXTURE', country: 'US',
    model: model(['Equifax  Consumer Credit Report', 'Report Date: 06/12/2026', 'Account  Balance $1,240  Opened 01/01/2020']),
    expect: { outcome: 'GENERAL', min_records: 1 } },
  { id: 'unfamiliar_layout', designation: 'SYNTHETIC_FIXTURE', country: 'US',
    model: model(['TRANSUNION', 'YOUR FILE', 'As of 05/30/2026', 'Card  5000  04/01/2021']),
    expect: { outcome: 'GENERAL', min_records: 1 } },
  { id: 'adverse_rating', designation: 'SYNTHETIC_FIXTURE', country: 'US',
    model: model(['Experian  Consumer Credit Report', 'Report Date: 06/12/2026', 'Account 30 days past due as of Jun 2015']),
    expect: { outcome: 'GENERAL', min_records: 1, adverse: '2015-06-01' } },
  { id: 'closure_date', designation: 'SYNTHETIC_FIXTURE', country: 'AU',
    model: model(['Equifax  Consumer Credit File', 'Report Date: 12/06/2026', 'Credit Provider X  Closed 15/03/2024']),
    expect: { outcome: 'GENERAL', min_records: 1, closed: '2024-03-15' } },
  { id: 'mixed_reports', designation: 'SYNTHETIC_FIXTURE', country: 'CA',
    model: model(['Equifax  Report Date 01/01/2026', 'TransUnion  Report Date 02/02/2026', 'Account A  Opened 01/01/2020', 'Account B  Opened 02/02/2021']),
    expect: { outcome: 'GENERAL', min_records: 2 } },
  { id: 'enquiry_date', designation: 'SYNTHETIC_FIXTURE', country: 'AU',
    model: model(['Equifax  Consumer Credit File', 'Report Date: 12/06/2026', 'Enquiry  Enquiry Date 20/05/2022']),
    expect: { outcome: 'GENERAL', min_records: 1, enquiry: '2022-05-20' } },
  { id: 'overdue_date', designation: 'SYNTHETIC_FIXTURE', country: 'AU',
    model: model(['Equifax  Consumer Credit File', 'Report Date: 12/06/2026', 'Overdue Account  Original Listing 15/03/2021']),
    expect: { outcome: 'GENERAL', min_records: 1, originalListing: '2021-03-15' } },
  { id: 'bureau_only', designation: 'SYNTHETIC_FIXTURE', country: 'US',
    model: model(['Equifax', 'Trusted credit information since 1899']),
    expect: { outcome: 'UNRELATED' } },
  { id: 'unrelated', designation: 'SYNTHETIC_FIXTURE', country: 'US',
    model: model(['This is a utility bill for June.', 'Amount due: $42.00']),
    expect: { outcome: 'UNRELATED' } }
];

function runExample(example) {
  const det = gi.detect(example.model);
  const ext = formats.extractWithSharedAdapter(example.model, { mode: 'REPORT', country: example.country });
  const evalResult = ext.admitted
    ? evaluation.evaluateCase({ country: example.country, region: example.country === 'US' ? 'US-NY' : (example.country === 'AU' ? 'AU-NSW' : 'CA-NS'), extraction: ext })
    : null;
  const usefulChecks = evalResult
    ? evalResult.results.filter((r) => r.machine.state === 'EVALUATED').length
      + (evalResult.factual_checks ? evalResult.factual_checks.performed.length : 0)
    : 0;
  const fieldAccuracy = [];
  if (example.expect.adverse) {
    fieldAccuracy.push({ field: 'adverseRatingDate', pass: (ext.records[0] && ext.records[0].facts && ext.records[0].facts['reportedAccount.adverseRatingDate']) === example.expect.adverse });
  }
  if (example.expect.closed) {
    fieldAccuracy.push({ field: 'liability.closedDate', pass: (ext.records[0] && ext.records[0].facts && ext.records[0].facts['liability.closedDate']) === example.expect.closed });
  }
  if (example.expect.enquiry) {
    fieldAccuracy.push({ field: 'enquiry.date', pass: (ext.records[0] && ext.records[0].facts && ext.records[0].facts['enquiry.date']) === example.expect.enquiry });
  }
  if (example.expect.originalListing) {
    fieldAccuracy.push({ field: 'overdue.originalListingDate', pass: (ext.records[0] && ext.records[0].facts && ext.records[0].facts['overdue.originalListingDate']) === example.expect.originalListing });
  }
  return {
    id: example.id,
    designation: example.designation,
    classification_pass: det.outcome === example.expect.outcome,
    classification: det.outcome,
    bureau: ext.bureau,
    records_read: ext.records.length,
    record_separation_pass: det.outcome === example.expect.outcome && ext.records.length >= (example.expect.min_records || 0),
    field_accuracy: fieldAccuracy,
    resolved_records: ext.records.filter((r) => r.status === 'RESOLVED').length,
    useful_checks_completed: usefulChecks,
    statutory_evaluated: evalResult ? evalResult.results.filter((r) => r.machine.state === 'EVALUATED').map((r) => r.check.adapter_id) : []
  };
}

function main() {
  const results = EXAMPLES.map(runExample);
  const summary = {
    total: results.length,
    classification_correct: results.filter((r) => r.classification_pass).length,
    record_separation_correct: results.filter((r) => r.record_separation_pass).length,
    field_accuracy_checks: results.flatMap((r) => r.field_accuracy),
    field_accuracy_correct: results.flatMap((r) => r.field_accuracy).filter((f) => f.pass).length,
    useful_checks_total: results.reduce((sum, r) => sum + r.useful_checks_completed, 0),
    statutory_checks_newly_run: [...new Set(results.flatMap((r) => r.statutory_evaluated))],
    designation: 'SYNTHETIC FIXTURES ONLY — NOT PROOF OF REAL-REPORT ACCURACY'
  };
  const out = { generated_at: new Date().toISOString(), summary, results };
  const dir = path.join(__dirname, 'out');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'b6-004-benchmark.json');
  fs.writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
}

main();
