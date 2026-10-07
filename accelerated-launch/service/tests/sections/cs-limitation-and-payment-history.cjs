'use strict';
/**
 * cs-limitation-and-payment-history.cjs — BLOCKER-REPORT-DATA-TO-ISSUE-001 (Batch 31): the two new shared
 * mechanisms and their controls.
 *
 *   • COURT-ENFORCEMENT LIMITATION — the dates the report prints, against the limitation statute recorded for
 *     the consumer's own jurisdiction. Positive, boundary, missing-date, non-adverse, unknown-jurisdiction and
 *     account-isolation controls, plus the reference-date handling.
 *   • PAYMENT-HISTORY ANALYSIS — three analyses over one account's own rows, ratings, amounts, narratives and
 *     legends, each with the benign explanation that defeats it.
 *
 * Everything synthetic here is labelled as such; the real-report evidence lives in `cr-ca-ns-tu-real-report`.
 * No statutory provision is satisfied or breached by any assertion in this file: every positive is a POTENTIAL
 * verification item and the assertions check exactly that.
 */

const crypto = require('node:crypto');
const limitation = require('../../limitation-assessment.cjs');
const assessmentClock = require('../../assessment-clock.cjs');
/* OWNER correction (SOL assessment date): every engine call is given a CONTROLLED assessment-run stamp; the
   printed report date is carried separately and is never the operative date. */
function clockAt(date, iso) { return assessmentClock.runStamp(iso || (date + 'T15:00:00Z')); }
const paymentHistory = require('../../payment-history-analysis.cjs');
const issues = require('../../issues.cjs');

/** A synthetic TransUnion Canada account block: only the fields a control needs are varied. */
function tuBlock(opts) {
  const o = opts || {};
  const left = (label, value) => `${label.padEnd(30)}${value || ''}`;
  const right = (label, value) => `${' '.repeat(46)}${label}${value ? ` ${value}` : ''}`;
  const lines = [
    'Creditor Name',
    `${o.creditor || 'SYNTHETIC CREDITOR'}${' '.repeat(Math.max(1, 108 - String(o.creditor || 'SYNTHETIC CREDITOR').length))}Payment History`,
    `${left('Reported Date', o.reported || 'Oct 31, 2025')}${right('Last Payment Date', o.lastPayment || '')} Terms:          522/M           30    60   90     #M`,
    `${left('Opened Date', o.opened || 'Sep 03, 2005')}${right('Posted Date', o.posted || 'Nov 02, 2025')}                                  0     0    0      26`,
    `${left('Closed Date', o.closed || '')}${right('Charge Off Date', o.chargeOff || '')} Account         ${o.type || 'INSTALLMENT'} / INDIVIDUAL`,
    `${left('First Delinquency Date', o.firstDelinquency || '')}${right('Balloon Payment Date', '')}Type:`,
    `${' '.repeat(114)}Balloon${' '.repeat(20)}Narrative`,
    '   Date       Balance      Payment        Past Due        MOP           Terms      High Credit Credit Limit                       Charge Off',
    `${' '.repeat(114)}Payment${' '.repeat(23)}1/2`
  ];
  const region = lines.map((text, index) => ({ page: 1, line: index + 1, text }));
  const table = require('../../format-families/tu-ca-consumer.cjs').tableColumns(region);
  const edge = (key) => table.columns.find((column) => column.key === key).edge;
  const place = (cells) => {
    const sorted = cells.slice().sort((a, b) => a.end - b.end);
    let row = '';
    for (const cell of sorted) {
      const start = cell.end - String(cell.value).length;
      if (row.length < start) row += ' '.repeat(start - row.length);
      row += String(cell.value);
    }
    return row;
  };
  const rows = (o.months || [{ period: 'Oct 2025', mop: '9', narrative: 'WO / CG', payment: '0' }]).map((m) => place([
    { end: 10, value: m.period },
    { end: edge('balance'), value: m.balance === undefined ? '248' : m.balance },
    { end: edge('payment'), value: m.payment === undefined ? '0' : m.payment },
    { end: edge('past_due'), value: m.pastDue === undefined ? '248' : m.pastDue },
    { end: edge('mop'), value: m.mop },
    { end: edge('narrative'), value: m.narrative }
  ]));
  const out = lines.concat(rows);
  /* The report's own manner-of-payment legend, printed under its own heading, exactly as the report prints it:
     a rating code means ONLY what this legend says it means, so a fixture without it has no rating meanings. */
  const mop = o.mopLegend === null ? null : (o.mopLegend || {
    9: 'Bad debt, placed for collection; skip',
    5: 'Pays (or paid) 120+ days from billing',
    4: 'Pays (or paid) 90-119 days from billing',
    3: 'Pays (or paid) 60-89 days from billing',
    2: 'Pays (or paid) 30-59 days from billing',
    1: 'Pays (or paid) within 30 days of billing pays account as agreed'
  });
  if (mop) {
    out.push('USUAL MANNER OF PAYMENT');
    for (const code of Object.keys(mop)) out.push(`${code} - ${mop[code]}`);
  }
  if (o.legend !== null) out.push(`Legend:    ${o.legend || 'CG-Account cancelled by credit grantor with derogatory rating, WO-Bad debt write-off'}\r`);
  return out;
}

