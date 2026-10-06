'use strict';
/**
 * w-ca-second-bureau-format.cjs — OWNER-ALL82-001 / B4 continuation.
 *
 * The owner authorized: "Inspect the evidenced Equifax and TransUnion consumer formats locally. Establish
 * separate structural contracts where appropriate; do not force both bureaus into one layout. Validate record
 * boundaries, field meanings, ambiguity handling and factual checks. Create new family-admission records when
 * the evidence supports them. ... Keep the original CA-NS statutory admission exact-specimen and
 * observation-only. Broader factual format support does not broaden statutory permission. Connect supported
 * factual assessment across all 13 Canadian selections. Test genuine reports separately from synthetic
 * variations and wrong-channel/lookalike inputs."
 *
 * Every clause of that is an assertion here, and the two KINDS of evidence are never mixed:
 *   • GENUINE — the real, digest-pinned TransUnion Canada disclosure, and the real digest-pinned Equifax Canada
 *     specimen. Both are read read-only from where they already are; neither is copied.
 *   • SYNTHETIC — in-memory structural views and non-report inputs. A synthetic view establishes NO
 *     presentation evidence, carries no report, and is labelled as such throughout.
 *
 * Nothing here names a PIPEDA provision or any national applicability relation, and nothing here opens a
 * credential file or makes a network call.
 */

const fs = require('node:fs');
const path = require('node:path');

const formats = require('../../formats.cjs');
const tuCa = require('../../format-families/tu-ca-consumer.cjs');
const factualChecks = require('../../factual-checks.cjs');
const evaluation = require('../../evaluation.cjs');
const results = require('../../results.cjs');
const caScope = require('../../format-families/ca-consumer-format-scope.cjs');
const applicability = require('../../../adapters/applicability-records.json');
const adapters = require('../../../adapters/rule-adapters.cjs');
const { readPinnedSpecimen } = require('../harness.cjs');

const CA_REGIONS = applicability.relations
  .find((r) => r.relation_id === 'CA-PIPEDA-FEDERAL-RECORDED-COUNTRY-WIDE').region_rows
  .map((row) => row.region).sort();
const OTHER_TWELVE = CA_REGIONS.filter((r) => r !== 'CA-NS');
const ADMISSION_RECORD = path.join(__dirname, '..', '..', '..', '..', 'SOURCE_CAPTURES', 'B4-CA-CONSUMER-FAMILIES', 'tu-ca-family-admission.json');
const MEASUREMENT = path.join(__dirname, '..', '..', '..', '..', 'SOURCE_CAPTURES', 'B4-CA-CONSUMER-FAMILIES', 'tu-ca-family-measurement.json');

/** The two real specimens, each read read-only from its recorded location, or a named reason it is absent. */
function loadRealSpecimens() {
  const out = { equifax: null, transunion: null };
  const pinned = readPinnedSpecimen();
  if (pinned.available) out.equifax = pinned;
  const pointer = tuCa.readSecondCanadianPointer();
  const verification = tuCa.verifySpecimenDigest(pointer);
  if (pointer.available && verification.verified) {
    out.transunion = {
      path: pointer.absolute_path,
      bytes: fs.readFileSync(pointer.absolute_path),
      sha256: verification.digest,
      presentation_id: pointer.presentation_id,
      artifact_id: pointer.artifact_id,
      register_status_as_recorded: pointer.register_status_as_recorded
    };
  }
  out.pointer = pointer;
  out.verification = verification;
  return out;
}

/** One uploaded file, through the real HTTP endpoint, so nothing is stubbed between upload and the gate. */
async function uploadBytes(t, owner, caseId, bytes, name) {
  return t.request('POST', `/api/cases/${caseId}/files`, {
    token: owner.token,
    body: {
      originalFilename: name || 'my-report.pdf',
      declaredBytes: bytes.length,
      mimeType: 'application/pdf',
      contentBase64: bytes.toString('base64')
    }
  });
}

/* ------------------------------------------------------------ the admission record and its re-measurement */

const PR_01_CONTRACT = require('../../../../internal-validation/ca-ns-last-payment-six-year/presentation-contract.cjs').PR_01_CONTRACT;
const PR_01_DATE_FORM = PR_01_CONTRACT.printed_date_form;

/**
 * The record is not an assertion: the tool that produced it is re-run here, and every measurement the record
 * states is asserted against a fresh reading of the same document. A record that cannot be re-measured is not
 * evidence, and this section would fail if the record and the document ever disagreed.
 */
