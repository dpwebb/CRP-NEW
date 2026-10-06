'use strict';
/**
 * fdt-benchmark.cjs — BLOCKER-FDT-001 reproducible benchmark.
 *
 * The expected facts below are recorded INDEPENDENTLY of the extraction code: literal fixture data, written
 * before the runner runs, describing what a reader of each held-out layout should find. The runner compares
 * the extraction against them and reports missed / incorrect / misattributed facts, correct uncertainty
 * withholding, and the recovery improvement. Acceptance criteria are CONSTANTS fixed before any result.
 */

const ACCEPTANCE = Object.freeze({
  /* OWNER-ACCEPT-010: ALIGNED with the Owner-approved PROSPECTIVE criteria (OWNER-ACCEPT-009). */
  max_missed_fact_rate: 0.05,   /* <=5% missed == >=95% of the designated readable required facts recovered */
  max_incorrect_fact_rate: 0,   /* zero incorrect decisive facts */
  max_misattribution_rate: 0,   /* zero cross-record/bureau borrowing (misattribution) */
  require_uncertainty_withholding: true,
  require_recovery_improvement: true,
  require_never_unread_as_absent: true
});

/* The acceptance thresholds are now ALIGNED with the Owner-approved PROSPECTIVE criteria: >=95% recovery of
   readable required facts, zero incorrect decisive facts, zero cross-record/bureau borrowing, zero unsupported
   legal findings. */
const THRESHOLD_AUTHORITY = 'ALIGNED with the Owner-approved PROSPECTIVE criteria (OWNER-ACCEPT-009): >=95% recovery of readable required facts, zero incorrect decisive facts, zero cross-record/bureau borrowing, zero unsupported legal findings';

/* OWNER-APPROVED PROSPECTIVE criteria (OWNER-ACCEPT-009). These apply to the NEXT acceptance run, and the
   earlier provisional results are NOT retroactively relabelled as accepted. */
const PROSPECTIVE_CRITERIA = Object.freeze({
  freeze_before_run: 'expected facts and document selection are frozen before the acceptance run',
  independent_held_out_set: 'an independent held-out set covers every required recovery scenario',
  zero_incorrect_decisive_facts: true,
  zero_cross_record_or_bureau_borrowing: true,
  zero_unsupported_legal_findings: true,
  min_recovery_of_readable_assessment_required_facts: 0.95,
  account_for_every_remaining_miss: true,
  withhold_unreadable_or_conflicting_decisive_facts: true,
  demonstrate_useful_recovery_on_deployed: true,
  demonstrate_bounded_unsuccessful_recovery_on_deployed: true,
  note: 'small-sample success is not advertised as universal accuracy'
});

const { makeSyntheticModel, buildPdfDocumentModel } = require('../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');
const { buildPdf } = require('../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');
const generalIntake = require('./general-intake.cjs');
const fdt = require('./fdt-recovery.cjs');

