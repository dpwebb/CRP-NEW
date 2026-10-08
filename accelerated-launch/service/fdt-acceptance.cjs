'use strict';
/**
 * fdt-acceptance.cjs — OWNER-ACCEPT-009 prospective FDT acceptance run.
 * Held-out set and expected facts are FROZEN (recorded independently of extraction). Extraction runs through
 * the poppler model, shared format adapter and active checklist issues. Local recovery
 * implementation and current hosted recovery are credited separately.
 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

const { buildPdfDocumentModel } = require('../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');
const { buildPdf } = require('../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');
const formats = require('./formats.cjs');
const evaluation = require('./evaluation.cjs');
const issues = require('./issues.cjs');
const validator = require('./evidence-validator.cjs');
const { MAX_RECOVERY_PASSES, MAX_RECOVERY_PAGES } = require('./fdt-recovery.cjs');
const { PROSPECTIVE_CRITERIA } = require('./fdt-benchmark.cjs');

const HOSTED_CRITERIA = ['demonstrate_useful_recovery_on_deployed', 'demonstrate_bounded_unsuccessful_recovery_on_deployed'];
const REQUIRED_CRITERIA = Object.freeze(Object.keys(PROSPECTIVE_CRITERIA).filter(key => key !== 'note').concat('benchmark'));
const LOCAL_CRITERIA = Object.freeze(REQUIRED_CRITERIA.filter(key => !HOSTED_CRITERIA.includes(key))
  .concat('useful_recovery', 'bounded_unsuccessful_recovery'));
const DEPENDENCY_FILES = Object.freeze(['document-model.cjs', 'constants.cjs', 'runtime-config.cjs', 'synthetic/make-synthetic-pdf.cjs']
  .map(file => 'internal-validation/ca-ns-last-payment-six-year/' + file));

const HELD_OUT = Object.freeze([
  { id: 'native-complete', description: 'complete native-text account', lines: ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor A  Opened 01/15/2018  Closed 01/15/2020'],
    decisive: [ { fact: 'liability.openedDate', value: '2018-01-15', bureau: 'Equifax' }, { fact: 'liability.closedDate', value: '2020-01-15', bureau: 'Equifax' } ] },
  { id: 'equivalent-label', description: 'equivalent labels', lines: ['TransUnion  Consumer Credit Report', 'Report Date: June 12, 2026', 'Lender B  Date Opened 03/03/2019  Date Closed 03/03/2021'],
    decisive: [ { fact: 'liability.openedDate', value: '2019-03-03', bureau: 'TransUnion' }, { fact: 'liability.closedDate', value: '2021-03-03', bureau: 'TransUnion' } ] },
  { id: 'lookalike-two-debts', description: 'two debts sharing dates not collapsed', lines: ['Experian  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor C  Opened 01/01/2020  Closed 01/01/2022', 'Creditor D  Opened 01/01/2020  Closed 01/01/2022'],
    expect_records: 2,
    decisive: [ { fact: 'liability.openedDate', value: '2020-01-01', bureau: 'Experian', record_index: 1 }, { fact: 'liability.closedDate', value: '2022-01-01', bureau: 'Experian', record_index: 1 },
      { fact: 'liability.openedDate', value: '2020-01-01', bureau: 'Experian', record_index: 2 }, { fact: 'liability.closedDate', value: '2022-01-01', bureau: 'Experian', record_index: 2 } ] },
  { id: 'ambiguous-date', description: 'ambiguous date withheld', lines: ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor E  Opened 05/06/2019'], decisive: [], expect_withheld: ['liability.openedDate'] },
  { id: 'bureau-attribution', description: 'combined report bureau attribution', lines: ['Experian  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor G  Opened 02/02/2018', 'Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor H  Opened 03/03/2018'],
    decisive: [ { fact: 'liability.openedDate', value: '2018-02-02', bureau: 'Experian' }, { fact: 'liability.openedDate', value: '2018-03-03', bureau: 'Equifax' } ] },
  { id: 'contradictory-dates', description: 'source-linked opened-after-closed breach is an allowed checklist violation', lines: ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor F  Opened February 1, 2020  Closed January 1, 2019'],
    expected_violations: [{ check_id: 'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY', record_index: 1, classification: 'PROBABLE_VIOLATION' }],
    decisive: [ { fact: 'liability.openedDate', value: '2020-02-01', bureau: 'Equifax' }, { fact: 'liability.closedDate', value: '2019-01-01', bureau: 'Equifax' } ] }
]);

function freezeDigest() {
  return crypto.createHash('sha256').update(JSON.stringify(HELD_OUT)).digest('hex');
}

function measureViolations(expected, offered) {
  const remaining = [...(expected || [])];
  let unsupported = 0;
  for (const issue of (offered || []).filter(row => row.classification)) {
    const facts = issue.rule_assessment?.required_facts || [];
    const indices = [...new Set([issue.record_index,
      ...facts.map(row => row.source?.record_index)])];
    const match = remaining.findIndex(row => row.check_id === issue.check_id
      && row.classification === issue.classification && issue.eligible === true && facts.length > 0
      && facts.every(fact => fact.source?.location) && indices.length === 1 && indices[0] === row.record_index);
    if (match < 0) unsupported += 1;
    else remaining.splice(match, 1);
  }
  return { unsupported, missing: remaining.length };
}

function runLocal() {
  const root = path.resolve(__dirname, '../..');
  const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
  const source_files = DEPENDENCY_FILES.map(file => ({ file, sha256: hash(file) }));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'crp-fdt-accept-'));
  const cases = [], frozen = freezeDigest();
  let expected_decisive = 0, recovered = 0, incorrect = 0, borrowed = 0, unsupported_findings = 0;
  let record_collapse_errors = 0, withheld_errors = 0, missing_expected_violations = 0;
  try {
    for (const c of HELD_OUT) {
      const pdf = buildPdf({ pages: [{ lines: c.lines }] });
      const file = path.join(tmp, `${c.id}.pdf`);
      fs.writeFileSync(file, pdf);
      const model = buildPdfDocumentModel(file);
      const extraction = formats.extractWithSharedAdapter(model, { mode: 'REPORT', country: 'US' });
      const records = Array.isArray(extraction.records) ? extraction.records : [];
      let ci = 0, cb = 0, cr = 0;
      const misses = [];
      let rec_err = 0, with_err = 0;
      for (const exp of c.decisive) {
        expected_decisive += 1;
        const matches = records.filter((r) => (exp.record_index == null || r.record_index === exp.record_index)
          && (r.facts || {})[exp.fact] !== undefined);
        const valueMatch = matches.find((r) => (r.facts || {})[exp.fact] === exp.value);
        if (!valueMatch) {
          if (matches.length) ci += 1;
          misses.push({ ...exp, reason: matches.length ? 'INCORRECT_READING' : 'NOT_READ' });
          continue;
        }
        if (exp.bureau && valueMatch.bureau !== exp.bureau) { cb += 1; misses.push({ ...exp, reason: 'WRONG_BUREAU' }); continue; }
        cr += 1;
      }
      if (c.expect_records && records.length !== c.expect_records) { rec_err = 1; record_collapse_errors += 1; }
      for (const wf of (c.expect_withheld || [])) {
        if (records.some((r) => (r.facts || {})[wf] !== undefined)) { with_err += 1; withheld_errors += 1; }
      }
      const ev = evaluation.evaluateCase({ country: 'US', region: 'US-NY', extraction });
      const findings = issues.issuesFor({ extraction, evaluation: ev }).filter(row => row.classification);
      const violations = measureViolations(c.expected_violations, findings);
      unsupported_findings += violations.unsupported;
      missing_expected_violations += violations.missing;
      incorrect += ci; borrowed += cb; recovered += cr;
      cases.push({ id: c.id, decisive_expected: c.decisive.length, recovered: cr, incorrect: ci, borrowed: cb, records: records.length,
        misses,
        findings: findings.map(row => ({ check_id: row.check_id, classification: row.classification,
          record_indices: [...new Set([row.record_index,
            ...(row.rule_assessment?.required_facts || []).map(fact => fact.source?.record_index)])] })),
        unsupported_findings: violations.unsupported, missing_expected_violations: violations.missing,
        record_collapse_error: rec_err, withheld_error: with_err });
    }
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  const recovery_rate = expected_decisive ? recovered / expected_decisive : 1;
  return { expected_decisive, recovered, incorrect, borrowed, unsupported_findings, missing_expected_violations,
    recovery_rate, record_collapse_errors, withheld_errors, cases, freeze_digest: frozen, freeze_unchanged: frozen === freezeDigest(),
    source_files, source_unchanged: source_files.every(row => hash(row.file) === row.sha256) };
}

function runAcceptance() {
  const local = runLocal();
  let deployed = null;
  try { deployed = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'SOURCE_CAPTURES', 'ACCEPT-009', 'fdt-recovery-download-evidence.json'), 'utf8')); } catch (_) { deployed = null; }
  const p = PROSPECTIVE_CRITERIA;
  const zero_incorrect = local.incorrect === 0;
  const zero_borrowing = local.borrowed === 0;
  const zero_unsupported = local.unsupported_findings === 0;
  const zero_collapse = local.record_collapse_errors === 0;
  const zero_withheld_err = local.withheld_errors === 0;
  const min_recovery = local.recovery_rate >= p.min_recovery_of_readable_assessment_required_facts;
  const implementation_passed = zero_incorrect && zero_borrowing && zero_unsupported && zero_collapse
    && zero_withheld_err && min_recovery && local.missing_expected_violations === 0 && local.freeze_unchanged && local.source_unchanged;
  return {
    passed: false, implementation_passed, criteria: p, freeze_digest: local.freeze_digest,
    freeze_unchanged: local.freeze_unchanged,
    source_files: local.source_files, source_unchanged: local.source_unchanged,
    document_count: HELD_OUT.length, page_count: HELD_OUT.length,
    expected_decisive_fact_denominator: local.expected_decisive,
    recovered: local.recovered, incorrect_decisive_facts: local.incorrect,
    cross_record_or_bureau_borrowing: local.borrowed, unsupported_violations: local.unsupported_findings,
    record_collapse_errors: local.record_collapse_errors, withhold_errors: local.withheld_errors,
    missing_expected_violations: local.missing_expected_violations,
    recovery_rate: Number(local.recovery_rate.toFixed(4)),
    every_miss_accounted: local.cases.every(row => row.decisive_expected === row.recovered + row.misses.length), per_case: local.cases,
    historical_hosted: { build_id: deployed ? deployed.build_id : null,
      purchased_download_status: deployed && deployed.download ? deployed.download.status : null,
      credited_as_current: false }
  };
}

/* Current hosted proof is supplied separately by the operational driver. Admission or a
 * paid download alone does not establish an attempted, bounded unsuccessful recovery. */
