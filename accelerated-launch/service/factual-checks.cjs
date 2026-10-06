'use strict';
/**
 * factual-checks.cjs — the named, NON-STATUTORY factual checks, for every country this build reads.
 *
 * OWNER-ALL82-001 / B3 continuation. The owner directed that, for Canada, the assessment be built from
 * "useful report consistency/completeness observations whose meaning is demonstrable from printed report
 * facts", and that GB policy observations be "explicitly labeled ... and never presented as statutory
 * findings". This module is that third check class, and it is deliberately neither of the other two:
 *
 *   1. STATUTORY RULE COMPARISONS — `rule-adapters.cjs` binds a RECORDED LEGAL RULE to a jurisdiction, a
 *      period and an anchor, is gated by the explicit per-region applicability records, and measures a legal
 *      clock. Nothing in this module names a statute, a provision, a legal period or a legal event.
 *   2. POLICY OBSERVATIONS — a comparison against a policy statement THE REPORT ITSELF PRINTS. It is labelled
 *      `PRINTED_POLICY_OBSERVATION`, it is capped at an observation, and it is never a statutory finding.
 *   3. REPORT FACT CHECKS — a comparison of two things the report prints against each other. It asserts
 *      nothing about the law, and it draws no conclusion from a difference it finds.
 *
 * Three invariants, and each one is a test:
 *   • A DIFFERENCE IS NOT A CONCLUSION. A check reports that two printed facts do not agree. It never says
 *     what that means, and `plain` never upgrades a difference into a finding.
 *   • TWO VALUES ARE ONLY COMPARED WHEN THEIR MEANINGS MATCH. A date is never compared with a different
 *     date's meaning, an amount is never compared with a balance, a `Highest Balance` is never compared with
 *     a `Balance`, and two similar creditor names are never the same account.
 *   • AN UNCERTAIN FIELD RESTRICTS ONLY ITS OWN CHECK. A field that cannot be read is recorded inside the
 *     check that needed it, and never blanks, defaults or disables another check.
 *
 * The applicability vocabulary is the SHARED one (`applicability.cjs`), because the question "does this check
 * reach this report at all?" is the same question there. The outcome vocabulary is this module's own, because
 * a factual comparison has no period, no anchor and no arithmetic outcome to report.
 */

const { APPLICABILITY_STATE } = require('./applicability.cjs');
const tuCa = require('./format-families/tu-ca-consumer.cjs');
const { GENERAL_PRESENTATION_ID } = require('./general-intake.cjs');

/** The two check classes this module may declare. Neither is a statutory check. */
const CHECK_CLASS = Object.freeze({
  REPORT_FACT_CONSISTENCY: 'REPORT_FACT_CONSISTENCY',
  PRINTED_POLICY_OBSERVATION: 'PRINTED_POLICY_OBSERVATION'
});

/** Whether two printed facts agreed. `null` means the check ran but compared nothing it could read. */
const AGREEMENT = Object.freeze({
  NO_DIFFERENCE_FOUND: 'NO_DIFFERENCE_FOUND',
  A_DIFFERENCE_WAS_FOUND: 'A_DIFFERENCE_WAS_FOUND'
});

const OUTPUT_CEILING = 'observation';

function state(applicability, reason, plain) {
  return { applicability, reason, plain };
}

/** A check result, in one shape, whoever computed it. */
function result(check, applicability, reason, plain, outcome, agreement, extra) {
  return Object.assign({
    check_id: check.check_id,
    title: check.title,
    check_class: check.check_class,
    output_level: OUTPUT_CEILING,
    is_a_finding: false,
    citation: null,
    applicability,
    reason,
    plain,
    performed: applicability === APPLICABILITY_STATE.APPLICABLE && agreement !== null,
    outcome,
    agreement
  }, extra || {});
}

/** The reading surface a check is given. Nothing else is passed in, and no check reaches outside it. */
function contextOf(extraction) {
  const view = (extraction && extraction.evidence_readings && extraction.evidence_readings.factual_view) || null;
  return {
    view,
    records: (view && view.records) || [],
    reference_date: (view && view.reference_date) || null,
    summary_counts: (view && view.summary_counts) || [],
    identity_groups: (view && view.identity_groups) || [],
    policy_statements: (view && view.policy_statements) || [],
    report_text_retained: Boolean(view && view.report_text_retained)
  };
}

/* ------------------------------------------------------------------ shared reading helpers */

/** The value of one labelled field on one record, in the reader's five-state vocabulary. */
function fieldOf(record, label) {
  return (record && record.printed && record.printed[label]) || { label, state: 'NOT_PRINTED', raw: null, normalized: null, reason: 'LABEL_NOT_PRINTED_ON_THIS_RECORD', location: null };
}

/** Why a field could not be used in a comparison, in the field's own words. */
function notUsable(field) {
  return { label: field.label, state: field.state, reason: field.reason || field.state, location: field.location || null };
}

/** The records of the given kind, or of any of the given kinds. A record is never lent to another kind. */
function recordsOfKind(ctx, kind) {
  const kinds = Array.isArray(kind) ? kind : [kind];
  return ctx.records.filter((r) => kinds.includes(r.kind));
}

/** Every date a record prints, as this build reads it, with the label it was printed under. */
function printedDates(record, dateLabels) {
  return dateLabels
    .map((label) => ({ label, field: fieldOf(record, label) }))
    .filter((entry) => entry.field.state === 'VALUE' && entry.field.normalized)
    .map((entry) => ({ label: entry.label, iso: entry.field.normalized, raw: entry.field.raw, location: entry.field.location }));
}

function daysBetween(fromIso, toIso) {
  const from = Date.parse(`${fromIso}T00:00:00Z`);
  const to = Date.parse(`${toIso}T00:00:00Z`);
  if (Number.isNaN(from) || Number.isNaN(to)) return null;
  return Math.round((to - from) / 86400000);
}

