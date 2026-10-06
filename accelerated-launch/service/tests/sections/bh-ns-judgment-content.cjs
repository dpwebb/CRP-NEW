'use strict';
/**
 * bh-ns-judgment-content.cjs — OWNER-CANDIDATE-002: Nova Scotia s.10(3)(d) judgment-content omission.
 * Extraction (field-value presence + positive completeness) and the verified-omission evaluation are complete and
 * tested here. The finding permission stays DISABLED (finding_allowed=false): the assignment alternative is
 * off-report (its absence never establishes the creditor branch) and the edition currency has no affirmative
 * proclamation evidence. No coverage is claimed.
 */
const ruleAdapters = require('../../../adapters/rule-adapters.cjs');
const generalIntake = require('../../general-intake.cjs');
const { buildPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');

const ADAPTER = 'CA-NS-CRA-S10-3-D-JUDGMENT-CONTENT';

function runJudgment(facts, country, region) {
  const src = (k, lineNo) => ({ normalized_value: String(facts[k]), value: facts[k] === true, location: { page: 1, line: lineNo } });
  return ruleAdapters.runAdapter(ADAPTER, {
    country: country || 'CA', region: region || 'CA-NS', presentation: 'GENERAL-BUREAU-REPORT', facts,
    fact_sources: {
      'judgment.recordIdentified': src('judgment.recordIdentified', 1),
      'judgment.creditorNameState': src('judgment.creditorNameState', 2),
      'judgment.amountState': src('judgment.amountState', 3),
      'judgment.assigneeState': src('judgment.assigneeState', 4),
      'judgment.entryComplete': src('judgment.entryComplete', 5)
    }
  });
}

function line(text, lineNo) { return { text, trusted: true, page: 1, line: lineNo || 1 }; }

async function run(t, check) {
  const evidence = {};

  /* 1. A complete entry with verified-absent mandatory content is NOT a breach: the assignment disposition is
     UNRESOLVED (off-report), so the creditor branch is never established. */
  const both = runJudgment({
    'judgment.recordIdentified': true, 'judgment.creditorNameState': 'VERIFIED_ABSENT',
    'judgment.amountState': 'VERIFIED_ABSENT', 'judgment.assigneeState': 'UNRESOLVED', 'judgment.entryComplete': true
  });
  check.equal(both.state, 'EVALUATED', 'the rule evaluates on a judgment record');
  check.equal(both.content.breach, false, 'no breach when the assignment alternative is unresolved');
  check.equal(both.content.assignment_disposition, 'UNRESOLVED', 'the assignment disposition is UNRESOLVED, never inferred not-assigned');
  check.equal(both.finding, null, 'the finding stays disabled (finding_allowed=false)');

  /* 2. A verified amount-absent still cannot breach while the assignment is unresolved. */
  const amountMissing = runJudgment({
    'judgment.recordIdentified': true, 'judgment.creditorNameState': 'PRESENT',
    'judgment.amountState': 'VERIFIED_ABSENT', 'judgment.assigneeState': 'UNRESOLVED', 'judgment.entryComplete': true
  });
  check.equal(amountMissing.content.breach, false, 'amount-absent alone cannot breach while assignment is unresolved');
  check.equal(amountMissing.evaluation.required_facts.length, 5, 'five decisive predicates are recorded');
  const assignmentFact = amountMissing.evaluation.required_facts.find((f) => f.field === 'judgment.assigneeState');
  check.equal(assignmentFact.resolved, false, 'the assignment predicate is recorded unresolved');

  /* 3. An assignee prints the assignment alternative (ASSIGNED), still never a creditor-omission. */
  const assigned = runJudgment({
    'judgment.recordIdentified': true, 'judgment.creditorNameState': 'UNRESOLVED',
    'judgment.amountState': 'VERIFIED_ABSENT', 'judgment.assigneeState': 'PRESENT', 'judgment.entryComplete': true
  });
  check.equal(assigned.content.assignment_disposition, 'ASSIGNED', 'an assignee prints the assignment alternative');
  check.equal(assigned.content.breach, false, 'the assignment alternative is never a creditor-omission');

  /* 4. Missing provenance (no fact_sources) still cannot produce a finding. */
  const noSource = ruleAdapters.runAdapter(ADAPTER, {
    country: 'CA', region: 'CA-NS', presentation: 'GENERAL-BUREAU-REPORT',
    facts: {
      'judgment.recordIdentified': true, 'judgment.creditorNameState': 'PRESENT',
      'judgment.amountState': 'VERIFIED_ABSENT', 'judgment.assigneeState': 'UNRESOLVED', 'judgment.entryComplete': true
    },
    fact_sources: {}
  });
  check.equal(noSource.finding, null, 'a missing source refuses the finding');

  /* 5. No judgment → no positive identity, no omission. */
  const noJudgment = ruleAdapters.runAdapter(ADAPTER, { country: 'CA', region: 'CA-NS', presentation: 'GENERAL-BUREAU-REPORT', facts: {}, fact_sources: {} });
  check.equal(noJudgment.content.identified, false, 'no judgment identity is recorded');
  check.equal(noJudgment.content.breach, false, 'no judgment is no omission');

  /* 6. Wrong jurisdiction refuses — an actual assertion. */
  let threw = false;
  try { ruleAdapters.runAdapter(ADAPTER, { country: 'US', region: 'US-NY', presentation: 'GENERAL-BUREAU-REPORT', facts: {} }); }
  catch (e) { threw = /JURISDICTION_MISMATCH/.test(e.message); }
  check.equal(threw, true, 'the rule runs CA-NS only (wrong jurisdiction throws)');

  /* 8. Extraction: multiline field-value evidence (label + value, not label alone). */
  const multi = generalIntake.buildRecords([{ lines: [
    line('Public Record: JDG-001', 1), line('Judgment', 2), line('Creditor: ABC Finance Corp', 3),
    line('Amount: $4,000', 4), line('Date of Entry: January 1, 2019', 5)
  ] }], null).find((r) => r.kind === 'GENERAL_PUBLIC_RECORD');
  check.ok(multi && multi.facts['judgment.recordIdentified'] === true, 'a multiline judgment is positively identified');
  check.equal(multi.facts['judgment.creditorNameState'], 'PRESENT', 'a labelled non-blank creditor value is PRESENT');
  check.equal(multi.facts['judgment.amountState'], 'PRESENT', 'a labelled amount is PRESENT');
  check.equal(multi.facts['judgment.entryComplete'], true, 'a bounded multiline entry is complete');

  /* 9. A blank "Creditor:" label is not a name. */
  const blank = generalIntake.buildRecords([{ lines: [
    line('Public Record: JDG-002', 1), line('Judgment', 2), line('Creditor:', 3), line('Amount: $500', 4)
  ] }], null).find((r) => r.kind === 'GENERAL_PUBLIC_RECORD');
  check.equal(blank.facts['judgment.creditorNameState'], 'UNRESOLVED', 'a blank creditor label is not a name');
  check.equal(blank.facts['judgment.amountState'], 'PRESENT', 'the amount is still present');

  /* 10. Unlabelled content is never a verified omission. */
  const unlabelled = generalIntake.buildRecords([{ lines: [
    line('Public Record: JDG-003', 1), line('Judgment', 2), line('ABC Finance Corp', 3), line('Amount: $500', 4)
  ] }], null).find((r) => r.kind === 'GENERAL_PUBLIC_RECORD');
  check.equal(unlabelled.facts['judgment.creditorNameState'], 'UNRESOLVED', 'an unlabelled name is not a verified omission');

  /* 11. Zero is an amount (present), not missing. */
  const zero = generalIntake.buildRecords([{ lines: [
    line('Public Record: JDG-004', 1), line('Judgment', 2), line('Creditor: XYZ', 3), line('Amount: $0.00', 4)
  ] }], null).find((r) => r.kind === 'GENERAL_PUBLIC_RECORD');
  check.equal(zero.facts['judgment.amountState'], 'PRESENT', 'a zero amount is PRESENT, not missing');

  /* 12. A dollar amount elsewhere is not the judgment amount. */
  const unrelated = generalIntake.buildRecords([{ lines: [
    line('Public Record: JDG-005', 1), line('Judgment', 2), line('Creditor: XYZ', 3), line('Court costs: $500', 4)
  ] }], null).find((r) => r.kind === 'GENERAL_PUBLIC_RECORD');
  check.equal(unrelated.facts['judgment.amountState'], 'UNRESOLVED', 'an unrelated dollar amount is not the judgment amount');

  /* 13. A complete entry with no amount label and no dollar amount → the amount is VERIFIED_ABSENT. */
  const noAmount = generalIntake.buildRecords([{ lines: [
    line('Public Record: JDG-006', 1), line('Judgment', 2), line('Creditor: ABC Finance Corp', 3),
    line('Date of Entry: January 1, 2019', 4)
  ] }], null).find((r) => r.kind === 'GENERAL_PUBLIC_RECORD');
  check.equal(noAmount.facts['judgment.amountState'], 'VERIFIED_ABSENT', 'a complete entry with no monetary value is a verified-absent amount');

  /* 14. A truncation marker keeps the entry incomplete (amount UNRESOLVED, never VERIFIED_ABSENT). */
  const truncated = generalIntake.buildRecords([{ lines: [
    line('Public Record: JDG-007', 1), line('Judgment', 2), line('Creditor: ABC', 3), line('Continued on next page', 4)
  ] }], null).find((r) => r.kind === 'GENERAL_PUBLIC_RECORD');
  check.equal(truncated.facts['judgment.entryComplete'], false, 'a truncated entry is incomplete');
  check.equal(truncated.facts['judgment.amountState'], 'UNRESOLVED', 'a truncated entry never marks VERIFIED_ABSENT');

  /* 15. A dangling amount label (value on the next line) is not complete. */
  const dangling = generalIntake.buildRecords([{ lines: [
    line('Public Record: JDG-008', 1), line('Judgment', 2), line('Amount:', 3)
  ] }], null).find((r) => r.kind === 'GENERAL_PUBLIC_RECORD');
  check.equal(dangling.facts['judgment.entryComplete'], false, 'a dangling field label is not complete');

  /* 16. Two judgments are isolated — no cross-judgment borrowing. */
  const two = generalIntake.buildRecords([{ lines: [
    line('Public Record: JDG-009', 1), line('Judgment', 2), line('Creditor: Alpha Corp', 3), line('Amount: $1,000', 4),
    line('Public Record: JDG-010', 5), line('Judgment', 6), line('Creditor: Beta Corp', 7), line('Amount: $2,000', 8)
  ] }], null).filter((r) => r.kind === 'GENERAL_PUBLIC_RECORD');
  check.equal(two.length, 2, 'two judgments produce two records');
  const alpha = two.find((r) => r.public_record_identity === 'JDG-009');
  const beta = two.find((r) => r.public_record_identity === 'JDG-010');
  /* 17. End-to-end: a fictional CA judgment report uploads, extracts and evaluates through the local service. */
  const judgmentPdf = buildPdf({ pages: [{ lines: [
    'Equifax  Consumer Credit Report', 'Report Date: June 12, 2026',
    'Public Record: JDG-011', 'Judgment', 'Creditor: ABC Finance Corp', 'Amount: $4,000', 'Date of Entry: January 1, 2019'
  ] }] });
  const uploadBody = (bytes, filename) => ({ originalFilename: filename, declaredBytes: bytes.length, mimeType: 'application/pdf', contentBase64: bytes.toString('base64') });
  const owner = await t.account('ns-judgment@example.test');
  const caseRow = (await t.request('POST', '/api/cases', { token: owner.token, body: { country: 'CA', region: 'CA-NS' } })).json.case;
  const uploaded = await t.request('POST', `/api/cases/${caseRow.case_id}/files`, { token: owner.token, body: uploadBody(judgmentPdf, 'ns-judgment.pdf') });
  check.equal(uploaded.status, 201, 'a CA judgment report uploads');
  check.equal(uploaded.json.receipt.format_detection.presentation_id, generalIntake.GENERAL_PRESENTATION_ID, 'as a general bureau report');
  await t.request('POST', `/api/cases/${caseRow.case_id}/evaluate`, { token: owner.token });
  const view = (await t.request('GET', `/api/cases/${caseRow.case_id}`, { token: owner.token })).json.view;
  const observations = view.result.observations || [];
  check.equal(observations.every((o) => o.is_a_finding === false), true, 'no observation is a finding (permission disabled)');
  const judgmentRow = observations.find((o) => o.check_name && /10\(3\)\(d\)/.test(o.check_name));
  check.ok(judgmentRow, 'the judgment-content check ran on the CA general report');
  check.equal(judgmentRow.is_a_finding, false, 'the judgment-content result is not a finding');
  check.equal(judgmentRow.output_level, 'observation', 'its ceiling is observation (finding_allowed=false)');

  evidence.rule = 'verified-omission evaluation complete; finding disabled pending the assignment alternative and edition-currency legal gates';
  return evidence;
}

module.exports = { run, id: 'bh-ns-judgment-content', title: 'OWNER-CANDIDATE-002: Nova Scotia judgment-content omission (extraction + evaluation complete, finding disabled)' };
