'use strict';

// Fictional PR-01 collection blocks; exact specimen admission remains unchanged.
const ca = require('../../ca-consumer-file-facts.cjs');
const formats = require('../../formats.cjs');
const { sourceForField } = require('../../report-fact-sources.cjs');
const { extractFacts } = require('../../../../internal-validation/ca-ns-last-payment-six-year/extraction.cjs');
const fixtures = require('../../../../internal-validation/ca-ns-last-payment-six-year/tests/fixtures.cjs');
const crypto = require('node:crypto');
const assembly = require('../../multi-file-assembly.cjs');
const { makeFictionalPr01Model } = require('./dq-ca-printed-account-fields.cjs');

function lines(agency, amount, options = {}) {
  return fixtures.recordLines({ collector: agency, ...options }).map(line =>
    line.startsWith('Account Number') ? 'Account Number ***4567'
      : line.startsWith('Member Number') ? 'Member Number TEST-MEMBER-789'
        : line.startsWith('Amount') ? `Amount ${amount}`
          : line.startsWith('Balance') ? `Balance ${amount}` : line);
}

function read(records, amend) {
  const model = fixtures.specimen({ records });
  if (amend) amend(model);
  const view = ca.read(model);
  return { view, extraction: formats.normalizeExtraction(extractFacts(model, null, { synthetic_test_input: true }), view) };
}

function nativeCollectionWords(model) {
  for (const page of model.pages) page.word_boxes = page.lines.map((text, index) => ({ text,
    x0: 30, x1: 30 + Math.min(text.length * 4, 490), y0: 20 + index * 14, y1: 30 + index * 14 }));
}

function ordinary(options, amend) {
  const model = makeFictionalPr01Model(options, amend), view = ca.read(model);
  return { view, extraction: formats.normalizeExtraction(extractFacts(model, null, { synthetic_test_input: true }), view) };
}

