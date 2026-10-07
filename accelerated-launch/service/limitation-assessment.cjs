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

const ENGLAND_WALES_SIMPLE_CONTRACT = Object.freeze({
  country_code: 'GB', basic_period_years: 6, ultimate_period_years: null,
  start_is: 'ACCRUAL_OF_CAUSE_OF_ACTION_NOT_ESTABLISHED_BY_REPORT_DATE',
  citation: 'Limitation Act 1980 (England and Wales), ss. 5-6, 29(5)-(7), 30',
  source_capture: 'CRP_GAP_REFUSAL_RESOLUTION_REGISTER.md (CRP-LSRC-0412 exact England/Wales extent)',
  source_url: 'https://www.legislation.gov.uk/ukpga/1980/58',
  operative_words: 'an action founded on simple contract shall not be brought after ... six years from the date on which the cause of action accrued',
  discovery_words: null,
  acknowledgment: Object.freeze({
    restarts_the_period: true,
    citation: 'Limitation Act 1980, ss. 29(5)-(7), 30',
    words: 'qualifying acknowledgment or payment may cause fresh accrual while time remains; acknowledgment must be in writing and signed; a barred claim is not revived'
  }),
  transitional_note: 's. 6 has a special rule for certain loans; the report does not establish loan terms or a written demand',
  uncertainty_since_report: 'A qualifying acknowledgment or payment before the claim was barred may affect the time for an action. A court claim or judgment may already exist, or the report entry may have changed since it was issued.',
  unknown_conditions_plain: [
    'whether the claim is founded on simple contract and when it accrued',
    'whether the special loan and written-demand rule in section 6 applies',
    'whether a qualifying acknowledgment or payment affected a period that had not yet expired',
    'whether a court claim, judgment or another applicable rule changes the result'
  ]
});

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
  }),
  'CA-MB': Object.freeze({
    country_code: 'CA', region_code: 'CA-MB', jurisdiction_label: 'Manitoba',
    basic_period_years: 2, ultimate_period_years: 15,
    start_is: 'DISCOVERY_OF_THE_CLAIM_NOT_ESTABLISHED_BY_REPORT_DATE',
    citation: 'The Limitations Act, C.C.S.M. c. L150, ss. 6-8',
    source_capture: 'SOURCE_CAPTURES/PHASE5-001G/MB-limitations-act-ccsm-l150.txt',
    source_url: 'https://web2.gov.mb.ca/laws/statutes/ccsm/l150.php',
    operative_words: 'a proceeding respecting a claim must not be commenced more than two years after the day the claim is discovered',
    discovery_words: 's. 7: the claimant knew or ought to have known of the loss, its cause, the defendant and that a proceeding was an appropriate means to seek a remedy',
    acknowledgment: Object.freeze({
      restarts_the_period: true,
      citation: 'The Limitations Act, C.C.S.M. c. L150, s. 20(1)-(3)',
      words: 'before expiry, a qualifying acknowledgment causes the period to run afresh; it is generally written and signed, while part payment of a debt has the same effect'
    }),
    transitional_note: 'ss. 28-31.3 govern transitional claims; the report does not establish their application',
    uncertainty_since_report: 'The report may be older than this assessment. A qualifying acknowledgment or part payment before expiry may affect the time for a court claim. A court claim may already have been started, a judgment may exist, or the report entry may have changed since it was issued.',
    unknown_conditions_plain: [
      'when the claimant first knew or ought to have known the claim and that a proceeding was appropriate',
      'whether this was a demand obligation, and when a demand and default occurred',
      'whether a qualifying acknowledgment or part payment occurred before expiry',
      'whether a court proceeding or judgment already exists',
      'whether another applicable period, exception, suspension or transition changes the result'
    ]
  }),
  'CA-BC': Object.freeze({
    country_code: 'CA', region_code: 'CA-BC', jurisdiction_label: 'British Columbia',
    basic_period_years: 2, ultimate_period_years: 15,
    start_is: 'DISCOVERY_OF_THE_CLAIM_NOT_ESTABLISHED_BY_REPORT_DATE',
    citation: 'Limitation Act, S.B.C. 2012, c. 13, ss. 6, 8, 14, 21, 24',
    source_capture: 'BC Laws current consolidation (source_url)',
    source_url: 'https://www.bclaws.gov.bc.ca/civix/document/id/complete/statreg/00_12013_01',
    operative_words: 'a court proceeding in respect of a claim must not be commenced more than 2 years after the day on which the claim is discovered',
    discovery_words: 's. 8: the claimant knew or reasonably ought to have known the loss, its cause, the person responsible and that a court proceeding was appropriate; s. 14 has a demand-obligation rule',
    acknowledgment: Object.freeze({
      restarts_the_period: true,
      citation: 'Limitation Act, S.B.C. 2012, c. 13, s. 24(1), (6)-(7)',
      words: 'before expiry, qualifying written signed acknowledgment moves the discovery date; part payment of a liquidated sum is an acknowledgment'
    }),
    transitional_note: 's. 30 may apply to claims based on acts or omissions before the Act took effect; the report does not establish its application',
    uncertainty_since_report: 'A qualifying written acknowledgment or part payment before expiry may affect the period. A proceeding or judgment may already exist, or the report entry may have changed since it was issued.',
    unknown_conditions_plain: [
      'when the claimant knew or reasonably ought to have known the claim and that a court proceeding was appropriate',
      'whether this was a demand obligation, and when a demand and failure to perform occurred',
      'whether a qualifying written acknowledgment or part payment occurred before expiry',
      'whether a proceeding, judgment, suspension or transition changes the result'
    ]
  }),
  'CA-NT': Object.freeze({
    country_code: 'CA', region_code: 'CA-NT', jurisdiction_label: 'Northwest Territories',
    basic_period_years: 6, ultimate_period_years: null,
    start_is: 'ACCRUAL_OF_CAUSE_OF_ACTION_NOT_ESTABLISHED_BY_REPORT_DATE',
    citation: 'Limitation of Actions Act, R.S.N.W.T. 1988, c. L-8, ss. 2(1)(f), 6',
    source_capture: 'SOURCE_CAPTURES/PHASE5-001G/NWT-limitation-of-actions.txt',
    source_url: 'https://www.justice.gov.nt.ca/en/files/legislation/limitation-of-actions/limitation-of-actions.a.pdf',
    operative_words: 'actions for the recovery of money ... within six years after the cause of action arose',
    discovery_words: null,
    acknowledgment: Object.freeze({
      restarts_the_period: true,
      citation: 'Limitation of Actions Act, R.S.N.W.T. 1988, c. L-8, s. 6(1)-(2)',
      words: 'a qualifying signed written promise or acknowledgment, or part payment of principal or interest, allows an action within six years afterward even if it would otherwise have been barred'
    }),
    transitional_note: 'the report does not establish whether another Act, disability or private-international-law rule changes the applicable period',
    uncertainty_since_report: 'A qualifying signed promise, written acknowledgment or part payment may affect the time for a court action, including after an earlier period ended. An action or judgment may already exist, or the report entry may have changed since it was issued.',
    unknown_conditions_plain: [
      'when the cause of action to recover this money arose',
      'whether a qualifying signed promise, written acknowledgment or part payment occurred',
      'whether a court action or judgment already exists',
      'whether another Act, disability or applicable-law rule changes the result'
    ]
  }),
  'CA-NU': Object.freeze({
    country_code: 'CA', region_code: 'CA-NU', jurisdiction_label: 'Nunavut',
    basic_period_years: 6, ultimate_period_years: null,
    start_is: 'ACCRUAL_OF_CAUSE_OF_ACTION_NOT_ESTABLISHED_BY_REPORT_DATE',
    citation: 'Limitation of Actions Act, C.S.Nu. c. L-110, ss. 2(1)(f), 2(2), 6',
    source_capture: 'Official Nunavut consolidation, current to November 8, 2022 (source_url)',
    source_url: 'https://www.nunavutlegislation.ca/en/file-download/download/public/7408',
    operative_words: 'actions for the recovery of money ... within six years after the cause of action arose',
    discovery_words: null,
    acknowledgment: Object.freeze({
      restarts_the_period: true,
      citation: 'Limitation of Actions Act, C.S.Nu. c. L-110, s. 6(1)-(2)',
      words: 'a qualifying signed written promise or acknowledgment, or part payment of principal or interest, allows an action within six years afterward even if it would otherwise have been barred'
    }),
    transitional_note: 's. 2(2) leaves specially limited claims to their own Act; the report does not establish another applicable period or disability',
    uncertainty_since_report: 'A qualifying signed promise, written acknowledgment or part payment may affect the time for a court action, including after an earlier period ended. An action or judgment may already exist, or the report entry may have changed since it was issued.',
    unknown_conditions_plain: [
      'when the cause of action to recover this money arose',
      'whether a qualifying signed promise, written acknowledgment or part payment occurred',
      'whether a court action or judgment already exists',
      'whether another Act or disability changes the result'
    ]
  }),
  'AU-ACT': Object.freeze({
    country_code: 'AU', region_code: 'AU-ACT', jurisdiction_label: 'Australian Capital Territory',
    basic_period_years: 6, ultimate_period_years: null,
    start_is: 'ACCRUAL_OF_CAUSE_OF_ACTION_NOT_ESTABLISHED_BY_REPORT_DATE',
    citation: 'Limitation Act 1985 (ACT), ss. 11(1), 32(1)-(4)',
    source_capture: 'SOURCE_CAPTURES/PHASE5-001G/ACT-limitation-act-1985-r-current.txt',
    source_url: 'https://www.legislation.act.gov.au/a/1985-66',
    operative_words: 'an action on any cause of action is not maintainable if brought after ... 6 years running from the date when the cause of action first accrues',
    discovery_words: null,
    acknowledgment: Object.freeze({
      restarts_the_period: true,
      citation: 'Limitation Act 1985 (ACT), s. 32(1)-(4)',
      words: 'confirmation before the end of the limitation period excludes earlier running time; acknowledgment is written and signed, and qualifying payment may confirm the cause of action'
    }),
    transitional_note: 'another limitation period, a deed, judgment, postponement or other exception may change the applicable rule; the report does not establish those facts',
    uncertainty_since_report: 'A qualifying confirmation or payment may affect the time for an action. An action or judgment may already exist, or the report entry may have changed since it was issued.',
    unknown_conditions_plain: [
      'when this particular cause of action first accrued',
      'whether a different period applies to the instrument or claim',
      'whether a qualifying acknowledgment or payment confirmed it before the period ended',
      'whether an action, judgment, postponement or other exception changes the result'
    ]
  }),
  'AU-QLD': Object.freeze({
    country_code: 'AU', region_code: 'AU-QLD', jurisdiction_label: 'Queensland',
    basic_period_years: 6, ultimate_period_years: null,
    start_is: 'ACCRUAL_OF_CAUSE_OF_ACTION_NOT_ESTABLISHED_BY_REPORT_DATE',
    citation: 'Limitation of Actions Act 1974 (Qld), ss. 10(1)(a), 35(3), 36',
    source_capture: 'SOURCE_CAPTURES/PHASE5-001G/QLD-limitation-of-actions-act-1974.txt',
    source_url: 'https://www.legislation.qld.gov.au/view/whole/pdf/inforce/current/act-1974-075',
    operative_words: 'an action founded on simple contract ... shall not be brought after the expiration of 6 years from the date on which the cause of action arose',
    discovery_words: null,
    acknowledgment: Object.freeze({
      restarts_the_period: true,
      citation: 'Limitation of Actions Act 1974 (Qld), ss. 35(3), 36',
      words: 'acknowledgment or payment in respect of a debt may cause fresh accrual; acknowledgment must be in writing and signed'
    }),
    transitional_note: 'the report does not establish whether the claim is founded on simple contract or whether another period or exception applies',
    uncertainty_since_report: 'A qualifying acknowledgment or payment may affect the time for an action. An action or judgment may already exist, or the report entry may have changed since it was issued.',
    unknown_conditions_plain: [
      'whether the claim is founded on simple contract and when the cause of action arose',
      'whether a different period applies to the instrument or claim',
      'whether a qualifying acknowledgment or payment caused fresh accrual',
      'whether an action, judgment or exception changes the result'
    ]
  }),
  'GB-ENG': Object.freeze({ ...ENGLAND_WALES_SIMPLE_CONTRACT, region_code: 'GB-ENG', jurisdiction_label: 'England' }),
  'GB-WLS': Object.freeze({ ...ENGLAND_WALES_SIMPLE_CONTRACT, region_code: 'GB-WLS', jurisdiction_label: 'Wales' }),
  'GB-NIR': Object.freeze({
    country_code: 'GB', region_code: 'GB-NIR', jurisdiction_label: 'Northern Ireland',
    basic_period_years: 6, ultimate_period_years: null,
    start_is: 'ACCRUAL_OF_CAUSE_OF_ACTION_NOT_ESTABLISHED_BY_REPORT_DATE',
    citation: 'Limitation (Northern Ireland) Order 1989, arts. 4(a), 5, 57, 59, 65, 67',
    source_capture: 'CRP_GAP_REFUSAL_RESOLUTION_REGISTER.md (CRP-LSRC-0412 exact Northern Ireland extent)',
    source_url: 'https://www.legislation.gov.uk/nisi/1989/1339',
    operative_words: 'an action founded on simple contract may not be brought after six years from the date on which the cause of action accrued',
    discovery_words: null,
    acknowledgment: Object.freeze({
      restarts_the_period: true,
      citation: 'Limitation (Northern Ireland) Order 1989, arts. 57, 59, 65, 67',
      words: 'qualifying acknowledgment or payment may cause fresh accrual while the period remains current; acknowledgment is written and signed; a barred action is not revived'
    }),
    transitional_note: 'article 5 has a special rule for certain loans; the report does not establish the loan terms or any demand',
    uncertainty_since_report: 'A qualifying acknowledgment or payment before the action was barred may affect the period. An action or judgment may already exist, or the report entry may have changed since it was issued.',
    unknown_conditions_plain: [
      'whether the claim is founded on simple contract and when it accrued',
      'whether the special loan rule in article 5 applies',
      'whether a qualifying acknowledgment or payment affected a period that had not yet expired',
      'whether an action, judgment or another applicable rule changes the result'
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
    const reading = printedLabel ? printed[printedLabel]
      : (factKey === 'overdue.originalListingDate' && record && record.kind === 'OVERDUE_ACCOUNT'
        ? { raw: record.raw_value, normalized: record.normalized_value, location: record.location } : null);
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
  if (record && record.kind === 'GB_CREDIT_ACCOUNT') {
    const defaulted = printed.Defaulted;
    if (defaulted && defaulted.normalized) out.push({
      label: 'Defaulted', iso: defaulted.normalized,
      basis: 'the default date this credit account prints; legal accrual may have occurred on another date',
      printed_value: defaulted.raw || defaulted.normalized,
      location: defaulted.location || null, source: 'printed reading'
    });
  }
  add('Adverse rating month', 'reportedAccount.adverseRatingDate', null, START_DATE_BASIS.ADVERSE_RATING);
  add('Last Payment Date', 'tradeline.lastPaymentDate', 'Last Payment Date', START_DATE_BASIS.LAST_PAYMENT);
  return out.sort((a, b) => (a.iso < b.iso ? -1 : a.iso > b.iso ? 1 : 0));
}

/**
 * Only the report's explicit collection, write-off or charge-off meaning can support a claim indicator.
 * A generic payment rating or a closure description does not establish an outstanding claim.
 */
function meaningDescribesClaim(meaning) {
  return /bad debt|placed for collection|turned over to collection|collection agency|write-?off|charge-?off/i.test(String(meaning || ''));
}

/** Payment cells whose own printed legend describes collection or write-off. */
function claimRatingEvidence(record) {
  const facts = (record && record.facts) || {};
  const cells = Array.isArray(facts['account.paymentHistoryCells']) ? facts['account.paymentHistoryCells'] : [];
  return cells.filter((c) => meaningDescribesClaim(c && c.meaning));
}

/**
 * The narrative codes this account prints whose own legend describes collection or write-off.
 * A closure code alone does not establish an outstanding claim.
 */
function claimNarrativeEvidence(record) {
  const material = (record && record.account_material) || {};
  const legend = material.narrative_legend && typeof material.narrative_legend === 'object' ? material.narrative_legend : {};
  const rows = Array.isArray(record && record.monthly_rows) ? record.monthly_rows : [];
  const out = [];
  for (const row of rows) {
    for (const code of row.narrative_codes || []) {
      const key = Object.keys(legend).find((k) => k.toUpperCase() === String(code).toUpperCase());
      const meaning = key ? String(legend[key]) : null;
      if (meaningDescribesClaim(meaning)) {
        out.push({ code: String(code).toUpperCase(), meaning, period: row.period || null, location: row.location || null });
      }
    }
  }
  return out;
}

/** The exact printed facts that may support an outstanding court claim, without account valence. */
function printedClaimView(record) {
  const facts = (record && record.facts) || {};
  const indicators = [];
  const ratings = claimRatingEvidence(record);
  if (ratings.length) {
    indicators.push({ kind: 'PRINTED_COLLECTION_OR_WRITE_OFF_RATING', count: ratings.length, example: ratings[ratings.length - 1] });
  }
  const narratives = claimNarrativeEvidence(record);
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
  if (record && record.kind === 'OVERDUE_ACCOUNT' && record.section_path === 'Overdue Accounts'
    && typeof facts['overdue.originalListingDate'] === 'string') {
    indicators.push({ kind: 'PRINTED_OVERDUE_ACCOUNT_LISTING', amount: typeof facts['overdue.amount'] === 'number' ? facts['overdue.amount'] : null });
  }
  if (record && record.kind === 'GB_CREDIT_ACCOUNT' && record.printed && record.printed.Defaulted
    && record.printed.Defaulted.normalized) {
    indicators.push({ kind: 'PRINTED_DEFAULTED_DATE', value: record.printed.Defaulted.raw || record.printed.Defaulted.normalized });
  }
  return {
    has_printed_claim_indicator: indicators.length > 0,
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
  const claim = printedClaimView(record);
  if (!claim.has_printed_claim_indicator) {
    return {
      withheld: true,
      reason: 'NO_PRINTED_OUTSTANDING_CLAIM',
      record_index: recordIndex,
      plain: 'This entry does not print an outstanding amount, amount past due, collection, charge-off or default claim, so the court time limit was not applied to it.',
      missing_prerequisite: 'a printed indicator of an outstanding claim (an amount past due, a collection or charge-off action, or a default status)'
    };
  }
  const dates = labelledDates(record);
  if (!dates.length) {
    return {
      withheld: true,
      reason: 'NO_PRINTED_START_DATE',
      record_index: recordIndex,
      claim_indicators: claim.indicators,
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
    claim_indicators: claim.indicators,
    amounts: claim.amounts,
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
      basis: params.start_is.endsWith('_NOT_ESTABLISHED_BY_REPORT_DATE')
        ? `report-printed screening reference only; ${params.jurisdiction_label} ${params.start_is.startsWith('DISCOVERY') ? 'legal discovery' : 'cause-of-action accrual'} is not established by this date`
        : latest.basis,
      selection_rule: params.start_is.endsWith('_NOT_ESTABLISHED_BY_REPORT_DATE')
        ? (params.start_is.startsWith('DISCOVERY') ? 'LATEST_PRINTED_SCREENING_DATE_NOT_LEGAL_DISCOVERY' : 'LATEST_PRINTED_SCREENING_DATE_NOT_LEGAL_ACCRUAL')
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
    summary: { records: 0, assessed: 0, may_be_outside: 0, within: 0, withheld: 0, rule_violations_emitted: 0, report_date_used_for_the_comparison: false, report_reference_date: null }
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
  printedClaimView,
  claimRatingEvidence,
  claimNarrativeEvidence,
  meaningDescribesClaim,
  daysBetweenIso,
  addYearsIso,
  yearsBetween,
  referenceDateOf,
  assessRecord,
  runLimitationAssessment
};
