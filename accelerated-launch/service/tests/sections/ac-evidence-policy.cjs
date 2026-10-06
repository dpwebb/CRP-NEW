'use strict';
/**
 * ac-evidence-policy.cjs — OWNER-EVIDENCE-001 (reported-fact policy v1.0).
 *
 * Proves, at three levels, that the policy is enforced and not merely documented:
 *   1. the policy module: stable identifier/version/exact text, a SHA-256 integrity digest, an `acceptFact`
 *      shared interface, and detection of any alteration to a released policy;
 *   2. the general intake: a clearly labelled bankruptcy discharge date is accepted, while ambiguous,
 *      contradictory, mis-associated, trustee and filing/update dates are withheld, and the policy version is
 *      recorded in the assessment's factual view;
 *   3. the CA-NS bankruptcy adapter: it now anchors on the reported discharge date (SINGLE_FIELD) instead of
 *      withholding it as a legal event, the exact-specimen PR-01 restriction is preserved, and accepting the
 *      fact does not authorize a violation finding.
 */

const generalIntake = require('../../general-intake.cjs');
const formats = require('../../formats.cjs');
const evaluation = require('../../evaluation.cjs');
const ruleAdapters = require('../../../adapters/rule-adapters.cjs');
const reportedFactPolicy = require('../../../reported-fact-policy.cjs');
const { makeSyntheticModel } = require('../../../../internal-validation/ca-ns-last-payment-six-year/document-model.cjs');

const POLICY_TEXT =
  "A clearly labelled fact printed on an admitted credit report is accepted as the bureau's reported fact for assessment, unless its reading, record association or meaning is materially ambiguous or contradictory. External corroboration is not required merely because the fact describes a legal event.";

function bureauModel(lines) {
  return makeSyntheticModel({ pages: [lines] });
}
function dischargeDates(records) {
  return records
    .filter((r) => r.facts && r.facts['bankruptcy.dischargeDate'])
    .map((r) => r.facts['bankruptcy.dischargeDate']);
}

