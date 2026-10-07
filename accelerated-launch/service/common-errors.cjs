'use strict';
/**
 * common-errors.cjs — BLOCKER-COMMON-ERRORS-001. Data-consistency checks across the ASSEMBLED records of one
 * report. Each check records a factual discrepancy or a potential issue with its source-linked evidence and a
 * plain explanation. A separate source-linked report-data rule assesses whether the
 * discrepancy is a violation; these checks never change a record's resolved facts.
 */
const CHECK_CLASS = 'COMMON_ERROR';
const { CHECKS: PRODUCT_CHECKLIST } = require('./common-error-checklist.cjs');
const reaging = require('./reaging.cjs');
const { calendar: { parseIso, daysInMonth } } = require('../adapters/evaluation-primitives.cjs');

function iso(a) { return typeof a === 'string' ? a : null; }

// A month is a range of possible dates. Overlapping ranges do not establish reversed dates.
function dateRange(value, precision) {
  if (typeof value !== 'string') return null;
  const month = /^(\d{4})-(\d{2})(?:-\d{2})?$/.exec(value);
  if (month && (/^MONTH(?:_LEVEL)?$/.test(precision || '') || value.length === 7)) {
    const year = +month[1], number = +month[2];
    if (number < 1 || number > 12) return null;
    const prefix = `${month[1]}-${month[2]}`;
    return { first: `${prefix}-01`, last: `${prefix}-${String(daysInMonth(year, number)).padStart(2, '0')}` };
  }
  return parseIso(value) ? { first: value, last: value } : null;
}

function factDateRange(record, field) {
  const facts = record.facts || {};
  const value = facts[field];
  const reading = Object.values(record.printed || {}).find((item) => item && item.normalized === value && item.kind === 'date');
  return dateRange(value, facts[`${field}Precision`] || (reading && reading.precision));
}

function strictlyAfter(a, b) { return Boolean(a && b && a.first > b.last); }

function match(record, why, evidence) {
  return {
    record_index: record.record_index,
    kind: record.kind,
    kind_label: record.kind_label,
    location: record.location || null,
    source_file_id: record.source_file_id || null,
    reason: why,
    evidence
  };
}

function entry(checkId, label, matches, plain, detectedPlain, state) {
  const s = state || (matches.length ? 'POTENTIAL_ISSUE' : 'NOT_DETECTED');
  return {
    check_id: checkId,
    check_class: CHECK_CLASS,
    label,
    state: s,
    output_ceiling: 'observation',
    source_records: matches,
    plain: matches.length ? detectedPlain : plain
  };
}

/* 1. An account whose opened date is after its closed date is self-contradictory. */
function contradictoryAccountDates(records) {
  const applicable = records.some((r) => factDateRange(r, 'liability.openedDate') && factDateRange(r, 'liability.closedDate'));
  if (!applicable) return null;
  const matches = [];
  for (const r of records) {
    const f = r.facts || {};
    const opened = iso(f['liability.openedDate']);
    const closed = iso(f['liability.closedDate']);
    if (strictlyAfter(factDateRange(r, 'liability.openedDate'), factDateRange(r, 'liability.closedDate'))) {
      matches.push(match(r, 'OPENED_DATE_AFTER_CLOSED_DATE', { opened, closed }));
    }
  }
  return entry('COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY', 'an account with contradictory dates', matches,
    'No account with a contradictory opened/closed date was detected in the records we could read.',
    'This report prints at least one account whose opened date is later than its closed date. The printed dates conflict.');
}

/* 2. Two records of the same kind with identical identifying dates AND the same source report may be the same
   account reported twice — but only when BOTH a report-supported masked account identifier AND the printed
   creditor/account name corroborate them as the SAME debt. Masked trailing digits can collide (two different
   accounts can share the last four digits), so the masked identifier alone is never sufficient. Matching dates
   (plus bureau and report date) alone never establish a duplicate, and the creditor name alone is never
   sufficient either. Without BOTH corroborations they are described as "similar entries worth reviewing",
   never as duplicate debt reporting. */
function identityKey(record) {
  const f = record.facts || {};
  const mask = f['account.masked_identifier'];
  const name = f['account.reported_identity'];
  if (!mask || !name) return null;   // both are required; either alone is insufficient
  const m = String(mask).toUpperCase().replace(/[^A-Z0-9-]/g, '').trim();
  const n = String(name).toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
  if (!m || !n) return null;
  return `${m}|${n}`;
}

function dateKey(r) {
  const f = r.facts || {};
  return [r.kind, r.source_bureau || '', r.source_report_reference_date || '', iso(f['liability.openedDate']), iso(f['liability.closedDate']), iso(f['overdue.originalListingDate'])].join('|');
}

function groupByDateKey(records) {
  const groups = new Map();
  for (const r of records) {
    if (r.status !== 'RESOLVED') continue;
    const f = r.facts || {};
    /* A duplicate/similarity comparison requires an identifying DATE (opened/closed/original-listing). Records
       that print none are never grouped — two records in the same section with no identifying dates are not
       "similar entries", and nothing is inferred. */
    const identifying = iso(f['liability.openedDate']) || iso(f['liability.closedDate']) || iso(f['overdue.originalListingDate']);
    if (!identifying) continue;
    const k = dateKey(r);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }
  return groups;
}

/* OWNER-ACCEPT-009 item 4: a creditor name plus masked trailing digits can still collide between two accounts
   with the SAME creditor. A duplicate is only described when an ADDITIONAL compatible account fact (a matching
   printed balance, credit limit, or status) corroborates them as the same debt. Without that additional
   compatible evidence the entry stays a qualified similarity observation; contradictory additional evidence
   (different balance or status) refutes the duplicate. */
function corroboratingThirdFact(a, b) {
  const fa = a.facts || {}, fb = b.facts || {};
  let compared = 0, shared = 0, contradicted = false;
  for (const key of ['account.amount', 'account.creditLimit', 'account.status']) {
    const va = fa[key], vb = fb[key];
    if (va === undefined && vb === undefined) continue;
    compared += 1;
    if (va !== undefined && vb !== undefined) {
      if (String(va) === String(vb)) shared += 1;
      else contradicted = true;
    }
  }
  if (contradicted) return 'CONTRADICTED';
  if (shared >= 1) return 'CONFIRMED';
  return 'NONE';
}

