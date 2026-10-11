'use strict';

const assert = require('node:assert/strict');
const { SERVICES, sha256, priceQuote, chooseLowestQuote, prepareOrder, handoff } = require('./index.cjs');

const now = new Date('2026-10-09T16:00:00.000Z');
const pdf = Buffer.from('%PDF-1.7\n% synthetic packet only\n');
const address = { name: 'Sample Consumer', line1: '1 Example Street', city: 'Sampletown', region: 'NS', postal_code: 'B0A 1A0', country: 'CA' };
const providerQuote = {
  country: 'CA', service: 'CA_REGISTERED', currency: 'CAD', provider: 'example_provider',
  provider_quote_id: 'quote_123', packet_sha256: sha256(pdf), page_count: 3,
  provider_total_minor: 2501, expires_at: '2026-10-09T17:00:00.000Z'
};
const quote = priceQuote(providerQuote, () => true, now);
assert.equal(quote.consumer_subtotal_minor, 3752);
assert.equal(quote.markup_minor, 1251);
assert.equal(quote.consumer_tax_minor, null);
assert.deepEqual(Object.keys(SERVICES), ['US', 'CA', 'GB', 'AU']);
assert.throws(() => priceQuote({ ...providerQuote, service: 'US_CERTIFIED' }, () => true, now), { code: 'UNSUPPORTED_POSTAL_SERVICE' });
assert.throws(() => priceQuote(providerQuote, () => false, now), { code: 'PROVIDER_QUOTE_UNVERIFIED' });
assert.throws(() => priceQuote(providerQuote, () => true, new Date('2026-10-09T17:00:00.000Z')), { code: 'QUOTE_EXPIRED' });
assert.equal(chooseLowestQuote([providerQuote, { ...providerQuote, provider: 'less_expensive', provider_quote_id: 'quote_456', provider_total_minor: 2400 }], () => true, now).provider, 'less_expensive');
assert.throws(() => chooseLowestQuote([providerQuote, { ...providerQuote, service: 'CA_LETTERMAIL' }], () => true, now), { code: 'INCOMPARABLE_QUOTES' });

// The approval fingerprint must cover the exact destination. The test uses an independent
// serialization of this deliberately ordered address, matching the module's canonical order.
const destination_fingerprint = sha256(Buffer.from(JSON.stringify({ city: address.city, country: address.country,
  line1: address.line1, name: address.name, postal_code: address.postal_code, region: address.region })));
const base = {
  account_id: 'account_1', case_id: 'case_1', packet_id: 'packet_1', packet_pdf: pdf,
  packet_status: 'CONSUMER_APPROVED', packet_page_count: 3, quote, destination: address,
  approval: { account_id: 'account_1', case_id: 'case_1', packet_id: 'packet_1',
    packet_sha256: quote.packet_sha256, service: quote.service, provider_quote_id: quote.provider_quote_id,
    currency: quote.currency, total_minor: 3752, destination_fingerprint,
    approved_at: '2026-10-09T15:00:00.000Z' },
  payment: { account_id: 'account_1', case_id: 'case_1', quote_id: 'quote_123', currency: 'CAD',
    amount_minor: 3752, verified_reference: 'payment_1' }
};
const verifiers = { packet: () => true, quote: () => true, approval: () => true, payment: () => true };
const order = prepareOrder(base, verifiers, now);
assert.equal(order.status, 'READY_FOR_PROVIDER_HANDOFF');
assert.equal(order.idempotency_key, prepareOrder(base, verifiers, now).idempotency_key);
assert.throws(() => prepareOrder({ ...base, packet_pdf: Buffer.from('%PDF-changed') }, verifiers, now), { code: 'PACKET_QUOTE_MISMATCH' });
assert.throws(() => prepareOrder({ ...base, destination: { ...address, line1: '2 Example Street' } }, verifiers, now), { code: 'MAILING_APPROVAL_REQUIRED' });
assert.throws(() => prepareOrder({ ...base, payment: { ...base.payment, amount_minor: 3751 } }, verifiers, now), { code: 'VERIFIED_PAYMENT_REQUIRED' });
assert.throws(() => prepareOrder({ ...base, quote: { ...quote, consumer_subtotal_minor: 1 } }, verifiers, now), { code: 'PROVIDER_QUOTE_UNVERIFIED' });
assert.throws(() => prepareOrder({ ...base, approval: { ...base.approval, total_minor: 5000 } }, verifiers, now), { code: 'VERIFIED_PAYMENT_REQUIRED' });
assert.throws(() => prepareOrder(base, { ...verifiers, payment: () => false }, now), { code: 'PAYMENT_UNVERIFIED' });
assert.throws(() => prepareOrder({ ...base, packet_status: 'DRAFT' }, verifiers, now), { code: 'PACKET_NOT_APPROVED' });

(async () => {
  await assert.rejects(handoff(order, pdf, null, () => true, now), { code: 'PROVIDER_NOT_CONFIGURED' });
  await assert.rejects(handoff(order, pdf, { provider: 'example_provider', submit: () => ({ provider_job_id: 'job_1' }) }, () => false, now), { code: 'ORDER_STATE_UNVERIFIED' });
  let calls = 0;
  const result = await handoff(order, pdf, { provider: 'example_provider', submit: request => {
    calls++;
    assert.equal(request.idempotency_key, order.idempotency_key);
    assert.equal(request.service, 'CA_REGISTERED');
    assert.equal(request.pdf, pdf);
    return { provider_job_id: 'job_1' };
  } }, () => true, now);
  assert.equal(calls, 1);
  assert.equal(result.status, 'SUBMITTED_TO_PROVIDER');
  console.log('postal-fulfillment: PASS');
})().catch(error => { console.error(error); process.exitCode = 1; });
