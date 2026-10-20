'use strict';
// Basic consent: Google is contacted only after an explicit choice, on public production pages.
(() => {
  const measurement = 'G-HC8GYCGKMW';
  const preferenceKey = 'crp-public-analytics-v1';
  const lifetime = 180 * 24 * 60 * 60 * 1000;
  const publicPaths = ['/', '/landing.html', '/au/', '/ca/', '/uk/', '/us/'];
  const panel = document.querySelector('[data-analytics-choices]');
  const status = document.querySelector('[data-analytics-status]');
  const preferences = document.querySelector('[data-analytics-preferences]');
  // Public pages measure only a previously accepted choice. The choice interface lives on privacy.html.
  if ((!panel || !status || !preferences) && !publicPaths.includes(window.location.pathname)) return;
  let started = false;
  const permitted = () => {
    try {
      const url = new URL(window.location.href);
      // Unknown query strings/fragments can contain credentials or private routing information.
      return url.protocol === 'https:' && url.hostname === 'creditregulatorpro.com' &&
        !url.port && publicPaths.includes(url.pathname) && !url.search &&
        ['', '#main', '#why', '#how', '#plans', '#free-reports', '#credit-news'].includes(url.hash) &&
        navigator.globalPrivacyControl !== true;
    } catch { return false; }
  };
  function savedChoice() {
    try {
      const saved = JSON.parse(localStorage.getItem(preferenceKey));
      return saved && saved.version === 1 && ['accepted', 'declined'].includes(saved.choice) &&
        Number.isFinite(saved.at) && saved.at <= Date.now() && Date.now() - saved.at < lifetime ? saved.choice : null;
    } catch { return null; }
  }
  function remember(choice) {
    try { localStorage.setItem(preferenceKey, JSON.stringify({ version: 1, choice, at: Date.now() })); } catch { /* Choice still applies to this page. */ }
  }
  function removeAnalyticsCookies() {
    // Never touch CRP session, security, billing or consumer document cookies.
    for (const part of document.cookie.split(';')) {
      const name = part.split('=')[0].trim();
      if (!/^_ga(?:_|$)/.test(name)) continue;
      for (const domain of ['', '; Domain=creditregulatorpro.com', '; Domain=.creditregulatorpro.com']) {
        document.cookie = name + '=; Max-Age=0; Path=/; SameSite=Lax; Secure' + domain;
      }
    }
  }
  function start() {
    if (started || !permitted()) return;
    started = true;
    window['ga-disable-' + measurement] = false;
    window.dataLayer = window.dataLayer || [];
    const gtag = function () { window.dataLayer.push(arguments); };
    window.gtag = gtag;
    gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    gtag('set', { page_location: 'https://creditregulatorpro.com' + window.location.pathname, page_referrer: '', page_title: 'Credit Regulator Pro', ads_data_redaction: true, url_passthrough: false });
    gtag('consent', 'update', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    gtag('js', new Date());
    gtag('config', measurement, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false, cookie_flags: 'SameSite=Lax;Secure', cookie_expires: 15552000 });
    gtag('event', 'page_view', { page_location: 'https://creditregulatorpro.com' + window.location.pathname, page_referrer: '', page_title: 'Credit Regulator Pro', send_to: measurement });
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurement;
    script.referrerPolicy = 'no-referrer';
    document.head.appendChild(script);
  }
  function choose(choice, persist) {
    if (persist) remember(choice);
    if (panel) panel.hidden = true;
    preferences?.setAttribute('aria-expanded', 'false');
    if (status) status.textContent = choice === 'accepted' ? 'Analytics accepted. Only public pages on our live website are measured. Return to the homepage to continue.' : 'Optional analytics are off.';
    if (choice === 'accepted') start();
    else {
      window['ga-disable-' + measurement] = true;
      removeAnalyticsCookies();
      // A fresh public document removes the already-loaded Google script after withdrawal.
      if (started) window.location.reload();
    }
  }
  document.querySelector('[data-analytics-accept]')?.addEventListener('click', () => choose('accepted', true));
  document.querySelector('[data-analytics-decline]')?.addEventListener('click', () => choose('declined', true));
  preferences?.addEventListener('click', () => { panel.hidden = !panel.hidden; preferences.setAttribute('aria-expanded', String(!panel.hidden)); });
  if (navigator.globalPrivacyControl === true) choose('declined', false);
  else {
    const saved = savedChoice();
    if (saved) choose(saved, false);
    else if (panel) { panel.hidden = false; preferences?.setAttribute('aria-expanded', 'true'); }
  }
  window.addEventListener('storage', event => {
    if (event.key === preferenceKey || event.key === null) choose(savedChoice() || 'declined', false);
  });
})();
