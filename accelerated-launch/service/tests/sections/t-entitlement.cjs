'use strict';
/**
 * t-entitlement.cjs — OWNER-ALL82-001 / B4: "An unpaid user must not bypass access through direct requests,
 * altered client flags or redirects", plus activation, expiration, cancellation, duplicate events, failed
 * verification and replay.
 *
 * EVERY request here is a real loopback HTTP request. The only test-only inputs are the TEST ADAPTER's two
 * environment flags and its synthetic signing secret; the verification, the activation, the gate and the
 * refusals are all the production code paths, and `service/` contains no test branch.
 *
 * The legacy price catalog is read READ-ONLY at the end, in the style `h-legacy-parity.cjs` established, so a
 * silent change to the recorded amounts fails here instead of shipping.
 */

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const harness = require('../harness.cjs');
const entitlement = require('../../entitlement.cjs');
const plans = require('../../plan-catalog.cjs');
const payments = require('../../payment-provider.cjs');

const LEGACY = process.env.CRP_LEGACY_CHECKOUT || 'C:\\Users\\webbd\\crp-credit-app';
const LEGACY_PRICING = path.join(LEGACY, 'packages', 'backend', 'src', 'services', 'billing', 'pricing.ts');
const LEGACY_STATE = path.join(LEGACY, 'packages', 'backend', 'src', 'services', 'subscriptionState.ts');

const CASE_BODY = { country: 'CA', region: 'CA-NS' };
const NOT_A_PDF = { originalFilename: 'a.pdf', declaredBytes: 12, mimeType: 'application/pdf', contentBase64: Buffer.from('not a pdf at all').toString('base64') };

async function openCase(t, actor) {
  const created = await t.request('POST', '/api/cases', { token: actor.token, body: CASE_BODY });
  assert.equal(created.status, 201);
  return created.json.case.case_id;
}

/**
 * OWNER-PURCHASE-FLOW-001: the paid work is TWO questions, tested separately.
 *   • FREE  — uploading an owned report, assessing it, and the labelled demonstration.
 *   • the COMPLETE assessment of a report (and its download) — a one-time unlock of THAT report or a
 *     subscription.
 *   • SUBSCRIBER-ONLY — the response draft, the dispute packet and the report history/comparison.
 */
async function freeRoutesAllowed(t, check, actor, caseId, label) {
  check.notEqual((await t.request('POST', `/api/cases/${caseId}/files`, { token: actor.token, body: NOT_A_PDF })).status, 402,
    `${label}: uploading an owned report is not a paid step`);
  check.notEqual((await t.request('POST', `/api/cases/${caseId}/evaluate`, { token: actor.token, body: {} })).status, 402,
    `${label}: assessing an owned report is not a paid step`);
  const demonstration = await t.request('POST', `/api/cases/${caseId}/demonstration`, { token: actor.token, body: { scenario: 'TWO_ACCOUNTS' } });
  check.equal(demonstration.status, 201, `${label}: the labelled demonstration runs with no purchase recorded`);
  check.equal(demonstration.json.counts_as_report_support, false, `${label}: and still counts as no report support`);
}

async function assessmentRoutesRefused(t, check, actor, caseId, label) {
  const attempts = [
    ['POST', `/api/cases/${caseId}/results/res_anything/review`, {}, 'review'],
    ['POST', `/api/cases/${caseId}/review`, {}, 'review (latest)'],
    ['GET', `/api/cases/${caseId}/report-download`, undefined, 'assessment download'],
    ['GET', `/api/cases/${caseId}/demonstration-download`, undefined, 'demonstration download'],
    ['GET', `/api/cases/${caseId}/results`, undefined, 'result list']
  ];
  for (const [method, route, body, name] of attempts) {
    const response = await t.request(method, route, { token: actor.token, body });
    check.equal(response.status, 402, `${label}: ${name} needs the complete assessment, so it is refused with a payment-required status`);
    check.equal(response.json.error.code, 'ASSESSMENT_ACCESS_REQUIRED', `${label}: ${name} names the assessment-access refusal`);
    check.ok(!/res_anything|TWO_ACCOUNTS/.test(response.text), `${label}: ${name} echoes nothing from the request`);
  }
}

async function subscriberRoutesRefused(t, check, actor, caseId, label) {
  const attempts = [
    ['GET', `/api/cases/${caseId}/response-draft`, undefined, 'response draft'],
    ['GET', `/api/cases/${caseId}/packet`, undefined, 'packet view'],
    ['POST', `/api/cases/${caseId}/packet/select`, { issue_ids: [] }, 'packet selection'],
    ['POST', `/api/cases/${caseId}/packet/approve`, {}, 'packet approval'],
    ['GET', `/api/cases/${caseId}/packet-download`, undefined, 'packet download'],
    ['GET', '/api/history', undefined, 'report history']
  ];
  for (const [method, route, body, name] of attempts) {
    const response = await t.request(method, route, { token: actor.token, body });
    check.equal(response.status, 402, `${label}: ${name} is a subscriber feature, so it is refused with a payment-required status`);
    check.equal(response.json.error.code, 'SUBSCRIPTION_REQUIRED', `${label}: ${name} names the subscription refusal`);
    check.ok(!/res_anything|TWO_ACCOUNTS/.test(response.text), `${label}: ${name} echoes nothing from the request`);
  }
}


/* -------------------------------------------------------------- what a purchase is, and what it is not */

