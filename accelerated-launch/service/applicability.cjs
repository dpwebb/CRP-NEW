'use strict';
/**
 * applicability.cjs — the SHARED PER-RECORD APPLICABILITY CONTRACT.
 *
 * OWNER-ALL82-001 / B3 continuation. The owner directed: "Add a per-record applicability state to the shared
 * evaluator: APPLICABLE / NOT_APPLICABLE / APPLICABILITY_UNRESOLVED." and "Preserve extraction status
 * separately from applicability and comparison outcome."
 *
 * This module is the one place that draws that distinction, for every family and every rule. It owns a small
 * registry of NAMED applicability rules. An adapter declares which rule governs it; the runner resolves the
 * state per record from what the FAMILY READ, and nothing here parses a report or decides a legal question.
 *
 * Three fields, three different questions, never interchanged:
 *   • EXTRACTION STATUS  — "could this record be read at all?"            (the family's answer)
 *   • APPLICABILITY      — "does this limb reach this record?"            (this module's answer)
 *   • COMPARISON OUTCOME — "what did the arithmetic say once it ran?"     (the runner's answer)
 *
 * The rules are deliberately conservative, and each returns the EVIDENCE it decided from:
 *   • NOT_APPLICABLE is returned only from a printed statement the report makes about itself — never from a
 *     failed read, a missing field or an unread grid.
 *   • APPLICABILITY_UNRESOLVED is the answer whenever the record is silent. A blank label does not prove the
 *     state the label would have described.
 *   • APPLICABLE is returned only when the limb's own recorded start is a value the record actually prints.
 */

const { FACT_STATUS } = require('../../internal-validation/ca-ns-last-payment-six-year/constants.cjs');

const APPLICABILITY_STATE = Object.freeze({
  APPLICABLE: 'APPLICABLE',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
  APPLICABILITY_UNRESOLVED: 'APPLICABILITY_UNRESOLVED'
});

/** The reading surface a rule is given. Nothing else is passed in, and no rule reaches outside it. */
function contextOf(extraction, record) {
  return {
    extraction: extraction || null,
    readings: (extraction && extraction.evidence_readings) || {},
    record: record || null,
    printed: (record && record.printed) || {}
  };
}

function state(applicability, rule_id, reason, plain, evidence, extra) {
  return Object.assign({
    applicability,
    rule_id,
    reason,
    plain,
    evidence: evidence || null,
    decided_from: 'WHAT_THE_REPORT_PRINTS'
  }, extra || {});
}

/* ------------------------------------------------------------------------------------------------ rules */

/**
 * A public-record retention limb (bankruptcy, court judgment, paid tax lien, arrest record). Its applicability
 * turns on whether the report presents such an item at all.
 */
function publicRecordItemPresentOrExplicitlyAbsent(ctx) {
  const rule_id = 'PUBLIC_RECORD_ITEM_PRESENT_OR_EXPLICITLY_ABSENT';
  const publicRecords = ctx.readings.public_records || null;
  if (!publicRecords) {
    return state(APPLICABILITY_STATE.APPLICABILITY_UNRESOLVED, rule_id,
      'THE_ADMITTED_FAMILY_REPORTED_NO_PUBLIC_RECORD_READING_FOR_THIS_CASE',
      'This build could not read a public-records statement from your file, so this limit was not applied to your report.',
      null);
  }
  if (publicRecords.absence_statement_printed === true) {
    return state(APPLICABILITY_STATE.NOT_APPLICABLE, rule_id,
      'THE_REPORT_PRINTS_ITS_OWN_STATEMENT_THAT_NO_PUBLIC_RECORDS_APPEAR',
      'Your report states that no public records appear on it. This limit applies to public records, so it has nothing in your report to apply to.',
      {
        printed_statement: publicRecords.absence_statement_text,
        location: publicRecords.absence_statement_location
      });
  }
  if (publicRecords.section_printed === true) {
    return state(APPLICABILITY_STATE.APPLICABILITY_UNRESOLVED, rule_id,
      'THE_SECTION_IS_PRINTED_AND_THIS_BUILD_EVIDENCES_NO_PUBLIC_RECORD_ITEM_STRUCTURE_FOR_IT',
      'Your report prints a section for public records but not the statement that none appear. This build has no evidenced item structure for that section, so it does not assert that a public record is or is not present.',
      { lines_printed_before_the_first_account_block: publicRecords.lines_printed_before_the_first_account_block });
  }
  return state(APPLICABILITY_STATE.APPLICABILITY_UNRESOLVED, rule_id,
    'THE_PUBLIC_RECORD_SECTION_IS_NOT_PRINTED_IN_A_FORM_THIS_BUILD_RECOGNISES',
    'This build did not find a public-records section in your file, so it does not assert that a public record is or is not present.',
    null);
}

