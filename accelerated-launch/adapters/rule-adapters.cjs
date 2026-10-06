'use strict';
/**
 * rule-adapters.cjs — the concrete rule-adapter registry and runner.
 *
 * OWNER-ALL82-001 / B1. An adapter binds ONE recorded rule to: the jurisdiction it may run in, the fact it
 * is measured from, the period it is measured over, the presentation it is admitted on, and the ceiling on
 * what it may say. The runner is fail-closed in every direction:
 *
 *   • No jurisdiction, or a partial one, refuses the run (EXPLICIT_COUNTRY_AND_REGION_REQUIRED). A rule may
 *     never run under an unstated or defaulted jurisdiction.
 *   • A region the adapter is not recorded for refuses the run (JURISDICTION_MISMATCH). A national check may
 *     serve several regions ONLY through an explicit, recorded applicability relation, and that relation is
 *     resolved by LOOKING THE REGION UP in `applicability-records.json` — never by matching a pattern such as
 *     `US-*`. A region that relation carries no row for is a mismatch, not a default. Applicability and
 *     execution are separate: a confirmed relation may still execute nothing, and it says why.
 *   • An unsupported presentation is refused before any date is read; an unresolvable fact is UNRESOLVED.
 *     An unresolved fact is never defaulted, imputed or carried from a neighbouring field.
 *   • An adapter with no operand withholds (NOT_REPORT_EVIDENCED) rather than ageing from a date the
 *     provision does not name.
 *   • The output ceiling caps, but never selects, a finding class. ACCEPT-004: a finding is DERIVED from a
 *     per-assessment legal-evaluation record and CAPPED by `max_conclusion`. An incomplete observation (an
 *     unresolved governing legal threshold) yields no finding; so does an unresolved exception or a missing
 *     breach determination. `emitFinding` is the single guarded path and refuses when no finding is derived.
 *
 * This is a catalog and an evaluator of RECORDED behavior. A `PERIOD_EXCEEDED` result is an arithmetic
 * result, not a legal finding, not a coverage claim, and not a launch-ready verdict.
 */

const CONFIG = require('./adapter-configs.json');
const APPLICABILITY = require('./applicability-records.json');
const primitives = require('./evaluation-primitives.cjs');
const reportedFactPolicy = require('../reported-fact-policy.cjs');
const reportUse = require('./report-use.cjs');

const { RESULT_STATE, ADAPTER_FACT_STATUS, COMPARISON_OUTCOME } = primitives;

/* GAP-FINDING-004: the enforced evidence-policy identity that every evaluation binds to. It is loaded once per
   process from the owner-approved policy record (policy_id + version + digest), so a finding can name the exact
   policy version that admitted its reported facts. */
function policyIdentity() {
  const loaded = reportedFactPolicy.loadPolicy();
  return {
    policy_id: loaded.policy.policy_id,
    version: loaded.policy.version,
    digest: loaded.digest
  };
}

const ADAPTERS = Object.freeze(CONFIG.adapters.map((a) => Object.freeze(Object.assign({}, a))));
const ADAPTER_INDEX = new Map(ADAPTERS.map((a) => [a.adapter_id, a]));

/**
 * The explicit applicability records, indexed. OWNER-ALL82-001 / B3 replaced every pattern-based national
 * relation with one named row per canonical region, so a region is reached by LOOKING IT UP, never by
 * arithmetic on its name.
 */
const RELATION_INDEX = new Map(APPLICABILITY.relations.map((relation) => [
  relation.relation_id,
  Object.freeze({
    relation_id: relation.relation_id,
    country: relation.country,
    instrument: relation.instrument,
    instrument_class: relation.instrument_class,
    execution: relation.execution,
    adapter_ids: relation.adapter_ids,
    region_rows: new Map(relation.region_rows.map((row) => [row.region, row]))
  })
]));

const REQUIRED_ADAPTER_FIELDS = ['adapter_id', 'legacy_rule_id', 'source_entry_id', 'source_version', 'applicability', 'period_years', 'anchor_mode'];

/**
 * OWNER-CA-CORRECTION-PACKET-001 (extended by OWNER-POTENTIAL-ISSUE-001): the rules whose VIOLATION findings
 * may be assembled into a consumer correction/verification packet. This is a PER-FINDING authorization: every
 * other rule records `packet_eligible: false` and is rejected here if it ever records `true`. The four rules
 * added below are EXISTING admitted findings whose issue-specific source facts, uncertainty and request wording
 * are recorded in `service/issues.cjs`; no observation-only or unauthorized adapter is enabled.
 */
const PACKET_ELIGIBLE_RULE_IDS = Object.freeze([
  'US-CA-CCRAA-1785-13-A-1-BANKRUPTCY-10Y',
  'US-CA-CCRAA-1785-13-A-4-TAX-LIEN-PAID-7Y',
  'US-CA-CCRAA-1785-13-A-5-COLLECTION-7Y',
  'CA-NS-CRA-S10-3-F-DISMISSED-CHARGE',
  'CA-NL-CPBPA-S39-1-G-DISMISSED-CHARGE',
  'AU-PRIVACY-ACT-1988-S20W-ITEM3-ENQUIRY-5Y',
  'AU-PRIVACY-ACT-1988-S20W-ITEM4-DEFAULT-5Y',
  'AU-PRIVACY-ACT-1988-S20W-ITEM1-LIABILITY-2Y',
  /* BATCH-12: the Manitoba judgment-content omission (C.C.S.M. c. P34 s.4(e)). Its finding is available only
     where a COMPLETE judgment entry establishes that the amount is absent — a definite content omission with its
     own printed source, an unresolved or unreadable field never reaching a finding — and its issue-specific
     source facts, uncertainty (the Family Support Enforcement address exception) and correction request are
     recorded in service/issues.cjs. */
  'CA-MB-PIA-S4-E-JUDGMENT-CONTENT-OMISSION',
  /* BATCH-16: Prince Edward Island s.9(3)(j). Period-less CONTENT_INCLUSION on a printed charge disposition
     PEI's own words name (dismissed, set aside or not proceeded with), with the issue-specific source facts,
     uncertainty and request recorded in service/issues.cjs. */
  'CA-PE-CRA-S9-3-J-DISMISSED-CHARGE',
  /* BATCH-18: New Brunswick s.10(3)(f) on the operative 2017 Act. */
  'CA-NB-CRSA-S10-3-F-JUDGMENT-CONTENT-OMISSION',
  /* BATCH-19: Saskatchewan s.18(j). */
  'CA-SK-CRA-S18-J-JUDGMENT-CONTENT-OMISSION',
  /* BATCH-14: Prince Edward Island s.9(3)(d). Available only where a COMPLETE judgment entry establishes
     that the amount is absent — never on an unresolved or unreadable field — with its issue-specific source
     facts, uncertainty and correction request recorded in service/issues.cjs. */
  'CA-PE-CRA-S9-3-D-JUDGMENT-CONTENT-OMISSION'
]);
const PACKET_ELIGIBLE_RULE_ID_SET = new Set(PACKET_ELIGIBLE_RULE_IDS);

/** Structural self-check of the catalog. Fails loudly rather than running a half-specified adapter. */
function verifyConfigs() {
  const problems = [];
  const seen = new Set();
  for (const adapter of ADAPTERS) {
    for (const field of REQUIRED_ADAPTER_FIELDS) {
      if (adapter[field] === undefined || adapter[field] === null) problems.push(`${adapter.adapter_id}: missing ${field}`);
    }
    if (seen.has(adapter.adapter_id)) problems.push(`${adapter.adapter_id}: duplicate adapter_id`);
    seen.add(adapter.adapter_id);
    const perm = adapter.output_permission || {};
    /* ACCEPT-003 D4: findings are authorized for specifically permitted rules only. Every rule must record a
       boolean finding_allowed; when true, max_conclusion must be a finding class, and packet_eligible stays
       false for every rule. */
    if (typeof perm.finding_allowed !== 'boolean') problems.push(`${adapter.adapter_id}: finding_allowed must be a boolean`);
    if (perm.finding_allowed === true && !['violation', 'probable_violation'].includes(perm.max_conclusion)) {
      problems.push(`${adapter.adapter_id}: finding_allowed true requires max_conclusion violation|probable_violation`);
    }
    /* OWNER-CA-CORRECTION-PACKET-001 (extended by OWNER-POTENTIAL-ISSUE-001): packet eligibility is per-finding
       and conditional. Only the enumerated admitted findings in PACKET_ELIGIBLE_RULE_IDS may record
       `packet_eligible: true`, and only with a violation ceiling. */
    if (typeof perm.packet_eligible !== 'boolean') {
      problems.push(`${adapter.adapter_id}: packet_eligible must be a boolean`);
    } else if (perm.packet_eligible === true) {
      if (!PACKET_ELIGIBLE_RULE_ID_SET.has(adapter.adapter_id)) {
        problems.push(`${adapter.adapter_id}: packet_eligible true is only authorized for the enumerated admitted findings`);
      }
      if (perm.finding_allowed !== true || perm.max_conclusion !== 'violation') {
        problems.push(`${adapter.adapter_id}: packet_eligible true requires finding_allowed true and max_conclusion violation`);
      }
    }
    const app = adapter.applicability || {};
    if (!['EXACT', 'EXPLICIT_REGION_RELATION'].includes(app.mode)) {
      problems.push(`${adapter.adapter_id}: unsupported applicability mode ${app.mode}`);
    }
    if (app.mode === 'EXACT' && (!app.country || !app.region)) problems.push(`${adapter.adapter_id}: EXACT applicability needs country and region`);
    if (app.mode === 'EXPLICIT_REGION_RELATION') {
      if (!app.country || !app.relation_id) {
        problems.push(`${adapter.adapter_id}: an explicit region relation needs its country and its relation id`);
      } else {
        const relation = RELATION_INDEX.get(app.relation_id);
        if (!relation) problems.push(`${adapter.adapter_id}: relation ${app.relation_id} is not in applicability-records.json`);
        else if (!relation.adapter_ids.includes(adapter.adapter_id)) {
          problems.push(`${adapter.adapter_id}: relation ${app.relation_id} does not bind this adapter`);
        } else if (!relation.region_rows.size) {
          problems.push(`${adapter.adapter_id}: relation ${app.relation_id} carries no region rows`);
        }
      }
    }
    if (adapter.record_kinds !== undefined
      && (!Array.isArray(adapter.record_kinds) || !adapter.record_kinds.length
        || adapter.record_kinds.some((k) => typeof k !== 'string' || !/^[A-Z][A-Z_]{2,63}$/.test(k)))) {
      problems.push(`${adapter.adapter_id}: record_kinds must be a non-empty list of record-kind tokens`);
    }
    if (adapter.anchor_mode === 'SINGLE_FIELD' && !adapter.anchor_field) problems.push(`${adapter.adapter_id}: SINGLE_FIELD needs anchor_field`);
    if (adapter.anchor_mode === 'PRIORITY_CHAIN' && !Array.isArray(adapter.anchor_fields)) problems.push(`${adapter.adapter_id}: PRIORITY_CHAIN needs anchor_fields`);
  }
  return problems;
}