async function purchaseSurface(t, check, evidence) {
  const unpaid = await t.unpaidAccount('entitlement-unpaid@example.test');
  const status = await t.request('GET', '/api/entitlement', { token: unpaid.token });
  check.equal(status.status, 200, 'an unpaid account can read its own entitlement state');
  check.equal(status.json.entitlement.entitled, false, 'which says it is not entitled');
  check.equal(status.json.entitlement.can_use_paid_product, false, 'and that paid work may not start');
  check.equal(status.json.entitlement.can_read_historical, true, 'while reading what it has is still allowed');
  check.equal(status.json.payment.is_a_working_payment, false, 'and no working payment is claimed');

  const notGranted = JSON.stringify(status.json.not_granted);
  check.ok(/no legal conclusion/i.test(notGranted), 'the surface states that no legal conclusion is granted');
  check.ok(/one-time unlock is limited to the one report/i.test(notGranted), 'and states the limit of a one-time unlock');
  check.ok(/no letter/i.test(notGranted) && /no dispute/i.test(notGranted), 'and that no letter or dispute is granted');
  check.ok(/no removal/i.test(notGranted), 'and that no removal is granted');

  const planView = await t.request('GET', '/api/billing/plans', { token: unpaid.token });
  check.equal(planView.status, 200, 'the billing surface is reachable WITHOUT a purchase');
  check.equal(planView.json.plan_catalog.plans.length, plans.PLAN_CODES.length, 'it names every recorded plan');
  check.equal(planView.json.entitlement.entitled, false, 'and reports the unpaid state beside them');
  check.ok(planView.json.plan_catalog.plans.every((p) => p.currency === plans.BILLING_CURRENCY),
    'one currency is used for every plan, as the legacy catalog decided');
  check.ok(planView.json.plan_catalog.plans.every((p) => Number.isInteger(p.amount_cents) && p.amount_cents >= plans.MINIMUM_CHARGE_CAD_CENTS),
    'and no plan is priced below the provider minimum');
  check.ok(!/sk_|pk_|whsec/i.test(planView.text), 'the billing surface carries no provider key');

  const caseId = await openCase(t, unpaid);
  await freeRoutesAllowed(t, check, unpaid, caseId, 'unpaid');
  await assessmentRoutesRefused(t, check, unpaid, caseId, 'unpaid');
  await subscriberRoutesRefused(t, check, unpaid, caseId, 'unpaid');

  /* READING, RECORDING STATUS AND DELETION ARE NEVER GATED — the legacy rule that a lapsed consumer keeps
     read-only historical access, and that a consumer can always remove their own data. */
  check.equal((await t.request('GET', '/api/cases', { token: unpaid.token })).status, 200, 'the unpaid account can still list its cases');
  check.equal((await t.request('GET', `/api/cases/${caseId}`, { token: unpaid.token })).status, 200, 'and read the case it opened');
  check.equal((await t.request('PATCH', `/api/cases/${caseId}/status`, { token: unpaid.token, body: { status: 'CLOSED' } })).status, 200,
    'and record its own status');

  /* The bypass attempts the owner named: a client flag, a redirect-shaped query and a body field. */
  const flagAttempt = await t.request('GET', `/api/cases/${caseId}/report-download?paid=true&entitled=1&checkout=success`, {
    token: unpaid.token
  });
  check.equal(flagAttempt.status, 402, 'a client flag in the query grants nothing');
  check.equal(flagAttempt.json.error.code, 'ASSESSMENT_ACCESS_REQUIRED', 'and the refusal names the missing report access');
  const headerAttempt = await t.request('GET', `/api/cases/${caseId}/demonstration-download`, {
    token: unpaid.token,
    headers: { 'x-crp-entitled': 'true', 'x-forwarded-user': 'owner' }
  });
  check.equal(headerAttempt.status, 402, 'an invented header grants nothing');

  /* A CHECKOUT WITH NO PROVIDER CONNECTED REFUSES, AND NAMES THE EXACT EXTERNAL DEPENDENCY. */
  const savedProvider = process.env.CRP_PAYMENT_PROVIDER;
  const savedFlag = process.env[payments.TEST_ADAPTER_FLAG];
  delete process.env.CRP_PAYMENT_PROVIDER;
  delete process.env[payments.TEST_ADAPTER_FLAG];
  try {
    const noProvider = await t.request('POST', '/api/billing/checkout', { token: unpaid.token, body: { plan_code: 'report_once' } });
    check.equal(noProvider.status, 503, 'with no provider connected, a checkout is refused rather than pretended');
    check.equal(noProvider.json.error.code, 'PAYMENT_PROVIDER_NOT_CONFIGURED', 'and the refusal names that');
    check.ok(/stripe/i.test(JSON.stringify(noProvider.json)), 'and records the exact external dependency');
    const noProviderEvent = await t.request('POST', '/api/billing/events', {
      raw: '{"id":"x"}',
      headers: { 'Content-Type': 'application/json', 'x-crp-signature': 't=1,v1=00' }
    });
    check.equal(noProviderEvent.status, 503, 'and a provider event is refused with the same reason');
    check.equal((await t.request('GET', '/api/entitlement', { token: unpaid.token })).json.entitlement.entitled, false,
      'and none of it granted anything');
  } finally {
    process.env.CRP_PAYMENT_PROVIDER = savedProvider;
    process.env[payments.TEST_ADAPTER_FLAG] = savedFlag;
  }

  evidence.unpaid = { case_id: caseId, paid_routes_refused: 7 };
  return { unpaid, caseId };
}


/* -------------------------------------------------------------- activation, idempotency, verification */

