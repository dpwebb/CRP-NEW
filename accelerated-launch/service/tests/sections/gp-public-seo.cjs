'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { TestService } = require('../harness.cjs');
const seo = require('../../public-seo.cjs');
async function run(unused, check) {
  const environment = process.env.CRP_DEPLOYMENT_ENV;
  let ipCountry = 'CA', lookupIp, calls = 0;
  process.env.CRP_DEPLOYMENT_ENV = 'production';
  const service = await new TestService('gp-public-seo', { geoLocate: async ip => { calls++; lookupIp = ip; if (ipCountry === 'THROW') throw Error('fictional unavailable lookup'); return ipCountry; } }).listen();
  try {
    const before = JSON.stringify(service.service.store.state());
    const jurisdictions = await service.request('GET', '/api/jurisdictions');
    check.ok(jurisdictions.json.surface.regions.length >= 82, 'SEO does not reduce assessment jurisdictions');
    for (const [country, locale] of Object.entries(seo.LOCALES)) {
      ipCountry = country === 'CA' ? 'AU' : 'CA';
      const observedCalls = calls;
      const response = await service.request('GET', locale.path + '?country=ZZ&currency=usd', { headers: { Host: 'untrusted.invalid', 'X-Country': 'ZZ' } });
      check.equal(response.status, 200, country + ': public landing page loads');
      check.equal(calls, observedCalls, country + ': explicit public URL does not depend on viewer IP');
      check.equal(response.setCookie, null, country + ': public page creates no session');
      check.match(response.headers.get('cache-control'), /no-store/, country + ': no shared personalized caching');
      check.equal(response.headers.get('x-robots-tag'), null, country + ': production public page is indexable');
      check.match(response.text, new RegExp('<html lang="' + locale.lang + '">'), country + ': correct regional language');
      check.ok(response.text.includes('rel="canonical" href="' + seo.ORIGIN + locale.path + '"'), country + ': canonical ignores request Host and query');
      check.ok(!response.text.includes('untrusted.invalid'), country + ': request Host cannot poison public metadata');
      for (const row of Object.values(seo.LOCALES)) check.ok(response.text.includes('hreflang="' + row.lang + '" href="' + seo.ORIGIN + row.path + '"'), country + ': reciprocal locale ' + row.lang);
      check.ok(response.text.includes('hreflang="x-default" href="' + seo.ORIGIN + '/"'), country + ': root is x-default');
      const match = /<script id="public-homepage-model" type="application\/json">([\s\S]*?)<\/script>/.exec(response.text);
      const model = JSON.parse(match[1]);
      check.ok(response.text.includes('<style data-public-styles>') && !/<link rel="stylesheet"/.test(response.text), country + ': public SSR has no blocking stylesheet requests');
      check.ok(response.text.includes("url('/Roboto-Bold.woff2')") && response.text.includes("url('/OpenSans-Regular.woff2')"), country + ': inline fonts remain root-relative on regional routes');
      check.ok(!/<li[^>]*role="group"|<li[^>]*aria-roledescription="slide"/.test(response.text), country + ': SSR carousel retains native listitem semantics');
      for (const item of model.news.items) check.ok(response.text.includes('aria-label="Read more: ' + item.title.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])) + ' (opens in a new tab)"'), country + ': SSR source link identifies its story');
      check.equal(model.country, country, country + ': hydration and initial HTML share one country');
      check.equal(model.example.fictional, true, country + ': illustration remains fictional');
      check.ok(response.text.includes('data-nosnippet class="story-art"'), country + ': sample finding excluded from text snippets');
      for (const report of model.free_reports) check.ok(response.text.includes('href="' + report.url.replaceAll('&', '&amp;') + '"'), country + ': report link available without JS');
      for (const story of model.news.items) check.ok(response.text.includes(story.url.replaceAll('&', '&amp;')), country + ': source story link in initial HTML');
      const graph = JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(response.text)[1]);
      check.deepEqual(graph['@graph'].map(row => row['@type']), ['Organization', 'WebSite', 'WebPage'], country + ': schema contains no invented reviews/findings');
      check.equal(graph['@graph'][2].url, seo.ORIGIN + locale.path, country + ': schema matches canonical');
      check.ok(!/href="index\.html|src="homepage\.js|href="story\.css/.test(response.text), country + ': assets and authentication links are root-relative');
      check.ok(!/<select\b/.test(response.text), country + ': no public jurisdiction selector');
      const head = await service.request('HEAD', locale.path);
      check.equal(head.status, 200, country + ': HEAD supported');
      check.equal(head.text, '', country + ': HEAD has no body');
    }
    for (const country of ['US', 'CA', 'GB', 'AU', null, 'DE', 'THROW']) {
      ipCountry = country;
      const response = await service.request('GET', '/?country=AU', { headers: { 'X-Forwarded-For': '198.51.100.7', 'Accept-Language': 'en-AU' } });
      const model = JSON.parse(/id="public-homepage-model" type="application\/json">([\s\S]*?)<\/script>/.exec(response.text)[1]);
      const expected = Object.hasOwn(seo.LOCALES, country) ? country : null;
      check.equal(model.country, expected, String(country) + ': root retains authoritative viewer-IP detection and truthful unknown/offline fallback');
      check.equal(lookupIp, '198.51.100.7', String(country) + ': existing trusted IP resolver is used');
      check.ok(response.text.includes('rel="canonical" href="' + seo.ORIGIN + '/"'), String(country) + ': adaptive root canonical is stable');
      check.equal((await service.request('GET', '/api/homepage?country=AU')).json.country, expected, String(country) + ': original API still ignores client country hints');
    }
    const robots = await service.request('GET', '/robots.txt');
    check.equal(robots.status, 200, 'robots.txt served');
    check.match(robots.headers.get('content-type'), /text\/plain/, 'robots content type');
    check.match(robots.text, /Sitemap: https:\/\/creditregulatorpro.com\/sitemap.xml/, 'robots points to public sitemap');
    check.ok(!/Disallow: \/(?:story|homepage|credit-news)/.test(robots.text), 'public rendering assets remain crawlable');
    const sitemap = await service.request('GET', '/sitemap.xml');
    check.equal(sitemap.status, 200, 'sitemap served');
    check.equal((sitemap.text.match(/<loc>/g) || []).length, 5, 'sitemap lists only root and four public pages');
    check.ok(!/index.html|api\/|staging|account|token|lastmod/.test(sitemap.text), 'no private, staging, query-secret or fictional fresh dates in sitemap');
    check.equal((await service.request('POST', '/sitemap.xml')).status, 404, 'discovery endpoints do not accept mutations');
    for (const route of ['/index.html#signin', '/?checkout=return', '/?checkout=cancel']) {
      const response = await service.request('GET', route);
      check.equal(response.status, 200, route + ': existing application entry stays available');
      check.ok(!response.text.includes('id="public-homepage-model"'), route + ': SEO does not replace the application shell');
      check.equal(response.headers.get('x-robots-tag'), 'noindex', route + ': application entry is never a search landing page');
    }
    check.equal((await service.request('GET', '/index.html')).headers.get('x-robots-tag'), 'noindex', 'sign-in/application shell excluded from search');
    check.equal((await service.request('GET', '/api/homepage')).headers.get('x-robots-tag'), 'noindex', 'public JSON is not a search landing page');
    check.equal((await service.request('GET', '/api/session')).status, 401, 'SEO creates no authenticated session');
    for (const asset of ['brand-logo.svg', 'brand-logo.png']) {
      const image = await fetch(service.base + '/' + asset);
      check.equal(image.status, 200, asset + ': public brand image is crawlable');
      const bytes = Buffer.from(await image.arrayBuffer());
      check.ok(bytes.equals(fs.readFileSync(path.join(__dirname, '../../ui', asset))), asset + ': public image bytes served without text conversion');
    }
    for (const route of ['/de/', '/au/../private', '/au/index.html', '/public-seo.cjs']) check.equal((await service.request('GET', route)).status, 404, route + ': no generic file/country fallback');
    process.env.CRP_DEPLOYMENT_ENV = 'staging';
    for (const route of ['/', '/au/', '/robots.txt', '/sitemap.xml', '/index.html']) check.equal((await service.request('GET', route)).headers.get('x-robots-tag'), 'noindex', route + ': staging remains excluded');
    check.equal(JSON.stringify(service.service.store.state()), before, 'public SEO requests preserve every private store field');
    const template = fs.readFileSync(path.join(__dirname, '../../ui/landing.html'), 'utf8');
    const hostile = seo.regionalModel('CA'); hostile.report_access_note = '</script><script>alert(1)</script>&';
    const safe = seo.render(template, hostile, 'CA');
    check.ok(!safe.includes('</script><script>alert(1)</script>'), 'HTML and JSON public model are script-safe');
    check.ok(safe.includes('\\u003c/script\\u003e'), 'embedded model escapes script delimiters');
    await realServer(check);
    return { fictional_only: true, country_pages: 4, ip_root_preserved: true, no_provider_calls: true, hosted_actions: false };
  } finally { await service.close(); if (environment === undefined) delete process.env.CRP_DEPLOYMENT_ENV; else process.env.CRP_DEPLOYMENT_ENV = environment; }
}
async function realServer(check) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'crp-seo-worker-'));
  const child = spawn(process.execPath, [path.join(__dirname, '../../server.cjs')], {
    env: { ...process.env, CRP_LOCAL_SERVICE_DATA: path.join(temp, 'private'), CRP_LOCAL_SERVICE_HOST: '127.0.0.1', CRP_LOCAL_SERVICE_PORT: '0', CRP_LOCAL_SERVICE_LOG: 'silent', CRP_DEPLOYMENT_ENV: 'production' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  try {
    const base = await new Promise((resolve, reject) => {
      let output = ''; const timer = setTimeout(() => reject(Error('SEO_SERVER_START_TIMEOUT')), 15000);
      child.once('exit', () => { clearTimeout(timer); reject(Error('SEO_SERVER_START_FAILED')); });
      child.stdout.on('data', chunk => { output += chunk; const match = /listening on (http:\/\/[^\s]+)\//.exec(output); if (match) { clearTimeout(timer); resolve(match[1]); } });
    });
    const stateFile = path.join(temp, 'private', 'state.json');
    const initialState = fs.readFileSync(stateFile);
    for (const [country, locale] of Object.entries(seo.LOCALES)) {
      const response = await fetch(base + locale.path); const html = await response.text();
      check.equal(response.status, 200, country + ': actual worker transport serves regional page');
      check.ok(html.includes('id="public-homepage-model"'), country + ': actual server uses SSR');
      check.ok(html.includes('rel="canonical" href="' + seo.ORIGIN + locale.path + '"'), country + ': actual server preserves regional canonical');
      check.equal(JSON.parse(/id="public-homepage-model" type="application\/json">([\s\S]*?)<\/script>/.exec(html)[1]).country, country, country + ': actual server delivers correct public model');
      check.match(response.headers.get('content-security-policy'), /googletagmanager/, country + ': actual public CSP allows consent-gated tag');
      const head = await fetch(base + locale.path, { method: 'HEAD' });
      check.equal(head.status, 200, country + ': actual worker handles HEAD');
      check.equal(await head.text(), '', country + ': worker HEAD has no body');
    }
    const root = await fetch(base + '/'); const rootHtml = await root.text();
    check.ok(rootHtml.includes('id="public-homepage-model"'), 'actual adaptive root is server-rendered');
    check.equal(JSON.parse(/id="public-homepage-model" type="application\/json">([\s\S]*?)<\/script>/.exec(rootHtml)[1]).country, null, 'actual loopback IP retains unknown-location fallback without a remote lookup');
    for (const route of ['/robots.txt', '/sitemap.xml']) check.equal((await fetch(base + route)).status, 200, route + ': discovery reaches real worker instead of static 404');
    const privatePage = await fetch(base + '/index.html');
    check.equal(privatePage.headers.get('content-encoding'), null, 'private application shell remains uncompressed');
    for (const route of ['/au/', '/ca/', '/uk/', '/us/', '/story.css', '/credit-news.css', '/homepage.js', '/sitemap.xml']) {
      const identity = await fetch(base + route, { headers: { 'Accept-Encoding': 'identity' } });
      const expected = Buffer.from(await identity.arrayBuffer());
      const compressed = await fetch(base + route, { headers: { 'Accept-Encoding': 'gzip' } });
      check.equal(compressed.headers.get('content-encoding'), 'gzip', route + ': public transfer is compressed');
      check.ok(Buffer.from(await compressed.arrayBuffer()).equals(expected), route + ': compressed response decodes to exact public bytes');
      check.match(compressed.headers.get('cache-control'), /no-store/, route + ': compression preserves no-store');
      check.equal(compressed.headers.get('vary'), 'Accept-Encoding', route + ': representation varies by supported encoding');
      const head = await fetch(base + route, { method: 'HEAD', headers: { 'Accept-Encoding': 'gzip' } });
      check.equal(head.headers.get('content-length'), compressed.headers.get('content-length'), route + ': HEAD matches encoded length');
      check.equal(await head.text(), '', route + ': encoded HEAD has no body');
      const denied = await fetch(base + route, { headers: { 'Accept-Encoding': 'gzip;q=0, *;q=1' } });
      check.equal(denied.headers.get('content-encoding'), null, route + ': explicit gzip refusal wins over wildcard');
    }
    for (const name of ['Roboto-Bold', 'OpenSans-Regular', 'OpenSans-Bold']) {
      const response = await fetch(base + '/' + name + '.woff2');
      const actual = Buffer.from(await response.arrayBuffer());
      check.equal(response.headers.get('content-type'), 'font/woff2', name + ': correct font MIME');
      check.equal(actual.subarray(0,4).toString(), 'wOF2', name + ': valid WOFF2 signature');
      check.ok(actual.equals(fs.readFileSync(path.join(__dirname, '../../ui', name + '.woff2'))), name + ': exact binary font transfer');
      check.ok(actual.length < fs.statSync(path.join(__dirname, '../../ui', name + '.ttf')).size / 2, name + ': font payload more than halved');
    }
    check.equal(privatePage.headers.get('x-robots-tag'), 'noindex', 'actual HTTP static application entry is noindex');
    check.ok(!/googletagmanager/.test(privatePage.headers.get('content-security-policy')), 'actual private static CSP stays strict');
    const unauthorized = await fetch(base + '/api/session');
    check.equal(unauthorized.headers.get('content-encoding'), null, 'private API refusal remains uncompressed');
    check.equal(unauthorized.status, 401, 'actual worker retains private authentication refusal');
    check.equal(unauthorized.headers.get('x-robots-tag'), 'noindex', 'actual worker preserves accumulated indexing headers');
    for (const route of ['/api/health', '/api/ready']) check.equal((await fetch(base + route)).status, 200, route + ': independent health/readiness stay available');
    check.ok(fs.readFileSync(stateFile).equals(initialState), 'actual public worker requests preserve initial private state bytes');
    check.equal(JSON.parse(fs.readFileSync(stateFile, 'utf8')).accounts.length, 0, 'actual public worker requests create no consumer accounts');
  } finally {
    if (child.exitCode === null) { const exited = once(child, 'exit'); child.kill('SIGTERM'); await exited; }
    const resolved = path.resolve(temp); if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('crp-seo-worker-')) throw Error('Refusing unexpected test cleanup path');
    fs.rmSync(resolved, { recursive: true, force: true });
  }
}
module.exports = { id: 'gp-public-seo', title: 'Public SEO, deterministic regional pages, IP-only root and private indexing boundaries', run };
