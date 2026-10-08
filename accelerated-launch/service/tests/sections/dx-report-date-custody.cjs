'use strict';

// Existing family layouts and accepted public samples; no new family or inferred dates.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const formats = require('../../formats.cjs');
const gb = require('../../format-families/gb-experian-consumer.cjs');
const au = require('../../format-families/au-equifax-consumer.cjs');
const common = require('../../common-errors.cjs');
const issues = require('../../issues.cjs');
const assembly = require('../../multi-file-assembly.cjs');
const { sourceForField, reportReference } = require('../../report-fact-sources.cjs');
const gbPdf = require('./do-gb-history-definitions.cjs').nativePdf;
const auPdf = require('./dv-au-reference-delivery.cjs').nativePdf;
const SPECIMENS = {
  GB: { file: 'C:/CRP-NEW/SOURCE_CAPTURES/REPORT_FORMAT_BASELINE_2026-09-30/PUB-009.pdf',
    hash: '5e95f3d27c4102c7772b33d0e11f3f4e0f37d253b2147e635db54e9bd328aec4', year: '2007' },
  AU: { file: 'C:/CRP-NEW/SOURCE_CAPTURES/REPORT_FORMAT_BASELINE_2026-09-30/PUB-012.pdf',
    hash: '3f6d5b3787cd15ecc8bc4a1a231d16b27968b195fe49d9ee667e25ec6648b00a', year: '2016' }
};
let sequence = 0;

function read(t, country, amend, options = {}) {
  const extra = options.reference === undefined ? [] : country === 'GB'
    ? [`Date of report: ${options.reference}`] : [['Report Date:', options.reference]];
  const bytes = country === 'GB' ? gbPdf([{ extra }]) : auPdf([{ extra }]);
  const file = path.join(t.dataDir, `dx-${country}-${++sequence}.pdf`);
  fs.mkdirSync(t.dataDir, { recursive: true }); fs.writeFileSync(file, bytes);
  const model = formats.buildPdfDocumentModel(file); if (amend) amend(model);
  return { bytes, model, extraction: formats.extractWithSharedAdapter(model, { mode: 'REPORT', country }) };
}
function referenceWords(model, year = '2026') {
  const page = model.pages[0], word = page.word_boxes.find((w) => w.text === year);
  if (!word) throw new Error('DX_OWN_COVER_YEAR_NOT_FOUND');
  return { page, year: word, row: page.word_boxes.filter((w) => Math.abs(w.y0 - word.y0) <= 2) };
}
function offered(country, extraction) {
  const evaluation = { country, region: country === 'GB' ? 'GB-ENG' : 'AU-NSW', results: [],
    common_errors: common.runCommonErrorChecks({ extraction }) };
  return issues.issuesFor({ extraction, evaluation }).filter((i) => i.eligible);
}
function ownIssueKeys(country, extraction) {
  return offered(country, extraction).map((i) => `${i.record_index}:${i.check_id}`).sort();
}
function ownReferenceSource(reference) {
  return sourceForField({ record_index: 1, report_reference_date: reference }, 'report.referenceDate');
}
function history(extraction) {
  return extraction.records.flatMap((r) => r.facts?.['account.paymentHistoryCells'] || []);
}