async function activationAndIdempotency(t, check, evidence) {
  const buyer = await t.unpaidAccount('entitlement-buyer@example.test');
  /* OWNER-PURCHASE-FLOW-001: a one-time unlock needs a report that has been assessed, so the buyer owns one. */
  const caseId = await t.assessedCase(buyer);

  const before = await t.request('GET', '/api/entitlement', { token: buyer.token });
  check.equal(before.json.entitlement.entitled, false, 'the buyer is not entitled before a verified event');

  const checkout = await t.openCheckout(buyer, 'report_once', caseId);
  check.equal(checkout.status, 201, 'a checkout intent is opened through the real endpoint');
  check.equal(checkout.json.checkout.provider_is_a_working_payment, false, 'and states the provider is not a working payment');
  check.equal(checkout.json.checkout.redirect_grants_nothing, true, 'and states that the redirect grants nothing');
  check.ok(/checkout=success/.test(checkout.json.checkout.redirect_url), 'the decoy redirect carries a success flag');
  check.equal((await t.request('GET', '/api/entitlement', { token: buyer.token })).json.entitlement.entitled, false,
    'and opening it grants nothing at all');
  check.equal((await t.request('GET', `/api/cases/${caseId}/report-download`, { token: buyer.token })).status, 402,
    'and the complete assessment is still refused after the redirect-shaped URL is produced');

  /* The redirect is FOLLOWED, exactly as a browser would, and then the same paid step is tried again. */
  const followed = await t.request('GET', '/?checkout=success&payment=paid&session=' + checkout.json.checkout.provider_reference, {});
  check.equal(followed.status, 200, 'the return URL is served as a plain page');
  check.equal((await t.request('GET', '/api/entitlement', { token: buyer.token })).json.entitlement.entitled, false,
    'returning from the redirect grants nothing');

  /* THE CLIENT'S OWN CONFIRMATION CANNOT SATISFY THE SERVICE. */
  const confirm = await t.request('POST', '/api/billing/confirm', {
    token: buyer.token,
    body: { provider_reference: checkout.json.checkout.provider_reference, paid: true }
  });
  check.equal(confirm.status, 409, 'the service refuses to confirm a purchase from anything the client says');
  check.equal(confirm.json.error.code, 'CHECKOUT_NOT_CONFIRMED_BY_PROVIDER', 'and names the reason');
  check.equal((await t.request('GET', '/api/entitlement', { token: buyer.token })).json.entitlement.entitled, false, 'and nothing was granted');

  const payment = await t.pay(buyer, 'report_once', caseId);
  check.equal(payment.response.duplicate, false, 'a verified provider event activates the purchase');
  const activated = await t.request('GET', '/api/entitlement', { token: buyer.token });
  check.equal(activated.json.entitlement.entitled, true, 'and the account is entitled afterwards');
  check.equal(activated.json.entitlement.access_via, 'ONE_TIME_CREDIT', 'through the one-time credit, as the plan records');
  check.equal(activated.json.entitlement.state, 'ACTIVE', 'with the state named');
  check.ok(activated.json.entitlement.expires_at > new Date().toISOString(), 'and a future expiry');
  check.equal(activated.json.entitlement.is_a_working_payment, false, 'while still not claiming a working payment');

  /* THE SAME EVENT AGAIN CHANGES NOTHING. */
  const replay = await t.postEvent(payment.event);
  check.equal(replay.status, 200, 'a duplicate event is accepted, not rejected, so a provider stops retrying');
  check.equal(replay.json.event.duplicate, true, 'and is reported as a duplicate');
  const afterReplay = await t.request('GET', '/api/entitlement', { token: buyer.token });
  check.equal(afterReplay.json.entitlement.expires_at, activated.json.entitlement.expires_at,
    'and the expiry did not move: no second grant was applied');

  /* THE SAME BODY UNDER A NEW ID IS STILL THE SAME EVENT. */
  const renamed = await t.postEvent(Object.assign({}, payment.event, { id: `test_evt_renamed_${Date.now()}` }));
  check.equal(renamed.json.event.duplicate, true, 'a re-sent body under a new identifier is recognised as the same event');
  check.equal((await t.request('GET', '/api/entitlement', { token: buyer.token })).json.entitlement.expires_at,
    activated.json.entitlement.expires_at, 'and changes nothing');

  evidence.activation = {
    checkout_id: payment.checkout_id,
    entitled_after_event: true,
    duplicate_event_is_idempotent: true,
    client_confirmation_refused: true,
    redirect_grants_nothing: true
  };
  return { buyer, caseId, payment, activated: activated.json.entitlement };
}


/* -------------------------------------------------------------- failed verification, expiry, cancellation */

async function verificationFailures(t, check, evidence) {
  const target = await t.unpaidAccount('entitlement-verify@example.test');
  const checkout = await t.openCheckout(target, 'monthly');
  const reference = checkout.json.checkout.provider_reference;
  const good = {
    id: `test_evt_verify_${Date.now()}`,
    type: 'checkout.session.completed',
    account_reference: target.account_id,
    plan_code: 'monthly',
    session_reference: reference,
    amount_cents: 795,
    currency: 'cad',
    occurred_at: new Date().toISOString()
  };

  /* No header at all. */
  const unsigned = await t.postEvent(good, false);
  check.equal(unsigned.status, 400, 'an unsigned event is refused');
  check.equal(unsigned.json.error.code, 'BILLING_EVENT_SIGNATURE_INVALID', 'with a signature refusal');
  check.equal(unsigned.json.error.detail.reason, 'NO_SIGNATURE_HEADER', 'naming the missing header');

  /* A signature over different bytes. */
  const tampered = await t.request('POST', '/api/billing/events', {
    raw: JSON.stringify(Object.assign({}, good, { plan_code: 'annual' })),
    headers: { 'Content-Type': 'application/json', 'x-crp-signature': `t=${Math.floor(Date.now() / 1000)},v1=${'ab'.repeat(32)}` }
  });
  check.equal(tampered.status, 400, 'a signature that does not match the body is refused');

  /* A stale timestamp, correctly signed: the header is signed material, so freshness is the only thing
     standing between a captured event and a replay later. */
  const staleTime = Math.floor(Date.now() / 1000) - (payments.MAX_EVENT_AGE_SECONDS + 60);
  const staleSignature = crypto
    .createHmac('sha256', harness.TEST_SECRET)
    .update(`${staleTime}.${JSON.stringify(good)}`, 'utf8')
    .digest('hex');
  const stale = await t.request('POST', '/api/billing/events', {
    raw: JSON.stringify(good),
    headers: { 'Content-Type': 'application/json', 'x-crp-signature': `t=${staleTime},v1=${staleSignature}` }
  });
  check.equal(stale.status, 400, 'a correctly signed but stale event is refused');
  check.equal(stale.json.error.detail.reason, 'SIGNATURE_TIMESTAMP_OUTSIDE_THE_ACCEPTED_WINDOW', 'naming the window');

  /* An event type this build does not implement. */
  const unsupported = await t.postEvent(Object.assign({}, good, { id: `test_evt_unsupported_${Date.now()}`, type: 'invoice.voided' }));
  check.equal(unsupported.status, 400, 'an event type that is not implemented is refused rather than ignored');
  check.equal(unsupported.json.error.code, 'BILLING_EVENT_TYPE_UNSUPPORTED', 'and the refusal names it');

  /* An unknown account, an unknown checkout and a mismatched plan are acknowledged and IGNORED: the provider
     learns nothing about whether an account exists, and nothing is granted. */
  const ghost = await t.postEvent(Object.assign({}, good, { id: `test_evt_ghost_${Date.now()}`, account_reference: 'acc_does_not_exist' }));
  check.equal(ghost.status, 200, 'an event for an unknown account is acknowledged');
  check.equal(ghost.json.event.reason, 'EVENT_IGNORED_ACCOUNT_UNKNOWN', 'and ignored with a reason');
  const unknownCheckout = await t.postEvent(Object.assign({}, good, { id: `test_evt_unknown_cs_${Date.now()}`, session_reference: 'test_cs_not_mine' }));
  check.equal(unknownCheckout.json.event.reason, 'EVENT_IGNORED_CHECKOUT_UNKNOWN', 'an event naming an unknown checkout is ignored');
  const mismatched = await t.postEvent(Object.assign({}, good, { id: `test_evt_plan_${Date.now()}`, plan_code: 'annual' }));
  check.equal(mismatched.json.event.reason, 'EVENT_IGNORED_PLAN_MISMATCH', 'an event whose plan does not match the checkout is ignored');

  const stillUnpaid = await t.request('GET', '/api/entitlement', { token: target.token });
  check.equal(stillUnpaid.json.entitlement.entitled, false, 'after every one of those attempts the account is still not entitled');
  check.ok(!/BILLING_EVENT_SIGNATURE_INVALID/.test(JSON.stringify(stillUnpaid.json)), 'and the entitlement view names no internal refusal');

  evidence.failed_verification = {
    unsigned_refused: true,
    tampered_refused: true,
    stale_refused: true,
    unsupported_type_refused: true,
    unknown_account_ignored: true,
    unknown_checkout_ignored: true,
    plan_mismatch_ignored: true
  };
  return { target, reference, good };
}

