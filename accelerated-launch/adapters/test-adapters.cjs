'use strict';
/**
 * test-adapters.cjs — focused synthetic tests for the rule adapters.
 *
 * OWNER-ALL82-001 / B1, extended by B3 and OWNER-CA-CORRECTION-PACKET-001. Synthetic fixtures only: no
 * credit report, no report content, no credential and no external call is read, written or transmitted by
 * this file. The tests assert the properties the batches are accountable for: an applicable configuration
 * evaluates; a mismatched jurisdiction refuses; a missing fact is unresolved and never defaulted; a finding
 * is emitted only where the rule permits it; and packet eligibility is a narrow, enumerated per-finding
 * authorization (OWNER-POTENTIAL-ISSUE-001); it is never a blanket flag.
 *
 * B3 correction, with its cause recorded: two assertions below previously asserted the B1 state in which
 * the United States country-wide relation was still a MECHANICAL pattern match and was therefore reported
 * `confirmed: false`. OWNER-ALL82-001 / B3 directed that mechanical relation to be replaced with explicit
 * per-region applicability records, so those two assertions are corrected to the B3 truth — the relation
 * itself is now confirmed per named region, and what is unresolved has moved, correctly, to EXECUTION: no
 * United States consumer-disclosure presentation is admitted, so no United States check can run. Nothing
 * was relaxed: the refusal is asserted, not removed.
 *
 * Run: node accelerated-launch/adapters/test-adapters.cjs
 */

const assert = require('node:assert/strict');
const adapters = require('./rule-adapters.cjs');
const primitives = require('./evaluation-primitives.cjs');

let passed = 0;
const failures = [];
function test(name, fn) {
  try {
    fn();
    passed += 1;
  } catch (err) {
    failures.push({ name, message: err && err.message });
  }
}

const NS = 'CA-NS-CRA-S10-3-C-LIMB-1';
const NS_BANKRUPTCY = 'CA-NS-CRA-S10-3-E-BANKRUPTCY-6Y';
const NS_JUDGMENT_CONTENT = 'CA-NS-CRA-S10-3-D-JUDGMENT-CONTENT';
const NS_DISMISSED_CHARGE = 'CA-NS-CRA-S10-3-F-DISMISSED-CHARGE';
const US_FEDERAL = 'FCRA-605A-5-US-NATIONAL-7Y';
const US_FEDERAL_NOT_ANCHORED = 'FCRA-605A-1-US-NATIONAL-10Y';

/* ------------------------------------------------------------------ configuration integrity */

test('every adapter config is structurally complete and capped at its recorded ceiling', () => {
  const problems = adapters.verifyConfigs();
  assert.deepEqual(problems, []);
});

test('packet eligibility is narrow and conditional, and finding permission is recorded per rule', () => {
  /* OWNER-POTENTIAL-ISSUE-001 extended this set from the three bounded California rules to the enumerated
     per-finding authorization in rule-adapters.cjs (PACKET_ELIGIBLE_RULE_IDS); it is never a blanket flag. */
  const PACKET_ELIGIBLE = new Set(adapters.PACKET_ELIGIBLE_RULE_IDS);
  assert.equal(PACKET_ELIGIBLE.size, 9, 'exactly nine admitted findings are packet-eligible');
  for (const a of adapters.ADAPTERS) {
    assert.equal(typeof a.output_permission.packet_eligible, 'boolean', `${a.adapter_id} packet_eligible is boolean`);
    if (a.output_permission.packet_eligible === true) {
      assert.ok(PACKET_ELIGIBLE.has(a.adapter_id), `${a.adapter_id} is not an authorized packet-eligible rule`);
      assert.equal(a.output_permission.finding_allowed, true, `${a.adapter_id} packet-eligible requires finding_allowed`);
      assert.equal(a.output_permission.max_conclusion, 'violation', `${a.adapter_id} packet-eligible requires a violation ceiling`);
    }
    assert.equal(typeof a.output_permission.finding_allowed, 'boolean', `${a.adapter_id} finding_allowed is boolean`);
    if (a.output_permission.finding_allowed === true) {
      assert.ok(['violation', 'probable_violation'].includes(a.output_permission.max_conclusion), `${a.adapter_id} ceiling`);
    } else {
      assert.ok(['observation', 'none'].includes(a.output_permission.max_conclusion), `${a.adapter_id} ceiling`);
    }
  }
});

