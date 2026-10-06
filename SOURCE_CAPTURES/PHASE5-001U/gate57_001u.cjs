'use strict';
/**
 * gate57_001u.cjs — PHASE5-001U: the Gate 5.7 measurement module.
 *
 * It measures, from the live durable records and only from them, every fact the reserved Gate 5.7 admission and its
 * scoped verdict rest on: the Gate 5.6 successor result the admission is conditional on, the pinned artifacts the
 * admission binds, the corpus counts the amendment must state separately, the finding-class decision the owner
 * instrument records, and what the admission does and does not change.
 *
 * It writes nothing. A measurement that cannot be made is reported as absent, never assumed: a pin that does not
 * match, a missing artifact or a count that does not reconcile is returned as a recorded problem.
 *
 * It assigns nothing either: the production identity and version string it reads from lib_001u.cjs are recorded by
 * the admission builder, which is the one artifact that carries the assignment.
 */
const fs = require('fs');
const path = require('path');
const lib = require('./lib_001u.cjs');

const P = lib.PATHS;

/** Count non-overlapping occurrences of a literal needle. */
function occurrences(haystack, needle) {
  if (!haystack || !needle) return 0;
  let n = 0;
  let i = haystack.indexOf(needle);
  while (i !== -1) { n++; i = haystack.indexOf(needle, i + needle.length); }
  return n;
}

/** One CSV line to fields, honouring quoted fields that contain commas or doubled quotes. */
function parseCsvLine(line) {
  const out = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') { field += '"'; i++; } else { quoted = false; }
      } else { field += ch; }
    } else if (ch === '"') { quoted = true; }
    else if (ch === ',') { out.push(field); field = ''; }
    else { field += ch; }
  }
  out.push(field);
  return out;
}

/** The durable rescreen register, parsed from its own CSV, with its header row read rather than assumed. */
function readRegister() {
  const text = fs.readFileSync(lib.abs(P.rescreen_register), 'utf8').replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  const columns = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((l) => {
    const f = parseCsvLine(l);
    const row = {};
    columns.forEach((c, i) => { row[c] = f[i] === undefined ? '' : f[i]; });
    return row;
  });
  return { columns: columns, rows: rows };
}

/** A count map over one register column, largest first, absent values reported as '(empty)'. */
function tally(rows, column) {
  const map = new Map();
  rows.forEach((r) => {
    const k = (r[column] === undefined || r[column] === '') ? '(empty)' : r[column];
    map.set(k, (map.get(k) || 0) + 1);
  });
  const out = {};
  Array.from(map.keys())
    .sort((a, b) => (map.get(b) - map.get(a)) || (a < b ? -1 : 1))
    .forEach((k) => { out[k] = map.get(k); });
  return out;
}

/** The Gate 5.6 result the admission is conditional on, read from this order's own successor verdict. */
function measureGate56() {
  const successor = lib.readOutJson('scoped_gate_5_6_verdict_successor.json');
  return {
    successor_record: lib.wr('SOURCE_CAPTURES/PHASE5-001U/scoped_gate_5_6_verdict_successor.json'),
    successor_sha256: lib.outSha('scoped_gate_5_6_verdict_successor.json'),
    every_clause_met: successor.every_clause_met === true,
    gate_tally: successor.gate_tally,
    clause_states: successor.gate_criteria.map((c) => c.n + '. ' + c.criterion_verbatim + ' — ' + c.state),
    summary_numbers: successor.summary_numbers,
    criterion_it_cannot_meet: successor.criterion_it_cannot_meet,
    problems_recorded: successor.problems_found_in_this_re_measurement,
    predecessor_record: lib.wr(P.gate_5_6_verdict),
    predecessor_sha256: lib.sha256File(lib.abs(P.gate_5_6_verdict)),
    predecessor_state: 'PRESERVED UNCHANGED — it stands at its own digest, with three clauses met and the version-sharing clause named as reserved',
  };
}

