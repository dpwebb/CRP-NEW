'use strict';
/**
 * ch-ca-ab-debt-six-year.cjs — BATCH-10: the Alberta reporting-period rule, end to end.
 *
 * Provision: Credit and Personal Reports Regulation (Alberta), Alta. Reg. 193/99, s. 4(b), under the Consumer
 * Protection Act, R.S.A. 2000, c. C-26.3 (ledger row CRP-LSRC-0339). "unfavourable information about a debt if
 * more than 6 years has elapsed since the date of the last payment on that debt or the date the debt was
 * incurred, whichever is later".
 *
 * TWO KINDS OF EVIDENCE, never mixed:
 *   - STRUCTURAL MODEL: the TransUnion Canada reader's own account block, placed by that reader's measured
 *     column rule (tuFamily.tableColumns), admitted as SYNTHETIC_STRUCTURAL_TEST_INPUT_NOT_A_REPORT. It
 *     establishes NO presentation evidence and is NOT PDF-upload delivery.
 *   - SERVICE INTEGRATION: the evaluated result is injected into the case store and then travels the REAL
 *     packet path (selection -> reviewed correspondence -> approval -> entitled download). The other family
 *     sections use this same route, because a synthetic PDF cannot pass the real admission gate.
 */
const crypto = require('node:crypto');
const tuFamily = require('../../format-families/tu-ca-consumer.cjs');
const evaluation = require('../../evaluation.cjs');
const applicability = require('../../applicability.cjs');
const formats = require('../../formats.cjs');
const { makeSyntheticModel } = require('../../../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');

const AB = 'CA-AB-CPA-CPRR-S4-B-DEBT-LAST-PAYMENT-6Y';
const CITATION = 'Credit and Personal Reports Regulation (Alberta), Alta. Reg. 193/99, s. 4(b), under the Consumer Protection Act, R.S.A. 2000, c. C-26.3';
const ADMISSION = Object.freeze({
  state: 'SYNTHETIC_STRUCTURAL_TEST_INPUT_NOT_A_REPORT',
  admitted: true, refusal_reason: null, fact_status: null, presentation_evidence: false
});
const LETTER = { width_pt: 612, height_pt: 792, label: 'letter' };
const REFERENCE_DATE = '2025-11-02';