test('adapter ids are unique and every adapter cites a ledger source row', () => {
  const ids = adapters.ADAPTERS.map((a) => a.adapter_id);
  assert.equal(new Set(ids).size, ids.length);
  for (const a of adapters.ADAPTERS) assert.match(a.source_entry_id, /^CRP-LSRC-\d{4}$/);
});

/* ------------------------------------------------------------------ applicable configuration */

test('CA-NS applies and evaluates a six-year period as exceeded', () => {
  const r = adapters.runAdapter(NS, {
    country: 'CA', region: 'CA-NS', presentation: 'PR-01',
    facts: { 'tradeline.lastPaymentDate': '2015-03-01' }, referenceDate: '2022-05-01'
  });
  assert.equal(r.state, 'EVALUATED');
  assert.equal(r.applicability.state, 'EXACT_MATCH');
  assert.equal(r.outcome, 'PERIOD_EXCEEDED');
  assert.equal(r.anchor.field, 'tradeline.lastPaymentDate');
  assert.equal(r.arithmetic.anniversary, '2021-03-01');
  assert.equal(r.output_ceiling, 'observation');
  assert.equal(r.finding_emitted, false);
  assert.equal(r.packet_eligible, false);
});

test('CA-NS applies and evaluates a six-year period as not exceeded', () => {
  const r = adapters.runAdapter(NS, {
    country: 'CA', region: 'CA-NS', presentation: 'PR-01',
    facts: { 'tradeline.lastPaymentDate': '2020-01-15' }, referenceDate: '2022-05-01'
  });
  assert.equal(r.state, 'EVALUATED');
  assert.equal(r.outcome, 'PERIOD_NOT_EXCEEDED');
});

test('CA-NS treats the exact sixth anniversary as inside the period (boundary case)', () => {
  const r = adapters.runAdapter(NS, {
    country: 'CA', region: 'CA-NS', presentation: 'PR-01',
    facts: { 'tradeline.lastPaymentDate': '2016-03-01' }, referenceDate: '2022-03-01'
  });
  assert.equal(r.outcome, 'PERIOD_NOT_EXCEEDED');
  assert.equal(r.arithmetic.boundary_case, 'EXACTLY_AT_6_YEAR_ANNIVERSARY');
});

test('the United States relation is explicit and confirmed per named region, with no pattern', () => {
  const entries = adapters.adaptersForRegion('US-TX');
  assert.equal(entries.length, 5, 'every recorded federal limb reaches US-TX');
  for (const entry of entries) {
    assert.equal(entry.applicability_state, 'CONFIRMED_FEDERAL_PROHIBITION_APPLIES');
    assert.equal(entry.confirmed, true);
    assert.equal(entry.relation_id, 'US-FCRA-15-USC-1681C-COUNTRY-WIDE');
    assert.equal(entry.execution, 'EXECUTABLE_ON_THE_ADMITTED_US_CONSUMER_DISCLOSURE_FAMILY');
    assert.equal(entry.unconfirmed_dependency, null, 'the relation is no longer an unconfirmed dependency');
  }
  for (const relation of adapters.APPLICABILITY.relations) {
    for (const row of relation.region_rows) {
      assert.ok(!/[*?]/.test(row.region), `region row ${row.region} carries a pattern token`);
    }
  }
  for (const a of adapters.ADAPTERS) {
    assert.notEqual(a.applicability.mode, 'NATIONAL_RECORDED_LEGACY_RELATION', `${a.adapter_id} still uses the mechanical relation`);
    assert.equal(a.applicability.region_pattern, undefined, `${a.adapter_id} still carries a region pattern`);
  }
});