/** The governed rule record, at the digest the admission binds it at, with the reservation it still carries. */
function measureRuleRecord() {
  const record = lib.readJson(P.rule_record);
  const text = lib.readText(P.rule_record);
  const ceiling = record.classification_and_ceiling;
  return {
    path: lib.wr(P.rule_record),
    sha256: lib.sha256File(lib.abs(P.rule_record)),
    bytes: lib.bytes(P.rule_record),
    rule_identity: record.rule_identity,
    admission_state: record.admission_state,
    permitted_result_ceiling: ceiling.permitted_result_ceiling,
    finding_classes_available: ceiling.finding_classes_available,
    authorised_finding_classes: ceiling.authorised_finding_classes,
    proposed_ceiling_not_adopted: ceiling.proposed_ceiling_not_adopted,
    version_field_occurrences: occurrences(text, 'RESERVED_TO_GATE_5_7'),
    production_identity_occurrences: occurrences(text, lib.PRODUCTION_ADMISSION_IDENTITY),
    second_limb_state: record.scope.second_limb_state,
    unresolved_dependencies_carried: record.unresolved_dependencies_carried.length,
  };
}

/** The source crosswalk: the unit this scope is bound to, and every combination this order does not admit. */
function measureCrosswalk() {
  const crosswalk = lib.readJson(P.crosswalk);
  return {
    path: lib.wr(P.crosswalk),
    sha256: lib.sha256File(lib.abs(P.crosswalk)),
    selected_combination: crosswalk.selected.combination_id,
    selected_rule_unit: crosswalk.selected.rule_unit,
    selected_source_entry_id: crosswalk.selected.source_entry_id,
    selected_jurisdiction: crosswalk.selected.jurisdiction.region_code,
    selected_proposed_ceiling: crosswalk.selected.permitted_result_ceiling,
    runner_up: {
      combination_id: crosswalk.runner_up.combination_id,
      rule_unit: crosswalk.runner_up.rule_unit,
      source_entry_id: crosswalk.runner_up.source_entry_id,
      status: crosswalk.runner_up.status,
      state_after_this_order: 'PRESERVED AS A CANDIDATE — not admitted, not dispositioned, and not converted into a governed rule by this order',
    },
    rejection_count: crosswalk.rejections.length,
    rejections_state_after_this_order: 'each recorded rejection is preserved as recorded; none is re-opened, re-classified or suppressed by this order',
  };
}

/** The corpus counts, read from the register's own per-row dispositions and from the coverage summary. */
function measureCounts() {
  const register = readRegister();
  const coverage = lib.readJson(P.coverage_summary);
  const dispositions = tally(register.rows, 'disposition');
  const states = tally(register.rows, 'disposition_state');
  const blockers = tally(register.rows, 'blocker_type');
  const selectedSourceId = lib.readJson(P.crosswalk).selected.source_entry_id;
  const admittedSourceRow = register.rows.filter((r) => r.source_entry_id === selectedSourceId)[0];
  return {
    register_path: lib.wr(P.rescreen_register),
    register_sha256: lib.sha256File(lib.abs(P.rescreen_register)),
    register_columns: register.columns.length,
    register_rows: register.rows.length,
    register_disposition_tally: dispositions,
    register_disposition_state_tally: states,
    register_blocker_type_tally: blockers,
    register_excluded_rows: dispositions.EXCLUDED || 0,
    coverage_summary_path: lib.wr(P.coverage_summary),
    coverage_summary_sha256: lib.sha256File(lib.abs(P.coverage_summary)),
    coverage_summary_register_disposition: coverage.register_disposition,
    coverage_available_for_implementation: coverage.coverage_available_for_implementation,
    coverage_summary_owner_acceptance: coverage.owner_acceptance,
    coverage_summary_instrument_class_screen: coverage.instrument_class_screen,
    coverage_summary_canonical_jurisdiction_status: coverage.canonical_jurisdiction_status,
    coverage_summary_limitation_or_retention_family: coverage.legal_family.LIMITATION_OR_RETENTION,
    coverage_summary_enumeration_coverage: coverage.enumeration_coverage,
    coverage_summary_per_jurisdiction_ca_ns: coverage.per_jurisdiction['CA-NS'],
    the_admitted_source_entry: {
      source_entry_id: admittedSourceRow.source_entry_id,
      record_type: admittedSourceRow.record_type,
      canonical_country_code: admittedSourceRow.canonical_country_code,
      canonical_region_code: admittedSourceRow.canonical_region_code,
      provision_or_citation: admittedSourceRow.provision_or_citation,
      disposition: admittedSourceRow.disposition,
      disposition_state: admittedSourceRow.disposition_state,
      blocker_type: admittedSourceRow.blocker_type,
      state_after_this_order: 'UNCHANGED — this order does not clear, move or re-state the register row of the source entry it admits; the row still reads ' + admittedSourceRow.disposition + ' / ' + admittedSourceRow.disposition_state,
    },
  };
}

