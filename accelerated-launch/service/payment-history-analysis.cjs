'use strict';
/**
 * payment-history-analysis.cjs — the ACCOUNT'S OWN HISTORY, read against itself.
 *
 * Every analysis here compares things THE SAME ACCOUNT prints: its dated monthly rows, its ratings, its
 * balances, its payments, its past-due amounts and the meanings its own legend gives to its codes. Nothing is
 * borrowed from another account, another snapshot or another bureau, and no code is decoded by guessing.
 *
 * THE BENIGN EXPLANATIONS ARE PART OF THE CONTRACT. Each analysis declares the innocent explanations it has
 * already accounted for, and a candidate whose innocent explanation the printed evidence cannot exclude is
 * WITHHELD with that reason rather than raised. The boundaries this module keeps:
 *   • a payment after default does not prove the account became current;
 *   • closure does not require a zero balance;
 *   • a collection, transfer or assignment does not by itself establish re-aging;
 *   • cumulative lifetime counts are not assumed to cover the visible monthly window;
 *   • an unknown rating, a blank cell and an unprinted month are NOT missed payments;
 *   • the product type OPEN is not a lifecycle status;
 *   • a rating or a balance is never carried from one account or one snapshot into another.
 *
 * It produces POTENTIAL verification items — never a legal classification and never a violation — through the
 * same bucket shape the common-error checks use, so the existing issue, teaser and packet chain consumes them.
 */

const CHECK_CLASS = 'PAYMENT_HISTORY_ANALYSIS';

const RATING_MEANING = Object.freeze({
  ADVERSE: /bad debt|placed for collection|collection|write-?off|charge-?off|delinquent|91|90 days|skip/i,
  NON_DEROGATORY_CLOSURE: /closed|paid as agreed|non derogatory|pays \(or paid\) within 30 days|current/i
});

function fact(record, key) {
  const facts = (record && record.facts) || {};
  return facts[key];
}

function legendOf(record) {
  const material = (record && record.account_material) || {};
  const legend = material.narrative_legend;
  return legend && typeof legend === 'object' ? legend : {};
}

function printedMeaning(record, code) {
  const legend = legendOf(record);
  const key = Object.keys(legend).find((k) => String(k).toUpperCase() === String(code).toUpperCase());
  return key ? String(legend[key]).trim() : null;
}

function rowsOf(record) {
  const rows = (record && record.monthly_rows) || [];
  return rows.filter((r) => r && r.period && /^\d{4}-\d{2}$/.test(r.period));
}

/** One row's rating with the meaning the report's own manner-of-payment legend gives it. */
function ratingOf(record, row) {
  const facts = (record && record.facts) || {};
  const cells = Array.isArray(facts['account.paymentHistoryCells']) ? facts['account.paymentHistoryCells'] : [];
  const match = cells.find((c) => c && c.period === row.period);
  const code = row.cells && row.cells.mop ? String(row.cells.mop).trim() : (match ? String(match.code || '').trim() : null);
  const meaning = match && match.meaning ? String(match.meaning) : null;
  return { code: code || null, meaning, known: Boolean(code) && code !== '' };
}

/** The narrative codes of one row with the meanings the account's own legend prints for them. */
function narrativesOf(record, row) {
  return (row.narrative_codes || []).map((code) => ({ code: String(code).toUpperCase(), meaning: printedMeaning(record, code) }))
    .filter((n) => n.code);
}

/** An amount cell as a number, or null when the cell is blank or is not a number. A blank is never zero. */
function amountOf(row, key) {
  const raw = row && row.cells ? row.cells[key] : undefined;
  if (raw === undefined || raw === null || String(raw).trim() === '') return null;
  const text = String(raw).replace(/[^0-9.-]/g, '');
  if (!/^-?\d+(\.\d+)?$/.test(text)) return null;
  return Number(text);
}

function match(record, row, why, evidence) {
  return {
    record_index: record.record_index,
    kind: record.kind || null,
    kind_label: record.kind_label || null,
    location: (row && row.location) || record.location || null,
    reason: why,
    evidence: Object.assign({ reporting_period: row ? row.period : null }, evidence || {})
  };
}

function entry(checkId, label, matches, plain, detectedPlain, benignExplanations) {
  const state = matches.length ? 'POTENTIAL_ISSUE' : 'NOT_DETECTED';
  return {
    check_id: checkId,
    check_class: CHECK_CLASS,
    label,
    state,
    is_legal_finding: false,
    output_ceiling: 'observation',
    benign_explanations_considered: benignExplanations,
    source_records: matches,
    plain: matches.length ? detectedPlain : plain
  };
}

/* 1. One month that the report rates as a bad debt or collection while the same month's narrative says the
   account was paid in full or closed without a derogatory rating. Both statements are the report's own. */