/** The reader's own extraction of one synthetic block, shaped as the service shapes a record set. */
function extractionOf(blocks, reference) {
  const tuFamily = require('../../format-families/tu-ca-consumer.cjs');
  const { SUPPORT } = require('../../formats.cjs');
  const { makeSyntheticModel } = require('../../../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');
  const pages = [['Account(s)']];
  for (const block of blocks) pages[0] = pages[0].concat(block);
  const model = makeSyntheticModel({ pages, page_count: 1, page_size: { width_pt: 612, height_pt: 792, label: 'letter' } });
  const x = tuFamily.extract(model, { state: 'SYNTHETIC_STRUCTURAL_TEST_INPUT_NOT_A_REPORT', admitted: true, refusal_reason: null, fact_status: null, presentation_evidence: false });
  /* The family extraction is wrapped exactly as the shared adapter wraps a real one, so the production
     assessment chain runs over it. The INPUT is synthetic structural test text and is labelled as such; nothing
     about the assertions below depends on that label, only on the reader's own readings of the printed lines. */
  const extraction = Object.assign({}, x, {
    family_id: tuFamily.FAMILY_ID,
    presentation_id: tuFamily.FAMILY_ID,
    support: SUPPORT.ACTUAL_REPORT_EVIDENCE,
    extraction_ran: true,
    admission: { state: 'SYNTHETIC_STRUCTURAL_TEST_INPUT_NOT_A_REPORT', admitted: true, refusal_reason: null },
    reference_date: { normalized_value: reference || '2026-01-10' }
  });
  for (const record of extraction.records) {
    record.source_bureau = 'TransUnion';
    record.source_report_reference_date = reference || '2026-01-10';
  }
  return extraction;
}

/** An adverse synthetic account: a bad-debt rating month and a write-off narrative, per the report's own legend. */
function adverseBlock(overrides) {
  return tuBlock(Object.assign({
    creditor: 'SYNTHETIC ADVERSE',
    legend: 'CG-Account cancelled by credit grantor with derogatory rating, WO-Bad debt write-off, AC-Account closed/rating non derogatory',
    months: [
      { period: 'Jul 2024', mop: '9', narrative: 'WO / CG', payment: '0', balance: '248', pastDue: '248' },
      { period: 'Jan 2024', mop: '2', narrative: '', payment: '50', balance: '168', pastDue: '10' }
    ]
  }, overrides || {}));
}

/** A satisfactory synthetic account: no adverse rating, zero balance, closed without a derogatory rating. */
function satisfactoryBlock(overrides) {
  return tuBlock(Object.assign({
    creditor: 'SYNTHETIC SATISFACTORY',
    closed: 'Oct 31, 2013',
    legend: 'AC-Account closed/rating non derogatory',
    months: [{ period: 'Oct 2013', mop: '1', narrative: 'AC /', payment: '0', balance: '0', pastDue: '0' }]
  }, overrides || {}));
}

/* ---------------------------------------------------------------- the court-limitation controls */