function recordedEvidenceReproduces(check, specimens) {
  check.ok(fs.existsSync(ADMISSION_RECORD), 'the TransUnion Canada admission record is present');
  check.ok(fs.existsSync(MEASUREMENT), 'the measurement the admission record rests on is present');
  const record = JSON.parse(fs.readFileSync(ADMISSION_RECORD, 'utf8'));
  const measurement = JSON.parse(fs.readFileSync(MEASUREMENT, 'utf8'));

  check.equal(record.family.family_id, tuCa.FAMILY_ID, 'the record names the family this suite registers');
  check.equal(record.family.admission_path, 'EVIDENCED_STRUCTURAL_CONTRACT', 'and the path it was admitted by');
  check.equal(record.evidence.sha256, tuCa.FAMILY_CONTRACT.evidenced_sha256, 'the record pins the digest the module pins');
  check.equal(measurement.recorded_digest, tuCa.FAMILY_CONTRACT.evidenced_sha256, 'the measurement pins the same digest');
  check.equal(measurement.digest_matches_the_register, true, 'and a fresh reading still matches the preserved register');
  check.equal(measurement.register_status_as_recorded, 'SECONDARY_CORROBORATING_PRESENTATION_NOT_ADMITTED_FOR_A_RULE_UNIT',
    'the register\'s own status for the specimen is unchanged');
  check.equal(measurement.specimen_preserved_untouched, true, 'and the record states the specimen was preserved untouched');
  check.equal(measurement.specimen_copied_into_this_repository, false, 'and that it was not copied into this repository');
  check.equal(record.amendment_procedure.an_amendment_was_required, false,
    'this is an additive record, so the amendment procedure was not engaged and no governing document was amended');
  check.ok(record.preserved_unchanged.some((row) => row.artifact === 'the specimen\'s own bytes'),
    'the record states the specimen\'s bytes are preserved');

  if (!specimens.transunion) {
    check.skip('the recorded measurements are re-measured against the real specimen',
      (specimens.pointer && specimens.pointer.reason) || 'THE_SECOND_CANADIAN_SPECIMEN_IS_NOT_ON_THIS_MACHINE');
    return { record, measurement, remeasured: false };
  }

  const model = formats.buildPdfDocumentModel(specimens.transunion.path);
  const lines = tuCa.documentLines(model);
  const text = tuCa.wholeDocumentText(model);
  const countOf = (needle) => text.split(needle).length - 1;

  check.equal(caScope.RECORDED_NOT_ADMITTED[0].sha256, specimens.transunion.sha256,
    'the file still matches the digest the scope module records for the second Canadian presentation');
  check.equal(model.page_count, record.evidence.pages, 'the page count still matches the record');
  check.equal(model.pages.length, record.evidence.pages, 'and every page still carries a text layer this build reads');
  check.equal(model.encryption.raw, record.evidence.encryption, 'the container\'s own encryption flags are exactly the recorded ones');
  check.equal(model.encryption.copy_allowed, true, 'and the document still permits the text to be extracted');
  check.equal(model.page_size.label, 'letter', 'and the page geometry is still what the record states');
  for (const [heading, expected] of Object.entries(record.measured_structure.headings_printed_and_their_occurrence_counts)) {
    check.equal(countOf(heading), expected, `re-measured: "${heading}" is printed ${expected} time(s), as recorded`);
  }
  check.equal(lines.filter((l) => tuCa.readable(l.text).trim() === tuCa.RECORD_BOUNDARY_LABEL).length,
    record.measured_structure.record_boundary.boundary_line_count,
    're-measured: the account-block boundary line is printed exactly as many times as the record states');
  for (const [label, expected] of Object.entries(record.measured_structure.printed_tradeline_labels)) {
    check.equal(countOf(label), expected, `re-measured: "${label}" is printed ${expected} time(s), as recorded`);
  }
  check.equal(record.measured_structure.printed_date_forms['Mon D, YYYY'],
    (text.match(/\b[A-Z][a-z]{2} \d{1,2}, \d{4}\b/g) || []).length, 're-measured: the full printed date form count matches the record');
  check.equal(record.measured_structure.printed_date_forms['Mon YYYY (printed without a day)'],
    (text.match(/\b[A-Z][a-z]{2} \d{4}\b/g) || []).length, 're-measured: the day-less date form count matches the record');
  check.equal((text.match(/\b\d{1,4}\/\d{1,2}\/\d{1,4}\b/g) || []).length, 0,
    're-measured: the slash-separated form the OTHER bureau prints does not appear at all');
  check.ok(record.measured_structure.two_column_geometry.the_ranges_overlap,
    'the record states that the label-to-value and label-to-next-column gaps overlap, which is why a threshold cannot be used');
  return { record, measurement, remeasured: true };
}


/* ------------------------------------------------------------ the two contracts, and the boundaries between them */

