'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const renderer = process.env.CRP_CREATOR_RENDER_ROOT || 'C:\\Users\\webbd\\crp-render';
const FIXTURES = Object.freeze({
  'CA-TOR-0001': { country: 'CA', region: 'CA-ON' },
  'US-MD-0001': { country: 'US', region: 'US-MD' },
  'UK-LDN-0001': { country: 'GB', region: 'GB-ENG' },
  'AU-SYD-0001': { country: 'AU', region: 'AU-NSW' }
});
const RECIPES = Object.freeze({
  PAST_DUE_EXCEEDS_BALANCE: {
    check_id: 'COMMON-ERROR-BALANCE-PAYMENT-INCONSISTENCY',
    description: 'First account prints 125 past due against a balance of 100.'
  },
  CLOSED_BEFORE_OPENED: {
    check_id: 'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY',
    description: 'A closed account prints a closing date before its opening date.'
  },
  AU_CLOSED_LIABILITY_OVER_2Y: {
    check_id: 'COMMON-ERROR-REPORTING-PERIOD-EXCEEDED',
    description: 'An Australian consumer credit liability prints a closing date more than two years before the report date.'
  },
  AU_CLOSED_LIABILITY_WITHIN_2Y: {
    check_id: 'COMMON-ERROR-REPORTING-PERIOD-EXCEEDED', expectation: 'ABSENT',
    description: 'A boundary guard: an Australian closed liability remains inside the two-year reporting period.'
  },
  US_COLLECTION_OVER_7Y_180D: {
    check_id: 'COMMON-ERROR-REPORTING-PERIOD-EXCEEDED',
    description: 'A US collection prints a Date of First Delinquency older than seven years and 180 days.'
  },
  US_COLLECTION_WITHIN_7Y_180D: {
    check_id: 'COMMON-ERROR-REPORTING-PERIOD-EXCEEDED', expectation: 'ABSENT',
    description: 'A US collection prints a Date of First Delinquency inside seven years and 180 days.'
  }
});
function create({ fixtureId, recipe, id, root }) {
  const cell = FIXTURES[fixtureId], rule = RECIPES[recipe];
  if (!cell || !rule || !/^[a-z0-9_-]{3,80}$/i.test(id)) throw new Error('Choose a supported fixture, recipe and case ID');
  const source = path.join(renderer, 'fixtures', 'credit_reports', `${fixtureId}.json`);
  const fixture = JSON.parse(fs.readFileSync(source, 'utf8'));
  if (fixture.fixture_meta?.data_classification?.includes('SYNTHETIC') !== true || !Array.isArray(fixture.tradelines))
    throw new Error('Creator source must be a synthetic fixture with tradelines');
  let seedNote;
  if (recipe === 'PAST_DUE_EXCEEDS_BALANCE') {
    const line = fixture.tradelines[0];
    if (!line || !Number.isFinite(line.current_balance) || !Number.isFinite(line.past_due_amount)) throw new Error('First account has no numeric balance and past-due fields');
    line.current_balance = 100;
    line.past_due_amount = 125;
    seedNote = `${line.creditor?.name || 'First account'} prints ${line.currency || 'local currency'} 125 past due against a balance of 100.`;
  } else if (recipe === 'AU_CLOSED_LIABILITY_OVER_2Y') {
    if (cell.country !== 'AU') throw new Error('Australian liability recipe needs an Australian Creator form');
    const line = fixture.tradelines.find((entry) => entry.date_closed);
    if (!line) throw new Error('Fixture has no closed liability to seed');
    fixture.consumer.report_date = '2026-09-17';
    line.date_closed = '2024-08-15';
    line.date_last_payment = '2024-08-01';
    line.date_last_activity = '2024-08-15';
    line.status_date = '2024-08-15';
    seedNote = `${line.creditor?.name || 'Closed account'} prints Closed Date ${line.date_closed} against Report Date ${fixture.consumer.report_date}; ordinary Australian consumer credit liability period is two years after closure.`;
  } else if (recipe === 'AU_CLOSED_LIABILITY_WITHIN_2Y') {
    if (cell.country !== 'AU') throw new Error('Australian liability recipe needs an Australian Creator form');
    const line = fixture.tradelines.find((entry) => entry.date_closed);
    if (!line) throw new Error('Fixture has no closed liability to check');
    fixture.consumer.report_date = '2026-09-17';
    seedNote = `${line.creditor?.name || 'Closed account'} prints Closed Date ${line.date_closed} against Report Date ${fixture.consumer.report_date}, within two years.`;
  } else if (recipe === 'US_COLLECTION_OVER_7Y_180D' || recipe === 'US_COLLECTION_WITHIN_7Y_180D') {
    if (cell.country !== 'US') throw new Error('US collection recipe needs a US Creator form');
    fixture.consumer.report_date = '2026-09-17';
    const old = recipe === 'US_COLLECTION_OVER_7Y_180D';
    fixture.collections = [{ agency: 'FIXTURE COLLECTION AGENCY', original_creditor: 'SAMPLE CREDIT PROVIDER',
      status: 'In collection', placed_date: old ? '2018-06-01' : '2020-06-01',
      date_first_delinquency: old ? '2018-01-15' : '2020-01-15', balance: 740,
      reportable_until: old ? '2025-07-14' : '2027-07-14',
      note: 'Fictional collection record for source-linked reporting-period testing.' }];
    seedNote = `Collection prints Date of First Delinquency ${fixture.collections[0].date_first_delinquency} and Report Date ${fixture.consumer.report_date}; apply the seven-year period after the 180-day statutory clock start, subject to the rule's unresolved exceptions.`;
  } else {
    const line = fixture.tradelines.find((entry) => entry.date_opened && entry.date_closed);
    if (!line) throw new Error('Fixture has no closed account to seed');
    const month = line.date_opened.slice(0, 7);
    line.date_opened = `${month}-15`;
    line.date_closed = `${month}-14`;
    seedNote = `${line.creditor?.name || 'Closed account'} prints opened ${line.date_opened} and closed ${line.date_closed}; both day values are unambiguous in the rendered date order.`;
  }
  fixture.fixture_meta.fixture_id = id;
  const countryDir = cell.country === 'GB' ? 'UK' : cell.country;
  const fixturePath = path.join(root, 'fixtures', `${id}.json`);
  const reportPath = path.join(root, 'reports', countryDir, `${id}.pdf`);
  const oraclePath = path.join(root, 'oracles', `${id}.json`);
  if ([fixturePath, reportPath, oraclePath].some((file) => fs.existsSync(file))) throw new Error('Case files already exist');
  for (const dir of [path.dirname(fixturePath), path.dirname(reportPath), path.dirname(oraclePath)]) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fixturePath, JSON.stringify(fixture, null, 2) + '\n', { flag: 'wx' });
  const rendered = spawnSync(process.execPath, [path.join(renderer, 'generate-pdf.mjs'), fixturePath, reportPath],
    { cwd: renderer, encoding: 'utf8', timeout: 120000 });
  if (rendered.status !== 0 || !fs.existsSync(reportPath)) {
    fs.rmSync(fixturePath, { force: true });
    throw new Error((rendered.stderr || 'Creator renderer failed').trim().slice(-700));
  }
  const oracle = { source_creator: renderer, source_fixture: fixtureId, recipe,
    seeds: [{ seed_id: id, check_id: rule.check_id, expectation: rule.expectation || 'DETECT', adjudication: seedNote }] };
  fs.writeFileSync(oraclePath, JSON.stringify(oracle, null, 2) + '\n', { flag: 'wx' });
  return { id, report: reportPath, oracle: oraclePath, country: cell.country, region: cell.region, fixture: fixturePath };
}
module.exports = { create, FIXTURES, RECIPES };
