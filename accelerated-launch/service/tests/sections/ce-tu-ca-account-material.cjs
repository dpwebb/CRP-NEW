'use strict';
const { comparableText } = require('../packet-pdf-assertions.cjs');
/**
 * ce-tu-ca-account-material.cjs — BLOCKER-REPORT-DATA-TO-ISSUE-001, first slice: TransUnion Canada ordinary
 * accounts.
 *
 * The owner's highest build priority: ingest a report, compare the data it actually prints against relevant
 * requirements, surface supported potential issues, and deliver the consumer's chosen dispute. This section
 * proves the TransUnion Canada reader now reads the account block's MATERIAL fields through the block's OWN
 * printed captions and its table's OWN header — the creditor/account identity, the account type and
 * responsibility, the repayment terms, the printed payment-history counts and the monthly amount/rating rows —
 * maps them to the SAME fact vocabulary the shared checks already consume, and reaches the existing packet flow.
 *
 * Two kinds of evidence, never mixed:
 *   • GENUINE — the real, digest-pinned TransUnion Canada disclosure, read read-only. It is a BENIGN report for
 *     these checks, so it must force NO issue; forcing one would be the defect this batch exists to avoid.
 *   • SYNTHETIC — an in-memory structural model, labelled as such. It establishes NO presentation evidence; it
 *     exercises the reader's measured column rule and the check/issue/packet chain.
 *
 * Nothing here names a statutory provision, opens a credential file or makes a network call.
 */

const crypto = require('node:crypto');
const tuFamily = require('../../format-families/tu-ca-consumer.cjs');
const commonErrors = require('../../common-errors.cjs');
const issues = require('../../issues.cjs');
const formats = require('../../formats.cjs');
const { makeSyntheticModel } = require('../../../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');

const LETTER = { width_pt: 612, height_pt: 792, label: 'letter' };
const SYNTHETIC_ADMISSION = Object.freeze({
  state: 'SYNTHETIC_STRUCTURAL_TEST_INPUT_NOT_A_REPORT',
  admitted: true,
  refusal_reason: null,
  fact_status: null,
  presentation_evidence: false
});

/**
 * One synthetic TU-CA account block. The data row's cells are placed under the block's OWN printed header by
 * calling the reader's own `tableColumns`, so the reader's measured column rule — not a test's private
 * arithmetic — decides which column a cell belongs to.
 */
function tuAccountBlock({ creditor, balance, pastDue, mop }) {
  const headerAbove = `${' '.repeat(114)}Balloon${' '.repeat(20)}Narrative`;
  const headerMain = '   Date       Balance      Payment        Past Due        MOP           Terms      High Credit Credit Limit                       Charge Off';
  const headerBelow = `${' '.repeat(114)}Payment${' '.repeat(23)}1/2`;
  const head = [
    'Creditor Name',
    `${creditor}${' '.repeat(Math.max(1, 108 - creditor.length))}Payment History`,
    'Reported Date                 Oct 31, 2025   Last Payment Date               Oct 03, 2025 Terms:          522/M           30    60   90     #M',
    'Opened Date                   Sep 03, 2020   Posted Date                     Nov 02, 2025                                  0     0    0      26',
    'Closed Date                                  Charge Off Date                              Account         INSTALLMENT / INDIVIDUAL',
    'First Delinquency Date                       Balloon Payment Date                         Type:',
    headerAbove,
    headerMain,
    headerBelow
  ];
  const region = head.map((text, index) => ({ page: 1, line: index + 1, text }));
  const table = tuFamily.tableColumns(region);
  const edge = (key) => table.columns.find((column) => column.key === key).edge;
  const placements = [
    { end: 10, value: 'Oct 2025' },
    { end: edge('balance'), value: String(balance) },
    { end: edge('past_due'), value: String(pastDue) },
    { end: edge('mop'), value: String(mop) }
  ].sort((a, b) => a.end - b.end);
  let row = '';
  for (const placement of placements) {
    const start = placement.end - placement.value.length;
    if (row.length < start) row += ' '.repeat(start - row.length);
    row += placement.value;
  }
  return head.concat([row, 'Legend:    AC-Account closed/rating non derogatory']);
}