function addYears(iso, years) {
  const [y, m, d] = iso.split('-').map(Number);
  const target = `${String(y + years).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return target;
}

/* ------------------------------------------------------ check: a printed date later than the report's own date */

/**
 * Every date the report prints on an item, against the date the report prints on itself. A report cannot
 * record a past event on a date later than the date it was produced; a printed later date is therefore a
 * difference between two of the report's own statements, reported as such and concluded from in no way.
 */
function itemDateAfterReportDate(spec) {
  const check = {
    check_id: spec.check_id,
    title: 'A date printed on an entry, against the date your report gives for itself',
    check_class: CHECK_CLASS.REPORT_FACT_CONSISTENCY,
      presentation_ids: spec.presentation_ids || null
  };
  return Object.assign({}, check, {
    run(ctx) {
      const records = recordsOfKind(ctx, spec.record_kinds);
      if (!records.length) {
        return result(check, APPLICABILITY_STATE.NOT_APPLICABLE,
          `THE_REPORT_CARRIES_NO_RECORD_OF_KIND:${spec.record_kinds.join('_OR_')}`,
          `Your report carries no ${spec.record_noun} for this check to look at, so nothing was compared and nothing is implied about the entries it does carry.`,
          null, null, { examined: [], not_examinable: [] });
      }
      const reference = ctx.reference_date;
      if (!reference || reference.status !== 'RESOLVED' || !reference.normalized) {
        return result(check, APPLICABILITY_STATE.APPLICABILITY_UNRESOLVED,
          reference && reference.reason ? reference.reason : 'THE_REPORT_DATE_COULD_NOT_BE_READ',
          'The date your report gives for itself could not be read, so this comparison was not made. Nothing was assumed in its place.',
          null, null, { examined: [], not_examinable: [] });
      }
      const later = [];
      const examined = [];
      const notExaminable = [];
      for (const record of records) {
        const labels = spec.date_labels_by_kind[record.kind] || [];
        const dates = printedDates(record, labels);
        for (const label of labels) {
          const field = fieldOf(record, label);
          if (field.state !== 'NOT_PRINTED' && field.state !== 'VALUE') {
            notExaminable.push(Object.assign({ record_index: record.record_index, record_kind: record.kind }, notUsable(field)));
          }
        }
        for (const date of dates) {
          examined.push({ record_index: record.record_index, label: date.label, printed_value: date.raw });
          const gap = daysBetween(date.iso, reference.normalized);
          if (gap < 0) {
            later.push({
              record_index: record.record_index,
              label: date.label,
              printed_value: date.raw,
              printed_date: date.iso,
              report_date: reference.raw,
              report_date_iso: reference.normalized,
              days_after_the_report_date: Math.abs(gap),
              location: date.location
            });
          }
        }
      }
      if (!examined.length) {
        return result(check, APPLICABILITY_STATE.APPLICABLE, 'NO_DATE_PRINTED_ON_A_RECORD_OF_THIS_KIND_COULD_BE_READ',
          'This check needed a date your report prints on one of its entries, and no such date could be read. A date that could not be read is not an absent date and is not a date that agrees.',
          null, null, { examined: [], not_examinable: notExaminable });
      }
      const evidence = {
        report_date: reference.raw,
        report_date_iso: reference.normalized,
        report_date_location: reference.location,
        dates_examined: examined.length,
        dates_later_than_the_report_date: later
      };
      if (later.length) {
        const first = later[0];
        return result(check, APPLICABILITY_STATE.APPLICABLE,
          'A_DATE_PRINTED_ON_AN_ENTRY_IS_LATER_THAN_THE_DATE_THE_REPORT_GIVES_FOR_ITSELF',
          `Your report is dated ${reference.raw} and it prints ${first.printed_value} beside "${first.label}" on ${spec.record_noun} ${first.record_index}. A report cannot record a past event on a date later than the report's own date. Some entries print a scheduled or prospective date, so this is a difference between two things your report prints: it is reported for you to check, and no conclusion is drawn from it.`,
          'A_PRINTED_ITEM_DATE_IS_LATER_THAN_THE_REPORT_DATE', AGREEMENT.A_DIFFERENCE_WAS_FOUND,
          { examined, not_examinable: notExaminable, evidence });
      }
      return result(check, APPLICABILITY_STATE.APPLICABLE, 'EVERY_READABLE_PRINTED_DATE_IS_ON_OR_BEFORE_THE_REPORT_DATE',
        `Every date this build could read on your ${spec.record_noun_plural} falls on or before the date your report gives for itself (${reference.raw}). ${examined.length} printed date${examined.length === 1 ? ' was' : 's were'} compared.`,
        'EVERY_PRINTED_DATE_IS_ON_OR_BEFORE_THE_REPORT_DATE', AGREEMENT.NO_DIFFERENCE_FOUND,
        { examined, not_examinable: notExaminable, evidence });
    }
  });
}

/* ------------------------------------------------------ check: an order between two dates whose meanings fix it */

/**
 * Two dates whose printed labels establish their order, on one record. Only pairs whose meanings fix the
 * order are compared, and a pair is skipped unless BOTH of its dates were read. A date is never compared
 * against a date with a different meaning, and a blank label is never read as a zero.
 */
