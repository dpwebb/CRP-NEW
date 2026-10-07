'use strict';
/**
 * bq-format-capability.cjs — OWNER-POTENTIAL-ISSUE-001 / Branch A: the six factual-verification issue types are
 * run by FIELD CAPABILITY, not by presentation name. A check runs only when its required normalized fields are
 * actually present; a missing field is reported as a gap, never inferred.
 */
const auFamily = require('../../format-families/au-equifax-consumer.cjs');
const commonErrors = require('../../common-errors.cjs');
const issues = require('../../issues.cjs');
const packets = require('../../packets.cjs');
const { makeSyntheticModel } = require('../../../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');

const A4 = { width_pt: 595.32, height_pt: 841.92, label: 'A4' };
const FOOTER = `${auFamily.PUBLISHER_NAME}   Page {page} of {pages}   ABN: ${auFamily.PUBLISHER_ABN}`;

function auModel(liabilityLines) {
  const pages = [
    ['CASE SUBJECT', 'Report Date: 4 January 2016', 'Reference: 0000'],
    [FOOTER.replace('Page {page} of {pages}', 'Page 2 of 3'), '', 'Personal Information', '', 'Credit Overview', '', 'Summary'],
    [FOOTER.replace('Page {page} of {pages}', 'Page 3 of 3'), '', 'Consumer Credit Liability Information', ...liabilityLines]
  ];
  return makeSyntheticModel({ pages, page_count: pages.length, page_size: A4 });
}

const SYNTHETIC_ADMISSION = Object.freeze({
  state: 'SYNTHETIC_STRUCTURAL_TEST_INPUT_NOT_A_REPORT',
  admitted: true,
  refusal_reason: null,
  fact_status: null,
  presentation_evidence: false,
  note: 'in-memory structural model: not a report, not presentation evidence'
});

function auExtraction(liabilityLines) {
  const x = auFamily.extract(auModel(liabilityLines), SYNTHETIC_ADMISSION);
  return { presentation_id: auFamily.FAMILY_ID, family_id: auFamily.FAMILY_ID, records: x.records };
}

function pipeline(extraction) {
  const ce = commonErrors.runCommonErrorChecks({ extraction });
  const iss = issues.issuesFor({ evaluation: { results: [], common_errors: ce }, extraction });
  return { ce, iss };
}