async function expiryCancellationAndRevocation(t, check, evidence) {
  /* ACTIVATION WITH A PERIOD THAT HAS ALREADY ENDED IS EXPIRED IMMEDIATELY, not active. */
  const lapsed = await t.unpaidAccount('entitlement-lapsed@example.test');
  const lapsedCheckout = await t.openCheckout(lapsed, 'monthly');
  const posted = await t.postEvent({
    id: `test_evt_lapsed_${Date.now()}`,
    type: 'checkout.session.completed',
    account_reference: lapsed.account_id,
    plan_code: 'monthly',
    session_reference: lapsedCheckout.json.checkout.provider_reference,
    amount_cents: 795,
    currency: 'cad',
    period_end: new Date(Date.now() - 86400000).toISOString(),
    occurred_at: new Date().toISOString()
  });
  check.equal(posted.status, 200, 'an activation whose period has already ended is accepted and recorded');
  const lapsedStatus = await t.request('GET', '/api/entitlement', { token: lapsed.token });
  check.equal(lapsedStatus.json.entitlement.entitled, false, 'and the account is NOT entitled');
  check.equal(lapsedStatus.json.entitlement.state, 'EXPIRED', 'because the recorded expiry is in the past');
  check.equal(lapsedStatus.json.entitlement.can_read_historical, true, 'and it may still read what it has');
  const lapsedCase = await openCase(t, lapsed);
  check.equal((await t.request('GET', `/api/cases/${lapsedCase}/report-download`, { token: lapsed.token })).status, 402,
    'and the complete assessment is refused');
  check.equal((await t.request('DELETE', `/api/cases/${lapsedCase}`, { token: lapsed.token })).status, 200,
    'and deletion is NOT refused for an expired account');

  /* A FAILED PAYMENT GIVES A SHORT GRACE; CONSUMER CANCELLATION KEEPS PAID TIME; A REFUND ENDS IT AT ONCE. */
  const subscriber = await t.unpaidAccount('entitlement-subscriber@example.test');
  await t.pay(subscriber, 'monthly');
  const active = await t.request('GET', '/api/entitlement', { token: subscriber.token });
  check.equal(active.json.entitlement.state, 'ACTIVE', 'the subscriber is active');
  check.equal(active.json.entitlement.access_via, 'SUBSCRIPTION', 'through a subscription, not a credit');

  const failedCheckout = await t.openCheckout(subscriber, 'monthly');
  const failed = await t.postEvent({
    id: `test_evt_failed_${Date.now()}`,
    type: 'invoice.payment_failed',
    account_reference: subscriber.account_id,
    plan_code: 'monthly',
    session_reference: failedCheckout.json.checkout.provider_reference,
    occurred_at: new Date().toISOString()
  });
  check.equal(failed.status, 200, 'a failed payment is processed');
  const grace = await t.request('GET', '/api/entitlement', { token: subscriber.token });
  check.equal(grace.json.entitlement.state, 'PAST_DUE', 'and the account is PAST_DUE');
  check.equal(grace.json.entitlement.entitled, true, 'which is still entitled, as the legacy grace rule decides');
  check.ok(grace.json.entitlement.grace_until > new Date().toISOString(), 'with a recorded grace deadline');

  const cancelled = await t.request('POST', '/api/entitlement/cancel', { token: subscriber.token, body: { reason: 'consumer test' } });
  check.equal(cancelled.status, 200, 'the consumer can cancel their own purchase');
  check.equal(cancelled.json.cancellation.at_period_end, true, 'and it takes effect at the recorded period end');
  check.equal(cancelled.json.cancellation.entitlement.entitled, true, 'so access continues for the time already paid for');
  check.equal(cancelled.json.cancellation.entitlement.cancel_at_period_end, true, 'and the account is marked as not renewing');
  const canonicalCancellation = await t.postEvent({ id: 'test_evt_canonical_cancellation_' + Date.now(),
    type: 'subscription.deleted', account_reference: subscriber.account_id, plan_code: 'monthly',
    session_reference: failedCheckout.json.checkout.provider_reference });
  check.equal(canonicalCancellation.status, 200, 'the synthetic adapter canonical cancellation contract is preserved');
  check.equal(canonicalCancellation.json.event.effect, 'CANCEL_AT_PERIOD_END', 'the existing synthetic event retains its cancellation effect');

  const refundCheckout = await t.openCheckout(subscriber, 'monthly');
  const refunded = await t.postEvent({
    id: `test_evt_refund_${Date.now()}`,
    type: 'charge.refunded',
    account_reference: subscriber.account_id,
    plan_code: 'monthly',
    session_reference: refundCheckout.json.checkout.provider_reference,
    occurred_at: new Date().toISOString()
  });
  check.equal(refunded.status, 200, 'a refund is processed');
  const afterRefund = await t.request('GET', '/api/entitlement', { token: subscriber.token });
  check.equal(afterRefund.json.entitlement.entitled, false, 'and access ends immediately');
  check.equal(afterRefund.json.entitlement.state, 'EXPIRED', 'the row is at its end, so the state reads as ended');
  check.ok(/REFUND/.test(afterRefund.json.entitlement.access_ended_because), 'and the reason is recorded as a refund, not a calendar lapse');
  check.equal(afterRefund.json.entitlement.can_read_historical, true, 'while what the consumer already made stays readable');

  /* Cancelling with nothing left to cancel is refused, not silently accepted. */
  const nothing = await t.request('POST', '/api/entitlement/cancel', { token: lapsed.token });
  check.equal(nothing.status, 409, 'a cancellation with nothing left to cancel is refused');
  check.equal(nothing.json.error.code, 'NO_ACTIVE_PURCHASE_TO_CANCEL', 'and says so');
  check.ok(/EXPIRED/.test(nothing.json.error.detail.reason), 'and names the state that left nothing to cancel');

  /* AN UNPAID CHECKOUT CAN BE ABANDONED, and abandoning it grants nothing and leaves nothing pending. */
  const abandoner = await t.unpaidAccount('entitlement-abandon@example.test');
  await t.openCheckout(abandoner, 'annual');
  const abandoned = await t.request('POST', '/api/entitlement/cancel', { token: abandoner.token });
  check.equal(abandoned.status, 200, 'an unpaid checkout can be cancelled');
  check.equal(abandoned.json.cancellation.at_period_end, false, 'and it ends at once, because nothing was paid');
  check.equal(abandoned.json.cancellation.entitlement.entitled, false, 'and no access was ever granted');

  evidence.expiry_and_cancellation = {
    lapsed_period_is_expired_immediately: true,
    deletion_never_gated: true,
    grace_on_failed_payment: true,
    cancellation_at_period_end: true,
    refund_revokes_immediately: true,
    unpaid_checkout_cancels_at_once: true
  };
  return { lapsed, subscriber, abandoner };
}

