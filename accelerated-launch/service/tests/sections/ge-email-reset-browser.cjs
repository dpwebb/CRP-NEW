'use strict';
const fs = require('node:fs'), path = require('node:path');
const security = require('../../signup-security.cjs');
const { chromium } = require('C:/Users/webbd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const originalPassword = 'a-long-enough-password', newPassword = 'a-new-email-reset-password';
const confirmation = 'If an account uses that email, we will send a password reset link. Check your inbox and spam folder.';

async function run(t, check) {
  const email = 'ge-email-reset-browser@example.test';
  const created = await t.request('POST', '/api/accounts', { body: { email, password: originalPassword } });
  const actor = { email, account_id: created.json.account.account_id, token: /crp_session=([^;]+)/.exec(created.setCookie)[1] };
  // Enroll the fictional authenticator at a prior time so the browser can use a fresh app code.
  const realNow = Date.now, fixtureNow = realNow() - 180000;
  let setup;
  try {
    Date.now = () => fixtureNow;
    setup = security.beginTwoFactor(t.service.store, actor, { password: originalPassword });
    security.confirmTwoFactor(t.service.store, actor, { code: security.totp(setup.secret) });
  } finally { Date.now = realNow; }
  const out = path.join(__dirname, '../../out'); fs.mkdirSync(out, { recursive: true });
  const screenshots = [];
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage(); page.setDefaultTimeout(15000);
    await page.addInitScript(() => {
      window.__resetFetchHashes = [];
      const fetch = window.fetch;
      window.fetch = (...args) => { window.__resetFetchHashes.push(location.hash); return fetch(...args); };
    });
    let requests = 0, completions = 0;
    const requestedUrls = [];
    page.on('request', request => {
      requestedUrls.push(request.url());
      if (new URL(request.url()).pathname === '/api/account/password-reset/request') requests++;
      if (new URL(request.url()).pathname === '/api/account/password-reset/complete') completions++;
    });
    await page.goto(t.base + '/index.html#signin'); await page.locator('#forgot-password').click();
    check.ok(await page.locator('#email-recovery-option').isVisible(), 'forgot-password prominently offers email recovery without a saved key');
    check.ok(/Can’t find your recovery key/.test(await page.locator('#panel').innerText()), 'recovery guidance speaks directly to consumers who lost the key');
    check.ok(await page.locator('#recover-email').isVisible() && await page.locator('#recover-key').isVisible(), 'saved-key form remains available with its established controls');
    check.ok(/Email reset keeps your authenticator enabled/.test(await page.locator('#panel').innerText()), 'recovery choices explain that email reset preserves the authenticator');
    const discovery = path.join(out, 'email-reset-discovery-mobile.png'); await page.screenshot({ path: discovery, fullPage: true }); screenshots.push(discovery);
    check.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'recovery choices have no mobile horizontal overflow');
    await page.locator('#email-recovery-option').click();
    check.ok(/If you also lost your authenticator, use your saved recovery key/.test(await page.locator('#panel').innerText()), 'email request explains how the saved key supports lost-authenticator recovery');
    check.ok(/expires after 30 minutes/.test(await page.locator('#panel').innerText()), 'request screen explains link expiry and use of the latest email');
    await page.locator('#reset-email').fill('ge-no-account@example.test');
    await page.route('**/api/account/password-reset/request', async route => { await new Promise(resolve => setTimeout(resolve, 350)); await route.continue(); });
    await page.locator('#request-email-reset').click();
    check.ok(await page.locator('#request-email-reset').isDisabled(), 'email request locks its control while in progress');
    await page.locator('#request-email-reset').dispatchEvent('click');
    await page.getByText(confirmation, { exact: true }).waitFor();
    check.equal(requests, 1, 'duplicate activation sends only one email request');
    check.equal(t.resetMessages.filter(message => message.to === 'ge-no-account@example.test').length, 0, 'unknown email receives the same confirmation without sending a message');
    const unknownConfirmation = await page.locator('#consumer-notice').innerText();
    await page.locator('#reset-email').fill(email); await page.locator('#request-email-reset').click();
    await page.waitForFunction(() => document.getElementById('request-email-reset')?.disabled === false);
    await page.getByText(confirmation, { exact: true }).waitFor();
    check.equal(await page.locator('#consumer-notice').innerText(), unknownConfirmation, 'known and unknown account emails show identical consumer confirmation');
    const mail = t.resetMessages.findLast(message => message.to === email && message.kind === 'password-reset');
    check.ok(Boolean(mail?.url), 'real local mail adapter captures a link for the fictional account');
    await page.unroute('**/api/account/password-reset/request');
    await page.locator('#saved-key-option').click();
    check.ok(await page.locator('#recover-key').isVisible(), 'email request offers a working route back to saved-key recovery');

    // A signed-in browser must still open the link form, rather than its report workspace.
    await context.addCookies([{ name: 'crp_session', value: actor.token, url: t.base, httpOnly: true, sameSite: 'Strict' }]);
    const link = new URL(mail.url); const token = link.hash.slice('#reset-password='.length);
    await page.goto(t.base + link.pathname + link.search + link.hash); await page.locator('#reset-password').waitFor();
    check.equal(new URL(page.url()).hash, '#reset-password', 'reset token is removed from browser location as soon as the UI loads');
    check.ok((await page.evaluate(() => window.__resetFetchHashes)).every(hash => hash === '#reset-password'), 'token is scrubbed before every startup API request');
    check.ok(!requestedUrls.some(url => url.includes(token)), 'reset token never appears in network request URLs');
    check.ok(!(await page.locator('#activity').innerText()).includes(token), 'reset token is absent from technical activity');
    check.ok(await page.evaluate(secret => ![...Object.values(localStorage), ...Object.values(sessionStorage)].some(value => value.includes(secret)), token), 'reset token is not persisted in browser storage');
    check.equal(await page.locator('#open, #account-save').count(), 0, 'signed-in cookie does not replace the dedicated reset form');
    check.equal(completions, 0, 'opening the email link does not consume it');
    const mobile = path.join(out, 'email-reset-password-mobile.png'); await page.screenshot({ path: mobile, fullPage: true }); screenshots.push(mobile);
    check.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'new-password form has no mobile horizontal overflow');
    await page.reload(); await page.locator('#new-email-reset').waitFor();
    check.equal(await page.locator('#reset-password').count(), 0, 'reloading a scrubbed link does not recover a secret from storage');
    check.ok(/open the latest reset email again/.test(await page.locator('#panel').innerText()), 'scrubbed-link reload explains how to reopen the original email');
    await page.goto(t.base + link.pathname + link.hash); await page.locator('#reset-password').waitFor();
    await page.locator('#reset-password').fill('short'); await page.locator('#reset-password-confirm').fill('short'); await page.locator('#complete-email-reset').click();
    check.equal(await page.locator('#reset-password').evaluate(input => input.validity.tooShort), true, 'browser enforces the twelve-character minimum');
    check.equal(completions, 0, 'short passwords do not submit a completion request');
    await page.locator('#reset-password').fill(newPassword); await page.locator('#reset-password-confirm').fill(newPassword + '-different'); await page.locator('#complete-email-reset').click();
    await page.getByRole('alert').filter({ hasText: 'The passwords do not match' }).waitFor();
    check.equal(completions, 0, 'mismatched password confirmation does not use the reset token');
    await page.setViewportSize({ width: 1365, height: 900 });
    const desktop = path.join(out, 'email-reset-password-desktop.png'); await page.screenshot({ path: desktop, fullPage: true }); screenshots.push(desktop);
    await page.locator('#reset-password').fill(newPassword); await page.locator('#reset-password-confirm').fill(newPassword);
    await page.route('**/api/account/password-reset/complete', async route => { await new Promise(resolve => setTimeout(resolve, 350)); await route.continue(); });
    await page.locator('#complete-email-reset').click();
    check.ok(await page.locator('#complete-email-reset').isDisabled(), 'completion locks the form while the reset is in progress');
    await page.locator('#complete-email-reset').dispatchEvent('click');
    await page.locator('#signin').waitFor();
    check.equal(completions, 1, 'double activation submits only one password completion');
    check.ok(/Your password has been reset/.test(await page.locator('#consumer-notice').innerText()), 'successful reset explains the next sign-in step');
    check.equal(await page.locator('#recovery-key').count(), 0, 'email reset does not replace or expose the saved recovery key');
    check.equal((await page.request.get(t.base + '/api/session')).status(), 401, 'successful reset clears the signed-in browser session');
    check.equal((await t.request('GET', '/api/session', { token: actor.token })).status, 401, 'successful email reset revokes the previous account session');
    await page.unroute('**/api/account/password-reset/complete');
    await page.locator('#email').fill(email); await page.locator('#password').fill(newPassword); await page.locator('#signin').click();
    await page.getByRole('alert').waitFor();
    check.equal(await page.locator('#open').count(), 0, 'new password alone cannot sign in when MFA is enabled');
    check.ok(/authenticator|two.factor/i.test(await page.getByRole('alert').innerText()), 'sign-in explains the remaining authenticator requirement');
    await page.locator('#email').fill(email); await page.locator('#password').fill(newPassword); await page.locator('#signin-code').fill(security.totp(setup.secret)); await page.locator('#signin').click();
    await page.locator('#open').waitFor();
    check.equal((await (await page.request.get(t.base + '/api/session')).json()).account.account_id, actor.account_id, 'new password plus the unchanged authenticator signs in to the original account');
    await page.locator('#steps button[data-step="0"]').click(); await page.locator('#account-security-settings').click();
    check.ok(/Email me a password reset link/.test(await page.locator('#panel').innerText()) && /authenticator stays enabled/.test(await page.locator('#panel').innerText()), 'Account security teaches the email reset option and its MFA boundary');
    await page.locator('#security-back').click(); await page.locator('#signout').click(); await page.locator('#forgot-password').waitFor();

    // A reused link gets actionable expiry help, and a consumer can request another email from it.
    await page.goto(t.base + link.pathname + link.hash); await page.locator('#reset-password').waitFor();
    await page.locator('#reset-password').fill(newPassword); await page.locator('#reset-password-confirm').fill(newPassword); await page.locator('#complete-email-reset').click();
    await page.getByRole('heading', { name: 'Request a new reset link.', exact: true }).waitFor();
    check.ok(/expired|already.*used/.test(await page.locator('#panel').innerText()), 'used or expired links receive clear recovery help');
    check.equal(await page.locator('#reset-password').count(), 0, 'unavailable token removes the unusable completion form');
    const expired = path.join(out, 'email-reset-expired-desktop.png'); await page.screenshot({ path: expired, fullPage: true }); screenshots.push(expired);
    await page.locator('#new-email-reset').click();
    check.ok(await page.locator('#reset-email').isVisible(), 'unavailable-link help opens a fresh email request');
    await page.locator('#saved-key-option').click();
    await page.locator('#recover-email').fill(email); await page.locator('#recover-key').fill(created.json.recovery_key); await page.locator('#recover-password').fill('a-new-saved-key-password'); await page.locator('#recover-account').click();
    await page.locator('#recovery-key').waitFor();
    check.notEqual(await page.locator('#recovery-key').inputValue(), created.json.recovery_key, 'original saved key remains functional after email reset and still rotates on use');
    return { real_browser: true, fictional_email_adapter: true, mfa_preserved: true, recovery_key_preserved: true, screenshots };
  } finally { await browser.close(); }
}
module.exports = { id: 'ge-email-reset-browser', title: 'Email password recovery discovery, token privacy, responsive forms and preserved MFA/key choices', run };
