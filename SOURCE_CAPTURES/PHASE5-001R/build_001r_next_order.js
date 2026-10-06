// build_001r_next_order.js — PHASE5-001R deliverable 6, the next-order half.
//
// Issues the next bounded order, PHASE5-001S for Gate 5.6, for the same scope only. It quotes the gate's own
// text and the Phase 5.6 bullets by line, records its deliverables, exclusions, stop conditions and acceptance
// criteria, and states the one tension this phase carries rather than smoothing it over. It executes none of it.
//
// Writes only next_work_order.json inside this order's own package.

const fs = require('fs');
const path = require('path');

const ROOT = 'C:\\CRP-NEW';
const OUT = path.join(ROOT, 'SOURCE_CAPTURES', 'PHASE5-001R');
const readText = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const readJson = (rel) => JSON.parse(readText(rel));

const planLines = readText('CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md').split(/\r?\n/);
const record = readJson('SOURCE_CAPTURES\\PHASE5-001Q\\rule_record.json');
const decisions = readJson('SOURCE_CAPTURES\\PHASE5-001Q\\rule_record_decisions.json');
const verdict55 = readJson('SOURCE_CAPTURES\\PHASE5-001R\\scoped_gate_5_5_verdict.json');
const determinism = readJson('SOURCE_CAPTURES\\PHASE5-001R\\internal_determinism_check.json');
const comparison = readJson('SOURCE_CAPTURES\\PHASE5-001R\\implementation_comparison.json');

const PHASE_56_BULLETS = [142, 143, 144, 145];
const GATE_56_LINE = 147;
const quoteAt = (n) => ({ document: 'CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md', section: 'section 3', line: n, text: planLines[n - 1] });
if (planLines[GATE_56_LINE - 1].indexOf('**Gate 5.6:**') !== 0) throw new Error('the Gate 5.6 sentence is not at line ' + GATE_56_LINE + ' as this order cites it');
if (verdict55.verdict !== 'PASSED_FOR_THIS_SCOPE' && verdict55.verdict.indexOf('WITHHELD') !== 0) throw new Error('the scoped Gate 5.5 record carries neither a pass nor a withholding for this scope');

