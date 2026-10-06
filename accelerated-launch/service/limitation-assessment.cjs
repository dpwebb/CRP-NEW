'use strict';
/**
 * limitation-assessment.cjs — COURT-ENFORCEMENT LIMITATION assessment.
 *
 * TWO DIFFERENT QUESTIONS, NEVER MERGED:
 *   • reporting retention — may the bureau still report this information at all? (the recorded statutory
 *     limbs, unchanged, and never decided here); and
 *   • court enforcement — do the dates the report prints suggest that a court claim on the debt may now be
 *     outside the limitation period that applies where the consumer lives?
 *
 * An expired limitation period is NOT a credit-report deletion requirement and this module never says so. It
 * names no breach, advises no non-payment, never calls a debt extinguished and never says litigation happened:
 * the report shows none of that. What it produces is a QUALIFIED concern to verify, with the unknown
 * conditions kept explicit, which the consumer-facing layer turns into a potential issue.
 *
 * WHAT GROUNDS IT. One reusable mechanism, jurisdiction-specific parameters, each parameter set carrying the
 * statute it came from, the captured official text and the operative words themselves. A jurisdiction whose
 * parameters are not yet read from its own official text gets NO parameters — the run records exactly what is
 * missing and produces nothing for the consumer. No universal rule is invented and no date is substituted for
 * another: a start date is used only when the record PRINTS it and the reason it relates to the claim is
 * stated with it.
 *
 * CAPABILITY-BASED. The accessors read whichever printed material a reader actually supplies (the TransUnion
 * Canada account block's own rows and legends, the general intake's adverse-rating, collection and overdue
 * facts, the other families' liability facts). A record that prints no admissible start date is WITHHELD,
 * never aged.
 */

const CHECK_ID = 'LIMITATION-PERIOD-COURT-CLAIM';
const CHECK_CLASS = 'LIMITATION_ASSESSMENT';

/**
 * The recorded parameter sets. `operative_words` is quoted from the captured official text; a set is enabled
 * only when the period, the statutory start and the acknowledgment rule are all read from that text.
 */