/**
 * An adverse-item retention limb, resolved PER RECORD from the record's own printed adverse payment rating.
 * A record that prints no such date is UNRESOLVED: an unread payment grid is not evidence of a clean record.
 */
function adversePaymentRatingItemPresent(ctx) {
  const rule_id = 'ADVERSE_PAYMENT_RATING_ITEM_PRESENT';
  const rating = ctx.printed.adverse_payment_rating_date || null;
  if (!rating) {
    return state(APPLICABILITY_STATE.APPLICABILITY_UNRESOLVED, rule_id,
      'THE_FAMILY_REPORTED_NO_ADVERSE_RATING_READING_FOR_THIS_RECORD',
      'This build read no adverse-rating reading for this account, so this limit was not applied to it.',
      null);
  }
  if (rating.status === FACT_STATUS.RESOLVED) {
    return state(APPLICABILITY_STATE.APPLICABLE, rule_id,
      'THE_RECORD_PRINTS_AN_ADVERSE_PAYMENT_RATING_AND_ITS_DATE',
      'This account prints an adverse payment rating and the report dates it, so this limit can be measured against it.',
      {
        printed_field: rating.source_field,
        printed_value: rating.raw_value,
        location: rating.location,
        anchor_precision: rating.anchor_precision || null,
        comparison_anchor: rating.comparison_anchor || null,
        anchor_day_convention: rating.anchor_day_convention || null,
        does_not_establish: rating.does_not_establish
      });
  }
  return state(APPLICABILITY_STATE.APPLICABILITY_UNRESOLVED, rule_id,
    rating.reason || 'THE_ADVERSE_PAYMENT_RATING_DATE_COULD_NOT_BE_READ',
    'This account is reported as having an adverse payment rating, but the date this build read for it is not a readable calendar date. The reading is preserved and the comparison was not made.',
    { printed_value: rating.raw_value, location: rating.location });
}

/**
 * An account placed for collection, or charged to profit or loss. This build evidences no presentation of
 * such an account on any admitted family, so it never asserts one is present; and it asserts one is absent
 * only when the report prints a negative-items section that carries no account at all.
 */
function collectionOrChargeOffPresent(ctx) {
  const rule_id = 'COLLECTION_OR_CHARGE_OFF_PRESENT';
  const negative = ctx.readings.negative_items || null;
  if (!negative) {
    return state(APPLICABILITY_STATE.APPLICABILITY_UNRESOLVED, rule_id,
      'THE_ADMITTED_FAMILY_REPORTED_NO_NEGATIVE_ITEMS_READING_FOR_THIS_CASE',
      'This build could not read a negative-items reading from your file, so this limit was not applied to your report.',
      null);
  }
  if (negative.section_printed === false) {
    return state(APPLICABILITY_STATE.APPLICABILITY_UNRESOLVED, rule_id,
      'THE_NEGATIVE_ITEMS_SECTION_IS_NOT_PRINTED_IN_A_FORM_THIS_BUILD_RECOGNISES',
      'This build did not find the section of your report that would carry an account placed for collection, so it does not assert that one is or is not present.',
      null);
  }
  if (!negative.accounts_printed) {
    return state(APPLICABILITY_STATE.NOT_APPLICABLE, rule_id,
      'THE_SECTION_IS_PRINTED_AND_CARRIES_NO_ACCOUNT_AT_ALL',
      'The part of your report that would carry an account placed for collection or written off is printed and carries no account, so this limit has nothing in your report to apply to.',
      { printed_status_values: negative.printed_status_values });
  }
  return state(APPLICABILITY_STATE.APPLICABILITY_UNRESOLVED, rule_id,
    'ACCOUNTS_ARE_PRINTED_AND_THIS_BUILD_EVIDENCES_NO_PRESENTATION_OF_AN_ACCOUNT_PLACED_FOR_COLLECTION_OR_CHARGED_OFF',
    'Your report prints accounts in the negative-items section, but this build has no evidenced presentation of an account placed for collection or written off, so it does not assert that one is or is not present. The printed status of each account is recorded for you.',
    { printed_status_values: negative.printed_status_values });
}

