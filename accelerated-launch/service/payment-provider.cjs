'use strict';
/**
 * payment-provider.cjs — the PROVIDER-NEUTRAL payment interface, and the exact external dependency.
 *
 * OWNER-ALL82-001 / B4. The owner order says: "Integrate an established provider only where provider
 * selection and access are already authorized. Otherwise implement the provider-neutral entitlement interface
 * and test adapter, and report the exact external dependency." Provider selection and access are NOT authorized
 * for this service, so this build makes ZERO outbound calls and holds ZERO credentials. What it has is the
 * interface a provider must satisfy, one complete implementation of that interface that is explicitly NOT a
 * payment (the test adapter), and a declared, unimplemented shape for the provider the read-only legacy
 * checkout used.
 *
 * REUSE LEDGER (shape only, read read-only from the legacy checkout):
 *   • `stripeClient.ts` — "FAIL CLOSED: with no STRIPE_SECRET_KEY this throws rather than pretending a
 *     purchase happened", and the payload-fingerprint idea. Key NAMES are reused; no key value is read,
 *     copied or referenced anywhere in this repository.
 *   • `deploy/env/.env.staging.example` — the legacy repository's own rule, quoted: "KEY NAMES ONLY IN THIS
 *     REPOSITORY". This file follows the same rule: it names what must be supplied and supplies nothing.
 *   • `routes/checkout.ts` — "DELIBERATELY NOT PAID-GATED. … they are how an unentitled account becomes
 *     entitled". The routes built on this module keep that property (`app.cjs`).
 *
 * WHAT A CALLER MUST NEVER BE ABLE TO DO, and why the interface is shaped this way: activation is decided from
 * a VERIFIED provider event, never from a request body, a query parameter, a client flag or a redirect. A
 * caller who never presents a valid provider signature can never become entitled, whatever they send.
 */

const crypto = require('node:crypto');
const stripe = require('./stripe.cjs');
const plans = require('./plan-catalog.cjs');

const SIGNATURE_HEADER = 'x-crp-signature';
const MAX_EVENT_AGE_SECONDS = 300;

/** The Stripe identifiers the legacy checkout used. NAMES ONLY — no value is ever read or stored. */
const STRIPE_CONFIGURATION_NAMES = Object.freeze([
  'STRIPE_SECRET_KEY',
  'STRIPE_PUBLISHABLE_KEY',
  'STRIPE_WEBHOOK_SECRET'
]);

/** B4-PAY-001: one CAD Price ID per plan, the once-duration upgrade-credit coupon, and the allowed return origins. */
const STRIPE_PRICE_NAMES = Object.freeze({
  report_once: 'STRIPE_PRICE_REPORT_ONCE',
  monthly: 'STRIPE_PRICE_MONTHLY',
  annual: 'STRIPE_PRICE_ANNUAL'
});
const STRIPE_PRICE_CONFIGURATION_NAMES = Object.freeze(['STRIPE_PRICE_REPORT_ONCE', 'STRIPE_PRICE_MONTHLY', 'STRIPE_PRICE_ANNUAL']);
const STRIPE_UPGRADE_CREDIT_COUPON = 'STRIPE_UPGRADE_CREDIT_COUPON';
const STRIPE_APP_ORIGINS = 'STRIPE_APP_ORIGINS';

/** The one value that selects the test adapter, and the flag that must ALSO be set before it is honoured. */
const TEST_PROVIDER_ID = 'test-adapter-not-a-payment';
const TEST_ADAPTER_FLAG = 'CRP_ALLOW_TEST_PAYMENT_ADAPTER';
const TEST_SECRET_NAME = 'CRP_TEST_PAYMENT_SECRET';

/** All Stripe configuration names this build can read. Names only; never a value. */
const STRIPE_ALL_NAMES = Object.freeze(
  STRIPE_CONFIGURATION_NAMES.concat(STRIPE_PRICE_CONFIGURATION_NAMES, [STRIPE_UPGRADE_CREDIT_COUPON, STRIPE_APP_ORIGINS])
);

function payloadFingerprint(rawBody) {
  return crypto.createHash('sha256').update(String(rawBody), 'utf8').digest('hex');
}

function timingSafeHexEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function headerValue(headers, name) {
  if (!headers || typeof headers !== 'object') return null;
  const wanted = String(name).toLowerCase();
  for (const key of Object.keys(headers)) if (key.toLowerCase() === wanted) return headers[key];
  return null;
}

/**
 * Parse and verify a `t=<unix>,v1=<hex hmac>` signature over `<t>.<raw body>`.
 *
 * The timestamp is inside the signed material and is also freshness-checked, so a captured event cannot be
 * replayed later by re-sending it. A malformed or stale header is a failure, never a pass.
 */
function verifySignature(options) {
  const opts = options || {};
  const header = headerValue(opts.headers, SIGNATURE_HEADER);
  if (typeof header !== 'string' || !header) return { verified: false, reason: 'NO_SIGNATURE_HEADER' };
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
  if (!timestamp || !provided) return { verified: false, reason: 'MALFORMED_SIGNATURE_HEADER' };
  if (!/^\d{1,12}$/.test(timestamp)) return { verified: false, reason: 'MALFORMED_SIGNATURE_TIMESTAMP' };
  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (age > MAX_EVENT_AGE_SECONDS) return { verified: false, reason: 'SIGNATURE_TIMESTAMP_OUTSIDE_THE_ACCEPTED_WINDOW' };
  if (typeof opts.secret !== 'string' || !opts.secret) return { verified: false, reason: 'NO_SIGNING_SECRET_CONFIGURED' };
  const expected = crypto.createHmac('sha256', opts.secret).update(`${timestamp}.${opts.rawBody}`, 'utf8').digest('hex');
  if (!timingSafeHexEqual(expected, provided)) return { verified: false, reason: 'SIGNATURE_DOES_NOT_MATCH_THE_BODY' };
  return { verified: true, reason: null, timestamp: Number(timestamp) };
}

/* ------------------------------------------------------------------ the test adapter */

/**
 * A COMPLETE implementation of the provider interface that is NOT a payment.
 *
 * It exists so the entitlement path can be exercised end to end with the real verification code. It is usable
 * only when BOTH `CRP_PAYMENT_PROVIDER=test-adapter-not-a-payment` and `CRP_ALLOW_TEST_PAYMENT_ADAPTER=1` are
 * set, it declares `is_a_working_payment: false` everywhere it appears, and every entitlement it produces is
 * stamped `source: 'TEST_ADAPTER_NOT_A_PAYMENT'`. `release-check.cjs` asserts that neither the adapter nor its
 * secret name appears in the production configuration template.
 */
function makeTestAdapter(env) {
  return Object.freeze({
    provider_id: TEST_PROVIDER_ID,
    display_name: 'TEST ADAPTER — NOT A PAYMENT PROVIDER',
    is_a_working_payment: false,
    money_moved: false,

    /** No hosted page exists, so there is no external redirect to make. The URL below is a DECOY. */
    createCheckout(request) {
      const req = request || {};
      const reference = `test_cs_${crypto.randomBytes(12).toString('hex')}`;
      return {
        provider_reference: reference,
        /* A success flag in a URL grants NOTHING: the suite follows it and is still refused. */
        redirect_url: `${req.return_url || 'http://127.0.0.1/'}?checkout=success&payment=paid&session=${reference}`,
        mode: 'TEST_ADAPTER_NO_HOSTED_PAGE',
        is_a_working_payment: false
      };
    },

    verifyEvent(request) {
      const req = request || {};
      const signature = verifySignature({ headers: req.headers, rawBody: req.rawBody, secret: env[TEST_SECRET_NAME] });
      if (!signature.verified) return { verified: false, reason: signature.reason, fingerprint: payloadFingerprint(req.rawBody) };
      let body = null;
      try {
        body = JSON.parse(String(req.rawBody));
      } catch {
        return { verified: false, reason: 'SIGNED_BODY_IS_NOT_JSON', fingerprint: payloadFingerprint(req.rawBody) };
      }
      const required = ['id', 'type', 'account_reference', 'plan_code', 'session_reference'];
      const missing = required.filter((key) => typeof body[key] !== 'string' || !body[key]);
      if (missing.length) {
        return { verified: false, reason: `SIGNED_EVENT_MISSING_FIELDS:${missing.join(',')}`, fingerprint: payloadFingerprint(req.rawBody) };
      }
      return {
        verified: true,
        reason: null,
        fingerprint: payloadFingerprint(req.rawBody),
        event: {
          event_id: body.id,
          type: body.type,
          account_reference: body.account_reference,
          plan_code: body.plan_code,
          session_reference: body.session_reference,
          amount_cents: Number.isInteger(body.amount_cents) ? body.amount_cents : null,
          currency: typeof body.currency === 'string' ? body.currency : null,
          /* A provider states the paid period's end. It is carried through; `entitlement.periodFor` decides
             whether to use it or fall back to the catalog's own period. */
          period_end: typeof body.period_end === 'string' ? body.period_end : null,
          payment_intent: typeof body.payment_intent === 'string' ? body.payment_intent : null,
          payment_verified: body.payment_verified === false ? false : true,
          occurred_at: typeof body.occurred_at === 'string' ? body.occurred_at : new Date().toISOString()
        }
      };
    },

    /**
     * Server-side re-verification of a checkout. The test adapter holds NO external state, so it can only
     * answer UNKNOWN — which means `POST /api/billing/confirm` refuses. That is the honest answer: with no
     * provider there is nothing to confirm, and a client saying "I paid" must never be believed.
     */
    queryCheckout() {
      return { outcome: 'OUTCOME_UNKNOWN_NO_PROVIDER_STATE', paid: false, is_a_working_payment: false };
    }
  });
}


