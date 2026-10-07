'use strict';
/**
 * bi-us-ca-tax-lien.cjs — historical paid-tax-lien arithmetic and current checklist scope.
 * The source date remains extractable, while this independent public-record statutory adapter
 * is absent from runtime assessment and consumer results.
 */
const ruleAdapters = require('../../../adapters/rule-adapters.cjs');
const formats = require('../../formats.cjs');
const { makeSyntheticModel } = require('../../../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');
const { buildPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');

const ADAPTER = 'US-CA-CCRAA-1785-13-A-4-TAX-LIEN-PAID-7Y';
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

async function run(t, check) {
  const evidence = {};

  /* 1. Positive: a paid tax lien > 7 years derives an internal VIOLATION. */
  const breach = engineRun({ 'publicRecord.taxLienPaidDate': '2018-01-01' });
  check.equal(breach.state, 'EVALUATED', 'the rule evaluates');
  check.equal(breach.outcome, 'PERIOD_EXCEEDED', '>7y is PERIOD_EXCEEDED');
  check.equal(breach.finding && breach.finding.classification, 'VIOLATION', 'a paid tax lien >7y derives an internal VIOLATION');
  check.equal(breach.finding && breach.finding.source_version, SOURCE_DIGEST, 'the finding binds to the corrected rules.ca.ts digest');

  /* 2. Below-limit: a paid tax lien within 7 years is not a finding. */
  const below = engineRun({ 'publicRecord.taxLienPaidDate': '2023-01-01' });
  check.equal(below.outcome, 'PERIOD_NOT_EXCEEDED', '<7y is PERIOD_NOT_EXCEEDED');
  check.equal(below.finding, null, 'a paid tax lien within 7 years is not a finding');

  /* 3. Boundary: exactly seven years is not "more than seven years". */
  const boundary = engineRun({ 'publicRecord.taxLienPaidDate': '2019-10-01' });
  check.equal(boundary.outcome, 'PERIOD_NOT_EXCEEDED', 'exactly seven years is not more than seven years');
  check.equal(boundary.finding, null, 'the exact boundary is not a finding');

  /* 4. Missing payment date → unresolved → no finding. */
  check.ok(!engineRun({}).finding, 'no payment date is not a finding');

  /* 5. Mismatched source evidence → no finding (the source value must match the predicate). */
  const mismatched = engineRun(
    { 'publicRecord.taxLienPaidDate': '2018-01-01' }, '2026-10-01', 'US-CA',
    { 'publicRecord.taxLienPaidDate': { raw_value: '2018-01-01', normalized_value: '2023-01-01', location: { page: 1, line: 1 } } }
  );
  check.equal(mismatched.finding, null, 'a mismatched source value is not a finding');

  /* 6. Extraction: an unpaid lien (filing-only date) is not a paid date; no paid date is manufactured. */
  const unpaid = formats.extractWithSharedAdapter(
    makeSyntheticModel({ pages: [['Experian  Consumer Credit Report', 'Report Date: 12 June 2026', 'Tax Lien  Filed 01/01/2018']] }),
    { mode: 'REPORT', country: 'US' }
  );
  check.equal(unpaid.records.some((r) => r.facts && r.facts['publicRecord.taxLienPaidDate']), false, 'a filing-only date is not a paid date');

  /* 7. End-to-end: fictional US-CA report with a paid tax lien >7y → upload → evaluate → Reporting issue. */
  const pdf = buildPdf({ pages: [{ lines: [
    'Experian  Consumer Credit Report', 'Report Date: June 12, 2026',
    'Tax Lien  Date Paid 01/01/2018'
  ] }] });
  const uploadBody = (bytes, filename) => ({ originalFilename: filename, declaredBytes: bytes.length, mimeType: 'application/pdf', contentBase64: bytes.toString('base64') });
  const owner = await t.account('usca-taxlien@example.test');
  const caseRow = (await t.request('POST', '/api/cases', { token: owner.token, body: { country: 'US', region: 'US-CA' } })).json.case;
  const uploaded = await t.request('POST', `/api/cases/${caseRow.case_id}/files`, { token: owner.token, body: uploadBody(pdf, 'usca-taxlien.pdf') });
  check.equal(uploaded.status, 201, 'a US-CA paid-tax-lien report uploads');
  await t.request('POST', `/api/cases/${caseRow.case_id}/evaluate`, { token: owner.token });
  const view = (await t.request('GET', `/api/cases/${caseRow.case_id}`, { token: owner.token })).json.view;
  const findings = (view.result.findings || []).concat(view.result.observations || []);
  const row = findings.find((o) => o.check_name && /1785\.13\(a\)\(4\)/.test(o.check_name));
  check.equal(row, undefined, 'the paid-tax-lien rule is retired from active common-error assessment');
  check.equal(findings.some((o) => o.rule_source_version === SOURCE_DIGEST), false,
    'the retired rule source does not enter consumer results');

  evidence.rule = 'paid-tax-lien date remains extractable, while the out-of-checklist adapter is absent from consumer results';
  return evidence;
}

module.exports = { run, id: 'bi-us-ca-tax-lien', title: 'California paid-tax-lien adapter is absent from active consumer results' };