async function run(t, check) {
  const evidence = {};

  /* ================= 1. The policy module: stable, digestible, immutable ================= */
  const loaded = reportedFactPolicy.loadPolicy();
  check.equal(loaded.policy.policy_id, 'OWNER-EVIDENCE-001', 'the policy has a stable identifier');
  check.equal(loaded.policy.version, '1.0', 'the policy is version 1.0');
  check.equal(loaded.policy.text, POLICY_TEXT, 'the exact policy text is preserved verbatim');
  check.equal(loaded.policy.amendment_rule, 'Changes require an explicit owner-authorized amendment and a new version; released versions are preserved and never overwritten.', 'amendments require an owner authorization and a new version');
  check.deepEqual(loaded.policy.released_versions, ['1.0'], 'released versions are preserved');
  check.equal(reportedFactPolicy.loadPolicy().digest, loaded.digest, 'the integrity digest is stable across loads');
  check.match(loaded.digest, /^[0-9a-f]{64}$/, 'the integrity digest is a SHA-256 hex string');
  check.equal(loaded.digest, reportedFactPolicy.digestForPolicy(loaded.policy), 'the stored digest recomputes from the canonical text');

  check.equal(loaded.approved.approved_digest, loaded.digest, 'the owner-approved digest matches the computed digest');
  const throws = (fn, label) => {
    let threw = false;
    try { fn(); } catch (err) { threw = true; }
    check.equal(threw, true, label);
  };
  throws(() => reportedFactPolicy.verifyApproval(Object.assign({}, loaded.policy, { text: loaded.policy.text.replace('External corroboration is not required', 'External corroboration IS required') }), loaded.approved),
    'an altered policy text is rejected by the approval check');
  throws(() => reportedFactPolicy.verifyApproval(Object.assign({}, loaded.policy, { version: '1.1' }), loaded.approved),
    'an altered policy version is rejected by the approval check');
  throws(() => reportedFactPolicy.verifyApproval(Object.assign({}, loaded.policy, { policy_id: 'OWNER-EVIDENCE-002' }), loaded.approved),
    'an altered policy identifier is rejected by the approval check');
  throws(() => reportedFactPolicy.verifyApproval(loaded.policy, null),
    'a missing approval record is rejected by the approval check');

  /* The shared assessment interface `acceptFact` enforces the policy. */
  check.deepEqual(
    reportedFactPolicy.acceptFact({ label: 'Discharged', raw: '01/01/2020', normalized: '2020-01-01', ambiguous: false, associated: true, contradictions: [] }),
    { accepted: true, reason: null },
    'a clearly labelled, unambiguous, correctly associated fact is accepted'
  );
  check.equal(
    reportedFactPolicy.acceptFact({ label: 'Discharged', raw: '01/01/2020', normalized: '2020-01-01', ambiguous: false, associated: true, contradictions: [{ record: 2, label: 'Discharged', value: '2020-01-02' }] }).accepted,
    false, 'a contradictory fact is withheld'
  );
  check.equal(
    reportedFactPolicy.acceptFact({ label: 'Discharged', raw: '01/01/2020', normalized: '2020-01-01', ambiguous: false, associated: false }).accepted,
    false, 'a fact not associated with the correct record is withheld'
  );
  check.equal(
    reportedFactPolicy.acceptFact({ label: 'Discharged', raw: '01/01/2020', normalized: '2020-01-01', ambiguous: true, associated: true }).accepted,
    false, 'an ambiguous fact is withheld'
  );
  check.equal(
    reportedFactPolicy.acceptFact({ label: '', raw: '01/01/2020', normalized: '2020-01-01', ambiguous: false, associated: true }).accepted,
    false, 'an unlabelled fact is withheld'
  );
  check.equal(
    reportedFactPolicy.acceptFact(null).accepted,
    false, 'a missing reading is withheld, never guessed'
  );

  /* ================= 2. The general intake accepts only a clearly established discharge date ================= */
  const accepted = generalIntake.extract(
    bureauModel(['Equifax  Consumer Credit Report', 'Report Date: 12 June 2026', 'Bankruptcy  Discharged 01/01/2020']),
    { country: 'CA' }
  );
  check.deepEqual(dischargeDates(accepted.records), ['2020-01-01'], 'an explicit discharge date on a bankruptcy record is accepted');
  const acceptedField = accepted.records.find((r) => r.facts && r.facts['bankruptcy.dischargeDate']).printed['bankruptcy_discharge_date'];
  check.equal(acceptedField.raw, '01/01/2020', 'the raw label/value is preserved');
  check.equal(acceptedField.source, 'CLEARLY_LABELLED_REPORTED_FACT', 'the fact is labelled as a clearly established reported fact');
  check.equal(acceptedField.policy, 'OWNER-EVIDENCE-001', 'the fact records the policy it was accepted under');
  check.equal(acceptedField.policy_version, '1.0', 'the fact records the policy version');

  /* Equivalent facts across layouts. */
  const altLayout = generalIntake.extract(
    bureauModel(['Equifax  Consumer Credit Report', 'Report Date: 12 June 2026', 'PUBLIC RECORD: BANKRUPTCY - Date of Discharge: 01/01/2020']),
    { country: 'CA' }
  );
  check.deepEqual(dischargeDates(altLayout.records), ['2020-01-01'], 'the same discharge date is accepted from an equivalent layout');

  /* Ambiguous: a month-only discharge date is not an unambiguous date. */
  const monthOnly = generalIntake.extract(
    bureauModel(['Equifax  Consumer Credit Report', 'Report Date: 12 June 2026', 'Bankruptcy  Discharged Jan 2020']),
    { country: 'CA' }
  );
  check.deepEqual(dischargeDates(monthOnly.records), [], 'a month-only discharge date is ambiguous and withheld');

  /* Two separate bankruptcies can legitimately have different discharge dates: they are NOT contradictory,
     and the repeat-bankruptcy evidence is preserved for the rule's exception analysis. */
  const twoBankruptcies = generalIntake.extract(
    bureauModel(['Equifax  Consumer Credit Report', 'Report Date: 12 June 2026', 'Bankruptcy  Discharged 01/01/2020', 'Bankruptcy  Discharged 01/01/2021']),
    { country: 'CA' }
  );
  check.deepEqual(dischargeDates(twoBankruptcies.records), ['2020-01-01', '2021-01-01'], 'two separate bankruptcies keep their own discharge dates');

  /* A single record printing two incompatible discharge dates is a same-record contradiction and is withheld. */
  const sameRecordContradiction = generalIntake.extract(
    bureauModel(['Equifax  Consumer Credit Report', 'Report Date: 12 June 2026', 'Bankruptcy  Discharged 01/01/2020, Discharged 02/02/2020']),
    { country: 'CA' }
  );
  check.deepEqual(dischargeDates(sameRecordContradiction.records), [], 'two incompatible discharge dates on the same record are contradictory and withheld');

  /* Mis-associated: a collection entry that is "discharged" is a different word, not a bankruptcy discharge. */
  const collectionDischarge = generalIntake.extract(
    bureauModel(['Equifax  Consumer Credit Report', 'Report Date: 12 June 2026', 'Collection  Discharged 01/01/2020']),
    { country: 'CA' }
  );
  check.deepEqual(dischargeDates(collectionDischarge.records), [], 'a collection discharge is not associated with a bankruptcy record and is withheld');

  /* A trustee's discharge is never substituted for the consumer's discharge. */
  const trustee = generalIntake.extract(
    bureauModel(['Equifax  Consumer Credit Report', 'Report Date: 12 June 2026', 'Bankruptcy  Trustee Discharge 01/01/2020']),
    { country: 'CA' }
  );
  check.deepEqual(dischargeDates(trustee.records), [], "a trustee's discharge is never substituted for the consumer's discharge");

  /* A filing/update date is never substituted. */
  const filingDate = generalIntake.extract(
    bureauModel(['Equifax  Consumer Credit Report', 'Report Date: 12 June 2026', 'Bankruptcy  Filed 01/01/2020', 'Bankruptcy  Updated 02/02/2021']),
    { country: 'CA' }
  );
  check.deepEqual(dischargeDates(filingDate.records), [], 'a filing or update date is never substituted for the discharge date');

  /* The policy version is recorded in the assessment's factual view. */
  check.deepEqual(accepted.evidence_readings.factual_view.policy_statements, [{ policy_id: 'OWNER-EVIDENCE-001', version: '1.0' }], 'the policy version used is recorded in the assessment');

  /* ================= 3. The CA-NS bankruptcy adapter uses the reported discharge date ================= */
  const adapter = ruleAdapters.ADAPTERS.find((a) => a.adapter_id === 'CA-NS-CRA-S10-3-E-BANKRUPTCY-6Y');
  check.equal(adapter.anchor_mode, 'SINGLE_FIELD', 'the CA-NS bankruptcy check no longer withholds the discharge date as a legal event');
  check.deepEqual(adapter.anchor_field, ['bankruptcy.dischargeDate'], 'it anchors on the clearly labelled discharge date');
  check.deepEqual(adapter.record_kinds, ['GENERAL_PUBLIC_RECORD'], 'it runs on public-record entries');
  check.equal(adapter.output_permission.finding_allowed, false, 'accepting the fact does not authorize a finding');
  check.equal(adapter.output_permission.max_conclusion, 'observation', 'the ceiling stays observation, not a finding');
  check.equal(adapter.presentation_required, 'PR-01', 'the exact-specimen PR-01 restriction is preserved');

  /* Use the fact for the applicable calculation: under the admitted PR-01 presentation it evaluates. */
  const exceeded = ruleAdapters.runAdapter('CA-NS-CRA-S10-3-E-BANKRUPTCY-6Y', {
    country: 'CA', region: 'CA-NS', presentation: 'PR-01',
    facts: { 'bankruptcy.dischargeDate': '2020-01-01' }, referenceDate: '2026-10-01'
  });
  check.equal(exceeded.state, 'EVALUATED', 'the CA-NS bankruptcy check evaluates from the discharge date without a court document');
  check.equal(exceeded.outcome, 'PERIOD_EXCEEDED', 'six years after a 2020 discharge is exceeded by a 2026 report');
  check.deepEqual(exceeded.anchor.field, ['bankruptcy.dischargeDate'], 'the comparison anchor is the discharge date');

  const notExceeded = ruleAdapters.runAdapter('CA-NS-CRA-S10-3-E-BANKRUPTCY-6Y', {
    country: 'CA', region: 'CA-NS', presentation: 'PR-01',
    facts: { 'bankruptcy.dischargeDate': '2024-01-01' }, referenceDate: '2026-10-01'
  });
  check.equal(notExceeded.outcome, 'PERIOD_NOT_EXCEEDED', 'a discharge inside six years is not exceeded');

  /* The exact-specimen restriction is preserved: a general report does not broaden the CA-NS statutory surface. */
  const generalRefused = ruleAdapters.runAdapter('CA-NS-CRA-S10-3-E-BANKRUPTCY-6Y', {
    country: 'CA', region: 'CA-NS', presentation: 'GENERAL-BUREAU-REPORT',
    facts: { 'bankruptcy.dischargeDate': '2020-01-01' }, referenceDate: '2026-10-01'
  });
  check.equal(generalRefused.state, 'REFUSED', 'a general report is still refused by the exact-specimen presentation restriction');

  /* Finding emission remains unconditionally refused. */
  let threw = false;
  try { ruleAdapters.emitFinding(); } catch (err) { threw = true; }
  check.equal(threw, true, 'emitFinding still refuses unconditionally — accepting the fact authorizes no finding');

  /* End-to-end: the general intake accepts the discharge date, but the CA-NS statutory surface stays exact-specimen. */
  const generalCaExt = formats.extractWithSharedAdapter(
    bureauModel(['Equifax  Consumer Credit Report', 'Report Date: 12 June 2026', 'Bankruptcy  Discharged 01/01/2020']),
    { mode: 'REPORT', country: 'CA' }
  );
  check.ok(generalCaExt.records.some((r) => r.facts && r.facts['bankruptcy.dischargeDate'] === '2020-01-01'), 'a general CA report with a discharge date has the fact extracted');
  const generalCaEval = evaluation.evaluateCase({ country: 'CA', region: 'CA-NS', extraction: generalCaExt });
  check.equal(generalCaEval.results.length, 0, 'the CA-NS statutory surface stays exact-specimen: no comparison is performed on a general report');

  evidence.policy = { id: loaded.policy.policy_id, version: loaded.policy.version, digest: loaded.digest };
  evidence.accepted = dischargeDates(accepted.records);
  evidence.withheld = { ambiguous: true, contradictory: true, mis_associated: true, trustee: true, filing_or_update: true };
  evidence.adapter = { anchor_mode: adapter.anchor_mode, anchor_field: adapter.anchor_field, presentation_required: adapter.presentation_required, max_conclusion: adapter.output_permission.max_conclusion };
  return evidence;
}

module.exports = {
  run,
  id: 'ac-evidence-policy',
  title: 'Reported-fact policy v1.0: immutable digest, enforced acceptance of a clearly labelled discharge date, and preserved exact-specimen restriction'
};