/**
 * A consumer-credit-liability retention limb, PER RECORD. Its recorded start is the day the credit account
 * was terminated or ceased to be in force, so applicability turns on the record's OWN printed `Closed Date`.
 *
 * The owner's rule is applied literally: a BLANK `Closed Date` on its own establishes neither state. The
 * record's own explicit printed status is used where it exists; where it does not, the answer is UNRESOLVED.
 */
function liabilityClosedDateOrExplicitlyStatedStatus(ctx) {
  const rule_id = 'LIABILITY_CLOSED_DATE_OR_EXPLICITLY_STATED_STATUS';
  const closed = ctx.printed.closed_date || null;
  const status = ctx.printed.current_repayment_status || null;

  if (!closed || closed.reason === 'LABEL_NOT_PRINTED_ON_THIS_RECORD') {
    return state(APPLICABILITY_STATE.APPLICABILITY_UNRESOLVED, rule_id,
      'THE_FAMILY_REPORTED_NO_CLOSED_DATE_READING_FOR_THIS_RECORD',
      'This account prints no closure label at all, so this build read no closure reading for it and this limit was not applied to it. A label that is not printed and a label printed with no value are different readings and are never collapsed.',
      { printed_field: 'Closed Date', location: closed ? closed.location : null });
  }
  if (closed.status === FACT_STATUS.RESOLVED) {
    return state(APPLICABILITY_STATE.APPLICABLE, rule_id,
      'THE_RECORD_PRINTS_ITS_OWN_CLOSED_DATE',
      'This account prints its own closure date, so this limit can be measured from it.',
      {
        printed_field: 'Closed Date',
        printed_value: closed.raw,
        location: closed.location,
        anchor_precision: closed.anchor_precision || null,
        comparison_anchor: closed.comparison_anchor || null
      });
  }
  /* A blank `Closed Date` on its own proves neither state. */
  const blank = closed.reason === 'LABEL_PRINTED_WITHOUT_VALUE';
  if (blank && status && status.status === FACT_STATUS.RESOLVED) {
    return state(APPLICABILITY_STATE.NOT_APPLICABLE, rule_id,
      'THE_RECORD_PRINTS_AN_EXPLICIT_STATUS_THAT_DOES_NOT_STATE_TERMINATION',
      'This account prints no closure date, and it prints its own repayment status instead. That status does not state that the credit was terminated, so this limit was not applied to this account.',
      {
        printed_field: 'Current Repayment Status',
        printed_value: status.raw,
        location: status.location,
        does_not_establish: 'that the account is open, current or unpaid; a blank Closed Date alone proves neither state'
      });
  }
  return state(APPLICABILITY_STATE.APPLICABILITY_UNRESOLVED, rule_id,
    blank
      ? 'A_BLANK_CLOSED_DATE_ALONE_DOES_NOT_PROVE_EITHER_STATE_AND_THE_RECORD_PRINTS_NO_STATUS'
      : (closed.reason || 'THE_CLOSED_DATE_COULD_NOT_BE_READ'),
    'This account prints a closure label with no value and prints no status for it. A blank closure date alone does not prove the account is open, so this limit was not applied and nothing was inferred. The reading is preserved.',
    { printed_field: 'Closed Date', location: closed.location, does_not_infer: 'that the account is open' });
}

/**
 * ACCEPT-002 §2: the general intake establishes that an entry is a public record from the entry's own printed
 * wording (BANKRUPTCY / JUDGMENT / LIEN / PUBLIC RECORD). For the reassessed public-record limbs the reach of
 * the limb is therefore the record's own kind, resolved per record rather than from a whole-report statement.
 */
