'use strict';
/** tests/sections/e-refusals.cjs — the refusal paths, against real PDF fixtures written to a temporary directory. */

module.exports.run = function run(ctx) {
  const { test, assert, fixtures, evaluateModel, admitDocument, buildPdfDocumentModel, EVIDENCE, SELECTION } = ctx;

  const pdfs = fixtures.pdfFixtures();
  const models = {
    marker: buildPdfDocumentModel(pdfs.marker),
    unpinned: buildPdfDocumentModel(pdfs.unpinned),
    imageOnly: buildPdfDocumentModel(pdfs.imageOnly),
    wrongCount: buildPdfDocumentModel(pdfs.wrongCount),
    notPdf: buildPdfDocumentModel(pdfs.notPdf),
    missing: buildPdfDocumentModel(pdfs.missing)
  };

  test('E1 a fixture masquerading as a report is refused, not evaluated', () => {
    const admission = admitDocument(models.marker);
    assert(admission.state === 'REFUSED', `state ${admission.state}`);
    assert(models.marker.synthetic_markers_found.includes('SYNTHETIC TEST INPUT'), `markers ${models.marker.synthetic_markers_found.join(',')}`);
    const run = evaluateModel(models.marker, SELECTION, EVIDENCE, 'fixture file');
    assert(run.admission.refusal_reason === 'SYNTHETIC_OR_FIXTURE_MARKER', `reason ${run.admission.refusal_reason}`);
    assert(run.extraction.last_payment_facts[0].status === 'UNSUPPORTED_PRESENTATION', `fact status ${run.extraction.last_payment_facts[0].status}`);
    assert(run.comparison_summary.resolved_comparisons === 0, 'a comparison ran on a refused document');
    assert(run.result_provenance.admitted_document === false, 'the fixture was recorded as an admitted document');
    return `${run.admission.refusal_reason} -> ${run.extraction.last_payment_facts[0].status}`;
  });

  test('E2 a PR-01-shaped document that is not the evidenced specimen is refused', () => {
    const run = evaluateModel(models.unpinned, SELECTION, EVIDENCE, 'operator document');
    assert(run.admission.refusal_reason === 'NOT_THE_EVIDENCED_SPECIMEN', `reason ${run.admission.refusal_reason}`);
    assert(run.extraction.last_payment_facts[0].status === 'UNSUPPORTED_PRESENTATION', `status ${run.extraction.last_payment_facts[0].status}`);
    return 'one specimen does not establish support for every report from that bureau';
  });

  test('E3 a page with no native text is refused as a presentation, not read as empty', () => {
    const run = evaluateModel(models.imageOnly, SELECTION, EVIDENCE, 'operator document');
    assert(run.admission.refusal_reason === 'IMAGE_ONLY_OR_NO_TEXT_LAYER', `reason ${run.admission.refusal_reason}`);
    assert(run.extraction.last_payment_facts[0].status === 'UNSUPPORTED_PRESENTATION', `status ${run.extraction.last_payment_facts[0].status}`);
    return run.admission.refusal_reason;
  });

  test('E4 a document that is not the contract geometry is refused', () => {
    const run = evaluateModel(models.wrongCount, SELECTION, EVIDENCE, 'operator document');
    assert(run.admission.refusal_reason === 'PAGE_GEOMETRY_MISMATCH', `reason ${run.admission.refusal_reason}`);
    assert(run.admission.predicates.find((p) => p.id === 'PAGE_GEOMETRY_MATCHES_CONTRACT').passed === false, 'the geometry predicate passed');
    return run.admission.refusal_reason;
  });

  test('E5 a container that is not a PDF is refused', () => {
    const run = evaluateModel(models.notPdf, SELECTION, EVIDENCE, 'operator document');
    assert(run.admission.refusal_reason === 'NOT_A_PDF_CONTAINER', `reason ${run.admission.refusal_reason}`);
    return run.admission.refusal_reason;
  });

  test('E6 an unreadable document is a document-level extraction failure, never an absence', () => {
    const run = evaluateModel(models.missing, SELECTION, EVIDENCE, 'operator document');
    assert(run.admission.refusal_reason === 'DOCUMENT_NOT_READABLE', `reason ${run.admission.refusal_reason}`);
    assert(run.extraction.last_payment_facts[0].status === 'EXTRACTION_UNRESOLVED', `status ${run.extraction.last_payment_facts[0].status}`);
    assert(run.extraction.last_payment_facts[0].status !== 'ABSENT_FROM_REPORT', 'a read failure was recorded as absence');
    return `${run.admission.refusal_reason} -> ${run.extraction.last_payment_facts[0].status}`;
  });

  test('E7 a synthetic model can never enter the evaluation path', () => {
    const synthetic = fixtures.specimen({});
    let threw = false;
    try { evaluateModel(synthetic, SELECTION, EVIDENCE, 'synthetic'); } catch (err) { threw = /REFUSED_INTERNAL_INVARIANT/.test(err.message); }
    assert(threw, 'the production entry point accepted a synthetic model');
    let threwReverse = false;
    try { evaluateModel(models.unpinned, SELECTION, EVIDENCE, 'operator', { synthetic_test_input: true }); } catch (err) { threwReverse = /REFUSED_INTERNAL_INVARIANT/.test(err.message); }
    assert(threwReverse, 'synthetic test input was accepted for a real document model');
    return 'both directions of the synthetic boundary are refused';
  });

  test('E8 a synthetic test-input result is stamped as not presentation evidence', () => {
    const run = ctx.syntheticRun(fixtures.specimen({}));
    assert(run.result_provenance.synthetic_test_input === true, 'the synthetic provenance flag is missing');
    assert(run.result_provenance.presentation_evidence === false, 'a synthetic result claimed to be presentation evidence');
    assert(run.result_provenance.admitted_document === false, 'a synthetic result claimed an admitted document');
    return run.result_provenance.note;
  });
};