function dateOrderWithinRecord(spec) {
  const check = {
    check_id: spec.check_id,
    title: 'The order of two dates printed on the same entry',
    check_class: CHECK_CLASS.REPORT_FACT_CONSISTENCY,
      presentation_ids: spec.presentation_ids || null
  };
  return Object.assign({}, check, {
    run(ctx) {
      const groupsWithRecords = spec.pair_groups
        .map((group) => ({ group, records: recordsOfKind(ctx, group.record_kind) }))
        .filter((entry) => entry.records.length);
      if (!groupsWithRecords.length) {
        return result(check, APPLICABILITY_STATE.NOT_APPLICABLE,
          `THE_REPORT_CARRIES_NO_RECORD_OF_KIND:${spec.pair_groups.map((g) => g.record_kind).join('_OR_')}`,
          `Your report carries no ${spec.record_noun} for this check to look at, so nothing was compared.`,
          null, null, { examined: [], not_examinable: [] });
      }
      const examined = [];
      const notExaminable = [];
      const outOfOrder = [];
      for (const entry of groupsWithRecords) {
        for (const record of entry.records) {
          for (const pair of entry.group.ordered_pairs) {
            const earlier = fieldOf(record, pair[0]);
            const later = fieldOf(record, pair[1]);
            if (earlier.state !== 'VALUE' || later.state !== 'VALUE') {
              notExaminable.push({
                record_index: record.record_index,
                record_kind: record.kind,
                pair: [pair[0], pair[1]],
                because: earlier.state !== 'VALUE' ? notUsable(earlier) : notUsable(later)
              });
              continue;
            }
            const comparison = {
              record_index: record.record_index,
              record_kind: record.kind,
              pair: [pair[0], pair[1]],
              printed_values: [earlier.raw, later.raw],
              printed_dates: [earlier.normalized, later.normalized],
              order_holds: daysBetween(earlier.normalized, later.normalized) >= 0,
              location: later.location
            };
            examined.push(comparison);
            if (!comparison.order_holds) outOfOrder.push(comparison);
          }
        }
      }
      const evidence = {
        ordered_pairs_compared: spec.pair_groups,
        why_these_pairs: spec.why_these_pairs,
        pairs_examined: examined.length,
        pairs_out_of_order: outOfOrder
      };
      if (!examined.length) {
        return result(check, APPLICABILITY_STATE.APPLICABLE, 'NO_PAIR_PRINTED_BY_THIS_CHECK_COULD_BE_READ',
          'This check needed two dates printed on the same entry, and no such pair could be read. A label printed with no value is not a zero, and a date that could not be read is not an absent date.',
          null, null, { examined, not_examinable: notExaminable, evidence });
      }
      if (outOfOrder.length) {
        const first = outOfOrder[0];
        return result(check, APPLICABILITY_STATE.APPLICABLE,
          'A_DATE_PRINTED_ON_AN_ENTRY_IS_EARLIER_THAN_A_DATE_THAT_MUST_PRECEDE_IT',
          `${spec.record_noun} ${first.record_index} prints "${first.pair[0]}" as ${first.printed_values[0]} and "${first.pair[1]}" as ${first.printed_values[1]}. Those two printed dates are the wrong way round. This is a difference between two things your report prints, reported for you to check, and no conclusion is drawn from it.`,
          'TWO_PRINTED_DATES_ON_ONE_ENTRY_ARE_IN_THE_WRONG_ORDER', AGREEMENT.A_DIFFERENCE_WAS_FOUND,
          { examined, not_examinable: notExaminable, evidence });
      }
      return result(check, APPLICABILITY_STATE.APPLICABLE, 'EVERY_READABLE_PRINTED_PAIR_IS_IN_THE_ORDER_ITS_LABELS_ESTABLISH',
        `On your ${spec.record_noun_plural}, every pair of dates this build could read is in the order their own printed labels establish. ${examined.length} pair${examined.length === 1 ? ' was' : 's were'} compared.`,
        'EVERY_PRINTED_PAIR_IS_IN_THE_ORDER_ITS_LABELS_ESTABLISH', AGREEMENT.NO_DIFFERENCE_FOUND,
        { examined, not_examinable: notExaminable, evidence });
    }
  });
}

/* ------------------------------------------------------ check: a printed category count against the entries printed under it */

/**
 * The report prints its own summary, and under each category it prints the entries that category is about.
 * This check compares those two printed statements. It reads a category only when the report prints
 * something this build can count inside it — its own entry boundary or its own affirmative statement that
 * nothing appears. A section that prints neither is reported NOT_EXAMINABLE, and its count is never assumed.
 */
function summaryCountVersusItems(spec) {
  const check = {
    check_id: spec.check_id,
    title: 'The counts your report prints for its own categories, against the entries printed under them',
    check_class: CHECK_CLASS.REPORT_FACT_CONSISTENCY,
      presentation_ids: spec.presentation_ids || null
  };
  return Object.assign({}, check, {
    run(ctx) {
      const captions = ctx.summary_counts;
      if (!captions.length) {
        return result(check, APPLICABILITY_STATE.NOT_APPLICABLE, 'THE_REPORT_PRINTS_NO_CATEGORY_COUNT',
          'Your report does not print a count beside its own categories, so there was nothing for this check to compare.',
          null, null, { examined: [], not_examinable: [] });
      }
      const examined = [];
      const notExaminable = [];
      const differing = [];
      for (const caption of captions) {
        if (!caption.examinable) {
          notExaminable.push({
            category: caption.category,
            summary_block: caption.summary_block,
            stated_count: caption.stated_count,
            because: caption.reason,
            caption_location: caption.caption_location
          });
          continue;
        }
        const entry = {
          category: caption.category,
          summary_block: caption.summary_block,
          stated_count: caption.stated_count,
          entries_counted: caption.printed_item_count,
          counted_by: caption.item_boundary,
          absence_statement_printed: caption.absence_statement_printed,
          agrees: caption.stated_count === caption.printed_item_count,
          caption_location: caption.caption_location
        };
        examined.push(entry);
        if (!entry.agrees) differing.push(entry);
      }
      const evidence = {
        categories_compared: examined.length,
        categories_not_comparable: notExaminable.length,
        categories_where_the_two_statements_differ: differing
      };
      if (!examined.length) {
        return result(check, APPLICABILITY_STATE.APPLICABILITY_UNRESOLVED, 'NO_PRINTED_CATEGORY_COULD_BE_COUNTED_FROM_THE_REPORT',
          'Your report prints category counts, and this build could not count the entries printed under any of them, so the comparison was not made. A count that could not be checked is not a count that agrees.',
          null, null, { examined, not_examinable: notExaminable, evidence });
      }
      if (differing.length) {
        const first = differing[0];
        return result(check, APPLICABILITY_STATE.APPLICABLE,
          'A_PRINTED_CATEGORY_COUNT_DOES_NOT_MATCH_THE_ENTRIES_PRINTED_UNDER_THAT_CATEGORY',
          `Your report states ${first.stated_count} for its "${first.category}" category, and this build counted ${first.entries_counted} entries printed under it. That is a difference between two things your report itself prints. It is reported for you to check, and no conclusion is drawn from it.`,
          'A_PRINTED_CATEGORY_COUNT_DIFFERS_FROM_THE_ENTRIES_PRINTED_UNDER_IT', AGREEMENT.A_DIFFERENCE_WAS_FOUND,
          { examined, not_examinable: notExaminable, evidence });
      }
      return result(check, APPLICABILITY_STATE.APPLICABLE, 'EVERY_COMPARABLE_PRINTED_CATEGORY_COUNT_MATCHES_THE_ENTRIES_UNDER_IT',
        `Your report prints a count beside each of its own categories. ${examined.length} categor${examined.length === 1 ? 'y was' : 'ies were'} compared with the entries printed under ${examined.length === 1 ? 'it' : 'them'}, and each matches.`,
        'EVERY_COMPARABLE_PRINTED_CATEGORY_COUNT_MATCHES', AGREEMENT.NO_DIFFERENCE_FOUND,
        { examined, not_examinable: notExaminable, evidence });
    }
  });
}

