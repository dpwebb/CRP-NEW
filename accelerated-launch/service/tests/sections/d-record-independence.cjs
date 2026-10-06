'use strict';
/**
 * d-record-independence.cjs — acceptance item 4: "Records do not borrow each other's dates or values."
 *
 * Three levels are checked, because each can fail independently:
 *   1. EXTRACTION — two accounts in one report produce two fact records with their own values and their own
 *      page/line locations, and neither value appears in the other's record.
 *   2. THE BRIDGE — the fact object a rule adapter is handed contains one account's value and nothing else.
 *   3. EVALUATION — two per-account runs of the same rule produce two independent comparisons, with their own
 *      anchors, anniversaries and day counts.
 *
 * Level 3 uses the shared extraction-record SHAPE directly, because a demonstration model can never be
 * admitted as a presentation. The real end-to-end EVALUATED path is exercised in `j-specimen-journey.cjs`
 * against the evidenced specimen.
 */

const assert = require('node:assert/strict');
const formats = require('../../formats.cjs');
const evaluation = require('../../evaluation.cjs');

async function run(t, check) {
  const owner = await t.account('owner-records@example.test');
  const caseId = (await t.request('POST', '/api/cases', { token: owner.token, body: { country: 'CA', region: 'CA-NS' } })).json.case.case_id;
  const ran = await t.request('POST', `/api/cases/${caseId}/demonstration`, { token: owner.token, body: { scenario: 'TWO_ACCOUNTS' } });
  check.equal(ran.status, 201, 'the two-account demonstration runs');
  const view = (await t.request('GET', `/api/cases/${caseId}`, { token: owner.token })).json.view;
  const fileView = view.files[view.files.length - 1];

  /* ---------------------------------------------------------------- level 1: extraction */

  check.equal(fileView.extraction.accounts_read, 2, 'two accounts are reported separately');
  const numbers = fileView.extraction.account_statuses.map((s) => s.account_number_in_report);
  check.notEqual(numbers[0], numbers[1], 'the two accounts have different report numbers');

  const stored = t.service.store.state().files.filter((f) => f.case_id === caseId).pop().extraction;
  const recordOne = stored.records.find((r) => r.record_index === 1);
  const recordTwo = stored.records.find((r) => r.record_index === 2);
  check.ok(recordOne && recordTwo, 'both account records are stored');
  check.equal(recordOne.normalized_value, '2015-03-01', 'account 1 carries its own printed date');
  check.equal(recordTwo.normalized_value, '2021-02-01', 'account 2 carries its own printed date');
  check.notDeepEqual(recordOne.location, recordTwo.location, 'and their report locations differ');
  check.ok(recordOne.location.page !== undefined && recordOne.location.line !== undefined, 'each location names a page and a line');
  check.ok(!JSON.stringify(recordOne).includes(recordTwo.normalized_value), "account 1 does not carry account 2's date");
  check.ok(!JSON.stringify(recordTwo).includes(recordOne.normalized_value), "account 2 does not carry account 1's date");

  /* ---------------------------------------------------------------- level 2: the bridge */

  const factsOne = formats.factsForRecord(recordOne);
  const factsTwo = formats.factsForRecord(recordTwo);
  check.deepEqual(Object.keys(factsOne), ['tradeline.lastPaymentDate'], "the bridge hands over exactly the account's own fact");
  check.equal(factsOne['tradeline.lastPaymentDate'], '2015-03-01');
  check.equal(factsTwo['tradeline.lastPaymentDate'], '2021-02-01');
  check.deepEqual(formats.factsForRecord({ status: 'EXTRACTION_UNRESOLVED', normalized_value: null }), {}, 'an unresolved account contributes no fact at all');

  /* ---------------------------------------------------------------- level 3: evaluation */

  const shaped = {
    presentation_id: 'PR-01',
    presentation_evidence: true,
    extraction_ran: true,
    container: 'PDF',
    support: formats.SUPPORT.ACTUAL_REPORT_EVIDENCE,
    admission: { admitted: true },
    refusal: null,
    reference_date: { status: 'RESOLVED', normalized_value: '2022-05-01' },
    records: [
      { record_index: 1, status: 'RESOLVED', reason: null, normalized_value: '2015-03-01', raw_value: '2015/03/01' },
      { record_index: 2, status: 'RESOLVED', reason: null, normalized_value: '2021-02-01', raw_value: '2021/02/01' }
    ],
    summary: { status: 'RESOLVED', reason: null, resolved_fact_count: 2, contract_debt_record_count: 2 }
  };
  const evaluated = evaluation.evaluateCase({ country: 'CA', region: 'CA-NS', extraction: shaped });
  const accountResults = evaluated.results.filter((r) => r.record_index !== null);
  check.equal(accountResults.length, 2, 'the per-account check ran once for each account');
  const byRecord = new Map(accountResults.map((r) => [r.record_index, r.machine]));
  check.equal(byRecord.get(1).anchor.iso, '2015-03-01', 'account 1 was measured from its own date');
  check.equal(byRecord.get(2).anchor.iso, '2021-02-01', 'account 2 was measured from its own date');
  check.equal(byRecord.get(1).arithmetic.anniversary, '2021-03-01', 'account 1 has its own anniversary');
  check.equal(byRecord.get(2).arithmetic.anniversary, '2027-02-01', 'account 2 has its own anniversary');
  check.equal(byRecord.get(1).outcome, 'PERIOD_EXCEEDED', 'account 1 exceeds the period');
  check.equal(byRecord.get(2).outcome, 'PERIOD_NOT_EXCEEDED', 'account 2 does not');
  check.notEqual(byRecord.get(1).arithmetic.intervening_days, byRecord.get(2).arithmetic.intervening_days, 'their day counts differ');

  return { accounts: numbers, records: 2 };
}

module.exports = { run, id: 'd-records', title: 'Records never borrow each other\'s dates or values' };