function hostedRecoveryPassed(proof, target) {
  if (!target || proof?.identity?.build_id !== target || proof?.identity?.served_build_id !== target) return false;
  const cases = proof.recovery_cases || [];
  // The created evaluation returns its real result with 201; an owned result read returns 200.
  const measured = row => row.upload_status === 201 && [200, 201].includes(row.result_status)
    && typeof row.case_id === 'string' && /^[a-f0-9]{64}$/i.test(row.input_sha256 || '')
    && Number.isInteger(row.input_page_count) && row.input_page_count > 0 && row.input_page_count <= MAX_RECOVERY_PAGES
    && row.recovery?.bounded === true && row.recovery.substitution_forbidden === true
    && Number.isInteger(row.recovery.recovery_attempts) && row.recovery.recovery_attempts > 0
    && row.recovery.recovery_attempts <= row.input_page_count * MAX_RECOVERY_PASSES;
  const useful = cases.some(row => row.scenario === 'USEFUL' && measured(row)
    && Array.isArray(row.recovery.facts_added) && row.recovery.facts_added.length > 0
    && row.recovery.facts_added.every(fact => Number.isInteger(fact.page) && fact.page > 0 && fact.page <= row.input_page_count
      && Number.isInteger(fact.line) && fact.line > 0 && fact.source === 'LOCAL_OCR'));
  const unsuccessful = cases.some(row => row.scenario === 'UNSUCCESSFUL' && measured(row)
    && Array.isArray(row.recovery.facts_added) && row.recovery.facts_added.length === 0
    && row.reading_limitations?.incomplete === true && row.reading_limitations.never_equates_unread_with_absence === true);
  return useful && unsuccessful;
}