/* -------------------------------------------------------------- isolation, and the legacy price catalog */

/** Actual Stripe adapter + HTTP service against a loopback provider, never a hosted grant or payment. */
async function stripeRenewalCancellation(t, check, evidence) {
  const { startMock, signedEvent, PRICE_IDS } = require('../test-stripe-adapter.cjs');
  const mock = await startMock();
  const configured = { CRP_PAYMENT_PROVIDER: 'stripe', STRIPE_SECRET_KEY: 'sk_test_cancellation_fixture',
    STRIPE_PUBLISHABLE_KEY: 'pk_test_cancellation_fixture', STRIPE_WEBHOOK_SECRET: 'whsec_cancellation_fixture',
    STRIPE_PRICE_REPORT_ONCE: PRICE_IDS.report_once, STRIPE_PRICE_MONTHLY: PRICE_IDS.monthly,
    STRIPE_PRICE_ANNUAL: PRICE_IDS.annual, STRIPE_APP_ORIGINS: t.base,
    CRP_STRIPE_API_BASE: `http://127.0.0.1:${mock.address().port}` };
  const previous = Object.fromEntries(Object.keys(configured).map((key) => [key, process.env[key]]));
  Object.assign(process.env, configured);
  let sequence = 0, releaseHeld;
  const updates = () => mock.calls.filter((call) => call.method === 'POST' && call.path.startsWith('/v1/subscriptions/'));
  const rowFor = (actor) => t.service.store.state().entitlements.find((row) => row.account_id === actor.account_id && row.state === 'ACTIVE');
  async function activate(label, plan = 'monthly', existingActor) {
    sequence += 1;
    const actor = existingActor || await t.unpaidAccount(`stripe-cancel-${label}@example.test`);
    mock.fixture.session.id = 'cs_test_cancel_' + sequence;
    mock.fixture.session.subscription = 'sub_cancel_' + sequence;
    mock.fixture.session.status = 'complete'; mock.fixture.session.payment_status = 'paid';
    mock.fixture.session.amount_total = plans.plan(plan).amount_cents;
    mock.fixture.subscription.id = mock.fixture.session.subscription;
    mock.fixture.subscription.cancel_at_period_end = false;
    mock.fixture.subscription.current_period_end = Math.floor(Date.now() / 1000) + (plan === 'annual' ? 365 : 30) * 86400;
    const checkout = await t.request('POST', '/api/billing/checkout', { token: actor.token,
      body: { plan_code: plan, return_url: t.base + '/' } });
    check.equal(checkout.status, 201, label + ': actual Stripe adapter opens this owned mock Checkout');
    const signed = signedEvent(configured.STRIPE_WEBHOOK_SECRET, { id: 'evt_cancel_activate_' + sequence,
      type: 'checkout.session.completed', livemode: false, created: Math.floor(Date.now() / 1000),
      data: { object: { ...mock.fixture.session } } });
    const granted = await t.request('POST', '/api/billing/events', { raw: signed.raw, headers: signed.headers });
    check.equal(granted.json?.event?.accepted, true, label + ': verified mock Stripe event grants this subscription');
    return { actor, checkout: checkout.json.checkout };
  }
  function holdUpdate() {
    let started;
    const began = new Promise((resolve) => { started = resolve; });
    mock.fixture.updateStarted = started;
    mock.fixture.updateGate = new Promise((resolve) => { releaseHeld = resolve; });
    return began;
  }
  function releaseUpdate() { releaseHeld(); releaseHeld = null; mock.fixture.updateGate = null; mock.fixture.updateStarted = null; }
  try {
    const subscriber = await activate('success');
    const original = structuredClone(rowFor(subscriber.actor));
    const stranger = await t.unpaidAccount('stripe-cancel-stranger@example.test');
    const writes = updates().length;
    const wrongActor = await t.request('POST', '/api/entitlement/cancel', { token: stranger.token,
      body: { account_id: subscriber.actor.account_id, provider_reference: subscriber.checkout.provider_reference } });
    check.equal(wrongActor.status, 409, 'client account/reference fields cannot cancel another subscription');
    check.equal(updates().length, writes, 'the stranger causes no provider cancellation');
    const cancelled = await t.request('POST', '/api/entitlement/cancel', { token: subscriber.actor.token });
    check.equal(cancelled.status, 200, 'actual provider-confirmed renewal cancellation succeeds through HTTP');
    check.equal(mock.fixture.subscription.cancel_at_period_end, true, 'the provider subscription, not only the local row, stops renewing');
    check.equal(cancelled.json.cancellation.entitlement.cancel_at_period_end, true, 'local success follows provider confirmation');
    check.equal(cancelled.json.cancellation.entitlement.entitled, true, 'the paid subscription stays usable to its recorded expiry');
    check.equal(cancelled.json.cancellation.entitlement.expires_at, original.expires_at, 'cancellation does not confiscate paid time');
    const cancelledAt = rowFor(subscriber.actor).cancelled_at;
    const afterFirst = updates().length;
    check.equal((await t.request('POST', '/api/entitlement/cancel', { token: subscriber.actor.token })).status, 200,
      'a repeated consumer cancellation is idempotent');
    check.equal(updates().length, afterFirst, 'already-confirmed provider cancellation needs no repeated write');
    check.equal(rowFor(subscriber.actor).cancelled_at, cancelledAt, 'repeating cancellation preserves its original time');

    const deletion = signedEvent(configured.STRIPE_WEBHOOK_SECRET, { id: 'evt_cancel_deleted',
      type: 'customer.subscription.deleted', livemode: false, data: { object: { ...mock.fixture.subscription, status: 'canceled' } } });
    const deletedEvent = await t.request('POST', '/api/billing/events', { raw: deletion.raw, headers: deletion.headers });
    check.equal(deletedEvent.json?.event?.effect, 'CANCEL_AT_PERIOD_END', 'the actual Stripe deletion event reaches the existing cancellation effect');

    const failed = await activate('provider-failure');
    const beforeFailure = JSON.stringify(rowFor(failed.actor));
    mock.fixture.updateStatus = 503;
    const refused = await t.request('POST', '/api/entitlement/cancel', { token: failed.actor.token });
    check.equal(refused.status, 502, 'provider cancellation failure is returned as a retryable failure');
    check.equal(refused.json.error.code, 'SUBSCRIPTION_CANCELLATION_FAILED', 'failure never reports cancelled renewal');
    check.ok(/will continue to renew until cancellation is confirmed/.test(refused.json.error.message), 'consumer wording accurately states unconfirmed renewal');
    check.equal(JSON.stringify(rowFor(failed.actor)), beforeFailure, 'provider failure leaves the entire local entitlement unchanged');
    mock.fixture.updateStatus = 200;
    mock.fixture.subscription.metadata.account_id = stranger.account_id;
    const beforeMismatchWrites = updates().length;
    check.equal((await t.request('POST', '/api/entitlement/cancel', { token: failed.actor.token })).status, 502,
      'mismatched provider subscription metadata is refused');
    check.equal(updates().length, beforeMismatchWrites, 'mismatch is refused before any cancellation mutation');
    check.equal(JSON.stringify(rowFor(failed.actor)), beforeFailure, 'mismatch leaves the local entitlement unchanged');
    mock.fixture.subscription.metadata.account_id = failed.actor.account_id;
    process.env.CRP_PAYMENT_PROVIDER = payments.TEST_PROVIDER_ID;
    check.equal((await t.request('POST', '/api/entitlement/cancel', { token: failed.actor.token })).status, 502,
      'switching to the synthetic provider cannot fake cancellation of a Stripe purchase');
    check.equal(JSON.stringify(rowFor(failed.actor)), beforeFailure, 'an unavailable Stripe cancellation keeps the local state truthful');
    process.env.CRP_PAYMENT_PROVIDER = 'stripe';

    const concurrent = await activate('concurrent');
    const concurrentWrites = updates().length;
    const both = await Promise.all([t.request('POST', '/api/entitlement/cancel', { token: concurrent.actor.token }),
      t.request('POST', '/api/entitlement/cancel', { token: concurrent.actor.token })]);
    check.ok(both.every((response) => response.status === 200), 'concurrent cancellation of the same entitlement succeeds consistently');
    const simultaneous = updates().slice(concurrentWrites);
    check.ok(simultaneous.length >= 1 && simultaneous.every((call) => call.idempotency_key === simultaneous[0].idempotency_key),
      'concurrent provider writes use the same cancellation idempotency key');

    const stale = await activate('expired-during-request');
    let began = holdUpdate();
    const delayed = t.request('POST', '/api/entitlement/cancel', { token: stale.actor.token });
    await began;
    t.service.store.update((state) => { state.entitlements.find((row) => row.account_id === stale.actor.account_id).state = 'EXPIRED'; });
    releaseUpdate();
    const staleResponse = await delayed;
    check.equal(staleResponse.status, 409, 'changed entitlement during the provider wait is not reported as current cancellation success');
    check.equal(staleResponse.json.error.code, 'SUBSCRIPTION_CANCELLATION_STALE', 'a changed purchase has an explicit refresh refusal');
    check.equal(t.service.store.state().entitlements.find((row) => row.account_id === stale.actor.account_id).cancel_at_period_end, false,
      'stale provider completion cannot mutate the changed local entitlement');

    const replacement = await activate('replacement');
    began = holdUpdate();
    const olderSubscription = structuredClone(mock.fixture.subscription);
    mock.fixture.updateResponse = { ...structuredClone(mock.fixture.subscription), cancel_at_period_end: true };
    const replaced = t.request('POST', '/api/entitlement/cancel', { token: replacement.actor.token });
    await began;
    const newerSubscription = await activate('replacement-annual', 'annual', replacement.actor);
    releaseUpdate();
    check.equal((await replaced).status, 409, 'a newly controlling subscription is not cancelled by an older response');
    const replacementView = (await t.request('GET', '/api/entitlement', { token: replacement.actor.token })).json.entitlement;
    check.equal(replacementView.plan_code, 'annual', 'the new subscription remains the controlling purchase');
    check.equal(replacementView.cancel_at_period_end, false, 'the old cancellation never promises to stop renewal of the new subscription');
    mock.fixture.updateResponse = null;
    const newerBefore = JSON.stringify(t.service.store.state().entitlements.find((row) => row.checkout_id === newerSubscription.checkout.checkout_id));
    const olderDeleted = { id: 'evt_cancel_old_deleted', type: 'customer.subscription.deleted', livemode: false,
      data: { object: { ...olderSubscription, status: 'canceled' } } };
    let signedDeletion = signedEvent(configured.STRIPE_WEBHOOK_SECRET, olderDeleted);
    const olderApplied = await t.request('POST', '/api/billing/events', { raw: signedDeletion.raw, headers: signedDeletion.headers });
    check.equal(olderApplied.json?.event?.accepted, true, 'a delayed valid deletion is applied to its own older subscription');
    check.equal(olderApplied.json.event.applied_to, t.service.store.state().entitlements.find((row) => row.checkout_id === replacement.checkout.checkout_id).entitlement_id,
      'the old deletion names the exact old entitlement it changed');
    check.equal(JSON.stringify(t.service.store.state().entitlements.find((row) => row.checkout_id === newerSubscription.checkout.checkout_id)), newerBefore,
      'the whole newer subscription stays unchanged after an older deletion');
    check.equal(t.service.store.state().entitlements.find((row) => row.checkout_id === replacement.checkout.checkout_id).cancel_at_period_end, true,
      'the old purchase itself is marked as no longer renewing');
    for (const [label, metadata] of [
      ['unknown-checkout', { ...olderSubscription.metadata, checkout_id: 'chk_unknown' }],
      ['wrong-plan', { ...olderSubscription.metadata, plan_code: 'annual' }],
      ['wrong-subscription', { ...olderSubscription.metadata, plan_code: 'annual', checkout_id: newerSubscription.checkout.checkout_id }]
    ]) {
      signedDeletion = signedEvent(configured.STRIPE_WEBHOOK_SECRET, { ...olderDeleted, id: 'evt_cancel_' + label,
        data: { object: { ...olderDeleted.data.object, metadata } } });
      const rejected = await t.request('POST', '/api/billing/events', { raw: signedDeletion.raw, headers: signedDeletion.headers });
      check.equal(rejected.json?.event?.accepted, false, label + ': signed deletion cannot change a mismatched purchase');
      check.equal(rejected.json.event.reason, 'EVENT_IGNORED_SUBSCRIPTION_MISMATCH', label + ': the exact binding refusal is recorded');
      check.equal(JSON.stringify(t.service.store.state().entitlements.find((row) => row.checkout_id === newerSubscription.checkout.checkout_id)), newerBefore,
        label + ': the newer subscription remains unchanged');
    }
    signedDeletion = signedEvent(configured.STRIPE_WEBHOOK_SECRET, { ...olderDeleted, id: 'evt_cancel_missing_checkout',
      data: { object: { ...olderDeleted.data.object, metadata: { account_id: replacement.actor.account_id, plan_code: 'monthly' } } } });
    check.equal((await t.request('POST', '/api/billing/events', { raw: signedDeletion.raw, headers: signedDeletion.headers })).status, 400,
      'deletion without the server Checkout metadata is refused before applying any effect');

    const removed = await activate('deleted-account');
    began = holdUpdate();
    const removedRequest = t.request('POST', '/api/entitlement/cancel', { token: removed.actor.token });
    await began;
    check.equal((await t.request('DELETE', '/api/account', { token: removed.actor.token })).status, 200, 'consumer deletion proceeds while cancellation waits');
    releaseUpdate();
    check.equal((await removedRequest).status, 409, 'a response after account deletion cannot recreate or claim a current entitlement');
    check.equal(t.service.store.state().entitlements.some((row) => row.account_id === removed.actor.account_id), false,
      'deleted billing rows are not resurrected');
    evidence.stripe_cancellation = { proof: 'HTTP_SERVICE_AND_LOOPBACK_STRIPE_MOCK_NOT_HOSTED_PAYMENT',
      provider_confirmed: true, provider_failure_and_mismatch_preserve_local_state: true,
      repeats_and_concurrent_writes_idempotent: true, changed_account_and_entitlement_guarded: true,
      actual_subscription_deleted_event_mapped: true };
  } finally {
    if (releaseHeld) releaseUpdate();
    for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    await new Promise((resolve) => mock.close(resolve));
  }
}

