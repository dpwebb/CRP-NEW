'use strict';
/**
 * ct-assessment-clock.cjs — OWNER correction (SOL assessment date, October 6 2026).
 *
 * The court-enforcement limitation assessment uses the date the SERVER runs the assessment, in the recorded
 * application basis (America/Halifax), and never the printed report date, the upload date or anything a request
 * supplies. Each run persists ONE stamp; a deliberate rerun takes a fresh one; merely viewing, unlocking,
 * rendering or downloading a result leaves its stamp and its findings untouched. The printed report date is kept
 * separately as provenance, and the report-date-based machinery keeps using it.
 *
 * CONTROLLED TIME. Every HTTP assertion here pins `CRP_ASSESSMENT_CLOCK_AT`, so no assertion depends on the wall
 * clock; the environment variable is always cleared afterwards.
 */

const clock = require('../../assessment-clock.cjs');
const { buildPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');

const NS_LINES = (firstDelinquency) => [
  'Equifax  Consumer Credit Report - FICTIONAL TEST FIXTURE',
  'Report Date: 12 June 2026',
  `Collection Agency ABC  Balance $500  Past Due $500  Date of First Delinquency ${firstDelinquency}`,
  'Creditor B  Balance $100  Opened 01/01/2020  Closed 01/01/2019'
];

/** Run one controllable step with the assessment clock pinned, then always clear it. */
async function withClock(instant, work) {
  const previous = process.env[clock.CONTROLLED_CLOCK_ENV];
  process.env[clock.CONTROLLED_CLOCK_ENV] = instant;
  try {
    return await work();
  } finally {
    if (previous === undefined) delete process.env[clock.CONTROLLED_CLOCK_ENV];
    else process.env[clock.CONTROLLED_CLOCK_ENV] = previous;
  }
}

async function createCase(service, actor) {
  const created = await service.request('POST', '/api/cases', { token: actor.token, body: { country: 'CA', region: 'CA-NS' } });
  return created.json.case.case_id;
}

async function uploadAndEvaluate(service, actor, caseId, lines) {
  const pdf = buildPdf({ pages: [{ lines }] });
  await service.request('POST', `/api/cases/${caseId}/files`, {
    token: actor.token,
    body: { originalFilename: 'fictional-report.pdf', declaredBytes: pdf.length, mimeType: 'application/pdf', contentBase64: pdf.toString('base64') }
  });
  return service.request('POST', `/api/cases/${caseId}/evaluate`, { token: actor.token });
}

function runClockControls(check, evidence) {
  /* 1. The calendar basis is America/Halifax, and it decides the DATE, not just the time of day. */
  const winter = clock.runStamp('2026-01-10T02:00:00Z');
  check.equal(winter.assessment_date, '2026-01-09', 'an assessment run at 02:00Z in January is still the previous day in Halifax');
  check.equal(winter.assessment_clock_basis, 'America/Halifax', 'and the basis is recorded explicitly');
  check.ok(/-04:00$/.test(winter.assessment_run_at), 'the recorded instant carries the basis offset (winter)');
  const summer = clock.runStamp('2026-07-10T02:00:00Z');
  check.equal(summer.assessment_date, '2026-07-09', 'the same instant in July is the previous day in Halifax too');
  check.ok(/-03:00$/.test(summer.assessment_run_at), 'and carries the summer offset');
  check.equal(clock.runStamp().clock_source, 'SERVER_CLOCK', 'with no override the stamp comes from the server clock');

  /* 2. A request can never supply the date: those fields are ignored and named back. */
  const withClientFields = clock.runStamp('2026-01-10T02:00:00Z', { assessment_date: '1999-01-01', assessed_at: '1999-01-01T00:00:00Z', now: '1999-01-01T00:00:00Z', fileId: 'f1' });
  check.equal(withClientFields.assessment_date, '2026-01-09', 'a client-supplied assessment date cannot move the stamp');
  check.deepEqual(withClientFields.client_clock_fields_ignored, ['assessment_date', 'assessed_at', 'now'], 'and the ignored fields are recorded');
  check.ok(/never used for a court-enforcement time-limit comparison/.test(withClientFields.clock_rule), 'the stamp states the contract it follows');
  evidence.clock = { basis: winter.assessment_clock_basis, winter: winter.assessment_date, summer: summer.assessment_date };
}

async function runHttpControls(service, check, evidence) {
  /* 3. An OLD report assessed today: the run date decides, the report date is provenance, the age is recorded. */
  const actor = await service.account('ct-clock@example.test');
  const caseId = await createCase(service, actor);
  const first = await withClock('2026-06-13T12:00:00Z', () => uploadAndEvaluate(service, actor, caseId, NS_LINES('01 June 2024')));
  check.equal(first.status, 201, 'the report is assessed with the controlled server date');
  check.equal(first.json.assessed_on, '2026-06-13', 'and the response carries the assessment date');
  let view = (await service.request('GET', `/api/cases/${caseId}`, { token: actor.token })).json.view;
  check.equal(view.result.assessed_on, '2026-06-13', 'the stored result carries the assessment date');
  check.equal(view.assessment_summary.assessed_on, '2026-06-13', 'and the free summary carries it too');
  const run1 = view.result.issues.filter((i) => i.limitation_concern);
  check.equal(run1.length, 1, 'the first run raises the limitation concern');
  check.equal(run1[0].limitation.assessed_on, '2026-06-13', 'with the run date as its operative date');
  check.equal(run1[0].limitation.report_date, '2026-06-12', 'and the printed report date kept separately as provenance');
  check.ok(/checked on 2026-06-13/.test(run1[0].explanation), 'the explanation names the date it was checked');
  check.ok(/The report itself was issued on 2026-06-12/.test(run1[0].explanation), 'and the report date it was issued on');
  check.ok(/A later payment of this debt, or an admission of it in writing, can restart/.test(run1[0].uncertainty), 'with the later-events uncertainty stated plainly, and a restart attributed only to a payment or an admission');
  check.ok(/sold or placed with a collection agency/.test(run1[0].uncertainty), 'while a sale or collection placement is named as NOT restarting the clock');

  /* 4. A RERUN ACROSS A DATE BOUNDARY: a fresh stamp, a fresh row, the earlier row untouched. */
  const firstRunIssueCount = view.result.issues.length;
  const second = await withClock('2025-01-10T12:00:00Z', () => service.request('POST', `/api/cases/${caseId}/evaluate`, { token: actor.token }));
  check.equal(second.status, 201, 'a deliberate rerun is accepted');
  check.equal(second.json.assessed_on, '2025-01-10', 'and takes a FRESH assessment date');
  view = (await service.request('GET', `/api/cases/${caseId}`, { token: actor.token })).json.view;
  check.equal(view.result.assessed_on, '2025-01-10', 'the latest result carries the new date');
  check.equal(view.result.issues.filter((i) => i.limitation_concern).length, 0, 'and on the earlier date the same debt is inside the period, so nothing is raised');
  const rows = service.service.store.state().results.filter((r) => r.case_id === caseId);
  check.equal(rows.length, 2, 'two assessments are stored, not one');
  check.equal(rows[0].assessment_clock.assessment_date, '2026-06-13', 'the earlier assessment keeps its own date');
  check.ok(rows[0].rendered.issues.some((i) => i.limitation_concern === true), 'and its own findings');
  check.ok(rows[0].created_at.startsWith('2026-06-13'), 'its persisted timestamp is its own run stamp');
  check.equal(rows[1].assessment_clock.assessment_date, '2025-01-10', 'and the rerun has its own');
  check.ok(rows[0].created_at !== rows[1].created_at, 'the two persisted timestamps differ');
  check.equal(firstRunIssueCount, rows[0].rendered.issues.length, 'the first run still counts what it counted');

  /* 5. VIEWING AND DOWNLOADING LATER CHANGES NOTHING. */
  const viewed = await withClock('2027-03-01T12:00:00Z', async () => {
    const v = (await service.request('GET', `/api/cases/${caseId}`, { token: actor.token })).json.view;
    const download = await service.request('GET', `/api/cases/${caseId}/report-download`, { token: actor.token });
    return { v, download, count: service.service.store.state().results.filter((r) => r.case_id === caseId).length };
  });
  check.equal(viewed.v.result.assessed_on, '2025-01-10', 'viewing the result a year later does not advance its assessment date');
  check.equal(viewed.count, 2, 'and creates no new assessment');
  check.equal(viewed.download.status, 200, 'the assessment download is served');
  check.ok(/Assessed on:? 2025-01-10/.test(String(viewed.download.body || viewed.download.text || JSON.stringify(viewed.download.json || ''))), 'the download states the assessment date it was produced with, not the viewing date');

  /* 6. A CLIENT-SUPPLIED DATE IS IGNORED over HTTP, and the attempt is recorded. */
  const clientTried = await withClock('2026-06-13T12:00:00Z', () => service.request('POST', `/api/cases/${caseId}/evaluate`, {
    token: actor.token,
    body: { assessment_run_at: '1999-01-01T00:00:00Z', assessment_date: '1999-01-01', assessed_at: '1999-01-01T00:00:00Z', now: '1999-01-01T00:00:00Z' }
  }));
  check.equal(clientTried.json.assessed_on, '2026-06-13', 'the assessment date stays the server date');
  const latest = service.service.store.state().results.filter((r) => r.case_id === caseId).slice(-1)[0];
  check.equal(latest.assessment_clock.assessment_date, '2026-06-13', 'and the persisted stamp is the server one');
  check.deepEqual(latest.assessment_clock.client_clock_fields_ignored, ['assessment_run_at', 'assessment_date', 'assessed_at', 'now'], 'while the client-supplied date fields are recorded as ignored');

  /* 7. REPORT-DATE-BASED WORK IS UNCHANGED BY THE CLOCK: the same report assessed under two different run dates
     produces identical non-limitation findings; only the limitation arithmetic moves with the run date. */
  const case2 = await createCase(service, actor);
  await withClock('2026-06-13T12:00:00Z', () => uploadAndEvaluate(service, actor, case2, NS_LINES('01 June 2019')));
  const earlyView = (await service.request('GET', `/api/cases/${case2}`, { token: actor.token })).json.view;
  const case3 = await createCase(service, actor);
  await withClock('2029-01-10T12:00:00Z', () => uploadAndEvaluate(service, actor, case3, NS_LINES('01 June 2019')));
  const lateView = (await service.request('GET', `/api/cases/${case3}`, { token: actor.token })).json.view;
  const shape = (v) => v.result.issues.filter((i) => !i.limitation_concern).map((i) => i.explanation).sort();
  check.deepEqual(shape(earlyView), shape(lateView), 'the report-against-itself findings are identical under either assessment date');
  const earlyLim = earlyView.result.issues.filter((i) => i.limitation_concern)[0];
  const lateLim = lateView.result.issues.filter((i) => i.limitation_concern)[0];
  check.ok(lateLim.limitation.years_since > earlyLim.limitation.years_since, 'while the limitation item measures to its own run date');
  check.equal(Math.round((lateLim.limitation.years_since - earlyLim.limitation.years_since) * 100) / 100, 2.58, 'by exactly the interval between the two run dates');
  check.equal(earlyLim.limitation.report_date, '2026-06-12', 'and both keep the same printed report date, because the report itself did not change');
  check.equal(lateLim.limitation.report_date, '2026-06-12', 'in both runs');

  /* 8. The served UI states the assessment date. */
  const asset = await service.request('GET', '/app.js', { token: actor.token });
  const assetText = String(asset.body || asset.text || '');
  check.ok(/Assessed on/.test(assetText) && /assessmentDateLine/.test(assetText),
    `the served application renders "Assessed on" for results (status ${asset.status}, ${assetText.length} bytes)`);
  evidence.http = { first_run: first.json.assessed_on, rerun: second.json.assessed_on, rows: rows.length, download_states_stored_date: true };
}

async function run(service, check) {
  const evidence = {};
  runClockControls(check, evidence);
  await runHttpControls(service, check, evidence);
  return evidence;
}

module.exports = {
  run,
  id: 'ct-assessment-clock',
  title: 'OWNER correction (SOL assessment date): the server run date is the one authoritative clock — basis controls, old report assessed now, rerun across a date boundary, unchanged saved results, client-date manipulation, and retained report-date-based checks'
};
