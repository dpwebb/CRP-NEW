'use strict';

const adapters = require('../../../adapters/rule-adapters.cjs');
const catalogue = require('../../../adapters/rule-adapter-catalog.json');
const evaluation = require('../../evaluation.cjs');
const common = require('../../common-errors.cjs');
const issues = require('../../issues.cjs');
const { CHECKS, checklistFor } = require('../../common-error-checklist.cjs');
const { activeAdapter, CHECKLIST_STATUTORY_SUPPORT } = require('../../common-error-scope.cjs');

function rec(index, kind, facts) {
  return { record_index: index, kind, kind_label: 'account', status: 'RESOLVED',
    source_bureau: 'Synthetic Bureau', source_report_reference_date: '2026-10-01',
    location: { page: 1, line: index }, facts };
}

async function run(t, check) {
  check.equal(CHECKS.length, 19, 'the combined checklist has nineteen shared entries');
  check.equal(new Set(CHECKS.map((x) => x.check_id)).size, 19, 'every entry has one stable id');
  check.equal(catalogue.regions.length, 82, 'the declared jurisdiction population remains 82');
  check.deepEqual([...new Set(Object.values(CHECKLIST_STATUTORY_SUPPORT))].sort(),
    ['COLLECTION_REPORTING_PERIOD', 'REPORT_DATA_ACCURACY', 'TRADELINE_REPORTING_PERIOD'],
    'every active statutory adapter has one checklist-related support category');
  check.deepEqual(adapters.ADAPTERS.filter((a) => activeAdapter(a.adapter_id)).map((a) => a.adapter_id).sort(),
    Object.keys(CHECKLIST_STATUTORY_SUPPORT).sort(),
    'the active adapter set is exactly the explicit common-error support map');
  for (const region of catalogue.regions) {
    const code = region.region || region.region_code;
    const selected = evaluation.applicableAdapters(code);
    check.ok(selected.confirmed.concat(selected.unconfirmed).every((a) => activeAdapter(a.adapter_id)),
      `only checklist-related statutory adapters remain active for ${code}`);
    check.equal(checklistFor({ common_errors: { performed: [] } }).length, 19,
      `the same checklist exists for ${code}`);
    const omitted = checklistFor({ common_errors: { performed: [{
      check_id: 'COMMON-ERROR-CLOSURE-STATED-WITHOUT-A-CLOSED-DATE'
    }] } }).find((row) => row.check_id === 'COMMON-ERROR-REQUIRED-REPORT-DATA-VISIBLY-MISSING');
    check.equal(omitted.state, 'PERFORMED', `${code}: sourced omission is included in the shared checklist`);
    const unreadable = checklistFor({ common_errors: { performed: [] } })
      .find((row) => row.check_id === 'COMMON-ERROR-REQUIRED-REPORT-DATA-VISIBLY-MISSING');
    check.equal(unreadable.state, 'NOT_PERFORMED', `${code}: a reader gap does not prove an omission`);
  }
  const retired = adapters.ADAPTERS.filter((a) => !activeAdapter(a.adapter_id));
  check.ok(retired.length > 0, 'out-of-checklist statutory adapters are retired from runtime assessment');
  for (const [region, id] of [
    ['CA-NS', 'CA-NS-CRA-S10-3-F-DISMISSED-CHARGE'],
    ['US-CA', 'US-CA-CCRAA-1785-13-A-4-TAX-LIEN-PAID-7Y'],
    ['AU-NSW', 'AU-PRIVACY-ACT-1988-S20W-ITEM3-ENQUIRY-5Y']
  ]) {
    const selected = evaluation.applicableAdapters(region);
    check.ok(!selected.confirmed.concat(selected.unconfirmed).some((entry) => entry.adapter_id === id),
      `${id} is retired from the ${region} runtime assessment`);
  }

  const paid = rec(1, 'REPORTED_ACCOUNT', { 'account.status': 'PAID IN FULL', 'account.pastDueAmount': 50 });
  const zeroLimit = rec(5, 'REPORTED_ACCOUNT', { 'account.type': 'Revolving credit',
    'account.balance': 120, 'account.creditLimit': 0 });
  check.equal(common.revolvingBalanceWithZeroLimit([zeroLimit]).state, 'POTENTIAL_ISSUE',
    'a printed zero limit beside a positive revolving balance is checked');
  check.equal(common.revolvingBalanceWithZeroLimit([rec(5, 'REPORTED_ACCOUNT', {
    'account.type': 'Revolving credit', 'account.balance': 120 })]), null,
  'an omitted limit is not treated as zero');
  check.equal(common.revolvingBalanceWithZeroLimit([rec(5, 'REPORTED_ACCOUNT', {
    'account.type': 'Installment loan', 'account.balance': 120, 'account.creditLimit': 0 })]), null,
  'the revolving check does not misclassify an installment loan');
  const paidResult = common.paidOrSettledShownUnpaid([paid]);
  check.equal(paidResult.state, 'POTENTIAL_ISSUE', 'paid plus printed past due is a potential issue');
  check.equal(common.paidOrSettledShownUnpaid([rec(1, 'REPORTED_ACCOUNT', {
    'account.status': 'PAID IN FULL', 'account.pastDueAmount': 0 })]).state, 'NOT_DETECTED',
  'a zero past-due amount is not flagged');
  const paidBalance = rec(6, 'REPORTED_ACCOUNT', {
    'account.status': 'PAID IN FULL', 'account.balance': 90 });
  check.equal(common.paidOrSettledShownUnpaid([paidBalance]).source_records[0].reason,
    'PAID_IN_FULL_WITH_POSITIVE_BALANCE', 'paid-in-full and a positive current balance are compared');
  check.equal(common.paidOrSettledShownUnpaid([rec(6, 'REPORTED_ACCOUNT', {
    'account.status': 'SETTLED', 'account.balance': 90 })]).state, 'NOT_DETECTED',
  'a partial settlement with a remaining balance is not treated as a contradiction');
  const dated = rec(2, 'REPORTED_ACCOUNT', { 'liability.openedDate': '2020-01-01',
    'tradeline.lastPaymentDate': '2019-01-01' });
  check.equal(common.paymentOrDelinquencyDateConflict([dated]).state, 'POTENTIAL_ISSUE',
    'a last-payment date before account opening is flagged');
  check.equal(common.paymentOrDelinquencyDateConflict([rec(2, 'REPORTED_ACCOUNT', {
    'liability.openedDate': '2020-01-01', 'tradeline.lastPaymentDate': '2021-01-01' })]).state,
  'NOT_DETECTED', 'ordered printed dates are not flagged');
  const original = rec(3, 'REPORTED_ACCOUNT', { 'account.masked_identifier': '***1234',
    'account.reported_identity': 'TEST BANK', 'account.balance': 100 });
  const collection = rec(4, 'GENERAL_COLLECTION', { 'account.masked_identifier': '***1234',
    'account.reported_identity': 'TEST BANK', 'account.balance': 100 });
  check.equal(common.collectionAndOriginalBothDue([original, collection]).state, 'POTENTIAL_ISSUE',
    'linked original and collection with amounts due are flagged for verification');
  check.equal(common.collectionAndOriginalBothDue([original, rec(4, 'GENERAL_COLLECTION', {
    'account.masked_identifier': '***5678', 'account.reported_identity': 'TEST BANK',
    'account.balance': 100 })]), null, 'different account identifiers do not link');
  check.equal(common.collectionAndOriginalBothDue([original, rec(4, 'GENERAL_COLLECTION', {
    'account.masked_identifier': '***1234', 'account.reported_identity': 'TEST BANK',
    'account.balance': 75 })]).state, 'NOT_DETECTED',
  'a masked-identifier collision with a different amount does not become a linked pair');
  for (const [id, records] of [
    ['COMMON-ERROR-REVOLVING-BALANCE-ZERO-LIMIT', [zeroLimit]],
    ['COMMON-ERROR-PAID-SETTLED-SHOWN-UNPAID', [paidBalance]],
    ['COMMON-ERROR-PAID-SETTLED-SHOWN-UNPAID', [paid]],
    ['COMMON-ERROR-LAST-PAYMENT-OR-FIRST-DELINQUENCY-DATE', [dated]],
    ['COMMON-ERROR-COLLECTION-ORIGINAL-BOTH-DUE', [original, collection]]
  ]) {
    const evaluated = common.runCommonErrorChecks({ extraction: { records } });
    const offered = issues.issuesFor({ extraction: { records },
      evaluation: { results: [], common_errors: evaluated } });
    check.ok(offered.some((x) => x.check_id === id && x.eligible && x.classification === null),
      `${id} reaches a selectable factual verification issue`);
  }

  return { checklist: 19, jurisdictions: 82, retired_adapters: retired.length,
    newly_connected_categories: 3 };
}

module.exports = { run, id: 'ct-owner-common-error-scope',
  title: 'Owner common-error scope: all-82 checklist, scoped rules and factual evidence paths' };