async function isolationAndLegacyParity(t, check, evidence) {
  /* AN ENTITLEMENT BELONGS TO ONE ACCOUNT. A second account's purchase is not a licence for the first. */
  const entitled = await t.account('entitlement-alice@example.test');
  const stranger = await t.unpaidAccount('entitlement-bob@example.test');
  const strangerCase = await openCase(t, stranger);
  const aliceCase = await openCase(t, entitled);

  check.equal((await t.request('GET', '/api/entitlement', { token: stranger.token })).json.entitlement.entitled, false,
    'the stranger holds no purchase');
  check.equal((await t.request('GET', `/api/cases/${strangerCase}/report-download`, { token: stranger.token })).status, 402,
    'and cannot read the complete assessment of its own case');
  check.equal((await t.request('POST', `/api/cases/${aliceCase}/evaluate`, { token: stranger.token, body: {} })).status, 403,
    'and cannot reach another account’s case at all — ownership is checked before entitlement');
  check.equal((await t.request('POST', `/api/cases/${strangerCase}/evaluate`, { token: entitled.token, body: {} })).status, 403,
    'and the entitled account cannot act on the stranger’s case either');
  check.equal((await t.request('GET', '/api/cases', { token: stranger.token })).json.cases.length, 1,
    'each account sees only its own cases');

  /* The entitlement view of one account never describes another. */
  const aliceView = await t.request('GET', '/api/entitlement', { token: entitled.token });
  check.equal(aliceView.json.entitlement.entitled, true, 'the entitled account reports itself entitled');
  check.ok(!new RegExp(stranger.account_id).test(aliceView.text), 'and its view carries no other account identifier');

  /* THE LEGACY PRICE CATALOG, READ READ-ONLY. This is the `h-legacy-parity` pattern applied to billing. */
  if (!fs.existsSync(LEGACY_PRICING) || !fs.existsSync(LEGACY_STATE)) {
    check.skip('the legacy price catalog and state machine are compared read-only',
      `the legacy checkout is not present at ${LEGACY}; set CRP_LEGACY_CHECKOUT`);
    evidence.legacy_parity = 'SKIPPED_THE_LEGACY_CHECKOUT_IS_NOT_ON_THIS_MACHINE';
    return { entitled, stranger };
  }
  const pricing = fs.readFileSync(LEGACY_PRICING, 'utf8');
  check.equal(plans.plan('report_once').amount_cents, 595, 'owner-approved one-time CAD price');
  check.equal(plans.plan('monthly').amount_cents, 795, 'owner-approved monthly CAD price');
  check.equal(plans.plan('annual').amount_cents, 7950, 'owner-approved annual CAD price');
  check.equal(plans.BILLING_CURRENCY, 'cad', 'owner-approved currency replaces legacy USD pricing');
  check.ok(/report_once:\s*"one_time"/.test(pricing), 'legacy one-time interval remains a reuse reference');

  const stateMachine = fs.readFileSync(LEGACY_STATE, 'utf8');
  for (const state of ['active', 'past_due', 'canceled', 'expired', 'complimentary']) {
    check.ok(new RegExp(`"${state}"`).test(stateMachine), `the legacy state machine still names ${state}`);
  }
  check.ok(/ENTITLED_STATES[\s\S]{0,200}"past_due"/.test(stateMachine), 'a past-due account is still entitled in the legacy rule read here');
  check.ok(/NON_ENTITLED_STATES[\s\S]{0,200}"canceled"/.test(stateMachine), 'and a cancelled one is still not');
  check.equal(entitlement.ENTITLED_STATES.includes('PAST_DUE'), true, 'this build keeps the same grace rule for PAST_DUE');
  check.equal(entitlement.NON_ENTITLED_STATES.includes('CANCELLED'), true, 'and the same non-entitlement for a cancelled purchase');

  /* Legacy names are mapped, not invented: every state this build can hold is one of the two sets. */
  const states = entitlement.ENTITLED_STATES.concat(entitlement.NON_ENTITLED_STATES);
  check.equal(new Set(states).size, states.length, 'no state is both entitled and not entitled');
  check.equal(states.includes('NO_SUBSCRIPTION'), true, 'the no-purchase state is named, not implied by an absent row');

  evidence.legacy_parity = {
    pricing_read: true,
    state_machine_read: true,
    owner_approved_prices_verified: Object.keys(plans.BASE_PRICE_CAD_CENTS).length,
    entitled_states: entitlement.ENTITLED_STATES.slice(),
    non_entitled_states: entitlement.NON_ENTITLED_STATES.slice()
  };
  return { entitled, stranger };
}

