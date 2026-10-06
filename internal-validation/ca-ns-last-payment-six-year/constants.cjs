'use strict';
/**
 * constants.cjs — the bounded unit's identity, status vocabulary, contract literals and boundaries.
 *
 * PHASE5-001I-A. This is a rank-8 implementation artifact. It admits no rule, creates no coverage and
 * authorizes no finding: the unit's ceiling is the classification the recorded legacy governance already
 * gives it (D3 / `observation`), which this order preserves and does not override.
 *
 * Every literal below is traceable to a recorded source:
 *   - the rule, its limb and its jurisdiction: PROD-003 crosswalk (`crosswalk.json`, `CRP-LSRC-0354`,
 *     `CA-NS-CRA-S10-3-C-LIMB-1`) and the PHASE5-001O ledger row it cites;
 *   - the printed field set, the section and the two dates: PROD-003 `report_representation_register.json`;
 *   - the preserved classification: the admitted legacy artifact `rules.canada.ts`
 *     (SHA-256 90A05625AFEC4F81BDEB6568249BDEE5A45C178A20026FEA9D4F50A18AF174CF), the
 *     `CANADA_RULE_CLASSIFICATION_RECORDS` entry for `ca-ns.cra.s10_3_c.debt_retention_6y`, and the recorded
 *     legacy determinability level D3 with its permitted conclusion `observation`.
 */

const WORK_ORDER = 'PHASE5-001I-A';

const UNIT = {
  unit_id: 'CA-NS-CRA-S10-3-C-LIMB-1',
  limb: 'FIRST_LIMB_ONLY — six years after the last payment was made on the debt',
  jurisdiction: { country_code: 'CA', region_code: 'CA-NS', display_name: 'Nova Scotia', selection_is_mandatory: true },
  bureau_and_channel: 'Equifax, Canada, consumer channel',
  presentation_required: 'PR-01',
  legacy_rule_id: 'ca-ns.cra.s10_3_c.debt_retention_6y',
  source_entry_id: 'CRP-LSRC-0354',
  citation: 'Consumer Reporting Act (Nova Scotia), R.S.N.S. 1989, c. 93, s. 10(3)(c)',
  statutory_text_as_admitted:
    'A consumer reporting agency shall not include in a consumer report information regarding any debt more than ' +
    'six years after the last payment was made on the debt or, where no payment was made, more than six years ' +
    'after the date on which the default in payment occurred.',
  admitted_source_artifact: 'packages\\backend\\src\\services\\legalCorpus\\rules.canada.ts',
  admitted_source_artifact_sha256: '90A05625AFEC4F81BDEB6568249BDEE5A45C178A20026FEA9D4F50A18AF174CF',
  excluded: [
    'the default-date limb — FACT-05 is unseated on PR-01',
    'every other rule unit, jurisdiction, bureau, presentation and channel',
    'any consumer-visible output of any class'
  ]
};

/**
 * The preserved classification. The owner decided: preserve the legacy D3 / observation classification and
 * do not override it with PROBABLE_VIOLATION during this order. The recorded PROD-003 ceiling is therefore
 * NOT emitted, NOT implied and NOT relied on anywhere in this unit.
 */
const PRESERVED_CLASSIFICATION = {
  state: 'PRESERVED_LEGACY_CLASSIFICATION_NOT_OVERRIDDEN',
  legacy_rule_id: 'ca-ns.cra.s10_3_c.debt_retention_6y',
  legacy_determinability_level: 'D3',
  legacy_classification: 'REPORT_RELEVANT_BUT_NOT_DETECTABLE',
  legacy_permitted_conclusion: 'observation',
  legacy_packet_eligible: false,
  legacy_binding_rule: 'D0–D3 → `observation` (recorded legacy governance contract, determinability-level binding)',
  authority_note:
    'Legacy material is rank 10 and carries no authority in this repository (CRP_CORE_CONSTITUTION.md section 2.3). ' +
    'The classification is preserved as a recorded legacy determination because the owner directed that it be ' +
    'preserved and not overridden. It is not relied on as a finding, an admission, a coverage claim or a legal conclusion.',
  owner_decision:
    'OWNER DECISION PHASE5-001I-A: preserve the legacy D3/observation classification and do not override it with ' +
    'PROBABLE_VIOLATION during this order; the stated ceiling is not authorization to emit that finding.',
  effective_ceiling_for_this_unit: 'OBSERVATION_CLASS_ONLY_UNTIL_THE_OWNER_DECIDES_AT_GATE_5_4',
  recorded_field_name_divergence: {
    printed_field_the_unit_reads: 'Last Payment Date, inside a Collections collection record',
    legacy_required_report_field: 'tradeline.lastPaymentDate',
    state: 'RECORDED_NOT_RESOLVED',
    note:
      'The admitted legacy rule record names a tradeline field; the evidenced presentation prints the field on a ' +
      'collection record. The divergence is recorded, is not resolved here, and is a recorded basis of the ' +
      'preserved classification. It is an owner/admission question.'
  }
};

