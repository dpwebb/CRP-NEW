'use strict';
/**
 * evaluation.cjs — applicable, observation-only evaluation through B1's rule adapters.
 *
 * OWNER-ALL82-001 / B2. This module owns three boundaries and invents no fourth:
 *
 *   1. APPLICABILITY IS NOT OPTIONAL. Only adapters whose recorded association is CONFIRMED may be selected.
 *      A relation is resolved from the explicit per-region records, never from a pattern: a national check
 *      reaches a region because the records file carries a named row for it, and for no other reason.
 *   2. RECORDS DO NOT BORROW FROM EACH OTHER. A per-record check runs once per extracted record with that
 *      record's OWN fact object (`factsForRecord`), so two collection records produce two independent
 *      comparisons with their own anchors, anniversaries and day counts. A check that declares
 *      `record_kinds` runs only on records of those kinds.
 *   3. A CHECK THAT DID NOT RUN IS NOT A CHECK PERFORMED. A refused check is reported with the checks that
 *      did not run, beside its reason, and never counted as a result.
 *   4. THE CEILING IS OBSERVATION. Nothing here emits a finding; `emitFinding` is not reachable from this
 *      module, and every result is stamped with its adapter's recorded ceiling.
 */

const adapters = require('../adapters/rule-adapters.cjs');
const { RESULT_STATE } = require('../adapters/evaluation-primitives.cjs');
const { factsForRecord, factSourcesForRecord, carriesReportEvidence, SUPPORT, EXTRACTION_ADAPTERS } = require('./formats.cjs');
const { APPLICABILITY_STATE, resolveApplicability } = require('./applicability.cjs');
const { runFactualChecks } = require('./factual-checks.cjs');
const { runDetectedReportInformation, CHECK_CLASS } = require('./content-assessments.cjs');
const { runCommonErrorChecks, CHECK_CLASS: COMMON_ERROR_CLASS } = require('./common-errors.cjs');
const reaging = require('./reaging.cjs');
const limitationAssessment = require('./limitation-assessment.cjs');
const paymentHistoryAnalysis = require('./payment-history-analysis.cjs');
const { activeAdapter } = require('./common-error-scope.cjs');
const { reportReference } = require('./report-fact-sources.cjs');

const CASE_LEVEL_ANCHOR_MODES = Object.freeze(['NOT_REPORT_EVIDENCED']);
const REGISTERED_PRESENTATIONS = new Set(EXTRACTION_ADAPTERS.map((a) => a.presentation_id).concat(['GENERAL-BUREAU-REPORT']));

function adapterConfig(adapterId) {
  return adapters.ADAPTERS.find((a) => a.adapter_id === adapterId) || null;
}

/**
 * A check the runner REFUSED did not run. It is reported with the checks that did not run, beside its own
 * reason, and it is NEVER counted as a performed check — otherwise a case with nothing readable would
 * advertise a check count it never earned.
 */
function refusedCheckEntry(entry, config, descriptor, machine) {
  const required = config.presentation_required || null;
  const list = required ? (Array.isArray(required) ? required : [required]) : [];
  const registered = list.length > 0 && list.some((p) => REGISTERED_PRESENTATIONS.has(p));
  const out = Object.assign({}, descriptor, {
    adapter_id: entry.adapter_id,
    reason: machine.refusal_reason,
    plain: registered
      ? 'This check is written for a report format your uploaded file did not match, so it was not run.'
      : 'This check is written for a report format this build cannot read yet, so it was not run. Nothing was inferred from your file in its place.'
  });
  if (required !== null && !registered) out.unadmitted_presentation_required = true;
  return out;
}

/**
 * Which adapters an explicit selection may actually run, and which are held back. `confirmed` comes from the
 * adapter's own applicability evaluation, not from a guess in this module.
 */
function applicableAdapters(region) {
  let entries;
  try {
    entries = adapters.adaptersForRegion(region);
  } catch {
    entries = [];
  }
  const confirmed = [];
  const unconfirmed = [];
  for (const entry of entries) {
    if (!activeAdapter(entry.adapter_id)) continue;
    if (entry.confirmed === true) confirmed.push(entry);
    else unconfirmed.push(entry);
  }
  return { confirmed, unconfirmed };
}