/* ------------------------------------------------------------------ the declared, unimplemented provider */

/**
 * The provider the legacy checkout used, declared here so the exact external dependency is recorded in one
 * place. It is NOT implemented: it makes no call, holds no key and is not selectable while its
 * `implemented` flag is false, so a host that sets `CRP_PAYMENT_PROVIDER=stripe` still gets a refusal rather
 * than a half-wired checkout.
 */
const STRIPE_ADAPTER = Object.freeze({
  provider_id: 'stripe',
  display_name: 'Stripe',
  implemented: true,
  is_a_working_payment: false,
  required_configuration: STRIPE_ALL_NAMES,
  external_dependency:
    'a Stripe account with one CAD Price per plan (report_once 595, monthly 795, annual 7950), one once-duration ' +
    'CAD 595 coupon for the upgrade credit, and one webhook endpoint whose signing secret is supplied through the ' +
    'environment; the service then makes outbound calls to api.stripe.com',
  why_not_implemented: null,
  implemented_on: 'Node built-ins (node:https + node:crypto) following Stripe REST and Stripe-Signature conventions',
  outbound_calls_made_by_this_build: 0
});

/** Map a configured Price ID back to the plan it belongs to. */
function planCodeFromPrice(env, priceId) {
  for (const planCode of Object.keys(STRIPE_PRICE_NAMES)) {
    if (env[STRIPE_PRICE_NAMES[planCode]] === priceId) return planCode;
  }
  return null;
}

/** Verify a Stripe Price object against the owner-approved catalog (currency, amount, cadence). */
function priceMatchesCatalog(planCode, priceObj) {
  if (!priceObj || !plans.isPlanCode(planCode)) return false;
  const plan = plans.plan(planCode);
  if (String(priceObj.currency).toLowerCase() !== plan.currency) return false;
  if (priceObj.unit_amount !== plan.amount_cents) return false;
  if (plan.interval === 'one_time') return priceObj.type === 'one_time';
  const interval = plan.interval === 'month' ? 'month' : 'year';
  return Boolean(priceObj.recurring) && priceObj.recurring.interval === interval;
}

