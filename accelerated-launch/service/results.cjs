'use strict';
/**
 * results.cjs — plain-language results with evidence locations and qualifications.
 *
 * OWNER-ALL82-001 / B2, plan section 3: "Results must identify checks performed, unresolved checks and
 * unsupported inputs" and "Never describe the product as checking all possible legal issues."
 *
 * Two rules shape this module:
 *   • The consumer surface renders `plain` strings ONLY. Machine codes, admission identifiers, adapter ids
 *     and source-entry ids stay in `machine`, for audit, and never reach the UI (plan section 6).
 *   • A comparison is never described as a violation, and a check that did not run is never described as a
 *     check that passed.
 */

const { COMPARISON_OUTCOME } = require('../adapters/evaluation-primitives.cjs');
const { readSupportQualification } = require('./coverage-matrix.cjs');
const issues = require('./issues.cjs');
const { checklistFor } = require('./common-error-checklist.cjs');

const SET_QUALIFICATIONS = Object.freeze([
  'These checks read your report. A violation is shown when report evidence supports a breach of a defined reporting rule or requirement.',
  'Only the checks named below were run against your report.',
  'No check of every possible legal issue was made, and none is implied.',
  /* B6-INGEST-001: generated from the registry so the count of named presentations can never drift. */
  readSupportQualification(),
  'A check can also be reported as not applicable to your report, or as unresolved. Neither one ran, and neither one passed.',
  'A report-data rule can support a violation from source-linked report facts. An applicable statute may provide additional context.',
  'Each finding states the supporting report evidence and any specific uncertainty.',
  'A date comparison is arithmetic. On its own it does not show that anything was reported unlawfully.'
]);

/** Plain language for one adapter result. Never upgrades the state, never adds certainty. */
function plainStatement(machine, check, recordIndex, recordNoun) {
  if (!machine) return { headline: 'This check produced no result.', detail: null };
  const years = machine.arithmetic && machine.arithmetic.period_years ? machine.arithmetic.period_years : null;
  /* BLOCKER-REPORT-DATA-TO-ISSUE-001 (real-report repair): an internal record kind ("tradeline") is never the
     consumer's word for their own entry, and where a consumer word is used the internal index number is dropped
     with it. A record kind without a consumer word keeps the pre-existing wording exactly. */
  const CONSUMER_NOUNS = { tradeline: 'an account on your report', 'enquiry row': 'an enquiry on your report' };
  const noun = recordNoun || 'account';
  const consumerNoun = CONSUMER_NOUNS[recordNoun] || null;
  const where = consumerNoun ? consumerNoun : (recordIndex === null ? 'your report' : `${noun} ${recordIndex}`);

  if (machine.state === 'EVALUATED' && machine.outcome === COMPARISON_OUTCOME.PERIOD_EXCEEDED) {
    const finding = machine.finding || null;
    if (finding && finding.classification === 'PROBABLE_VIOLATION') {
      return {
        headline: `More than ${years} years have passed since the date this rule measures from on ${where}, and your report states that date's correspondence to the actual court event is unverified.`,
        detail:
          'The comparison runs from the date your report prints. Your report also says that date has not been ' +
          'verified against the court event, so the actual event date cannot be established from this report.'
      };
    }
    if (finding && finding.classification === 'VIOLATION') {
      return {
        headline: `More than ${years} years have passed since the date this rule measures from on ${where}.`,
        detail: 'The printed date exceeds the reporting period recorded for this rule.'
      };
    }
    return {
      headline: `More than ${years} years have passed since the date this rule measures from on ${where}.`,
      detail:
        'This is a comparison of two dates printed on your report. It is not a statement that anything was ' +
        'reported unlawfully, and this check identified no violation.'
    };
  }
  if (machine.state === 'EVALUATED' && machine.outcome === COMPARISON_OUTCOME.PERIOD_NOT_EXCEEDED) {
    return {
      headline: `${years} years have not yet passed since the date this rule measures from on ${where}.`,
      detail: 'This is a comparison of two dates printed on your report. This check identified no violation.'
    };
  }
  if (machine.state === 'WITHHELD') {
    return {
      headline: 'This check was withheld because the provision it comes from does not run from any date your report prints.',
      detail: 'The rule measures from a legal event rather than a report field, so no comparison was made.'
    };
  }
  if (machine.state === 'UNRESOLVED') {
    return {
      headline: 'The date this check runs from could not be read, so the comparison was not made.',
      detail:
        'A date that could not be read is not the same as a date that is absent from your report. Nothing was ' +
        'assumed in its place.'
    };
  }
  if (machine.state === 'REFUSED') {
    return {
      headline: 'This check could not be run against your file.',
      detail: 'The check is bound to a report format that your uploaded file did not match.'
    };
  }
  if (machine.state === 'EVALUATED' && machine.outcome === 'CONTENT_OMITTED') {
    const finding = machine.finding || null;
    if (finding && finding.classification === 'VIOLATION' && finding.content_omission) {
      const omitted = finding.content_omission.omitted.join(' and ') || 'required content';
      return {
        headline: `A judgment on ${where} is reported without ${omitted}.`,
        detail: 'This is a reporting issue under a governed report-content rule: the judgment entry is complete and readable, and it omits content the rule requires.'
      };
    }
    return { headline: `A judgment on ${where} was assessed for required content.`, detail: 'This check identified no violation from the judgment entry.' };
  }
  if (machine.state === 'EVALUATED' && machine.outcome === 'CONTENT_INCLUDED') {
    const finding = machine.finding || null;
    if (finding && finding.classification === 'VIOLATION' && finding.content_inclusion) {
      const included = finding.content_inclusion.included.join(' and ') || 'prohibited content';
      return {
        headline: `A criminal charge on ${where} is reported with ${included}.`,
        detail: 'This is a reporting issue under a governed report-content rule: the report includes content the rule prohibits.'
      };
    }
    return { headline: `A criminal charge on ${where} was assessed for prohibited content.`, detail: 'This check identified no violation from the criminal-charge entry.' };
  }
  return { headline: check ? `This check returned ${machine.state}.` : 'This check returned no usable result.', detail: null };
}