function duplicateReporting(records) {
  const groups = groupByDateKey(records);
  const matches = [];
  const candidates = new Map();
  for (const [k, list] of groups) {
    for (const r of list) {
      const id = identityKey(r);
      if (!id) continue;
      const key = `${k}|${id}`;
      const earlier = candidates.get(key) || [];
      const prior = earlier.find((item) => corroboratingThirdFact(item, r) === 'CONFIRMED');
      if (prior) {
        matches.push(match(r, 'SAME_IDENTITY_DATES_AND_SOURCE_REPORT', { duplicate_of_record: prior.record_index, corroborated_identity: id }));
      }
      earlier.push(r);
      candidates.set(key, earlier);
    }
  }
  if (!matches.length) return null;
  return entry('COMMON-ERROR-DUPLICATE-REPORTING', 'potential duplicate reporting', matches,
    'No two records with identical kind, dates, source report, masked account identifier AND a matching additional account fact were detected; matching dates alone never establish a duplicate.',
    'This report prints two records with the same kind, identifying dates, source report, masked account identifier and a matching printed balance/limit/status, which may be the same account reported twice. This is a potential issue, not a finding; a shared masked identifier and creditor name with no additional compatible account fact is never described as duplicate reporting.');
}

/* 2b. Two records that share kind, bureau, report date and identifying dates but carry NO report-supported
   account identity that corroborates them as the same account, are "similar entries worth reviewing". This
   asserts nothing about duplicate debt reporting; it is a review recommendation only. */
function similarEntriesWorthReviewing(records) {
  const groups = groupByDateKey(records);
  const matches = [];
  for (const [k, list] of groups) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j];
        const idA = identityKey(a), idB = identityKey(b);
        const sameId = idA && idB && idA === idB;
        if (sameId) {
          const third = corroboratingThirdFact(a, b);
          if (third === 'CONFIRMED') continue; // asserted by duplicateReporting
          matches.push(match(b, 'SIMILAR_ENTRIES_WORTH_REVIEWING', {
            other_record: a.record_index,
            same_kind_dates_source: true,
            corroborated_as_same_account: false,
            shared_identity_without_additional_evidence: true,
            contradictory_evidence: third === 'CONTRADICTED'
          }));
        } else {
          matches.push(match(b, 'SIMILAR_ENTRIES_WORTH_REVIEWING', {
            other_record: a.record_index,
            same_kind_dates_source: true,
            corroborated_as_same_account: false
          }));
        }
      }
    }
  }
  if (!matches.length) return null;
  return entry('COMMON-ERROR-SIMILAR-ENTRIES-WORTH-REVIEWING', 'similar entries worth reviewing', matches,
    'No entries sharing kind, dates and source report without a corroborating masked account identifier were detected.',
    'This report prints entries that share the same kind, dates and source report but no masked account identifier plus a matching additional account fact confirms they are the same debt. They may be two legitimate separate debts, or the same debt reported twice. They are worth reviewing, but this is not an assertion of duplicate debt reporting. A shared masked identifier and creditor name without additional compatible account evidence remains a qualified similarity observation, never duplicate debt reporting.',
    'SIMILAR_ENTRIES_WORTH_REVIEWING');
}

/* 3. A reported-account whose opened date is after its first-reported date is out of order. */
function reportedDatesOutOfOrder(records) {
  const applicable = records.some((r) => factDateRange(r, 'reportedAccount.dateOpened') && factDateRange(r, 'reportedAccount.firstReported'));
  if (!applicable) return null;
  const matches = [];
  for (const r of records) {
    const f = r.facts || {};
    if (strictlyAfter(factDateRange(r, 'reportedAccount.dateOpened'), factDateRange(r, 'reportedAccount.firstReported'))) {
      matches.push(match(r, 'DATE_OPENED_AFTER_FIRST_REPORTED', { opened: f['reportedAccount.dateOpened'], first_reported: f['reportedAccount.firstReported'] }));
    }
  }
  return entry('COMMON-ERROR-REPORTED-DATES-OUT-OF-ORDER', 'a reported account with out-of-order dates', matches,
    'No reported account with an out-of-order opened/first-reported date was detected.',
    'This report prints a reported account whose opened date is later than its first-reported date. The printed dates conflict.');
}

/* 3. A printed status that says the account is OPEN while the same record prints a closure date is
   self-contradictory. OWNER-CORRECTION: account LIFECYCLE (open/closed) and repayment PERFORMANCE
   (current/overdue/paid as agreed) are different meanings. Only a lifecycle-open status (OPEN, ACTIVE) is read
   as "the account is open"; CURRENT, NOT OVERDUE, UP TO DATE and PAID AS AGREED describe repayment and are
   never evidence that the account is open. A closed account is NOT assumed to have zero balance. */
function accountStatusDateContradiction(records) {
  const openStatus = new Set(['OPEN', 'ACTIVE']);
  const applicable = records.some((r) => { const f = r.facts || {}; return openStatus.has(f['account.status']) && iso(f['liability.closedDate']); });
  if (!applicable) return null;
  const matches = [];
  for (const r of records) {
    const f = r.facts || {};
    if (openStatus.has(f['account.status']) && iso(f['liability.closedDate'])) {
      matches.push(match(r, 'OPEN_STATUS_WITH_CLOSED_DATE', { status: f['account.status'], closed: f['liability.closedDate'] }));
    }
  }
  return entry('COMMON-ERROR-STATUS-DATE-CONTRADICTION', 'an account whose status contradicts its closure date', matches,
    'No account with an open status and a printed closure date was detected.',
    'This report prints an account whose status says it is open while the same record prints a closure date. The printed dates conflict.');
}

/* Balance consistency compares a current balance with its past-due amount. A payment can legitimately exceed
   the remaining balance, so its amount alone is not a contradictory value. */
function nval(v) { return typeof v === 'number' && Number.isFinite(v) ? v : undefined; }

function balancePaymentConsistency(records) {
  const matches = [];
  let applicable = false;
  for (const r of records) {
    const f = r.facts || {};
    const balance = nval(f['account.balance']);
    const pastDue = nval(f['account.pastDueAmount']);
    if (balance !== undefined && pastDue !== undefined) applicable = true;
    if (balance !== undefined && pastDue !== undefined && pastDue > balance) {
      matches.push(match(r, 'PAST_DUE_EXCEEDS_BALANCE', { balance, past_due: pastDue }));
    }
  }
  if (!applicable) return null;
  return entry('COMMON-ERROR-BALANCE-PAYMENT-INCONSISTENCY', 'a balance/payment inconsistency', matches,
    'No printed past-due amount exceeding its printed balance was detected.',
    'This report prints a past-due amount larger than the balance it sits next to. The printed amounts conflict.');
}

/* The report's own revolving-account fields: a positive balance beside an explicitly
   printed zero limit warrants verification. A blank limit is not treated as zero. */
