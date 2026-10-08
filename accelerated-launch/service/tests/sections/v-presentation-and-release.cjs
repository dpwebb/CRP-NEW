'use strict';
/**
 * v-presentation-and-release.cjs — OWNER-ALL82-001 / B4, the two remaining closes and the release record.
 *
 *   • CANADA: "Build a separate, evidence-supported consumer-format family adapter where existing evidence
 *     permits. Preserve the original PR-01 exact-specimen admission. Do not remove its hash restriction and call
 *     that family support." Here the evidence does not permit a family, so this section PROVES the restriction
 *     still bites: it presents the SECOND REAL Canadian consumer report that is on this machine — a genuine
 *     TransUnion Canada disclosure — and records that it is refused, not read.
 *   • GB: "Seek targeted current consumer-format evidence or authoritative current field/layout documentation …
 *     Keep the 2007 sample labeled historical demonstration evidence; do not advertise present-day support from
 *     it alone." The retrieval attempts failed at the source and are recorded; this section RE-MEASURES the one
 *     current official GB artifact on hand against the family's own vocabulary, so the recorded claim is
 *     reproducible rather than asserted.
 *   • RELEASE: the local pre-release check, and the fact that it says NOT_LAUNCH_READY for one named reason.
 *
 * No artifact is copied. Both real reports are read read-only from where they already are.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const formats = require('../../formats.cjs');
const gbFamily = require('../../format-families/gb-experian-consumer.cjs');
const gbGeneralContract = require('../../gb-general-field-contract.cjs');
const crypto = require('node:crypto');
const caScope = require('../../format-families/ca-consumer-format-scope.cjs');
const results = require('../../results.cjs');
const { PAID_ACTIONS } = require('../../entitlement.cjs');
const { runReleaseCheck, CHECKS } = require('../../release-check.cjs');
const { REPOSITORY_ROOT } = require('../harness.cjs');

const BASELINE = path.join(REPOSITORY_ROOT, 'SOURCE_CAPTURES', 'REPORT_FORMAT_BASELINE_2026-09-30');
const REGISTER = path.join(REPOSITORY_ROOT, 'SOURCE_CAPTURES', 'PROD-003', 'report_representation_register.json');
const UI_DIR = path.join(__dirname, '..', '..', 'ui');

/** The register's own record of a Canadian presentation, read read-only. */
function registeredPresentation(presentationId) {
  if (!fs.existsSync(REGISTER)) return null;
  const register = JSON.parse(fs.readFileSync(REGISTER, 'utf8'));
  const row = register.presentations.find((entry) => entry.presentation_id === presentationId);
  if (!row) return null;
  const file = row.absolute_path_outside_this_repository;
  return Object.assign({}, row, {
    /* The register names the field `status`; this section reads it as the admission status it is. */
    register_status: row.status || null,
    available: Boolean(file) && fs.existsSync(file)
  });
}

/** The visible text of a captured HTML page, tags stripped. */
function visibleText(file) {
  const raw = fs.readFileSync(file, 'utf8');
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ');
}

function occurrences(haystack, needle) {
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (haystack.match(new RegExp(escaped, 'gi')) || []).length;
}

/* ------------------------------------------------------------------ Canada: the two admissions */

/**
 * B4 CONTINUATION. The owner authorized completing the report-family work, so this section no longer reports
 * "no Canadian family is admitted". It reports what the evidence now supports, and it keeps the two admissions
 * apart on purpose:
 *
 *   • PR-01 — the Equifax Canada specimen — is admitted BY ITS OWN PINNED DIGEST and by nothing else. Its family
 *     admission is still FALSE, and this section proves the digest gate still bites by presenting the second real
 *     Canadian report and asserting that the EQUIFAX gate refuses it at its own encryption predicate, by name.
 *   • The second real Canadian report — a genuine TransUnion Canada disclosure — is now ADMITTED, by a separate
 *     measured structural contract in a module of its own. It is never read through the Equifax locator.
 *
 * The full measurement of that contract, its boundaries and its refusals are asserted in the section
 * `w-ca-second-bureau-format`, which is where that depth belongs. This section keeps the SCOPE statement honest.
 */
