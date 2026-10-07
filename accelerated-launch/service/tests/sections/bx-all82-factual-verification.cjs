'use strict';
/**
 * bx-all82-factual-verification.cjs — OWNER-ALL82-001: the jurisdiction-agnostic factual-verification consumer
 * journey exercised across all 82 canonical regions. The six common-error potential issues run on the
 * GENERAL-BUREAU-REPORT intake regardless of region; this section proves the COMPLETE journey — the factual
 * observation -> select -> approve -> entitled download — for every one of the 82 selections (not just the few
 * regions with a statutory finding), and that each downloaded packet matches the selected issue content and
 * carries its own case report identity. It records the journey per region, so "configured" is never conflated
 * with "delivered".
 *
 * Where a region's own content rule measures the SAME discrepancy on the same record, the factual observation is
 * delivered inside that region's single issue as a supported base instead of as a second card
 * (OWNER-CA-ORDINARY-REPORT-002; today that is CA-ON). The journey is measured on that one issue and its factual
 * base is located explicitly, so no jurisdiction is left without the journey and none is skipped.
 *
 * The shared service mechanism is reused; no 82 redundant browser journeys are created (the representative
 * real-browser journey is bw-browser-wizzard). Fictional report only; entitlement is the test-adapter monthly
 * subscription (a signed, non-payment event), never a real card.
 */
