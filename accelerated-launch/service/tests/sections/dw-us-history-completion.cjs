'use strict';

// Fictional physical pixels and controlled first readings exercise source preservation.
// These fixtures are controls, not evidence for admitting another bureau presentation.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ocr = require('../../ocr/local-ocr.cjs');
const formats = require('../../formats.cjs');
const family = require('../../format-families/us-experian-consumer.cjs');
const common = require('../../common-errors.cjs');
const dn = require('./dn-us-dated-history.cjs').fixtures;
const HISTORY = 'COMMON-ERROR-PAYMENT-HISTORY-INCONSISTENCY';

function pixelPdf(rgb, width, height) {
  const pageWidth = 100, pageHeight = 60, x = 20, y = 20, w = width * 72 / 300, h = height * 72 / 300;
  const content = Buffer.from(`q ${w} 0 0 ${h} ${x} ${pageHeight - y - h} cm /Im1 Do Q\n`);
  const objects = [Buffer.from('<< /Type /Catalog /Pages 2 0 R >>'),
    Buffer.from('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'),
    Buffer.from(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im1 4 0 R >> >> /Contents 5 0 R >>`),
    Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Interpolate false /Length ${rgb.length} >>\nstream\n`), rgb, Buffer.from('\nendstream')]),
    Buffer.concat([Buffer.from(`<< /Length ${content.length} >>\nstream\n`), content, Buffer.from('endstream')]),
    Buffer.from('<< /Producer (CRP fictional pixel control) /Title (FICTIONAL UNKNOWN GLYPH CONTROL) >>')];
  const chunks = [Buffer.from('%PDF-1.4\n')], offsets = [0]; let position = chunks[0].length;
  objects.forEach((body, index) => { offsets.push(position); const object = Buffer.concat([
    Buffer.from(`${index + 1} 0 obj\n`), body, Buffer.from('\nendobj\n')]); chunks.push(object); position += object.length; });
  chunks.push(Buffer.from(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
    + offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')
    + `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${position}\n%%EOF\n`));
  return { bytes: Buffer.concat(chunks), region: { id: 'own', page: 1, x0: x, y0: y, x1: x + w, y1: y + h } };
}

function coloredUnknown(prefixInGutter, prefixColor = [0, 0, 0]) {
  const width = 120, height = 50, rgb = Buffer.alloc(width * height * 3);
  const set = (x, y, color) => color.forEach((value, channel) => { rgb[(y * width + x) * 3 + channel] = value; });
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    set(x, y, prefixInGutter && x < 24 ? [255, 255, 255] : [0, 128, 0]);
  }
  // A dark X is independent of the white glyphs and equals the green background's red channel.
  for (let y = 10; y < 39; y += 1) for (let thickness = 0; thickness < 3; thickness += 1) {
    if (prefixColor) {
      set(4 + Math.floor((y - 10) / 2) + thickness, y, prefixColor);
      set(18 - Math.floor((y - 10) / 2) + thickness, y, prefixColor);
    }
  }
  const letters = [['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
    ['10001', '10010', '10100', '11000', '10100', '10010', '10001']];
  letters.forEach((rows, letter) => rows.forEach((row, yy) => [...row].forEach((bit, xx) => {
    if (bit === '1') for (let dy = 0; dy < 4; dy += 1) for (let dx = 0; dx < 4; dx += 1) {
      set(48 + letter * 28 + xx * 4 + dx, 10 + yy * 4 + dy, [255, 255, 255]);
    }
  })));
  return { rgb, width, height };
}

function controlledReading(t, change) {
  const native = dn.read(t, [{ history: { months: ['May', 'May'], codes: ['30', 'OK'] } }]);
  const model = formats.buildPdfDocumentModel(native.model.path);
  model.pages.forEach((page) => { page.has_native_text = false; });
  const layer = family.textLayerFor(model);
  change(layer.pages[0].word_evidence);
  return { model, extraction: formats.extractWithSharedAdapter(model, { mode: 'REPORT', country: 'US' }) };
}