/* ------------------------------------------------------ check: values printed about the SAME debt, on records that print the same identifiers */

/**
 * Two entries can be the same debt only when they print the SAME secure identifiers — a member number AND
 * an account number. A name is NEVER an input: two similar creditor names are not the same account, and the
 * reader never offers a name here. Only values whose meaning is a fixed fact about the debt itself are
 * compared; a value whose meaning is per-placement (when the debt was assigned, to whom) is never compared
 * across placements. A field printed more than once inside ONE record is also compared with itself.
 */
function sameDebtValueConflict(spec) {
  const check = {
    check_id: spec.check_id,
    title: 'Values your report prints about one debt, on the entries that print the same account and member number',
    check_class: CHECK_CLASS.REPORT_FACT_CONSISTENCY,
      presentation_ids: spec.presentation_ids || null
  };
  return Object.assign({}, check, {
    run(ctx) {
      const groups = ctx.identity_groups;
      const byIndex = new Map(recordsOfKind(ctx, spec.record_kind).map((r) => [r.record_index, r]));
      const repeated = [];
      const conflicts = [];
      const examined = [];
      const notExaminable = [];

      for (const group of groups) {
        const groupRecords = group.record_indexes.map((i) => byIndex.get(i)).filter(Boolean);
        for (const label of spec.fixed_meaning_labels) {
          const readings = groupRecords.map((r) => ({ record_index: r.record_index, field: fieldOf(r, label) }));
          for (const reading of readings) {
            if (reading.field.state !== 'VALUE') {
              notExaminable.push({
                record_index: reading.record_index,
                matched_group: group.record_indexes,
                label,
                because: notUsable(reading.field)
              });
            }
          }
          if (readings.some((r) => r.field.state !== 'VALUE')) continue;
          const distinct = [...new Set(readings.map((r) => `${r.field.raw}`))];
          const entry = {
            matched_group: group.record_indexes,
            matched_on: group.matched_on,
            label,
            printed_values: readings.map((r) => ({ record_index: r.record_index, printed_value: r.field.raw })),
            values_agree: distinct.length === 1
          };
          examined.push(entry);
          if (!entry.values_agree) conflicts.push(entry);
        }
      }

      for (const record of recordsOfKind(ctx, spec.record_kind)) {
        for (const label of spec.fixed_meaning_labels) {
          const field = fieldOf(record, label);
          if ((field.printed_times_in_record || 0) < 2) continue;
          const values = field.printed_values || [];
          const entry = {
            record_index: record.record_index,
            label,
            printed_times_in_record: field.printed_times_in_record,
            printed_values: values,
            values_agree: values.length > 1 ? new Set(values).size === 1 : null
          };
          repeated.push(entry);
          if (entry.values_agree === false) conflicts.push(entry);
        }
      }

      const evidence = {
        matched_on: spec.matched_on,
        fixed_meaning_labels_compared: spec.fixed_meaning_labels,
        why_these_labels: spec.why_these_labels,
        groups_matched_by_printed_identifiers: groups,
        comparisons_examined: examined.length,
        labels_repeated_inside_one_record: repeated,
        conflicts
      };
      return sameDebtOutcome(check, { groups, repeated, examined, notExaminable, conflicts, evidence });
    }
  });
}

/** The decision table of the same-debt check, kept separate so the comparison stays readable. */
function sameDebtOutcome(check, io) {
  const { groups, repeated, examined, notExaminable, conflicts, evidence } = io;
  if (!groups.length && !repeated.length) {
    return result(check, APPLICABILITY_STATE.NOT_APPLICABLE, 'NO_TWO_RECORDS_PRINT_THE_SAME_MEMBER_NUMBER_AND_ACCOUNT_NUMBER',
      'No two entries on your report print the same account number and member number, so this check had no securely matched pair to compare. Nothing was matched by name, and nothing is implied about the entries that were not matched.',
      null, null, { examined, not_examinable: notExaminable, evidence });
  }
  if (!examined.length && !repeated.filter((r) => r.values_agree !== null).length) {
    return result(check, APPLICABILITY_STATE.APPLICABLE, 'NO_VALUE_THIS_CHECK_COMPARES_COULD_BE_READ',
      'The entries this check securely matched print no value this check compares, so the comparison was not made. A value that could not be read is not an absent value and is not a value that agrees.',
      null, null, { examined, not_examinable: notExaminable, evidence });
  }
  if (conflicts.length) {
    const first = conflicts[0];
    const detail = first.matched_group
      ? `Entries ${first.matched_group.join(' and ')} print the same member number and account number, and they print different values for "${first.label}".`
      : `Entry ${first.record_index} prints "${first.label}" more than once with different values.`;
    return result(check, APPLICABILITY_STATE.APPLICABLE,
      'THE_SAME_DEBT_CARRIES_TWO_DIFFERENT_PRINTED_VALUES_FOR_ONE_FIELD',
      `${detail} Those are two things your report prints, set against each other. This is reported for you to check, and no conclusion is drawn from it.`,
      'TWO_DIFFERENT_VALUES_ARE_PRINTED_FOR_ONE_FIELD_OF_ONE_DEBT', AGREEMENT.A_DIFFERENCE_WAS_FOUND,
      { examined, not_examinable: notExaminable, evidence });
  }
  const compared = examined.length + repeated.filter((r) => r.values_agree !== null).length;
  return result(check, APPLICABILITY_STATE.APPLICABLE, 'EVERY_COMPARABLE_VALUE_ABOUT_ONE_DEBT_AGREES',
    `On the entries this build could securely match by their own printed account and member numbers, the values compared agree. ${compared} comparison${compared === 1 ? ' was' : 's were'} made.`,
    'EVERY_COMPARABLE_VALUE_ABOUT_ONE_DEBT_AGREES', AGREEMENT.NO_DIFFERENCE_FOUND,
    { examined, not_examinable: notExaminable, evidence });
}

/* ------------------------------------------------------ check: the retention period THE REPORT ITSELF STATES, against the entries it states it for */

/**
 * A POLICY OBSERVATION, and labelled as one everywhere it appears. It names no statute, no provision and no
 * legal period. It compares two things the artifact prints: a retention statement the report prints about a
 * class of entry, and the date that entry prints for the event the statement names. The observation is only
 * computed for a class whose statement the report actually prints — a policy an artifact does not state is
 * not a policy this build may read into it.
 */