test('a United States check run without its bound presentation still refuses', () => {
  const r = adapters.runAdapter(US_FEDERAL, {
    country: 'US', region: 'US-TX', referenceDate: '2024-01-01', facts: { lastPaymentDate: '2015-06-01' }
  });
  assert.equal(r.state, 'REFUSED');
  assert.equal(r.fact_status, 'UNSUPPORTED_PRESENTATION');
  assert.match(r.refusal_reason, /PRESENTATION_NOT_SUPPORTED/);
  assert.equal(r.arithmetic, null, 'no date is read before the presentation is checked');
  assert.equal(r.finding_emitted, false);
  assert.equal(r.packet_eligible, false);
});

test('the United States bankruptcy limb now anchors on the order for relief or adjudication date', () => {
  const config = adapters.ADAPTERS.find((a) => a.adapter_id === US_FEDERAL_NOT_ANCHORED);
  assert.equal(config.anchor_mode, 'PRIORITY_CHAIN');
  assert.deepEqual(config.anchor_fields, ['publicRecord.bankruptcyOrderForReliefDate', 'publicRecord.bankruptcyAdjudicationDate']);
  const exceeded = adapters.runAdapter(US_FEDERAL_NOT_ANCHORED, {
    country: 'US', region: 'US-NY', presentation: 'US-CONSUMER-DISCLOSURE',
    referenceDate: '2026-10-01', facts: { 'publicRecord.bankruptcyOrderForReliefDate': '2015-01-01' }
  });
  assert.equal(exceeded.state, 'EVALUATED');
  assert.equal(exceeded.outcome, 'PERIOD_EXCEEDED');
  assert.equal(exceeded.finding_emitted, false, 'the unresolved § 1681c(b) use exception blocks a finding');
  assert.equal(exceeded.finding, null, 'so a qualified observation is preserved, never a VIOLATION');
  assert.equal(config.exceptions.recorded, true, 'the federal rule records the § 1681c(b) use exception');
  assert.equal(config.exceptions.items.length, 3, 'with the three exempted-use cases');
  const unresolved = adapters.runAdapter(US_FEDERAL_NOT_ANCHORED, {
    country: 'US', region: 'US-NY', presentation: 'US-CONSUMER-DISCLOSURE',
    referenceDate: '2024-01-01', facts: { lastPaymentDate: '2015-06-01' }
  });
  assert.equal(unresolved.state, 'UNRESOLVED');
  assert.equal(unresolved.arithmetic, null);
});

test('the United States adverse-item limb is anchored to a printed field and evaluates', () => {
  const config = adapters.ADAPTERS.find((a) => a.adapter_id === US_FEDERAL);
  assert.equal(config.anchor_mode, 'SINGLE_FIELD');
  assert.equal(config.anchor_field, 'reportedAccount.adverseRatingDate');
  assert.deepEqual(config.record_kinds, ['REPORTED_ACCOUNT']);
  assert.equal(config.applicability_rule, 'ADVERSE_PAYMENT_RATING_ITEM_PRESENT');
  assert.ok(config.anchor_evidence && /PUB-001/.test(config.anchor_evidence.evidenced_artifact_id),
    'its anchor is evidenced from the captured official consumer-channel artifact');
  assert.equal(config.output_permission.max_conclusion, 'violation');
  const r = adapters.runAdapter(US_FEDERAL, {
    country: 'US', region: 'US-TX', presentation: 'US-CONSUMER-DISCLOSURE',
    referenceDate: '2015-06-30', facts: { 'reportedAccount.adverseRatingDate': '2015-06-01' }
  });
  assert.equal(r.state, 'EVALUATED');
  assert.equal(r.outcome, 'PERIOD_NOT_EXCEEDED');
  assert.equal(r.anchor.iso, '2015-06-01');
  assert.equal(r.finding_emitted, false);
  assert.equal(r.packet_eligible, false);
});