function validateEvidence(evidence, options = {}) {
  const implementation = validator.validateImplementationEvidence(evidence, { ...options, requiredCriteria: LOCAL_CRITERIA });
  const root = options.sourceRoot || path.resolve(__dirname, '../..');
  let custody = false;
  try {
    const refs = evidence.implementation.evidence_refs;
    if (refs.length === 1) {
      const regressionFile = path.resolve(root, refs[0].file);
      const execution = JSON.parse(fs.readFileSync(regressionFile, 'utf8'));
      const derived = buildEvidence({ execution, regressionFile, sourceRoot: root });
      custody = derived.implementation.configured && ['acceptance', 'benchmark'].every(key =>
        JSON.stringify(evidence[key]) === JSON.stringify(derived[key]))
        && ['tests', 'source_files', 'evidence_refs'].every(key =>
          JSON.stringify(evidence.implementation[key]) === JSON.stringify(derived.implementation[key]));
    }
  } catch (_) { /* missing, partial, changed or inconsistent full proof never earns closure */ }
  const localPassed = implementation.passed && custody;
  const staging = validator.validateCapabilityEvidence(evidence, { ...options, requiredCriteria: REQUIRED_CRITERIA });
  const measured = hostedRecoveryPassed(evidence?.served_recovery, options.targetBuildId);
  const pending = evidence?.staging_verification?.status === 'PENDING';
  const passed = localPassed && staging.passed && measured && !pending;
  return { passed, implementation_status: localPassed ? 'IMPLEMENTED_AND_TESTED' : 'OPEN',
    implementation_detail: [implementation.detail, !custody && 'complete current local execution and matching evidence metadata are required'].filter(Boolean).join('; '),
    staging_status: passed ? 'VERIFIED_ON_STAGING' : 'PENDING_VERIFICATION',
    detail: passed ? staging.detail : (pending ? evidence.staging_verification.reason :
      [staging.detail, !measured && 'current response-backed useful and bounded unsuccessful recovery proof is required'].filter(Boolean).join('; ')) };
}