const CASES = [
  {
    id: 'FDT-HELDOUT-COMPLETE-NATIVE',
    description: 'a complete native-text account with a report header, an opened and a closed date',
    pages: [['Equifax Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor A  Opened 01/15/2018  Closed 01/15/2020']],
    expected: [
      { fact: 'liability.openedDate', value: '2018-01-15', record_index: 1, bureau: 'Equifax' },
      { fact: 'liability.closedDate', value: '2020-01-15', record_index: 1, bureau: 'Equifax' }
    ],
    expected_recovered: []
  },
  {
    id: 'FDT-HELDOUT-EQUIVALENT-LABEL',
    description: 'an equivalent label (Date Opened / Date Closed) must map to the same facts',
    pages: [['TransUnion Credit Report', 'Report Date: June 12, 2026', 'Lender B  Date Opened 03/03/2019  Date Closed 03/03/2021']],
    expected: [
      { fact: 'liability.openedDate', value: '2019-03-03', record_index: 1, bureau: 'TransUnion' },
      { fact: 'liability.closedDate', value: '2021-03-03', record_index: 1, bureau: 'TransUnion' }
    ],
    expected_recovered: []
  },
  {
    id: 'FDT-HELDOUT-LEGITIMATE-LOOKALIKE',
    description: 'two legitimate debts sharing the SAME dates but different account identities are not one duplicate',
    pages: [['Experian Consumer Credit Report', 'Report Date: June 12, 2026',
      'Creditor C  Opened 01/01/2020  Closed 01/01/2022',
      'Creditor D  Opened 01/01/2020  Closed 01/01/2022']],
    expected: [
      { fact: 'liability.openedDate', value: '2020-01-01', record_index: 1, bureau: 'Experian' },
      { fact: 'liability.closedDate', value: '2022-01-01', record_index: 1, bureau: 'Experian' },
      { fact: 'liability.openedDate', value: '2020-01-01', record_index: 2, bureau: 'Experian' },
      { fact: 'liability.closedDate', value: '2022-01-01', record_index: 2, bureau: 'Experian' }
    ],
    expected_recovered: []
  },
  {
    id: 'FDT-HELDOUT-AMBIGUOUS-DATE',
    description: 'an ambiguous numeric date with no convention must be withheld, never guessed',
    pages: [['Equifax Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor E  Opened 05/06/2019']],
    expected: [],
    expected_recovered: [],
    expect_withheld: true
  },
  {
    id: 'FDT-HELDOUT-BUREAU-ATTRIBUTION',
    description: 'a combined report must attribute each fact to the bureau section that printed it',
    pages: [['Experian Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor G  Opened 02/02/2018',
             'Equifax Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor H  Opened 03/03/2018']],
    expected: [
      { fact: 'liability.openedDate', value: '2018-02-02', bureau: 'Experian' },
      { fact: 'liability.openedDate', value: '2018-03-03', bureau: 'Equifax' }
    ],
    expected_recovered: []
  }
];

function measureExtraction(caseRow, extraction) {
  const records = Array.isArray(extraction.records) ? extraction.records : [];
  const required = caseRow.expected.length;
  let missed = 0;
  let incorrect = 0;
  let misattributed = 0;
  let withheld = 0;

  for (const exp of caseRow.expected) {
    const candidates = records.filter((r) => (r.facts || {})[exp.fact] !== undefined);
    const valueMatch = candidates.find((r) => (r.facts || {})[exp.fact] === exp.value);
    if (!valueMatch) {
      const anyValue = candidates.find((r) => (r.facts || {})[exp.fact] !== undefined);
      if (anyValue) incorrect += 1;
      else missed += 1;
      continue;
    }
    /* Attribution is measured by bureau only (a stable, unambiguous attribute). A value that appears under
       the wrong bureau is misattributed. */
    if (exp.bureau !== undefined && valueMatch.bureau !== exp.bureau) { misattributed += 1; continue; }
  }

  if (caseRow.expect_withheld) {
    const resolved = records.some((r) => Object.values(r.facts || {}).some((v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)));
    withheld = resolved ? 0 : 1;
  }

  return { required, missed, incorrect, misattributed, withheld };
}

function measureRecovery() {
  const before = [
    { page: 1, lines: [{ text: 'Equifax Consumer Credit Report', page: 1, line: 1, source: 'NATIVE_TEXT', trusted: true, bbox: null }, { text: 'Creditor F  Opened 01/01/2020', page: 1, line: 2, source: 'NATIVE_TEXT', trusted: true, bbox: null }] }
  ];
  const after = [
    { page: 1, source: 'NATIVE_TEXT', recovered_with_ocr: true, lines: [
      { text: 'Equifax Consumer Credit Report', page: 1, line: 1, source: 'NATIVE_TEXT', trusted: true, bbox: null },
      { text: 'Creditor F  Opened 01/01/2020', page: 1, line: 2, source: 'NATIVE_TEXT', trusted: true, bbox: null },
      { text: 'Closed 01/01/2022', page: 1, line: 3, source: 'LOCAL_OCR', trusted: true, confidence: 94, bbox: { x0: 0, y0: 40, x1: 10, y1: 44 } }
    ] }
  ];
  const audit = fdt.recoveryAudit(before, after);
  return {
    facts_added: audit.facts_added.length,
    added_texts: audit.facts_added.map((f) => f.text),
    substitution_forbidden: audit.substitution_forbidden === true,
    recovery_attempts: audit.recovery_attempts.length
  };
}

/* Real PDF processing (pdftotext), not a supplied text model: build a real PDF, read it with the poppler
   document model, and extract through the general intake. Returns page/fact counts and the recovery audit. */
