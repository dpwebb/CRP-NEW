'use strict';

const { CHECKS } = require('../../common-error-checklist.cjs');
const formats = require('../../formats.cjs');
const evaluation = require('../../evaluation.cjs');
const results = require('../../results.cjs');
const common = require('../../common-errors.cjs');
const { makeSyntheticModel } = require('../../../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');

async function run(service, check) {
  const response = await service.request('GET', '/api/jurisdictions');
  const regions = response.json.surface.regions;
  check.equal(regions.length, 82, 'all promised selections retain the shared checklist');
  const ids = CHECKS.map((item) => item.check_id);
  check.equal(new Set(ids).size, 19, 'the product scope retains nineteen unique checklist rows');
  check.deepEqual(regions.filter((region) => region.checklist_items !== 19
    || JSON.stringify((region.common_error_checklist || []).map((item) => item.check_id)) !== JSON.stringify(ids)), [],
  'no jurisdiction silently substitutes statutory adapter counts or a second factual list for the shared checklist');
  check.ok(regions.every((region) => /common-error checklist/.test(region.availability.plain)
    && !/\d+ (?:rule|factual) checks?/.test(region.availability.plain)),
  'pre-upload wording uses one checklist without claiming every check can run on every report');
  check.equal(regions.filter((region) => region.statutory_support_checks > 0).length, 78,
    'optional statutory support retains its actual jurisdiction scope');

  // This report can run the common revolving check but supplies no dates for legacy factual checks.
  const extraction = formats.extractWithSharedAdapter(makeSyntheticModel({ pages: [[
    'Equifax Consumer Credit Report', 'Report Date: June 12, 2026',
    'Fictional Creditor Balance $100.00 Credit Limit $0.00', 'Account Type: Credit Card'
  ]] }), { mode: 'REPORT', country: 'CA' });
  const assessed = evaluation.evaluateCase({ country: 'CA', region: 'CA-MB', extraction });
  const rendered = results.renderResultSet({ extraction, evaluation: assessed });
  check.equal(assessed.results.length, 0, 'the control has no province-specific statutory result');
  check.equal(assessed.factual_checks.performed.length, 0, 'the control runs no legacy date consistency checks');
  check.ok(rendered.assessment.common_error_checks_performed > 0, 'the common-error engine actually performed a check');
  check.ok(rendered.issues.some((issue) => issue.eligible), 'the common-only report supplies a selectable issue');
  check.match(rendered.assessment.plain, /reviewed your report against the common-error checklist/,
    'the review summary recognizes common-only assessment');
  check.equal(/could not run a check/.test(rendered.assessment.plain), false,
    'the review summary does not contradict the eligible common-error issue');
  check.equal(rendered.checks_not_run.some((item) => item.reason === 'NO_APPLICABLE_CHECK_FOR_THIS_SELECTION'), false,
    'internal diagnostics do not claim that no check ran beside a completed shared check');
  check.deepEqual(results.availabilitySummary(assessed),
    { state: 'SOME_CHECKS_PERFORMED', checks: assessed.checks_performed },
    'the availability helper counts the completed shared and detected-information checks');
  check.equal(results.assessmentPlain([], 0, 0, 0, 0),
    'No findings are available from the information we could review.',
    'a report with no performed checks does not claim compliance');
  check.equal(common.presentationCapability('PR-01').all_factual_checks[
    'COMMON-ERROR-LAST-PAYMENT-OR-FIRST-DELINQUENCY-DATE'].field_ready, true,
    'the pinned reader is included in capability reporting for its already-read dates');
  const located = { facts: { 'tradeline.lastPaymentDate': '2027-01-01' },
    report_reference_date: { raw: 'June 12, 2026', normalized_value: '2026-06-12', location: { page: 1, line: 2 } } };
  check.equal(common.formatCapability({ presentation_id: 'PR-01', records: [located] }).all_factual_checks[
    'COMMON-ERROR-LAST-PAYMENT-OR-FIRST-DELINQUENCY-DATE'].field_ready, true,
    'a report-date comparison is usable without an unrelated opening date');
  check.equal(common.formatCapability({ presentation_id: 'PR-01', records: [
    { facts: located.facts }, { facts: {}, report_reference_date: located.report_reference_date }
  ] }).all_factual_checks['COMMON-ERROR-LAST-PAYMENT-OR-FIRST-DELINQUENCY-DATE'].field_ready, false,
  'report-date evidence from another record cannot advertise a usable same-record comparison');
}

module.exports = { run, id: 'db-common-error-surface-repairs',
  title: 'Shared all-82 checklist descriptions and truthful common-only assessment summary' };
