'use strict';
/**
 * cn-au-us-ingestion.cjs — BATCH-23: the two remaining ingestion tasks, on the REAL specimens through the
 * production PDF extraction path (`formats.buildPdfDocumentModel` + `extractWithSharedAdapter`).
 * AU: the printed `Account Number` is the BUREAU'S OWN LISTING REFERENCE — a reference, never a masked account
 * identifier and never a key to the creditor account, so it opens no matching path; the overdue `Amount` is
 * parsed only where a record prints one. US: the RECORDED consumer specimen (PUB-001) is exercised; the earlier
 * generic, fact-free result came from a different file (an investigation artifact) — the wrong specimen, not a
 * routing or reader defect. Real-file evidence only; no synthetic or structural input.
 */
const fs = require('node:fs');
const path = require('node:path');
const formats = require('../../formats.cjs');
const commonErrors = require('../../common-errors.cjs');
const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const B = path.join(ROOT, 'SOURCE_CAPTURES', 'REPORT_FORMAT_BASELINE_2026-09-30');
function read(file, country) { return formats.extractWithSharedAdapter(formats.buildPdfDocumentModel(file), { mode: 'REPORT', country }); }
function of(ext, kind) { return (ext.records || []).filter((r) => r.kind === kind); }

async function run(service, check) {
  const evidence = {};
  const AU = path.join(B, 'PUB-012.pdf');
  check.ok(fs.existsSync(AU), 'the captured Equifax Australia sample PUB-012 is present');
  const au = read(AU, 'AU');
  check.equal(au.presentation_id, 'FAM-AU-EQX-CONSUMER', 'read by the AU family through the production path');
  const overdue = of(au, 'OVERDUE_ACCOUNT');
  const liabilities = of(au, 'CONSUMER_CREDIT_LIABILITY');
  check.equal(overdue.length, 2, 'its two overdue entries are read');
  check.ok(overdue.every((r) => typeof r.facts['overdue.accountReference'] === 'string' && r.facts['overdue.accountReference'] === r.facts['overdue.accountReferenceRaw']),
    'each overdue entry carries its OWN printed listing reference with the raw value');
  check.ok(overdue.every((r) => r.facts['overdue.originalListingDate']), 'keeping its own original listing date beside it');
  check.deepEqual(liabilities.map((r) => r.facts['liability.accountReference']), ['EPB0075', 'EPB1234', 'EPB1234'],
    'and each liability entry carries the reference its own entry prints');
  check.equal(au.records.some((r) => r.facts && r.facts['account.masked_identifier'] !== undefined), false,
    'with NO masked account identifier invented from a bureau listing reference');
  check.ok(overdue.every((r) => r.facts['overdue.amount'] === undefined),
    'and no overdue amount invented: this specimen prints none on its overdue entries');
  const auCap = commonErrors.presentationCapability('FAM-AU-EQX-CONSUMER');
  check.equal(auCap.checks['COMMON-ERROR-DUPLICATE-REPORTING'], false, 'so the confident duplicate path stays closed');
  check.equal(auCap.checks['COMMON-ERROR-ACCOUNT-DATES-CONTRADICTORY'], true, 'while the dates check stays the enabled one');

  const US = path.join(B, 'PUB-001.pdf');
  check.ok(fs.existsSync(US), 'the recorded US consumer sample PUB-001 is present');
  const us = read(US, 'US');
  check.equal(us.presentation_id, 'US-CONSUMER-DISCLOSURE', 'and is read as the US consumer disclosure, not the generic intake');
  check.equal(us.admission.state, 'ADMITTED_FAMILY_STRUCTURE', 'on an admitted family structure');
  const accounts = of(us, 'REPORTED_ACCOUNT');
  check.equal(accounts.length, 3, 'its three reported accounts are read');
  check.equal(of(us, 'CREDIT_INQUIRY').length, 1, 'with its inquiry');
  check.ok(accounts.every((r) => r.facts['reportedAccount.status']), 'each carrying its printed status');
  check.ok(accounts.some((r) => typeof r.facts['account.balance'] === 'number'), 'its printed balance');
  check.ok(accounts.some((r) => typeof r.facts['account.pastDueAmount'] === 'number'), 'its printed past-due amount');
  check.ok(accounts.some((r) => typeof r.facts['account.paymentAmount'] === 'number'), 'and its printed payment amount');
  check.equal(commonErrors.formatCapability(us).checks['COMMON-ERROR-BALANCE-PAYMENT-INCONSISTENCY'].supported, true,
    'so the balance/payment check is supported by THIS report own facts');
  const wrong = read(path.join(ROOT, 'SOURCE_CAPTURES', 'EXPERIAN_US_CONSUMER_FORMAT_INVESTIGATION', 'EXP-006.pdf'), 'US');
  check.equal(wrong.presentation_id, 'GENERAL-BUREAU-REPORT', 'the earlier examined file routes to the generic presentation');
  check.equal(wrong.records.filter((r) => r.facts && Object.keys(r.facts).length).length, 0,
    'and yields no facts, which is why it raised nothing: the wrong specimen');
  check.equal(commonErrors.formatCapability(wrong).checks['COMMON-ERROR-BALANCE-PAYMENT-INCONSISTENCY'].supported, false,
    'and the PER-REPORT capability refuses the check whose facts are absent, so nothing is advertised that did not run');

  evidence.au = 'PUB-012: recovered overdue/liability listing references with raw values; no masked identifier and no amount invented; only the dates check enabled';
  evidence.us = 'PUB-001: US-CONSUMER-DISCLOSURE, 3 accounts + 1 inquiry with status/balance/past-due/payment facts; EXP-006 is the wrong specimen';
  return evidence;
}

module.exports = { run, id: 'cn-au-us-ingestion', title: 'BATCH-23: AU listing reference and the recorded US consumer specimen through the production extraction path' };