function runLimitationControls(check, evidence) {
  /* 1. A jurisdiction whose limitation statute has not been read produces nothing, and says what is missing. */
  const ab = limitation.runLimitationAssessment({ country: 'CA', region: 'CA-AB', extraction: extractionOf([adverseBlock()]) });
  check.equal(ab.performed.length, 0, 'a jurisdiction without accepted parameters produces no assessment');
  check.equal(ab.withheld[0].reason, 'NO_RECORDED_LIMITATION_PARAMETERS', 'and records exactly what is missing');
  check.ok(/limitation statute for CA-AB/.test(ab.withheld[0].missing_prerequisite), 'naming the jurisdiction and the element it lacks');
  check.deepEqual(ab.recorded_jurisdictions, ['AU-ACT', 'AU-QLD', 'CA-BC', 'CA-MB', 'CA-NS', 'CA-NT', 'CA-NU', 'CA-ON', 'GB-ENG', 'GB-NIR', 'GB-WLS'],
    'the parameter set records only supported exact jurisdictions');
  const bc = limitation.runLimitationAssessment({ country: 'CA', region: 'CA-BC', assessment_clock: clockAt('2026-01-10'),
    extraction: extractionOf([adverseBlock({ lastPayment: 'Jan 09, 2024' })]) });
  check.equal(bc.summary.may_be_outside, 1, 'British Columbia old adverse entry opens a qualified verification concern');
  check.ok(/NOT_LEGAL_DISCOVERY/.test(bc.performed[0].start_date.selection_rule), 'the printed date does not establish BC discovery');
  check.ok(/demand obligation/.test(bc.performed[0].unknown_conditions.join(' ')), 'BC demand timing remains unresolved');
  const bcBoundary = limitation.runLimitationAssessment({ country: 'CA', region: 'CA-BC', assessment_clock: clockAt('2026-01-10'),
    extraction: extractionOf([adverseBlock({ lastPayment: 'Jan 10, 2024' })]) });
  check.equal(bcBoundary.summary.may_be_outside, 0, 'the BC anniversary does not trigger a concern');
  const bcBenign = limitation.runLimitationAssessment({ country: 'CA', region: 'CA-BC', assessment_clock: clockAt('2026-01-10'),
    extraction: extractionOf([satisfactoryBlock()]) });
  check.equal(bcBenign.performed.length, 0, 'a satisfactory BC account is not assessed as adverse');
  const nt = limitation.runLimitationAssessment({ country: 'CA', region: 'CA-NT', assessment_clock: clockAt('2026-10-06'),
    extraction: extractionOf([adverseBlock({ lastPayment: 'Oct 05, 2020' })]) });
  check.equal(nt.summary.may_be_outside, 1, 'Northwest Territories old adverse debt opens a qualified verification concern');
  check.ok(/NOT_LEGAL_ACCRUAL/.test(nt.performed[0].start_date.selection_rule), 'the printed date does not prove accrual');
  check.ok(/even if it would otherwise have been barred/.test(nt.performed[0].acknowledgment_rule.words),
    'the territory-specific later acknowledgment or payment rule is preserved');
  const ntBoundary = limitation.runLimitationAssessment({ country: 'CA', region: 'CA-NT', assessment_clock: clockAt('2026-10-06'),
    extraction: extractionOf([adverseBlock({ lastPayment: 'Oct 06, 2020' })]) });
  check.equal(ntBoundary.summary.may_be_outside, 0, 'the Northwest Territories anniversary stays inside the screening period');
  const nu = limitation.runLimitationAssessment({ country: 'CA', region: 'CA-NU', assessment_clock: clockAt('2026-10-06'),
    extraction: extractionOf([adverseBlock({ lastPayment: 'Oct 05, 2020' })]) });
  check.equal(nu.summary.may_be_outside, 1, 'Nunavut applies its own recorded six-year money-recovery provision');
  check.ok(/C\.S\.Nu\./.test(nu.jurisdiction.citation), 'its issue basis names the Nunavut consolidation');
  check.ok(/NOT_LEGAL_ACCRUAL/.test(nu.performed[0].start_date.selection_rule), 'the Nunavut report date does not prove accrual');
  const nuBoundary = limitation.runLimitationAssessment({ country: 'CA', region: 'CA-NU', assessment_clock: clockAt('2026-10-06'),
    extraction: extractionOf([adverseBlock({ lastPayment: 'Oct 06, 2020' })]) });
  check.equal(nuBoundary.summary.may_be_outside, 0, 'the Nunavut anniversary stays inside the screening period');
  const mb = limitation.runLimitationAssessment({ country: 'CA', region: 'CA-MB', assessment_clock: clockAt('2026-01-10'),
    extraction: extractionOf([adverseBlock({ lastPayment: 'Jan 09, 2024' })]) });
  check.equal(mb.summary.may_be_outside, 1, 'Manitoba old adverse entry opens a timing verification concern');
  check.equal(mb.performed[0].period_ends, '2026-01-09', 'the two-year screening comparison uses the printed date');
  check.ok(/NOT_LEGAL_DISCOVERY/.test(mb.performed[0].start_date.selection_rule), 'the printed date does not establish discovery');
  check.ok(/transition/.test(mb.performed[0].unknown_conditions.join(' ')), 'transition uncertainty remains explicit');
  check.ok(/demand obligation/.test(mb.performed[0].unknown_conditions.join(' ')), 'demand timing remains unresolved');
  const mbBoundary = limitation.runLimitationAssessment({ country: 'CA', region: 'CA-MB', assessment_clock: clockAt('2026-01-10'),
    extraction: extractionOf([adverseBlock({ lastPayment: 'Jan 10, 2024' })]) });
  check.equal(mbBoundary.summary.may_be_outside, 0, 'the Manitoba anniversary does not trigger a concern');
  const mbBenign = limitation.runLimitationAssessment({ country: 'CA', region: 'CA-MB', assessment_clock: clockAt('2026-01-10'),
    extraction: extractionOf([satisfactoryBlock()]) });
  check.equal(mbBenign.performed.length, 0, 'a satisfactory Manitoba account is not assessed as adverse');
  const on = limitation.runLimitationAssessment({ country: 'CA', region: 'CA-ON', assessment_clock: clockAt('2026-01-10'),
    extraction: extractionOf([adverseBlock({ lastPayment: 'Jan 09, 2024' })]) });
  check.equal(on.summary.may_be_outside, 1, 'Ontario old adverse entry opens a qualified verification concern');
  check.equal(on.performed[0].period_ends, '2026-01-09', 'the two-year screening comparison uses the printed date');
  check.ok(/NOT_LEGAL_DISCOVERY/.test(on.performed[0].start_date.selection_rule), 'and explicitly refuses to establish legal discovery');
  check.ok(/demand obligation/.test(on.performed[0].unknown_conditions.join(' ')), 'Ontario demand timing remains unresolved');
  const onBoundary = limitation.runLimitationAssessment({ country: 'CA', region: 'CA-ON', assessment_clock: clockAt('2026-01-10'),
    extraction: extractionOf([adverseBlock({ lastPayment: 'Jan 10, 2024' })]) });
  check.equal(onBoundary.summary.may_be_outside, 0, 'the second anniversary does not trigger a timing concern');
  const onBenign = limitation.runLimitationAssessment({ country: 'CA', region: 'CA-ON', assessment_clock: clockAt('2026-01-10'),
    extraction: extractionOf([satisfactoryBlock()]) });
  check.equal(onBenign.performed.length, 0, 'a satisfactory Ontario account is not assessed as adverse');

  /* 2. An adverse debt whose latest printed date is inside the period is not raised. */
  const inside = limitation.runLimitationAssessment({ country: 'CA', region: 'CA-NS', assessment_clock: clockAt('2026-01-10'), extraction: extractionOf([adverseBlock({ lastPayment: 'Mar 09, 2025' })]) });
  check.equal(inside.performed.length, 1, 'an adverse debt that prints a date is assessed');
  check.equal(inside.performed[0].outcome, 'WITHIN_THE_PERIOD', 'and stays inside the period when that date is recent');
  check.equal(inside.summary.may_be_outside, 0, 'so nothing is raised for it');

  /* 3. The boundary is decided in days: the anniversary is inside, one day more is outside. */
  const anniversary = limitation.runLimitationAssessment({ country: 'CA', region: 'CA-NS', assessment_clock: clockAt('2026-01-10'), extraction: extractionOf([adverseBlock({ lastPayment: 'Jan 10, 2024' })]) });
  check.equal(anniversary.performed[0].elapsed_days, 731, 'the report date is exactly two calendar years after the printed date');
  check.equal(anniversary.performed[0].period_ends, '2026-01-10', 'so the period ends on the report date itself');
  check.equal(anniversary.performed[0].outcome, 'WITHIN_THE_PERIOD', 'and exactly on the anniversary the period has not elapsed');
  const beyond = limitation.runLimitationAssessment({ country: 'CA', region: 'CA-NS', assessment_clock: clockAt('2026-01-10'), extraction: extractionOf([adverseBlock({ lastPayment: 'Jan 09, 2024' })]) });
  check.equal(beyond.performed[0].period_ends, '2026-01-09', 'one day earlier ends the period one day earlier');
  check.equal(beyond.performed[0].outcome, 'MAY_BE_OUTSIDE_THE_LIMITATION_PERIOD', 'and one day beyond that is outside the period');

  /* 4. An adverse debt that prints no usable date is withheld, never aged from a missing date. */
  const noDates = limitation.runLimitationAssessment({
    country: 'CA', region: 'CA-NS', assessment_clock: clockAt('2026-01-10'),
    extraction: extractionOf([adverseBlock({ lastPayment: '', firstDelinquency: '', chargeOff: '', months: [{ period: 'Oct 2025', mop: '9', narrative: 'WO / CG' }] })])
  });
  check.equal(noDates.performed.length, 0, 'an adverse debt with no printed start date is not aged');
  check.equal(noDates.withheld.filter((w) => w.reason === 'NO_PRINTED_START_DATE').length, 1, 'and is withheld for that exact reason');
  check.ok(/nothing was concluded from a missing date/.test(noDates.withheld[0].plain), 'naming the missing date rather than treating it as an absence');

  /* 5. A satisfactory old account is not adverse merely because it is old. */
  const old = limitation.runLimitationAssessment({ country: 'CA', region: 'CA-NS', assessment_clock: clockAt('2026-01-10'), extraction: extractionOf([satisfactoryBlock()]) });
  check.equal(old.performed.length, 0, 'an aged, zero-balance, non-derogatory account is not assessed');
  check.equal(old.withheld[0].reason, 'NO_PRINTED_OUTSTANDING_CLAIM', 'because the report prints no outstanding claim indicator');
  check.ok(!/non derogatory/i.test(String(old.withheld[0].plain)), 'and nothing about it is called adverse');

  /* 6. THE RUN DATE DECIDES, THE REPORT DATE DOES NOT: the same entry on the SAME printed report date is inside
     when the assessment runs earlier and outside when the same report is assessed later. */
  const early = limitation.runLimitationAssessment({ country: 'CA', region: 'CA-NS', assessment_clock: clockAt('2025-08-01'), extraction: extractionOf([adverseBlock({ lastPayment: 'Mar 09, 2025' })], '2019-05-01') });
  const later = limitation.runLimitationAssessment({ country: 'CA', region: 'CA-NS', assessment_clock: clockAt('2028-01-10'), extraction: extractionOf([adverseBlock({ lastPayment: 'Mar 09, 2025' })], '2019-05-01') });
  check.equal(early.performed[0].outcome, 'WITHIN_THE_PERIOD', 'the entry is inside the period when the report is assessed earlier');
  check.equal(later.performed[0].outcome, 'MAY_BE_OUTSIDE_THE_LIMITATION_PERIOD', 'and outside it when the SAME report is assessed later: the run date decides');
  check.equal(later.performed[0].assessment_date, '2028-01-10', 'the assessment date is the operative date');
  check.equal(later.performed[0].report_reference_date, '2019-05-01', 'while the printed report date is carried separately and untouched');
  check.equal(later.performed[0].at_report_date.outcome, 'WITHIN_THE_PERIOD', 'and the historical view at the report date is recorded, marked as not the operative answer');
  check.ok(/NOT_THE_OPERATIVE_ASSESSMENT/.test(String(later.performed[0].at_report_date.role)), 'with that role stated on it');
  check.equal(later.performed[0].report_age_days, 3176, 'and the age of the report at assessment is recorded');

  /* 7. The ASSESSMENT date is required; the report date is not. Without a run stamp nothing is counted, and the
     report date is never substituted for it. A missing REPORT date is not an obstacle. */
  const noClock = limitation.runLimitationAssessment({
    country: 'CA', region: 'CA-NS',
    extraction: extractionOf([adverseBlock({ lastPayment: 'Mar 09, 2020' })])
  });
  check.equal(noClock.performed.length, 0, 'without an assessment-run stamp nothing is counted');
  check.equal(noClock.withheld[0].reason, 'NO_ASSESSMENT_RUN_DATE', 'and it is withheld for that exact reason');
  check.ok(/The printed report date is not used for this/.test(String(noClock.withheld[0].plain)), 'saying plainly that the report date is never substituted');
  const withoutReportDate = extractionOf([adverseBlock({ lastPayment: 'Mar 09, 2020' })]);
  delete withoutReportDate.reference_date;
  for (const r of withoutReportDate.records) delete r.source_report_reference_date;
  const noReportDate = limitation.runLimitationAssessment({ country: 'CA', region: 'CA-NS', assessment_clock: clockAt('2026-01-10'), extraction: withoutReportDate });
  check.equal(noReportDate.performed.length, 1, 'a report that prints no date of its own is still assessed');
  check.equal(noReportDate.performed[0].assessment_date, '2026-01-10', 'because the run date is what decides');
  check.equal(noReportDate.performed[0].report_reference_date, null, 'with no report date recorded, because none is printed');
  check.ok(/This report was issued before the date shown above/.test(String(noReportDate.performed[0].uncertainty_since_report)), 'and the later-events uncertainty is carried on it');

  /* 8. Account isolation: only the adverse account is assessed, and it names its own record. */
  const mixed = limitation.runLimitationAssessment({
    country: 'CA', region: 'CA-NS', assessment_clock: clockAt('2026-01-10'),
    extraction: extractionOf([satisfactoryBlock(), adverseBlock({ creditor: 'SYNTHETIC ADVERSE TWO', lastPayment: 'Mar 09, 2020' })])
  });
  check.equal(mixed.performed.length, 1, 'only the adverse account of the two is assessed');
  check.ok(mixed.performed[0].record_index > 1, 'and the assessment names the record it belongs to, not the other account');
  check.equal(mixed.performed[0].amounts.balance, 248, 'with that account own printed balance');
  evidence.limitation = { recorded: mixed.recorded_jurisdictions, assessed: mixed.summary.assessed, may_be_outside: mixed.summary.may_be_outside, withheld: mixed.summary.withheld };
}

