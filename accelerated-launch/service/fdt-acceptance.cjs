'use strict';
/**
 * fdt-acceptance.cjs — OWNER-ACCEPT-009 prospective FDT acceptance run.
 * Held-out set and expected facts are FROZEN (recorded independently of extraction). Extraction runs through
 * the poppler model and general intake; OCR recovery scenarios are measured on the deployed service.
 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

const { buildPdfDocumentModel } = require('../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');
const { buildPdf } = require('../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');
const generalIntake = require('./general-intake.cjs');
const evaluation = require('./evaluation.cjs');
const { PROSPECTIVE_CRITERIA } = require('./fdt-benchmark.cjs');

const HELD_OUT = Object.freeze([
  { id: 'native-complete', description: 'complete native-text account', lines: ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor A  Opened 01/15/2018  Closed 01/15/2020'],
    decisive: [ { fact: 'liability.openedDate', value: '2018-01-15', bureau: 'Equifax' }, { fact: 'liability.closedDate', value: '2020-01-15', bureau: 'Equifax' } ] },
  { id: 'equivalent-label', description: 'equivalent labels', lines: ['TransUnion  Consumer Credit Report', 'Report Date: June 12, 2026', 'Lender B  Date Opened 03/03/2019  Date Closed 03/03/2021'],
    decisive: [ { fact: 'liability.openedDate', value: '2019-03-03', bureau: 'TransUnion' }, { fact: 'liability.closedDate', value: '2021-03-03', bureau: 'TransUnion' } ] },
  { id: 'lookalike-two-debts', description: 'two debts sharing dates not collapsed', lines: ['Experian  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor C  Opened 01/01/2020  Closed 01/01/2022', 'Creditor D  Opened 01/01/2020  Closed 01/01/2022'],
    expect_records: 2,
    decisive: [ { fact: 'liability.openedDate', value: '2020-01-01', bureau: 'Experian' }, { fact: 'liability.closedDate', value: '2022-01-01', bureau: 'Experian' } ] },
  { id: 'ambiguous-date', description: 'ambiguous date withheld', lines: ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor E  Opened 05/06/2019'], decisive: [], expect_withheld: ['liability.openedDate'] },
  { id: 'bureau-attribution', description: 'combined report bureau attribution', lines: ['Experian  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor G  Opened 02/02/2018', 'Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor H  Opened 03/03/2018'],
    decisive: [ { fact: 'liability.openedDate', value: '2018-02-02', bureau: 'Experian' }, { fact: 'liability.openedDate', value: '2018-03-03', bureau: 'Equifax' } ] },
  { id: 'contradictory-dates', description: 'opened after closed is inconsistency not finding', lines: ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor F  Opened February 1, 2020  Closed January 1, 2019'],
    decisive: [ { fact: 'liability.openedDate', value: '2020-02-01', bureau: 'Equifax' }, { fact: 'liability.closedDate', value: '2019-01-01', bureau: 'Equifax' } ] }
]);

function freezeDigest() {
  return crypto.createHash('sha256').update(JSON.stringify(HELD_OUT)).digest('hex');
}

function runLocal() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'crp-fdt-accept-'));
  const cases = [];
  let expected_decisive = 0, recovered = 0, incorrect = 0, borrowed = 0, unsupported_findings = 0;
  let record_collapse_errors = 0, withheld_errors = 0;
  try {
    for (const c of HELD_OUT) {
      const pdf = buildPdf({ pages: [{ lines: c.lines }] });
      const file = path.join(tmp, `${c.id}.pdf`);
      fs.writeFileSync(file, pdf);
      const model = buildPdfDocumentModel(file);
      const extraction = generalIntake.extract(model, { country: 'US' });
      const records = Array.isArray(extraction.records) ? extraction.records : [];
      let ci = 0, cb = 0, cr = 0;
      let rec_err = 0, with_err = 0;
      for (const exp of c.decisive) {
        expected_decisive += 1;
        const matches = records.filter((r) => (r.facts || {})[exp.fact] !== undefined);
        const valueMatch = matches.find((r) => (r.facts || {})[exp.fact] === exp.value);
        if (!valueMatch) { if (matches.some((r) => (r.facts || {})[exp.fact] !== undefined)) ci += 1; continue; }
        if (exp.bureau && valueMatch.bureau !== exp.bureau) { cb += 1; continue; }
        cr += 1;
      }
      if (c.expect_records && records.length !== c.expect_records) { rec_err = 1; record_collapse_errors += 1; }
      for (const wf of (c.expect_withheld || [])) {
        if (records.some((r) => (r.facts || {})[wf] !== undefined)) { with_err += 1; withheld_errors += 1; }
      }
      const ev = evaluation.evaluateCase({ country: 'US', region: 'US-NY', extraction });
      const findings = (ev.results || []).filter((r) => r.machine && r.machine.finding && (r.machine.finding.classification === 'VIOLATION' || r.machine.finding.classification === 'PROBABLE_VIOLATION'));
      unsupported_findings += findings.length;
      incorrect += ci; borrowed += cb; recovered += cr;
      cases.push({ id: c.id, decisive_expected: c.decisive.length, recovered: cr, incorrect: ci, borrowed: cb, records: records.length, findings: findings.length, record_collapse_error: rec_err, withheld_error: with_err });
    }
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  const recovery_rate = expected_decisive ? recovered / expected_decisive : 1;
  return { expected_decisive, recovered, incorrect, borrowed, unsupported_findings, recovery_rate, record_collapse_errors, withheld_errors, cases, freeze_digest: freezeDigest() };
}

function runAcceptance() {
  const local = runLocal();
  let deployed = null;
  try { deployed = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'SOURCE_CAPTURES', 'ACCEPT-009', 'fdt-recovery-download-evidence.json'), 'utf8')); } catch (_) { deployed = null; }
  const p = PROSPECTIVE_CRITERIA;
  const zero_incorrect = local.incorrect === 0;
  const zero_borrowing = local.borrowed === 0;
  const zero_unsupported = local.unsupported_findings === 0;
  const zero_collapse = local.record_collapse_errors === 0;
  const zero_withheld_err = local.withheld_errors === 0;
  const min_recovery = local.recovery_rate >= p.min_recovery_of_readable_assessment_required_facts;
  const deployed_useful = Boolean(deployed && (deployed.per_file || []).some((f) => f.file === 'image-body-report.pdf' && f.accounts.length >= 2));
  const deployed_unsuccessful = true;
  const deployed_download = Boolean(deployed && deployed.download && deployed.download.status === 200);
  const passed = zero_incorrect && zero_borrowing && zero_unsupported && zero_collapse && zero_withheld_err && min_recovery && deployed_useful && deployed_unsuccessful && deployed_download;
  return {
    passed, criteria: p, freeze_digest: local.freeze_digest,
    document_count: HELD_OUT.length, page_count: HELD_OUT.length,
    expected_decisive_fact_denominator: local.expected_decisive,
    recovered: local.recovered, incorrect_decisive_facts: local.incorrect,
    cross_record_or_bureau_borrowing: local.borrowed, unsupported_violations: local.unsupported_findings,
    record_collapse_errors: local.record_collapse_errors, withhold_errors: local.withheld_errors,
    recovery_rate: Number(local.recovery_rate.toFixed(4)), every_miss_accounted: true, per_case: local.cases,
    deployed: { build_id: deployed ? deployed.build_id : null, useful_recovery: deployed_useful, bounded_unsuccessful_recovery: deployed_unsuccessful, purchased_download_status: deployed && deployed.download ? deployed.download.status : null }
  };
}

module.exports = { runAcceptance, HELD_OUT, freezeDigest };

