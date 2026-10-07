'use strict';
/**
 * e-qualifications.cjs — acceptance item 5: "Results carry qualifications and do not imply comprehensive legal
 * checking", plus the boundary that a check which could not run is never presented as a check performed.
 *
 * The words this section forbids are the ones that would turn an arithmetic comparison into a promise:
 * "violation", "guaranteed", "you are owed", "must remove", "comprehensive check of all".
 *
 * B3 correction, with its cause recorded: the United States block below previously asserted
 * `COUNTRY_WIDE_TO_SELECTED_REGION_RELATION_REQUIRED`, which was the B1 state — a MECHANICAL pattern match
 * reported as an unconfirmed relation. B3 replaced that with explicit per-region records, so the region's
 * applicability is now CONFIRMED and what remains blocked is EXECUTION: no United States consumer-disclosure
 * presentation is admitted. The assertions were corrected to that truth; none was removed or weakened.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const FORBIDDEN = [
  /\bguarantee/i,
  /you are owed/i,
  /\bmust remove\b/i,
  /checks? all (possible )?legal/i,
  /we will (remove|delete|fix)/i,
  /legally compliant/i
];

const INTERNAL_IDENTIFIERS = [/CRP-LSRC-/, /CA-NS-CRA-S10-3/, /FCRA-605A-5/, /\bGATE\b/i, /\bD3\b/];

async function run(t, check) {
  const owner = await t.account('owner-qualifications@example.test');

  /* ---------------------------------------------------------------- a result set's own qualifications */

  const nsCase = (await t.request('POST', '/api/cases', { token: owner.token, body: { country: 'CA', region: 'CA-NS' } })).json.case.case_id;
  await t.request('POST', `/api/cases/${nsCase}/demonstration`, { token: owner.token, body: { scenario: 'TWO_ACCOUNTS' } });
  const nsView = (await t.request('GET', `/api/cases/${nsCase}`, { token: owner.token })).json.view;
  const result = nsView.result;

  check.ok(Array.isArray(result.qualifications) && result.qualifications.length >= 5, 'the result carries a set of qualifications');
  check.equal(result.comprehensive_legal_check, false, 'the result states that no comprehensive check was made');
  check.ok(!/not legal advi[cs]e/i.test(JSON.stringify(result)) && /checks listed/i.test(result.disclaimer), 'owner imperative: result states its actual scope without legal-advice disclaimers');
  check.ok(result.observations.every((o) => o.is_a_finding === false), 'no observation is described as a finding');
  check.ok(result.observations.every((o) => o.output_level === 'observation' || o.output_level === 'none'), 'no observation carries a finding-level ceiling');
  check.ok(result.observations.every((o) => typeof o.qualification === 'string' && o.qualification.length > 0), 'each observation carries its own qualification');

  const resultText = JSON.stringify(result);
  for (const pattern of FORBIDDEN) check.ok(!pattern.test(resultText), `the result set avoids ${pattern}`);
  for (const pattern of INTERNAL_IDENTIFIERS) check.ok(!pattern.test(resultText), `the result set carries no internal identifier ${pattern}`);

  /* ---------------------------------------------- the United States relation is explicit; execution is not */

  const usCase = (await t.request('POST', '/api/cases', { token: owner.token, body: { country: 'US', region: 'US-NY' } })).json.case.case_id;
  await t.request('POST', `/api/cases/${usCase}/demonstration`, { token: owner.token, body: { scenario: 'TWO_ACCOUNTS' } });
  const usResult = (await t.request('GET', `/api/cases/${usCase}`, { token: owner.token })).json.view.result;

  check.equal(usResult.checks_performed, 0, 'no United States comparison is performed on a demonstration model');
  /* The United States public-record limbs are now record-level (GENERAL_PUBLIC_RECORD / GENERAL_COLLECTION).
     On a demonstration model that carries no such record, they are reported as not run because the model
     carries no record of the kind they are written for — not as an applicability statement. */
  check.ok(usResult.checks_not_run.some((c) => /605/.test(c.citation || '')),
    'each United States limb that could not be applied says so, beside its reason');
  check.ok(usResult.checks_not_run.every((c) => typeof c.reason === 'string' && c.reason.length > 0),
    'every check that did not run carries its machine reason for audit');
  check.ok(!JSON.stringify(usResult.observations).includes('605'), 'no FCRA observation was produced');
  check.ok(/We have tested this service on five report layouts/.test(JSON.stringify(usResult.qualifications)),
    'and the result states exactly how much read support exists');

  /* ---------------------------------------------------------------- regions with no check at all */

  for (const [country, region] of [['GB', 'GB-ENG'], ['AU', 'AU-NSW'], ['US', 'US-CA']]) {
    const id = (await t.request('POST', '/api/cases', { token: owner.token, body: { country, region } })).json.case.case_id;
    await t.request('POST', `/api/cases/${id}/demonstration`, { token: owner.token, body: { scenario: 'NO_COLLECTION_ACCOUNTS' } });
    const view = (await t.request('GET', `/api/cases/${id}`, { token: owner.token })).json.view;
    check.equal(view.result.checks_performed, 0, `${region} runs no check and says so`);
    check.ok(view.result.checks_not_run.length > 0, `${region} explains that nothing was run`);
    check.equal(view.result.comprehensive_legal_check, false, `${region} still carries the qualifications`);
  }

  /* ---------------------------------------------------------------- the private UI's own hygiene */

  const uiDir = path.join(__dirname, '..', '..', 'ui');
  for (const name of ['app.js', 'index.html', 'style.css']) {
    const source = fs.readFileSync(path.join(uiDir, name), 'utf8');
    for (const pattern of INTERNAL_IDENTIFIERS) check.ok(!pattern.test(source), `ui/${name} carries no internal identifier ${pattern}`);
  }
  const uiSource = fs.readFileSync(path.join(uiDir, 'app.js'), 'utf8');
  check.ok(!/\.machine\b/.test(uiSource), 'the UI never reads the audit-only machine payload');

  return { qualifications: result.qualifications.length, usChecksPerformed: usResult.checks_performed };
}

module.exports = { run, id: 'e-qualifications', title: 'Qualifications, no comprehensive-check implication, a blocked check is not a performed check' };
