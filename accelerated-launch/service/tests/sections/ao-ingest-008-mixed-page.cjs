'use strict';
/* ao-ingest-008-mixed-page.cjs — OWNER-ACCEPT-009 GAP-INGEST-008 (single-page partial-text recovery).
 * A page carrying SUBSTANTIAL native text AND an embedded image-only account/table region must recover that
 * region through bounded local OCR. Exercises: useful recovery, no duplicate extraction on a fully readable
 * page, conflicting readings kept unresolved, an unreadable image region with honest messaging, and the
 * equivalent layout with the image region in a different position. */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { buildPdfDocumentModel } = require('../../../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');
const { buildPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');
const { buildMixedPagePdf, freezeExpected } = require('../../../../SOURCE_CAPTURES/ACCEPT-009/build-mixed-page-pdf.cjs');
const formats = require('../../formats.cjs');

async function run(t, check) {
  const evidence = {};
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'crp-ing008-'));
  const extractBytes = (bytes) => {
    const file = path.join(tmp, `page-${Math.random().toString(36).slice(2)}.pdf`);
    fs.writeFileSync(file, bytes);
    const model = buildPdfDocumentModel(file);
    return { model, ext: formats.extractWithSharedAdapter(model, { mode: 'REPORT', country: 'US' }) };
  };

  try {
    /* 1. useful recovery of an image-only account/table */
    const expected = freezeExpected({
      nativeLines: ['Equifax Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor A Opened 01/01/2015 Balance $100'],
      imageLines: ['Creditor B Opened 03/03/2019 Balance $800', 'Creditor B Payment History: OK OK OK']
    });
    const recovered = extractBytes(buildMixedPagePdf({
      nativeLines: expected.native_lines,
      imageLines: expected.image_lines
    }));
    check.equal(recovered.ext.admitted, true, 'a mixed native+image page admits');
    const bRecord = recovered.ext.records.find((r) => (r.facts || {})['account.reported_identity'] === 'CREDITOR B');
    check.ok(bRecord, 'the image-only account body is recovered as a record (Creditor B)');
    check.equal(bRecord && bRecord.facts['account.balance'], 800, 'the recovered balance fact is read (800)');
    check.equal(bRecord && bRecord.facts['liability.openedDate'], '2019-03-03', 'and the recovered opened date is read');
    check.equal(bRecord && bRecord.location.source, 'LOCAL_OCR', 'the recovered fact carries its OCR source');
    check.equal(bRecord && bRecord.location.page, 1, 'on the same page');
    check.ok(typeof (bRecord && bRecord.location.confidence) === 'number', 'with its OCR confidence');
    check.ok(bRecord && bRecord.location.bbox, 'with its coordinate bounding box');
    check.deepEqual(recovered.ext.reading_state.mixed_native_pages, [1], 'the page is reported as mixed (native + recovered region)');
    check.equal(recovered.ext.reading_state.complete, true, 'and the reading is complete once the region is recovered');
    const added = (recovered.ext.recovery_audit && recovered.ext.recovery_audit.facts_added) || [];
    check.ok(added.some((a) => /Creditor B Opened 03\/03\/2019 Balance \$800/.test(a.text) && a.source === 'LOCAL_OCR'), 'the recovery audit names the recovered fact with its source');

    /* 2. fully readable native page, no duplicate extraction */
    const nativeOnly = extractBytes(buildPdf({ pages: [{ lines: ['Equifax Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor A Opened 01/01/2015 Balance $100'] }] }));
    check.equal(nativeOnly.ext.admitted, true, 'a fully readable native page admits');
    check.equal(nativeOnly.ext.records.length, 1, 'a fully readable native page produces exactly one record (no duplicate extraction)');
    check.equal(nativeOnly.ext.reading_state.mixed_native_pages.length, 0, 'no mixed-page recovery was triggered');
    check.equal(nativeOnly.ext.reading_state.image_only_pages.length, 0, 'and no image-only pass was triggered');
    check.equal(nativeOnly.ext.reading_state.complete, true, 'the reading is complete without any OCR pass');

    /* 3. conflicting readings kept unresolved (no substitution) */
    const conflict = extractBytes(buildMixedPagePdf({
      nativeLines: ['Equifax Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor B Balance $100'],
      imageLines: ['Creditor B Balance $200']
    }));
    const amounts = conflict.ext.records
      .filter((r) => (r.facts || {})['account.reported_identity'] === 'CREDITOR B')
      .map((r) => r.facts['account.balance']);
    check.deepEqual([...new Set(amounts)].sort(), [100, 200], 'conflicting native and OCR values are both preserved, never substituted');
    check.ok(conflict.ext.records.filter((r) => (r.facts || {})['account.reported_identity'] === 'CREDITOR B').every((r) => r.status !== 'RESOLVED'), 'the materially disagreeing balance is withheld (no resolved conclusion)');
    check.equal(conflict.ext.reading_state.complete, false, 'the conflicting reading is reported as incomplete, not silently resolved');

    /* 4. unreadable image region, honest incomplete-review messaging */
    const unreadable = extractBytes(buildMixedPagePdf({
      nativeLines: ['Equifax Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor A Opened 01/01/2015 Balance $100'],
      imageLines: []
    }));
    check.deepEqual(unreadable.ext.reading_state.unread_image_regions, [1], 'an image region with no recoverable content is reported as unread');
    check.equal(unreadable.ext.reading_state.complete, false, 'and the reading is incomplete');
    check.equal(unreadable.ext.reading_limitations.incomplete, true, 'the incomplete-review limitation is set');
    check.equal(unreadable.ext.reading_limitations.never_equates_unread_with_absence, true, 'unread content is never equated with absence');
    check.ok(/could not be read completely/.test(unreadable.ext.reading_limitations.plain || ''), 'the honest incomplete-review message names the limitation');

    /* 5. equivalent layout with the image region in a different position */
    const topPosition = extractBytes(buildMixedPagePdf({
      nativeLines: ['Equifax Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor A Opened 01/01/2015 Balance $100'],
      imageLines: ['Creditor B Opened 03/03/2019 Balance $800'],
      image_position: 'top'
    }));
    const topB = topPosition.ext.records.find((r) => (r.facts || {})['account.reported_identity'] === 'CREDITOR B');
    check.ok(topB, 'the image-only account body is recovered when the image region is at the top');
    check.equal(topB && topB.facts['account.balance'], 800, 'with the same recovered balance');
    check.equal(topB && topB.location.source, 'LOCAL_OCR', 'and the same OCR source');

    evidence.recovery = {
      recovered_balance: 800,
      recovered_source: 'LOCAL_OCR',
      mixed_pages: recovered.ext.reading_state.mixed_native_pages,
      conflicting_values_preserved: amounts,
      unread_image_regions: unreadable.ext.reading_state.unread_image_regions,
      equivalent_layout_recovered: Boolean(topB)
    };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  return evidence;
}

module.exports = { run, id: 'ao-ingest-008-mixed-page', title: 'GAP-INGEST-008: single-page partial-text recovery (native text + image-only region)' };