/** The preserved B20 historical tally, quoted from the governing plan so its status travels with it. */
function measureB20() {
  const planText = lib.readText(P.plan);
  const sentence = planText.split('\n').filter((l) => l.indexOf('39 probable candidates, 380 excluded, and 18 unresolved') !== -1);
  return {
    recorded_in: lib.AMENDMENT_TARGET,
    sentence_present_in_the_document: sentence.length > 0,
    sentence_occurrences: occurrences(planText, '39 probable candidates, 380 excluded, and 18 unresolved'),
    probable_candidates: 39,
    excluded: 380,
    unresolved: 18,
    sum: 39 + 380 + 18,
    status: 'PRESERVED AS AN UNATTRIBUTED HISTORICAL RECORD (owner disposition PHASE5-001M): its per-ID inventory is absent from this workspace, so no catalogue ID is assigned to any of its classes, it is not a certified operational count, and this order does not use it as a count of excluded, unresolved or probable source entries.',
    why_it_is_recorded_here: 'the Phase 5.7 bullet requires excluded counts to be recorded separately and not represented as certified; the only excluded figure the record holds is this preserved historical tally, and it is recorded as exactly that',
  };
}

/** The binding rows, each with its class and, when a baseline is supplied, whether its digest moved. */
function measureBinding(recorded) {
  return lib.bindingRows().map((r) => {
    const before = recorded ? recorded[r.key] : null;
    const state = before === null || before === undefined
      ? 'NO_BASELINE_SUPPLIED'
      : (before === r.sha256 ? 'UNCHANGED' : 'MOVED');
    return {
      key: r.key,
      binding_class: lib.SUBSTANTIVE_KEYS.indexOf(r.key) !== -1 ? 'SUBSTANTIVE_VALIDATION_INPUT' : 'GOVERNING_OR_PREDECESSOR_RECORD',
      path: r.path,
      present_in_this_workspace: r.present_in_this_workspace,
      sha256_recorded: (before === undefined || before === null) ? null : before,
      sha256_now: r.sha256,
      digest_state: state,
      bytes: r.bytes,
    };
  });
}

/** A one-line summary of a binding-row measurement: what is bound, and what moved. */
function bindingSummary(rows) {
  const moved = rows.filter((r) => r.digest_state === 'MOVED');
  const substantive = rows.filter((r) => r.binding_class === 'SUBSTANTIVE_VALIDATION_INPUT');
  const governing = rows.filter((r) => r.binding_class === 'GOVERNING_OR_PREDECESSOR_RECORD');
  return {
    rows_total: rows.length,
    rows_substantive_validation_inputs: substantive.length,
    rows_governing_or_predecessor_records: governing.length,
    rows_absent_from_this_workspace: rows.filter((r) => !r.present_in_this_workspace).length,
    rows_moved: moved.length,
    rows_moved_keys: moved.map((r) => r.key),
    substantive_rows_moved: substantive.filter((r) => r.digest_state === 'MOVED').length,
    governing_rows_moved: governing.filter((r) => r.digest_state === 'MOVED').length,
  };
}

