'use strict';
/**
 * y-ingest-coverage-matrix.cjs — B6-INGEST-001.
 *
 *   • The authored coverage matrix (`../../coverage-matrix.json`) agrees with the registered extraction
 *     adapters, so the JSON and the running service cannot disagree about what is supported.
 *   • The consumer-facing read-support sentence counts FIVE presentations (the B4-continuation TransUnion
 *     Canada family included) and is generated from the registry so it cannot drift back to "four".
 *   • The acquisition queue names the target bureaus that are NOT supported (US Equifax/TransUnion,
 *     AU Experian/illion, current GB, a broader CA Equifax family) rather than silently claiming them.
 *   • A country selection cannot override failed detection: each market offers only its own presentations.
 */

const formats = require('../../formats.cjs');
const coverage = require('../../coverage-matrix.cjs');

async function run(t, check) {
  const evidence = {};

  const validation = coverage.validation();
  check.equal(validation.ok, true, 'the authored coverage matrix agrees with the registered adapters');
  check.deepEqual(validation.problems, [], 'and no inconsistency is reported');

  const supported = coverage.supportedPresentations();
  check.equal(supported.length, 5, 'five report presentations are registered');
  check.deepEqual(
    supported.map((r) => r.presentation_id).sort(),
    ['FAM-AU-EQX-CONSUMER', 'FAM-GB-EXP-CONSUMER', 'FAM-TU-CA-CONSUMER', 'PR-01', 'US-CONSUMER-DISCLOSURE'].sort(),
    'and they are exactly the five measured presentations'
  );

  const sentence = coverage.readSupportQualification();
  check.match(sentence, /We have tested this service on five report layouts/, 'the read-support sentence counts five report layouts');
  check.match(sentence, /TransUnion Canada consumer disclosure/, 'and names the TransUnion Canada family');

  const missing = coverage.missingRows();
  const queued = (market, bureau) => missing.some((r) => r.country === market && r.bureau === bureau);
  for (const [market, bureau] of [
    ['US', 'Equifax'], ['US', 'TransUnion'],
    ['AU', 'Experian'], ['AU', 'illion'],
    ['GB', 'Equifax'], ['GB', 'TransUnion'], ['GB', 'Experian'],
    ['CA', 'Equifax']
  ]) {
    check.equal(queued(market, bureau), true, `${market} ${bureau} is recorded in the acquisition queue, not claimed supported`);
  }

  const queue = coverage.acquisitionQueue();
  check.ok(queue.length >= 9, 'the acquisition queue is ordered and named');
  check.deepEqual(queue.slice(0, 2).map((r) => `${r.market}:${r.bureau}`), ['US:Equifax', 'US:TransUnion'],
    'and the smallest next batch is the two US bureaus');

  check.deepEqual(formats.formatsForCountry('US').map((a) => a.country), ['US'], 'a US selection offers only US presentations');
  check.equal(formats.formatsForCountry('GB').some((a) => a.presentation_id === 'US-CONSUMER-DISCLOSURE'), false,
    'a GB selection cannot admit the US consumer disclosure');
  check.equal(formats.formatsForCountry('AU').some((a) => a.presentation_id === 'FAM-AU-EQX-CONSUMER'), true,
    'an AU selection offers the AU Equifax family');

  evidence.matrix = {
    markets: Object.keys(coverage.loadMatrix().markets),
    queue_length: queue.length,
    supported: supported.length
  };
  return evidence;
}

module.exports = {
  run,
  id: 'y-ingest-coverage-matrix',
  title: 'The coverage matrix agrees with the registry and names the unsupported-bureau acquisition queue'
};
