'use strict';
/**
 * run-tests.cjs — the B2 vertical-slice suite.
 *
 *   node accelerated-launch/service/tests/run-tests.cjs
 *
 * Every section runs against a real loopback listener and its own private data directory outside the
 * repository. The suite writes one artifact: `service/out/b2-evidence.json`, which the launch-matrix builder
 * reads so the matrix reports what was actually exercised.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const { TestService } = require('./harness.cjs');
const crypto = require('node:crypto');
const { SOURCE_AUDIT_FILES, LANE_IDS } = require('./verification-lanes.cjs');

const OUT_DIR = path.join(__dirname, '..', 'out');
const SECTION_FILES = [
  'a-isolation.cjs',
  'ax-consumer-privacy.cjs',
  'b-jurisdiction-and-refusals.cjs',
  'c-extraction-not-absence.cjs',
  'd-record-independence.cjs',
  'e-qualifications.cjs',
  'f-signout-and-deletion.cjs',
  'g-privacy.cjs',
  'h-legacy-parity.cjs',
  'i-shared-regressions.cjs',
  'j-specimen-journey.cjs',
  'k-ui-smoke.cjs',
  'l-au-format-family.cjs',
  'm-au-journey.cjs',
  'n-applicability-records.cjs',
  'o-all82-infrastructure.cjs',
  'p-us-consumer-format.cjs',
  'q-record-applicability.cjs',
  'r-ca-factual-assessment.cjs',
  's-gb-consumer-format.cjs',
  /* B4 — paid entitlement, service hardening, and the presentation-and-release record. */
  't-entitlement.cjs',
  'u-hardening.cjs',
  'v-presentation-and-release.cjs',
  /* B4 continuation — the second Canadian consumer format, admitted by its own structural contract. */
  'w-ca-second-bureau-format.cjs',
  /* B4-PAY-001 — the once-only CAD upgrade credit and the paid assessment-report download. */
  'x-b4-pay-001.cjs',
  /* B6-INGEST-001 — the coverage matrix, its registry consistency and the unsupported-bureau acquisition queue. */
  'y-ingest-coverage-matrix.cjs',
  /* B6-INGEST-002 — the general bureau-report intake path and its unrelated/unreadable refusals. */
  'z-general-intake.cjs',
  /* ACCEPT-001: active checklist retention comparisons and retired enquiry guard. */
  'ab-acceptance-statutory.cjs',
  /* OWNER-EVIDENCE-001 — the immutable reported-fact policy and the enforced bankruptcy discharge date. */
  'ac-evidence-policy.cjs',
  /* ACCEPT-002 — the reassessed public-record legal-event facts (judgment entry, tax lien paid, bankruptcy). */
  'ad-legal-event-facts.cjs',
  /* OWNER-ACCEPT-003 — D1–D4: collection 180-day rule, satisfied-judgment condition, per-rule classification. */
  'ae-accept-003.cjs',
  /* OWNER-ACCEPT-004 — classification correction: the ceiling caps, never selects, the finding class. */
  'af-accept-004.cjs',
  /* OWNER-ACCEPT-006 — statutory content assessments (medical, fraud alert/security freeze, dispute). */
  'ag-accept-006.cjs',
  /* OWNER-ACCEPT-009 — GAP-INGEST-001: coherent multi-file / image-set assessment. */
  'ah-multifile-assessment.cjs',
  /* OWNER-ACCEPT-009 — GAP-INGEST-003..007: OCR-uncertainty through assessment; written/numeric/partial/reference dates. */
  'aj-ingest-dates.cjs',
  /* OWNER-ACCEPT-009 — GAP-INGEST-008/-009/-010: partial native-text recovery, bureau segmentation, upload limits. */
  'ak-ingest-008-009-010.cjs',
  /* OWNER-ACCEPT-009 — BLOCKER-COMMON-ERRORS-001: data-consistency checks feed report-data violation rules. */
  'al-common-errors.cjs',
  'ct-owner-common-error-scope.cjs',
  'cw-common-error-rule-assessment.cjs',
  'cx-all82-required-report-data.cjs',
  'db-common-error-surface-repairs.cjs',
  'da-common-error-reader-repairs.cjs',
  'cy-common-error-predicate-repairs.cjs',
  'cz-common-error-packet-repairs.cjs',
  'dc-consumer-violation-term.cjs',
  'dg-owned-reaging.cjs',
  'de-tu-ca-common-error-sources.cjs',
  'df-us-common-error-reader.cjs',
  'dm-au-role-packet-evidence.cjs',
  'dl-general-caption-sources.cjs',
  'dn-us-dated-history.cjs',
  'do-gb-history-definitions.cjs',
  'dp-us-cell-recovery.cjs',
  'dq-ca-printed-account-fields.cjs',
  'dr-reader-evidence-delivery.cjs',
  'du-column-reader-delivery.cjs',
  'ds-column-caption-fields.cjs',
  'dt-rating-history-rows.cjs',
  'dv-au-reference-delivery.cjs',
  'dw-us-history-completion.cjs',
  'dx-report-date-custody.cjs',
  'dy-reader-date-delivery.cjs',
  'ea-account-profile-documents.cjs',
  'eb-account-packet-support.cjs',
  'ec-account-packet-ui.cjs',
  'ed-account-browser.cjs',
  'dh-ca-reader-completion.cjs',
  'di-au-reader-completion.cjs',
  'dj-gb-reader-completion.cjs',
  'dk-reader-completion-integration.cjs',
  /* OWNER-ACCEPT-009 — BLOCKER-FDT-001: incomplete-reading detection, bounded recovery, consequential
     limitations, corrected duplicate semantics, and the reproducible benchmark. */
  'am-fdt-recovery.cjs',
  /* OWNER-ACCEPT-009 — geometry-aware payment-history grid assembly (positioned headings/cells/legend). */
  'an-payment-history-grid.cjs',
  /* OWNER-ACCEPT-009 — GAP-INGEST-008: single-page partial-text recovery (native text + image-only region). */
  'ao-ingest-008-mixed-page.cjs',
  /* OWNER-ACCEPT-010 — build consistency C1-C5 (validator, grid cells/confidence, continuation, clarification). */
  'ap-accept-010-consistency.cjs',
  /* OWNER-GAP-FINDING-001 — tri-state rule-specific exception evaluation (applies / does-not-apply / unresolved). */
  'aq-gap-finding-001.cjs',
  /* OWNER-GAP-FINDING-003 — rule identity/version binding (admitted source version retained; absent/inconsistent blocks). */
  'ar-gap-finding-003.cjs',
  /* OWNER-GAP-FINDING-004 — source-linked finding facts (raw value, location, normalization, uncertainty, policy; absent/misassociated blocks; no cross-account leakage). */
  'as-gap-finding-004.cjs',
  /* OWNER-GAP-FINDING-002-RESOURCE-001 — the scoped unverified order-for-relief candidate derives PROBABLE. */
  'at-gap-finding-002.cjs',
  'au-closure-policy.cjs',
  /* OWNER-CLOSURE-001 — BLOCKER-RESULTS-001: prioritized action list (deterministic, plain-English, qualified, isolated). */
  'av-consumer-results.cjs',
  /* OWNER-CLOSURE-001 — BLOCKER-EXPLANATIONS-001: why-this-was-flagged cards (report_fact, rule_basis, uncertainty, consistency). */
  'aw-consumer-explanations.cjs',
  /* OWNER-CLOSURE-001 — BLOCKER-SUPPORT-001: privacy-safe account-owned diagnostic reference (reference, redaction, access, usefulness). */
  'ay-consumer-support.cjs',
  /* OWNER-CLOSURE-001 — BLOCKER-SUPPORT-001: Support interface browser behavior and reference secret lifecycle. */
  'az-consumer-support-ui.cjs',
  /* OWNER-CLOSURE-001 — BLOCKER-BILLING-001: billing consumer interface and server enforcement. */
  'ba-consumer-billing.cjs',
  /* OWNER-CLOSURE-001 - GAP-INGEST-001: image-set coherence through the full local pipeline (assembly -> evaluation -> consumer result). */
  'bb-gap-ingest-001.cjs',
  /* OWNER-CLOSURE-001 - GAP-INGEST-002: multi-line account/collection/public-record boundaries (continuation lines, status/identifier, source locations, finding trace). */
  'bc-gap-ingest-002.cjs',
  /* OWNER-CLOSURE-001 - GAP-INGEST-004: unambiguous written date forms (month names, abbreviations, punctuation, classification equivalence, invalid dates, finding trace, HTTP). */
  'bd-gap-ingest-004.cjs',
  /* OWNER-CLOSURE-001 - GAP-INGEST-005: numeric date conventions (unambiguous resolution, report-evidenced convention, scope isolation, contradiction withholding, HTTP). */
  'be-gap-ingest-005.cjs',
  /* OWNER-CLOSURE-001 - GAP-INGEST-006: month-only / partial-date precision (MONTH/DAY preservation, conservative interval, contradiction withholding, HTTP). */
  'bf-gap-ingest-006.cjs',
  /* OWNER-REPORT-USE-POLICY-001 — report-use clarification resolves the admitted US §1681c(b)/§380-j(f)(2) use exceptions. */
  'bg-report-use.cjs',
  /* OWNER-CANDIDATE-002 — Nova Scotia judgment-content omission (s.10(3)(d)) verified-omission finding. */
  'bh-ns-judgment-content.cjs',
  /* OWNER-CANDIDATE-003 — Nova Scotia dismissed-charge prohibition (s.10(3)(f)) report-content inclusion. */
  'bh-ns-dismissed-charge.cjs',
  /* OWNER-CANDIDATE-005 — California paid-tax-lien obsolescence (§1785.13(a)(4)) finding. */
  'bi-us-ca-tax-lien.cjs',
  /* OWNER-CANDIDATE-006 — California collection-account obsolescence (§1785.13(a)(5)+(b)) finding. */
  'bj-us-ca-collection.cjs',
  /* OWNER-CANDIDATE-007 (B) — California adverse-information obsolescence (§1785.13(a)(8)) finding. */
  'bk-us-ca-adverse-rating.cjs',
  /* OWNER-CA-CORRECTION-PACKET-001 — the bounded California correction packet. */
  'bl-us-ca-correction-packet.cjs',
  /* OWNER-POTENTIAL-ISSUE-001 — the complete common-issue consumer journey (Batch 1). */
  'bm-prime-directive-batch1.cjs',
  /* OWNER-POTENTIAL-ISSUE-001 — Wizzard UI interaction for the potential issue card and the packet flow. */
  'bn-prime-directive-ui.cjs',
  /* OWNER-POTENTIAL-ISSUE-001 — Wizzard interaction against the real service (select/save/approve/download). */
  'bo-prime-directive-interaction.cjs',
  /* OWNER-POTENTIAL-ISSUE-001 — ordinary-account batch (balance/past-due, potential duplicate, responsibility). */
  'bp-prime-directive-batch2.cjs',
  /* OWNER-POTENTIAL-ISSUE-001 — Branch A: field-capability format coverage (AU-Equifax account dates; named gaps). */
  'bq-format-capability.cjs',
  /* OWNER-POTENTIAL-ISSUE-001 — Branch B: separate qualified assessment (unresolved exception -> PROBABLE). */
  'br-qualified-assessment.cjs',
  /* OWNER-POTENTIAL-ISSUE-001 — consumer delivery of qualified retention + AU contradictory-date via the packet path. */
  'bs-prime-directive-delivery.cjs',
  /* OWNER-POTENTIAL-ISSUE-001 — AU ordinary-field coverage (status/closure + potential duplicate) via the packet path. */
  'bt-ordinary-field-coverage.cjs',
  /* OWNER-POTENTIAL-ISSUE-001 — GB-Experian + TU-CA ordinary-account date fields via the packet path. */
  'bu-gb-tu-ca-fields.cjs',
  /* OWNER-POTENTIAL-ISSUE-001 — admission contracts, AU/GB upload fixtures, US balance/past-due. */
  'bv-admission-and-upload.cjs',
  /* OWNER-POTENTIAL-ISSUE-001 — real-browser Wizzard acceptance. */
  'bw-browser-wizzard.cjs',
  /* OWNER-ALL82-001 — the general-intake potential-issue journey across all 82 jurisdictions. */
  'bx-all82-factual-verification.cjs',
  /* OWNER-POTENTIAL-ISSUE-001 — reconcile every emitted finding with the unified Issue and packet path. */
  'by-packet-reconciliation.cjs',
  /* BLOCKER-SUBSCRIPTION-VALUE-001 — owned report history and evidence-based comparison. */
  'bz-report-history.cjs',
  /* OWNER-ORDINARY-FIELD-001 - one AU ordinary-account field improvement through the Issue -> packet path. */
  'ca-au-ordinary-field.cjs',
  /* OWNER-PACKET-CORRESPONDENCE-001 - the recipient type, the consumer-supplied correspondence details and the
     organized correspondence/evidence the consumer reviews and sends. */
  'cb-packet-correspondence.cjs',
  /* OWNER-CA-ORDINARY-REPORT-001 - the Ontario ordinary-report reliability issue through the complete journey. */
  'cc-ca-on-ordinary-report.cjs',
  /* CRP_VERSION_1_FINISH_ORDER_001 - the GB UK GDPR accuracy/rectification issue through the complete journey. */
  'cd-gb-uk-gdpr-accuracy.cjs',
  /* BLOCKER-REPORT-DATA-TO-ISSUE-001 (first slice) - the TransUnion Canada ordinary-account MATERIAL fields
     (creditor identity, type/responsibility, terms, payment-history counts, monthly amount/rating rows) read
     through the block's own captions and table header, mapped to the shared checks and delivered by a packet. */
  'ce-tu-ca-account-material.cjs',
  /* BATCH-6 — Newfoundland and Labrador s.39(1)(g) dismissed-charge prohibition, on a retrieved provision. */
  'cf-ca-nl-dismissed-charge.cjs',
  /* BATCH-10 — Alberta s.4(b) debt reporting period through the complete packet path. */
  'ch-ca-ab-debt-six-year.cjs',
  /* BATCH-12 — Manitoba s.4(e) judgment-content omission through the complete packet path. */
  'ci-ca-mb-judgment-content.cjs',
  /* BATCH-14 — Prince Edward Island s.9(3)(d) judgment-content omission through the complete packet path. */
  'cj-ca-pe-judgment-content.cjs',
  /* BATCH-17 — territorial PIPEDA accuracy and the PEI dismissed-charge limb. */
  'ck-ca-territories-pipeda-accuracy.cjs',
  /* BATCH-18 — British Columbia accuracy, Quebec accuracy and New Brunswick judgment content. */
  'cl-bc-qc-nb-finish.cjs',
  /* BATCH-23 — AU listing reference / overdue amount and the recorded US specimen, real-file extraction. */
  'cn-au-us-ingestion.cjs',
  'co-canada-upload-delivery.cjs',
  /* BATCH-24 — the one coordinated plain-text correction across the consumer surface (all 82 jurisdictions). */
  'cp-consumer-plain-text.cjs',
  /* BATCH-28 — OWNER-PURCHASE-FLOW-001: assessment before purchase, the free summary and teaser, and the two
     separate purchase questions (one-time report unlock versus subscription). */
  'cq-purchase-flow.cjs',
  /* BLOCKER-REPORT-DATA-TO-ISSUE-001 (real-report core repair): the supplied real TransUnion Canada report
     assessed under Nova Scotia — the reader repairs, the supported findings, the reporting-period limb and the
     paid boundaries, with CRLF/LF and benign synthetic controls. */
  'cr-ca-ns-tu-real-report.cjs',
  /* BLOCKER-REPORT-DATA-TO-ISSUE-001 (Batch 31): the court-limitation assessment and the payment-history
     analysis, with their positive, boundary, missing-prerequisite and benign controls. */
  'cs-limitation-and-payment-history.cjs',
  /* OWNER correction (SOL assessment date): the server run date is the one clock, with controlled-time tests. */
  'ct-assessment-clock.cjs',
  /* OWNER dual-date retention: the historical and current comparison per retention rule. */
  'cu-dual-date-retention.cjs',
  'cv-accrual-limitation-delivery.cjs'];

