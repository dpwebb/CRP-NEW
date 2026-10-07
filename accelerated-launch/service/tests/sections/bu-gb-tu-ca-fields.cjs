'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const gbFamily = require('../../format-families/gb-experian-consumer.cjs');
const auFamily = require('../../format-families/au-equifax-consumer.cjs');
const tuFamily = require('../../format-families/tu-ca-consumer.cjs');
const commonErrors = require('../../common-errors.cjs');
const issues = require('../../issues.cjs');
const formats = require('../../formats.cjs');
const comparison = require('../../comparison.cjs');
const { makeSyntheticModel } = require('../../../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');

const A4 = { width_pt: 595.32, height_pt: 841.92, label: 'A4' };
const SYNTHETIC_ADMISSION = Object.freeze({ state: 'SYNTHETIC_STRUCTURAL_TEST_INPUT_NOT_A_REPORT', admitted: true, refusal_reason: null, fact_status: null, presentation_evidence: false });

function gbModel(accountLines) { return makeSyntheticModel({ pages: [['Credit account information', 'C1  SOME BANK', ...accountLines]], page_count: 1, page_size: A4 }); }
function tuModel(accountLines) { return makeSyntheticModel({ pages: [['Account(s)', 'Creditor Name', ...accountLines]], page_count: 1, page_size: A4 }); }

function gbExtraction(accountLines) { const x = gbFamily.extract(gbModel(accountLines), SYNTHETIC_ADMISSION); for (const r of x.records) { r.source_bureau = 'Experian'; r.source_report_reference_date = '2007-06-01'; } return { presentation_id: gbFamily.FAMILY_ID, family_id: gbFamily.FAMILY_ID, records: x.records }; }
function tuExtraction(accountLines) { const x = tuFamily.extract(tuModel(accountLines), SYNTHETIC_ADMISSION); for (const r of x.records) { r.source_bureau = 'TransUnion'; r.source_report_reference_date = '2026-10-04'; } return { presentation_id: tuFamily.FAMILY_ID, family_id: tuFamily.FAMILY_ID, records: x.records }; }

function pipeline(extraction) { const ce = commonErrors.runCommonErrorChecks({ extraction }); const iss = issues.issuesFor({ evaluation: { results: [], common_errors: ce }, extraction }); return { ce, iss }; }
function accountDatesIssues(iss) { return iss.filter((i) => i.check_id === 'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY'); }

const AU_FOOTER = `${auFamily.PUBLISHER_NAME}   Page {page} of {pages}   ${auFamily.PUBLISHER_ABN}`;
function auModel(liabilityLines) {
  const pages = [
    ['CASE SUBJECT', 'Report Date: 4 January 2016', 'Reference: 0000'],
    [AU_FOOTER.replace('Page {page} of {pages}', 'Page 2 of 3'), '', 'Personal Information', '', 'Credit Overview', '', 'Summary'],
    [AU_FOOTER.replace('Page {page} of {pages}', 'Page 3 of 3'), '', 'Consumer Credit Liability Information', ...liabilityLines]
  ];
  return makeSyntheticModel({ pages, page_count: pages.length, page_size: A4 });
}
function auExtraction(liabilityLines) {
  const x = auFamily.extract(auModel(liabilityLines), SYNTHETIC_ADMISSION);
  for (const r of x.records) { r.source_bureau = 'Equifax'; r.source_report_reference_date = '2016-01-04'; }
  return { presentation_id: auFamily.FAMILY_ID, family_id: auFamily.FAMILY_ID, records: x.records };
}

function inject(service, actor, caseId, ce, records, bureau) {
  service.service.store.update((state) => { state.results.push({ result_id: `res_${bureau}_${crypto.randomBytes(10).toString('hex')}`, case_id: caseId, account_id: actor.account_id, file_id: null, file_ids: [], evaluation: { results: [], common_errors: ce }, extraction: { records, bureau, reference_date: { normalized_value: (records[0] && records[0].source_report_reference_date) || null } }, clarification_eligibility: [], reviewed_at: null, created_at: new Date().toISOString() }); });
}