/**
 * Applicability gate. Throws JURISDICTION_MISMATCH rather than returning a soft result: a rule run outside
 * the jurisdiction it is recorded for is a caller error, not an evaluation.
 *
 * OWNER-ALL82-001 / B3: an `EXPLICIT_REGION_RELATION` resolves the region by LOOKING IT UP in the records
 * file. There is no pattern and no fallback. A region with no row in that relation is a mismatch, so a
 * region that was never assigned the relation can never be served by it.
 */
function evaluateApplicability(adapter, country, region) {
  const app = adapter.applicability;
  if (app.mode === 'EXACT') {
    if (country !== app.country || region !== app.region) {
      throw new Error(`JURISDICTION_MISMATCH: ${adapter.adapter_id} is recorded for ${app.country}/${app.region} only`);
    }
    return {
      state: 'EXACT_MATCH',
      confirmed: true,
      confirmation_required: false,
      basis: 'EXACT_CANONICAL_REGION_ASSOCIATION',
      relation_id: null,
      instrument: null,
      instrument_class: null,
      execution: 'EXECUTABLE_WHERE_A_BOUND_PRESENTATION_IS_ADMITTED',
      unconfirmed_dependency: null
    };
  }
  if (app.mode === 'EXPLICIT_REGION_RELATION') {
    const relation = RELATION_INDEX.get(app.relation_id);
    if (!relation) throw new Error(`UNKNOWN_APPLICABILITY_RELATION: ${app.relation_id}`);
    if (country !== relation.country) {
      throw new Error(`JURISDICTION_MISMATCH: ${adapter.adapter_id} is recorded for ${relation.country} only`);
    }
    const row = relation.region_rows.get(region);
    if (!row) {
      throw new Error(`JURISDICTION_MISMATCH: ${adapter.adapter_id} is not recorded for ${region}; relation ${relation.relation_id} carries a named row for every canonical ${relation.country} region and ${region} is not one of them`);
    }
    return {
      state: row.state,
      confirmed: row.state.startsWith('CONFIRMED'),
      confirmation_required: false,
      basis: row.basis,
      relation_id: relation.relation_id,
      relation_class: row.class,
      instrument: relation.instrument,
      instrument_class: relation.instrument_class,
      execution: relation.execution,
      region_specific_report_retention_rule_recorded: row.region_specific_report_retention_rule_recorded,
      no_recorded_source_row: row.no_recorded_source_row === true,
      unconfirmed_dependency: row.state.startsWith('CONFIRMED') ? null : 'COUNTRY_WIDE_TO_SELECTED_REGION_RELATION_REQUIRED'
    };
  }
  throw new Error(`UNSUPPORTED_APPLICABILITY_MODE: ${app.mode}`);
}

function baseResult(adapter, country, region, applicability) {
  return {
    adapter_id: adapter.adapter_id,
    legacy_rule_id: adapter.legacy_rule_id,
    source_entry_id: adapter.source_entry_id,
    requested_jurisdiction: { country, region },
    applicability,
    output_ceiling: (adapter.output_permission && adapter.output_permission.max_conclusion) || 'observation',
    finding_emitted: false,
    packet_eligible: Boolean(adapter.output_permission && adapter.output_permission.packet_eligible)
  };
}

/**
 * Run one adapter. `request` = { country, region, facts, referenceDate, presentation }.
 * Returns a result object. Throws only for caller errors (unknown adapter, unstated/mismatched
 * jurisdiction) — everything else is a recorded result state.
 */