const PARAMETERS = Object.freeze({
  'CA-NS': Object.freeze({
    country_code: 'CA',
    region_code: 'CA-NS',
    jurisdiction_label: 'Nova Scotia',
    basic_period_years: 2,
    ultimate_period_years: 15,
    start_is: 'DISCOVERY_OF_THE_CLAIM',
    citation: 'Limitation of Actions Act, S.N.S. 2014, c. 35, s. 8(1)',
    source_capture: 'SOURCE_CAPTURES/PHASE5-001G/NS-limitation-of-actions.pdf',
    operative_words: 'a claim ... may not be brought after the earlier of (a) two years from the day on which the claim is discovered; and (b) fifteen years from the day on which the act or omission on which the claim is based occurred',
    discovery_words: 'A claim is discovered on the day on which the claimant first knew or ought reasonably to have known (a) that the injury, loss or damage had occurred; (b) that the injury, loss or damage was caused by or contributed to by an act or omission; and (c) that the act or omission was that of the defendant',
    acknowledgment: Object.freeze({
      restarts_the_period: true,
      citation: 'Limitation of Actions Act, S.N.S. 2014, c. 35, ss. 20-21 (Acknowledgments)',
      words: 'a person acknowledges liability in respect of a claim ... the limitation period begins again at the time of the acknowledgment'
    }),
    transitional_note: 's. 11(3): a claim discovered before the effective date may not be brought after the earlier of two years from the effective date and the day on which the former limitation period expired or would have expired',
    /* OWNER correction (SOL assessment date; wording corrected in Batch 33): the report may be older than the day
       it is checked and cannot show what happened in between. A SALE, A TRANSFER, A CHANGE OF OWNERSHIP OR
       COLLECTION ACTIVITY alone does NOT restart a limitation period and is never described as doing so: only a
       qualifying payment or an acknowledgment of the debt can restart the clock, and every other later event is
       listed separately as something that changes the picture WITHOUT restarting it. */
    uncertainty_since_report: 'This report was issued before the date shown above. A later payment of this debt, or an admission of it in writing, can restart the time limit for a court claim. Other things since then change the picture without restarting it — a court claim may already have been started, a judgment may already exist, the debt may have been sold or placed with a collection agency, or the entry may have been corrected. The report cannot show any of those later events, so the dates you see may no longer be the whole picture.',
    unknown_conditions_plain: [
      'when the creditor first knew, or ought to have known, about the missed payments',
      'whether a later payment or a written admission of the debt restarted the time',
      'whether a court claim was already started, or a judgment already obtained, on this debt',
      'whether a bankruptcy, a stay or another court order affects this debt'
    ]
  }),
  'CA-ON': Object.freeze({
    country_code: 'CA', region_code: 'CA-ON', jurisdiction_label: 'Ontario',
    basic_period_years: 2, ultimate_period_years: 15,
    start_is: 'DISCOVERY_OF_THE_CLAIM_NOT_ESTABLISHED_BY_REPORT_DATE',
    citation: 'Limitations Act, 2002, S.O. 2002, c. 24, Sched. B, ss. 4-5',
    source_capture: 'SOURCE_CAPTURES/PHASE5-001H/ONT-02l24-consolidated-text-derivative.txt',
    source_url: 'https://www.ontario.ca/laws/statute/02l24',
    operative_words: 'a proceeding shall not be commenced in respect of a claim after the second anniversary of the day on which the claim was discovered',
    discovery_words: 's. 5(1): the claimant knew or reasonably ought to have known the loss, its cause, the person responsible and that a proceeding was an appropriate remedy; s. 5(3) has a separate demand-obligation rule',
    acknowledgment: Object.freeze({
      restarts_the_period: true,
      citation: 'Limitations Act, 2002, S.O. 2002, c. 24, Sched. B, s. 13(1), (9)-(11)',
      words: 'an acknowledgment for a liquidated sum must reach the claimant or specified representative before expiry; the specified acknowledgment is signed in writing, and qualifying part payment has the same effect'
    }),
    transitional_note: 's. 24 may affect acts or omissions before January 1, 2004; the report does not establish its application',
    uncertainty_since_report: 'The report may be older than this assessment. A qualifying signed acknowledgment or part payment before expiry may affect the time for a court claim. A court claim may already have been started, a judgment may exist, or the report entry may have changed since it was issued.',
    unknown_conditions_plain: [
      'when the claimant first knew or reasonably ought to have known the claim and that a proceeding was appropriate',
      'whether this was a demand obligation, and when demand and failure to perform occurred',
      'whether a qualifying signed acknowledgment or part payment reached the claimant before expiry',
      'whether a court proceeding or judgment already exists',
      'whether a suspension, exception or transition rule changes the period'
    ]
  })
});

function parametersFor(region) {
  return PARAMETERS[String(region || '').trim()] || null;
}

/** Every parameter set this build records, for the coverage record and the tests. */
function recordedJurisdictions() {
  return Object.keys(PARAMETERS).sort();
}

/** A printed date this module may use, with the reason it is admissible as a start date for the clock. */
const START_DATE_BASIS = Object.freeze({
  FIRST_DELINQUENCY: 'the delinquency the report prints on the entry itself: the debt was already unpaid by then',
  COLLECTION_DELINQUENCY: 'the delinquency date the report prints on its collection entry',
  COLLECTION_OR_CHARGE_OFF_ACTION: 'the collection, assignment or charge-off date the report prints on the entry',
  ORIGINAL_LISTING: 'the original listing date the report prints for this overdue account',
  ADVERSE_RATING: 'the adverse payment rating and the month the report prints for it',
  LAST_PAYMENT: 'the last payment the report prints: the debt was being serviced until then, which is the LATEST date this module will start the clock from'
});