test('a region with no recorded source row is named rather than given an invented instrument', () => {
  const entries = adapters.adaptersForRegion('US-UM');
  assert.equal(entries.length, 5);
  const row = adapters.RELATION_INDEX.get('US-FCRA-15-USC-1681C-COUNTRY-WIDE').region_rows.get('US-UM');
  assert.equal(row.state, 'CONFIRMED_FEDERAL_PROHIBITION_APPLIES_NO_REGIONAL_SOURCE_RECORDED');
  assert.equal(row.no_recorded_source_row, true);
  assert.deepEqual(row.regional_instruments_recorded, [], 'no regional instrument is invented for it');
  assert.match(row.explicit_resolution, /RECORDED HERE RATHER THAN HIDDEN/);
});

/* ------------------------------------------------------------------ the Australian country-wide relation */

const AU_ENQUIRY = 'AU-PRIVACY-ACT-1988-S20W-ITEM3-ENQUIRY-5Y';
const AU_DEFAULT = 'AU-PRIVACY-ACT-1988-S20W-ITEM4-DEFAULT-5Y';
const AU_PRESENTATION = 'FAM-AU-EQX-CONSUMER';

test('the AU enquiry limb evaluates a five-year period from the enquiry date', () => {
  const r = adapters.runAdapter(AU_ENQUIRY, {
    country: 'AU', region: 'AU-NSW', presentation: AU_PRESENTATION,
    facts: { 'enquiry.date': '2012-09-10' }, referenceDate: '2016-01-04'
  });
  assert.equal(r.state, 'EVALUATED');
  assert.equal(r.applicability.state, 'CONFIRMED');
  assert.equal(r.applicability.instrument_class, 'COMMONWEALTH_STATUTE');
  assert.equal(r.anchor.field, 'enquiry.date');
  assert.equal(r.arithmetic.anniversary, '2017-09-10');
  assert.equal(r.outcome, 'PERIOD_NOT_EXCEEDED');
  assert.equal(r.output_ceiling, 'violation');
  assert.equal(r.finding_emitted, false);
  assert.equal(r.packet_eligible, true, 'the AU enquiry limb now records the reconciled packet permission');
});

test('the AU default limb evaluates a five-year period from the original listing date', () => {
  const r = adapters.runAdapter(AU_DEFAULT, {
    country: 'AU', region: 'AU-QLD', presentation: AU_PRESENTATION,
    facts: { 'overdue.originalListingDate': '2015-07-20' }, referenceDate: '2021-07-20'
  });
  assert.equal(r.state, 'EVALUATED');
  assert.equal(r.arithmetic.anniversary, '2020-07-20');
  assert.equal(r.outcome, 'PERIOD_EXCEEDED');
});

test('an AU limb refuses a presentation it is not written for, before reading any date', () => {
  for (const presentation of ['PR-01', null, undefined]) {
    const r = adapters.runAdapter(AU_DEFAULT, {
      country: 'AU', region: 'AU-VIC', presentation,
      facts: { 'overdue.originalListingDate': '2015-07-20' }, referenceDate: '2021-07-20'
    });
    assert.equal(r.state, 'REFUSED');
    assert.equal(r.fact_status, 'UNSUPPORTED_PRESENTATION');
    assert.equal(r.arithmetic, null);
  }
});

test('an AU limb is bound to its own record kind and to nothing else', () => {
  assert.deepEqual(adapters.ADAPTERS.find((a) => a.adapter_id === AU_ENQUIRY).record_kinds, ['CREDIT_ENQUIRY']);
  assert.deepEqual(adapters.ADAPTERS.find((a) => a.adapter_id === AU_DEFAULT).record_kinds, ['OVERDUE_ACCOUNT']);
});

test('an AU region the relation does not name refuses every AU limb', () => {
  assert.throws(() => adapters.runAdapter(AU_ENQUIRY, {
    country: 'AU', region: 'AU-ZZ', presentation: AU_PRESENTATION, facts: {}, referenceDate: '2016-01-04'
  }), /JURISDICTION_MISMATCH/);
});

