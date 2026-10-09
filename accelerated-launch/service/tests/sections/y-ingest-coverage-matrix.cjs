'use strict';
/**
 * y-ingest-coverage-matrix.cjs — B6-INGEST-001.
 *
 *   • The authored coverage matrix (`../../coverage-matrix.json`) agrees with the registered extraction
 *     adapters, so the JSON and the running service cannot disagree about what is supported.
 *   • The consumer-facing read-support sentence counts FIVE presentations (the B4-continuation TransUnion
 *     Canada family included) and is generated from the registry so it cannot drift back to "four".
 *   • The acquisition queue names the target bureaus that are NOT supported (US Equifax/TransUnion,
 *     AU Experian/illion, current GB, a broader CA Equifax family) rather than silently claiming them.
 *   • A country selection cannot override failed detection: each market offers only its own presentations.
 */

const formats = require('../../formats.cjs');
const coverage = require('../../coverage-matrix.cjs');
const common = require('../../common-errors.cjs');
const { sourceForField } = require('../../report-fact-sources.cjs');

async function run(t, check) {
  const evidence = {};

  const validation = coverage.validation();
  check.equal(validation.ok, true, 'the authored coverage matrix agrees with the registered adapters');
  check.deepEqual(validation.problems, [], 'and no inconsistency is reported');

  const supported = coverage.supportedPresentations();
  check.equal(supported.length, 5, 'five report presentations are registered');
  check.deepEqual(
    supported.map((r) => r.presentation_id).sort(),
    ['FAM-AU-EQX-CONSUMER', 'FAM-GB-EXP-CONSUMER', 'FAM-TU-CA-CONSUMER', 'PR-01', 'US-CONSUMER-DISCLOSURE'].sort(),
    'and they are exactly the five measured presentations'
  );
  check.deepEqual(supported.filter((row) => row.present_day_support_claimed).map((row) => row.presentation_id).sort(),
    ['PR-01', 'FAM-TU-CA-CONSUMER'].sort(), 'only the current Canadian source evidence claims current dedicated admission');
  check.deepEqual(supported.filter((row) => !row.present_day_support_claimed).map((row) => row.presentation_id).sort(),
    ['US-CONSUMER-DISCLOSURE', 'FAM-AU-EQX-CONSUMER', 'FAM-GB-EXP-CONSUMER'].sort(),
    'dated US, Australia and UK structural examples do not claim current whole-layout certification');
  for (const country of ['US', 'AU']) {
    const wrongCurrency = coverage.loadMatrix();
    wrongCurrency.markets[country].find((row) => row.presentation_id).evidence.present_day = true;
    check.ok(coverage.validation(wrongCurrency).problems.some((problem) => /currency mismatch/.test(problem)),
      country + ' dated evidence cannot silently become a current-layout claim');
  }
  const matrix = coverage.loadMatrix();
  const gbContract = formats.presentationScope().GB.general_field_contract;
  check.equal(gbContract.scope, 'CURRENT_GENERAL_CONSUMER_FIELDS', 'current UK field support is separately scoped to GENERAL');
  check.equal(formats.presentationScope().GB.present_day_support_claimed, false,
    'current UK GENERAL fields do not promote the historical dedicated Experian family');
  check.deepEqual(gbContract.regions, ['GB-ENG', 'GB-NIR', 'GB-SCT', 'GB-WLS'], 'the documented GENERAL contract preserves all four UK regions');
  const wrongGb = coverage.loadMatrix();
  wrongGb.general_intake.current_field_contracts[0].whole_current_layout_certified = true;
  check.ok(coverage.validation(wrongGb).problems.includes('current UK GENERAL field contract mismatch'),
    'field evidence cannot silently become a whole-layout certificate');
  check.equal(formats.displayNameFor('GENERAL-BUREAU-REPORT', 'TransUnion'), 'TransUnion credit report',
    'the consumer report name uses familiar bureau wording');
  check.equal(formats.displayNameFor('GENERAL-BUREAU-REPORT'), 'credit report', 'an unknown bureau adds no implementation wording');
  for (const [country, rows] of Object.entries(matrix.markets)) {
    for (const row of rows.filter((entry) => entry.presentation_id)) {
      check.deepEqual(row.shared_fact_fields, common.PRESENTATION_FIELD_CAPABILITY[row.presentation_id],
        country + ' dedicated field inventory comes from the current reader');
      check.deepEqual(row.checklist_capability, common.presentationCapability(row.presentation_id).all_factual_checks,
        country + ' dedicated checklist readiness matches the current shared mechanism');
      check.equal(row.compatible_assessments.some((label) => /^AU-PRIVACY-ACT/.test(label)), false,
        country + ' metadata describes active checklist support instead of a standalone statutory-assessment promise');
    }
  }
  check.deepEqual(matrix.general_intake.shared_fact_fields, common.PRESENTATION_FIELD_CAPABILITY['GENERAL-BUREAU-REPORT'],
    'GENERAL field inventory derives from the current shared reader');
  // Source-shaped fictional cover controls exercise the existing reference readers.
  // dy-reader-date-delivery separately verifies their physical native/source custody.
  for (const [id, reader, printedDate] of [
    ['FAM-AU-EQX-CONSUMER', formats.auFamily, 'Report Date: 4 January 2026'],
    ['FAM-GB-EXP-CONSUMER', formats.gbFamily, 'Date of report: 1 June 2026']
  ]) {
    check.ok(common.PRESENTATION_FIELD_CAPABILITY[id].includes('report.referenceDate'),
      id + ' declares its already-supported own report reference date');
    const model = formats.makeSyntheticModel({ pages: [[printedDate]] });
    const reference = reader.extract(model, { admitted: true, presentation_evidence: false }).reference_date;
    const own = { record_index: 1, facts: {}, source_file_id: 'own-report', report_reference_date: reference };
    check.equal(sourceForField(own, 'report.referenceDate')?.raw_value,
      printedDate.slice(printedDate.indexOf(':') + 1).trim(), id + ' retains the actual own cover reading');
    check.equal(sourceForField(own, 'report.referenceDate')?.location.page, 1,
      id + ' retains the actual own cover page');
    check.equal(common.usableField(own, 'report.referenceDate'), true, id + ' usable capability requires a sourced own date');
    const rejected = { ...own, report_reference_date: { ...reference, trusted: false } };
    check.equal(common.usableField(rejected, 'report.referenceDate'), false, id + ' rejects an unreadable own date');
    const foreign = { ...own, report_reference_date: { ...reference, location: { ...reference.location, file_id: 'other-report' } } };
    check.equal(common.usableField(foreign, 'report.referenceDate'), false, id + ' cannot borrow another report date');
  }
  const linked = 'COMMON-ERROR-COLLECTION-ORIGINAL-BOTH-DUE';
  for (const id of ['PR-01', 'US-CONSUMER-DISCLOSURE']) {
    check.equal(common.presentationCapability(id).all_factual_checks[linked].field_ready, false,
      id + ' does not advertise a linked-pair mechanism that needs GENERAL_COLLECTION');
  }
  const facts = { 'account.masked_identifier': 'MASK-5432', 'account.reported_identity': 'CEDAR', 'account.balance': 100 };
  for (const kind of ['COLLECTION_ACCOUNT', 'REPORTED_ACCOUNT', 'GENERAL_ACCOUNT']) {
    check.equal(common.formatCapability({ presentation_id: 'GENERAL-BUREAU-REPORT', records: [{ kind, facts }] })
      .all_factual_checks[linked].field_ready, false, kind + ' fields do not imply a GENERAL collection-pair path');
  }
  check.equal(common.formatCapability({ presentation_id: 'PR-01', records: [{ kind: 'GENERAL_COLLECTION', facts }] })
    .all_factual_checks[linked].field_ready, true,
    'an assembled GENERAL collection remains field-ready even when the base upload uses a dedicated reader');
  const chargeOff = (phrase, trusted = true) => ({ status: 'RESOLVED', record_index: 1, facts: {},
    printed: { 'Charge Off Date': { state: 'LABEL_PRINTED_WITHOUT_VALUE', label: 'Charge Off Date',
      location: { page: 1, line: 8, trusted: true } } },
    report_status_statements: [{ raw_value: phrase, meaning: phrase, trusted, caption_count: 1,
      source_field: 'Status', location: { page: 1, line: 7, trusted: true } }] });
  for (const phrase of ['Charged Off', 'Charge Off']) {
    const concern = common.writeOffWithoutAChargeOffDate([chargeOff(phrase)]);
    check.equal(concern?.source_records[0].evidence.write_off_codes[0].meaning_as_the_report_prints_it, phrase,
      phrase + ' retains its own literal loss status without replacing the printed phrase');
    check.equal(common.writeOffWithoutAChargeOffDate([chargeOff(phrase, false)]), null,
      phrase + ' cannot use an untrusted status statement');
  }
  for (const phrase of ['Not Charged Off', 'No Charge Off', 'Charge Off Date', 'May be Charged Off']) {
    check.equal(common.writeOffWithoutAChargeOffDate([chargeOff(phrase)]), null,
      phrase + ' is not a positive printed loss status');
  }

  const sentence = coverage.readSupportQualification();
  check.match(sentence, /We have tested this service on five report layouts/, 'the read-support sentence counts five report layouts');
  check.match(sentence, /TransUnion Canada consumer disclosure/, 'and names the TransUnion Canada family');

  const missing = coverage.missingRows();
  const queued = (market, bureau) => missing.some((r) => r.country === market && r.bureau === bureau);
  for (const [market, bureau] of [
    ['US', 'Equifax'], ['US', 'TransUnion'],
    ['AU', 'Experian'], ['AU', 'illion'],
    ['GB', 'Equifax'], ['GB', 'TransUnion'], ['GB', 'Experian'],
    ['CA', 'Equifax']
  ]) {
    check.equal(queued(market, bureau), true, `${market} ${bureau} is recorded in the acquisition queue, not claimed supported`);
    check.ok(missing.filter((row) => row.country === market && row.bureau === bureau)
      .every((row) => row.support_scope === 'DEDICATED_LAYOUT_EVIDENCE_MISSING' && row.general_intake_available),
    `${market} ${bureau} missing dedicated evidence does not erase the supported GENERAL journey`);
  }

  const queue = coverage.acquisitionQueue();
  check.ok(queue.length >= 9, 'the acquisition queue is ordered and named');
  check.deepEqual(queue.slice(0, 2).map((r) => `${r.market}:${r.bureau}`), ['US:Equifax', 'US:TransUnion'],
    'and the smallest next batch is the two US bureaus');

  check.deepEqual(formats.formatsForCountry('US').map((a) => a.country), ['US'], 'a US selection offers only US presentations');
  check.equal(formats.formatsForCountry('GB').some((a) => a.presentation_id === 'US-CONSUMER-DISCLOSURE'), false,
    'a GB selection cannot admit the US consumer disclosure');
  check.equal(formats.formatsForCountry('AU').some((a) => a.presentation_id === 'FAM-AU-EQX-CONSUMER'), true,
    'an AU selection offers the AU Equifax family');

  evidence.matrix = {
    markets: Object.keys(coverage.loadMatrix().markets),
    queue_length: queue.length,
    supported: supported.length
  };
  return evidence;
}

module.exports = {
  run,
  id: 'y-ingest-coverage-matrix',
  title: 'The coverage matrix agrees with the registry and names the unsupported-bureau acquisition queue'
};