function revolvingBalanceWithZeroLimit(records) {
  const matches = [];
  let applicable = false;
  for (const r of records) {
    const f = r.facts || {};
    const type = String(f['account.type'] || '').toUpperCase();
    if (!/REVOLVING|CREDIT CARD|LINE OF CREDIT/.test(type)) continue;
    const balance = nval(f['account.balance']);
    const limit = nval(f['account.creditLimit']);
    if (balance === undefined || limit === undefined) continue;
    applicable = true;
    if (balance > 0 && limit === 0) matches.push(match(r, 'POSITIVE_REVOLVING_BALANCE_WITH_ZERO_LIMIT', { balance, credit_limit: limit, type: f['account.type'] }));
  }
  if (!applicable) return null;
  return entry('COMMON-ERROR-REVOLVING-BALANCE-ZERO-LIMIT', 'revolving balance with a zero credit limit', matches,
    'No revolving account printed both a positive balance and a zero credit limit.',
    'This report prints a positive revolving balance beside an explicit zero credit limit. Verify the limit and balance; the report alone does not establish a scoring effect.');
}

/* A record's own final-payment wording conflicts with an amount still due. A settled
   balance alone is insufficient: a partial settlement may explain it. */
function paidOrSettledShownUnpaid(records) {
  const matches = [];
  let applicable = false;
  for (const r of records) {
    const f = r.facts || {};
    const status = String(f['account.status'] || '').toUpperCase().trim();
    const pastDue = nval(f['account.pastDueAmount']);
    const balance = nval(f['account.balance']);
    if (['PAID', 'PAID IN FULL', 'SETTLED', 'SETTLED IN FULL'].includes(status)
      && (pastDue !== undefined || balance !== undefined)) applicable = true;
    if (applicable && ['PAID', 'PAID IN FULL', 'SETTLED', 'SETTLED IN FULL'].includes(status)
      && pastDue !== undefined && pastDue > 0) {
      matches.push(match(r, 'FINAL_PAYMENT_STATUS_WITH_PAST_DUE', { status, past_due: pastDue }));
    }
    else if (['PAID', 'PAID IN FULL', 'SETTLED IN FULL'].includes(status) && balance !== undefined && balance > 0) {
      matches.push(match(r, 'PAID_IN_FULL_WITH_POSITIVE_BALANCE', { status, balance }));
    }
  }
  if (!applicable) return null;
  return entry('COMMON-ERROR-PAID-SETTLED-SHOWN-UNPAID', 'paid or settled account still showing an amount past due', matches,
    'No final-payment status beside a positive amount due was detected.',
    'This entry prints a paid or settled status beside a positive amount due. Please verify which printed value describes this account now.');
}

/* A date can be questioned from report evidence only when it conflicts with another printed
   date. The check does not infer an actual last payment or first delinquency from age alone. */
function paymentOrDelinquencyDateConflict(records) {
  const matches = [];
  let applicable = false;
  for (const r of records) {
    const f = r.facts || {};
    const opened = iso(f['liability.openedDate']);
    const lastPayment = iso(f['tradeline.lastPaymentDate']);
    const firstDelinquency = iso(f['tradeline.firstDelinquencyDate']);
    const reportDate = iso(r.source_report_reference_date)
      || iso(r.report_reference_date && r.report_reference_date.normalized_value);
    const openedRange = factDateRange(r, 'liability.openedDate');
    const reportRange = dateRange(reportDate, r.report_reference_date && r.report_reference_date.precision);
    for (const [field, value] of [['last_payment', lastPayment], ['first_delinquency', firstDelinquency]]) {
      if (!value) continue;
      const eventRange = factDateRange(r, field === 'last_payment' ? 'tradeline.lastPaymentDate' : 'tradeline.firstDelinquencyDate');
      if (eventRange && (openedRange || reportRange)) applicable = true;
      if (strictlyAfter(openedRange, eventRange)) matches.push(match(r, 'DATE_BEFORE_ACCOUNT_OPENED', { field, value, opened }));
      else if (strictlyAfter(eventRange, reportRange)) matches.push(match(r, 'DATE_AFTER_REPORT_ISSUED', { field, value, report_date: reportDate }));
    }
  }
  if (!applicable) return null;
  return entry('COMMON-ERROR-LAST-PAYMENT-OR-FIRST-DELINQUENCY-DATE', 'last-payment or first-delinquency date worth correcting', matches,
    'No printed last-payment or first-delinquency date conflicted with the account-opening or report date.',
    'This entry prints a last-payment or first-delinquency date before the account opened or after the report was issued. Please verify the dates on this entry.');
}

/* Both sides must be printed in the same report and linked by the account identifier and
   creditor. This remains a review item: a collection and original account may both be listed. */
function collectionAndOriginalBothDue(records) {
  const matches = [];
  let applicable = false;
  const originals = records.filter((r) => r.status === 'RESOLVED' && r.kind !== 'GENERAL_COLLECTION');
  for (const collection of records) {
    if (collection.status !== 'RESOLVED' || collection.kind !== 'GENERAL_COLLECTION') continue;
    const id = identityKey(collection);
    const amount = nval((collection.facts || {})['account.balance']) ?? nval((collection.facts || {})['account.amount']);
    if (!id || amount === undefined) continue;
    for (const original of originals) {
      const otherAmount = nval((original.facts || {})['account.balance']) ?? nval((original.facts || {})['account.amount']);
      if (identityKey(original) !== id || otherAmount === undefined) continue;
      if (collection.source_bureau !== original.source_bureau
        || collection.source_report_reference_date !== original.source_report_reference_date) continue;
      applicable = true;
      // Masked account digits and a creditor name can collide. A matching printed amount
      // supplies the extra corroboration needed before presenting this as a linked pair.
      if (amount <= 0 || otherAmount <= 0 || amount !== otherAmount) continue;
      matches.push(match(collection, 'LINKED_COLLECTION_AND_ORIGINAL_BOTH_DUE', {
        original_record: original.record_index, collection_amount: amount, original_amount: otherAmount
      }));
    }
  }
  if (!applicable) return null;
  return entry('COMMON-ERROR-COLLECTION-ORIGINAL-BOTH-DUE', 'collection and original account both showing amounts due', matches,
    'No linked collection and original-account pair with positive printed amounts was detected.',
    'A collection entry and its linked original account both print amounts due in the same report. They may describe one obligation in two places; please verify whether either amount is inaccurate.');
}

/* 3c. OWNER-ACCEPT-009 item 2 (corrected): payment-history consistency. A history cell and a printed account
   fact are compared ONLY when both carry the SAME explicit reporting period AND the SAME printed meaning. A
   latest "paid as agreed" cell beside a "charged off" status is NOT automatically inconsistent: the status may
   describe an earlier event or a different reporting period. The only genuine same-period contradiction this
   check asserts is the grid printing the SAME period twice with two DIFFERENT cells. A blank cell is never a
   missed payment, a code without a printed legend is never decoded by guessing, and a status/summary without a
   period is never compared against a cell. */
