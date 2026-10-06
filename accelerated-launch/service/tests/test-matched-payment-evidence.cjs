'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { CHECKS } = require('../release-check.cjs');
const paymentPath = path.resolve(__dirname, '../out/b5-chrome-payment-verification.json');
const downloadPath = path.resolve(__dirname, '../out/b5-paid-download-verification.json');
const payment = JSON.parse(fs.readFileSync(paymentPath, 'utf8'));
const download = JSON.parse(fs.readFileSync(downloadPath, 'utf8'));
const check = CHECKS.find(c => c.id === 'MATCHED_TEST_CHECKOUT_EVIDENCE');
const original = fs.readFileSync;
function verdict(p, d) {
  // Replace reads in memory only. No evidence artifact is mutated by a negative test.
  fs.readFileSync = function(file, ...args) {
    if (path.resolve(String(file)) === paymentPath) return JSON.stringify(p);
    if (path.resolve(String(file)) === downloadPath) return JSON.stringify(d);
    return original.call(fs, file, ...args);
  };
  try { return check.run().passed; } finally { fs.readFileSync = original; }
}
assert.equal(verdict(payment, download), true);
assert.equal(verdict(payment, { ...download, download_status: 409 }), false);
assert.equal(verdict(payment, { ...download, unpurchased_case_status: 200 }), false);
assert.equal(verdict(payment, { ...download, checks_performed: 0 }), false);
assert.equal(verdict(payment, { ...download, content_sha256: null }), false);
assert.equal(verdict(null, download), false);
assert.equal(verdict(payment, null), false);
for (const [field, value] of [['payment_status','unpaid'], ['livemode',true], ['currency','usd'], ['session_id','cs_live_foreign']]) {
  const changed = structuredClone(payment);
  changed.sessions[0][field] = value;
  assert.equal(verdict(changed, download), false);
}
const wrongInvoice = structuredClone(payment);
wrongInvoice.sessions.find(s => s.amount_total === 200).invoice.amount_paid = 795;
assert.equal(verdict(wrongInvoice, download), false);
const duplicated = structuredClone(payment);
duplicated.sessions[1].session_id = duplicated.sessions[0].session_id;
assert.equal(verdict(duplicated, download), false);
console.log('PASS: matched payment evidence accepts verified payments/download and refuses 12 invalid variants; no files modified.');