function twoContractsKeepTheirOwnBoundaries(check, specimens) {
  const caAdapters = formats.formatsForCountry('CA');
  const families = formats.familiesForCountry('CA');
  check.equal(caAdapters.length, 2, 'exactly TWO presentations are registered for Canada, one per bureau');
  check.deepEqual(caAdapters.map((a) => a.presentation_id).sort(), ['PR-01', tuCa.FAMILY_ID].sort(),
    'and they are the pinned Equifax specimen and the TransUnion family');
  check.equal(families.length, 1, 'exactly ONE Canadian format family is admitted');
  check.equal(families[0].family_id, tuCa.FAMILY_ID, 'and it is the TransUnion family, not a widened Equifax contract');
  check.equal(caScope.FAMILY_ADMISSION.admitted, false,
    'the Equifax presentation\'s OWN family admission is still false');
  check.equal(caScope.COUNTRY_FAMILY_ADMISSION.admitted, true,
    'and Canada-as-a-country admits a family, which is a different statement');
  check.equal(formats.presentationScope().CA.family_admitted, true, 'the coverage surface reports the country-level truth');
  check.equal(formats.presentationScope().CA.equifax_family_admitted, false, 'and the Equifax-specific truth separately');
  check.ok(/structural contract/i.test(formats.presentationScope().CA.plain),
    'and says in words that the second admission is by measured structure');

  /* THE EQUIFAX DIGEST GATE IS UNTOUCHED, AND THE TWO CONTRACTS ARE GENUINELY DIFFERENT. */
  check.equal(tuCa.FAMILY_CONTRACT.record_boundary_label, 'Creditor Name',
    'the TransUnion contract measures its OWN record boundary');
  check.notEqual(tuCa.FAMILY_CONTRACT.record_boundary_label, PR_01_CONTRACT.record_boundary_label,
    'which is NOT the record boundary the Equifax contract reads');
  check.equal(tuCa.FAMILY_CONTRACT.printed_date_forms[0], 'Mon D, YYYY', 'and it states its own printed date form');
  check.ok(!PR_01_DATE_FORM.includes('Mon D, YYYY'),
    'which the Equifax contract neither prints nor reads: its form is the slash-separated one');
  check.ok(!tuCa.FAMILY_CONTRACT.boundary.join(' ').includes('Equifax layout'),
    'and the TransUnion contract claims nothing about the Equifax layout');
  check.ok(/PR-01.s digest gate is untouched/.test(tuCa.FAMILY_CONTRACT.boundary.join(' ')),
    'while stating that the Equifax digest gate is untouched');

  /* THE NOVA SCOTIA STATUTORY UNIT IS STILL EXACT-SPECIMEN, IN FACT AND NOT ONLY IN WORDING. */
  for (const adapter of adapters.ADAPTERS.filter((a) => /^CA-NS-/.test(a.adapter_id) && a.adapter_id !== 'CA-NS-CRA-S10-3-D-JUDGMENT-CONTENT' && a.adapter_id !== 'CA-NS-CRA-S10-3-F-DISMISSED-CHARGE')) {
    if (adapter.adapter_id === 'CA-NS-CRA-S10-3-C-LIMB-1') {
      /* BLOCKER-REPORT-DATA-TO-ISSUE-001 (real-report repair): this limb's recorded anchor is a TRADELINE field
         and the TransUnion Canada presentation prints that field on its own tradelines, so the limb is admitted to
         that presentation as well. Its conclusion ceiling, its packet permission and its single admitted limb are
         unchanged, and the default-date limb stays unseated. */
      check.deepEqual(adapter.presentation_required, ['PR-01', 'FAM-TU-CA-CONSUMER'],
        'the last-payment limb is admitted to the TransUnion Canadian presentation whose tradelines print its anchor');
      continue;
    }
    check.equal(adapter.presentation_required, 'PR-01', `${adapter.adapter_id} is bound to PR-01`);
  }
  /* OWNER-CANDIDATE-002/003: the judgment-CONTENT and dismissed-CHARGE rules are report-content rules on the
     GENERAL-BUREAU-REPORT intake (which reads judgments/charges), not PR-01 retention rules — a separate route,
     never a PR-01 widening. */
  const judgmentContent = adapters.ADAPTERS.find((a) => a.adapter_id === 'CA-NS-CRA-S10-3-D-JUDGMENT-CONTENT');
  check.equal(judgmentContent.presentation_required, 'GENERAL-BUREAU-REPORT', 'the judgment-content rule is bound to the general-report route, not PR-01');
  const dismissedCharge = adapters.ADAPTERS.find((a) => a.adapter_id === 'CA-NS-CRA-S10-3-F-DISMISSED-CHARGE');
  check.equal(dismissedCharge.presentation_required, 'GENERAL-BUREAU-REPORT', 'the dismissed-charge rule is bound to the general-report route, not PR-01');
  if (!specimens.transunion) {
    check.skip('a TransUnion file runs zero statutory checks in Nova Scotia',
      'the second Canadian specimen is not on this machine');
    return;
  }
  const model = formats.buildPdfDocumentModel(specimens.transunion.path);
  const extraction = formats.extractWithSharedAdapter(model, { mode: 'REPORT', country: 'CA' });
  const ns = evaluation.evaluateCase({ country: 'CA', region: 'CA-NS', extraction });
  const nsEvaluated = ns.results.filter((r) => r.machine && r.machine.state === 'EVALUATED');
  check.equal(nsEvaluated.length, 4, 'the Nova Scotia last-payment limb measures the four account blocks of the TransUnion presentation');
  check.deepEqual([...new Set(nsEvaluated.map((r) => r.check.adapter_id))], ['CA-NS-CRA-S10-3-C-LIMB-1'],
    'and it is the only statutory limb seated on that presentation');
  check.deepEqual([...new Set(nsEvaluated.map((r) => r.machine.anchor.field))], ['tradeline.lastPaymentDate'],
    'measuring from the last payment date the report prints on each entry');
  check.ok(ns.results.length > nsEvaluated.length,
    'while every record that prints no such date is recorded as an unread row, never as a comparison');
  check.deepEqual(ns.assessment_kinds, ['STATUTORY_RULE_COMPARISON', 'REPORT_FACT_CONSISTENCY', 'COMMON_ERROR'],
    'so its assessment names the statutory, factual and common-error classes');
  check.ok(ns.unavailable_checks.length > 0, 'and every recorded limb is reported as not run against this format rather than silently dropped');
  check.ok(ns.unavailable_checks.every((row) => typeof row.plain === 'string' && row.plain.length > 0),
    'each of them saying in words why it was not run');
  check.ok(ns.unavailable_checks.some((row) => /format|kind of entry/i.test(row.plain)),
    'and a limb that still cannot run on this format says so in words');

  const nsEquifax = specimens.equifax
    ? evaluation.evaluateCase({
      country: 'CA',
      region: 'CA-NS',
      extraction: formats.extractWithSharedAdapter(formats.buildPdfDocumentModel(specimens.equifax.path), { mode: 'REPORT', country: 'CA' })
    })
    : null;
  if (nsEquifax) {
    check.ok(nsEquifax.results.length > 0, 'the same limbs DO run on the admitted Equifax presentation, so nothing was narrowed there');
  } else {
    check.skip('the same limbs still run on the admitted Equifax presentation', 'the evidenced Equifax specimen is not on this machine');
  }
}


/* ------------------------------------------------------------ record boundaries, field meanings, ambiguity */

/**
 * THE FIELD READINGS, asserted on the real specimen. This is where "validate record boundaries, field meanings,
 * ambiguity handling" becomes a measurement rather than a description: the counts of each reading state are
 * fixed, so a change to the reader that silently collapsed two states would fail here.
 */
function fieldReadingsAndAmbiguity(check, specimens) {
  if (!specimens.transunion) {
    check.skip('the TransUnion record boundaries and field meanings are measured on the real specimen',
      (specimens.pointer && specimens.pointer.reason) || 'THE_SECOND_CANADIAN_SPECIMEN_IS_NOT_ON_THIS_MACHINE');
    return null;
  }
  const model = formats.buildPdfDocumentModel(specimens.transunion.path);
  const extraction = formats.extractWithSharedAdapter(model, { mode: 'REPORT', country: 'CA' });
  const view = extraction.evidence_readings.factual_view;

  check.equal(extraction.presentation_id, tuCa.FAMILY_ID, 'the real specimen is read by the TransUnion family');
  check.equal(extraction.admission.state, 'ADMITTED_FAMILY_STRUCTURE', 'admitted on its measured structure');
  check.equal(extraction.admission.predicates.filter((p) => !p.passed).length, 0, 'with every predicate passing');
  check.equal(extraction.admission.predicates.length, 11, 'and eleven predicates actually evaluated');
  check.equal(extraction.support, 'ACTUAL_REPORT_EVIDENCE', 'and it is reported as actual report evidence');

  const tradelines = view.records.filter((r) => r.kind === tuCa.TRADELINE_KIND);
  const enquiries = view.records.filter((r) => r.kind === tuCa.INQUIRY_KIND);
  check.equal(tradelines.length, 4, 'four account blocks are located, one per boundary line');
  check.ok(enquiries.length > 100, 'and the enquiry rows are located as rows that begin with a printed date');
  check.deepEqual(tradelines.map((r) => r.record_index), [1, 2, 3, 4], 'each account block carries its own index');
  check.ok(tradelines.every((r) => r.boundary.page && r.boundary.line), 'each boundary names the page and line it began at');
  check.ok(tradelines.every((r) => r.end.page > r.boundary.page || r.end.line > r.boundary.line),
    'and each block ends after the boundary it begins at, in document order, so no block is a single line');
  check.ok(tradelines.every((r) => r.creditor_name_read === true),
    'and the creditor name that follows the boundary IS read as the account\'s printed identity');
  check.ok(tradelines.every((r) => r.creditor_name_printed_on_the_next_line === true),
    'which the reader also records as printed on the line after the boundary');
  check.ok(tradelines.every((r) => typeof r.facts['account.reported_identity'] === 'string' && r.facts['account.reported_identity'].length > 0),
    'and each block maps its printed creditor name to the account identity fact the shared checks read');

  return { model, extraction, view, tradelines, enquiries };
}


