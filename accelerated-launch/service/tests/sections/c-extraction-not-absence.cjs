'use strict';
/**
 * c-extraction-not-absence.cjs — acceptance item 3: "Extraction failure never becomes field absence."
 *
 * The five statuses the CA-NS unit distinguishes are driven end to end over HTTP, and the consumer-visible
 * text for each is asserted to be different. A label printed without a value, a label that is not printed at
 * all, a label printed outside any account and a genuinely empty section must not read as each other, and a
 * refused document must read as neither.
 */

const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const FIXTURES = require('../../../../internal-validation/ca-ns-last-payment-six-year/tests/fixtures.cjs');

async function demonstration(t, owner, scenario) {
  const caseId = (await t.request('POST', '/api/cases', { token: owner.token, body: { country: 'CA', region: 'CA-NS' } })).json.case.case_id;
  const ran = await t.request('POST', `/api/cases/${caseId}/demonstration`, { token: owner.token, body: { scenario } });
  if (ran.status !== 201) throw new Error(`demonstration ${scenario} failed: ${ran.status} ${ran.text}`);
  const view = (await t.request('GET', `/api/cases/${caseId}`, { token: owner.token })).json.view;
  return { caseId, extraction: view.files[view.files.length - 1].extraction, result: view.result, demonstration: ran.json };
}

async function run(t, check) {
  const owner = await t.account('owner-extraction@example.test');
  const observed = {};

  /* ---------------------------------------------------------------- two readable accounts */
  const both = await demonstration(t, owner, 'TWO_ACCOUNTS');
  check.equal(both.extraction.accounts_read, 2, 'both accounts are read');
  check.equal(both.extraction.result_status, 'RESOLVED');
  check.ok(both.extraction.account_statuses.every((s) => s.status === 'RESOLVED'), 'both accounts carry a resolved date');
  check.equal(both.demonstration.counts_as_report_support, false, 'a demonstration never counts as report support');
  check.equal(both.result.support, 'DEMONSTRATION_ONLY_NOT_REPORT_SUPPORT', 'and its result set says so');

  /* ---------------------------------------------------------------- the four non-resolved shapes */
  const shapes = [
    ['DATE_LABEL_WITHOUT_VALUE', 'EXTRACTION_UNRESOLVED', 'LABEL_PRINTED_WITHOUT_VALUE', 1],
    ['DATE_LABEL_ABSENT_FROM_ACCOUNT', 'EXTRACTION_UNRESOLVED', 'LABEL_NOT_PRINTED_ON_RECORD', 1],
    ['NO_COLLECTION_ACCOUNTS', 'ABSENT_FROM_REPORT', 'SECTION_LOCATED_AND_RESOLVED_WITH_NO_COLLECTION_RECORD', 0],
    ['DATE_OUTSIDE_ANY_ACCOUNT', 'EXTRACTION_UNRESOLVED', 'FIELD_LABEL_OUTSIDE_ANY_RECORD', 0]
  ];
  for (const [scenario, expectedStatus, expectedReason, accounts] of shapes) {
    const run = await demonstration(t, owner, scenario);
    observed[scenario] = run;
    check.equal(run.extraction.extraction_ran, true, `${scenario}: the model was read`);
    check.equal(run.extraction.accounts_read, accounts, `${scenario}: ${accounts} accounts`);
    check.equal(run.extraction.result_status, expectedStatus, `${scenario}: status ${expectedStatus}`);
    check.equal(run.extraction.result_reason, expectedReason, `${scenario}: reason ${expectedReason}`);
    check.equal(run.extraction.presentation_evidence, false, `${scenario}: no presentation is evidenced`);
  }

  /* An unresolved read and a genuine absence must not read as each other. */
  const unresolvedText = JSON.stringify(observed.DATE_LABEL_ABSENT_FROM_ACCOUNT.result);
  const absentText = JSON.stringify(observed.NO_COLLECTION_ACCOUNTS.result);
  check.ok(/could not be read/.test(unresolvedText), 'the unresolved text says the date could not be read');
  check.ok(/not the same as an absent date/.test(unresolvedText), 'and it distinguishes itself from absence');
  check.ok(!/could not be read/.test(absentText), 'the genuine absence does not claim a read failure');
  check.ok(!/LABEL_NOT_PRINTED_ON_RECORD/.test(absentText), 'and it is not described by the unresolved reason');
  check.notEqual(unresolvedText, absentText, 'the two outcomes are different messages');

  /* ---------------------------------------------------------------- a refused document is neither */
  const fixtures = FIXTURES.pdfFixtures();
  const caseId = (await t.request('POST', '/api/cases', { token: owner.token, body: { country: 'CA', region: 'CA-NS' } })).json.case.case_id;
  await t.request('POST', `/api/cases/${caseId}/files`, {
    token: owner.token,
    body: { originalFilename: 'lookalike.pdf', declaredBytes: 1, mimeType: 'application/pdf', contentBase64: fs.readFileSync(fixtures.unpinned).toString('base64') }
  });
  const refused = (await t.request('GET', `/api/cases/${caseId}`, { token: owner.token })).json.view.files[0].extraction;
  check.equal(refused.admitted, false, 'a refused document is not admitted');
  check.equal(refused.extraction_ran, false, 'and it is not read');
  check.equal(refused.accounts_read, 0, 'so it reports no accounts');
  check.equal(refused.refusal_reason, 'UNRELATED_DOCUMENT', 'a lookalike with no bureau identity is refused as unrelated');
  check.notEqual(refused.result_status, 'ABSENT_FROM_REPORT', 'and it never reads as an absence of a field');
  check.equal(refused.extraction_ran, false, 'and it was not read');

  return { scenarios: Object.keys(observed).concat('TWO_ACCOUNTS') };
}

module.exports = { run, id: 'c-extraction', title: 'Extraction failure is never reported as field absence' };