function runAdapter(adapterId, request) {
  const adapter = ADAPTER_INDEX.get(adapterId);
  if (!adapter) throw new Error(`UNKNOWN_ADAPTER: ${adapterId}`);

  const req = request && typeof request === 'object' ? request : {};
  const country = typeof req.country === 'string' ? req.country.trim() : '';
  const region = typeof req.region === 'string' ? req.region.trim() : '';
  if (!country || !region) {
    throw new Error('EXPLICIT_COUNTRY_AND_REGION_REQUIRED: a rule may only run under an explicit jurisdiction selection');
  }

  const applicability = evaluateApplicability(adapter, country, region);
  const base = baseResult(adapter, country, region, applicability);
  base.report = req.report || null;
  base.consumer_statements = Array.isArray(req.consumer_statements) ? req.consumer_statements : null;

  const required = adapter.presentation_required;
  if (required) {
    const allowed = Array.isArray(required) ? required : [required];
    if (!allowed.includes(req.presentation)) {
      return Object.assign(base, {
        state: RESULT_STATE.REFUSED,
        fact_status: ADAPTER_FACT_STATUS.UNSUPPORTED_PRESENTATION,
        outcome: null,
        anchor: null,
        arithmetic: null,
        refusal_reason: `PRESENTATION_NOT_SUPPORTED: ${adapter.adapter_id} evaluates only ${allowed.join(' or ')}`
      });
    }
  }

  if (adapter.anchor_mode === 'NOT_REPORT_EVIDENCED') {
    return Object.assign(base, {
      state: RESULT_STATE.WITHHELD,
      fact_status: ADAPTER_FACT_STATUS.NOT_REPORT_EVIDENCED,
      outcome: 'WITHHELD_START_NOT_REPORT_EVIDENCED',
      anchor: null,
      arithmetic: null,
      refusal_reason: 'NOT_REPORT_EVIDENCED: the provision\'s start is not carried by any canonical report field',
      start_record: adapter.start_record || null
    });
  }

  /* OWNER-CANDIDATE-002: a report-content omission rule (Nova Scotia s.10(3)(d)). It has no anchor date or
     period; it runs the verified-omission evaluation from the record's own content-presence facts. */
  if (adapter.anchor_mode === 'CONTENT_OMISSION') {
    return runContentOmission(adapter, req, base);
  }

  /* OWNER-CANDIDATE-003: a report-content inclusion rule (Nova Scotia s.10(3)(f)). The report includes a
     prohibited content (a dismissed/set-aside/withdrawn/stayed criminal charge); no anchor date or period. */
  if (adapter.anchor_mode === 'CONTENT_INCLUSION') {
    return runContentInclusion(adapter, req, base);
  }

  /* OWNER-CA-ORDINARY-REPORT-001: a report-evidence RELIABILITY rule (Ontario Consumer Reporting Act s.9(3)(a),
     the recorded best-evidence-basis atomic rule). It ages nothing: it measures whether the report's own two
     printed values for one ordinary account can both be right. */
  if (adapter.anchor_mode === 'CONTENT_RELIABILITY') {
    return runContentReliability(adapter, req, base);
  }

  const referenceDate = primitives.normalizeFactDate(req.referenceDate);
  if (!referenceDate) {
    return Object.assign(base, {
      state: RESULT_STATE.UNRESOLVED,
      fact_status: ADAPTER_FACT_STATUS.EXTRACTION_UNRESOLVED,
      outcome: COMPARISON_OUTCOME.UNRESOLVED,
      anchor: null,
      arithmetic: null,
      refusal_reason: 'REPORT_REFERENCE_DATE_NOT_RESOLVED'
    });
  }

  let anchor = null;
  if (adapter.anchor_mode === 'SINGLE_FIELD') {
    const raw = (req.facts || {})[adapter.anchor_field];
    const precision = (req.facts || {})[adapter.anchor_field + 'Precision'] || null;
    const iso = primitives.normalizeFactDate(raw);
    if (iso) {
      anchor = { field: adapter.anchor_field, iso, precision, value_as_supplied: raw, selection_rule: 'DECLARED_SINGLE_FIELD' };
    } else if (precision === 'MONTH' && /^\d{4}-\d{1,2}$/.test(String(raw || '').trim())) {
      /* GAP-INGEST-006: a month-only anchor keeps its month; the comparison treats it as a whole-month range. */
      anchor = { field: adapter.anchor_field, iso: String(raw).trim(), precision: 'MONTH', value_as_supplied: raw, selection_rule: 'DECLARED_SINGLE_FIELD' };
    } else {
      /* GAP-INGEST-005: an ambiguous numeric date without a report-evidenced convention carries BOTH
         interpretations. The comparison proceeds only when they agree; otherwise it withholds. */
      const interpretations = (req.facts || {})[adapter.anchor_field + 'Interpretations'];
      if (Array.isArray(interpretations) && interpretations.length > 1) {
        anchor = { field: adapter.anchor_field, interpretations: interpretations.slice(), precision: 'AMBIGUOUS', value_as_supplied: raw, selection_rule: 'DECLARED_SINGLE_FIELD' };
      }
    }
  } else if (adapter.anchor_mode === 'PRIORITY_CHAIN') {
    anchor = primitives.resolvePriorityAnchor(req.facts, adapter.anchor_fields);
  }

  if (!anchor) {
    return Object.assign(base, {
      state: RESULT_STATE.UNRESOLVED,
      fact_status: ADAPTER_FACT_STATUS.EXTRACTION_UNRESOLVED,
      outcome: COMPARISON_OUTCOME.UNRESOLVED,
      anchor: null,
      arithmetic: null,
      refusal_reason: 'ANCHOR_FACT_NOT_RESOLVED'
    });
  }

  /* A statutory day offset (FCRA § 605(c)(1): the reporting period begins 180 days after the commencement of
     the delinquency). The offset is applied to the resolved anchor before the elapsed-period comparison. */
  if (adapter.anchor_day_offset) {
    const shifted = primitives.calendar.addDays(anchor.iso, adapter.anchor_day_offset);
    if (!shifted) {
      return Object.assign(base, {
        state: RESULT_STATE.UNRESOLVED,
        fact_status: ADAPTER_FACT_STATUS.EXTRACTION_UNRESOLVED,
        outcome: COMPARISON_OUTCOME.UNRESOLVED,
        anchor,
        arithmetic: null,
        refusal_reason: 'ANCHOR_DAY_OFFSET_COULD_NOT_BE_APPLIED'
      });
    }
    anchor = Object.assign({}, anchor, { iso: shifted, anchor_day_offset: adapter.anchor_day_offset, anchor_day_offset_basis: adapter.anchor_day_offset_basis || null });
  }

  /* A multi-fact condition (US-NY satisfied-judgment limb): the condition fact must be present and within the
     recorded window of the anchor. A condition label present without its date is a missing condition, not a met
     one, and the satisfaction date is never substituted as the start of the entry-based period. */
  if (adapter.condition_field) {
    const conditionIso = primitives.normalizeFactDate((req.facts || {})[adapter.condition_field]);
    if (!conditionIso) {
      return Object.assign(base, {
        state: RESULT_STATE.UNRESOLVED,
        fact_status: ADAPTER_FACT_STATUS.EXTRACTION_UNRESOLVED,
        outcome: COMPARISON_OUTCOME.UNRESOLVED,
        anchor,
        arithmetic: null,
        refusal_reason: 'CONDITION_FACT_NOT_RESOLVED'
      });
    }
    const windowEnd = primitives.calendar.addCalendarYears(anchor.iso, adapter.condition_within_years);
    if (conditionIso > windowEnd) {
      return Object.assign(base, {
        state: RESULT_STATE.REFUSED,
        fact_status: ADAPTER_FACT_STATUS.UNSUPPORTED_PRESENTATION,
        outcome: null,
        anchor,
        arithmetic: null,
        refusal_reason: 'CONDITION_NOT_MET: the recorded condition was not satisfied within the period this limb governs'
      });
    }
    anchor = Object.assign({}, anchor, {
      condition_field: adapter.condition_field,
      condition_iso: conditionIso,
      condition_within_years: adapter.condition_within_years,
      condition_met: true
    });
  }

  /* GAP-FINDING-004: attach the source-linked provenance (raw printed value, page/line location, normalization,
     uncertainty) for the anchor and its condition, when the intake carried it. A fact without this provenance is
     still an arithmetic comparison, but it can never become a finding. */
  if (req.fact_sources && typeof req.fact_sources === 'object' && req.fact_sources[anchor.field]) {
    anchor.source = req.fact_sources[anchor.field];
  }
  if (adapter.condition_field && req.fact_sources && req.fact_sources[adapter.condition_field]) {
    anchor.condition_source = req.fact_sources[adapter.condition_field];
  }

  /* OWNER-GAP-FINDING-002-RESOURCE-001: carry the record-owned historical-verification statement (the explicit
     report statement that the printed order-for-relief date's correspondence to the actual court event is
     unverified/unavailable). It is attached ONLY for an order-for-relief anchor, so it can never promote some
     other field to probable. */
  const anchorFieldName = Array.isArray(anchor.field) ? anchor.field[0] : anchor.field;
  if (anchorFieldName === 'publicRecord.bankruptcyOrderForReliefDate') {
    const hvKey = 'publicRecord.bankruptcyOrderForReliefDate.historicalVerification';
    const hvSource = req.fact_sources && req.fact_sources[hvKey];
    if (hvSource && hvSource.normalized_value === 'UNVERIFIED') {
      anchor.historical_verification = hvSource;
    }
  }

  let arithmetic;
  if (anchor.interpretations) {
    /* GAP-INGEST-005: run every supported interpretation; proceed only when they all agree, else withhold. */
    const runs = anchor.interpretations.map((iso) => primitives.computeElapsedPeriod(iso, referenceDate, adapter.period_years));
    const decisive = [...new Set(runs.map((r) => r.outcome).filter((o) => o === COMPARISON_OUTCOME.PERIOD_EXCEEDED || o === COMPARISON_OUTCOME.PERIOD_NOT_EXCEEDED))];
    if (decisive.length === 1 && runs.every((r) => r.outcome === decisive[0])) {
      arithmetic = Object.assign({}, runs[0], { interpretations: anchor.interpretations, interpretations_agree: true, interpretation_basis: 'ALL_INTERPRETATIONS_AGREE' });
    } else {
      arithmetic = Object.assign({}, runs[0] || {}, { outcome: COMPARISON_OUTCOME.UNRESOLVED, reason: 'AMBIGUOUS_DATE_INTERPRETATIONS_DISAGREE', interpretations: anchor.interpretations, interpretations_agree: false });
    }
  } else {
    const isMonthAnchor = /^\d{4}-\d{1,2}$/.test(anchor.iso);
    arithmetic = isMonthAnchor
      ? primitives.computeElapsedPeriodRange(anchor.iso, referenceDate, adapter.period_years)
      : primitives.computeElapsedPeriod(anchor.iso, referenceDate, adapter.period_years);
  }
  if (arithmetic.outcome === COMPARISON_OUTCOME.UNRESOLVED) {
    return Object.assign(base, {
      state: RESULT_STATE.UNRESOLVED,
      fact_status: ADAPTER_FACT_STATUS.EXTRACTION_UNRESOLVED,
      outcome: COMPARISON_OUTCOME.UNRESOLVED,
      anchor,
      arithmetic,
      refusal_reason: arithmetic.reason
    });
  }

  const evaluated = Object.assign(base, {
    state: RESULT_STATE.EVALUATED,
    fact_status: ADAPTER_FACT_STATUS.RESOLVED,
    outcome: arithmetic.outcome,
    anchor,
    arithmetic,
    refusal_reason: null
  });
  /* GAP-FINDING-001: attach the per-assessment legal-evaluation record (including the tri-state exception
     evaluation) to EVERY evaluated result, so the exception state is observable even for an observation-only
     rule that can never emit a finding. */
  evaluated.evaluation = buildEvaluationRecord(evaluated, adapter);
  evaluated.finding = classify(evaluated, adapter);
  evaluated.finding_emitted = evaluated.finding !== null;
  return evaluated;
}

/* OWNER-CANDIDATE-002 (corrected): the judgment-content omission evaluation. The required predicates are
   (1) positive judgment identity, (2) creditor-name state, (3) amount state, (4) assignment-alternative
   disposition and (5) entry completeness — each with its own source. A finding is established ONLY when the
   creditor branch is positively established (the judgment is NOT assigned — an off-report fact report evidence
   cannot show), a mandatory content is VERIFIED_ABSENT, and the entry is complete. Because "not assigned" is
   off-report, the assignment disposition is UNRESOLVED from the report and the classifier refuses. */
/* BATCH-12: which contents a content-omission limb requires, which of them are DECISIVE, and whether the
   provision carries an assignment alternative are the ADAPTER's declarations, not the engine's assumptions. A
   default (no declaration) keeps the accepted Nova Scotia behaviour exactly: creditor name and amount required
   and decisive, and the assignment alternative applying. */
const OMISSION_FACTS = Object.freeze({
  creditor_name: 'judgment.creditorNameState',
  creditor_address: 'judgment.creditorAddressState',
  amount: 'judgment.amountState'
});
const OMISSION_LABELS = Object.freeze({
  creditor_name: 'the judgment creditor name',
  creditor_address: 'the judgment creditor address',
  amount: 'the judgment amount'
});
function contentOmissionModel(adapter) {
  const declared = (adapter && adapter.content_omission) || {};
  const decisive = Array.isArray(declared.decisive_contents) ? declared.decisive_contents.slice() : ['creditor_name', 'amount'];
  const omittedFrom = Array.isArray(declared.omitted_from) ? declared.omitted_from.slice() : decisive.slice();
  return {
    decisive_contents: decisive,
    omitted_from: omittedFrom,
    /* Default TRUE, so an adapter that declares nothing keeps the accepted Nova Scotia behaviour exactly.
       Only an explicit `false` says the provision carries no assignment alternative. */
    assignment_alternative_applies: declared.assignment_alternative_applies !== false
  };
}

