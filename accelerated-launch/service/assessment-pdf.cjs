'use strict';
// Paid assessment design: owned report facts stay local, using the same shipped font as printed packets.
const { renderDrawingPdf, measurePdfText, wrapPdfText } = require('./packet-pdf.cjs');
const issues = require('./issues.cjs');

const COLORS = Object.freeze({ ink: [0.10, 0.22, 0.22], green: [0.13, 0.28, 0.24],
  muted: [0.34, 0.42, 0.40], pale: [0.94, 0.96, 0.92], accent: [0.52, 0.64, 0.28],
  line: [0.82, 0.87, 0.82], white: [1, 1, 1], alert: [0.61, 0.23, 0.15] });
const LEFT = 48, WIDTH = 516, BOTTOM = 72;
const COUNTRY_NAMES = { CA: 'Canada', US: 'United States', GB: 'United Kingdom', UK: 'United Kingdom', AU: 'Australia', NZ: 'New Zealand' };
function plain(value) { return String(value == null ? '' : value).replace(/[\r\n\t]+/g, ' ').trim(); }
function day(value) { return plain(value).slice(0, 10); }
function amount(cents, currency) { return `${plain(currency || 'cad').toUpperCase()} ${(cents / 100).toFixed(2)}`; }
function place(jurisdiction = {}) {
  return [COUNTRY_NAMES[jurisdiction.country] || plain(jurisdiction.country), plain(jurisdiction.region)].filter(Boolean).join(' / ');
}
function sourceLocation(location = {}) {
  if (location.page != null) return `page ${location.page}${location.line != null ? `, line ${location.line}` : ''}`;
  return location.section ? plain(location.section) : 'recorded report location';
}
function sourceText(fact) {
  const loc = fact.location || {};
  if (fact.privacy_redacted) {
    const label = /\bMember Number\b/i.test(fact.source_field || '') ? 'Member number matched from the report'
      : /Member Name/i.test(fact.source_field || '') ? 'Reporting member matched from the report'
        : 'Creditor identity matched from the report';
    return `${label} (${sourceLocation(loc)}).`;
  }
  if (['EXTERNAL_REPORT_CODE_DEFINITION', 'EXTERNAL_REPORT_PERIOD_DEFINITION'].includes(loc.source_kind)) {
    const def = fact.definition_source;
    return `Published definition: ${plain(fact.source_field)} - ${plain(fact.normalized_value)}. ${def ? `${plain(def.publisher)}, ${plain(def.title)} (version ${plain(def.version)}). ` : ''}${plain(loc.section)}${loc.url ? `. ${loc.url}` : ''}`;
  }
  const reading = fact.omitted_value ? 'caption printed without a value'
    : fact.raw_value != null ? `printed "${plain(fact.raw_value)}"`
      : fact.normalized_value != null ? `normalized value ${plain(fact.normalized_value)}` : 'value omitted';
  return `${plain(fact.source_field || 'Report field')} - ${reading} (${sourceLocation(loc)}).`;
}
function supportingDetails(issue) {
  const rules = [], facts = [], seenRules = new Set(), seenFacts = new Set();
  function add(value) { if (value && !seenRules.has(value)) { seenRules.add(value); rules.push(value); } }
  function visit(basis, primary) {
    const requirement = basis.rule_assessment?.requirement || basis.requirement;
    if (requirement) add(`Reporting rule: ${plain(requirement)}`);
    const version = basis.rule_source_version && !/^[a-f0-9]{32,}$/i.test(basis.rule_source_version) ? plain(basis.rule_source_version) : null;
    if (basis.citation) add(`${primary ? 'Supporting rule' : 'Additional supporting rule'}: ${plain(basis.citation)}${version ? ` (version ${version})` : ''}`);
    if (!primary && basis.uncertainty && basis.uncertainty !== issue.uncertainty) add(`Note for this rule: ${plain(basis.uncertainty)}`);
    for (const citation of basis.retention_review?.citations || []) add(`Reporting-period rule: ${plain(citation)}`);
    for (const fact of basis.source_facts || []) {
      const text = sourceText(fact);
      if (!seenFacts.has(text)) { seenFacts.add(text); facts.push({ text, url: fact.location?.url || null }); }
    }
    if (!(basis.source_facts || []).length && basis.source_location?.page != null) {
      const text = `Report entry location: ${sourceLocation(basis.source_location)}.`;
      if (!seenFacts.has(text)) { seenFacts.add(text); facts.push({ text }); }
    }
    for (const child of basis.supported_bases || []) visit(child, false);
  }
  visit(issue, true);
  return { rules, facts };
}