function publicRecordRecordPresent(ctx) {
  const rule_id = 'PUBLIC_RECORD_RECORD_PRESENT';
  const record = ctx.record || null;
  if (record && record.kind === 'GENERAL_PUBLIC_RECORD') {
    return state(APPLICABILITY_STATE.APPLICABLE, rule_id,
      'THE_RECORD_IS_READ_AS_A_PUBLIC_RECORD',
      'This entry is read as a public record, so this limit applies to it.',
      { record_kind: record.kind });
  }
  return state(APPLICABILITY_STATE.APPLICABILITY_UNRESOLVED, rule_id,
    'NO_PUBLIC_RECORD_ENTRY_WAS_READ',
    'This build read no public-record entry for this case, so it does not assert that one is or is not present.',
    null);
}

/**
 * OWNER-CANDIDATE-002: the judgment-content rule reaches ONLY a positively identified judgment public record,
 * never a bankruptcy or lien that shares the same record kind. A public record that is not a judgment is
 * NOT_APPLICABLE (filed separately, never a performed comparison); a record the build could not identify is
 * UNRESOLVED.
 */
function judgmentPublicRecordPresent(ctx) {
  const rule_id = 'JUDGMENT_PUBLIC_RECORD_PRESENT';
  const record = ctx.record || null;
  if (record && record.kind === 'GENERAL_PUBLIC_RECORD' && record.facts && record.facts['judgment.recordIdentified'] === true) {
    return state(APPLICABILITY_STATE.APPLICABLE, rule_id,
      'THE_RECORD_IS_A_POSITIVELY_IDENTIFIED_JUDGMENT',
      'This entry is read as a judgment public record, so this content rule applies to it.',
      { record_kind: record.kind });
  }
  if (record && record.kind === 'GENERAL_PUBLIC_RECORD') {
    return state(APPLICABILITY_STATE.NOT_APPLICABLE, rule_id,
      'THE_PUBLIC_RECORD_IS_NOT_A_JUDGMENT',
      'This public record is not a judgment, so the judgment-content rule does not apply to it.',
      { record_kind: record.kind });
  }
  return state(APPLICABILITY_STATE.APPLICABILITY_UNRESOLVED, rule_id,
    'NO_PUBLIC_RECORD_ENTRY_WAS_READ',
    'This build read no public-record entry for this case, so it does not assert that a judgment is or is not present.',
    null);
}

/**
 * OWNER-CANDIDATE-003: the criminal-charge content rule reaches ONLY a positively identified criminal-charge
 * public record, never a judgment, bankruptcy or lien that shares the same record kind.
 */
function criminalChargePresent(ctx) {
  const rule_id = 'CRIMINAL_CHARGE_PRESENT';
  const record = ctx.record || null;
  if (record && record.kind === 'GENERAL_PUBLIC_RECORD' && record.facts && record.facts['criminalCharge.recordIdentified'] === true) {
    return state(APPLICABILITY_STATE.APPLICABLE, rule_id,
      'THE_RECORD_IS_A_POSITIVELY_IDENTIFIED_CRIMINAL_CHARGE',
      'This entry is read as a criminal-charge public record, so this content rule applies to it.',
      { record_kind: record.kind });
  }
  if (record && record.kind === 'GENERAL_PUBLIC_RECORD') {
    return state(APPLICABILITY_STATE.NOT_APPLICABLE, rule_id,
      'THE_PUBLIC_RECORD_IS_NOT_A_CRIMINAL_CHARGE',
      'This public record is not a criminal charge, so the dismissed-charge rule does not apply to it.',
      { record_kind: record.kind });
  }
  return state(APPLICABILITY_STATE.APPLICABILITY_UNRESOLVED, rule_id,
    'NO_PUBLIC_RECORD_ENTRY_WAS_READ',
    'This build read no public-record entry for this case, so it does not assert that a criminal charge is or is not present.',
    null);
}

/**
 * ACCEPT-003 D2: the general intake establishes that an entry is a collection from the entry's own printed
 * wording (COLLECTION / CHARGE-OFF). For the collection limb the reach of the limb is the record's own kind.
 */
function collectionRecordPresent(ctx) {
  const rule_id = 'COLLECTION_RECORD_PRESENT';
  const record = ctx.record || null;
  if (record && record.kind === 'GENERAL_COLLECTION') {
    return state(APPLICABILITY_STATE.APPLICABLE, rule_id,
      'THE_RECORD_IS_READ_AS_A_COLLECTION_ENTRY',
      'This entry is read as a collection or charge-off account, so this limit applies to it.',
      { record_kind: record.kind });
  }
  return state(APPLICABILITY_STATE.APPLICABILITY_UNRESOLVED, rule_id,
    'NO_COLLECTION_ENTRY_WAS_READ',
    'This build read no collection or charge-off entry for this case, so it does not assert that one is or is not present.',
    null);
}