function runContentOmission(adapter, req, base) {
  const facts = req.facts || {};
  const model = contentOmissionModel(adapter);
  const identified = facts['judgment.recordIdentified'] === true;
  const states = {
    creditor_name: facts['judgment.creditorNameState'] || null,
    creditor_address: facts['judgment.creditorAddressState'] || null,
    amount: facts['judgment.amountState'] || null
  };
  const creditor = states.creditor_name;
  const amount = states.amount;
  const assignee = facts['judgment.assigneeState'] || null;
  const complete = facts['judgment.entryComplete'] === true;

  /* Assignment alternative: PRESENT only when the report prints an assignee (ASSIGNED). Where the adapter
     declares that its provision carries the alternative, its absence is off-report and the disposition stays
     UNRESOLVED, so it never establishes the creditor branch. Where the provision carries no such alternative,
     the alternative is not required at all and is recorded as such rather than being resolved by inference. */
  const assignmentDisposition = assignee === 'PRESENT'
    ? 'ASSIGNED'
    : (model.assignment_alternative_applies ? 'UNRESOLVED' : 'NOT_REQUIRED_BY_THIS_PROVISION');
  const assignmentSatisfied = !model.assignment_alternative_applies || assignmentDisposition === 'RESOLVED_NOT_ASSIGNED';

  const decisiveResolved = model.decisive_contents.every((key) => states[key] === 'PRESENT' || states[key] === 'VERIFIED_ABSENT');
  const decisiveMissing = model.decisive_contents.some((key) => states[key] === 'VERIFIED_ABSENT');
  const breach = identified && complete && decisiveResolved && decisiveMissing && assignmentSatisfied;

  const omitted = model.omitted_from
    .filter((key) => states[key] === 'VERIFIED_ABSENT')
    .map((key) => OMISSION_LABELS[key]);

  const result = Object.assign(base, {
    state: RESULT_STATE.EVALUATED,
    fact_status: ADAPTER_FACT_STATUS.RESOLVED,
    outcome: breach ? 'CONTENT_OMITTED' : 'CONTENT_SATISFIED_OR_UNRESOLVED',
    anchor: null,
    arithmetic: null,
    refusal_reason: null,
    content: {
      identified, entry_complete: complete, creditor_name: creditor, creditor_address: states.creditor_address,
      amount, assignee, assignment_disposition: assignmentDisposition, omitted, breach, states
    }
  });
  result._fact_sources = req.fact_sources || null;
  result.evaluation = buildContentOmissionEvaluation(result, adapter, req);
  result.finding = classify(result, adapter);
  result.finding_emitted = result.finding !== null;
  return result;
}

function buildContentOmissionEvaluation(result, adapter, req) {
  const content = result.content || {};
  const states = content.states || { creditor_name: content.creditor_name, amount: content.amount };
  const sources = (req && req.fact_sources) || {};
  const model = contentOmissionModel(adapter);
  const breach = content.breach === true;

  /* Each decisive predicate carries its own field, resolved state and source-linked provenance. The classifier
     refuses missing, mismatched or unresolved evidence; there is no fabricated resolved reference date and no
     bare breach boolean standing in for evidence. The predicate set is the ADAPTER's declaration, so a provision
     that carries no assignment alternative is not made to depend on one. */
  const required_facts = [
    { field: 'judgment.recordIdentified', role: 'positive_judgment_identity', resolved: content.identified === true, value: content.identified, source: sources['judgment.recordIdentified'] || null }
  ];
  for (const key of model.decisive_contents) {
    required_facts.push({
      field: OMISSION_FACTS[key],
      role: key + '_presence',
      resolved: states[key] === 'PRESENT' || states[key] === 'VERIFIED_ABSENT',
      value: states[key] === undefined ? null : states[key],
      source: sources[OMISSION_FACTS[key]] || null
    });
  }
  if (model.assignment_alternative_applies) {
    required_facts.push({ field: 'judgment.assigneeState', role: 'assignment_alternative_disposition', resolved: content.assignment_disposition === 'RESOLVED_NOT_ASSIGNED', value: content.assignee, disposition: content.assignment_disposition, source: sources['judgment.assigneeState'] || null });
  }
  required_facts.push({ field: 'judgment.entryComplete', role: 'entry_completeness', resolved: content.entry_complete === true, value: content.entry_complete, source: sources['judgment.entryComplete'] || null });

  const allResolved = required_facts.length > 0 && required_facts.every((f) => f.resolved === true);

  return {
    rule_identity: {
      adapter_id: adapter.adapter_id,
      legacy_rule_id: adapter.legacy_rule_id || null,
      source_entry_id: adapter.source_entry_id,
      citation: adapter.citation,
      source_version: adapter.source_version || null,
      source_artifact: adapter.source_artifact || null,
      ledger_row_ids: (adapter.ledger_row_ids || []).slice()
    },
    selected_jurisdiction: result.requested_jurisdiction || {},
    content_omission: {
      breach: breach && allResolved,
      omitted: content.omitted || [],
      creditor_name: content.creditor_name || null,
      creditor_address: states.creditor_address || null,
      amount: content.amount || null,
      assignee: content.assignee || null,
      assignment_disposition: content.assignment_disposition || null,
      entry_complete: content.entry_complete === true,
      has_judgment: content.identified === true,
      states
    },
    required_facts,
    conditions: [],
    exceptions: { evaluation_required: false, basis: 'the conditional address and the assignee alternative are off-report and unsupported here', items: [] },
    predicates_resolved: allResolved,
    breach_established: breach && allResolved,
    decisive_facts_unavailable: [],
    observation_incomplete: false,
    policy: policyIdentity()
  };
}

function classifyContentOmission(result, adapter, maxConclusion) {
  const evaluation = result.evaluation || buildContentOmissionEvaluation(result, adapter, { fact_sources: result._fact_sources || null });
  if (evaluation.rule_identity && adapter.source_version && evaluation.rule_identity.source_version !== adapter.source_version) return null;
  const c = evaluation.content_omission;
  if (!c || c.breach !== true) return null;
  if (c.entry_complete !== true || c.has_judgment !== true) return null;
  if (evaluation.predicates_resolved !== true) return null;
  if (!c.omitted || !c.omitted.length) return null;
  /* Every decisive predicate must carry a non-null, resolved source; a missing or unresolved source refuses the
     finding. The assignment disposition must be RESOLVED to the creditor branch (never true from report alone). */
  const facts = evaluation.required_facts || [];
  if (!facts.length) return null;
  for (const f of facts) {
    if (f.resolved !== true) return null;
    const src = f.source;
    if (!src || typeof src !== 'object') return null;
    if (!src.location || typeof src.location !== 'object') return null;
    if (typeof src.normalized_value !== 'string' && typeof src.normalized_value !== 'number' && typeof src.value !== 'boolean') return null;
  }
  if (!evaluation.policy || typeof evaluation.policy.digest !== 'string' || !evaluation.policy.digest) return null;
  if (maxConclusion !== 'violation') return null;
  return {
    classification: 'VIOLATION',
    evaluation,
    adapter_id: adapter.adapter_id,
    citation: adapter.citation,
    source_entry_id: adapter.source_entry_id,
    source_version: adapter.source_version || null,
    source_artifact: adapter.source_artifact || null,
    anchor: null,
    arithmetic: null,
    content_omission: c,
    decisive_fact_unavailable: null,
    decisive_facts: [],
    is_a_finding: true,
    invariant: 'CRP_LEGAL_INVARIANT.md §1 and §2.5'
  };
}

/* OWNER-CANDIDATE-003: the report-content inclusion evaluation (Nova Scotia s.10(3)(f)). A VIOLATION is
   established ONLY when a criminal charge is positively identified, its entry is complete and readable, and the
   report prints the charge AND a dismissed/set-aside/withdrawn/stayed disposition. There is no off-report
   exception. */