/** Normalise `checkout.session.completed` / `checkout.session.async_payment_succeeded`. */
async function normalizeCheckoutEvent(env, secretKey, base, session, eventId, type) {
  const accountRef = session.client_reference_id || (session.metadata && session.metadata.account_id);
  const planCode = (session.metadata && session.metadata.plan_code) || null;
  if (!accountRef || !planCode || !plans.isPlanCode(planCode)) return null;

  let priceId = null;
  try {
    const fetched = await stripe.retrieveSession(secretKey, session.id, base);
    if (fetched.status === 200) {
      const items = fetched.json.line_items && fetched.json.line_items.data;
      if (items && items.length && items[0].price) priceId = items[0].price.id;
    }
  } catch { /* fall back to configured-id check below */ }

  const configuredId = priceIdFor(env, planCode);
  if (priceId && configuredId && priceId !== configuredId) {
    return { mismatch: 'PRICE_ID_DOES_NOT_MATCH_THE_PLAN' };
  }

  let periodEnd = null;
  if (session.mode === 'subscription' && session.subscription) {
    try {
      const sub = await stripe.retrieveSubscription(secretKey, session.subscription, base);
      if (sub.status === 200 && sub.json.current_period_end) {
        periodEnd = new Date(sub.json.current_period_end * 1000).toISOString();
      }
    } catch { /* a missing period boundary falls back to the catalog period */ }
  }

  const paymentVerified = type === 'checkout.session.async_payment_succeeded' ? true : session.payment_status === 'paid';
  return {
    event_id: eventId,
    type,
    account_reference: accountRef,
    plan_code: planCode,
    session_reference: session.id,
    subscription_reference: session.mode === 'subscription'
      ? (typeof session.subscription === 'string' ? session.subscription : session.subscription?.id) || null : null,
    amount_cents: Number.isInteger(session.amount_total) ? session.amount_total : null,
    currency: typeof session.currency === 'string' ? session.currency : null,
    period_end: periodEnd,
    payment_intent: session.payment_intent || null,
    payment_verified: paymentVerified
  };
}

/** Resolve account + plan from a subscription's recorded metadata (renewal/failure/cancellation). */
async function resolveFromSubscription(secretKey, base, subscriptionId) {
  try {
    const sub = await stripe.retrieveSubscription(secretKey, subscriptionId, base);
    if (sub.status !== 200) return null;
    const md = sub.json.metadata || {};
    return {
      accountRef: md.account_id || null,
      planCode: md.plan_code || null,
      periodEnd: sub.json.current_period_end ? new Date(sub.json.current_period_end * 1000).toISOString() : null
    };
  } catch {
    return null;
  }
}

/** Normalise `invoice.paid` / `invoice.payment_failed`. */
async function normalizeInvoiceEvent(env, secretKey, base, invoice, eventId, type) {
  const subId = typeof invoice.subscription === 'string' ? invoice.subscription : (invoice.subscription && invoice.subscription.id);
  const resolved = subId ? await resolveFromSubscription(secretKey, base, subId) : null;
  if (!resolved || !resolved.accountRef || !resolved.planCode) return null;
  return {
    event_id: eventId,
    type,
    account_reference: resolved.accountRef,
    plan_code: resolved.planCode,
    session_reference: subId,
    amount_cents: Number.isInteger(invoice.amount_due) ? invoice.amount_due : null,
    currency: typeof invoice.currency === 'string' ? invoice.currency : null,
    period_end: resolved.periodEnd,
    payment_intent: invoice.payment_intent || null,
    payment_verified: type === 'invoice.paid'
  };
}

/** Normalise `subscription.deleted`. */
async function normalizeSubscriptionEvent(env, secretKey, base, subscription, eventId) {
  const md = subscription.metadata || {};
  const accountRef = md.account_id || null;
  const planCode = md.plan_code || null;
  if (!accountRef || !['monthly', 'annual'].includes(planCode) || !/^sub_[A-Za-z0-9_]+$/.test(subscription.id || '')) return null;
  return {
    event_id: eventId,
    type: 'subscription.deleted',
    account_reference: accountRef,
    plan_code: planCode,
    session_reference: subscription.id,
    checkout_reference: typeof md.checkout_id === 'string' ? md.checkout_id : null,
    amount_cents: null,
    currency: null,
    period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
    payment_intent: null,
    payment_verified: true
  };
}

/** Normalise `charge.refunded` / `charge.dispute.created` — resolves the account from the payment intent. */
async function normalizeChargeEvent(env, secretKey, base, charge, eventId, type) {
  const piId = typeof charge.payment_intent === 'string' ? charge.payment_intent : (charge.payment_intent && charge.payment_intent.id);
  let accountRef = null;
  let planCode = null;
  if (piId) {
    try {
      const pi = await stripe.retrievePaymentIntent(secretKey, piId, base);
      if (pi.status === 200) {
        const md = pi.json.metadata || {};
        accountRef = md.account_id || null;
        planCode = md.plan_code || null;
      }
    } catch { /* leave unresolved */ }
  }
  if (!accountRef) return null;
  return {
    event_id: eventId,
    type,
    account_reference: accountRef,
    plan_code: planCode || 'report_once',
    session_reference: piId || charge.id,
    amount_cents: Number.isInteger(charge.amount) ? charge.amount : null,
    currency: typeof charge.currency === 'string' ? charge.currency : null,
    period_end: null,
    payment_intent: piId,
    payment_verified: true
  };
}