async function canadaPresentationScope(t, check, evidence) {
  const caAdapters = formats.formatsForCountry('CA');
  check.equal(caAdapters.length, 2, 'exactly TWO presentations are registered for Canada, one per bureau');
  check.deepEqual(caAdapters.map((a) => a.presentation_id).sort(), ['PR-01', 'FAM-TU-CA-CONSUMER'].sort(),
    'the pinned Equifax specimen and the TransUnion family');
  const exact = caAdapters.find((a) => a.presentation_id === 'PR-01');
  check.equal(exact.admission_path, 'EXACT_SPECIMEN_DIGEST', 'the Equifax Canada admission is still a pinned digest, not a structure');
  check.equal(exact.family_id, null, 'and it is still not a family');
  check.equal(exact.evidenced_sha256, caScope.ADMITTED.sha256, 'the digest recorded is the one the register pins');
  check.equal(caScope.FAMILY_ADMISSION.admitted, false, 'no EQUIFAX Canada consumer-format FAMILY is admitted');
  check.equal(caScope.COUNTRY_FAMILY_ADMISSION.admitted, true, 'while Canada as a country admits one family, named separately');
  check.ok(/TWO independent specimens/.test(caScope.FAMILY_ADMISSION.conditions_that_would_permit_one.join(' ')),
    'and the condition that would change the Equifax position is recorded');

  const family = caAdapters.find((a) => a.presentation_id !== 'PR-01');
  check.equal(family.admission_path, 'EVIDENCED_STRUCTURAL_CONTRACT', 'the second Canadian admission is by measured structure');
  check.equal(family.family_id, family.presentation_id, 'and it is a registered family with a reader of its own');

  /* THE REAL SECOND CANADIAN REPORT IS PRESENTED TO BOTH GATES AT ONCE. */
  const second = registeredPresentation('PR-02');
  if (!second || !second.available) {
    check.skip('the real second Canadian report is presented to both gates',
      'the second Canadian specimen recorded in the PROD-003 register is not on this machine');
    evidence.canada = { equifax_family_admitted: false, country_family_admitted: true, second_report_present: false };
    return;
  }
  check.equal(second.register_status, 'SECONDARY_CORROBORATING_PRESENTATION_NOT_ADMITTED_FOR_A_RULE_UNIT',
    'the preserved register still records the second Canadian report as NOT admitted for a rule unit');
  const bytes = fs.readFileSync(second.absolute_path_outside_this_repository);
  const digest = require('node:crypto').createHash('sha256').update(bytes).digest('hex').toUpperCase();
  check.equal(digest, second.sha256, 'and the file still matches the digest the register recorded for it');
  check.deepEqual(caScope.RECORDED_NOT_ADMITTED.map((row) => row.presentation_id), ['PR-02'],
    'the scope module still records PR-02, so the register record is preserved and not superseded');

  return presentBothWays(t, check, evidence, bytes);
}

/**
 * The same real file, measured against BOTH admissions paths in one upload. The Equifax digest gate must still
 * refuse it — and must say WHICH predicate it failed — while the contract written for this layout admits it.
 */
