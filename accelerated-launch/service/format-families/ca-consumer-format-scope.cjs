'use strict';
/**
 * ca-consumer-format-scope.cjs — what the Canadian evidence DOES and DOES NOT support, kept in one place.
 *
 * OWNER-ALL82-001 / B4, owner order: "Build a separate, evidence-supported consumer-format family adapter where
 * existing evidence permits. Preserve the original PR-01 exact-specimen admission. Do not remove its hash
 * restriction and call that family support."
 *
 * THE ANSWER FROM THE EVIDENCE IS TWO-TIERED, AND THIS MODULE STATES BOTH TIERS. The register that admits the
 * Canadian presentations (`SOURCE_CAPTURES/PROD-003/report_representation_register.json`) records exactly two
 * Canadian consumer artifacts, and it admits ONE of them:
 *
 *   • PR-01 — Equifax Canada consumer disclosure, digest-pinned. `SUPPORTED_PRESENTATION_FOR_ONE_SELECTED_UNIT`.
 *   • PR-02 — TransUnion Canada consumer disclosure. The register itself labels it
 *     `SECONDARY_CORROBORATING_PRESENTATION_NOT_ADMITTED_FOR_A_RULE_UNIT` and states, in its own words, that it
 *     is "NOT admitted as the format for any rule unit, and NOT a substitute for PR-01: its sections, record
 *     blocks and labels differ".
 *
 * B4 CONTINUATION. The owner authorized completing the report-family work on the evidence: inspect both real
 * Canadian consumer formats locally, establish separate structural contracts where appropriate, and create new
 * family-admission records when the evidence supports them. The evidence supports a contract for the TRANSUNION
 * layout — measured on the real specimen, with its own record boundary, its own date forms and its own
 * predicates — and it does NOT support one for the Equifax layout, which is still admitted by its digest alone.
 *
 * So: `FAMILY_ADMISSION` (above) is the EQUIFAX presentation's family admission, and it remains false.
 * `COUNTRY_FAMILY_ADMISSION` is what Canada supports as a country, and it is true — naming the one family that
 * exists, the module that measures it, and the three things it does not broaden.
 *
 * WHAT WAS NOT DONE, deliberately: the digest restriction on PR-01 was NOT removed, relaxed or bypassed. The
 * second real Canadian report is still REFUSED by PR-01's digest gate, and the suite proves it by presenting
 * that report and asserting the Equifax gate's refusal predicate by name.
 */

const crypto = require('node:crypto');

const COUNTRY = 'CA';

/** The one admitted Canadian presentation, with the digest that admits it. */
const ADMITTED = Object.freeze({
  presentation_id: 'PR-01',
  admission_path: 'EXACT_SPECIMEN_DIGEST',
  publisher: 'Equifax (Canada, consumer channel)',
  artifact_id: 'LEG-CONSUMER-EQ-CA',
  sha256: 'E439A4BB1E43AF640DFE7867473BE0EF8EC13B2B8654F41C31138D86A107AE5F',
  pages: 22,
  page_size: '594.96 x 841.92 pts (A4)',
  register_status: 'SUPPORTED_PRESENTATION_FOR_ONE_SELECTED_UNIT',
  boundary:
    'This one artifact, at this digest, from this consumer channel, is the supported Canadian presentation. A ' +
    'different specimen — another print date, another product, another bureau, a scan, a photograph or another ' +
    'language — is unsupported until it is separately evidenced and admitted.'
});

/**
 * A real second Canadian consumer report IS on this machine, and it is recorded here precisely because it is
 * NOT admissible: admitting it would be "two bureaus" mistaken for "one family".
 */