function paymentHistoryConsistency(records) {
  const applicable = records.some((r) => {
    const f = r.facts || {};
    return Array.isArray(f['account.paymentHistoryCells']) && f['account.paymentHistoryCells'].length > 1;
  });
  if (!applicable) return null;
  const matches = [];
  for (const r of records) {
    const f = r.facts || {};
    const cells = Array.isArray(f['account.paymentHistoryCells']) ? f['account.paymentHistoryCells'] : [];
    const byPeriod = new Map();
    for (const c of cells) {
      const period = String(c && c.period ? c.period : '').trim();
      if (!period) continue;
      /* C3: an unresolved cell (low-confidence code, unknown meaning, or no cell) is never compared as a
         delinquency. Only a cell with a resolved code participates in a same-period contradiction. */
      if (!c || c.code == null || !String(c.meaning || '').trim() || c.uncertain === true) continue;
      if (!byPeriod.has(period)) { byPeriod.set(period, c); continue; }
      const prior = byPeriod.get(period);
      if (prior.meaning && c.meaning && String(prior.meaning).trim().toUpperCase() !== String(c.meaning).trim().toUpperCase()) {
        matches.push(match(r, 'SAME_PERIOD_CONTRADICTORY_CELLS', { period, first_code: prior.code, first_meaning: prior.meaning || null, second_code: c.code, second_meaning: c.meaning || null }));
      }
    }
  }
  if (!matches.length) return null;
  return entry('COMMON-ERROR-PAYMENT-HISTORY-INCONSISTENCY', 'a payment-history inconsistency', matches,
    'No payment-history period printed twice with contradictory cells was detected.',
    'This report prints the same payment-history period twice with two different cells. The printed cells conflict for the same reporting period. A printed status or summary without a period is never compared against a history cell, a blank or unreadable cell is never treated as a missed payment, and a code without a printed legend is never decoded by guessing.');
}

/* 3d. OWNER-ACCEPT-009 item 3 (corrected): account-responsibility consistency. Only the SAME report-supported
   account in the SAME reporting snapshot (same bureau AND same report reference date) with two different explicit
   responsibility labels, AND corroborated as the same account by an additional compatible fact, is a conflict.
   Different bureau snapshots, a changed responsibility over time, a joint relationship and a masked-identifier
   collision are never inconsistencies. Responsibility extraction alone is not a complete identity assessment;
   aliases and historical addresses are preserved and never become identity theft. */
function responsibilityInconsistency(records) {
  const matches = [];
  const seen = new Map();
  for (const r of records) {
    const f = r.facts || {};
    const id = identityKey(r);
    const resp = f['account.responsibility'];
    if (!id || !resp) continue;
    const snapshot = `${r.source_bureau || ''}|${r.source_report_reference_date || ''}`;
    const key = `${id}|${snapshot}`;
    const earlier = seen.get(key) || [];
    const prior = earlier.find((item) => item.resp !== resp && corroboratingThirdFact(item.record, r) === 'CONFIRMED');
    if (prior) {
      matches.push(match(r, 'RESPONSIBILITY_CONFLICT', { responsibility: resp, other_responsibility: prior.resp, other_record: prior.index, snapshot: snapshot || null }));
    }
    earlier.push({ resp, index: r.record_index, record: r });
    seen.set(key, earlier);
  }
  if (!matches.length) return null;
  return entry('COMMON-ERROR-RESPONSIBILITY-INCONSISTENCY', 'an account-responsibility inconsistency', matches,
    'No account reported with conflicting responsibility labels in the same snapshot was detected.',
    'This report prints the same account (same masked identifier and creditor, same bureau and report date, corroborated by a matching balance/limit/status) with two different responsibility labels. The printed responsibility labels conflict; a joint account, an authorized-user role, a changed responsibility over time and a masked-identifier collision are never treated as a conflict, and a name or address alone never becomes identity theft or incorrect ownership.');
}

/* 3e. OWNER-ACCEPT-009 item 5 (reconciled): report-internal identity review. Two printed identity fields of the
   SAME role with different non-identifying tokens are NOT a contradiction: the report may print multiple
   legitimate names, addresses across different dates, or co-applicants. They are surfaced only as a QUALIFIED
   review observation — the report cannot establish whether the values are incompatible, and the consumer can
   inspect the original fields (whose source locations are preserved, not their raw identity text). An alias, a
   historical/former address and a co-applicant are DISTINCT roles and are never flagged; an unfamiliar detail
   alone never becomes identity theft or incorrect ownership. */
function identityDiscrepancy(identityGroups) {
  const list = Array.isArray(identityGroups) ? identityGroups : [];
  if (!list.length) return null;
  const matches = [];
  const seen = new Map();
  for (const g of list) {
    const key = `${g.field}|${g.role}`;
    const prior = seen.get(key);
    if (prior && prior.token !== g.token) {
      matches.push({ field: g.field, role: g.role, first_token: prior.token, second_token: g.token, location: g.location || null, reason: 'IDENTITY_FIELD_WORTH_REVIEWING' });
    } else if (!prior) {
      seen.set(key, { token: g.token, location: g.location });
    }
  }
  if (!matches.length) return null;
  return entry('COMMON-ERROR-IDENTITY-REVIEW', 'identity fields worth reviewing', matches,
    'No printed identity field of the same role with two different values was detected.',
    'This report prints two identity fields of the same role (for example two current addresses) with different values. They may both be legitimate — for example multiple addresses or names across different dates — and this report cannot establish whether they are incompatible. They are shown only for your review, never as a contradiction, identity theft or incorrect ownership. An alias, a former address or a co-applicant is a distinct role and is never flagged.',
    'SIMILAR_ENTRIES_WORTH_REVIEWING');
}

/* The checklist retains re-aging coverage as a required capability. A later adverse event can follow ordinary
   first reporting; those two dates establish neither re-aging nor its absence. A supported detector needs
   evidence of the delinquency/retention anchor being improperly changed, which this date pair cannot supply. */
function adverseAfterFirstReport() {
  return null;
}

/** The normalized fact fields the tracked selectable issue types require. A check is runnable on a
 *  presentation only when its records actually carry these fields — never by presentation NAME. Missing fields
 *  are a gap, never an inference. */