/* ------------------------------------------------------------------ mismatched jurisdictions */

test('CA-NS refuses a different Canadian province', () => {
  assert.throws(() => adapters.runAdapter(NS, {
    country: 'CA', region: 'CA-ON', presentation: 'PR-01',
    facts: { 'tradeline.lastPaymentDate': '2015-03-01' }, referenceDate: '2022-05-01'
  }), /JURISDICTION_MISMATCH/);
});

test('CA-NS refuses a US region', () => {
  assert.throws(() => adapters.runAdapter(NS, {
    country: 'US', region: 'US-NY', presentation: 'PR-01',
    facts: { 'tradeline.lastPaymentDate': '2015-03-01' }, referenceDate: '2022-05-01'
  }), /JURISDICTION_MISMATCH/);
});

test('the US federal adapter refuses a Canadian region', () => {
  assert.throws(() => adapters.runAdapter(US_FEDERAL, {
    country: 'CA', region: 'CA-NS', referenceDate: '2024-01-01', facts: { lastPaymentDate: '2015-06-01' }
  }), /JURISDICTION_MISMATCH/);
});

test('the US federal adapter refuses a country with no recorded relation', () => {
  assert.throws(() => adapters.runAdapter(US_FEDERAL, {
    country: 'GB', region: 'GB-ENG', referenceDate: '2024-01-01', facts: { lastPaymentDate: '2015-06-01' }
  }), /JURISDICTION_MISMATCH/);
});

test('an unstated or partial jurisdiction refuses every adapter', () => {
  for (const req of [{}, { country: 'CA' }, { region: 'CA-NS' }, { country: '  ', region: 'CA-NS' }]) {
    assert.throws(
      () => adapters.runAdapter(NS, Object.assign({ presentation: 'PR-01', facts: {}, referenceDate: '2022-05-01' }, req)),
      /EXPLICIT_COUNTRY_AND_REGION_REQUIRED/
    );
  }
});

test('an unknown adapter id refuses rather than silently passing', () => {
  assert.throws(() => adapters.runAdapter('NOPE', { country: 'CA', region: 'CA-NS' }), /UNKNOWN_ADAPTER/);
});

/* ------------------------------------------------------------------ missing and unsupported facts */

test('a missing anchor fact is unresolved and is never defaulted from another field', () => {
  const r = adapters.runAdapter(NS, { country: 'CA', region: 'CA-NS', presentation: 'PR-01', facts: {}, referenceDate: '2022-05-01' });
  assert.equal(r.state, 'UNRESOLVED');
  assert.equal(r.fact_status, 'EXTRACTION_UNRESOLVED');
  assert.equal(r.outcome, 'UNRESOLVED');
  assert.equal(r.anchor, null);
  assert.equal(r.arithmetic, null);
  assert.equal(r.refusal_reason, 'ANCHOR_FACT_NOT_RESOLVED');
});

test('an unparseable anchor value is unresolved, not coerced', () => {
  const r = adapters.runAdapter(NS, {
    country: 'CA', region: 'CA-NS', presentation: 'PR-01',
    facts: { 'tradeline.lastPaymentDate': '01/03/2015' }, referenceDate: '2022-05-01'
  });
  assert.equal(r.state, 'UNRESOLVED');
  assert.equal(r.refusal_reason, 'ANCHOR_FACT_NOT_RESOLVED');
});

test('a missing report reference date is unresolved', () => {
  const r = adapters.runAdapter(NS, {
    country: 'CA', region: 'CA-NS', presentation: 'PR-01', facts: { 'tradeline.lastPaymentDate': '2015-03-01' }
  });
  assert.equal(r.state, 'UNRESOLVED');
  assert.equal(r.refusal_reason, 'REPORT_REFERENCE_DATE_NOT_RESOLVED');
});