/** Every labelled date a record carries, in the shared fact vocabulary first and the printed map second. */
function labelledDates(record) {
  const facts = (record && record.facts) || {};
  const printed = (record && record.printed) || {};
  const out = [];
  const add = (label, factKey, printedLabel, basis) => {
    const fromFact = typeof facts[factKey] === 'string' ? facts[factKey] : null;
    const reading = printedLabel ? printed[printedLabel] : null;
    const iso = fromFact || (reading && reading.normalized) || null;
    if (!iso) return;
    out.push({
      label,
      iso,
      basis,
      printed_value: reading && reading.raw ? reading.raw : iso,
      location: reading && reading.location ? reading.location : null,
      source: fromFact ? 'shared fact' : 'printed reading'
    });
  };
  add('First Delinquency Date', 'tradeline.firstDelinquencyDate', 'First Delinquency Date', START_DATE_BASIS.FIRST_DELINQUENCY);
  add('First Delinquency', 'collection.delinquencyDate', 'First Delinquency', START_DATE_BASIS.COLLECTION_DELINQUENCY);
  add('Date Assigned', 'collection.assignedDate', 'Date Assigned', START_DATE_BASIS.COLLECTION_OR_CHARGE_OFF_ACTION);
  add('Charge Off Date', 'tradeline.chargeOffDate', 'Charge Off Date', START_DATE_BASIS.COLLECTION_OR_CHARGE_OFF_ACTION);
  add('Original listing', 'overdue.originalListingDate', null, START_DATE_BASIS.ORIGINAL_LISTING);
  add('Adverse rating month', 'reportedAccount.adverseRatingDate', null, START_DATE_BASIS.ADVERSE_RATING);
  add('Last Payment Date', 'tradeline.lastPaymentDate', 'Last Payment Date', START_DATE_BASIS.LAST_PAYMENT);
  return out.sort((a, b) => (a.iso < b.iso ? -1 : a.iso > b.iso ? 1 : 0));
}

/**
 * The report's own words for an adverse action. A meaning that says only "non derogatory" is NOT adverse: the
 * negation is read before the term, so an account the report calls satisfactory is never treated as adverse.
 */
function meaningIsAdverse(meaning) {
  const text = String(meaning || '');
  if (!text) return false;
  if (/bad debt|placed for collection|turned over to collection|collection agency|write-?off|charge-?off/i.test(text)) return true;
  return /derogatory/i.test(text) && !/non[-\s]?derogatory/i.test(text);
}

/** The manner-of-payment cells whose meaning the report itself prints as adverse. Never a guessed meaning. */
function adverseRatingEvidence(record) {
  const facts = (record && record.facts) || {};
  const cells = Array.isArray(facts['account.paymentHistoryCells']) ? facts['account.paymentHistoryCells'] : [];
  return cells.filter((c) => meaningIsAdverse(c && c.meaning));
}

/**
 * The narrative codes this account prints whose OWN printed legend describes an adverse action. A CLOSURE is
 * deliberately NOT adverse here: "Account closed/rating non derogatory" and "Closed at consumer's request" are
 * closures, and a satisfactory old account is never treated as adverse merely because it is old.
 */
function adverseNarrativeEvidence(record) {
  const material = (record && record.account_material) || {};
  const legend = material.narrative_legend && typeof material.narrative_legend === 'object' ? material.narrative_legend : {};
  const rows = Array.isArray(record && record.monthly_rows) ? record.monthly_rows : [];
  const out = [];
  for (const row of rows) {
    for (const code of row.narrative_codes || []) {
      const key = Object.keys(legend).find((k) => k.toUpperCase() === String(code).toUpperCase());
      const meaning = key ? String(legend[key]) : null;
      if (meaningIsAdverse(meaning)) {
        out.push({ code: String(code).toUpperCase(), meaning, period: row.period || null, location: row.location || null });
      }
    }
  }
  return out;
}

/** Whether the entry is an ADVERSE DEBT at all. A satisfactory old account is never adverse merely because old. */
function adverseDebtView(record) {
  const facts = (record && record.facts) || {};
  const indicators = [];
  const ratings = adverseRatingEvidence(record);
  if (ratings.length) {
    indicators.push({ kind: 'PRINTED_ADVERSE_PAYMENT_RATING', count: ratings.length, example: ratings[ratings.length - 1] });
  }
  const narratives = adverseNarrativeEvidence(record);
  if (narratives.length) {
    indicators.push({ kind: 'PRINTED_COLLECTION_OR_WRITE_OFF_NARRATIVE', count: narratives.length, example: narratives[narratives.length - 1] });
  }
  if (typeof facts['reportedAccount.accountActionContext'] === 'string'
    && /COLLECTION_OR_CHARGE_OFF/i.test(facts['reportedAccount.accountActionContext'])) {
    indicators.push({ kind: 'PRINTED_COLLECTION_OR_CHARGE_OFF_ACTION' });
  }
  const pastDue = typeof facts['account.pastDueAmount'] === 'number' ? facts['account.pastDueAmount'] : null;
  const balance = typeof facts['account.balance'] === 'number' ? facts['account.balance'] : null;
  if (pastDue !== null && pastDue > 0) indicators.push({ kind: 'PRINTED_AMOUNT_PAST_DUE', amount: pastDue });
  if (typeof facts['account.status'] === 'string' && /collection|charge|write|default|delinquent/i.test(facts['account.status'])) {
    indicators.push({ kind: 'PRINTED_STATUS', value: facts['account.status'] });
  }
  return {
    is_adverse_debt: indicators.length > 0,
    indicators,
    amounts: { balance, past_due: pastDue }
  };
}