const ISSUE_TYPE_FIELD_REQUIREMENTS = Object.freeze({
  'COMMON-ERROR-POTENTIAL-RE-AGING-SIGNAL': ['account.masked_identifier', 'account.reported_identity', 'tradeline.firstDelinquencyDate'],
  'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY': ['liability.openedDate', 'liability.closedDate'],
  'COMMON-ERROR-STATUS-DATE-CONTRADICTION': ['account.status', 'liability.closedDate'],
  'COMMON-ERROR-PAYMENT-HISTORY-INCONSISTENCY': ['account.paymentHistoryCells'],
  'COMMON-ERROR-BALANCE-PAYMENT-INCONSISTENCY': ['account.balance', 'account.pastDueAmount'],
  'COMMON-ERROR-DUPLICATE-REPORTING': ['account.masked_identifier', 'account.reported_identity'],
  'COMMON-ERROR-RESPONSIBILITY-INCONSISTENCY': ['account.masked_identifier', 'account.reported_identity', 'account.responsibility']
});

/* Full factual-check inventory. `field_sets` are alternatives; every field in one set must
 * occur on the same account. The relation and report-structure notes remain explicit because
 * field availability alone cannot establish a duplicate, an omission, or an identity conflict. */
const FACTUAL_CHECK_CAPABILITY = Object.freeze({
  'COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY': { field_sets: [['liability.openedDate', 'liability.closedDate']] },
  'COMMON-ERROR-STATUS-DATE-CONTRADICTION': { field_sets: [['account.status', 'liability.closedDate']] },
  'COMMON-ERROR-BALANCE-PAYMENT-INCONSISTENCY': { field_sets: [
    ['account.balance', 'account.pastDueAmount']
  ] },
  'COMMON-ERROR-REVOLVING-BALANCE-ZERO-LIMIT': { field_sets: [['account.type', 'account.balance', 'account.creditLimit']] },
  'COMMON-ERROR-PAYMENT-HISTORY-INCONSISTENCY': { field_sets: [['account.paymentHistoryCells']],
    additional_evidence: 'TWO_DECODED_CELLS_IN_ONE_PERIOD' },
  'COMMON-ERROR-RESPONSIBILITY-INCONSISTENCY': { field_sets: [[
    'account.masked_identifier', 'account.reported_identity', 'account.responsibility'
  ]], additional_evidence: 'TWO_CORROBORATED_ACCOUNTS_IN_ONE_REPORT_SNAPSHOT' },
  'COMMON-ERROR-DUPLICATE-REPORTING': { field_sets: [[
    'account.masked_identifier', 'account.reported_identity', 'liability.openedDate'
  ], ['account.masked_identifier', 'account.reported_identity', 'liability.closedDate'],
  ['account.masked_identifier', 'account.reported_identity', 'overdue.originalListingDate']],
  additional_evidence: 'TWO_SAME_KIND_RECORDS_WITH_COMPATIBLE_DATES_AND_THIRD_FACT' },
  'COMMON-ERROR-SIMILAR-ENTRIES-WORTH-REVIEWING': { field_sets: [['liability.openedDate'],
    ['liability.closedDate'], ['overdue.originalListingDate']],
  additional_evidence: 'TWO_SIMILAR_RECORDS_IN_ONE_REPORT_SNAPSHOT' },
  'COMMON-ERROR-REPORTED-DATES-OUT-OF-ORDER': { field_sets: [[
    'reportedAccount.dateOpened', 'reportedAccount.firstReported'
  ]] },
  'COMMON-ERROR-POTENTIAL-RE-AGING-SIGNAL': { field_sets: [[
    'account.masked_identifier', 'account.reported_identity', 'tradeline.firstDelinquencyDate', 'report.referenceDate'
  ]], additional_evidence: 'OWNED_EARLIER_SAME_BUREAU_FIXED_OBLIGATION_UNIQUE_IDENTITY_FORWARD_ANCHOR_CHANGE_WITHOUT_RESET_EVIDENCE' },
  'COMMON-ERROR-IDENTITY-REVIEW': { field_sets: [], additional_evidence: 'TWO_IDENTITY_FIELDS_OF_SAME_ROLE' },
  'COMMON-ERROR-ADVERSE-ENTRY-WITHOUT-A-DELINQUENCY-ANCHOR': { field_sets: [],
    additional_evidence: 'PRINTED_BLANK_CAPTION_AND_REPORT_DEFINED_ADVERSE_EVENT' },
  'COMMON-ERROR-WRITE-OFF-WITHOUT-A-CHARGE-OFF-DATE': { field_sets: [],
    additional_evidence: 'PRINTED_BLANK_CAPTION_AND_REPORT_DEFINED_WRITE_OFF' },
  'COMMON-ERROR-CLOSURE-STATED-WITHOUT-A-CLOSED-DATE': { field_sets: [],
    additional_evidence: 'PRINTED_BLANK_CAPTION_AND_REPORT_DEFINED_CLOSURE' },
  /* Checklist umbrella for the three source-proven omission rules above. Each child owns its
   * violation and packet; this row must not create a second allegation for the same blank. */
  'COMMON-ERROR-REQUIRED-REPORT-DATA-VISIBLY-MISSING': { field_sets: [],
    additional_evidence: 'SOURCE_LINKED_BLANK_REQUIRED_FIELD_AND_SAME_RECORD_TRIGGER' },
  'COMMON-ERROR-PAID-SETTLED-SHOWN-UNPAID': { field_sets: [[
    'account.status', 'account.pastDueAmount'
  ], ['account.status', 'account.balance']] },
  'COMMON-ERROR-LAST-PAYMENT-OR-FIRST-DELINQUENCY-DATE': { field_sets: [[
    'liability.openedDate', 'tradeline.lastPaymentDate'
  ], ['liability.openedDate', 'tradeline.firstDelinquencyDate'],
  ['report.referenceDate', 'tradeline.lastPaymentDate'],
  ['report.referenceDate', 'tradeline.firstDelinquencyDate']],
  additional_evidence: 'OR_DATE_COMPARED_WITH_SOURCED_REPORT_REFERENCE_DATE' },
  'COMMON-ERROR-COLLECTION-ORIGINAL-BOTH-DUE': { field_sets: [[
    'account.masked_identifier', 'account.reported_identity', 'account.balance'
  ], ['account.masked_identifier', 'account.reported_identity', 'account.amount']],
  additional_evidence: 'CORROBORATED_COLLECTION_AND_ORIGINAL_PAIR_IN_ONE_REPORT' }
});

/**
 * A field is USABLE only when it can support the comparison its check actually makes. RETAINED-BUT-UNUSABLE values
 * (for example status-history characters kept with no printed period and no printed legend, or cells that are
 * vector graphics) are NOT a usable field: they are kept for the consumer's own record, but they can never take
 * part in the comparison. Recording them as a capability would overstate what the check can do.
 */