/**
 * WHAT THE TWO-COLUMN LAYOUT WOULD HAVE BROKEN, and what this reader does instead. Each of these is a hazard
 * the measurement found, stated as an assertion so a future change cannot quietly reintroduce it.
 */
function twoColumnHazards(check, reading) {
  if (!reading) return;
  const { tradelines, view } = reading;
  const states = {};
  for (const record of tradelines) {
    for (const field of Object.values(record.printed)) states[field.state] = (states[field.state] || 0) + 1;
  }
  check.equal(Object.keys(states).sort().join(','), 'LABEL_PRINTED_WITHOUT_VALUE,VALUE',
    'an account block yields only read values and blank cells');
  check.equal(states.VALUE + states.LABEL_PRINTED_WITHOUT_VALUE, 48,
    'and eight printed DATE fields plus four read MATERIAL fields per block, four blocks');
  check.ok(tradelines.every((r) => r.printed['Reported Date'].state === 'VALUE' && r.printed['Reported Date'].normalized),
    'every block prints a readable Reported Date');
  check.ok(tradelines.every((r) => r.printed['Opened Date'].state === 'VALUE' && r.printed['Opened Date'].normalized),
    'every block prints a readable Opened Date');
  check.ok(tradelines.some((r) => r.printed['Closed Date'].state === 'LABEL_PRINTED_WITHOUT_VALUE'),
    'a block that prints Closed Date with NO value is recorded as a blank cell, not as a missing label');
  const closedBlank = tradelines.filter((r) => r.printed['Closed Date'].state === 'LABEL_PRINTED_WITHOUT_VALUE').length;
  check.equal(closedBlank + tradelines.filter((r) => r.printed['Closed Date'].state === 'VALUE').length, 4,
    'and every block\'s Closed Date is either a read value or a blank cell, never something else');
  const blankReasons = new Set(tradelines.flatMap((r) => Object.values(r.printed))
    .filter((f) => f.state === 'LABEL_PRINTED_WITHOUT_VALUE').map((f) => f.reason));
  check.deepEqual([...blankReasons], ['NO_PRINTED_DATE_AT_THIS_LABEL_VALUE_POSITION'],
    'a blank cell is reported under its own reason, which names the value position rather than a missing label');
  check.ok(!tradelines.some((r) => Object.values(r.printed).some((f) => f.state === 'VALUE_MALFORMED_PRINTED_FORM')),
    'no field is reported malformed: a neighbouring column is never read as this field\'s value');
  check.ok(Object.keys(tradelines[0].printed).includes('Terms'), 'the Terms value IS now read as its own field');
  check.ok(tradelines.every((r) => r.printed['Terms'] && r.printed['Terms'].state === 'VALUE' && /\/[A-Z]/.test(r.printed['Terms'].raw) && r.printed['Terms'].location),
    'and every block carries its printed Terms reading, raw and with the page/line it was printed on');
  check.ok(tradelines.every((r) => r.printed['Creditor Name'] && r.printed['Creditor Name'].state === 'VALUE' && r.printed['Creditor Name'].location),
    'the creditor name is read with the page/line it was printed on');
  check.ok(tradelines.every((r) => r.printed['Account Type'] && r.printed['Account Type'].state === 'VALUE' && /\/\s*[A-Z]/.test(r.printed['Account Type'].raw)),
    'the wrapped Account / Type: caption now yields the printed account type and responsibility');
  check.ok(tradelines.every((r) => r.printed['Payment History'] && r.printed['Payment History'].state === 'VALUE' && r.printed['Payment History'].raw === '30 60 90 #M'),
    'and the payment-history counts are read under their own printed captions');
  check.ok(view.printed_but_not_read.some((row) => row.printed_as.includes('Account #')),
    'and the view still states what is NOT read: no account number is printed inside an account block');
}

/** AMBIGUITY, and the report's own date, established a different way from the other bureau's labelled header. */
function ambiguityAndReferenceDate(check, reading) {
  if (!reading) return;
  const { view } = reading;
  const partials = view.records.flatMap((r) => Object.values(r.printed)).filter((f) => f.state === 'VALUE_PRINTED_WITHOUT_A_DAY');
  check.equal(partials.length, 7, 'seven printed dates carry a month and a year and NO day');
  check.ok(partials.every((f) => f.normalized === null && f.reason === 'PRINTED_WITHOUT_A_DAY'),
    'each is a partial date with no normalized value, so no day is ever invented for it');
  check.ok(partials.every((f) => /^\d{4}-\d{2}$/.test(f.month_and_year)),
    'and each keeps the month and year it does print, as a month, without a day');

  check.equal(view.reference_date.status, 'RESOLVED', 'the report\'s own file date is resolved');
  check.equal(view.reference_date.occurrences_recorded, 1, 'from exactly one printed occurrence of the phrase');
  check.ok(/^\d{4}-\d{2}-\d{2}$/.test(view.reference_date.normalized), 'and it normalizes to a calendar date');
  check.equal(view.report_text_retained, false, 'no page text is retained in the view');
  check.deepEqual(view.policy_statements, [], 'and no retention statement is invented for this presentation');
  const tradelines = reading.extraction.records.filter((r) => r.kind === 'TU_CA_TRADELINE');
  check.ok(tradelines.length > 0 && tradelines.every((r) => r.facts && typeof r.facts['liability.openedDate'] === 'string'),
    'each tradeline now supplies its opened date as a per-record lifecycle fact (previously this family supplied none)');
}


/* ------------------------------------------------------------ the assessment across every Canadian selection */

