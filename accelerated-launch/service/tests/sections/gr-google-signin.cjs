'use strict';
const crypto = require('node:crypto');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { TestService } = require('../harness.cjs');
const security = require('../../signup-security.cjs'), google = require('../../auth0-google.cjs');
const password = 'fictional-google-backup-password';
const prefix = '/api/auth/google';

async function run(disabled, check) {
  check.equal(disabled.service.surface.google_sign_in, false, 'default service hides Google sign-in');
  check.equal((await disabled.request('POST', prefix + '/start', { body: {} })).status, 503, 'disabled Google cannot begin authentication');
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const wrongKey = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
  const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'fictional-key', alg: 'RS256', use: 'sig' };
  const env = { CRP_AUTH0_GOOGLE_ENABLED: '1', CRP_AUTH0_DOMAIN: 'fictional-crp.ca.auth0.com',
    CRP_AUTH0_CLIENT_ID: 'fictional-client-1234567890', CRP_AUTH0_PUBLIC_ORIGIN: 'http://127.0.0.1:40000' };
  for (const bad of [
    { CRP_AUTH0_DOMAIN: 'auth0.com.attacker.test' }, { CRP_AUTH0_DOMAIN: 'https://example.auth0.com/' },
    { CRP_AUTH0_PUBLIC_ORIGIN: 'http://public.example.test' }, { CRP_AUTH0_PUBLIC_ORIGIN: 'https://example.test/' },
    { CRP_DEPLOYMENT_ENV: 'production' }, { CRP_DEPLOYMENT_ENV: 'staging', CRP_AUTH0_PUBLIC_ORIGIN: 'https://creditregulatorpro.com' },
    { CRP_AUTH0_CLIENT_ID: '' }
  ]) {
    let code; try { google.configuration({ ...env, ...bad }); } catch (error) { code = error.code; }
    check.equal(code, 'GOOGLE_SIGN_IN_UNAVAILABLE', 'invalid domain, client or origin refuses: ' + JSON.stringify(bad));
  }
  let transaction, overrides = {}, headerOverrides = {}, badSignature = false, providerFailure = false, tokenOverride, jwksCalls = 0, exchanges = 0, clockOffset = 0;
  const issuer = 'https://' + env.CRP_AUTH0_DOMAIN + '/';
  const encoded = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const fetcher = async (url, init) => {
    check.equal(init.redirect, 'error', 'provider requests forbid redirects');
    if (url === issuer + '.well-known/jwks.json') { jwksCalls++; return Response.json({ keys: [jwk] }); }
    check.equal(url, issuer + 'oauth/token', 'only configured Auth0 token endpoint is contacted');
    exchanges++;
    if (providerFailure) return Response.json({ error: 'fictional provider failure' }, { status: 500 });
    const body = new URLSearchParams(init.body);
    check.equal(body.get('grant_type'), 'authorization_code', 'code exchange uses authorization_code');
    check.equal(body.get('client_id'), env.CRP_AUTH0_CLIENT_ID, 'exchange binds configured public client');
    check.equal(body.get('redirect_uri'), env.CRP_AUTH0_PUBLIC_ORIGIN + google.CALLBACK, 'exchange binds exact callback');
    check.equal(crypto.createHash('sha256').update(body.get('code_verifier')).digest('base64url'), transaction.searchParams.get('code_challenge'), 'server retained the matching S256 verifier');
    check.equal(body.get('client_secret'), null, 'public client needs no client secret');
    const now = Math.floor(Date.now() / 1000);
    const head = encoded({ alg: 'RS256', kid: jwk.kid, ...headerOverrides });
    const claims = encoded({ iss: issuer, aud: env.CRP_AUTH0_CLIENT_ID, sub: 'google-oauth2|fictional-new', email: 'new-google@example.test', email_verified: true,
      nonce: transaction.searchParams.get('nonce'), iat: now, exp: now + 300, ...overrides });
    const token = head + '.' + claims + '.' + crypto.sign('RSA-SHA256', Buffer.from(head + '.' + claims), badSignature ? wrongKey : privateKey).toString('base64url');
    return Response.json({ id_token: tokenOverride === undefined ? token : tokenOverride, access_token: 'fictional-unused-provider-token' });
  };
  const service = new TestService('google-signin-protocol', { googleSignIn: { env, fetch: fetcher, now: () => Date.now() + clockOffset } });
  await service.listen(); env.CRP_AUTH0_PUBLIC_ORIGIN = service.base;
  const row = id => service.service.store.state().accounts.find(a => a.account_id === id);
  const headers = cookie => ({ Cookie: cookie, Origin: service.base });
  async function start() {
    const result = await service.request('POST', prefix + '/start', { headers: { Origin: service.base }, body: { return_to: 'https://attacker.test/' } });
    check.equal(result.status, 200, 'same-origin Google start succeeds');
    transaction = new URL(result.json.authorize_url);
    return result.setCookie.split(';')[0];
  }
  const callback = (cookie, suffix = '') => fetch(service.base + google.CALLBACK + '?state=' + transaction.searchParams.get('state') + '&code=fictional-once-only-code' + suffix, { headers: { Cookie: cookie }, redirect: 'manual' });
  const finish = (cookie, body) => service.request('POST', prefix + '/finish', { headers: headers(cookie), body });
  const pending = cookie => service.request('GET', prefix + '/pending', { headers: { Cookie: cookie } });
  try {
    const other = await service.unpaidAccount('untouched-google-control@example.test');
    const otherBefore = structuredClone(row(other.account_id));
    const businessBefore = Object.fromEntries(Object.entries(service.service.store.state()).filter(([key]) => !['accounts', 'sessions'].includes(key)));
    check.equal((await service.request('POST', prefix + '/start', { body: {} })).status, 403, 'missing browser Origin is refused');
    check.equal((await service.request('POST', prefix + '/start', { headers: { Origin: 'https://attacker.test' }, body: {} })).status, 403, 'cross-origin start is refused');
    check.equal((await service.request('POST', prefix + '/start', { token: other.token, headers: { Origin: service.base }, body: {} })).status, 409, 'signed-in account cannot silently change identity');
    const cookie = await start();
    check.equal(transaction.origin, issuer.slice(0, -1), 'authorization uses observed tenant origin');
    check.equal(transaction.searchParams.get('scope'), 'openid email', 'only identity and email scopes requested');
    check.equal(transaction.searchParams.get('connection'), 'google-oauth2', 'Google connection is explicit');
    check.equal(transaction.searchParams.get('code_challenge_method'), 'S256', 'PKCE is mandatory');
    check.match(transaction.searchParams.get('state'), /^[A-Za-z0-9_-]{43}$/, 'state has 256 random bits');
    check.match(transaction.searchParams.get('nonce'), /^[A-Za-z0-9_-]{43}$/, 'nonce has 256 random bits');
    check.notEqual(transaction.searchParams.get('state'), transaction.searchParams.get('nonce'), 'state and nonce are independent');
    check.ok(!transaction.searchParams.has('return_to') && !transaction.searchParams.has('code_verifier'), 'untrusted return target and verifier stay out of authorization URL');
    check.equal((await pending(cookie)).status, 401, 'uncompleted authorization cannot inspect verified proof');
    const first = await callback(cookie);
    check.equal(first.status, 303, 'verified signed ID token redirects');
    check.equal(first.headers.get('location'), '/index.html#google-signin', 'fixed return URL carries no code or token');
    check.equal(first.headers.get('referrer-policy'), 'no-referrer', 'callback cannot leak its query by referrer');
    check.match(first.headers.get('cache-control'), /no-store/, 'callback is never cached');
    check.equal(service.service.store.state().accounts.length, 1, 'provider callback alone creates no account');
    check.equal((await pending(cookie)).json.action, 'CREATE_ACCOUNT', 'new identity requires explicit signup');
    check.equal((await finish(cookie, {})).json.error.code, 'GOOGLE_ACCOUNT_SETUP_REQUIRED', 'new account creation is explicit');
    check.equal((await finish(cookie, { create_account: true, password: 'short' })).status, 400, 'backup password retains length rule');
    check.equal((await service.request('POST', prefix + '/finish', { headers: { Cookie: cookie, Origin: 'https://attacker.test' }, body: { create_account: true, password } })).status, 403, 'cross-origin finish is refused');
    const created = await finish(cookie, { create_account: true, password, role: 'owner', email: other.email, account_id: other.account_id });
    check.equal(created.status, 200, 'confirmed Google signup opens ordinary CRP session');
    check.equal(created.json.account.email, 'new-google@example.test', 'untrusted email cannot override verified identity');
    check.equal(created.json.email_verified, true, 'only verified provider email marks new email verified');
    check.equal(created.json.signup_complete, false, 'Google signup still requires saving recovery key');
    check.match(created.json.recovery_key, /^[A-Za-z0-9_-]{43}$/, 'new recovery key is shown once');
    check.equal(created.json.token, undefined, 'session token never enters JSON');
    check.ok(created.headers.getSetCookie().some(value => /crp_session=.+HttpOnly.*SameSite=Strict/.test(value)), 'CRP session remains HttpOnly and Strict');
    check.ok(created.headers.getSetCookie().some(value => /crp_google_flow=;.*Max-Age=0/.test(value)), 'temporary browser proof is cleared');
    const token = /crp_session=([^;]+)/.exec(created.setCookie)[1], id = created.json.account.account_id;
    check.equal(row(id).external_identities[0].subject, 'google-oauth2|fictional-new', 'account stores immutable provider subject');
    check.ok(!Object.hasOwn(row(id), 'role'), 'Google signup grants no privileged role');
    check.equal((await finish(cookie, { create_account: true, password })).status, 401, 'finish cannot be replayed');
    check.equal((await service.request('GET', '/api/cases', { token })).status, 403, 'incomplete signup cannot access reports');
    check.equal((await service.request('POST', '/api/account/confirm-recovery-key', { token, body: { recovery_key: created.json.recovery_key } })).status, 200, 'ordinary recovery-key confirmation works');
    check.equal((await service.request('POST', '/api/account/finish-signup', { token, body: {} })).status, 200, 'ordinary signup completion works');
    check.equal((await service.request('GET', '/api/cases', { token })).status, 200, 'completed Google account accesses only its own workspace');
    check.equal((await service.request('POST', '/api/sessions', { body: { email: 'new-google@example.test', password } })).status, 200, 'backup password sign-in remains available');
    const sameCookie = await start(); await callback(sameCookie);
    check.equal((await pending(sameCookie)).json.action, 'SIGN_IN', 'subsequent Google sign-in recognizes stable binding');
    const reopened = await finish(sameCookie, {});
    check.equal(reopened.json.account.account_id, id, 'repeat Google sign-in preserves account ID');
    check.equal(reopened.json.recovery_key, undefined, 'repeat sign-in never reissues recovery key');
    const changedCookie = await start(); overrides = { email: 'changed-google@example.test' }; await callback(changedCookie); overrides = {};
    check.equal((await finish(changedCookie, {})).json.account.account_id, id, 'provider email changes cannot detach existing identity');

    const old = await service.unpaidAccount('existing-google@example.test');
    const oldBefore = structuredClone(row(old.account_id));
    const setup = await service.request('POST', '/api/account/2fa/setup', { token: old.token, body: { password: 'a-long-enough-password' } });
    check.equal(setup.status, 200, 'existing MFA enrolls through ordinary API');
    await service.request('POST', '/api/account/2fa/confirm', { token: old.token, body: { code: security.totp(setup.json.secret) } });
    service.service.store.update(s => { s.accounts.find(a => a.account_id === old.account_id).two_factor_last_counter -= 1; });
    const linkCookie = await start(); overrides = { sub: 'google-oauth2|fictional-existing', email: old.email }; await callback(linkCookie); overrides = {};
    check.equal((await pending(linkCookie)).json.action, 'LINK_ACCOUNT', 'matching email alone does not link');
    check.equal((await finish(linkCookie, {})).json.error.code, 'GOOGLE_ACCOUNT_LINK_REQUIRED', 'existing account requires explicit link');
    check.equal((await finish(linkCookie, { link_account: true, password: 'wrong' })).status, 401, 'existing password must be proved');
    check.equal(row(old.account_id).external_identities, undefined, 'wrong password never attaches identity');
    check.equal((await finish(linkCookie, { link_account: true, password: 'a-long-enough-password' })).json.error.code, 'TWO_FACTOR_REQUIRED', 'existing MFA cannot be skipped during linking');
    check.equal((await finish(linkCookie, { link_account: true, password: 'a-long-enough-password', code: 'bad' })).status, 401, 'wrong MFA refuses linking');
    check.equal(row(old.account_id).external_identities, undefined, 'failed MFA never attaches identity');
    const linkedCode = security.totp(setup.json.secret);
    const linked = await finish(linkCookie, { link_account: true, password: 'a-long-enough-password', code: linkedCode });
    check.equal(linked.status, 200, 'password plus enrolled MFA links existing account');
    check.equal(linked.json.account.account_id, old.account_id, 'linking preserves existing account ID');
    check.equal(row(old.account_id).password_hash, oldBefore.password_hash, 'linking preserves native password');
    check.equal(row(old.account_id).recovery_key_digest, oldBefore.recovery_key_digest, 'linking preserves saved recovery key');
    const mfaCookie = await start(); overrides = { sub: 'google-oauth2|fictional-existing', email: old.email }; await callback(mfaCookie); overrides = {};
    check.equal((await pending(mfaCookie)).json.two_factor_required, true, 'linked Google account still needs CRP MFA');
    check.equal((await finish(mfaCookie, {})).json.error.code, 'TWO_FACTOR_REQUIRED', 'Google cannot bypass CRP MFA');
    check.equal((await finish(mfaCookie, { code: linkedCode })).status, 401, 'MFA counter cannot be replayed through Google');
    service.service.store.update(s => { s.accounts.find(a => a.account_id === old.account_id).two_factor_last_counter -= 1; });
    check.equal((await finish(mfaCookie, { code: security.totp(setup.json.secret) })).status, 200, 'Google plus fresh factor opens same CRP account');

    for (const attack of [
      { claims: { iss: 'https://attacker.test/' } }, { claims: { aud: 'attacker-client' } }, { claims: { aud: [env.CRP_AUTH0_CLIENT_ID, 'second'] } },
      { claims: { azp: 'attacker-client' } }, { claims: { exp: 1 } }, { claims: { exp: null } },
      { claims: { iat: 1 } }, { claims: { iat: Math.floor(Date.now() / 1000) + 300 } },
      { claims: { nbf: Math.floor(Date.now() / 1000) + 300 } }, { claims: { nonce: 'forged' } },
      { claims: { email_verified: false } }, { claims: { email_verified: 'true' } }, { claims: { email: 'bad-email' } },
      { claims: { sub: 'auth0|non-google-user' } }, { headers: { alg: 'none' } }, { headers: { alg: 'HS256' } },
      { headers: { kid: 'unknown-key' } }, { headers: { jku: 'https://attacker.test/jwks' } }, { headers: { crit: ['unknown'] } },
      { signature: true }, { token: 'not.a.valid.jwt' }, { token: null }, { provider: true }
    ]) {
      const attackCookie = await start(), before = JSON.stringify(service.service.store.state());
      overrides = attack.claims || {}; headerOverrides = attack.headers || {}; badSignature = Boolean(attack.signature); providerFailure = Boolean(attack.provider); tokenOverride = attack.token;
      const result = await callback(attackCookie);
      check.equal(result.headers.get('location'), '/index.html#google-signin-error', 'invalid provider proof returns safe error: ' + JSON.stringify(attack));
      check.equal((await pending(attackCookie)).status, 401, 'invalid proof cannot create pending authorization');
      check.equal(JSON.stringify(service.service.store.state()), before, 'invalid proof cannot alter business or authentication state');
      overrides = {}; headerOverrides = {}; badSignature = false; providerFailure = false; tokenOverride = undefined;
    }
    const rejectedCookie = await start(), exchangeBefore = exchanges;
    await fetch(service.base + google.CALLBACK + '?state=forged&code=bad', { headers: { Cookie: rejectedCookie }, redirect: 'manual' });
    check.equal(exchanges, exchangeBefore, 'wrong state is refused before token exchange');
    const missingCookie = await start(); await callback('');
    check.equal(exchanges, exchangeBefore, 'callback without browser cookie cannot exchange code');
    await service.request('DELETE', prefix + '/pending', { headers: headers(missingCookie) });
    check.equal((await pending(missingCookie)).status, 401, 'cancel destroys browser proof');
    const duplicateCookie = await start(); await callback(duplicateCookie, '&state=duplicate');
    check.equal(exchanges, exchangeBefore, 'duplicate state is refused before exchange');
    const cancelledCookie = await start();
    const cancellation = await fetch(service.base + google.CALLBACK + '?state=' + transaction.searchParams.get('state') + '&error=access_denied&error_description=do-not-reflect', { headers: { Cookie: cancelledCookie }, redirect: 'manual' });
    check.equal(cancellation.headers.get('location'), '/index.html#google-signin-error', 'provider cancellation uses fixed error without reflecting provider text');
    check.equal(exchanges, exchangeBefore, 'cancelled provider consent exchanges no code');
    const expiredCookie = await start(); clockOffset = 5 * 60000 + 1;
    check.equal((await pending(expiredCookie)).status, 401, 'pending handoff expires after five minutes');
    await callback(expiredCookie);
    check.equal(exchanges, exchangeBefore, 'expired handoff cannot exchange an authorization code');
    clockOffset = 0;
    const expiredVerifiedCookie = await start(); await callback(expiredVerifiedCookie);
    clockOffset = 5 * 60000 + 1;
    check.equal((await finish(expiredVerifiedCookie, {})).status, 401, 'verified Google proof cannot open a session after expiry');
    clockOffset = 0;
    const replayCookie = await start(); await callback(replayCookie); const once = exchanges; await callback(replayCookie);
    check.equal(exchanges, once, 'authorization callback cannot be replayed');
    check.equal((await pending(replayCookie)).status, 401, 'replayed callback cannot leave usable proof');
    const signedInCookie = await start(); await callback(signedInCookie);
    check.equal((await service.request('POST', prefix + '/finish', { token: other.token, headers: headers(signedInCookie), body: {} })).status, 409, 'session established in another tab prevents account replacement');
    check.equal(jwksCalls, 1, 'valid JWKS cache and unknown-key refresh are bounded');
    const disconnect = '/api/account/google-identity';
    check.equal((await service.request('DELETE', disconnect, { body: { password } })).status, 401, 'anonymous caller cannot disconnect another identity');
    check.equal((await service.request('DELETE', disconnect, { token, body: { password: 'wrong' } })).status, 401, 'disconnect requires the current password');
    check.equal((await service.request('GET', '/api/account/security', { token })).json.google_connected, true, 'security screen exposes existing Google connection');
    check.equal((await service.request('DELETE', disconnect, { token, body: { password, account_id: old.account_id } })).status, 200, 'owner can disconnect only their own Google binding');
    check.equal(row(id).external_identities, undefined, 'disconnect removes only the owned Google identity');
    check.equal((await service.request('GET', '/api/session', { token })).status, 401, 'disconnect revokes earlier consumer sessions');
    check.equal((await service.request('GET', '/api/session', { token: other.token })).status, 200, 'disconnect preserves unrelated sessions');
    check.equal((await service.request('POST', '/api/sessions', { body: { email: 'new-google@example.test', password } })).status, 200, 'native password still works after disconnect');
    check.equal((await service.request('DELETE', disconnect, { token: old.token, body: { password: 'a-long-enough-password' } })).json.error.code, 'TWO_FACTOR_REQUIRED', 'disconnect cannot bypass existing MFA');
    check.equal((await service.request('DELETE', disconnect, { token: old.token, body: { password: 'a-long-enough-password', code: 'bad' } })).status, 401, 'wrong MFA cannot disconnect Google');
    check.equal(row(old.account_id).external_identities.length, 1, 'refused disconnect preserves the binding');
    check.deepEqual(row(other.account_id), otherBefore, 'unrelated account row is exact');
    check.deepEqual(Object.fromEntries(Object.entries(service.service.store.state()).filter(([key]) => !['accounts', 'sessions'].includes(key))), businessBefore, 'all existing report, packet and billing tables stay exact');
    check.ok(!JSON.stringify(service.service.store.state()).includes('fictional-unused-provider-token'), 'provider tokens never enter private state');
    check.ok(!service.logs.join('\n').includes('fictional-once-only-code') && !service.logs.join('\n').includes('@example.test'), 'logs exclude authorization codes and email');
    const cookieHeader = (await service.request('POST', prefix + '/start', { headers: { Origin: service.base }, body: {} })).setCookie;
    check.match(cookieHeader, /HttpOnly; SameSite=Lax; Path=\/api\/auth\/google; Max-Age=300/, 'flow cookie is bounded and limited to handoff routes');
    await uiChecks(check);
    const { chromium } = require('C:/Users/webbd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
    const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
    let browserStage = 'open local Google sign-in', browserPage;
    try {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      // A clearly fictional provider transport exercises the real callback and UI.
      // No request leaves loopback; no real Google account or consent is used.
      await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.origin === service.base) return route.continue();
        if (url.origin === issuer.slice(0, -1) && url.pathname === '/authorize') {
          transaction = url;
          return route.fulfill({ status: 302, headers: { location: service.base + google.CALLBACK + '?state=' + url.searchParams.get('state') + '&code=fictional-browser-code' }, body: '' });
        }
        return route.abort();
      });
      overrides = { email: 'browser-google@example.test', sub: 'google-oauth2|fictional-browser' };
      const page = await context.newPage(); browserPage = page; page.setDefaultTimeout(20000);
      await page.goto(service.base + '/index.html#signin');
      await page.locator('#signin-google').click();
      await page.locator('#google-password').waitFor();
      check.equal(await page.locator('#google-password-confirm').count(), 1, 'real mobile UI reaches Google-backed new-account setup');
      check.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Google setup has no mobile overflow');
      await page.locator('#google-password').fill(password); await page.locator('#google-password-confirm').fill(password);
      await page.locator('#google-finish').click();
      await page.locator('#saved-recovery-key').waitFor();
      check.ok(/Email confirmed/.test(await page.locator('#panel').innerText()), 'actual Google signup marks only verified email confirmed');
      check.equal(await page.locator('#finish-signup').isDisabled(), true, 'actual Google signup waits for recovery-key confirmation');
      await page.locator('#saved-recovery-key').click(); await page.locator('#finish-signup').click();
      await page.locator('#file').waitFor();
      const browserSession = await page.request.get(service.base + '/api/session');
      const browserActor = (await browserSession.json()).account;
      check.equal(browserActor.email, 'browser-google@example.test', 'real UI reaches owned workspace after Google setup');
      browserStage = 'sign out after Google signup';
      await page.getByRole('button', { name: 'Navigation menu' }).click();
      await page.locator('[data-step="0"]').click(); await page.locator('#signout').click();
      browserStage = 'repeat Google sign-in';
      await page.locator('#signin-google').click(); await page.locator('#google-finish').waitFor();
      check.equal(await page.locator('#google-password').count(), 0, 'repeat Google UI does not ask for a password');
      await page.locator('#google-finish').click(); await page.locator('#signin-skip-two-factor').click(); await page.locator('#file').waitFor();
      check.equal((await (await page.request.get(service.base + '/api/session')).json()).account.account_id, browserActor.account_id, 'repeat actual UI keeps the original account and workspace');
      browserStage = 'sign out before Google cancellation';
      await page.getByRole('button', { name: 'Navigation menu' }).click();
      await page.locator('[data-step="0"]').click(); await page.locator('#signout').click();
      browserStage = 'cancel Google sign-in';
      await page.locator('#signin-google').click(); await page.locator('#google-cancel').click(); await page.locator('#password').waitFor();
      check.equal((await page.request.get(service.base + '/api/session')).status(), 401, 'actual Cancel returns to password entry without a session');
      await context.close(); overrides = {};
    } catch (error) {
      const debug = { stage: browserStage, url: browserPage?.url(), text: browserPage ? await browserPage.locator('body').innerText().catch(() => '') : '' };
      const debugDir = path.join(__dirname, '../../out/google-signin-local-20261018'); fs.mkdirSync(debugDir, { recursive: true });
      fs.writeFileSync(path.join(debugDir, 'fictional-browser-failure-' + Date.now() + '.json'), JSON.stringify(debug, null, 2));
      throw new Error(browserStage + ': ' + error.message);
    } finally { await browser.close(); }
    return { scope: 'fictional isolated HTTP, signed OIDC tokens, VM and actual headless Chrome UI with a simulated provider transport', hosted_google_login: 'NOT_RUN', provider_mutations: 0 };
  } finally { await service.close(); }
}