function printedRetentionPolicyObservation(spec) {
  const check = {
    check_id: spec.check_id,
    title: 'The retention period your report states for a class of entry, against the date that entry prints',
    check_class: CHECK_CLASS.PRINTED_POLICY_OBSERVATION,
      presentation_ids: spec.presentation_ids || null
  };
  return Object.assign({}, check, {
    run(ctx) {
      const statements = ctx.policy_statements;
      if (!statements.length) {
        return result(check, APPLICABILITY_STATE.NOT_APPLICABLE, 'THIS_READER_RECORDS_NO_RETENTION_STATEMENT_FOR_THIS_PRESENTATION',
          'This report format carries no retention statement this build records, so there was nothing for this observation to compare. Nothing was assumed.',
          null, null, { examined: [], not_examinable: [], evidence: { policy_statements: [] } });
      }
      const printed = statements.filter((s) => s.printed);
      if (!printed.length) {
        return result(check, APPLICABILITY_STATE.NOT_APPLICABLE, 'THE_REPORT_PRINTS_NONE_OF_THE_RETENTION_STATEMENTS_THIS_BUILD_RECORDS',
          'Your report does not print any retention statement this build records, so no observation was made. A statement that is not printed is not a statement the report makes.',
          null, null, { examined: [], not_examinable: [], evidence: { policy_statements: statements } });
      }
      const reference = ctx.reference_date;
      if (!reference || reference.status !== 'RESOLVED' || !reference.normalized) {
        return result(check, APPLICABILITY_STATE.APPLICABILITY_UNRESOLVED,
          reference && reference.reason ? reference.reason : 'THE_REPORT_DATE_COULD_NOT_BE_READ',
          'The date your report gives for itself could not be read, so this observation was not made. Nothing was assumed in its place.',
          null, null, { examined: [], not_examinable: [], evidence: { policy_statements: statements } });
      }
      return policyOutcome(check, reference, printed, ctx);
    }
  });
}

/** The comparison the policy observation makes, kept separate so the check above stays readable. */
function policyOutcome(check, reference, printed, ctx) {
  const examined = [];
  const notExaminable = [];
  const outside = [];
  for (const statement of printed) {
    const candidates = recordsOfKind(ctx, statement.item_kind).filter((record) => {
      const field = fieldOf(record, statement.applies_when_field);
      if (statement.applies_when_value_contains) {
        return field.state === 'VALUE' && String(field.raw).toUpperCase().includes(statement.applies_when_value_contains);
      }
      return field.state === 'VALUE';
    });
    for (const record of candidates) {
      const anchor = fieldOf(record, statement.anchor_label);
      if (anchor.state !== 'VALUE') {
        notExaminable.push({
          policy_id: statement.policy_id,
          record_index: record.record_index,
          anchor_label: statement.anchor_label,
          because: notUsable(anchor)
        });
        continue;
      }
      const end = addYears(anchor.normalized, statement.period_years);
      const within = daysBetween(reference.normalized, end) >= 0;
      const entry = {
        policy_id: statement.policy_id,
        record_index: record.record_index,
        anchor_label: statement.anchor_label,
        anchor_printed_value: anchor.raw,
        anchor_printed_date: anchor.normalized,
        period_years: statement.period_years,
        period_ends_on: end,
        report_date: reference.raw,
        report_date_iso: reference.normalized,
        inside_the_period_the_report_states: within,
        location: anchor.location,
        sentence: statement.sentence
      };
      examined.push(entry);
      if (!within) outside.push(entry);
    }
  }
  const evidence = {
    observation_class: 'PRINTED_POLICY_OBSERVATION_NOT_A_STATUTORY_FINDING',
    policy_statements_recorded: ctx.policy_statements.length,
    policy_statements_printed_by_the_report: printed.length,
    entries_examined: examined.length,
    entries_printed_beyond_the_period_the_report_states: outside,
    comparison: 'the entry\'s own printed event date, plus the period the report itself states, against the date the report gives for itself',
    calendar_convention: 'a whole number of years added to the printed event date, day for day'
  };
  if (!examined.length) {
    return result(check, APPLICABILITY_STATE.APPLICABLE, 'NO_ENTRY_THE_PRINTED_STATEMENT_APPLIES_TO_CARRIES_A_READABLE_DATE',
      'Your report prints a retention statement, and no entry it applies to carries a date this build could read. A date that could not be read is not an absent date and is not a period that has run out.',
      null, null, { examined, not_examinable: notExaminable, evidence });
  }
  if (outside.length) {
    const first = outside[0];
    return result(check, APPLICABILITY_STATE.APPLICABLE,
      'AN_ENTRY_IS_PRINTED_BEYOND_THE_PERIOD_THE_REPORT_ITSELF_STATES_FOR_ITS_CLASS',
      `Your report states its own policy: "${first.sentence}" Entry ${first.record_index} prints "${first.anchor_label}" as ${first.anchor_printed_value}, so the period the report states would end on ${first.period_ends_on}, and the report gives its own date as ${first.report_date}. This compares the report's own two printed statements. It is a policy observation and not a statutory finding, and no conclusion is drawn from it.`,
      'AN_ENTRY_IS_PRINTED_BEYOND_THE_PERIOD_THE_REPORT_STATES', AGREEMENT.A_DIFFERENCE_WAS_FOUND,
      { examined, not_examinable: notExaminable, evidence });
  }
  return result(check, APPLICABILITY_STATE.APPLICABLE,
    'EVERY_ENTRY_IS_INSIDE_THE_PERIOD_THE_REPORT_ITSELF_STATES_FOR_ITS_CLASS',
    `Your report prints its own retention statements, and every entry this build could read falls inside the period the report itself states for its class (${examined.length} entr${examined.length === 1 ? 'y' : 'ies'} checked). This is a policy observation and not a statutory finding.`,
    'EVERY_ENTRY_IS_INSIDE_THE_PERIOD_THE_REPORT_STATES', AGREEMENT.NO_DIFFERENCE_FOUND,
    { examined, not_examinable: notExaminable, evidence });
}

/* ------------------------------------------------------------------ the country registries */