const fs = require('node:fs');
const path = require('node:path');
const { buildPdf } = require('../../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const uploadBody = (bytes, filename) => ({ originalFilename: filename, declaredBytes: bytes.length, mimeType: 'application/pdf', contentBase64: bytes.toString('base64') });

function canonicalRegions() {
  const raw = fs.readFileSync(path.join(ROOT, 'consumer-wizard', 'dist', 'jurisdiction-data.js'), 'utf8');
  const data = JSON.parse(raw.slice(raw.indexOf('window.CRP_JURISDICTION_DATA = ') + 30).trim().replace(/;\s*$/, ''));
  return data.regions.map((r) => ({ country: r.country_code, region: r.region_code }));
}

async function run(service, check) {
  const regions = canonicalRegions();
  const actor = await service.unpaidAccount('bx-all82@example.test');
  const pay = await service.pay(actor, 'monthly');
  check.equal(pay.response.accepted, true, 'the account holds an active subscription for the journey');

  const stranger = await service.unpaidAccount('bx-all82-stranger@example.test');
  const surfaced = [];
  const missing = [];
  const mergedRegions = [];
  const presentations = new Set();
  let contentMatched = 0;
  let associationMatched = 0;

  for (const r of regions) {
    const label = `${r.country}-${r.region}`;
    const marker = `Fictional Creditor ${r.region}`;
    const ordinal = regions.indexOf(r);
    /* An UNAMBIGUOUS numeric date: the day is 13-27, so it cannot be read as a month and the general intake resolves it without needing a report-wide convention. A day of 2-12 is ambiguous (02/03 reads either way) and is left unresolved, so the record would carry no opened date and the comparison would not run. */
    const opened = `${String(1 + Math.floor(ordinal / 15)).padStart(2, '0')}/${String(13 + (ordinal % 15)).padStart(2, '0')}/2020`;
    const pdf = buildPdf({ pages: [{ lines: ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', `${marker}  Balance $100  Opened ${opened}  Closed 01/01/2019`] }] });
    const c = (await service.request('POST', '/api/cases', { token: actor.token, body: { country: r.country, region: r.region } })).json.case;
    const up = await service.request('POST', `/api/cases/${c.case_id}/files`, { token: actor.token, body: uploadBody(pdf, 'fictional-general-report.pdf') });
    presentations.add(up.json.receipt.format_detection.presentation_id);
    await service.request('POST', `/api/cases/${c.case_id}/evaluate`, { token: actor.token });
    const pv = (await service.request('GET', `/api/cases/${c.case_id}/packet`, { token: actor.token })).json.view;
    const issue = (pv.eligible_issues || []).find((i) => i.eligible && /opened date later than its closed date/.test(i.explanation || ''))
      || (pv.eligible_issues || []).find((i) => i.eligible
        && (i.supported_bases || []).some((b) => b.basis_type === 'FACTUAL_CONSISTENCY' && b.check_kind === 'an account with contradictory dates'));
    if (!issue || !issue.rule_assessment
      || issue.rule_assessment.classification !== 'PROBABLE_VIOLATION'
      || issue.rule_assessment.requirement !== 'An account cannot close before it opened.') {
      missing.push(label); continue;
    }
    /* A region whose own content issue carries the factual observation as a supported base is recorded, so the
       one-issue delivery is measured rather than assumed. */
    if ((issue.supported_bases || []).some((b) => b.basis_type === 'FACTUAL_CONSISTENCY')) mergedRegions.push(label);
    /* The complete shared journey: select -> approve -> entitled download. */
    await service.request('POST', `/api/cases/${c.case_id}/packet/select`, { token: actor.token, body: { issue_ids: [issue.issue_id] } });
    await service.request('POST', `/api/cases/${c.case_id}/packet/correspondence`, { token: actor.token, body: { correspondence: { consumer_name: 'Dana Whitfield', contact: 'dana.whitfield@example.test' } } });
    const approval = await service.request('POST', `/api/cases/${c.case_id}/packet/approve`, { token: actor.token });
    const dl = await service.request('GET', `/api/cases/${c.case_id}/packet-download`, { token: actor.token });
    const contentOk = dl.status === 200 && dl.text.includes(issue.explanation)
      && dl.text.includes(issue.rule_assessment.requirement)
      && /Selected issues: 1\b/.test(dl.text) && !/established reporting issue/.test(dl.text);
    const identity = pv.report_identity || {};
    const version = approval.json.view.packet.approved_version;
    const assocOk = contentOk && dl.text.includes(opened) && dl.text.includes(version)
      && String(dl.headers.get('content-disposition')).includes(c.case_id)
      && /Report: /.test(dl.text) && (!identity.reference_date || dl.text.includes(identity.reference_date));
    if (r === regions[0]) {
      check.equal((await service.request('GET', `/api/cases/${c.case_id}/packet-download`, { token: stranger.token })).status, 403, 'a stranger cannot download the approved regional packet');
      const other = (await service.request('POST', '/api/cases', { token: actor.token, body: { country: r.country, region: r.region } })).json.case;
      check.notEqual((await service.request('GET', `/api/cases/${other.case_id}/packet-download`, { token: actor.token })).status, 200, 'another owned case cannot borrow this packet approval');
      await service.request('DELETE', `/api/cases/${other.case_id}`, { token: actor.token });
    }
    if (contentOk) contentMatched += 1;
    if (assocOk) associationMatched += 1;
    (contentOk && assocOk ? surfaced : missing).push(label);
    // Each journey is complete. Remove its test-only case so subsequent iterations do not
    // repeatedly serialize an ever-growing history; extraction and approval are never bypassed.
    const deletion = await service.request('DELETE', `/api/cases/${c.case_id}`, { token: actor.token });
    if (deletion.status !== 200) throw new Error(`${label}: test case cleanup failed`);
  }

  check.equal(regions.length, 82, 'the 82 canonical regions are enumerated');
  check.equal(surfaced.length, 82, 'every jurisdiction runs the source-linked violation through select -> approve -> entitled download, whether it is offered as its own issue or as a supported base of the region own issue');
  check.deepEqual(missing, [], 'with no jurisdiction lacking the journey');
  check.deepEqual([...presentations], ['GENERAL-BUREAU-REPORT'], 'all through the same jurisdiction-agnostic general intake');
  check.equal(contentMatched, 82, 'every downloaded packet matches the selected approved issue content');
  check.equal(associationMatched, 82, 'and carries its own case report identity (case/report association preserved)');

  return { regions_tested: surfaced.length, presentations: [...presentations], download_content_matched: contentMatched, case_association_matched: associationMatched, one_issue_regions_delivering_the_factual_observation_as_a_supported_base: mergedRegions, fixtures: '82 distinct fictional general reports with case-specific printed creditor evidence; no real consumer identifiers or private reports' };
}

module.exports = { run, id: 'bx-all82-factual-verification', title: 'OWNER-ALL82-001: the general-intake factual-observation journey (select/approve/download) across all 82 jurisdictions, including the one region whose own issue carries the factual observation as a supported base' };
