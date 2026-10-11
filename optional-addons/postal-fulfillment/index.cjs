'use strict';

const { createHash } = require('node:crypto');

// Postal product names differ by country. Never substitute one country's proof service for another.
const SERVICES = Object.freeze({
  US: Object.freeze(['US_FIRST_CLASS', 'US_CERTIFIED', 'US_CERTIFIED_RETURN_RECEIPT']),
  CA: Object.freeze(['CA_LETTERMAIL', 'CA_REGISTERED']),
  GB: Object.freeze(['GB_FIRST_CLASS', 'GB_FIRST_CLASS_SIGNED_FOR']),
  AU: Object.freeze(['AU_REGULAR', 'AU_REGISTERED'])
});
const CURRENCIES = Object.freeze({ US: 'USD', CA: 'CAD', GB: 'GBP', AU: 'AUD' });
const SHA256 = /^[a-f0-9]{64}$/;
const ID = /^[a-zA-Z0-9_-]{1,128}$/;

class MailAddonError extends Error {
  constructor(code) {
    super(code);
    this.name = 'MailAddonError';
    this.code = code;
  }
}
function requireThat(condition, code) {
  if (!condition) throw new MailAddonError(code);
}
function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
function integer(value, min, max) {
  return Number.isSafeInteger(value) && value >= min && value <= max;
}
function isoDate(value) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}
function text(value, max = 160) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max && !/[\x00-\x1f\x7f]/.test(value);
}
function validateAddress(address, country) {
  requireThat(address && typeof address === 'object' && !Array.isArray(address), 'ADDRESS_REQUIRED');
  requireThat(address.country === country, 'DESTINATION_COUNTRY_MISMATCH');
  for (const key of ['name', 'line1', 'city', 'postal_code']) requireThat(text(address[key]), 'ADDRESS_REQUIRED');
  for (const key of ['line2', 'region']) if (address[key] != null) requireThat(text(address[key]), 'INVALID_ADDRESS');
  return Object.freeze(Object.fromEntries(['name', 'line1', 'line2', 'city', 'region', 'postal_code', 'country']
    .filter(key => address[key] != null).map(key => [key, address[key].trim()])));
}

// A provider quote must be complete: print, envelope, postage, surcharges and provider taxes.
// CRP's 50% markup is rounded up to the next smallest currency unit. Consumer tax is separate.
function priceQuote(input, verifyProviderQuote, now = new Date()) {
  requireThat(input && typeof input === 'object', 'QUOTE_REQUIRED');
  requireThat(typeof verifyProviderQuote === 'function' && verifyProviderQuote(input) === true, 'PROVIDER_QUOTE_UNVERIFIED');
  const { country, service, currency, provider, provider_quote_id, packet_sha256, page_count, provider_total_minor, expires_at } = input;
  requireThat(SERVICES[country]?.includes(service), 'UNSUPPORTED_POSTAL_SERVICE');
  requireThat(currency === CURRENCIES[country], 'CURRENCY_MISMATCH');
  requireThat(text(provider, 80) && ID.test(provider) && text(provider_quote_id, 128) && ID.test(provider_quote_id), 'PROVIDER_QUOTE_REQUIRED');
  requireThat(SHA256.test(packet_sha256 || '') && integer(page_count, 1, 400), 'PACKET_QUOTE_MISMATCH');
  requireThat(integer(provider_total_minor, 1, 1_000_000), 'INVALID_PROVIDER_PRICE');
  requireThat(isoDate(expires_at) && Date.parse(expires_at) > now.getTime(), 'QUOTE_EXPIRED');
  const consumer_subtotal_minor = Math.ceil(provider_total_minor * 1.5);
  return Object.freeze({ country, service, currency, provider, provider_quote_id, packet_sha256, page_count,
    provider_total_minor, markup_minor: consumer_subtotal_minor - provider_total_minor,
    consumer_subtotal_minor, expires_at, consumer_tax_minor: null });
}

function chooseLowestQuote(inputs, verifyProviderQuote, now = new Date()) {
  requireThat(Array.isArray(inputs) && inputs.length > 0 && inputs.length <= 20, 'QUOTE_SET_REQUIRED');
  const quotes = inputs.map(input => priceQuote(input, verifyProviderQuote, now));
  const first = quotes[0];
  requireThat(quotes.every(quote => quote.country === first.country && quote.service === first.service && quote.currency === first.currency && quote.packet_sha256 === first.packet_sha256 && quote.page_count === first.page_count), 'INCOMPARABLE_QUOTES');
  return quotes.sort((a, b) => a.provider_total_minor - b.provider_total_minor || a.provider.localeCompare(b.provider))[0];
}