function evidenceFrom(record) {
  if (!record || !record.location) return null;
  return {
    section: record.location.section,
    field: record.location.label,
    page: record.location.page,
    line: record.location.line,
    account_number_in_report: record.location.record_index,
    account_starts_at: record.location.record_starts_at,
    account_ends_at: record.location.record_ends_at,
    printed_value: record.raw_value
  };
}

/**
 * One factual check as the consumer surface may show it, with its own plain qualification: the consumer is told
 * in one short sentence that a difference we show is not a finding.
 */
function renderFactualCheck(entry) {
  const qualification = entry.check_class === 'PRINTED_POLICY_OBSERVATION'
    ? 'This compares something your report says about itself with a date it prints. It is not a finding that a rule was broken.'
    : 'This compares two things your report prints. It is not a finding that a rule was broken.';
  return {
    check_class: entry.check_class,
    check_name: entry.title,
    outcome: entry.outcome,
    agreement: entry.agreement,
    headline: entry.plain,
    detail: entry.reason,
    evidence: entry.evidence || null,
    examined: entry.examined || [],
    not_examinable: entry.not_examinable || [],
    output_level: entry.output_level,
    is_a_finding: false,
    qualification
  };
}

/** Only actual unresolved printed fields, with their owning account and source; never inferred absence. */
function unresolvedReportFields(extraction, evaluation) {
  const fields = [];
  for (const record of (extraction && extraction.records) || []) {
    const seen = new Set();
    for (const field of Object.values(record.printed || {})) {
      if (!field || typeof field !== 'object' || field.state !== 'UNRESOLVED' || !['date', 'amount'].includes(field.kind)) continue;
      const loc = field.location || record.location || null;
      const key = JSON.stringify([field.kind, field.raw, loc && loc.page, loc && loc.line]);
      if (seen.has(key)) continue;
      seen.add(key);
      const lowConfidence = /^LOW_CONFIDENCE_OCR/.test(field.reason || '');
      fields.push({
        account_number_in_report: record.record_index,
        bureau: record.bureau || null,
        kind: field.kind,
        label: field.label || field.kind,
        raw_reading: field.raw || null,
        accepted_as_fact: false,
        reason: field.reason || 'UNRESOLVED_READING',
        location: loc,
        plain: lowConfidence
          ? `We could not read this ${field.kind} confidently. Its OCR reading was not accepted as a fact.`
          : `This ${field.kind} could not be resolved from the report. Its reading was not accepted as a fact.`,
        affected_checks: [...new Set([
          ...(evaluation.unresolved_checks || []).filter(c => c.record_index === record.record_index).map(c => c.citation || c.plain),
          ...(evaluation.results || []).filter(c => c.record_index === record.record_index && c.machine && c.machine.state === 'UNRESOLVED').map(c => c.check && c.check.citation)
        ].filter(Boolean))],
        qualification: 'Any check requiring this unresolved value stays incomplete. Independently readable facts can still be checked.'
      });
    }
  }
  return fields;
}