async function run(t, check) {
  const clearPixels = coloredUnknown(false, null), clearPdf = pixelPdf(clearPixels.rgb, clearPixels.width, clearPixels.height);
  const clearFile = path.join(t.dataDir, 'fictional-colored-readable-code.pdf'); fs.writeFileSync(clearFile, clearPdf.bytes);
  const clear = ocr.readPdfRegions(clearFile, [clearPdf.region]).regions[0];
  check.equal(clear.word?.text.toUpperCase(), 'OK', 'the chromatic source controls start from a physically readable own code');
  check.ok(clear.word?.recovery.source_ink_channels.some((channel) => channel.source_channel === 'RED'),
    'accepted recovery retains the source channels supporting its full glyph enclosure');
  for (const [name, color] of [['red', [255, 0, 0]], ['yellow', [255, 128, 0]], ['faint-yellow', [100, 128, 0]]]) {
    const fixture = coloredUnknown(false, color), pdf = pixelPdf(fixture.rgb, fixture.width, fixture.height);
    const file = path.join(t.dataDir, `fictional-${name}-unknown-prefix.pdf`); fs.writeFileSync(file, pdf.bytes);
    const region = ocr.readPdfRegions(file, [pdf.region]).regions[0];
    check.equal(region.word, null, 'a chromatic prefix cannot disappear into a known code in another channel');
    if (name === 'red') {
      check.equal(region.reason, 'REGION_HAS_OPPOSITE_POLARITY_INK', 'opposite ink in any source channel rejects the whole region');
      check.equal(region.physical_features.source_channel, 'GREEN', 'the rejected channel is recorded even though grayscale loses the red mark');
    } else {
      check.ok(region.variants.some((variant) => /^BLUE_/.test(variant.polarity)
        && variant.words.length === 1 && variant.words[0].text.toUpperCase() === 'OK'
        && variant.words[0].trusted && !variant.covers_source_ink && !variant.own),
      'same-polarity red-channel prefix ink rejects a trusted incomplete blue-channel reading');
    }
  }
  for (const gutter of [true, false]) {
    const fixture = coloredUnknown(gutter), pdf = pixelPdf(fixture.rgb, fixture.width, fixture.height);
    const file = path.join(t.dataDir, `fictional-${gutter ? 'gutter' : 'inside'}-unknown.pdf`);
    fs.writeFileSync(file, pdf.bytes);
    const region = ocr.readPdfRegions(file, [pdf.region]).regions[0];
    check.equal(region.word, null, 'a meaningful dark prefix is not normalized into a known white code');
    check.equal(region.reason, 'REGION_HAS_OPPOSITE_POLARITY_INK', 'the complete RGB path detects the source mark before channel normalization');
    check.ok(region.physical_features.opposite_polarity_ink, 'rejected source component bounds are retained');
    check.equal(region.variants.length, 0, 'a red channel with invisible black ink cannot bypass the source guard');
    if (gutter) {
      const started = Date.now(), limited = ocr.readPdfRegions(file, [pdf.region], { timeBudgetMs: 1 });
      check.equal(limited.regions[0]?.reason, 'PHYSICAL_OCR_BAND_TIME_BUDGET_EXCEEDED',
        'an exhausted raster budget leaves an explicit unresolved own region');
      check.equal(limited.regions[0]?.word, null, 'a time limit supplies no source reading');
      check.ok(Date.now() - started < 2000, 'the regional time limit stops local raster work promptly');
      check.equal(limited.band_time_budget_ms, 45000, 'the fixed aggregate band ceiling remains explicit');
    }
  }

  const codeConflict = controlledReading(t, (words) => {
    const own = words.find((word) => word.text === '30');
    own.text = 'XYZ'; own.trusted = true; own.confidence = 90;
  });
  const conflict = codeConflict.extraction.records[0].facts['account.paymentHistoryCells'][0];
  check.equal(conflict.raw_code, 'XYZ', 'a complete trusted unknown source reading is retained');
  check.equal(conflict.reason, 'CONFLICTING_TRUSTED_SOURCE_READINGS', 'a different trusted physical reread cannot silently replace it');
  check.ok(conflict.original_code_readings.some((reading) => reading.raw === 'XYZ'), 'the original source reading remains measurable');
  check.ok(conflict.rejected_recovery_readings.some((reading) => reading.raw === '30'
    && reading.location.recovery.source_sha256 === codeConflict.model.sha256.toLowerCase()), 'the rejected trusted reread retains its own physical source');
  check.equal(common.runCommonErrorChecks({ extraction: codeConflict.extraction }).performed
    .find((row) => row.check_id === HISTORY)?.source_records.length || 0, 0, 'trusted disagreement cannot create a history violation');

  const monthConflict = controlledReading(t, (words) => {
    const own = words.find((word) => word.text === 'May');
    own.text = 'XYZ'; own.trusted = true; own.confidence = 90;
  });
  const month = monthConflict.extraction.records[0].facts['account.paymentHistoryCells'][0];
  check.equal(month.reason, 'CONFLICTING_TRUSTED_SOURCE_READINGS', 'a complete trusted unknown month remains a source conflict');
  check.equal(month.original_month_reading.raw, 'XYZ', 'the original unknown month is preserved');
  check.equal(month.original_month_reading.complete_glyph, undefined, 'a different OCR word rectangle is not enough to qualify a partial reading');

  const partial = controlledReading(t, (words) => {
    const own = words.find((word) => word.text === 'May');
    own.text = 'Ma'; own.x1 -= 4; own.trusted = true; own.confidence = 90;
  });
  const restored = partial.extraction.records[0].facts['account.paymentHistoryCells'][0];
  check.equal(restored.period, '2025-05', 'a physically clipped first month can recover from the complete own glyph');
  check.equal(restored.original_month_reading.complete_glyph, false, 'the original clipping has an explicit source qualification');
  check.ok(restored.original_month_reading.qualification.physical_ink_bounds.x1
    > restored.original_month_reading.location.x1 + restored.original_month_reading.qualification.allowance_pt,
  'the independently measured source ink proves the omitted glyph beyond the initial raster allowance');
  check.equal(restored.original_month_reading.qualification.source_sha256,
    crypto.createHash('sha256').update(fs.readFileSync(partial.model.path)).digest('hex'), 'partial qualification pins the same physical source');

  const literalYear = dn.read(t, [{ history: { years: [{ index: 0, text: '2010' }], months: ['May'], codes: ['OK'] } }]);
  check.equal(literalYear.extraction.records[0].facts['account.paymentHistoryCells'][0].period, '2010-05',
    'a source year remains literal rather than following chronology or report date');
  return { scope: 'source-colored own regions and complete/partial prior source controls; no new presentation admission',
    confidence_floor: ocr.TRUSTED_LINE_CONFIDENCE };
}

module.exports = { id: 'dw-us-history-completion', title: 'US physical history preserves complete source glyphs', run,
  fixtures: { pixelPdf, coloredUnknown } };
