'use strict';
/**
 * OWNER-CLOSURE-001 / BLOCKER-DISPUTE-PACKET-001.
 * Derive local packet implementation credit from the complete, source-matched
 * current-product execution. This script records no hosted payment or served
 * build proof. Retired statutory findings are never packet acceptance scope.
 *
 * CLI compatibility: node SOURCE_CAPTURES/CLOSURE-POLICY-001/closure-dispute-packet.cjs
 * writes accelerated-launch/service/out/dispute-packet-evidence.json only.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { executionCustody, allRegions } = require('../../accelerated-launch/service/finding-coverage.cjs');
const { CHECKLIST_STATUTORY_SUPPORT } = require('../../accelerated-launch/service/common-error-scope.cjs');

const ROOT = path.resolve(__dirname, '../..');
const REGRESSION = 'accelerated-launch/service/out/current-regression-evidence.json';
const OUTPUT = 'accelerated-launch/service/out/dispute-packet-evidence.json';
const PRODUCER = 'SOURCE_CAPTURES/CLOSURE-POLICY-001/closure-dispute-packet.cjs';
const REQUIRED_CRITERIA = Object.freeze(['packet_scope', 'finding_evidence', 'jurisdiction_content',
  'consumer_review', 'usable_download', 'entitlement_isolation', 'behavioral_coverage', 'end_to_end_journey']);
const sameSet = (actual, expected) => Array.isArray(actual) && actual.length === expected.length
  && new Set(actual).size === expected.length && expected.every(value => actual.includes(value));
const positive = value => Number.isInteger(value) && value > 0;
const present = value => typeof value === 'string' && value.trim().length > 0;
const allTrue = (value, keys) => Boolean(value && keys.every(key => value[key] === true));
const clean = row => Boolean(row && row.completed === true && row.failed === 0 && positive(row.passed)
  && Array.isArray(row.skipped) && row.skipped.length === 0 && Array.isArray(row.failures)
  && row.failures.length === 0 && row.section_exception === null);
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

// Each proof is an inspected behavioral section. Its assertion result must be
// complete and its actual executable source must match the frozen full run.
// Evidence fields are measured by those tests, not supplied as closure flags.
const PROOFS = Object.freeze([
  { id: 'o-all82-infrastructure', criteria: ['packet_scope'],
    exercise_class: 'FICTIONAL_HTTP_INFRASTRUCTURE',
    expected: 'The shared account and case infrastructure exercises the exact 82 canonical regions; this alone does not prove packets or report support.',
    measure: e => ({ passed: sameSet(e?.regions_exercised, allRegions()),
      measured: { regions_exercised: e?.regions_exercised || [], boundary: 'Infrastructure only; packet delivery is measured separately by bx.' } }) },
  { id: 'bx-all82-factual-verification', criteria: ['packet_scope', 'jurisdiction_content', 'finding_evidence', 'usable_download', 'entitlement_isolation'],
    exercise_class: 'FICTIONAL_NATIVE_PDF_UPLOAD',
    expected: '82 distinct supported GENERAL uploads deliver selected, approved, entitled packets matching their own issue content and case/report identity; other accounts and cases cannot borrow approval.',
    measure: e => ({ passed: e?.regions_tested === 82 && e.download_content_matched === 82
      && e.case_association_matched === 82 && sameSet(e.presentations, ['GENERAL-BUREAU-REPORT']),
      measured: { regions_tested: e?.regions_tested, download_content_matched: e?.download_content_matched,
        case_association_matched: e?.case_association_matched, presentations: e?.presentations,
        boundary: 'One reusable supported GENERAL account-date journey per region, not every check in every bureau layout.' } }) },
  { id: 'by-packet-reconciliation', criteria: ['finding_evidence', 'jurisdiction_content'],
    exercise_class: 'CONTROLLED_ADAPTER_FACTS_AND_REPRESENTATIVE_NATIVE_UPLOADS',
    expected: 'Exercised active checklist reporting-period findings remain selectable; native chronology and AU retention packets retain their own evidence and accepted rule. Retired content findings stay absent.',
    measure: e => {
      const emitted = e?.emitted_findings_reconciled;
      const passed = Array.isArray(emitted) && emitted.length >= 3
        && new Set(emitted.map(row => row.adapter_id)).size === emitted.length
        && emitted.every(row => ['COLLECTION_REPORTING_PERIOD', 'TRADELINE_REPORTING_PERIOD']
          .includes(CHECKLIST_STATUTORY_SUPPORT[row.adapter_id]) && positive(row.issues) && row.eligible === true)
        && e?.reconciled_content_finding === 'retired dismissed-charge content finding is absent from consumer issues';
      return { passed, measured: { emitted_active_period_results: emitted || [],
        retired_content_guard: e?.reconciled_content_finding,
        boundary: 'Only these exercised active adapters are credited; historical packet_enabled_rules is not active scope.' } };
    } },
  { id: 'bl-us-ca-correction-packet', criteria: ['finding_evidence', 'consumer_review', 'entitlement_isolation'],
    exercise_class: 'FICTIONAL_NATIVE_UPLOAD_AND_HTTP_PACKET',
    expected: 'Supported checklist selection, approval and download work; unknown/empty selection, changed selection, re-evaluation, missing entitlement and cross-account access are refused.',
    measure: e => ({ passed: present(e?.rules), measured: { behavioral_result: e?.rules } }) },
  { id: 'bs-prime-directive-delivery', criteria: ['finding_evidence', 'entitlement_isolation'],
    exercise_class: 'FICTIONAL_NATIVE_UPLOAD_AND_HTTP_PACKET',
    expected: 'A supported internally qualified checklist issue reaches selection and entitled verification download without inventing an absent exception; edited wording and foreign ownership are refused.',
    measure: e => ({ passed: present(e?.qualified_upload) && present(e?.wording),
      measured: { qualified_upload: e?.qualified_upload, wording: e?.wording } }) },
  { id: 'cb-packet-correspondence', criteria: ['packet_scope', 'finding_evidence', 'consumer_review', 'usable_download'],
    exercise_class: 'FICTIONAL_HTTP_DOWNLOAD_CONTENT',
    expected: 'Correction and verification correspondence contain only selected requests and organized own-source evidence. Consumer wording stays separate from report facts and editing it invalidates approval.',
    measure: e => {
      const variants = ['definite_correction', 'potential_verification', 'probable_verification'];
      const passed = variants.every(key => present(e?.[key]?.case_id)
        && positive(e[key].downloaded_chars)) && new Set(variants.map(key => e?.[key]?.case_id)).size === variants.length
        && e?.definite_correction?.recipient_type === 'CONSUMER_REPORTING_AGENCY'
        && present(e?.separation) && present(e?.sending);
      return { passed, measured: { downloads: variants.map(key => ({ variant: key,
        downloaded_chars: e?.[key]?.downloaded_chars })), consumer_input_separation: e?.separation,
        sending: e?.sending, boundary: 'Variant names record internal confidence; the consumer breach label is VIOLATION.' } };
    } },
  { id: 'bo-prime-directive-interaction', criteria: ['consumer_review', 'behavioral_coverage'],
    exercise_class: 'REAL_UI_HANDLERS_AND_LOOPBACK_HTTP_SERVICE',
    expected: 'Real UI handlers save visible selection and wording, disable approval after editing, review the new preview, approve and download against the real local service.',
    measure: e => ({ passed: present(e?.interaction), measured: { interaction: e?.interaction } }) },
  { id: 'bw-browser-wizzard', criteria: ['consumer_review', 'usable_download', 'behavioral_coverage'],
    exercise_class: 'REAL_BROWSER_AND_LOOPBACK_SERVICE_WITH_FICTIONAL_REPORTS',
    expected: 'The representative browser reviews, edits, approves and downloads one complete PDF. Relevant report pages are included automatically; court-deadline information is not a packet candidate.',
    measure: e => ({ passed: present(e?.browser) && present(e?.dual_date_browser?.packet)
      && e?.limitation_browser?.court_information_only === true && e.limitation_browser.packet_candidate === false
      && e.limitation_browser.reporting_issue_count === 0
      && e?.original_report_copies?.available === 2 && e.original_report_copies.default_selected === 2
      && e.original_report_copies.relevant_pages_included === true && e.original_report_copies.single_pdf === true,
      measured: { browser: e?.browser, court_information: e?.limitation_browser,
        report_copy_selection: e?.original_report_copies, local_download: e?.dual_date_browser?.packet,
        boundary: 'Loopback browser and test entitlement; not hosted payment, mailing or physical printing.' } }) },
  { id: 't-entitlement', criteria: ['entitlement_isolation'],
    exercise_class: 'HTTP_SERVICE_TEST_ADAPTER_AND_LOOPBACK_STRIPE_MOCK',
    expected: 'Server-side entitlement protects paid routes; client redirects, invalid provider events, expiry and revoked access cannot grant a packet.',
    measure: e => ({ passed: e?.payment_provider_state === 'TEST_ADAPTER'
      && positive(e?.unpaid?.paid_routes_refused) && positive(e?.paid_routes_covered)
      && e?.entitlement_refusal?.status_code === 402 && e.entitlement_refusal.code === 'ENTITLEMENT_REQUIRED'
      && allTrue(e?.activation, ['entitled_after_event', 'duplicate_event_is_idempotent', 'client_confirmation_refused', 'redirect_grants_nothing'])
      && allTrue(e?.failed_verification, ['unsigned_refused', 'tampered_refused', 'stale_refused', 'unsupported_type_refused',
        'unknown_account_ignored', 'unknown_checkout_ignored', 'plan_mismatch_ignored'])
      && allTrue(e?.expiry_and_cancellation, ['lapsed_period_is_expired_immediately', 'deletion_never_gated',
        'grace_on_failed_payment', 'cancellation_at_period_end', 'refund_revokes_immediately', 'unpaid_checkout_cancels_at_once'])
      && e?.stripe_cancellation?.proof === 'HTTP_SERVICE_AND_LOOPBACK_STRIPE_MOCK_NOT_HOSTED_PAYMENT'
      && allTrue(e.stripe_cancellation, ['provider_confirmed', 'provider_failure_and_mismatch_preserve_local_state',
        'repeats_and_concurrent_writes_idempotent', 'changed_account_and_entitlement_guarded', 'actual_subscription_deleted_event_mapped']),
      measured: { unpaid_routes_refused: e?.unpaid?.paid_routes_refused, paid_routes_covered: e?.paid_routes_covered,
        entitlement_refusal: e?.entitlement_refusal, activation: e?.activation, failed_verification: e?.failed_verification,
        expiry_and_cancellation: e?.expiry_and_cancellation, stripe_cancellation: e?.stripe_cancellation,
        boundary: 'Local provider fixtures never establish hosted paid access or production Stripe readiness.' } }) },
  { id: 'eb-account-packet-support', criteria: ['packet_scope', 'jurisdiction_content', 'consumer_review', 'usable_download', 'entitlement_isolation'],
    exercise_class: 'FICTIONAL_HTTP_PROFILE_DOCUMENTS_AND_PACKET_DOWNLOAD',
    expected: 'Owned contact details and selected document copies are approval-bound; the sourced bureau/purpose/postal channel chooses applicable materials and excludes unrelated documents.',
    measure: e => ({ passed: allTrue(e, ['http_ownership', 'selected_documents_inline_pdf',
      'contact_and_document_approval_binding', 'sourced_bureau_purpose_channel']), measured: {
      http_ownership: e?.http_ownership, selected_documents_inline_pdf: e?.selected_documents_inline_pdf,
      contact_and_document_approval_binding: e?.contact_and_document_approval_binding,
      sourced_bureau_purpose_channel: e?.sourced_bureau_purpose_channel } }) },
  { id: 'eh-packet-report-exhibits', criteria: ['finding_evidence', 'consumer_review', 'usable_download', 'entitlement_isolation'],
    exercise_class: 'OWNED_FICTIONAL_ORIGINAL_REPORTS_AND_HTTP_PACKET_DOWNLOAD',
    expected: 'Only relevant original pages from selected own report evidence enter the approved complete PDF. Re-aging retains both sources; mutations, deletion and stale approvals refuse download.',
    measure: e => ({ passed: allTrue(e, ['original_report_pages_preserved', 'both_reaging_sources', 'automatically_included_relevant_pages',
      'selected_issue_sources_only', 'review_and_approval_binding', 'mutation_and_deletion_refused', 'multipage_and_image_originals']),
      measured: { original_report_pages_preserved: e?.original_report_pages_preserved, both_reaging_sources: e?.both_reaging_sources,
        automatically_included_relevant_pages: e?.automatically_included_relevant_pages, selected_issue_sources_only: e?.selected_issue_sources_only,
        review_and_approval_binding: e?.review_and_approval_binding, mutation_and_deletion_refused: e?.mutation_and_deletion_refused,
        multipage_and_image_originals: e?.multipage_and_image_originals } }) },
  { id: 'ei-collection-duplicate', criteria: ['finding_evidence', 'usable_download', 'entitlement_isolation'],
    exercise_class: 'CONTROLLED_PERSISTED_SOURCE_FACTS_AND_ACTUAL_COMPLETE_PDF',
    expected: 'The corroborated multi-agency collection pair retains its own member/account evidence and selected requests in the actual packet; ordinary matching and privacy remain enforced.',
    measure: e => ({ passed: allTrue(e, ['owner_member_account_criterion', 'ordinary_matching_preserved'])
      && positive(e?.original_report_pages) && e?.physical_print_or_mail === false,
      measured: { scope: e?.scope, owner_member_account_criterion: e?.owner_member_account_criterion,
        ordinary_matching_preserved: e?.ordinary_matching_preserved, original_report_pages: e?.original_report_pages,
        physical_print_or_mail: e?.physical_print_or_mail,
        boundary: 'Shared source contract and real local packet output; reader admission is proved separately.' } }) },
  { id: 'er-bureau-form-population', criteria: ['consumer_review', 'usable_download', 'behavioral_coverage'],
    exercise_class: 'ACTUAL_HASH_VERIFIED_ORIGINAL_PDF_RENDERERS',
    expected: 'Supported actual original templates retain artwork/native controls, explicit supplied data and every selected request; rendering is deterministic, overflow is retained, and signature/consent stay blank.',
    // This section returns no metadata. Credit its completed, source-pinned
    // behavioral assertions, not a fabricated renderer-success field or count.
    measure: () => ({ passed: true, measured: { proof: 'Completed assertions in the source-matched original-form renderer section; template bytes are independently verified by execution custody.' } }) },
  { id: 'es-filled-packet-business-letter', criteria: ['packet_scope', 'consumer_review', 'usable_download', 'entitlement_isolation'],
    exercise_class: 'FICTIONAL_NATIVE_UPLOAD_ACTUAL_COMPLETE_REVIEW_PDF',
    expected: 'The owned review shows one complete PDF with letter, report pages, documents and filled originals. Approval binds its exact digest/template versions and selected order; downloaded and printed bytes equal reviewed bytes. Missing name parts are not guessed, edits require reapproval, and one-off access does not grant subscriber packets.',
    measure: e => ({ passed: allTrue(e, ['owned_actual_pdf_review', 'original_form_approval_digest',
      'name_parts_not_guessed', 'ordinary_business_letter']), measured: { owned_actual_pdf_review: e?.owned_actual_pdf_review,
      original_form_approval_digest: e?.original_form_approval_digest, name_parts_not_guessed: e?.name_parts_not_guessed,
      ordinary_business_letter: e?.ordinary_business_letter } }) },
  { id: 'ew-inline-packet-composer', criteria: ['consumer_review', 'usable_download', 'behavioral_coverage'],
    exercise_class: 'ACTUAL_COMPLETE_PDF_NATIVE_FIELDS_AND_INDEPENDENT_RENDERING',
    expected: 'The final complete PDF preserves source-page artwork, inline images, editable letter fields and independently editable original native controls, with deterministic bytes and blank signature/consent.',
    measure: e => ({passed:allTrue(e,['single_complete_pdf','original_native_controls','source_pages_only','editable_letter','deterministic_approval_bytes','independent_print_rendering']),measured:e}) },
  { id: 'ex-inline-packet-journey', criteria: ['consumer_review', 'usable_download', 'entitlement_isolation', 'end_to_end_journey'],
    exercise_class: 'FICTIONAL_NATIVE_UPLOAD_OWNED_LETTER_EDIT_AND_COMPLETE_HTTP_PDF',
    expected: 'An owned subscriber edits the whole letter, reviews and approves one complete PDF, and receives identical print/download bytes. Optional bureau number and separately chosen attachment pages are approval-bound; foreign and unpaid editing is refused.',
    measure: e => ({passed:allTrue(e,['single_complete_pdf','letter_editor','exact_review_approval_download','relevant_report_pages','manual_attachment_page_bound','optional_bureau_reference','ownership_and_entitlement']),measured:e}) },
  { id: 'dc-consumer-violation-term', criteria: ['packet_scope', 'behavioral_coverage'],
    exercise_class: 'REAL_CONSUMER_RENDERERS_AND_PACKET_SCOPE_CONTROLS',
    expected: 'Supported checklist breaches use the consumer label VIOLATION; internal confidence stays intact, retired adapters do not surface, and court information does not become a dispute request.',
    measure: () => ({ passed: true, measured: { proof: 'Completed assertions in the source-matched consumer terminology and active-scope section.' } }) },
  { id: 'cs-limitation-and-payment-history', criteria: ['packet_scope', 'finding_evidence'],
    exercise_class: 'CONTROLLED_SOURCE_FACTS_AND_HTTP_SELECTION_REFUSALS',
    expected: 'Court-claim timing remains information only with no bureau request or packet eligibility, independently of an applicable credit-report reporting-period issue.',
    measure: e => ({ passed: positive(e?.limitation?.assessed) && positive(e?.limitation?.may_be_outside)
      && positive(e?.limitation?.withheld) && present(e?.consumer_path?.information_issue),
      measured: { limitation: e?.limitation, consumer_path: { information_present: present(e?.consumer_path?.information_issue) },
        boundary: 'Court information is excluded, not counted as a delivered violation packet.' } }) }
]);

function fileRef(sourceRoot, file) {
  const absolute = path.resolve(sourceRoot, file);
  if (!absolute.startsWith(path.resolve(sourceRoot) + path.sep)) throw new Error('Evidence path outside source root.');
  return { file: path.relative(sourceRoot, absolute).split(path.sep).join('/'), sha256: sha(absolute) };
}

function buildEvidence({ execution, regressionFile, sourceRoot = ROOT } = {}) {
  sourceRoot = path.resolve(sourceRoot);
  regressionFile = path.resolve(regressionFile || path.join(sourceRoot, REGRESSION));
  const problems = [];
  if (!execution) {
    try { execution = JSON.parse(fs.readFileSync(regressionFile, 'utf8')); }
    catch (error) { problems.push('Current execution unavailable: ' + error.message); }
  }
  const custody = executionCustody(execution, regressionFile, sourceRoot);
  problems.push(...custody.problems);
  const sectionRows = Array.isArray(execution?.sections) ? execution.sections : [];
  const sections = new Map(sectionRows.filter(row => row && typeof row === 'object').map(row => [row.id, row]));
  const tests = PROOFS.map(proof => {
    const section = sections.get(proof.id);
    const result = proof.measure(section?.evidence);
    const completed = clean(section) && section.file === proof.id + '.cjs';
    if (!completed || !result.passed) problems.push('Packet behavioral proof incomplete: ' + proof.id);
    return { id: proof.id, passed: custody.passed && completed && result.passed,
      criteria: proof.criteria, exercise_class: proof.exercise_class, expected: proof.expected,
      measured: { completed: section?.completed === true, assertions_passed: section?.passed || 0,
        assertions_failed: section?.failed ?? null, ...result.measured },
      evidence_refs: [REGRESSION, 'accelerated-launch/service/tests/sections/' + proof.id + '.cjs'] };
  });
  let evidenceRefs = [], producerRef;
  try {
    evidenceRefs = [fileRef(sourceRoot, regressionFile), ...PROOFS.map(proof =>
      fileRef(sourceRoot, 'accelerated-launch/service/tests/sections/' + proof.id + '.cjs'))];
    producerRef = fileRef(sourceRoot, PRODUCER);
    evidenceRefs.push(producerRef);
  } catch (error) { problems.push('Packet evidence reference unavailable: ' + error.message); }
  for (const criterion of REQUIRED_CRITERIA.filter(key => key !== 'end_to_end_journey')) {
    if (!tests.some(test => test.passed && test.criteria.includes(criterion))) problems.push('Unproved packet criterion: ' + criterion);
  }
  const configured = problems.length === 0;
  const localScope = 'Active common-error checklist selected disputes; source-linked report-data rules and applicable accepted reporting periods. Independent retired statutory findings and court-claim information are not packet candidates.';
  return {
    identity: { build_id: null, served_build_id: null, local_execution_only: true },
    blocker_id: 'BLOCKER-DISPUTE-PACKET-001', passed: false, measured_at: new Date().toISOString(),
    scope: localScope,
    implementation: {
      configured, status: configured ? 'IMPLEMENTED_AND_TESTED' : 'OPEN',
      status_note: configured
        ? 'Complete current-product behavioral execution and tested-source/template hashes match. Local selected-issue packets, letters, actual filled originals, review/approval, download, attachment choices and isolation are demonstrated within the stated supported mechanisms. Hosted paid verification remains separate.'
        : 'Local packet closure is refused until complete passing current behavioral execution, matching tested sources and measured packet outcomes are available.',
      tests, open_criteria: {
        local: REQUIRED_CRITERIA.filter(key => key !== 'end_to_end_journey'
          && (!configured || !tests.some(test => test.passed && test.criteria.includes(key)))),
        hosted: ['end_to_end_journey'], reasons: problems
      },
      source_files: (Array.isArray(custody.sources) ? custody.sources : []).concat(producerRef ? [producerRef] : []), evidence_refs: evidenceRefs,
      execution: { file: path.relative(sourceRoot, regressionFile).split(path.sep).join('/'),
        mode: execution?.mode || null, totals: execution?.totals || null,
        completed_sections: sectionRows.filter(clean).length,
        source_inventory_matched: custody.passed, problems: custody.problems }
    },
    staging_verification: { status: 'PENDING',
      reason: 'Current served-build paid review of the letter and populated original forms, approval and matching download is not established by this local suite. No hosted payment, served identity or staging pass is fabricated.' },
    production_readiness: { status: 'NOT_ESTABLISHED', note: 'Independent production controls and release authorization remain separate.' },
    packet_scope_by_jurisdiction: {
      scope: localScope, canonical_regions: allRegions(),
      measured_general_packet_regions: sections.get('bx-all82-factual-verification')?.evidence?.regions_tested || 0,
      packet_contents: ['selected eligible requests with the consumer breach label VIOLATION',
        'own tradeline or collection name, printed facts, source locations and relevant report identity',
        'the breached checklist rule and accepted statutory support where applicable',
        'consumer-supplied contact details and separate permitted wording',
        'the ordinary consumer letter and applicable populated original bureau form',
        'only selected supporting document/report copies, including both selected re-aging sources',
        'the exact reviewed version and original/output digests bound to approval'],
      eligibility: 'A supported eligible issue from the owned case must be selected; unknown, empty, changed or stale selections and information-only court claims cannot enter an approved download.',
      recipient: 'The selected bureau and purpose use sourced postal instructions and applicable forms. The consumer reviews, signs where required, prints and mails the packet; the service does not submit, sign or mail it.',
      boundary: '82 shared supported GENERAL issue-to-packet journeys plus distinct representative packet mechanisms. This is not every check in every dedicated bureau layout, uniform statutory coverage, hosted payment or a physical print/mail test.'
    },
    criteria: Object.fromEntries(REQUIRED_CRITERIA.map(key => [key, {
      passed: false,
      expected: key === 'end_to_end_journey'
        ? 'Current served-release paid review, approval and matching packet download measured separately.'
        : 'The configured ' + key + ' packet behavior is demonstrated locally and then verified separately on the current served release.',
      measured: key === 'end_to_end_journey' ? 'PENDING: no current hosted paid packet proof in this local record.'
        : (configured ? 'IMPLEMENTED_AND_TESTED locally; current hosted verification is PENDING.' : 'OPEN: ' + problems.join('; ')),
      evidence_refs: key === 'end_to_end_journey' ? [] : evidenceRefs.map(ref => ref.file)
    }])),
    tests
  };
}

function main(options = {}) {
  const sourceRoot = path.resolve(options.sourceRoot || ROOT);
  const evidence = buildEvidence({ ...options, sourceRoot });
  const outputFile = path.resolve(options.outputFile || path.join(sourceRoot, OUTPUT));
  if (!outputFile.startsWith(sourceRoot + path.sep)) throw new Error('Output path outside source root.');
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, JSON.stringify(evidence, null, 2) + '\n');
  console.log('dispute-packet-evidence.json written: local ' + evidence.implementation.status
    + '; current hosted paid packet verification PENDING; production readiness separate.');
  return evidence;
}

if (require.main === module) main();
module.exports = { main, buildEvidence, REQUIRED_CRITERIA, PROOFS };