function makeCheck(report, verbose) {
  const record = (label, fn) => {
    try {
      fn();
      report.passed += 1;
    } catch (err) {
      report.failed += 1;
      const line = `${label} — ${err.message}`;
      report.failures.push(line);
      process.stdout.write(`  FAIL ${line}\n`);
    }
  };
  return {
    ok: (condition, label) => record(label, () => assert.ok(condition)),
    equal: (actual, expected, label) => record(label, () => assert.equal(actual, expected)),
    notEqual: (a, b, label) => record(label, () => assert.notEqual(a, b)),
    deepEqual: (a, b, label) => record(label, () => assert.deepEqual(a, b)),
    notDeepEqual: (a, b, label) => record(label, () => assert.notDeepEqual(a, b)),
    match: (value, pattern, label) => record(label, () => assert.match(value, pattern)),
    skip: (label, reason) => {
      report.skipped.push({ label, reason });
      if (verbose) process.stdout.write(`  SKIP ${label} — ${reason}\n`);
    }
  };
}

async function runSection(file, verbose) {
  const section = require(path.join(__dirname, 'sections', file));
  const started = Date.now();
  const report = { id: section.id, title: section.title, file, passed: 0, failed: 0, skipped: [], failures: [], evidence: null, completed: false, section_exception: null };
  if (verbose) process.stdout.write(`\n${section.id} — ${section.title}\n`);
  const service = new TestService(section.id);
  await service.listen();
  try {
    report.evidence = await section.run(service, makeCheck(report, verbose));
    report.completed = true;
  } catch (err) {
    report.failed += 1;
    const first = err && err.stack ? err.stack.split('\n')[0] : String(err);
    report.section_exception = first;
    report.failures.push(`section threw: ${first}`);
    process.stdout.write(`  FAIL section threw: ${first}\n`);
    if (err && err.cause) {
      const { code, syscall, address, port } = err.cause;
      process.stdout.write(`  FAIL transport cause: ${JSON.stringify({ code, syscall, address, port })}\n`);
    }
  } finally {
    await service.close();
  }
  report.duration_ms = Date.now() - started;
  return report;
}

