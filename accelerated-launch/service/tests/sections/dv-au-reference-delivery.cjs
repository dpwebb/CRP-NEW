'use strict';

/* Accepted PUB-012 captions shape these fictional native PDFs. The printed
 * Account Number is optional evidence locating the selected entry, never a
 * masked identity, a continuing-account key or a new reason to offer an issue. */
const fs = require('node:fs');
const path = require('node:path');
const formats = require('../../formats.cjs');
const family = require('../../format-families/au-equifax-consumer.cjs');
const evaluation = require('../../evaluation.cjs');
const issues = require('../../issues.cjs');
const common = require('../../common-errors.cjs');
const { sourceForField } = require('../../report-fact-sources.cjs');
const { buildWordPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');
const { PDFDocument } = require('../../pdf-vendor/pdf-lib-1.17.1.min.js');

async function downloadedLetter(bytes) {
  const document = await PDFDocument.load(bytes);
  return document.getForm().getFields().filter(field => /^CRP_letter_page_\d+$/.test(field.getName()))
    .map(field => field.getText()).join('\n');
}

const LIABILITY = 'CONSUMER_CREDIT_LIABILITY', OVERDUE = 'OVERDUE_ACCOUNT';
const REFERENCE = { [LIABILITY]: 'liability.accountReference', [OVERDUE]: 'overdue.accountReference' };
const CLOCK = { assessment_date: '2026-10-07', assessed_at: '2026-10-07T12:00:00Z' };
let sequence = 0;

function nativePdf(liabilities = [{}], overdue = [{}]) {
  const pages = [{ words: [{ text: 'Report Date: 4 January 2026', x: 36, y: 50 }] }, { words: [] }];
  const put = (page, text, y, x = 36) => page.words.push({ text, x, y });
  ['Personal Information', 'Credit Overview', 'Summary', 'Consumer Credit Information', 'Publically Available Consumer Information']
    .forEach((heading, index) => put(pages[1], heading, 60 + index * 25));
  const add = (heading, rows) => {
    const page = { words: [] }; pages.push(page);
    put(page, 'Consumer Credit Information', 30); put(page, heading, 55);
    rows.forEach(([label, value], index) => {
      if (value === undefined) return;
      const y = 90 + index * 18;
      put(page, label, y); if (value != null && value !== '') put(page, value, y, 240);
    });
  };
  liabilities.forEach((changes, index) => {
    const a = { provider: 'Fictional Cedar Bank', reference: `LIAB-REF-${index + 1}`,
      opened: '11 Apr 2015', closed: '10 Apr 2014', ...changes };
    add('Consumer Credit Liability Information', [
      ['Credit Provider', a.provider], ['Type Of Account', 'Credit Card'], ['Credit Limit', '$10,000'],
      ['Account Number', a.reference], ['Opened Date', a.opened], ['Closed Date', a.closed], ...(a.extra || [])
    ]);
  });
  overdue.forEach((changes, index) => {
    const a = { provider: 'Fictional Oak Bank', reference: `OVER-REF-${index + 1}`, date: '20 Jul 2015', ...changes };
    add('Overdue Accounts', [
      ['Status', 'Outstanding'], ['Current Listing', ''], ['Credit Provider', a.provider], ['Date', a.date],
      ['Amount', '$300'], ['Reason to Report', 'Payment Default'], ['Account Number', a.reference],
      ['Account Type', 'Credit Card'], ...(a.extra || []), ['Original Listing', ''],
      ['Original Credit Provider', a.provider], ['Date', a.date], ['Amount', '$300'], ...(a.originalExtra || [])
    ]);
  });
  pages.slice(1).forEach((page, index) => put(page,
    `${family.PUBLISHER_NAME} Page ${index + 2} of ${pages.length} ${family.PUBLISHER_ABN}`, 800, 24));
  return buildWordPdf(pages);
}

function read(t, liabilities, overdue, amend) {
  const bytes = nativePdf(liabilities, overdue), file = path.join(t.dataDir, `dv-au-reference-${++sequence}.pdf`);
  fs.mkdirSync(t.dataDir, { recursive: true }); fs.writeFileSync(file, bytes);
  const model = formats.buildPdfDocumentModel(file); if (amend) amend(model);
  return { bytes, extraction: formats.extractWithSharedAdapter(model, { mode: 'REPORT', country: 'AU' }) };
}

function offered(extraction) {
  const assessed = evaluation.evaluateCase({ country: 'AU', region: 'AU-NSW', extraction, assessment_clock: CLOCK });
  return { findings: issues.issuesFor({ extraction, evaluation: assessed }),
    public: issues.publicIssues({ extraction, evaluation: assessed }) };
}

function ownRecord(extraction, kind, ordinal = 0) { return extraction.records.filter((r) => r.kind === kind)[ordinal]; }
function ownIssue(findings, record) {
  return findings.find((i) => i.eligible && i.record_index === record.record_index
    && (record.kind !== LIABILITY || i.check_id === 'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY'));
}
function referenceFacts(issue) { return (issue?.source_facts || []).filter((f) => Object.values(REFERENCE).includes(f.field)); }
function publicReferences(issue) { return (issue?.source_facts || []).filter((f) => /Account Number$/.test(f.source_field || '')); }
function eligibility(findings) { return findings.filter((i) => i.eligible).map((i) => `${i.record_index}:${i.check_id}:${i.classification}`).sort(); }

async function run(t, check) {
  const positive = read(t), found = offered(positive.extraction);
  check.equal(positive.extraction.admission.admitted, true, 'the fictional native report uses the unchanged AU family admission');
  for (const kind of [LIABILITY, OVERDUE]) {
    const record = ownRecord(positive.extraction, kind), field = REFERENCE[kind], source = sourceForField(record, field);
    const issue = ownIssue(found.findings, record), reference = referenceFacts(issue)[0];
    check.ok(issue, `${kind} retains its independently supported selectable issue`);
    check.equal(referenceFacts(issue).length, 1, 'the selected entry has exactly one own account reference');
    check.equal(reference?.raw_value, record.facts[field], 'the reference preserves the literal own printed value');
    check.equal(reference?.source_field, kind === LIABILITY ? 'Account Number' : 'CURRENT Listing > Account Number',
      'the evidence preserves the exact caption and listing scope');
    check.deepEqual(reference?.location, source?.location, 'the evidence preserves the complete native page and geometry');
    check.ok(Number.isFinite(reference?.location?.x0) && Number.isFinite(reference?.location?.y0), 'the reference has physical source coordinates');
    check.equal(reference?.supporting_evidence, true, 'the reference supports the entry locator without becoming a decisive fact');
    check.equal(record.facts['account.masked_identifier'], undefined, 'the printed reference never becomes a masked identity');
    const publicIssue = found.public.find((row) => row.issue_id === issue?.issue_id);
    check.equal(publicIssue?.consumer_label, 'VIOLATION', 'the independently supported breach retains VIOLATION wording');
    check.deepEqual(publicReferences(publicIssue).map((f) => f.raw_value), [record.facts[field]], 'public packet review includes only the own reference');
  }
  check.equal(common.formatCapability(positive.extraction).checks['COMMON-ERROR-DUPLICATE-REPORTING'].supported, false,
    'locator delivery does not advertise account matching capability');

  for (const kind of [LIABILITY, OVERDUE]) {
    const redacted = JSON.parse(JSON.stringify(positive.extraction)), record = ownRecord(redacted, kind), field = REFERENCE[kind];
    record.fact_sources[field].privacy_redacted = true;
    const privateFound = offered(redacted);
    for (const issue of privateFound.findings.filter((i) => i.eligible && i.record_index === record.record_index)) {
      check.equal(referenceFacts(issue)[0]?.privacy_redacted, true, 'supporting reference evidence preserves the source privacy flag');
      const publicIssue = privateFound.public.find((i) => i.issue_id === issue.issue_id);
      check.equal(JSON.stringify(publicIssue).includes(record.facts[field]), false, 'every public issue basis hides a privacy-redacted reference');
      check.equal(publicReferences(publicIssue)[0]?.privacy_redacted, true, 'public evidence retains the redaction flag for downstream rendering');
    }
  }

  for (const kind of [LIABILITY, OVERDUE]) {
    for (const [name, changes, amend] of [
      ['absent', { reference: undefined }], ['blank', { reference: '' }],
      ['duplicate', { extra: [['Account Number', 'OTHER-REF']] }],
      ['untrusted', {}, (model) => {
        model.pages.flatMap((p) => p.word_boxes).filter((word) => word.text === (kind === LIABILITY ? 'LIAB-REF-1' : 'OVER-REF-1'))
          .forEach((word) => { word.trusted = false; });
      }]
    ]) {
      const input = read(t, [kind === LIABILITY ? changes : {}], [kind === OVERDUE ? changes : {}], amend);
      const record = ownRecord(input.extraction, kind), offeredInput = offered(input.extraction), issue = ownIssue(offeredInput.findings, record);
      check.equal(sourceForField(record, REFERENCE[kind]), null, `${kind}: ${name} contributes no trusted reference`);
      check.ok(issue, `${kind}: ${name} leaves the independent issue selectable`);
      check.equal(referenceFacts(issue).length, 0, `${kind}: ${name} contributes no unsupported issue evidence`);
      check.equal(publicReferences(offeredInput.public.find((row) => row.issue_id === issue?.issue_id)).length, 0,
        `${kind}: ${name} contributes no public reference or unresolved-value qualification`);
      check.deepEqual(eligibility(offeredInput.findings), eligibility(found.findings), `${kind}: ${name} cannot change issue eligibility`);
    }
  }

  const neighbors = read(t, [{ reference: undefined }, { reference: 'OWN-LIABILITY-NEIGHBOR' }],
    [{ reference: undefined }, { reference: 'OWN-OVERDUE-NEIGHBOR' }]);
  const neighborFindings = offered(neighbors.extraction).findings;
  for (const kind of [LIABILITY, OVERDUE]) {
    const first = ownRecord(neighbors.extraction, kind), next = ownRecord(neighbors.extraction, kind, 1);
    check.equal(referenceFacts(ownIssue(neighborFindings, first)).length, 0, 'an issue cannot borrow a neighboring entry reference');
    check.deepEqual(referenceFacts(ownIssue(neighborFindings, next)).map((f) => f.raw_value), [next.facts[REFERENCE[kind]]],
      'the neighboring entry carries its own reference only');
  }
  const originalOnly = read(t, [], [{ reference: undefined, originalExtra: [['Account Number', 'ORIGINAL-ONLY-REF']] }]);
  check.equal(referenceFacts(ownIssue(offered(originalOnly.extraction).findings, ownRecord(originalOnly.extraction, OVERDUE))).length, 0,
    'the current overdue locator cannot borrow an original-listing caption');

  const benign = read(t, [{ opened: '11 Apr 2013', closed: '' }], [{ date: '20 Jul 2025' }]);
  const benignWithoutRefs = read(t, [{ opened: '11 Apr 2013', closed: '', reference: undefined }], [{ date: '20 Jul 2025', reference: undefined }]);
  check.deepEqual(eligibility(offered(benign.extraction).findings), eligibility(offered(benignWithoutRefs.extraction).findings),
    'references alone create no additional selectable issues');
  check.equal(offered(benign.extraction).findings.filter((i) => i.eligible).length, 0, 'a benign report with references offers no violation');
  const repeatedRefs = read(t, [{ reference: 'SHARED-REF' }, { reference: 'SHARED-REF' }], []);
  check.equal(offered(repeatedRefs.extraction).findings.some((i) => /DUPLICATE|RESPONSIBILITY|RE-AGING/.test(i.check_id)), false,
    'repeated printed references cannot enable duplicate, responsibility or re-aging issues');

  const actor = await t.unpaidAccount('dv-au-reference-owner@example.test'); await t.pay(actor, 'monthly');
  const opened = await t.request('POST', '/api/cases', { token: actor.token, body: { country: 'AU', region: 'AU-NSW' } });
  const caseId = opened.json.case.case_id;
  check.equal((await t.request('POST', `/api/cases/${caseId}/files`, { token: actor.token, body: {
    originalFilename: 'fictional-au-references.pdf', declaredBytes: positive.bytes.length, mimeType: 'application/pdf',
    contentBase64: positive.bytes.toString('base64') } })).status, 201, 'the fictional native report enters the real upload route');
  check.equal((await t.request('POST', `/api/cases/${caseId}/evaluate`, { token: actor.token })).status, 201, 'the uploaded report reaches the existing assessment');
  const view = (await t.request('GET', `/api/cases/${caseId}/packet`, { token: actor.token })).json.view;
  const selected = [LIABILITY, OVERDUE].map((kind) => {
    const record = ownRecord(positive.extraction, kind), localIssue = ownIssue(found.findings, record);
    return view.eligible_issues.find((i) => i.issue_id === localIssue?.issue_id);
  });
  check.ok(selected.every(Boolean), 'both independent issues expose their own reference in packet review');
  if (!selected.every(Boolean)) return { packet_journey: 'FAILED_SELECTABLE_ISSUES' };
  check.equal((await t.request('POST', `/api/cases/${caseId}/packet/select`, { token: actor.token,
    body: { issue_ids: selected.map((i) => i.issue_id) } })).status, 200, 'the consumer selects both existing issues');
  check.equal((await t.request('POST', `/api/cases/${caseId}/packet/correspondence`, { token: actor.token,
    body: { correspondence: { consumer_name: 'Fictional Dana Reader', contact: 'dana@example.test' } } })).status, 200,
    'the consumer supplies correspondence');
  await t.preparePostalPacket(actor, caseId);
  check.equal((await t.request('POST', `/api/cases/${caseId}/packet/approve`, { token: actor.token })).status, 200, 'the consumer approves the reference evidence');
  const downloaded = await t.request('GET', `/api/cases/${caseId}/packet-download`, { token: actor.token });
  check.equal(downloaded.status, 200, 'the selected and approved packet downloads');
  const composed = require('../../packets.cjs').packetPrint(t.service.store, actor, caseId);
  check.deepEqual(composed.sections.filter(section => section.kind === 'report').map(section => section.source_pages), [[3, 4]],
    'the single PDF contains the two exact own evidence pages, excluding the unrelated cover and summary');
  check.ok(composed.body.equals(downloaded.bytes), 'approved print and download contain identical complete PDF bytes');
  check.ok(downloaded.text.includes('LIAB-REF-1') && downloaded.text.includes('OVER-REF-1'), 'the downloaded packet contains both own printed references');
  const packetWords = downloaded.text.replace(/\s+/g, ' ');
  check.ok(packetWords.includes('Account Number') && packetWords.includes('Current Listing')
    && packetWords.includes('report page 3') && packetWords.includes('report page 4'),
  'the packet includes the original printed captions and plain references to both own pages');
  check.equal(/liability\.accountReference|overdue\.accountReference|masked_identifier|continuing-account/.test(downloaded.text), false,
    'consumer wording contains no internal reference fields or identity claims');

  for (const kind of [LIABILITY, OVERDUE]) {
    for (const [name, mutate] of [
      ['reference value', (record, field) => { record.facts[field] = 'CHANGED-REF'; record.fact_sources[field].raw_value = 'CHANGED-REF'; record.fact_sources[field].normalized_value = 'CHANGED-REF'; }],
      ['reference geometry', (record, field) => { record.fact_sources[field].location.x0 += 1; }],
      ['reference rejection', (record, field) => { record.fact_sources[field].trusted = false; }],
      ['reference privacy', (record, field) => { record.fact_sources[field].privacy_redacted = true; }]
    ]) {
      const row = t.service.store.state().results.find((r) => r.case_id === caseId), record = ownRecord(row.extraction, kind);
      const saved = JSON.parse(JSON.stringify(record));
      t.service.store.update((state) => { mutate(ownRecord(state.results.find((r) => r.case_id === caseId).extraction, kind), REFERENCE[kind]); });
      const changed = (await t.request('GET', `/api/cases/${caseId}/packet`, { token: actor.token })).json.view;
      check.equal(changed.packet.approval_stale, true, `${kind}: ${name} changes the reviewed evidence`);
      const stale = await t.request('GET', `/api/cases/${caseId}/packet-download`, { token: actor.token });
      check.equal(stale.status, 409, 'changed supporting reference requires fresh approval');
      check.equal(stale.json.error.code, 'PACKET_APPROVAL_STALE', 'the existing approval boundary binds the reference');
      t.service.store.update((state) => {
        const records = state.results.find((r) => r.case_id === caseId).extraction.records;
        records[records.findIndex((r) => r.record_index === saved.record_index)] = saved;
      });
      check.equal((await t.request('GET', `/api/cases/${caseId}/packet-download`, { token: actor.token })).status, 200,
        'restoring the exact reference evidence restores the approved version');
    }
  }
  const savedRecords = JSON.parse(JSON.stringify(t.service.store.state().results.find((r) => r.case_id === caseId).extraction.records));
  t.service.store.update((state) => {
    state.results.find((r) => r.case_id === caseId).extraction.records.forEach((record) => {
      if (REFERENCE[record.kind]) record.fact_sources[REFERENCE[record.kind]].privacy_redacted = true;
    });
  });
  check.equal((await t.request('POST', `/api/cases/${caseId}/packet/approve`, { token: actor.token })).status, 200,
    'the consumer can approve the newly redacted reference evidence');
  const redactedDownload = await t.request('GET', `/api/cases/${caseId}/packet-download`, { token: actor.token });
  check.equal(redactedDownload.status, 200, 'the approved redacted packet downloads');
  check.equal(/LIAB-REF-1|OVER-REF-1/.test(await downloadedLetter(redactedDownload.bytes)), false,
    'the editable human letter excludes optional references marked private');
  check.ok(redactedDownload.text.includes('LIAB-REF-1') && redactedDownload.text.includes('OVER-REF-1'),
    'the consumer-approved original report copies preserve their printed references unchanged');
  t.service.store.update((state) => { state.results.find((r) => r.case_id === caseId).extraction.records = savedRecords; });
  return { source: 'fictional native AU PDF using accepted PUB-012 captions',
    packet_journey: 'upload -> independent VIOLATION -> own optional reference -> selection -> approval -> download',
    boundary: 'printed reference never enables identity matching or re-aging' };
}

module.exports = { run, nativePdf, id: 'dv-au-reference-delivery', title: 'AU own printed account references in selected and approved packets' };
