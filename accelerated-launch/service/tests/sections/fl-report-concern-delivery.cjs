'use strict';
// Real positioned fictional PDF -> owned results -> paid review and selected approved packet.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { buildFixture } = require('./fj-report-concern-reader.cjs');
const { buildWordPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');
const { pdfText, comparableText } = require('../packet-pdf-assertions.cjs');
const issues = require('../../issues.cjs');
const results = require('../../results.cjs');
const letter = require('../../consumer-dispute-letter.cjs');
const exhibits = require('../../packet-report-exhibits.cjs');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const PREFIX = 'COMMON-ERROR-';
const EXPECTED = ['ADDRESS-GEOGRAPHIC-INCONSISTENCY', 'PAID-CLAIM-STATUS-REVIEW',
  'CLOSURE-DATE-DISCLOSURE-REVIEW', 'UNDATED-HISTORY-DISCLOSURE-REVIEW',
  'IDENTIFIER-HANDLING-REVIEW', 'CREDIT-DATA-CATEGORY-REVIEW'].map(id => PREFIX + id);
const body = (bytes, country) => ({ originalFilename: `fictional-${country}-table-concerns.pdf`,
  declaredBytes: bytes.length, mimeType: 'application/pdf', contentBase64: bytes.toString('base64') });

function client() {
  const nodes = new Map();
  const element = id => {
    if (!nodes.has(id)) nodes.set(id, { id, value: '', innerHTML: '', textContent: '', style: {}, dataset: {},
      classList: { add() {}, remove() {}, toggle() {} }, querySelectorAll: () => [], querySelector: () => null,
      focus() {}, scrollIntoView() {}, addEventListener() {} });
    return nodes.get(id);
  };
  const context = { console, setTimeout, clearTimeout, URL, Blob,
    document: { getElementById: element, createElement: element },
    fetch: async () => ({ ok: true, status: 200, json: async () => ({ ok: true, surface: { regions: [] },
      regions: [], cases: [], account: null, entitlement: {}, pricing: null }) }) };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../../ui/app.js'), 'utf8'), context);
  return context;
}

async function run(t, check) {
  const owner = await t.unpaidAccount('concern-delivery-owner@example.test');
  const other = await t.unpaidAccount('concern-delivery-other@example.test');
  const nativeBytes = buildFixture({ historyToken: 'Z9' });
  const caseId = (await t.request('POST', '/api/cases', { token: owner.token,
    body: { country: 'AU', region: 'AU-ACT', bureau: 'EQUIFAX' } })).json.case.case_id;
  const endpoint = '/api/cases/' + caseId;
  check.equal((await t.request('POST', endpoint + '/files', { token: owner.token,
    body: body(nativeBytes, 'AU') })).status, 201, 'positioned nine-column report uploads through real intake');
  check.equal((await t.request('POST', endpoint + '/evaluate', { token: owner.token })).status, 201,
    'the actual owned report is assessed');
  const free = (await t.request('GET', endpoint, { token: owner.token })).json.view;
  check.ok(free.assessment_summary.violation_total > 0, 'free summary counts the sourced address breach');
  check.ok(free.assessment_summary.non_violation_concern_total > 0, 'free summary separately counts completed review concerns');
  check.equal(free.assessment_summary.teaser?.confidence_label, 'VIOLATION', 'the existing violation preview keeps its priority');
  check.equal((await t.request('GET', endpoint + '/report-download', { token: owner.token })).status, 402,
    'adding concerns does not bypass the paid assessment gate');
  await t.pay(owner, 'monthly');
  const paid = (await t.request('GET', endpoint, { token: owner.token })).json.view;
  const stored = t.service.store.state().results.find(row => row.case_id === caseId);
  const internal = issues.issuesFor({ evaluation: stored.evaluation, extraction: stored.extraction });
  const scoped = internal.filter(issue => EXPECTED.includes(issue.check_id));
  for (const id of EXPECTED.slice(0,2)) check.ok(scoped.some(issue => issue.check_id === id), `${id} reaches the assessed report`);
  for (const id of EXPECTED.slice(2)) check.ok(!scoped.some(issue=>issue.check_id===id), `${id}: default noise is absent`);
  check.ok(scoped.filter(issue => issue.check_id !== EXPECTED[0]).every(issue => issue.classification === 'NON_VIOLATION'),
    'payment claims and context-dependent questions remain non-violation reviews');
  check.ok(scoped.filter(issue => issue.check_id === EXPECTED[0]).every(issue => issues.consumerLabel(issue) === 'VIOLATION'),
    'the geography contradiction uses the bounded report-data violation');
  const publicConcerns = paid.result.issues.filter(issue => issue.report_concern);
  check.ok(publicConcerns.length >= 2 && publicConcerns.every(issue => issue.source_facts?.length),
    'public concern cards retain their own measured facts');
  check.ok(publicConcerns.every(issue => issue.source_facts.filter(fact => fact.location?.source_kind !== 'AUTHORITATIVE_LOCALITY_MAPPING')
    .every(fact => fact.location?.page)), 'every printed concern fact identifies its original report page');
  check.ok(publicConcerns.filter(issue => issue.consumer_label === 'NON-VIOLATION CONCERN')
    .every(issue => issues.projectConsumerIssue(issue).consumer_label === 'NON-VIOLATION CONCERN'),
    'non-violation labels survive saved public projections');
  check.ok(!/XXX XXX \d|TAX-[a-f0-9]+|CREDITOR-[a-f0-9]+|MEMBER-[a-f0-9]+/i.test(JSON.stringify(publicConcerns)),
    'new concern views expose no private matching tokens or tax-number digits');

  const context = client();
  context.reportForTest = paid.result;
  const cards = vm.runInContext('issuesSection(reportForTest)', context);
  const explanations = vm.runInContext('reportForTest.issues.map(issue => esc(issue.explanation))', context);
  check.ok(explanations.every(text => cards.includes(text)) && cards.includes('VIOLATION') && cards.includes('NON-VIOLATION CONCERN'),
    'record grouping preserves every extracted explanation and both consumer labels');
  check.ok(cards.includes('NON-VIOLATION CONCERN') && !cards.includes('Checks could not'),
    'consumer review concerns are completed cards rather than failed-check diagnostics');
  const { chromium } = require('C:/Users/webbd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.setDefaultTimeout(20000);
    await page.goto(t.base + '/index.html#signin');
    await page.locator('#email').fill('concern-delivery-owner@example.test');
    await page.locator('#password').fill('a-long-enough-password');
    await page.locator('#signin').click();
    await page.waitForSelector('#open');
    await page.locator('#refresh').click();
    await page.waitForSelector(`[data-open="${caseId}"]`);
    await page.locator(`[data-open="${caseId}"]`).click();
    // Opening an assessed case is asynchronous and already selects Results.
    // Wait for that owned view before inspecting its cards.
    await page.getByRole('heading', { name: 'Review results', exact: true }).waitFor();
    await page.locator('#current-report-identity').waitFor();
    check.ok((await page.locator('#current-report-identity').innerText()).includes('fictional-AU-table-concerns.pdf'),
      'real mobile browser identifies the actual report being reviewed');
    check.ok((await page.locator('.issue .pill').allTextContents()).includes('VIOLATION'),
      'real mobile browser retains the sourced violation badge');
    for (const concern of publicConcerns) {
      const card = page.locator('.issue').filter({ has: page.getByRole('heading', { name: concern.explanation, exact: true }) });
      check.equal(await card.count(), 1, 'each actual concern appears once in the grouped results');
      check.equal(await card.locator('.pill').innerText(), concern.consumer_label, 'each concern retains its measured classification badge');
      const group = card.locator('xpath=ancestor::section[@data-issue-group]');
      check.equal(await group.count(), 1, 'each concern belongs to one source-record group');
      if (concern.account_identity?.name) {
        check.ok((await group.locator(':scope > h3').innerText()).includes(concern.account_identity.name),
          'the collection concern identifies its actual source collection');
      } else {
        check.ok(!(await group.innerText()).includes('Acorn Recoveries'), 'report-level address evidence stays outside the collection group');
      }
    }
    check.ok((await page.locator('.issue .pill').allTextContents()).includes('NON-VIOLATION CONCERN'),
      'real browser renders the distinct concern badges');
    check.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      'concern labels and evidence remain within the mobile viewport');
    const screenshots = path.join(__dirname, '../../out/report-concerns');
    fs.mkdirSync(screenshots, { recursive: true });
    await page.screenshot({ path: path.join(screenshots, 'fictional-mobile-results.png'), fullPage: true });
  } finally { await browser.close(); }
  const report = await t.request('GET', endpoint + '/report-download', { token: owner.token });
  const reportText = comparableText(pdfText(report.bytes));
  check.equal(report.status, 200, 'paid endpoint downloads the actual concern assessment PDF');
  check.ok(reportText.includes('NON-VIOLATION CONCERN') && reportText.includes('VIOLATION'),
    'download preserves both labels');
  check.ok(!reportText.includes('not legal advice') && !reportText.includes('COMMON-ERROR-'),
    'download uses consumer facts without internal check IDs or repeated disclaimer');
  check.equal((await t.request('GET', endpoint + '/report-download', { token: other.token })).status, 403,
    'another account cannot download the concern report');

  const packet = (await t.request('GET', endpoint + '/packet', { token: owner.token })).json.view;
  const selected = packet.eligible_issues.filter(issue => issue.report_concern);
  check.equal(selected.length, publicConcerns.filter(issue => issue.eligible).length,
    'every eligible completed concern reaches consumer selection');
  check.equal((await t.request('POST', endpoint + '/packet/select', { token: owner.token,
    body: { issue_ids: selected.map(issue => issue.issue_id) } })).status, 200,
    'consumer can choose violations and verification concerns together');
  await t.preparePostalPacket(owner, caseId);
  const ready = (await t.request('GET', endpoint + '/packet', { token: owner.token })).json.view;
  check.ok(ready.packet.correspondence_preview && /paid|payment/i.test(ready.packet.correspondence_preview),
    'prepared letter asks about the sourced payment claim');
  check.ok(!/I (?:have )?paid (?:this|the) debt/i.test(ready.packet.correspondence_preview),
    'the letter never invents a personal statement that payment was made');
  check.ok(!/\d+\.\s*\n/.test(ready.packet.correspondence_preview),
    'report-level address and identifier requests have meaningful headings');
  check.equal((await t.request('POST', endpoint + '/packet/approve', { token: owner.token })).status, 200,
    'reviewed selected concern packet can be approved');
  const download = await t.request('GET', endpoint + '/packet-download', { token: owner.token });
  check.equal(download.status, 200, 'approved selected concerns download as the actual PDF packet');
  check.ok(/paid|payment/i.test(pdfText(download.bytes)), 'download carries the selected payment verification request');
  check.equal((await t.request('GET', endpoint + '/packet-download', { token: other.token })).status, 403,
    'another account cannot download the approved concern packet');

  // Report-level concern facts must remain in this exact file, not a neighbouring account or upload.
  const reportLevel = internal.find(issue => issue.report_concern && issue.record_index == null);
  if (reportLevel) {
    const references = exhibits.available(t.service.store, owner, stored, [reportLevel]);
    check.ok(references.some(ref => ref.file_id && ref.relevant_pages?.includes(1)),
      'a report-level concern retains its original owned evidence page');
    const forged = JSON.parse(JSON.stringify(reportLevel));
    for (const source of forged.source_facts) {
      source.source_file_id = 'foreign-file'; source.location.file_id = 'foreign-file';
    }
    for (const fact of forged.rule_assessment?.required_facts || []) {
      fact.source.source_file_id = 'foreign-file'; fact.source.location.file_id = 'foreign-file';
    }
    check.equal(issues.isEligible(forged), false, 'modified concern evidence cannot retain governed packet eligibility');
    check.equal(exhibits.available(t.service.store, owner, stored, [forged]).length, 0,
      'forged report-level evidence cannot borrow another uploaded file');
  }
  for (const [country, region] of [['CA', 'CA-NS'], ['US', 'US-TX'], ['GB', 'GB-WLS']]) {
    const id = (await t.request('POST', '/api/cases', { token: owner.token, body: { country, region } })).json.case.case_id;
    const address = country === 'CA' ? '19 Sample Lane, Toronto, NS M5H 2N2, Canada'
      : country === 'US' ? '19 Sample Lane, Washington, NY 20024, USA' : undefined;
    const base = '/api/cases/' + id, bytes = buildFixture({ country, currentAddress: address, historyToken: 'Z9' });
    await t.request('POST', base + '/files', { token: owner.token, body: body(bytes, country) });
    await t.request('POST', base + '/evaluate', { token: owner.token });
    const view = (await t.request('GET', base, { token: owner.token })).json.view;
    const row = t.service.store.state().results.find(result => result.case_id === id);
    const found = issues.issuesFor({ evaluation: row.evaluation, extraction: row.extraction });
    check.ok(found.some(issue => issue.check_id === EXPECTED[1]), `${country}: shared sourced payment-claim review is detected`);
    check.ok(!found.some(issue => issue.check_id === EXPECTED[2]), `${country}: missing closing column alone is not a dispute`);
    check.ok(!found.some(issue => issue.check_id === EXPECTED[3]), `${country}: uninterpreted history alone is not a dispute`);
    check.ok(!found.some(issue => [EXPECTED[4], EXPECTED[5]].includes(issue.check_id)),
      `${country}: Australian identifier and data-category rules are not copied into this jurisdiction`);
    check.ok(view.result.issues.some(issue => issue.consumer_label === 'NON-VIOLATION CONCERN'),
      `${country}: shared concern is displayed through the actual upload route`);
    if (address) check.ok(found.some(issue => issue.check_id === EXPECTED[0] && issue.consumer_label === 'VIOLATION'),
      `${country}: source-mapped locality and code contradiction reaches the actual report`);
  }
  // A combined file must send each selected report-level request to its own bureau.
  const combinedBytes = buildWordPdf([
    ['Equifax Consumer Credit Report - FICTIONAL', 'Prepared Date: 06/06/2026', 'CURRENT ADDRESS',
      '19 Sample Lane, Toronto, NS M5H 2N2, Canada'],
    ['TransUnion Consumer Credit Report - FICTIONAL', 'Prepared Date: 07/07/2026', 'CURRENT ADDRESS',
      '29 Example Lane, Halifax, ON B3J 3A5, Canada']
  ].map(lines => ({ words: lines.map((text, index) => ({ text, x: 30, y: 30 + index * 20 })) })),
  { page_size: { width: 600, height: 800 }, font_size: 8 });
  const combinedId = (await t.request('POST', '/api/cases', { token: owner.token,
    body: { country: 'CA', region: 'CA-NS', bureau: 'EQUIFAX' } })).json.case.case_id;
  const combinedEndpoint = '/api/cases/' + combinedId;
  check.equal((await t.request('POST', combinedEndpoint + '/files', { token: owner.token,
    body: body(combinedBytes, 'CA') })).status, 201, 'two source bureaus in one native PDF reach real intake');
  await t.request('POST', combinedEndpoint + '/evaluate', { token: owner.token });
  const combinedView = (await t.request('GET', combinedEndpoint + '/packet', { token: owner.token })).json.view;
  const ownSecond = combinedView.eligible_issues.find(issue => issue.report_identity?.bureau === 'TransUnion');
  check.ok(ownSecond && ownSecond.source_location.page === 2, 'second report address concern retains TransUnion and page two');
  check.equal(ownSecond?.report_identity.reference_date, '2026-07-07', 'second report concern retains its own date');
  await t.request('POST', combinedEndpoint + '/packet/select', { token: owner.token,
    body: { issue_ids: [ownSecond?.issue_id] } });
  const combinedPrepared = await t.preparePostalPacket(owner, combinedId);
  check.equal(combinedPrepared.support.requirements.bureau, 'TRANSUNION',
    'selected report-level concern routes the actual prepared packet to its owning bureau');
  check.equal((await t.request('POST', combinedEndpoint + '/packet/approve', { token: owner.token })).status, 200,
    'the owned second-bureau verification packet can be reviewed and approved');
  const combinedDownload = await t.request('GET', combinedEndpoint + '/packet-download', { token: owner.token });
  check.equal(combinedDownload.status, 200, 'approved second-bureau packet downloads through the protected endpoint');
  check.ok(comparableText(pdfText(combinedDownload.bytes)).includes('TransUnion'),
    'the downloaded letter names the owning second bureau');
  const artifacts = path.join(__dirname, '../../out/report-concerns');
  fs.mkdirSync(artifacts, { recursive: true });
  fs.writeFileSync(path.join(artifacts, 'fictional-assessment.pdf'), report.bytes);
  fs.writeFileSync(path.join(artifacts, 'fictional-approved-packet.pdf'), download.bytes);
  return { concerns: publicConcerns.length, categories: EXPECTED.length,
    report_sha256: hash(report.bytes), packet_sha256: hash(download.bytes),
    scope: 'one native table family, AU report/approved packet and CA/US/GB factual review routes; no universal legal or bureau-format coverage' };
}
module.exports = { run, id: 'fl-report-concern-delivery', title: 'Sourced violations and non-violation concerns reach reports, selected packets and similar-country reviews' };
