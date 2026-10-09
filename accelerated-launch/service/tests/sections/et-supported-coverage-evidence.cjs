'use strict';

// Controlled evidence-validator fixtures only. These are never release proof and
// never overwrite a real frozen run. Domain outcomes are exercised by the named
// product sections; this section checks that incomplete/stale proof cannot close
// coverage or pretend that local implementation is paid hosted acceptance.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const coverage = require('../../finding-coverage.cjs');
const { currentInventory } = require('../../fdt-acceptance.cjs');
const validator = require('../../evidence-validator.cjs');
const SOURCE_ROOT = path.resolve(__dirname, '../../../..');
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const clone = value => JSON.parse(JSON.stringify(value));
const CRITERIA = ['promise_inventory', 'check_mapping', 'executable_findings', 'material_questions', 'behavioral_coverage', 'end_to_end_journey'];
const NATIVE_IDS = ['ADVERSE-ENTRY-WITHOUT-A-DELINQUENCY-ANCHOR', 'WRITE-OFF-WITHOUT-A-CHARGE-OFF-DATE',
  'CLOSURE-STATED-WITHOUT-A-CLOSED-DATE', 'COLLECTION-ORIGINAL-BOTH-DUE'].map(id => 'COMMON-ERROR-' + id);

function fixture(root) {
  const inventory = currentInventory(SOURCE_ROOT);
  for (const relative of inventory.sources) {
    const target = path.join(root, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(SOURCE_ROOT, relative), target);
  }
  const catalog = require('../../bureau-forms/catalog.json');
  for (const form of catalog.forms) {
    const relative = 'accelerated-launch/service/bureau-forms/' + form.filename;
    fs.copyFileSync(path.join(SOURCE_ROOT, relative), path.join(root, relative));
  }
  // Before serial integration, the root-owned domain section may be absent in
  // this writer's worktree. Its placeholder exists only in this controlled temp
  // fixture, carries no domain proof and cannot be emitted as release evidence.
  const runner = path.join(root, 'accelerated-launch/service/tests/run-tests.cjs');
  const eu = 'eu-general-omission-delivery.cjs';
  if (!inventory.sectionFiles.includes(eu)) {
    const text = fs.readFileSync(runner, 'utf8').replace('const SECTION_FILES = [', "const SECTION_FILES = [\n  '" + eu + "',");
    fs.writeFileSync(runner, text);
    fs.writeFileSync(path.join(root, 'accelerated-launch/service/tests/sections', eu),
      "'use strict'; // SYNTHETIC_EVIDENCE_VALIDATOR_FIXTURE_ONLY\nmodule.exports={id:'eu-general-omission-delivery'};\n");
  }
  const current = currentInventory(root);
  const sections = current.sectionFiles.map(file => ({ file, id: file.slice(0, -4), completed: true, passed: 1,
    failed: 0, skipped: [], failures: [], section_exception: null, evidence: null }));
  const set = (id, evidence) => { sections.find(row => row.id === id).evidence = evidence; };
  set('bx-all82-factual-verification', { regions_tested: 82, download_content_matched: 82,
    case_association_matched: 82, presentations: ['GENERAL-BUREAU-REPORT'] });
  set('cw-common-error-rule-assessment', { ordinary_report_regions: 82, ordinary_report_checks_per_region: 6, statutory_gate: false });
  set('cx-all82-required-report-data', { regions_tested: 82 });
  set('ct-owner-common-error-scope', { checklist: 19, jurisdictions: 82, retired_adapters: 18 });
  set('o-all82-infrastructure', { regions_exercised: coverage.allRegions() });
  set('dg-owned-reaging', { jurisdictions: 82 });
  set('dl-general-caption-sources', { gb_field_contract: { approved_downloads: 4, source_isolation: true,
    regions: ['GB-ENG', 'GB-NIR', 'GB-SCT', 'GB-WLS'] } });
  set('es-filled-packet-business-letter', { owned_actual_pdf_review: true, original_form_approval_digest: true,
    name_parts_not_guessed: true, ordinary_business_letter: true });
  set('eh-packet-report-exhibits', { both_reaging_sources: true, review_and_approval_binding: true,
    selected_issue_sources_only: true, explicit_opt_in: true });
  set('by-packet-reconciliation', { emitted_findings_reconciled: [{ adapter_id: 'FCRA-605A-4-US-NATIONAL-7Y', eligible: true, issues: 1 }] });
  set('ap-accept-010-consistency', { c5_clarification: true });
  set('w-ca-second-bureau-format', { specimens_available: { equifax_ca_pr_01: true, transunion_ca: true, transunion_digest_verified: true } });
  set('p-us-consumer-format', { presentation_id: 'US-CONSUMER-DISCLOSURE', real_evidence: {
    skipped: false, accounts_read: 3, evidenced_artifact_id: 'PUB-001' } });
  set('s-gb-consumer-format', { presentation_id: 'FAM-GB-EXP-CONSUMER', evidenced_artifact_id: 'PUB-009',
    real_evidence: { records_read: 13, artifact_vintage: 'Historical specimen; currency is not established.' } });
  set('l-au-format-family', { real_evidence: { skipped: false, records: 9, digest: 'a'.repeat(64) } });
  set('eu-general-omission-delivery', { exercise_class: 'FICTIONAL_NATIVE_PDF_UPLOAD', checks: NATIVE_IDS.map(check_id => ({ check_id,
    regions_tested: 82, positive: { classification: 'POTENTIAL_VIOLATION', consumer_label: 'VIOLATION', source_linked: true,
      selected: true, approved: true, downloaded: true }, benign: { issues: 0 }, missing_source: { issues: 0 },
    packet: { selected_content_matched: true, unselected_content_absent: true, approved_downloads: 4 } })) });
  return { mode: 'FULL_CURRENT_PRODUCT', selected_sections: sections.map(row => row.id), unrun_sections: [],
    source_drift: [], sections, totals: { passed: sections.length, failed: 0, skipped: 0 },
    source_hashes: current.sources.map(file => ({ file, sha256: digest(fs.readFileSync(path.join(root, file))) })) };
}

