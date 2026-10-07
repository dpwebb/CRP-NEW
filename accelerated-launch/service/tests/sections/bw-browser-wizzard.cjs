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
  };
  await assessOne('Equifax', 'June 1, 2025', '01/01/2020', '01/01/2019', 'earlier.pdf');
  await assessOne('Equifax', 'June 1, 2026', '01/01/2021', '01/01/2020', 'later.pdf');
  return { email, password };
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

  async function openCasePage(email, password, caseId, lines) {
    const context = await browser.newContext();
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    await page.goto(service.base + '/');
    await page.locator('#email').fill(email);
    await page.locator('#password').fill(password);
    await page.locator('#signin').click();
    await page.waitForSelector('#open');
    await page.locator('#refresh').click();
    await page.waitForSelector(`[data-open="${caseId}"]`);
    await page.locator(`[data-open="${caseId}"]`).click();
    await page.locator('#steps button[data-step="2"]').click();
    await page.waitForSelector('#file');
    await page.locator('#file').setInputFiles({ name: 'fictional-report.pdf', mimeType: 'application/pdf', buffer: buildPdf({ pages: [{ lines }] }) });
    await page.locator('#upload').click();
    await page.waitForFunction(() => document.body.innerText.includes('Saved; read where possible'), null, { timeout: 15000 });
    await page.locator('#steps button[data-step="3"]').click();
    await page.waitForSelector('#evaluate');
    await page.locator('#evaluate').click();
    await page.waitForFunction(() => document.body.innerText.includes('Checks run'), null, { timeout: 15000 });
    await page.locator('#steps button[data-step="4"]').click();
    await page.waitForSelector('#packet-block');
    await page.waitForTimeout(600);
    return { page, context };
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
    return { status: 200, filename: download.suggestedFilename(), text: fs.readFileSync(filePath, 'utf8') };
  }

  /* ---- 1. Common potential issue + change wording after approval, then download matches the approved content. ---- */
  const pot = await setupPaidCase(service, 'bw-pot@example.test', 'US', 'US-CA');
  let opened = await openCasePage(pot.email, pot.password, pot.caseId, ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor A  Balance $100  Opened 01/01/2020  Closed 01/01/2019']);
  let page = opened.page;
  check.equal(await page.locator('[data-check-issue]').count(), 1, 'the common potential issue renders as one selectable card');
  const potBlock = await page.locator('#packet-block').innerText();
  check.ok(/opened date later than its closed date/.test(potBlock), 'with readable evidence and the affirmative concern');
  check.ok(/which date needs correction/.test(potBlock), 'with specific uncertainty about the correction');
  check.ok(/01\/01\/2020/.test(potBlock), 'with the printed raw readings');
  check.ok(/Who this correspondence goes to/.test(potBlock), 'the consumer review states who the correspondence is addressed to');
  check.ok(/consumer reporting agency that issued this report/.test(potBlock), 'as a recipient TYPE, with no invented address');
  check.ok(/Review the correspondence and evidence/.test(potBlock), 'and shows the correspondence and the evidence each request rests on');
  await page.locator('[data-check-issue]').first().check();
  await page.locator('#packet-wording').fill('Please verify these two dates.');
  await page.locator('#packet-name').fill('Dana Whitfield');
  await page.locator('#packet-contact').fill('dana.whitfield@example.test');
  await page.locator('#packet-approve').click();
  await page.waitForTimeout(500);
  check.equal(await page.locator('#packet-download').isEnabled(), true, 'download is enabled right after approval');
  await page.locator('#packet-contact').fill('changed-reply@example.test');
  await page.waitForTimeout(300);
  check.equal(await page.locator('#packet-download').isDisabled(), true, 'editing a correspondence detail after approval disables download');
  await page.locator('#packet-wording').fill('CHANGED WORDS AFTER APPROVAL');
  await page.waitForTimeout(300);
  check.equal(await page.locator('#packet-download').isDisabled(), true, 'editing wording after approval disables download');
  await page.locator('#packet-approve').click();
  await page.waitForTimeout(500);
  const dl1 = await downloadText(page);
  check.equal(dl1.status, 200, 're-approving the changed version re-enables download');
  check.ok(/^CRP-correction-packet-case_.+\.txt$/.test(dl1.filename), 'the browser wrote the real packet FILE (not just an API response)');
  check.ok(/opened date later than its closed date/.test(dl1.text), 'and the packet matches the selected approved content');
  check.ok(dl1.text.includes('CHANGED WORDS AFTER APPROVAL'), 'carrying the changed wording');
  check.ok(dl1.text.includes('01/01/2020'), 'and the printed raw reading');
  check.ok(/^CORRESPONDENCE TO SEND/m.test(dl1.text) && /^EVIDENCE REFERENCES \(from your report\)$/m.test(dl1.text), 'and the organized correspondence and evidence-reference sections');
  check.ok(dl1.text.includes('Dana Whitfield') && dl1.text.includes('changed-reply@example.test'), 'carrying the correspondence details the consumer approved');
  check.ok(!dl1.text.includes('dana.whitfield@example.test'), 'and not the detail that was replaced before approval');
  check.ok(!/not legal advi/i.test(dl1.text), 'with no legal-advice disclaimer');
  check.equal(dl1.text.split('\n').filter((l) => l.trim()).length > 20, true, 'and reads as a complete correspondence, not a raw debug dump');
  check.ok(!/established reporting issue/.test(dl1.text), 'never asserting a definite breach');
  await page.locator('#steps button').filter({ hasText: 'Case and deletion' }).click();
  await page.waitForSelector('#privacyInventory');
  check.ok(/Delete this case/.test(await page.locator('#panel').innerText()), 'real-browser named case navigation preserves deletion controls');
  await page.locator('#steps button').filter({ hasText: 'Support' }).click();
  await page.waitForSelector('#copyReference');
  check.ok(/Your support reference/.test(await page.locator('#panel').innerText()), 'real-browser named support navigation loads its owned reference');
  await page.locator('#steps button').filter({ hasText: 'Billing' }).click();
  await page.waitForFunction(() => document.getElementById('billingView')?.innerText.includes('Plans and prices'));
  check.ok(/Plans and prices/.test(await page.locator('#panel').innerText()), 'real-browser named billing navigation loads purchase and access state');
  await page.close();

  /* ---- 2. Qualified probable retention issue (US-NY adverse rating). ---- */
  const prob = await setupPaidCase(service, 'bw-prob@example.test', 'US', 'US-NY');
  opened = await openCasePage(prob.email, prob.password, prob.caseId, ['Experian Consumer Credit Report - FICTIONAL TEST FIXTURE', 'Report Date: June 12, 2026', 'Account 30 days past due as of Jun 2015']);
  page = opened.page;
  const probBlock = await page.locator('#packet-block').innerText();
  check.equal(await page.locator('#packet-block [data-check-issue]').count(), 1,
    'the qualified reporting-period issue is one coherent selectable concern');
  check.deepEqual(await page.locator('#packet-block .pill').allTextContents(), ['VIOLATION'],
    'the supported issue uses the sole consumer breach term required by the latest owner amendment');
  check.ok(/entry older than the ordinary reporting period|not shown to be absent/.test(probBlock), 'with the affirmative concern and the exception uncertainty');
  check.ok(!/ESTABLISHED REPORTING ISSUE/.test(probBlock), 'never an established issue');
  await page.close();

  /* ---- 3. Multiple issues: select only one, download contains only that one. ---- */
  const multi = await setupPaidCase(service, 'bw-multi@example.test', 'US', 'US-CA');
  opened = await openCasePage(multi.email, multi.password, multi.caseId, ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor A  Balance $100  Opened 01/01/2020  Closed 01/01/2019', 'Creditor B  Balance $200  Opened 01/01/2021  Closed 01/01/2020']);
  page = opened.page;
  check.equal(await page.locator('[data-check-issue]').count(), 2, 'two issues render for the two contradictory accounts');
  const labels = await page.locator('#packet-block .issue-select strong').allInnerTexts();
  check.equal(labels.length, 2, 'each is a distinct selectable card');
  await page.locator('[data-check-issue]').first().check();
  /* A missing necessary correspondence detail refuses approval: no packet that cannot be sent can be downloaded. */
  check.ok(/Add your name/.test(await page.locator('#packet-block').innerText()), 'the review names the necessary detail that is still missing');
  await page.locator('#packet-approve').click();
  await page.waitForTimeout(500);
  check.equal(await page.locator('#packet-download').isDisabled(), true, 'approval without the necessary correspondence details leaves the download unavailable');
  await page.locator('#packet-name').fill('Dana Whitfield');
  await page.locator('#packet-contact').fill('dana.whitfield@example.test');
  await page.locator('#packet-approve').click();
  await page.waitForTimeout(500);
  const dlMulti = await downloadText(page);
  check.equal(dlMulti.status, 200, 'the packet downloads with the partial selection');
  check.ok(dlMulti.text.includes('credit account 1'), 'and contains only the selected issue');
  check.ok(!dlMulti.text.includes('credit account 2'), 'never the unselected issue');
  const multiCorrespondence = dlMulti.text.split('EVIDENCE REFERENCES')[0];
  check.equal(!/credit account 2/.test(multiCorrespondence), true, 'the correspondence itself covers only the selected issue');
  check.ok(dlMulti.text.includes('Dana Whitfield'), 'and carries the consumer-supplied details');
  await page.close();

  /* ---- 4. Benign report: no issue, no misleading reassurance. ---- */
  const benign = await setupPaidCase(service, 'bw-benign@example.test', 'US', 'US-CA');
  opened = await openCasePage(benign.email, benign.password, benign.caseId, ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor A  Balance $100  Opened 01/01/2018  Closed 01/01/2020']);
  page = opened.page;
  const benignBlock = await page.locator('#packet-block').innerText();
  check.ok(/No issue on this case is eligible/.test(benignBlock), 'a benign report produces no selectable issue');
  check.ok(!/found no problems|all clear|no issues detected|you are fine|compliant/.test(benignBlock), 'without misleading reassurance');
  await page.close();

  /* ---- 5. Owned report history and comparison in the Wizzard (real browser). ---- */
  const hist = await setupHistoryAccount(service, 'bw-history@example.test');
  page = await (await browser.newContext()).newPage();
  page.setDefaultTimeout(20000);
  await page.goto(service.base + '/');
  await page.locator('#email').fill(hist.email);
  await page.locator('#password').fill(hist.password);
  await page.locator('#signin').click();
  await page.waitForSelector('#open');
  await page.locator('#steps button').filter({ hasText: 'Report history' }).click();
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
  await page.close();

  /* OWNER-PURCHASE-FLOW-001: the unpaid real-browser journey — upload, assess, free summary, teaser and the
     purchase choices, with a screenshot recorded as the visual evidence. It drives its own steps because the
     shared helper above continues into the subscriber packet journey. */
  const freeActor = await service.unpaidAccount('bw-free@example.test');
  const freeCase = (await service.request('POST', '/api/cases', { token: freeActor.token, body: { country: 'CA', region: 'CA-NS' } })).json.case;
  const freePage = await (await browser.newContext()).newPage();
  freePage.setDefaultTimeout(20000);
  await freePage.goto(service.base + '/');
  await freePage.locator('#email').fill('bw-free@example.test');
  await freePage.locator('#password').fill('a-long-enough-password');
  await freePage.locator('#signin').click();
  await freePage.waitForSelector('#open');
  await freePage.locator('#refresh').click();
  await freePage.waitForSelector(`[data-open="${freeCase.case_id}"]`);
  await freePage.locator(`[data-open="${freeCase.case_id}"]`).click();
  await freePage.locator('#steps button[data-step="2"]').click();
  await freePage.waitForSelector('#file');
  await freePage.locator('#file').setInputFiles({
    name: 'fictional-report.pdf',
    mimeType: 'application/pdf',
    buffer: buildPdf({ pages: [{ lines: ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor A  Balance $100  Opened 01/01/2020  Closed 01/01/2019'] }] })
  });
  await freePage.locator('#upload').click();
  await freePage.waitForFunction(() => /Your report is uploaded/.test(document.getElementById('panel').innerText), null, { timeout: 20000 });
  const reportText = await freePage.locator('#panel').innerText();
  check.ok(/Your report is uploaded/.test(reportText) && /Check my report/.test(reportText), 'the browser offers the check action with no purchase recorded');
  /* OWNER-PURCHASE-FLOW-001: with no completed assessment there is nothing to unlock, so the browser guides the
     consumer to run the checks instead of starting a payment. */
  await freePage.locator('#steps button[data-step="3"]').click();
  await freePage.waitForTimeout(800);
  const bareResults = await freePage.locator('#panel').innerText();
  check.ok(/Run the checks above to see your results\./.test(bareResults), 'an unassessed report guides the consumer to run the checks');
  check.ok(!/buy-report_once/.test(await freePage.content()), 'and offers no purchase for a report with no completed assessment');
  await freePage.locator('#steps button[data-step="2"]').click();
  await freePage.waitForTimeout(600);
  await freePage.locator('#check-report').click();
  await freePage.waitForTimeout(3000);
  await freePage.locator('#steps button[data-step="3"]').click();
  await freePage.waitForTimeout(1200);
  const summaryText = await freePage.locator('#panel').innerText();
  check.ok(/SUMMARY — FREE/.test(summaryText) && /Reporting issues found: 1/.test(summaryText), 'the browser shows the distinct issue count to a free account');
  check.ok(!/violations:|potential issues:/.test(summaryText), 'without confidence tier counts');
  check.ok(/VIOLATION/.test(summaryText), 'with the sole consumer breach label');
  check.ok(/Unlock this report/.test(summaryText) && /\$5\.95 CAD/.test(summaryText) && /Monthly/.test(summaryText) && /Annual/.test(summaryText), 'and the purchase choices with their recorded prices');
  check.ok(!/Check: /.test(summaryText) && !/id="packet-block"/.test(await freePage.content()), 'while the complete findings and the packet stay locked');
  const shot = `${process.env.TEMP || '.'}/crp-unpaid-summary.png`;
  await freePage.screenshot({ path: shot, fullPage: true });
  evidence.unpaid_summary_screenshot = shot;

  /* OWNER-PURCHASE-FLOW-001: the one-time button uses the selected assessed report, and a verified payment
     unlocks that same report in the browser — no second upload, no second assessment. */
  const checkoutRequest = freePage.waitForRequest(r => r.url().endsWith('/api/billing/checkout'));
  await freePage.locator('#buy-report_once').click();
  const submittedCheckout = (await checkoutRequest).postDataJSON();
  check.equal(submittedCheckout.return_url, new URL(freePage.url()).origin + '/', 'checkout carries this application origin as its return URL');
  check.equal(submittedCheckout.case_id, freeCase.case_id, 'checkout retains the selected assessed report');
  await freePage.waitForTimeout(1500);
  const afterCheckout = await freePage.content();
  check.ok(/Checkout opened\./.test(afterCheckout), 'the one-time button starts a checkout for the selected assessed report (test billing)');
  check.ok(!/Check: <b>/.test(afterCheckout), 'and opening a checkout unlocks nothing on its own');
  check.ok(/Unlock this report/.test(await freePage.locator('#panel').innerText()), 'so the report stays locked until the provider verifies the payment');
  await service.pay(freeActor, 'report_once', freeCase.case_id);
  await freePage.locator('#steps button[data-step="1"]').click();
  await freePage.waitForSelector('#refresh');
  await freePage.locator('#refresh').click();
  await freePage.waitForSelector(`[data-open="${freeCase.case_id}"]`);
  await freePage.locator(`[data-open="${freeCase.case_id}"]`).click();
  await freePage.waitForTimeout(800);
  await freePage.locator('#steps button[data-step="3"]').click();
  await freePage.waitForTimeout(1500);
  const unlockedText = await freePage.locator('#panel').innerText();
  check.ok(/Reporting issues for your review/.test(unlockedText) && /Download my assessment/.test(unlockedText), 'a verified payment unlocks the issue list for the consumer in the browser');
  check.ok(!/Unlock this report/.test(unlockedText), 'and an unlocked report is offered its results instead of another purchase');
  await freePage.close();

  /* ---- 6. BLOCKER-REPORT-DATA-TO-ISSUE-001 (Batch 31): the court-limitation concern in the REAL browser, read by
     the GENERAL reader: a fictional Nova Scotia collection entry whose own printed delinquency date is outside the
     recorded period. An unpaid account sees it in the free summary and teaser; a subscriber selects it, and the
     downloaded packet asks for the dates to be verified without claiming that any rule was broken. ---- */
  const limLines = [
    'Equifax  Consumer Credit Report - FICTIONAL TEST FIXTURE',
    'Report Date: 12 June 2026',
    'Collection Agency ABC  Balance $500  Past Due $500  Date of First Delinquency 01/01/2019'
  ];
  const limActor = await service.unpaidAccount('bw-ns-limitation-free@example.test');
  const limCase = (await service.request('POST', '/api/cases', { token: limActor.token, body: { country: 'CA', region: 'CA-NS' } })).json.case;
  const limPage = await (await browser.newContext()).newPage();
  limPage.setDefaultTimeout(20000);
  await limPage.goto(service.base + '/');
  await limPage.locator('#email').fill('bw-ns-limitation-free@example.test');
  await limPage.locator('#password').fill('a-long-enough-password');
  await limPage.locator('#signin').click();
  await limPage.waitForSelector('#open');
  await limPage.locator('#refresh').click();
  await limPage.waitForSelector(`[data-open="${limCase.case_id}"]`);
  await limPage.locator(`[data-open="${limCase.case_id}"]`).click();
  await limPage.locator('#steps button[data-step="2"]').click();
  await limPage.waitForSelector('#file');
  await limPage.locator('#file').setInputFiles({ name: 'fictional-report.pdf', mimeType: 'application/pdf', buffer: buildPdf({ pages: [{ lines: limLines }] }) });
  await limPage.locator('#upload').click();
  await limPage.waitForFunction(() => /Your report is uploaded/.test(document.getElementById('panel').innerText), null, { timeout: 20000 });
  await limPage.locator('#check-report').click();
  await limPage.waitForTimeout(3000);
  await limPage.locator('#steps button[data-step="3"]').click();
  await limPage.waitForTimeout(1200);
  const limSummary = await limPage.locator('#panel').innerText();
  check.equal((limSummary.match(/Reporting issues found:\s*(\d+)/) || [])[1] || null, '1',
    'the free summary counts the court-limitation concern exactly once');
  check.ok(/time limit for a court claim/.test(limSummary), 'and the teaser names the court time limit, not a broken rule');
  check.ok(!/violations:|potential issues:/.test(limSummary),
    'without a confidence tier count or violation claim');
  /* OWNER correction (SOL assessment date): the free summary states the date the SERVER assessed the report. */
  check.ok(/Assessed on \d{4}-\d{2}-\d{2}/.test(limSummary), 'the free summary shows the date the report was assessed');
  check.ok(!/id="packet-block"/.test(await limPage.content()), 'while the complete findings and the packet stay locked');
  await limPage.close();

  const gen = await setupPaidCase(service, 'bw-ns-limitation@example.test', 'CA', 'CA-NS');
  opened = await openCasePage(gen.email, gen.password, gen.caseId, limLines);
  const genPage = opened.page;
  /* The complete assessment (step 3) states the date it was assessed; the packet step follows. */
  await genPage.locator('#steps button[data-step="3"]').click();
  await genPage.waitForTimeout(700);
  const genPanelText = await genPage.locator('#panel').innerText();
  check.ok(/Assessed on \d{4}-\d{2}-\d{2}/.test(genPanelText), 'the complete assessment states the date it was assessed');
  await genPage.locator('#steps button[data-step="4"]').click();
  await genPage.waitForSelector('#packet-block');
  await genPage.waitForTimeout(600);
  const genBlock = await genPage.locator('#packet-block').innerText();
  check.ok(/time limit for a court claim/.test(genBlock), 'the subscriber packet offers the limitation concern to select');
  await genPage.locator('[data-check-issue]').first().check();
  await genPage.locator('#packet-name').fill('Robin Alvarez');
  await genPage.locator('#packet-contact').fill('robin.alvarez@example.test');
  await genPage.locator('#packet-approve').click();
  await genPage.waitForTimeout(700);
  check.equal(await genPage.locator('#packet-download').isEnabled(), true, 'and approval enables the download');
  const genDownload = await downloadText(genPage);
  check.ok(/may be outside the time limit for a court claim/.test(genDownload.text),
    'the downloaded packet asks whether the debt is outside the time limit for a court claim');
  check.ok(!/violation|ESTABLISHED REPORTING ISSUE/i.test(genDownload.text), 'while claiming no reporting violation');
  evidence.limitation_browser = { summary: 'the free summary names the court time limit', packet: genDownload.filename };
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
    await dualPage.goto(service.base + '/');
    await dualPage.locator('#email').fill('bw-dual-date-free@example.test');
    await dualPage.locator('#password').fill('a-long-enough-password');
    await dualPage.locator('#signin').click();
    await dualPage.waitForSelector('#open');
    await dualPage.locator('#refresh').click();
    await dualPage.waitForSelector(`[data-open="${dualCase.case_id}"]`);
    await dualPage.locator(`[data-open="${dualCase.case_id}"]`).click();
    await dualPage.locator('#steps button[data-step="2"]').click();
    await dualPage.waitForSelector('#file');
    await dualPage.locator('#file').setInputFiles({ name: 'fictional-report.pdf', mimeType: 'application/pdf', buffer: buildPdf({ pages: [{ lines: dualLines }] }) });
    await dualPage.locator('#upload').click();
    await dualPage.waitForFunction(() => /Your report is uploaded/.test(document.getElementById('panel').innerText), null, { timeout: 20000 });
    await dualPage.locator('#check-report').click();
    await dualPage.waitForTimeout(3000);
    await dualPage.locator('#steps button[data-step="3"]').click();
    await dualPage.waitForTimeout(1200);
    const dualSummary = await dualPage.locator('#panel').innerText();
    check.ok(/too old to report/.test(dualSummary), 'the free summary teaser names the entry that may now be too old to report');
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
  await dualOpened.page.waitForTimeout(700);
  const dualPanel = await dualOpened.page.locator('#panel').innerText();
  check.ok(/Report issued: 2026-06-12/.test(dualPanel), 'the complete assessment shows the date the report was issued');
  check.ok(/the reporting period appears to end 2026-11-28/.test(dualPanel), 'and the date the period appears to end');
  check.ok(/arose through the passage of time/.test(dualPanel), 'and that the concern arose through the passage of time');
  check.ok(/Date of first delinquency on the collection entry/.test(dualPanel), 'and names the printed field the way the report does');
  await dualOpened.page.locator('#steps button[data-step="4"]').click();
  await dualOpened.page.waitForSelector('#packet-block');
  await dualOpened.page.waitForTimeout(600);
  const dualBlock = await dualOpened.page.locator('#packet-block').innerText();
  check.ok(/too old to report/.test(dualBlock), 'the subscriber packet offers the current-review concern to select');
  await dualOpened.page.locator('[data-check-issue]').first().check();
  await dualOpened.page.locator('#packet-name').fill('Robin Alvarez');
  await dualOpened.page.locator('#packet-contact').fill('robin.alvarez@example.test');
  await dualOpened.page.locator('#packet-approve').click();
  await dualOpened.page.waitForTimeout(700);
  const dualDownload = await downloadText(dualOpened.page);
  check.ok(/remains on my current file/.test(dualDownload.text), 'and the downloaded packet asks whether the entry remains on the current file');
  check.ok(/whether its reporting period has expired/.test(dualDownload.text), 'and whether its reporting period has expired');
  check.ok(!/established reporting issue/i.test(dualDownload.text), 'without claiming anything is still being reported');
  evidence.dual_date_browser = { free_summary: 'the teaser names an entry that may now be too old to report', packet: dualDownload.filename };
  await dualOpened.page.close();

  await browser.close();

  evidence.browser = 'real-browser Wizzard acceptance: potential + probable + partial selection + edit-after-approval + benign, all via Playwright + local Chrome against the loopback service';
  evidence.fixtures = 'all reports are buildPdf fictional fixtures with fictional data; no real consumer identifier or private report';
  return evidence;
}

module.exports = { run, id: 'bw-browser-wizzard', title: 'OWNER-POTENTIAL-ISSUE-001: real-browser Wizzard acceptance (potential/probable/partial-selection/edit-after-approval/benign)' };