/** Fact statuses. Distinct states that can never be substituted for one another (Legal Invariant section 8). */
const FACT_STATUS = Object.freeze({
  RESOLVED: 'RESOLVED',
  EXTRACTION_UNRESOLVED: 'EXTRACTION_UNRESOLVED',
  UNSUPPORTED_PRESENTATION: 'UNSUPPORTED_PRESENTATION',
  NOT_A_DEBT_RECORD: 'NOT_A_DEBT_RECORD',
  ABSENT_FROM_REPORT: 'ABSENT_FROM_REPORT'
});


/** Internal comparison outcomes. These are arithmetic results; none of them is a legal finding. */
const COMPARISON_OUTCOME = Object.freeze({
  PERIOD_NOT_EXCEEDED: 'PERIOD_NOT_EXCEEDED',
  PERIOD_EXCEEDED: 'PERIOD_EXCEEDED',
  UNRESOLVED: 'UNRESOLVED'
});

const HEADER_LABEL = 'Request Date';
const SECTION_HEADING = 'Collections';
const RECORD_BOUNDARY_LABEL = 'Date Assigned';
const ROW_LABELS = Object.freeze([
  'Date Assigned', 'Member Name', 'Phone Number', 'Member Number', 'First Delinquency',
  'Account Number', 'Amount', 'Status', 'Balance', 'Narrative', 'Date Paid/Settled',
  'Date Verified', 'Last Payment Date'
]);
/** A region must print these to be the contract's debt record; `Date Assigned` delimits it. */
const DEBT_RECORD_REQUIRED_LABELS = Object.freeze(['Member Number', 'First Delinquency', 'Account Number', 'Amount', 'Balance']);
const DEBT_RECORD_MIN_OTHER_LABELS = 4;

/** The printed date form of this presentation: four-digit year, then month, then day (DDDD/DD/DD). */
const PRINTED_DATE_FORM = /^(\d{4})\/(\d{2})\/(\d{2})$/;

const PERIOD_YEARS = 6;

/** Synthetic markers. A document carrying any of these is a fixture masquerading as a report and is refused. */
const SYNTHETIC_MARKERS = Object.freeze([
  'SYNTHETIC TEST INPUT', 'NOT A CREDIT REPORT', 'SYNTHETIC FIXTURE', 'SAMPLE CREDIT BUREAU', 'FIXTURE'
]);

/** Each refusal reason and the fact status it produces. The mapping is fixed, not contextual. */
const REFUSAL_REASONS = Object.freeze({
  DOCUMENT_NOT_READABLE: FACT_STATUS.EXTRACTION_UNRESOLVED,
  DOCUMENT_ENCRYPTED: FACT_STATUS.EXTRACTION_UNRESOLVED,
  NOT_A_PDF_CONTAINER: FACT_STATUS.UNSUPPORTED_PRESENTATION,
  IMAGE_ONLY_OR_NO_TEXT_LAYER: FACT_STATUS.UNSUPPORTED_PRESENTATION,
  PAGE_GEOMETRY_MISMATCH: FACT_STATUS.UNSUPPORTED_PRESENTATION,
  SYNTHETIC_OR_FIXTURE_MARKER: FACT_STATUS.UNSUPPORTED_PRESENTATION,
  NOT_THE_EVIDENCED_SPECIMEN: FACT_STATUS.UNSUPPORTED_PRESENTATION
});

const BOUNDARIES = Object.freeze([
  'Internal validation only: no consumer-visible output, no upload, no deployment, no billing, no authentication.',
  'No rule is admitted, no coverage is created, no finding class exists and no gate is passed by this unit.',
  'The comparison outcomes are arithmetic results on two resolved dates; PERIOD_EXCEEDED alone is not a legal finding.',
  'A second rule unit, jurisdiction, bureau, presentation or limb requires a later work order.',
  'The report is processed locally; no report content, identifier or specimen is copied into this repository.'
]);

module.exports = {
  WORK_ORDER, UNIT, PRESERVED_CLASSIFICATION, FACT_STATUS, COMPARISON_OUTCOME,
  HEADER_LABEL, SECTION_HEADING, RECORD_BOUNDARY_LABEL, ROW_LABELS,
  DEBT_RECORD_REQUIRED_LABELS, DEBT_RECORD_MIN_OTHER_LABELS,
  PRINTED_DATE_FORM, PERIOD_YEARS, SYNTHETIC_MARKERS, REFUSAL_REASONS, BOUNDARIES
};