function runContentInclusion(adapter, req, base) {
  const facts = req.facts || {};
  const identified = facts['criminalCharge.recordIdentified'] === true;
  const charge = facts['criminalCharge.chargeState'] || null;
  const dismissed = facts['criminalCharge.dismissedDispositionState'] || null;
  const complete = facts['criminalCharge.entryComplete'] === true;
  /* BATCH-17: a provision that names its OWN disposition categories declares them here. When it does, the printed
     CATEGORY — not the shared prohibited-disposition state, which includes withdrawn and stayed — decides whether
     this limb applies, so a withdrawn or stayed charge is never claimed under a provision that does not name it.
     An adapter that declares nothing keeps the accepted behaviour exactly (names, not categories). */
  const declared = (adapter.content_inclusion && Array.isArray(adapter.content_inclusion.accepted_disposition_categories))
    ? adapter.content_inclusion.accepted_disposition_categories.slice()
    : null;
  const category = facts['criminalCharge.dismissedDispositionCategory'] || null;
  const categoryAccepted = declared !== null && category !== null && declared.indexOf(category) >= 0;

  const chargeResolved = charge === 'PRESENT' || charge === 'VERIFIED_ABSENT';
  const dismissedResolved = dismissed === 'PRESENT' || dismissed === 'VERIFIED_ABSENT';
  const breach = identified && complete && chargeResolved && charge === 'PRESENT'
    && (declared !== null ? categoryAccepted : (dismissedResolved && dismissed === 'PRESENT'));

  const included = [];
  if (charge === 'PRESENT') included.push('a criminal or summary conviction charge');
  if (declared !== null && categoryAccepted) included.push('a criminal charge disposed of as ' + declared.map((c) => c.toLowerCase().split('_').join(' ')).join(', '));
  else if (declared === null && dismissed === 'PRESENT') included.push('a dismissed, set aside, withdrawn or stayed disposition');

  const result = Object.assign(base, {
    state: RESULT_STATE.EVALUATED,
    fact_status: ADAPTER_FACT_STATUS.RESOLVED,
    outcome: breach ? 'CONTENT_INCLUDED' : 'CONTENT_NOT_INCLUDED_OR_UNRESOLVED',
    anchor: null,
    arithmetic: null,
    refusal_reason: null,
    content: { identified, entry_complete: complete, charge, dismissed, category, accepted_categories: declared, included, breach }
  });
  result._fact_sources = req.fact_sources || null;
  result.evaluation = buildContentInclusionEvaluation(result, adapter, req);
  result.finding = classify(result, adapter);
  result.finding_emitted = result.finding !== null;
  return result;
}

function buildContentInclusionEvaluation(result, adapter, req) {
  const content = result.content || {};
  const sources = (req && req.fact_sources) || {};
  const breach = content.breach === true;
  const required_facts = [
    { field: 'criminalCharge.recordIdentified', role: 'positive_criminal_charge_identity', resolved: content.identified === true, value: content.identified, source: sources['criminalCharge.recordIdentified'] || null },
    { field: 'criminalCharge.chargeState', role: 'criminal_charge_presence', resolved: content.charge === 'PRESENT' || content.charge === 'VERIFIED_ABSENT', value: content.charge, source: sources['criminalCharge.chargeState'] || null },
    { field: 'criminalCharge.dismissedDispositionState', role: 'dismissed_disposition_presence', resolved: content.dismissed === 'PRESENT' || content.dismissed === 'VERIFIED_ABSENT', value: content.dismissed, source: sources['criminalCharge.dismissedDispositionState'] || null },
    { field: 'criminalCharge.entryComplete', role: 'entry_completeness', resolved: content.entry_complete === true, value: content.entry_complete, source: sources['criminalCharge.entryComplete'] || null }
  ];
  /* BATCH-17: where the provision names its own disposition categories, the printed category is its own decisive,
     source-linked predicate; an unresolved, unbound or unsupported category refuses the finding. */
  if (content.accepted_categories && content.accepted_categories.length) {
    required_facts.splice(required_facts.length - 1, 0, {
      field: 'criminalCharge.dismissedDispositionCategory',
      role: 'disposition_category',
      resolved: content.category !== null && content.accepted_categories.indexOf(content.category) >= 0,
      value: content.category,
      source: sources['criminalCharge.dismissedDispositionCategory'] || null
    });
  }
  const allResolved = required_facts.length > 0 && required_facts.every((f) => f.resolved === true);
  return {
    rule_identity: {
      adapter_id: adapter.adapter_id,
      legacy_rule_id: adapter.legacy_rule_id || null,
      source_entry_id: adapter.source_entry_id,
      citation: adapter.citation,
      source_version: adapter.source_version || null,
      source_artifact: adapter.source_artifact || null,
      ledger_row_ids: (adapter.ledger_row_ids || []).slice()
    },
    selected_jurisdiction: result.requested_jurisdiction || {},
    content_inclusion: {
      breach: breach && allResolved,
      included: content.included || [],
      charge: content.charge || null,
      dismissed: content.dismissed || null,
      entry_complete: content.entry_complete === true,
      has_criminal_charge: content.identified === true,
      category: content.category || null,
      accepted_categories: content.accepted_categories || null
    },
    required_facts,
    conditions: [],
    exceptions: { evaluation_required: false, basis: 's.10(3)(f) has no off-report exception', items: [] },
    predicates_resolved: allResolved,
    breach_established: breach && allResolved,
    decisive_facts_unavailable: [],
    observation_incomplete: false,
    policy: policyIdentity()
  };
}

/* OWNER-CANDIDATE-003: a decisive predicate's source must MATCH the predicate's value and carry a record
   identity — not merely contain a location object. A mismatched, missing or contradictory source refuses the
   finding. */
function sourceMatchesFact(source, factValue) {
  if (!source || typeof source !== 'object') return false;
  if (source.normalized_value === undefined || source.normalized_value === null) return false;
  if (typeof factValue === 'boolean') return source.normalized_value === factValue;
  return String(source.normalized_value) === String(factValue);
}

/**
 * OWNER-CA-ORDINARY-REPORT-001 — a report-evidence RELIABILITY rule (Ontario Consumer Reporting Act, R.S.O.
 * 1990, c. C.33, s. 9(3)(a); the recorded legacy atomic rule is `ca-on.cra.s9_3_a.best_evidence_basis`).
 *
 * It ages nothing and counts no period. It measures ONE thing the report itself prints: the two dates an
 * ordinary account carries. When the printed opened date is LATER than the printed closed date, the report's own
 * values for that single account cannot both be right, and that is the affirmative evidence the recorded
 * provision concerns — a consumer reporting agency shall not include in a consumer report any credit information
 * based on evidence that is not the best evidence reasonably available (Consumer Reporting Act (Ontario),
 * R.S.O. 1990, c. C.33, s. 9(3)(a), as located and recorded in
 * SOURCE_CAPTURES/CA-ON-ORDINARY-REPORT/crp-lsrc-0362-provision-retrieval.json). No period and no arithmetic are
 * involved in the comparison; temporal applicability is a separate condition of attribution and is not claimed here.
 *
 * Both values must be RESOLVED on THIS record. A date that could not be read is not an absent date, and an
 * unreadable reading never stands in for the contradiction or for its absence.
 */
function runContentReliability(adapter, req, base) {
  const facts = req.facts || {};
  const openedField = adapter.opened_field || 'liability.openedDate';
  const closedField = adapter.closed_field || 'liability.closedDate';
  const opened = primitives.normalizeFactDate(facts[openedField]);
  const closed = primitives.normalizeFactDate(facts[closedField]);

  if (!opened || !closed) {
    return Object.assign(base, {
      state: RESULT_STATE.UNRESOLVED,
      fact_status: ADAPTER_FACT_STATUS.EXTRACTION_UNRESOLVED,
      outcome: COMPARISON_OUTCOME.UNRESOLVED,
      anchor: null,
      arithmetic: null,
      refusal_reason: 'BOTH_PRINTED_DATES_MUST_BE_RESOLVED_ON_THIS_RECORD'
    });
  }

  /* ISO dates compare lexicographically. No clock, no reference date and no period is involved: the comparison
     is between the report's own two printed values for one account. */
  const contradictory = opened > closed;
  const result = Object.assign(base, {
    state: RESULT_STATE.EVALUATED,
    fact_status: ADAPTER_FACT_STATUS.RESOLVED,
    outcome: contradictory ? 'REPORT_OWN_VALUES_CONTRADICT' : 'REPORT_OWN_VALUES_CONSISTENT',
    anchor: null,
    arithmetic: null,
    refusal_reason: null,
    content: {
      breach: contradictory,
      opened_date: opened,
      closed_date: closed,
      opened_field: openedField,
      closed_field: closedField,
      contradiction: contradictory ? `${opened} is later than ${closed}` : null,
      included: []
    }
  });
  result._fact_sources = req.fact_sources || null;
  result.evaluation = buildContentReliabilityEvaluation(result, adapter, req);
  result.finding = classify(result, adapter);
  result.finding_emitted = result.finding !== null;
  return result;
}

function buildContentReliabilityEvaluation(result, adapter, req) {
  const content = result.content || {};
  const sources = (req && req.fact_sources) || {};
  const breach = content.breach === true;
  const required_facts = [
    {
      field: content.opened_field,
      role: 'opened_date_printed_on_this_record',
      resolved: typeof content.opened_date === 'string' && content.opened_date.length > 0,
      value: content.opened_date,
      iso: content.opened_date || null,
      source: sources[content.opened_field] || null
    },
    {
      field: content.closed_field,
      role: 'closed_date_printed_on_this_record',
      resolved: typeof content.closed_date === 'string' && content.closed_date.length > 0,
      value: content.closed_date,
      iso: content.closed_date || null,
      source: sources[content.closed_field] || null
    }
  ];
  const allResolved = required_facts.length > 0 && required_facts.every((f) => f.resolved === true);
  return {
    rule_identity: {
      adapter_id: adapter.adapter_id,
      legacy_rule_id: adapter.legacy_rule_id || null,
      source_entry_id: adapter.source_entry_id,
      citation: adapter.citation,
      source_version: adapter.source_version || null,
      source_artifact: adapter.source_artifact || null,
      ledger_row_ids: (adapter.ledger_row_ids || []).slice()
    },
    selected_jurisdiction: result.requested_jurisdiction || {},
    content_reliability: {
      breach: breach && allResolved,
      opened_date: content.opened_date || null,
      closed_date: content.closed_date || null,
      opened_field: content.opened_field || null,
      closed_field: content.closed_field || null,
      contradiction: content.contradiction || null
    },
    required_facts,
    conditions: [],
    exceptions: {
      evaluation_required: false,
      basis: 'the located provision states no exception, and whether the printed values came from the best evidence reasonably available is not resolvable from the report itself, so no exception is evaluated and the conclusion ceiling stays PROBABLE_VIOLATION',
      items: []
    },
    predicates_resolved: allResolved,
    /* The contradiction between the report's own values is report-established; the accuracy DUTY is not, so a
       definite breach is never recorded from report evidence alone. */
    breach_established: false,
    decisive_facts_unavailable: [],
    observation_incomplete: false,
    policy: policyIdentity()
  };
}