function checkDescriptor(adapterId) {
  const config = adapterConfig(adapterId);
  if (!config) return null;
  return {
    adapter_id: config.adapter_id,
    citation: config.citation,
    limb: config.limb || null,
    output_ceiling: (config.output_permission && config.output_permission.max_conclusion) || 'observation',
    packet_eligible: Boolean(config.output_permission && config.output_permission.packet_eligible),
    source_entry_id: config.source_entry_id || null,
    source_version: config.source_version || null
  };
}

function runOne(adapterId, context, facts, factSources) {
  return adapters.runAdapter(adapterId, {
    country: context.country,
    region: context.region,
    facts: facts || {},
    fact_sources: factSources || null,
    referenceDate: context.referenceDate,
    /* OWNER dual-date retention (Batch 33): the ONE server assessment date of this run, so the same limb can be
       measured against the report date (historical) and the assessment date (current). */
    assessmentDate: context.assessment_clock ? context.assessment_clock.assessment_date : (context.assessmentDate || null),
    presentation: context.presentation,
    report: context.report || null,
    consumer_statements: Array.isArray(context.consumer_statements) ? context.consumer_statements : null
  });
}

/**
 * OWNER dual-date retention (Batch 33): gather the two-date comparison from every period limb that ran, so the
 * consumer surface can raise ONE current-review concern per entry+rule. The historical comparison stays where it
 * always was (the finding/observation and its count); this bucket adds only the "has the period ended since?"
 * side, keyed on the same anchor, period, precision and ambiguity handling.
 */
function collectRetentionDates(results) {
  const performed = [];
  const summary = {
    rows: 0,
    already_outside_at_both_dates: 0,
    inside_at_report_outside_at_assessment: 0,
    inside_at_both_dates: 0,
    report_date_missing_but_assessment_compared: 0,
    not_comparable: 0,
    current_review_warranted: 0,
    rule_violations_emitted: 0
  };
  for (const row of results || []) {
    const dual = row && row.machine ? row.machine.retention_dates : null;
    if (!dual) continue;
    summary.rows += 1;
    if (dual.state === 'ALREADY_OUTSIDE_AT_REPORT_AND_ASSESSMENT') summary.already_outside_at_both_dates += 1;
    else if (dual.state === 'INSIDE_AT_REPORT_OUTSIDE_AT_ASSESSMENT') summary.inside_at_report_outside_at_assessment += 1;
    else if (dual.state === 'INSIDE_AT_BOTH') summary.inside_at_both_dates += 1;
    else if (dual.state === 'REPORT_DATE_MISSING_OUTSIDE_AT_ASSESSMENT') summary.report_date_missing_but_assessment_compared += 1;
    else summary.not_comparable += 1;
    if (dual.current_review_warranted) summary.current_review_warranted += 1;
    performed.push(Object.assign({ record_index: row.record_index }, dual));
  }
  return { check_class: 'RETENTION_DUAL_DATE', performed, summary };
}

/**
 * GAP-FINDING-001: the DISTINCT bankruptcy discharge dates a report prints. A duplicate listing or a
 * cross-bureau copy of the same bankruptcy prints the same discharge date and is ONE event, not two; only
 * distinct discharge dates evidence distinct bankruptcy events. Nothing here is inferred from a balance,
 * purpose, bureau or filename.
 */
function bankruptcyDischargeDates(records) {
  return [...new Set(
    (records || [])
      .filter((r) => r && r.facts && typeof r.facts === 'object' && typeof r.facts['bankruptcy.dischargeDate'] === 'string' && r.facts['bankruptcy.dischargeDate'])
      .map((r) => r.facts['bankruptcy.dischargeDate'])
  )].sort();
}

/**
 * Run the applicable checks for one case against one extraction record.
 *
 * Returns a result set whose rows each name the record they came from. A row with `record_index: null` is a
 * case-level check that no single record anchors.
 */