const USABLE_FIELD_PREDICATES = Object.freeze({
  'account.paymentHistoryCells': (value) => Array.isArray(value)
    && value.some((c) => c && c.code != null && c.uncertain !== true && String(c.period || '').trim())
});

function usableField(record, field) {
  if (field === 'report.referenceDate') {
    const date = record && record.report_reference_date;
    if (!date || date.status && date.status !== 'RESOLVED') return false;
    if (date.raw_value != null && date.raw != null && date.raw_value !== date.raw
      || date.normalized_value != null && date.normalized != null && date.normalized_value !== date.normalized) return false;
    return (date.raw_value ?? date.raw) != null && Boolean(date.normalized_value ?? date.normalized) && Boolean(date.location);
  }
  const value = (record && record.facts) ? record.facts[field] : undefined;
  if (value === undefined || value === null) return false;
  const predicate = USABLE_FIELD_PREDICATES[field];
  return predicate ? predicate(value) : true;
}

function fullCapabilityRows(presentationId, fieldAvailable, performed) {
  const rows = {};
  for (const { check_id: id } of PRODUCT_CHECKLIST) {
    if (id === 'LIMITATION-PERIOD-COURT-CLAIM') continue;
    const spec = FACTUAL_CHECK_CAPABILITY[id];
    if (!spec) throw new Error(`Missing factual capability specification: ${id}`);
    const scopeAdmitted = !spec.presentation_scope || spec.presentation_scope.includes(presentationId);
    rows[id] = {
      field_sets: spec.field_sets.map((set) => [...set]),
      field_ready: spec.field_sets.length ? scopeAdmitted && spec.field_sets.some(fieldAvailable) : null,
      reader_scope_admitted: scopeAdmitted,
      additional_evidence: spec.additional_evidence || null,
      ...(performed ? { detector_performed: performed.has(id) } : {})
    };
  }
  return rows;
}

/** Which tracked issue types a presentation's records can actually supply USABLE fields for. Exact and
 *  source-linked: it names the absent fields AND the retained-but-unusable ones separately, and never fabricates
 *  a capability. A field a single report happens not to print is reported as absent for THAT report and is never
 *  read as a structural statement about the presentation. */
function formatCapability(extraction) {
  const records = (extraction && Array.isArray(extraction.records)) ? extraction.records : [];
  const fields = new Set();
  const usable = new Set();
  const usableByRecord = [];
  for (const r of records) {
    const onRecord = new Set();
    for (const f of Object.keys((r && r.facts) || {})) {
      fields.add(f);
      if (usableField(r, f)) { usable.add(f); onRecord.add(f); }
    }
    if (r.report_reference_date) {
      fields.add('report.referenceDate');
      if (usableField(r, 'report.referenceDate')) { usable.add('report.referenceDate'); onRecord.add('report.referenceDate'); }
    }
    usableByRecord.push(onRecord);
  }
  const checks = {};
  for (const [checkId, reqs] of Object.entries(ISSUE_TYPE_FIELD_REQUIREMENTS)) {
    const absent = reqs.filter((f) => !fields.has(f));
    const unusable = reqs.filter((f) => fields.has(f) && !usable.has(f));
    const onOneRecord = usableByRecord.some((onRecord) => reqs.every((f) => onRecord.has(f)));
    checks[checkId] = {
      supported: onOneRecord,
      missing_fields: absent,
      retained_but_not_usable_fields: unusable,
      not_on_same_record: !onOneRecord && absent.length === 0 && unusable.length === 0
    };
  }
  return {
    presentation_id: (extraction && extraction.presentation_id) || null,
    family_id: (extraction && extraction.family_id) || null,
    checks,
    all_factual_checks: fullCapabilityRows(extraction && extraction.presentation_id,
      (set) => usableByRecord.some((onRecord) => set.every((f) => onRecord.has(f))),
      new Set(runCommonErrorChecks({ extraction }).performed.map((item) => item.check_id)))
  };
}

/** The normalized fields a presentation's READER can structurally produce, independent of any one report. This is
 *  the capability boundary: what a family reader prints/reads, not what a specific report happened to include.
 *  GB reads no `facts` (its values live in the `printed` map), so it supplies none of these fields; the TU-CA
 *  reader now supplies its ordinary-account facts, so it declares them here by its own measured labels. */
const PRESENTATION_FIELD_CAPABILITY = Object.freeze({
  'PR-01': Object.freeze(['tradeline.lastPaymentDate', 'tradeline.firstDelinquencyDate', 'report.referenceDate']),
  'GENERAL-BUREAU-REPORT': Object.freeze([
    'report.referenceDate',
    'account.balance', 'account.amount', 'account.pastDueAmount', 'account.paymentAmount', 'account.status',
    'account.responsibility', 'account.masked_identifier', 'account.reported_identity', 'account.paymentHistoryCells',
    'account.creditLimit', 'account.type',
    'liability.openedDate', 'liability.closedDate', 'overdue.originalListingDate',
    'reportedAccount.dateOpened', 'reportedAccount.firstReported', 'reportedAccount.adverseRatingDate',
    'tradeline.lastPaymentDate', 'tradeline.firstDelinquencyDate'
  ]),
  'FAM-AU-EQX-CONSUMER': Object.freeze([
    'liability.openedDate', 'liability.closedDate', 'overdue.originalListingDate', 'enquiry.date',
    'account.creditLimit', 'account.type', 'account.reported_identity'
  ]),
  'US-CONSUMER-DISCLOSURE': Object.freeze([
    'account.reported_identity', 'account.masked_identifier', 'account.type', 'account.responsibility',
    'account.status', 'liability.openedDate',
    'reportedAccount.status', 'reportedAccount.dateOpened', 'reportedAccount.firstReported', 'reportedAccount.adverseRatingDate',
    'account.balance', 'account.pastDueAmount', 'account.creditLimit', 'account.paymentAmount'
  ]),
  'FAM-GB-EXP-CONSUMER': Object.freeze([
    'liability.openedDate', 'liability.closedDate', 'account.balance', 'account.creditLimit', 'account.type',
    'account.responsibility'
  ]),
  'FAM-TU-CA-CONSUMER': Object.freeze([
    'report.referenceDate',
    'liability.openedDate', 'liability.closedDate', 'account.reported_identity', 'account.type',
    'account.responsibility', 'account.balance', 'account.pastDueAmount', 'account.paymentAmount',
    'account.amount', 'account.creditLimit', 'account.paymentHistoryCells',
    'tradeline.lastPaymentDate', 'tradeline.firstDelinquencyDate'
  ])
});