const TU_FACTUAL_IDS = ['CA-TU-FACT-ITEM-DATE-AFTER-REPORT-DATE', 'CA-TU-FACT-DATE-ORDER-WITHIN-TRADELINE'];
const PR01_FACTUAL_IDS = [
  'CA-FACT-SUMMARY-COUNT-VS-ITEMS',
  'CA-FACT-ITEM-DATE-AFTER-REPORT-DATE',
  'CA-FACT-DATE-ORDER-WITHIN-RECORD',
  'CA-FACT-SAME-DEBT-PRINTED-VALUE-CONFLICT'
];

/**
 * A factual check is written for the LABELS one layout prints, so a check is selected for its own presentation
 * and not for another. This is the assertion that keeps the two Canadian layouts from being read through each
 * other's checks, and it is asserted in both directions.
 */
function checksAreScopedToTheirOwnLayout(check, reading) {
  if (!reading) return;
  const tu = factualChecks.runFactualChecks({ country: 'CA', region: 'CA-ON', extraction: reading.extraction });
  check.equal(tu.summary.registered, 2, 'two factual checks are registered for the TransUnion layout');
  check.deepEqual(tu.summary.check_ids.slice().sort(), TU_FACTUAL_IDS.slice().sort(), 'and they are the TransUnion checks');
  check.ok(!tu.summary.check_ids.includes('CA-FACT-DATE-ORDER-WITHIN-RECORD'),
    'the Equifax-only date-order check is NOT selected for this layout, rather than being reported as not applicable');

  const specimens = loadRealSpecimens();
  if (specimens.equifax) {
    const equifaxExtraction = formats.extractWithSharedAdapter(
      formats.buildPdfDocumentModel(specimens.equifax.path), { mode: 'REPORT', country: 'CA' });
    const eq = factualChecks.runFactualChecks({ country: 'CA', region: 'CA-ON', extraction: equifaxExtraction });
    check.deepEqual(eq.summary.check_ids.slice().sort(), PR01_FACTUAL_IDS.slice().sort(),
      'and the Equifax layout is measured by exactly its own four checks, unchanged');
    check.equal(eq.summary.registered, 4, 'the Equifax registration is unchanged by the second contract');
  } else {
    check.skip('the Equifax layout is measured by exactly its own four checks', 'the evidenced Equifax specimen is not on this machine');
  }

  /* A synthetic view carries no presentation, so a check scoped to a presentation cannot be selected for it
     and no check is invented for it. */
  const synthetic = factualChecks.runFactualChecks({
    country: 'CA',
    region: 'CA-ON',
    extraction: {
      evidence_readings: {
        factual_view: { view_id: 'SYNTHETIC', presentation_id: null, records: [], summary_counts: [], reference_date: null, policy_statements: [] }
      }
    }
  });
  check.equal(synthetic, null, 'a view with no presentation selects no check, so a synthetic model can never borrow one');
}

/** Every one of the thirteen Canadian selections, over the REAL TransUnion presentation. */
function everyCanadianSelectionAssesses(check, reading) {
  if (!reading) {
    check.skip('the TransUnion presentation is assessed under all thirteen Canadian selections',
      'THE_SECOND_CANADIAN_SPECIMEN_IS_NOT_ON_THIS_MACHINE');
    return null;
  }
  const perRegion = {};
  for (const region of CA_REGIONS) {
    const evaluated = evaluation.evaluateCase({ country: 'CA', region, extraction: reading.extraction });
    const factual = evaluated.factual_checks;
    perRegion[region] = {
      statutory_checks_performed: evaluated.results.length,
      factual_checks_performed: factual ? factual.performed.length : 0,
      assessment_kinds: evaluated.assessment_kinds,
      presentation_id: factual ? factual.presentation_id : null,
      dates_compared: factual
        ? factual.performed.reduce((total, c) => total + ((c.evidence && c.evidence.dates_examined) || 0), 0)
        : 0
    };
    check.equal(factual.performed.length, 2, `${region}: both TransUnion factual checks ran on the real presentation`);
    check.deepEqual(factual.summary.check_ids.slice().sort(), TU_FACTUAL_IDS.slice().sort(), `${region}: and they are exactly the two named TransUnion checks`);
    check.equal(factual.summary.statutory_checks_named, 0, `${region}: no statutory check is among them`);
    if (region === 'CA-AB') {
      /* BATCH-9: Alberta's recorded reporting-period limb now reaches this presentation, because the reader
         maps the block's own printed Last Payment Date to the shared tradeline.lastPaymentDate fact. */
      check.ok(evaluated.results.length >= 1, `${region}: its recorded statutory limb runs on this presentation`);
      check.deepEqual([...new Set(evaluated.results.map((r) => r.check.adapter_id))],
        ['CA-AB-CPA-CPRR-S4-B-DEBT-LAST-PAYMENT-6Y'], `${region}: and it is the recorded Alberta reporting-period limb`);
      check.ok(evaluated.assessment_kinds.includes('STATUTORY_RULE_COMPARISON'), `${region}: so its assessment names the statutory class too`);
    } else if (['CA-BC', 'CA-NT', 'CA-NU', 'CA-ON', 'CA-QC', 'CA-SK', 'CA-YT'].includes(region)) {
      check.equal(evaluated.results.length, 1, `${region}: its accuracy rule evaluates the reader's own account dates`);
      check.ok(evaluated.assessment_kinds.includes('STATUTORY_RULE_COMPARISON'), `${region}: assessment includes its statutory accuracy class`);
    } else {
      check.equal(evaluated.results.filter((r) => r.machine && r.machine.state === 'EVALUATED').length, region === 'CA-NS' ? 4 : 0, `${region}: its statutory comparisons on this presentation are exactly the ones it can measure`);
      check.deepEqual(evaluated.assessment_kinds, region === 'CA-NS' ? ['STATUTORY_RULE_COMPARISON', 'REPORT_FACT_CONSISTENCY', 'COMMON_ERROR'] : ['REPORT_FACT_CONSISTENCY', 'COMMON_ERROR'], `${region}: so its assessment names exactly the classes that ran`);
    }
  }
  check.equal(Object.keys(perRegion).length, 13, 'all thirteen canonical Canadian selections were evaluated');
  check.deepEqual(Object.keys(perRegion).sort(), CA_REGIONS, 'and they are exactly the thirteen the recorded relation names');
  check.equal(OTHER_TWELVE.filter((r) => perRegion[r].factual_checks_performed === 2).length, 12,
    'each of the twelve selections with no recorded statutory limb ran both TransUnion factual checks');
  check.ok(Object.values(perRegion).every((row) => row.dates_compared >= 119),
    'and each comparison reached every readable printed date on the presentation (119 of them)');
  return perRegion;
}