function evaluateCase(context) {
  const extraction = context.extraction || null;
  const { confirmed, unconfirmed } = applicableAdapters(context.region);
  const base = {
    country: context.country,
    region: context.region,
    presentation: extraction ? extraction.presentation_id : null,
    support: extraction ? extraction.support : SUPPORT.ACTUAL_REPORT_EVIDENCE,
    results: [],
    unavailable_checks: [],
    unresolved_checks: [],
    /* B3 continuation: the per-record applicability state, kept as its OWN bucket. A limb that does not reach
       a record, and a limb whose applicability the report leaves open, are two different statements, and
       neither of them is a performed check. */
    not_applicable_checks: [],
    unresolved_applicability: [],
    applicability_summary: { APPLICABLE: 0, NOT_APPLICABLE: 0, APPLICABILITY_UNRESOLVED: 0, NO_RULE_DECLARED: 0 },
    /* B3 continuation: the THIRD check class, kept in its own buckets. A factual check names no statute and
       measures no legal clock; a policy observation compares the report's own printed statement with itself.
       Neither is ever counted as a statutory check, and neither is ever absent from the count. */
    factual_checks: null,
    /* OWNER-ACCEPT-007: DETECTED REPORT INFORMATION (extraction-level), kept in its own bucket. Each entry is a
       detected marker with source evidence and an off-report legal dependency — never a VIOLATION and never a
       legal conclusion. */
    detected_report_information: null,
    /* BLOCKER-COMMON-ERRORS-001: common-error data-consistency checks, in their own bucket. Each is a potential
       issue with source-linked evidence — never a VIOLATION and never a legal conclusion. */
    common_errors: null,
    // Selected owned snapshots are frozen at assessment time; reads never select a new baseline.
    reaging_baselines: [],
    /* BLOCKER-REPORT-DATA-TO-ISSUE-001 (Batch 31): the court-limitation assessment and the payment-history
       analysis, each in its own bucket and never counted as a statutory check. */
    limitation_assessment: null,
    payment_history_analysis: null,
    assessments_performed: 0,
    /* OWNER correction (SOL assessment date): the ONE stamp this run used. Set from the caller's stamp; null when
       the caller supplied none, in which case the court-limitation mechanism withholds rather than guess. */
    assessment_clock: context && context.assessment_clock ? context.assessment_clock : null,
    eligibility: { draft_eligible: false, reason: 'NO_ELIGIBLE_RESULT_IN_THIS_BATCH' }
  };

  for (const entry of unconfirmed) {
    const descriptor = checkDescriptor(entry.adapter_id);
    base.unavailable_checks.push({
      adapter_id: entry.adapter_id,
      citation: descriptor ? descriptor.citation : null,
      reason: entry.unconfirmed_dependency || 'APPLICABILITY_RELATION_UNCONFIRMED',
      plain:
        'This national check is recorded for the country but its association with your specific region is ' +
        'still unconfirmed, so it was not run.'
    });
  }

  if (!extraction) {
    base.unavailable_checks.push({ adapter_id: null, reason: 'NO_EXTRACTION_RECORDED', plain: 'No report has been read for this case yet.' });
    return base;
  }

  if (!carriesReportEvidence(extraction) && extraction.support !== SUPPORT.DEMONSTRATION_ONLY_NOT_REPORT_SUPPORT) {
    base.unavailable_checks.push({
      adapter_id: null,
      reason: extraction.refusal ? extraction.refusal.reason : 'DOCUMENT_NOT_READ',
      plain: 'Your file was not read, so no check was run against it. Nothing was inferred from the file.'
    });
    return base;
  }

  const referenceDate = extraction.reference_date ? extraction.reference_date.normalized_value : null;
  const ctx = Object.assign({}, context, { referenceDate, presentation: extraction.presentation_id });
  /* GAP-FINDING-001: report-level facts the exception evaluation may use. Only direct report facts are
     collected here — never an unrelated balance, purpose, bureau or filename. Distinct discharge dates
     (deduplicated) are collected because a duplicate listing or cross-bureau copy of the same bankruptcy
     prints the same discharge date and is ONE event, not two. */
  ctx.report = { bankruptcyDischargeDates: bankruptcyDischargeDates(extraction.records) };

  /**
   * Resolve one adapter's applicability and route it. Returns `true` when the caller must STOP: the limb does
   * not reach this record, or its applicability is unresolved. Either way nothing has been performed, and the
   * finding is filed in its own bucket so it can never be counted as a check.
   */
  const gateOnApplicability = (config, descriptor, record, recordLabel) => {
    const resolved = resolveApplicability(config, extraction, record);
    if (!resolved) return false;
    base.applicability_summary[resolved.applicability] += 1;
    if (resolved.applicability === APPLICABILITY_STATE.NOT_APPLICABLE) {
      base.not_applicable_checks.push(Object.assign({}, descriptor, {
        adapter_id: config.adapter_id,
        record_index: record ? record.record_index : null,
        applicability: resolved.applicability,
        applicability_rule: resolved.rule_id,
        reason: resolved.reason,
        plain: resolved.plain,
        evidence: resolved.evidence,
        extraction_status: record ? record.status : null,
        record_label: recordLabel || null
      }));
      return true;
    }
    if (resolved.applicability === APPLICABILITY_STATE.APPLICABILITY_UNRESOLVED) {
      base.unresolved_applicability.push(Object.assign({}, descriptor, {
        adapter_id: config.adapter_id,
        record_index: record ? record.record_index : null,
        applicability: resolved.applicability,
        applicability_rule: resolved.rule_id,
        reason: resolved.reason,
        plain: resolved.plain,
        evidence: resolved.evidence,
        extraction_status: record ? record.status : null,
        record_label: recordLabel || null
      }));
      return true;
    }
    return false;
  };

  for (const entry of confirmed) {
    const config = adapterConfig(entry.adapter_id);
    if (!config) continue;
    const descriptor = checkDescriptor(entry.adapter_id);

    if (CASE_LEVEL_ANCHOR_MODES.includes(config.anchor_mode)) {
      if (gateOnApplicability(config, descriptor, null, null)) continue;
      const machine = runOne(entry.adapter_id, ctx, {});
      if (machine.state === RESULT_STATE.REFUSED) {
        base.unavailable_checks.push(refusedCheckEntry(entry, config, descriptor, machine));
        continue;
      }
      base.results.push({ record_index: null, check: descriptor, machine });
      continue;
    }

    /* An adapter that declares the kinds of record it is written for runs ONLY on those records. A record of
       another kind restricts that check and leaves the checks written for it untouched. */
    const kinds = Array.isArray(config.record_kinds) ? config.record_kinds : null;
    const candidates = kinds ? extraction.records.filter((r) => kinds.includes(r.kind)) : extraction.records;
    if (!candidates.length) {
      base.unavailable_checks.push(Object.assign({
        adapter_id: entry.adapter_id,
        reason: kinds ? 'NO_RECORD_OF_THE_KIND_THIS_CHECK_IS_WRITTEN_FOR' : 'NO_READABLE_RECORD_TO_ANCHOR',
        plain: kinds
          ? 'This check is written for a kind of entry your report does not carry, so it was not run. Nothing is implied about the entries your report does carry.'
          : 'This check runs against an individual reported account, and no account could be read from your file.'
      }, descriptor));
      continue;
    }

    for (const record of candidates) {
      /* Applicability is resolved BEFORE the extraction gate, because a record can print the value that
         decides applicability while still being unreadable as a whole. Both readings are kept. */
      if (gateOnApplicability(config, descriptor, record, record.kind_label)) continue;
      if (record.status !== 'RESOLVED') {
        base.unresolved_checks.push({
          record_index: record.record_index,
          adapter_id: entry.adapter_id,
          citation: descriptor.citation,
          reason: record.reason || 'EXTRACTION_UNRESOLVED',
          plain:
            'The date this check runs from could not be read from ' + (record.kind_label || 'account') + ' ' +
            record.record_index + ', so the comparison was not made. A date that could not be read is not the ' +
            'same as an absent date.'
        });
        continue;
      }
      const recordContext = record.report_segment_id || Object.hasOwn(record, 'report_reference_date') ? Object.assign({}, ctx, {
        referenceDate: (reportReference(record) || {}).normalized_value || null
      }) : ctx;
      const machine = runOne(entry.adapter_id, recordContext, factsForRecord(record), factSourcesForRecord(record));
      if (machine.state === RESULT_STATE.REFUSED) {
        base.unavailable_checks.push(refusedCheckEntry(entry, config, descriptor, machine));
        continue;
      }
      base.results.push({ record_index: record.record_index, check: descriptor, machine });
    }
  }

  /* OWNER dual-date retention (Batch 33): the current-review side of every period limb that ran, in its own
     bucket. It is never counted as a statutory check, so `checks_performed` and every existing count keep their
     meaning, and the historical finding above is untouched. */
  base.retention_dual_date = collectRetentionDates(base.results);

  /* B3 continuation — the third check class. It runs only on an admitted presentation whose own reader
     produced a factual view, and only for the country that registered those checks. A refused file, a
     demonstration model and every other country produce no factual surface at all, so this can never be
     mistaken for a statutory check or for report support. */
  base.factual_checks = carriesReportEvidence(extraction)
    ? runFactualChecks({ country: context.country, region: context.region, extraction })
    : null;
  const factualPerformed = base.factual_checks ? base.factual_checks.performed : [];
  base.detected_report_information = runDetectedReportInformation({ country: context.country, region: context.region, extraction });
  const detectedPerformed = base.detected_report_information ? base.detected_report_information.performed : [];
  base.reaging_baselines = reaging.freezeBaselines(extraction, Array.isArray(context.prior_reports) ? context.prior_reports : []);
  base.common_errors = runCommonErrorChecks({ country: context.country, region: context.region, extraction,
    prior_reports: base.reaging_baselines });
  const commonPerformed = base.common_errors ? base.common_errors.performed : [];
  /* The court-limitation assessment and the payment-history analysis run on the same admitted report evidence.
     `checks_performed` keeps its existing meaning (statutory, factual, detected and common-error checks);
     the new work is reported separately in `assessments_performed` and its own summaries, so no existing count
     silently changes meaning and the assessment is never mistaken for a performed statutory check. */
  base.limitation_assessment = carriesReportEvidence(extraction)
    ? limitationAssessment.runLimitationAssessment({ country: context.country, region: context.region, extraction, assessment_clock: context.assessment_clock || null })
    : null;
  base.payment_history_analysis = carriesReportEvidence(extraction)
    ? paymentHistoryAnalysis.runPaymentHistoryAnalysis({ country: context.country, region: context.region, extraction })
    : null;
  base.assessments_performed = (base.limitation_assessment ? base.limitation_assessment.performed.length : 0)
    + (base.payment_history_analysis ? base.payment_history_analysis.summary.analyses : 0);
  base.limitation_summary = base.limitation_assessment ? base.limitation_assessment.summary : null;
  base.payment_history_summary = base.payment_history_analysis ? base.payment_history_analysis.summary : null;
  base.checks_performed_by_kind = {
    STATUTORY_RULE_COMPARISON: base.results.length,
    REPORT_FACT_CONSISTENCY: factualPerformed.filter((c) => c.check_class === 'REPORT_FACT_CONSISTENCY').length,
    PRINTED_POLICY_OBSERVATION: factualPerformed.filter((c) => c.check_class === 'PRINTED_POLICY_OBSERVATION').length,
    DETECTED_REPORT_INFORMATION: detectedPerformed.length,
    COMMON_ERROR: commonPerformed.length
  };
  base.checks_performed = base.results.length + factualPerformed.length + detectedPerformed.length + commonPerformed.length;
  base.factual_summary = base.factual_checks ? base.factual_checks.summary : null;
  base.detected_summary = base.detected_report_information ? base.detected_report_information.summary : null;
  base.common_error_summary = base.common_errors ? base.common_errors.summary : null;
  base.assessment_kinds = [
    base.results.length ? 'STATUTORY_RULE_COMPARISON' : null,
    factualPerformed.some((c) => c.check_class === 'REPORT_FACT_CONSISTENCY') ? 'REPORT_FACT_CONSISTENCY' : null,
    factualPerformed.some((c) => c.check_class === 'PRINTED_POLICY_OBSERVATION') ? 'PRINTED_POLICY_OBSERVATION' : null,
    detectedPerformed.length ? CHECK_CLASS : null,
    commonPerformed.length ? COMMON_ERROR_CLASS : null
  ].filter(Boolean);

  base.eligibility = draftEligibility(base.results);
  return base;
}

/**
 * Response-draft eligibility. The response draft (a letter addressed to a bureau) is not implemented in this
 * build, so it never flips on the packet permission. The correction packet is a separate, entitlement-gated
 * flow governed by unified Issue eligibility in `issues.cjs` and `packets.cjs`.
 */
function draftEligibility() {
  return { draft_eligible: false, reason: 'NO_ELIGIBLE_RESULT_IN_THIS_BATCH' };
}

module.exports = {
  evaluateCase,
  applicableAdapters,
  checkDescriptor,
  draftEligibility,
  bankruptcyDischargeDates,
  CASE_LEVEL_ANCHOR_MODES,
  APPLICABILITY_STATE
};