/** The complete paid issue list is preserved. Layout does not run checks or change packet eligibility. */
function renderAssessmentPdf(rendered, producedAt, context = {}) {
  const projected = (rendered.issues || []).map(issue => issues.projectConsumerIssue(issue));
  const reporting = projected.filter(issue => !issue.limitation_concern && issue.consumer_label !== 'INFORMATION');
  const information = projected.filter(issue => issue.limitation_concern || issue.consumer_label === 'INFORMATION');
  const violations = reporting.filter(issue => issue.consumer_label === 'VIOLATION');
  const reviews = reporting.length - violations.length;
  const subscribed = context.plan_code === 'monthly' || context.plan_code === 'annual';
  const pages = [];
  let page, y, continuation = null;
  const text = (value, x, baseline, size = 11, color = COLORS.ink, bold = false) => page.push({
    type: 'text', text: plain(value), x, y: baseline, size, color, bold,
    width: measurePdfText(plain(value), size) });
  const rect = (x, baseline, width, height, fill) => page.push({ type: 'rect', x, y: baseline, width, height, fill });
  const line = (x, baseline, x2, baseline2, color = COLORS.line, width = 1) => page.push({ type: 'line', x, y: baseline, x2, y2: baseline2, color, width });
  function newPage(first = false) {
    page = []; pages.push(page);
    rect(0, 784, 612, 8, COLORS.accent);
    if (first) {
      rect(LEFT, 720, 48, 34, COLORS.green);
      text('CRP', LEFT + 8, 730, 16, COLORS.white, true);
      text('CREDIT REGULATOR PRO', 108, 738, 14, COLORS.green, true);
      text('Clear facts. Your next step.', 108, 723, 10, COLORS.muted);
      y = 684;
    } else {
      text('CREDIT REGULATOR PRO', LEFT, 747, 12, COLORS.green, true);
      text('Your credit report review', LEFT, 729, 10, COLORS.muted);
      line(LEFT, 715, LEFT + WIDTH, 715);
      y = 687;
      if (continuation) {
        for (const row of wrapPdfText(`${continuation} (continued)`, 11, WIDTH)) { text(row, LEFT, y, 11, COLORS.green, true); y -= 16; }
        y -= 8;
      }
    }
  }
  function ensure(height) { if (y - height < BOTTOM) newPage(); }
  function paragraph(value, { size = 11, color = COLORS.ink, bold = false, indent = 0, gap = 9, leading = size + 5, url = null } = {}) {
    const rows = wrapPdfText(plain(value), size, WIDTH - indent);
    for (const row of rows) {
      ensure(leading);
      text(row, LEFT + indent, y, size, color, bold);
      if (url) page.push({ type: 'link', x: LEFT + indent, y: y - 3, width: measurePdfText(row, size), height: leading, url });
      y -= leading;
    }
    y -= gap;
  }
  function section(title) { ensure(64); paragraph(title, { size: 16, bold: true, color: COLORS.green, gap: 12 }); }

  newPage(true);
  paragraph('Your credit report review', { size: 27, bold: true, gap: 7 });
  paragraph('See what needs attention and keep the facts in one place.', { size: 12, color: COLORS.muted, gap: 15 });
  paragraph(`Your location: ${context.jurisdiction_label || place(rendered.jurisdiction)}`, { size: 10, gap: 3 });
  if (rendered.assessed_on) paragraph(`Assessed on: ${day(rendered.assessed_on)}`, { size: 10, gap: 3 });
  paragraph(`Report prepared: ${day(producedAt)}`, { size: 10, gap: 15 });
  const summaryBottom = y - 94;
  rect(LEFT, summaryBottom, WIDTH, 94, COLORS.pale);
  rect(LEFT, summaryBottom, 5, 94, COLORS.accent);
  text(String(violations.length), LEFT + 21, summaryBottom + 45, 29, COLORS.green, true);
  text(violations.length === 1 ? 'VIOLATION' : 'VIOLATIONS', LEFT + 21, summaryBottom + 25, 10, COLORS.green, true);
  line(LEFT + 159, summaryBottom + 18, LEFT + 159, summaryBottom + 75);
  text(String(reviews), LEFT + 178, summaryBottom + 45, 29, COLORS.green, true);
  text('DETAILS TO REVIEW', LEFT + 178, summaryBottom + 25, 9, COLORS.green, true);
  line(LEFT + 334, summaryBottom + 18, LEFT + 334, summaryBottom + 75);
  text(String(information.length), LEFT + 353, summaryBottom + 45, 29, COLORS.green, true);
  text('INFORMATION NOTES', LEFT + 353, summaryBottom + 25, 9, COLORS.green, true);
  y = summaryBottom - 23;
  paragraph('Each issue below shows what your report says and where to find it.', { size: 11, gap: 9 });
  paragraph(subscribed ? 'Your subscription includes dispute packets. Choose the issues you want to dispute, review your packet, then print and mail it.'
    : 'Start with the entries that affect you. A subscription helps you turn selected issues into a packet you can print and mail.', { size: 11, color: COLORS.muted, gap: 18 });

  function issueCard(issue, number, isInformation) {
    const label = isInformation ? 'INFORMATION' : issue.consumer_label === 'VIOLATION' ? 'VIOLATION' : 'REVIEW';
    const title = issue.check_kind || (isInformation ? 'Court time-limit information' : 'Report details to review');
    continuation = null;
    ensure(112);
    line(LEFT, y + 7, LEFT + WIDTH, y + 7);
    y -= 15;
    paragraph(`${number}. ${label}`, { size: 10, color: label === 'VIOLATION' ? COLORS.alert : COLORS.green, bold: true, gap: 5 });
    paragraph(title, { size: 15, bold: true, gap: 8 });
    const continuedName = plain(issue.account_identity?.name || title);
    continuation = `${number}. ${continuedName.length > 110 ? continuedName.slice(0, 107) + '...' : continuedName}`;
    if (issue.account_identity?.name) paragraph(`Account: ${issue.account_identity.name}`, { size: 11, bold: true, gap: 8 });
    else if (issue.account_number_in_report != null) paragraph(`Report entry: ${issue.record_kind || 'account'} ${issue.account_number_in_report}`, { size: 11, bold: true, gap: 8 });
    if (issue.explanation) paragraph(issue.explanation);
    if (issue.uncertainty) paragraph(`${isInformation ? '' : 'Why it merits attention: '}${issue.uncertainty}`, { color: COLORS.muted });
    if (isInformation) paragraph('This is information for you. It is not a reason to dispute the entry with the credit bureau.', { size: 10, bold: true });
    const evidence = supportingDetails(issue);
    if (evidence.rules.length || evidence.facts.length) {
      ensure(47);
      paragraph('The facts behind this issue', { size: 11, bold: true, color: COLORS.green, gap: 7 });
      for (const rule of evidence.rules) paragraph(rule, { size: 10, color: COLORS.muted, indent: 12, gap: 6 });
      for (const fact of evidence.facts) paragraph(fact.text, { size: 10, indent: 12, gap: 6, url: fact.url });
    }
    y -= 8;
    continuation = null;
  }
  if (reporting.length) {
    section('What needs your attention');
    reporting.forEach((issue, index) => issueCard(issue, index + 1, false));
  } else paragraph('No findings available. Keep this report with your records.', { bold: true, gap: 16 });
  if (information.length) {
    section('Useful information for you');
    information.forEach((issue, index) => issueCard(issue, index + 1, true));
  }

  continuation = null;
  ensure(subscribed ? 195 : 248);
  section(subscribed ? 'Your next step' : 'Turn your review into action');
  paragraph(subscribed ? 'Your subscription is ready to help you dispute the issues you choose.'
    : 'A subscription gives you the tools to keep moving forward.', { size: 12, bold: true });
  const benefits = [
    ['1', 'Build your dispute packet', 'Choose issues, review your letter and supporting pages, then print and mail your packet.'],
    ['2', 'Check your next report', 'Upload another report and see which entries changed.'],
    ['3', 'Keep your reports together', 'Find your earlier reports and assessments in your account.']
  ];
  for (const [number, heading, detail] of benefits) {
    ensure(60);
    rect(LEFT, y - 19, 26, 26, COLORS.pale);
    text(number, LEFT + 9, y - 11, 12, COLORS.green, true);
    paragraph(heading, { indent: 38, size: 11, bold: true, gap: 2 });
    paragraph(detail, { indent: 38, size: 10, color: COLORS.muted, gap: 9, leading: 14 });
  }
  if (!subscribed) {
    paragraph('Your unused payments for cheaper plans count toward an upgrade.', { size: 11, bold: true, gap: 6 });
    const quotes = Object.entries(context.upgrade_quotes || {}).filter(([plan, quote]) => ['monthly', 'annual'].includes(plan)
      && quote.allowed !== false && Number.isInteger(quote.first_invoice_cents) && quote.first_invoice_cents >= 0);
    for (const [plan, quote] of quotes) {
      paragraph(`${plan === 'monthly' ? 'Monthly' : 'Yearly'}: ${amount(quote.first_invoice_cents, quote.currency)} for your first payment${quote.credit_cents > 0 ? ` after ${amount(quote.credit_cents, quote.currency)} credit` : ''}.${Number.isInteger(quote.renewal_cents) ? ` Then ${amount(quote.renewal_cents, quote.currency)} ${plan === 'monthly' ? 'a month' : 'a year'}.` : ''}`, { size: 10, gap: 7 });
    }
    paragraph('Sign in and open Plans to see your credit and upgrade price.', { size: 10, color: COLORS.muted, gap: 9 });
  }
  paragraph('Visit creditregulatorpro.com', { size: 11, color: COLORS.green, bold: true, gap: 0, url: 'https://creditregulatorpro.com/' });
  for (let index = 0; index < pages.length; index++) {
    page = pages[index];
    line(LEFT, 55, LEFT + WIDTH, 55);
    text('Private report - keep with your records.', LEFT, 38, 8, COLORS.muted);
    const count = `Page ${index + 1} of ${pages.length}`;
    text(count, LEFT + WIDTH - measurePdfText(count, 8), 38, 8, COLORS.muted);
  }
  return renderDrawingPdf(pages, { title: 'Your credit report review | Credit Regulator Pro' });
}

module.exports = { renderAssessmentPdf, sourceText, supportingDetails };