/**
 * OWNER-CANDIDATE-007 (B): the California § 1785.13(a)(8) residual adverse-information branch, resolved through
 * an explicit tri-state account/action context (with source provenance) and fail-closed. § 1785.13(b) moves the
 * seven-year period for paragraphs (5) and (8) 180 days after the delinquency commencement "with respect to any
 * account that is placed for collection, charged to profit and loss, or subjected to any similar action":
 *   (1) ESTABLISHED (b) CONTEXT  (reportedAccount.accountActionContext === 'COLLECTION_OR_CHARGE_OFF') — the
 *       account is a collection/charge-off account, so the (a)(5) collection branch governs with delinquency-based
 *       timing and the 180-day offset. This branch is NOT_APPLICABLE.
 *   (2) ESTABLISHED SUPPORTED EVENT-DATE CONTEXT ('EVENT_DATE_SUPPORTED') — the account is positively established
 *       as NOT placed for collection, charged off or subjected to a similar action, so event-date timing applies
 *       (no 180-day offset). NO admitted evidence basis produces this state yet, so it is unreachable.
 *   (3) UNKNOWN / CONFLICTING / UNSUPPORTED — every other case, including an unlabelled "similar action"
 *       (repossession, foreclosure, write-off) whose legal meaning this build does NOT assign. UNRESOLVED, no
 *       finding. Absence of COLLECTION/CHARGE-OFF wording never establishes event-date applicability.
 */
function adverseRatingActionContext(ctx) {
  const rule_id = 'ADVERSE_RATING_ACTION_CONTEXT';
  const record = ctx.record || null;
  const actionContext = (record && record.facts && record.facts['reportedAccount.accountActionContext']) || 'UNKNOWN';

  if (actionContext === 'COLLECTION_OR_CHARGE_OFF') {
    return state(APPLICABILITY_STATE.NOT_APPLICABLE, rule_id,
      'THE_RECORD_IS_A_COLLECTION_OR_CHARGE_OFF_ACCOUNT',
      'This account is reported as placed for collection or charged off, so its seven-year period runs from 180 days after the delinquency that preceded it, under the collection rule — not from this rating.',
      { record_kind: record.kind, account_action_context: actionContext });
  }

  if (actionContext === 'EVENT_DATE_SUPPORTED') {
    const rating = ctx.printed.adverse_payment_rating_date || null;
    if (rating && rating.status === FACT_STATUS.RESOLVED) {
      return state(APPLICABILITY_STATE.APPLICABLE, rule_id,
        'THE_RECORD_ESTABLISHES_EVENT_DATE_APPLICABILITY_AND_PRINTS_ITS_ADVERSE_RATING_DATE',
        'This account is positively established as not placed for collection, charged off or subjected to a similar action, and it prints an adverse payment rating with a readable date, so this limit is measured against the rating date.',
        {
          printed_field: rating.source_field,
          printed_value: rating.raw_value,
          location: rating.location,
          anchor_precision: rating.anchor_precision || null,
          comparison_anchor: rating.comparison_anchor || null,
          anchor_day_convention: rating.anchor_day_convention || null,
          does_not_establish: rating.does_not_establish,
          account_action_context: actionContext
        });
    }
  }

  return state(APPLICABILITY_STATE.APPLICABILITY_UNRESOLVED, rule_id,
    'THE_ACCOUNT_ACTION_CONTEXT_IS_NOT_ESTABLISHED',
    'The report does not establish whether this account was placed for collection, charged off, or subjected to a similar action, so the applicable timing for this limit is unresolved and no comparison is made.',
    { record_kind: record ? record.kind : null, account_action_context: actionContext });
}

/**
 * OWNER-CA-ORDINARY-REPORT-001: the reach of the Ontario ordinary-report reliability rule (s. 9(3)(a)) is one
 * ordinary account that prints BOTH of its own dates. A record whose opened or closed reading could not be made,
 * or that prints only one of them, leaves the applicability UNRESOLVED — a reading that could not be made is
 * never treated as an absent date, and an absent date is never treated as compliance.
 */
