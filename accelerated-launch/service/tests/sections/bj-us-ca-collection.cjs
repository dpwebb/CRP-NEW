'use strict';
/**
 * bj-us-ca-collection.cjs — OWNER-CANDIDATE-006: California collection-account obsolescence, Civ. Code
 * § 1785.13(a)(5)+(b). Verifies the FINDING and the decisive-account-evidence guards (the delinquency anchor is
 * never substituted, and sale/transfer/placement never resets the start).
 */
const ruleAdapters = require('../../../adapters/rule-adapters.cjs');
const formats = require('../../formats.cjs');
const { makeSyntheticModel } = require('../../../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');
const { buildPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');

const ADAPTER = 'US-CA-CCRAA-1785-13-A-5-COLLECTION-7Y';
const SOURCE_DIGEST = '7DDBF5C4B4743367841128F7A5DD1B699617C6A4E7B567ACBAFDD8B84B681B80';

function engineRun(facts, referenceDate, region, sources) {
  const factSources = sources || {};
  if (!sources) {
    for (const field of Object.keys(facts || {})) {
      const raw = facts[field];
      factSources[field] = {
        raw_value: raw, normalized_value: raw,
        location: { page: 1, line: 1, section: 'synthetic declared fact', synthetic: true },
        normalization: { from: raw, to: raw },
        uncertainty: { status: 'RESOLVED', reason: null, precision: 'DAY' }
      };
    }
  }
  return ruleAdapters.runAdapter(ADAPTER, {
    country: 'US', region: region || 'US-CA', presentation: 'GENERAL-BUREAU-REPORT',
    facts, fact_sources: factSources, referenceDate: referenceDate || '2026-10-01'
  });
}

function extract(lines) {
  const model = makeSyntheticModel({ pages: [lines] });
  return formats.extractWithSharedAdapter(model, { mode: 'REPORT', country: 'US' });
}

async function run(t, check) {
  const evidence = {};

  /* 1. Positive: an eligible collection beyond 7 years after the 180-day start → internal VIOLATION. */
  const breach = engineRun({ 'collection.delinquencyDate': '2018-01-01' });
  check.equal(breach.outcome, 'PERIOD_EXCEEDED', '>7y after the 180-day start is PERIOD_EXCEEDED');
  check.equal(breach.finding && breach.finding.classification, 'VIOLATION', 'an eligible collection beyond the period derives an internal VIOLATION');
  check.equal(breach.finding && breach.finding.source_version, SOURCE_DIGEST, 'the finding binds to the corrected rules.ca.ts digest');

  /* 2. Below-limit and exact boundary → no finding. */
  check.equal(engineRun({ 'collection.delinquencyDate': '2023-01-01' }).finding, null, 'a collection within the period is not a finding');
  check.equal(engineRun({ 'collection.delinquencyDate': '2019-04-15' }, '2026-10-12').finding, null, 'exactly seven years after the 180-day start is not a finding');

  /* 3. Missing / mismatched provenance → no unsupported finding. */
  check.ok(!engineRun({}).finding, 'no delinquency date is not a finding');
  const mismatched = engineRun(
    { 'collection.delinquencyDate': '2018-01-01' }, '2026-10-01', 'US-CA',
    { 'collection.delinquencyDate': { raw_value: '2018-01-01', normalized_value: '2023-01-01', location: { page: 1, line: 1 } } }
  );
  check.equal(mismatched.finding, null, 'a mismatched source value is not a finding');

  /* 4. Extraction guards: collection-placement / opened dates are never the delinquency anchor. */
  const placedOnly = extract(['Experian  Consumer Credit Report', 'Report Date: 12 June 2026', 'Collection  Date Placed 01/01/2018']);
  check.equal(placedOnly.records.some((r) => r.facts && r.facts['collection.delinquencyDate']), false, 'a collection-placement date is not the delinquency');

  const openedOnly = extract(['Experian  Consumer Credit Report', 'Report Date: 12 June 2026', 'Collection  Date Opened 01/01/2018']);
  check.equal(openedOnly.records.some((r) => r.facts && r.facts['collection.delinquencyDate']), false, 'a collection-opening date is not the delinquency');

  /* 5. Only an explicit DATE relationship establishes the delinquency anchor; a generic label is rejected. */
  const dated = extract(['Experian  Consumer Credit Report', 'Report Date: 12 June 2026', 'Collection  Date of First Delinquency: 01/01/2018']);
  check.equal(dated.records.some((r) => r.facts && r.facts['collection.delinquencyDate'] === '2018-01-01'), true, 'an explicit "Date of First Delinquency" on a collection record establishes the anchor');

  const genericDelinquency = extract(['Experian  Consumer Credit Report', 'Report Date: 12 June 2026', 'Collection  Delinquency: 01/01/2018']);
  check.equal(genericDelinquency.records.some((r) => r.facts && r.facts['collection.delinquencyDate']), false, 'a generic "Delinquency" label without an explicit date relationship stays unresolved');

  /* The architect-reproduced false positive: an unrelated "Update Date" must not satisfy the date gate. */
  const updateDateDecoy = extract(['Experian  Consumer Credit Report', 'Report Date: 12 June 2026', 'Collection  Delinquency: 01/01/2018  Update Date: 01/01/2025']);
  check.equal(updateDateDecoy.records.some((r) => r.facts && r.facts['collection.delinquencyDate']), false, 'an unrelated "Update Date" never satisfies the delinquency-date relationship');

  const dateDelinquent = extract(['Experian  Consumer Credit Report', 'Report Date: 12 June 2026', 'Collection  Date Delinquent 01/01/2022']);
  check.equal(dateDelinquent.records.some((r) => r.facts && r.facts['collection.delinquencyDate']), false, '"Date Delinquent" without the first-delinquency meaning stays unresolved');

  const dofd = extract(['Experian  Consumer Credit Report', 'Report Date: 12 June 2026', 'Collection  DOFD: 01/01/2018']);
  check.equal(dofd.records.some((r) => r.facts && r.facts['collection.delinquencyDate'] === '2018-01-01'), true, 'an explicit "DOFD" abbreviation establishes the first-delinquency anchor');

  const chargeOffOnly = extract(['Experian  Consumer Credit Report', 'Report Date: 12 June 2026', 'Charge-Off  Date of First Delinquency: 01/01/2018']);
  check.equal(chargeOffOnly.records.some((r) => r.facts && r.facts['collection.delinquencyDate'] === '2018-01-01'), true, 'a charge-off-only record with an explicit first-delinquency date establishes the anchor');

  const contradictory = extract(['Experian  Consumer Credit Report', 'Report Date: 12 June 2026', 'Collection  Date of First Delinquency: 01/01/2018, Date of First Delinquency 02/02/2020']);
  check.equal(contradictory.records.some((r) => r.facts && r.facts['collection.delinquencyDate']), false, 'two incompatible delinquency dates (cure/re-delinquency ambiguity) are withheld');

  /* 6. Multiple qualifying actions share the first delinquency; multiple accounts and a transfer keep their own. */
  const multiAction = extract([
    'Experian  Consumer Credit Report', 'Report Date: 12 June 2026',
    'Collection  Date of First Delinquency: 01/01/2018  Placed for Collection 01/01/2019  Charged Off 01/01/2020'
  ]);
  check.equal(multiAction.records.some((r) => r.facts && r.facts['collection.delinquencyDate'] === '2018-01-01'), true, 'the delinquency, not the later collection/charge-off action, is the anchor');

  const multi = extract([
    'Experian  Consumer Credit Report', 'Report Date: 12 June 2026',
    'Account 1  Collection  Date of First Delinquency: 01/01/2018',
    'Account 2  Collection  Date of First Delinquency: 01/01/2023  Transferred 01/01/2025'
  ]);
  const delinquencies = multi.records.filter((r) => r.facts && r.facts['collection.delinquencyDate']).map((r) => r.facts['collection.delinquencyDate']);
  check.ok(delinquencies.includes('2018-01-01') && delinquencies.includes('2023-01-01'), 'each account retains its own delinquency; a transfer does not reset the original');

  /* 7. Wrong jurisdiction refuses. */
  let threw = false;
  try { ruleAdapters.runAdapter(ADAPTER, { country: 'US', region: 'US-NY', presentation: 'GENERAL-BUREAU-REPORT', facts: {} }); }
  catch (e) { threw = /JURISDICTION_MISMATCH/.test(e.message); }
  check.equal(threw, true, 'the rule runs US-CA only (wrong jurisdiction throws)');
  /* 8. End-to-end: a fictional US-CA collection beyond the period → Reporting issue. */
  const pdf = buildPdf({ pages: [{ lines: [
    'Experian  Consumer Credit Report', 'Report Date: June 12, 2026',
    'Collection  Date of First Delinquency: 01/01/2018'
  ] }] });
  const uploadBody = (bytes, filename) => ({ originalFilename: filename, declaredBytes: bytes.length, mimeType: 'application/pdf', contentBase64: bytes.toString('base64') });
  const owner = await t.account('usca-collection@example.test');
  const caseRow = (await t.request('POST', '/api/cases', { token: owner.token, body: { country: 'US', region: 'US-CA' } })).json.case;
  const uploaded = await t.request('POST', `/api/cases/${caseRow.case_id}/files`, { token: owner.token, body: uploadBody(pdf, 'usca-collection.pdf') });
  check.equal(uploaded.status, 201, 'a US-CA collection report uploads');
  await t.request('POST', `/api/cases/${caseRow.case_id}/evaluate`, { token: owner.token });
  const view = (await t.request('GET', `/api/cases/${caseRow.case_id}`, { token: owner.token })).json.view;
  const findings = (view.result.findings || []).concat(view.result.observations || []);
  const row = findings.find((o) => o.check_name && /1785\.13\(a\)\(5\)/.test(o.check_name));
  check.ok(row, 'the collection check ran on the US-CA report');
  check.equal(row.is_a_finding, true, 'the collection result is a finding');
  check.equal(row.consumer_label, 'Reporting issue', 'its consumer label is "Reporting issue"');
  check.equal(row.rule_source_version, SOURCE_DIGEST, 'the consumer result carries the corrected source digest');
  check.ok(row.rule_source && row.rule_source.raw_value, 'the consumer result carries the delinquency source evidence');

  /* 8b. Charge-off-only consumer output: an explicit first-delinquency date on a charge-off record reaches the same finding. */
  const coPdf = buildPdf({ pages: [{ lines: [
    'Experian  Consumer Credit Report', 'Report Date: June 12, 2026',
    'Charge-Off  Date of First Delinquency: 01/01/2018'
  ] }] });
  const coCase = (await t.request('POST', '/api/cases', { token: owner.token, body: { country: 'US', region: 'US-CA' } })).json.case;
  await t.request('POST', `/api/cases/${coCase.case_id}/files`, { token: owner.token, body: uploadBody(coPdf, 'usca-chargeoff.pdf') });
  await t.request('POST', `/api/cases/${coCase.case_id}/evaluate`, { token: owner.token });
  const coView = (await t.request('GET', `/api/cases/${coCase.case_id}`, { token: owner.token })).json.view;
  const coFindings = (coView.result.findings || []).concat(coView.result.observations || []);
  const coRow = coFindings.find((o) => o.check_name && /1785\.13\(a\)\(5\)/.test(o.check_name));
  check.ok(coRow && coRow.is_a_finding === true, 'a charge-off-only record with an explicit first-delinquency date reaches the same finding');
  check.equal(coRow.consumer_label, 'Reporting issue', 'its consumer label is "Reporting issue"');

  evidence.rule = 'US-CA Civ. Code § 1785.13(a)(5)+(b) collection 7y: internal VIOLATION + consumer Reporting issue, with delinquency-anchor and account-identity guards';
  return evidence;
}

module.exports = { run, id: 'bj-us-ca-collection', title: 'OWNER-CANDIDATE-006: California collection-account obsolescence (finding verified)' };