/**
 * BLOCKER-REPORT-DATA-TO-ISSUE-001 (real-report repair): the printed label a comparison MEASURED FROM, taken
 * from the run's own anchor. A comparison whose anchor is known is never attributed to a neighbouring field:
 * telling a consumer that a rule measures from a date the rule does not measure from is a wrong statement about
 * the comparison, even when the arithmetic itself is right. Only declared anchors with a printed label of their
 * own are mapped here; every other run keeps the record's own source field exactly as before.
 */
const ANCHOR_FIELD_LABELS = Object.freeze({
  'tradeline.lastPaymentDate': 'Last Payment Date'
});

function anchorFieldOf(machine) {
  const anchor = machine && machine.anchor ? machine.anchor : null;
  if (!anchor) return null;
  const field = Array.isArray(anchor.field) ? anchor.field[0] : anchor.field;
  return typeof field === 'string' ? field : null;
}

/** The record's own five-state reading of the anchor's printed label, when that label is one this build knows. */
function anchorReading(record, field) {
  const label = ANCHOR_FIELD_LABELS[field] || null;
  if (!label || !record || !record.printed) return null;
  const reading = record.printed[label];
  return reading && typeof reading === 'object' ? reading : null;
}

/** The evidence for one comparison: the anchor's OWN printed reading when it is known, else the record's. */
function evidenceForAnchor(record, field) {
  const reading = anchorReading(record, field);
  if (!reading) return evidenceFrom(record);
  const loc = record.location || {};
  return {
    section: loc.section || null,
    field: ANCHOR_FIELD_LABELS[field],
    page: reading.location ? reading.location.page : null,
    line: reading.location ? reading.location.line : null,
    account_number_in_report: record.record_index,
    account_starts_at: loc.account_starts_at || null,
    account_ends_at: loc.account_ends_at || null,
    printed_value: reading.raw || null
  };
}