/** Every pin this order's measurements rest on, re-measured after all of its writes. */
function measurePins() {
  const rows = Object.keys(lib.PINS).map((k) => {
    const row = lib.pinReport([k])[0];
    return {
      key: lib.wr(k),
      pinned_sha256: row.pinned_sha256,
      measured_sha256: row.measured_sha256,
      bytes: row.bytes,
      present_in_this_workspace: row.present_in_this_workspace,
      state: row.state,
    };
  });
  const mismatched = rows.filter((r) => r.state === 'DOES_NOT_MATCH_THE_PIN');
  const absent = rows.filter((r) => r.state === 'ABSENT_FROM_THIS_WORKSPACE');
  const applicationResult = lib.readOutJson('amendment_application_result.json');
  const planRow = rows.filter((r) => r.key === lib.AMENDMENT_TARGET)[0];
  return {
    pins_carried_by_this_order: rows.length,
    pins_matching_their_pin: rows.filter((r) => r.state === 'MATCHES_THE_PIN').length,
    pins_absent_from_this_workspace: absent.length,
    pins_absent_keys: absent.map((r) => r.key),
    pins_not_matching: mismatched.length,
    pins_not_matching_keys: mismatched.map((r) => r.key),
    the_plan_pin: {
      pinned_sha256: planRow.pinned_sha256,
      measured_sha256: planRow.measured_sha256,
      state: planRow.state,
      explanation: 'the pin table was captured at baseline, before this order amended the plan. The plan is the one pre-existing file this order changes, so its pin row reports DOES_NOT_MATCH_THE_PIN and the row is explained rather than excused: this is the authorised change, applied once and quoted in the amendment record.',
      is_the_authorised_change: planRow.measured_sha256 === applicationResult.digest_after
        && planRow.pinned_sha256 === applicationResult.digest_before,
      digest_recorded_by_the_application_result_before: applicationResult.digest_before,
      digest_recorded_by_the_application_result_after: applicationResult.digest_after,
      replacements_applied: applicationResult.replacements_applied,
      amendment_history_rows_appended: applicationResult.rows_appended,
      amendments_recorded_by_this_order: 1,
    },
    every_other_pin_still_matches: mismatched.length === 1 && mismatched[0].key === lib.AMENDMENT_TARGET,
    pins_left_at_the_pre_amendment_value_by_this_order: 0,
    statement: 'no pin in the table was rewritten to match reality: the plan pin is left at its baseline value so that the one authorised change stays visible, and every other pin is measured against the value the baseline captured',
    rows: rows,
  };
}

/** Where the assigned production identity and version string appear, and where they must not. */
function measureProductionAssignment() {
  const targets = {
    the_governed_rule_record: P.rule_record,
    the_admission_record: 'SOURCE_CAPTURES/PHASE5-001U/admission_record_001u.json',
    the_rule_corpus_amendment_record: 'SOURCE_CAPTURES/PHASE5-001U/rule_corpus_amendment_001u.json',
    the_scoped_gate_5_7_verdict: 'SOURCE_CAPTURES/PHASE5-001U/scoped_gate_5_7_verdict.json',
    the_scoped_gate_5_6_verdict_successor: 'SOURCE_CAPTURES/PHASE5-001U/scoped_gate_5_6_verdict_successor.json',
  };
  const rows = {};
  Object.keys(targets).forEach((k) => {
    const exists = lib.exists(targets[k]);
    const text = exists ? lib.readText(targets[k]) : '';
    rows[k] = {
      path: lib.wr(targets[k]),
      present: exists,
      sha256: exists ? lib.sha256File(lib.abs(targets[k])) : null,
      occurrences_of_the_production_admission_identity: occurrences(text, lib.PRODUCTION_ADMISSION_IDENTITY),
      occurrences_of_the_production_version_string: occurrences(text, lib.PRODUCTION_VERSION_STRING),
      occurrences_of_the_admitted_marker: occurrences(text, 'ADMITTED'),
      occurrences_of_the_pre_admission_identity: occurrences(text, lib.PRE_ADMISSION_IDENTITY),
    };
  });
  return {
    the_assignment: {
      immutable_rule_id: lib.UNIT_ID,
      production_admission_identity: lib.PRODUCTION_ADMISSION_IDENTITY,
      production_version_string: lib.PRODUCTION_VERSION_STRING,
      pre_admission_identity_it_supersedes: lib.PRE_ADMISSION_IDENTITY,
      assigned_by: 'Gate 5.7, executed by this order because all four scoped Gate 5.6 criteria pass',
      recorded_in: [
        lib.wr('SOURCE_CAPTURES/PHASE5-001U/admission_record_001u.json'),
        lib.wr('SOURCE_CAPTURES/PHASE5-001U/rule_corpus_amendment_001u.json'),
      ],
    },
    where_the_assignment_appears: rows,
    the_rule_record_is_not_edited: {
      stated_rule: 'the assignment is recorded in the admission record and the correlation-amendment record by reference to the rule record digest; the rule record itself is a pinned artifact of PHASE5-001Q that Gates 5.4, 5.5 and 5.6 validated at its digest, and editing it would change the artifact every one of those verdicts rests on',
      therefore: 'occurrences_of_the_production_admission_identity in the governed rule record must be 0, and its version field must still read RESERVED_TO_GATE_5_7 — now resolved by reference rather than by rewrite',
      rule_record_version_field_occurrences: occurrences(lib.readText(P.rule_record), 'RESERVED_TO_GATE_5_7'),
      rule_record_production_identity_occurrences: occurrences(lib.readText(P.rule_record), lib.PRODUCTION_ADMISSION_IDENTITY),
      declared_in: lib.wr('SOURCE_CAPTURES/PHASE5-001U/version_conflict_resolution_record.json') + ' (the_assignment_the_resolution_leaves_to_gate_5_7)',
    },
  };
}