async function run(t, check) {
  const observed = {};
  for (const country of ['GB', 'AU']) {
    const positive = read(t, country), ref = positive.extraction.reference_date;
    check.equal(positive.extraction.family_id, country === 'GB' ? gb.FAMILY_ID : au.FAMILY_ID,
      `${country}: the production route uses its existing admitted family`);
    check.equal(ref.status, 'RESOLVED', `${country}: own readable cover date resolves`);
    check.equal(ref.trusted, true, `${country}: explicit source trust is retained`);
    check.ok([ref.location?.x0, ref.location?.y0, ref.location?.x1, ref.location?.y1].every(Number.isFinite),
      `${country}: own caption and value have native physical bounds`);
    check.equal(ref.location?.page, 1, `${country}: own cover page is retained`);
    check.equal(ref.location?.trusted, true, `${country}: physical source explicitly carries trust`);
    check.equal(ownReferenceSource(ref)?.raw_value, ref.raw_value, `${country}: the existing shared source bridge accepts that own raw date`);
    const issueKeys = ownIssueKeys(country, positive.extraction);
    check.ok(issueKeys.length, `${country}: a separately supported account issue is available`);

    for (const [name, amend] of [
      ['untrusted year', (m) => { referenceWords(m).year.trusted = false; }],
      ['untrusted caption', (m) => { referenceWords(m).row[0].trusted = false; }],
      ['missing year geometry', (m) => { const own = referenceWords(m); own.page.word_boxes = own.page.word_boxes.filter((w) => w !== own.year); }],
      ['missing caption geometry', (m) => { const own = referenceWords(m); own.page.word_boxes = own.page.word_boxes.filter((w) => w !== own.row[0]); }],
      ['no cover geometry', (m) => { m.pages[0].word_boxes = []; }],
      ['ambiguous physical duplicate', (m) => {
        const own = referenceWords(m);
        own.page.word_boxes.push(...own.row.map((w) => ({ ...w, y0: w.y0 + 500, y1: w.y1 + 500 })));
      }]
    ]) {
      const rejected = read(t, country, amend), bad = rejected.extraction.reference_date;
      check.equal(bad.status, 'EXTRACTION_UNRESOLVED', `${country}: ${name} cannot resolve the cover date`);
      check.equal(bad.reason, 'REPORT_DATE_SOURCE_NOT_READABLE', `${country}: ${name} retains the concrete source reason`);
      check.equal(bad.raw_value, ref.raw_value, `${country}: ${name} preserves the actual raw reading`);
      check.equal(bad.normalized_value, null, `${country}: ${name} leaves no usable global date`);
      check.equal(bad.trusted, false, `${country}: ${name} explicitly rejects trust`);
      check.equal(reportReference({ report_reference_date: bad }), null, `${country}: the existing shared reference guard rejects ${name}`);
      check.equal(ownReferenceSource(bad), null, `${country}: no shared source is manufactured from ${name}`);
      check.equal(assembly.dateIdentity({ extraction: rejected.extraction }), 'DATE_UNRESOLVED',
        `${country}: ${name} cannot group a file under a resolved chronological date`);
      check.deepEqual(ownIssueKeys(country, rejected.extraction), issueKeys,
        `${country}: ${name} preserves independently sourced account issues`);
      if (country === 'GB') check.deepEqual(history(rejected.extraction).map((c) => c.period),
        history(positive.extraction).map((c) => c.period), 'GB: an unreadable report date never destroys the separate own update periods');
    }

    const decoration = read(t, country, (m) => {
      const own = referenceWords(m), other = m.pages.flatMap((p) => p.word_boxes)
        .find((w) => !own.row.includes(w));
      if (!other) throw new Error('DX_INDEPENDENT_WORD_NOT_FOUND'); other.trusted = false;
    });
    check.equal(decoration.extraction.reference_date.normalized_value, ref.normalized_value,
      `${country}: an unrelated untrusted word cannot reject the own cover date`);

    const equalDate = country === 'GB' ? '1 June 2026' : '4 January 2026';
    const repeated = read(t, country, null, { reference: equalDate }).extraction.reference_date;
    check.equal(repeated.status, 'RESOLVED', `${country}: separately printed equal reference dates agree`);
    check.equal(repeated.occurrences.length, 2, `${country}: both printed equal dates retain physical occurrence evidence`);
    check.ok(repeated.occurrences.every((o) => o.trusted && Number.isFinite(o.x0)),
      `${country}: repeated captions resolve only with every own physical source`);
    const conflict = read(t, country, null, { reference: country === 'GB' ? '1 June 2025' : '4 January 2025' }).extraction.reference_date;
    check.equal(conflict.status, 'EXTRACTION_UNRESOLVED', `${country}: contradictory reference dates remain unresolved`);
    check.equal(conflict.reason, 'REPORT_DATE_CONTRADICTORY', `${country}: no source is selected from conflicting dates`);
    check.equal(conflict.normalized_value, null, `${country}: conflicting dates cannot leave a global scalar`);
    check.deepEqual(conflict.occurrences.map((o) => o.raw_value).sort(),
      [equalDate, country === 'GB' ? '1 June 2025' : '4 January 2025'].sort(), `${country}: conflicting raw sources remain recoverable`);

    for (const [name, raw] of [['blank', ''], ['impossible calendar day', country === 'GB' ? '32 June 2026' : '32 January 2026'],
      ['damaged year', country === 'GB' ? '1 June 20?6' : '4 January 20?6']]) {
      const damaged = read(t, country, (m) => {
        const own = referenceWords(m), caption = country === 'GB' ? 'Date of report:' : 'Report Date:';
        own.page.lines = own.page.lines.map((line) => line.includes(caption) ? `${caption}${raw ? ` ${raw}` : ''}` : line);
        own.page.text = own.page.lines.join('\n');
        const valueWords = own.row.slice(-3);
        if (!raw) own.page.word_boxes = own.page.word_boxes.filter((w) => !valueWords.includes(w));
        else raw.split(' ').forEach((text, index) => { valueWords[index].text = text; });
      });
      const reading = damaged.extraction.reference_date;
      check.equal(reading.status, 'EXTRACTION_UNRESOLVED', `${country}: a ${name} remains unresolved`);
      check.equal(reading.normalized_value, null, `${country}: a ${name} cannot supply a global date`);
      check.equal(reading.occurrences[0].raw_value, raw, `${country}: a ${name} retains its literal source occurrence`);
      check.equal(ownReferenceSource(reading), null, `${country}: a ${name} cannot pass the existing shared source guard`);
    }

    const noCaption = read(t, country, (m) => {
      const own = referenceWords(m), page = own.page;
      page.lines = page.lines.filter((line) => !line.includes(country === 'GB' ? 'Date of report:' : 'Report Date:'));
      page.text = page.lines.join('\n'); page.word_boxes = page.word_boxes.filter((w) => !own.row.includes(w));
    });
    const missingReference = (country === 'GB' ? gb : au).locateReferenceDate(noCaption.model);
    check.equal(missingReference.reason, 'REPORT_DATE_LABEL_NOT_FOUND',
      `${country}: account opening, closure and update dates cannot replace an absent report-date caption`);
    check.equal(missingReference.normalized_value, null, `${country}: neighbor dates never become a cover date`);

    for (const specimen of [SPECIMENS[country]]) {
      if (!fs.existsSync(specimen.file)) {
        check.skip(`${country}: accepted public specimen`, 'pinned local public source unavailable'); continue;
      }
      check.equal(crypto.createHash('sha256').update(fs.readFileSync(specimen.file)).digest('hex'), specimen.hash,
        `${country}: the accepted public bytes are pinned`);
      const model = formats.buildPdfDocumentModel(specimen.file);
      const actual = formats.extractWithSharedAdapter(model, { mode: 'REPORT', country });
      check.equal(actual.reference_date.status, 'RESOLVED', `${country}: the actual accepted public cover remains readable`);
      check.ok(actual.reference_date.location.trusted && Number.isFinite(actual.reference_date.location.x0),
        `${country}: actual accepted source geometry is carried forward`);
      if (country === 'GB') {
        check.equal(history(actual).length, 32, 'GB: all 32 actual printed history characters remain');
        check.equal(history(actual).filter((c) => c.period).length, 18, 'GB: all 18 own ongoing months remain');
        check.equal(history(actual).filter((c) => !c.period).length, 14, 'GB: 14 settled/default periods remain unresolved');
        observed.GB = { characters: history(actual).length, ongoing_months: history(actual).filter((c) => c.period).length,
          unresolved_settled_default_periods: history(actual).filter((c) => !c.period).length };
      } else {
        check.equal(history(actual).length, 72, 'AU: all 72 own graphical history cells remain');
        check.equal(actual.records.filter((r) => r.kind === 'CONSUMER_CREDIT_LIABILITY').length, 3,
          'AU: the three accepted liability records remain distinct');
        observed.AU = { liabilities: actual.records.filter((r) => r.kind === 'CONSUMER_CREDIT_LIABILITY').length,
          dated_graphical_history_cells: history(actual).length };
      }
      const untrusted = structuredClone(model); referenceWords(untrusted, specimen.year).year.trusted = false;
      const rejected = formats.extractWithSharedAdapter(untrusted, { mode: 'REPORT', country });
      check.equal(rejected.reference_date.raw_value, actual.reference_date.raw_value,
        `${country}: actual untrusted year retains its literal printed value`);
      check.equal(rejected.reference_date.normalized_value, null,
        `${country}: the demonstrated actual-file trust bypass is repaired`);
      check.deepEqual(history(rejected).map((c) => [c.period, c.code]), history(actual).map((c) => [c.period, c.code]),
        `${country}: actual independently owned history is unchanged`);
    }
  }

  const good = read(t, 'AU'), record = good.extraction.records[0];
  check.ok(sourceForField(record, 'liability.openedDate'), 'AU: actual fictional own opened date has a usable source');
  for (const [name, amend] of [
    ['unmatched year', (m) => { const page = m.pages[2]; page.word_boxes = page.word_boxes.filter((w) => w.text !== '2015'); }],
    ['no account geometry', (m) => { m.pages[2].word_boxes = []; }],
    ['ambiguous physical duplicate', (m) => {
      const page = m.pages[2], year = page.word_boxes.find((w) => w.text === '2015');
      const row = page.word_boxes.filter((w) => Math.abs(w.y0 - year.y0) <= 2);
      page.word_boxes.push(...row.map((w) => ({ ...w, y0: w.y0 + 400, y1: w.y1 + 400 })));
    }]
  ]) {
    const rejected = read(t, 'AU', amend), own = rejected.extraction.records[0];
    check.equal(sourceForField(own, 'liability.openedDate'), null, `AU: ${name} cannot supply an opening anchor`);
    check.equal(own.printed['Opened Date'].raw, '11 Apr 2015', `AU: ${name} keeps the literal own date reading`);
    check.equal(own.printed['Opened Date'].trusted, false, `AU: ${name} records the rejected physical row`);
    check.equal(offered('AU', rejected.extraction).some((i) => i.check_id === 'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY'),
      false, `AU: ${name} cannot create a chronology violation`);
    if (name !== 'no account geometry') check.ok(sourceForField(own, 'liability.closedDate'),
      `AU: ${name} leaves the independent own closure date readable`);
  }
  return { scope: 'GB/AU own native report-date custody and AU exact physical row association',
    actual_GB: observed.GB || { source_not_available_on_this_host: true },
    actual_AU: observed.AU || { source_not_available_on_this_host: true },
    shared_delivery_and_approval: 'separate DY integration controls' };
}

module.exports = { run, id: 'dx-report-date-custody', title: 'GB/AU own physical report dates and AU unmatched row rejection' };