function ordinaryAccountBothDatesPresent(ctx) {
  const rule_id = 'ORDINARY_ACCOUNT_BOTH_DATES_PRESENT';
  const record = ctx.record || null;
  const facts = (record && record.facts) || {};
  const opened = typeof facts['liability.openedDate'] === 'string' && facts['liability.openedDate'] ? facts['liability.openedDate'] : null;
  const closed = typeof facts['liability.closedDate'] === 'string' && facts['liability.closedDate'] ? facts['liability.closedDate'] : null;
  const printed = ctx.printed || {};
  const entryFor = (value) => (value ? Object.values(printed).find((p) => p && p.normalized === value) || null : null);

  if (opened && closed) {
    const openedEntry = entryFor(opened);
    const closedEntry = entryFor(closed);
    return state(APPLICABILITY_STATE.APPLICABLE, rule_id,
      'THE_RECORD_PRINTS_BOTH_OF_ITS_OWN_DATES',
      'This account prints both its own opened date and its own closed date, so the report\'s own values for it can be compared with each other.',
      {
        printed_fields: ['Opened Date', 'Closed Date'],
        opened_value: opened,
        closed_value: closed,
        opened_location: openedEntry ? openedEntry.location : null,
        closed_location: closedEntry ? closedEntry.location : null
      });
  }
  return state(APPLICABILITY_STATE.APPLICABILITY_UNRESOLVED, rule_id,
    (opened || closed) ? 'ONLY_ONE_OF_THE_TWO_PRINTED_DATES_WAS_READ' : 'NEITHER_PRINTED_DATE_WAS_READ',
    'This account does not carry both of its own dates as readable values, so the report\'s own values for it were not compared. A reading that could not be made is not the same as an absent date, and nothing is implied about this account.',
    {
      printed_fields: ['Opened Date', 'Closed Date'],
      opened_value: opened,
      closed_value: closed,
      does_not_infer: 'that either printed date is absent from the report, or that this account is consistent'
    });
}

/**
 * BATCH-11: affirmative adverse-debt evidence on THIS account.
 *
 * A limb whose recorded concern is "unfavourable information about a debt" cannot be resolved from a period
 * alone: an old last-payment date is not itself unfavourable information. This rule decides from what the
 * record PRINTS about this account, using the TransUnion Canada reader's own material:
 *   • the printed 30 / 60 / 90 delinquency counts it reads under their own captions beside `Terms:`, and
 *   • the printed past-due amount.
 * Both are report-authored values on this record. Nothing here invents a date, forces the United States
 * adverse-rating shape onto this reader, or reads a meaning the report's own legend does not print.
 *
 * A count that could not be read is not a zero. Zero counts do not classify the whole account:
 *   • APPLICABLE   — a printed delinquent count above zero, or a printed past-due amount above zero.
 *   • APPLICABILITY_UNRESOLVED — zero counts and zero past due only describe those printed values; they cannot
 *                                establish that no other relevant debt information is reported.
 *   • APPLICABILITY_UNRESOLVED — anything else (unreadable or absent values). Nothing is inferred.
 */
