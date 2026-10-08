'use strict';
/**
 * stripe.cjs — a minimal, dependency-free Stripe client for this service.
 *
 * OWNER-ALL82-001 / B4-PAY-001. The owner authorized connecting the existing Stripe account for CAD billing.
 * This module talks to Stripe over the documented REST API and verifies webhooks with the documented
 * `Stripe-Signature` scheme, on Node built-ins only. No `stripe` SDK is required and none is introduced:
 * the legacy checkout reached the same conclusion ("... implemented on `node:crypto`, so no Stripe SDK is
 * required"), and this repository stays dependency-free.
 *
 * WHAT IT IS NOT: this module never reads a key file, never logs a key, never prints a request body that
 * contains a key, and never stores a credential. Every credential is supplied by the caller through the
 * environment for the lifetime of one process only.
 */

const https = require('node:https');
const http = require('node:http');
const crypto = require('node:crypto');

const DEFAULT_API_BASE = 'https://api.stripe.com';
/** Pin the API version so behaviour cannot drift when Stripe releases a new default. */
const STRIPE_API_VERSION = '2024-06-20';

/**
 * Flatten a nested object into Stripe's `key[subkey]` form encoding.
 *
 *   { line_items: [{ price: 'p', quantity: 1 }] }  ->  line_items[0][price]=p&line_items[0][quantity]=1
 *   { metadata: { plan_code: 'monthly' } }          ->  metadata[plan_code]=monthly
 */
function formEncode(input) {
  const parts = [];
  const walk = (prefix, value) => {
    if (value === null || value === undefined) return;
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i += 1) walk(`${prefix}[${i}]`, value[i]);
      return;
    }
    if (typeof value === 'object') {
      for (const key of Object.keys(value)) walk(prefix ? `${prefix}[${key}]` : key, value[key]);
      return;
    }
    parts.push(`${encodeURIComponent(prefix)}=${encodeURIComponent(String(value))}`);
  };
  walk('', input);
  return parts.join('&');
}

/**
 * Make one Stripe API call. Returns a promise of `{ status, json }`. Throws a descriptive Error on transport
 * failure or a non-JSON response. A Stripe error response is returned as `{ status, json }` so the caller can
 * classify it (the caller decides whether to fail open or closed — this client never hides an error).
 */
function request(options) {
  const opts = options || {};
  const method = opts.method || 'GET';
  const path = opts.path || '/';
  const secretKey = opts.secretKey;
  const base = opts.base || DEFAULT_API_BASE;
  const params = opts.params ? formEncode(opts.params) : null;
  const idempotencyKey = opts.idempotencyKey || null;

  let scheme = 'https:';
  let host = base;
  let port = 443;
  try {
    const parsed = new URL(base);
    scheme = parsed.protocol;
    host = parsed.hostname;
    port = parsed.port ? Number(parsed.port) : (scheme === 'http:' ? 80 : 443);
  } catch {
    /* A bare host is treated as HTTPS on the default port. */
  }
  const lib = scheme === 'http:' ? http : https;

  return new Promise((resolve, reject) => {
    const headers = {
      'User-Agent': 'crp-local-service/1.0 (node)',
      Accept: 'application/json',
      'Stripe-Version': STRIPE_API_VERSION
    };
    if (secretKey) headers.Authorization = `Bearer ${secretKey}`;
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
    if (params) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      headers['Content-Length'] = Buffer.byteLength(params);
    }

    const req = lib.request({
      host,
      port,
      path,
      method,
      headers,
      timeout: opts.timeoutMs || 20000
    }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let json = null;
        try {
          json = text ? JSON.parse(text) : {};
        } catch {
          json = { _raw: text };
        }
        resolve({ status: res.statusCode, json });
      });
    });
    req.on('timeout', () => req.destroy(new Error('STRIPE_REQUEST_TIMEOUT')));
    req.on('error', (err) => reject(err));
    if (params) req.write(params);
    req.end();
  });
}

/**
 * Verify a Stripe webhook signature.
 *
 * Stripe signs `{timestamp}.{rawBody}` with HMAC-SHA256 using the endpoint secret and sends the result in
 * `Stripe-Signature: t=<timestamp>,v1=<hex>`. The timestamp is checked for freshness so a captured event cannot
 * be replayed. A missing, malformed, stale or mismatched signature is a failure, never a pass.
 */