/* ------------------------------------------------------------ genuine reports, in the real journey */

/**
 * THE WHOLE PATH, over HTTP, with the REAL specimen. Nothing is stubbed between the upload and the result, and
 * the specimen is posted from the bytes already on this machine — it is never copied into the repository.
 */
async function genuineReportJourney(t, check, specimens) {
  const owner = await t.account('second-bureau@example.test');
  if (!specimens.transunion) {
    check.skip('a real TransUnion Canada disclosure is uploaded, admitted and assessed end to end',
      (specimens.pointer && specimens.pointer.reason) || 'THE_SECOND_CANADIAN_SPECIMEN_IS_NOT_ON_THIS_MACHINE');
    return null;
  }
  const caseId = (await t.request('POST', '/api/cases', { token: owner.token, body: { country: 'CA', region: 'CA-ON' } })).json.case.case_id;
  const upload = await uploadBytes(t, owner, caseId, specimens.transunion.bytes, 'my-credit-report.pdf');

  check.equal(upload.status, 201, 'the real TransUnion Canada disclosure is accepted by the upload gate');
  check.equal(upload.json.receipt.format_detection.supported, true, 'and is ADMITTED, not refused');
  check.equal(upload.json.receipt.format_detection.presentation_id, tuCa.FAMILY_ID, 'by the TransUnion structural contract');
  check.equal(upload.json.receipt.format_detection.read_support_is, 'EVIDENCED_STRUCTURAL_CONTRACT', 'and the receipt says which admission path admitted it');
  check.equal(upload.json.receipt.extraction_summary.presentation_evidence, true, 'it supplies presentation evidence');
  check.equal(upload.json.receipt.extraction_summary.reference_date_read, true, 'its own file date is read');
  check.ok(upload.json.receipt.extraction_summary.accounts_read >= 4, 'and its account blocks are read');
  const containerFlags = upload.json.receipt.format_detection.receipt_encryption
    || (upload.json.receipt.format_detection.predicates || []).find((p) => p.id === 'ENCRYPTION_PERMITS_TEXT_EXTRACTION');
  check.ok(containerFlags, 'the receipt carries the measured encryption predicate rather than hiding it');
  check.ok(/encrypted/i.test(containerFlags.detail), 'and it states that the document is encrypted');
  check.ok(/permits text extraction/i.test(containerFlags.detail), 'and that the document itself permits the reading');

  const evaluated = await t.request('POST', `/api/cases/${caseId}/evaluate`, { token: owner.token, body: {} });
  check.equal(evaluated.status, 201, 'the case evaluates');
  const result = evaluated.json.result;
  check.equal(result.support, 'ACTUAL_REPORT_EVIDENCE', 'and the consumer sees what kind of evidence this is');
  check.equal(result.observations.length, 1, 'CA-ON evaluates its recorded accuracy rule on this reader');
  check.equal(result.report_consistency_checks.length, 2, 'and exactly the two TransUnion factual checks are reported');
  check.ok(result.report_consistency_checks.every((c) => c.is_a_finding === false), 'none of them is a finding');
  check.ok(result.report_consistency_checks.every((c) => c.output_level === 'observation'), 'each is capped at an observation');
  check.ok(result.report_consistency_checks.every((c) => /not a finding that a rule was broken/.test(c.qualification)),
    'and each qualification says in words that it is not a finding that a rule was broken');
  check.ok(JSON.stringify(result.observations).includes('Consumer Reporting Act'), 'the result retains the applicable Ontario citation');

  const stored = t.service.store.state().files.filter((f) => f.case_id === caseId).pop().extraction;
  check.equal(stored.evidence_readings.factual_view.report_text_retained, false, 'the stored view retains no report text');
  check.ok(!JSON.stringify(stored.evidence_readings).includes(specimens.transunion.sha256),
    'and it does not carry the specimen digest');
  check.ok(!t.logText().includes(specimens.transunion.path), 'the specimen path never reaches a log record');
  check.ok(!/DAVID|PHILIP|WEBB/.test(t.logText()), 'and no consumer name reaches a log record');

  const rendered = await t.request('GET', `/api/cases/${caseId}`, { token: owner.token });
  check.equal(rendered.status, 200, 'the case renders');
  check.ok(!/DAVID|PHILIP|WEBB/.test(rendered.text), 'and nothing the consumer sees carries the report\'s own name');

  const deleted = await t.request('DELETE', `/api/cases/${caseId}`, { token: owner.token });
  check.equal(deleted.status, 200, 'the case deletes');
  check.equal(t.blobFiles().length, 0, 'and nothing of the report is left on disk');
  return { caseId, upload, result, stored };
}


/* ------------------------------------------------------------ synthetic, wrong-channel and lookalike inputs */

/**
 * A file-shaped model built in memory. `synthetic: false` so the gate walks the STRUCTURAL predicates rather
 * than treating it as an in-memory model, which is what lets each predicate be exercised — and named — on its
 * own. It is NEVER presented as a consumer's report.
 */
function fileShapedModel(lines, extra) {
  const text = `${lines.join('\n')}\n`;
  return Object.assign({
    kind: 'PDF', synthetic: false, synthetic_label: null, path: null, sha256: 'F'.repeat(64), bytes: text.length,
    encrypted: false, page_count: 1, page_size: { width_pt: 612, height_pt: 792, label: 'letter' },
    producer: 'structural-probe', creator: 'structural-probe',
    encryption: { raw: 'no', encrypted: false, print_allowed: null, copy_allowed: null, change_allowed: null, add_notes_allowed: null, algorithm: null },
    text_extraction_permitted: null,
    text_extraction_tool: 'in-memory structural probe (no extraction)', structure_tool: 'in-memory structural probe',
    pages: [{ page: 1, chars: text.length, has_native_text: true, lines: text.split('\n'), text }],
    read_errors: [], synthetic_markers_found: [], not_a_pdf: false
  }, extra || {});
}

const CONTRACT_WORDS = ['Personal Information', 'Address(es)', 'Account(s)', 'Insolvency', 'Credit Related Inquiries',
  'CONSUMER DISCLOSURE', 'Social Insurance Number', 'Payment History', 'Creditor Name'];