async function presentBothWays(t, check, evidence, bytes) {
  const owner = await t.account('presentation-canada@example.test');
  const caseId = (await t.request('POST', '/api/cases', { token: owner.token, body: { country: 'CA', region: 'CA-ON' } })).json.case.case_id;
  const upload = await t.request('POST', `/api/cases/${caseId}/files`, {
    token: owner.token,
    body: {
      originalFilename: 'canadian-report.pdf',
      declaredBytes: bytes.length,
      mimeType: 'application/pdf',
      contentBase64: bytes.toString('base64')
    }
  });
  check.equal(upload.status, 201, 'the real second Canadian report is stored so its measured shape can be reported');
  check.equal(upload.json.receipt.format_detection.supported, true, 'and it is ADMITTED, by the contract written for its own layout');
  check.equal(upload.json.receipt.format_detection.read_support_is, 'EVIDENCED_STRUCTURAL_CONTRACT', 'not by the Equifax digest gate');
  check.equal(upload.json.receipt.extraction_summary.extraction_ran, true, 'the file IS read, by its own reader');
  check.equal(upload.json.receipt.extraction_summary.presentation_evidence, true, 'and it supplies presentation evidence');

  const refusals = upload.json.receipt.format_detection.refusals || [];
  const equifaxRefusal = refusals.find((row) => row.presentation_id === 'PR-01');
  check.ok(equifaxRefusal, 'the Equifax gate\'s OWN refusal of this file is still reported, so the restriction is not hidden');
  check.equal(equifaxRefusal.refusal_reason, 'DOCUMENT_ENCRYPTED',
    'because the Equifax gate refuses an encrypted document at its own encryption predicate');
  check.ok(equifaxRefusal.predicates_failed.includes('NOT_ENCRYPTED'), 'and the predicate it failed is named');
  check.equal(refusals.filter((row) => row.presentation_id === 'FAM-TU-CA-CONSUMER').length, 0,
    'no refusal is reported for the path that ADMITTED the file, so the receipt does not contradict itself');
  check.equal(refusals.length, 1, 'every path measured before the admitting one is reported, and nothing else is');
  check.ok(/ADMITTED_BY_THIS_PATH|CLOSEST_ADMISSION_PATH/.test(upload.json.receipt.format_detection.refusal_selection_rule),
    'and the rule that picks the reported reason is stated rather than left implicit');
  check.equal(upload.json.receipt.format_detection.encryption.encrypted, true,
    'the receipt also carries the measured encryption facts');
  check.equal(upload.json.receipt.format_detection.encryption.permission_flags.copy_allowed, true,
    'including the permission the document itself grants, which is why it is read');
  check.ok(!/Equifax/.test(upload.json.receipt.format_detection.read_support_is),
    'the admission path names no bureau, because it is a structure and not a publisher');
  await t.request('DELETE', `/api/cases/${caseId}`, { token: owner.token });

  evidence.canada = {
    presentations_registered: formats.formatsForCountry('CA').map((a) => a.presentation_id).sort(),
    equifax_admission_path: 'EXACT_SPECIMEN_DIGEST',
    equifax_family_admitted: false,
    country_family_admitted: true,
    families_admitted: caScope.COUNTRY_FAMILY_ADMISSION.families_admitted.map((row) => row.family_id),
    second_real_canadian_report_present: true,
    second_real_canadian_report_admitted_by_its_own_contract: true,
    second_real_canadian_report_still_refused_by_the_equifax_gate: true,
    equifax_gate_refusal: equifaxRefusal.refusal_reason
  };
}

/* ------------------------------------------------------------------ GB: currency, measured */

async function gbCurrency(t, check, evidence) {
  check.equal(gbFamily.CURRENCY_EVIDENCE.status, 'HISTORICAL_DEMONSTRATION_EVIDENCE_ONLY',
    'the GB family records itself as historical demonstration evidence');
  check.equal(gbFamily.CURRENCY_EVIDENCE.present_day_support_claimed, false, 'and does not claim present-day support');
  check.equal(gbFamily.CURRENCY_EVIDENCE.currency_validated, false, 'and does not claim validated currency');
  check.equal(gbFamily.CURRENCY_EVIDENCE.evidence_vintage, '1 June 2007', 'with the vintage named');
  const gb = formats.presentationScope().GB;
  check.equal(gb.present_day_support_claimed, false, 'and the coverage surface says the same');
  check.ok(/not established/i.test(gb.plain), 'in plain language a consumer can read');

  const attempts = gbFamily.CURRENCY_EVIDENCE.current_evidence_attempts;
  evidence.gb = {
    status: gbFamily.CURRENCY_EVIDENCE.status,
    present_day_support_claimed: false,
    retrieval_attempts_recorded: attempts.length,
    headings_validated: 0,
    fields_validated: 0,
    historical_measurement: 'separate historical-gb-source section'
  };
}