/** The Canadian checks. Every one is a comparison of two things the Canadian presentation prints. */
/**
 * The Canadian checks. Every one is a comparison of two things the Canadian presentation prints.
 *
 * B4 CONTINUATION: the four below are written for the EQUIFAX Canada layout (`PR-01`) — they read a
 * `Collections` record and its `Date Assigned` / `First Delinquency` / `Date Paid/Settled` / `Date Verified` /
 * `Last Payment Date` row set, and a `Member Number` + `Account Number` pair. Those labels do not exist on the
 * TransUnion layout, so these checks declare `PR-01` and are not run against it. The TransUnion checks that
 * follow declare its own presentation.
 */
const CA_CHECKS = Object.freeze([
  Object.freeze(summaryCountVersusItems({ check_id: 'CA-FACT-SUMMARY-COUNT-VS-ITEMS', presentation_ids: ['PR-01'] })),
  Object.freeze(itemDateAfterReportDate({
    check_id: 'CA-FACT-ITEM-DATE-AFTER-REPORT-DATE',
    presentation_ids: ['PR-01'],
    record_kinds: ['COLLECTION'],
    record_noun: 'collection entry',
    record_noun_plural: 'collection entries',
    date_labels_by_kind: Object.freeze({
      COLLECTION: Object.freeze(['Date Assigned', 'First Delinquency', 'Date Paid/Settled', 'Date Verified', 'Last Payment Date'])
    })
  })),
  Object.freeze(dateOrderWithinRecord({
    check_id: 'CA-FACT-DATE-ORDER-WITHIN-RECORD',
    presentation_ids: ['PR-01'],
    record_noun: 'collection entry',
    record_noun_plural: 'collection entries',
    why_these_pairs: 'a debt cannot be placed for collection before it first became delinquent, and a settlement or a verification cannot precede the placement it follows',
    pair_groups: Object.freeze([Object.freeze({
      record_kind: 'COLLECTION',
      ordered_pairs: Object.freeze([
        Object.freeze(['First Delinquency', 'Date Assigned']),
        Object.freeze(['Date Assigned', 'Date Paid/Settled']),
        Object.freeze(['Date Assigned', 'Date Verified'])
      ])
    })])
  })),
  Object.freeze(sameDebtValueConflict({
    check_id: 'CA-FACT-SAME-DEBT-PRINTED-VALUE-CONFLICT',
    presentation_ids: ['PR-01'],
    record_kind: 'COLLECTION',
    matched_on: Object.freeze(['Member Number', 'Account Number']),
    fixed_meaning_labels: Object.freeze(['First Delinquency']),
    why_these_labels: 'First Delinquency is a fact about the debt itself. Date Assigned, the collector and the amount are per-placement facts, so they are never compared across two placements of one debt.'
  })),
  /* ---------------------------------------------------------------- the TransUnion Canada layout */
  Object.freeze(itemDateAfterReportDate({
    check_id: 'CA-TU-FACT-ITEM-DATE-AFTER-REPORT-DATE',
    presentation_ids: [tuCa.FAMILY_ID],
    record_kinds: ['TU_CA_TRADELINE', 'TU_CA_INQUIRY'],
    record_noun: 'entry on your TransUnion disclosure',
    record_noun_plural: 'entries on your TransUnion disclosure',
    why_these_kinds: 'the two kinds of entry this layout prints a date on: its account blocks and its enquiry rows',
    date_labels_by_kind: Object.freeze({
      TU_CA_TRADELINE: Object.freeze(tuCa.TRADELINE_DATE_LABELS.slice()),
      TU_CA_INQUIRY: Object.freeze(['Date'])
    })
  })),
  Object.freeze(dateOrderWithinRecord({
    check_id: 'CA-TU-FACT-DATE-ORDER-WITHIN-TRADELINE',
    presentation_ids: [tuCa.FAMILY_ID],
    record_noun: 'account on your TransUnion disclosure',
    record_noun_plural: 'accounts on your TransUnion disclosure',
    why_these_pairs: 'an account cannot be reported, closed, charged off, last-paid or given a balloon payment before it was opened, and a printed date that says otherwise is a difference between two things the report prints',
    pair_groups: Object.freeze([Object.freeze({
      record_kind: 'TU_CA_TRADELINE',
      ordered_pairs: Object.freeze([
        Object.freeze(['Opened Date', 'Reported Date']),
        Object.freeze(['Opened Date', 'Last Payment Date']),
        Object.freeze(['Opened Date', 'Closed Date']),
        Object.freeze(['Opened Date', 'Charge Off Date']),
        Object.freeze(['Opened Date', 'Posted Date']),
        Object.freeze(['Opened Date', 'Balloon Payment Date'])
      ])
    })])
  }))
]);

/**
 * The GB checks. The first two compare two things the artifact prints. The third is a POLICY OBSERVATION
 * against a retention statement the artifact prints about its own classes, and it is labelled as one.
 */
const GB_CHECKS = Object.freeze([
  Object.freeze(itemDateAfterReportDate({
    check_id: 'GB-FACT-ITEM-DATE-AFTER-REPORT-DATE',
    record_kinds: ['GB_CREDIT_ACCOUNT', 'GB_PUBLIC_RECORD', 'GB_PREVIOUS_SEARCH'],
    record_noun: 'credit entry',
    record_noun_plural: 'credit entries',
    date_labels_by_kind: Object.freeze({
      GB_CREDIT_ACCOUNT: Object.freeze(['Started', 'Settled', 'Defaulted', 'File updated for the period to']),
      GB_PUBLIC_RECORD: Object.freeze(['Date', 'End date', 'Discharged', 'Satisfied']),
      GB_PREVIOUS_SEARCH: Object.freeze(['Searched on'])
    })
  })),
  Object.freeze(dateOrderWithinRecord({
    check_id: 'GB-FACT-DATE-ORDER-WITHIN-ITEM',
    record_noun: 'credit entry',
    record_noun_plural: 'credit entries',
    why_these_pairs: 'an account cannot be defaulted or settled before it started, and a court entry cannot end or be discharged before the date it was recorded',
    pair_groups: Object.freeze([
      Object.freeze({ record_kind: 'GB_CREDIT_ACCOUNT', ordered_pairs: Object.freeze([Object.freeze(['Started', 'Defaulted']), Object.freeze(['Started', 'Settled'])]) }),
      Object.freeze({ record_kind: 'GB_PUBLIC_RECORD', ordered_pairs: Object.freeze([Object.freeze(['Date', 'Discharged']), Object.freeze(['Date', 'End date'])]) })
    ])
  })),
  Object.freeze(printedRetentionPolicyObservation({ check_id: 'GB-PRINTED-RETENTION-POLICY-ON-ITEM' }))
]);

