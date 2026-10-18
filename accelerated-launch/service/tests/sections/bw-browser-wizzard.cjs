'use strict';
/**
 * bw-browser-wizzard.cjs — OWNER-POTENTIAL-ISSUE-001 / consumer-service acceptance: the actual local Wizzard driven
 * in a REAL browser (Playwright + local Chrome) against the real loopback service.
 *
 * Fictional reports only; every PDF is a buildPdf fixture with fictional data, clearly identified in evidence. No
 * real consumer identifier or private report is used. Entitlement is granted through the test adapter (a signed,
 * non-payment event), never a real card.
 *
 * Covered: a common potential issue; a qualified probable retention issue; multiple issues with the consumer
 * selecting only some; review/edit/approve/download; changing wording after approval; and a benign report without
 * misleading reassurance.
 */
const fs = require('node:fs');
const crypto = require('node:crypto');
const { comparableText } = require('../packet-pdf-assertions.cjs');
const { buildPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');
const PLAYWRIGHT = 'C:/Users/webbd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const { chromium } = require(PLAYWRIGHT);

async function payReportOnce(service, actor, caseId) {
  const checkout = await service.request('POST', '/api/billing/checkout', { token: actor.token, body: { plan_code: 'monthly' } });
  const c = checkout.json.checkout;
  const event = { id: `test_evt_${crypto.randomBytes(8).toString('hex')}`, type: 'checkout.session.completed', account_reference: actor.account_id, plan_code: c.plan.plan_code, session_reference: c.provider_reference, amount_cents: c.plan.amount_cents, currency: c.plan.currency, occurred_at: new Date().toISOString() };
  await service.postEvent(event);
}

async function setupPaidCase(service, email, country, region) {
  const password = 'a-long-enough-password';
  const actor = await service.unpaidAccount(email);
  const c = (await service.request('POST', '/api/cases', { token: actor.token, body: { country, region } })).json.case;
  await payReportOnce(service, actor, c.case_id);
  return { email, password, caseId: c.case_id };
}

async function setupHistoryAccount(service, email) {
  const password = 'a-long-enough-password';
  const actor = await service.unpaidAccount(email);
  await service.pay(actor, 'monthly');
  const assessOne = async (bureau, date, opened, closed, name) => {
    const lines = [`${bureau}  Consumer Credit Report`, `Report Date: ${date}`, 'Creditor A  Balance $100', 'Account Number ****1234', `Opened ${opened}`, `Closed ${closed}`];
    const pdf = buildPdf({ pages: [{ lines }] });
    const caseRow = (await service.request('POST', '/api/cases', { token: actor.token, body: { country: 'US', region: 'US-CA' } })).json.case;
    await service.request('POST', `/api/cases/${caseRow.case_id}/files`, { token: actor.token, body: { originalFilename: name, declaredBytes: pdf.length, mimeType: 'application/pdf', contentBase64: pdf.toString('base64') } });
    await service.request('POST', `/api/cases/${caseRow.case_id}/evaluate`, { token: actor.token });
    return caseRow.case_id;
  };
  const earlierCaseId = await assessOne('Equifax', 'June 1, 2025', '01/01/2020', '01/01/2019', 'earlier.pdf');
  const latestCaseId = await assessOne('Equifax', 'June 1, 2026', '01/01/2021', '01/01/2020', 'later.pdf');
  return { email, password, earlierCaseId, latestCaseId };
}

async function run(service, check) {
  const evidence = {};
  let browser;
  try {
    browser = await chromium.launch({ headless: true, executablePath: CHROME });
  } catch (err) {
    check.skip('the real-browser Wizzard acceptance', `browser automation unavailable: ${err.message}`);
    evidence.tooling_limitation = { unavailable: true, reason: String(err && err.message) };
    return evidence;
  }

  try {
  const caseContexts = new WeakMap();
  async function uploadNewReport(page, existingCaseId, lines, extraPages = [], beforeChecked = null) {
    // The visible Upload screen creates a new report. Keep its actual identity for every later protected request.
    const existing = (await (await page.request.get(service.base + '/api/cases/' + existingCaseId)).json()).view.case;
    const bureau = /TransUnion/i.test(lines.join('\n')) ? 'TRANSUNION' : /Experian/i.test(lines.join('\n')) ? 'EXPERIAN' : 'EQUIFAX';
    await page.locator('#steps button[data-step="1"]').click();
    await page.waitForSelector('#file');
    await page.locator('#country').selectOption(existing.country);
    await page.locator('#region').selectOption(existing.region);
    await page.locator('#bureau').selectOption(bureau);
    const reportBytes = buildPdf({ pages: [{ lines }, ...extraPages] });
    await page.locator('#file').setInputFiles({ name: 'fictional-report.pdf', mimeType: 'application/pdf', buffer: reportBytes });
    const created = page.waitForResponse(response => response.url().endsWith('/api/cases') && response.request().method() === 'POST');
    await page.locator('#open').click();
    const createdResponse = await created;
    check.equal(createdResponse.status(), 201, 'the visible Upload action creates its own report');
    const caseId = (await createdResponse.json()).case.case_id;
    if (beforeChecked) await beforeChecked(caseId);
    await page.locator('#evaluate').filter({ hasText: 'Check this report again' }).waitFor();
    await page.waitForSelector('#current-report-identity');
    check.ok(/fictional-report\.pdf/.test(await page.locator('#current-report-identity').innerText()), 'automatic checking lands on Results labelled with this uploaded report');
    caseContexts.set(page, { caseId, country: existing.country, region: existing.region, bureau });
    return { caseId, reportBytes };
  }
  async function openCasePage(email, password, caseId, lines, extraPages = []) {
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    await page.goto(service.base + '/index.html#signin');
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    await page.locator('#signin').click();
    await page.locator('#signin-skip-two-factor').click();
    await page.waitForSelector('#open');
    const uploaded = await uploadNewReport(page, caseId, lines, extraPages);
    if (await page.locator('#create-packet').count()) await page.locator('#create-packet:enabled').waitFor();
    return { page, context, ...uploaded };
  }

  /** OWNER dual-date retention (Batch 33): open the same case in the browser with the ASSESSMENT clock pinned, so
   *  a period that has ended since the report was issued is exercised without depending on the day the suite runs.
   *  The clock is the SERVER's, never the browser's, and it is always restored. */
  async function withDualClockBrowser(account, lines) {
    const previous = process.env.CRP_ASSESSMENT_CLOCK_AT;
    process.env.CRP_ASSESSMENT_CLOCK_AT = '2027-06-13T12:00:00Z';
    try {
      return await openCasePage(account.email, account.password, account.caseId, lines);
    } finally {
      if (previous === undefined) delete process.env.CRP_ASSESSMENT_CLOCK_AT;
      else process.env.CRP_ASSESSMENT_CLOCK_AT = previous;
    }
  }

  async function downloadText(page) {
    /* The ACTUAL download control: click #packet-download, capture the file the browser writes. */
    const [download] = await Promise.all([ page.waitForEvent('download'), page.locator('#packet-download').click() ]);
    const filePath = await download.path();
    const filename = download.suggestedFilename(), bytes = fs.readFileSync(filePath);
    check.ok(filename.endsWith('.pdf') && bytes.subarray(0, 5).toString() === '%PDF-', 'the actual browser download is one complete PDF');
    const text = require('../packet-pdf-assertions.cjs').pdfText(bytes);
    return { status: 200, filename, text, bytes };
  }
  async function saveReadApprove(page) {
    await page.locator('#steps button[data-step="6"]').click();
    await page.waitForSelector('#packet-save:visible');
    const previewResponse = page.waitForResponse(response => response.url().endsWith('/packet') && response.request().method() === 'GET');
    await page.locator('#packet-save').click(); await (await previewResponse).finished();
    await page.waitForSelector('#packet-preview-reviewed:not([disabled])');
    await page.waitForFunction(() => {
      const images = [...document.querySelectorAll('#packet-all-pages .packet-page-image')];
      return images.length > 0 && images.every(image => image.complete && image.naturalWidth > 0);
    });
    await page.locator('#packet-preview-reviewed').check();
    await page.locator('#packet-approve').click();
    await page.locator('#packet-approved-status:visible').waitFor();
    await page.locator('#packet-download:enabled').waitFor();
  }
  async function readLetter(page) {
    await page.locator('[data-packet-letter-page]:visible, #packet-letter:visible').first().waitFor();
    const editors = page.locator('[data-packet-letter-page]');
    if (await editors.count()) return (await editors.evaluateAll(nodes => nodes.map(node => node.value))).join('\n');
    return page.locator('#packet-letter').inputValue();
  }
  async function editLetter(page, transform) {
    const original = await readLetter(page);
    check.ok(original.trim().length > 0, 'the actual current letter has loaded before the consumer edits it');
    const value = transform(original), editors = page.locator('[data-packet-letter-page]');
    if (await editors.count()) {
      await editors.first().fill(value);
      for (let index = 1; index < await editors.count(); index++) await editors.nth(index).fill('');
    } else await page.locator('#packet-letter').fill(value);
    return readLetter(page);
  }
  async function createSelectedPacket(page) {
    await page.locator('#steps button[data-step="3"]').click();
    await page.waitForSelector('[data-check-issue]');
    await page.locator('#create-packet:enabled').waitFor();
    if (!await page.locator('[data-check-issue]:checked').count()) await page.locator('[data-check-issue]').first().check();
    await page.locator('#create-packet').click();
    await page.waitForFunction(() => {
      const prepare = document.getElementById('packet-prepare-next'), reviewed = document.getElementById('packet-preview-reviewed');
      return Boolean(prepare?.getClientRects().length || (reviewed?.getClientRects().length && !reviewed.disabled));
    });
  }
  async function accountContact(page, name, email, withDocuments = true) {
    const report = caseContexts.get(page);
    const usEquifax = report.country === 'US' && report.bureau === 'EQUIFAX';
    await page.locator('#steps button[data-step="0"]').click();
    await page.waitForSelector('#account-save');
    check.equal(await page.locator('#signin, #create, #password').count(), 0, 'returning to Step1 while signed in shows account details, never authentication prompts');
    await page.locator('#account-country').selectOption('CA');await page.locator('#account-region').selectOption('NS');
    for (const [field, value] of Object.entries({ full_name: name, contact_email: email, date_of_birth: '1980-04-12', phone: '555-0100', address_line1: '10 Fictional Street', city: 'Example City', postal_code: 'B3J 0A1' })) await page.locator('#account-' + field).fill(value);
    check.equal(await page.locator('#account-given_name, #account-family_name').count(), 0, 'retired form-only name boxes are absent from the consumer account');
    await page.locator('#account-save').click();
    await page.waitForFunction(() => document.body.innerText.includes('Contact details saved.'));
    if (withDocuments && !(await page.locator('a[href^="/api/account/documents/"]').count())) for (const [type, kind] of [['IDENTITY', usEquifax ? 'SOCIAL_SECURITY' : 'PASSPORT'], ['IDENTITY', 'DRIVING_LICENCE'], ['ADDRESS', 'UTILITY_BILL']]) {
      await page.locator('#account-document-type').selectOption(type);
      await page.locator('#account-document-kind').selectOption(kind);
      await page.locator('#account-document-file').setInputFiles({ name: kind + '.pdf', mimeType: 'application/pdf', buffer: buildPdf({ pages: [{ lines: ['FICTIONAL SUPPORT DOCUMENT', kind] }] }) });
      const expectedCount = await page.locator('a[href^="/api/account/documents/"]').count() + 1;
      await page.locator('#account-document-upload').click();
      await page.waitForSelector('a[href^="/api/account/documents/"]', { state: 'attached' });
      await page.waitForFunction(expected => document.querySelectorAll('a[href^="/api/account/documents/"]').length === expected, expectedCount);
    }
    await createSelectedPacket(page);
    check.equal(await page.locator('#packet-channel').count(), 0, 'the consumer packet has a mail-only path with no submission-method selector');
    check.equal(await page.locator('#packet-verification-requested, #packet-copies-confirmed, #review').count(), 0, 'the revised flow has no repeated identity, copy-quality or assessment acknowledgement');
    if (withDocuments) {
      for (const date of await page.locator('[id^="packet-document-date-"]:visible').all()) await date.fill(new Date().toISOString().slice(0, 10));
    }
    if (await page.locator('#packet-identity-reference:visible').count()) await page.locator('#packet-identity-reference').fill('000000000');
    if (await page.locator('#packet-prepare-next:visible').count()) await page.locator('#packet-prepare-next').click();
    await page.locator('#packet-save:visible').waitFor();
    await page.waitForSelector('[data-packet-letter-page]:visible, #packet-letter:visible');
  }

  /* ---- 1. Common potential issue + change wording after approval, then download matches the approved content. ---- */
  const pot = await setupPaidCase(service, 'bw-pot@example.test', 'US', 'US-CA');
  let opened = await openCasePage(pot.email, pot.password, pot.caseId, ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor A  Balance $100  Opened 01/01/2020  Closed 01/01/2019']);
  pot.caseId = opened.caseId;
  let page = opened.page;
  check.deepEqual(await page.locator('#steps button[data-step]').evaluateAll(nodes => nodes.map(node => Number(node.dataset.step)).filter(step => step < 7)), [0, 1, 3, 5, 6], 'the consumer sees exactly the five agreed Wizard steps');
  const reviewText = await page.locator('#panel').innerText();
  check.ok(!/response draft|recorded output permission|review the observations|nothing will be sent|demonstration file/i.test(reviewText),
    'the actual browser packet review has no obsolete draft, observation-only or demonstration claims');
  check.equal(await page.locator('#draft, #download').count(), 0, 'the actual browser review has no legacy draft or demonstration control');
  check.equal(await page.locator('[data-check-issue]').count(), 1, 'the common potential issue renders as one selectable card');
  const potBlock = await page.locator('[data-issue-group]').innerText();
  check.ok(/opened date later than its closed date/.test(potBlock), 'with readable evidence and the affirmative concern');
  check.ok(/which date needs correction/.test(potBlock), 'with specific uncertainty about the correction');
  check.ok(/01\/01\/2020/.test(potBlock), 'with the printed raw readings');
  check.equal(await page.locator('#packet-preparation-content, #packet-review-controls, #review').count(), 0, 'Results combines findings and issue selection without packet preparation or repeated acknowledgement');
  check.ok(/Review results/.test(reviewText) && !/Choose disputes/.test(await page.locator('#steps').innerText()), 'issues are selected directly on Review results');
  await page.locator('#steps button[data-step="1"]').click();
  await page.waitForSelector(`[data-open="${pot.caseId}"]`);
  check.equal(await page.locator('#saved-report-list [data-open]').first().getAttribute('data-open'), pot.caseId, 'the newly uploaded report is the top saved report');
  await page.locator('#resume-latest').click();
  await page.waitForSelector('#current-report-identity');
  check.ok(/fictional-report\.pdf/.test(await page.locator('#current-report-identity').innerText()), 'Resume my latest report returns to the labelled Results for the new upload');
  await page.locator('#create-packet:enabled').waitFor();
  await page.locator('[data-check-issue]').first().check();
  const selectionRequest = page.waitForRequest(request => request.url().endsWith('/packet/select') && request.method() === 'POST');
  await page.locator('#create-packet').click();
  check.ok(typeof (await selectionRequest).postDataJSON().expected_result_id === 'string', 'Create packet binds the consumer selection to the current assessed result');
  await page.waitForSelector('#packet-prepare-next:visible');
  check.ok(/Prepare your documents/.test(await page.locator('#panel').innerText()), 'the selected issue leads to document preparation before packet review');
  await page.locator('#packet-bureau-checklist').locator('..').locator('summary').click();
  check.ok(/Official instructions/.test(await page.locator('#packet-bureau-checklist').innerText()), 'document preparation shows the selected bureau instructions');
  await page.locator('#packet-account-details').click();
  await page.waitForSelector('#account-document-upload');
  check.ok(/Documents for disputes/.test(await page.locator('#panel').innerText()), 'the preparation step offers the existing private document uploader');
  await page.locator('#account-continue').click();
  await page.waitForSelector('#packet-prepare-next:visible');
  const chosenBeforeDetails = (await (await page.request.get(service.base + '/api/cases/' + pot.caseId + '/packet')).json()).view.packet.selected_issue_ids;
  check.equal(chosenBeforeDetails.length, 1, 'returning from document upload preserves the dispute choice');
  await accountContact(page, 'Dana Whitfield', 'dana.whitfield@example.test');
  check.equal(await page.locator('#packet-edit-account:visible, #packet-edit-documents:visible, #packet-account-details:visible, .packet-highlight-tools:visible, .packet-add-highlight:visible, .packet-position-add:visible').count(), 0, 'ready Review has no contact, upload or manual-highlight tools');
  check.equal(await page.locator('#packet-approve').isDisabled(), true, 'a packet cannot be approved before its preview is read');
  await saveReadApprove(page);
  await page.waitForTimeout(500);
  check.equal(await page.locator('#packet-download').isEnabled(), true, 'download is enabled right after approval');
  await page.locator('#packet-download:enabled').waitFor();
  const fullReview = page.locator('#packet-all-pages');
  check.equal(await fullReview.count(), 1, 'real browser presents one complete packet with every physical page');
  await page.waitForFunction(() => {
    const images = [...document.querySelectorAll('#packet-all-pages .packet-page-image')];
    return images.length > 0 && images.every(image => image.complete && image.naturalWidth > 0);
  });
  check.equal(await page.locator('#packet-all-pages [data-packet-page]').count(), await page.locator('#packet-page-jump option').count(), 'every physical page listed by the complete packet control is rendered inline');
  const approvedPreview = await page.locator('#packet-pdf-review a[href*="/packet/preview?"]').getAttribute('href');
  await createSelectedPacket(page);
  await page.waitForSelector('#packet-approved-status:visible');
  await page.locator('#packet-download:enabled').waitFor();
  check.equal(await page.locator('#packet-download').isEnabled(), true, 'unchanged Results-to-packet continuation skips Prepare and preserves approved download access');
  check.equal(await page.locator('#packet-pdf-review a[href*="/packet/preview?"]').getAttribute('href'), approvedPreview, 'unchanged Results-to-packet continuation preserves the exact approved version');
  const reviewedForm = await page.context().request.get(service.base + approvedPreview);
  check.equal(reviewedForm.status(), 200, 'browser session cookie opens the owned complete packet PDF');
  const initialPacketText = require('../packet-pdf-assertions.cjs').pdfText(await reviewedForm.body());
  check.ok(initialPacketText.includes('Whitfield') && !initialPacketText.includes('DISPUTE REQUEST FORM'), 'actual complete PDF review keeps the consumer name without retired bureau artwork');
  check.ok(/Your packet is approved/.test(await page.locator('#packet-block').innerText()) && await page.locator('#packet-ready-status').isVisible(), 'approved and ready messages describe the current approved preview');
  await accountContact(page, 'Dana Whitfield', 'changed-reply@example.test');
  check.equal(await page.locator('#packet-download').isDisabled(), true, 'editing a correspondence detail after approval disables download');
  await saveReadApprove(page);
  await editLetter(page, value => value + '\nCHANGED WORDS AFTER APPROVAL\nMy bureau file or account number: BUREAU-FILE-2468');
  await page.waitForTimeout(300);
  check.equal(await page.locator('#packet-download').isDisabled(), true, 'editing wording after approval disables download');
  check.ok(!/Your packet is approved|Your packet is ready|Packet approved\. Download it/.test(await page.locator('#panel').innerText()), 'an unsaved edit removes every stale approval and ready message');
  check.ok(/Your packet changed.*Save and review/s.test(await page.locator('#packet-preview-status').innerText()), 'the changed preview gives one clear save-and-review action');
  const changedPreviewShot = `${process.env.TEMP || '.'}/crp-packet-changed-preview.png`;
  await page.screenshot({ path: changedPreviewShot, fullPage: true });
  evidence.changed_preview_screenshot = changedPreviewShot;
  await saveReadApprove(page);
  await page.waitForTimeout(500);
  check.equal(await page.locator('#packet-all-pages').count(), 1, 'one complete all-page packet appears inline after saving');
  check.equal(await page.locator('#packet-preview').isVisible(), false, 'the old text-only packet preview is hidden');
  await editLetter(page, value => value.replace('Thank you for your help.', 'Thank you. Please send your reply to me.'));
  check.equal(await page.locator('#packet-download').isDisabled(), true, 'editing the entire letter invalidates the approved download');
  check.equal(await page.locator('#packet-approve').isDisabled(), true, 'an edited full letter cannot approve unseen PDF changes');
  check.equal(await page.locator('#packet-pdf-review').isVisible(), true, 'inline editing keeps the whole packet visible while approval is disabled');
  await saveReadApprove(page);
  const reviewedComplete = await page.context().request.get(service.base + await page.locator('#packet-pdf-review a[href*="/packet/preview?"]').getAttribute('href'));
  const dl1 = await downloadText(page);
  check.equal(dl1.status, 200, 're-approving the changed version re-enables download');
  check.ok(/Your packet is approved/.test(await page.locator('#packet-block').innerText()) && await page.locator('#packet-ready-status').isVisible(), 'approved and ready messages return only after the saved current version is approved');
  check.ok(/^CRP-dispute-packet-case_.+\.pdf$/.test(dl1.filename), 'the browser wrote the complete printable packet PDF');
  check.ok(dl1.bytes.equals(await reviewedComplete.body()), 'the browser download equals the complete PDF reviewed inline');
  check.ok(/opening date comes after the closing date/.test(comparableText(dl1.text)), 'and the packet matches the selected impossible date order');
  check.ok(dl1.text.includes('CHANGED WORDS AFTER APPROVAL'), 'carrying the changed wording');
  check.ok(dl1.text.includes('01/01/2020'), 'and the printed raw reading');
  check.ok(/Re: Credit report dispute/.test(comparableText(dl1.text)) && /Please see report page 1/.test(comparableText(dl1.text)), 'the letter integrates a brief source-page reference');
  check.ok(dl1.text.includes('Thank you. Please send your reply to me.'), 'the consumer full-letter edit survives the reviewed download');
  check.ok(dl1.text.includes('My bureau file or account number: BUREAU-FILE-2468'), 'the letter includes the optional bureau file number');
  check.ok(!/EVIDENCE REFERENCES|Sign and date the letter|Mail the packet to the bureau address/i.test(await readLetter(page)), 'consumer print and mail instructions stay outside the letter');
  check.ok(dl1.text.includes('Dana Whitfield') && dl1.text.includes('changed-reply@example.test'), 'carrying the correspondence details the consumer approved');
  check.ok(!dl1.text.includes('dana.whitfield@example.test'), 'and not the detail that was replaced before approval');
  check.ok(!/not legal advi/i.test(dl1.text), 'with no legal-advice disclaimer');
  check.equal(dl1.text.split('\n').filter((l) => l.trim()).length > 20, true, 'and reads as a complete correspondence, not a raw debug dump');
  check.ok(!/established reporting issue/.test(dl1.text), 'never asserting a definite breach');
  const printResponse=page.waitForResponse(r=>r.url().endsWith('/api/cases/'+pot.caseId+'/packet-print'));
  const [printPage] = await Promise.all([page.context().waitForEvent('page'), page.locator('#packet-print').click()]);
  await printPage.waitForURL('blob:**');await printPage.waitForLoadState();
  check.ok(printPage.url().startsWith('blob:'), 'the real Print packet button opens the approved inline PDF');
  const printed = await printResponse;
  check.equal(printed.status(), 200, 'the owned approved print endpoint serves its PDF');
  check.match((await printed.allHeaders())['content-type'], /application\/pdf/, 'the print document is a PDF');
  check.ok((await printed.body()).subarray(0, 5).toString() === '%PDF-', 'actual printable bytes carry a PDF header');
  check.ok((await printed.body()).equals(dl1.bytes), 'the actual Print button opens the same full PDF as the download');
  await printPage.close();
  await page.route('**/packet-download',async route=>{await new Promise(resolve=>setTimeout(resolve,1600));await route.continue();});
  const pendingFile=page.waitForEvent('download');await page.locator('#packet-download').click();await page.locator('#operation-progress').waitFor({state:'visible'});
  const pendingLetter=await editLetter(page,value=>value+'\nFictional edit made while download is pending.');
  await(await pendingFile).path();await page.locator('#operation-progress').waitFor({state:'hidden'});
  check.equal(await readLetter(page),pendingLetter,'a delayed download preserves unsaved consumer letter edits');
  check.ok(await page.locator('#packet-download').isDisabled()&&await page.locator('#packet-approve').isDisabled(),'download completion cannot re-enable approval or download after an edit');
  await page.unroute('**/packet-download');
  await page.locator('#packet-save').click();await page.locator('#packet-preview-reviewed:enabled').waitFor();
  const originalLink=page.locator('#packet-pdf-review a').first(),originalUrl=new URL(await originalLink.getAttribute('href'),page.url()).href;
  await page.route(originalUrl,async route=>{await new Promise(resolve=>setTimeout(resolve,1600));await route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({error:{message:'This fictional source is temporarily unavailable.'}})});});
  await originalLink.click();await page.locator('#operation-progress').waitFor({state:'visible'});
  const failedOpenLetter=await editLetter(page,value=>value+'\nFictional edit while the PDF opens.');
  await page.locator('#operation-error').waitFor();
  check.equal(await readLetter(page),failedOpenLetter,'a failed document opening preserves edits made while the PDF was opening');
  await page.unroute(originalUrl);


  await page.locator('#steps button').filter({ hasText: 'Privacy and deletion' }).click();
  await page.waitForSelector('#privacyInventory');
  check.ok(await page.locator('#delete').isVisible() && /Delete this report and its files/.test(await page.locator('#delete').innerText()), 'real-browser named case navigation preserves deletion controls');
  await page.locator('#steps button').filter({ hasText: 'Help' }).click();
  await page.waitForSelector('#copyReference');
  check.ok(/Your support reference/.test(await page.locator('#panel').innerText()), 'real-browser named support navigation loads its owned reference');
  await page.locator('#steps button').filter({ hasText: 'Plans' }).click();
  await page.waitForFunction(() => document.getElementById('billingView')?.innerText.includes('Plans and prices'));
  check.ok(/Plans and prices/.test(await page.locator('#panel').innerText()), 'real-browser named billing navigation loads purchase and access state');
  const plansShot = `${process.env.TEMP || '.'}/crp-purchase-plans.png`;
  await page.screenshot({ path: plansShot, fullPage: true });
  evidence.purchase_plans_screenshot = plansShot;
  await page.close();

  /* ---- 2. Qualified probable retention issue (US-NY adverse rating). ---- */
  const prob = await setupPaidCase(service, 'bw-prob@example.test', 'US', 'US-NY');
  opened = await openCasePage(prob.email, prob.password, prob.caseId, ['Experian Consumer Credit Report - FICTIONAL TEST FIXTURE', 'Report Date: June 12, 2026', 'Account 30 days past due as of Jun 2015']);
  page = opened.page;
  const probBlock = await page.locator('[data-issue-group]').innerText();
  check.equal(await page.locator('[data-issue-group] [data-check-issue]').count(), 1,
    'the qualified reporting-period issue is one coherent selectable concern');
  check.deepEqual(await page.locator('[data-issue-group] .pill').allTextContents(), ['VIOLATION'],
    'the supported issue uses the sole consumer breach term required by the latest owner amendment');
  check.ok(/entry older than the ordinary reporting period|not shown to be absent/.test(probBlock), 'with the affirmative concern and the exception uncertainty');
  check.ok(!/ESTABLISHED REPORTING ISSUE/.test(probBlock), 'never an established issue');
  await page.close();

  /* ---- 3. Multiple issues: select only one, download contains only that one. ---- */
  const multi = await setupPaidCase(service, 'bw-multi@example.test', 'US', 'US-CA');
  opened = await openCasePage(multi.email, multi.password, multi.caseId, ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor A  Balance $100  Opened 01/01/2020  Closed 01/01/2019', 'Creditor B  Balance $200  Opened 01/01/2021  Closed 01/01/2020']);
  page = opened.page;
  check.equal(await page.locator('[data-check-issue]').count(), 2, 'two issues render for the two contradictory accounts');
  const labels = await page.locator('[data-issue-group] > h3').allInnerTexts();
  check.equal(labels.length, 2, 'each is a distinct selectable card');
  await page.locator('[data-check-issue]').first().check();
  /* A missing necessary correspondence detail refuses approval: no packet that cannot be sent can be downloaded. */
  multi.caseId = opened.caseId;
  await page.locator('#create-packet').click();await page.locator('#packet-prepare-next').waitFor();
  check.ok(/Add your full name/.test(await page.locator('#packet-block').innerText()), 'the review names the necessary detail that is still missing');
  await page.locator('#steps button[data-step="6"]').click();
  await page.waitForSelector('#packet-prepare-missing');
  check.ok(/Add your name|name|reply|contact/i.test(await page.locator('#packet-block').innerText()), 'incomplete Review explains the missing preparation recovery');
  check.equal(await page.locator('#packet-preview-reviewed:enabled').count(), 0, 'a packet with missing correspondence details cannot be acknowledged as complete');
  check.equal(await page.locator('#packet-approve:enabled').count(), 0, 'a packet with missing correspondence details cannot be approved');
  check.equal(await page.locator('#packet-download:enabled').count(), 0, 'a packet with missing correspondence details cannot download');
  const missingDetailsApproval = await page.request.post(service.base + `/api/cases/${multi.caseId}/packet/approve`, { data: {}, headers: { Origin: service.base } });
  check.equal(missingDetailsApproval.status(), 409, 'the protected approval endpoint independently refuses the incomplete packet');
  await accountContact(page, 'Dana Whitfield', 'dana.whitfield@example.test');
  await saveReadApprove(page);
  await page.waitForTimeout(500);
  const dlMulti = await downloadText(page);
  check.equal(dlMulti.status, 200, 'the packet downloads with the partial selection');
  const multiCorrespondence = await readLetter(page);
  check.ok(/Creditor A/i.test(multiCorrespondence), 'the letter names the selected tradeline');
  check.equal(/Creditor B/i.test(multiCorrespondence), false, 'the correspondence covers only the selected issue while the original shared page retains all printed data');
  check.ok(dlMulti.text.includes('Dana Whitfield'), 'and carries the consumer-supplied details');
  await page.close();

  /* ---- 4. Benign report: no issue, no misleading reassurance. ---- */
  const benign = await setupPaidCase(service, 'bw-benign@example.test', 'US', 'US-CA');
  opened = await openCasePage(benign.email, benign.password, benign.caseId, ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor A  Balance $100  Opened 01/01/2018  Closed 01/01/2020']);
  page = opened.page;
  const benignBlock = await page.locator('#panel').innerText();
  check.equal(await page.locator('[data-check-issue], #create-packet').count(), 0, 'a benign report produces no selectable issue or packet action');
  check.ok(!/found no problems|all clear|no issues detected|you are fine|compliant/.test(benignBlock), 'without misleading reassurance');
  await page.close();

  /* ---- 5. Owned report history and comparison in the Wizzard (real browser). ---- */
  const hist = await setupHistoryAccount(service, 'bw-history@example.test');
  page = await (await browser.newContext()).newPage();
  page.setDefaultTimeout(20000);
  await page.goto(service.base + '/index.html#signin');
  await page.locator('#email').fill(hist.email);
  await page.locator('#password').fill(hist.password);
  await page.locator('#signin').click();
  await page.locator('#signin-skip-two-factor').click();
  await page.waitForSelector('#open');
  await page.locator('#steps button').filter({ hasText: 'Saved reports' }).click();
  await page.waitForSelector('#history-body');
  await page.waitForSelector('#compare');
  await page.waitForTimeout(400);
  const historyText = await page.locator('#history-body').innerText();
  check.ok(/Equifax/.test(historyText), 'the history shows the bureau');
  check.ok(/2025-06-01/.test(historyText) && /2026-06-01/.test(historyText), 'and both report dates');
  check.equal(await page.locator('#cmp-left option').count(), 2, 'the account can choose two of its own reports');
  await page.locator('#compare').click();
  await page.waitForSelector('#comparison .obs');
  await page.waitForTimeout(400);
  const comparisonText = await page.locator('#comparison').innerText();
  check.ok(/CHANGED/.test(comparisonText), 'the comparison shows the changed issue');
  check.ok(/First report:/.test(comparisonText) && /Second report:/.test(comparisonText), 'and both report identities');
  check.ok(/never proves/.test(comparisonText), 'with the absence note');
  await page.locator('#steps button[data-step="1"]').click();
  await page.waitForSelector(`[data-open="${hist.earlierCaseId}"]`);
  await page.locator(`[data-open="${hist.earlierCaseId}"]`).click();
  await page.waitForSelector('#current-report-identity');
  check.ok(/earlier\.pdf/.test(await page.locator('#current-report-identity').innerText()) && /2025-06-01/.test(await page.locator('#current-report-identity').innerText()), 'choosing a previous report opens Results labelled with that exact report');
  await page.locator('#steps button[data-step="1"]').click();
  await page.waitForSelector('#resume-latest');
  await page.locator('#resume-latest').click();
  await page.waitForSelector('#current-report-identity');
  check.ok(/later\.pdf/.test(await page.locator('#current-report-identity').innerText()) && /2026-06-01/.test(await page.locator('#current-report-identity').innerText()), 'Resume my latest report opens Results labelled with the latest saved report');
  await page.close();

  /* OWNER-PURCHASE-FLOW-001: the unpaid real-browser journey — upload, assess, free summary, teaser and the
     purchase choices, with a screenshot recorded as the visual evidence. It drives its own steps because the
     shared helper above continues into the subscriber packet journey. */
  const freeActor = await service.unpaidAccount('bw-free@example.test');
  const freeCase = (await service.request('POST', '/api/cases', { token: freeActor.token, body: { country: 'CA', region: 'CA-NS' } })).json.case;
  const freePage = await (await browser.newContext()).newPage();
  freePage.setDefaultTimeout(20000);
  await freePage.goto(service.base + '/index.html#signin');
  await freePage.locator('#email').fill('bw-free@example.test');
  await freePage.locator('#password').fill('a-long-enough-password');
  await freePage.locator('#signin').click();
  await freePage.locator('#signin-skip-two-factor').click();
  await freePage.waitForSelector('#open');
  const evaluateRoute = '**/api/cases/*/evaluate';
  let releaseAutomaticFailure, signalAutomaticStarted;
  const automaticStarted = new Promise(resolve => { signalAutomaticStarted = resolve; });
  const automaticFailureGate = new Promise(resolve => { releaseAutomaticFailure = resolve; });
  const failAutomaticCheck = async route => {
    signalAutomaticStarted();
    await automaticFailureGate;
    await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { message: 'Fictional temporary assessment interruption. Try again.' } }) });
  };
  await freePage.route(evaluateRoute, failAutomaticCheck);
  const freeUpload = await uploadNewReport(freePage, freeCase.case_id, ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026',
      'Fictional Creditor Opened 01/01/2020 Closed 01/01/2021 Balance $100', 'Account Number ****1234',
      'Fictional Creditor Opened 01/01/2020 Closed 01/01/2021 Balance $100', 'Account Number ****1234',
      'Fictional Other Creditor Opened 01/01/2020 Closed 01/01/2021 Status Open Balance $200.00'], [], async () => {
        await automaticStarted;
        try {
          await freePage.waitForSelector('#refresh-report');
          check.ok(/We are checking your report/.test(await freePage.locator('#panel').innerText()), 'automatic checking stays on the Results recovery screen while pending');
          check.equal(await freePage.locator('#buy-report_once, #checkout-report_once, #create-packet, #download-assessment').count(), 0, 'a pending automatic check offers no purchase or paid output before an assessment exists');
        } finally { releaseAutomaticFailure(); }
        await freePage.locator('#check-report').filter({ hasText: 'Try again to check my report' }).waitFor();
        check.ok(/Fictional temporary assessment interruption/.test(await freePage.locator('#panel').innerText()), 'failed automatic checking explains the failure and offers a retry in Results');
        check.equal(await freePage.locator('#buy-report_once, #checkout-report_once, #create-packet, #download-assessment').count(), 0, 'a failed automatic check cannot sell an unassessed report or expose paid output');
        await freePage.unroute(evaluateRoute, failAutomaticCheck);
        await freePage.locator('#check-report').click();
      });
  freeCase.case_id = freeUpload.caseId;
  check.equal(await freePage.locator('#steps button[data-step="2"], #steps button[data-step="4"]').count(), 0, 'free consumers also reach automatically checked Results without retired Wizard steps');
  const summaryText = await freePage.locator('#panel').innerText();
  check.ok(/SUMMARY — FREE/.test(summaryText) && /Reporting issues found: 2/.test(summaryText), 'the browser shows the two distinct issues to a free account');
  check.ok(!/violations:|potential issues:/.test(summaryText), 'without confidence tier counts');
  check.ok(/VIOLATION/.test(summaryText), 'with the sole consumer breach label');
  check.ok(/The same debt appears more than once/.test(summaryText) && /This is the most serious violation we found that you can dispute\./.test(summaryText),
    'the browser previews the higher-priority duplicate and explains why it was selected');
  check.equal((summaryText.match(/\bVIOLATION\b/g) || []).length, 1, 'the unpaid browser shows exactly one violation example');
  check.ok(/Unlock this report/.test(summaryText) && /\$15\.95 CAD/.test(summaryText) && /Monthly/.test(summaryText) && /Yearly/.test(summaryText), 'and the purchase choices with their recorded prices');
  check.ok(!/Check: /.test(summaryText) && !/id="packet-block"/.test(await freePage.content()), 'while the complete findings and the packet stay locked');
  const shot = `${process.env.TEMP || '.'}/crp-unpaid-summary.png`;
  await freePage.screenshot({ path: shot, fullPage: true });
  evidence.unpaid_summary_screenshot = shot;

  /* OWNER-PURCHASE-FLOW-001: the one-time button uses the selected assessed report, and a verified payment
     unlocks that same report in the browser — no second upload, no second assessment. */
  const checkoutRequest = freePage.waitForRequest(r => r.url().endsWith('/api/billing/checkout'));
  await freePage.locator('#buy-report_once').click();
  const submittedCheckout = (await checkoutRequest).postDataJSON();
  const returningUrl = new URL(submittedCheckout.return_url);
  check.equal(returningUrl.origin, new URL(freePage.url()).origin, 'checkout returns only to this application origin');
  check.equal(returningUrl.pathname, '/', 'checkout returns to the existing application page');
  check.equal(returningUrl.searchParams.get('report'), freeCase.case_id, 'checkout retains the selected report for the return');
  check.equal(returningUrl.searchParams.get('plan'), 'report_once', 'the return records the chosen one-report context, without granting access');
  check.equal(submittedCheckout.case_id, freeCase.case_id, 'checkout retains the selected assessed report');
  await freePage.waitForTimeout(1500);
  const afterCheckout = await freePage.content();
  check.ok(/Checkout opened\./.test(afterCheckout), 'the one-time button starts a checkout for the selected assessed report (test billing)');
  check.ok(!/Check: <b>/.test(afterCheckout), 'and opening a checkout unlocks nothing on its own');
  check.ok(/Unlock this report/.test(await freePage.locator('#panel').innerText()), 'so the report stays locked until the provider verifies the payment');
  await freePage.goto(submittedCheckout.return_url + '&payment=paid');
  await freePage.waitForSelector('#checkout-return-retry');
  check.ok(/not been confirmed/.test(await freePage.locator('#panel').innerText()), 'returning with a fake paid flag leaves the real report awaiting payment confirmation');
  check.equal(await freePage.locator('#create-packet, #download-assessment, #buy-report_once').count(), 0, 'pending confirmation grants no paid result or packet and asks for a refresh rather than another purchase');
  const pendingShot = `${process.env.TEMP || '.'}/crp-checkout-return-pending.png`;
  await freePage.screenshot({ path: pendingShot, fullPage: true });
  evidence.checkout_pending_screenshot = pendingShot;
  await service.pay(freeActor, 'report_once', freeCase.case_id);
  await freePage.locator('#checkout-return-retry').click();
  await freePage.waitForSelector('#download-assessment');
  await freePage.waitForTimeout(800);
  await freePage.locator('#steps button[data-step="3"]').click();
  await freePage.waitForTimeout(1500);
  const unlockedText = await freePage.locator('#panel').innerText();
  check.ok(/Reporting issues for your review/.test(unlockedText) && /Download this assessment \(PDF\)/.test(unlockedText) && await freePage.locator('#download-assessment').isVisible(), 'a verified payment unlocks the issue list and PDF download for the consumer in the browser');
  check.ok(!/Unlock this report/.test(unlockedText), 'and an unlocked report is offered its results instead of another purchase');
  const [paidReportDownload] = await Promise.all([freePage.waitForEvent('download'), freePage.locator('#download-assessment').click()]);
  const paidReportBytes = fs.readFileSync(await paidReportDownload.path());
  check.ok(/CRP-credit-report-review-.*\.pdf$/.test(paidReportDownload.suggestedFilename()), 'the paid browser control downloads a named PDF report');
  check.equal(paidReportBytes.subarray(0, 5).toString(), '%PDF-', 'the paid browser download contains actual PDF bytes');
  const paidReportText = require('../packet-pdf-assertions.cjs').pdfText(paidReportBytes);
  check.ok(/CREDIT REGULATOR PRO/.test(paidReportText) && /Fictional Creditor/.test(paidReportText), 'the branded report includes the consumer assessment agency names');
  check.ok(/Canada \/ Nova Scotia/.test(paidReportText) && /CAD 12\.00/.test(paidReportText), 'the browser PDF shows the selected location and authoritative upgrade price');
  const previousResult = (await service.request('GET', `/api/cases/${freeCase.case_id}`, { token: freeActor.token })).json.view.result_id;
  await freePage.locator('#go-subscribe').click(); await freePage.waitForSelector('#checkout-monthly');
  const subscriberRequest = freePage.waitForRequest(r => r.url().endsWith('/api/billing/checkout'));
  await freePage.locator('#checkout-monthly').click(); const subscriberReturn = (await subscriberRequest).postDataJSON().return_url;
  check.equal(new URL(subscriberReturn).searchParams.get('report'), freeCase.case_id, 'a subscription checkout also retains the selected report');
  await freePage.goto(subscriberReturn); await freePage.waitForSelector('#checkout-return-retry');
  check.equal(await freePage.locator('#create-packet').count(), 0, 'a one-report purchase cannot stand in for pending subscription access');
  await service.pay(freeActor, 'monthly'); await freePage.locator('#checkout-return-retry').click();
  await freePage.waitForSelector('#create-packet');
  check.equal((await service.request('GET', `/api/cases/${freeCase.case_id}`, { token: freeActor.token })).json.view.result_id, previousResult, 'paid subscription return restores the same result without asking for another upload or assessment');
  const restoredShot = `${process.env.TEMP || '.'}/crp-checkout-return-restored.png`;
  await freePage.screenshot({ path: restoredShot, fullPage: true });
  evidence.checkout_restored_screenshot = restoredShot;
  const foreignCase = await setupPaidCase(service, 'bw-return-foreign@example.test', 'CA', 'CA-NS');
  const foreignReply = freePage.waitForResponse(r => r.url().endsWith('/api/cases/' + foreignCase.caseId));
  await freePage.goto(new URL(freePage.url()).origin + '/?checkout=return&report=' + foreignCase.caseId + '&plan=monthly&payment=paid');
  check.equal((await foreignReply).status(), 403, 'a forged checkout return cannot read another account’s report');
  await freePage.waitForSelector('#checkout-return-retry');
  check.ok(/could not open your saved report/.test(await freePage.locator('#panel').innerText()), 'a denied return gives a plain retry message');
  check.equal(await freePage.locator('#create-packet, #packet-block').count(), 0, 'a denied return exposes no other account’s packet');
  await freePage.close();

  /* ---- 6. BLOCKER-REPORT-DATA-TO-ISSUE-001 (Batch 31): the court-limitation concern in the REAL browser, read by
     the GENERAL reader: a fictional Northwest Territories collection with an expired court-screening period.
     No fixed reporting period is declared for this general presentation in that jurisdiction. Court information
     remains separate from reporting findings and cannot enter a dispute packet. ---- */
  const limLines = [
    'Equifax  Consumer Credit Report - FICTIONAL TEST FIXTURE',
    'Report Date: 12 June 2026',
    'Collection Agency ABC  Balance $500  Past Due $500  Date of First Delinquency 01/01/2019'
  ];
  const limActor = await service.unpaidAccount('bw-ns-limitation-free@example.test');
  const limCase = (await service.request('POST', '/api/cases', { token: limActor.token, body: { country: 'CA', region: 'CA-NT' } })).json.case;
  const limPage = await (await browser.newContext()).newPage();
  limPage.setDefaultTimeout(20000);
  await limPage.goto(service.base + '/index.html#signin');
  await limPage.locator('#email').fill('bw-ns-limitation-free@example.test');
  await limPage.locator('#password').fill('a-long-enough-password');
  await limPage.locator('#signin').click();
  await limPage.locator('#signin-skip-two-factor').click();
  await limPage.waitForSelector('#open');
  await uploadNewReport(limPage, limCase.case_id, limLines);
  const limSummary = await limPage.locator('#panel').innerText();
  check.equal((limSummary.match(/Reporting issues found:\s*(\d+)/) || [])[1] || '0', '0',
    'the free summary excludes court information from reporting issue counts');
  check.ok(!/time limit for a court claim/.test(limSummary), 'court information is not a reporting issue teaser');
  check.ok(!/violations:|potential issues:/.test(limSummary),
    'without a confidence tier count or violation claim');
  /* OWNER correction (SOL assessment date): the free summary states the date the SERVER assessed the report. */
  check.ok(/Assessed on \d{4}-\d{2}-\d{2}/.test(limSummary), 'the free summary shows the date the report was assessed');
  check.ok(!/id="packet-block"/.test(await limPage.content()), 'while the complete findings and the packet stay locked');
  await limPage.close();

  const gen = await setupPaidCase(service, 'bw-ns-limitation@example.test', 'CA', 'CA-NT');
  opened = await openCasePage(gen.email, gen.password, gen.caseId, limLines);
  const genPage = opened.page;
  /* The complete assessment (step 3) states the date it was assessed; the packet step follows. */
  await genPage.locator('#steps button[data-step="3"]').click();
  await genPage.waitForTimeout(700);
  const genPanelText = await genPage.locator('#panel').innerText();
  check.ok(/Assessed on \d{4}-\d{2}-\d{2}/.test(genPanelText), 'the complete assessment states the date it was assessed');
  check.ok(/Information about court time limits/.test(genPanelText), 'paid results separate court information from reporting issues');
  check.ok(/INFORMATION/.test(genPanelText), 'court cards show INFORMATION');
  check.ok(!/ask the bureau|please verify.*court|Please verify.*payment/.test(genPanelText), 'court information makes no bureau inquiry');
  check.equal(await genPage.locator('[data-check-issue]').count(), 0, 'court-only results have no dispute checkbox');
  check.equal(await genPage.locator('#packet-download').count(), 0, 'court-only results cannot download a dispute packet');
  evidence.limitation_browser = { reporting_issue_count: 0, court_information_only: true, packet_candidate: false };
  await genPage.close();

  /* ---- 7. OWNER dual-date retention (Batch 33): a reporting period that has ENDED since the report was issued,
     in the REAL browser, from the free summary through the subscriber packet. The assessment clock is pinned so
     the case never depends on the day the suite runs, and the correspondence asks about the CURRENT file rather
     than asserting that anything is still being reported. ---- */
  const dualLines = [
    'Equifax  Consumer Credit Report - FICTIONAL TEST FIXTURE',
    'Report Date: 12 June 2026',
    'Collection Agency ABC  Balance $500  Past Due $500  Date of First Delinquency 01 June 2019'
  ];
  const dualActor = await service.unpaidAccount('bw-dual-date-free@example.test');
  const dualCase = (await service.request('POST', '/api/cases', { token: dualActor.token, body: { country: 'US', region: 'US-CA' } })).json.case;
  const dualPage = await (await browser.newContext()).newPage();
  dualPage.setDefaultTimeout(20000);
  const previousClock = process.env.CRP_ASSESSMENT_CLOCK_AT;
  process.env.CRP_ASSESSMENT_CLOCK_AT = '2027-06-13T12:00:00Z';
  try {
    await dualPage.goto(service.base + '/index.html#signin');
    await dualPage.locator('#email').fill('bw-dual-date-free@example.test');
    await dualPage.locator('#password').fill('a-long-enough-password');
    await dualPage.locator('#signin').click();
    await dualPage.locator('#signin-skip-two-factor').click();
    await dualPage.waitForSelector('#open');
    await uploadNewReport(dualPage, dualCase.case_id, dualLines);
    const dualSummary = await dualPage.locator('#panel').innerText();
    check.ok(!/too old to report|most serious violation|\bVIOLATION\b/.test(dualSummary),
      'later-expiry review alone does not become a free VIOLATION example');
    check.ok(/Assessed on \d{4}-\d{2}-\d{2}/.test(dualSummary), 'and states the date the report was assessed');
    check.ok(!/id="packet-block"/.test(await dualPage.content()), 'while the complete assessment stays locked for a free account');
  } finally {
    if (previousClock === undefined) delete process.env.CRP_ASSESSMENT_CLOCK_AT;
    else process.env.CRP_ASSESSMENT_CLOCK_AT = previousClock;
    await dualPage.close();
  }

  const dualSub = await setupPaidCase(service, 'bw-dual-date@example.test', 'US', 'US-CA');
  const dualOpened = await withDualClockBrowser(dualSub, dualLines);
  /* The complete assessment is the results step; the packet step follows. */
  await dualOpened.page.locator('#steps button[data-step="3"]').click();
  // Leaving packet review saves selection before Results renders; await the destination, not elapsed time.
  await dualOpened.page.waitForSelector('#result-select');
  const dualPanel = await dualOpened.page.locator('#panel').innerText();
  check.ok(/Report issued: 2026-06-12/.test(dualPanel), 'the complete assessment shows the date the report was issued');
  check.ok(/the reporting period appears to end 2026-11-28/.test(dualPanel), 'and the date the period appears to end');
  check.ok(/arose through the passage of time/.test(dualPanel), 'and that the concern arose through the passage of time');
  check.ok(/Date of first delinquency on the collection entry/.test(dualPanel), 'and names the printed field the way the report does');
  const dualBlock = await dualOpened.page.locator('[data-issue-group]').innerText();
  check.ok(/too old to report/.test(dualBlock), 'the subscriber packet offers the current-review concern to select');
  await accountContact(dualOpened.page, 'Robin Alvarez', 'robin.alvarez@example.test');
  await saveReadApprove(dualOpened.page);
  await dualOpened.page.waitForTimeout(700);
  const dualDownload = await downloadText(dualOpened.page);
  check.ok(/remains on my current file/.test(comparableText(dualDownload.text)), 'and the downloaded packet asks whether the entry remains on the current file');
  check.ok(/whether its reporting period has expired/.test(comparableText(dualDownload.text)), 'and whether its reporting period has expired');
  check.ok(!/established reporting issue/i.test(dualDownload.text), 'without claiming anything is still being reported');
  evidence.dual_date_browser = { free_summary: 'the teaser names an entry that may now be too old to report', packet: dualDownload.filename };
  await dualOpened.page.close();

  /* ---- Original report pages: include exact relevant earlier/current pages automatically, retaining originals for owned review. ---- */
  const copyActor = await service.unpaidAccount('bw-report-copies@example.test');
  await service.pay(copyActor, 'monthly');
  const copyLines = (reportYear, missedYear) => ['Equifax Consumer Credit Report - FICTIONAL TEST FIXTURE', `Report Date: June 12, ${reportYear}`, 'Creditor A Balance $100', 'Account Number ****1234', 'Status: Charged Off', 'Opened 01/01/2010', `First Delinquency Date 01/01/${missedYear}`, 'Last Payment Date 01/01/2017'];
  const extraCopyPage = { lines: ['FICTIONAL UNRELATED REPORT NOTES', 'This unrelated second page must stay outside the dispute packet.'] };
  const earlierBytes = buildPdf({ pages: [{ lines: copyLines('2025', '2018') }, extraCopyPage] });
  const earlierCase = (await service.request('POST', '/api/cases', { token: copyActor.token, body: { country: 'US', region: 'US-CA' } })).json.case;
  check.equal((await service.request('POST', `/api/cases/${earlierCase.case_id}/files`, { token: copyActor.token, body: { originalFilename: 'earlier-report.pdf', declaredBytes: earlierBytes.length, mimeType: 'application/pdf', contentBase64: earlierBytes.toString('base64') } })).status, 201, 'the earlier original report uploads through the real service');
  check.equal((await service.request('POST', `/api/cases/${earlierCase.case_id}/evaluate`, { token: copyActor.token })).status, 201, 'the earlier report is assessed for the owned comparison');
  const currentCase = (await service.request('POST', '/api/cases', { token: copyActor.token, body: { country: 'US', region: 'US-CA' } })).json.case;
  const copies = await openCasePage('bw-report-copies@example.test', 'a-long-enough-password', currentCase.case_id, copyLines('2026', '2020'), [extraCopyPage]);
  currentCase.case_id = copies.caseId;
  const copyPage = copies.page;
  check.equal(await copyPage.locator('#packet-preparation-content').count(), 0, 'Results keeps preparation content out of issue selection');
  await accountContact(copyPage, 'Fictional Copy Consumer', 'copy-consumer@example.test');
  await copyPage.waitForSelector('#packet-save');
  const firstCopyPreview = copyPage.waitForResponse(response => response.url().endsWith('/packet') && response.request().method() === 'GET');
  await copyPage.locator('#packet-save').click(); await (await firstCopyPreview).finished();
  await copyPage.waitForSelector('#packet-all-pages .packet-page');
  const copyPacketUrl = new URL(`/api/cases/${currentCase.case_id}/packet`, copyPage.url()).href;
  const copyView = (await (await copyPage.request.get(copyPacketUrl)).json()).view;
  const originals = copyView.packet.report_exhibits;
  check.equal(originals.length, 2, 'a saved re-aging dispute offers both original earlier and current reports');
  check.ok(originals.every(report => report.selected === true), 'the relevant earlier and current pages are included automatically');
  check.equal(copyView.packet.approved, false, 'the user reviews all included pages before acknowledging and approving the first saved preview');
  check.ok(originals.some(report => report.roles.includes('EARLIER')) && originals.some(report => report.roles.includes('CURRENT')), 'the assembled packet distinguishes its earlier and current original report');
  check.ok(originals.every(report => report.relevant_pages.length === 1 && report.relevant_pages[0] === 1), 'the relevant page of each source report is included without another consumer choice');
  await copyPage.waitForFunction(() => {
    const images = [...document.querySelectorAll('#packet-all-pages .packet-page-image')];
    return images.length > 0 && images.every(image => image.complete && image.naturalWidth > 0);
  });
  const copyMetadata = await (await copyPage.request.get(service.base + '/api/cases/' + currentCase.case_id + '/packet/preview/pages?version=' + encodeURIComponent(copyView.packet.preview_version))).json();
  check.equal(await copyPage.locator('#packet-all-pages .packet-page').count(), copyMetadata.page_count, 'the complete inline review shows every physical packet page');
  await copyPage.locator('#steps button[data-step="5"]').click();
  await copyPage.waitForSelector('#packet-reports');
  for (const original of originals) {
    const originalFetch = copyPage.waitForResponse(response => response.url() === new URL(original.review_url, copyPage.url()).href);
    const [originalPage] = await Promise.all([
      copyPage.context().waitForEvent('page'),
      copyPage.locator(`#packet-reports a[href="${original.review_url}"]`).click()
    ]);
    await originalPage.waitForURL('blob:**');
    await originalPage.waitForLoadState();
    const originalResponse = await originalFetch;
    check.equal(originalResponse.status(), 200, 'the actual original-report link opens the authorized original-copy endpoint');
    check.ok((await originalResponse.body()).equals(original.roles.includes('EARLIER') ? earlierBytes : copies.reportBytes), 'the opened whole report has the exact original uploaded bytes');
    await originalPage.close();
    check.equal(await copyPage.locator(`[data-packet-report="${original.file_id}"]`).isChecked(), true, 'opening the original retains its automatically included relevant page');
    check.equal(await copyPage.locator(`[data-packet-report="${original.file_id}"]`).isVisible(), false, 'mandatory source pages have no repeated include choice');
  }
  await copyPage.locator('#steps button[data-step="6"]').click();
  await copyPage.waitForSelector('#packet-preview-reviewed');
  await copyPage.locator('#packet-preview-reviewed').check(); await copyPage.locator('#packet-approve').click();
  const includedView = (await (await copyPage.request.get(copyPacketUrl)).json()).view;
  check.ok(/first page is instructions for you only.*Remove it before mailing/s.test(await copyPage.locator('#packet-ready-status').innerText()), 'ready message explicitly excludes the instruction sheet from mailing');
  const withCopies = await downloadText(copyPage);
  check.equal(includedView.packet.report_attachment_manifest.length, 2, 'the approved packet binds both original source reports');
  check.ok(withCopies.text.includes('First Delinquency Date 01/01/2018') && withCopies.text.includes('First Delinquency Date 01/01/2020'), 'both exact relevant source pages appear inline in the same downloaded PDF');
  check.ok(!withCopies.text.includes('FICTIONAL UNRELATED REPORT NOTES'), 'the unrelated second page of each report is omitted');
  const copyPreviewResponse = await copyPage.request.get(new URL(includedView.packet.letter_preview_url, copyPage.url()).href);
  check.ok(withCopies.bytes.equals(await copyPreviewResponse.body()), 'the complete two-report download equals the reviewed inline PDF');
  const mutations = [];
  const observeMutation = request => { if (request.method() === 'POST' && /\/packet\//.test(request.url())) mutations.push(request.url()); };
  copyPage.on('request', observeMutation);
  await copyPage.locator('#steps button[data-step="3"]').click();
  await copyPage.waitForSelector('#result-select');
  await copyPage.locator('#steps button[data-step="6"]').click();
  await copyPage.waitForSelector('#packet-download');
  const returnedView = (await (await copyPage.request.get(copyPacketUrl)).json()).view;
  check.equal(mutations.length, 0, 'unchanged navigation sends no mutating packet requests');
  check.equal(returnedView.packet.approved, true, 'approval survives unchanged navigation');
  check.equal(returnedView.packet.preview_version, includedView.packet.preview_version, 'unchanged navigation retains reviewed version');
  check.ok((await downloadText(copyPage)).bytes.equals(withCopies.bytes), 'returning retains exact approved PDF bytes');
  await editLetter(copyPage, value => value + '\nPlease verify these entries against the enclosed report copies.');
  await copyPage.locator('#steps button[data-step="3"]').click();
  await copyPage.waitForSelector('#result-select');
  const editedView = (await (await copyPage.request.get(copyPacketUrl)).json()).view;
  check.ok(mutations.length > 0, 'intentional changes are saved when leaving review');
  check.equal(editedView.packet.approved, false, 'material edits still invalidate approval');
  check.equal((await copyPage.request.get(new URL('/api/cases/' + currentCase.case_id + '/packet-download', copyPage.url()).href)).status(), 409, 'changed packet requires fresh review before download');
  copyPage.off('request', observeMutation);
  const reportChoiceShot = `${process.env.TEMP || '.'}/crp-original-report-copy-review.png`;
  await copyPage.screenshot({ path: reportChoiceShot, fullPage: true }); evidence.report_copy_review_screenshot = reportChoiceShot;
  await copyPage.close();
  evidence.original_report_copies = { available: 2, default_selected: 2, automatically_included: 2, relevant_pages_included: true, single_pdf: true, original_review_bytes_retained: true, whole_file_pages: 2, included_page: 1, unrelated_pages_omitted: true };
  evidence.browser = 'real-browser Wizzard acceptance: potential + probable + partial selection + edit-after-approval + benign, all via Playwright + local Chrome against the loopback service';
  evidence.fixtures = 'all reports are buildPdf fictional fixtures with fictional data; no real consumer identifier or private report';
  return evidence;
  } catch (error) {
    const pages = browser.contexts().flatMap(context => context.pages());
    const last = pages[pages.length - 1];
    const context = last ? await last.locator('#panel').innerText().catch(() => '') : '';
    throw new Error(String(error.message).replace(/\n/g, ' | ') + ' | page: ' + (last?.url() || '') + ' | panel: ' + context.slice(0, 1000).replace(/\n/g, ' | '));
  } finally {
    await browser.close();
  }
}

module.exports = { run, id: 'bw-browser-wizzard', title: 'OWNER-POTENTIAL-ISSUE-001: real-browser Wizzard acceptance (potential/probable/partial-selection/edit-after-approval/benign)' };