test('an anchor after the report date is unresolved rather than a negative period', () => {
  const r = adapters.runAdapter(NS, {
    country: 'CA', region: 'CA-NS', presentation: 'PR-01',
    facts: { 'tradeline.lastPaymentDate': '2024-01-01' }, referenceDate: '2022-05-01'
  });
  assert.equal(r.state, 'UNRESOLVED');
  assert.equal(r.refusal_reason, 'ANCHOR_DATE_AFTER_REPORT_REFERENCE_DATE');
});

/* ------------------------------------------------------------------ output and presentation restrictions */

test('no adapter can emit a finding', () => {
  assert.throws(() => adapters.emitFinding({}), /FINDING_NOT_AUTHORIZED/);
});

test('an unsupported presentation is refused before any date is read', () => {
  const r = adapters.runAdapter(NS, {
    country: 'CA', region: 'CA-NS', presentation: 'PR-02',
    facts: { 'tradeline.lastPaymentDate': '2015-03-01' }, referenceDate: '2022-05-01'
  });
  assert.equal(r.state, 'REFUSED');
  assert.equal(r.fact_status, 'UNSUPPORTED_PRESENTATION');
  assert.equal(r.arithmetic, null);
  assert.match(r.refusal_reason, /PRESENTATION_NOT_SUPPORTED/);
});

test('the bankruptcy adapter ages only from the clearly labelled discharge date, never a public-record filing date', () => {
  const r = adapters.runAdapter(NS_BANKRUPTCY, {
    country: 'CA', region: 'CA-NS', presentation: 'PR-01',
    facts: { 'publicRecord.date': '2012-01-01' }, referenceDate: '2022-05-01'
  });
  assert.equal(r.state, 'UNRESOLVED');
  assert.equal(r.fact_status, 'EXTRACTION_UNRESOLVED');
  assert.equal(r.refusal_reason, 'ANCHOR_FACT_NOT_RESOLVED');
  assert.equal(r.arithmetic, null);
  assert.equal(r.anchor, null);
  assert.equal(r.finding_emitted, false);
});

/* OWNER-ALL82-001 / B4 continuation and OWNER-EVIDENCE-001. "Keep the original CA-NS statutory admission
   exact-specimen and observation-only. Broader factual format support does not broaden statutory permission."
   The discharge date is now accepted as a reported fact (SINGLE_FIELD), but the limb stays bound to PR-01, so
   a second Canadian presentation runs zero statutory checks here. */
test('the bankruptcy adapter is still bound to PR-01, like every other Nova Scotia limb', () => {
  const r = adapters.runAdapter(NS_BANKRUPTCY, {
    country: 'CA', region: 'CA-NS', presentation: 'FAM-TU-CA-CONSUMER',
    facts: { 'bankruptcy.dischargeDate': '2012-01-01' }, referenceDate: '2022-05-01'
  });
  assert.equal(r.state, 'REFUSED');
  assert.equal(r.fact_status, 'UNSUPPORTED_PRESENTATION');
  assert.match(r.refusal_reason, /PRESENTATION_NOT_SUPPORTED/);
  assert.equal(r.finding_emitted, false);
});

test('describeResult never reports a finding', () => {
  const r = adapters.runAdapter(NS, {
    country: 'CA', region: 'CA-NS', presentation: 'PR-01',
    facts: { 'tradeline.lastPaymentDate': '2015-03-01' }, referenceDate: '2022-05-01'
  });
  const d = adapters.describeResult(r);
  assert.equal(d.is_a_finding, false);
  assert.equal(d.state, 'EVALUATED');
});

/* ------------------------------------------------------------------ region applicability report */