function ratingContradictsNarrative(records) {
  const matches = [];
  for (const record of records) {
    for (const row of rowsOf(record)) {
      const rating = ratingOf(record, row);
      if (!rating.known || !rating.meaning || !RATING_MEANING.ADVERSE.test(rating.meaning)) continue;
      for (const narrative of narrativesOf(record, row)) {
        if (!narrative.meaning || !RATING_MEANING.NON_DEROGATORY_CLOSURE.test(narrative.meaning)) continue;
        if (RATING_MEANING.ADVERSE.test(narrative.meaning)) continue;
        matches.push(match(record, row, 'ADVERSE_RATING_WITH_A_NON_DEROGATORY_NARRATIVE_IN_THE_SAME_MONTH', {
          rating_code: rating.code,
          rating_meaning: rating.meaning,
          narrative_code: narrative.code,
          narrative_meaning: narrative.meaning
        }));
      }
    }
  }
  return entry('PH-RATING-CONTRADICTS-NARRATIVE-IN-THE-SAME-MONTH',
    'a month the report rates as a bad debt while the same month says the account was paid or closed without a derogatory rating',
    matches,
    'No month of any account read here has an adverse rating and a non-derogatory narrative at the same time.',
    'At least one month of an account is rated as a bad debt or collection while the same month narrative says the account was paid in full or closed without a derogatory rating. Both of those statements are the report own.',
    ['a status can change inside one month, so both statements may be partly true',
     'a code meaning is quoted exactly as the report prints it in its own legend, never decoded by this build']);
}

/* 2. A positive payment and an explicit no-payment description for the same account and month. The account's
   write-off state does not decide this check: ordinary payments after write-off are not contradictions. */
function paymentContradictsNoPaymentNarrative(records) {
  const matches = [];
  for (const record of records) {
    for (const row of rowsOf(record)) {
      const payment = amountOf(row, 'payment');
      if (payment === null || payment <= 0) continue;
      const noPayment = narrativesOf(record, row).find((n) => n.meaning && /\b(?:no payment (?:received|made|posted)|payment not (?:received|made|posted))\b/i.test(n.meaning));
      if (!noPayment) continue;
      matches.push(match(record, row, 'PAYMENT_CONTRADICTS_SAME_MONTH_NO_PAYMENT_NARRATIVE', {
        payment_raw: row.cells.payment,
        payment_amount: payment,
        no_payment_code: noPayment.code,
        no_payment_meaning: noPayment.meaning
      }));
    }
  }
  return entry('PH-PAYMENT-CONTRADICTS-NO-PAYMENT-NARRATIVE',
    'a payment amount and a no-payment description printed for the same month',
    matches,
    'No month of an account read here prints both a payment amount and an explicit no-payment description.',
    'For the same month, this account prints a payment amount and a description saying no payment was received. Please verify which reading is correct.',
    ['a payment can be posted and later reversed, and a row may report the month a payment was applied rather than received',
     'a write-off is an accounting event and does not by itself stop a payment being recorded']);
}

/* 3. A printed first-delinquency anchor that is LATER than a month the same account already shows as late.
   A missing anchor is never used here: that is the completeness question, not this one. */
function anchorAfterTheHistoryShowsIt(records) {
  const matches = [];
  for (const record of records) {
    const printed = (record.printed || {})['First Delinquency Date'];
    const anchor = fact(record, 'tradeline.firstDelinquencyDate') || (printed && printed.normalized) || null;
    if (!anchor) continue;
    const anchorMonth = String(anchor).slice(0, 7);
    const earlier = [];
    for (const row of rowsOf(record)) {
      if (row.period >= anchorMonth) continue;
      const rating = ratingOf(record, row);
      const code = rating.code ? Number(String(rating.code).replace(/[^0-9]/g, '')) : NaN;
      const plainlyLate = Number.isFinite(code) && code >= 2 && code <= 9;
      const meaningSaysLate = Boolean(rating.meaning) && RATING_MEANING.ADVERSE.test(rating.meaning);
      if (plainlyLate || meaningSaysLate) {
        earlier.push({ period: row.period, code: rating.code, meaning: rating.meaning, location: row.location || null });
      }
    }
    if (!earlier.length) continue;
    matches.push(match(record, rowsOf(record)[0], 'FIRST_DELINQUENCY_ANCHOR_IS_LATER_THAN_A_MONTH_ALREADY_SHOWN_AS_LATE', {
      delinquency_anchor_printed: printed && printed.raw ? printed.raw : anchor,
      delinquency_anchor_iso: anchor,
      delinquency_anchor_location: printed && printed.location ? printed.location : null,
      months_already_shown_as_late: earlier
    }));
  }
  return entry('PH-DELINQUENCY-ANCHOR-AFTER-THE-HISTORY-SHOWS-IT',
    'a first-delinquency date printed later than a month the same account already shows as late',
    matches,
    'No account read here prints a first-delinquency date later than a month its own history already shows as late.',
    'This account prints a first-delinquency date, and its own monthly history already shows a late month before that date. Both are the report own statements and they do not agree.',
    ['an unknown rating (X) and a blank cell are never treated as a late month',
     'a rating of 1 or 0 is a paid-as-agreed month and is not late',
     'the anchor may describe the current delinquency rather than the first one, which the report does not say']);
}