/**
 * Fields a presentation's reader RETAINS but can never turn into a usable check, with the measured reason.
 * Retaining a value is not the same as being able to compare it, and reporting the retention as a capability
 * would overstate what the consumer's assessment can do.
 */
const PRESENTATION_RETAINED_NOT_USABLE = Object.freeze({
  'FAM-GB-EXP-CONSUMER': Object.freeze([
    Object.freeze({
      field: 'account.paymentHistoryCells',
      reason: 'THE_ARTIFACT_PRINTS_THE_STATUS_HISTORY_WITH_NO_REPORTING_PERIOD_AND_NO_STATUS_CODE_LEGEND'
    })
  ]),
  'FAM-AU-EQX-CONSUMER': Object.freeze([
    Object.freeze({
      field: 'account.paymentHistoryCells',
      reason: 'THE_REPAYMENT_HISTORY_CELLS_ARE_DRAWN_AS_VECTOR_GRAPHICS_AND_ARE_NOT_READ'
    })
  ])
});

/** Which tracked issue types a presentation's READER can structurally support, from its declared USABLE
 *  field surface. */
function presentationCapability(presentationId) {
  const fields = PRESENTATION_FIELD_CAPABILITY[presentationId] || [];
  const set = new Set(fields);
  const checks = {};
  for (const [checkId, reqs] of Object.entries(ISSUE_TYPE_FIELD_REQUIREMENTS)) {
    checks[checkId] = reqs.every((f) => set.has(f));
  }
  return {
    presentation_id: presentationId,
    checks,
    all_factual_checks: fullCapabilityRows(presentationId, (required) => required.every((f) => set.has(f))),
    retained_fields_without_a_usable_check: (PRESENTATION_RETAINED_NOT_USABLE[presentationId] || []).map((row) => Object.assign({}, row)),
    basis: 'This records what the READER can structurally produce from the presentation it is evidenced on, not what one specimen happened to print. A field a single report does not print is NOT evidence that the presentation never prints it, and a retained-but-unusable value is NOT a usable check.'
  };
}


/* ------------------------------------------- the report's OWN narrative legend (TransUnion Canada blocks) */

/**
 * BLOCKER-REPORT-DATA-TO-ISSUE-001 (real-report repair): the meanings a TransUnion Canada account block prints
 * for its own narrative codes, and the codes that account's own monthly rows print. Every meaning used below is
 * the report's OWN printed word — measured on the supplied disclosure: `AC-Account closed/rating non derogatory`,
 * `CG-Account cancelled by credit grantor with derogatory rating`, `WO-Bad debt write-off`,
 * `TC-Third party collection/account turned over to collection agency`, `CZ-Closed at consumer's request`. A code
 * is NEVER decoded by guessing: a code whose meaning the report does not print carries no meaning here, and a
 * check that needs one produces no result.
 */
function narrativeLegendOf(record) {
  const material = record && record.account_material;
  const legend = material && material.narrative_legend;
  return legend && typeof legend === 'object' ? legend : {};
}

/** The narrative codes this account's own monthly rows print, each with the row that printed it. */
function printedNarrativeCodes(record) {
  const out = new Map();
  for (const row of (record && record.monthly_rows) || []) {
    for (const code of row.narrative_codes || []) {
      const key = String(code).toUpperCase();
      if (key && !out.has(key)) out.set(key, row);
    }
  }
  return out;
}

/** The meaning the report's own legend line prints for a code, or null when the report prints none for it. */
function printedMeaning(record, code) {
  const legend = narrativeLegendOf(record);
  for (const key of Object.keys(legend)) {
    if (String(key).toUpperCase() === String(code).toUpperCase()) return String(legend[key]).trim() || null;
  }
  return null;
}

/** The five-state printed reading of one caption on one record, or null when the label is not on the record. */
function printedCaption(record, label) {
  const printed = (record && record.printed) || {};
  return printed[label] || null;
}

/** A caption the report ITSELF prints but leaves without a value. A label the report never prints is not this. */
function captionPrintedWithoutValue(record, label) {
  const field = printedCaption(record, label);
  return Boolean(field && field.state === 'LABEL_PRINTED_WITHOUT_VALUE');
}

/** The monthly cells whose manner-of-payment meaning the report itself prints as a bad debt placed for collection. */
function adverseRatingCells(record) {
  const facts = (record && record.facts) || {};
  const cells = Array.isArray(facts['account.paymentHistoryCells']) ? facts['account.paymentHistoryCells'] : [];
  return cells.filter((c) => /bad debt|placed for collection/i.test(String((c && c.meaning) || '')));
}

/** The codes this account prints whose OWN printed meaning matches the pattern. */
function codesMeaning(record, pattern) {
  return [...printedNarrativeCodes(record).entries()]
    .map(([code, row]) => ({ code, row, meaning: printedMeaning(record, code) }))
    .filter((e) => e.meaning && pattern.test(e.meaning));
}

function codeEvidence(entries) {
  return entries.map((e) => ({
    code: e.code,
    meaning_as_the_report_prints_it: e.meaning,
    period: e.row ? e.row.period : null,
    location: e.row ? e.row.location : null
  }));
}

/* 11. An entry the REPORT ITSELF presents as an adverse or collection debt, on which its own delinquency caption
   is printed with no value. The report states the bad-debt/collection status and, in the same entry, prints the
   `First Delinquency Date` caption without a date, so the entry carries no usable anchor for when the
   delinquency began. This is a factual COMPLETENESS concern offered as a POTENTIAL verification item: no statute
   is named, no omission is established, no date is invented, and an aged but satisfactory account never reaches
   this check. */
function adverseEntryWithoutADelinquencyAnchor(records) {
  const relevant = (r) => Boolean(r) && r.status === 'RESOLVED'
    && captionPrintedWithoutValue(r, 'First Delinquency Date')
    && (adverseRatingCells(r).length > 0 || codesMeaning(r, /collection/i).length > 0);
  if (!records.some(relevant)) return null;
  const matches = [];
  for (const r of records) {
    if (!relevant(r)) continue;
    const caption = printedCaption(r, 'First Delinquency Date');
    matches.push(match(r, 'ADVERSE_ENTRY_WITHOUT_A_USABLE_DELINQUENCY_DATE', {
      delinquency_caption: { state: caption.state, reason: caption.reason || null, location: caption.location || null },
      adverse_payment_ratings: adverseRatingCells(r).map((c) => ({
        period: c.period || null,
        raw_period: c.raw_period || null,
        code: c.code || null,
        meaning_as_the_report_prints_it: c.meaning || null,
        location: c.location || null
      })),
      collection_or_cancellation_codes: codeEvidence(codesMeaning(r, /collection/i))
    }));
  }
  return entry('COMMON-ERROR-ADVERSE-ENTRY-WITHOUT-A-DELINQUENCY-ANCHOR',
    'an entry the report presents as a bad debt or collection with no date for when the delinquency began',
    matches,
    'No entry that the report presents as a bad debt or collection with an empty delinquency date was detected in the records we could read.',
    'This report presents at least one entry as a bad debt or collection debt and prints that entry delinquency caption without a date, so the entry shows no date for when the delinquency began. That is a completeness question about what the report prints, not a legal conclusion.');
}