function adverseDebtEvidenceOnThisRecord(ctx) {
  const rule_id = 'ADVERSE_DEBT_EVIDENCE_ON_THIS_RECORD';
  const record = (ctx && ctx.record) || null;
  const facts = (record && record.facts) || {};
  const material = (record && record.account_material) || null;
  const counts = (material && material.payment_history_counts) || null;

  const asCount = (value) => (typeof value === 'string' && /^\d+$/.test(value.trim()) ? Number(value.trim()) : null);

  const delinquent = [];
  let readableCounts = 0;
  if (counts) {
    for (const caption of ['30', '60', '90']) {
      const value = asCount(counts[caption]);
      if (value === null) continue;
      readableCounts += 1;
      if (value > 0) delinquent.push({ caption, printed_value: String(counts[caption]).trim() });
    }
  }
  const pastDue = facts['account.pastDueAmount'];
  const pastDueReadable = typeof pastDue === 'number' && Number.isFinite(pastDue);
  const pastDueAdverse = pastDueReadable && pastDue > 0;

  if (delinquent.length || pastDueAdverse) {
    return state(APPLICABILITY_STATE.APPLICABLE, rule_id,
      'THE_RECORD_PRINTS_ADVERSE_DEBT_INFORMATION_ABOUT_THIS_ACCOUNT',
      'This account prints unfavourable information about itself, so the recorded limit can be measured against it.',
      {
        record_kind: record ? record.kind : null,
        printed_delinquency_counts: delinquent,
        printed_past_due: pastDueReadable ? pastDue : null,
        does_not_establish: 'that any other account on this report carries adverse information'
      });
  }

  if (counts && readableCounts === 3 && delinquent.length === 0 && pastDueReadable && !pastDueAdverse) {
    return state(APPLICABILITY_STATE.APPLICABILITY_UNRESOLVED, rule_id,
      'NO_PRINTED_DELINQUENCY_OR_PAST_DUE_INDICATOR',
      'The printed delinquency counts and past-due amount are zero. Those values do not classify the account or settle whether other relevant debt information is reported.',
      { printed_delinquency_counts: { 30: counts['30'], 60: counts['60'], 90: counts['90'] }, printed_past_due: pastDue });
  }

  return state(APPLICABILITY_STATE.APPLICABILITY_UNRESOLVED, rule_id,
    counts ? 'THE_PRINTED_COUNTS_OR_THE_PAST_DUE_AMOUNT_COULD_NOT_BE_READ_AS_VALUES' : 'THE_RECORD_PRINTS_NO_READABLE_DELINQUENCY_COUNTS_FOR_THIS_ACCOUNT',
    'This build could not read unfavourable-information evidence about this account, so this limit was not applied to it. A count that could not be read is not the same as a zero, and nothing is implied about this account.',
    {
      record_kind: record ? record.kind : null,
      printed_counts_present: Boolean(counts),
      printed_past_due_present: pastDueReadable,
      does_not_infer: 'that this account carries adverse information, or that it is satisfactory'
    });
}

const APPLICABILITY_RULES = Object.freeze({
  PUBLIC_RECORD_ITEM_PRESENT_OR_EXPLICITLY_ABSENT: publicRecordItemPresentOrExplicitlyAbsent,
  PUBLIC_RECORD_RECORD_PRESENT: publicRecordRecordPresent,
  JUDGMENT_PUBLIC_RECORD_PRESENT: judgmentPublicRecordPresent,
  CRIMINAL_CHARGE_PRESENT: criminalChargePresent,
  ADVERSE_PAYMENT_RATING_ITEM_PRESENT: adversePaymentRatingItemPresent,
  COLLECTION_OR_CHARGE_OFF_PRESENT: collectionOrChargeOffPresent,
  COLLECTION_RECORD_PRESENT: collectionRecordPresent,
  ADVERSE_RATING_ACTION_CONTEXT: adverseRatingActionContext,
  ADVERSE_DEBT_EVIDENCE_ON_THIS_RECORD: adverseDebtEvidenceOnThisRecord,
  LIABILITY_CLOSED_DATE_OR_EXPLICITLY_STATED_STATUS: liabilityClosedDateOrExplicitlyStatedStatus,
  ORDINARY_ACCOUNT_BOTH_DATES_PRESENT: ordinaryAccountBothDatesPresent
});

/**
 * Resolve one adapter's applicability. An adapter with NO declared rule keeps the behavior it had: it is
 * APPLICABLE and the runner decides from the record as it always did. A rule the build does not know is
 * UNRESOLVED rather than silently skipped, so a typo cannot quietly turn a rule off.
 */
function resolveApplicability(adapterConfig, extraction, record) {
  const ruleId = adapterConfig && adapterConfig.applicability_rule;
  if (!ruleId) return null;
  const rule = APPLICABILITY_RULES[ruleId];
  if (!rule) {
    return state(APPLICABILITY_STATE.APPLICABILITY_UNRESOLVED, ruleId,
      'NO_SUCH_APPLICABILITY_RULE_IS_REGISTERED_IN_THIS_BUILD',
      'This check declares an applicability rule this build does not implement, so it was not applied.', null);
  }
  return rule(contextOf(extraction, record));
}

module.exports = {
  APPLICABILITY_STATE,
  APPLICABILITY_RULES,
  resolveApplicability
};