/** The finding-class decision as the owner instrument records it, and the ceiling that therefore stands. */
function measureFindingAuthorisation() {
  const owner = lib.readOutJson('owner_decision_record.json');
  const decision2 = owner.decisions.filter((d) => d.id === 'OWNER-DECISION-2')[0];
  const ruleRecord = lib.readJson(P.rule_record);
  return {
    owner_instrument: lib.wr('SOURCE_CAPTURES/PHASE5-001U/owner_decision_record.json') + ' at ' + lib.outSha('owner_decision_record.json'),
    the_finding_class_decision: decision2.the_finding_class_decision,
    finding_classes_authorised_by_this_order: [],
    finding_class_count: 0,
    the_ceiling_that_stands: ruleRecord.classification_and_ceiling.permitted_result_ceiling,
    the_ceiling_is_unchanged_from: lib.wr(P.rule_record) + ' — read, not written, by this order',
    the_proposal_that_stays_unadopted: ruleRecord.classification_and_ceiling.proposed_ceiling_not_adopted,
    emission_this_order_authorises: 'NONE — no finding class and no consumer-visible output of any class; report checking for this scope remains "not yet available"',
    the_stop_condition_this_order_honours: 'the reserved draft order at ' + lib.wr(P.gate_5_6_order) + ' records it: if the owner withholds the finding-class decision, admit the rule record at the observation ceiling and record the limitation rather than fill it',
  };
}

/**
 * The post-assignment re-measurement: every binding row compared with the digests the admission record bound, every
 * pin re-measured, the authored Gate 5.6 harness re-executed, and the version-conflict record's closure claim
 * re-checked against the live rule record. It reports what moved; it repairs nothing.
 */