async function uiChecks(check) {
  const raw = fs.readFileSync(path.join(__dirname, '../../ui/app.js'), 'utf8');
  const source = raw.slice(0, raw.indexOf('/* ------------------------------------------------------------------ bootstrap */'));
  const nodes = new Map();
  const node = id => { if (!nodes.has(id)) nodes.set(id, { value: '', innerHTML: '', disabled: false, setAttribute() {}, removeAttribute() {}, focus() {}, querySelectorAll: () => [], reportValidity: () => true }); return nodes.get(id); };
  const calls = [], context = { console, URL, URLSearchParams, setTimeout, clearTimeout, location: { hash: '#signin', pathname: '/index.html', protocol: 'http:', assign: value => calls.push(value) }, history: { replaceState() {} }, document: { getElementById: node } };
  vm.createContext(context); vm.runInContext(source, context);
  const evaluate = value => vm.runInContext(value, context);
  evaluate('surface={google_sign_in:true}; renderAccount(document.getElementById("panel"));');
  check.ok(node('panel').innerHTML.includes('Continue with Google'), 'enabled UI presents Google alongside password');
  check.ok(node('panel').innerHTML.includes('id="password"'), 'Google never removes password sign-in');
  evaluate('surface.google_sign_in=false;renderAccount(document.getElementById("panel"));');
  check.ok(!node('panel').innerHTML.includes('Continue with Google'), 'unconfigured Google option stays hidden');
  evaluate('state.googleSignInPending={email:"<script>@example.test",action:"LINK_ACCOUNT",two_factor_required:true};renderAccount(document.getElementById("panel"));');
  check.ok(node('panel').innerHTML.includes('CRP password') && node('panel').innerHTML.includes('CRP authenticator'), 'link screen requests both existing factors');
  check.ok(!node('panel').innerHTML.includes('<script>'), 'provider email is escaped before rendering');
  evaluate('state.googleSignInPending={email:"new@example.test",action:"CREATE_ACCOUNT"};renderAccount(document.getElementById("panel"));');
  check.ok(node('panel').innerHTML.includes('Backup password') && node('panel').innerHTML.includes('recovery key'), 'new Google signup explains backup password and recovery');
  evaluate('state.googleSignInPending={email:"old@example.test",action:"SIGN_IN",two_factor_required:true};renderAccount(document.getElementById("panel"));');
  check.ok(!node('panel').innerHTML.includes('id="google-password"') && node('panel').innerHTML.includes('id="google-code"'), 'repeat Google sign-in needs only enrolled CRP factor');
}
module.exports = { id: 'gr-google-signin', title: 'Google/Auth0 PKCE, verified identity, safe linking and CRP MFA', run };
