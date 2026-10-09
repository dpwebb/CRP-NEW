'use strict';

/* PUB-012 supplies the admitted captions. Fictional positioned PDFs exercise
 * their own listing/source boundaries and the existing selected packet path;
 * they are behavioral controls, not additional presentation evidence. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const formats = require('../../formats.cjs');
const family = require('../../format-families/au-equifax-consumer.cjs');
const evaluation = require('../../evaluation.cjs');
const issues = require('../../issues.cjs');
const commonErrors = require('../../common-errors.cjs');
const packets = require('../../packets.cjs');
const { sourceForField } = require('../../report-fact-sources.cjs');
const { buildWordPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const ROLE = 'overdue.associationCode', CO_BORROWER = 'overdue.coBorrower';
const ROLE_FIELDS = [ROLE, CO_BORROWER];
const PRINCIPAL = "Principal's Account";
const CLOCK = { assessment_date: '2026-10-07', assessed_at: '2026-10-07T12:00:00Z' };
let sequence = 0;

function nativePdf(accounts = [{}], reportDate = '4 January 2026') {
  const pages = [{ words: [{ text: `Report Date: ${reportDate}`, x: 36, y: 50 }] }, { words: [] }, { words: [] }];
  const put = (page, text, y, x = 36) => page.words.push({ text, x, y });
  ['Personal Information', 'Credit Overview', 'Summary', 'Consumer Credit Information', 'Publically Available Consumer Information']
    .forEach((heading, index) => put(pages[1], heading, 60 + index * 25));
  put(pages[2], 'Consumer Credit Information', 30); put(pages[2], 'Overdue Accounts', 55);
  accounts.forEach((changes, index) => {
    const a = { provider: 'Cedar Bank', role: PRINCIPAL, coBorrower: 'Morgan Lane', ...changes };
    const rows = [
      ['Status', 'Outstanding'], ['Current Listing'], ['Credit Provider', a.provider], ['Date', '20 Jul 2015'],
      ['Amount', '$300'], ['Reason to Report', 'Payment Default'], ['Association Code', a.role],
      ['Co Borrower', a.coBorrower], ['Account Number', `LIST${index + 1}`], ['Account Type', 'Credit Card'],
      ...(a.extra || []), ['Original Listing'], ['Original Credit Provider', a.provider], ['Date', '20 Jul 2015'],
      ['Amount', '$300'], ...(a.originalExtra || [])
    ];
    rows.forEach(([label, value], row) => {
      if (value === undefined && ['Association Code', 'Co Borrower'].includes(label)) return;
      const y = 85 + index * 345 + row * 18;
      put(pages[2], label, y); if (value != null && value !== '') put(pages[2], value, y, 240);
    });
  });
  pages.slice(1).forEach((page, index) => put(page,
    `${family.PUBLISHER_NAME} Page ${index + 2} of 3 ${family.PUBLISHER_ABN}`, 800, 24));
  return buildWordPdf(pages);
}

function read(t, accounts, amend, reportDate) {
  const bytes = nativePdf(accounts, reportDate), file = path.join(t.dataDir, `dm-au-role-${++sequence}.pdf`);
  fs.mkdirSync(t.dataDir, { recursive: true }); fs.writeFileSync(file, bytes);
  const model = formats.buildPdfDocumentModel(file); if (amend) amend(model);
  return { bytes, model, extraction: formats.extractWithSharedAdapter(model, { mode: 'REPORT', country: 'AU' }) };
}

function offered(extraction) {
  const assessed = evaluation.evaluateCase({ country: 'AU', region: 'AU-NSW', extraction, assessment_clock: CLOCK });
  return { assessed, findings: issues.issuesFor({ extraction, evaluation: assessed }),
    public: issues.publicIssues({ extraction, evaluation: assessed }) };
}

function ownIssue(findings, recordIndex = 1) {
  return findings.find((issue) => issue.eligible && issue.record_index === recordIndex && issue.record?.kind_label === 'overdue account');
}

function roleFacts(issue) { return (issue?.source_facts || []).filter((fact) => ROLE_FIELDS.includes(fact.field)); }
function publicRoleFacts(issue) { return (issue?.source_facts || []).filter((fact) => /Association Code|Co Borrower/.test(fact.source_field || '')); }

async function run(t, check) {
  const positive = read(t), record = positive.extraction.records[0];
  check.equal(positive.extraction.admission.admitted, true, 'the positioned native listing preserves the admitted family structure');
  for (const [field, raw, label] of [[ROLE, PRINCIPAL, 'Association Code'], [CO_BORROWER, 'Morgan Lane', 'Co Borrower']]) {
    const source = sourceForField(record, field);
    check.equal(record.facts[field], raw, 'the current listing retains the literal printed supporting value');
    check.equal(source?.raw_value, raw, 'the source preserves the complete literal reading');
    check.equal(source?.normalized_value, raw, 'supporting roles receive no responsibility inference');
    check.equal(source?.source_field, `CURRENT Listing > ${label}`, 'the source identifies the exact listing sub-block and caption');
    check.ok(source?.location?.page === 3 && Number.isFinite(source.location.x0), 'the caption has its own native page/line geometry');
  }
  check.equal(record.facts['account.responsibility'], undefined, 'Principal does not become INDIVIDUAL or JOINT responsibility');
  check.equal(record.facts['account.masked_identifier'], undefined, 'the listing reference does not become a creditor-account identifier');
  check.equal(commonErrors.formatCapability(positive.extraction).checks['COMMON-ERROR-RESPONSIBILITY-INCONSISTENCY'].supported, false,
    'supporting listing roles do not advertise responsibility-conflict coverage');
  const found = offered(positive.extraction), issue = ownIssue(found.findings);
  check.ok(issue, 'the independent supported reporting-period issue remains selectable');
  check.deepEqual(roleFacts(issue).map((fact) => fact.raw_value), [PRINCIPAL, 'Morgan Lane'], 'the existing issue includes both optional own listing readings');
  const publicIssue = found.public.find((row) => row.issue_id === issue?.issue_id);
  check.equal(publicIssue?.consumer_label, 'VIOLATION', 'the existing breach retains VIOLATION terminology');
  check.deepEqual(publicRoleFacts(publicIssue).map((fact) => fact.raw_value), [PRINCIPAL, 'Morgan Lane'], 'the statutory public review preserves its optional supporting readings');

  const current = offered(read(t, [{}], null, '4 January 2016').extraction);
  const currentIssue = current.findings.find((row) => row.eligible && row.check_id === 'RETENTION-PERIOD-ENDED-SINCE-THE-REPORT');
  check.ok(currentIssue, 'a historical report can still produce its supported current-period review');
  check.deepEqual(roleFacts(currentIssue).map((fact) => fact.raw_value), [PRINCIPAL, 'Morgan Lane'], 'the current review carries the same optional literal source evidence');
  check.equal(publicRoleFacts(current.public.find((row) => row.issue_id === currentIssue?.issue_id)).length, 2,
    'the current-review public view retains both supporting sources');

  for (const [name, changes, amend, reason] of [
    ['absent captions', { role: undefined, coBorrower: undefined }, null, 'LABEL_NOT_PRINTED_ON_THIS_RECORD'],
    ['explicit blank captions', { role: '', coBorrower: '' }, null, 'LABEL_PRINTED_WITHOUT_VALUE'],
    ['duplicate captions', { extra: [['Association Code', 'Another literal role'], ['Co Borrower', 'Another Person']] }, null, 'LABEL_PRINTED_MORE_THAN_ONCE_IN_RECORD'],
    ['untrusted native readings', {}, (model) => {
      model.pages[2].word_boxes.filter((word) => /^Principal/.test(word.text) || word.text === 'Morgan').forEach((word) => { word.trusted = false; });
    }, null]
  ]) {
    const extraction = read(t, [changes], amend).extraction, own = extraction.records[0];
    for (const field of ROLE_FIELDS) {
      check.equal(own.facts[field], undefined, `${name} supplies no guessed supporting fact`);
      check.equal(sourceForField(own, field), null, `${name} is unavailable as packet source evidence`);
      if (reason) check.equal(own.fact_sources[field].reason, reason, 'the rejected caption remains accurately described internally');
      else check.equal(own.fact_sources[field].trusted, false, 'the explicit native trust rejection remains attached');
    }
    const eligible = ownIssue(offered(extraction).findings);
    check.ok(eligible, `${name} does not suppress the independently sourced reporting-period issue`);
    check.equal(roleFacts(eligible).length, 0, `${name} contributes no unsupported packet evidence`);
    check.equal(publicRoleFacts(offered(extraction).public.find((row) => row.issue_id === eligible?.issue_id)).length, 0,
      'unavailable supporting captions produce no consumer qualification');
  }
  const originalOnly = read(t, [{ role: undefined, coBorrower: undefined,
    originalExtra: [['Association Code', 'Original role'], ['Co Borrower', 'Original Person']] }]).extraction;
  check.equal(roleFacts(ownIssue(offered(originalOnly).findings)).length, 0, 'the current listing does not borrow role captions from its original block');
  const neighbors = read(t, [{ role: undefined, coBorrower: undefined }, { provider: 'Neighbor Bank', role: 'Neighbor role', coBorrower: 'Neighbor Person' }]).extraction;
  check.equal(neighbors.records[0].facts[ROLE], undefined, 'a neighboring listing cannot supply the first listing role');
  check.equal(roleFacts(ownIssue(offered(neighbors).findings, 1)).length, 0, 'the first issue carries no neighboring role evidence');
  check.deepEqual(roleFacts(ownIssue(offered(neighbors).findings, 2)).map((fact) => fact.raw_value), ['Neighbor role', 'Neighbor Person'],
    'the neighboring listing keeps its own role and co-borrower');

  const owner = await t.unpaidAccount('dm-au-role-owner@example.test'); await t.pay(owner, 'monthly');
  const opened = await t.request('POST', '/api/cases', { token: owner.token, body: { country: 'AU', region: 'AU-NSW' } });
  const caseId = opened.json.case.case_id;
  check.equal((await t.request('POST', `/api/cases/${caseId}/files`, { token: owner.token, body: {
    originalFilename: 'fictional-au-listing.pdf', declaredBytes: positive.bytes.length, mimeType: 'application/pdf',
    contentBase64: positive.bytes.toString('base64') } })).status, 201, 'the native report reaches the normal upload route');
  check.equal((await t.request('POST', `/api/cases/${caseId}/evaluate`, { token: owner.token })).status, 201, 'the uploaded listing reaches its existing checklist assessment');
  const view = (await t.request('GET', `/api/cases/${caseId}/packet`, { token: owner.token })).json.view;
  const selectable = view.eligible_issues.find((row) => publicRoleFacts(row).length === 2);
  check.ok(selectable, 'the supported listing issue exposes the exact optional evidence in packet review');
  if (selectable) {
    check.equal((await t.request('POST', `/api/cases/${caseId}/packet/select`, { token: owner.token,
      body: { issue_ids: [selectable.issue_id] } })).status, 200, 'the consumer selects the existing issue');
    check.equal((await t.request('POST', `/api/cases/${caseId}/packet/correspondence`, { token: owner.token,
      body: { correspondence: { consumer_name: 'Dana Whitfield', contact: 'dana@example.test' } } })).status, 200, 'the consumer supplies correspondence');
    const prepared = await t.preparePostalPacket(owner, caseId);
    check.equal((await t.request('POST', `/api/cases/${caseId}/packet/approve`, { token: owner.token })).status, 200, 'the consumer approves the reviewable packet');
    const downloaded = await t.request('GET', `/api/cases/${caseId}/packet-download`, { token: owner.token });
    check.equal(downloaded.status, 200, 'the approved native listing packet downloads');
    check.equal(downloaded.headers.get('content-type'), 'application/pdf', 'the selected packet downloads as one complete PDF');
    const printed = packets.packetPrint(t.service.store, owner, caseId), reportSections = printed.sections.filter(section => section.kind === 'report');
    check.equal(reportSections.length, 1, 'the selected native report appears once in the packet');
    check.deepEqual(reportSections[0].source_pages, [3], 'only the original physical listing page is included');
    const sourceText = execFileSync('pdftotext', ['-f', String(reportSections[0].start_page), '-l', String(reportSections[0].start_page + reportSections[0].page_count - 1), '-layout', '-', '-'],
      { input: printed.body, encoding: 'utf8' });
    check.ok(sourceText.includes(PRINCIPAL) && sourceText.includes('Morgan Lane') && sourceText.includes('Cedar Bank'),
      'the original inline source page keeps the own literal role, co-borrower and provider');
    check.ok(sourceText.includes('Association Code') && sourceText.includes('Co Borrower'),
      'the supporting readings remain beside their original printed captions');
    const original = await t.request('GET', prepared.packet.report_exhibits[0].review_url, { token: owner.token });
    check.deepEqual(original.bytes, positive.bytes, 'the owned original-report review retains the exact uploaded PDF bytes');
    check.ok(/report page 3/.test(prepared.packet.correspondence_preview), 'the letter refers briefly to the included physical report page');
    check.equal(/INDIVIDUAL|JOINT|overdue\.associationCode|overdue\.coBorrower|CURRENT Listing >/.test(prepared.packet.correspondence_preview), false,
      'neither responsibility inference, internal fields nor debug evidence captions enter the plain consumer letter');
    for (const [name, mutate] of [
      ['literal role', (r) => { r.facts[ROLE] = 'Changed literal role'; r.fact_sources[ROLE].raw_value = 'Changed literal role'; r.fact_sources[ROLE].normalized_value = 'Changed literal role'; }],
      ['role geometry', (r) => { r.fact_sources[ROLE].location.x0 += 1; }],
      ['co-borrower geometry', (r) => { r.fact_sources[CO_BORROWER].location.x0 += 1; }],
      ['rejected optional source', (r) => { r.fact_sources[ROLE].trusted = false; }]
    ]) {
      const saved = JSON.parse(JSON.stringify(t.service.store.state().results.find((row) => row.case_id === caseId).extraction.records[0]));
      t.service.store.update((state) => { mutate(state.results.find((row) => row.case_id === caseId).extraction.records[0]); });
      const changedView = (await t.request('GET', `/api/cases/${caseId}/packet`, { token: owner.token })).json.view;
      check.equal(changedView.packet.approval_stale, true, `${name} changes the material reviewed supporting evidence`);
      const stale = await t.request('GET', `/api/cases/${caseId}/packet-download`, { token: owner.token });
      check.equal(stale.status, 409, 'changed optional evidence requires a fresh review');
      check.equal(stale.json.error.code, 'PACKET_APPROVAL_STALE', 'the ordinary packet approval boundary applies');
      t.service.store.update((state) => { state.results.find((row) => row.case_id === caseId).extraction.records[0] = saved; });
      check.equal((await t.request('GET', `/api/cases/${caseId}/packet-download`, { token: owner.token })).status, 200,
        'restoring the same exact source restores the approved packet version');
    }
  }

  const sample = process.env.CRP_AU_EQUIFAX_PUBLIC_SPECIMEN || path.join(ROOT, 'SOURCE_CAPTURES', 'REPORT_FORMAT_BASELINE_2026-09-30', 'PUB-012.pdf');
  let publicEvidence = 'not present on this host';
  if (fs.existsSync(sample)) {
    check.equal(crypto.createHash('sha256').update(fs.readFileSync(sample)).digest('hex'), family.FAMILY_CONTRACT.evidenced_sha256,
      'the accepted public sample retains its pinned source bytes');
    const extraction = formats.extractWithSharedAdapter(formats.buildPdfDocumentModel(sample), { mode: 'REPORT', country: 'AU' });
    const listings = extraction.records.filter((r) => r.kind === 'OVERDUE_ACCOUNT');
    check.deepEqual(listings.map((r) => r.facts[ROLE]), [PRINCIPAL, PRINCIPAL], 'both public listing roles retain their exact literal meanings');
    check.deepEqual(listings.map((r) => r.fact_sources[ROLE].location.page), [10, 10], 'both roles belong to their own public page-ten listings');
    check.equal(new Set(listings.map((r) => r.fact_sources[ROLE].location.line)).size, 2, 'the two public captions preserve different source lines');
    check.equal(listings[0].printed.current_listing_co_borrower.reason, 'LABEL_PRINTED_WITHOUT_VALUE', 'the printed blank co-borrower remains blank internally');
    check.equal(listings.every((r) => r.facts[CO_BORROWER] === undefined && r.facts['account.responsibility'] === undefined), true,
      'the public example supplies neither co-borrower names nor inferred responsibility');
    check.equal(commonErrors.formatCapability(extraction).checks['COMMON-ERROR-RESPONSIBILITY-INCONSISTENCY'].supported, false,
      'public role retention does not claim responsibility-conflict readiness');
    publicEvidence = 'PUB-012 read in place: two own literal listing roles; blank co-borrower preserved';
  }
  return { public_evidence: publicEvidence, packet_journey: 'native listing -> existing VIOLATION -> literal supporting evidence -> approval -> download' };
}

module.exports = { run, id: 'dm-au-role-packet-evidence', title: 'AU own listing-role sources in selected and approved packets' };
