'use strict';

const fs = require('node:fs');
const path = require('node:path');
const common = require('../../common-errors.cjs');
const rules = require('../../common-error-rule-assessment.cjs');

function regions() {
  const file = path.resolve(__dirname, '..', '..', '..', '..', 'consumer-wizard', 'dist', 'jurisdiction-data.js');
  const raw = fs.readFileSync(file, 'utf8');
  return JSON.parse(raw.slice(raw.indexOf('window.CRP_JURISDICTION_DATA = ') + 30).trim().replace(/;\s*$/, ''))
    .regions.map((r) => r.region_code);
}

function tradeLine(caption = 'LABEL_PRINTED_WITHOUT_VALUE', event = true, kind = 'TU_CA_TRADELINE') {
  return {
    record_index: 1, kind, kind_label: 'account', status: 'RESOLVED',
    location: { page: 4, line: 1 }, facts: {},
    printed: caption ? { 'Closed Date': {
      state: caption, raw: null, location: { page: 4, line: 5 }
    } } : {},
    account_material: { narrative_legend: event ? { AC: 'Account closed' } : {} },
    monthly_rows: event ? [{ location: { page: 4, line: 10 }, narrative_codes: ['AC'] }] : []
  };
}

function violationFor(record, region) {
  const check = common.closureStatedWithoutAClosedDate([record]);
  if (!check || check.state !== 'POTENTIAL_ISSUE') return null;
  const issue = { check_id: check.check_id, evidence: check.source_records[0].evidence };
  return rules.assess(issue, record, { region, presentation: 'FAM-TU-CA-CONSUMER' });
}

async function run(t, check) {
  const selected = regions();
  check.equal(selected.length, 82, 'the canonical jurisdiction list contains 82 selections');
  for (const region of selected) {
    const finding = violationFor(tradeLine(), region);
    check.equal(finding?.classification, 'POTENTIAL_VIOLATION',
      `${region}: printed blank and report-defined closure support a qualified violation`);
    check.deepEqual(finding?.required_facts.map((f) => f.source.location),
      [{ page: 4, line: 5 }, { page: 4, line: 10 }],
      `${region}: both decisive sources are linked to the same account`);
    check.equal(finding?.required_facts[0].source.omitted_value, true,
      `${region}: missing date is represented as an omitted value, not an invented date`);
    check.equal(violationFor(tradeLine('LABEL_PRINTED_WITHOUT_VALUE', true, 'REPORTED_ACCOUNT'), region)?.classification,
      'POTENTIAL_VIOLATION', `${region}: source-proven omission is not tied to a TransUnion record-kind label`);
    check.equal(violationFor(tradeLine('VALUE_UNRESOLVED'), region), null,
      `${region}: unreadable value does not prove an omission`);
    check.equal(violationFor(tradeLine(null), region), null,
      `${region}: reader-missing caption does not prove a report omission`);
    check.equal(violationFor(tradeLine('LABEL_PRINTED_WITHOUT_VALUE', false), region), null,
      `${region}: a blank without a corroborated closure event does not trigger the rule`);
  }
  return { regions_tested: selected.length, rule: 'COMMON-ERROR-CLOSURE-STATED-WITHOUT-A-CLOSED-DATE',
    fixture: 'source-shaped fictional account with a report-defined closure code and explicit blank',
    boundary: 'This verifies shared rule execution under each selected jurisdiction, not ordinary-report reader or packet coverage for every bureau.' };
}

module.exports = { run, id: 'cx-all82-required-report-data',
  title: 'All-82 shared omission rule: source-linked blank, defined event and missing-reader controls' };