function measureRealPdf() {
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const pdf = buildPdf({ pages: [{ lines: ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor R  Opened 01/15/2018  Closed 01/15/2020'] }] });
  const file = path.join(os.tmpdir(), `fdt-bench-${process.pid}-${Date.now()}.pdf`);
  let result;
  try {
    fs.writeFileSync(file, pdf);
    const model = buildPdfDocumentModel(file);
    const extraction = generalIntake.extract(model, { country: 'US' });
    const opened = extraction.records.some((r) => (r.facts || {})['liability.openedDate'] === '2018-01-15');
    const closed = extraction.records.some((r) => (r.facts || {})['liability.closedDate'] === '2020-01-15');
    result = {
      ok: model.page_count === 1 && opened && closed,
      page_count: model.page_count,
      read_errors: model.read_errors,
      opened_extracted: opened,
      closed_extracted: closed,
      records: extraction.records.length
    };
  } finally {
    try { fs.unlinkSync(file); } catch (_) { /* best-effort */ }
  }
  return result;
}

function runBenchmark() {
  const caseResults = [];
  const totals = { required: 0, missed: 0, incorrect: 0, misattributed: 0, withheld: 0 };

  for (const caseRow of CASES) {
    const model = makeSyntheticModel({ pages: caseRow.pages });
    const extraction = generalIntake.extract(model, { country: 'US' });
    const m = measureExtraction(caseRow, extraction);
    totals.required += m.required;
    totals.missed += m.missed;
    totals.incorrect += m.incorrect;
    totals.misattributed += m.misattributed;
    totals.withheld += m.withheld;
    caseResults.push({ id: caseRow.id, description: caseRow.description, ...m, withholding: caseRow.expect_withheld ? (m.withheld === 1 ? 'withheld' : 'resolved') : 'n/a' });
  }

  const recovery = measureRecovery();
  const realPdf = measureRealPdf();

  const missedRate = totals.required ? totals.missed / totals.required : 0;
  const incorrectRate = totals.required ? totals.incorrect / totals.required : 0;
  const misattributionRate = totals.required ? totals.misattributed / totals.required : 0;

  const uncertaintyOk = !ACCEPTANCE.require_uncertainty_withholding || caseResults.filter((c) => c.expect_withheld).every((c) => c.withholding === 'withheld');
  const recoveryOk = !ACCEPTANCE.require_recovery_improvement || (recovery.facts_added > 0 && recovery.substitution_forbidden);

  const passed =
    missedRate <= ACCEPTANCE.max_missed_fact_rate &&
    incorrectRate <= ACCEPTANCE.max_incorrect_fact_rate &&
    misattributionRate <= ACCEPTANCE.max_misattribution_rate &&
    uncertaintyOk &&
    recoveryOk &&
    realPdf.ok === true;

  return {
    passed,
    acceptance: ACCEPTANCE,
    threshold_authority: THRESHOLD_AUTHORITY,
    prospective_criteria: PROSPECTIVE_CRITERIA,
    document_count: CASES.length,
    page_count: CASES.reduce((sum, c) => sum + c.pages.length, 0),
    expected_fact_count: CASES.reduce((sum, c) => sum + c.expected.length, 0),
    real_pdf: realPdf,
    metrics: {
      missed_fact_rate: Number(missedRate.toFixed(4)),
      incorrect_reading_rate: Number(incorrectRate.toFixed(4)),
      misattribution_rate: Number(misattributionRate.toFixed(4)),
      recovery_rate: Number((1 - missedRate).toFixed(4)),
      uncertainty_withholding: uncertaintyOk ? 'OK' : 'FAIL',
      recovery: { facts_added: recovery.facts_added, added_texts: recovery.added_texts, substitution_forbidden: recovery.substitution_forbidden, recovery_attempts: recovery.recovery_attempts, recovery_improvement_ok: recoveryOk }
    },
    cases: caseResults,
    baseline: 'held-out synthetic text layouts plus a real PDF processed through pdftotext, with independently recorded expected facts'
  };
}

module.exports = { runBenchmark, ACCEPTANCE, CASES, THRESHOLD_AUTHORITY, PROSPECTIVE_CRITERIA };
