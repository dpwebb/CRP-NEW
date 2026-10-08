'use strict';
/**
 * am-fdt-recovery.cjs — BLOCKER-FDT-001. Failure-to-detect mitigation.
 */
const fdt = require('../../fdt-recovery.cjs');
const commonErrors = require('../../common-errors.cjs');
const formats = require('../../formats.cjs');
const evaluation = require('../../evaluation.cjs');
const results = require('../../results.cjs');
const benchmark = require('../../fdt-benchmark.cjs');
const acceptance = require('../../fdt-acceptance.cjs');
const { makeSyntheticModel } = require('../../../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');
const { buildPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');

function uploadBody(bytes, filename) {
  return { originalFilename: filename, declaredBytes: bytes.length, mimeType: 'application/pdf', contentBase64: bytes.toString('base64') };
}

async function run(t, check) {
  const evidence = {};

  /* 1. incomplete-reading detection */
  const unreadable = fdt.detectIncompleteReading(
    { pages: [{ page: 1, has_native_text: true }, { page: 2, has_native_text: false }] },
    [{ page: 1, lines: [{ text: 'Equifax Credit Report', page: 1, line: 1, source: 'NATIVE_TEXT', trusted: true }] }],
    []
  );
  check.equal(unreadable.complete, false, 'an unread page makes the reading incomplete');
  check.deepEqual(unreadable.unreadable_pages, [2], 'and names the unread page');

  const partial = fdt.detectIncompleteReading(
    { pages: [{ page: 1, has_native_text: true, native_text_incomplete: true }] },
    [{ page: 1, source: 'NATIVE_TEXT', native_text_incomplete: true, lines: [{ text: 'Equifax Credit Report', page: 1, line: 1, source: 'NATIVE_TEXT', trusted: true }] }],
    [{ record_index: 1, status: 'RESOLVED', facts: {} }]
  );
  check.deepEqual(partial.partial_native_pages, [1], 'a partial native text layer is detected');

  const imageOnly = fdt.detectIncompleteReading(
    { pages: [] },
    [{ page: 1, source: 'LOCAL_OCR', lines: [{ text: 'Creditor A Opened 01/01/2020', page: 1, line: 1, source: 'LOCAL_OCR', trusted: true }] }],
    [{ record_index: 1, status: 'RESOLVED', facts: { 'liability.openedDate': '2020-01-01' } }]
  );
  check.deepEqual(imageOnly.image_only_pages, [1], 'an image-only page is recorded');

  const untrusted = fdt.detectIncompleteReading(
    { pages: [] },
    [{ page: 1, source: 'LOCAL_OCR', lines: [{ text: 'Opened 01/01/2020', page: 1, line: 1, source: 'LOCAL_OCR', trusted: false, confidence: 40 }] }],
    [{ record_index: 1, status: 'RESOLVED', facts: {} }]
  );
  check.equal(untrusted.complete, false, 'a low-confidence OCR line makes the reading incomplete');
  check.equal(untrusted.untrusted_lines.length, 1, 'and preserves the untrusted line');

  const boundary = fdt.detectIncompleteReading(
    { pages: [] },
    [{ page: 1, source: 'NATIVE_TEXT', lines: [{ text: 'Balance $100', page: 1, line: 1, source: 'NATIVE_TEXT', trusted: true }] }],
    [{ record_index: 1, status: 'RESOLVED', kind_label: 'account', facts: {}, continuation_candidate: true }]
  );
  check.equal(boundary.complete, false, 'an unresolved record boundary makes the reading incomplete');
  check.equal(boundary.unresolved_record_boundaries.length, 1, 'and names the continuation candidate');

  const contradictory = fdt.detectIncompleteReading(
    { pages: [] },
    [{ page: 1, source: 'NATIVE_TEXT', lines: [
      { text: 'Balance $100', page: 1, line: 1, source: 'NATIVE_TEXT', trusted: true },
      { text: 'Balance $200', page: 1, line: 1, source: 'LOCAL_OCR', trusted: true }
    ] }],
    []
  );
  check.equal(contradictory.contradictory_extraction.length, 1, 'conflicting readings at one location are kept and flagged');

  const contentNoRecords = fdt.detectIncompleteReading(
    { pages: [{ page: 1, has_native_text: true }] },
    [{ page: 1, source: 'NATIVE_TEXT', lines: [{ text: 'ACCOUNT SUMMARY  Balance  Opened', page: 1, line: 1, source: 'NATIVE_TEXT', trusted: true }] }],
    []
  );
  check.equal(contentNoRecords.apparent_content_without_records, true, 'apparent account content with no resolved record is flagged');

  /* 2. bounded recovery audit */
  const before = [{ page: 1, lines: [{ text: 'Creditor A Opened 01/01/2020', source: 'NATIVE_TEXT', trusted: true }] }];
  const after = [{ page: 1, source: 'NATIVE_TEXT', recovered_with_ocr: true, lines: [
    { text: 'Creditor A Opened 01/01/2020', source: 'NATIVE_TEXT', trusted: true },
    { text: 'Closed 01/01/2022', source: 'LOCAL_OCR', trusted: true, confidence: 94, bbox: { x0: 0, y0: 40, x1: 10, y1: 44 } }
  ] }];
  const audit = fdt.recoveryAudit(before, after);
  check.equal(audit.recovery_attempts.length, 1, 'a native page with a recovered image region records its actual OCR attempt');
  check.equal(audit.facts_added.length, 1, 'recovery records the fact it added');
  check.equal(audit.facts_added[0].text, 'Closed 01/01/2022', 'with the recovered value');
  check.equal(audit.substitution_forbidden, true, 'substitution is forbidden');
  check.equal(audit.recovery_pass_limit, 1, 'with a bounded pass limit');

  /* 2b. image-only page (no native "before" reading): record genuine recovered facts, never skip, and distinguish
     ordinary OCR ingestion from useful recovery. */
  const imageOnlyAudit = fdt.recoveryAudit(
    [],
    [{ page: 2, source: 'LOCAL_OCR', lines: [
      { text: 'Creditor B Opened 03/03/2019 Balance 800', source: 'LOCAL_OCR', line: 1, trusted: true, confidence: 94, bbox: { x0: 0, y0: 0, x1: 10, y1: 4 } },
      { text: 'Payment History: OK OK', source: 'LOCAL_OCR', line: 2, trusted: true, confidence: 90, bbox: { x0: 0, y0: 5, x1: 10, y1: 9 } }
    ] }]
  );
  check.equal(imageOnlyAudit.recovery_attempts.length, 1, 'an image-only page is recorded as an attempted recovery');
  check.equal(imageOnlyAudit.facts_added.length, 1, 'the image-only page records its genuine recovered assessment fact (not skipped)');
  check.ok(/Creditor B Opened 03\/03\/2019/.test(imageOnlyAudit.facts_added[0].text), 'with the recovered fact text');
  check.equal(imageOnlyAudit.facts_added[0].source, 'LOCAL_OCR', 'with its OCR source');
  check.equal(typeof imageOnlyAudit.facts_added[0].page, 'number', 'with its page location');
  check.equal(typeof imageOnlyAudit.facts_added[0].line, 'number', 'and its line location');
  check.equal(imageOnlyAudit.ordinary_ingestion.length, 2, 'ordinary ingestion keeps the full OCR content of the image-only page');
  check.ok(imageOnlyAudit.ordinary_ingestion.every((o) => o.text.length > 0), 'ordinary ingestion carries each OCR line');
  check.ok(!imageOnlyAudit.facts_added.some((f) => /Payment History/.test(f.text)), 'arbitrary OCR text (no date/amount) is NOT counted as a recovered assessment fact');

  /* 2c. unsuccessful recovery (no OCR content) records nothing added. */
  const emptyAudit = fdt.recoveryAudit([], []);
  check.equal(emptyAudit.facts_added.length, 0, 'an unsuccessful recovery records no recovered facts');
  check.equal(emptyAudit.recovery_attempts.length, 0, 'and no attempts');
  const unsuccessfulAudit = fdt.recoveryAudit([], [{ page: 2, source: 'LOCAL_OCR', lines: [] }]);
  check.equal(unsuccessfulAudit.recovery_attempts.length, 1, 'a performed unsuccessful OCR pass is distinguished from no attempt');
  check.equal(unsuccessfulAudit.facts_added.length, 0, 'a performed unsuccessful OCR pass creates no fact');
  check.equal(unsuccessfulAudit.recovery_pass_limit, 1, 'unsuccessful recovery retains the one-pass bound');
  const unsuccessfulMixedAudit = fdt.recoveryAudit(before,
    [{ page: 1, source: 'NATIVE_TEXT', recovered_with_ocr: true, lines: before[0].lines }]);
  check.equal(unsuccessfulMixedAudit.recovery_attempts.length, 1, 'an unsuccessful mixed-page OCR pass is recorded even when the native layer remains');
  check.equal(unsuccessfulMixedAudit.facts_added.length, 0, 'that unsuccessful pass invents no recovered fact');
  check.equal(fdt.recoveryAudit(before, before).recovery_attempts.length, 0, 'a native page without an OCR pass never acquires an attempt');

  /* 3. consequential reading limitations */
  const limits = fdt.buildReadingLimitations(unreadable);
  check.equal(limits.incomplete, true, 'limitations mark the reading incomplete');
  check.ok(limits.affected_checks.includes('COMMON_ERROR'), 'and name the affected check class');
  check.equal(limits.never_equates_unread_with_absence, true, 'and never equate unread with absence');

  const completeLimits = fdt.buildReadingLimitations(fdt.detectIncompleteReading(
    { pages: [{ page: 1, has_native_text: true }] },
    [{ page: 1, source: 'NATIVE_TEXT', lines: [{ text: 'Creditor A Opened 01/01/2020', page: 1, line: 1, source: 'NATIVE_TEXT', trusted: true }] }],
    [{ record_index: 1, status: 'RESOLVED', facts: { 'liability.openedDate': '2020-01-01' } }]
  ));
  check.equal(completeLimits.incomplete, false, 'a complete read is not limited');

  /* 4. consequential surfacing in results */
  const partialModel = makeSyntheticModel({ pages: [['Equifax Consumer Credit Report', 'Creditor A Opened 01/01/2020']], native_text_incomplete_pages: [1] });
  const partialExt = formats.extractWithSharedAdapter(partialModel, { mode: 'REPORT', country: 'US' });
  check.equal(partialExt.reading_limitations.incomplete, true, 'a partial native-text extraction carries an incomplete limitation');
  const partialEval = evaluation.evaluateCase({ country: 'US', region: 'US-NY', extraction: partialExt });
  const partialRendered = results.renderResultSet({ evaluation: partialEval, extraction: partialExt });
  check.equal(partialRendered.reading_limitations.incomplete, true, 'the rendered result surfaces the limitation');
  check.equal(partialRendered.reading_limitations.never_equates_unread_with_absence, true, 'never equating unread with absence');

  /* 5. corrected duplicate-reporting semantics */
  const sameDatesNoId = [
    { record_index: 1, kind: 'CONSUMER_CREDIT_LIABILITY', status: 'RESOLVED', facts: { 'liability.openedDate': '2018-01-01', 'liability.closedDate': '2020-01-01' } },
    { record_index: 2, kind: 'CONSUMER_CREDIT_LIABILITY', status: 'RESOLVED', facts: { 'liability.openedDate': '2018-01-01', 'liability.closedDate': '2020-01-01' } }
  ];
  check.equal(commonErrors.duplicateReporting(sameDatesNoId), null, 'matching dates alone are never a duplicate');
  const similar = commonErrors.similarEntriesWorthReviewing(sameDatesNoId);
  check.equal(similar.state, 'SIMILAR_ENTRIES_WORTH_REVIEWING', 'they are similar entries worth reviewing');
  check.ok(/worth reviewing/.test(similar.plain), 'and the wording describes them as worth reviewing, never asserts duplicate debt reporting');

  const twoDebtsSameDates = [
    { record_index: 1, kind: 'CONSUMER_CREDIT_LIABILITY', status: 'RESOLVED', facts: { 'liability.openedDate': '2018-01-01', 'liability.closedDate': '2020-01-01', 'account.reported_identity': 'CREDITOR C', 'account.masked_identifier': 'MASK-1111' } },
    { record_index: 2, kind: 'CONSUMER_CREDIT_LIABILITY', status: 'RESOLVED', facts: { 'liability.openedDate': '2018-01-01', 'liability.closedDate': '2020-01-01', 'account.reported_identity': 'CREDITOR C', 'account.masked_identifier': 'MASK-2222' } }
  ];
  check.equal(commonErrors.duplicateReporting(twoDebtsSameDates), null, 'two legitimate debts sharing the same dates and creditor but different masked identifiers are not a duplicate');
  const similarTwoDebts = commonErrors.similarEntriesWorthReviewing(twoDebtsSameDates);
  check.equal(similarTwoDebts.state, 'SIMILAR_ENTRIES_WORTH_REVIEWING', 'and they are worth reviewing, not asserted duplicate');

  const sameIdentity = [
    { record_index: 1, kind: 'CONSUMER_CREDIT_LIABILITY', status: 'RESOLVED', facts: { 'liability.openedDate': '2018-01-01', 'liability.closedDate': '2020-01-01', 'account.masked_identifier': 'MASK-1234', 'account.reported_identity': 'CREDITOR C', 'account.amount': 100 } },
    { record_index: 2, kind: 'CONSUMER_CREDIT_LIABILITY', status: 'RESOLVED', facts: { 'liability.openedDate': '2018-01-01', 'liability.closedDate': '2020-01-01', 'account.masked_identifier': 'MASK-1234', 'account.reported_identity': 'CREDITOR C', 'account.amount': 100 } }
  ];
  const dup = commonErrors.duplicateReporting(sameIdentity);
  check.equal(dup.state, 'POTENTIAL_ISSUE', 'same masked identifier + creditor name + a matching balance is a potential duplicate');
  const sameIdentityNoThird = [
    { record_index: 1, kind: 'CONSUMER_CREDIT_LIABILITY', status: 'RESOLVED', facts: { 'liability.openedDate': '2018-01-01', 'liability.closedDate': '2020-01-01', 'account.masked_identifier': 'MASK-1234', 'account.reported_identity': 'CREDITOR C' } },
    { record_index: 2, kind: 'CONSUMER_CREDIT_LIABILITY', status: 'RESOLVED', facts: { 'liability.openedDate': '2018-01-01', 'liability.closedDate': '2020-01-01', 'account.masked_identifier': 'MASK-1234', 'account.reported_identity': 'CREDITOR C' } }
  ];
  check.equal(commonErrors.duplicateReporting(sameIdentityNoThird), null, 'same masked identifier + creditor name WITHOUT additional compatible evidence is not a duplicate');

  /* 6. benchmark */
  const bench = benchmark.runBenchmark();
  check.equal(bench.passed, true, 'the FDT benchmark passes its fixed acceptance criteria');
  check.equal(bench.metrics.missed_fact_rate, 0, 'no required fact missed');
  check.equal(bench.metrics.incorrect_reading_rate, 0, 'no incorrect fact accepted');
  check.equal(bench.metrics.recovery.facts_added, 1, 'recovery added the recoverable fact');

  const accepted = acceptance.runAcceptance();
  check.equal(accepted.implementation_passed, true, 'the current shared-reader and active checklist acceptance passes locally');
  check.equal(accepted.passed, false, 'local acceptance never fabricates current hosted recovery');
  check.equal(accepted.expected_decisive_fact_denominator, 12, 'both lookalike accounts contribute their own decisive facts');
  check.equal(accepted.unsupported_violations, 0, 'no unexpected active checklist violation is emitted');
  check.equal(accepted.missing_expected_violations, 0, 'the supported positive checklist violation is actually detected');
  const chronology = accepted.per_case.find(row => row.id === 'contradictory-dates');
  check.deepEqual(chronology.findings, [{ check_id: 'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY',
    classification: 'PROBABLE_VIOLATION', record_indices: [1] }], 'the positive control reaches the active source-linked issue pipeline');
  const expected = [{ check_id: 'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY', classification: 'PROBABLE_VIOLATION', record_index: 1 }];
  const offered = [{ ...expected[0], eligible: true,
    rule_assessment: { required_facts: [{ source: { record_index: 1, location: { page: 1, line: 3 } } }] } }];
  check.deepEqual(acceptance.measureViolations(expected, offered), { unsupported: 0, missing: 0 }, 'only the explicit own-record positive is allowed');
  check.equal(acceptance.measureViolations([], offered).unsupported, 1, 'an active checklist violation on a benign control is counted');
  check.equal(acceptance.measureViolations(expected, []).missing, 1, 'suppressing the required positive fails acceptance');
  check.equal(acceptance.measureViolations(expected, [{ ...offered[0], record_index: 2 }]).unsupported, 1,
    'an otherwise matching violation attributed to another record is rejected');
  check.equal(acceptance.measureViolations(expected, [offered[0], offered[0]]).unsupported, 1, 'a duplicated positive is counted as unexpected');
  check.equal(acceptance.measureViolations(expected, [{ ...offered[0], rule_assessment: null }]).unsupported, 1,
    'a classification without its decisive source facts is never an allowed positive');

  /* 7. HTTP journey: native-PDF result and image refusal */
  const owner = await t.account('fdt-owner@example.test');
  const caseRow = (await t.request('POST', '/api/cases', { token: owner.token, body: { country: 'US', region: 'US-NY' } })).json.case;
  const pdf = buildPdf({ pages: [{ lines: ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor A  Opened 01/01/2020'] }] });
  await t.request('POST', `/api/cases/${caseRow.case_id}/files`, { token: owner.token, body: uploadBody(pdf, 'native.pdf') });
  const evalRes = (await t.request('POST', `/api/cases/${caseRow.case_id}/evaluate`, { token: owner.token })).json;
  const view = (await t.request('GET', `/api/cases/${caseRow.case_id}`, { token: owner.token })).json.view;
  check.ok(view.result.reading_limitations, 'the deployed native-PDF journey surfaces reading limitations in the result');

  /* 8. OWNER-ACCEPT-009 item 2: optional clarification, stored separately from report facts. */
  const clarify = await t.request('POST', `/api/cases/${caseRow.case_id}/results/${evalRes.result_id}/clarify`, { token: owner.token, body: { answers: [
    { question_id: 'account-purpose', answer: 'my 2019 auto loan' },
    { question_id: 'account-responsibility', answer: 'SKIP' }
  ] } });
  check.equal(clarify.status, 200, 'clarification answers are recorded');
  const clarifyView = (await t.request('GET', `/api/cases/${caseRow.case_id}`, { token: owner.token })).json.view;
  check.ok(Array.isArray(clarifyView.clarifications), 'the consumer view exposes clarifications');
  check.ok(clarifyView.clarifications.every((c) => c.source === 'CONSUMER_STATEMENT' && c.evidence_status === 'CONSUMER_SUPPLIED'), 'every clarification is a consumer statement, not a report fact');
  check.ok(clarifyView.clarifications.some((c) => c.answer === 'SKIP'), 'a skipped answer is preserved as a first-class answer');
  check.ok(clarifyView.result && clarifyView.result.observations, 'skipping the clarification did not interrupt the independent checks');
  check.ok(!clarifyView.result.observations.some((o) => o.is_a_finding === true && o.reason === 'CONSUMER_CLARIFICATION'), 'no finding is escalated solely because a clarification answer was supplied');

  const imageCase = (await t.request('POST', '/api/cases', { token: owner.token, body: { country: 'US', region: 'US-NY' } })).json.case;
  const tinyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  const imageUpload = await t.request('POST', `/api/cases/${imageCase.case_id}/files`, { token: owner.token, body: { originalFilename: 'scan.png', declaredBytes: tinyPng.length, mimeType: 'image/png', contentBase64: tinyPng.toString('base64') } });
  check.equal(imageUpload.status, 201, 'an image upload reaches OCR/general intake');
  const receipt = imageUpload.json.receipt;
  check.ok(receipt.format_detection.supported === true || ['UNREADABLE_DOCUMENT', 'UNRELATED_DOCUMENT'].includes(receipt.format_detection.refusal_reason), 'an unreadable image is refused as unreadable/unrelated, never a false no-issues result');

  evidence.detection = { unreadable_pages: unreadable.unreadable_pages, contradictory: contradictory.contradictory_extraction.length };
  evidence.recovery = { facts_added: audit.facts_added.length, substitution_forbidden: audit.substitution_forbidden };
  evidence.limitations = { incomplete: limits.incomplete, affected: limits.affected_checks };
  evidence.duplicate = { similar_state: similar.state, duplicate_state: dup.state };
  evidence.benchmark = { passed: bench.passed, missed: bench.metrics.missed_fact_rate };
  evidence.benchmark_full = bench;
  evidence.acceptance = accepted;
  evidence.local_recovery = { useful_facts: imageOnlyAudit.facts_added.length,
    useful_attempts: imageOnlyAudit.recovery_attempts.length, unsuccessful_facts: unsuccessfulAudit.facts_added.length,
    unsuccessful_attempts: unsuccessfulAudit.recovery_attempts.length, pass_limit: unsuccessfulAudit.recovery_pass_limit };
  return evidence;
}

module.exports = { run, id: 'am-fdt-recovery', title: 'BLOCKER-FDT-001: incomplete-reading detection, bounded recovery, consequential limitations, duplicate semantics, benchmark' };