test('region applicability never confirms a relation the records file does not carry a row for', () => {
  const ns = adapters.adaptersForRegion('CA-NS');
  assert.deepEqual(ns.map((e) => e.adapter_id), [NS, NS_BANKRUPTCY, NS_JUDGMENT_CONTENT, NS_DISMISSED_CHARGE]);
  assert.ok(ns.every((e) => e.applicability_state === 'EXACT_MATCH' && e.confirmed === true));
  assert.ok(ns.every((e) => e.unconfirmed_dependency === null));

  /* Ontario now carries exactly its own recorded limb, from its own exact region row — not an inherited
     Nova Scotia limb and not a relation the records file does not carry. */
  const on = adapters.adaptersForRegion('CA-ON');
  assert.equal(on.length, 1);
  assert.equal(on[0].adapter_id, 'CA-ON-CRA-S9-3-A-RELIABLE-EVIDENCE-BASIS');
  assert.equal(on[0].applicability_state, 'EXACT_MATCH');
  assert.equal(on[0].confirmed, true);
  assert.equal(on[0].relation_id, null);

  /* Manitoba now carries its own exact record, from its own exact region row — not an inherited Nova Scotia
     limb and not a relation the records file does not carry (BATCH-12). */
  const mb = adapters.adaptersForRegion('CA-MB');
  assert.equal(mb.length, 1);
  assert.equal(mb[0].adapter_id, 'CA-MB-PIA-S4-E-JUDGMENT-CONTENT-OMISSION');
  assert.equal(mb[0].applicability_state, 'EXACT_MATCH');
  assert.equal(mb[0].confirmed, true);
  assert.equal(mb[0].relation_id, null);

  /* A Canadian province with no exact record of its own and no relation: nothing is offered and nothing is invented. */
  assert.deepEqual(adapters.adaptersForRegion('CA-BC'), []);

  /* A region the country-wide relation does not name is not served by it, pattern or not. */
  assert.deepEqual(adapters.adaptersForRegion('AU-ZZ'), []);
  assert.throws(() => adapters.runAdapter(US_FEDERAL, {
    country: 'US', region: 'US-ZZ', referenceDate: '2024-01-01', facts: {}
  }), /JURISDICTION_MISMATCH/);

  /* The three AU regions' executable relation is confirmed and carries its own evidence. */
  const au = adapters.adaptersForRegion('AU-NSW');
  assert.equal(au.length, 3);
  for (const entry of au) {
    assert.equal(entry.applicability_state, 'CONFIRMED');
    assert.equal(entry.relation_id, 'AU-PRIVACY-ACT-1988-CTH-CREDIT-REPORTING');
    assert.equal(entry.execution, 'EXECUTABLE_ON_THE_ADMITTED_AU_CONSUMER_FAMILY');
  }
});

/* ------------------------------------------------------------------ primitives in isolation */

test('computeElapsedPeriod refuses a non-positive or oversized period', () => {
  assert.equal(primitives.computeElapsedPeriod('2015-01-01', '2022-01-01', 0).outcome, 'UNRESOLVED');
  assert.equal(primitives.computeElapsedPeriod('2015-01-01', '2022-01-01', -1).outcome, 'UNRESOLVED');
  assert.equal(primitives.computeElapsedPeriod('2015-01-01', '2022-01-01', 3.5).outcome, 'UNRESOLVED');
  assert.equal(primitives.computeElapsedPeriod('2015-01-01', '2022-01-01', 101).outcome, 'UNRESOLVED');
});

test('the shared arithmetic is the CA-NS unit\'s own (leap-day clamp preserved)', () => {
  assert.equal(primitives.calendar.addCalendarYears('2016-02-29', 1), '2017-02-28');
  assert.equal(primitives.calendar.addCalendarYears('2020-02-29', 6), '2026-02-28');
  assert.equal(primitives.calendar.daysBetween('2020-02-29', '2021-02-28'), 365);
});

/* ------------------------------------------------------------------ report */

if (failures.length) {
  for (const f of failures) console.error(`FAIL  ${f.name}\n      ${f.message}`);
  console.error(`\n${failures.length} failed, ${passed} passed`);
  process.exit(1);
}
if (process.argv.includes('--json')) console.log(JSON.stringify({ suite: 'adapters', passed, failed: 0, adapters: adapters.listAdapters().map((a) => a.adapter_id) }));
else {
  console.log(`test-adapters.cjs: ${passed} passed, 0 failed`);
  console.log(`adapters: ${adapters.listAdapters().map((a) => a.adapter_id).join(', ')}`);
}