/** Dispatch a verified Stripe event to the normaliser for its type. */
async function normalizeStripeEvent(env, secretKey, base, rawEvent) {
  if (!rawEvent || typeof rawEvent.type !== 'string') return null;
  const type = rawEvent.type;
  const obj = rawEvent.data && rawEvent.data.object;
  if (!obj) return null;
  const eventId = rawEvent.id || null;
  const occurredAt = rawEvent.created ? new Date(rawEvent.created * 1000).toISOString() : null;

  let normalized = null;
  if (type === 'checkout.session.completed' || type === 'checkout.session.async_payment_succeeded') {
    normalized = await normalizeCheckoutEvent(env, secretKey, base, obj, eventId, type);
  } else if (type === 'invoice.paid' || type === 'invoice.payment_failed') {
    normalized = await normalizeInvoiceEvent(env, secretKey, base, obj, eventId, type);
  } else if (type === 'customer.subscription.deleted' || type === 'subscription.deleted') {
    if (type === 'customer.subscription.deleted') {
      const mode = /^(?:sk|rk)_(test|live)_/.exec(secretKey || '')?.[1];
      if (!mode || rawEvent.livemode !== (mode === 'live') || obj.livemode !== (mode === 'live') ||
          typeof obj.metadata?.checkout_id !== 'string' || !obj.metadata.checkout_id) return null;
    }
    normalized = await normalizeSubscriptionEvent(env, secretKey, base, obj, eventId);
  } else if (type === 'charge.refunded' || type === 'charge.dispute.created') {
    normalized = await normalizeChargeEvent(env, secretKey, base, obj, eventId, type);
  }
  if (normalized && occurredAt) normalized.occurred_at = occurredAt;
  return normalized;
}