const RECORDED_NOT_ADMITTED = Object.freeze([
  Object.freeze({
    presentation_id: 'PR-02',
    publisher: 'TransUnion (Canada, consumer disclosure channel)',
    artifact_id: 'LEG-CONSUMER-TU-CA',
    sha256: '244D58080254D9879468A43D56DA02BC952A20579E1BE9A51F83B7378439EFB4',
    pages: 12,
    register_status: 'SECONDARY_CORROBORATING_PRESENTATION_NOT_ADMITTED_FOR_A_RULE_UNIT',
    register_boundary:
      'Admitted as evidence about the existence and the label of the field across two Canadian consumer ' +
      'disclosures. NOT admitted as the format for any rule unit, and NOT a substitute for PR-01: its sections, ' +
      'record blocks and labels differ.',
    why_the_equifax_contract_does_not_admit_it:
      'A second specimen from a second bureau with a different layout is corroboration of a FIELD, not evidence ' +
      'of the FORMAT of the Equifax presentation. Admitting it there would let a TransUnion file be read ' +
      'through an Equifax locator, which the register explicitly forbids.',
    /* B4 CONTINUATION: the same document is now admitted — through a SEPARATE contract of its own, measured on
       its own structure, with its own record boundary, date forms and predicates. The Equifax gate above is
       unchanged; this is an additional admissions path, never a widening of that one. */
    admitted_through_a_separate_contract: Object.freeze({
      family_id: 'FAM-TU-CA-CONSUMER',
      module: 'format-families/tu-ca-consumer.cjs',
      record_boundary_label: 'Creditor Name',
      printed_date_form: 'Mon D, YYYY',
      what_it_runs: 'two report-fact consistency checks over this layout; no rule unit, and never the Nova Scotia statutory limb',
      what_it_does_not_do: 'it never reads this file through the Equifax locator, and it never widens PR-01'
    })
  })
]);

/**
 * Public documentation about Canadian consumer files exists and is captured. It is documentation ABOUT field
 * names; none of it is a report presentation, and none of it can admit a consumer's own PDF.
 */
const DOCUMENTATION_ONLY = Object.freeze([
  Object.freeze({ artifact_id: 'PUB-005', publisher: 'Equifax Canada', kind: 'English annotated consumer credit file guide (12 pages)', role: 'DOCUMENTATION_ABOUT_FIELD_NAMES' }),
  Object.freeze({ artifact_id: 'PUB-006', publisher: 'Equifax Canada', kind: 'legacy English consumer user guide (4 pages)', role: 'DOCUMENTATION_ABOUT_FIELD_NAMES' }),
  Object.freeze({ artifact_id: 'PUB-007', publisher: 'Equifax Canada', kind: 'legacy French consumer user guide (4 pages)', role: 'DOCUMENTATION_ABOUT_FIELD_NAMES' }),
  Object.freeze({ artifact_id: 'PUB-008', publisher: 'FCAC', kind: 'historical educational report samples, August 2012', role: 'DOCUMENTATION_ABOUT_FIELD_NAMES' })
]);

/** No family is admitted FOR THE EQUIFAX PRESENTATION, and this is the exact condition that would change that. */
const FAMILY_ADMISSION = Object.freeze({
  admitted: false,
  family_id: null,
  reason: 'NO_EQUIFAX-CANADA_CONSUMER-FORMAT_FAMILY_IS_ADMISSIBLE_FROM_THE_EVIDENCE_ON_HAND',
  conditions_that_would_permit_one: Object.freeze([
    'at least TWO independent specimens of the SAME bureau and the SAME product, so a structural contract can be measured across documents rather than from one',
    'or one official current field/layout specification from the bureau itself, measured against at least one specimen',
    'and a structural contract that states what a document must satisfy, with the predicates a refusal can name'
  ]),
  would_change_if: 'a second same-bureau same-product Equifax Canada specimen, or an official Equifax Canada layout specification, is captured and measured',
  scope_at_which_this_holds: 'the Equifax Canada consumer presentation PR-01 only'
});