/** The guarded classifier for a reliability rule. Ceiling: PROBABLE_VIOLATION, never VIOLATION. */
function classifyContentReliability(result, adapter, maxConclusion) {
  const evaluation = result.evaluation || buildContentReliabilityEvaluation(result, adapter, { fact_sources: result._fact_sources || null });
  if (evaluation.rule_identity && adapter.source_version && evaluation.rule_identity.source_version !== adapter.source_version) return null;
  const c = evaluation.content_reliability;
  if (!c || c.breach !== true) return null;
  if (evaluation.predicates_resolved !== true) return null;
  /* The report shows that its own two values cannot both be right; it never shows which of them is unreliable, nor
     whether a benign explanation applies. The ceiling is therefore a probable violation, and a 'violation'
     ceiling is refused rather than downgraded silently. */
  if (maxConclusion !== 'probable_violation') return null;
  const facts = evaluation.required_facts || [];
  if (facts.length < 2) return null;
  const recordIndexes = new Set();
  for (const f of facts) {
    if (f.resolved !== true) return null;
    const src = f.source;
    if (!src || typeof src !== 'object') return null;
    if (!src.location || typeof src.location !== 'object') return null;
    if (!sourceMatchesFact(src, f.value)) return null;
    if (src.record_index == null) return null;
    recordIndexes.add(String(src.record_index));
  }
  /* Both values must come from the SAME record: two halves of one account's own dates. A cross-record source
     refuses the finding. */
  if (recordIndexes.size !== 1) return null;
  if (!evaluation.policy || typeof evaluation.policy.digest !== 'string' || !evaluation.policy.digest) return null;
  return {
    classification: 'PROBABLE_VIOLATION',
    evaluation,
    adapter_id: adapter.adapter_id,
    citation: adapter.citation,
    period_years: null,
    source_entry_id: adapter.source_entry_id,
    source_version: adapter.source_version || null,
    source_artifact: adapter.source_artifact || null,
    anchor: null,
    arithmetic: null,
    content: c,
    content_inclusion: null,
    decisive_fact_unavailable: 'which of the two printed values is unreliable, and whether a benign explanation applies, is not established by the report',
    decisive_facts: [],
    is_a_finding: true,
    invariant: 'CRP_LEGAL_INVARIANT.md §1 and §2.5'
  };
}

function classifyContentInclusion(result, adapter, maxConclusion) {
  const evaluation = result.evaluation || buildContentInclusionEvaluation(result, adapter, { fact_sources: result._fact_sources || null });
  if (evaluation.rule_identity && adapter.source_version && evaluation.rule_identity.source_version !== adapter.source_version) return null;
  const c = evaluation.content_inclusion;
  if (!c || c.breach !== true) return null;
  if (c.entry_complete !== true || c.has_criminal_charge !== true) return null;
  if (evaluation.predicates_resolved !== true) return null;
  if (!c.included || !c.included.length) return null;
  const facts = evaluation.required_facts || [];
  if (!facts.length) return null;
  const recordIndexes = new Set();
  for (const f of facts) {
    if (f.resolved !== true) return null;
    const src = f.source;
    if (!src || typeof src !== 'object') return null;
    if (!src.location || typeof src.location !== 'object') return null;
    if (!sourceMatchesFact(src, f.value)) return null;
    if (src.record_index == null) return null;
    recordIndexes.add(String(src.record_index));
  }
  /* Every decisive predicate must agree on the SAME record identity — a cross-record source (different
     record_index across the charge/disposition facts) refuses the finding. */
  if (recordIndexes.size !== 1) return null;
  if (!evaluation.policy || typeof evaluation.policy.digest !== 'string' || !evaluation.policy.digest) return null;
  if (maxConclusion !== 'violation') return null;
  return {
    classification: 'VIOLATION',
    evaluation,
    adapter_id: adapter.adapter_id,
    citation: adapter.citation,
    source_entry_id: adapter.source_entry_id,
    source_version: adapter.source_version || null,
    source_artifact: adapter.source_artifact || null,
    anchor: null,
    arithmetic: null,
    content_inclusion: c,
    decisive_fact_unavailable: null,
    decisive_facts: [],
    is_a_finding: true,
    invariant: 'CRP_LEGAL_INVARIANT.md §1 and §2.5'
  };
}

/**
 * ACCEPT-004 / GAP-FINDING-001: derive the rule-specific exception evaluation from the adapter's recorded
 * exceptions. A report-observable exception is evaluated only from the report's own facts, and only where
 * those facts positively establish the exception (never by inferring absence or distinctness that the report
 * does not evidence). A genuinely off-report requirement stays unresolved — unknown is never defaulted to
 * false, and exception eligibility is never inferred from an unrelated account balance, purpose, bureau or
 * filename.
 *
 * GAP-FINDING-002 revisit: the CA-NS `second-bankruptcy` exception is recorded off-report. A "second
 * bankruptcy" requires a DISTINCT bankruptcy event identity (a separate case/court); the report extraction
 * produces only discharge dates, and distinct dates alone cannot distinguish a second bankruptcy from a
 * duplicate listing or a cross-bureau copy of the same event. It therefore stays unresolved in every case,
 * like the FCRA § 1681c(b) use exceptions.
 */
function buildExceptionEvaluation(adapter, report, consumerStatements) {
  const configured = adapter.exceptions || { recorded: false, items: [] };
  /* OWNER-REPORT-USE-POLICY-001: a report-use consumer statement may resolve a report-use exception item for
     the specific assessment it is bound to. It never resolves a non-consumer-resolvable item (e.g. the CA-NS
     second-bankruptcy event-identity exception), and it never converts unknown to false. ALL submitted report-use
     statements are inspected: conflicting/multiple statements leave the exception unresolved rather than letting
     the first silently win. */
  const reportUseStatements = (Array.isArray(consumerStatements) ? consumerStatements : []).filter((s) => s && s.question_id === 'report-use');
  let statement = null;
  if (reportUseStatements.length === 1) statement = reportUseStatements[0];
  else if (reportUseStatements.length > 1) statement = { question_id: 'report-use', valid: false, contradictory: true, answer: reportUse.CONTRADICTORY, reason: 'multiple conflicting report-use statements' };
  const items = (configured.items || []).map((item) => {
    const base = {
      id: item.id || null,
      text: item.text || null,
      report_observable: item.report_observable === true,
      consumer_resolvable: Boolean(item.consumer_resolution && item.consumer_resolution.purpose),
      consumer_resolution_purpose: (item.consumer_resolution && item.consumer_resolution.purpose) || null
    };
    if (base.consumer_resolvable && statement) {
      const resolution = reportUse.resolveItem(item, statement);
      return Object.assign(base, {
        applies: resolution.applies,
        resolved: resolution.resolved,
        evaluation_basis: resolution.basis,
        consumer_statement: true,
        /* Link the exception evaluation to the EXACT authoritative statement and policy identity/version. */
        statement_id: statement.statement_id || null,
        policy: reportUse.policyIdentity()
      });
    }
    if (item.report_observable === true) {
      return Object.assign(base, { applies: null, resolved: false, evaluation_basis: 'recorded as report-observable, but no report fact positively establishes whether it applies' });
    }
    return Object.assign(base, { applies: null, resolved: false, evaluation_basis: 'recorded and off-report; not determinable from the report' });
  });
  const recorded = configured.recorded === true;
  const unresolved_items = items.filter((i) => i.applies === null && i.resolved !== true);
  return {
    evaluation_required: recorded,
    basis: configured.basis || (recorded ? null : 'the approved rule text records no exception to this retention period'),
    items,
    unresolved_exception_present: unresolved_items.length > 0,
    unresolved_items
  };
}

/**
 * ACCEPT-004 (correction round 2): build the rule-specific, per-assessment legal-evaluation record from the
 * adapter's ACTUAL required predicates (anchor + condition + reference date) and recorded exceptions. Missing
 * evaluation stays explicitly unresolved; nothing is defaulted to resolved or cleared.
 */