function currentInventory(root = path.resolve(__dirname, '../..')) {
  const runner = fs.readFileSync(path.join(root, 'accelerated-launch/service/tests/run-tests.cjs'), 'utf8');
  const block = /const SECTION_FILES = \[([\s\S]*?)\];/.exec(runner)?.[1];
  const sectionFiles = [...(block || '').matchAll(/^\s*'([a-z0-9-]+\.cjs)'\s*[,\]]?/gm)].map(match => match[1]);
  const sources = [];
  function collect(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (['out', 'node_modules'].includes(entry.name)) continue;
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) collect(file);
      else if (/\.(cjs|js|json|html|css)$/.test(entry.name)) sources.push(path.relative(root, file).replace(/\\/g, '/'));
    }
  }
  collect(path.join(root, 'accelerated-launch/service'));
  collect(path.join(root, 'accelerated-launch/adapters'));
  return { sectionFiles, sources };
}

function buildEvidence({ execution, regressionFile, sourceRoot = path.resolve(__dirname, '../..'), served = null, servedFile = null }) {
  const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  const section = execution?.sections?.find(row => row.id === 'am-fdt-recovery');
  const acceptance = section?.evidence?.acceptance;
  const benchmark = section?.evidence?.benchmark_full;
  const recovery = section?.evidence?.local_recovery;
  const acceptedMetrics = Number.isFinite(acceptance?.recovery_rate) && acceptance.recovery_rate >= 0.95 && acceptance.recovery_rate <= 1
    && acceptance.incorrect_decisive_facts === 0 && acceptance.cross_record_or_bureau_borrowing === 0
    && acceptance.unsupported_violations === 0 && acceptance.missing_expected_violations === 0
    && acceptance.every_miss_accounted === true && acceptance.freeze_unchanged === true && acceptance.source_unchanged === true
    && Number.isFinite(benchmark?.metrics?.missed_fact_rate) && benchmark.metrics.missed_fact_rate >= 0
    && benchmark.metrics.missed_fact_rate <= 0.05 && benchmark.metrics.incorrect_reading_rate === 0;
  const complete = execution?.mode === 'FULL_CURRENT_PRODUCT' && execution.totals?.failed === 0
    && execution.totals?.skipped === 0 && execution.unrun_sections?.length === 0 && execution.source_drift?.length === 0
    && execution.sections?.every(row => row.completed === true && row.failed === 0 && row.skipped?.length === 0)
    && new Set(execution.selected_sections).size === execution.sections.length
    && execution.sections.every(row => execution.selected_sections.includes(row.id))
    && section?.passed > 0 && acceptance?.implementation_passed === true && acceptedMetrics && benchmark?.passed === true
    && recovery?.useful_facts > 0 && recovery?.useful_attempts === 1 && recovery?.unsuccessful_facts === 0
    && recovery?.unsuccessful_attempts === 1 && recovery?.pass_limit === 1;
  let sourceMatches = false, refs = [];
  try {
    const inventory = currentInventory(sourceRoot);
    const sameSet = (actual, expected) => actual.length === expected.length && new Set(actual).size === expected.length
      && expected.every(value => actual.includes(value));
    const totals = execution.sections.reduce((sum, row) => ({ passed: sum.passed + row.passed,
      failed: sum.failed + row.failed, skipped: sum.skipped + row.skipped.length }), { passed: 0, failed: 0, skipped: 0 });
    sourceMatches = inventory.sectionFiles.length > 0
      && sameSet(execution.sections.map(row => row.file), inventory.sectionFiles)
      && sameSet(execution.source_hashes.map(row => row.file.replace(/\\/g, '/')), inventory.sources)
      && sameSet((acceptance?.source_files || []).map(row => row.file), DEPENDENCY_FILES)
      && JSON.stringify(totals) === JSON.stringify(execution.totals) && totals.passed > 0
      && [...execution.source_hashes, ...(acceptance?.source_files || [])].every(entry => {
      const file = path.resolve(sourceRoot, entry.file);
      return file.startsWith(path.resolve(sourceRoot) + path.sep) && sha(file) === entry.sha256;
    }) && JSON.stringify(JSON.parse(fs.readFileSync(regressionFile, 'utf8'))) === JSON.stringify(execution);
    refs = [{ file: path.relative(sourceRoot, regressionFile), sha256: sha(regressionFile) }];
  } catch (_) { sourceMatches = false; }
  const configured = Boolean(complete && sourceMatches);
  const target = process.env.CRP_BUILD_ID || null;
  let servedMatches = false;
  try { servedMatches = Boolean(servedFile) && JSON.stringify(JSON.parse(fs.readFileSync(servedFile, 'utf8'))) === JSON.stringify(served); }
  catch (_) { /* missing or different operational proof stays pending */ }
  const hosted = Boolean(configured && servedMatches && hostedRecoveryPassed(served, target));
  const localTests = [{ id: 'am-fdt-recovery', passed: configured, criteria: LOCAL_CRITERIA,
    expected: 'source-bound native acceptance, active checklist positive/benign controls, withholding, useful and bounded unsuccessful recovery',
    measured: `${section?.passed || 0} assertions; ${acceptance?.recovered || 0}/${acceptance?.expected_decisive_fact_denominator || 0} own decisive facts; ${acceptance?.unsupported_violations ?? 'unmeasured'} unexpected violations` }];
  const reason = 'Current hosted useful and bounded unsuccessful recovery responses are pending; local implementation proof does not establish staging or paid-packet acceptance.';
  const evidence = {
    passed: hosted, identity: { build_id: target, served_build_id: hosted ? target : null, local_only: !hosted },
    implementation: { configured, scope: 'CURRENT_SOURCE_BOUNDED_RECOVERY', tests: localTests,
      source_files: [...(execution?.source_hashes || []), ...(acceptance?.source_files || [])], evidence_refs: refs },
    staging_verification: { status: hosted ? 'VERIFIED' : 'PENDING', reason: hosted ? 'Current response-backed recovery cases measured.' : reason },
    acceptance: acceptance || {}, benchmark: benchmark ? { ...benchmark.metrics, baseline: benchmark.baseline } : {},
    served_recovery: hosted ? served : null,
    criteria: Object.fromEntries(REQUIRED_CRITERIA.map(key => [key, {
      passed: HOSTED_CRITERIA.includes(key) ? hosted : configured,
      expected: key === 'benchmark' ? 'fixed recovery and incorrect-reading thresholds' : String(PROSPECTIVE_CRITERIA[key]),
      measured: HOSTED_CRITERIA.includes(key) ? (hosted ? 'Current HTTP recovery responses recorded.' : reason) : localTests[0].measured,
      evidence_refs: hosted ? [servedFile] : []
    }])), tests: localTests,
    reason: configured ? 'Current local acceptance and recovery behavior passed; hosted proof is tracked separately.' : 'Complete unchanged-source current product proof is required.'
  };
  return evidence;
}

module.exports = { runAcceptance, runLocal, measureViolations, HELD_OUT, freezeDigest,
  LOCAL_CRITERIA, REQUIRED_CRITERIA, hostedRecoveryPassed, validateEvidence, buildEvidence, currentInventory };

