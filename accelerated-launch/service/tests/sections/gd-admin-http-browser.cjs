'use strict';
const fs = require('node:fs'), path = require('node:path');
const { TestService } = require('../harness.cjs');
const security = require('../../signup-security.cjs');
const { buildPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');
const password = 'a-long-enough-password';

// Account/MFA enrollment is fictional fixture setup at an earlier controlled
// time. Every asserted admin operation uses the real HTTP/session transport.
async function secureAccount(t, email, owner = false) {
  const actor = await t.unpaidAccount(email), realNow = Date.now, fixtureNow = realNow() - 180000;
  let setup;
  try {
    Date.now = () => fixtureNow;
    setup = security.beginTwoFactor(t.service.store, actor, { password });
    security.confirmTwoFactor(t.service.store, actor, { code: security.totp(setup.secret) });
    if (owner) require('../../admin-access.cjs').bootstrapOwner(t.service.adminStore, { account_id: actor.account_id, code: security.totp(setup.secret, fixtureNow + 30000) });
  } finally { Date.now = realNow; }
  return { ...actor, secret: setup.secret };
}
async function run(disabled, check) {
  check.equal((await disabled.request('GET', '/admin')).status, 404, 'admin shell is absent by default');
  check.equal((await disabled.request('GET', '/partner-access')).status, 404, 'partner consent is absent by default');
  check.equal((await disabled.request('GET', '/api/admin/session')).status, 404, 'disabled admin API refuses before account lookup');
  check.equal(fs.existsSync(path.join(disabled.dataDir, 'admin')), false, 'disabled service does not open or migrate admin metadata');
  const before = process.env.CRP_ADMIN_ENABLED; process.env.CRP_ADMIN_ENABLED = '1';
  const t = new TestService('admin-http-browser'); await t.listen();
  let browser;
  try {
    const owner = await secureAccount(t, 'admin-owner-http@example.test', true);
    const staff = await secureAccount(t, 'admin-staff-http@example.test');
    const partner = await secureAccount(t, 'admin-partner-http@example.test');
    const consumer = await t.account('admin-consumer-http@example.test');
    check.equal((await t.request('GET', '/api/admin/session', { token: owner.token })).status, 401, 'existing consumer session alone cannot enter administration');
    const unlocked = await t.request('POST', '/api/admin/unlock', { token: owner.token, body: { code: security.totp(owner.secret) } });
    check.equal(unlocked.status, 200, 'fresh MFA unlock succeeds through HTTP');
    check.equal('admin_token' in unlocked.json, false, 'step-up token never appears in response JSON');
    check.ok(/HttpOnly/.test(unlocked.setCookie) && /SameSite=Strict/.test(unlocked.setCookie) && /Path=\/api\/admin\//.test(unlocked.setCookie), 'admin token is scoped in an HttpOnly Strict cookie');
    let adminToken = /^crp_admin_session=([^;]+)/.exec(unlocked.setCookie)[1];
    const ownerRequest = (method, url, body) => t.request(method, url, { token: owner.token, headers: { 'x-crp-admin-session': adminToken }, body });
    check.equal((await ownerRequest('GET', '/api/admin/session')).json.session.role, 'owner', 'server-owned owner role reaches the portal contract');
    check.equal((await t.request('GET', '/api/admin/session', { token: owner.token, headers: { 'x-crp-admin-session': 'forged-token' } })).status, 401, 'forged step-up proof is refused through transport');
    check.equal((await t.request('POST', '/api/admin/organizations', { headers: { Cookie: 'crp_session=' + owner.token + '; crp_admin_session=' + adminToken, Origin: 'https://hostile.example' }, body: { name: 'Injected organization' } })).status, 403, 'cross-origin admin mutation is refused before dispatch');
    const organization = (await ownerRequest('POST', '/api/admin/organizations', { name: 'Fictional Fulfillment Partners' })).json.organization;
    const staffMember = await ownerRequest('POST', '/api/admin/team', { account_id: staff.account_id, role: 'staff', permissions: ['accounts.read'] });
    check.equal(staffMember.status, 201, 'owner can assign a bounded staff role');
    check.equal((await ownerRequest('POST', '/api/admin/team', { account_id: partner.account_id, role: 'partner', org_id: organization.org_id, permissions: ['overview.read', 'fulfillment.read', 'fulfillment.prepare'] })).status, 201, 'fulfillment partner receives only scoped operational capabilities');
    const staffUnlock = await t.request('POST', '/api/admin/unlock', { token: staff.token, body: { code: security.totp(staff.secret) } });
    const staffProof = /^crp_admin_session=([^;]+)/.exec(staffUnlock.setCookie)[1];
    check.equal((await t.request('GET', '/api/admin/accounts', { token: staff.token, headers: { 'x-crp-admin-session': staffProof } })).status, 200, 'staff account lookup follows its explicit capability');
    check.equal((await t.request('GET', '/api/admin/team', { token: staff.token, headers: { 'x-crp-admin-session': staffProof } })).status, 403, 'staff cannot use owner team management');
    const route = '/api/cases/' + (await t.request('POST', '/api/cases', { token: consumer.token, body: { country: 'CA', region: 'CA-NS', bureau: 'EQUIFAX' } })).json.case.case_id;
    const pdf = buildPdf({ pages: [{ lines: ['Equifax Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor: Fictional Partner Bank', 'Account Number: ****1234', 'Balance $100', 'Opened 2020-01-01', 'Closed 2019-01-01'] }] });
    const requestConsumer = (method, url, body) => t.request(method, url, { token: consumer.token, body });
    await requestConsumer('POST', route + '/files', { originalFilename: 'fictional-partner-report.pdf', declaredBytes: pdf.length, mimeType: 'application/pdf', contentBase64: pdf.toString('base64') });
    await requestConsumer('POST', route + '/evaluate', {});
    const issues = (await requestConsumer('GET', route + '/packet')).json.view.eligible_issues;
    await requestConsumer('POST', route + '/packet/select', { issue_ids: issues.map(row => row.issue_id) });
    const prepared = await t.preparePostalPacket(consumer, route.split('/').at(-1));
    await requestConsumer('POST', route + '/packet/approve', { reviewed_version: prepared.packet.preview_version });
    const approval = (await requestConsumer('GET', route + '/fulfillment-grants')).json.current_approval;
    check.ok(approval.approved && approval.pdf_sha256, 'consumer grant view binds actual approved packet bytes');
    check.equal((await t.request('GET', route + '/fulfillment-grants', { token: staff.token })).status, 403, 'staff cannot read a consumer grant through the ownership route');
    const grant = (await requestConsumer('POST', route + '/fulfillment-grants', { org_id: organization.org_id, approved_version: approval.approved_version, pdf_sha256: approval.pdf_sha256 })).json.grant;
    const job = (await ownerRequest('POST', '/api/admin/fulfillment', { grant_id: grant.grant_id })).json.job;
    check.ok(job.job_id, 'owner queues only a consumer-granted approved packet');
    const partnerUnlock = await t.request('POST', '/api/admin/unlock', { token: partner.token, body: { code: security.totp(partner.secret) } });
    const partnerProof = /^crp_admin_session=([^;]+)/.exec(partnerUnlock.setCookie)[1];
    const partnerRequest = (method, url, body) => t.request(method, url, { token: partner.token, headers: { 'x-crp-admin-session': partnerProof }, body });
    const partnerPacket = await partnerRequest('GET', '/api/admin/fulfillment/' + job.job_id + '/packet');
    check.equal(partnerPacket.status, 200, 'assigned partner can download the approved packet through the admin transport');
    check.ok(partnerPacket.bytes.equals((await requestConsumer('GET', route + '/packet-download')).bytes), 'partner receives the exact consumer-approved PDF');
    check.equal((await partnerRequest('GET', '/api/admin/accounts')).status, 403, 'fulfillment partner has no customer directory access');

    const { chromium } = require('C:/Users/webbd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
    browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage(); page.setDefaultTimeout(20000);
    await page.goto(t.base + '/admin'); await page.locator('#login-form').waitFor();
    check.ok(await page.locator('#login-email').isVisible(), 'real browser renders the admin sign-in form');
    await context.addCookies([{ name: 'crp_session', value: owner.token, url: t.base, httpOnly: true, sameSite: 'Strict' }]);
    await page.reload(); await page.locator('#stepup-form').waitFor();
    await page.locator('#stepup-code').fill(security.totp(owner.secret, Date.now() + 30000)); await page.locator('#stepup-form button[type=submit]').click();
    await page.locator('#workspace').waitFor();
    adminToken = (await context.cookies(t.base + '/api/admin/session')).find(cookie => cookie.name === 'crp_admin_session').value;
    check.equal(await page.locator('#identity-role').innerText(), 'Owner', 'real browser opens the owner workspace after MFA');
    await page.locator('[data-view="organizations"]').click(); await page.getByRole('button', { name: '+ Add organization', exact: true }).click();
    await page.getByLabel('Organization name', { exact: true }).fill('Browser Created Partners'); await page.locator('#editor-save').click();
    await page.getByText('Browser Created Partners', { exact: true }).waitFor();
    check.ok((await ownerRequest('GET', '/api/admin/organizations?q=Browser')).json.items.some(row => row.name === 'Browser Created Partners'), 'actual browser organization form persists through the guarded API');
    const out = path.resolve(__dirname, '../../out/admin-browser'); fs.mkdirSync(out, { recursive: true });
    for (const width of [1440, 390]) { await page.setViewportSize({ width, height: 1000 }); await page.screenshot({ path: path.join(out, 'owner-' + width + '.png'), fullPage: true, animations: 'disabled' }); check.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'admin has no horizontal overflow at ' + width + 'px'); }
    await page.locator('#menu-toggle').click(); await page.waitForFunction(() => document.querySelector('#menu-toggle').getAttribute('aria-expanded') === 'true');
    check.ok(await page.locator('#mobile-backdrop').isVisible(), 'mobile navigation opens with a dismissible backdrop');
    await page.keyboard.press('Escape'); await page.waitForFunction(() => document.querySelector('#menu-toggle').getAttribute('aria-expanded') === 'false');
    check.ok(await page.locator('#mobile-backdrop').isHidden(), 'Escape dismisses mobile navigation and returns its control state');
    const partnerContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await partnerContext.addCookies([{ name: 'crp_session', value: partner.token, url: t.base, httpOnly: true, sameSite: 'Strict' }, { name: 'crp_admin_session', value: partnerProof, domain: '127.0.0.1', path: '/api/admin/', httpOnly: true, sameSite: 'Strict' }]);
    const partnerPage = await partnerContext.newPage(); await partnerPage.goto(t.base + '/admin#fulfillment'); await partnerPage.getByText(job.job_id, { exact: true }).waitFor();
    check.equal(await partnerPage.locator('[data-view="accounts"],[data-view="team"],[data-view="organizations"],[data-view="affiliates"]').count(), 0, 'actual fulfillment-partner navigation excludes account, owner and affiliate workspaces');
    const downloaded = partnerPage.waitForEvent('download'); await partnerPage.getByRole('link', { name: 'Open packet ↗', exact: true }).click(); const attachment = await downloaded;
    await attachment.saveAs(path.join(out, 'partner-approved-packet.pdf'));
    check.ok(fs.readFileSync(path.join(out, 'partner-approved-packet.pdf')).equals(partnerPacket.bytes), 'actual partner browser link downloads only the granted approved bytes');
    await partnerPage.screenshot({ path: path.join(out, 'partner-1440.png'), fullPage: true, animations: 'disabled' });
    const staffContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await staffContext.addCookies([{ name: 'crp_session', value: staff.token, url: t.base, httpOnly: true, sameSite: 'Strict' }, { name: 'crp_admin_session', value: staffProof, domain: '127.0.0.1', path: '/api/admin/', httpOnly: true, sameSite: 'Strict' }]);
    const staffPage = await staffContext.newPage(); await staffPage.goto(t.base + '/admin#accounts'); await staffPage.getByText(consumer.email, { exact: true }).waitFor();
    check.equal(await staffPage.locator('[data-view="team"],[data-view="organizations"],[data-view="affiliates"],[data-view="fulfillment"]').count(), 0, 'actual staff navigation follows the assigned account-read capability');
    await staffContext.close(); await partnerContext.close();
    const consumerContext = await browser.newContext({ viewport: { width: 390, height: 1000 } });
    await consumerContext.addCookies([{ name: 'crp_session', value: consumer.token, url: t.base, httpOnly: true, sameSite: 'Strict' }]);
    const consent = await consumerContext.newPage(); await consent.goto(t.base + '/partner-access?organization=' + organization.org_id + '&case=' + route.split('/').at(-1));
    await consent.locator('#access-panel').waitFor();
    let releaseLookup, lookupStarted; const held = new Promise(resolve => { releaseLookup = resolve; }), started = new Promise(resolve => { lookupStarted = resolve; });
    const orgPattern = '**/api/fulfillment-organizations/' + organization.org_id;
    await consent.route(orgPattern, async intercepted => { lookupStarted(); await held; await intercepted.continue(); });
    await consent.locator('#choose-form button').click(); await started;
    const orgResponse = consent.waitForResponse(response => new URL(response.url()).pathname === '/api/fulfillment-organizations/' + organization.org_id);
    await consent.locator('#organization').fill('changed-organization'); releaseLookup();
    check.equal((await orgResponse).status(), 200, 'delayed organization response comes from the real service');
    await consent.waitForFunction(() => !document.querySelector('#choose-form button').disabled);
    check.ok(await consent.locator('#review').isHidden(), 'late organization response cannot restore consent for an earlier selection');
    await consent.unroute(orgPattern); await consent.locator('#organization').fill(organization.org_id);
    await consent.locator('#choose-form button').click(); await consent.locator('#review').waitFor(); await consent.locator('#consent').check();
    await consent.getByRole('button', { name: 'Allow access to this packet', exact: true }).click(); await consent.getByText('Access allowed for this approved packet. You can revoke it below.', { exact: true }).waitFor();
    check.equal((await requestConsumer('GET', route + '/fulfillment-grants')).json.items.filter(row => row.status === 'ACTIVE').length, 1, 'actual consumer allow control preserves idempotent exact-packet consent');
    await ownerRequest('PATCH', '/api/admin/organizations/' + organization.org_id, { status: 'DISABLED' });
    await consent.locator('#choose-form button').click(); await consent.getByText('This organization is unavailable for new access. You can still revoke existing access below.', { exact: true }).waitFor();
    check.ok(await consent.getByRole('button', { name: 'Revoke access', exact: true }).isVisible(), 'disabled organization never hides the consumer revoke control');
    await consent.getByRole('button', { name: 'Revoke access', exact: true }).click(); await consent.getByText('Partner access revoked. Previously downloaded copies cannot be recalled.', { exact: true }).waitFor();
    await ownerRequest('PATCH', '/api/admin/organizations/' + organization.org_id, { status: 'ACTIVE' });
    check.equal((await ownerRequest('GET', '/api/admin/fulfillment/' + job.job_id + '/packet')).status, 404, 'real consumer revoke control removes document access even after the organization is re-enabled');
    await consent.screenshot({ path: path.join(out, 'consumer-access-390.png'), fullPage: true });
    check.equal(await consent.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'consumer access page fits mobile');
    await consumerContext.close(); await context.close();
    const brokenDir = require('../harness.cjs').temporaryDataDir('admin-failure');
    fs.mkdirSync(path.join(brokenDir, 'admin'), { recursive: true });
    fs.writeFileSync(path.join(brokenDir, 'admin', '.initialized'), 'deliberately missing signed history');
    const isolated = require('../../app.cjs').createService({ dataDir: brokenDir, geoLocate: async () => 'CA', registrationMailer: async () => {}, logSink: () => {} });
    const ordinary = require('../../accounts.cjs').createAccount(isolated.store, { email: 'admin-failure-consumer@example.test', password });
    const listener = require('node:http').createServer((req, res) => isolated.handle(req, res));
    try {
      await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve)); const base = 'http://127.0.0.1:' + listener.address().port;
      check.equal((await fetch(base + '/api/cases', { headers: { Authorization: 'Bearer ' + ordinary.token } })).status, 200, 'unavailable optional admin metadata does not stop ordinary consumer operations');
      check.equal((await fetch(base + '/api/admin/session', { headers: { Authorization: 'Bearer ' + ordinary.token } })).status, 503, 'unavailable optional admin metadata fails closed only for admin operations');
    } finally {
      await new Promise(resolve => listener.close(resolve)); isolated.close();
      if (!path.resolve(brokenDir).startsWith(path.join(require('node:os').tmpdir(), 'crp-b2-admin-failure-'))) throw Error('Unexpected disposable fixture path');
      fs.rmSync(brokenDir, { recursive: true, force: true });
    }
    return { actual_browser: true, default_off: true, csrf_refused: true, scoped_cookie: true, consumer_revocation: true, screenshots: ['owner-1440.png', 'owner-390.png', 'consumer-access-390.png'] };
  } finally { if (browser) await browser.close(); await t.close(); if (before === undefined) delete process.env.CRP_ADMIN_ENABLED; else process.env.CRP_ADMIN_ENABLED = before; }
}
module.exports = { run, id: 'gd-admin-http-browser', title: 'Opt-in admin transport, MFA cookie, role enforcement and actual browser organization/consumer-revocation flow' };