/**
 * The candidates examined during the real-report review and NOT enabled, each with the innocent explanation
 * that defeated it or the exact prerequisite it still needs. Kept internal: these are recorded, never raised.
 */
const WITHHELD_CANDIDATES = Object.freeze([
  Object.freeze({
    candidate: 'AN_EVENT_DATED_AFTER_A_PRINTED_CLOSURE',
    reason: 'A creditor can close an account and then write it off or place it for collection, and a closed account normally keeps reporting its final state. The printed closure date is therefore not evidence that a later event is wrong.',
    missing_prerequisite: 'a report statement tying the later event to a date before the closure'
  }),
  Object.freeze({
    candidate: 'CLOSURE_WITH_A_NON_ZERO_BALANCE',
    reason: 'Closure does not require a zero balance: an account can be closed with a balance outstanding, so a closed account with a balance is ordinary.',
    missing_prerequisite: 'a printed statement that the balance was paid at closure'
  }),
  Object.freeze({
    candidate: 'A_COLLECTION_OR_TRANSFER_AS_RE_AGING',
    reason: 'A collection placement or a transfer does not by itself refresh or change the delinquency the account already shows, and the report prints no re-aged anchor.',
    missing_prerequisite: 'two comparable printed delinquency anchors for the same account'
  }),
  Object.freeze({
    candidate: 'CUMULATIVE_COUNTS_VERSUS_THE_VISIBLE_MONTHS',
    reason: 'The printed 30/60/90/#M figures are cumulative lifetime counts while the visible table is a short window; the two are not comparable, so no comparison is made and no conclusion is drawn from their difference.',
    missing_prerequisite: 'a printed statement of the period the counts cover'
  }),
  Object.freeze({
    candidate: 'AN_UNKNOWN_RATING_TREATED_AS_A_MISSED_PAYMENT',
    reason: 'An unknown rating (X), a blank cell and an unprinted month are not missed payments and are never counted as one.',
    missing_prerequisite: 'a printed meaning for the unknown rating'
  }),
  Object.freeze({
    candidate: 'PRODUCT_TYPE_OPEN_READ_AS_A_LIFECYCLE_STATUS',
    reason: 'The product type OPEN describes the kind of account, not whether it is still open, so it is never read as a lifecycle status.',
    missing_prerequisite: 'a printed closure date or a closure narrative'
  }),
  Object.freeze({
    candidate: 'THE_ORIGINAL_DELINQUENCY_ANCHOR_CHANGED_BETWEEN_TWO_OWNED_REPORTS',
    reason: 'Comparable evidence for this candidate exists only when the consumer owns two reports of the same account. The owned report history and its comparison view supply that evidence; it is never inferred from one snapshot, and the snapshot association must be shown before the candidate is raised.',
    missing_prerequisite: 'two owned results for the same account whose printed debt identifiers match'
  })
]);

function runPaymentHistoryAnalysis(context) {
  const extraction = context && context.extraction ? context.extraction : null;
  const records = (extraction && Array.isArray(extraction.records)) ? extraction.records : [];
  const base = {
    check_class: CHECK_CLASS,
    performed: [],
    withheld_candidates: WITHHELD_CANDIDATES.map((c) => Object.assign({}, c)),
    summary: { records: records.length, analyses: 0, potential_issue: 0, not_detected: 0, withheld_candidates: WITHHELD_CANDIDATES.length, legal_findings_emitted: 0 }
  };
  if (!records.length) return base;
  const performed = [ratingContradictsNarrative(records), paymentContradictsNoPaymentNarrative(records), anchorAfterTheHistoryShowsIt(records)].filter(Boolean);
  base.performed = performed;
  base.summary.analyses = performed.length;
  base.summary.potential_issue = performed.filter((p) => p.state === 'POTENTIAL_ISSUE').length;
  base.summary.not_detected = performed.filter((p) => p.state !== 'POTENTIAL_ISSUE').length;
  return base;
}

module.exports = {
  CHECK_CLASS,
  WITHHELD_CANDIDATES,
  ratingContradictsNarrative,
  paymentContradictsNoPaymentNarrative,
  anchorAfterTheHistoryShowsIt,
  runPaymentHistoryAnalysis
};