function buildEvaluationRecord(result, adapter) {
  const jurisdiction = result.requested_jurisdiction || {};
  const anchorFields = (Array.isArray(adapter.anchor_field) ? adapter.anchor_field : [adapter.anchor_field])
    .concat(Array.isArray(adapter.anchor_fields) ? adapter.anchor_fields : [])
    .filter(Boolean);

  const required_facts = [];
  const conditions = [];

  if (result.anchor && result.anchor.iso) {
    required_facts.push({
      field: result.anchor.field,
      role: 'anchor',
      resolved: true,
      iso: result.anchor.iso,
      value_as_supplied: result.anchor.value_as_supplied || null,
      selection_rule: result.anchor.selection_rule || null,
      /* GAP-FINDING-004: the source-linked provenance for this fact — exact raw printed value, source
         document/page location, normalization and uncertainty — from the record that printed it. */
      source: result.anchor.source || null
    });
    if (result.anchor.condition_field) {
      conditions.push({
        field: result.anchor.condition_field,
        resolved: Boolean(result.anchor.condition_iso),
        iso: result.anchor.condition_iso || null,
        met: result.anchor.condition_met === true,
        within_years: result.anchor.condition_within_years || null,
        source: result.anchor.condition_source || null
      });
    }
  } else {
    for (const f of anchorFields) {
      if (f) required_facts.push({ field: f, role: 'anchor', resolved: false, iso: null, value_as_supplied: null, source: null });
    }
  }

  const referenceIso = result.arithmetic && result.arithmetic.reference_date ? result.arithmetic.reference_date : null;
  const reference_date = { resolved: Boolean(referenceIso), iso: referenceIso };

  const exceptions = buildExceptionEvaluation(adapter, result.report, result.consumer_statements);

  const predicates_resolved =
    required_facts.length > 0 &&
    required_facts.every((f) => f.resolved === true && f.iso) &&
    conditions.every((c) => c.resolved === true && c.met === true) &&
    reference_date.resolved === true;

  const breach_established =
    result.outcome === COMPARISON_OUTCOME.PERIOD_EXCEEDED &&
    predicates_resolved &&
    !adapter.observation_incomplete &&
    !exceptions.unresolved_exception_present;

  /* OWNER-GAP-FINDING-002-RESOURCE-001: when the report itself states that the printed order-for-relief date's
     correspondence to the actual court event is unverified/unavailable, that historical correspondence is the one
     decisive fact genuinely unavailable from a resolved reading. It is a structured, source-linked entry — never an
     arbitrary list, never a generic flag on an ordinary bankruptcy entry. */
  const decisive_facts_unavailable = [];
  if (result.anchor && result.anchor.historical_verification) {
    const hv = result.anchor.historical_verification;
    const loc = hv.location || {};
    decisive_facts_unavailable.push({
      identity: 'publicRecord.bankruptcyOrderForReliefDate.historical_correspondence',
      decisive: true,
      unavailable_from_resolved_reading: true,
      evidence: `the report prints an Order for Relief date (${result.anchor.value_as_supplied}) and separately states its correspondence to the actual court order is unverified and cannot be established from this disclosure` +
        (loc.page != null ? ` (page ${loc.page}${loc.line != null ? `, line ${loc.line}` : ''})` : ''),
      source: {
        raw_value: hv.raw_value || null,
        normalized_value: hv.normalized_value || null,
        location: hv.location || null,
        normalization: hv.normalization || null,
        uncertainty: hv.uncertainty || null,
        source_field: hv.source_field || null,
        record_index: hv.record_index != null ? hv.record_index : null
      }
    });
  }

  /* PHASE4-001O: a recorded exception the report cannot resolve is disclosed as unknown, never cleared. When the
     period is exceeded and every report-resolvable fact is resolved, an unresolved exception is a decisive fact
     unavailable from a resolved reading and may support only a PROBABLE verification request (never VIOLATION). */
  for (const item of (exceptions.unresolved_items || [])) {
    decisive_facts_unavailable.push({
      identity: `exception:${item.id || 'unresolved'}`,
      decisive: true,
      unavailable_from_resolved_reading: true,
      evidence: item.evaluation_basis || item.text || 'an exception to this retention period cannot be resolved from this report'
    });
  }

  return {
    selected_jurisdiction: jurisdiction,
    rule_identity: {
      adapter_id: adapter.adapter_id,
      citation: adapter.citation,
      source_entry_id: adapter.source_entry_id,
      legacy_rule_id: adapter.legacy_rule_id,
      /* GAP-FINDING-003: the admitted source version is the SHA-256 digest of the admitted source artifact.
         It binds the evaluation to the exact governed/admitted rule text, not just a citation or legacy id. */
      source_version: adapter.source_version || null,
      source_artifact: adapter.source_artifact || null,
      ledger_row_ids: (adapter.ledger_row_ids || []).slice()
    },
    required_facts,
    reference_date,
    timing: result.arithmetic || null,
    conditions,
    exceptions,
    breach_established,
    predicates_resolved,
    decisive_facts_unavailable,
    observation_incomplete: Boolean(adapter.observation_incomplete),
    /* GAP-FINDING-004: the enforced evidence-policy identity this evaluation admits its facts under. */
    policy: policyIdentity()
  };
}

/**
 * ACCEPT-004 (correction round 2): the pure classification decision. The class is DERIVED from a COMPLETE
 * evaluation record and only CAPPED by the permission ceiling. A record that is missing jurisdiction, rule
 * identity, required resolved facts, reference date, timing, a resolved condition, or an explicitly resolved
 * exception evaluation yields no finding. A nonempty `decisive_facts_unavailable` list must carry, per entry,
 * identity, decisiveness and evidence of genuine unavailability from a resolved reading — otherwise it is
 * refused as an arbitrary list.
 */
function classifyEvaluation(evaluation, maxConclusion) {
  if (!evaluation) return null;
  if (evaluation.observation_incomplete) return null;
  if (!evaluation.breach_established) return null;
  if (evaluation.predicates_resolved !== true) return null;

  const jurisdiction = evaluation.selected_jurisdiction;
  if (!jurisdiction || typeof jurisdiction.country !== 'string' || !jurisdiction.country
    || typeof jurisdiction.region !== 'string' || !jurisdiction.region) return null;

  const identity = evaluation.rule_identity;
  if (!identity || !identity.adapter_id || !identity.source_entry_id || !identity.citation) return null;
  /* GAP-FINDING-003: an absent admitted-source version blocks the finding — a citation or legacy id is not a
     binding to the exact governed/admitted rule text. */
  if (typeof identity.source_version !== 'string' || !identity.source_version) return null;

  const facts = evaluation.required_facts || [];
  if (!facts.length) return null;
  if (!facts.every((f) => f && f.resolved === true && typeof f.iso === 'string' && f.iso && f.field)) return null;

  /* GAP-FINDING-004: a finding must be source-linked. Every resolved fact must carry the exact raw printed
     value, its source document/page location, and its normalization; an absent or misassociated source blocks
     the finding. A citation, an ISO value or a declared field alone is not enough. */
  for (const f of facts) {
    const src = f.source;
    if (!src || typeof src !== 'object') return null;
    if (!src.location || typeof src.location !== 'object') return null;
    if (typeof src.raw_value !== 'string' || !src.raw_value) return null;
    if (typeof src.normalized_value !== 'string' || !src.normalized_value) return null;
    if (src.normalized_value !== f.iso && src.normalized_value !== f.value_as_supplied) return null;
  }
  if (!evaluation.policy || typeof evaluation.policy.digest !== 'string' || !evaluation.policy.digest) return null;

  if (!evaluation.reference_date || evaluation.reference_date.resolved !== true || !evaluation.reference_date.iso) return null;
  if (!evaluation.timing || evaluation.timing.outcome !== 'PERIOD_EXCEEDED') return null;

  const conditions = evaluation.conditions || [];
  if (!conditions.every((c) => c && c.resolved === true && c.met === true)) return null;

  const exceptions = evaluation.exceptions;
  if (!exceptions || typeof exceptions.evaluation_required !== 'boolean') return null;
  if (exceptions.evaluation_required === true) {
    if (!exceptions.items || !exceptions.items.length) return null;
    for (const e of exceptions.items) {
      if (e.applies === true) return null;
      if (e.resolved !== true) return null;
    }
  } else if (exceptions.items && exceptions.items.length) {
    return null;
  }

  const decisive = evaluation.decisive_facts_unavailable || [];
  if (decisive.length) {
    const valid = decisive.every((d) => d && typeof d.identity === 'string' && d.identity
      && d.decisive === true && d.unavailable_from_resolved_reading === true
      && typeof d.evidence === 'string' && d.evidence);
    if (!valid) return null;
    return (maxConclusion === 'violation' || maxConclusion === 'probable_violation') ? 'PROBABLE_VIOLATION' : null;
  }

  return maxConclusion === 'violation' ? 'VIOLATION' : null;
}

/**
 * PHASE4-001O (Branch B): the QUALIFIED assessment path, kept separate from definite proof. It runs only when
 * the definite classifier withholds because a recorded exception cannot be resolved from the report — i.e. the
 * retention period IS exceeded and every report-resolvable fact is resolved, but an exception stays UNKNOWN.
 * Unknown stays unknown: it is disclosed as a decisive fact unavailable from a resolved reading and may support
 * only a PROBABLE verification request. It is never promoted to VIOLATION, and missing information alone (a
 * period that cannot be computed, an unresolved condition, a missing anchor) yields nothing here.
 */