const CHECKS_BY_COUNTRY = Object.freeze({ CA: CA_CHECKS, GB: GB_CHECKS });

/**
 * B6-INGEST-002 — the general check set, for the general intake presentation. It compares ANY date an entry
 * prints against the date the report gives for itself, so it needs no fixed layout and no fixed field label.
 * An uncertain date withholds only itself; it never disables another record or another check.
 */
function generalItemDateAfterReportDate() {
  const check = {
    check_id: 'GENERAL-FACT-ITEM-DATE-AFTER-REPORT-DATE',
    title: 'A date printed on an entry, against the date your report gives for itself',
    check_class: CHECK_CLASS.REPORT_FACT_CONSISTENCY,
    presentation_ids: [GENERAL_PRESENTATION_ID]
  };
  return Object.assign({}, check, {
    run(ctx) {
      const records = ctx.records || [];
      const reference = ctx.reference_date;
      if (!reference || reference.status !== 'RESOLVED' || !reference.normalized) {
        return result(check, APPLICABILITY_STATE.APPLICABILITY_UNRESOLVED,
          reference && reference.reason ? reference.reason : 'THE_REPORT_DATE_COULD_NOT_BE_READ',
          'The date your report gives for itself could not be read, so this comparison was not made. Nothing was assumed in its place.',
          null, null, { examined: [], not_examinable: [] });
      }
      const later = [];
      const examined = [];
      const notExaminable = [];
      for (const record of records) {
        for (const key of Object.keys(record.printed || {})) {
          const field = record.printed[key];
          if (!field || field.kind !== 'date') continue;
          if (field.state === 'VALUE' && field.normalized) {
            examined.push({ record_index: record.record_index, label: field.label, printed_value: field.raw });
            const gap = daysBetween(field.normalized, reference.normalized);
            if (gap < 0) {
              later.push({ record_index: record.record_index, label: field.label, printed_value: field.raw, printed_date: field.normalized, report_date: reference.raw, days_after_the_report_date: Math.abs(gap), location: field.location });
            }
          } else if (field.state === 'UNRESOLVED') {
            notExaminable.push({ record_index: record.record_index, record_kind: record.kind, label: field.label, state: field.state, reason: field.reason || field.state, location: field.location || null });
          }
        }
      }
      if (!examined.length) {
        return result(check, APPLICABILITY_STATE.APPLICABLE, 'NO_ENTRY_DATE_COULD_BE_READ',
          'This check needed a date printed on one of your report\'s entries, and no such date could be read. A date that could not be read is not an absent date and is not a date that agrees.',
          null, null, { examined: [], not_examinable: notExaminable });
      }
      const evidence = { report_date: reference.raw, dates_examined: examined.length, dates_later_than_the_report_date: later };
      if (later.length) {
        const first = later[0];
        return result(check, APPLICABILITY_STATE.APPLICABLE,
          'A_DATE_PRINTED_ON_AN_ENTRY_IS_LATER_THAN_THE_DATE_THE_REPORT_GIVES_FOR_ITSELF',
          `Your report is dated ${reference.raw} and it prints ${first.printed_value} beside "${first.label}" on entry ${first.record_index}. That is a difference between two things your report prints, reported for you to check, and no conclusion is drawn from it.`,
          'A_DATE_PRINTED_ON_AN_ENTRY_IS_LATER_THAN_THE_REPORT_DATE', AGREEMENT.A_DIFFERENCE_WAS_FOUND,
          { examined, not_examinable: notExaminable, evidence });
      }
      return result(check, APPLICABILITY_STATE.APPLICABLE,
        'EVERY_ENTRY_DATE_PRINTED_IS_NOT_LATER_THAN_THE_REPORT_DATE',
        `Your report is dated ${reference.raw}, and every entry date this build could read is not later than that.`,
        'EVERY_ENTRY_DATE_IS_NOT_LATER_THAN_THE_REPORT_DATE', AGREEMENT.NO_DIFFERENCE_FOUND,
        { examined, not_examinable: notExaminable, evidence });
    }
  });
}

/**
 * B6-INGEST-004 / ACCEPT-001 — a second general check: the order of two dates printed on the same entry
 * (Opened before Closed/Paid/Settled, Opened before Reported). Label-agnostic except for the unambiguous
 * opened/closed/reported words; an unrecognised label is never compared.
 */
function generalDateOrderWithinRecord() {
  const check = {
    check_id: 'GENERAL-FACT-DATE-ORDER-WITHIN-RECORD',
    title: 'The order of two dates printed on the same entry',
    check_class: CHECK_CLASS.REPORT_FACT_CONSISTENCY,
    presentation_ids: [GENERAL_PRESENTATION_ID]
  };
  const OPENED = /OPENED|DATE OPENED|OPEN DATE/;
  const CLOSED = /CLOSED|DATE CLOSED|CLOSED DATE|PAID|SETTLED/;
  const REPORTED = /REPORTED|DATE REPORTED/;
  return Object.assign({}, check, {
    run(ctx) {
      const examined = [];
      const reversed = [];
      for (const record of ctx.records || []) {
        let opened = null;
        let closed = null;
        let reported = null;
        for (const key of Object.keys(record.printed || {})) {
          const field = record.printed[key];
          if (!field || field.kind !== 'date' || field.state !== 'VALUE' || !field.normalized) continue;
          const up = String(field.label || '').toUpperCase();
          if (!opened && OPENED.test(up)) opened = field;
          else if (!closed && CLOSED.test(up)) closed = field;
          else if (!reported && REPORTED.test(up)) reported = field;
        }
        const pairs = [];
        if (opened && closed) pairs.push({ earlier: opened, later: closed, earlier_name: 'Opened', later_name: 'Closed' });
        if (opened && reported) pairs.push({ earlier: opened, later: reported, earlier_name: 'Opened', later_name: 'Reported' });
        for (const pair of pairs) {
          examined.push({ record_index: record.record_index, earlier: pair.earlier_name, earlier_value: pair.earlier.raw, later: pair.later_name, later_value: pair.later.raw });
          if (daysBetween(pair.earlier.normalized, pair.later.normalized) < 0) {
            reversed.push({ record_index: record.record_index, earlier: pair.earlier_name, earlier_value: pair.earlier.raw, later: pair.later_name, later_value: pair.later.raw, location: pair.later.location });
          }
        }
      }
      if (!examined.length) {
        return result(check, APPLICABILITY_STATE.APPLICABLE, 'NO_ORDERED_PAIR_OF_DATES_COULD_BE_READ',
          'This check needed two dates whose order matters on one entry (an opened date and a closed or reported date), and no such pair could be read. Nothing was assumed in its place.',
          null, null, { examined: [], reversed: [] });
      }
      const evidence = { pairs_examined: examined.length, pairs_where_the_printed_order_is_reversed: reversed };
      if (reversed.length) {
        const first = reversed[0];
        return result(check, APPLICABILITY_STATE.APPLICABLE,
          'A_DATE_PRINTED_AS_LATER_IS_EARLIER_THAN_A_DATE_PRINTED_AS_EARLIER_ON_THE_SAME_ENTRY',
          `On entry ${first.record_index}, your report prints ${first.later} as ${first.later_value} and ${first.earlier} as ${first.earlier_value}, which is the reverse of the expected order. That is a difference between two things your report prints, reported for you to check, and no conclusion is drawn from it.`,
          'A_PRINTED_DATE_ORDER_IS_REVERSED_ON_THE_SAME_ENTRY', AGREEMENT.A_DIFFERENCE_WAS_FOUND,
          { examined, reversed, evidence });
      }
      return result(check, APPLICABILITY_STATE.APPLICABLE,
        'EVERY_ORDERED_PAIR_OF_DATES_IS_CHRONOLOGICAL',
        `Every pair of dates this build could read in a meaningful order (${examined.length} compared) is chronological.`,
        'EVERY_ORDERED_PAIR_IS_CHRONOLOGICAL', AGREEMENT.NO_DIFFERENCE_FOUND,
        { examined, reversed, evidence });
    }
  });
}