/**
 * OWNER-PACKET-CORRESPONDENCE-001: a SUCCESSFUL full regression leaves valid implementation evidence behind.
 *
 * The run's own writers refresh the measured content of a few evidence files (in particular clarify and
 * common-errors), which would otherwise drop the implementation status those files carry until someone re-ran the
 * closure scripts by hand. Every closure record below re-derives its status from THIS run's evidence and re-hashes
 * the sources it cites, so re-applying them cannot launder a stale claim: a changed source, or a cited section that
 * did not run or did not pass, still makes the record refuse or re-open. A FAILED run restores nothing.
 */
function restoreImplementationEvidence() {
  const dir = path.resolve(__dirname, '..', '..', '..', 'SOURCE_CAPTURES', 'CLOSURE-POLICY-001');
  /* Every closure record derives its implementation status from the run's evidence and re-hashes the sources it
     cites, so a source change honestly invalidates it until it is re-derived. The two files excluded here are not
     closure records: apply-policy.cjs applies a policy and update-records.cjs edits the register. */
  const excluded = new Set(['apply-policy.cjs', 'update-records.cjs']);
  const scripts = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((n) => /^(closure-.*|refresh-legacy-evidence-closure|revalidate-.*)\.cjs$/.test(n) && !excluded.has(n)).sort()
    : [];
  const applied = [];
  if (!scripts.length) return [{ script: '*', applied: false, reason: 'NO_CLOSURE_RECORDS_FOUND' }];
  /* The one evidence builder that lives in the service directory (it runs its own focused sections) is re-derived
     in the same way, so a source change cannot leave BLOCKER-SUBSCRIPTION-VALUE-001 stale either. */
  const serviceBuilders = path.resolve(__dirname, '..').replace(/[\\/]tests$/, '');
  const builders = ['build-subscription-value-evidence.cjs']
    .map((n) => path.join(serviceBuilders, n))
    .filter((p) => fs.existsSync(p));
  for (const name of scripts) {
    const file = path.join(dir, name);
    try {
      execFileSync(process.execPath, [file], { stdio: ['ignore', 'pipe', 'pipe'] });
      applied.push({ script: name, applied: true });
    } catch (err) {
      const stderr = String((err && err.stderr) || (err && err.message) || 'failed').split('\n').map((l) => l.trim()).filter(Boolean);
      const reason = stderr.length ? stderr[stderr.length - 1] : 'failed';
      applied.push({ script: name, applied: false, reason });
      process.stderr.write(`implementation evidence NOT restored by ${name}: ${reason}\n`);
    }
  }
  for (const file of builders) {
    try {
      execFileSync(process.execPath, [file], { stdio: ['ignore', 'pipe', 'pipe'] });
      applied.push({ script: path.basename(file), applied: true });
    } catch (err) {
      const stderr = String((err && err.stderr) || (err && err.message) || 'failed').split('\n').map((l) => l.trim()).filter(Boolean);
      const reason = stderr.length ? stderr[stderr.length - 1] : 'failed';
      applied.push({ script: path.basename(file), applied: false, reason });
      process.stderr.write(`implementation evidence NOT restored by ${path.basename(file)}: ${reason}\n`);
    }
  }
  return applied;
}