async function run(t, check) {
  const { view, extraction } = read([
    lines('FICTIONAL COLLECTION AGENCY A', 606),
    lines('FICTIONAL COLLECTION AGENCY B', 817, { dateAssigned: '2023/12/01' })
  ]);
  check.equal(extraction.records.length, 2, 'two collection blocks remain two records');
  check.deepEqual(extraction.records.map(r => r.facts['account.balance']), [606, 817], 'unequal balances remain printed evidence');
  check.deepEqual(extraction.records.map(r => r.facts['collection.agency']),
    ['FICTIONAL COLLECTION AGENCY A', 'FICTIONAL COLLECTION AGENCY B'], 'agency headings retain their distinct roles');
  check.deepEqual(extraction.records.map(r => r.facts['account.display_name']),
    ['FICTIONAL COLLECTION AGENCY A', 'FICTIONAL COLLECTION AGENCY B'], 'display names use each collection agency, not its reporting member');
  check.deepEqual(extraction.records.map(r => r.facts['collection.assignedDate']),
    ['2024-01-01', '2023-12-01'], 'assignment dates remain distinct from fixed debt dates');
  const member = extraction.records[0].facts['account.member_reference'];
  check.match(member, /^MEMBER-[a-f0-9]{24}$/, 'member matching retains only a privacy token');
  check.equal(extraction.records[1].facts['account.member_reference'], member, 'same printed member references share the token');
  check.ok(!JSON.stringify({ view, extraction }).includes('TEST-MEMBER-789'), 'the full member reference never leaves the reader');
  for (const r of extraction.records) {
    for (const field of ['account.member_reference', 'collection.agency', 'collection.assignedDate', 'account.display_name']) {
      const source = sourceForField(r, field);
      check.ok(source && source.location.page === 16 && source.location.line, 'each collection reference has its own source');
      check.equal(r.fact_sources[field].record_index, r.record_index, 'reference source remains bound to its own record');
    }
    check.equal(r.fact_sources['account.member_reference'].privacy_redacted, true, 'member sources retain privacy metadata');
    check.equal(r.fact_sources['account.reported_identity'].source_field, 'Member Name (reporting member)', 'reporting member is not claimed as original creditor');
    check.equal(r.fact_sources['account.display_name'].source_field, 'Collection agency (entry heading)', 'display name preserves the printed agency role');
    check.equal(r.fact_sources['account.display_name'].raw_value, r.facts['account.display_name'], 'the literal business display name has its own source reading');
  }
  const missing = read([lines('FICTIONAL AGENCY', 10).filter(line => !line.startsWith('Member Number'))]);
  check.equal(missing.extraction.records[0].facts?.['account.member_reference'], undefined, 'absent member caption cannot be invented');
  const duplicated = read([lines('FICTIONAL AGENCY', 10).concat('Member Number DIFFERENT-REFERENCE')]);
  check.equal(duplicated.extraction.records[0].facts?.['account.member_reference'], undefined, 'duplicate member captions withhold the reference');
  const withoutHeading = read([lines('FICTIONAL AGENCY', 10).slice(1), lines('FICTIONAL NEIGHBOR', 20)]);
  check.equal(withoutHeading.extraction.records[0].facts['collection.agency'], undefined, 'a missing heading cannot borrow the section title');
  check.equal(withoutHeading.extraction.records[0].facts['account.display_name'], undefined, 'a missing agency heading cannot use Member Name as its display name');
  check.equal(withoutHeading.extraction.records[1].facts['collection.agency'], 'FICTIONAL NEIGHBOR', 'neighbor retains only its own agency');
  const nativeNames = read([lines('Fictional Collection Agency', 10)], nativeCollectionWords);
  check.ok(sourceForField(nativeNames.extraction.records[0], 'account.display_name')?.location.bbox,
    'a native collection heading keeps its own measured name geometry');
  for (const failure of ['untrusted', 'ambiguous']) {
    const rejected = read([lines('Fictional Collection Agency', 10)], (model) => {
      nativeCollectionWords(model);
      const page = model.pages.find(page => page.page === 16);
      const word = page.word_boxes.find(word => word.text === 'Fictional Collection Agency');
      if (failure === 'untrusted') word.trusted = false;
      else page.word_boxes.push({ ...word, y0: word.y0 + 5, y1: word.y1 + 5 });
    }).extraction.records[0];
    check.equal(rejected.facts['account.display_name'], undefined, 'a rejected own agency heading supplies no display name');
    check.equal(sourceForField(rejected, 'account.display_name'), null, 'a rejected display name has no usable source');
    check.equal(rejected.fact_sources['account.display_name'].trusted, false, 'the normalized record retains explicit display-source rejection');
    check.equal(rejected.facts['collection.agency'], undefined, 'a rejected agency heading cannot leave an older agency fallback usable');
    check.equal(rejected.fact_sources['collection.agency'].trusted, false, 'agency rejection remains explicit beside display rejection');
    check.equal(rejected.facts['account.member_reference'], member, 'display rejection leaves the private member matching key unchanged');
  }
  const ordinaryName = ordinary({ creditor: 'Fictional & Sons Bank' }), ordinaryRecord = ordinaryName.extraction.records
    .find(record => record.kind === 'CA_EQUIFAX_ORDINARY_ACCOUNT');
  check.equal(ordinaryRecord.facts['account.display_name'], 'Fictional & Sons Bank', 'ordinary display preserves the report business heading and punctuation');
  check.match(ordinaryRecord.facts['account.reported_identity'], /^CREDITOR-[a-f0-9]{24}$/, 'ordinary matching still uses a private identity token');
  check.equal(ordinaryRecord.fact_sources['account.reported_identity'].raw_value, ordinaryRecord.facts['account.reported_identity'],
    'the private matching source does not become a raw business-name source');
  const ordinarySource = sourceForField(ordinaryRecord, 'account.display_name');
  check.equal(ordinarySource?.source_field, 'Creditor Name (account heading)', 'ordinary display source keeps its own account-heading role');
  check.ok(ordinarySource?.location.bbox && ordinarySource.location.trusted && ordinarySource.location.line === 2,
    'ordinary display retains trusted own heading geometry and location');
  check.equal(ordinaryRecord.fact_sources['account.display_name'].record_index, ordinaryRecord.record_index,
    'ordinary display evidence has the normalized account index');
  for (const failure of ['missing', 'untrusted', 'ambiguous']) {
    const rejected = ordinary({ creditor: 'Fictional & Sons Bank' }, (words) => {
      const index = words.findIndex(word => word.text === 'Fictional & Sons Bank');
      if (failure === 'missing') words.splice(index, 1);
      else if (failure === 'untrusted') words[index].trusted = false;
      else words.push({ ...words[index], y0: words[index].y0 + 5, y1: words[index].y1 + 5 });
    }).extraction.records.find(record => record.kind === 'CA_EQUIFAX_ORDINARY_ACCOUNT');
    check.equal(rejected.facts['account.display_name'], undefined, 'missing, untrusted or ambiguous ordinary headings do not supply display names');
    check.equal(sourceForField(rejected, 'account.display_name'), null, 'a rejected ordinary heading cannot supply source-backed display');
    if (failure !== 'missing') check.equal(rejected.fact_sources['account.display_name'].trusted, false,
      'ordinary heading rejection is authoritative for display fallbacks');
  }
  const legacySignature = 'FICTIONAL EQUIVALENT PAGE | measured geometry';
  const digestSignature = 'PAGE-SHA256-' + crypto.createHash('sha256').update(legacySignature).digest('hex');
  const general = formats.extractWithSharedAdapter(formats.makeSyntheticModel({ pages: [[
    'Equifax Consumer Credit Report', 'Report Date: June 12, 2026', 'Account: Fictional Creditor Balance $100'
  ]] }), { mode: 'REPORT', country: 'CA' });
  const old = { file_id: 'old', stored_sha256: 'old-distinct-bytes', extraction: { ...general, page_signatures: [legacySignature] } };
  const fresh = { file_id: 'new', stored_sha256: 'new-distinct-bytes', extraction: { ...general, page_signatures: [digestSignature] } };
  const mixed = assembly.assemble([old, fresh]);
  check.equal(mixed.files_included, 2, 'equivalent pages with different bytes are both retained across reader upgrade');
  check.equal(mixed.suspected_equivalent_files.length, 1, 'historical text and new private signature remain comparable');
  check.equal(mixed.duplicate_files_skipped, 0, 'a suspected equivalent page is not silently discarded');
  check.equal(old.extraction.page_signatures[0], legacySignature, 'compatibility does not rewrite historical extraction');
  fresh.extraction.page_signatures = ['PAGE-SHA256-' + crypto.createHash('sha256').update('different measured page').digest('hex')];
  check.equal(assembly.assemble([old, fresh]).suspected_equivalent_files.length, 0, 'distinct pages do not gain equivalent-page flags');
  const duplicateChecks = require('../../common-errors.cjs');
  // Assembly source-contract fixture; this does not admit the synthetic file through the upload reader.
  const acceptedExtraction = { ...extraction, admission: { admitted: true },
    support: formats.SUPPORT.ACTUAL_REPORT_EVIDENCE, extraction_ran: true, bureau: 'Equifax' };
  const collectionFile = { file_id: 'collection-file', stored_sha256: 'collection-distinct-bytes', extraction: acceptedExtraction };
  const originalSources = JSON.stringify(extraction.records.map(record => record.fact_sources));
  const laterFile = assembly.assemble([old, collectionFile]);
  check.ok(duplicateChecks.duplicateReporting(laterFile.extraction.records), 'a collection pair remains detected after an earlier file changes its global indices');
  for (const record of laterFile.extraction.records.filter(record => record.kind === 'COLLECTION_ACCOUNT')) {
    check.equal(record.fact_sources['account.member_reference'].record_index, record.record_index, 'own member evidence follows the global account index');
    check.equal(record.fact_sources['account.member_reference'].location.file_id, 'collection-file', 'member evidence keeps its own physical file');
    check.equal(record.fact_sources['account.display_name'].record_index, record.record_index, 'display evidence follows its global collection index');
    check.equal(record.fact_sources['account.display_name'].location.file_id, 'collection-file', 'display name stays with its own physical collection report');
  }
  const businessFile = { file_id: 'ordinary-file', stored_sha256: 'ordinary-distinct-bytes',
    extraction: { ...acceptedExtraction, records: [ordinaryRecord] } };
  const businessMerged = assembly.assemble([old, collectionFile, businessFile]);
  const mergedOrdinary = businessMerged.extraction.records.find(record => record.kind === 'CA_EQUIFAX_ORDINARY_ACCOUNT');
  check.equal(mergedOrdinary.facts['account.display_name'], 'Fictional & Sons Bank', 'multi-file assembly keeps the ordinary business display separate from collections');
  check.equal(mergedOrdinary.fact_sources['account.display_name'].location.file_id, 'ordinary-file', 'ordinary display preserves its own report file');
  check.equal(mergedOrdinary.fact_sources['account.display_name'].record_index, mergedOrdinary.record_index, 'ordinary display evidence is rebound to its own global index');
  check.equal(JSON.stringify(extraction.records.map(record => record.fact_sources)), originalSources, 'assembly leaves original per-file evidence unchanged');
  const separateFiles = extraction.records.map((record, index) => ({ file_id: 'separate-' + index,
    stored_sha256: 'separate-bytes-' + index, extraction: { ...acceptedExtraction, records: [record] } }));
  check.equal(duplicateChecks.duplicateReporting(assembly.assemble(separateFiles).extraction.records), null, 'matching collections from separate files cannot become a within-report duplicate');
  const conflicting = JSON.parse(JSON.stringify(collectionFile));
  conflicting.extraction.records[0].fact_sources['account.masked_identifier'].record_index += 1;
  const conflictingMerged = assembly.assemble([old, conflicting]);
  check.equal(duplicateChecks.duplicateReporting(conflictingMerged.extraction.records), null, 'a contrary source binding cannot become valid by colliding with a new global index');
  check.equal(conflictingMerged.extraction.records.find(record => record.kind === 'COLLECTION_ACCOUNT').fact_sources['account.masked_identifier'].trusted,
    false, 'the conflicting original binding stays rejected');
  return { inputs: 'fictional collection blocks only', outcome: 'source-bound member tokens, separate agency headings and assignment dates',
    boundaries: 'no raw member numbers, no original-creditor inference, no changed admission contract' };
}

module.exports = { id: 'ek-pr01-collection-references', title: 'PR-01 collection member references and separate agency evidence', run };
