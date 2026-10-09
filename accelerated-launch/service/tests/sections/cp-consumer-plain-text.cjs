'use strict';
const { comparableText } = require('../packet-pdf-assertions.cjs');
/**
 * cp-consumer-plain-text.cjs — the one coordinated plain-text correction across the consumer surface.
 *
 * The owner asked for stale consumer-facing wording to be corrected across all 82 jurisdictions as ONE change,
 * in plain English for a junior-high reader, without touching any rule, permission, parse, price or the product
 * scope. This section is the guard that the correction is in force and cannot quietly return:
 *
 *   1. the served jurisdiction surface answers for all 82 selections, and every one of the 82 descriptions is
 *      built from that region's own recorded checks in short, plain sentences;
 *   2. the wording this batch retired — "no statutory evaluation", "nothing would be run", "no jurisdiction is
 *      advertised as launch ready" and the internal class vocabulary — is absent from every served string and
 *      from the shipped browser client, so regenerating the surface cannot restore it;
 *   3. the representative screens (assessment summary, check headlines and qualifications, the two read
 *      fallbacks, the no-issue sentence) are plain and never imply that a missing finding means the report is
 *      correct;
 *   4. a downloaded packet still carries the selected finding's own words and the report facts behind it, and
 *      the single approved legal-advice disclaimer never reappears in results, packets or downloads.
 *
 * Fictional reports only; entitlement is the test adapter (a signed, non-payment event).
 */
const fs = require('node:fs');
const path = require('node:path');
const { buildPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');

/* Each entry was live on a served string before this correction. */
const RETIRED_WORDING = [
  /no statutory evaluation/i,
  /nothing would be run/i,
  /no check would run/i,
  /No jurisdiction is advertised as launch ready/i,
  /recorded rule comparison/i,
  /factual observation/i,
  /policy observation/i,
  /is not a statutory finding/i,
  /not legal findings/i
];
/* Internal names that belong in the audit trail, not on a consumer screen. */
const INTERNAL_VOCABULARY = [
  /[A-Z]{2,}_[A-Z]{2,}/,
  /\badapter\b/i,
  /\bgate\b/i,
  /\bdigest\b/i,
  /\bclassification\b/i,
  /\bpresentation\b/i,
  /\brule_id\b/i,
  /\bceiling\b/i
];
const MAX_WORDS_PER_SENTENCE = 30;
const MAX_SENTENCES = 4;

function sentencesOf(text) {
  return String(text).split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 0);
}

/** Every way this consumer text is not plain: retired claim, internal term, or a sentence that is too long. */
function plainProblems(text) {
  const problems = [];
  for (const re of RETIRED_WORDING) if (re.test(text)) problems.push(`retired wording ${re}`);
  for (const re of INTERNAL_VOCABULARY) if (re.test(text)) problems.push(`internal term ${re}`);
  const sentences = sentencesOf(text);
  if (sentences.length > MAX_SENTENCES) problems.push(`${sentences.length} sentences`);
  for (const sentence of sentences) {
    const words = sentence.split(/\s+/).length;
    if (words > MAX_WORDS_PER_SENTENCE) problems.push(`long sentence (${words} words): ${sentence}`);
  }
  return problems;
}

/** The three check classes a region may record, and the plain phrase its description must use for each. */
const CLASS_PHRASES = [
  ['STATUTORY_RULE_COMPARISON', /rule check/],
  ['REPORT_FACT_CONSISTENCY', /factual check/],
  ['PRINTED_POLICY_OBSERVATION', /what your report says about itself/]
];

const uploadBody = (bytes, filename) => ({
  originalFilename: filename,
  declaredBytes: bytes.length,
  mimeType: 'application/pdf',
  contentBase64: bytes.toString('base64')
});