async function main() {
  const verbose = process.env.CRP_B2_QUIET !== '1';
  const started = Date.now();

  /* OWNER-BATCH-EXECUTION-001 §6: an explicit section-selection option for focused development. No argument runs
     the full suite exactly as before. Arguments are section IDs (e.g. `bh-ns-judgment-content`); an unknown id
     fails loudly. A focused run writes its own focused-evidence.json and never overwrites the full release
     evidence (b2/b3/b4/clarify/common-errors) or marks unrun sections passed. */
  const args = process.argv.slice(2).filter(Boolean);
  const requested = [];
  for (const arg of args) {
    if (!arg.startsWith('--lane=')) { requested.push(arg); continue; }
    const lane = arg.slice('--lane='.length);
    if (!LANE_IDS[lane]) {
      process.stderr.write(`unknown verification lane: ${lane}; available: ${Object.keys(LANE_IDS).join(', ')}\n`);
      process.exitCode = 2;
      return;
    }
    requested.push(...LANE_IDS[lane]);
  }
  const focused = requested.length > 0;
  let filesToRun = SECTION_FILES;
  if (focused) {
    const fileById = new Map([...SECTION_FILES, ...SOURCE_AUDIT_FILES].map((file) => {
      const section = require(path.join(__dirname, 'sections', file));
      return [section.id, file];
    }));
    const unknown = requested.filter((id) => !fileById.has(id));
    if (unknown.length) {
      process.stderr.write(`unknown section id(s): ${unknown.join(', ')}\n`);
      process.stderr.write(`available: ${[...fileById.keys()].join(', ')}\n`);
      process.exitCode = 2;
      return;
    }
    filesToRun = [...new Set(requested)].map((id) => fileById.get(id));
  }

  const sourceFiles = [];
  function collectSource(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (['out', 'node_modules'].includes(entry.name)) continue;
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) collectSource(p);
      else if (/\.(cjs|js|json|html|css)$/.test(entry.name)) sourceFiles.push(p);
    }
  }
  collectSource(path.join(__dirname, '..'));
  collectSource(path.join(__dirname, '..', '..', 'adapters'));
  const sourceIdentity = () => sourceFiles.map((p) => ({ file: path.relative(path.join(__dirname, '..', '..', '..'), p), sha256: crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex') }));
  const testedSource = sourceIdentity();
  const sectionReports = [];
  for (const file of filesToRun) sectionReports.push(await runSection(file, verbose));

  const totals = sectionReports.reduce((acc, r) => ({
    passed: acc.passed + r.passed,
    failed: acc.failed + r.failed,
    skipped: acc.skipped + r.skipped.length
  }), { passed: 0, failed: 0, skipped: 0 });

  const byId = new Map(sectionReports.map((r) => [r.id, r]));
  const clean = (id) => byId.has(id) && byId.get(id).completed && byId.get(id).failed === 0;
  const finalSource = sourceIdentity();
  const sourceDrift = testedSource.filter((p, i) => p.sha256 !== finalSource[i].sha256).map(p => p.file);
  if (sourceDrift.length) {
    totals.failed += 1;
    process.stderr.write(`FAIL source changed during execution: ${sourceDrift.join(', ')}\n`);
  }
  const execution = {
    mode: focused ? 'FOCUSED' : 'FULL_CURRENT_PRODUCT',
    duration_ms: Date.now() - started,
    selected_sections: sectionReports.map((r) => r.id),
    unrun_sections: SECTION_FILES.map((f) => require(path.join(__dirname, 'sections', f)).id).filter((id) => !byId.has(id)),
    source_audit: focused && requested.some((id) => LANE_IDS['source-audit'].includes(id)) ? 'SELECTED' : 'NOT_RUN_SEPARATE_LANE',
    source_hashes: testedSource,
    source_drift: sourceDrift,
    totals,
    sections: sectionReports
  };

  /* A focused run stops here: it reports only the requested sections and writes a separate focused-evidence.json,
     leaving the full release evidence files untouched. */
  if (focused) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUT_DIR, 'focused-evidence.json'), `${JSON.stringify({
      mode: 'FOCUSED',
      requested,
      execution,
      totals,
      sections: sectionReports.map((r) => ({ id: r.id, title: r.title, file: r.file, passed: r.passed, failed: r.failed, skipped: r.skipped.length, failures: r.failures, evidence: r.evidence }))
    }, null, 2)}\n`, 'utf8');
    process.stdout.write(`\n${'-'.repeat(78)}\n`);
    for (const report of sectionReports) {
      const status = report.failed === 0 ? 'PASS' : 'FAIL';
      process.stdout.write(`${status}  ${report.id.padEnd(22)} ${String(report.passed).padStart(3)} passed  ${String(report.failed).padStart(2)} failed  ${String(report.skipped.length).padStart(2)} skipped\n`);
    }
    process.stdout.write(`${'-'.repeat(78)}\n`);
    process.stdout.write(`FOCUSED: ${totals.passed} assertions passed, ${totals.failed} failed, ${totals.skipped} skipped in ${Date.now() - started}ms\n`);
    process.stdout.write(`focused evidence written to ${path.relative(process.cwd(), path.join(OUT_DIR, 'focused-evidence.json'))} (full release evidence untouched)\n`);
    process.exitCode = totals.failed === 0 ? 0 : 1;
    return;
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'current-regression-evidence.json'), `${JSON.stringify(execution, null, 2)}\n`);
  // Historical captures retain their original meaning. Compatibility evidence below is a
  // current execution of the named fixture contracts, not a re-issued historical certificate.
  const previous = ['b2-evidence.json', 'b3-evidence.json', 'b4-evidence.json'].filter(f => fs.existsSync(path.join(OUT_DIR, f)));
  if (previous.length) {
    const archive = path.join(OUT_DIR, 'historical', new Date().toISOString().replace(/[:.]/g, '-'));
    fs.mkdirSync(archive, { recursive: true });
    for (const f of previous) fs.copyFileSync(path.join(OUT_DIR, f), path.join(archive, f));
  }
  const formats = require('../formats.cjs');
  // Refresh configured reader gaps from the live shared checklist, separately from passing delivery evidence.
  require('../finding-coverage.cjs').main();
  const adapters = require('../../adapters/rule-adapters.cjs');
  const capabilities = {
    scope: 'CONFIGURED_CAPABILITY_SEPARATE_FROM_TESTED_DELIVERY',
    presentations: formats.listSupportedFormats(),
    configured_rule_ids: adapters.ADAPTERS.map(a => a.adapter_id),
    finding_allowed_rule_ids: adapters.ADAPTERS.filter(a => a.output_permission.finding_allowed).map(a => a.adapter_id),
    packet_permission_rule_ids: adapters.ADAPTERS.filter(a => a.output_permission.packet_eligible).map(a => a.adapter_id),
    factual_issue_types: require('../issues.cjs').POTENTIAL_ISSUE_CHECK_IDS,
    delivery_sections: sectionReports.filter(r => /^(bm|bp|bs|bv|bw|bx|by|bz)-/.test(r.id)).map(r => ({ id: r.id, completed: r.completed, passed: r.failed === 0 && r.completed, evidence: r.evidence })),
    production_ready: false
  };

  const evidence = {
    owner_order: 'OWNER-ALL82-001',
    batch: 'B2',
    plan: 'CRP_IMMUTABLE_ALL_82_WIZARD_BUILD_PLAN.md',
    service_stack: 'Node.js built-ins only; one local CommonJS HTTP service; private on-disk state outside the repository',
    totals,
    execution,
    capabilities,
    acceptance: {
      '1_user_a_cannot_reach_user_b': clean('a-isolation'),
      '2_wrong_jurisdiction_and_unsupported_files_refused': clean('b-refusals'),
      '3_extraction_failure_is_not_field_absence': clean('c-extraction'),
      '4_records_do_not_borrow_dates_or_values': clean('d-records'),
      '5_results_qualified_not_comprehensive': clean('e-qualifications'),
      '6_signout_and_deletion_stop_access': clean('f-deletion'),
      '7_no_private_data_in_logs_or_public_assets': clean('g-privacy'),
      '8_existing_all82_routing_and_adapter_tests_pass': clean('i-shared-regressions')
    },
    supported: {
      presentations: formats.listSupportedFormats(),
      confirmed_regions_with_an_adapter: [...new Set(require('../../adapters/rule-adapter-catalog.json').regions.filter(r => r.adapter_coverage.length).map(r => r.region))],
      unconfirmed_national_relations_held_back: [],
      checks_blocked_on_an_unadmitted_presentation: [],
      response_drafts_available: 0,
      demonstration_mode_counts_as_report_support: false,
      jurisdictions_launch_ready: 0
    },
    sections: sectionReports,
    limits: [
      'This vertical slice does not make any of the 82 jurisdictions launch ready.',
      'A synthetic demonstration exercises the interface; it evidences no report format and counts as nothing.',
      'Each presentation retains its own digest or structural admission contract; general intake has a separate supported path.',
      'Configured rule and format coverage is distinct from the consumer journeys actually tested.',
      'Definite, qualified probable and supported potential issues have distinct meanings and issue-specific packet eligibility. No third-party transmission is performed.'
    ]
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'b2-evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');

  /* ------------------------------------------------------------------ B3 evidence */
  /* The B2 artifact above is written exactly as before and is NOT rewritten by B3. B3 writes its own file, so
     each batch's evidence stays separately identifiable and no historical package is regenerated. */
  const evidenceOf = (id) => (byId.has(id) ? byId.get(id).evidence : null);
  const applicability = evidenceOf('n-applicability') || {};
  const au = evidenceOf('m-au-journey') || {};
  const family = evidenceOf('l-au-format-family') || {};
  const infrastructure = evidenceOf('o-all82-infrastructure') || {};
  const us = evidenceOf('p-us-consumer-format') || {};
  const applicabilityStates = evidenceOf('q-record-applicability') || {};
  const caFacts = evidenceOf('r-ca-factual-assessment') || {};
  const gbFormat = evidenceOf('s-gb-consumer-format') || {};
  const specimen = evidenceOf('j-specimen-journey') || null;

  const BLOCKED = {
    GB: 'CONSUMER_REPORT_EXAMPLE_IS_DATED_2007_SO_CURRENCY_FOR_PRESENT_DAY_GB_FILES_IS_NOT_ESTABLISHED',
    CA: 'COUNTRY_WIDE_RELATION_NOT_ESTABLISHED_AND_NO_ADMITTED_PROVINCIAL_PRESENTATION'
  };
  /* The markets a format family is registered for. B3 continuation added the United States and the UK. */
  const FORMAT_MARKETS = ['CA', 'AU', 'US', 'GB'];
  const regionSupport = {};
  for (const region of Object.keys(infrastructure.regions || {})) {
    const row = infrastructure.regions[region];
    regionSupport[region] = {
      country: row.country,
      applicability: row.applicability,
      format_path_for_the_market: FORMAT_MARKETS.includes(row.country) ? 'REGISTERED_FOR_THE_MARKET' : 'NONE_FOR_THE_MARKET',
      executable_checks: 0,
      working_assessment: false,
      blocked_by: BLOCKED[row.country] || null,
      infrastructure_validation: 'EXERCISED_LOCALLY_NOT_LAUNCH_VALIDATED'
    };
  }
  for (const region of au.regions_with_a_working_assessment || []) {
    if (!regionSupport[region]) continue;
    regionSupport[region].executable_checks = 2;
    regionSupport[region].checks_performed_on_real_evidence = (au.regions[region] || {}).checks_performed || 0;
    regionSupport[region].working_assessment = true;
    regionSupport[region].blocked_by = null;
    regionSupport[region].presentation_id = au.presentation_id;
    regionSupport[region].evidence = `${au.evidenced_artifact_id} — the captured public sample, read read-only`;
  }
  /* B3 continuation: the United States. One executed comparison on the real consumer sample, plus the
     applicability determinations the same real sample supports. Not-applicable and unresolved limbs are
     counted separately and are never added to the executed figure. */
  for (const region of (us.regions_with_a_working_assessment || [])) {
    if (!regionSupport[region]) continue;
    regionSupport[region].executable_checks = us.executed_checks_per_region || 1;
    regionSupport[region].checks_performed_on_real_evidence = us.checks_performed_on_the_sample || 0;
    regionSupport[region].applicability_determined_not_applicable = us.not_applicable_limbs_per_region || 0;
    regionSupport[region].applicability_unresolved = us.applicability_unresolved_limbs_per_region || 0;
    regionSupport[region].assessment_kinds = ['STATUTORY_RULE_COMPARISON'];
    regionSupport[region].working_assessment = true;
    regionSupport[region].blocked_by = null;
    regionSupport[region].presentation_id = us.presentation_id;
    regionSupport[region].evidence = `${us.evidenced_artifact_id} — the captured official consumer-channel sample, read read-only by local OCR`;
  }
  /* The Australian rows report only currently active checklist-related comparisons. */
  for (const region of (au.regions_with_a_working_assessment || [])) {
    if (!regionSupport[region]) continue;
    regionSupport[region].assessment_kinds = ['STATUTORY_RULE_COMPARISON'];
  }
  /* CA-NS's own row is filled in from the Canadian factual section below, which is the section that measures
     its statutory limb on the real specimen. This fallback applies only when that section was skipped. */
  if (caFacts.skipped !== false && specimen && specimen.checked_in === true && regionSupport['CA-NS']) {
    regionSupport['CA-NS'].executable_checks = 2;
    regionSupport['CA-NS'].checks_performed_on_real_evidence = specimen.observations;
    regionSupport['CA-NS'].assessment_kinds = ['STATUTORY_RULE_COMPARISON'];
    regionSupport['CA-NS'].working_assessment = true;
    regionSupport['CA-NS'].blocked_by = null;
    regionSupport['CA-NS'].presentation_id = specimen.presentation_id;
    regionSupport['CA-NS'].evidence = 'the digest-pinned evidenced specimen, read read-only';
  }

  /* B3 continuation: Canada. All thirteen selections run the same four factual checks on the same admitted
     presentation. Current statutory support is limited to active checklist-related adapters;
     each region row states the classes actually run. */
  for (const [region, row] of Object.entries(caFacts.regions || {})) {
    if (!regionSupport[region]) continue;
    regionSupport[region].executable_checks = row.statutory_checks_performed;
    regionSupport[region].checks_performed_on_real_evidence =
      row.statutory_checks_performed + row.factual_checks_performed;
    regionSupport[region].factual_checks = row.factual_checks_performed;
    regionSupport[region].assessment_kinds = row.assessment_kinds;
    regionSupport[region].working_assessment = true;
    regionSupport[region].blocked_by = null;
    regionSupport[region].presentation_id = caFacts.presentation_id || 'PR-01';
    regionSupport[region].evidence = 'the digest-pinned Equifax Canada consumer specimen, read read-only';
  }
  if (caFacts.skipped !== false) {
    for (const region of ['CA-AB', 'CA-BC', 'CA-MB', 'CA-NB', 'CA-NL', 'CA-NS', 'CA-NT', 'CA-NU', 'CA-ON', 'CA-PE', 'CA-QC', 'CA-SK', 'CA-YT']) {
      if (regionSupport[region]) regionSupport[region].blocked_by = caFacts.reason || 'THE_EVIDENCED_SPECIMEN_IS_NOT_ON_THIS_MACHINE';
    }
  }

  /* B3 continuation: the United Kingdom. All four selections run the same two factual checks and the same
     labelled policy observation on the same admitted presentation, and none of them runs a statutory check,
     because the recorded GB relation binds no adapter. */
  for (const [region, row] of Object.entries(gbFormat.regions || {})) {
    if (!regionSupport[region]) continue;
    regionSupport[region].executable_checks = 0;
    regionSupport[region].checks_performed_on_real_evidence = row.factual_checks_performed;
    regionSupport[region].factual_checks = row.factual_checks_performed;
    regionSupport[region].policy_observations = row.policy_observations;
    regionSupport[region].assessment_kinds = row.assessment_kinds;
    regionSupport[region].working_assessment = true;
    regionSupport[region].blocked_by = null;
    regionSupport[region].presentation_id = gbFormat.presentation_id || null;
    regionSupport[region].evidence = 'PUB-009 — the captured official UK consumer report example, read read-only';
    regionSupport[region].residual_blocker = BLOCKED.GB;
  }

  const b3 = {
    execution, capabilities,
    measurement_scope: 'Representative format fixture contracts; configured capability and current consumer delivery are separate',
    owner_order: 'OWNER-ALL82-001',
    batch: 'B3',
    plan: 'CRP_IMMUTABLE_ALL_82_WIZARD_BUILD_PLAN.md',
    service_stack: evidence.service_stack,
    totals,
    acceptance: {
      '1_us_national_relation_is_explicit_and_per_region': clean('n-applicability'),
      '2_uk_gb_naming_and_region_relations_resolved_explicitly': clean('n-applicability'),
      '3_observation_only_adapters_for_supported_period_rules': clean('m-au-journey'),
      '4_supported_report_format_family_defined_from_evidenced_structure': clean('l-au-format-family'),
      '5_other_reports_admitted_only_on_a_justified_tested_contract': clean('l-au-format-family'),
      '6_ca_ns_exact_specimen_admission_unchanged': clean('j-specimen-journey') && clean('n-applicability'),
      '7_ambiguity_restricts_only_its_own_check_and_records_do_not_borrow': clean('d-records') && clean('l-au-format-family'),
      '8_existing_shared_interfaces_reused': clean('i-shared-regressions'),
      '9_shared_infrastructure_exercised_across_all_82': clean('o-all82-infrastructure'),
      '10_launch_matrix_updated_from_actual_tests': true,
      '11_us_consumer_disclosure_read_by_authorized_local_ocr': clean('p-us-consumer-format'),
      '12_per_record_applicability_state_applicable_not_applicable_unresolved': clean('q-record-applicability'),
      '13_canadian_factual_assessment_for_all_thirteen_selections': clean('r-ca-factual-assessment'),
      '14_gb_consumer_format_with_factual_checks_and_labelled_policy_observations': clean('s-gb-consumer-format'),
      '15_factual_policy_and_statutory_checks_kept_apart': clean('r-ca-factual-assessment') && clean('s-gb-consumer-format')
    },
    applicability: {
      records_file: 'accelerated-launch/adapters/applicability-records.json',
      counts: applicability.records || null,
      regions_with_a_confirmed_relation: applicability.regions_with_a_confirmed_relation || null,
      regions_with_an_executable_relation: applicability.regions_with_an_executable_relation || null,
      pattern_based_relations_remaining: 0
    },
    supported: {
      presentations: [
        'PR-01 — the digest-pinned Equifax Canada consumer specimen (admission path: exact specimen digest)',
        'FAM-AU-EQX-CONSUMER — the Equifax Australia consumer credit file (admission path: evidenced structural contract, evidenced from PUB-012)',
        'US-CONSUMER-DISCLOSURE — the Experian United States consumer disclosure (admission path: evidenced structural contract, evidenced from PUB-001, whose raster text is recovered by the authorized LOCAL OCR reader)',
        'FAM-GB-EXP-CONSUMER — the Experian United Kingdom consumer credit report (admission path: evidenced structural contract, evidenced from the captured official consumer report example PUB-009)'
      ],
      format_families: ['FAM-AU-EQX-CONSUMER', 'FAM-US-EXP-CONSUMER', 'FAM-GB-EXP-CONSUMER']
        .filter((id) => (id === 'FAM-AU-EQX-CONSUMER'
          ? (family.real_evidence && !family.real_evidence.skipped)
          : (id === 'FAM-US-EXP-CONSUMER' ? (us.real_evidence && !us.real_evidence.skipped) : gbFormat.skipped === false))),
      /* The owner asked that factual support, policy checks and statutory checks be distinguished. These are
         the three classes, each with the checks that actually ran and the regions they ran for. */
      assessment_classes: {
        statutory_rule_comparisons: {
          executed_check_ids: ['AU-PRIVACY-ACT-1988-S20W-ITEM4-DEFAULT-5Y',
            'AU-PRIVACY-ACT-1988-S20W-ITEM1-LIABILITY-2Y',
            'FCRA-605A-5-US-NATIONAL-7Y',
            'CA-NS-CRA-S10-3-C-LIMB-1'],
          withheld_check_ids: [],
          recorded_but_not_executed_check_ids: [],
          regions: ['CA-NS'].concat(us.regions_with_a_working_assessment || [],
            (family.real_evidence && !family.real_evidence.skipped) ? ['AU-ACT', 'AU-NSW', 'AU-NT', 'AU-QLD', 'AU-SA', 'AU-TAS', 'AU-VIC', 'AU-WA'] : [])
        },
        report_fact_consistency: {
          check_ids: ['CA-FACT-SUMMARY-COUNT-VS-ITEMS', 'CA-FACT-ITEM-DATE-AFTER-REPORT-DATE',
            'CA-FACT-DATE-ORDER-WITHIN-RECORD', 'CA-FACT-SAME-DEBT-PRINTED-VALUE-CONFLICT',
            'GB-FACT-ITEM-DATE-AFTER-REPORT-DATE', 'GB-FACT-DATE-ORDER-WITHIN-ITEM'],
          regions: Object.keys(caFacts.regions || {}).concat(Object.keys(gbFormat.regions || {})).sort()
        },
        printed_policy_observations: {
          check_ids: ['GB-PRINTED-RETENTION-POLICY-ON-ITEM'],
          regions: Object.keys(gbFormat.regions || {}).sort(),
          label: 'PRINTED_POLICY_OBSERVATION_NOT_A_STATUTORY_FINDING'
        },
        statutory_checks_named_by_a_factual_check: 0
      },
      local_ocr: us.local_ocr || null,
      regions_with_a_working_assessment: Object.keys(regionSupport).filter((r) => regionSupport[r].working_assessment).sort(),
      executable_check_ids: ['AU-PRIVACY-ACT-1988-S20W-ITEM4-DEFAULT-5Y',
        'AU-PRIVACY-ACT-1988-S20W-ITEM1-LIABILITY-2Y',
        'FCRA-605A-5-US-NATIONAL-7Y',
        'CA-NS-CRA-S10-3-C-LIMB-1'],
      executable_check_ids_withheld: [],
      recorded_but_not_executed_check_ids: [],
      applicability_states: applicabilityStates.states || null,
      applicability_states_rule_ids: applicabilityStates.rule_ids || null,
      response_drafts_available: 0,
      demonstration_mode_counts_as_report_support: false,
      jurisdictions_launch_ready: 0,
      regions: regionSupport
    },
    infrastructure: {
      state: infrastructure.infrastructure_state || null,
      regions_exercised: infrastructure.regions_exercised ? infrastructure.regions_exercised.length : 0,
      upload_paths: infrastructure.upload_paths || null,
      regions: infrastructure.regions || {}
    },
    real_evidence: {
      au_format_family: family.real_evidence || null,
      au_journey: au.skipped === false ? {
        artifact: au.evidenced_artifact_id,
        checks_performed_on_the_sample: au.checks_performed_on_the_sample,
        records_read: au.records_read
      } : { skipped: true, reason: au.reason },
      us_consumer_format: us.real_evidence || null,
      us_journey: us.checks_performed_on_the_sample === undefined ? null : {
        artifact: us.evidenced_artifact_id,
        executed_comparisons_on_the_sample: us.checks_performed_on_the_sample,
        not_applicable_limbs: us.not_applicable_limbs || null,
        applicability_unresolved_limbs: us.applicability_unresolved_limbs || null,
        records_read: us.records_read || null
      },
      record_applicability_states: applicabilityStates.states || null,
      ca_ns_specimen: specimen,
      ca_factual_assessment: caFacts.skipped === false ? {
        presentation_id: caFacts.presentation_id,
        artifact: 'the digest-pinned Equifax Canada consumer specimen',
        categories_compared: caFacts.real_evidence.categories_compared,
        collection_entries: caFacts.real_evidence.collection_entries,
        identity_groups_matched_on_printed_identifiers: caFacts.real_evidence.identity_groups,
        regions: Object.keys(caFacts.regions || {}).sort(),
        regions_with_no_statutory_limb: caFacts.regions_with_no_statutory_evaluation_but_a_real_factual_assessment,
        ca_ns_statutory_evaluation: caFacts.ca_ns_statutory_evaluation
      } : { skipped: true, reason: caFacts.reason },
      gb_consumer_format: gbFormat.skipped === false ? {
        presentation_id: gbFormat.presentation_id,
        artifact: gbFormat.evidenced_artifact_id,
        artifact_sha256: gbFormat.evidenced_sha256,
        admission_predicates: (gbFormat.admissions || {}).predicates,
        records_read: gbFormat.real_evidence.records_read,
        records_by_kind: gbFormat.real_evidence.records_by_kind,
        printed_retention_statements: gbFormat.real_evidence.printed_retention_statements,
        differences_found: gbFormat.real_evidence.differences_found,
        no_difference_found: gbFormat.real_evidence.no_difference_found,
        artifact_vintage: gbFormat.real_evidence.artifact_vintage,
        regions: Object.keys(gbFormat.regions || {}).sort()
      } : { skipped: true, reason: gbFormat.reason },
      ca_factual_synthetic: caFacts.synthetic || null,
      gb_policy_synthetic: gbFormat.synthetic || null
    },
    sections: sectionReports,
    limits: [
      'This batch does not make any of the 82 jurisdictions launch ready.',
      'Applicability is not execution: a region may carry a confirmed relation and still execute no comparison.',
      'The British material is recorded as guidance, not as a statute, so no adapter is bound to any GB region.',
      'The United States consumer disclosure IS admitted now, by an evidenced structural contract, and one federal limb executes against the captured official sample. The four other federal limbs and the four exact-region state limbs report an APPLICABILITY state rather than a comparison.',
      'A limb reported NOT_APPLICABLE or APPLICABILITY_UNRESOLVED is NOT a performed check and is counted as nothing.',
      'The United States artifact is an educational sample with no native text; its readings come from authorized LOCAL OCR and carry their own confidence and their own preserved unresolved readings.',
      'The Australian family is evidenced from one captured public sample; that sample proves its structure, not every current file.',
      'The recorded Australian limb (Privacy Act 1988 (Cth) s. 20W item 1, consumer credit liability information) is BOUND. The captured sample prints no closed liability record, so it resolves as NOT_APPLICABLE on one record and APPLICABILITY_UNRESOLVED on two; the APPLICABLE branch is exercised only on synthetic input, which establishes no real closed-account presentation evidence.',
      'A synthetic demonstration exercises the interface; it evidences no report format and counts as nothing.',
      'Canada: all thirteen canonical selections retain factual report checks and the shared common-error checklist. Province-specific statute support is optional and limited to active checklist-related adapters.',
      'Canada: no PIPEDA provision and no national applicability relation is named, invented or implied by the factual checks. The unresolved country-wide PIPEDA record remains unresolved and does not block the factual assessment.',
      'Canada: a factual check compares two things the presentation prints. It draws no conclusion from a difference it finds, and a difference is not a finding.',
      'The United Kingdom family is evidenced by structure from ONE captured official consumer report example, dated 1 June 2007 and marked on its own face as fictitious. It therefore evidences STRUCTURE ONLY: its currency for present-day GB consumer files is NOT established, it evidences one bureau only, and that vintage is a named remaining blocker.',
      'The United Kingdom policy observation compares a retention statement the report PRINTS about its own class of entry with the date that entry prints. It is labelled PRINTED_POLICY_OBSERVATION_NOT_A_STATUTORY_FINDING everywhere it appears, it names no statute, and the recorded GB relation still binds no adapter and still executes nothing.',
      'Issue-specific definite correction and probable/potential verification packets are implemented; no third-party transmission is performed.'
    ]
  };
  fs.writeFileSync(path.join(OUT_DIR, 'b3-evidence.json'), `${JSON.stringify(b3, null, 2)}\n`, 'utf8');

  /* ------------------------------------------------------------------ B4 evidence */
  /* B4 writes its OWN file as well. Neither earlier artifact is rewritten, so each batch's evidence stays
     separately identifiable and no historical package is regenerated. */
  const entitlementEvidence = evidenceOf('t-entitlement') || {};
  const hardeningEvidence = evidenceOf('u-hardening') || {};
  const presentationEvidence = evidenceOf('v-presentation-and-release') || {};
  const releaseCheck = require('../release-check.cjs').runReleaseCheck({ write: false });

  const b4 = {
    execution, capabilities,
    owner_order: 'OWNER-ALL82-001',
    batch: 'B4',
    plan: 'CRP_IMMUTABLE_ALL_82_WIZARD_BUILD_PLAN.md',
    service_stack: evidence.service_stack,
    totals,
    acceptance: {
      '1_unpaid_user_cannot_bypass_through_direct_requests_client_flags_or_redirects': clean('t-entitlement'),
      '2_persistent_entitlement_activated_expired_cancelled_with_duplicate_and_replay_settled': clean('t-entitlement'),
      '3_provider_neutral_interface_and_test_adapter_no_unauthorized_provider_engaged': clean('t-entitlement'),
      '4_sessions_storage_upload_limits_concurrency_account_isolation_deletion_and_restart': clean('u-hardening'),
      '5_retention_and_deletion_defined_and_no_report_or_identifier_in_logs_or_public_assets': clean('u-hardening') && clean('g-privacy'),
      '6_supported_countries_bureaus_formats_checks_and_limitations_before_payment_and_upload': clean('v-presentation-and-release'),
      '7_factual_policy_and_statutory_checks_kept_apart_and_no_issue_found_defined': clean('v-presentation-and-release'),
      '8_ineligible_results_kept_out_of_drafts_and_demonstration_downloads_fictional': clean('v-presentation-and-release'),
      '9_deployment_configuration_and_release_checks_prepared_locally_not_deployed': clean('v-presentation-and-release'),
      '10_presentation_gaps_closed_or_bounded_canada_family_and_gb_currency': clean('v-presentation-and-release'),
      '11_existing_all82_assessment_extraction_and_adapter_regressions_unchanged': clean('n-applicability') && clean('o-all82-infrastructure') && clean('r-ca-factual-assessment') && clean('s-gb-consumer-format')
    },
    entitlement: {
      enforcement: 'server-side, on the paid actions only; reading, case status and DELETION are never gated',
      refusal: entitlementEvidence.entitlement_refusal || null,
      activation: entitlementEvidence.activation || null,
      expiry_and_cancellation: entitlementEvidence.expiry_and_cancellation || null,
      failed_verification: entitlementEvidence.failed_verification || null,
      legacy_parity: entitlementEvidence.legacy_parity || null,
      is_a_working_payment: false
    },
    hardening: {
      sessions: hardeningEvidence.sessions || null,
      concurrency: hardeningEvidence.concurrency || null,
      upload_limits: hardeningEvidence.upload_limits || null,
      restart_recovery: hardeningEvidence.restart_recovery || null,
      single_writer: hardeningEvidence.single_writer || null,
      retention: hardeningEvidence.retention || null
    },
    presentation: {
      canada: presentationEvidence.canada || null,
      united_kingdom: presentationEvidence.gb || null,
      messaging: presentationEvidence.messaging || null,
      draft_boundary: presentationEvidence.draft_boundary || null
    },
    release: {
      check_state: releaseCheck.state,
      launch_ready: releaseCheck.launch_ready,
      launch_blocking_failures: releaseCheck.launch_blocking_failures,
      checks_run: releaseCheck.checks.length,
      deployment_performed: false,
      network_calls_made: 0,
      next_release_action: releaseCheck.next_release_action
    },
    sections: sectionReports
  };
  fs.writeFileSync(path.join(OUT_DIR, 'b4-evidence.json'), `${JSON.stringify(b4, null, 2)}\n`, 'utf8');

  /* ------------------------------------------------------------------ FDT evidence (BLOCKER-FDT-001) */
  const fdtAcceptance = require('../fdt-acceptance.cjs');
  const clarificationMod = require('../clarification.cjs');
  const reportUseMod = require('../../adapters/report-use.cjs');
  const fdtSection = byId.get('am-fdt-recovery');
  const commonErrorsSection = byId.get('al-common-errors');
  const ownerCommonErrorsSection = byId.get('ct-owner-common-error-scope');
  const reportUseSection = byId.get('bg-report-use');

  /* Historical proof remains input only to the historical clarification record below;
     it is never promoted to current FDT recovery evidence. */
  let deployedEvidence = null;
  try { deployedEvidence = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', 'SOURCE_CAPTURES', 'ACCEPT-009', 'fdt-recovery-download-evidence.json'), 'utf8')); } catch (_) { deployedEvidence = null; }
  const servedFile = path.join(OUT_DIR, 'fdt-served-recovery-evidence.json');
  let served = null;
  try { served = JSON.parse(fs.readFileSync(servedFile, 'utf8')); } catch (_) { /* hosted proof stays pending */ }
  const fdtEvidence = fdtAcceptance.buildEvidence({ execution,
    regressionFile: path.join(OUT_DIR, 'current-regression-evidence.json'), served, servedFile: served ? servedFile : null });
  fs.writeFileSync(path.join(OUT_DIR, 'fdt-mitigation-evidence.json'), `${JSON.stringify(fdtEvidence, null, 2)}\n`, 'utf8');

  /* ------------------------------------------------------------------ clarify evidence (BLOCKER-CLARIFY-001) */
  const clarifyEvidence = {
    passed: Boolean(fdtSection) && fdtSection.failed === 0,
    max_questions: clarificationMod.MAX_QUESTIONS,
    questions: clarificationMod.QUESTIONS,
    report_use_question: reportUseMod.question(),
    identity: { build_id: deployedEvidence ? deployedEvidence.build_id : (process.env.CRP_BUILD_ID || 'crp-wizard-4937bfc4be6aabd1'), deployment: 'staging' },
    behavior: {
      at_most_two_questions: clarificationMod.MAX_QUESTIONS === 2,
      has_dont_know: clarificationMod.QUESTIONS.every((q) => q.has_dont_know),
      has_skip: clarificationMod.QUESTIONS.every((q) => q.has_skip),
      stored_separately: 'answers persist on the result row with source CONSUMER_STATEMENT, never merged into report facts',
      skip_does_not_interrupt: 'the clarify HTTP journey test verifies a skipped answer leaves the independent checks intact',
      no_escalation: 'no finding is escalated solely because an answer was supplied',
      report_use_material: 'the governed report-use question names the assessed report and negates an exempted use; it does not unlock a violation; unknown/skip/contradictory/multiple-use/mismatched stay unresolved'
    },
    tests: [
      { id: 'am-fdt-recovery', passed: Boolean(fdtSection) && fdtSection.failed === 0 },
      { id: 'bg-report-use', passed: Boolean(reportUseSection) && reportUseSection.failed === 0 }
    ]
  };
  fs.writeFileSync(path.join(OUT_DIR, 'clarify-evidence.json'), `${JSON.stringify(clarifyEvidence, null, 2)}\n`, 'utf8');

  /* ------------------------------------------------------------------ common-errors evidence (BLOCKER-COMMON-ERRORS-001) */
  const commonErrorsEvidence = {
    passed: false,
    identity: { build_id: deployedEvidence ? deployedEvidence.build_id : (process.env.CRP_BUILD_ID || 'crp-wizard-4937bfc4be6aabd1'), deployment: 'staging' },
    behavior: {
      implemented: [
        'account-dates-contradictory',
        'status-date-contradiction',
        'balance-payment-inconsistency',
        'payment-history-inconsistency (same-period contradiction only)',
        'payment-history grid assembly (positioned headings/cells/legend, native + OCR)',
        'responsibility-inconsistency (same-snapshot + corroborated only)',
        'identity-review (report-internal name/address/alias/co-applicant, roles preserved, qualified review only)',
        'duplicate-reporting (identity + additional compatible fact)',
        'similar-entries-worth-reviewing',
        'reported-dates-out-of-order',
        'owned-same-bureau-fixed-obligation-first-delinquency-anchor-change',
        'paid-or-settled-status-with-past-due',
        'last-payment-or-first-delinquency-date-conflict',
        'linked-original-and-collection-both-due',
        'owner-list-of-19-across-82-jurisdictions-with-out-of-checklist-statutory-checks-retired'
      ],
      distinct_amounts_extracted: ['account.balance', 'account.pastDueAmount', 'account.paymentAmount', 'account.creditLimit', 'account.currency'],
      payment_history: 'printed grid with periods, a code->meaning legend and raw cells; blank cells and unlisted codes are never guessed',
      responsibility: 'printed individual/joint/authorized-user responsibility, preserved as distinct roles, never identity theft'
    },
    remaining: {
      re_aging: 'The owned same-bureau fixed-obligation first-delinquency mapping is supported. Readers without corroborated identity, sourced anchors or report dates remain explicit gaps. Ordinary later delinquency does not establish re-aging or its absence.',
      responsibility_image_or_ocr: 'no deployed image/OCR demonstration of the responsibility check (payment-history grid is demonstrated via native and OCR positions)',
      real_browser_clarification: 'no real-browser demonstration of the consumer clarification interface (node:vm only; endpoint responses are not browser usability evidence)'
    },
    tests: [
      { id: 'al-common-errors', passed: Boolean(commonErrorsSection) && commonErrorsSection.failed === 0 },
      { id: 'ct-owner-common-error-scope', passed: Boolean(ownerCommonErrorsSection) && ownerCommonErrorsSection.failed === 0 },
      ...['cy-common-error-predicate-repairs', 'cz-common-error-packet-repairs',
        'da-common-error-reader-repairs', 'db-common-error-surface-repairs',
        'dc-consumer-violation-term', 'de-tu-ca-common-error-sources', 'df-us-common-error-reader', 'dg-owned-reaging',
        'dh-ca-reader-completion', 'di-au-reader-completion', 'dj-gb-reader-completion',
        'dk-reader-completion-integration', 'dl-general-caption-sources', 'dm-au-role-packet-evidence',
        'dn-us-dated-history', 'do-gb-history-definitions', 'dp-us-cell-recovery',
        'dq-ca-printed-account-fields', 'dr-reader-evidence-delivery',
        'ds-column-caption-fields', 'dt-rating-history-rows', 'du-column-reader-delivery', 'dv-au-reference-delivery',
        'dw-us-history-completion', 'dx-report-date-custody', 'dy-reader-date-delivery'].map((id) => ({ id, passed: clean(id) }))
    ]
  };
  fs.writeFileSync(path.join(OUT_DIR, 'common-errors-evidence.json'), `${JSON.stringify(commonErrorsEvidence, null, 2)}\n`, 'utf8');

  /* OWNER-PACKET-CORRESPONDENCE-001: a successful full regression restores its own implementation evidence; a
     failed run leaves it alone, so nothing here can claim a pass the run did not demonstrate. */
  const restored = totals.failed === 0 ? restoreImplementationEvidence() : [];
  if (totals.failed !== 0) {
    process.stdout.write('implementation evidence NOT restored: this run failed, so no closure record was re-applied\n');
  } else {
    const okCount = restored.filter((r) => r.applied).length;
    process.stdout.write(`implementation evidence re-applied from this run: ${okCount}/${restored.length} closure records\n`);
  }


  process.stdout.write(`\n${'-'.repeat(78)}\n`);
  for (const report of sectionReports) {
    const status = report.failed === 0 ? 'PASS' : 'FAIL';
    process.stdout.write(`${status}  ${report.id.padEnd(22)} ${String(report.passed).padStart(3)} passed  ${String(report.failed).padStart(2)} failed  ${String(report.skipped.length).padStart(2)} skipped\n`);
  }
  process.stdout.write(`${'-'.repeat(78)}\n`);
  process.stdout.write(`${totals.failed === 0 ? 'PASS' : 'FAIL'}: ${totals.passed} assertions passed, ${totals.failed} failed, ${totals.skipped} skipped in ${Date.now() - started}ms\n`);
  process.stdout.write(`evidence written to ${path.relative(process.cwd(), path.join(OUT_DIR, 'b2-evidence.json'))}\n`);
  process.stdout.write(`evidence written to ${path.relative(process.cwd(), path.join(OUT_DIR, 'b3-evidence.json'))}\n`);
  process.stdout.write(`evidence written to ${path.relative(process.cwd(), path.join(OUT_DIR, 'b4-evidence.json'))}\n`);
  process.exitCode = totals.failed === 0 ? 0 : 1;
}

main().catch((err) => {
  process.stderr.write(`suite failed to start: ${err && err.stack ? err.stack : err}\n`);
  process.exitCode = 1;
});