/** Build the consumer-facing result set. `machine` is retained for audit and is never rendered by the UI. */
function renderResultSet(input) {
  const evaluation = input.evaluation;
  const extraction = input.extraction || null;
  const recordsByIndex = new Map((extraction ? extraction.records : []).map((r) => [r.record_index, r]));

  /* B6-INGEST-003: an accepted upload that yields no usable record facts must say so explicitly, so a
     consumer is never left believing a substantive review occurred when nothing could be examined. */
  const admitted = Boolean(extraction && extraction.admission && extraction.admission.admitted === true);
  const resolvedRecords = (extraction && extraction.records) ? extraction.records.filter((r) =>
    r.status === 'RESOLVED' || r.shared_facts_status === 'RESOLVED').length : 0;
  const readButNoUsableFacts = admitted && resolvedRecords === 0;

  const rendered = evaluation.results.map((row) => {
    const record = row.record_index === null ? null : recordsByIndex.get(row.record_index) || null;
    const plain = plainStatement(row.machine, row.check, row.record_index, record ? record.kind_label : null);
    const finding = row.machine && row.machine.finding ? row.machine.finding : null;
    const anchorField = anchorFieldOf(row.machine);
    return {
      account_number_in_report: row.record_index,
      check_name: row.check ? row.check.citation : null,
      measures_from: ANCHOR_FIELD_LABELS[anchorField] || (record && record.source_field ? record.source_field : null),
      headline: plain.headline,
      detail: plain.detail,
      evidence: evidenceForAnchor(record, anchorField),
      output_level: row.check ? row.check.output_ceiling : null,
      assessment_completed: Boolean(row.machine && row.machine.state === 'EVALUATED'),
      is_a_finding: Boolean(finding),
      classification: finding ? finding.classification : null,
      consumer_label: finding ? issues.consumerLabel({ ...finding, adapter_id: row.machine.adapter_id }) : null,
      decisive_fact_unavailable: finding ? (finding.decisive_fact_unavailable || null) : null,
      /* OWNER-GAP-FINDING-002-RESOURCE-001: the structured, source-linked decisive-facts-unavailable entries
         (identity, report-reading evidence and source location), surfaced beside a PROBABLE finding. */
      decisive_facts_unavailable: finding ? (finding.decisive_facts && finding.decisive_facts.length ? finding.decisive_facts : null) : null,
      /* GAP-FINDING-003: the admitted-source version (digest) is retained beside the finding so the assessment
         binds to the exact rule text it evaluated. The internal source-entry id stays in `machine` for audit
         and never reaches the UI. */
      rule_source_version: finding ? (finding.source_version || null) : (row.check ? row.check.source_version || null : null),
      omitted_content: finding && finding.content_omission ? finding.content_omission.omitted || [] : null,
      included_content: finding && finding.content_inclusion ? finding.content_inclusion.included || [] : null,
      /* GAP-FINDING-004: the source-linked fact evidence for a finding — the exact printed raw value, its
         page/line location, its normalization and its uncertainty — so the consumer result traces to the report
         that printed the fact. It is the consumer's own report, never another account's evidence. */
      rule_source: finding && finding.evaluation && finding.evaluation.required_facts && finding.evaluation.required_facts[0] && finding.evaluation.required_facts[0].source
        ? {
            raw_value: finding.evaluation.required_facts[0].source.raw_value,
            location: finding.evaluation.required_facts[0].source.location,
            normalization: finding.evaluation.required_facts[0].source.normalization,
            uncertainty: finding.evaluation.required_facts[0].source.uncertainty
          }
        : null,
      qualification: finding
        ? issues.consumerText(plain.detail || 'The supporting report facts and rule are shown below.')
        : 'This comes from your report. It is not a finding that a rule was broken.',
      machine: row.machine
    };
  });

  const checkNotRun = evaluation.unavailable_checks.map(sanitizeCheck);
  const factualRanAlready = Boolean(evaluation.factual_checks && evaluation.factual_checks.performed.length);
  const otherRanAlready = Boolean(evaluation.common_errors && evaluation.common_errors.performed.length
    || evaluation.detected_report_information && evaluation.detected_report_information.performed.length
    || evaluation.assessments_performed > 0);
  if (!rendered.length && !factualRanAlready && !otherRanAlready && !checkNotRun.length && !evaluation.unresolved_checks.length) {
    checkNotRun.push({
      citation: null,
      reason: 'NO_APPLICABLE_CHECK_FOR_THIS_SELECTION',
      plain: 'No check is ready for this selection yet, so nothing was run and nothing is implied about this report.'
    });
  }

  /* Applicability is reported as its own two groups, never mixed into `checks_not_run` and never counted as a
     performed check. A limb that does not reach this report and a limb whose applicability the report leaves
     open are different statements from a check that was run, and the consumer surface shows them as such. */
  const notApplicable = (evaluation.not_applicable_checks || []).map((entry) => Object.assign(sanitizeCheck(entry), {
    account_number_in_report: entry.record_index === undefined ? null : entry.record_index,
    applicability: entry.applicability,
    applicability_rule: entry.applicability_rule,
    evidence: entry.evidence || null,
    extraction_status: entry.extraction_status === undefined ? null : entry.extraction_status
  }));
  const applicabilityUnresolved = (evaluation.unresolved_applicability || []).map((entry) => Object.assign(sanitizeCheck(entry), {
    account_number_in_report: entry.record_index === undefined ? null : entry.record_index,
    applicability: entry.applicability,
    applicability_rule: entry.applicability_rule,
    evidence: entry.evidence || null,
    extraction_status: entry.extraction_status === undefined ? null : entry.extraction_status
  }));
  /* B3 continuation: the factual surface, rendered as its own group and never mixed into the statutory
     observations. A factual check is a check that ran, so it IS counted; a factual check that could not
     examine anything is NOT, and it is reported in its own bucket beside its reason. */
  const factual = evaluation.factual_checks || null;
  const factualPerformed = (factual ? factual.performed : []).map(renderFactualCheck);
  const factualNotExamined = (factual ? factual.not_examinable : []).map(renderFactualCheck);
  const factualNotApplicable = (factual ? factual.not_applicable : []).map(renderFactualCheck);
  const factualUnresolved = (factual ? factual.unresolved_applicability : []).map(renderFactualCheck);
  const assessmentKinds = evaluation.assessment_kinds || (rendered.length ? ['STATUTORY_RULE_COMPARISON'] : []);
  /* OWNER-ACCEPT-007: DETECTED REPORT INFORMATION, its own group. Each entry records what the report prints
     (with source evidence) and carries the off-report legal dependency — never a finding, never a legal conclusion. */
  const detected = evaluation.detected_report_information ? evaluation.detected_report_information.performed : [];
  const detectedRendered = detected.map((c) => ({
    check_name: c.check_id,
    check_class: c.check_class,
    output_level: c.output_level,
    classification: null,
    is_a_finding: false,
    marker: c.marker,
    label: c.label,
    state: c.state,
    detail: c.plain,
    legal_dependencies: c.legal_dependencies,
    source_evidence: c.source_evidence,
    record_matches: c.record_matches,
    boilerplate_matches: c.boilerplate_matches
  }));
  /* BLOCKER-COMMON-ERRORS-001: the common-error data-consistency surface, its own group. Each is a potential
     issue with source-linked evidence — never a finding. */
  const commonErrors = evaluation.common_errors ? evaluation.common_errors.performed : [];
  const commonRendered = commonErrors.map((c) => ({
    check_name: c.check_id,
    check_class: c.check_class,
    output_level: c.output_ceiling,
    classification: null,
    is_a_finding: false,
    label: c.label,
    state: c.state,
    detail: c.plain,
    source_records: c.source_records
  }));

  const unresolvedFields = unresolvedReportFields(extraction, evaluation);
  /* GAP-FINDING-004: the enforced evidence-policy identity the findings were admitted under (policy_id + version
     + digest). It is the same for every evaluation in this process and is carried here so a finding can name the
     exact policy version that admitted its reported facts. */
  const policy = rendered.reduce((acc, o) => acc || (o.machine && o.machine.evaluation && o.machine.evaluation.policy) || null, null);
  return {
    support: evaluation.support,
    presentation_evidence: Boolean(extraction && extraction.presentation_evidence),
    jurisdiction: { country: evaluation.country, region: evaluation.region },
    policy,
    checks_performed: rendered.length + factualPerformed.length + detectedRendered.length + commonRendered.length,
    observations: rendered,
    report_consistency_checks: factualPerformed,
  /* BLOCKER-REPORT-DATA-TO-ISSUE-001 (Batch 31): the two new assessment surfaces, in their own result fields.
     They are recorded for audit and for the next-steps surface; the consumer-facing cards come from the issues
     the same assessments produce. */
  limitation_assessment: evaluation.limitation_assessment || null,
  payment_history_analysis: evaluation.payment_history_analysis || null,
  /* OWNER dual-date retention (Batch 33): the two-date comparison per period limb that ran, and its summary.
     The historical finding stays where it was; this is the current-review side. The internal adapter and rule
     identifiers are projected OUT here, exactly as the consumer surfaces drop them. */
  retention_dual_date: evaluation.retention_dual_date ? {
    check_class: evaluation.retention_dual_date.check_class,
    summary: evaluation.retention_dual_date.summary,
    performed: (evaluation.retention_dual_date.performed || []).map((p) => ({
      record_index: p.record_index,
      state: p.state,
      anchor_field: p.anchor_field || null,
      anchor_printed_date: p.anchor_printed_date || null,
      anchor_iso: p.anchor_iso || null,
      anchor_precision: p.anchor_precision || null,
      period_years: p.period_years === undefined ? null : p.period_years,
      report_reference_date: p.report_reference_date || null,
      assessment_date: p.assessment_date || null,
      at_report_date: p.at_report_date || null,
      at_assessment_date: p.at_assessment_date || null,
      later_expiry: Boolean(p.later_expiry),
      historical_position_not_established: Boolean(p.historical_position_not_established),
      current_review_warranted: Boolean(p.current_review_warranted),
      concern_withheld_because: p.concern_withheld_because || null,
      exceptions: p.exceptions || null,
      comparison_basis: p.comparison_basis || null
    }))
  } : null,
  assessments_performed: evaluation.assessments_performed || 0,
  /* OWNER correction (SOL assessment date): the date the SERVER ran THIS assessment. Persisted with the result,
     shown to the consumer, and never advanced by viewing, unlocking, rendering or downloading it again. */
  assessed_on: evaluation.assessment_clock ? (evaluation.assessment_clock.assessment_date || null) : null,
  assessment_run_at: evaluation.assessment_clock ? (evaluation.assessment_clock.assessment_run_at || null) : null,
  assessment_clock_basis: evaluation.assessment_clock ? (evaluation.assessment_clock.assessment_clock_basis || null) : null,
    detected_report_information: detectedRendered,
    common_errors: commonRendered,
    // Stable primary checklist across all 82 selections. Only PERFORMED means the check ran.
    common_error_checklist: checklistFor(evaluation),
    /* OWNER-POTENTIAL-ISSUE-001: the unified selectable issues (definite/probable/potential) for the packet. */
    issues: issues.publicIssues({ evaluation, extraction }),
    unresolved_report_fields: unresolvedFields,
    checks_not_examinable: factualNotExamined,
    checks_not_run: checkNotRun,
    checks_not_applicable: notApplicable.concat(factualNotApplicable),
    checks_applicability_unresolved: applicabilityUnresolved.concat(factualUnresolved),
    applicability_summary: evaluation.applicability_summary || null,
    checks_unresolved: evaluation.unresolved_checks.map((c) => Object.assign(sanitizeCheck(c), { account_number_in_report: c.record_index })),
    eligibility: evaluation.eligibility,
    assessment: {
      kinds: assessmentKinds,
      performed_by_kind: evaluation.checks_performed_by_kind || null,
      factual_summary: evaluation.factual_summary || null,
      common_error_summary: evaluation.common_error_summary || null,
      statutory_checks_performed: rendered.length,
      factual_checks_performed: factualPerformed.length,
      common_error_checks_performed: commonRendered.length,
      plain: assessmentPlain(assessmentKinds, rendered.length, factualPerformed.length,
        commonRendered.length, evaluation.assessments_performed || 0)
    },
    qualifications: SET_QUALIFICATIONS.slice(),
    read_but_no_usable_facts: readButNoUsableFacts
      ? {
          plain: 'Your upload was accepted as a plausible credit report and read, but no usable record facts (such as a dated account, collection, inquiry or public-record entry) could be extracted from it. This is not a review of your report and nothing was concluded. Upload a clearer or complete copy that shows the relevant entries with their dates, and the compatible checks will run against them.',
          what_was_read: (extraction && extraction.summary) ? extraction.summary : null,
          additional_material_needed: 'a clearer or complete copy showing account, collection, inquiry or public-record entries with their dates'
        }
      : null,
    /* BLOCKER-FDT-001: recovery is consequential. When reading was incomplete, the result names the affected
       checks and the recovery that ran (facts added, bounded attempts) — never "no issues" from unread content. */
    reading_limitations: unresolvedFields.length ? {
      ...(extraction && extraction.reading_limitations || {}), limited: true, incomplete: true,
      affected_checks: [...new Set([...(extraction && extraction.reading_limitations && extraction.reading_limitations.affected_checks || []), ...unresolvedFields.flatMap(f => f.affected_checks)])],
      plain: [extraction && extraction.reading_limitations && extraction.reading_limitations.plain, 'Some report values remain unresolved. Checks requiring those values could not be completed; independently readable facts can still be checked.'].filter(Boolean).join(' '),
      never_equates_unread_with_absence: true
    } : (extraction && extraction.reading_limitations ? extraction.reading_limitations : (readButNoUsableFacts ? { limited: true, incomplete: true, affected_checks: ['STATUTORY_RULE_COMPARISON', 'REPORT_FACT_CONSISTENCY', 'COMMON_ERROR'], plain: 'No usable record facts could be read from your upload, so the checks could not examine it. Nothing was concluded from the unread content.', never_equates_unread_with_absence: true } : null)),
    recovery: extraction && extraction.recovery_audit
      ? {
          bounded: true,
          substitution_forbidden: extraction.recovery_audit.substitution_forbidden === true,
          recovery_attempts: (extraction.recovery_audit.recovery_attempts || []).length,
          facts_added: (extraction.recovery_audit.facts_added || []).map((f) => ({ page: f.page, line: f.line, source: f.source }))
        }
      : null,
    comprehensive_legal_check: false,
    disclaimer: 'This assessment covers the checks listed in this report.'
  };
}

