'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { buildPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');
const formats = require('../../formats.cjs');
const engine = require('../../evaluation.cjs');
const issues = require('../../issues.cjs');
const { comparableText } = require('../packet-pdf-assertions.cjs');
const regions = Object.keys(require('../../../adapters/applicability-records.json').region_applicability_index);
const SPECS = [
  ['COMMON-ERROR-CLOSURE-STATED-WITHOUT-A-CLOSED-DATE', 'Closed', 'Closed Date'],
  ['COMMON-ERROR-ADVERSE-ENTRY-WITHOUT-A-DELINQUENCY-ANCHOR', 'In Collection', 'First Delinquency Date'],
  ['COMMON-ERROR-WRITE-OFF-WITHOUT-A-CHARGE-OFF-DATE', 'Charged Off', 'Charge Off Date'],
  ['COMMON-ERROR-COLLECTION-ORIGINAL-BOTH-DUE', null, null]
].map(([check_id, status, caption]) => ({ check_id, status, caption }));
let sequence = 0;
function linesFor(spec, value = '') {
  const header = ['Equifax Consumer Credit Report', 'Report Date: 2026-10-09'];
  if (!spec.caption) return header.concat([
    'Creditor: Fictional Cedar Bank', 'Account Number: ****5432', 'Balance: $100',
    'Date Opened: January 1, 2020',
    'Collection: Fictional Cedar Bank', 'Account Number: ****5432', 'Balance: $100',
    'Date Opened: January 1, 2021'
  ]);
  return header.concat(['Creditor: Fictional Cedar Bank', 'Account Number: ****5432',
    'Status: ' + spec.status, spec.caption + ': ' + value, 'Balance: $100']);
}
function native(t, lines, amend) {
  const bytes = buildPdf({ pages: [{ lines }] }, { producer: 'Fictional coverage proof' });
  const file = path.join(t.dataDir, 'eu-fictional-' + (++sequence) + '.pdf');
  fs.writeFileSync(file, bytes);
  const model = formats.buildPdfDocumentModel(file);
  if (amend) amend(model);
  return { bytes, extraction: formats.extractWithSharedAdapter(model, { mode: 'REPORT', country: 'US' }) };
}
function findings(extraction, region, id) {
  const evaluation = engine.evaluateCase({ country: region.split('-')[0], region, extraction });
  return issues.issuesFor({ extraction, evaluation }).filter((issue) => issue.check_id === id);
}
async function run(t, check) {
  const owner = await t.unpaidAccount('eu-coverage@example.test'); await t.pay(owner, 'monthly');
  const stranger = await t.unpaidAccount('eu-stranger@example.test');
  const evidence = [];
  check.equal(regions.length, 82, 'the native shared-source rules reach the canonical 82 selections');
  for (const spec of SPECS) {
    const lines = linesFor(spec);
    // A second independent violation proves that selection does not leak its account into the packet.
    const extra = ['Creditor: Fictional Unselected Bank', 'Account Number: ****9876',
      'Date Opened: January 1, 2025', 'Closed Date: January 1, 2020'];
    const positive = native(t, lines.concat(extra));
    check.equal(positive.extraction.presentation_id, 'GENERAL-BUREAU-REPORT', 'fictional native input uses general admission');
    let allRegions = 0, firstIssue;
    for (const region of regions) {
      const found = findings(positive.extraction, region, spec.check_id), issue = found[0];
      const valid = found.length === 1 && Boolean(issue?.rule_assessment)
        && issues.publicIssue(issue).consumer_label === 'VIOLATION'
        && issue.source_facts.length >= 2 && issue.source_facts.every((fact) => fact.location?.page && fact.location?.line);
      check.ok(valid, region + ': own native event/date or linked-pair sources support the listed breach');
      if (valid) { allRegions += 1; firstIssue ||= issue; }
    }
    if (spec.check_id === 'COMMON-ERROR-ADVERSE-ENTRY-WITHOUT-A-DELINQUENCY-ANCHOR') {
      const displayed = issues.publicIssue(firstIssue);
      check.ok(displayed.explanation.includes('status (In Collection)')
        && !displayed.explanation.includes('null') && !displayed.explanation.includes('cancellation code'),
      'a literal collection status is described as printed, without an invented code');
    }
    if (spec.check_id === 'COMMON-ERROR-WRITE-OFF-WITHOUT-A-CHARGE-OFF-DATE') {
      const displayed = issues.publicIssue(firstIssue);
      check.ok(displayed.uncertainty.includes('The report states the write-off')
        && !displayed.uncertainty.includes('account history'),
      'a literal write-off status does not claim an unprinted payment-history source');
    }
    const benignLines = spec.caption ? linesFor(spec, 'January 1, 2025')
      : lines.map((line, index) => index === 8 ? 'Balance: $75' : line);
    const benign = native(t, benignLines);
    check.equal(findings(benign.extraction, 'US-CA', spec.check_id).length, 0,
      'a populated date or different linked amount cannot establish this breach');
    const missingLines = spec.caption ? lines.filter((line) => !line.startsWith(spec.caption + ':'))
      : lines.map((line, index) => index === 7 ? 'Account Number: ****1111' : line);
    const missing = native(t, missingLines);
    check.equal(findings(missing.extraction, 'US-CA', spec.check_id).length, 0,
      'absent date captions or an uncorroborated account cannot establish this breach');
    if (!spec.caption) {
      for (const caption of ['Credit Limit', 'Scheduled Payment', 'Past Due']) {
        const otherMoney = native(t, lines.map((line) => line.replace(/^Balance:/, caption + ':')));
        check.equal(findings(otherMoney.extraction, 'US-CA', spec.check_id).length, 0,
          'matching ' + caption + ' values are not matching amounts owed');
        check.ok(otherMoney.extraction.records.every((record) => record.facts['account.amount'] === undefined),
          caption + ' retains its own meaning instead of becoming a generic amount owed');
      }
      const multiple = native(t, lines.flatMap((line) => line.startsWith('Balance:')
        ? ['Scheduled Payment: $25', 'Credit Limit: $200', line] : [line]));
      check.equal(findings(multiple.extraction, 'US-CA', spec.check_id).length, 1,
        'independent own balances still support the linked-debt check beside other monetary captions');
    }
    if (spec.caption) {
      for (const suffix of [' or Open', ': No', ' not confirmed']) {
        const uncertain = lines.map((line) => line === 'Status: ' + spec.status ? line + suffix : line);
        check.equal(findings(native(t, uncertain).extraction, 'US-CA', spec.check_id).length, 0,
          'an incomplete, conflicting or qualified status statement does not prove the event');
      }
      for (const value of ['N/A', '-', 'not readable']) {
        check.equal(findings(native(t, linesFor(spec, value)).extraction, 'US-CA', spec.check_id).length, 0,
          value + ' is not proof of an empty printed date');
      }
      for (const suffix of [spec.caption + ':', spec.caption + ': January 1, 2025']) {
        check.equal(findings(native(t, lines.concat(suffix)).extraction, 'US-CA', spec.check_id).length, 0,
          'a repeated or conflicting physical caption stays unresolved');
      }
      const untrusted = native(t, lines, (model) => {
        for (const word of model.pages[0].word_boxes) if (word.text === 'Date:') word.trusted = false;
      });
      check.equal(findings(untrusted.extraction, 'US-CA', spec.check_id).length, 0,
        'untrusted date-caption text cannot establish a printed blank');
      const noAmount = lines.filter((line) => !line.startsWith('Balance:'));
      check.equal(findings(native(t, noAmount).extraction, 'US-CA', spec.check_id).length, 1,
        'the own event and blank need no unrelated amount or resolved date');
    }
    let downloads = 0;
    for (const region of ['CA-ON', 'US-CA', 'GB-ENG', 'AU-NSW']) {
      const opened = await t.request('POST', '/api/cases', { token: owner.token,
        body: { country: region.split('-')[0], region } });
      const id = opened.json.case.case_id, endpoint = '/api/cases/' + id;
      const up = await t.request('POST', endpoint + '/files', { token: owner.token, body: {
        originalFilename: 'fictional-common-error.pdf', declaredBytes: positive.bytes.length,
        mimeType: 'application/pdf', contentBase64: positive.bytes.toString('base64') } });
      const evaluated = await t.request('POST', endpoint + '/evaluate', { token: owner.token });
      check.ok(opened.status === 201 && up.status === 201 && evaluated.status === 201,
        region + ': actual owned native upload and evaluation succeed');
      const view = (await t.request('GET', endpoint + '/packet', { token: owner.token })).json.view;
      const selected = view.eligible_issues.find((issue) => issue.check_kind === firstIssue?.label
        && issue.rule_assessment?.requirement === firstIssue?.rule_assessment?.requirement);
      check.ok(selected?.eligible && selected.consumer_label === 'VIOLATION', 'the native breach is selectable');
      if (!selected) continue;
      const choice = await t.request('POST', endpoint + '/packet/select', { token: owner.token,
        body: { issue_ids: [selected.issue_id] } });
      await t.request('POST', endpoint + '/packet/correspondence', { token: owner.token,
        body: { correspondence: { consumer_name: 'Fictional Consumer', contact: 'fictional@example.test' } } });
      await t.preparePostalPacket(owner, id);
      const approved = await t.request('POST', endpoint + '/packet/approve', { token: owner.token });
      const downloaded = await t.request('GET', endpoint + '/packet-download', { token: owner.token });
      const text = comparableText(downloaded.text);
      const matched = downloaded.status === 200 && text.includes('Fictional Cedar Bank')
        && text.includes(comparableText(selected.rule_assessment.requirement))
        && text.includes('VIOLATION') && !text.includes('Fictional Unselected Bank');
      check.ok(choice.status === 200 && approved.status === 200 && approved.json.view.packet.selected_count === 1,
        'consumer selection and approval bind precisely this issue');
      check.ok(matched, 'actual packet retains the selected account/rule and excludes the unselected account');
      check.equal((await t.request('GET', endpoint + '/packet-download', { token: stranger.token })).status, 403,
        'another account cannot download the approved evidence');
      if (matched && choice.status === 200 && approved.status === 200) downloads += 1;
      await t.request('DELETE', endpoint, { token: owner.token });
    }
    evidence.push({ check_id: spec.check_id, regions_tested: allRegions,
      positive: { classification: firstIssue?.rule_assessment?.classification || null,
        consumer_label: firstIssue ? issues.publicIssue(firstIssue).consumer_label : null,
        selected: downloads === 4, approved: downloads === 4, downloaded: downloads === 4, source_linked: allRegions === 82 },
      benign: { issues: findings(benign.extraction, 'US-CA', spec.check_id).length },
      missing_source: { issues: findings(missing.extraction, 'US-CA', spec.check_id).length },
      packet: { approved_downloads: downloads, selected_content_matched: downloads === 4, unselected_content_absent: downloads === 4 } });
  }
  return { exercise_class: 'FICTIONAL_NATIVE_PDF_UPLOAD', checks: evidence,
    boundary: 'Native general-caption and same-report linked-pair mechanisms; no admission or dedicated-layout currency expansion.' };
}
module.exports = { run, id: 'eu-general-omission-delivery', title: 'Own native missing-date and linked-debt sources reach all82 violations and selected packets' };