async function payReportOnce(service, actor, caseId) {
  const checkout = await service.request('POST', '/api/billing/checkout', { token: actor.token, body: { plan_code: 'monthly' } });
  const c = checkout.json.checkout;
  const event = { id: `test_evt_${crypto.randomBytes(8).toString('hex')}`, type: 'checkout.session.completed', account_reference: actor.account_id, plan_code: c.plan.plan_code, session_reference: c.provider_reference, amount_cents: c.plan.amount_cents, currency: c.plan.currency, occurred_at: new Date().toISOString() };
  await service.postEvent(event);
}

async function run(service, check) {
  const evidence = {};

  const gbPos = pipeline(gbExtraction(['Started 19/10/06', 'Settled 19/10/05']));
  const gbIssues = accountDatesIssues(gbPos.iss);
  check.equal(gbIssues.length, 1, 'a GB account opened after its settlement date is one account-dates issue');
  check.equal(gbIssues[0].classification, null, 'never a legal classification');
  check.equal(gbIssues[0].request_type, 'VERIFICATION', 'as a verification request');
  check.ok(gbIssues[0].source_facts.some((f) => f.raw_value === '19/10/06' && f.source_field === 'Started' && f.normalized_value === '2006-10-19'), 'with the printed Started reading carried as raw + normalized + source label');
  check.ok(gbIssues[0].source_facts.some((f) => f.raw_value === '19/10/05' && f.source_field === 'Settled' && f.location && f.location.page === 1), 'and the Settled reading with its location');

  const tuPos = pipeline(tuExtraction(['Opened Date  Oct 2, 2025', 'Closed Date  Oct 2, 2024']));
  const tuIssues = accountDatesIssues(tuPos.iss);
  check.equal(tuIssues.length, 1, 'a TU-CA tradeline opened after its close date is one account-dates issue');
  check.ok(tuIssues[0].source_facts.some((f) => f.raw_value === 'Oct 2, 2025' && f.source_field === 'Opened Date'), 'with the printed Opened Date carried as raw + source label');
  check.ok(tuIssues[0].source_facts.some((f) => f.raw_value === 'Oct 2, 2024' && f.source_field === 'Closed Date'), 'and the Closed Date');

  check.equal(accountDatesIssues(pipeline(gbExtraction(['Started 19/10/05', 'Settled 19/10/06'])).iss).length, 0, 'a GB account opened before it settled produces no issue');
  check.equal(accountDatesIssues(pipeline(tuExtraction(['Opened Date  Oct 2, 2024', 'Closed Date  Oct 2, 2025'])).iss).length, 0, 'a TU-CA tradeline opened before it closed produces no issue');

  /* ---- BLOCKER-REPORT-DATA-TO-ISSUE-001 (GB slice): the reader already READ this account's printed balance,
     current balance, credit limit, default amount and status history, and dropped them before the shared checks.
     They are mapped now, keeping each printed raw reading. The real captured GB example is read read-only. ---- */
  const gbSpecimen = path.resolve(__dirname, '..', '..', '..', '..', 'SOURCE_CAPTURES', 'REPORT_FORMAT_BASELINE_2026-09-30', 'PUB-009.pdf');
  check.ok(fs.existsSync(gbSpecimen), 'the captured GB example PUB-009 is present');
  const gbReal = formats.extractWithSharedAdapter(formats.buildPdfDocumentModel(gbSpecimen), { mode: 'REPORT', country: 'GB' });
  check.equal(gbReal.presentation_id, gbFamily.FAMILY_ID, 'and it is read by the GB family');
  const gbAccounts = gbReal.records.filter((r) => r.kind === 'GB_CREDIT_ACCOUNT');
  check.equal(gbAccounts.length, 5, 'its five credit-account items are read');
  check.deepEqual(gbAccounts.map((r) => r.facts['account.balance']), [344, 1126, 0, undefined, 695],
    'each maps its printed balance, and a printed `Satisfied` maps NO number (it is never coerced to zero)');
  check.deepEqual(gbAccounts.map((r) => r.facts['account.creditLimit']), [360, 1300, undefined, undefined, undefined],
    'and its printed credit limit where the artifact prints one');
  check.equal(gbAccounts[1].facts['account.type'], 'CREDIT CARD',
    'the exact credit-card suffix on the second heading supplies revolving account type');
  check.ok(gbAccounts[1].printed['account.type']?.location?.page > 0,
    'the type keeps its own heading location');
  check.equal(gbAccounts[0].facts['account.type'], 'CURRENT ACCOUNT',
    'the current-account type is retained literally without revolving semantics');
  check.equal(gbAccounts[0].facts['account.balanceRaw'], '\u00a3344', 'with the printed raw reading kept beside the number');
  check.deepEqual(gbAccounts.map((r) => r.facts['account.defaultAmount']), [undefined, undefined, undefined, 548, 1021],
    'and the printed default amount where the account prints one');
  check.ok(gbAccounts.every((r) => typeof r.facts['account.statusHistoryRaw'] === 'string'),
    'every credit account preserves its printed status history verbatim');
  const gbCells = gbAccounts.flatMap((r) => r.facts['account.paymentHistoryCells'] || []);
  check.equal(gbCells.length, 32, 'and every printed status-history character becomes one raw cell');
  check.equal(gbCells.filter((c) => c.period).length, 18,
    'only the two ongoing accounts use their own period-to anchors and published history order');
  check.ok(gbCells.filter((c) => !c.period).every((c) => c.uncertain === true),
    'settled and default histories remain unusable for period comparisons');
  check.equal(gbAccounts[2].facts['account.responsibility'], 'JOINT', 'the printed `JOINT ACCOUNT` marker is mapped');
  check.equal(gbAccounts[0].facts['account.responsibility'], undefined, 'and its absence is never read as INDIVIDUAL');
  check.equal(gbAccounts[0].facts['account.masked_identifier'], undefined,
    'no account identifier is invented: the artifact prints none inside the account block');
  check.equal(commonErrors.runCommonErrorChecks({ extraction: gbReal }).summary.potential_issue, 0,
    'the real GB example forces NO potential issue');
  check.equal(commonErrors.runCommonErrorChecks({ extraction: gbReal }).performed
    .find((c) => c.check_id === 'COMMON-ERROR-REVOLVING-BALANCE-ZERO-LIMIT')?.state,
  'NOT_DETECTED', 'the captured GB credit card has a positive limit, so the new check finds no violation');
  const gbCap = commonErrors.presentationCapability(gbFamily.FAMILY_ID);
  check.equal(gbCap.all_factual_checks['COMMON-ERROR-REVOLVING-BALANCE-ZERO-LIMIT'].field_ready,
    true, 'the GB reader can structurally supply type, balance and credit limit');
  check.equal(gbCap.checks['COMMON-ERROR-PAYMENT-HISTORY-INCONSISTENCY'], true,
    'the GB reader structurally supports source-defined ongoing payment history');
  check.deepEqual(gbCap.retained_fields_without_a_usable_check.map((r) => r.field), [],
    'ongoing source-supported history is no longer classified as always unusable');
  const gbFormatCap = commonErrors.formatCapability(gbReal);
  check.equal(gbFormatCap.checks['COMMON-ERROR-PAYMENT-HISTORY-INCONSISTENCY'].supported, true,
    'the per-report capability measures the usable ongoing cells');
  check.deepEqual(gbFormatCap.checks['COMMON-ERROR-PAYMENT-HISTORY-INCONSISTENCY'].retained_but_not_usable_fields, [],
    'the supported field is not counted as wholly unusable');
  check.equal(gbCap.checks['COMMON-ERROR-BALANCE-PAYMENT-INCONSISTENCY'], false,
    'nor the balance/past-due pair: this presentation prints no past-due and no payment amount');
  check.equal(gbCap.checks['COMMON-ERROR-DUPLICATE-REPORTING'], false,
    'and with no masked identifier the identity-keyed checks stay unavailable');
  /* BATCH-22: the artifact PRINTS each credit account's heading (lender + account type) and the reader used that
     line only to open the block. It is mapped now, so a GB account can take part in identity-based comparison.
     The confident duplicate/responsibility path still needs a masked reference, so nothing is weakened. */
  check.deepEqual(gbAccounts.map((r) => r.facts['account.reported_identity']),
    ['LENDU MONEY LIMITED CURRENT ACCOUNT', 'BOODLES BANK PLC CREDIT CARD', 'GENERAL BANK PLC LOAN', 'MOBILE PHONE FIRM RENTAL', 'MOBILE PHONE COMPANY RENTAL'],
    'each printed account heading is mapped as the account identity, exactly as printed');
  check.ok(gbAccounts.every((r) => r.facts['account.reported_identityRaw'] === r.facts['account.reported_identity']),
    'with the raw printed heading preserved beside it');
  check.equal(gbAccounts.filter((r) => r.facts['account.reported_identity']).length, 5,
    'so all five GB credit accounts now carry an identity instead of none');
  check.equal(gbAccounts.every((r) => r.facts['account.masked_identifier'] === undefined), true,
    'while no masked reference is invented: the artifact prints none, so the confident duplicate path stays closed');
  check.ok(commonErrors.runCommonErrorChecks({ extraction: gbReal }).summary.potential_issue === 0,
    'and mapping the printed identity forces no new potential issue on the real example');
  evidence.gb_material = 'GB own amounts, heading, joint marker and history reach shared facts; ongoing periods use own period-to dates and published issuer definitions, settled/default periods remain unresolved, and no issue is forced';

  /* ---- BLOCKER-REPORT-DATA-TO-ISSUE-001 (AU slice): the AU liability record's printed credit limit, account type
     and credited provider now reach the shared facts, and the repayment-history EVIDENCE the artifact prints as
     TEXT is recorded. Embedded image cells are decoded only against their own positioned account legend.
     Real PUB-012, read read-only. ---- */
  const auSpecimen = path.resolve(__dirname, '..', '..', '..', '..', 'SOURCE_CAPTURES', 'REPORT_FORMAT_BASELINE_2026-09-30', 'PUB-012.pdf');
  check.ok(fs.existsSync(auSpecimen), 'the captured AU example PUB-012 is present');
  const auReal = formats.extractWithSharedAdapter(formats.buildPdfDocumentModel(auSpecimen), { mode: 'REPORT', country: 'AU' });
  check.equal(auReal.presentation_id, auFamily.FAMILY_ID, 'and it is read by the AU family');
  const auLiabilities = auReal.records.filter((r) => r.kind === 'CONSUMER_CREDIT_LIABILITY');
  check.equal(auLiabilities.length, 3, 'its three liability items are read (the third is the truncated continuation item)');
  check.deepEqual(auLiabilities.map((r) => r.facts['account.reported_identity']), ['EXPRESS BANK', 'EXPRESS BANK', 'EXPRESS BANK'],
    'each maps the credited provider it prints');
  check.deepEqual(auLiabilities.map((r) => r.facts['account.type']), ['CREDIT CARD', 'PERSONAL LOAN (FIXED TERM)', undefined],
    'and the printed Type Of Account');
  check.deepEqual(auLiabilities.map((r) => r.facts['account.creditLimit']), [10000, 15000, undefined],
    'and the printed credit limit as a number');
  check.equal(auLiabilities[0].facts['account.creditLimitRaw'], '$10,000', 'with its raw reading kept beside it');
  const auHistory = auLiabilities[0].printed.repayment_history;
  check.equal(auHistory.period_months.length, 12, 'the printed month captions the grid covers are recorded');
  check.deepEqual(auHistory.period_years, [2014, 2015, 2016], 'with the printed year captions');
  check.ok(auHistory.legend_lines.length >= 4 && auHistory.legend_lines.every((l) => l.location && l.location.page),
    "and the artifact's own legend verbatim, with its page/line");
  check.equal(auHistory.cells_readable, true, 'the own legend resolves the embedded repayment symbols');
  check.deepEqual(auLiabilities.map((r) => (r.facts['account.paymentHistoryCells'] || []).length), [36, 36, 0],
    'each full own-account grid supplies 36 cells and the incomplete continuation supplies none');
  check.equal(commonErrors.runCommonErrorChecks({ extraction: auReal }).summary.potential_issue, 0,
    'the real AU example forces NO potential issue');
  const auCap = commonErrors.presentationCapability(auFamily.FAMILY_ID);
  check.equal(auCap.checks['COMMON-ERROR-PAYMENT-HISTORY-INCONSISTENCY'], true,
    'the AU reader can compare source-defined dated repayment cells');
  check.deepEqual(auCap.retained_fields_without_a_usable_check.map((r) => r.field), [],
    'the live capability inventory no longer repeats the false unreadable-grid claim');
  check.ok(/READER can structurally produce/.test(auCap.basis), 'with the capability basis stated as the reader surface, not one specimen\'s fields');
  evidence.au_material = 'AU Credit Limit / Type Of Account / Credit Provider and 72 embedded repayment symbols reach the shared facts with their own period captions and printed account legends; no issue is forced';

  /* ---- Creditor/account NAME in issue review, correspondence, the downloaded packet, and APPROVAL BINDING. ---- */
  const auPositive = auExtraction([
    'Credit Provider  EXPRESS BANK',
    'Type Of Account  Credit Card',
    'Credit Limit  $9,000',
    'Opened Date  1 January 2020',
    'Closed Date  1 January 2019'
  ]);
  const auPosIssues = accountDatesIssues(pipeline(auPositive).iss);
  check.equal(auPosIssues.length, 1, 'an AU liability opened after its close date is one account-dates issue');
  check.equal(auPosIssues[0].account_identity.name, 'EXPRESS BANK', 'and the issue carries the credited account it concerns');
  check.ok(auPosIssues[0].account_identity.location && auPosIssues[0].account_identity.location.page, 'with the page it was printed on');

  const auBenign = pipeline(auExtraction([
    'Credit Provider  EXPRESS BANK', 'Type Of Account  Credit Card', 'Credit Limit  $9,000',
    'Opened Date  1 January 2019', 'Closed Date  1 January 2020'
  ]));
  check.equal(accountDatesIssues(auBenign.iss).length, 0, 'a consistent AU liability produces no issue');

  const auOwner = await service.unpaidAccount('bu-au@example.test');
  const auCase = (await service.request('POST', '/api/cases', { token: auOwner.token, body: { country: 'AU', region: 'AU-NSW' } })).json.case;
  await payReportOnce(service, auOwner, auCase.case_id);
  inject(service, auOwner, auCase.case_id, pipeline(auPositive).ce, auPositive.records, 'Equifax');
  const auView = (await service.request('GET', `/api/cases/${auCase.case_id}/packet`, { token: auOwner.token })).json.view;
  const auSelected = auView.eligible_issues.find((i) => i.check_kind && i.account_identity);
  check.ok(auSelected, 'the issue review offers the issue together with its credited account');
  check.equal(auSelected.account_identity.name, 'EXPRESS BANK', 'naming the account the issue concerns');
  check.ok(auSelected.account_identity.location && auSelected.account_identity.location.page, 'and its printed source location');
  await service.request('POST', `/api/cases/${auCase.case_id}/packet/select`, { token: auOwner.token, body: { issue_ids: [auSelected.issue_id] } });
  await service.request('POST', `/api/cases/${auCase.case_id}/packet/correspondence`, { token: auOwner.token, body: { correspondence: { consumer_name: 'Dana Whitfield', contact: 'dana.whitfield@example.test' } } });
  const auPreview = (await service.request('GET', `/api/cases/${auCase.case_id}/packet`, { token: auOwner.token })).json.view.packet.correspondence_preview;
  check.ok(auPreview.includes('Account(s) concerned: EXPRESS BANK'), 'the correspondence preview names the account it concerns');
  await service.request('POST', `/api/cases/${auCase.case_id}/packet/approve`, { token: auOwner.token });
  const auDownload = await service.request('GET', `/api/cases/${auCase.case_id}/packet-download`, { token: auOwner.token });
  check.equal(auDownload.status, 200, 'the approved packet downloads');
  check.ok(auDownload.text.includes('Account: EXPRESS BANK'), 'and names the credited account inside the packet');
  /* A MATERIAL identity change after approval invalidates the approval. */
  service.service.store.update((state) => {
    const res = state.results.find((r) => r.case_id === auCase.case_id);
    const rec = res.extraction.records.find((r) => r.kind === 'CONSUMER_CREDIT_LIABILITY');
    rec.facts['account.reported_identity'] = 'EXPRESS BANK LIMITED';
  });
  const stale = await service.request('GET', `/api/cases/${auCase.case_id}/packet-download`, { token: auOwner.token });
  check.equal(stale.status, 409, 'a changed printed account identity invalidates the approval');
  check.equal(stale.json.error.code, 'PACKET_APPROVAL_STALE', 'with the stale-approval code');
  evidence.account_identity_binding = 'the credited account name is shown in issue review, in the correspondence and in the downloaded packet with its printed source location, and a material identity change invalidates a prior approval';

  /* ---- Owner constraint (this batch): a missing identifier is a RECORDED BOUNDARY. It must NOT block independent
     assessment, and the EXISTING comparison mechanism is REUSED unchanged — no cross-bureau matching is built from
     a creditor name, a balance or a limit alone. ---- */
  const noMaskRecords = [{
    record_index: 1,
    kind: 'TU_CA_TRADELINE',
    kind_label: 'tradeline',
    status: 'RESOLVED',
    source_bureau: 'TransUnion',
    source_report_reference_date: '2026-01-10',
    facts: {
      'account.reported_identity': 'FAMILY CREDITOR',
      'account.balance': 100,
      'account.balanceRaw': '100',
      'account.pastDueAmount': 500,
      'account.pastDueAmountRaw': '500',
      'liability.openedDate': '2024-01-01',
      'liability.closedDate': '2025-01-01'
    }
  }];
  const noMaskExtraction = { presentation_id: tuFamily.FAMILY_ID, family_id: tuFamily.FAMILY_ID, records: noMaskRecords };
  const noMaskIssues = pipeline(noMaskExtraction).iss;
  check.equal(noMaskIssues.filter((i) => i.check_id === 'COMMON-ERROR-BALANCE-PAYMENT-INCONSISTENCY').length, 1,
    'with NO masked identifier, the supported balance/past-due issue is still produced — the boundary does not block independent assessment');
  check.equal(noMaskIssues.filter((i) => i.check_id === 'COMMON-ERROR-DUPLICATE-REPORTING').length, 0,
    'and the identity-keyed duplicate check simply produces no match rather than suppressing the others');
  check.equal(Object.hasOwn(commonErrors.runCommonErrorChecks({ extraction: noMaskExtraction }).summary,
    'legal_findings_emitted'), false, 'and the common-error summary has no legal-finding category');

  const matchPair = (a, b) => comparison.matchRecords({ kind: 'TU_CA_TRADELINE', ...a }, { kind: 'TU_CA_TRADELINE', ...b });
  check.equal(matchPair({ facts: { 'account.reported_identity': 'FAMILY CREDITOR' } }, { facts: { 'account.reported_identity': 'FAMILY CREDITOR' } }).state,
    'QUALIFIED', 'the reused comparison mechanism treats a creditor name alone as a QUALIFIED identity match, never a confident one');
  check.equal(matchPair({ facts: { 'account.reported_identity': 'FAMILY CREDITOR' } }, { facts: { 'account.reported_identity': 'FAMILY CREDITOR' } }).reason,
    'CREDITOR_IDENTITY_MATCHES_ALONE', 'and says exactly why');
  check.equal(matchPair({ bureau: 'Equifax', facts: { 'account.reported_identity': 'FAMILY CREDITOR' } }, { bureau: 'TransUnion', facts: { 'account.reported_identity': 'FAMILY CREDITOR' } }).state,
    'QUALIFIED', 'a CROSS-BUREAU name-only pair is likewise only QUALIFIED, so no cross-bureau matching was introduced by the new identity facts');
  check.equal(matchPair({ facts: {} }, { facts: { 'account.reported_identity': 'FAMILY CREDITOR' } }).state,
    'NONE', 'and a record with no supported identity cannot be matched at all');
  evidence.missing_identifier_boundary = 'a record with no masked identifier still produces its independently supported issues; the reused comparison mechanism still refuses to merge on a creditor name alone (QUALIFIED, never confident), so no cross-bureau matching was added';

  const owner = await service.unpaidAccount('bu-gbtu@example.test');
  const gbCase = (await service.request('POST', '/api/cases', { token: owner.token, body: { country: 'GB', region: 'GB-ENG' } })).json.case;
  await payReportOnce(service, owner, gbCase.case_id);
  inject(service, owner, gbCase.case_id, gbPos.ce, gbExtraction(['Started 19/10/06', 'Settled 19/10/05']).records, 'Experian');
  const gbPv = (await service.request('GET', `/api/cases/${gbCase.case_id}/packet`, { token: owner.token })).json.view;
  const gbSel = gbPv.eligible_issues.find((i) => i.explanation && i.explanation.indexOf('opened date later than its closed date') !== -1);
  check.ok(gbSel, 'the GB account-dates issue is offered for selection');
  await service.request('POST', `/api/cases/${gbCase.case_id}/packet/select`, { token: owner.token, body: { issue_ids: [gbSel.issue_id] } });
  await service.request('POST', `/api/cases/${gbCase.case_id}/packet/correspondence`, { token: owner.token, body: { correspondence: { consumer_name: 'Dana Whitfield', contact: 'dana.whitfield@example.test' } } });
  await service.request('POST', `/api/cases/${gbCase.case_id}/packet/approve`, { token: owner.token });
  const gbDl = await service.request('GET', `/api/cases/${gbCase.case_id}/packet-download`, { token: owner.token });
  check.equal(gbDl.status, 200, 'the GB account-dates packet downloads');
  check.ok(/opened date later than its closed date/.test(gbDl.text), 'with the factual verification request');
  check.ok(gbDl.text.includes('19/10/06'), 'with the printed Started reading as evidence');

  const tuCase = (await service.request('POST', '/api/cases', { token: owner.token, body: { country: 'CA', region: 'CA-ON' } })).json.case;
  await payReportOnce(service, owner, tuCase.case_id);
  inject(service, owner, tuCase.case_id, tuPos.ce, tuExtraction(['Opened Date  Oct 2, 2025', 'Closed Date  Oct 2, 2024']).records, 'TransUnion');
  const tuPv = (await service.request('GET', `/api/cases/${tuCase.case_id}/packet`, { token: owner.token })).json.view;
  const tuSel = tuPv.eligible_issues.find((i) => i.explanation && i.explanation.indexOf('opened date later than its closed date') !== -1);
  check.ok(tuSel, 'the TU-CA account-dates issue is offered for selection');
  await service.request('POST', `/api/cases/${tuCase.case_id}/packet/select`, { token: owner.token, body: { issue_ids: [tuSel.issue_id] } });
  await service.request('POST', `/api/cases/${tuCase.case_id}/packet/correspondence`, { token: owner.token, body: { correspondence: { consumer_name: 'Dana Whitfield', contact: 'dana.whitfield@example.test' } } });
  await service.request('POST', `/api/cases/${tuCase.case_id}/packet/approve`, { token: owner.token });
  const tuDl = await service.request('GET', `/api/cases/${tuCase.case_id}/packet-download`, { token: owner.token });
  check.equal(tuDl.status, 200, 'the TU-CA account-dates packet downloads');
  check.ok(tuDl.text.includes('Oct 2, 2025'), 'with the printed Opened Date as evidence');

  evidence.gb_account_dates = 'GB-Experian Started/Settled map to liability.openedDate/closedDate -> account-dates verification issue (downstream)';
  evidence.tu_ca_account_dates = 'TU-CA Opened/Closed Date map to liability.openedDate/closedDate -> account-dates verification issue (downstream)';
  evidence.constraint = 'GB and TU-CA structural contracts admit only their real specimens; a synthetic PDF cannot pass admit, so these field paths are downstream (store-injected) evidence';
  return evidence;
}

module.exports = { run, id: 'bu-gb-tu-ca-fields', title: 'OWNER-POTENTIAL-ISSUE-001 Branch B / BLOCKER-REPORT-DATA-TO-ISSUE-001: GB-Experian + TU-CA ordinary-account date AND material fields' };