/* ------------------------------------------------------------------ messaging and release */

async function messagingAndRelease(t, check, evidence) {
  const owner = await t.account('presentation-messaging@example.test');

  /* THE COVERAGE SURFACE MATCHES THE REGISTRY, BEFORE PAYMENT AND BEFORE UPLOAD. */
  const surface = await t.request('GET', '/api/jurisdictions');
  const presentations = surface.json.surface.presentations;
  const registryIds = formats.EXTRACTION_ADAPTERS.map((entry) => entry.presentation_id).sort();
  check.deepEqual(presentations.map((entry) => entry.presentation_id).sort(), registryIds,
    'every registered presentation is advertised, and nothing else is');
  check.equal(presentations.filter((entry) => entry.present_day_support_claimed === false).length, 1,
    'exactly one advertised presentation says it does not claim present-day support');
  check.ok(/1 June 2007/.test(JSON.stringify(presentations.filter((entry) => entry.present_day_support_claimed === false))),
    'and it names the 2007 example that bounds it');
  check.ok(surface.json.surface.entitlement.plain.startsWith(require('../../payment-provider.cjs').describeProvider(process.env).plain),
    'the surface states the actual configured payment capability before anything is uploaded');
  check.deepEqual(surface.json.surface.paid_actions, PAID_ACTIONS.slice(), 'and names exactly which steps would be paid');
  check.ok(surface.json.surface.check_classes.no_issue_found_means.startsWith('We did not find a reporting issue'),
    'and says exactly what “no issue found” means');

  const formatsView = await t.request('GET', '/api/formats');
  check.equal(formatsView.json.formats.length, registryIds.length, 'the formats endpoint advertises the same set');
  check.ok(/NOT established/.test(formatsView.json.note), 'and its note is honest about the one family whose currency is not established');

  const scope = surface.json.surface.presentation_scope;
  check.equal(scope.CA.family_admitted, true, 'the Canadian scope reports that a family IS admitted for the country');
  check.deepEqual(scope.CA.families_admitted, ['FAM-TU-CA-CONSUMER'], 'and names which one, so the claim cannot be read as a widened Equifax contract');
  check.equal(scope.CA.equifax_family_admitted, false, 'while the Equifax presentation\'s own family admission stays false, reported separately');
  check.ok(/structural contract/i.test(scope.CA.plain), 'and the consumer is told the second admission is by measured structure');
  check.ok(/Applicable Canadian rules/.test(scope.CA.plain),
    'Canadian scope reflects the current statutory and factual assessment paths');
  check.equal(scope.GB.present_day_support_claimed, false, 'the GB scope reports no present-day claim');

  /* THE PRIVATE UI'S OWN WORDS MUST MATCH THE REGISTRY, not the B2 era it was written in. */
  const html = fs.readFileSync(path.join(UI_DIR, 'index.html'), 'utf8');
  const uiJs = fs.readFileSync(path.join(UI_DIR, 'app.js'), 'utf8');
  check.ok(new RegExp(`\\b${formats.listSupportedFormats().length}\\b`).test(html), 'the UI banner counts five presentations, as the registry holds');
  check.ok(/TransUnion Canada consumer disclosure/.test(html), 'and names the second Canadian presentation it now reads');
  check.ok(!/Nova Scotia selection only/.test(uiJs), 'and the stale Nova Scotia-only claim is gone from the UI');
  check.ok(!/for <em>one<\/em> report/.test(uiJs), 'and so is the stale one-presentation claim');
  check.ok(/no payment provider is connected/.test(uiJs), 'and the UI states the payment position plainly');
  check.ok(/reporting issues/.test(uiJs) && !/probable violations and potential errors/.test(uiJs), 'consumer wording states the issue assessment promise without confidence tiers');
  check.ok(/choose (?:any|what) you want to dispute/i.test(uiJs), 'consumer wording connects assessment to consumer-selected disputes');
  /* OWNER-CONSUMER-LANGUAGE-001 (footer-only disclaimer): exactly one in the main-page footer, none elsewhere. */
  const disclaimerMatches = html.match(/Credit Regulator Pro provides credit-report information, not legal advice\./g) || [];
  check.equal(disclaimerMatches.length, 1, 'exactly one legal-advice disclaimer appears in the main page');
  check.ok(/<footer[^>]*>[\s\S]*Credit Regulator Pro provides credit-report information, not legal advice\.[\s\S]*<\/footer>/.test(html), 'the single disclaimer is inside the main-page footer');
  check.ok(!/not legal advi[cs]e/i.test(uiJs), 'the wizard script (steps, results, explanations) carries no legal-advice disclaimer');

  evidence.messaging = {
    advertised_presentations: registryIds,
    paid_actions_named: true,
    no_issue_found_meaning_published: true,
    ui_matches_the_registry: true
  };
}