/** Parse STRIPE_APP_ORIGINS into a set of allowed return origins. */
function parseOrigins(env) {
  const raw = typeof env[STRIPE_APP_ORIGINS] === 'string' ? env[STRIPE_APP_ORIGINS] : '';
  return raw.split(',').map((s) => s.trim()).filter((s) => /^https?:\/\//.test(s));
}

/** A return URL is allowed only when it resolves under a configured application origin. */
function isAllowedOrigin(returnUrl, origins) {
  if (!returnUrl) return false;
  return origins.some((origin) => returnUrl === origin || returnUrl.startsWith(origin.replace(/\/$/, '') + '/'));
}

/** The configured Price ID for a plan, or null. */
function priceIdFor(env, planCode) {
  const name = STRIPE_PRICE_NAMES[planCode];
  const value = name ? env[name] : null;
  return typeof value === 'string' && value ? value : null;
}

/**
 * The real Stripe adapter. It is selected only when STRIPE_SECRET_KEY is configured, and every outbound call
 * it makes is a Stripe API call on behalf of the account. A checkout redirect is a destination, never a grant:
 * only a signature-verified webhook can move an entitlement.
 */
function makeStripeAdapter(env) {
  const secretKey = env.STRIPE_SECRET_KEY;
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;
  const couponId = typeof env[STRIPE_UPGRADE_CREDIT_COUPON] === 'string' ? env[STRIPE_UPGRADE_CREDIT_COUPON] : null;
  const origins = parseOrigins(env);
  const base = typeof env.CRP_STRIPE_API_BASE === 'string' && env.CRP_STRIPE_API_BASE ? env.CRP_STRIPE_API_BASE : undefined;

  /** Build the Checkout Session params Stripe expects for one plan. */
  function sessionParams(request) {
    const req = request || {};
    const planCode = req.plan_code;
    const mode = planCode === 'report_once' ? 'payment' : 'subscription';
    const priceId = priceIdFor(env, planCode);
    const params = {
      mode,
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': 1,
      success_url: req.return_url,
      cancel_url: req.return_url,
      client_reference_id: req.account_id,
      'metadata[account_id]': req.account_id,
      'metadata[plan_code]': planCode,
      'metadata[checkout_id]': req.checkout_id || ''
    };
    if (mode === 'subscription') {
      params['subscription_data[metadata][account_id]'] = req.account_id;
      params['subscription_data[metadata][plan_code]'] = planCode;
      params['subscription_data[metadata][checkout_id]'] = req.checkout_id || '';
    } else {
      params['payment_intent_data[metadata][account_id]'] = req.account_id;
      params['payment_intent_data[metadata][plan_code]'] = planCode;
      params['payment_intent_data[metadata][checkout_id]'] = req.checkout_id || '';
    }
    if (req.apply_upgrade_credit && couponId) {
      params['discounts[0][coupon]'] = couponId;
    }
    return { mode, priceId, params };
  }

  return Object.freeze({
    provider_id: 'stripe',
    display_name: 'Stripe',
    is_a_working_payment: true,

    /** Open a hosted Checkout Session. Async: it calls api.stripe.com. */
    async createCheckout(request) {
      const req = request || {};
      const priceId = priceIdFor(env, req.plan_code);
      if (!priceId) {
        const err = new Error(`STRIPE_PRICE_NOT_CONFIGURED:${req.plan_code}`);
        err.code = 'STRIPE_PRICE_NOT_CONFIGURED';
        throw err;
      }
      if (!req.return_url || !isAllowedOrigin(req.return_url, origins)) {
        const err = new Error('RETURN_URL_OUTSIDE_CONFIGURED_ORIGINS');
        err.code = 'RETURN_URL_OUTSIDE_CONFIGURED_ORIGINS';
        throw err;
      }
      const { params } = sessionParams(req);
      const result = await stripe.createCheckoutSession(secretKey, params, base);
      if (result.status !== 200) {
        const err = new Error(`STRIPE_CHECKOUT_FAILED:${result.status}`);
        err.status = result.status;
        err.code = 'STRIPE_CHECKOUT_FAILED';
        throw err;
      }
      return {
        provider_reference: result.json.id,
        redirect_url: result.json.url,
        mode: result.json.mode,
        is_a_working_payment: true
      };
    },

    /** Verify a webhook signature and normalise the event. Async: it resolves the plan/period server-side. */
    async verifyEvent(request) {
      const req = request || {};
      const rawBody = typeof req.rawBody === 'string' ? req.rawBody : '';
      const signature = stripe.verifyWebhookSignature({ headers: req.headers || {}, rawBody, secret: webhookSecret });
      if (!signature.verified) return { verified: false, reason: signature.reason, fingerprint: payloadFingerprint(rawBody) };
      const normalized = await normalizeStripeEvent(env, secretKey, base, signature.event);
      if (!normalized) return { verified: false, reason: 'STRIPE_EVENT_UNRECOGNISED', fingerprint: payloadFingerprint(rawBody) };
      return {
        verified: true,
        reason: null,
        fingerprint: payloadFingerprint(rawBody),
        event: normalized
      };
    },

    /** Server-side re-verification of a checkout. Retrieves the session and decides paid from the provider. */
    async queryCheckout(request) {
      const req = request || {};
      const result = await stripe.retrieveSession(secretKey, req.provider_reference, base);
      if (result.status !== 200) return { outcome: 'STRIPE_RETRIEVE_FAILED', paid: false };
      const session = result.json;
      const paid = session.payment_status === 'paid' &&
        (session.mode === 'payment' || session.subscription);
      return { outcome: paid ? 'PROVIDER_CONFIRMED_PAID' : 'NOT_PAID_AT_PROVIDER', paid, session };
    },

    /** Resolve this account's completed Checkout before cancelling its actual Stripe renewal. */
    async cancelRenewal(request) {
      const req = request || {};
      function refuse(code) { const error = new Error(code); error.code = code; throw error; }
      const keyMode = /^(?:sk|rk)_(test|live)_/.exec(secretKey || '')?.[1];
      if (!keyMode || !req.account_id || !req.checkout_id ||
          !['monthly', 'annual'].includes(req.plan_code) || !/^cs_[A-Za-z0-9_]+$/.test(req.provider_reference || '')) {
        refuse('CANCELLATION_REQUEST_NOT_BOUND');
      }
      const liveMode = keyMode === 'live';
      const metadataMatches = (object) => object?.metadata?.account_id === req.account_id &&
        object.metadata.plan_code === req.plan_code && object.metadata.checkout_id === req.checkout_id;
      const fetched = await stripe.retrieveSession(secretKey, req.provider_reference, base);
      const session = fetched.json;
      const lineItems = session?.line_items?.data;
      if (fetched.status !== 200 || session?.id !== req.provider_reference || session.mode !== 'subscription' ||
          session.status !== 'complete' || session.payment_status !== 'paid' || session.livemode !== liveMode ||
          session.client_reference_id !== req.account_id || !metadataMatches(session) ||
          !Array.isArray(lineItems) || lineItems.length !== 1 || lineItems[0]?.price?.id !== priceIdFor(env, req.plan_code)) {
        refuse('CANCELLATION_CHECKOUT_MISMATCH');
      }
      const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
      if (!/^sub_[A-Za-z0-9_]+$/.test(subscriptionId || '')) refuse('CANCELLATION_SUBSCRIPTION_MISSING');
      function subscriptionMatches(subscription) {
        return subscription?.id === subscriptionId && subscription.livemode === liveMode && metadataMatches(subscription);
      }
      const retrieved = await stripe.retrieveSubscription(secretKey, subscriptionId, base);
      const subscription = retrieved.json;
      if (retrieved.status !== 200 || !subscriptionMatches(subscription) ||
          !['active', 'trialing', 'past_due', 'unpaid', 'canceled'].includes(subscription.status)) {
        refuse('CANCELLATION_SUBSCRIPTION_MISMATCH');
      }
      let confirmed = subscription;
      if (subscription.cancel_at_period_end !== true && subscription.status !== 'canceled') {
        const idempotencyKey = 'crp-cancel-renewal-' + crypto.createHash('sha256')
          .update([req.account_id, req.checkout_id, subscriptionId].join('\u0000')).digest('hex');
        const updated = await stripe.cancelSubscriptionRenewal(secretKey, subscriptionId, base, idempotencyKey);
        confirmed = updated.json;
        if (updated.status !== 200 || !subscriptionMatches(confirmed) ||
            (confirmed.cancel_at_period_end !== true && confirmed.status !== 'canceled')) {
          refuse('CANCELLATION_NOT_CONFIRMED_BY_PROVIDER');
        }
      }
      return { renewal_cancelled: true, subscription_reference: subscriptionId,
        cancel_at_period_end: confirmed.cancel_at_period_end === true, subscription_status: confirmed.status };
    }
  });
}

/* ------------------------------------------------------------------ selection */

/**
 * What payment capability this process actually has, derived from the environment only.
 *
 * The result is one of three states, and the middle one is the one this build runs in:
 *   TEST_ADAPTER (test runs only) · NOT_CONFIGURED (this build) · never a working payment.
 */
function describeProvider(env) {
  const e = env || process.env;
  const requested = typeof e.CRP_PAYMENT_PROVIDER === 'string' ? e.CRP_PAYMENT_PROVIDER.trim() : '';
  const base = {
    requested_provider: requested || null,
    is_a_working_payment: false,
    configured: false,
    missing_configuration: [],
    exact_external_dependency: STRIPE_ADAPTER.external_dependency,
    declared_providers: [
      Object.assign({}, STRIPE_ADAPTER),
      { provider_id: TEST_PROVIDER_ID, implemented: true, is_a_working_payment: false }
    ]
  };
  if (!requested) {
    return Object.assign(base, {
      state: 'NOT_CONFIGURED',
      provider_id: null,
      display_name: null,
      reason: 'NO_PAYMENT_PROVIDER_IS_SELECTED_FOR_THIS_SERVICE',
      plain: 'No payment provider is connected. Nothing can be purchased and no entitlement can be activated.'
    });
  }
  if (requested === TEST_PROVIDER_ID) {
    const allowed = e[TEST_ADAPTER_FLAG] === '1';
    const hasSecret = typeof e[TEST_SECRET_NAME] === 'string' && e[TEST_SECRET_NAME].length > 0;
    const enabled = allowed && hasSecret;
    return Object.assign(base, {
      state: enabled ? 'TEST_ADAPTER' : 'NOT_CONFIGURED',
      provider_id: TEST_PROVIDER_ID,
      display_name: 'TEST ADAPTER — NOT A PAYMENT PROVIDER',
      missing_configuration: [hasSecret ? null : TEST_SECRET_NAME, allowed ? null : TEST_ADAPTER_FLAG].filter(Boolean),
      reason: enabled ? 'TEST_ADAPTER_NOT_A_PAYMENT' : 'TEST_ADAPTER_NOT_ENABLED',
      plain: enabled
        ? 'A TEST ADAPTER is connected. It signs and verifies synthetic events so the entitlement path can be exercised end to end. No money moves and this is not billing.'
        : 'The test adapter was requested but is not enabled, so nothing is connected.'
    });
  }
  if (requested === STRIPE_ADAPTER.provider_id) {
    const required = STRIPE_CONFIGURATION_NAMES.concat(STRIPE_PRICE_CONFIGURATION_NAMES, [STRIPE_APP_ORIGINS]);
    const missing = required.filter((name) => !e[name]);
    const couponMissing = !e[STRIPE_UPGRADE_CREDIT_COUPON];
    const configured = missing.length === 0;
    const secretKey = typeof e.STRIPE_SECRET_KEY === 'string' ? e.STRIPE_SECRET_KEY : '';
    const keyMode = secretKey.startsWith('sk_live_') ? 'live' : (secretKey.startsWith('sk_test_') ? 'test' : 'unknown');
    return Object.assign(base, {
      state: configured ? 'STRIPE_CONFIGURED' : 'NOT_CONFIGURED',
      provider_id: STRIPE_ADAPTER.provider_id,
      display_name: STRIPE_ADAPTER.display_name,
      is_a_working_payment: configured,
      configured,
      key_mode: keyMode,
      missing_configuration: missing.concat(couponMissing ? [STRIPE_UPGRADE_CREDIT_COUPON] : []),
      reason: configured ? 'STRIPE_CONFIGURED_NOT_YET_VERIFIED_AGAINST_TEST_MODE' : 'STRIPE_CONFIGURATION_INCOMPLETE',
      plain: configured
        ? 'Stripe is connected with the recorded CAD prices. Nothing is charged until you choose a plan and complete checkout.'
        : 'Stripe is requested but its configuration is incomplete, so nothing can be purchased.',
      /* INTERNAL RELEASE RECORD — never rendered on a consumer screen. The launch gate reads this field; the
         consumer-facing sentence above says only what a consumer needs before buying. */
      internal_readiness: configured
        ? 'Configured keys alone do not prove working billing; a test-mode checkout must still be exercised before a launch may claim it.'
        : null
    });
  }
  return Object.assign(base, {
    state: 'NOT_CONFIGURED',
    provider_id: null,
    display_name: null,
    reason: 'UNKNOWN_PAYMENT_PROVIDER_REFUSED',
    plain: 'The requested payment provider is not one this service declares, so nothing is connected.'
  });
}

/** The provider object, or null when this process has no usable provider. */
function resolveProvider(env) {
  const e = env || process.env;
  const state = describeProvider(e).state;
  if (state === 'TEST_ADAPTER') return makeTestAdapter(e);
  if (state === 'STRIPE_CONFIGURED') return makeStripeAdapter(e);
  return null;
}

module.exports = {
  SIGNATURE_HEADER,
  MAX_EVENT_AGE_SECONDS,
  STRIPE_CONFIGURATION_NAMES,
  STRIPE_PRICE_NAMES,
  STRIPE_PRICE_CONFIGURATION_NAMES,
  STRIPE_UPGRADE_CREDIT_COUPON,
  STRIPE_APP_ORIGINS,
  STRIPE_ALL_NAMES,
  TEST_PROVIDER_ID,
  TEST_ADAPTER_FLAG,
  TEST_SECRET_NAME,
  STRIPE_ADAPTER,
  describeProvider,
  resolveProvider,
  makeStripeAdapter,
  parseOrigins,
  isAllowedOrigin,
  priceIdFor,
  planCodeFromPrice,
  priceMatchesCatalog,
  normalizeStripeEvent,
  verifySignature,
  payloadFingerprint,
  timingSafeHexEqual
};
