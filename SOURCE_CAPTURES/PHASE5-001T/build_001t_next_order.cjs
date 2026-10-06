'use strict';
/**
 * build_001t_next_order.cjs — PHASE5-001T: the bounded next step.
 *
 * Progression is not permitted: Gate 5.6 is not met in full for this scope because its version-sharing clause is
 * reserved and named. So this record does NOT issue an order. It records the exact blocker, the smallest
 * permitted action that would clear it, and the Gate 5.7 order that would issue once it is cleared — kept here,
 * clearly marked as not issued and not begun, so that nothing is lost while nothing is authorised.
 *
 * It writes one artifact, SOURCE_CAPTURES\PHASE5-001T\next_work_order.json, and nothing else.
 */
const I = require('./inputs_001t.cjs');

const verdict = I.readOutJson('scoped_gate_5_6_verdict.json');
const planLines = I.readText(I.PATHS.plan).split(/\r?\n/);
const progressionLine = planLines.filter((l) => l.indexOf('A later phase may begin for a named scope only when every preceding gate carries a passing verdict') !== -1)[0];
const phase57Bullets = planLines.map((l, i) => ({ line: i + 1, text: l })).filter((l) => l.line >= 172 && l.line <= 182 && l.text.trim().indexOf('- ') === 0);

const written = I.writeJson('next_work_order.json', {
  artifact: 'next_work_order.json',
  work_order: I.ORDER_ID,
  created_utc: I.CREATED_UTC,
  type: 'NO ORDER ISSUED — the exact blocker is recorded, and the Gate 5.7 order that would issue once it is cleared is kept here, clearly marked as not issued and not begun',
  order_issued: false,
  why_no_order_issues: {
    the_gate: 'Gate 5.6',
    its_scoped_state: verdict.verdict,
    the_rule_that_blocks_progression: progressionLine,
    what_it_means: 'a later phase may begin for this scope only when every preceding gate carries a passing verdict for that scope. Gate 5.6 carries three clauses met and one reserved, so it does not carry a passing verdict for this scope, and Gate 5.7 may not begin.',
  },
  the_blocker: verdict.criterion_it_cannot_meet,
  what_this_record_does_not_ask_for: [
    'it does not ask the owner to assign a production version or identity in order to satisfy the version-sharing criterion, because this order may not',
    'it does not ask for an amendment to any governing document, because this order carries no amendment authority',
    'it does not ask for a decision on the effective period, the exception or the anniversary-boundary question',
  ],
  the_smallest_permitted_action: {
    what: 'an owner instrument that settles the reading of the version-sharing clause for a scope whose rule record Gate 5.7 has not admitted',
    what_it_would_settle: 'whether the amended pre-admission measurement — the pinned pre-admission version identity CA-NS-CRA-S10-3-C-LIMB-1@PRE-ADMISSION-C24CA3FD3AA3 together with the immutable digests of the rule record, the crosswalk, the tests and the explanation templates — satisfies the sharing condition at Gate 5.6 for such a scope',
    if_yes: 'this scope\'s Gate 5.6 closes on the measurement already recorded in scoped_gate_5_6_verdict.json, and the draft order below issues unchanged',
    if_no: 'the sequencing reservation needs its own instrument, and the draft below is re-scoped to begin at the identity assignment rather than at validation',
    nothing_is_needed_from_the_evaluator: 'the blocker is in the reading of a gate clause, not in the evidence: the fixture suite, the negative tests, the independent replay and the language validation all pass and hold as recorded',
  },
  the_draft_order_kept_here: {
    order_issued: false,
    begun: false,
    order_id_that_would_issue: 'PHASE5-001U',
    order_id_note: 'the identifier is reserved only. If the owner uses PHASE5-001U for another order first, this draft\'s identifier is superseded and that supersession is recorded, exactly as PHASE5-001S superseded the draft that reserved it.',
    issued_for: 'Gate 5.7 — formal owner admission and finding authorization, for one scope only',
    title: 'Gate 5.7 admission of CA-NS-CRA-S10-3-C-LIMB-1 for PR-01 — owner instrument, immutable identities and the finding-class decision',
    authority_it_would_rest_on: [
      'a passing scoped Gate 5.6 verdict for this scope, which does not exist yet',
      'the amended build plan: the Phase 5.7 bullets, read with the PHASE5-001S paragraph under which admission is the step that follows a successful Gate 5.6',
      'the owner\'s instrument clearing the reading recorded in this record',
    ],
    governing_text_quoted: phase57Bullets,
    scope: 'SCOPE-CA-NS-CRA-S10-3-C-LIMB-1-PR01-LASTPAYMENT only',
    the_identity_it_would_assign: 'the production admission identity and the production version string for the governed rule record — the reservation Gate 5.6 names and this order may not supply',
    deliverables_it_would_carry: [
      'a rule-corpus amendment containing only rules that passed Gates 5.1 to 5.6, with immutable IDs, versions and full provenance',
      'excluded, unresolved, gap and refusal counts recorded separately, with no unresolved jurisdiction or provision represented as certified',
      'coverage and finding counts updated only from admitted rule records and validated evaluator capability',
      'the owner\'s exact finding classes authorised for this unit, with the observation-class ceiling stated where no finding class is authorised',
      'an admission record naming the pre-admission identity it supersedes and the digests it admits',
    ],
    exclusions_it_would_carry: [
      'no statutory text is changed and no probable result is turned into a violation',
      'no emission of any finding class before the owner\'s approval is recorded',
      'no consumer-visible surface, no deployment and no consumer-data transmission: release remains a separate product decision',
      'no re-run of any harness that writes into a prior evidence package',
      'no change to an earlier verdict, manifest, baseline or register row',
    ],
    stop_conditions_it_would_carry: [
      'if the owner withholds the finding-class decision, the rule record is admitted at the observation ceiling and the limitation is recorded rather than filled',
      'if the rule record cannot be admitted at its pinned digest, stop and re-issue rather than admitting a changed record',
      'if a concrete source conflict, amendment, repeal or supersession indicator appears, hold for owner and legal direction',
      'if any criterion would be satisfied by emitting before approval, stop: emission is the thing approval authorises',
    ],
    acceptance_criteria_it_would_carry: [
      'the amendment carries immutable IDs and versions, and the pre-admission identity it supersedes is named',
      'the four counts are recorded separately and nothing unresolved is represented as certified',
      'the authorised finding classes are exactly the owner\'s, and the observation-class ceiling is recorded where none is authorised',
      'no artifact of any earlier order is changed, and no earlier baseline or manifest is overwritten',
      'the scoped Gate 5.7 verdict states whether this unit is admitted, and names anything it cannot meet',
    ],
    what_it_may_not_do: [
      'it may not admit any rule for any other scope, jurisdiction, limb or presentation',
      'it may not change statutory text or convert a probable result into a violation',
      'it may not create a consumer surface, deploy or transmit anything',
      'it may not treat this order\'s or any predecessor\'s scoped verdict as evidence for a later gate, or advance the corpus-wide queue by itself',
    ],
    this_record_does_not_authorise_it: 'nothing in this record authorises that order to begin. It is a draft preserved for continuity, marked not issued and not begun.',
  },
  the_corpus_wide_position_unchanged: {
    '5.6': 'not met in full for this scope and unpassed corpus-wide',
    '5.7': 'not reached; 0 admitted governed rules and 0 permitted findings remain the recorded counts',
    no_admission: 'this order admitted no rule and authorized no finding class',
    no_consumer_visible_output: 'report checking remains "not yet available"',
  },
  what_this_record_does_not_do: [
    'it issues no order',
    'it admits no rule, creates no coverage or candidate and authorises no finding class',
    'it does not ask the owner to assign a production version to satisfy a gate criterion',
    'it does not repair the evaluator, the specification or the comparator',
    'it does not repair or deny the historical preservation failure of PHASE5-001R',
  ],
  created_by: I.ORDER_ID,
});

console.log('next work order: NO ORDER ISSUED (order_issued: false) | blocker recorded | written ' + written.bytes + ' bytes');
console.log('  blocker: ' + verdict.criterion_it_cannot_meet.what_is_missing);