function classifyQualifiedEvaluation(evaluation, maxConclusion) {
  if (!evaluation) return null;
  if (evaluation.observation_incomplete) return null;
  if (evaluation.breach_established) return null;          // the definite path owns the resolved case
  if (evaluation.predicates_resolved !== true) return null;
  if (!evaluation.timing || evaluation.timing.outcome !== 'PERIOD_EXCEEDED') return null;

  const exceptions = evaluation.exceptions;
  if (!exceptions || exceptions.evaluation_required !== true) return null;
  if (!exceptions.unresolved_exception_present) return null;
  if (!(exceptions.unresolved_items || []).length) return null;

  /* An exception SHOWN by the report defeats the issue, even when other exceptions stay unresolved. It is never
     overridden by the qualified path. */
  for (const e of (exceptions.items || [])) {
    if (e.applies === true) return null;
  }

  /* Same structural guards as the definite classifier: jurisdiction, rule identity + source version, source-linked
     resolved facts, policy identity, reference date and conditions. */
  const jurisdiction = evaluation.selected_jurisdiction;
  if (!jurisdiction || typeof jurisdiction.country !== 'string' || !jurisdiction.country
    || typeof jurisdiction.region !== 'string' || !jurisdiction.region) return null;

  const identity = evaluation.rule_identity;
  if (!identity || !identity.adapter_id || !identity.source_entry_id || !identity.citation) return null;
  if (typeof identity.source_version !== 'string' || !identity.source_version) return null;

  const facts = evaluation.required_facts || [];
  if (!facts.length) return null;
  if (!facts.every((f) => f && f.resolved === true && typeof f.iso === 'string' && f.iso && f.field)) return null;
  for (const f of facts) {
    const src = f.source;
    if (!src || typeof src !== 'object') return null;
    if (!src.location || typeof src.location !== 'object') return null;
    if (typeof src.raw_value !== 'string' || !src.raw_value) return null;
    if (typeof src.normalized_value !== 'string' || !src.normalized_value) return null;
    if (src.normalized_value !== f.iso && src.normalized_value !== f.value_as_supplied) return null;
  }
  if (!evaluation.policy || typeof evaluation.policy.digest !== 'string' || !evaluation.policy.digest) return null;
  if (!evaluation.reference_date || evaluation.reference_date.resolved !== true || !evaluation.reference_date.iso) return null;
  const conditions = evaluation.conditions || [];
  if (!conditions.every((c) => c && c.resolved === true && c.met === true)) return null;

  /* The unresolved exception is recorded in decisive_facts_unavailable by buildEvaluationRecord. */
  const decisive = evaluation.decisive_facts_unavailable || [];
  if (!decisive.length) return null;
  const valid = decisive.every((d) => d && typeof d.identity === 'string' && d.identity
    && d.decisive === true && d.unavailable_from_resolved_reading === true
    && typeof d.evidence === 'string' && d.evidence);
  if (!valid) return null;
  return (maxConclusion === 'violation' || maxConclusion === 'probable_violation') ? 'PROBABLE_VIOLATION' : null;
}

/**
 * ACCEPT-004: the shared, guarded classifier. A finding is emitted ONLY for a rule whose output_permission
 * records `finding_allowed: true`, only when the comparison is EVALUATED and PERIOD_EXCEEDED, and only when
 * the per-assessment legal-evaluation record establishes the class. `max_conclusion` caps, never selects.
 */
function classify(result, adapter) {
  const perm = adapter && adapter.output_permission;
  if (!perm || perm.finding_allowed !== true) return null;
  if (!result || result.state !== RESULT_STATE.EVALUATED) return null;
  /* OWNER-CANDIDATE-002: a content-omission rule classifies its verified omission, not a period comparison. */
  if (adapter.anchor_mode === 'CONTENT_OMISSION') {
    return classifyContentOmission(result, adapter, perm.max_conclusion);
  }
  /* OWNER-CANDIDATE-003: a content-inclusion rule classifies its verified inclusion, not a period comparison. */
  if (adapter.anchor_mode === 'CONTENT_INCLUSION') {
    return classifyContentInclusion(result, adapter, perm.max_conclusion);
  }
  /* OWNER-CA-ORDINARY-REPORT-001: a reliability rule classifies the report's own contradicting values. */
  if (adapter.anchor_mode === 'CONTENT_RELIABILITY') {
    return classifyContentReliability(result, adapter, perm.max_conclusion);
  }
  if (result.outcome !== COMPARISON_OUTCOME.PERIOD_EXCEEDED) return null;
  const evaluation = result.evaluation || buildEvaluationRecord(result, adapter);
  /* GAP-FINDING-003: an inconsistent admitted-source version blocks the finding. The evaluation must bind to
     the exact version the adapter is recorded with — a mismatched digest means the finding is not for the
     governed/admitted rule text this release records. */
  if (evaluation.rule_identity && adapter.source_version && evaluation.rule_identity.source_version !== adapter.source_version) return null;
  const cls = classifyEvaluation(evaluation, perm.max_conclusion)
    || classifyQualifiedEvaluation(evaluation, perm.max_conclusion);
  if (!cls) return null;
  return {
    classification: cls,
    evaluation,
    adapter_id: adapter.adapter_id,
    citation: adapter.citation,
    period_years: adapter.period_years,
    source_entry_id: adapter.source_entry_id,
    source_version: adapter.source_version || null,
    source_artifact: adapter.source_artifact || null,
    anchor: result.anchor,
    arithmetic: result.arithmetic,
    decisive_fact_unavailable: cls === 'PROBABLE_VIOLATION' && evaluation.decisive_facts_unavailable[0]
      ? evaluation.decisive_facts_unavailable[0].identity
      : null,
    decisive_facts: evaluation.decisive_facts_unavailable.slice(),
    is_a_finding: true,
    invariant: 'CRP_LEGAL_INVARIANT.md §1 and §2.5'
  };
}

/** The single guarded finding path. Throws when the per-assessment evaluation does not establish a finding. */
function emitFinding(result, adapter) {
  const finding = classify(result, adapter);
  if (!finding) {
    throw new Error('FINDING_NOT_AUTHORIZED: the per-assessment legal evaluation does not establish a finding for this rule');
  }
  return finding;
}

/** Plain-language rendering. Observation-only, and it never upgrades the result's state. */
function describeResult(result) {
  if (!result || typeof result !== 'object') throw new Error('NOT_A_RESULT');
  const statement = {
    [RESULT_STATE.EVALUATED]: `comparison only: ${result.outcome} (ceiling ${result.output_ceiling})`,
    [RESULT_STATE.WITHHELD]: 'withheld: the provision\'s start is not evidenced on a canonical report field',
    [RESULT_STATE.UNRESOLVED]: `unresolved: ${result.refusal_reason}`,
    [RESULT_STATE.REFUSED]: `refused: ${result.refusal_reason}`
  }[result.state];
  return { adapter_id: result.adapter_id, state: result.state, statement: statement || null, is_a_finding: false };
}

function listAdapters() {
  return ADAPTERS.map((a) => ({
    adapter_id: a.adapter_id,
    legacy_rule_id: a.legacy_rule_id,
    source_entry_id: a.source_entry_id,
    applicability_mode: a.applicability.mode,
    applicability_relation_id: a.applicability.relation_id || null,
    period_years: a.period_years,
    record_kinds: (a.record_kinds || []).slice(),
    presentation_required: a.presentation_required || null,
    output_ceiling: (a.output_permission && a.output_permission.max_conclusion) || 'observation'
  }));
}

/**
 * Which adapters an explicit region selection may run, and the applicability state each WOULD carry. It
 * runs nothing, it does not soften an unconfirmed relation into a confirmed one, and it resolves a
 * country-wide relation by looking the region up in the records file rather than by matching a pattern.
 */
function adaptersForRegion(region) {
  if (typeof region !== 'string' || !region.trim()) throw new Error('EXPLICIT_COUNTRY_AND_REGION_REQUIRED');
  const target = region.trim();
  const country = target.split('-')[0];
  const out = [];
  for (const adapter of ADAPTERS) {
    const app = adapter.applicability;
    if (app.mode === 'EXACT') {
      if (app.region !== target) continue;
      out.push({
        adapter_id: adapter.adapter_id,
        applicability_state: 'EXACT_MATCH',
        confirmed: true,
        applicability_basis: 'EXACT_CANONICAL_REGION_ASSOCIATION',
        relation_id: null,
        execution: 'EXECUTABLE_WHERE_A_BOUND_PRESENTATION_IS_ADMITTED',
        no_recorded_source_row: false,
        unconfirmed_dependency: null
      });
      continue;
    }
    const relation = RELATION_INDEX.get(app.relation_id);
    if (!relation || relation.country !== country) continue;
    const row = relation.region_rows.get(target);
    if (!row) continue;
    out.push({
      adapter_id: adapter.adapter_id,
      applicability_state: row.state,
      confirmed: row.state.startsWith('CONFIRMED'),
      applicability_basis: row.basis,
      relation_id: relation.relation_id,
      relation_class: row.class,
      execution: relation.execution,
      no_recorded_source_row: row.no_recorded_source_row === true,
      unconfirmed_dependency: row.state.startsWith('CONFIRMED') ? null : 'COUNTRY_WIDE_TO_SELECTED_REGION_RELATION_REQUIRED'
    });
  }
  return out;
}

module.exports = {
  ADAPTERS,
  APPLICABILITY,
  RELATION_INDEX,
  PACKET_ELIGIBLE_RULE_IDS,
  verifyConfigs,
  runAdapter,
  classify,
  classifyEvaluation,
  classifyQualifiedEvaluation,
  buildEvaluationRecord,
  buildExceptionEvaluation,
  emitFinding,
  describeResult,
  listAdapters,
  adaptersForRegion,
  evaluateApplicability,
  RESULT_STATE,
  ADAPTER_FACT_STATUS,
  /* OWNER-CANDIDATE-003 test seams: the content classifiers are exposed so a test can exercise the actual
     classifier with an explicit ceiling (e.g. 'violation') WITHOUT changing production `finding_allowed`. This
     proves the positive and the negative paths, rather than every negative being suppressed by finding_allowed=false. */
  classifyContentOmission,
  classifyContentInclusion
};