/**
 * The honest one-line answer to "what kind of assessment is this?". The owner asked that it be stated
 * clearly when an assessment contains factual checks but no province-specific statutory evaluation, so the
 * sentence is built from what actually ran and never from what the build might have run.
 */
/**
 * The plain answer to "what kind of assessment is this?". It is built from what actually ran, never from what the
 * build might have run, and it is written for a consumer: short sentences, no internal class names.
 */
function assessmentPlain(kinds, statutoryCount, factualCount, commonCount = 0, otherAssessmentCount = 0) {
  if (statutoryCount > 0 || factualCount > 0 || commonCount > 0 || otherAssessmentCount > 0) {
    return 'We reviewed your report against the common-error checklist using the report facts available for each applicable check.';
  }
  return 'No findings are available from the information we could review.';
}

/**
 * A check that did not run, without its internal adapter identifier or ceiling term. The citation and the
 * plain-language statement are what the consumer surface may show; `reason` is retained for audit only. The
 * ceiling value ("violation"/"probable_violation") is an internal classification and is never surfaced on a
 * not-run / not-applicable entry.
 */
function sanitizeCheck(entry) {
  return {
    citation: entry.citation || null,
    reason: entry.reason || null,
    plain: entry.plain || null
  };
}

/** The honest one-line answer to "is anything supported here?" — used by the UI banner and the matrix. */
function availabilitySummary(evaluation) {
  const factualPerformed = evaluation.factual_checks ? evaluation.factual_checks.performed.length : 0;
  const commonPerformed = evaluation.common_errors ? evaluation.common_errors.performed.length : 0;
  const detectedPerformed = evaluation.detected_report_information ? evaluation.detected_report_information.performed.length : 0;
  const checks = evaluation.results.length + factualPerformed + commonPerformed + detectedPerformed;
  if (checks) {
    return { state: 'SOME_CHECKS_PERFORMED', checks };
  }
  if (evaluation.unresolved_checks && evaluation.unresolved_checks.length) {
    return { state: 'CHECKS_PERFORMED_NONE_RESOLVED', checks: 0 };
  }
  return { state: 'NO_APPLICABLE_CHECK_FOR_THIS_SELECTION', checks: 0 };
}