const GENERAL_CHECKS = Object.freeze([Object.freeze(generalItemDateAfterReportDate()), Object.freeze(generalDateOrderWithinRecord())]);

/* ------------------------------------------------------------------ the runner */

/**
 * Run the factual checks a country registers, against the factual view its own reader produced. A case with
 * no factual view (any other country, or a file that was refused) registers no factual surface at all.
 */
/**
 * Run the factual checks a country registers, against the factual view its own reader produced. A case with
 * no factual view (any other country, or a file that was refused) registers no factual surface at all.
 *
 * B4 CONTINUATION — CHECKS ARE SCOPED TO THE PRESENTATION THEY WERE WRITTEN FOR. A factual check compares the
 * LABELS a particular report layout prints, and this build now reads two independent Canadian layouts whose
 * labels differ. A check may therefore declare `presentation_ids`; when it does, it is selected only for a view
 * whose `presentation_id` is one of them, and it is not reported as "not applicable" for a layout it was never
 * written for — exactly as a statutory adapter bound to `PR-01` is not run against another presentation. A
 * check that declares nothing applies to every presentation of its country, which is how every check behaved
 * before this was added.
 */
function checksFor(view, checks) {
  const presentation = view && view.presentation_id ? view.presentation_id : null;
  return checks.filter((check) => !check.presentation_ids || check.presentation_ids.includes(presentation));
}

function runFactualChecks(spec) {
  const country = spec && spec.country;
  const registered = CHECKS_BY_COUNTRY[country];
  const ctx = contextOf(spec && spec.extraction);
  if (!ctx.view) return null;
  /* B6-INGEST-002: the general checks run for any country's GENERAL-BUREAU-REPORT view; the country checks
     run only for their own presentations. The two sets never overlap because they declare different
     presentation_ids. */
  const checks = checksFor(ctx.view, registered || []).concat(checksFor(ctx.view, GENERAL_CHECKS));
  if (!checks.length) return null;
  const performed = [];
  const notApplicable = [];
  const unresolvedApplicability = [];
  const notExaminable = [];
  for (const check of checks) {
    const segmented = ctx.view.presentation_id === GENERAL_PRESENTATION_ID && ctx.records.some((r) => r.report_segment_id);
    const groups = new Map();
    if (segmented) for (const record of ctx.records) {
      const key = record.source_report_segment_id || record.report_segment_id || 'unresolved';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(record);
    }
    const contexts = segmented ? [...groups.values()].map((records) => Object.assign({}, ctx, { records, reference_date: records[0].report_reference_date || null })) : [ctx];
    for (const recordContext of contexts) {
    const outcome = check.run(recordContext);
    if (segmented) { outcome.report_segment_id = recordContext.records[0].source_report_segment_id || recordContext.records[0].report_segment_id; outcome.bureau = recordContext.records[0].bureau || null; }
    if (outcome.applicability === APPLICABILITY_STATE.NOT_APPLICABLE) { notApplicable.push(outcome); continue; }
    if (outcome.applicability === APPLICABILITY_STATE.APPLICABILITY_UNRESOLVED) { unresolvedApplicability.push(outcome); continue; }
    if (!outcome.performed) { notExaminable.push(outcome); continue; }
    performed.push(outcome);
    }
  }
  return {
    country,
    reader_id: ctx.view.view_id || null,
    presentation_id: ctx.view.presentation_id || null,
    performed,
    not_examinable: notExaminable,
    not_applicable: notApplicable,
    unresolved_applicability: unresolvedApplicability,
    summary: {
      registered: checks.length,
      performed: performed.length,
      no_difference_found: performed.filter((c) => c.agreement === AGREEMENT.NO_DIFFERENCE_FOUND).length,
      a_difference_was_found: performed.filter((c) => c.agreement === AGREEMENT.A_DIFFERENCE_WAS_FOUND).length,
      not_examinable: notExaminable.length,
      not_applicable: notApplicable.length,
      applicability_unresolved: unresolvedApplicability.length,
      statutory_checks_named: 0,
      check_classes: [...new Set(checks.map((c) => c.check_class))].sort(),
      check_ids: checks.map((c) => c.check_id)
    }
  };
}

module.exports = {
  CHECK_CLASS,
  AGREEMENT,
  OUTPUT_CEILING,
  CHECKS_BY_COUNTRY,
  checksFor,
  state,
  result,
  contextOf,
  fieldOf,
  notUsable,
  recordsOfKind,
  printedDates,
  daysBetween,
  addYears,
  summaryCountVersusItems,
  itemDateAfterReportDate,
  dateOrderWithinRecord,
  sameDebtValueConflict,
  printedRetentionPolicyObservation,
  runFactualChecks
};

