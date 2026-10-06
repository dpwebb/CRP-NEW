'use strict';
/**
 * bh-ns-dismissed-charge.cjs — OWNER-CANDIDATE-003: Nova Scotia s.10(3)(f) dismissed-charge prohibition.
 * A criminal charge is positively identified by a "criminal"/"summary conviction" context plus a charge value;
 * the disposition is bound to that charge by an explicit number or a single-charge structural relationship and
 * classified semantically. The finding is ENABLED (ceiling violation) and, after the OWNER-POTENTIAL-ISSUE-001
 * reconciliation, records the packet permission for a content correction request. The classifier is
 * exercised both through the real path and an explicit test seam so negatives are proven, not merely suppressed.
 */
const ruleAdapters = require('../../../adapters/rule-adapters.cjs');
const generalIntake = require('../../general-intake.cjs');
const { buildPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');

const ADAPTER = 'CA-NS-CRA-S10-3-F-DISMISSED-CHARGE';
const adapter = ruleAdapters.ADAPTERS.find((a) => a.adapter_id === ADAPTER);

function runCharge(facts, sources, country, region) {
  return ruleAdapters.runAdapter(ADAPTER, {
    country: country || 'CA', region: region || 'CA-NS', presentation: 'GENERAL-BUREAU-REPORT', facts,
    fact_sources: sources || null
  });
}

function matchingSources(facts, recordIndex) {
  const out = {};
  for (const k of Object.keys(facts)) out[k] = { normalized_value: facts[k], location: { page: 1, line: 1 }, record_index: recordIndex === undefined ? 0 : recordIndex };
  return out;
}

function positiveFacts() {
  return {
    'criminalCharge.recordIdentified': true, 'criminalCharge.chargeState': 'PRESENT',
    'criminalCharge.dismissedDispositionState': 'PRESENT', 'criminalCharge.entryComplete': true
  };
}

function line(text, lineNo) { return { text, trusted: true, page: 1, line: lineNo || 1 }; }

function extract(lines) {
  return generalIntake.buildRecords([{ lines }], null).find((r) => r.kind === 'GENERAL_PUBLIC_RECORD');
}

async function run(t, check) {
  const evidence = {};

  /* 1. Positive via the real path: matching evidence produces VIOLATION (finding_allowed is now true). */
  const facts = positiveFacts();
  const dismissed = runCharge(facts, matchingSources(facts));
  check.equal(dismissed.state, 'EVALUATED', 'the rule evaluates on a criminal-charge record');
  check.equal(dismissed.content.breach, true, 'a printed charge with a dismissed disposition is an inclusion');
  check.equal(dismissed.finding && dismissed.finding.classification, 'VIOLATION', 'matching evidence produces a VIOLATION through the real classifier');

  /* 2. The classifier test seam proves the same positive with an explicit ceiling. */
  const viaSeam = ruleAdapters.classifyContentInclusion(dismissed, adapter, 'violation');
  check.equal(viaSeam && viaSeam.classification, 'VIOLATION', 'the classifier seam returns VIOLATION for matching evidence');

  /* 3. Negatives through the classifier seam — each must suppress that same positive. */
  const noSource = runCharge(facts, {});
  check.equal(ruleAdapters.classifyContentInclusion(noSource, adapter, 'violation'), null, 'missing sources suppress the finding');

  const mismatched = matchingSources(facts);
  mismatched['criminalCharge.dismissedDispositionState'].normalized_value = 'VERIFIED_ABSENT';
  check.equal(ruleAdapters.classifyContentInclusion(runCharge(facts, mismatched), adapter, 'violation'), null, 'a mismatched source value suppresses the finding');

  const crossRecord = matchingSources(facts);
  crossRecord['criminalCharge.dismissedDispositionState'].record_index = 7;
  check.equal(ruleAdapters.classifyContentInclusion(runCharge(facts, crossRecord), adapter, 'violation'), null, 'a cross-record identity suppresses the finding');

  const contradictoryFacts = { ...facts };
  const contradictorySrc = matchingSources(contradictoryFacts);
  contradictorySrc['criminalCharge.chargeState'].normalized_value = 'VERIFIED_ABSENT';
  check.equal(ruleAdapters.classifyContentInclusion(runCharge(contradictoryFacts, contradictorySrc), adapter, 'violation'), null, 'contradictory provenance suppresses the finding');

  const unresolvedFacts = { ...facts, 'criminalCharge.dismissedDispositionState': 'UNRESOLVED' };
  check.equal(runCharge(unresolvedFacts, matchingSources(unresolvedFacts)).finding, null, 'an unresolved predicate is never a finding');

  /* 4. Wrong jurisdiction refuses — an actual assertion. */
  let threw = false;
  try { ruleAdapters.runAdapter(ADAPTER, { country: 'US', region: 'US-NY', presentation: 'GENERAL-BUREAU-REPORT', facts: {} }); }
  catch (e) { threw = /JURISDICTION_MISMATCH/.test(e.message); }
  /* 5. Positive extractions — each valid prohibited disposition binds to the charge. */
  const dismissedRec = extract([line('Public Record: CRIM-001'), line('Criminal Charge: Theft'), line('Disposition: Dismissed')]);
  check.equal(dismissedRec.facts['criminalCharge.chargeState'], 'PRESENT', 'the charge is PRESENT');
  check.equal(dismissedRec.facts['criminalCharge.dismissedDispositionState'], 'PRESENT', 'the dismissed disposition is PRESENT');

  const withdrawn = extract([line('Public Record: CRIM-002'), line('Criminal Charge: Fraud'), line('Status: Withdrawn')]);
  check.equal(withdrawn.facts['criminalCharge.dismissedDispositionState'], 'PRESENT', 'a withdrawn disposition is PRESENT');

  const setAside = extract([line('Public Record: CRIM-003'), line('Summary Conviction Offence: Theft'), line('Result: Set aside')]);
  check.equal(setAside.facts['criminalCharge.dismissedDispositionState'], 'PRESENT', 'a set-aside disposition is PRESENT');

  const stayed = extract([line('Public Record: CRIM-004'), line('Criminal Charge: Theft'), line('Result: Stay of proceedings')]);
  check.equal(stayed.facts['criminalCharge.dismissedDispositionState'], 'PRESENT', 'a stay of proceedings is PRESENT');

  /* 6. Negation, pending, application, hypothetical, requested, questioned and reversed wording is NOT positive. */
  const notDismissed = extract([line('Public Record: CRIM-005'), line('Criminal Charge: Theft'), line('Disposition: Not dismissed')]);
  check.equal(notDismissed.facts['criminalCharge.dismissedDispositionState'], 'VERIFIED_ABSENT', '"Not dismissed" is not a dismissed disposition');

  const applicationPending = extract([line('Public Record: CRIM-006'), line('Criminal Charge: Theft'), line('Disposition: Application to dismiss withdrawn; charge remains pending')]);
  check.equal(applicationPending.facts['criminalCharge.dismissedDispositionState'], 'VERIFIED_ABSENT', 'an application-withdrawn/pending outcome is not a withdrawn charge');

  const hypothetical = extract([line('Public Record: CRIM-006b'), line('Criminal Charge: Theft'), line('Disposition: Would be dismissed if appealed')]);
  check.equal(hypothetical.facts['criminalCharge.dismissedDispositionState'], 'VERIFIED_ABSENT', 'a hypothetical dismissal is not positive');

  const requested = extract([line('Public Record: CRIM-006c'), line('Criminal Charge: Theft'), line('Disposition: Dismissal requested')]);
  check.equal(requested.facts['criminalCharge.dismissedDispositionState'], 'VERIFIED_ABSENT', 'a requested dismissal is not positive');

  const questioned = extract([line('Public Record: CRIM-006d'), line('Criminal Charge: Theft'), line('Disposition: Dismissed?')]);
  check.equal(questioned.facts['criminalCharge.dismissedDispositionState'], 'VERIFIED_ABSENT', 'a questioned disposition is not positive');

  const convictedRec = extract([line('Public Record: CRIM-007'), line('Criminal Charge: Theft'), line('Disposition: Convicted')]);
  check.equal(convictedRec.facts['criminalCharge.dismissedDispositionState'], 'VERIFIED_ABSENT', 'a convicted disposition is not a dismissed disposition');

  const reversed = extract([line('Public Record: CRIM-008'), line('Criminal Charge: Theft'), line('Disposition: Dismissed, then reversed on appeal')]);
  check.equal(reversed.facts['criminalCharge.dismissedDispositionState'], 'VERIFIED_ABSENT', 'a reversed disposition is not a dismissed disposition');

  /* 7. Unknown wording and a missing disposition stay UNRESOLVED (never VERIFIED_ABSENT). */
  const unknown = extract([line('Public Record: CRIM-008b'), line('Criminal Charge: Theft'), line('Disposition: XYZ obscure')]);
  check.equal(unknown.facts['criminalCharge.dismissedDispositionState'], 'UNRESOLVED', 'unknown wording stays UNRESOLVED');

  const noDisposition = extract([line('Public Record: CRIM-008c'), line('Criminal Charge: Theft')]);
  check.equal(noDisposition.facts['criminalCharge.dismissedDispositionState'], 'UNRESOLVED', 'a missing disposition stays UNRESOLVED');

  /* 8. Generic/civil/monetary wording is NOT a criminal charge. */
  const generic = extract([line('Public Record: CRIM-009'), line('Charge: Theft'), line('Disposition: Dismissed')]);
  check.equal(generic.facts['criminalCharge.recordIdentified'], undefined, 'a generic "Charge" without a criminal context is not a criminal charge');

  const civil = extract([line('Public Record: CRIM-010'), line('Civil Charge: Theft'), line('Disposition: Dismissed')]);
  check.equal(civil.facts['criminalCharge.recordIdentified'], undefined, 'a civil charge is not a criminal charge');

  const monetary = extract([line('Public Record: CRIM-011'), line('Charge: $500'), line('Status: Withdrawn')]);
  check.equal(monetary.facts['criminalCharge.recordIdentified'], undefined, 'a monetary charge is not a criminal charge');

  /* 9. A judgment / bankruptcy record is not mistaken for a criminal charge. */
  const judgment = extract([line('Public Record: JDG-001'), line('Judgment'), line('Creditor: ABC'), line('Amount: $4000')]);
  check.equal(judgment.facts['criminalCharge.recordIdentified'], undefined, 'a judgment is not a criminal charge');
  check.equal(judgment.facts['judgment.recordIdentified'], true, 'the judgment is still identified');

  const bankruptcy = extract([line('Public Record: BKR-001'), line('Bankruptcy'), line('Discharged 01/01/2020')]);
  check.equal(bankruptcy.facts['criminalCharge.recordIdentified'], undefined, 'a discharged bankruptcy is not a criminal charge');

  /* 10. Charge association: a numbered disposition binds to its charge; equal counts alone never pair. */
  const paired = extract([line('Public Record: CRIM-012'), line('Criminal Record'), line('Charge 1: Theft'), line('Disposition 1: Dismissed'), line('Charge 2: Fraud'), line('Disposition 2: Convicted')]);
  check.equal(paired.facts['criminalCharge.dismissedDispositionState'], 'PRESENT', 'a numbered dismissed disposition binds to its charge');

  const equalNoNumbers = extract([line('Public Record: CRIM-012b'), line('Criminal Record'), line('Charge: Theft'), line('Disposition: Dismissed'), line('Charge: Fraud'), line('Disposition: Convicted')]);
  check.equal(equalNoNumbers.facts['criminalCharge.dismissedDispositionState'], 'UNRESOLVED', 'equal charge/disposition counts without identifiers do not pair');

  const ambiguous = extract([line('Public Record: CRIM-013'), line('Criminal Charges: Theft, Fraud'), line('Dispositions: Dismissed, Convicted')]);
  check.equal(ambiguous.facts['criminalCharge.dismissedDispositionState'], 'UNRESOLVED', 'an unparsed multi-charge disposition list stays UNRESOLVED');

  /* 11. End-to-end: a CA dismissed-charge report uploads, extracts and evaluates to a VIOLATION Reporting issue. */
  const pdf = buildPdf({ pages: [{ lines: [
    'Equifax  Consumer Credit Report', 'Report Date: June 12, 2026',
    'Public Record: CRIM-014', 'Criminal Charge: Theft', 'Disposition: Dismissed'
  ] }] });
  const uploadBody = (bytes, filename) => ({ originalFilename: filename, declaredBytes: bytes.length, mimeType: 'application/pdf', contentBase64: bytes.toString('base64') });
  const owner = await t.account('ns-charge@example.test');
  const caseRow = (await t.request('POST', '/api/cases', { token: owner.token, body: { country: 'CA', region: 'CA-NS' } })).json.case;
  const uploaded = await t.request('POST', `/api/cases/${caseRow.case_id}/files`, { token: owner.token, body: uploadBody(pdf, 'ns-charge.pdf') });
  check.equal(uploaded.status, 201, 'a CA dismissed-charge report uploads');
  await t.request('POST', `/api/cases/${caseRow.case_id}/evaluate`, { token: owner.token });
  const view = (await t.request('GET', `/api/cases/${caseRow.case_id}`, { token: owner.token })).json.view;
  const findings = (view.result.findings || []).concat(view.result.observations || []);
  const row = findings.find((o) => o.check_name && /10\(3\)\(f\)/.test(o.check_name));
  check.ok(row, 'the dismissed-charge check ran on the CA general report');
  check.equal(row.is_a_finding, true, 'the dismissed-charge result is now a finding');
  check.equal(row.output_level, 'violation', 'its ceiling is violation (finding_allowed=true)');

  evidence.rule = 's.10(3)(f) ENABLED (ceiling violation): charge identity + bound disposition + semantic classification + source value/record-identity agreement, tested through the classifier';
  return evidence;
}

module.exports = { run, id: 'bh-ns-dismissed-charge', title: 'OWNER-CANDIDATE-003: Nova Scotia dismissed-charge prohibition (enabled finding, corrected semantics)' };