/* ---------------------------------------------------------------- the payment-history controls */

const LEGEND_CG_WO = 'CG-Account cancelled by credit grantor with derogatory rating, WO-Bad debt write-off, AC-Account closed/rating non derogatory';
const LEGEND_CG = 'CG-Account cancelled by credit grantor with derogatory rating';

function runPaymentHistoryControls(check, evidence) {
  /* 1. One month rated as a bad debt while the same month says the account closed without a derogatory rating. */
  const conflict = paymentHistory.runPaymentHistoryAnalysis({
    extraction: extractionOf([tuBlock({ creditor: 'SYNTHETIC CONFLICT', legend: LEGEND_CG_WO, months: [{ period: 'Oct 2025', mop: '9', narrative: 'AC /', payment: '0' }] })])
  });
  const conflictEntry = conflict.performed.find((p) => p.check_id === 'PH-RATING-CONTRADICTS-NARRATIVE-IN-THE-SAME-MONTH');
  check.equal(conflictEntry.state, 'POTENTIAL_ISSUE', 'a bad-debt rating in a month that says the account closed without a derogatory rating is raised');
  check.equal(conflictEntry.source_records[0].evidence.rating_meaning, 'Bad debt, placed for collection; skip', 'with the rating meaning the report itself prints');
  check.equal(conflictEntry.source_records[0].evidence.narrative_meaning, 'Account closed/rating non derogatory', 'and the narrative meaning it prints');

  /* 2. The benign twin: the same month cancelled WITH a derogatory rating is consistent. */
  const benign = paymentHistory.runPaymentHistoryAnalysis({
    extraction: extractionOf([tuBlock({ creditor: 'SYNTHETIC BENIGN', legend: LEGEND_CG, months: [{ period: 'Oct 2025', mop: '9', narrative: 'CG /', payment: '0' }] })])
  });
  check.equal(benign.performed.find((p) => p.check_id === 'PH-RATING-CONTRADICTS-NARRATIVE-IN-THE-SAME-MONTH').state, 'NOT_DETECTED',
    'a month rated as a bad debt and cancelled with a derogatory rating is consistent, so nothing is raised');

  /* 3. Ordinary post-write-off payment is benign; a same-month no-payment description is affirmative conflict. */
  const payment = paymentHistory.runPaymentHistoryAnalysis({
    extraction: extractionOf([tuBlock({
      creditor: 'SYNTHETIC PAYMENT',
      legend: 'WO-Bad debt write-off, NP-No payment received',
      months: [{ period: 'Jul 2024', mop: '9', narrative: 'WO /', payment: '0' }, { period: 'Sep 2024', mop: '5', narrative: '', payment: '50' }]
    })])
  });
  const paymentId = 'PH-PAYMENT-CONTRADICTS-NO-PAYMENT-NARRATIVE';
  check.equal(payment.performed.find((p) => p.check_id === paymentId).state, 'NOT_DETECTED',
    'an ordinary payment after a write-off is not a contradiction');
  const contradictedPayment = paymentHistory.runPaymentHistoryAnalysis({
    extraction: extractionOf([tuBlock({
      creditor: 'SYNTHETIC PAYMENT CONFLICT',
      legend: 'WO-Bad debt write-off, NP-No payment received',
      months: [{ period: 'Jul 2024', mop: '9', narrative: 'WO /', payment: '0' }, { period: 'Sep 2024', mop: '5', narrative: 'NP /', payment: '50' }]
    })])
  });
  const payEntry = contradictedPayment.performed.find((p) => p.check_id === paymentId);
  check.equal(payEntry.state, 'POTENTIAL_ISSUE', 'a later payment conflicting with the same month no-payment narrative is raised');
  check.equal(payEntry.source_records[0].evidence.payment_amount, 50, 'with the printed payment amount');
  check.equal(payEntry.source_records[0].evidence.no_payment_meaning, 'No payment received', 'and the report own conflicting meaning');
  check.equal(payEntry.source_records[0].evidence.payment_raw, '50', 'preserving the raw printed payment');
  check.ok(payEntry.source_records[0].location, 'and the monthly row location');
  const noWriteOff = paymentHistory.runPaymentHistoryAnalysis({
    extraction: extractionOf([tuBlock({ creditor: 'SYNTHETIC NO WRITE OFF', legend: 'NP-No payment received',
      months: [{ period: 'Sep 2024', mop: '1', narrative: 'NP /', payment: '50' }] })])
  });
  check.equal(noWriteOff.performed.find((p) => p.check_id === paymentId).state, 'POTENTIAL_ISSUE',
    'the same affirmative conflict is found on an account without a write-off');
  const noLegend = paymentHistory.runPaymentHistoryAnalysis({
    extraction: extractionOf([tuBlock({ creditor: 'SYNTHETIC UNKNOWN CODE', legend: null,
      months: [{ period: 'Sep 2024', mop: '1', narrative: 'NP /', payment: '50' }] })])
  });
  check.equal(noLegend.performed.find((p) => p.check_id === paymentId).state, 'NOT_DETECTED',
    'an undecoded narrative code alone cannot establish the no-payment meaning');
  /* The benign twin: a payment without a conflicting no-payment description is not this candidate. */
  const before = paymentHistory.runPaymentHistoryAnalysis({
    extraction: extractionOf([tuBlock({
      creditor: 'SYNTHETIC BEFORE',
      legend: 'WO-Bad debt write-off',
      months: [{ period: 'Jan 2024', mop: '2', narrative: '', payment: '50' }, { period: 'Jul 2024', mop: '9', narrative: 'WO /', payment: '0' }]
    })])
  });
  check.equal(before.performed.find((p) => p.check_id === paymentId).state, 'NOT_DETECTED',
    'a payment without a conflicting same-month description is not raised');

  /* 4. A printed first-delinquency anchor later than a month the same history already shows as late. */
  const anchor = paymentHistory.runPaymentHistoryAnalysis({
    extraction: extractionOf([tuBlock({
      creditor: 'SYNTHETIC ANCHOR',
      firstDelinquency: 'Mar 16, 2024',
      legend: LEGEND_CG,
      months: [{ period: 'Jan 2024', mop: '3', narrative: 'CG /' }, { period: 'Apr 2024', mop: '4', narrative: '' }]
    })])
  });
  const anchorEntry = anchor.performed.find((p) => p.check_id === 'PH-DELINQUENCY-ANCHOR-AFTER-THE-HISTORY-SHOWS-IT');
  check.equal(anchorEntry.state, 'POTENTIAL_ISSUE', 'a first-delinquency date later than an already-late month is raised');
  check.deepEqual(anchorEntry.source_records[0].evidence.months_already_shown_as_late.map((m) => m.period), ['2024-01'],
    'and it names the printed month that came before the anchor');

  /* 5. The benign twins: an unknown rating and a blank cell are never late months, and an absent anchor is not aged. */
  const unknowns = paymentHistory.runPaymentHistoryAnalysis({
    extraction: extractionOf([tuBlock({
      creditor: 'SYNTHETIC UNKNOWN',
      firstDelinquency: 'Mar 16, 2024',
      legend: LEGEND_CG,
      months: [{ period: 'Jan 2024', mop: 'X', narrative: '' }, { period: 'Feb 2024', mop: '', narrative: '' }]
    })])
  });
  check.equal(unknowns.performed.find((p) => p.check_id === 'PH-DELINQUENCY-ANCHOR-AFTER-THE-HISTORY-SHOWS-IT').state, 'NOT_DETECTED',
    'an unknown rating and a blank cell are never treated as a late month');
  const noAnchor = paymentHistory.runPaymentHistoryAnalysis({
    extraction: extractionOf([tuBlock({ creditor: 'SYNTHETIC NO ANCHOR', legend: LEGEND_CG, months: [{ period: 'Jan 2024', mop: '3', narrative: 'CG /' }] })])
  });
  check.equal(noAnchor.performed.find((p) => p.check_id === 'PH-DELINQUENCY-ANCHOR-AFTER-THE-HISTORY-SHOWS-IT').state, 'NOT_DETECTED',
    'an absent anchor is never aged here: the missing anchor is the completeness question, not this one');

  /* 6. Every analysis declares its benign explanations, and every refused candidate keeps its reason. */
  check.ok(conflict.performed.every((p) => Array.isArray(p.benign_explanations_considered) && p.benign_explanations_considered.length >= 1),
    'every payment-history analysis declares the benign explanations it considered');
  check.ok(conflict.withheld_candidates.every((c) => c.reason && c.missing_prerequisite),
    'every candidate that was refused keeps its reason and its missing prerequisite');
  check.ok(conflict.withheld_candidates.some((c) => c.candidate === 'CUMULATIVE_COUNTS_VERSUS_THE_VISIBLE_MONTHS'),
    'including the cumulative-counts comparison, refused because the two are not comparable');
  check.equal(conflict.summary.legal_findings_emitted, 0, 'and the analyses emit no legal finding');
  evidence.payment_history = { analyses: conflict.summary.analyses, potential: conflict.summary.potential_issue, withheld: conflict.withheld_candidates.length };
}