const draftOrder = {
  artifact: 'next_work_order.json',
  work_order: 'PHASE5-001R',
  created_utc: '2026-09-30',
  type: 'ISSUED WORK ORDER — not executed by the order that issues it',
  issued_for: 'Gate 5.6 — Validate before authorizing findings, for one scope only',
  order_id: 'PHASE5-001S',
  title: 'Gate 5.6 validation fixtures, negative tests and independent replay for CA-NS-CRA-S10-3-C-LIMB-1 on PR-01',
  authority: {
    why_this_order_may_now_issue: 'the amended build plan allows a later phase to begin for a named scope only when every preceding gate carries a passing verdict for that same scope. Gates 5.2, 5.3, 5.4 and now 5.5 each carry a passing scoped verdict for ' + record.scope.scope_id + ', the last of them in SOURCE_CAPTURES\\PHASE5-001R\\scoped_gate_5_5_verdict.json, issued on a specification of ' + determinism.case_count + ' synthetic cases with ' + determinism.failure_count + ' failures.',
    governing_text: 'CRP_PHASE5_STATUTE_CERTIFICATION_AND_FINDING_AUTHORIZATION_BUILD_PLAN.md section 3 (Phase 5.6 and Gate 5.6, read with the PHASE5-001P scoped-progression paragraph)',
    governing_text_quoted: PHASE_56_BULLETS.concat([GATE_56_LINE]).map(quoteAt).concat([47, 58, 61, 63].map(quoteAt)),
    scope: record.scope.scope_id,
    what_it_reads: [
      'SOURCE_CAPTURES\\PHASE5-001R\\scoped_gate_5_5_verdict.json — the scoped Gate 5.5 verdict that permits this phase to begin for this scope',
      'SOURCE_CAPTURES\\PHASE5-001R\\report_fact_model.json, extraction_status_vocabulary.json, deterministic_evaluator_specification.json, output_vocabulary_and_explanation_surface.json, internal_determinism_check.json and evaluator_001r.cjs — the specification this phase must validate',
      'SOURCE_CAPTURES\\PHASE5-001R\\implementation_comparison.json — the recorded differences between the specification and the PHASE5-001I-A internal comparator',
      'SOURCE_CAPTURES\\PHASE5-001Q\\rule_record.json — the governed rule record for this unit, NOT ADMITTED',
      'SOURCE_CAPTURES\\PROD-003\\report_representation_register.json — the demonstrated facts, their locators and the source excerpt each result must be reproducible from',
    ],
    still_required_of_the_issuing_owner: 'the order itself must carry its own authorisation and its own scope; nothing in this record authorises it to exceed the scope above',
    what_it_may_not_do: [
      'it may not begin Gate 5.6 for any other jurisdiction, unit, limb or presentation',
      'it may not admit a rule, create coverage or a candidate, or authorize a finding class',
      'it may not treat this order\'s scoped verdict as Gate 5.7 evidence, and it may not advance the corpus-wide queue',
    ],
  },
  recorded_tension_this_order_must_state_rather_than_resolve: 'Gate 5.6 requires that "rule corpus, source crosswalk, tests, and explanation templates share the same immutable versions", and this scope has no assigned rule version: the governed rule record carries rule_version ' + record.rule_identity.rule_version + ' as a recorded reservation, because Phase 5.7 assigns immutable IDs and versions when it admits the rule. The new order must therefore (a) pin the rule corpus, the crosswalk, the tests and the explanation templates by the unit\'s immutable ID together with every artifact digest the phase reads and writes, so that the shared-version condition is measured as far as this scope allows, (b) name the version-sharing criterion as unmet in this scope in its Gate 5.6 verdict rather than passing it, and (c) if the owner instead reads Gate 5.6 as requiring an assigned version, stop at its first action, name that criterion, and return for an owner instrument that assigns it.',
  deliverables: [
    '1. The fixture suite for this unit, both synthetic and legally reviewed, covering every category the phase bullet names: clear breach, compliant/within-limit, exact boundary, wrong event date, date unavailable, report contradiction, exception shown, exception unknown, effective-period uncertainty, preemption uncertainty, duplicate catalogue source, wrong jurisdiction, parser failure, OCR ambiguity and report-section not inspected. Each fixture states the state it is meant to reach, and every synthetic fixture is labelled synthetic so it can never be mistaken for a presentation.',
    '2. The negative tests, each naming the prohibited behaviour it forbids: that no off-report fact is ever requested, inferred or used as a decisive fact; that a parser failure never becomes absence; that an unknown exception never suppresses a report-supported probable path; and that probable-only uncertainty never emits VIOLATION. This unit has no probable path and no finding class, so each test must record what it demonstrates here — a refusal, or an observation-class result — rather than implying a capability this scope does not have.',
    '3. An independent replay sample. An independent reviewer reproduces a sample of each result from the source pin and the report excerpt without seeing the evaluator output first. Every disagreement is reconciled before any approval is sought, and the reconciliation is recorded, including any that cannot be reconciled.',
    '4. Consumer-language validation, with realistic examples, showing that the explanation is useful and does not overstate a legal conclusion. Every template of output_vocabulary_and_explanation_surface.json is exercised, including the withheld boundary template, and no template may render a finding label.',
    '5. Its own verification, preservation and custody records in the form this workspace uses: a baseline taken before it writes anything, inputs re-measured against what earlier records hold, builders re-run and compared byte-for-byte, and a custody manifest.',
    '6. A Gate 5.6 verdict record that quotes the gate\'s text, states each criterion for this scope with its evidence, and names any criterion it cannot meet instead of passing — including the version-sharing item this phase carries.',
  ],
  explicit_exclusions: [
    'no rule admission and no coverage claim: 0 admitted governed rules and 0 permitted findings remain the recorded counts; the governed rule record stays NOT ADMITTED and its version string stays reserved to Gate 5.7 (build plan line 151)',
    'no finding class, no finding output and no change to the ceiling: this unit\'s ceiling is observation-class only, and neither VIOLATION nor PROBABLE_VIOLATION may be implemented, emitted, implied or promised for it',
    'no consumer-visible output of any class, no application change, no deployment and no consumer-data transmission; report checking remains "not yet available". A consumer-language validation validates templates in a record; it does not create a surface',
    'no change to the specification this order produced: Gate 5.6 validates it, and a change to it is a new order, not a validation step',
    'no conformance work on the PHASE5-001I-A internal comparator and no adoption of its boundary treatment, both of which stay recorded in implementation_comparison.json',
    'no new legal research, no source retrieval, no source paraphrase and no re-interpretation of the accepted legal authority; the accepted source is read at its recorded digest only',
    'no change to the effective-period state, the exception state or the anniversary-boundary question, and no convention may be promoted to a requirement of the text',
    'no edit to the register, the ledger, the crosswalk, the catalogue, the corpus-wide queue or any historical manifest, and no promotion, closure or re-classification of any row',
  ],
  notes_carried_forward: [
    'the PHASE5-001I-A internal comparator is not gate evidence and its boundary treatment is NOT adopted: it returns an outcome on the exact sixth-anniversary day where the rule record withholds one, and ' + comparison.material_differences_not_adopted.length + ' material differences stand recorded in implementation_comparison.json',
    'the six calculation conventions are conventions: none is a requirement of the text, and none may be presented as one',
    'the effective-period, exception and anniversary-boundary questions stay separate, explicit and unresolved; each restricts output rather than being filled with an invented fact',
    'the recorded legacy D3 / observation classification and packet ineligibility are preserved and may not be overridden',
    'the register row for this unit stays UNRESOLVED with its recorded blocker, and no row is promoted, cleared or re-classified',
    'the emission path on an admitted rule record is unexercised and is named, not passed: it cannot be demonstrated before Gate 5.7 admission',
  ],
  stop_conditions: [
    'any deliverable that would need a finding class, a finding label or a change to the observation-class ceiling: stop and return for an owner instrument, because a rank-6 order cannot create a finding class',
    'a concrete source conflict, amendment, repeal or supersession indicator that would change legal content: hold for owner/legal direction rather than guessing',
    'a required decision or check that would need real consumer data, additional consumer evidence or a source retrieval the direct-report contract forbids',
    'a required check that cannot be met within this scope — including the version-sharing criterion, which needs a version Gate 5.7 has not yet assigned — record the criterion as unmet for this scope instead of deciding it or filling it with an invented value',
  ],
  acceptance_criteria: [
    'the fixture suite covers every category the phase bullet names for this scope, each fixture states the state it must reach, and every synthetic fixture is labelled synthetic',
    'the negative tests are run and recorded, each naming the prohibited behaviour it forbids, and none of them claims a capability this scope does not have',
    'the independent replay reproduces each sampled result from the source pin and the report excerpt, the reviewer\'s independence is recorded, and every disagreement is reconciled and recorded — or recorded as unresolved',
    'the consumer-language validation exercises every explanation template, including the withheld boundary template, and shows no overstatement and no finding label',
    'the Gate 5.6 verdict quotes the gate text, states each criterion for this scope with its evidence, and names every criterion it cannot meet instead of passing',
    'no finding class is implemented, emitted or implied for this unit, and no consumer-visible output of any class is produced',
    'the order\'s preservation and custody records show that no earlier artifact was changed outside its own package',
  ],
  what_this_issuing_order_did_not_do: 'it did not execute any part of Gate 5.6: no fixture, no negative test, no independent replay, no consumer-language validation and no Gate 5.6 verdict was specified, built or run, and no artifact of this order is evidence for Gate 5.6. The order is issued, not begun.',
  created_by: 'PHASE5-001R',
// __B8C__
};