/* ------------------------------------------------------------------ the draft boundary and the release check */

async function draftBoundaryAndRelease(t, check, evidence) {
  const owner = await t.account('presentation-release@example.test');

  const policy = await t.request('GET', '/api/policy');
  check.equal(policy.json.check_classes.statutory_rule_comparison.is_a_statutory_check, true, 'a statutory comparison is named as one');
  check.equal(policy.json.check_classes.report_fact_consistency.is_a_statutory_check, false, 'a factual observation is not');
  check.equal(policy.json.check_classes.printed_policy_observation.is_a_statutory_check, false, 'and neither is a policy observation');
  check.ok(/one common-error checklist/.test(policy.json.check_classes.never_summed), 'report facts and statutory support belong to one checklist without extra issue counts');
  check.ok(results.SET_QUALIFICATIONS.some((line) => /defined reporting rule or requirement/.test(line)), 'the result set states the violation rule');
  check.ok(results.SET_QUALIFICATIONS.some((line) => /statute may provide additional context/.test(line)),
    'and says statutes provide context without becoming a mandatory gate');
  check.ok(results.SET_QUALIFICATIONS.some((line) => /neither one ran, and neither one passed/i.test(line)),
    'and that a check which did not run is neither performed nor passed');

  const caseId = (await t.request('POST', '/api/cases', { token: owner.token, body: { country: 'CA', region: 'CA-NS' } })).json.case.case_id;
  await t.request('POST', `/api/cases/${caseId}/demonstration`, { token: owner.token, body: { scenario: 'TWO_ACCOUNTS' } });
  const view = await t.request('GET', `/api/cases/${caseId}`, { token: owner.token });
  check.equal(view.json.view.result.eligibility.draft_eligible, false, 'no result set in this build is eligible for a draft');
  check.equal(view.json.view.download.response_draft_available, false, 'so the download boundary says no draft is available');
  await t.request('POST', `/api/cases/${caseId}/review`, { token: owner.token, body: {} });
  const draft = await t.request('GET', `/api/cases/${caseId}/response-draft`, { token: owner.token });
  check.equal(draft.status, 409, 'and asking for a draft is refused even after review');
  check.equal(draft.json.error.code, 'RESULT_NOT_ELIGIBLE_FOR_DRAFT', 'with the recorded output permission as the reason');

  const download = await t.request('GET', `/api/cases/${caseId}/demonstration-download`, { token: owner.token });
  check.equal(download.status, 200, 'the download interface is still exercisable');
  check.ok(/DEMONSTRATION OUTPUT/.test(download.text) && /NOT A RESPONSE DRAFT/.test(download.text),
    'and what it serves says on its face that it is fictional and not a response draft');
  check.ok(!/TransUnion|Equifax|account number/i.test(download.text), 'and carries no bureau name and no account detail');

  /* THE LOCAL RELEASE CHECK, RUN WITHOUT WRITING ANYTHING. */
  const outFile = path.join(__dirname, '..', '..', 'out', 'b4-release-check.json');
  const existed = fs.existsSync(outFile);
  const report = runReleaseCheck({ write: false });
  const presentationCheck = report.checks.find((row) => row.id === 'SUPPORTED_CHECKS_AND_LIMITATIONS_SHOWN_BEFORE_PURCHASE');
  check.equal(presentationCheck.passed, true, 'the approved No findings available wording satisfies the presentation gate without requiring retired copy');
  check.equal(report.launch_ready, false, 'the release check does not report this build as launch ready');
  check.equal(report.state, 'NOT_LAUNCH_READY', 'and names the state plainly');
  check.equal(report.deployment_performed, false, 'no deployment was performed');
  check.equal(report.network_calls_made, 0, 'and no network call was made');
  check.ok(report.launch_blocking_failures.includes('PAYMENT_PROVIDER_IS_CONFIGURED_FOR_BILLING'),
    'and the payment provider is named as a launch blocker');
  check.ok(/authorization/i.test(report.next_release_action), 'with the next release action named');
  check.ok(!report.launch_ready && report.launch_blocking_failures.length > 0, 'remaining core blockers remain explicit without a frozen historical priority');
  check.equal(fs.existsSync(outFile), existed, 'and running it with write disabled wrote nothing');

  /* THE EIGHT LAUNCH-CRITICAL CONDITIONS THE OWNER NAMED ARE ALL CHECKS. */
  const REQUIRED_IDS = [
    'ALL_82_JURISDICTIONS_HAVE_MEANINGFUL_ASSESSMENTS_ON_SUPPORTED_FORMATS',
    'CANADIAN_GENERAL_UPLOAD_SUPPORT_ESTABLISHED_WITHIN_STATED_BOUNDARIES',
    'CURRENT_GB_SUPPORT_IS_ESTABLISHED',
    'PRIVATE_DATA_DIRECTORY_IS_DURABLE',
    'ACCOUNT_ISOLATION_AND_DELETION_PASS',
    'PAYMENT_PROVIDER_IS_CONFIGURED_FOR_BILLING',
    'SUPPORTED_CHECKS_AND_LIMITATIONS_SHOWN_BEFORE_PURCHASE',
    'DEPLOYMENT_PROVENANCE_AND_RELEASE_AUTHORIZATION_RECORDED'
  ];
  for (const id of REQUIRED_IDS) {
    const entry = CHECKS.find((row) => row.id === id);
    check.ok(entry, `the release check includes ${id}`);
    check.equal(entry.blocks_launch, true, `${id} blocks a launch`);
    check.ok(typeof entry.category === 'string' && entry.category.length > 0, `${id} carries a category`);
  }

  /* BLOCKER CATEGORIES AND AFFECTED REGIONS, and the format-support blockage cannot be hidden by a count. */
  check.deepEqual(report.blockers_by_category.map((row) => row.category), [...new Set(CHECKS.map((c) => c.category))].sort(),
    'every category the checks declare appears in the grouped blocker report');
  const gbCheck = report.checks.find((row) => row.id === 'CURRENT_GB_SUPPORT_IS_ESTABLISHED');
  check.equal(report.format_support_blocked_in_regions.includes('GB'), !gbCheck.passed, 'GB format blockage follows current evidence validation');
  check.deepEqual(gbCheck.affected_regions, gbCheck.passed ? [] : ['GB'], 'the GB gate names its unresolved region when proof is missing');
  check.equal(gbCheck.support_scope, 'CURRENT_GENERAL_CONSUMER_FIELDS', 'current support is bounded to documented GENERAL fields');
  check.equal(gbCheck.dedicated_experian_family_currency_validated, false, 'a current GENERAL contract never promotes the historical dedicated family');

  const inventory = gbGeneralContract.currentInventory();
  // Controlled validator input only; this is never persisted as measured product evidence.
  const candidate = { totals: { passed: inventory.sectionIds.length, failed: 0, skipped: 0 }, execution: { mode: 'FULL_CURRENT_PRODUCT',
    selected_sections: inventory.sectionIds, unrun_sections: [], source_drift: [], source_hashes: inventory.sources.map(file => ({ file,
      sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(REPOSITORY_ROOT, file))).digest('hex') })) },
    sections: inventory.sectionIds.map(id => ({ id, completed: true, failed: 0, passed: 1, skipped: [],
      evidence: id === 'dl-general-caption-sources' ? { gb_field_contract: { id: gbGeneralContract.ID,
        source_version: gbGeneralContract.SOURCE.version, regions: [...gbGeneralContract.REGIONS],
        check_id: 'COMMON-ERROR-REVOLVING-BALANCE-ZERO-LIMIT', source_isolation: true, approved_downloads: 4 } } : {} })) };
  candidate.execution.sections = candidate.sections;
  candidate.execution.totals = candidate.totals;
  check.equal(gbGeneralContract.validate(candidate).passed, true, 'complete current bound proof validates the specified contract');
  for (const alter of [p => { p.execution.mode = 'FOCUSED'; }, p => { p.execution.unrun_sections.push('missing'); },
    p => { p.execution.source_drift.push('changed'); }, p => { p.totals.failed = 1; }, p => { p.sections[0].completed = false; },
    p => { p.sections.find(row => row.id === 'dl-general-caption-sources').evidence.gb_field_contract.approved_downloads = 3; },
    p => { p.sections.find(row => row.id === 'dl-general-caption-sources').evidence.gb_field_contract.regions[0] = 'GB'; },
    p => { p.sections.find(row => row.id === 'dl-general-caption-sources').evidence.gb_field_contract.source_version = '2007'; },
    p => { p.sections.find(row => row.id === 'dl-general-caption-sources').evidence.gb_field_contract.source_isolation = false; },
    p => { p.execution.source_hashes[0].sha256 = 'stale'; }, p => { p.execution.source_hashes.pop(); },
    p => { p.sections = p.sections.filter(row => gbGeneralContract.REQUIRED_SECTIONS.includes(row.id)); },
    p => { p.execution.selected_sections.pop(); }, p => { p.execution.sections.pop(); },
    p => { p.execution.totals = { passed: 999, failed: 0, skipped: 0 }; }]) {
    const broken = structuredClone(candidate); alter(broken);
    check.equal(gbGeneralContract.validate(broken).passed, false, 'missing, partial, stale or differently scoped proof cannot close UK evidence');
  }
  const deploymentCheck = report.checks.find((row) => row.id === 'DEPLOYMENT_PROVENANCE_AND_RELEASE_AUTHORIZATION_RECORDED');
  check.deepEqual(deploymentCheck.affected_regions, ['CA', 'AU', 'US', 'GB'], 'and the deployment blocker names every market it holds back');
  check.ok(report.blockers_by_category.some((row) => row.category === 'PAYMENT' && row.launch_blocking_checks_failed.length),
    'the payment category is reported separately from format support');

  evidence.draft_boundary = { draft_refused_after_review: true, demonstration_download_is_fictional: true };
  evidence.release = {
    state: report.state,
    launch_ready: report.launch_ready,
    launch_blocking_failures: report.launch_blocking_failures,
    blockers_by_category: report.blockers_by_category,
    format_support_blocked: report.format_support_blocked,
    format_support_blocked_in_regions: report.format_support_blocked_in_regions,
    checks: report.checks.length,
    deployment_performed: false,
    network_calls_made: 0
  };
}

/* ------------------------------------------------------------------ the section */

async function run(t, check) {
  const evidence = {};
  await canadaPresentationScope(t, check, evidence);
  await gbCurrency(t, check, evidence);
  await messagingAndRelease(t, check, evidence);
  await draftBoundaryAndRelease(t, check, evidence);
  return evidence;
}

module.exports = {
  run,
  id: 'v-presentation-and-release',
  title: 'Presentation gaps closed or bounded: Canadian family scope, GB currency, coverage messaging and the local release check'
};