/* ---------------------------------------------------- the free results summary (OWNER-PURCHASE-FLOW-001) */

/**
 * The documented SEVERITY order used to choose the free teaser. It ranks the KIND of concern, never the strength
 * of the evidence: a definite classification does not by itself establish greater harm, so confidence is never
 * consulted here. Ties inside a rank break on the stable issue id, so one report always shows the same teaser.
 *
 *   REMOVE_ENTRY  — an entry a recorded rule says should not be reported at all (a period exceeded, or content a
 *                   rule prohibits including); the remedy would be its removal.
 *   ADD_CONTENT   — a recorded rule requires a detail the entry does not print; the remedy would be an addition.
 *   INCONSISTENCY — the report contradicts itself; no rule requires or prohibits content.
 */
const SEVERITY_ORDER = Object.freeze(['REMOVE_ENTRY', 'ADD_CONTENT', 'INCONSISTENCY']);

const TEASER_TITLE = Object.freeze({
  RETENTION: 'An entry kept longer than the recorded rule allows',
  INCLUSION: 'Content a recorded rule prohibits is being reported',
  OMISSION: 'A detail a recorded rule requires is missing from an entry',
  INCONSISTENCY: 'Two details on the report cannot both be right',
  /* BLOCKER-REPORT-DATA-TO-ISSUE-001 (real-report repair): a COMPLETENESS item that names no rule. The entry
     states an event the report itself prints and leaves the caption for it without a date, so the remedy would
     be an addition — and the title never claims that a rule requires the detail. */
  FACTUAL_COMPLETENESS: 'An entry shows an event without the date for it',
  /* BLOCKER-REPORT-DATA-TO-ISSUE-001 (Batch 31): a court-limitation concern. Its rank is the addition rank,
     because the useful next step is to verify dates the report does not show, and its title never claims that
     the bureau broke a reporting rule. */
  LIMITATION: 'A debt may be outside the time limit for a court claim',
  REPORTING_PERIOD_REVIEW: 'Debt information may have been too old to include in a consumer report',
  /* OWNER dual-date retention (Batch 33): the period appears to have ended since the report was issued. Ranked
     with the additions — the useful next step is to check the current file — and never titled as a finding. */
  LATER_EXPIRY: 'An entry may now be too old to report'
});