async function run(t, check) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'crp-supported-coverage-'));
  try {
    const baseline = fixture(root);
    const regressionFile = path.join(root, 'controlled-execution.json');
    const outputFile = path.join(root, 'controlled-coverage.json');
    const build = execution => {
      fs.writeFileSync(regressionFile, JSON.stringify(execution));
      return coverage.buildEvidence({ execution, regressionFile, sourceRoot: root });
    };
    const accepted = build(baseline);
    check.equal(accepted.implementation.status, 'IMPLEMENTED_AND_TESTED', 'a complete source-bound controlled proof is accepted for supported local scope');
    check.equal(validator.validateImplementationEvidence(accepted, { sourceRoot: root, requiredCriteria: CRITERIA }).passed, true,
      'derived criterion bindings and actual source/evidence hashes satisfy the shared local closure validator');
    check.equal(accepted.passed, false, 'local coverage never becomes a hosted release pass');
    check.equal(accepted.criteria.end_to_end_journey.passed, false, 'latest paid hosted original-form packet remains pending');
    check.equal(validator.validateCapabilityStatus(accepted, { sourceRoot: root, baseDir: root,
      targetBuildId: 'fictional-current-host', requiredCriteria: CRITERIA }).staging_status, 'PENDING_VERIFICATION',
      'local proof cannot satisfy served-build acceptance');
    check.ok(accepted.check_mapping.find(row => row.scope === 'GROUPING_ONLY').boundary.includes('never a second violation')
      && accepted.check_mapping.filter(row => row.scope === 'FACTUAL_REVIEW').every(row => row.boundary.includes('not a classified breach'))
      && accepted.check_mapping.find(row => row.check_id === 'LIMITATION-PERIOD-COURT-CLAIM').boundary.includes('ineligible for packets'),
      'groupings, factual reviews and court information retain their distinct scope');
    check.ok(accepted.supported_family_paths.some(row => row.exercise_classes.includes('DOWNSTREAM_CONTROLLED_STRUCTURAL_MODEL'))
      && accepted.supported_family_paths.find(row => row.presentation_id === 'FAM-GB-EXP-CONSUMER').boundary.includes('Historical'),
      'downstream family and historical UK specimens are not promoted to current full-layout upload proof');

    const section = (execution, id) => execution.sections.find(row => row.id === id);
    const failures = [
      ['focused proof', execution => { execution.mode = 'FOCUSED'; }],
      ['reported failed total', execution => { execution.totals.failed = 1; }],
      ['source drift during run', execution => { execution.source_drift.push('changed.cjs'); }],
      ['unrun section', execution => { execution.unrun_sections.push('a-isolation'); }],
      ['skipped section', execution => { section(execution, 'a-isolation').skipped.push('not measured'); }],
      ['partial section inventory', execution => { execution.sections.pop(); }],
      ['duplicate section identity', execution => { execution.selected_sections[1] = execution.selected_sections[0]; }],
      ['missing tested source hash', execution => { execution.source_hashes.pop(); }],
      ['incorrect tested source hash', execution => { execution.source_hashes[0].sha256 = '0'.repeat(64); }],
      ['unbound evidence arithmetic', execution => { execution.totals.passed += 1; }],
      ['wrong source scope', execution => { execution.source_hashes[0].file = '../outside.cjs'; }],
      ['missing measured native positive section', execution => { section(execution, 'eu-general-omission-delivery').completed = false; }],
      ['82 labels but missing actual downloads', execution => { section(execution, 'bx-all82-factual-verification').evidence.download_content_matched = 81; }],
      ['incorrect regional case identity', execution => { section(execution, 'bx-all82-factual-verification').evidence.case_association_matched = 81; }],
      ['duplicate region replacing a promised region', execution => { const rows = section(execution, 'o-all82-infrastructure').evidence.regions_exercised; rows[1] = rows[0]; }],
      ['mandatory statute gate', execution => { section(execution, 'cw-common-error-rule-assessment').evidence.statutory_gate = true; }],
      ['missing one UK approved packet', execution => { section(execution, 'dl-general-caption-sources').evidence.gb_field_contract.approved_downloads = 3; }],
      ['unreviewed original form', execution => { section(execution, 'es-filled-packet-business-letter').evidence.original_form_approval_digest = false; }],
      ['retired statutory candidate', execution => { section(execution, 'by-packet-reconciliation').evidence.emitted_findings_reconciled[0].adapter_id = 'CA-NS-CRA-S10-3-F-DISMISSED-CHARGE'; }],
      ['unavailable real Canadian family specimen', execution => { section(execution, 'w-ca-second-bureau-format').evidence.specimens_available.transunion_ca = false; }],
      ['unmeasured US sample reader', execution => { section(execution, 'p-us-consumer-format').evidence.real_evidence.accounts_read = 0; }],
      ['missing historical UK source boundary', execution => { delete section(execution, 's-gb-consumer-format').evidence.real_evidence.artifact_vintage; }],
      ['skipped Australian real sample', execution => { section(execution, 'l-au-format-family').evidence.real_evidence.skipped = true; }],
      ['malformed section inventory', execution => { execution.sections = {}; }],
      ['malformed native proof rows', execution => { section(execution, 'eu-general-omission-delivery').evidence.checks = {}; }]
    ];
    for (const [label, change] of failures) {
      const execution = clone(baseline); change(execution);
      check.equal(build(execution).implementation.configured, false, label + ' cannot close supported coverage');
    }
    for (const id of NATIVE_IDS) {
      const execution = clone(baseline);
      const row = section(execution, 'eu-general-omission-delivery').evidence.checks.find(item => item.check_id === id);
      row.positive.source_linked = false;
      const rejected = build(execution);
      check.equal(rejected.check_mapping.find(item => item.check_id === id).status, 'OPEN', id + ' requires its own positive source proof');
      check.equal(rejected.implementation.configured, false, 'one unproved rule cannot be closed by unrelated passing sections');
    }
    for (const [label, amend] of [
      ['missing-source false positive', row => { row.missing_source.issues = 1; }],
      ['benign false positive', row => { row.benign.issues = 1; }],
      ['downstream fixture relabeled as native', (row, evidence) => { evidence.exercise_class = 'DOWNSTREAM_CONTROLLED_STRUCTURAL_MODEL'; }],
      ['unselected content in approved packet', row => { row.packet.unselected_content_absent = false; }],
      ['three representative downloads instead of four', row => { row.packet.approved_downloads = 3; }]
    ]) {
      const execution = clone(baseline), evidence = section(execution, 'eu-general-omission-delivery').evidence;
      amend(evidence.checks[0], evidence);
      check.equal(build(execution).implementation.configured, false, label + ' refuses positive-path acceptance');
    }
    build(baseline);
    const source = path.join(root, baseline.source_hashes[0].file), originalSource = fs.readFileSync(source);
    fs.appendFileSync(source, '\n// changed after the measured execution\n');
    check.equal(build(baseline).implementation.configured, false, 'actual current source changes invalidate frozen acceptance without editing proof flags');
    fs.writeFileSync(source, originalSource);
    const template = path.join(root, 'accelerated-launch/service/bureau-forms/ca-transunion.pdf'), originalTemplate = fs.readFileSync(template);
    fs.appendFileSync(template, '\nchanged-original');
    check.equal(build(baseline).implementation.configured, false, 'changed original PDF bytes invalidate proof even when executable source hashes match');
    fs.writeFileSync(template, originalTemplate);
    build(baseline);
    const altered = clone(baseline); altered.sections[0].evidence = { forged: true };
    check.equal(coverage.buildEvidence({ execution: altered, regressionFile, sourceRoot: root }).implementation.configured, false,
      'in-memory claims must match the actual frozen execution file');
    check.equal(coverage.main({ sourceRoot: root, regressionFile, outputFile }).implementation.configured, true,
      'main consumes the controlled on-disk execution without touching repository proof');
    fs.unlinkSync(regressionFile);
    check.equal(coverage.main({ sourceRoot: root, regressionFile, outputFile }).implementation.status, 'OPEN',
      'missing evidence produces explicit OPEN status instead of retaining a prior pass');
    return { scope: 'controlled temporary coverage-evidence fixtures only', release_proof_created: false,
      refusals: 'incomplete, stale, failed, wrong-source, missing-positive and changed-original proof', hosted_status: 'PENDING' };
  } finally {
    const resolved = path.resolve(root), temp = path.resolve(os.tmpdir());
    if (path.dirname(resolved) !== temp || !path.basename(resolved).startsWith('crp-supported-coverage-')) throw Error('Unsafe test fixture cleanup path');
    fs.rmSync(resolved, { recursive: true, force: true });
  }
}
module.exports = { run, id: 'et-supported-coverage-evidence', title: 'Supported coverage acceptance refuses incomplete, stale and mis-scoped behavioral proof' };