async function run(service, check) {
  const evidence = {};

  /* ---- 1. AU-Equifax liability record with opened > closed maps onto the account-dates issue. ---- */
  const pos = pipeline(auExtraction([
    'Credit Provider  SOME BANK',
    'Type Of Account  Credit Card',
    'Opened Date  1 January 2020',
    'Closed Date  1 January 2019'
  ]));
  const posIssues = pos.iss.filter((i) => i.check_id === 'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY');
  check.equal(posIssues.length, 1, 'the AU liability record maps onto the account-dates issue');
  check.equal(posIssues[0].classification, null, 'never a legal classification');
  check.equal(posIssues[0].request_type, 'VERIFICATION', 'as a verification request');
  check.ok(posIssues[0].source_facts.some((f) => f.raw_value === '1 January 2020' && f.normalized_value === '2020-01-01'), 'with the printed opened date carried as raw + normalized provenance');
  const material = packets.issueContent(posIssues[0]);
  check.ok(material.includes('1 January 2020') && material.includes('2020-01-01'), 'and the packet material content carries the same raw reading');

  /* ---- 2. Benign: consistent AU dates produce no issue. ---- */
  const benign = pipeline(auExtraction([
    'Credit Provider  SOME BANK',
    'Type Of Account  Credit Card',
    'Opened Date  1 January 2019',
    'Closed Date  1 January 2020'
  ]));
  check.equal(benign.iss.filter((i) => i.check_id === 'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY').length, 0, 'consistent AU liability dates produce no issue');

  /* ---- 3. Benign: the US-Experian reportedAccount surface supplies no fields for the six issue types. ---- */
  const us = pipeline({
    presentation_id: 'US-CONSUMER-DISCLOSURE',
    family_id: 'FAM-US-EXP-CONSUMER',
    records: [{
      record_index: 1, kind: 'REPORTED_ACCOUNT', kind_label: 'reported account', status: 'RESOLVED',
      facts: { 'reportedAccount.dateOpened': '2020-01-01', 'reportedAccount.firstReported': '2019-01-01', 'reportedAccount.status': 'OPEN' }
    }]
  });
  check.equal(us.iss.length, 0, 'no selectable issue is produced from fields that none of the six checks read');

  /* ---- 4. Capability matrix: exact supported/gap per issue type per presentation. ---- */
  const capAU = commonErrors.formatCapability(auExtraction(['Credit Provider  SOME BANK', 'Type Of Account  Credit Card', 'Opened Date  1 January 2020', 'Closed Date  1 January 2019']));
  check.equal(capAU.checks['COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY'].supported, true, 'AU supplies the account-dates fields');
  check.equal(capAU.checks['COMMON-ERROR-BALANCE-PAYMENT-INCONSISTENCY'].supported, false, 'AU does not supply balance/past-due amounts');
  check.deepEqual(capAU.checks['COMMON-ERROR-BALANCE-PAYMENT-INCONSISTENCY'].missing_fields, ['account.balance', 'account.pastDueAmount'], 'and the gap is named precisely');
  check.equal(capAU.checks['COMMON-ERROR-DUPLICATE-REPORTING'].supported, false, 'AU does not supply a masked account identifier (its printed account number is an unmasked bureau reference)');
  check.deepEqual(capAU.checks['COMMON-ERROR-DUPLICATE-REPORTING'].missing_fields, ['account.masked_identifier'], 'naming the remaining duplicate identity gap (the masked identifier) exactly');

  const capAUStatus = commonErrors.formatCapability(auExtraction(['Credit Provider  SOME BANK', 'Type Of Account  Credit Card', 'Opened Date  1 January 2020', 'Closed Date  1 January 2019', 'Current Repayment Status  Current']));
  check.equal(capAUStatus.checks['COMMON-ERROR-STATUS-DATE-CONTRADICTION'].supported, false, 'AU does not supply a lifecycle status (its "Current Repayment Status" is repayment performance, never mapped to the lifecycle status fact)');

  const capUS = commonErrors.formatCapability({
    presentation_id: 'US-CONSUMER-DISCLOSURE',
    family_id: 'FAM-US-EXP-CONSUMER',
    records: [{ record_index: 1, facts: { 'reportedAccount.dateOpened': '2020-01-01', 'reportedAccount.firstReported': '2019-01-01' } }]
  });
  check.ok(Object.values(capUS.checks).every((c) => c.supported === false), 'the US-Experian surface supports none of the six issue types today');
  check.deepEqual(capUS.checks['COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY'].missing_fields, ['liability.openedDate', 'liability.closedDate'], 'naming the account-dates gap exactly');

  /* ---- 5. Reader capability: the structural field surface each presentation CAN produce (not one report's). ---- */
  const capGeneral = commonErrors.presentationCapability('GENERAL-BUREAU-REPORT');
  check.ok(Object.values(capGeneral.checks).every((c) => c === true), 'the general-intake reader can structurally supply every one of the six issue types');
  const factualIds = require('../../common-error-checklist.cjs').CHECKS
    .map((row) => row.check_id).filter((id) => id.startsWith('COMMON-ERROR-'));
  check.equal(factualIds.length, 18, 'the product checklist has 18 factual rows including the omission umbrella');
  check.deepEqual(Object.keys(capGeneral.all_factual_checks).sort(), factualIds.sort(),
    'the full reader inventory accounts for every factual check');
  check.equal(capGeneral.all_factual_checks['COMMON-ERROR-REVOLVING-BALANCE-ZERO-LIMIT'].field_ready,
    true, 'the general reader structurally supplies type, balance and credit limit');
  check.equal(capGeneral.all_factual_checks['COMMON-ERROR-REPORTED-DATES-OUT-OF-ORDER'].field_ready,
    true, 'the general reader now parses exact opened and first-reported labels');
  check.equal(capGeneral.all_factual_checks['COMMON-ERROR-LAST-PAYMENT-OR-FIRST-DELINQUENCY-DATE'].field_ready,
    true, 'the general reader now parses exact last-payment and first-delinquency labels');
  check.equal(capGeneral.all_factual_checks['COMMON-ERROR-WRITE-OFF-WITHOUT-A-CHARGE-OFF-DATE'].reader_scope_admitted,
    true, 'a reader may use the omission rule only if it supplies the blank caption and report-defined event');
  check.equal(commonErrors.presentationCapability('US-CONSUMER-DISCLOSURE')
    .all_factual_checks['COMMON-ERROR-REPORTED-DATES-OUT-OF-ORDER'].field_ready,
  true, 'the US reader has the two reported-date fields');
  check.equal(commonErrors.presentationCapability('FAM-TU-CA-CONSUMER')
    .all_factual_checks['COMMON-ERROR-WRITE-OFF-WITHOUT-A-CHARGE-OFF-DATE'].reader_scope_admitted,
  true, 'the TransUnion Canada reader retains its source-proven omission path');
  const splitFields = commonErrors.formatCapability({ presentation_id: 'GENERAL-BUREAU-REPORT', records: [
    { facts: { 'account.balance': 100 } }, { facts: { 'account.pastDueAmount': 120 } }
  ] });
  check.equal(splitFields.checks['COMMON-ERROR-BALANCE-PAYMENT-INCONSISTENCY'].supported, false,
    'fields on different accounts do not imply a runnable same-account comparison');
  check.equal(splitFields.checks['COMMON-ERROR-BALANCE-PAYMENT-INCONSISTENCY'].not_on_same_record, true,
    'the capability result identifies the missing same-account pairing');
  check.equal(splitFields.all_factual_checks['COMMON-ERROR-BALANCE-PAYMENT-INCONSISTENCY'].field_ready,
    false, 'the full inventory also requires the compared fields on one account');
  check.equal(splitFields.all_factual_checks['COMMON-ERROR-BALANCE-PAYMENT-INCONSISTENCY'].detector_performed,
    false, 'a field gap is not reported as a performed check');

  const capAUReader = commonErrors.presentationCapability(auFamily.FAMILY_ID);
  check.equal(capAUReader.checks['COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY'], true, 'the AU reader supports account-dates');
  check.equal(capAUReader.checks['COMMON-ERROR-STATUS-DATE-CONTRADICTION'], false, 'but not status/closure (no lifecycle status is mapped)');
  check.equal(capAUReader.checks['COMMON-ERROR-DUPLICATE-REPORTING'], false, 'nor duplicate (its account number is an unmasked bureau reference, never a masked identifier)');
  check.equal(capAUReader.checks['COMMON-ERROR-BALANCE-PAYMENT-INCONSISTENCY'], false, 'nor balance/past-due (no amount pair)');
  check.equal(capAUReader.checks['COMMON-ERROR-RESPONSIBILITY-INCONSISTENCY'], false, 'nor responsibility (no responsibility label)');
  check.equal(capAUReader.checks['COMMON-ERROR-PAYMENT-HISTORY-INCONSISTENCY'], true, 'payment history is supported through own printed grid and legend images');
  check.equal(commonErrors.presentationCapability('US-CONSUMER-DISCLOSURE').checks['COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY'], false, 'the US reader supports no account-dates field');
  const capGB = commonErrors.presentationCapability('FAM-GB-EXP-CONSUMER');
  check.equal(capGB.checks['COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY'], true, 'the GB reader maps Started/Settled to account-dates');
  check.equal(capGB.checks['COMMON-ERROR-PAYMENT-HISTORY-INCONSISTENCY'], true,
    'the GB reader maps own ongoing history periods with reviewed issuer definitions');
  check.deepEqual(capGB.retained_fields_without_a_usable_check.map((r) => r.field), [],
    'usable dated GB history is no longer classified as always unusable');
  check.equal(commonErrors.presentationCapability(auFamily.FAMILY_ID).checks['COMMON-ERROR-PAYMENT-HISTORY-INCONSISTENCY'], true,
    'the AU reader supports source-linked payment history from the account grid and its own legend');
  check.equal(commonErrors.presentationCapability('FAM-TU-CA-CONSUMER').checks['COMMON-ERROR-PAYMENT-HISTORY-INCONSISTENCY'], true,
    'while the TransUnion Canada cells ARE usable: they carry a printed period and a printed legend');
  check.ok(/not what one specimen happened to print/i.test(capGB.basis),
    'and the capability basis states that one specimen\'s missing field is not a statement about the whole presentation');
  check.equal(capGB.checks['COMMON-ERROR-BALANCE-PAYMENT-INCONSISTENCY'], false, 'but no balance/past-due pair: the GB artifact prints no past-due');

  /* BLOCKER-REPORT-DATA-TO-ISSUE-001 cross-check: the shared fact surface is reported by PRESENTATION, so a slice
     cannot silently lose an outcome another slice supports, and the general intake stays the widest surface. */
  const surfaces = {
    'GENERAL-BUREAU-REPORT': capGeneral.checks,
    'FAM-TU-CA-CONSUMER': commonErrors.presentationCapability('FAM-TU-CA-CONSUMER').checks,
    'FAM-GB-EXP-CONSUMER': capGB.checks,
    'FAM-AU-EQX-CONSUMER': capAUReader.checks
  };
  const supportedBy = (name) => Object.entries(surfaces[name]).filter(([, ok]) => ok).map(([id]) => id).sort();
  check.ok(supportedBy('GENERAL-BUREAU-REPORT').length >= supportedBy('FAM-TU-CA-CONSUMER').length,
    'the general intake supports at least what the TransUnion Canada family supports');
  check.deepEqual(supportedBy('FAM-TU-CA-CONSUMER'),
    ['COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY', 'COMMON-ERROR-BALANCE-PAYMENT-INCONSISTENCY', 'COMMON-ERROR-PAYMENT-HISTORY-INCONSISTENCY'],
    'the TransUnion Canada slice supports exactly account-dates, balance/past-due and payment-history');
  check.deepEqual(supportedBy('FAM-GB-EXP-CONSUMER'),
    ['COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY', 'COMMON-ERROR-PAYMENT-HISTORY-INCONSISTENCY'],
    'the GB slice supports account dates and issuer-defined ongoing history');
  check.ok(supportedBy('FAM-TU-CA-CONSUMER').length > supportedBy('FAM-AU-EQX-CONSUMER').length,
    'while the Australian reader has a smaller source-supported field surface');
  const capTU = commonErrors.presentationCapability('FAM-TU-CA-CONSUMER');
  check.equal(capTU.checks['COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY'], true, 'the TU-CA reader maps Opened/Closed Date to account-dates');
  check.equal(capTU.checks['COMMON-ERROR-BALANCE-PAYMENT-INCONSISTENCY'], true, 'and now supplies the printed monthly balance/past-due amount pair');
  check.equal(capTU.checks['COMMON-ERROR-PAYMENT-HISTORY-INCONSISTENCY'], true, 'and the printed monthly MOP cells with the report\'s own legend');
  check.equal(capTU.checks['COMMON-ERROR-STATUS-DATE-CONTRADICTION'], false, 'but never maps the printed account TYPE to a lifecycle status');
  check.equal(capTU.checks['COMMON-ERROR-DUPLICATE-REPORTING'], false, 'nor duplicate (no account number is printed inside an account block)');
  check.equal(capTU.checks['COMMON-ERROR-RESPONSIBILITY-INCONSISTENCY'], false, 'nor responsibility (the printed responsibility has no masked identifier to key on)');
  check.equal(commonErrors.presentationCapability('FAM-TU-CA-CONSUMER').presentation_id, 'FAM-TU-CA-CONSUMER',
    'the capability lookup resolves for the family\'s REAL id (the map key previously carried the wrong id)');

  evidence.account_dates_au = 'AU-Equifax liability dates map onto the account-dates issue; the AU repayment-status sentence is never a lifecycle status; duplicate, balance/past-due, responsibility and payment-history remain field gaps';
  evidence.account_dates_gb_tu_ca = 'GB-Experian Started/Settled and TU-CA Opened/Closed Date now map onto the account-dates issue';
  evidence.tu_ca_material_capability = 'BLOCKER-REPORT-DATA-TO-ISSUE-001: the TU-CA reader now supplies the printed ordinary-account facts, so account-dates, balance/past-due and payment-history checks are runnable by FIELD capability; the printed account TYPE is never mapped to a lifecycle status, and no masked identifier is invented';
  evidence.field_gaps = { AU: capAU.checks, US: capUS.checks };
  evidence.reader_capability = { GENERAL: capGeneral.checks, AU: capAUReader.checks, TU_CA: capTU.checks, GB: capGB.checks };
  return evidence;
}

module.exports = {
  run,
  id: 'bq-format-capability',
  title: 'OWNER-POTENTIAL-ISSUE-001 Branch A: field-capability format coverage (AU/GB/TU-CA account-dates; named gaps)'
};
