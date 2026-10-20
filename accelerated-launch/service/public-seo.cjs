'use strict';
/** Public presentation only. A regional URL never changes account, report or billing location. */
const content = require('./homepage-content.cjs');
const news = require('./credit-news.cjs');
const rights = require('./credit-rights-guides.cjs');
// Keep the approved stylesheet order and all rules. Public SSR avoids three
// render-blocking round trips; signed-in/application styles remain external.
const publicStyles = ['story.css', 'credit-news.css', 'theme.css'].map(name => require('node:fs').readFileSync(require('node:path').join(__dirname, 'ui', name), 'utf8')).join('\n').replace(/url\('(Roboto-Bold|OpenSans-Regular|OpenSans-Bold)\.woff2'\)/g, "url('/$1.woff2')");
const ORIGIN = 'https://creditregulatorpro.com';
const LOCALES = Object.freeze({
  AU: { path: '/au/', lang: 'en-AU', reports: 'Equifax and Experian' },
  CA: { path: '/ca/', lang: 'en-CA', reports: 'Equifax and TransUnion' },
  GB: { path: '/uk/', lang: 'en-GB', reports: 'Equifax, Experian and TransUnion' },
  US: { path: '/us/', lang: 'en-US', reports: 'AnnualCreditReport.com' }
});
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const json = value => JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
const countryForPath = pathname => Object.keys(LOCALES).find(country => LOCALES[country].path === pathname) || null;
const regionalModel = country => { const home = content.model(country); return { ...home, news: news.select(home.country) }; };
function noIndex(pathname, environment) {
  return environment === 'staging' || pathname.startsWith('/api/') || ['/index.html', '/admin', '/admin.html', '/partner-access', '/partner-access.html'].includes(pathname);
}
function discovery(pathname) {
  if (pathname === '/robots.txt') return { status: 200, content_type: 'text/plain; charset=utf-8', text: 'User-agent: *\nAllow: /\nSitemap: ' + ORIGIN + '/sitemap.xml\n' };
  if (pathname !== '/sitemap.xml') return null;
  const variants = [{ path: '/', lang: 'x-default' }, ...Object.values(LOCALES)];
  const alternates = variants.map(row => `<xhtml:link rel="alternate" hreflang="${row.lang}" href="${ORIGIN}${row.path}"/>`).join('');
  return { status: 200, content_type: 'application/xml; charset=utf-8', text: '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">' + variants.map(row => `<url><loc>${ORIGIN}${row.path}</loc>${alternates}</url>`).join('') + Object.keys(rights.guides).map(country => `<url><loc>${ORIGIN}${rights.pathFor(country)}</loc></url>`).join('') + '</urlset>\n' };
}
function reportLinks(home) {
  return home.free_reports.map(report => `<a class="story-report-link" href="${escape(report.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escape(home.country ? report.bureau : report.country + ' · ' + report.bureau)} ${escape(report.title)} (opens in a new tab)"><span><strong>${escape(home.country ? report.bureau : report.country + ' · ' + report.bureau)}</strong> <small>${escape(report.title)}</small></span><span aria-hidden="true">↗</span></a>`).join('');
}
function newsCards(data) {
  return data.items.map((item, i, items) => {
    const caption = [item.country === 'GB' ? 'UK' : item.country, item.date_label || item.date, item.source].filter(Boolean).join(' · ');
    const summary = String(item.summary || '').trim().split(/\s+/).slice(0, 100).join(' ');
    return `<li class="credit-news-item" aria-label="Story ${i + 1} of ${items.length}: ${escape(item.title)}"${i > 2 ? ' hidden' : ''}><p class="credit-news-meta">${escape(caption)}</p><h3>${escape(item.title)}</h3><p class="credit-news-summary">${escape(summary)}</p><a class="credit-news-more" href="${escape(item.url)}" target="_blank" rel="noopener noreferrer" aria-label="Read more: ${escape(item.title)} (opens in a new tab)">Read more ↗</a><div class="credit-news-card-controls"><button type="button" data-news-direction="-1" aria-label="Previous story"${items.length < 2 ? ' disabled' : ''}>← Previous</button><button type="button" data-news-direction="1" aria-label="Next story"${items.length < 2 ? ' disabled' : ''}>Next →</button></div></li>`;
  }).join('');
}
function metadata(country) {
  const name = content.COUNTRIES[country];
  const place = ['US', 'GB'].includes(country) ? 'the ' + name : name;
  return {
    title: name ? `Credit Report Review in ${name} | Credit Regulator Pro` : 'Review Your Credit Report | Credit Regulator Pro',
    description: name ? `Review your credit report in ${place}. Find official free-report links, see supported issues and prepare dispute packets you review and approve.` : 'Review your credit report, understand supported issues and prepare dispute packets you control. Find official free reports for Australia, Canada, the UK and US.',
    url: ORIGIN + (LOCALES[country]?.path || '/'),
    lang: LOCALES[country]?.lang || 'en'
  };
}
function render(template, home, routeCountry) {
  const meta = metadata(routeCountry);
  const alternate = [{ path: '/', lang: 'x-default' }, ...Object.values(LOCALES)].map(row => `<link rel="alternate" hreflang="${row.lang}" href="${ORIGIN}${row.path}">`).join('\n  ');
  const graph = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'Organization', '@id': ORIGIN + '/#organization', name: 'Credit Regulator Pro', url: ORIGIN + '/', logo: ORIGIN + '/brand-logo.svg' },
    { '@type': 'WebSite', '@id': ORIGIN + '/#website', name: 'Credit Regulator Pro', url: ORIGIN + '/', publisher: { '@id': ORIGIN + '/#organization' } },
    { '@type': 'WebPage', '@id': meta.url + '#webpage', url: meta.url, name: meta.title, description: meta.description, inLanguage: meta.lang, isPartOf: { '@id': ORIGIN + '/#website' }, about: { '@id': ORIGIN + '/#organization' } }
  ] };
  let html = template.replace('<html lang="en">', `<html lang="${meta.lang}">`).replace(/<title>[\s\S]*?<\/title>/, `<title>${escape(meta.title)}</title>`).replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${escape(meta.description)}">`);
  html = html.replace('<link rel="stylesheet" href="/story.css">', () => `<style data-public-styles>${publicStyles}</style>`).replace(/\s*<link rel="stylesheet" href="\/(?:credit-news|theme)\.css">/g, '');
  html = html.replace('</head>', `  <link rel="canonical" href="${meta.url}">\n  ${alternate}\n  <meta property="og:type" content="website">\n  <meta property="og:image" content="${ORIGIN}/brand-logo.png">\n  <meta property="og:image:width" content="256">\n  <meta property="og:image:height" content="256">\n  <meta property="og:image:alt" content="Credit Regulator Pro logo">\n  <meta property="og:site_name" content="Credit Regulator Pro">\n  <meta property="og:title" content="${escape(meta.title)}">\n  <meta property="og:description" content="${escape(meta.description)}">\n  <meta property="og:url" content="${meta.url}">\n  <meta name="twitter:card" content="summary">\n  <meta name="twitter:image" content="${ORIGIN}/brand-logo.png">\n  <meta name="twitter:title" content="${escape(meta.title)}">\n  <meta name="twitter:description" content="${escape(meta.description)}">\n  <script type="application/ld+json">${json(graph)}</script>\n  <script id="public-homepage-model" type="application/json">${json(home)}</script>\n</head>`);
  html = html.replace('data-home-country>A clearer way forward', `data-home-country>${escape(home.country ? 'A clearer way forward · ' + home.scope : 'A clearer way forward')}`);
  html = html.replace('data-home-report-location>Your first step', `data-home-report-location>${escape(home.country ? 'Your first step · ' + home.scope : 'Your first step')}`);
  html = html.replace(/(<div class="story-free-links" data-home-reports>)[\s\S]*?(<\/div><p class="story-free-note")/, (_, start, end) => start + reportLinks(home) + end);
  html = html.replace(/(<p class="story-free-note" data-home-reports-note>)[\s\S]*?<\/p>/, (_, start) => start + escape(home.report_access_note) + '</p>');
  const name = content.COUNTRIES[home.country];
  const guide = name ? `<section class="story-report-guide" aria-labelledby="report-guide-title"><h2 id="report-guide-title">Review your credit report in ${escape(['US', 'GB'].includes(home.country) ? 'the ' + name : name)}</h2><p>Get your report directly from ${escape(LOCALES[home.country].reports)} using the links above. Review the accounts and dates, then upload the report to see your free summary. With a subscription, choose supported issues and review your dispute packet before you print and mail it.</p><p>Report access and assessment coverage are separate. Check the available bureau and report options in your workspace.</p><a href="${rights.pathFor(home.country)}">Your credit reporting rights in ${escape(['US', 'GB'].includes(home.country) ? 'the ' + name : name)}</a></section>` : '';
  html = html.replace('    <section class="story-how"', guide + '\n    <section class="story-how"');
  html = html.replace('<figure class="story-art"', '<figure data-nosnippet class="story-art"');
  html = html.replace('<ul class="credit-news-list"></ul>', `<ul class="credit-news-list" data-ssr-news>${newsCards(home.news)}</ul>`);
  html = html.replace('Loading recent reports and decisions…', escape(home.news.scope + ' · Past five years · Inventory updated ' + home.news.reviewed_at));
  const count = home.news.items.length;
  html = html.replace('data-news-position aria-live="polite" aria-atomic="true"></p>', `data-news-position aria-live="polite" aria-atomic="true">${count === 1 ? '1 report' : count ? 'Report 1 of ' + count : ''}</p>`);
  const coverage = 'CRP helps you check the facts and prepare a dispute. You stay in control.';
  html = html.replace('data-news-coverage></p>', `data-news-coverage>${escape(coverage)}</p>`).replace('<noscript><p>Enable JavaScript to load reports selected for your country.</p></noscript>', '<noscript><p>These source-linked reports are available without JavaScript. Enable JavaScript to use the story controls.</p></noscript>');
  return html;
}
module.exports = { ORIGIN, LOCALES, countryForPath, regionalModel, noIndex, discovery, metadata, render };