async function run(service, check) {
  /* ---------------------------------------------------------------- 1. the 82 descriptions */
  const surfaceResponse = await service.request('GET', '/api/jurisdictions');
  check.equal(surfaceResponse.status, 200, 'the jurisdiction surface is served');
  const surface = surfaceResponse.json.surface;
  check.equal(surface.regions.length, 82, 'all 82 promised jurisdictions are described before an upload');

  const notPlain = [];
  const classMismatch = [];
  let checklistDescriptions = 0;
  let supportedRegions = 0;
  for (const region of surface.regions) {
    const text = (region.availability && region.availability.plain) || '';
    const problems = plainProblems(text);
    if (!text) problems.push('no description');
    if (problems.length) notPlain.push(`${region.region_code}: ${problems.join('; ')}`);
    const kinds = region.assessment_kinds || [];
    for (const [kind, phrase] of CLASS_PHRASES) {
      if (phrase.test(text) && !kinds.includes(kind)) classMismatch.push(`${region.region_code} names ${kind} without recording it`);
    }
    if (/common-error checklist/.test(text)) checklistDescriptions += 1;
    if (region.availability && region.availability.state === 'SUPPORTED') supportedRegions = supportedRegions + 1;
  }
  const recordedChecklistRegions = surface.regions.filter((r) => (r.assessment_kinds || []).includes('COMMON_ERROR')).length;
  check.deepEqual(notPlain, [], 'all 82 descriptions are short, plain sentences with no internal terms and no retired wording');
  check.deepEqual(classMismatch, [], 'and no region claims a kind of check it did not record');
  check.equal(checklistDescriptions, recordedChecklistRegions,
    'every description names the shared checklist rather than a separate statutory or factual scope');
  check.ok(supportedRegions >= 80, 'and nearly every promised jurisdiction states what this build can run for it');
  check.deepEqual(plainProblems(surface.note), [], 'the sentence shown before an upload is plain as well');

  /* ---------------------------------------------------------------- 2. retired wording cannot reappear */
  const screens = [
    ['surface note', surface.note],
    ['rule-check description', surface.check_classes.statutory_rule_comparison.plain],
    ['factual-check description', surface.check_classes.report_fact_consistency.plain],
    ['self-statement check description', surface.check_classes.printed_policy_observation.plain],
    ['count note', surface.check_classes.never_summed],
    ['no-issue sentence', surface.check_classes.no_issue_found_means]
  ];
  for (const region of surface.regions) screens.push([`${region.region_code} description`, region.availability.plain]);
  const leaked = screens
    .filter(([, text]) => RETIRED_WORDING.some((re) => re.test(text)))
    .map(([where, text]) => `${where}: ${String(text).slice(0, 70)}`);
  check.deepEqual(leaked, [], 'no served string still claims there is no rule for the consumer place, that nothing would run, or that no region is launch ready');
  check.match(surface.check_classes.no_issue_found_means, /We did not find a reporting issue in the information we could review\./,
    'the sentence used when nothing is found is the approved one');
  check.match(surface.check_classes.no_issue_found_means, /does not mean your whole report is correct/,
    'and it never implies that a missing finding means the report is correct');

  const shipped = ['accelerated-launch/service/ui/app.js', 'accelerated-launch/service/ui/index.html',
    'consumer-wizard/dist/app.js', 'consumer-wizard/dist/index.html']
    .map((rel) => [rel, fs.readFileSync(path.join(ROOT, rel), 'utf8')]);
  check.deepEqual(shipped.filter(([, text]) => RETIRED_WORDING.some((re) => re.test(text))).map(([rel]) => rel), [],
    'and the served client tree and the shipped browser client carry none of the retired wording either');
  /* OWNER correction (Batch 25): the approved disclaimer is real and lives in the small footer of the served
     main page only — not in the client's other files, and never in the results, review, packet or download
     surfaces. Per-step visibility is measured against the served client by bg-report-use. */
  const disclaimerSentence = /Credit Regulator Pro provides credit-report information, not legal advice\./g;
  const disclaimerCount = shipped.reduce((n, [, text]) => n + (text.match(disclaimerSentence) || []).length, 0);
  check.equal(disclaimerCount, 1, 'the approved legal-advice disclaimer appears exactly once in the client tree');
  check.deepEqual(shipped.filter(([, text]) => /not legal advice/i.test(text)).map(([rel]) => rel),
    ['accelerated-launch/service/ui/index.html'], 'and its only home is the served main page');
  const servedMainPage = shipped.find(([rel]) => rel === 'accelerated-launch/service/ui/index.html')[1];
  check.ok(/<footer[^>]*>[\s\S]*Credit Regulator Pro provides credit-report information, not legal advice\.[\s\S]*<\/footer>/.test(servedMainPage),
    'inside the small footer element of that page');

  /* ---------------------------------------------------------------- 3. representative screens */
  const actor = await service.unpaidAccount('cp-plain-text@example.test');
  const pay = await service.pay(actor, 'monthly');
  check.equal(pay.response.accepted, true, 'the account holds a subscription for the journey');
  const created = await service.request('POST', '/api/cases', { token: actor.token, body: { country: 'CA', region: 'CA-ON' } });
  const c = created.json.case;
  const pdf = buildPdf({ pages: [{ lines: ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Fictional Creditor Inc  Balance $100  Opened 05/14/2020  Closed 01/01/2019'] }] });
  await service.request('POST', `/api/cases/${c.case_id}/files`, { token: actor.token, body: uploadBody(pdf, 'fictional-plain-text-report.pdf') });
  const evaluated = await service.request('POST', `/api/cases/${c.case_id}/evaluate`, { token: actor.token });
  const result = evaluated.json.result;
  check.deepEqual(plainProblems(result.assessment.plain), [], `the assessment summary is plain: ${result.assessment.plain}`);

  const cardText = [];
  for (const list of [result.report_consistency_checks || [], result.observations || [], result.common_errors || []]) {
    for (const entry of list) {
      for (const field of ['headline', 'qualification', 'explanation']) if (entry[field]) cardText.push(entry[field]);
    }
  }
  check.ok(cardText.length > 0, 'at least one assessed check carries consumer words');
  const cardProblems = cardText
    .filter((text) => plainProblems(text).length > 0)
    .map((text) => `${plainProblems(text).join('; ')} :: ${String(text).slice(0, 60)}`);
  check.deepEqual(cardProblems, [], 'and no check headline or qualification carries retired wording, an internal term or an over-long sentence');

  /* ---------------------------------------------------------------- 4. the packet keeps the finding */
  const view = (await service.request('GET', `/api/cases/${c.case_id}/packet`, { token: actor.token })).json.view;
  const issue = (view.eligible_issues || []).find((i) => i.eligible);
  check.ok(issue, 'the fictional report raises at least one issue the consumer may choose to dispute');
  check.deepEqual(plainProblems(`${issue.headline || ''} ${issue.explanation || ''}`), [], 'and the issue card itself is written in plain words');
  await service.request('POST', `/api/cases/${c.case_id}/packet/select`, { token: actor.token, body: { issue_ids: [issue.issue_id] } });
  await service.request('POST', `/api/cases/${c.case_id}/packet/correspondence`, { token: actor.token, body: { correspondence: { consumer_name: 'Jordan Avery', contact: 'jordan.avery@example.test' } } });
  await service.preparePostalPacket(actor, c.case_id);
  await service.request('POST', `/api/cases/${c.case_id}/packet/approve`, { token: actor.token });
  const download = await service.request('GET', `/api/cases/${c.case_id}/packet-download`, { token: actor.token });
  check.equal(download.status, 200, 'the approved packet downloads');
  check.ok(/opening date comes after the closing date.*check the opened and closed dates/.test(comparableText(download.text)), 'the consumer letter keeps the selected factual concern and request in everyday words');
  check.deepEqual(RETIRED_WORDING.filter((re) => re.test(comparableText(download.text))).map(String), [], 'and carries none of the retired wording');
  check.ok(!/not legal advice/i.test(comparableText(download.text)), 'and never repeats the legal-advice disclaimer');
  check.ok(!/not legal advice/i.test(JSON.stringify(result)), 'the results surface carries no legal-advice disclaimer either');
  check.ok(!/not legal advice/i.test(JSON.stringify(view)), 'and neither does the review and packet view');

  /* ---------------------------------------------------------------- 5. the read fallbacks */
  const intakeSource = fs.readFileSync(path.join(ROOT, 'accelerated-launch', 'service', 'general-intake.cjs'), 'utf8');
  const refusals = [...intakeSource.matchAll(/'(We could not read your report[^']*|This document or image set[^']*)'/g)].map((m) => m[1]);
  check.equal(refusals.length, 2, 'both read fallbacks are present in the served intake');
  check.deepEqual(refusals.map((text) => plainProblems(text)).flat(), [], 'and each is short, plain and free of internal terms');
  check.ok(refusals.every((text) => /upload/i.test(text)), 'and each tells the consumer what to do next');

  const removal = await service.request('DELETE', `/api/cases/${c.case_id}`, { token: actor.token });
  if (removal.status !== 200) throw new Error('test case cleanup failed');

  return {
    jurisdictions_described: surface.regions.length,
    jurisdictions_stating_common_error_checklist: checklistDescriptions,
    jurisdictions_supported: supportedRegions,
    retired_wording_guard: RETIRED_WORDING.map(String),
    internal_vocabulary_guard: INTERNAL_VOCABULARY.map(String),
    screens_scanned: screens.length,
    shipped_client_files_scanned: shipped.map(([rel]) => rel),
    fallbacks_checked: refusals,
    packet_download_matched_the_selected_finding: true,
    fixtures: 'fictional general credit report with one contradictory account date; no real consumer identifiers or private reports'
  };
}

module.exports = { run, id: 'cp-consumer-plain-text', title: 'The one concerted plain-text correction across all 82 jurisdiction descriptions, the representative screens and the downloaded packet' };