/** The factual COMPLETENESS items: an event the report prints whose own caption carries no date. They name no
 *  rule, so they are ranked as an addition for the teaser, and they are titled as what the report shows rather
 *  than as a requirement of any recorded rule. The mark is the PUBLIC `missing_detail` flag, because the summary
 *  is computed from the public issues and never from an internal check id. */
function isCompletenessItem(issue) {
  return Boolean(issue) && issue.missing_detail === true;
}

/** A court-limitation concern, marked on the PUBLIC issue so the summary can rank and title it. */
function isLimitationConcern(issue) {
  return Boolean(issue) && issue.limitation_concern === true;
}

/** OWNER dual-date retention (Batch 33): a period that appears to have ended since the report was issued. */
function isLaterExpiryConcern(issue) {
  return Boolean(issue) && issue.later_expiry_concern === true;
}

function isReportingPeriodConcern(issue) {
  return Boolean(issue) && issue.reporting_period_concern === true;
}

function severityRankOf(issue) {
  if (issue.basis_type === 'STATUTORY_RETENTION') return 0;
  if (issue.basis_type === 'CONTENT_FINDING') {
    /* The public issue names what was included (`content_included`); an omission carries the recorded rule's
       required-detail label instead, so the two content remedies stay distinguishable without internal fields. */
    return (issue.content_included && issue.content_included.length) ? 0 : 1;
  }
  /* A completeness item whose remedy is an addition ranks with the additions; every other factual observation
     stays an inconsistency. */
  if (isCompletenessItem(issue)) return 1;
  /* OWNER dual-date retention (Batch 33): a period that appears to have ended since the report was issued ranks
     with the additions too — the next step is to check the current file, not to treat the old report as wrong. */
  if (isLaterExpiryConcern(issue)) return 1;
  if (isReportingPeriodConcern(issue)) return 1;
  return 2;
}