const mayProceed = verdict55.verdict === 'PASSED_FOR_THIS_SCOPE';
const withheldItem = (verdict55.named_not_passed || []).filter((n) => n.state === 'NAMED — NOT MET IN THIS SCOPE').map((n) => n.item);

const out = mayProceed
  ? Object.assign({}, draftOrder, { type: 'ISSUED WORK ORDER — not executed by the order that issues it', order_issued: true })
  : {
    artifact: 'next_work_order.json',
    work_order: 'PHASE5-001R',
    created_utc: '2026-09-30',
    type: 'NO ORDER ISSUED — the remaining blocker is recorded, and the order that would issue once it is cleared is kept here, clearly marked as not issued and not begun',
    order_issued: false,
    order_id_that_would_issue: draftOrder.order_id,
    issued_for_that_would_apply: draftOrder.issued_for,
    why_no_order_issues: 'build plan line 58: a later phase may begin for a named scope only when every preceding gate carries a passing verdict for that same scope. The scoped Gate 5.5 verdict for ' + record.scope.scope_id + ' is ' + verdict55.verdict + ', and its unmet criterion is named in that record.',
    the_unmet_criteria_that_withhold_it: withheldItem,
    exact_remaining_blocker: verdict55.exact_remaining_blocker,
    smallest_action_that_clears_it: (verdict55.named_not_passed || []).map((n) => ({ item: n.item, smallest_action: n.smallest_action })),
    what_is_not_withheld: 'everything else this order produced stands and is unaffected: the report fact model, the extraction-status vocabulary, the deterministic evaluator specification and its executable form, the output vocabulary and explanation surface, the internal determinism check with ' + determinism.case_count + ' cases and ' + determinism.failure_count + ' failures, the implementation comparison with ' + comparison.difference_count + ' differences and ' + comparison.material_differences_not_adopted.length + ' material differences not adopted, and this order\'s verification, preservation and custody records.',
    the_order_that_would_issue_once_the_blocker_is_cleared: draftOrder,
    note_on_the_draft: 'the draft order above is kept whole so that nothing has to be re-derived when the blocker clears. It is not issued: no part of it may be executed, and it is not evidence for Gate 5.6.',
    created_by: 'PHASE5-001R',
  };

fs.writeFileSync(path.join(OUT, 'next_work_order.json'), JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log('next_work_order.json written: order issued: ' + out.order_issued + ' | ' + (out.order_issued ? out.order_id + ' for ' + out.issued_for : 'remaining blocker: ' + out.exact_remaining_blocker.slice(0, 90) + '...'));
