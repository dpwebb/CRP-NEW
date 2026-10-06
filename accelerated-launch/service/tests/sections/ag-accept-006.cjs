'use strict';
/**
 * ag-accept-006.cjs — OWNER-ACCEPT-007. Detected report information, kept separate from legal predicate
 * evaluation. The corrected medical proposition (third-party furnishing with consent; the consumer's own
 * disclosure is not restricted) and the source-evidence/context separation are what these tests verify — not
 * keyword detection alone.
 */

const formats = require('../../formats.cjs');
const evaluation = require('../../evaluation.cjs');
const results = require('../../results.cjs');
const { runDetectedReportInformation } = require('../../content-assessments.cjs');
const { makeSyntheticModel } = require('../../../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');

function runEngine(lines, country) {
  const model = makeSyntheticModel({ pages: [lines] });
  const ext = formats.extractWithSharedAdapter(model, { mode: 'REPORT', country: country || 'US' });
  const ev = evaluation.evaluateCase({ country: country || 'US', region: country === 'AU' ? 'AU-NSW' : 'US-NY', extraction: ext });
  return results.renderResultSet({ evaluation: ev, extraction: ext });
}
function byMarker(rendered, marker) {
  return (rendered.detected_report_information || []).find((c) => c.marker === marker);
}

async function run(t, check) {
  const evidence = {};

  /* Medical information is DETECTED, with the two provisions separated (not a universal consent-only rule). */
  const medical = runEngine(['Experian  Consumer Credit Report', 'Report Date: 12 June 2026', 'Account  Medical debt: $500 for a hospital visit']);
  const m = byMarker(medical, 'medical_information');
  check.equal(m.state, 'DETECTED', 'medical information is detected');
  check.equal(m.classification, null, 'and it is never a legal conclusion');
  check.equal(m.is_a_finding, false, 'and never a finding');
  check.equal(m.legal_dependencies.length, 2, 'the two medical provisions are kept separate, not conflated');
  check.ok(m.legal_dependencies.some((d) => /1681c\(a\)\(6\)/.test(d.citation)), '§ 1681c(a)(6) is recorded separately');
  check.ok(m.legal_dependencies.some((d) => /1681b\(g\)/.test(d.citation)), '§ 1681b(g) is recorded separately');
  check.ok(m.legal_dependencies.every((d) => d.off_report === true), 'both dependencies are off-report');
  check.equal(m.record_matches.length, 1, 'the medical marker is tied to its record content');
  check.equal(m.record_matches[0].context, 'record', 'and its context is record content, not boilerplate');

  /* A rights/notice line is boilerplate, not account content. */
  const notice = runEngine(['Experian  Consumer Credit Report', 'Report Date: 12 June 2026', 'Summary of Rights: you may dispute any inaccurate information']);
  const d = byMarker(notice, 'dispute');
  check.equal(d.state, 'NOT_DETECTED', 'the dispute marker regex does not fire on a generic rights notice');

  /* Non-qualifying: a clean report detects nothing. */
  const clean = runEngine(['Experian  Consumer Credit Report', 'Report Date: 12 June 2026', 'Account  Balance $100  Opened 01/01/2020']);
  check.equal(byMarker(clean, 'medical_information').state, 'NOT_DETECTED', 'a clean report detects no medical information');

  /* Absence of a keyword is not proof of absence: the plain text says so. */
  check.ok(/Absence of a keyword does not prove/.test(byMarker(clean, 'fraud_alert').detail), 'absence is not asserted as proof of breach');

  /* Detection is extraction and is country-agnostic; the legal dependency is US FCRA (informational). */
  const au = runEngine(['Equifax  Consumer Credit File', 'Report Date: 12 June 2026', 'Credit Provider X  Closed 15/03/2024'], 'AU');
  check.equal((au.detected_report_information || []).length, 4, 'detection still runs for an AU selection (it is extraction)');
  check.ok(/FCRA §|15 U.S.C/.test(byMarker(au, 'medical_information').legal_dependencies[0].citation), 'and its legal dependency names US FCRA (informational, not evaluated for AU)');

  /* The class is DETECTED_REPORT_INFORMATION, never CONTENT_ASSESSMENT. */
  check.equal(medical.assessment.kinds.includes('DETECTED_REPORT_INFORMATION'), true, 'the assessment kind is DETECTED_REPORT_INFORMATION');
  check.equal(medical.assessment.kinds.includes('CONTENT_ASSESSMENT'), false, 'and it is no longer labelled a CONTENT_ASSESSMENT');

  /* Direct module: an empty marker set reports NOT_DETECTED for every marker. */
  const direct = runDetectedReportInformation({ country: 'US', extraction: { admitted: true, content_markers: {} } });
  check.equal(direct.performed.length, 4, 'all four detected-information entries run on a read report');
  check.ok(direct.performed.every((c) => c.state === 'NOT_DETECTED'), 'an empty marker set detects nothing');

  evidence.medical_proposition = 'corrected consumer-versus-third-party medical proposition';
  evidence.source_evidence = 'markers carry record/boilerplate context and page/line';
  return evidence;
}

module.exports = { run, id: 'ag-accept-006', title: 'ACCEPT-007: detected report information is separate from legal predicate evaluation' };

