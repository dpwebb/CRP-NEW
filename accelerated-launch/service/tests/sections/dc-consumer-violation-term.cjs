'use strict';

const formats = require('../../formats.cjs');
const engine = require('../../evaluation.cjs');
const issues = require('../../issues.cjs');
const packets = require('../../packets.cjs');
const results = require('../../results.cjs');
const journey = require('../../journey.cjs');
const clock = require('../../assessment-clock.cjs');
const { packetText } = require('../packet-pdf-assertions.cjs');
const { makeSyntheticModel } = require('../../../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');

const HEADER = ['Equifax Consumer Credit Report - FICTIONAL TEST FIXTURE', 'Report Date: June 12, 2026'];
const COLLECTION = ['Collection Agency ABC Balance $500 Past Due $500 Date of First Delinquency 01 June 2010'];
const BAD_WORDING = /(?:probable|potential) (?:violation|reporting issue)|not an established violation|not a definite finding/i;

function assessed(lines, region = 'US-CA', assessedOn = '2026-10-07') {
  const country = region.slice(0, 2);
  const extraction = formats.extractWithSharedAdapter(makeSyntheticModel({ pages: [HEADER.concat(lines)] }),
    { mode: 'REPORT', country });
  const evaluation = engine.evaluateCase({ country, region, extraction,
    assessment_clock: clock.runStamp(`${assessedOn}T12:00:00Z`) });
  return { extraction, evaluation };
}

function storeFor(ctx, rendered = results.renderResultSet(ctx)) {
  const state = { accounts: [{ account_id: 'fictional-owner' }], files: [], cases: [{ case_id: 'fictional-case', account_id: 'fictional-owner' }],
    results: [{ case_id: 'fictional-case', result_id: 'fictional-result', created_at: '2026-10-07T12:00:00Z',
      ...ctx, rendered }], packets: [], clarifications: [{ answer: 'unchanged fictional answer' }] };
  return { state: () => state, update: (fn) => fn(state) };
}