function tuModel(accountLines) {
  return makeSyntheticModel({ pages: [['Account(s)', ...accountLines]], page_count: 1, page_size: LETTER });
}

function tuExtraction(accountLines) {
  const x = tuFamily.extract(tuModel(accountLines), SYNTHETIC_ADMISSION);
  for (const r of x.records) {
    r.source_bureau = 'TransUnion';
    r.source_report_reference_date = '2025-11-02';
  }
  return { presentation_id: tuFamily.FAMILY_ID, family_id: tuFamily.FAMILY_ID, records: x.records };
}

function pipeline(extraction) {
  const ce = commonErrors.runCommonErrorChecks({ extraction });
  const iss = issues.issuesFor({ evaluation: { results: [], common_errors: ce }, extraction });
  return { ce, iss };
}

function balanceIssues(iss) {
  return iss.filter((i) => i.check_id === 'COMMON-ERROR-BALANCE-PAYMENT-INCONSISTENCY');
}

async function payReportOnce(service, actor, caseId) {
  const checkout = await service.request('POST', '/api/billing/checkout', { token: actor.token, body: { plan_code: 'monthly' } });
  const c = checkout.json.checkout;
  const event = {
    id: `test_evt_${crypto.randomBytes(8).toString('hex')}`,
    type: 'checkout.session.completed',
    account_reference: actor.account_id,
    plan_code: c.plan.plan_code,
    session_reference: c.provider_reference,
    amount_cents: c.plan.amount_cents,
    currency: c.plan.currency,
    occurred_at: new Date().toISOString()
  };
  await service.postEvent(event);
}

function inject(service, actor, caseId, ce, records) {
  service.service.store.update((state) => {
    state.results.push({
      result_id: `res_tum_${crypto.randomBytes(10).toString('hex')}`,
      case_id: caseId,
      account_id: actor.account_id,
      file_id: null,
      file_ids: [],
      evaluation: { results: [], common_errors: ce },
      extraction: { records, bureau: 'TransUnion', reference_date: { normalized_value: '2025-11-02' } },
      clarification_eligibility: [],
      reviewed_at: null,
      created_at: new Date().toISOString()
    });
  });
}