/** One synthetic TransUnion Canada account block, placed under the block's OWN printed header. */
function tuBlock({ creditor, lastPayment, lastPaymentMode, opened, balance, pastDue, mop, typeLine, countsRaw }) {
  const headerAbove = `${' '.repeat(114)}Balloon${' '.repeat(20)}Narrative`;
  const headerMain = '   Date       Balance      Payment        Past Due        MOP           Terms      High Credit Credit Limit                       Charge Off';
  const headerBelow = `${' '.repeat(114)}Payment${' '.repeat(23)}1/2`;
  const counts = countsRaw === undefined ? '0     0    0      26' : countsRaw;
  const head = [
    'Account(s)',
    'Creditor Name',
    `${creditor}${' '.repeat(Math.max(1, 108 - creditor.length))}Payment History`,
    `Reported Date                 Oct 31, 2025   Last Payment Date               ${lastPaymentMode === 'blank' ? '' : lastPayment} Terms:          522/M           30    60   90     #M`,
    `Opened Date                   ${opened}   Posted Date                     Nov 02, 2025                                  ${counts}`,
    'Closed Date                                  Charge Off Date                              Account         ' + (typeLine || 'INSTALLMENT / INDIVIDUAL'),
    'First Delinquency Date                       Balloon Payment Date                         Type:',
    headerAbove, headerMain, headerBelow
  ];
  const region = head.map((text, index) => ({ page: 1, line: index + 1, text }));
  const table = tuFamily.tableColumns(region);
  const edge = (key) => table.columns.find((c) => c.key === key).edge;
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

/** The reader's own structural model: one page per account block, admitted as a structural test input. */
function extractionFor(blocks) {
  const model = makeSyntheticModel({ pages: blocks, page_count: blocks.length, page_size: LETTER });
  const x = tuFamily.extract(model, ADMISSION);
  const records = x.records.map((r) => Object.assign({}, r, { source_bureau: 'TransUnion', source_report_reference_date: REFERENCE_DATE }));
  return {
    presentation_id: tuFamily.FAMILY_ID, family_id: tuFamily.FAMILY_ID, records,
    reference_date: { normalized_value: REFERENCE_DATE },
    support: formats.SUPPORT.DEMONSTRATION_ONLY_NOT_REPORT_SUPPORT
  };
}
function evaluateFor(extraction, region) {
  return evaluation.evaluateCase({ country: 'CA', region: region || 'CA-AB', presentation: tuFamily.FAMILY_ID, extraction });
}
function abResults(out) { return (out.results || []).filter((r) => r.check && r.check.adapter_id === AB); }
function abFindings(out) { return abResults(out).map((r) => r.machine && r.machine.finding).filter(Boolean); }

/** The service-integration route the other family sections use: the evaluated result enters the case store and
 *  the REAL packet path runs from there. (A synthetic PDF cannot pass the real admission gate.) */
function inject(service, actor, caseId, out, extraction) {
  service.service.store.update((state) => {
    state.results.push({
      result_id: `res_ab_${crypto.randomBytes(10).toString('hex')}`,
      case_id: caseId, account_id: actor.account_id, file_id: null, file_ids: [],
      evaluation: { results: out.results, common_errors: out.common_errors },
      extraction: { records: extraction.records, bureau: 'TransUnion', reference_date: { normalized_value: REFERENCE_DATE } },
      clarification_eligibility: [], reviewed_at: null, created_at: new Date().toISOString()
    });
  });
}
async function payReportOnce(service, actor, caseId) {
  const checkout = await service.request('POST', '/api/billing/checkout', { token: actor.token, body: { plan_code: 'report_once', case_id: caseId } });
  const c = checkout.json.checkout;
  await service.postEvent({
    id: `test_evt_${crypto.randomBytes(8).toString('hex')}`,
    type: 'checkout.session.completed', account_reference: actor.account_id, plan_code: c.plan.plan_code,
    session_reference: c.provider_reference, amount_cents: c.plan.amount_cents, currency: c.plan.currency,
    occurred_at: new Date().toISOString()
  });
}
function packetOf(service, actor, caseId) {
  return service.request('GET', `/api/cases/${caseId}/packet`, { token: actor.token });
}
function abIssue(view) {
  return (view.eligible_issues || []).find((i) => /4\(b\)/.test(String(i.citation || ''))
    || /4\(b\)/.test(JSON.stringify(i.supported_bases || []))
    || /six years after/.test(String(i.explanation || ''))) || null;
}

const OLD = { creditor: 'EXAMPLE BANK ONE', lastPayment: 'Mar 01, 2015', opened: 'Sep 03, 2008', balance: 1000, pastDue: 1000, mop: '5' };
const RECENT = { creditor: 'EXAMPLE BANK TWO', lastPayment: 'Mar 01, 2025', opened: 'Sep 03, 2008', balance: 1000, pastDue: 1000, mop: '5' };
/* Satisfactory on its OWN printed values: no delinquent month-count and no past-due amount, but an OLD last
   payment. This is the benign-CONTENT control, not an in-period control. */
const BENIGN_OLD = { creditor: 'EXAMPLE BANK THREE', lastPayment: 'Mar 01, 2015', opened: 'Sep 03, 2008', balance: 1000, pastDue: 0, mop: '1' };
/* A rating this build cannot read as a value: the printed counts are not numbers. */
const UNREADABLE_RATING = { creditor: 'EXAMPLE BANK FIVE', lastPayment: 'Mar 01, 2015', opened: 'Sep 03, 2008', balance: 1000, pastDue: 0, mop: '9', countsRaw: 'N/R   N/R   N/R      26' };
const REVOLVING = { creditor: 'EXAMPLE REVOLVING FOUR', lastPayment: 'Mar 01, 2015', opened: 'Sep 03, 2008', balance: 1000, pastDue: 1000, mop: '5', typeLine: 'REVOLVING / INDIVIDUAL' };

async function run(service, check) {
  const evidence = {};

  /* ---- 1. The reader's own record kind, printed date, shared fact, source location and reference date. ---- */
  const old = extractionFor([tuBlock(OLD)]);
  const oldRecord = old.records[0];
  check.equal(oldRecord.kind, 'TU_CA_TRADELINE', 'the account block is read with the reader own tradeline kind');
  check.equal(oldRecord.facts['tradeline.lastPaymentDate'], '2015-03-01',
    'and its printed Last Payment Date is mapped to the shared fact, normalized');
  const printedEntry = oldRecord.printed['Last Payment Date'];
  check.equal(printedEntry.normalized, '2015-03-01', 'the printed entry keeps the same normalized value the fact carries');
  check.ok(printedEntry.location && printedEntry.location.page === 1 && typeof printedEntry.location.line === 'number',
    'and the printed page/line location the fact source is derived from');
  check.equal(old.reference_date.normalized_value, REFERENCE_DATE, 'the report reference date the period is measured against is recorded');

  /* ---- 2. The positive: an old last payment plus supported adverse-debt information. ---- */
  const positive = evaluateFor(old);
  const posResults = abResults(positive);
  check.equal(posResults.length, 1, 'the Alberta limb runs once on the account that prints an old last payment and adverse debt information');
  check.equal(posResults[0].machine.arithmetic.outcome, 'PERIOD_EXCEEDED', 'and its printed period is exceeded');
  const posFinding = posResults[0].machine.finding;
  check.ok(posFinding, 'a supported finding is emitted');
  check.equal(posFinding.classification, 'PROBABLE_VIOLATION', 'classified as a probable violation, never a definite one');
  check.equal(posFinding.citation, CITATION, 'citing the retrieved provision');
  check.equal(posFinding.period_years, 6, 'over the six years the provision records');
  const evalRecord = posFinding.evaluation || {};
  const unavailableJson = JSON.stringify(evalRecord.decisive_facts_unavailable || []);
  check.match(unavailableJson, /debt-incurred-date-not-printed/,
    'the evaluation records the date the debt was incurred as a decisive fact that is unavailable from a resolved reading');
  check.match(JSON.stringify(evalRecord.exceptions || {}), /debt-incurred-date-not-printed/,
    'and the unresolved condition stays declared in the exception evaluation rather than being cleared');
  check.equal(posFinding.classification, 'PROBABLE_VIOLATION', 'so the classification stays probable');
  check.notEqual(posFinding.classification, 'VIOLATION',
    'and a generic breach flag never upgrades it to a definite breach: the complete statutory condition is not proven');
  check.ok(evalRecord.predicates_resolved === true,
    'while every report-resolvable predicate IS resolved, which is why an issue is supported at all');

  /* The gate itself, through the shared contract: it must decide from THIS account's own printed values. */
  const abConfig = require('../../../adapters/adapter-configs.json').adapters.find((a) => a.adapter_id === AB);
  const gate = applicability.resolveApplicability(abConfig, old, oldRecord);
  check.equal(gate.applicability, 'APPLICABLE', 'the limb is applicable only when this account prints adverse-debt evidence of its own');
  check.match(JSON.stringify(gate.evidence), /printed_past_due/, 'deciding from the account printed past-due amount');
  check.match(JSON.stringify(gate.evidence), /does_not_establish/, 'and stating that it establishes nothing about any other account');

  evidence.binding = { kind: oldRecord.kind, anchor_fact: 'tradeline.lastPaymentDate', printed_value: printedEntry.normalized, printed_location: printedEntry.location, reference_date: REFERENCE_DATE };
  evidence.positive = { outcome: posResults[0].machine.arithmetic.outcome, classification: posFinding.classification, unresolved_decisive_facts: (evalRecord.decisive_facts_unavailable || []).map((e) => e.identity) };

  /* ---- 3. Controls: nothing unsupported is raised. ---- */
  const recent = evaluateFor(extractionFor([tuBlock(RECENT)]));
  check.equal(abFindings(recent).length, 0, 'a debt whose printed last payment is inside the six years raises no Alberta issue');
  check.equal(abResults(recent).length, 1, 'although the limb still ran and recorded its comparison');
  check.equal(abResults(recent)[0].machine.arithmetic.outcome, 'PERIOD_NOT_EXCEEDED', 'which is the recorded not-exceeded outcome');

  const missingExtraction = extractionFor([tuBlock(Object.assign({}, OLD, { lastPaymentMode: 'blank' }))]);
  const missing = evaluateFor(missingExtraction);
  const missingRecord = missingExtraction.records[0];
  check.equal(abFindings(missing).length, 0, 'an entry printing the label with no value raises no Alberta issue');
  check.ok(!missingRecord || missingRecord.facts['tradeline.lastPaymentDate'] === undefined,
    'and no shared fact is written for a value that was not read');

  const benign = evaluateFor(extractionFor([tuBlock(BENIGN_OLD)]));
  check.equal(abResults(benign).length, 0, 'an OLD last payment on a satisfactory account does not run the limb at all');
  check.equal(abFindings(benign).length, 0, 'so it raises no Alberta issue merely because its payment is old');
  check.ok((benign.not_applicable_checks || []).some((r) => r.adapter_id === AB),
    'and the record is filed as NOT APPLICABLE from the report own statement that it was not delinquent');

  const unreadable = evaluateFor(extractionFor([tuBlock(UNREADABLE_RATING)]));
  check.equal(abResults(unreadable).length, 0, 'a rating this build cannot read as a value raises no Alberta issue');
  check.equal(abFindings(unreadable).length, 0, 'and no adverse meaning is inferred from an unrecognized rating');
  check.ok((unreadable.unresolved_applicability || []).some((r) => r.adapter_id === AB),
    'the record is filed as unresolved instead, because a count that could not be read is not a zero');

  const notBorrowed = extractionFor([tuBlock(BENIGN_OLD), tuBlock(RECENT)]);
  const notBorrowedEval = evaluateFor(notBorrowed);
  const notBorrowedFindings = abResults(notBorrowedEval).map((r) => r.machine && r.machine.finding).filter(Boolean);
  check.equal(notBorrowedFindings.length, 0,
    'adverse information printed on ANOTHER account is not borrowed by the account that prints none');
  check.ok(abResults(notBorrowedEval).length >= 1,
    'while the account that does print adverse information still runs its own comparison');
  check.ok((notBorrowedEval.not_applicable_checks || []).filter((r) => r.adapter_id === AB).length >= 1,
    'and the satisfactory account is filed as not applicable rather than being made applicable by its neighbour');

  const revolving = evaluateFor(extractionFor([tuBlock(REVOLVING)]));
  const revolvingFinding = abFindings(revolving)[0];
  check.ok(revolvingFinding, 'a revolving account with the same printed dates still supports an issue');
  check.equal(revolvingFinding && revolvingFinding.classification, 'PROBABLE_VIOLATION', 'which stays a probable verification, never a definite breach');
  check.notEqual(revolvingFinding && revolvingFinding.classification, 'VIOLATION', 'so later borrowing on a revolving balance never becomes a definite breach');
  check.match(JSON.stringify((revolvingFinding && revolvingFinding.evaluation && revolvingFinding.evaluation.decisive_facts_unavailable) || []),
    /debt-incurred-date-not-printed/, 'and the later-borrowing uncertainty is carried in the evaluation evidence');

  const twoExtraction = extractionFor([tuBlock(OLD), tuBlock(RECENT)]);
  const twoFindings = abResults(evaluateFor(twoExtraction)).map((r) => r.machine && r.machine.finding).filter(Boolean);
  check.equal(twoFindings.length, 1, 'with two accounts, only the one whose own printed date is outside the period supports an issue');
  check.equal(twoFindings[0] && twoFindings[0].anchor.iso, '2015-03-01', 'and it is anchored on that account own printed date');
  check.equal(twoFindings[0] && twoFindings[0].anchor.source.raw_value, 'Mar 01, 2015', 'keeping the raw printed reading beside it');
  const secondPrinted = twoExtraction.records[1] && twoExtraction.records[1].printed['Last Payment Date'];
  check.notDeepEqual(twoFindings[0] && twoFindings[0].anchor.source.location, secondPrinted && secondPrinted.location,
    'keeping its own printed location rather than borrowing the other account location');

  const outside = evaluateFor(old, 'CA-NS');
  check.equal(abResults(outside).length, 0, 'the same printed dates outside Alberta raise no Alberta issue');

  /* ---- 4. Service integration: the selected issue travels the REAL packet path. ---- */
  const DETAILS = { consumer_name: 'Ada Fictional', contact: 'ada@example.test' };
  const owner = await service.unpaidAccount('ch-ab@example.test');
  const stranger = await service.unpaidAccount('ch-ab-stranger@example.test');
  const unpaid = await service.unpaidAccount('ch-ab-unpaid@example.test');
  const unpaidCase = (await service.request('POST', '/api/cases', { token: unpaid.token, body: { country: 'CA', region: 'CA-AB' } })).json.case;
  const refused = await service.request('POST', `/api/cases/${unpaidCase.case_id}/packet/correspondence`, { token: unpaid.token, body: { correspondence: DETAILS } });
  check.equal(refused.status, 402, 'an unpaid account cannot reach the packet path');
  check.equal(refused.json.error.code, 'ENTITLEMENT_REQUIRED', 'with the entitlement refusal');

  const c = (await service.request('POST', '/api/cases', { token: owner.token, body: { country: 'CA', region: 'CA-AB' } })).json.case;
  await payReportOnce(service, owner, c.case_id);
  inject(service, owner, c.case_id, positive, old);
  const pv = (await packetOf(service, owner, c.case_id)).json.view;
  const issue = abIssue(pv);
  check.ok(issue, 'the Alberta issue is offered for selection in the packet');
  check.equal(issue.eligible, true, 'and it is selectable');
  check.equal(issue.request_type, 'VERIFICATION', 'as a verification request, never a correction demand');
  check.match(String(issue.uncertainty), /debt was incurred/, 'with the timing uncertainty stated in the consumer wording');
  check.match(String(issue.uncertainty), /probable|not an established violation/i, 'and the probable qualification stated plainly');
  check.equal(JSON.stringify(issue.supported_bases || []).includes(AB), false, 'with no internal adapter id leaked to the consumer');

  check.equal((await service.request('POST', `/api/cases/${c.case_id}/packet/select`, { token: stranger.token, body: { issue_ids: [issue.issue_id] } })).status, 403,
    'another account cannot select on this packet');
  check.equal((await service.request('GET', `/api/cases/${c.case_id}/packet-download`, { token: stranger.token })).status, 403, 'nor download it');

  await service.request('POST', `/api/cases/${c.case_id}/packet/select`, { token: owner.token, body: { issue_ids: [issue.issue_id] } });
  check.equal((await packetOf(service, owner, c.case_id)).json.view.packet.selected_count, 1, 'the consumer selects the Alberta issue');
  await service.request('POST', `/api/cases/${c.case_id}/packet/correspondence`, { token: owner.token, body: { correspondence: DETAILS } });
  check.match(JSON.stringify((await packetOf(service, owner, c.case_id)).json.view), /Ada Fictional/, 'the reviewed correspondence carries the consumer-supplied details');
  check.equal((await service.request('POST', `/api/cases/${c.case_id}/packet/approve`, { token: owner.token })).status, 200, 'the packet approves');
  const dl = await service.request('GET', `/api/cases/${c.case_id}/packet-download`, { token: owner.token });
  check.equal(dl.status, 200, 'and the entitled download succeeds');
  check.match(dl.text, /Alta\. Reg\. 193\/99, s\. 4\(b\)/, 'naming the recorded rule behind the issue');
  check.ok(dl.text.includes('Mar 01, 2015'), 'carrying the printed last payment reading as evidence');
  check.match(dl.text, /Request \(verification\): /, 'with a verification request');
  check.match(dl.text, /debt was incurred/, 'and the timing uncertainty preserved in the downloaded packet');

  /* Stale approval: the approval is bound to the reviewed content, so evidence that changes afterwards must not
     silently yield a packet that differs from what was approved. */
  inject(service, owner, c.case_id, positive, extractionFor([tuBlock(Object.assign({}, OLD, { lastPayment: 'Apr 02, 2015' }))]));
  const stale = await service.request('GET', `/api/cases/${c.case_id}/packet-download`, { token: owner.token });
  check.notEqual(stale.status, 200, 'a packet whose evidence changed after approval is not silently downloaded');
  check.match(JSON.stringify(stale.json || {}), /STALE/, 'and the refusal names the stale approval');

  evidence.structural_model = 'the reader own account block placed by tuFamily.tableColumns, admitted as SYNTHETIC_STRUCTURAL_TEST_INPUT_NOT_A_REPORT; it establishes no presentation evidence and is NOT PDF-upload delivery';
  evidence.service_integration = 'the evaluated result was injected into the case store and the REAL packet path ran: selection -> reviewed correspondence -> approval -> entitled download, with ownership, entitlement and stale-approval controls';
  evidence.controls = [
    'a recent printed last payment raises nothing and records the not-exceeded outcome',
    'a label printed with no value raises nothing and writes no shared fact',
    'benign information does not run the limb at all, having no adverse-debt evidence',
    'a revolving account never becomes a definite breach and keeps the later-borrowing uncertainty',
    'two accounts keep their own printed values and locations; only the one outside the period supports an issue',
    'the same printed dates outside Alberta raise no Alberta issue'
  ];
  return evidence;
}

module.exports = {
  run,
  id: 'ch-ca-ab-debt-six-year',
  title: 'BATCH-10: Alberta s.4(b) debt reporting period — qualified verification issue through the complete packet path'
};