async function run(service, check) {
  check.equal(issues.consumerText('The actual event date cannot be established from this report, so this is a probable reporting issue, not an established one.'),
    'The actual event date cannot be established from this report.', 'wording migration preserves the complete specific uncertainty sentence');
  const contexts = [assessed(COLLECTION), assessed(COLLECTION, 'US-NY'),
    assessed(['Creditor A Opened 01/01/2020 Closed 01/01/2021 Balance $100', 'Account Number ****1234',
      'Creditor A Opened 01/01/2020 Closed 01/01/2021 Balance $100', 'Account Number ****1234'])];
  const originals = contexts.map((ctx) => issues.issuesFor(ctx)[0]);
  check.deepEqual(originals.map((issue) => issue.classification),
    ['VIOLATION', 'PROBABLE_VIOLATION', 'POTENTIAL_VIOLATION'],
    'three actual supported paths retain different internal classifications');
  for (let index = 0; index < contexts.length; index++) {
    const ctx = contexts[index], original = originals[index], prior = JSON.stringify(ctx);
    const rendered = results.renderResultSet(ctx), publicIssue = rendered.issues[0];
    check.equal(publicIssue.consumer_label, 'VIOLATION', 'every supported confidence tier has the sole consumer term');
    check.equal(publicIssue.confidence, original.confidence, 'terminology does not upgrade internal confidence');
    check.equal(results.summariseAssessment(rendered).teaser.confidence_label, 'VIOLATION', 'the free teaser uses the same label');
    check.equal(BAD_WORDING.test(publicIssue.explanation + publicIssue.uncertainty), false, 'explanations omit obsolete classification verdicts');
    check.match(journey.assessmentReportBody(rendered, 'fictional-produced-at'), /- VIOLATION/, 'assessment downloads use the same term');
    const store = storeFor(ctx), actor = { account_id: 'fictional-owner' };
    packets.selectIssues(store, actor, 'fictional-case', [original.issue_id]);
    packets.setCorrespondence(store, actor, 'fictional-case', { consumer_name: 'Fictional Consumer', contact: 'fictional@example.test' });
    check.equal(packets.packetView(store, actor, 'fictional-case').eligible_issues[0].consumer_label, 'VIOLATION', 'selection cards use the same term');
    packets.approvePacket(store, actor, 'fictional-case');
    const body = packetText(packets.packetDownload(store, actor, 'fictional-case'));
    check.match(body, /VIOLATION/, 'approved packets name the supported breach');
    check.equal(BAD_WORDING.test(body), false, 'packets omit probable and potential violation wording');
    check.equal(JSON.parse(packets.issueContent(original)).consumer_label, 'VIOLATION', 'the label is material content bound to approval');
    check.equal(JSON.stringify(ctx), prior, 'presentation and packets preserve evaluation and evidence');
  }

  const merged = assessed(['Creditor A Opened 01/01/2020 Closed 01/01/2019'], 'CA-NT');
  const mergedIssue = results.renderResultSet(merged).issues[0];
  check.equal(mergedIssue.consumer_label, 'VIOLATION', 'merged accuracy and common rules have one breach label');
  check.equal(mergedIssue.supported_bases.every((basis) => basis.consumer_label === 'VIOLATION'), true, 'positive supporting bases use the same label');
  check.equal(BAD_WORDING.test(JSON.stringify(mergedIssue)), false, 'neither primary nor secondary explanation contradicts the label');
  check.match(mergedIssue.uncertainty, /does not show which one is wrong/, 'the factual uncertainty survives');
  check.equal(mergedIssue.confidence, 'PROBABLE', 'merged internal confidence is unchanged');

  const later = assessed(['Collection Agency ABC Balance $500 Past Due $500 Date of First Delinquency 01 June 2019'], 'US-CA', '2027-06-13');
  const laterIssue = results.renderResultSet(later).issues[0];
  check.equal(laterIssue.consumer_label, null, 'current-file review does not invent a historical breach');
  check.match(laterIssue.uncertainty, /current credit file/, 'the qualified request stays usable');
  check.equal(results.teaserFor(laterIssue), null, 'elapsed time alone cannot create a breach teaser');
  check.equal(issues.consumerLabel({ basis_type: 'LIMITATION_ASSESSMENT', confidence: 'DEFINITE', eligible: true }), 'INFORMATION', 'court-claim arithmetic remains informational even in old eligible records');
  check.equal(issues.consumerLabel({ classification: 'VIOLATION', adapter_id: 'RETIRED-UNKNOWN-ADAPTER' }), null, 'retired adapters cannot acquire an active label');
  check.equal(issues.consumerLabel({ classification: 'UNRESOLVED', confidence: 'DEFINITE', rule_assessment: {},
    check_id: 'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY' }), null, 'confidence cannot convert an unresolved assessment');

  // Recover an old public statutory label only from its exact persisted finding, without rerunning a rule.
  const saved = results.renderResultSet(contexts[1]), oldIssue = saved.issues[0];
  delete oldIssue.consumer_label;
  oldIssue.uncertainty += ' This is a probable reporting issue, not an established one.';
  saved.observations[0].consumer_label = 'Probable violation';
  saved.observations[0].qualification = 'Your report shows a probable reporting issue.';
  saved.issues.unshift({ issue_id: 'unmatched-fictional-issue', confidence: 'DEFINITE', basis_type: 'STATUTORY_RETENTION',
    eligible: true, explanation: 'Unmatched saved concern', source_facts: [] });
  const store = storeFor(contexts[1], saved), actor = { account_id: 'fictional-owner' };
  store.state().packets.push({ approved_version: 'unchanged-saved-approval' });
  const snapshot = JSON.stringify(store.state()), projected = journey.publicResult(saved, contexts[1].evaluation);
  check.deepEqual(projected.issues.map((issue) => issue.issue_id), saved.issues.map((issue) => issue.issue_id), 'saved IDs, ordering and count are preserved');
  check.equal(projected.issues[0].consumer_label, null, 'unmatched IDs cannot borrow a neighboring label');
  check.equal(projected.issues[1].consumer_label, 'VIOLATION', 'the exact saved finding supplies its label');
  check.deepEqual(projected.issues[1].source_facts, oldIssue.source_facts, 'saved source values and locations are unchanged');
  check.equal(projected.issues[1].confidence, oldIssue.confidence, 'saved confidence is not recalculated');
  check.equal(projected.assessed_on, saved.assessed_on, 'reading does not advance the assessment date');
  check.equal(projected.observations[0].consumer_label, 'VIOLATION', 'the saved observation label is normalized');
  check.equal(journey.getResult(store, actor, 'fictional-case', 'fictional-result').issues[1].consumer_label,
    'VIOLATION', 'the explicitly selected historical-result route applies the same saved label');
  const download = require('../packet-pdf-assertions.cjs').pdfText(journey.assessmentReport(store, actor, 'fictional-case').body);
  check.match(download, /VIOLATION/, 'saved downloads use the updated term');
  check.equal(BAD_WORDING.test(download), false, 'saved downloads omit obsolete wording');
  check.match(download, /exception\s+applies/, 'saved PDFs preserve the material exception uncertainty across line wraps');
  check.equal(JSON.stringify(store.state()), snapshot, 'reads preserve historical rows, clarifications and approval versions');
}

module.exports = { run, id: 'dc-consumer-violation-term', title: 'One public VIOLATION term preserves internal confidence and historical evidence' };