async function run(service, check) {
  const evidence = {};

  /* ---- 1. GENUINE: the digest-pinned TransUnion Canada disclosure, read read-only. ---- */
  const pointer = tuFamily.readSecondCanadianPointer();
  const verification = tuFamily.verifySpecimenDigest(pointer);
  check.ok(pointer.available && verification.verified,
    'the digest-pinned TransUnion Canada specimen is present and still matches its recorded digest');
  const model = formats.buildPdfDocumentModel(pointer.absolute_path);
  const extraction = formats.extractWithSharedAdapter(model, { mode: 'REPORT', country: 'CA' });
  check.equal(extraction.presentation_id, tuFamily.FAMILY_ID, 'the real specimen is read by the TransUnion family');
  const view = extraction.evidence_readings.factual_view;
  const tradelines = extraction.records.filter((r) => r.kind === tuFamily.TRADELINE_KIND);
  check.equal(tradelines.length, 4, 'four account blocks are read from the real disclosure');

  check.deepEqual(tradelines.map((r) => r.facts['account.reported_identity']),
    ['BANK OF NOVA SCOTIA', 'CAPITAL ONE BANK', 'FIDO', 'ROGERS COMMUNICATIONS CANADA INC'],
    'every account block maps its printed creditor name to the account identity fact the shared checks read');
  check.deepEqual(tradelines.map((r) => r.account_material.account_type),
    ['INSTALLMENT', 'REVOLVING', 'OPEN_ACCOUNT', 'OPEN_ACCOUNT'],
    'and its printed account type, read through the wrapped Account / Type: caption');
  check.ok(tradelines.every((r) => r.facts['account.responsibility'] === 'INDIVIDUAL'), 'and its printed responsibility');
  check.deepEqual(tradelines.map((r) => r.account_material.terms), ['522/M', '0/M', '0/M', '0/M'], 'and its printed repayment terms');
  check.deepEqual(tradelines.map((r) => r.facts['account.balance']), [0, 248, 341, 0], 'and the LATEST printed monthly balance');
  check.deepEqual(tradelines.map((r) => r.facts['account.pastDueAmount']), [0, 248, 341, 0], 'and the latest printed past-due amount');

  const capitalOne = tradelines[1];
  check.equal(capitalOne.facts['account.amount'], 358, 'the printed high credit is mapped as the account amount');
  check.equal(capitalOne.facts['account.amountRaw'], '358', 'with the printed raw reading kept beside it');
  check.equal(capitalOne.facts['account.creditLimit'], 300, 'and the printed credit limit');
  check.equal(capitalOne.facts['liability.closedDate'], '2024-06-17', 'and its printed closure date');
  const cells = capitalOne.facts['account.paymentHistoryCells'];
  check.equal(cells.length, 7, 'every monthly row supplies a payment-history cell');
  check.equal(cells[0].period, '2024-07', 'with its own printed reporting period');
  check.equal(cells[0].meaning, 'Bad debt, placed for collection; skip',
    "and the meaning the REPORT's own manner-of-payment legend prints for that MOP code");
  check.ok(cells.every((c) => c.meaning !== null), "every printed MOP cell resolves from the report's own legend, so no code is guessed");
  check.ok(tradelines[2].monthly_rows.some((row) => row.narrative_codes.includes('TC')), 'and the collection narrative code is preserved on the row that prints it');
  check.ok(tradelines[3].monthly_rows.some((row) => row.narrative_codes.includes('CZ')), 'as is the closure narrative code');
  check.deepEqual(view.printed_legends.account_type,
    { O: 'Open Account (payment required in full)', R: 'Revolving or Option (30 days)', I: 'Installment (fixed number of payments)', M: 'Mortgage' },
    "the report's own account-type legend is carried with the facts");

  /* The genuine report is BENIGN for the shared CONTRADICTION checks: none of THEM may be forced from it. The
     three completeness items it does support are the whole point of the real-report repair — an adverse entry
     whose delinquency caption is printed empty, a write-off with no charge-off date, and closures with no closure
     dates — so the assertion is scoped to the class it protects and the completeness items are named explicitly. */
  const realPipeline = pipeline(extraction);
  const CONTRADICTION_IDS = ['COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY', 'COMMON-ERROR-STATUS-DATE-CONTRADICTION',
    'COMMON-ERROR-PAYMENT-HISTORY-INCONSISTENCY', 'COMMON-ERROR-DUPLICATE-REPORTING', 'COMMON-ERROR-RESPONSIBILITY-INCONSISTENCY'];
  check.equal(realPipeline.ce.performed.filter((c) => c.state === 'POTENTIAL_ISSUE' && CONTRADICTION_IDS.includes(c.check_id)).length, 0,
    'the genuine report forces no contradiction item (it is benign for the shared contradiction checks)');
  check.equal(balanceIssues(realPipeline.iss).length, 0, 'and specifically no balance/past-due issue');
  check.deepEqual([...new Set(realPipeline.iss.map((i) => i.check_id))].sort(), [
    'COMMON-ERROR-ADVERSE-ENTRY-WITHOUT-A-DELINQUENCY-ANCHOR',
    'COMMON-ERROR-CLOSURE-STATED-WITHOUT-A-CLOSED-DATE',
    'COMMON-ERROR-WRITE-OFF-WITHOUT-A-CHARGE-OFF-DATE'
  ], 'while it yields exactly the three completeness items the report itself supports');

  evidence.genuine_transunion_material =
    "the real TransUnion Canada disclosure yields 4 account blocks with printed creditor identity, type/responsibility, " +
    "terms, balances, past-due amounts and MOP cells resolved from the report's own legend; it forces no contradiction " +
    "item and yields the three completeness items the report itself supports";

  /* ---- 2. SYNTHETIC: the reader's measured column rule, and a supported potential issue end to end. ---- */
  const positive = pipeline(tuExtraction(tuAccountBlock({ creditor: 'SYNTHETIC CREDITOR ONE', balance: 100, pastDue: 500, mop: '5' })));
  const posIssues = balanceIssues(positive.iss);
  check.equal(posIssues.length, 1, 'a printed past-due amount larger than the printed balance is one supported potential issue');
  check.equal(posIssues[0].classification, null, 'never a legal classification');
  check.equal(posIssues[0].request_type, 'VERIFICATION', 'reported as a factual verification request');
  check.ok(/past-due amount \(500\) larger than its balance \(100\)/.test(posIssues[0].explanation),
    "naming the report's own two printed amounts");
  check.ok(posIssues[0].source_facts.some((f) => f.raw_value === '500'),
    'with the printed past-due reading carried as source-linked provenance');

  const benign = pipeline(tuExtraction(tuAccountBlock({ creditor: 'SYNTHETIC CREDITOR TWO', balance: 500, pastDue: 100, mop: '1' })));
  check.equal(balanceIssues(benign.iss).length, 0, 'a past-due amount within the printed balance produces no issue');
  const single = pipeline(tuExtraction(tuAccountBlock({ creditor: 'SYNTHETIC CREDITOR THREE', balance: 500, pastDue: 0, mop: '1' })));
  check.equal(single.iss.filter((i) => i.check_id === 'COMMON-ERROR-PAYMENT-HISTORY-INCONSISTENCY').length, 0,
    'a single printed period is never a payment-history inconsistency');

  /* ---- 3. The selected issue reaches the EXISTING packet flow. It is store-injected because a synthetic PDF
     cannot pass the real admission gate (the same constraint the other family sections document). ---- */
  const owner = await service.unpaidAccount('ce-tum@example.test');
  const c = (await service.request('POST', '/api/cases', { token: owner.token, body: { country: 'CA', region: 'CA-ON' } })).json.case;
  await payReportOnce(service, owner, c.case_id);
  const posExtraction = tuExtraction(tuAccountBlock({ creditor: 'SYNTHETIC CREDITOR ONE', balance: 100, pastDue: 500, mop: '5' }));
  inject(service, owner, c.case_id, positive.ce, posExtraction.records);
  const pv = (await service.request('GET', `/api/cases/${c.case_id}/packet`, { token: owner.token })).json.view;
  const sel = pv.eligible_issues.find((i) => i.explanation && i.explanation.indexOf('past-due amount (500) larger than its balance (100)') !== -1);
  check.ok(sel, 'the supported balance/past-due issue is offered for selection in the packet');
  await service.request('POST', `/api/cases/${c.case_id}/packet/select`, { token: owner.token, body: { issue_ids: [sel.issue_id] } });
  await service.request('POST', `/api/cases/${c.case_id}/packet/correspondence`, { token: owner.token, body: { correspondence: { consumer_name: 'Dana Whitfield', contact: 'dana.whitfield@example.test' } } });
  await service.preparePostalPacket(owner, c.case_id);
  await service.request('POST', `/api/cases/${c.case_id}/packet/approve`, { token: owner.token });
  const dl = await service.request('GET', `/api/cases/${c.case_id}/packet-download`, { token: owner.token });
  check.equal(dl.status, 200, 'the approved packet downloads');
  check.ok(/past-due amount \(500\) larger than its balance \(100\)/.test(comparableText(dl.text)), 'with the supported factual verification request');
  check.ok(comparableText(dl.text).indexOf('500') !== -1, 'and the printed past-due reading as evidence');

  evidence.synthetic_material_issue =
    "a synthetic past-due-exceeds-balance block, read through the reader's measured column rule, becomes one selectable " +
    'VERIFICATION issue (never a legal finding) and downloads through the real packet flow';
  evidence.benign_controls = 'a past-due within the printed balance and a single printed period each produce no issue';
  return evidence;
}

module.exports = {
  run,
  id: 'ce-tu-ca-account-material',
  title: 'BLOCKER-REPORT-DATA-TO-ISSUE-001: TransUnion Canada ordinary-account material extraction -> shared checks -> packet'
};