function prepareOrder(input, verifiers, now = new Date()) {
  requireThat(input && typeof input === 'object', 'ORDER_REQUIRED');
  requireThat(verifiers && ['packet', 'quote', 'approval', 'payment'].every(key => typeof verifiers[key] === 'function'), 'SERVER_VERIFIERS_REQUIRED');
  const { account_id, case_id, packet_id, packet_pdf, packet_status, packet_page_count, quote, destination, approval, payment } = input;
  requireThat([account_id, case_id, packet_id].every(value => text(value, 128) && ID.test(value)), 'INVALID_ORDER_ID');
  requireThat(Buffer.isBuffer(packet_pdf) && packet_pdf.length > 0 && packet_pdf.length <= 64 * 1024 * 1024 && packet_pdf.subarray(0, 5).toString() === '%PDF-', 'REVIEWED_PDF_REQUIRED');
  requireThat(packet_status === 'CONSUMER_APPROVED', 'PACKET_NOT_APPROVED');
  requireThat(verifiers.packet(input) === true, 'PACKET_OWNERSHIP_UNVERIFIED');
  requireThat(quote && SHA256.test(quote.packet_sha256 || '') && sha256(packet_pdf) === quote.packet_sha256 && packet_page_count === quote.page_count, 'PACKET_QUOTE_MISMATCH');
  requireThat(SERVICES[quote.country]?.includes(quote.service) && quote.currency === CURRENCIES[quote.country] && Date.parse(quote.expires_at) > now.getTime(), 'QUOTE_EXPIRED');
  requireThat(integer(quote.provider_total_minor, 1, 1_000_000) && quote.consumer_subtotal_minor === Math.ceil(quote.provider_total_minor * 1.5) && quote.markup_minor === quote.consumer_subtotal_minor - quote.provider_total_minor && verifiers.quote(input) === true, 'PROVIDER_QUOTE_UNVERIFIED');
  const address = validateAddress(destination, quote.country);
  requireThat(approval?.account_id === account_id && approval?.case_id === case_id && approval?.packet_id === packet_id && approval?.packet_sha256 === quote.packet_sha256 && approval?.service === quote.service && approval?.provider_quote_id === quote.provider_quote_id && approval?.currency === quote.currency && integer(approval?.total_minor, quote.consumer_subtotal_minor, 2_000_000) && approval?.destination_fingerprint === sha256(Buffer.from(canonical(address))) && isoDate(approval?.approved_at) && Date.parse(approval.approved_at) <= now.getTime(), 'MAILING_APPROVAL_REQUIRED');
  requireThat(verifiers.approval(input) === true, 'MAILING_APPROVAL_UNVERIFIED');
  requireThat(payment?.account_id === account_id && payment?.case_id === case_id && payment?.quote_id === quote.provider_quote_id && payment?.currency === quote.currency && payment?.amount_minor === approval.total_minor && text(payment?.verified_reference, 128), 'VERIFIED_PAYMENT_REQUIRED');
  requireThat(verifiers.payment(input) === true, 'PAYMENT_UNVERIFIED');
  const idempotency_key = sha256(Buffer.from(canonical({ account_id, case_id, packet_id, packet_sha256: quote.packet_sha256, provider: quote.provider, provider_quote_id: quote.provider_quote_id, service: quote.service, address })));
  return Object.freeze({ account_id, case_id, packet_id, quote, destination: address, approved_at: approval.approved_at,
    verified_payment_reference: payment.verified_reference, idempotency_key, status: 'READY_FOR_PROVIDER_HANDOFF' });
}

// There is deliberately no network client here. The later integration must inject a vetted provider
// adapter and call this only after CRP has rechecked ownership, approval and verified payment.
async function handoff(order, packetPdf, adapter, verifyCurrentOrder, now = new Date()) {
  requireThat(order?.status === 'READY_FOR_PROVIDER_HANDOFF', 'ORDER_NOT_READY');
  requireThat(typeof verifyCurrentOrder === 'function' && await verifyCurrentOrder(order) === true, 'ORDER_STATE_UNVERIFIED');
  requireThat(adapter && adapter.provider === order.quote.provider && typeof adapter.submit === 'function', 'PROVIDER_NOT_CONFIGURED');
  requireThat(Date.parse(order.quote.expires_at) > now.getTime(), 'QUOTE_EXPIRED');
  requireThat(Buffer.isBuffer(packetPdf) && sha256(packetPdf) === order.quote.packet_sha256, 'PACKET_CHANGED');
  const result = await adapter.submit(Object.freeze({
    provider_quote_id: order.quote.provider_quote_id,
    idempotency_key: order.idempotency_key,
    service: order.quote.service,
    destination: order.destination,
    pdf: packetPdf
  }));
  requireThat(result && text(result.provider_job_id, 128) && ID.test(result.provider_job_id), 'PROVIDER_HANDOFF_UNCONFIRMED');
  return Object.freeze({ status: 'SUBMITTED_TO_PROVIDER', provider: adapter.provider,
    provider_job_id: result.provider_job_id, idempotency_key: order.idempotency_key,
    submitted_at: now.toISOString() });
}

module.exports = { SERVICES, CURRENCIES, MailAddonError, sha256, validateAddress, priceQuote, chooseLowestQuote, prepareOrder, handoff };