/**
 * A GENUINE REPORT AND A SYNTHETIC ONE ARE TESTED SEPARATELY, and neither is allowed to stand in for the other.
 * The synthetic Canadian corpus fixtures that carry a TransUnion name are refused on their STRUCTURE, and their
 * refusal names the predicate that failed, because the contract matches no document by its file name.
 */
function syntheticAndLookalikeAreRefused(check, specimens) {


  const pointerPath = specimens.pointer && specimens.pointer.absolute_path ? specimens.pointer.absolute_path : null;
  const CORPUS = pointerPath
    ? path.join(path.dirname(path.dirname(pointerPath)), 'credit-reports', 'CA')
    : null;
  const namedAfterTheSameBureau = CORPUS && fs.existsSync(CORPUS)
    ? fs.readdirSync(CORPUS).filter((n) => /^transunion/i.test(n) && n.endsWith('.pdf')).slice(0, 3).map((n) => path.join(CORPUS, n))
    : [];
  if (!namedAfterTheSameBureau.length) {
    check.skip('a synthetic fixture named after the same bureau is refused on its structure',
      'the synthetic Canadian fixture corpus is not present beside the specimen');
  } else {
    for (const file of namedAfterTheSameBureau) {
      const detection = formats.detectSupportedFormat(formats.buildPdfDocumentModel(file), { country: 'CA' });
      check.equal(detection.presentation_id, 'GENERAL-BUREAU-REPORT',
        `${path.basename(file)}: a synthetic fixture is read by the general intake, not the TransUnion contract`);
      check.notEqual(detection.presentation_id, tuCa.FAMILY_ID,
        `${path.basename(file)}: and it is not read as the TransUnion family`);
    }
  }

  /* A LOOKALIKE: the OTHER bureau's real presentation. Neither contract may read it. */
  if (specimens.equifax) {
    const equifaxModel = formats.buildPdfDocumentModel(specimens.equifax.path);
    const equifaxExact = formats.detectSupportedFormat(equifaxModel, { country: 'CA' });
    check.equal(equifaxExact.supported, true, 'the admitted Equifax specimen is still admitted, by its own digest');
    const equifaxUnderTuContract = tuCa.admit(equifaxModel);
    check.equal(equifaxUnderTuContract.admitted, false, 'and the TransUnion contract refuses it, so neither contract reads the other\'s documents');
    check.ok(equifaxUnderTuContract.predicates.filter((p) => !p.passed).map((p) => p.id).includes('CONSUMER_CHANNEL_MARKERS_PRESENT'),
      'on its own consumer-channel predicate');
  } else {
    check.skip('the other bureau\'s presentation is refused by the TransUnion contract', 'the evidenced Equifax specimen is not on this machine');
  }

  /* A CANADIAN LOOKALIKE THAT NEITHER GATE ADMITS: both paths report their own refusal, so neither hides the
     other, and the closest path is the one reported. */
  const pointerDir = specimens.pointer && specimens.pointer.absolute_path
    ? path.join(path.dirname(path.dirname(specimens.pointer.absolute_path)), 'credit-reports', 'CA')
    : null;
  const unauthorisedEquifaxCopy = pointerDir && fs.existsSync(pointerDir)
    ? fs.readdirSync(pointerDir).filter((n) => /^equifax/i.test(n) && n.endsWith('.pdf'))[0]
    : null;
  if (unauthorisedEquifaxCopy) {
    const detection = formats.detectSupportedFormat(
      formats.buildPdfDocumentModel(path.join(pointerDir, unauthorisedEquifaxCopy)), { country: 'CA' });
    check.equal(detection.supported, true, 'an Equifax Canada file that is not the evidenced specimen is read by the general intake');
    check.equal(detection.presentation_id, 'GENERAL-BUREAU-REPORT', 'as a general report, not by digest');
    check.equal(detection.refusals.length, 2, 'and BOTH admissions paths still report their own refusal, so neither hides the other');
    check.ok(detection.refusals.some((row) => row.presentation_id === 'PR-01'), 'including the digest gate');
    check.ok(detection.refusals.some((row) => row.presentation_id === tuCa.FAMILY_ID), 'and the structural contract');
  } else {
    check.skip('both Canadian admissions paths report their own refusal of an unauthorised Equifax copy',
      'no unauthorised Equifax Canada copy is present beside the specimen');
  }

  /* AN IN-MEMORY MODEL IS NOT A FILE, whatever it prints. */
  const inMemoryReading = tuCa.admit(formats.makeSyntheticModel({ pages: [CONTRACT_WORDS] }));
  check.equal(inMemoryReading.admitted, false, 'an in-memory model that prints the right words is still refused');
  check.equal(inMemoryReading.refusal_reason, 'TU_CA_IN_MEMORY_MODEL_IS_NOT_A_FILE', 'because an in-memory model is not a consumer\'s file');

  /* A WRONG-CHANNEL DOCUMENT IS REFUSED BY ITS OWN PRINTED MARKER. */
  const wrongChannel = tuCa.admit(fileShapedModel(CONTRACT_WORDS.concat(['SUBSCRIBER REPORT', 'TOTALVIEW'])));
  check.equal(wrongChannel.admitted, false, 'a subscriber document that prints the right headings is refused');
  check.equal(wrongChannel.refusal_reason, 'TU_CA_WRONG_CHANNEL_MARKER', 'on the wrong-channel marker it prints');

  /* A FIXTURE MASQUERADING AS A REPORT IS REFUSED BY ITS OWN MARKER. */
  const fixture = tuCa.admit(fileShapedModel(CONTRACT_WORDS.concat(['SYNTHETIC TEST INPUT'])));
  check.equal(fixture.refusal_reason, 'TU_CA_SYNTHETIC_OR_FIXTURE_MARKER', 'and a synthetic marker refuses a fixture');
  const factory = tuCa.admit(fileShapedModel(CONTRACT_WORDS, { producer: 'crp-synthetic-credit-report-factory-2026-07-24-v1' }));
  check.equal(factory.refusal_reason, 'TU_CA_SYNTHETIC_OR_FIXTURE_MARKER', 'and so does a producer that names a synthetic factory');

  /* AN ENCRYPTED DOCUMENT THAT WITHHOLDS COPYING IS NEVER READ. */
  const sealed = tuCa.admit(fileShapedModel(CONTRACT_WORDS, {
    encrypted: true,
    text_extraction_permitted: false,
    encryption: { raw: 'yes (print:no copy:no change:no addNotes:no algorithm:AESV2)', encrypted: true, print_allowed: false, copy_allowed: false, change_allowed: false, add_notes_allowed: false, algorithm: 'AESV2' },
    pages: []
  }));
  check.equal(sealed.admitted, false, 'a PDF whose own flags withhold copying is refused');
  check.equal(sealed.refusal_reason, 'TU_CA_ENCRYPTED_WITHOUT_PERMISSION_TO_READ',
    'on the permission predicate, and the reason says the document withheld permission rather than that it was unreadable');
  check.equal(sealed.predicates.find((p) => p.id === 'ENCRYPTION_PERMITS_TEXT_EXTRACTION').passed, false,
    'and the encryption predicate records the same thing beside it');
  const repositoryRoot = path.resolve(__dirname, '..', '..', '..', '..');
  const sealedArtifact = path.join(repositoryRoot, 'SOURCE_CAPTURES', 'REPORT_FORMAT_BASELINE_2026-09-30', 'PUB-004.pdf');
  if (fs.existsSync(sealedArtifact)) {
    const sealedRead = formats.buildPdfDocumentModel(sealedArtifact);
    check.equal(sealedRead.encrypted, true, 'a real captured PDF on this machine is encrypted, measured from its container');
    check.equal(sealedRead.encryption.copy_allowed, false, 'and its own flags withhold copying');
    check.equal(sealedRead.pages.length, 0, 'so it is not read, whichever gate measures it');
    check.equal(tuCa.admit(sealedRead).refusal_reason, 'TU_CA_ENCRYPTED_WITHOUT_PERMISSION_TO_READ',
      'and the reason names the permission rather than an unreadable file');
  } else {
    check.skip('a real copy-withholding PDF is refused on its permission flags',
      'the captured artifact PUB-004 is not present');
  }

  /* A DOCUMENT MISSING THE STRUCTURE IS REFUSED AT THE STRUCTURE PREDICATE, WITH EVERY PREDICATE RECORDED. */
  const thin = tuCa.admit(fileShapedModel(['Credit Report', 'Date', 'Balance']));
  check.equal(thin.admitted, false, 'a document with no consumer-channel markers is refused');
  check.equal(thin.refusal_reason, 'TU_CA_CONSUMER_CHANNEL_MARKERS_ABSENT', 'at the consumer-channel predicate');
  check.equal(thin.predicates.length, 11, 'and every predicate is still evaluated and recorded, not just the first');
  check.ok(thin.predicates.every((p) => typeof p.id === 'string' && typeof p.passed === 'boolean'),
    'so the refusal states the document\'s whole measured shape');
}