/* ---------------------------------------------------------------- the consumer path, over HTTP */

const results = require('../../results.cjs');
const { evaluateCase } = require('../../evaluation.cjs');

async function runConsumerPath(service, check, evidence) {
  const actor = await service.account('cs-limitation@example.test');
  const created = await service.request('POST', '/api/cases', { token: actor.token, body: { country: 'CA', region: 'CA-NS' } });
  check.equal(created.status, 201, 'a case is created for the synthetic assessment');
  const caseId = created.json.case.case_id;
  const extraction = extractionOf([satisfactoryBlock(), adverseBlock({ creditor: 'SYNTHETIC ADVERSE TWO', lastPayment: 'Mar 09, 2020' })]);
  /* The REAL evaluator runs the statutory, factual, common-error, limitation and payment-history work, so the
     consumer-path assertions below exercise the production chain and not a hand-built assessment. */
  const evaluation = evaluateCase({ country: 'CA', region: 'CA-NS', extraction, assessment_clock: clockAt('2026-01-10') });
  check.equal(evaluation.assessments_performed, 4, 'the evaluator ran the three payment-history analyses and the limitation assessment');
  check.equal(evaluation.limitation_summary.may_be_outside, 1, 'and its own limitation assessment found the one adverse account');
  /* The stored result is rendered by the production renderer, exactly as the upload path renders a real one. */
  const rendered = results.renderResultSet({ evaluation, extraction });
  service.service.store.update((state) => {
    state.results.push({
      result_id: `res_cs_${crypto.randomBytes(8).toString('hex')}`,
      case_id: caseId,
      account_id: actor.account_id,
      file_id: null,
      file_ids: [],
      evaluation,
      rendered,
      extraction: { records: extraction.records, bureau: 'TransUnion', reference_date: { normalized_value: '2026-01-10' } },
      clarification_eligibility: [],
      reviewed_at: null,
      created_at: new Date().toISOString()
    });
  });
  const response = await service.request('GET', `/api/cases/${caseId}`, { token: actor.token });
  const view = response.json && response.json.view ? response.json.view : null;
  check.ok(view, `the case view renders for the assessed case (status ${response.status})`);
  check.equal(view.assessment_summary.distinct_total, 4, 'the assessed case carries four distinct supported issues');
  check.equal(view.assessment_summary.by_confidence.potential, 4, 'all four are potential issues');
  check.equal(view.assessment_summary.teaser.severity, 'ADD_CONTENT', 'and the teaser ranks them with the additions');
  check.ok(!/violation|definite/i.test(String(view.assessment_summary.teaser.title)), 'while claiming no violation');
  const limitationItems = view.result.issues.filter((i) => i.limitation_concern === true);
  check.equal(limitationItems.length, 1, 'exactly one of the four is the court-limitation concern');
  const item = limitationItems[0];
  check.equal(item.account_identity.name, 'SYNTHETIC ADVERSE TWO', 'on the adverse account, not the satisfactory one');
  check.ok(/may be outside the time limit for a court claim/.test(String(item.explanation)), 'and says plainly what the dates suggest');
  check.ok(/checked on 2026-01-10/.test(String(item.explanation)), 'with the date the report was checked on the server');
  check.ok(/Assessed on 2026-01-10|2026-01-10/.test(String((item.limitation || {}).assessed_on || '')), 'and that date recorded as the assessment date');
  check.ok(/not about whether the credit bureau may report/.test(String(item.uncertainty)),
    'while stating that it is not a reporting-rule allegation');
  check.equal(item.request_type, 'VERIFICATION', 'and it asks for the dates and the basis to be verified');
  const packet = await service.request('GET', `/api/cases/${caseId}/packet`, { token: actor.token });
  check.equal(packet.status, 200, 'a subscriber can open the packet flow for it');
  const selected = await service.request('POST', `/api/cases/${caseId}/packet/select`, { token: actor.token, body: { issue_ids: [item.issue_id] } });
  check.equal(selected.status, 200, 'and select the limitation concern into verification correspondence');
  const paymentCase = await service.request('POST', '/api/cases', { token: actor.token, body: { country: 'CA', region: 'CA-NS' } });
  check.equal(paymentCase.status, 201, 'a second case holds the independent payment-history conflict');
  const paymentCaseId = paymentCase.json.case.case_id;
  const paymentExtraction = extractionOf([tuBlock({
    creditor: 'SYNTHETIC PAYMENT CONFLICT', legend: 'NP-No payment received',
    months: [{ period: 'Sep 2024', mop: '1', narrative: 'NP /', payment: '50' }]
  })]);
  const paymentEvaluation = evaluateCase({ country: 'CA', region: 'CA-NS', extraction: paymentExtraction, assessment_clock: clockAt('2026-01-10') });
  check.equal(paymentEvaluation.payment_history_analysis.summary.potential_issue, 1, 'the evaluator retains the reader-backed conflict');
  const paymentRendered = results.renderResultSet({ evaluation: paymentEvaluation, extraction: paymentExtraction });
  service.service.store.update((state) => {
    state.results.push({ result_id: `res_cs_${crypto.randomBytes(8).toString('hex')}`, case_id: paymentCaseId,
      account_id: actor.account_id, file_id: null, file_ids: [], evaluation: paymentEvaluation,
      rendered: paymentRendered, extraction: paymentExtraction, clarification_eligibility: [],
      reviewed_at: null, created_at: new Date().toISOString() });
  });
  const paymentView = (await service.request('GET', `/api/cases/${paymentCaseId}`, { token: actor.token })).json.view;
  const paymentItem = paymentView.result.issues.find((i) => /No payment received/i.test(String(i.explanation)));
  check.ok(paymentItem, `the reader-backed payment conflict reaches a plain-English consumer issue; saw ${paymentView.result.issues.map((i) => i.explanation).join(' | ')}`);
  check.ok(paymentItem && /No payment received/.test(String(paymentItem.explanation)), 'the issue names the printed conflicting description');
  check.equal(paymentItem && paymentItem.request_type, 'VERIFICATION', 'without asserting a violation');
  const paymentSelection = await service.request('POST', `/api/cases/${paymentCaseId}/packet/select`,
    { token: actor.token, body: { issue_ids: [paymentItem.issue_id] } });
  check.equal(paymentSelection.status, 200, 'the consumer can select that factual issue');
  const correspondence = await service.request('POST', `/api/cases/${paymentCaseId}/packet/correspondence`,
    { token: actor.token, body: { correspondence: { consumer_name: 'Fictional Consumer', contact: 'fictional@example.test' } } });
  check.equal(correspondence.status, 200, 'and review the correspondence with fictional contact details');
  const paymentApproval = await service.request('POST', `/api/cases/${paymentCaseId}/packet/approve`, { token: actor.token });
  check.equal(paymentApproval.status, 200, 'the selected correspondence can be approved');
  const paymentDownload = await service.request('GET', `/api/cases/${paymentCaseId}/packet-download`, { token: actor.token });
  check.equal(paymentDownload.status, 200, 'and the entitled consumer can download the approved packet');
  const onCase = await service.request('POST', '/api/cases', { token: actor.token, body: { country: 'CA', region: 'CA-ON' } });
  check.equal(onCase.status, 201, 'the Ontario selection creates its own case');
  const onId = onCase.json.case.case_id;
  const onExtraction = extractionOf([adverseBlock({ creditor: 'SYNTHETIC ONTARIO DEBT', lastPayment: 'Jan 09, 2024' })]);
  const onEvaluation = evaluateCase({ country: 'CA', region: 'CA-ON', extraction: onExtraction, assessment_clock: clockAt('2026-01-10') });
  service.service.store.update((state) => {
    state.results.push({ result_id: `res_cs_${crypto.randomBytes(8).toString('hex')}`, case_id: onId,
      account_id: actor.account_id, file_id: null, file_ids: [], evaluation: onEvaluation,
      rendered: results.renderResultSet({ evaluation: onEvaluation, extraction: onExtraction }),
      extraction: onExtraction, clarification_eligibility: [], reviewed_at: null, created_at: new Date().toISOString() });
  });
  const onView = (await service.request('GET', `/api/cases/${onId}`, { token: actor.token })).json.view;
  const onItem = onView.result.issues.find((i) => i.limitation_concern === true);
  check.ok(onItem, 'the Ontario timing question reaches the consumer issue list');
  check.equal(onItem && onItem.account_identity.name, 'SYNTHETIC ONTARIO DEBT', 'on its own account');
  check.ok(onItem && /does not establish when the claim was discovered/.test(onItem.explanation),
    'the explanation does not turn a report date into legal discovery');
  check.ok(onItem && /when this claim was discovered/.test(onItem.request_wording),
    'and the request asks for the decisive missing fact');
  check.equal(onItem && onItem.request_type, 'VERIFICATION', 'without a breach or deletion claim');
  check.equal((await service.request('POST', `/api/cases/${onId}/packet/select`,
    { token: actor.token, body: { issue_ids: [onItem.issue_id] } })).status, 200, 'the consumer selects it');
  check.equal((await service.request('POST', `/api/cases/${onId}/packet/correspondence`,
    { token: actor.token, body: { correspondence: { consumer_name: 'Fictional Consumer', contact: 'fictional@example.test' } } })).status,
    200, 'reviews the correspondence');
  check.equal((await service.request('POST', `/api/cases/${onId}/packet/approve`, { token: actor.token })).status,
    200, 'approves that selection');
  check.equal((await service.request('GET', `/api/cases/${onId}/packet-download`, { token: actor.token })).status,
    200, 'and downloads the entitled packet');
  const mbCase = await service.request('POST', '/api/cases', { token: actor.token, body: { country: 'CA', region: 'CA-MB' } });
  check.equal(mbCase.status, 201, 'the Manitoba selection creates its own case');
  const mbId = mbCase.json.case.case_id;
  const mbExtraction = extractionOf([adverseBlock({ creditor: 'SYNTHETIC MANITOBA DEBT', lastPayment: 'Jan 09, 2024' })]);
  const mbEvaluation = evaluateCase({ country: 'CA', region: 'CA-MB', extraction: mbExtraction, assessment_clock: clockAt('2026-01-10') });
  service.service.store.update((state) => {
    state.results.push({ result_id: `res_cs_${crypto.randomBytes(8).toString('hex')}`, case_id: mbId,
      account_id: actor.account_id, file_id: null, file_ids: [], evaluation: mbEvaluation,
      rendered: results.renderResultSet({ evaluation: mbEvaluation, extraction: mbExtraction }),
      extraction: mbExtraction, clarification_eligibility: [], reviewed_at: null, created_at: new Date().toISOString() });
  });
  const mbView = (await service.request('GET', `/api/cases/${mbId}`, { token: actor.token })).json.view;
  const mbItem = mbView.result.issues.find((i) => i.limitation_concern === true);
  check.ok(mbItem, 'the Manitoba timing question reaches the consumer issue list');
  check.equal(mbItem && mbItem.account_identity.name, 'SYNTHETIC MANITOBA DEBT', 'on its own account');
  check.ok(mbItem && /does not establish when the claim was discovered/.test(mbItem.explanation),
    'the explanation does not turn a printed date into legal discovery');
  check.ok(mbItem && /when this claim was discovered/.test(mbItem.request_wording),
    'the request asks for the decisive missing fact');
  check.ok(mbItem && /demand and default/.test(mbItem.request_wording), 'the request asks for a possible demand date');
  check.equal(mbItem && mbItem.request_type, 'VERIFICATION', 'without a breach or deletion claim');
  check.equal((await service.request('POST', `/api/cases/${mbId}/packet/select`,
    { token: actor.token, body: { issue_ids: [mbItem.issue_id] } })).status, 200, 'the consumer selects the Manitoba issue');
  check.equal((await service.request('POST', `/api/cases/${mbId}/packet/correspondence`,
    { token: actor.token, body: { correspondence: { consumer_name: 'Fictional Consumer', contact: 'fictional@example.test' } } })).status,
    200, 'reviews the Manitoba correspondence');
  check.equal((await service.request('POST', `/api/cases/${mbId}/packet/approve`, { token: actor.token })).status,
    200, 'approves the Manitoba selection');
  check.equal((await service.request('GET', `/api/cases/${mbId}/packet-download`, { token: actor.token })).status,
    200, 'and downloads the entitled Manitoba packet');
  evidence.consumer_path = { distinct_total: view.assessment_summary.distinct_total, selected_issue: item.issue_id };
}

async function run(service, check) {
  const evidence = {};
  runLimitationControls(check, evidence);
  runPaymentHistoryControls(check, evidence);
  await runConsumerPath(service, check, evidence);
  return evidence;
}

module.exports = {
  run,
  id: 'cs-limitation-and-payment-history',
  title: 'BLOCKER-REPORT-DATA-TO-ISSUE-001: the court-limitation assessment and the payment-history analysis, with their positive, boundary, missing-prerequisite and benign controls'
};