/* 12. A write-off the report's OWN legend defines, printed on an entry whose charge-off caption carries no date.
   The report says the debt was written off and gives the reader no charge-off date for it. */
function writeOffWithoutAChargeOffDate(records) {
  const relevant = (r) => Boolean(r) && r.status === 'RESOLVED'
    && captionPrintedWithoutValue(r, 'Charge Off Date')
    && codesMeaning(r, /write-?off/i).length > 0;
  if (!records.some(relevant)) return null;
  const matches = [];
  for (const r of records) {
    if (!relevant(r)) continue;
    const caption = printedCaption(r, 'Charge Off Date');
    matches.push(match(r, 'WRITE_OFF_PRINTED_WITHOUT_A_CHARGE_OFF_DATE', {
      charge_off_caption: { state: caption.state, reason: caption.reason || null, location: caption.location || null },
      write_off_codes: codeEvidence(codesMeaning(r, /write-?off/i))
    }));
  }
  return entry('COMMON-ERROR-WRITE-OFF-WITHOUT-A-CHARGE-OFF-DATE',
    'an entry that prints a write-off with no charge-off date',
    matches,
    'No entry that prints a write-off with an empty charge-off date was detected in the records we could read.',
    'This report prints a write-off in at least one entry and prints that entry charge-off caption without a date, so the entry shows no date for the write-off event. That is a completeness question about what the report prints, not a legal conclusion.');
}

/* 13. A closure the report's OWN legend defines, printed on an entry whose closed caption carries no date. Only
   the report's own printed meaning counts: `Closed at consumer's request` is a closure, and a code the report
   does not define is never treated as one. A printed product type of OPEN is never read as a lifecycle status. */
function closureStatedWithoutAClosedDate(records) {
  const relevant = (r) => Boolean(r) && r.status === 'RESOLVED'
    && captionPrintedWithoutValue(r, 'Closed Date')
    && codesMeaning(r, /closed|cancell?ed/i).length > 0;
  if (!records.some(relevant)) return null;
  const matches = [];
  for (const r of records) {
    if (!relevant(r)) continue;
    const caption = printedCaption(r, 'Closed Date');
    matches.push(match(r, 'CLOSURE_PRINTED_WITHOUT_A_CLOSED_DATE', {
      closed_caption: { state: caption.state, reason: caption.reason || null, location: caption.location || null },
      closure_codes: codeEvidence(codesMeaning(r, /closed|cancell?ed/i))
    }));
  }
  return entry('COMMON-ERROR-CLOSURE-STATED-WITHOUT-A-CLOSED-DATE',
    'an entry that states a closure or cancellation with no closed date',
    matches,
    'No entry that states a closure or cancellation with an empty closed date was detected in the records we could read.',
    'This report states a closure or cancellation in at least one entry and prints that entry closed caption without a date, so the entry shows no date for the closure. That is a completeness question about what the report prints, not a legal conclusion.');
}

function runCommonErrorChecks(context) {
  const extraction = context.extraction || null;
  /* BLOCKER-COMMON-ERRORS-001 runs on ANY presentation whose records carry the account/liability facts a check
     compares. A check whose required fields are absent returns no result on its own (see each function's
     `applicable` guard), so a presentation is never forced through a check it cannot supply. The general intake
     supplies the widest surface; the format-family readers supply the subset their own labels actually print. */
  const records = (extraction && Array.isArray(extraction.records)) ? extraction.records : [];
  if (!records.length) {
    return { performed: [], summary: { total: 0, potential_issue: 0, not_detected: 0 } };
  }
  const identity = extraction.identity_groups || null;
  const performed = [
    contradictoryAccountDates(records),
    accountStatusDateContradiction(records),
    balancePaymentConsistency(records),
    revolvingBalanceWithZeroLimit(records),
    paidOrSettledShownUnpaid(records),
    paymentOrDelinquencyDateConflict(records),
    collectionAndOriginalBothDue(records),
    paymentHistoryConsistency(records),
    responsibilityInconsistency(records),
    duplicateReporting(records),
    similarEntriesWorthReviewing(records),
    reportedDatesOutOfOrder(records),
    reaging.evaluate(extraction, context.prior_reports),
    identityDiscrepancy(identity),
    /* BLOCKER-REPORT-DATA-TO-ISSUE-001 (real-report repair): three factual COMPLETENESS checks over the entry's
       own printed material and the meanings the report itself prints for its codes. Each returns null when its
       evidence is absent, so a presentation that does not print this material is never forced through it. */
    adverseEntryWithoutADelinquencyAnchor(records),
    writeOffWithoutAChargeOffDate(records),
    closureStatedWithoutAClosedDate(records)
  ].filter(Boolean);
  return {
    performed,
    summary: {
      total: performed.length,
      potential_issue: performed.filter((c) => c.state === 'POTENTIAL_ISSUE').length,
      similar_entries_worth_reviewing: performed.filter((c) => c.state === 'SIMILAR_ENTRIES_WORTH_REVIEWING').length,
      not_detected: performed.filter((c) => c.state === 'NOT_DETECTED').length
    }
  };
}

module.exports = { CHECK_CLASS, runCommonErrorChecks, formatCapability, presentationCapability, PRESENTATION_FIELD_CAPABILITY, PRESENTATION_RETAINED_NOT_USABLE, USABLE_FIELD_PREDICATES, usableField, ISSUE_TYPE_FIELD_REQUIREMENTS, FACTUAL_CHECK_CAPABILITY, contradictoryAccountDates, accountStatusDateContradiction, balancePaymentConsistency, revolvingBalanceWithZeroLimit, paidOrSettledShownUnpaid, paymentOrDelinquencyDateConflict, collectionAndOriginalBothDue, paymentHistoryConsistency, responsibilityInconsistency, identityDiscrepancy, duplicateReporting, similarEntriesWorthReviewing, reportedDatesOutOfOrder, adverseAfterFirstReport, adverseEntryWithoutADelinquencyAnchor, writeOffWithoutAChargeOffDate, closureStatedWithoutAClosedDate };

