'use strict';
/**
 * bk-us-ca-adverse-rating.cjs — OWNER-CANDIDATE-007 (B): California residual adverse-information obsolescence,
 * Civ. Code § 1785.13(a)(8). Verifies the FINDING is measured from the adverse rating's own date (event-date
 * timing, NO 180-day offset) and that collection/charge-off accounts defer to the (a)(5) collection branch.
 */
const ruleAdapters = require('../../../adapters/rule-adapters.cjs');
const applicability = require('../../applicability.cjs');
const formats = require('../../formats.cjs');
const { makeSyntheticModel } = require('../../../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');
const { buildPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');

const ADAPTER = 'US-CA-CCRAA-1785-13-A-8-ADVERSE-7Y';
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
        uncertainty: { status: 'RESOLVED', reason: null, precision: 'MONTH' }
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

  /* 1. FAIL CLOSED: the adapter computes the period but emits NO finding (finding_allowed: false), even with
        source-linked facts and a period-exceeded anchor. Direct adapter invocation does NOT bypass the gate. */
  const breach = engineRun({ 'reportedAccount.adverseRatingDate': '2018-06', 'reportedAccount.adverseRatingDatePrecision': 'MONTH' });
  check.equal(breach.outcome, 'PERIOD_EXCEEDED', 'the period is still computed');
  check.equal(breach.finding, null, 'but no finding is emitted (fail closed)');
  check.equal(breach.finding_emitted, false, 'and finding_emitted is false');
  check.equal(breach.anchor && breach.anchor.anchor_day_offset, undefined, 'and no 180-day offset is applied');

  /* 2. Wrong jurisdiction still refuses. */
  let threw = false;
  try { ruleAdapters.runAdapter(ADAPTER, { country: 'US', region: 'US-NY', presentation: 'GENERAL-BUREAU-REPORT', facts: {} }); }
  catch (e) { threw = /JURISDICTION_MISMATCH/.test(e.message); }
  check.equal(threw, true, 'the rule runs US-CA only (wrong jurisdiction throws)');

  /* 3. Tri-state account/action context (the mandatory applicability gate). */
  const rule = { adapter_id: ADAPTER, applicability_rule: 'ADVERSE_RATING_ACTION_CONTEXT' };
  const ev = { evidence_readings: {} };
  const collectionRec = { kind: 'REPORTED_ACCOUNT', facts: { 'reportedAccount.accountActionContext': 'COLLECTION_OR_CHARGE_OFF' }, printed: { adverse_payment_rating_date: { status: 'RESOLVED' } } };
  check.equal(applicability.resolveApplicability(rule, ev, collectionRec).applicability, 'NOT_APPLICABLE',
    'established (b) context (collection/charge-off) defers to (a)(5)');
  const unknownRec = { kind: 'REPORTED_ACCOUNT', facts: {}, printed: { adverse_payment_rating_date: { status: 'RESOLVED' } } };
  check.equal(applicability.resolveApplicability(rule, ev, unknownRec).applicability, 'APPLICABILITY_UNRESOLVED',
    'unknown context (no collection wording) is unresolved — absence of labels is not proof (b) is inapplicable');
  const eventDateRec = { kind: 'REPORTED_ACCOUNT', facts: { 'reportedAccount.accountActionContext': 'EVENT_DATE_SUPPORTED' }, printed: { adverse_payment_rating_date: { status: 'RESOLVED' } } };
  check.equal(applicability.resolveApplicability(rule, ev, eventDateRec).applicability, 'APPLICABLE',
    'an admitted event-date context would be applicable (reserved; no extraction basis produces it)');

  /* 4. Extraction: a bare "days past due" annotation carries NO account/action context. */
  const plain = extract(['Experian  Consumer Credit Report', 'Report Date: 12 June 2026', 'Account 30 days past due as of Jun 2015']);
  const plainRec = plain.records.find((r) => r.facts && r.facts['reportedAccount.adverseRatingDate']);
  check.ok(plainRec, 'a "days past due" annotation on an account is read as an adverse rating');
  check.equal(plainRec && plainRec.facts['reportedAccount.adverseRatingDate'], '2015-06', 'with the rating month as the anchor');
  check.equal(plainRec && plainRec.facts['reportedAccount.accountActionContext'], undefined, 'and no account/action context (UNKNOWN)');

  /* 5. Extraction: a collection record carries the established (b) context. */
  const coll = extract(['Experian  Consumer Credit Report', 'Report Date: 12 June 2026', 'Collection 30 days past due as of Jun 2015']);
  const collRec = coll.records.find((r) => r.facts && r.facts['reportedAccount.adverseRatingDate']);
  check.ok(collRec, 'the collection account is still read');
  check.equal(collRec && collRec.facts['reportedAccount.accountActionContext'], 'COLLECTION_OR_CHARGE_OFF', 'and carries the established collection/charge-off context');

  /* 6. Refusal boundary: an unlabelled "similar action" (repossession/foreclosure/write-off) is NOT assigned the
        collection/charge-off meaning, so it stays UNKNOWN (no finding). */
  for (const word of ['Repossessed', 'Foreclosed', 'Written Off']) {
    const recs = extract(['Experian  Consumer Credit Report', 'Report Date: 12 June 2026', `Account ${word} 30 days past due as of Jun 2015`]);
    const rec = recs.records.find((r) => r.facts && r.facts['reportedAccount.adverseRatingDate']);
    check.ok(rec, `"${word}" is read as an adverse rating`);
    check.equal(rec && rec.facts['reportedAccount.accountActionContext'], undefined, `"${word}" is NOT assigned the collection/charge-off meaning`);
  }

  /* 7. Cross-account: each record keeps its own context — no cross-account borrowing. */
  const multi = extract([
    'Experian  Consumer Credit Report', 'Report Date: 12 June 2026',
    'Account 30 days past due as of Jun 2015',
    'Account 2 Collection 30 days past due as of Jan 2020'
  ]);
  const contexts = multi.records.map((r) => (r.facts && r.facts['reportedAccount.accountActionContext']) || 'UNKNOWN');
  check.deepEqual(contexts, ['UNKNOWN', 'COLLECTION_OR_CHARGE_OFF'], 'each account keeps its own action context (no cross-account borrowing)');

  /* 7b. Continuation-line boundary: collection wording on a separate line is NOT borrowed onto a following
         "days past due" account, so the adverse account stays UNKNOWN (no finding). */
  const cont = extract([
    'Experian  Consumer Credit Report', 'Report Date: 12 June 2026',
    'Collection Account 1234',
    'Account 30 days past due as of Jun 2015'
  ]);
  const contAdv = cont.records.find((r) => r.facts && r.facts['reportedAccount.adverseRatingDate']);
  check.ok(contAdv, 'the adverse account is still read');
  check.equal(contAdv && contAdv.facts['reportedAccount.accountActionContext'], undefined,
    'collection wording on a separate line does not lend its context to the adverse account');

  /* 7c. Contradictory action wording ("Collection" alongside "Open") is NOT an event-date context: it defers to
         (a)(5) as COLLECTION_OR_CHARGE_OFF, so no (a)(8) event-date finding can arise. */
  const contradict = extract(['Experian  Consumer Credit Report', 'Report Date: 12 June 2026', 'Account Collection Open 30 days past due as of Jun 2015']);
  const contradictRec = contradict.records.find((r) => r.facts && r.facts['reportedAccount.adverseRatingDate']);
  check.equal(contradictRec && contradictRec.facts['reportedAccount.accountActionContext'], 'COLLECTION_OR_CHARGE_OFF',
    'contradictory collection wording still defers to (a)(5), never event-date');

  /* 8. End-to-end: a bare "days past due" account has NO established event-date context, so the (a)(8) branch
        emits NO finding (unresolved, fail closed). */
  const pdf = buildPdf({ pages: [{ lines: [
    'Experian  Consumer Credit Report', 'Report Date: June 12, 2026',
    'Account  30 days past due as of Jun 2015'
  ] }] });
  const uploadBody = (bytes, filename) => ({ originalFilename: filename, declaredBytes: bytes.length, mimeType: 'application/pdf', contentBase64: bytes.toString('base64') });
  const owner = await t.account('usca-adverse@example.test');
  const caseRow = (await t.request('POST', '/api/cases', { token: owner.token, body: { country: 'US', region: 'US-CA' } })).json.case;
  const uploaded = await t.request('POST', `/api/cases/${caseRow.case_id}/files`, { token: owner.token, body: uploadBody(pdf, 'usca-adverse.pdf') });
  check.equal(uploaded.status, 201, 'a US-CA report uploads');
  await t.request('POST', `/api/cases/${caseRow.case_id}/evaluate`, { token: owner.token });
  const view = (await t.request('GET', `/api/cases/${caseRow.case_id}`, { token: owner.token })).json.view;
  const findings = (view.result.findings || []).concat(view.result.observations || []);
  const row = findings.find((o) => o.check_name && /1785\.13\(a\)\(8\)/.test(o.check_name));
  check.equal(row, undefined, 'the bare "days past due" account emits no (a)(8) finding (context unresolved, fail closed)');

  evidence.rule = 'US-CA Civ. Code § 1785.13(a)(8): FAIL CLOSED (no finding until an admitted event-date context or (b) delinquency-based timing is established); tri-state account/action context gate exercised';
  return evidence;
}

module.exports = { run, id: 'bk-us-ca-adverse-rating', title: 'OWNER-CANDIDATE-007 (B): California adverse-information obsolescence (fail closed, tri-state context)' };

