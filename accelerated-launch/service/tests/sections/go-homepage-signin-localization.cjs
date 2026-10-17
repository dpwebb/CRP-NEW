'use strict';
/** Source-bound local HTTP and real-browser checks for the authorized homepage/auth presentation.
 * Every account/store is fictional and disposable. Geolocation is injected; no external provider is used.
 * Existing report, packet, recovery and privileged-access suites retain their independent coverage. */
const fs = require('node:fs'), path = require('node:path');
const { TestService } = require('../harness.cjs');
const security = require('../../signup-security.cjs');
const { chromium } = require('C:/Users/webbd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const PASSWORD = 'a-long-enough-password';
const words = value => String(value || '').trim().split(/\s+/).filter(Boolean);
const sessionFor = async page => {
  const response = await page.request.get(new URL('/api/session', page.url()).href);
  return { status: response.status(), body: await response.json() };
};
async function credentials(page, base, email) {
  await page.goto(base + '/index.html#signin');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(PASSWORD);
}
function enrollEarlier(service, actor) {
  const clock = Date.now, prior = clock() - 180000;
  try {
    Date.now = () => prior;
    const setup = security.beginTwoFactor(service.service.store, actor, { password: PASSWORD });
    security.confirmTwoFactor(service.service.store, actor, { code: security.totp(setup.secret) });
    return setup.secret;
  } finally { Date.now = clock; }
}
async function publicChecks(check) {
  let location = 'AU', observedIp;
  const local = await new TestService('go-public-homepage', { geoLocate: async ip => { observedIp = ip; if (location === 'THROW') throw Error('fictional lookup unavailable'); return location; } }).listen();
  try {
    const surface = (await local.request('GET', '/api/jurisdictions')).json.surface;
    const before = JSON.stringify(local.service.store.state());
    const snapshots = {};
    for (const country of ['US', 'GB', 'CA', 'AU']) {
      location = country;
      const response = await local.request('GET', '/api/homepage?country=ZZ&currency=usd', {
        headers: { 'X-Forwarded-For': '203.0.113.10, 198.51.100.7, 127.0.0.1', 'X-Country': 'US', 'CF-IPCountry': 'US', 'Accept-Language': 'en-US' }
      });
      check.equal(response.status, 200, country + ': anonymous homepage model loads');
      const data = response.json; snapshots[country] = data;
      check.equal(data.ok, true, country + ': model is explicit successful data');
      check.equal(data.country, country, country + ': trusted lookup overrides query/client hints');
      check.equal(observedIp, '198.51.100.7', country + ': lookup receives the last observed non-local proxy hop');
      check.ok(!response.text.includes('198.51.100.7') && !response.text.includes('203.0.113.10'), country + ': model exposes no visitor address');
      check.equal(response.setCookie, null, country + ': anonymous content never establishes a consumer session');
      check.match(response.headers.get('cache-control') || '', /no-store/, country + ': localized response is not shared cached');
      check.equal(data.example.consumer, 'John Doe', country + ': illustration remains explicitly fictional John Doe');
      check.equal(data.example.report_date, '2026-10-16', country + ': reporting example has its own fixed report date');
      check.ok(Array.isArray(data.example.fields) && data.example.fields.length > 1, country + ': sample retains structured report fields');
      check.ok(data.example.fields.every(field => typeof field.label === 'string' && typeof field.value === 'string'), country + ': report fields contain renderable text');
      check.ok(typeof data.example.headline === 'string' && typeof data.example.explanation === 'string', country + ': insight accompanies report facts');
      check.equal(data.example.fictional, true, country + ': finding is explicitly a fictional illustration');
      check.equal(data.example.badge, 'Violation found', country + ': approved illustration states its finding clearly');
      check.equal(data.example.source, null, country + ': generic fictional scenario does not invent an applicable statute');
      check.ok(data.free_reports.length > 0 && data.free_reports.every(row => row.country === country), country + ': relevant direct free-report resources stay scoped');
      check.ok(data.free_reports.every(row => new URL(row.url).protocol === 'https:' && row.title && row.bureau), country + ': each resource has an identified bureau and HTTPS route');
      check.equal(data.news.country, country, country + ': news shares the authoritative public display country');
      check.ok(data.news.items.every(row => row.country === country), country + ': footer contains no foreign-country story');
    }
    for (const country of ['GB', 'CA', 'AU']) check.deepEqual(snapshots[country].example, snapshots.US.example, country + ': shared fictional illustration is identical across countries');
    check.equal(snapshots.CA.region, null, 'shared Canadian example does not invent the viewer province');
    check.ok(snapshots.AU.free_reports.some(row => /illion/i.test(JSON.stringify(row))), 'Australian resources identify former illion access');
    const regions = surface.regions.filter(row => ['US', 'GB', 'CA', 'AU'].includes(row.country));
    check.ok(regions.length >= 82, 'public localization is checked against the complete existing regional catalogue');
    for (const region of regions) {
      location = { country: region.country, region: region.value };
      const model = (await local.request('GET', '/api/homepage')).json;
      check.equal(model.country, region.country, 'all-jurisdiction country retained: ' + region.value);
      check.equal(model.region, region.value, 'recognized IP region normalized to the existing catalogue: ' + region.value);
      check.deepEqual(model.example, snapshots.US.example, 'sample stays fictional and shared without relabelling the viewer: ' + region.value);
      check.ok(model.free_reports.every(row => row.country === region.country) && model.news.items.every(row => row.country === region.country), 'local region does not borrow a foreign resource/story: ' + region.value);
    }
    location = { country: 'CA', region: 'not-a-province' };
    const unrecognized = (await local.request('GET', '/api/homepage')).json;
    check.equal(unrecognized.region, null, 'unrecognized region is not treated as an applicable province');
    check.deepEqual(unrecognized.example, snapshots.CA.example, 'unrecognized Canadian region retains the same explicitly fictional example');
    for (const unknown of [null, 'DE', 'THROW']) {
      location = unknown;
      const response = await local.request('GET', '/api/homepage?country=AU');
      check.equal(response.status, 200, String(unknown) + ': unknown/offline localization has a truthful response');
      check.equal(response.json.country, null, String(unknown) + ': requested country cannot invent location');
      check.equal(response.json.region, null, String(unknown) + ': unknown location has no invented region');
      check.equal(response.json.example.fictional, true, String(unknown) + ': shared example stays fictional when viewer location is unknown');
      check.equal(response.json.example.source, null, String(unknown) + ': unknown viewer is never assigned a statutory source');
    }
    check.equal(JSON.stringify(local.service.store.state()), before, 'public homepage requests preserve all account/report/billing/session state');
    check.ok(!local.logText().includes('198.51.100.7') && !local.logText().includes('203.0.113.10'), 'public localization activity omits visitor addresses');
    return { regions: regions.length, countries: 4 };
  } finally { await local.close(); }
}
async function browserChecks(service, check) {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const out = service.outDir || path.join(__dirname, '../../out');
  fs.mkdirSync(out, { recursive: true });
  const screenshots = [];
  try {
    const actor = await service.unpaidAccount('go-enabled-mfa@example.test'), seed = enrollEarlier(service, actor);
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage(); page.setDefaultTimeout(20000);
    const requests = []; page.on('request', request => requests.push({ method: request.method(), path: new URL(request.url()).pathname }));
    await credentials(page, service.base, actor.email);
    check.equal(await page.locator('#signin-code').count(), 0, 'sign-in first step contains no optional authenticator input');
    check.equal(await page.locator('#signin-skip-two-factor').count(), 0, 'optional invitation waits until credentials are verified');
    await page.locator('#signin').click(); await page.locator('#signin-code').waitFor();
    check.equal(await page.locator('#email, #password').count(), 0, 'required factor is a separate visible sign-in step');
    check.ok(/step\s*2|second/i.test(await page.locator('#panel').innerText()), 'required factor labels the second sign-in step');
    check.equal(await page.locator('#signin-skip-two-factor').count(), 0, 'enabled MFA has no bypass control');
    check.equal((await sessionFor(page)).status, 401, 'password-only MFA verification creates no authenticated session');
    check.equal(requests.filter(row => row.path === '/api/cases').length, 0, 'required factor has not loaded private saved-report information');
    const acceptedCodes = new Set([-30000, 0, 30000].map(offset => security.totp(seed, Date.now() + offset)));
    let invalidNumber = 0; while (acceptedCodes.has(String(invalidNumber).padStart(6, '0'))) invalidNumber++;
    const bad = String(invalidNumber).padStart(6, '0');
    await page.locator('#signin-code').fill(bad); await page.locator('#signin').click();
    await page.getByRole('alert').waitFor();
    check.ok(await page.locator('#signin-code').isVisible(), 'invalid factor leaves a usable second-step input');
    check.equal((await sessionFor(page)).status, 401, 'invalid factor still creates no session');
    await page.locator('#signin-back').click(); await page.locator('#email').waitFor();
    check.equal(await page.locator('#password').inputValue(), '', 'returning to step one clears retained password');
    await page.locator('#email').fill(actor.email); await page.locator('#password').fill(PASSWORD); await page.locator('#signin').click();
    await page.locator('#signin-code').waitFor(); await page.locator('#signin-recovery').click(); await page.locator('#recover-key').waitFor();
    check.equal(await page.locator('#signin-code').count(), 0, 'saved-key recovery replaces and clears pending factor UI');
    check.equal((await sessionFor(page)).status, 401, 'opening recovery cannot authenticate a pending factor');
    await page.locator('#recovery-back').click(); await page.locator('#email').waitFor();
    await page.locator('#email').fill(actor.email); await page.locator('#password').fill(PASSWORD); await page.locator('#signin').click();
    await page.locator('#signin-code').waitFor(); const code = security.totp(seed);
    await page.locator('#signin-code').fill(code); await page.locator('#signin').click(); await page.locator('#open').waitFor();
    check.equal((await sessionFor(page)).body.account.account_id, actor.account_id, 'correct second-step factor opens only the original account');
    check.equal(await page.locator('#signin-code, #password, #signin-skip-two-factor').count(), 0, 'successful MFA clears credential and invitation controls');
    check.equal((await service.request('POST', '/api/sessions', { body: { email: actor.email, password: PASSWORD, code } })).status, 401, 'existing factor replay protection remains enforced after UI sign-in');
    check.ok(await page.evaluate(secret => ![...Object.values(localStorage), ...Object.values(sessionStorage)].some(value => value.includes(secret)), PASSWORD), 'sign-in password is not retained in browser storage');
    check.ok(!(await page.locator('#activity').innerText()).includes(PASSWORD), 'visible technical activity excludes sign-in password');
    const mfaShot = path.join(out, 'go-mfa-completed-mobile.png'); await page.screenshot({ path: mfaShot, fullPage: true }); screenshots.push(mfaShot);
    await context.close();

    const timeoutContext = await browser.newContext(); const timeout = await timeoutContext.newPage(); timeout.setDefaultTimeout(20000);
    await timeout.clock.install();
    let challengePosts = 0; timeout.on('request', request => { if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/sessions') challengePosts++; });
    await credentials(timeout, service.base, actor.email); await timeout.locator('#signin').click(); await timeout.locator('#signin-code').waitFor();
    await timeout.locator('#signin-code').fill(security.totp(seed));
    await timeout.clock.fastForward(5 * 60000 + 1); await timeout.locator('#signin').click();
    await timeout.locator('#email').waitFor();
    check.equal(challengePosts, 1, 'expired five-minute factor challenge refuses submission before another sign-in POST');
    check.equal(await timeout.locator('#signin-code').count(), 0, 'expired challenge cancels its visible factor step');
    check.equal(await timeout.locator('#password').inputValue(), '', 'expired challenge restores entry without its retained password');
    check.ok(/expired/i.test(await timeout.getByRole('alert').innerText()), 'expired challenge gives an actionable sign-in explanation');
    check.equal((await sessionFor(timeout)).status, 401, 'expired client challenge creates no session');
    await timeoutContext.close();

    const historyContext = await browser.newContext(); const history = await historyContext.newPage(); history.setDefaultTimeout(20000);
    await credentials(history, service.base, actor.email); await history.locator('#signin').click(); await history.locator('#signin-code').waitFor();
    await history.locator('#signin-code').fill('123456');
    const hiddenChallenge = await history.evaluate(() => {
      window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
      return { code: document.getElementById('signin-code')?.value, password: document.getElementById('password')?.value || '' };
    });
    check.equal(hiddenChallenge.code, '', 'persisted pagehide immediately scrubs the pending authenticator input');
    check.equal(hiddenChallenge.password, '', 'persisted pagehide retains no visible password');
    await history.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
    await history.locator('#email').waitFor();
    check.equal(await history.locator('#signin-code').count(), 0, 'persisted pageshow restores first-step entry after cancelling the old factor challenge');
    await history.locator('#email').fill(actor.email); await history.locator('#password').fill(PASSWORD); await history.locator('#signin').click();
    await history.locator('#signin-code').waitFor();
    check.equal((await sessionFor(history)).status, 401, 'restored sign-in remains usable and still requires the enabled factor');
    await historyContext.close();

    const plain = await service.unpaidAccount('go-optional-mfa@example.test');
    const optionalContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const optional = await optionalContext.newPage(); optional.setDefaultTimeout(20000);
    await credentials(optional, service.base, plain.email); await optional.locator('#signin').click();
    await optional.locator('#signin-enable-two-factor').waitFor();
    check.ok(await optional.locator('#signin-skip-two-factor').isVisible(), 'verified ordinary account can enable MFA or choose Not now');
    check.equal(await optional.locator('#open').count(), 0, 'ordinary consumer invitation precedes workspace continuation');
    await optional.evaluate(() => new Promise(resolve => { window.addEventListener('hashchange', () => requestAnimationFrame(() => resolve()), { once: true }); location.hash = '#create'; }));
    check.ok(await optional.locator('#signin-skip-two-factor').isVisible() && await optional.locator('#signin-enable-two-factor').isVisible(), 'switching to create hash retains a usable invitation for the verified account');
    check.equal(await optional.locator('#signup-email, #email-confirmation-code, #create').count(), 0, 'invitation hash navigation does not invent an incomplete signup or replace verified account entry');
    await optional.locator('#signin-skip-two-factor').click(); await optional.locator('#open').waitFor();
    check.equal((await sessionFor(optional)).body.account.account_id, plain.account_id, 'Not now retains the verified account');
    check.equal((await service.request('GET', '/api/account/security', { token: plain.token })).json.two_factor_enabled, false, 'Not now never enables or disables authenticator state');
    check.equal(await optional.locator('#stepcount').innerText(), 'Step 2 of 5', 'Not now preserves the existing five-step Upload destination');
    await optional.locator('#steps button[data-step="0"]').click(); await optional.locator('#account-full_name').waitFor();
    await optional.locator('#account-security-settings').click(); await optional.locator('#two-factor-password').fill(PASSWORD);
    await optional.locator('#two-factor-start').click(); await optional.locator('#two-factor-secret').waitFor();
    const abandonedSecuritySeed = await optional.locator('#two-factor-secret').inputValue();
    await optional.locator('#security-back').click(); await optional.locator('#account-full_name').waitFor();
    check.equal(await optional.locator('#two-factor-secret').count(), 0, 'returning from unfinished Account security removes the seed from the ordinary workspace');
    await optional.locator('#account-full_name').fill('Fictional unsaved account draft survives history');
    const draftStep = await optional.locator('#stepcount').innerText();
    let ordinaryRestoreReads = 0;
    optional.on('request', request => { if (new URL(request.url()).pathname === '/api/session') ordinaryRestoreReads++; });
    const restoredDraft = await optional.evaluate(async () => {
      const input = document.getElementById('account-full_name');
      window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return { sameInput: document.getElementById('account-full_name') === input, value: document.getElementById('account-full_name')?.value };
    });
    check.equal(restoredDraft.sameInput, true, 'ordinary workspace history restore preserves the current draft input node');
    check.equal(restoredDraft.value, 'Fictional unsaved account draft survives history', 'ordinary workspace history restore preserves the exact unsaved consumer draft');
    check.equal(await optional.locator('#stepcount').innerText(), draftStep, 'ordinary workspace history restore preserves the current Wizard step');
    check.equal(ordinaryRestoreReads, 0, 'ordinary workspace history event does not run unfinished-auth session restoration');
    check.notEqual(service.service.store.state().accounts.find(row => row.account_id === plain.account_id).profile?.full_name, restoredDraft.value, 'history event never silently saves the unsaved consumer draft');
    await optional.locator('#account-security-settings').click(); await optional.locator('#two-factor-password').waitFor();
    check.equal(await optional.locator('#two-factor-secret, #two-factor-code').count(), 0, 'history cleanup discards the hidden abandoned seed and offers a fresh security setup');
    check.ok(!(await optional.locator('#panel').innerHTML()).includes(abandonedSecuritySeed), 'reopening Account security cannot resurrect the abandoned setup seed');
    check.equal((await service.request('GET', '/api/account/security', { token: plain.token })).json.two_factor_enabled, false, 'abandoned setup/history cleanup never silently enables the factor');
    await optionalContext.close();

    const setupActor = await service.unpaidAccount('go-enable-mfa@example.test');
    const setupContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const setupPage = await setupContext.newPage(); setupPage.setDefaultTimeout(20000);
    await credentials(setupPage, service.base, setupActor.email); await setupPage.locator('#signin').click();
    await setupPage.locator('#signin-enable-two-factor').click(); await setupPage.locator('#two-factor-password').fill(PASSWORD);
    await setupPage.locator('#two-factor-start').click(); await setupPage.locator('#two-factor-secret').waitFor();
    let secret = await setupPage.locator('#two-factor-secret').inputValue();
    check.ok(!JSON.stringify(service.service.store.state()).includes(secret), 'optional sign-in enrollment preserves encrypted seed storage');
    check.equal((await service.request('GET', '/api/account/security', { token: setupActor.token })).json.two_factor_enabled, false, 'starting setup does not enable an unproved authenticator');
    check.equal(await setupPage.locator('#signin-continue:enabled').count(), 0, 'enrollment cannot continue as complete before possession proof');
    service.service.store.update(state => { state.accounts.find(row => row.account_id === setupActor.account_id).two_factor_pending.expires_at = new Date(Date.now() - 1000).toISOString(); return true; });
    const oldSetupSecret = secret;
    await setupPage.locator('#two-factor-code').fill(security.totp(oldSetupSecret)); await setupPage.locator('#two-factor-confirm').click();
    await setupPage.locator('#two-factor-password').waitFor();
    check.equal(await setupPage.locator('#two-factor-secret, #two-factor-code').count(), 0, 'expired enrollment clears setup seed/code and offers the password-start view');
    check.ok(/start.*again|fresh setup|expired/i.test(await setupPage.getByRole('alert').innerText()), 'expired enrollment explains how to obtain a fresh setup key');
    check.equal((await service.request('GET', '/api/account/security', { token: setupActor.token })).json.two_factor_enabled, false, 'expired setup does not enable an unverified factor');
    check.ok(!(await setupPage.locator('#panel').innerHTML()).includes(oldSetupSecret), 'old enrollment seed is absent from the restored form');
    await setupPage.locator('#two-factor-password').fill(PASSWORD); await setupPage.locator('#two-factor-start').click(); await setupPage.locator('#two-factor-secret').waitFor();
    secret = await setupPage.locator('#two-factor-secret').inputValue();
    check.notEqual(secret, oldSetupSecret, 'fresh setup replaces the expired enrollment seed');
    await setupPage.locator('#two-factor-code').fill(security.totp(secret)); await setupPage.locator('#two-factor-confirm').click();
    await setupPage.locator('#signin-continue:enabled').waitFor();
    check.equal((await service.request('GET', '/api/account/security', { token: setupActor.token })).json.two_factor_enabled, true, 'existing confirmation endpoint activates optional factor');
    await setupPage.locator('#signin-continue').click(); await setupPage.locator('#open').waitFor();
    check.equal(await setupPage.locator('#two-factor-secret').count(), 0, 'completed enrollment removes setup seed from visible UI');
    check.equal(await setupPage.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'optional enrollment and continuation have no mobile horizontal overflow');
    const setupShot = path.join(out, 'go-optional-mfa-completed-mobile.png'); await setupPage.screenshot({ path: setupShot, fullPage: true }); screenshots.push(setupShot);
    await setupContext.close();

    const hiddenActor = await service.unpaidAccount('go-history-setup@example.test');
    const hiddenContext = await browser.newContext(); const hidden = await hiddenContext.newPage(); hidden.setDefaultTimeout(20000);
    await credentials(hidden, service.base, hiddenActor.email); await hidden.locator('#signin').click(); await hidden.locator('#signin-enable-two-factor').click();
    await hidden.locator('#two-factor-password').fill(PASSWORD); await hidden.locator('#two-factor-start').click(); await hidden.locator('#two-factor-secret').waitFor();
    const cachedSecret = await hidden.locator('#two-factor-secret').inputValue();
    const seedCleared = await hidden.evaluate(() => { window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })); const input = document.getElementById('two-factor-secret'); return { value: input?.value, attribute: input?.getAttribute('value') }; });
    check.equal(seedCleared.value, '', 'persisted pagehide immediately clears the enrollment seed input');
    check.equal(seedCleared.attribute, null, 'persisted pagehide removes seed from the input HTML value attribute');
    await hidden.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
    await hidden.locator('#account-save').waitFor();
    check.equal(await hidden.locator('#two-factor-secret, #two-factor-code, #signin-skip-two-factor').count(), 0, 'persisted pageshow replaces obsolete setup/invitation controls with the live account entry');
    check.ok(!(await hidden.locator('#panel').innerHTML()).includes(cachedSecret), 'restored account entry never reintroduces the cached setup seed');
    check.equal((await sessionFor(hidden)).body.account.account_id, hiddenActor.account_id, 'restored live account remains bound to its original session');
    await hiddenContext.close();

    const previousAutoSignup = service.autoSignup; let pending;
    try { service.autoSignup = false; pending = await service.request('POST', '/api/accounts', { body: { email: 'go-required-signup@example.test', password: PASSWORD } }); }
    finally { service.autoSignup = previousAutoSignup; }
    const pendingToken = /crp_session=([^;]+)/.exec(pending.setCookie)[1];
    const pendingContext = await browser.newContext(); const pendingPage = await pendingContext.newPage(); pendingPage.setDefaultTimeout(20000);
    await credentials(pendingPage, service.base, 'go-required-signup@example.test'); await pendingPage.locator('#signin').click(); await pendingPage.locator('#finish-signup').waitFor();
    check.ok(await pendingPage.locator('#finish-signup').isDisabled(), 'incomplete signup retains mandatory security completion before report access');
    await pendingPage.evaluate(() => new Promise(resolve => { window.addEventListener('hashchange', () => requestAnimationFrame(() => resolve()), { once: true }); location.hash = '#create'; }));
    check.equal(await pendingPage.locator('#signin-skip-two-factor').count(), 0, 'create hash cannot supply optional Skip for incomplete mandatory signup');
    check.ok(await pendingPage.locator('#finish-signup').isDisabled(), 'create hash cannot complete or bypass required email/key setup');
    check.equal((await service.request('GET', '/api/cases', { token: pendingToken })).status, 403, 'incomplete signup remains protected at the actual report API');
    await pendingContext.close();

    const expiredActor = await service.unpaidAccount('go-expired-invitation@example.test');
    const expiredContext = await browser.newContext(); const expired = await expiredContext.newPage(); expired.setDefaultTimeout(20000);
    await credentials(expired, service.base, expiredActor.email); await expired.locator('#signin').click(); await expired.locator('#signin-skip-two-factor').waitFor();
    service.service.store.update(state => { for (const row of state.sessions) if (row.account_id === expiredActor.account_id) row.expires_at = new Date(Date.now() - 1000).toISOString(); return true; });
    await expired.locator('#signin-skip-two-factor').click();
    await expired.getByRole('alert').waitFor();
    check.equal(await expired.locator('#open').count(), 0, 'expired invitation cannot enter workspace with obsolete authenticated state');
    check.equal((await sessionFor(expired)).status, 401, 'invitation continuation verifies an actually live session');
    await expiredContext.close();
    check.ok(!service.logText().includes(PASSWORD) && !service.logText().includes(seed), 'authentication activity retains no password or authenticator seed');
    return { actual_browser: true, required_factor: true, optional_enrollment: true, expired_invitation_refused: true, challenge_timeout_refused: true, persisted_history_scrubbed: true, ordinary_workspace_draft_preserved: true, expired_setup_recoverable: true, mandatory_signup_preserved: true, screenshots };
  } finally { await browser.close(); }
}
async function homepageBrowser(check) {
  let country = 'US';
  const local = await new TestService('go-homepage-layout', { geoLocate: async () => country }).listen();
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }); page.setDefaultTimeout(20000);
    const beforeState = JSON.stringify(local.service.store.state()), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install();
    let models = 0;
    page.on('request', request => { if (new URL(request.url()).pathname === '/api/homepage') models++; });
    await page.goto(local.base + '/landing.html');
    await page.waitForFunction(() => window.CRPHomepageData && document.querySelector('.credit-news-item'));
    const model = await page.evaluate(() => window.CRPHomepageData);
    check.equal(model.country, 'US', 'actual homepage and footer consume the same IP model');
    check.equal(models, 0, 'homepage and footer reuse the server-rendered IP model without a second request');
    check.equal(await page.locator('#public-homepage-model').count(), 1, 'one server model binds homepage and footer content');
    check.equal(await page.locator('select, [data-news-country], [data-news-pause]').count(), 0, 'homepage exposes no location selector or autoplay Pause control');
    check.ok(/John Doe/.test(await page.locator('.story-report').innerText()), 'existing report-paper graphic renders the fictional consumer');
    const links = await page.locator('a').evaluateAll(nodes => nodes.map(node => node.href));
    check.ok(model.free_reports.every(row => links.includes(row.url)), 'homepage renders every relevant official free-report resource');
    await page.locator('#credit-news').scrollIntoViewIfNeeded();
    const idleStories = await page.locator('.credit-news-item:visible h3').allTextContents();
    await page.clock.fastForward(120000);
    check.deepEqual(await page.locator('.credit-news-item:visible h3').allTextContents(), idleStories, 'two minutes of visible idle reading never rotates a manual carousel');
    for (const [width, columns] of [[1440, 3], [800, 2], [390, 1]]) {
      await page.setViewportSize({ width, height: 1000 });
      const rows = page.locator('.credit-news-item:visible');
      await page.waitForFunction(expected => [...document.querySelectorAll('.credit-news-item')].filter(node => node.getClientRects().length).length === expected, Math.min(columns, model.news.items.length));
      const boxes = await rows.evaluateAll(nodes => nodes.map(node => { const r = node.getBoundingClientRect(); return { width: r.width, height: r.height }; }));
      check.equal(boxes.length, Math.min(columns, model.news.items.length), width + ': manual carousel uses the responsive column count');
      check.ok(boxes.every(box => Math.abs(box.width - boxes[0].width) < 2 && Math.abs(box.height - boxes[0].height) < 2), width + ': every visible card has equal dimensions');
      check.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, width + ': compact cards and report illustration do not overflow');
      check.equal(await page.locator('body').evaluate(node => getComputedStyle(node).backgroundColor), 'rgb(255, 255, 255)', width + ': homepage retains the approved white background');
    }
    const cards = await page.locator('.credit-news-item').evaluateAll(nodes => nodes.map(node => ({ text: node.innerText || node.textContent, title: node.querySelector('h3')?.textContent, paragraphs: [...node.querySelectorAll('p')].map(p => p.textContent), links: [...node.querySelectorAll('a')].map(a => ({ text: a.textContent.trim(), href: a.href })) })));
    check.equal(await page.locator('.credit-news-item[role], .credit-news-item[aria-roledescription]').count(), 0, 'hydrated carousel preserves native list semantics');
    const accessibleLinks = await page.locator('.credit-news-more').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label')));
    check.ok(model.news.items.every(item => accessibleLinks.includes('Read more: ' + item.title + ' (opens in a new tab)')), 'hydrated source links identify each story to assistive technology');
    check.equal(cards.length, model.news.items.length, 'carousel contains exactly the real scoped stories without duplicates');
    for (const item of model.news.items) {
      const card = cards.find(row => row.title === item.title);
      check.ok(Boolean(card), 'current source story renders its unchanged title: ' + item.id);
      const excerpt = words(item.summary).slice(0, 100).join(' ');
      check.ok(card.paragraphs.some(text => words(text).join(' ').replace(/…$/, '') === excerpt), 'card uses only first 100 words of the existing CRP summary: ' + item.id);
      check.equal(card.paragraphs[0],[(item.country==='GB'?'UK':item.country),item.date_label||item.date,item.source].join(' · '), 'compact caption uses country, date and source without report-category clutter: ' + item.id);
      if(item.id==='us-equifax-settlement-2026')check.ok(/proposed|pending/i.test(card.text)&&/denies wrongdoing/i.test(card.text),'proposed settlement remains qualified in the consumer narrative');
      if(item.id==='us-transunion-2023')check.ok(/alleged/i.test(card.text)&&/neither admitted nor denied/i.test(card.text),'settlement narrative preserves allegation and non-admission qualifications');
      check.ok(card.links.some(link => /read more/i.test(link.text) && link.href === item.url), 'explicit Read more links directly to the identified source: ' + item.id);
    }
    const viewport = page.locator('[data-news-window]'); await viewport.focus();
    const before = await page.locator('.credit-news-item:visible h3').allTextContents(); await page.keyboard.press('ArrowRight');
    await page.waitForFunction(first => [...document.querySelectorAll('.credit-news-item')].filter(node => node.getClientRects().length).map(node => node.querySelector('h3')?.textContent).join('|') !== first, before.join('|'));
    check.ok(await viewport.evaluate(node => node === document.activeElement), 'manual keyboard navigation preserves carousel focus');
    country = 'CA'; await page.reload(); await page.waitForFunction(() => window.CRPHomepageData && document.querySelector('.credit-news-item'));
    const canada = await page.evaluate(() => window.CRPHomepageData); check.equal(canada.country, 'CA', 'fresh document re-localizes all public sections together');
    check.equal(await page.locator('.credit-news-item').count(), canada.news.items.length, 'jurisdiction inventory contains distinct real stories without padding');
    for(const active of ['CA','US','GB','AU']){
      country=active;
      for(const width of [1440,390]){
        await page.setViewportSize({width,height:1000});await page.goto(local.base+'/landing.html');await page.locator('.credit-news-item').first().waitFor();
        const newsModel=(await local.request('GET','/api/homepage')).json.news;
        check.ok(newsModel.items.length>=3&&newsModel.items.length<=10,active+': verified catalogue is between three and ten stories');
        const expected=width===1440?3:1;
        check.equal(await page.locator('.credit-news-item:visible').count(),expected,active+'/'+width+': responsive visible card count');
        check.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,active+'/'+width+': country carousel has no horizontal overflow');
        const seen=new Set();for(let i=0;i<newsModel.items.length;i++){const titles=await page.locator('.credit-news-item:visible h3').allTextContents();seen.add(titles[0]);await page.locator('.credit-news-item:visible [data-news-direction="1"]').first().click();}
        check.equal(seen.size,newsModel.items.length,active+'/'+width+': Next reaches every distinct country story before repeating');
        check.ok(newsModel.items.every(item=>item.country===active),active+'/'+width+': navigation stays within the IP country');
      }
    }
    // Exercise the existing client-only fallback independently of the new SSR
    // path. The ordinary pages above and GP still verify the actual SSR output.
    async function clientOnlyFixture(target) {
      await target.route('**/landing.html', async route => {
        const response = await route.fetch();
        const html = (await response.text()).replace(/<script id="public-homepage-model" type="application\/json">[\s\S]*?<\/script>/, '').replace(/(<ul class="credit-news-list"[^>]*>)[\s\S]*?<\/ul>/, '$1</ul>');
        await route.fulfill({ response, body: html });
      });
    }
    const context = await browser.newContext({ reducedMotion: 'reduce' }); const empty = await context.newPage();
    await clientOnlyFixture(empty);
    await empty.route('**/api/homepage', async route => { const data = structuredClone(canada); data.news.items = []; await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) }); });
    await empty.goto(local.base + '/landing.html');
    await empty.waitForFunction(() => window.CRPHomepageData && document.querySelector('[data-news-scope]')?.textContent.toLowerCase().includes('no '));
    check.equal(await empty.locator('.credit-news-item').count(), 0, 'empty current inventory shows a truthful shortfall without filler stories');
    check.ok(!/choose another country/i.test(await empty.locator('#credit-news').innerText()), 'empty localized news does not advertise a removed selector');
    await context.close();
    const excerptContext = await browser.newContext(); const bounded = await excerptContext.newPage();
    await clientOnlyFixture(bounded);
    const sourceWords = Array.from({ length: 105 }, (_, index) => 'fictionalword' + index);
    await bounded.route('**/api/homepage', async route => {
      const data = structuredClone(canada), item = { ...data.news.items[0], id: 'fictional-excerpt-boundary', title: 'Fictional 100-word excerpt boundary', summary: sourceWords.join(' ') };
      data.news.items = [item]; await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
    });
    await bounded.goto(local.base + '/landing.html'); await bounded.locator('.credit-news-summary').waitFor();
    check.equal(await bounded.locator('.credit-news-summary').innerText(), sourceWords.slice(0, 100).join(' '), 'actual renderer displays exactly the first 100 words of a longer fictional CRP summary');
    check.equal(await bounded.locator('.credit-news-item').count(), 1, 'one-story excerpt fixture creates one genuine card without row filler');
    check.ok((await bounded.locator('.credit-news-item [data-news-direction]').evaluateAll(nodes => nodes.every(node => node.disabled))), 'one-story carousel disables Previous/Next instead of duplicating the source');
    await excerptContext.close();
    const failureContext = await browser.newContext(); const unavailable = await failureContext.newPage();
    await clientOnlyFixture(unavailable);
    await unavailable.route('**/api/homepage', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ ok: false }) }));
    await unavailable.goto(local.base + '/landing.html');
    await unavailable.waitForFunction(() => /could not|unavailable|try again|reload/i.test(document.querySelector('[data-news-scope]')?.textContent || ''));
    check.equal(await unavailable.locator('.credit-news-item').count(), 0, 'failed public model never invents a source story');
    check.equal(await unavailable.locator('select,[data-news-country]').count(), 0, 'failed geolocation/content request does not introduce a location override');
    check.ok(await unavailable.locator('[data-home-caption]').isVisible(), 'fictional-example label remains visible if public localization fails');
    check.equal(await unavailable.locator('[data-home-badge]').textContent(), 'Violation found', 'approved illustration remains available without a public model response');
    await failureContext.close();
    for (const nextCountry of ['US', 'CA', 'GB', 'AU']) {
      country = nextCountry;
      for (const width of [1440, 1024, 800, 390, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.goto(local.base + '/landing.html');
        await page.waitForFunction(expected => window.CRPHomepageData?.country === expected, country);
        await page.evaluate(() => document.fonts.ready);
        const label = country + ' at ' + width + ': ';
        check.equal((await page.locator('[data-home-headline]').innerText()).replace(/\s+/g, ' '), model.example.headline, label + 'approved headline stays identical');
        check.equal(await page.locator('[data-home-badge]').textContent(), 'Violation found', label + 'definite finding is visible');
        check.ok(/fictional example/i.test(await page.locator('[data-home-caption]').innerText()), label + 'example label stays explicit');
        check.equal(await page.locator('.story-report-timeline').count(), 1, label + 'timeline connects the expired limit with continued reporting');
        const layout = await page.evaluate(() => {
          const fields = document.querySelector('[data-home-fields]').getBoundingClientRect();
          const finding = document.querySelector('.story-insight').getBoundingClientRect();
          const caption = document.querySelector('[data-home-caption]').getBoundingClientRect();
          const art = document.querySelector('.story-art').getBoundingClientRect();
          return { overflow: document.documentElement.scrollWidth > innerWidth, factsClear: fields.bottom < finding.top, captionClear: finding.bottom < caption.top, contained: finding.left >= art.left && finding.right <= art.right + 1, findingBackground: getComputedStyle(document.querySelector('.story-insight')).backgroundImage };
        });
        check.equal(layout.overflow, false, label + 'homepage has no horizontal overflow');
        check.ok(layout.factsClear && layout.captionClear && layout.contained, label + 'finding covers neither report facts nor example label');
        check.ok(/gradient/.test(layout.findingBackground), label + 'approved navy finding card is rendered');
      }
    }
    check.deepEqual(errors, [], 'localized illustration renders without browser exceptions');
    check.equal(JSON.stringify(local.service.store.state()), beforeState, 'anonymous illustration and localization preserve every store field');
    return { actual_browser: true, responsive_cards: [3, 2, 1], shared_ip_model: true, summary_words: 100, fictional_illustration: { countries: 4, widths: [1440, 1024, 800, 390, 320] } };
  } finally { await browser.close(); await local.close(); }
}
async function run(service, check) {
  const publicModel = await publicChecks(check);
  const auth = await browserChecks(service, check);
  const homepage = await homepageBrowser(check);
  return { fictional_only: true, local_http: true, no_external_geo_or_provider: true, public_model: publicModel, auth, homepage };
}
module.exports = { id: 'go-homepage-signin-localization', title: 'IP-localized public homepage, manual compact cards and protected second-step consumer sign-in', run };
