'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { TestService } = require('../harness.cjs');
const source = fs.readFileSync(path.join(__dirname, '../../ui/public-analytics.js'), 'utf8');
const KEY = 'crp-public-analytics-v1';
function browser(url, options = {}) {
  const elements = {}, scripts = [], deletedCookies = [], saved = new Map();
  for (const name of ['choices', 'status', 'preferences', 'accept', 'decline']) elements[name] = { hidden: true, textContent: '', addEventListener: (event, fn) => { elements[name][event] = fn; } };
  if (options.saved) saved.set(KEY, JSON.stringify(options.saved));
  let reloads = 0;
  const location = new URL(url); location.reload = () => { reloads++; };
  const document = {
    querySelector: selector => elements[selector.slice(16, -1)],
    createElement: () => ({}), head: { appendChild: script => { if (options.scriptFailure) return; scripts.push(script); } }
  };
  Object.defineProperty(document, 'cookie', { get: () => '_ga=fictional; _ga_HC8GYCGKMW=fictional; crp_session=preserve; unrelated=preserve', set: value => deletedCookies.push(value) });
  const window = { location }, context = { window, document, navigator: { globalPrivacyControl: options.gpc }, URL, Date, localStorage: { getItem: k => { if (options.storageFailure) throw Error('fictional storage blocked'); return saved.get(k) || null; }, setItem: (k, v) => { if (options.storageFailure) throw Error('fictional storage blocked'); saved.set(k, v); } } };
  vm.runInNewContext(source, context, { timeout: 1000 });
  return { elements, scripts, deletedCookies, saved, window, reloads: () => reloads, events: () => (window.dataLayer || []).map(a => Array.from(a)) };
}
async function run(unused, check) {
  const accepted = { version: 1, choice: 'accepted', at: Date.now() };
  const page = browser('https://creditregulatorpro.com/au/');
  check.equal(page.scripts.length, 0, 'default consent makes no Google request');
  check.equal(page.events().length, 0, 'basic consent makes no denied-state pings');
  check.equal(page.elements.choices.hidden, false, 'first visit offers a nonblocking choice');
  page.elements.decline.click();
  check.equal(page.scripts.length, 0, 'decline never loads Google');
  check.equal(JSON.parse(page.saved.get(KEY)).choice, 'declined', 'decline remembered');
  check.ok(page.deletedCookies.every(v => v.startsWith('_ga')), 'decline removes only Google Analytics cookies');
  page.elements.preferences.click();
  check.equal(page.elements.choices.hidden, false, 'preferences remain accessible');
  page.elements.accept.click();
  check.equal(page.scripts.length, 1, 'explicit public production opt-in loads one SDK');
  check.equal(page.scripts[0].src, 'https://www.googletagmanager.com/gtag/js?id=G-HC8GYCGKMW', 'existing property only');
  check.equal(page.scripts[0].referrerPolicy, 'no-referrer', 'SDK request sends no page referrer');
  page.elements.accept.click();
  check.equal(page.scripts.length, 1, 'repeat choice cannot double-count page views');
  const events = page.events();
  check.equal(events.filter(e => e[0] === 'event').length, 1, 'only an explicit public page-view event is sent');
  const config = events.find(e => e[0] === 'config')[2];
  check.equal(config.send_page_view, false, 'automatic page views disabled');
  check.equal(config.allow_google_signals, false, 'Google signals disabled');
  check.equal(config.allow_ad_personalization_signals, false, 'ad personalization disabled');
  const consent = events.find(e => e[0] === 'consent' && e[1] === 'update')[2];
  check.equal(consent.analytics_storage, 'granted', 'only accepted analytics is granted');
  for (const key of ['ad_storage', 'ad_user_data', 'ad_personalization']) check.equal(consent[key], 'denied', key + ' remains denied');
  const payload = events.find(e => e[0] === 'event')[2];
  check.equal(payload.page_location, 'https://creditregulatorpro.com/au/', 'page path is fixed public URL');
  check.equal(payload.page_referrer, '', 'no private or external referrer is transmitted');
  check.deepEqual(Object.keys(payload).sort(), ['page_location', 'page_referrer', 'page_title', 'send_to'], 'no consumer identifiers or form values in event');
  page.elements.decline.click();
  check.equal(page.window['ga-disable-G-HC8GYCGKMW'], true, 'withdrawal disables measurement immediately');
  check.equal(page.reloads(), 1, 'withdrawal removes loaded SDK with a fresh public document');
  check.equal(page.events().length, events.length, 'withdrawal does not send a new consent ping');
  for (const url of [
    'http://127.0.0.1:5173/', 'http://localhost:5173/au/', 'https://staging.creditregulatorpro.com/',
    'https://creditregulatorpro.com/index.html#signin', 'https://creditregulatorpro.com/api/session',
    'https://creditregulatorpro.com/admin', 'https://creditregulatorpro.com/?checkout=return',
    'https://creditregulatorpro.com/?token=fictional-secret', 'https://creditregulatorpro.com/?utm_source=example',
    'https://creditregulatorpro.com/#reset=fictional-secret', 'https://creditregulatorpro.com/#signin',
    'https://creditregulatorpro.com.evil.invalid/', 'https://creditregulatorpro.com:8443/'
  ]) {
    const blocked = browser(url, { saved: accepted }); blocked.elements.accept.click();
    check.equal(blocked.scripts.length, 0, url + ': never loads SDK');
    check.equal(blocked.events().length, 0, url + ': never queues identifiers/URLs');
  }
  for (const route of ['/', '/landing.html', '/au/', '/ca/', '/uk/', '/us/', '/ca/#free-reports']) {
    const permitted = browser('https://creditregulatorpro.com' + route, { saved: accepted });
    check.equal(permitted.scripts.length, 1, route + ': remembered valid consent works');
    check.ok(!JSON.stringify(permitted.events()).includes('#free-reports'), route + ': fragment excluded from measurement');
  }
  for (const saved of [{ ...accepted, at: Date.now() - 181 * 86400000 }, { ...accepted, at: Date.now() + 86400000 }, { ...accepted, version: 0 }]) check.equal(browser('https://creditregulatorpro.com/', { saved }).scripts.length, 0, 'expired/future/unknown-version consent is not accepted');
  const gpc = browser('https://creditregulatorpro.com/', { saved: accepted, gpc: true }); gpc.elements.accept.click();
  check.equal(gpc.scripts.length, 0, 'Global Privacy Control prevents measurement');
  const noStorage = browser('https://creditregulatorpro.com/', { storageFailure: true }); noStorage.elements.decline.click();
  check.equal(noStorage.scripts.length, 0, 'blocked preference storage does not break decline');
  const failed = browser('https://creditregulatorpro.com/', { scriptFailure: true }); failed.elements.accept.click();
  check.equal(failed.elements.choices.hidden, true, 'unavailable Google SDK leaves page usable');
  const environment = process.env.CRP_DEPLOYMENT_ENV; process.env.CRP_DEPLOYMENT_ENV = 'production';
  const service = await new TestService('gq-public-analytics', { geoLocate: async () => 'AU' }).listen();
  try {
    const before = JSON.stringify(service.service.store.state());
    for (const route of ['/', '/au/', '/ca/', '/uk/', '/us/']) {
      const response = await service.request('GET', route);
      check.ok(response.text.includes('src="/public-analytics.js" defer'), route + ': public consent script only');
      check.ok(response.text.includes('data-analytics-decline'), route + ': decline is as accessible as accept');
      check.ok(!response.text.includes('src="https://www.googletagmanager.com'), route + ': server never preloads Google');
      check.match(response.headers.get('content-security-policy'), /script-src 'self' https:\/\/www.googletagmanager.com/, route + ': narrowly scoped public SDK permission');
    }
    for (const route of ['/index.html', '/?checkout=return', '/?checkout=cancel', '/api/session']) {
      const response = await service.request('GET', route);
      check.ok(!response.text.includes('public-analytics.js'), route + ': no analytics on account/checkout/API');
      check.ok(!/google-analytics|googletagmanager/.test(response.headers.get('content-security-policy')), route + ': private CSP remains strict');
    }
    check.equal((await service.request('GET', '/public-analytics.js')).status, 200, 'public script is available');
    check.equal(JSON.stringify(service.service.store.state()), before, 'measurement setup never touches consumer store');
    return { fictional_only: true, google_requests: 0, hosted_actions: false, private_tracking: false };
  } finally { await service.close(); if (environment === undefined) delete process.env.CRP_DEPLOYMENT_ENV; else process.env.CRP_DEPLOYMENT_ENV = environment; }
}
module.exports = { id: 'gq-public-analytics', title: 'Basic consent, public-only Analytics and consumer privacy boundaries', run };