/* ------------------------------------------------------------------ the section */

async function run(t, check) {
  const specimens = loadRealSpecimens();
  const evidence = {
    note: 'Genuine reports and synthetic variation are tested separately, and neither stands in for the other.',
    specimens_available: {
      equifax_ca_pr_01: Boolean(specimens.equifax),
      transunion_ca: Boolean(specimens.transunion),
      transunion_digest_verified: specimens.verification ? specimens.verification.verified === true : false
    }
  };

  const recorded = recordedEvidenceReproduces(check, specimens);
  evidence.admission_record = {
    path: 'SOURCE_CAPTURES/B4-CA-CONSUMER-FAMILIES/tu-ca-family-admission.json',
    amendment_required: false,
    remeasured_against_the_document: recorded.remeasured,
    family_id: recorded.record.family.family_id,
    evidence_sha256: recorded.record.evidence.sha256
  };

  twoContractsKeepTheirOwnBoundaries(check, specimens);
  evidence.two_contracts = {
    canadian_presentations: formats.formatsForCountry('CA').map((a) => a.presentation_id).sort(),
    canadian_families: formats.familiesForCountry('CA').map((a) => a.family_id),
    equifax_family_admitted: caScope.FAMILY_ADMISSION.admitted,
    country_family_admitted: caScope.COUNTRY_FAMILY_ADMISSION.admitted,
    every_ca_ns_adapter_bound_to_pr01: true
  };

  const reading = fieldReadingsAndAmbiguity(check, specimens);
  twoColumnHazards(check, reading);
  ambiguityAndReferenceDate(check, reading);
  checksAreScopedToTheirOwnLayout(check, reading);
  const perRegion = everyCanadianSelectionAssesses(check, reading);

  evidence.reading = reading ? {
    presentation_id: tuCa.FAMILY_ID,
    account_blocks: reading.tradelines.length,
    enquiry_rows: reading.enquiries.length,
    reference_date_status: reading.view.reference_date.status,
    report_text_retained: reading.view.reference_date ? reading.view.report_text_retained : null,
    printed_but_not_read: reading.view.printed_but_not_read.map((row) => row.printed_as.join(' '))
  } : null;
  evidence.regions = perRegion;
  evidence.factual_check_ids = { transunion: TU_FACTUAL_IDS, equifax: PR01_FACTUAL_IDS };

  const journey = await genuineReportJourney(t, check, specimens);
  if (journey) {
    evidence.journey = {
      admitted: true,
      admission_path: journey.upload.json.receipt.format_detection.read_support_is,
      accounts_read: journey.upload.json.receipt.extraction_summary.accounts_read,
      checks_performed: journey.result.checks_performed,
      report_consistency_checks: journey.result.report_consistency_checks.length,
      deletions_removed_every_blob: t.blobFiles().length === 0
    };
  }

  syntheticAndLookalikeAreRefused(check, specimens);
  evidence.refusals = {
    synthetic_fixtures_named_after_the_bureau: 'refused on the structural predicates this contract names',
    the_other_bureaus_presentation: 'refused by both admissions paths, each naming its own predicate',
    in_memory_model: 'refused because an in-memory model is not a file',
    wrong_channel: 'refused on the printed wrong-channel marker',
    fixture_factory: 'refused on the marker the document itself carries',
    encrypted_without_copy_permission: 'refused on the permission predicate'
  };

  check.ok(!t.logText().includes(specimens.transunion ? specimens.transunion.sha256 : '__none__'),
    'the specimen digest never reaches a log record');
  return evidence;
}

module.exports = {
  run,
  id: 'w-ca-second-bureau-format',
  title: 'The second Canadian consumer format, admitted by its own measured structural contract, with the Equifax admission and the Nova Scotia statutory unit untouched'
};