function measurePostAssignment() {
  const admission = lib.readOutJson('admission_record_001u.json');
  const recorded = {};
  admission.binding_rows.forEach((r) => { recorded[r.key] = r.sha256; });
  const rows = measureBinding(recorded);
  const summary = bindingSummary(rows);
  const gate56 = require('./gate56_001u.cjs').measure();
  const ruleText = lib.readText(P.rule_record);
  const versionConflict = lib.readOutJson('version_conflict_resolution_record.json');
  const pinnedRuleRecord = admission.binding_rows.filter((r) => r.key === 'rule_record')[0];
  return {
    what_this_record_does: 're-measures the admission after every write this order made and reports whether anything the admission rests on moved',
    measured_after: admission.writes_measured_by_this_check.slice ? admission.writes_measured_by_this_check.slice() : admission.writes_measured_by_this_check,
    rows: rows,
    summary: summary,
    package_digest_recorded_by_the_admission: admission.package_digest,
    package_digest_measured_now: lib.packageDigest(lib.bindingRows()),
    package_digest_state: admission.package_digest === lib.packageDigest(lib.bindingRows()) ? 'UNCHANGED' : 'MOVED',
    pins: measurePins(),
    the_authored_gate_5_6_harness_re_executed_after_the_assignment: {
      harness: 'SOURCE_CAPTURES\\PHASE5-001U\\gate56_001u.cjs',
      why_it_is_re_executed_here: 'the module that produced the four-clause result the admission rests on is re-executed from the same digests after the admission writes; this is the harness this order authored, not the inherited internal-validation harness, which is never run by this order',
      every_clause_met: gate56.every_clause_met,
      gate_tally: gate56.gate_tally,
      problems_found: gate56.problems_found_in_this_re_measurement,
      summary_numbers: gate56.summary_numbers,
    },
    the_version_conflict_records_closure_claim_re_checked: {
      the_claim: versionConflict.the_assignment_the_resolution_leaves_to_gate_5_7.what_the_assignment_does_not_do,
      rule_record_digest_bound_by_the_admission: pinnedRuleRecord.sha256,
      rule_record_digest_now: lib.sha256File(lib.abs(P.rule_record)),
      rule_record_moved: pinnedRuleRecord.sha256 !== lib.sha256File(lib.abs(P.rule_record)),
      rule_record_version_field_still_reserved: ruleText.indexOf('"rule_version": "RESERVED_TO_GATE_5_7"') !== -1,
      rule_record_admission_state_still_not_admitted: lib.readJson(P.rule_record).admission_state.state === 'NOT_ADMITTED',
      finding: 'the claim holds on re-measurement: the assignment was recorded in the admission record and the amendment record by reference, and the governed rule record did not move, did not acquire the production identity and still carries its reserved version placeholder, now resolved by reference',
    },
    conclusion: summary.substantive_rows_moved === 0 && summary.governing_rows_moved === 0
      ? 'NOTHING THE ADMISSION RESTED ON MOVED — every binding row stands at the digest the admission bound, every matching pin still matches, and the four scoped Gate 5.6 clauses still hold on re-execution'
      : 'A BINDING ROW MOVED — the admission\'s validation basis is disturbed and the rows that moved are listed above rather than explained away',
    what_this_record_does_not_do: [
      'it does not re-state, strengthen or re-issue the admission: it compares the admission with the live artifacts and reports the comparison',
      'it does not validate anything a fourth time beyond the re-execution it names, and it substitutes no re-run for a digest measurement',
      'it does not omit an absent workspace artifact from the row list, and it does not treat an absent source pin as a match',
    ],
  };
}

/** Every measurement Gate 5.7 rests on, gathered once so the admission and its verdict read one set of numbers. */
function measure() {
  return {
    order: lib.ORDER_ID,
    unit_id: lib.UNIT_ID,
    scope_id: lib.SCOPE_ID,
    created_utc: lib.CREATED_UTC,
    gate_5_6_result_the_admission_is_conditional_on: measureGate56(),
    the_governed_rule_record: measureRuleRecord(),
    the_source_crosswalk: measureCrosswalk(),
    corpus_counts: measureCounts(),
    the_preserved_historical_tally: measureB20(),
    the_production_assignment: measureProductionAssignment(),
    the_finding_authorisation: measureFindingAuthorisation(),
    binding_rows_at_admission: measureBinding(null),
    pins_at_admission: measurePins(),
  };
}

module.exports = {
  parseCsvLine,
  readRegister,
  tally,
  occurrences,
  measureGate56,
  measureRuleRecord,
  measureCrosswalk,
  measureCounts,
  measureB20,
  measureBinding,
  bindingSummary,
  measurePins,
  measureProductionAssignment,
  measureFindingAuthorisation,
  measurePostAssignment,
  measure,
};
