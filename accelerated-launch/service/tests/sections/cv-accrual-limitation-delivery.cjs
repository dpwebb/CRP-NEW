'use strict';
/* Public AU and GB structural specimens through the real local upload, assessment and packet route. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const limitation = require('../../limitation-assessment.cjs');
const assessmentClock = require('../../assessment-clock.cjs');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const PDF = {
  AU: path.join(ROOT, 'SOURCE_CAPTURES', 'REPORT_FORMAT_BASELINE_2026-09-30', 'PUB-012.pdf'),
  GB: path.join(ROOT, 'SOURCE_CAPTURES', 'REPORT_FORMAT_BASELINE_2026-09-30', 'PUB-009.pdf')
};
const CLOCK = assessmentClock.runStamp('2026-10-06T12:00:00Z');

function synthetic(region, date, adverse) {
  const au = region.startsWith('AU-');
  const record = au
    ? { record_index: 0, kind: adverse ? 'OVERDUE_ACCOUNT' : 'CONSUMER_CREDIT_LIABILITY',
      section_path: adverse ? 'Overdue Accounts' : 'Consumer Credit Liability Information',
      raw_value: date || null, normalized_value: date || null,
      location: { page: 1, line: 4 }, facts: date ? { 'overdue.originalListingDate': date } : {} }
    : { record_index: 0, kind: 'GB_CREDIT_ACCOUNT',
      printed: { Defaulted: adverse ? { raw: date || '', normalized: date || null, location: { page: 1, line: 4 } } : null },
      facts: {} };
  return limitation.runLimitationAssessment({ country: au ? 'AU' : 'GB', region,
    extraction: { reference_date: { normalized_value: '2026-01-01' }, records: [record] }, assessment_clock: CLOCK });
}

async function pay(t, actor) {
  const checkout = (await t.request('POST', '/api/billing/checkout',
    { token: actor.token, body: { plan_code: 'monthly' } })).json.checkout;
  await t.postEvent({ id: `test_evt_${crypto.randomBytes(8).toString('hex')}`,
    type: 'checkout.session.completed', account_reference: actor.account_id,
    plan_code: checkout.plan.plan_code, session_reference: checkout.provider_reference,
    amount_cents: checkout.plan.amount_cents, currency: checkout.plan.currency,
    occurred_at: new Date().toISOString() });
}

async function run(t, check) {
  for (const region of ['AU-ACT', 'AU-QLD', 'GB-ENG', 'GB-WLS', 'GB-NIR']) {
    check.equal(synthetic(region, '2020-10-06', true).summary.may_be_outside, 0,
      `${region}: the sixth anniversary is a benign boundary`);
    const beyond = synthetic(region, '2020-10-05', true);
    check.equal(beyond.summary.may_be_outside, 1, `${region}: the following day warrants verification`);
    check.ok(/NOT_LEGAL_ACCRUAL/.test(beyond.performed[0].start_date.selection_rule),
      `${region}: the printed date does not establish legal accrual`);
    check.equal(synthetic(region, '2020-10-05', false).summary.may_be_outside, 0,
      `${region}: an account without affirmative adverse evidence stays silent`);
    check.equal(synthetic(region, null, true).summary.may_be_outside, 0,
      `${region}: a missing printed date is not aged`);
  }
  check.equal(synthetic('AU-NSW', '2015-01-01', true).performed.length, 0,
    'an Australian region without an exact mapping gets no court-limit assessment');
  check.equal(synthetic('GB-SCT', '2005-01-01', true).performed.length, 0,
    'the England and Wales mapping does not extend to Scotland');

  const actor = await t.unpaidAccount('accrual-limit@example.test');
  await pay(t, actor);
  for (const region of ['AU-ACT', 'AU-QLD', 'GB-ENG', 'GB-WLS', 'GB-NIR']) {
    const country = region.slice(0, 2);
    const bytes = fs.readFileSync(PDF[country]);
    const created = await t.request('POST', '/api/cases', { token: actor.token, body: { country, region } });
    check.equal(created.status, 201, `${region}: the consumer chooses the exact jurisdiction`);
    const caseId = created.json.case.case_id;
    const upload = await t.request('POST', `/api/cases/${caseId}/files`, { token: actor.token,
      body: { originalFilename: 'public-structural-sample.pdf', declaredBytes: bytes.length,
        mimeType: 'application/pdf', contentBase64: bytes.toString('base64') } });
    check.equal(upload.status, 201, `${region}: the public specimen is read by its own format family`);
    const previousClock = process.env.CRP_ASSESSMENT_CLOCK_AT;
    process.env.CRP_ASSESSMENT_CLOCK_AT = '2026-10-06T12:00:00Z';
    try {
      check.equal((await t.request('POST', `/api/cases/${caseId}/evaluate`, { token: actor.token })).status,
        201, `${region}: the uploaded report is assessed`);
    } finally {
      if (previousClock === undefined) delete process.env.CRP_ASSESSMENT_CLOCK_AT;
      else process.env.CRP_ASSESSMENT_CLOCK_AT = previousClock;
    }
    const view = (await t.request('GET', `/api/cases/${caseId}`, { token: actor.token })).json.view;
    const item = view.result.issues.find((issue) => issue.limitation_concern === true);
    check.ok(item, `${region}: the consumer sees a timing-verification issue`);
    check.ok(item && /does not establish when that right arose or the final court deadline/.test(item.explanation),
      `${region}: the explanation does not treat a report date as accrual`);
    check.equal(item.consumer_label, 'INFORMATION', `${region}: court timing is information only`);
    check.equal(item.eligible, false, `${region}: court timing cannot enter packets`);
    check.equal(item.request_wording, null, `${region}: no request for court facts`);
    check.equal(item.request_type, null, `${region}: no bureau request`);
    const persisted = t.service.store.state().results.filter((row) => row.case_id === caseId).at(-1);
    const assessed = persisted.evaluation.limitation_assessment.performed
      .find((row) => row.record_index === item.account_number_in_report);
    check.ok(assessed && assessed.start_date.location && assessed.start_date.location.page,
      `${region}: the issue remains associated with its located printed date`);
    const refused = await t.request('POST', `/api/cases/${caseId}/packet/select`,
      { token: actor.token, body: { issue_ids: [item.issue_id] } });
    check.ok([400,409].includes(refused.status), `${region}: the server refuses court information in packets`);
  }
  return { exact_regions: ['AU-ACT', 'AU-QLD', 'GB-ENG', 'GB-WLS', 'GB-NIR'], public_samples_only: true };
}

module.exports = { run, id: 'cv-accrual-limitation-delivery',
  title: 'Informational court limits from AU and GB public reports, excluded from packets' };