function verifyWebhookSignature(options) {
  const opts = options || {};
  const rawBody = typeof opts.rawBody === 'string' ? opts.rawBody : '';
  const secret = opts.secret;
  const toleranceSeconds = typeof opts.toleranceSeconds === 'number' ? opts.toleranceSeconds : 300;
  const headers = opts.headers || {};
  const header = typeof headers['stripe-signature'] === 'string'
    ? headers['stripe-signature']
    : (headers['Stripe-Signature'] || '');

  if (typeof secret !== 'string' || !secret) return { verified: false, reason: 'NO_WEBHOOK_SECRET_CONFIGURED' };
  if (!header) return { verified: false, reason: 'NO_STRIPE_SIGNATURE_HEADER' };

  let timestamp = null;
  let provided = null;
  for (const part of header.split(',')) {
    const at = part.indexOf('=');
    if (at === -1) continue;
    const key = part.slice(0, at).trim();
    const value = part.slice(at + 1).trim();
    if (key === 't') timestamp = value;
    else if (key === 'v1') provided = value;
  }
  if (!timestamp || !provided) return { verified: false, reason: 'MALFORMED_STRIPE_SIGNATURE_HEADER' };
  if (!/^\d{1,12}$/.test(timestamp)) return { verified: false, reason: 'MALFORMED_STRIPE_SIGNATURE_TIMESTAMP' };
  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (age > toleranceSeconds) return { verified: false, reason: 'STRIPE_SIGNATURE_TIMESTAMP_OUTSIDE_WINDOW' };

  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`, 'utf8').digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(provided, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { verified: false, reason: 'STRIPE_SIGNATURE_DOES_NOT_MATCH_BODY' };
  }
  let event = null;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return { verified: false, reason: 'SIGNED_BODY_IS_NOT_JSON' };
  }
  return { verified: true, reason: null, event, timestamp: Number(timestamp) };
}

/* ------------------------------------------------------------------ typed operations */

/** Retrieve the account the key belongs to. Used once, read-only, to record identity/mode. */
function retrieveAccount(secretKey, base) {
  return request({ method: 'GET', path: '/v1/account', secretKey, base });
}

/** Create a Checkout Session (one-time `payment` or recurring `subscription`). */
function createCheckoutSession(secretKey, params, base, idempotencyKey) {
  return request({ method: 'POST', path: '/v1/checkout/sessions', secretKey, params, base, idempotencyKey });
}

/** Retrieve a Checkout Session, expanding line items so the price can be resolved server-side. */
function retrieveSession(secretKey, sessionId, base) {
  const expand = encodeURIComponent('line_items');
  return request({ method: 'GET', path: `/v1/checkout/sessions/${sessionId}?expand[]=line_items`, secretKey, base });
}

/** Retrieve a Price so its currency, amount, cadence and mode can be verified server-side. */
function retrievePrice(secretKey, priceId, base) {
  return request({ method: 'GET', path: `/v1/prices/${priceId}`, secretKey, base });
}

/** Retrieve a Subscription so the real current-period boundary is used, not a 31/366-day approximation. */
function retrieveSubscription(secretKey, subscriptionId, base) {
  return request({ method: 'GET', path: `/v1/subscriptions/${subscriptionId}`, secretKey, base });
}

/** Stop renewal while retaining the subscription's current paid period. */
function cancelSubscriptionRenewal(secretKey, subscriptionId, base, idempotencyKey) {
  return request({ method: 'POST', path: `/v1/subscriptions/${subscriptionId}`, secretKey,
    params: { cancel_at_period_end: true }, base, idempotencyKey });
}

/** Retrieve a PaymentIntent (used to confirm an asynchronous payment actually succeeded). */
function retrievePaymentIntent(secretKey, paymentIntentId, base) {
  return request({ method: 'GET', path: `/v1/payment_intents/${paymentIntentId}`, secretKey, base });
}

/** Create a once-duration fixed-amount CAD coupon for the upgrade credit (test-mode provisioning only). */
function createCoupon(secretKey, params, base) {
  return request({ method: 'POST', path: '/v1/coupons', secretKey, params, base });
}

/** Create a Price under a Product (test-mode provisioning only). */
function createPrice(secretKey, params, base) {
  return request({ method: 'POST', path: '/v1/prices', secretKey, params, base });
}

/** Create a Product (test-mode provisioning only). */
function createProduct(secretKey, params, base) {
  return request({ method: 'POST', path: '/v1/products', secretKey, params, base });
}

module.exports = {
  STRIPE_API_VERSION,
  DEFAULT_API_BASE,
  formEncode,
  request,
  verifyWebhookSignature,
  retrieveAccount,
  createCheckoutSession,
  retrieveSession,
  retrievePrice,
  retrieveSubscription,
  cancelSubscriptionRenewal,
  retrievePaymentIntent,
  createCoupon,
  createPrice,
  createProduct
};