/** Whole years between two ISO dates, to two decimals, or null when either date is unusable or reversed. */
function yearsBetween(fromIso, toIso) {
  const days = daysBetweenIso(fromIso, toIso);
  if (days === null) return null;
  return Math.round((days / 365.25) * 100) / 100;
}

/**
 * Whole days between two ISO dates, or null. Kept for the record and the tests; the PERIOD COMPARISON itself is
 * made in calendar years by `addYearsIso`, so a leap day cannot move the boundary.
 */
function daysBetweenIso(fromIso, toIso) {
  const from = Date.parse(`${String(fromIso).slice(0, 10)}T00:00:00Z`);
  const to = Date.parse(`${String(toIso).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(from) || Number.isNaN(to) || to < from) return null;
  return Math.round((to - from) / 86400000);
}

/** The same calendar day `years` later, as ISO, or null. Feb 29 in a non-leap target year falls to Mar 1. */
function addYearsIso(iso, years) {
  const text = String(iso).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const [y, m, d] = text.split('-').map(Number);
  const target = new Date(Date.UTC(y + years, m - 1, d));
  if (Number.isNaN(target.getTime())) return null;
  return target.toISOString().slice(0, 10);
}

/** The report's own reference date, or the case's when the extraction carries one. Never invented. */
function referenceDateOf(extraction) {
  const fromExtraction = extraction && extraction.reference_date
    && (extraction.reference_date.normalized_value || extraction.reference_date.value || extraction.reference_date);
  if (typeof fromExtraction === 'string' && /^\d{4}-\d{2}-\d{2}/.test(fromExtraction)) return fromExtraction.slice(0, 10);
  const records = (extraction && extraction.records) || [];
  for (const record of records) {
    const fromRecord = record && record.source_report_reference_date;
    if (typeof fromRecord === 'string' && /^\d{4}-\d{2}-\d{2}/.test(fromRecord)) return fromRecord.slice(0, 10);
  }
  return null;
}

/**
 * One record's assessment. The clock is started from the LATEST printed date that can bear that relation to
 * the claim, because that is the reading least likely to mislead: an earlier date would produce a stronger
 * claim than the report supports. Every other usable date is reported beside it.
 *
 * THE OPERATIVE DATE is the ASSESSMENT-RUN date (`clock.assessment_date`), stamped once by the server per run.
 * The printed report date is carried beside it as provenance and as a historical comparison only. A missing
 * report date is not an error here (the report's own date is not what decides the answer); a missing ASSESSMENT
 * date is: the module withholds rather than fall back to a date that answers a different question.
 */
function assessRecord(record, params, clock) {
  const recordIndex = record && Number.isInteger(record.record_index) ? record.record_index : null;
  const adverse = adverseDebtView(record);
  if (!adverse.is_adverse_debt) {
    return {
      withheld: true,
      reason: 'NOT_AN_ADVERSE_DEBT',
      record_index: recordIndex,
      plain: 'This entry does not read as an unpaid or adverse debt, so the court time limit was not applied to it.',
      missing_prerequisite: 'an adverse-debt indicator printed on this entry (an adverse rating, a collection or charge-off action, an amount past due or an adverse status)'
    };
  }
  const dates = labelledDates(record);
  if (!dates.length) {
    return {
      withheld: true,
      reason: 'NO_PRINTED_START_DATE',
      record_index: recordIndex,
      adverse_indicators: adverse.indicators,
      plain: 'This entry reads as an unpaid debt but prints no date from which the court time limit could be counted, so nothing was concluded from a missing date.',
      missing_prerequisite: 'a printed date that can start the clock (a first-delinquency, collection, charge-off, original-listing or last-payment date)'
    };
  }
  const latest = dates[dates.length - 1];
  const assessmentDate = String(clock.assessment_date).slice(0, 10);
  const elapsedDays = daysBetweenIso(latest.iso, assessmentDate);
  const elapsed = yearsBetween(latest.iso, assessmentDate);
  /* The comparison is CALENDAR years, not a day-count approximation: the period runs "two years from the day",
     so the anniversary itself is still inside it and the day after is outside. */
  const periodEnd = addYearsIso(latest.iso, params.basic_period_years);
  const outcome = periodEnd === null
    ? 'UNRESOLVED'
    : (assessmentDate > periodEnd ? 'MAY_BE_OUTSIDE_THE_LIMITATION_PERIOD' : 'WITHIN_THE_PERIOD');
  /* The historical view at the report's own date: recorded for comparison, never the operative answer. */
  const reportDate = clock.report_reference_date ? String(clock.report_reference_date).slice(0, 10) : null;
  const reportPeriodEnd = reportDate ? addYearsIso(latest.iso, params.basic_period_years) : null;
  return {
    withheld: false,
    record_index: recordIndex,
    kind: record && record.kind ? record.kind : null,
    adverse_indicators: adverse.indicators,
    amounts: adverse.amounts,
    jurisdiction: {
      region_code: params.region_code,
      label: params.jurisdiction_label,
      citation: params.citation,
      basic_period_years: params.basic_period_years,
      ultimate_period_years: params.ultimate_period_years,
      start_is: params.start_is
    },
    /* THE OPERATIVE CLOCK: one stamp per run, shared by every record in it. */
    assessment_run_at: clock.assessment_run_at,
    assessment_date: assessmentDate,
    assessment_clock_basis: clock.assessment_clock_basis,
    clock_source: clock.clock_source || null,
    clock_rule: clock.clock_rule || null,
    /* PROVENANCE, kept separate: the printed report date, never substituted for the assessment date. */
    report_reference_date: reportDate,
    report_age_days: reportDate ? daysBetweenIso(reportDate, assessmentDate) : null,
    at_report_date: reportDate ? {
      reference_date: reportDate,
      period_ends: reportPeriodEnd,
      elapsed_years: yearsBetween(latest.iso, reportDate),
      outcome: reportPeriodEnd === null ? 'UNRESOLVED'
        : (reportDate > reportPeriodEnd ? 'MAY_BE_OUTSIDE_THE_LIMITATION_PERIOD' : 'WITHIN_THE_PERIOD'),
      role: 'HISTORICAL_COMPARISON_AT_THE_REPORT_DATE_NOT_THE_OPERATIVE_ASSESSMENT'
    } : null,
    start_date: Object.assign({}, latest, {
      basis: params.region_code === 'CA-ON'
        ? 'report-printed screening reference only; Ontario legal discovery is not established by this date'
        : latest.basis,
      selection_rule: params.region_code === 'CA-ON'
        ? 'LATEST_PRINTED_SCREENING_DATE_NOT_LEGAL_DISCOVERY'
        : 'LATEST_PRINTED_DATE_THAT_CAN_BEAR_THIS_RELATION_TO_THE_CLAIM'
    }),
    other_printed_dates: dates.slice(0, -1).map((d) => ({ label: d.label, iso: d.iso, basis: d.basis, location: d.location })),
    elapsed_years: elapsed,
    elapsed_days: elapsedDays,
    period_ends: periodEnd,
    outcome,
    unknown_conditions: params.unknown_conditions_plain.slice(),
    uncertainty_since_report: params.uncertainty_since_report,
    acknowledgment_rule: params.acknowledgment,
    transitional_note: params.transitional_note,
    /* Stated with every result, so no consumer or reviewer can read it as a deletion or a breach. */
    not_a_reporting_requirement: 'An expired court time limit is not by itself a reason a credit bureau must remove an entry, and this assessment does not claim that a bureau broke any reporting rule.'
  };
}

/**
 * Run the mechanism over one assessment context: { country, region, extraction }. A record that cannot support
 * the question is returned in its own bucket with the exact missing prerequisite; nothing is aged from a date
 * the report does not print, and a jurisdiction with no recorded parameters produces nothing at all.
 */
function runLimitationAssessment(context) {
  const extraction = context && context.extraction ? context.extraction : null;
  const region = context && context.region ? String(context.region) : null;
  const base = {
    check_id: CHECK_ID,
    check_class: CHECK_CLASS,
    jurisdiction: null,
    assessment_clock: null,
    recorded_jurisdictions: recordedJurisdictions(),
    performed: [],
    withheld: [],
    summary: { records: 0, assessed: 0, may_be_outside: 0, within: 0, withheld: 0, legal_findings_emitted: 0, report_date_used_for_the_comparison: false, report_reference_date: null }
  };
  const records = (extraction && Array.isArray(extraction.records)) ? extraction.records : [];
  if (!records.length) {
    base.withheld.push({ reason: 'NO_READABLE_RECORD', plain: 'No entry could be read from the file, so no court time limit was applied.', missing_prerequisite: 'a readable report record' });
    base.summary.withheld = 1;
    return base;
  }
  base.summary.records = records.length;
  const params = parametersFor(region);
  if (!params) {
    base.withheld.push({
      jurisdiction: region,
      reason: 'NO_RECORDED_LIMITATION_PARAMETERS',
      plain: 'A court time limit is applied only where the limitation statute for that place has been read into this build. For this place it has not been read, so nothing was said about it.',
      missing_prerequisite: `the limitation statute for ${region}, read from its own official text (the period, the statutory start and the acknowledgment rule)`
    });
    base.summary.withheld = 1;
    return base;
  }
  base.jurisdiction = {
    region_code: params.region_code,
    label: params.jurisdiction_label,
    citation: params.citation,
    basic_period_years: params.basic_period_years,
    ultimate_period_years: params.ultimate_period_years,
    source_capture: params.source_capture,
    source_url: params.source_url || null,
    operative_words: params.operative_words
  };
  /* THE OPERATIVE DATE IS THE RUN DATE. The printed report date is read separately, only as provenance. */
  const supplied = (context && context.assessment_clock) || null;
  const assessmentDate = supplied && supplied.assessment_date ? String(supplied.assessment_date).slice(0, 10) : null;
  if (!assessmentDate) {
    base.withheld.push({
      jurisdiction: region,
      reason: 'NO_ASSESSMENT_RUN_DATE',
      plain: 'The date this check ran was not recorded, and a court time limit is measured to the day it is checked, so nothing was counted. The printed report date is not used for this.',
      missing_prerequisite: 'the server assessment-run date (one stamp per assessment run)'
    });
    base.summary.withheld = 1;
    return base;
  }
  const clock = Object.assign({}, supplied, {
    assessment_date: assessmentDate,
    report_reference_date: referenceDateOf(extraction)
  });
  base.assessment_clock = {
    assessment_run_at: clock.assessment_run_at || null,
    assessment_date: assessmentDate,
    assessment_clock_basis: clock.assessment_clock_basis || null,
    clock_source: clock.clock_source || null,
    report_reference_date: clock.report_reference_date || null
  };
  base.summary.report_date_used_for_the_comparison = false;
  base.summary.report_reference_date = clock.report_reference_date || null;
  for (const record of records) {
    const assessed = assessRecord(record, params, clock);
    if (assessed.withheld) base.withheld.push(assessed);
    else base.performed.push(assessed);
  }
  base.summary.assessed = base.performed.length;
  base.summary.may_be_outside = base.performed.filter((a) => a.outcome === 'MAY_BE_OUTSIDE_THE_LIMITATION_PERIOD').length;
  base.summary.within = base.performed.filter((a) => a.outcome === 'WITHIN_THE_PERIOD').length;
  base.summary.withheld = base.withheld.length;
  return base;
}

module.exports = {
  CHECK_ID,
  CHECK_CLASS,
  PARAMETERS,
  parametersFor,
  recordedJurisdictions,
  labelledDates,
  adverseDebtView,
  adverseRatingEvidence,
  adverseNarrativeEvidence,
  meaningIsAdverse,
  daysBetweenIso,
  addYearsIso,
  yearsBetween,
  referenceDateOf,
  assessRecord,
  runLimitationAssessment
};
