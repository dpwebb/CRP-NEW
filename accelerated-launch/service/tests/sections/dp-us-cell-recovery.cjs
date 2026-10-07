'use strict';

// Actual PUB-001 proves the reread. Fictional files exercise ambiguity/source boundaries separately.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ocr = require('../../ocr/local-ocr.cjs');
const formats = require('../../formats.cjs');
const family = require('../../format-families/us-experian-consumer.cjs');
const common = require('../../common-errors.cjs');
const dn = require('./dn-us-dated-history.cjs').fixtures;
const df = require('./df-us-common-error-reader.cjs').fixtures;
const { buildWordPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');
const HISTORY = 'COMMON-ERROR-PAYMENT-HISTORY-INCONSISTENCY';

function hash(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }

async function run(t, check) {
  const specimen = process.env.CRP_US_EXPERIAN_PUBLIC_SPECIMEN
    || path.resolve(__dirname, '../../../../SOURCE_CAPTURES/REPORT_FORMAT_BASELINE_2026-09-30/PUB-001.pdf');
  check.ok(fs.existsSync(specimen), 'the actual pinned public report is required for region recovery evidence');
  check.equal(hash(specimen), family.EVIDENCED_SHA256, 'the own glyph source is the exact reviewed public PDF');
  const model = formats.buildPdfDocumentModel(specimen);
  const extraction = formats.extractWithSharedAdapter(model, { mode: 'REPORT', country: 'US' });
  const accounts = extraction.records.filter((record) => record.kind === 'REPORTED_ACCOUNT');
  const cells = accounts.flatMap((record) => record.facts['account.paymentHistoryCells'] || []);
  const may = accounts[0].facts['account.paymentHistoryCells'].find((cell) => cell.period === '2015-05');
  check.equal(may.raw_code, '30', 'the formerly missing own May glyph is physically reread as printed 30');
  check.equal(may.reason, null, 'its own code, month and year are readable');
  check.equal(may.code_definition.code, '30', 'the reviewed issuer definition supports the literal code');
  check.equal(may.location.page, 1, 'the recovered glyph remains on its actual report page');
  check.ok(may.location.x0 > 100 && may.location.x1 < 125 && may.location.y0 > 1970 && may.location.y1 < 1980,
    'the code keeps its own small physical bbox rather than the merged OCR month/border bbox');
  check.equal(may.location.recovery.raster_dpi, 300, 'the recovery records its actual physical raster resolution');
  check.equal(may.location.recovery.psm, 7, 'the unrestricted single-region OCR mode is recorded');
  check.equal(may.location.recovery.confidence_floor, ocr.TRUSTED_LINE_CONFIDENCE, 'the existing confidence floor is unchanged');
  check.ok(may.location.recovery.confidence >= 70, 'the recovered decisive glyph meets the existing floor');
  check.equal(may.location.recovery.source_sha256, family.EVIDENCED_SHA256, 'recovered pixels pin the same immutable report bytes');
  check.equal(may.period_location.month.page, 1, 'the own May label retains its source');
  check.equal(may.period_location.year.page, 1, 'the own 2015 heading retains its source');
  check.equal(accounts[0].facts['tradeline.firstDelinquencyDate'], undefined, 'a recovered 30 rating does not invent original delinquency');
  check.ok(cells.some((cell) => cell.uncertain && cell.raw_code), 'remaining unreadable glyphs stay raw and unresolved');
  const april = accounts[0].facts['account.paymentHistoryCells'].find((cell) => cell.period === '2015-04');
  check.equal(april.raw_code.toUpperCase(), 'OK', 'the own April crop separately rereads its printed OK');
  check.ok(april.original_code_readings.some((reading) => reading.raw === 'Pox'), 'the rejected original reading is preserved separately');
  check.equal(common.runCommonErrorChecks({ extraction }).performed.find((row) => row.check_id === HISTORY)?.source_records.length || 0,
    0, 'different own periods in the public report remain benign after rereading');

  const glyphs = path.join(t.dataDir, 'fictional-glyph-controls.pdf');
  fs.writeFileSync(glyphs, buildWordPdf([{ words: [{ text: 'XYZ', x: 40, y: 40 },
    { text: '30', x: 110, y: 40 }, { text: 'OK', x: 140, y: 40 }] }],
  { page_size: { width: 300, height: 120 }, font_size: 9 }));
  const regions = ocr.readPdfRegions(glyphs, [{ id: 'unknown', page: 1, x0: 38, y0: 38, x1: 64, y1: 53 },
    { id: 'two', page: 1, x0: 108, y0: 38, x1: 160, y1: 53 },
    { id: 'blank', page: 1, x0: 210, y0: 38, x1: 230, y1: 53 }]);
  check.equal(regions.available, true, 'bounded physical regions use the installed local executables');
  const unknown = regions.regions.find((region) => region.id === 'unknown');
  check.equal(unknown.word?.text, 'XYZ', 'an unknown glyph is read freely rather than coerced into an allowed code');
  check.equal(require('../../report-code-definitions.cjs').definitionForCode(unknown.word.text), null, 'unknown recovered text has no performance meaning');
  check.equal(regions.regions.find((region) => region.id === 'two').word, null, 'two neighboring glyphs are not silently reduced to one answer');
  check.equal(regions.regions.find((region) => region.id === 'blank').word, null, 'a blank region is not filled by a neighboring rating');
  for (const invalid of [[{ page: 0, x0: 1, y0: 1, x1: 2, y1: 2 }],
    [{ page: 1, x0: -1, y0: 1, x1: 2, y1: 2 }], [{ page: 1, x0: 1, y0: 1, x1: 100, y1: 2 }],
    Array.from({ length: 65 }, () => ({ page: 1, x0: 1, y0: 1, x1: 2, y1: 2 }))]) {
    check.equal(ocr.readPdfRegions(glyphs, invalid).available, false, 'invalid or excessive spatial work is refused before rasterising');
  }

  const sourceCopy = path.join(t.dataDir, 'public-source-change-control.pdf');
  fs.copyFileSync(specimen, sourceCopy);
  const changedModel = formats.buildPdfDocumentModel(sourceCopy);
  family.textLayerFor(changedModel); // Record the initial 150 dpi reading before the file changes.
  fs.writeFileSync(sourceCopy, fs.readFileSync(glyphs));
  const changed = formats.extractWithSharedAdapter(changedModel, { mode: 'REPORT', country: 'US' });
  check.equal(changed.records.flatMap((record) => record.facts['account.paymentHistoryCells'] || [])
    .some((cell) => cell.location?.recovery || cell.period_location.month?.recovery), false,
  'a changed physical file cannot supply reread evidence for the cached original report');

  // This is a controlled first-reading failure on a fictional real PDF, not presentation admission evidence.
  const fictional = df.read(t, [], null, dn.disclosure([{ history: { months: ['May', 'May'], codes: ['30', 'OK'] } }]));
  fictional.model.pages.forEach((page) => { page.has_native_text = false; });
  const initial = family.textLayerFor(fictional.model); // Native was already cached, so use a new disk model for OCR.
  check.equal(initial.source, 'NATIVE_TEXT_LAYER', 'a cached native source never changes to OCR because a flag is edited');
  const original = ocr.readPdfRegions;
  let nativeCalls = 0;
  ocr.readPdfRegions = (...args) => { nativeCalls += 1; return original(...args); };
  try {
    const native = df.read(t, [], null, dn.disclosure([{ history: { months: ['May', 'May'], codes: ['30', 'OK'] } }]));
    check.equal(nativeCalls, 0, 'ordinary native reports never incur regional OCR work');
    check.equal(common.runCommonErrorChecks({ extraction: native.extraction }).performed.find((row) => row.check_id === HISTORY)?.source_records.length,
      1, 'the already supported same-period native contradiction remains intact');
  } finally { ocr.readPdfRegions = original; }
  const retryModel = formats.buildPdfDocumentModel(fictional.model.path);
  retryModel.pages.forEach((page) => { page.has_native_text = false; });
  const firstReading = family.textLayerFor(retryModel);
  firstReading.pages[0].word_evidence.filter((word) => word.text === '30')
    .forEach((word) => { word.trusted = false; word.confidence = 20; });
  const recovered = formats.extractWithSharedAdapter(retryModel, { mode: 'REPORT', country: 'US' });
  const recoveredCell = recovered.records[0].facts['account.paymentHistoryCells'].find((cell) => cell.code === '30');
  check.equal(recoveredCell.reason, null, 'a controlled initial reading failure is corrected from the unchanged own printed glyph');
  check.equal(recoveredCell.location.recovery.source_sha256, hash(fictional.model.path), 'the retry pins the fictional file actually reread');
  const offered = df.offered(recovered);
  const issue = offered.findings.find((row) => row.check_id === HISTORY);
  check.ok(issue && offered.public.find((row) => row.issue_id === issue.issue_id)?.consumer_label === 'VIOLATION',
    'the corrected source reading reaches the existing selectable violation');
  check.ok(issue.rule_assessment.required_facts.some((fact) => fact.source.location?.recovery?.source_sha256 === hash(fictional.model.path)),
    'the existing rule proof retains the physical retry provenance');

  // Packet integration uses this controlled reading of the same uploaded bytes; the initial OCR
  // failure is injected above. This does not claim the fictional file is a new presentation source.
  const owner = await t.unpaidAccount('dp-history-owner@example.test'); await t.pay(owner, 'monthly');
  const created = await t.request('POST', '/api/cases', { token: owner.token, body: { country: 'US', region: 'US-NY' } });
  const caseId = created.json.case.case_id, endpoint = '/api/cases/' + caseId;
  check.equal((await t.request('POST', endpoint + '/files', { token: owner.token, body: {
    originalFilename: 'fictional-recovered-history.pdf', declaredBytes: fictional.bytes.length,
    mimeType: 'application/pdf', contentBase64: fictional.bytes.toString('base64') } })).status, 201,
  'the identical fictional source bytes enter the owned upload route');
  check.equal((await t.request('POST', endpoint + '/evaluate', { token: owner.token })).status, 201,
    'the existing native path first assesses the uploaded bytes');
  t.service.store.update((state) => {
    const row = state.results.find((result) => result.case_id === caseId);
    row.extraction = recovered;
    row.evaluation = require('../../evaluation.cjs').evaluateCase({ country: 'US', region: 'US-NY', extraction: recovered });
    row.rendered = require('../../results.cjs').renderResultSet({ extraction: recovered, evaluation: row.evaluation });
  });
  const view = (await t.request('GET', endpoint + '/packet', { token: owner.token })).json.view;
  const selected = view.eligible_issues.find((row) => row.title === issue.title || row.issue_id === issue.issue_id);
  check.ok(selected, 'the persisted recovered proof is available in the consumer packet selector');
  if (selected) {
    await t.request('POST', endpoint + '/packet/select', { token: owner.token, body: { issue_ids: [selected.issue_id] } });
    await t.request('POST', endpoint + '/packet/correspondence', { token: owner.token, body: {
      correspondence: { consumer_name: 'Fictional Consumer', contact: 'fictional@example.test' } } });
    check.equal((await t.request('POST', endpoint + '/packet/approve', { token: owner.token })).status, 200,
      'the consumer approves the source-linked recovered history');
    const download = await t.request('GET', endpoint + '/packet-download', { token: owner.token });
    check.equal(download.status, 200, 'the approved packet containing the recovered glyph downloads');
    check.ok(download.text.includes('printed "30"') && download.text.includes('printed "OK"')
      && download.text.includes('May 2025'), 'the packet states the physically printed codes and their own period');
    t.service.store.update((state) => {
      state.results.find((result) => result.case_id === caseId).extraction.records[0].facts['account.paymentHistoryCells']
        .find((cell) => cell.code === '30').location.recovery.source_sha256 = 'changed';
    });
    check.equal((await t.request('GET', endpoint + '/packet-download', { token: owner.token })).status, 409,
      'changing the physical retry source identity invalidates approval');
  }
  return { public_source: family.EVIDENCED_SHA256, cells: cells.length,
    readable: cells.filter((cell) => !cell.uncertain).length,
    recovered_codes: cells.filter((cell) => cell.location?.recovery).length,
    recovered_months: cells.filter((cell) => cell.period_location.month?.recovery).length,
    remaining_unresolved: cells.filter((cell) => cell.uncertain).length,
    scope: 'own physical US history glyph reread; no inferred delinquency/payment/closure date' };
}

module.exports = { id: 'dp-us-cell-recovery', title: 'Own US OCR history regions remain source-linked', run };