/**
 * B4 CONTINUATION — WHAT IS ADMITTED FOR CANADA AS A COUNTRY, and by which of the two independent paths.
 *
 * The owner authorized completing the report-family work: "Inspect the evidenced Equifax and TransUnion
 * consumer formats locally. Establish separate structural contracts where appropriate; do not force both bureaus
 * into one layout ... Create new family-admission records when the evidence supports them."
 *
 * The evidence supports exactly this, and nothing wider:
 *   • PR-01 — the Equifax Canada consumer disclosure, admitted BY ITS OWN PINNED DIGEST. Its family admission
 *     is still NOT given (`FAMILY_ADMISSION` above), because one specimen of that bureau is still one specimen.
 *   • FAM-TU-CA-CONSUMER — the TransUnion Canada consumer disclosure, admitted BY A MEASURED STRUCTURAL
 *     CONTRACT in a module of its own (`tu-ca-consumer.cjs`), because a REAL present-day specimen exists. Its
 *     boundary is its own and is stated in that module.
 *
 * The two paths are not interchangeable and neither one widens the other: a TransUnion file was refused by
 * PR-01's digest gate before, and it is refused by PR-01's digest gate now.
 */
const COUNTRY_FAMILY_ADMISSION = Object.freeze({
  admitted: true,
  country: COUNTRY,
  families_admitted: Object.freeze([Object.freeze({ family_id: 'FAM-TU-CA-CONSUMER', publisher: 'TransUnion (Canada, consumer channel)', module: 'format-families/tu-ca-consumer.cjs' })]),
  exact_specimen_admissions: Object.freeze([Object.freeze({ presentation_id: 'PR-01', publisher: 'Equifax (Canada, consumer channel)' })]),
  equifax_family_admitted: false,
  reason: 'ONE_CANADIAN_BUREAU_IS_EVIDENCED_FOR_A_FAMILY_AND_ONE_IS_ADMITTED_BY_DIGEST_ONLY',
  not_broadened_by_this: Object.freeze([
    'the PR-01 digest gate, which still refuses every other Equifax Canada file',
    'the CA-NS statutory limb, which stays bound to PR-01 and never runs on a TransUnion file',
    'any claim about a third Canadian bureau, another product or another print date'
  ])
});


/**
 * The plain sentence the coverage surface renders for Canada. It is built from the records above, so it cannot
 * drift away from what is actually admitted.
 */
function coverageSentence() {
  const families = COUNTRY_FAMILY_ADMISSION.families_admitted.map((row) => `${row.family_id} (${row.publisher})`).join(', ');
  return (
    `Canada: TWO presentations are supported, by two independent paths. ${ADMITTED.presentation_id} — the ` +
    `${ADMITTED.publisher} consumer disclosure — is admitted by its OWN PINNED DIGEST, and no Equifax Canada ` +
    'consumer-FORMAT FAMILY is admitted, so a different Equifax Canada file is refused rather than read. ' +
    `Separately, a measured structural contract admits ${families}: the TransUnion Canada consumer disclosure, ` +
    'whose record boundary, printed date forms and field labels are its own and are not borrowed from the ' +
    'Equifax layout. Applicable Canadian rules and factual-error checks run on the readable facts each reader supplies. ' +
    'The captured Canadian guides are documentation about field names, not report presentations.'
  );
}

/** A stable digest of this scope record, so a change to it is visible to the release check. */
function scopeDigest() {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify({
      admitted: ADMITTED.presentation_id,
      not_admitted: RECORDED_NOT_ADMITTED.map((row) => row.presentation_id),
      equifax_family: FAMILY_ADMISSION.admitted,
      country_families: COUNTRY_FAMILY_ADMISSION.families_admitted.map((row) => row.family_id)
    }))
    .digest('hex');
}

module.exports = {
  COUNTRY,
  ADMITTED,
  RECORDED_NOT_ADMITTED,
  DOCUMENTATION_ONLY,
  FAMILY_ADMISSION,
  COUNTRY_FAMILY_ADMISSION,
  coverageSentence,
  scopeDigest
};