function teaserTitleFor(issue, rank) {
  if (isLimitationConcern(issue)) return TEASER_TITLE.LIMITATION;
  if (isLaterExpiryConcern(issue)) return TEASER_TITLE.LATER_EXPIRY;
  if (isReportingPeriodConcern(issue)) return TEASER_TITLE.REPORTING_PERIOD_REVIEW;
  if (isCompletenessItem(issue)) return TEASER_TITLE.FACTUAL_COMPLETENESS;
  if (rank === 2) return TEASER_TITLE.INCONSISTENCY;
  if (issue.basis_type === 'CONTENT_FINDING') {
    return rank === 1 ? TEASER_TITLE.OMISSION : TEASER_TITLE.INCLUSION;
  }
  return TEASER_TITLE.RETENTION;
}

/** The first sentence of a text, so the teaser stays short. Never invents a sentence that is not there. */
function firstSentence(text) {
  const value = String(text || '').trim();
  if (!value) return null;
  const match = value.match(/^[\s\S]*?[.!?](?=\s|$)/);
  return (match ? match[0] : value).trim();
}

/** No unnecessary personal identifiers in the teaser: a printed account or creditor name is redacted first. */
function redactIdentifiers(text, issue) {
  let out = String(text || '');
  const name = issue.account_identity && issue.account_identity.name ? String(issue.account_identity.name) : '';
  if (name.length > 2) out = out.split(name).join('one account on your report');
  return out;
}

function teaserFor(issue) {
  const rank = severityRankOf(issue);
  return {
    issue_id: issue.issue_id,
    severity: SEVERITY_ORDER[rank],
    title: teaserTitleFor(issue, rank),
    confidence: issue.confidence,
    confidence_label: issues.consumerLabel(issue),
    explanation: firstSentence(redactIdentifiers(issue.explanation, issue))
  };
}

/**
 * The free summary of one rendered assessment: how many DISTINCT issues were found, how they split across the
 * three confidence categories, and ONE limited teaser. The counts are taken from the merged issue list, so the
 * several rules that support one issue are counted once, each issue sits in exactly one category, and the
 * category counts always add up to the total.
 */
function summariseAssessment(rendered) {
  const allRows = (rendered && Array.isArray(rendered.issues)) ? rendered.issues : [];
  const rows = allRows.filter(issue => !isLimitationConcern(issue) && issue.basis_type !== 'LIMITATION_ASSESSMENT');
  const by = { violation: 0, probable_violation: 0, potential: 0 };
  for (const issue of rows) {
    if (issue.confidence === 'DEFINITE') by.violation += 1;
    else if (issue.confidence === 'PROBABLE') by.probable_violation += 1;
    else if (issue.confidence === 'POTENTIAL') by.potential += 1;
  }
  const ranked = rows.slice().sort((a, b) => (severityRankOf(a) - severityRankOf(b))
    || (a.issue_id < b.issue_id ? -1 : (a.issue_id > b.issue_id ? 1 : 0)));
  return {
    distinct_total: rows.length,
    information_total: allRows.length - rows.length,
    by_confidence: by,
    categories_sum_to_total: by.violation + by.probable_violation + by.potential === rows.length,
    severity_order: SEVERITY_ORDER.slice(),
    teaser: ranked.length ? teaserFor(ranked[0]) : null,
    has_issues: rows.length > 0
  };
}

module.exports = { renderResultSet, plainStatement, availabilitySummary, assessmentPlain, renderFactualCheck, SET_QUALIFICATIONS, SEVERITY_ORDER, summariseAssessment, teaserFor };