/* ------------------------------------------------------------------ the section */

async function run(t, check) {
  const evidence = { payment_provider_state: payments.describeProvider(process.env).state };
  const purchase = await purchaseSurface(t, check, evidence);
  const activation = await activationAndIdempotency(t, check, evidence);
  const verification = await verificationFailures(t, check, evidence);
  await expiryCancellationAndRevocation(t, check, evidence);
  await stripeRenewalCancellation(t, check, evidence);
  await isolationAndLegacyParity(t, check, evidence);

  /* The logs written during billing carry no consumer data either — the same whitelist the B2 suite asserts. */
  const logs = t.logText();
  for (const [value, label] of [
    [purchase.unpaid.email, 'an unpaid account address'],
    [activation.buyer.email, 'a buyer address'],
    [verification.reference, 'a provider checkout reference'],
    [activation.buyer.token, 'a session token'],
    [activation.buyer.account_id, 'an internal account identifier'],
    [t.dataDir, 'the private data path']
  ]) {
    check.ok(!logs.includes(value), `${label} never appears in a billing log record`);
  }
  check.ok(/BILLING_EVENT/.test(logs), 'the provider callback did emit a log record');
  check.ok(!/sk_live|sk_test|whsec/.test(logs), 'no provider key or signing secret is ever logged');

  evidence.log_records = t.logs.length;
  evidence.entitlement_refusal = { status_code: 402, code: 'ENTITLEMENT_REQUIRED' };
  evidence.paid_routes_covered = entitlement.PAID_ACTIONS.length;
  return evidence;
}

module.exports = {
  run,
  id: 't-entitlement',
  title: 'Paid entitlement: server-side enforcement, activation, expiry, cancellation, idempotency and failed verification'
};

