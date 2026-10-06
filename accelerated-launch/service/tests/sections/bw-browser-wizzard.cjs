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
  const checkout = await service.request('POST', '/api/billing/checkout', { token: actor.token, body: { plan_code: 'report_once', case_id: caseId } });
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
  check.ok(/not, by itself, an established legal violation/.test(potBlock), 'with clear uncertainty, never a definite breach');
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
  check.ok(/PROBABLE REPORTING ISSUE/.test(probBlock), 'the qualified probable retention issue renders as probable');
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

  await browser.close();

  evidence.browser = 'real-browser Wizzard acceptance: potential + probable + partial selection + edit-after-approval + benign, all via Playwright + local Chrome against the loopback service';
  evidence.fixtures = 'all reports are buildPdf fictional fixtures with fictional data; no real consumer identifier or private report';
  return evidence;
}

module.exports = { run, id: 'bw-browser-wizzard', title: 'OWNER-POTENTIAL-ISSUE-001: real-browser Wizzard acceptance (potential/probable/partial-selection/edit-after-approval/benign)' };
