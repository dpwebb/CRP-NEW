'use strict';
/**
 * entitlement.cjs — persistent entitlement state and the SERVER-SIDE gate.
 *
 * OWNER-ALL82-001 / B4, plan section 8: "Payment entitlement is verified by the service; redirects and
 * client-side flags do not grant access." This module is that verification. It owns three things and nothing
 * else: what an account is entitled to, how that changes, and who may start paid work.
 *
 * REUSE LEDGER (shape only, read read-only from the legacy checkout, which is not imported or executed):
 *   • `services/subscriptionState.ts` — the explicit state set, the transition table, and the rule that a
 *     cancelled or expired consumer "retains READ-ONLY historical access … but is never entitled to new paid
 *     operations". State names differ here only where the legacy name would promise something this build does
 *     not do (there is no trial or complimentary grant, and none is invented).
 *   • `services/entitlement.ts` — the two SEPARATE questions, kept separate here: `canUsePaidProduct` (may
 *     start new paid work) and `canReadHistorical` (may read and may delete what is already theirs). Reading,
 *     status and DELETION are never gated, so an expired consumer can always remove their own data.
 *   • `services/billing/reportCredits.ts` — the one-time purchase is a credit that buys exactly one report
 *     lifecycle, reported as its own `access_via`; it is not folded into a subscription state.
 *   • `stripeClient.ts` / `planCatalog.ts` — single currency, fail closed with no key, and a payload
 *     fingerprint so a replayed body is recognised rather than re-applied.
 *
 * THE ONE INVARIANT. There is exactly ONE way an entitlement becomes ACTIVE: a provider event whose signature
 * verified against a configured signing secret (`recordEvent`). No request body, query parameter, cookie, URL
 * flag or provider redirect is ever read as evidence of payment. `tests/sections/t-entitlement.cjs` drives
 * every one of those shapes at the service and asserts each is refused.
 */

const crypto = require('node:crypto');
const { ServiceError } = require('./errors.cjs');
const plans = require('./plan-catalog.cjs');
const payments = require('./payment-provider.cjs');
const credits = require('./billing-credits.cjs');

/** States in which an account may start paid work. Derived from the legacy ENTITLED_STATES. */
const ENTITLED_STATES = Object.freeze(['ACTIVE', 'PAST_DUE', 'COMPLIMENTARY']);

/** States in which it may not — and in every one of them reading and DELETION still work. */
const NON_ENTITLED_STATES = Object.freeze(['NO_SUBSCRIPTION', 'PENDING', 'CANCELLED', 'EXPIRED']);

/** Which authority granted access. Never both, never a guess (legacy `accessVia`). */
const ACCESS_VIA = Object.freeze({ SUBSCRIPTION: 'SUBSCRIPTION', ONE_TIME_CREDIT: 'ONE_TIME_CREDIT', NONE: 'NONE' });

/**
 * The event types a provider may send, and what each one does. An unlisted type is refused rather than
 * ignored silently, so a provider adding a type cannot move an account by accident.
 */
const EVENT_EFFECTS = Object.freeze({
  'checkout.session.completed': 'ACTIVATE',
  'checkout.session.async_payment_succeeded': 'ACTIVATE',
  'invoice.paid': 'RENEW',
  'invoice.payment_failed': 'PAST_DUE',
  'subscription.deleted': 'CANCEL_AT_PERIOD_END',
  'charge.refunded': 'REVOKE',
  'charge.dispute.created': 'REVOKE'
});

const GRACE_HOURS_AFTER_A_FAILED_PAYMENT = 72;
const MAX_RECORDED_REJECTIONS = 50;
const IDEMPOTENCY_WINDOW_DAYS = 30;

/**
 * OWNER-PURCHASE-FLOW-001 (supersedes payment-before-assessment): the paid work is grouped as TWO separate
 * questions, never conflated.
 *
 *   • FREE for every signed-in account — uploading a report and running its assessment, the results summary
 *     (distinct issue counts) and the limited teaser, reading basic information about your own file, recording
 *     your own status and deleting your data.
 *   • A report's COMPLETE assessment and its download — needs a one-time unlock of THAT report, or a
 *     subscription.
 *   • SUBSCRIBER-ONLY — the dispute packet, the response draft and the report history/comparison.
 */
const PAID_ACTIONS = Object.freeze([
  'COMPLETE_ASSESSMENT',
  'DOWNLOAD_ASSESSMENT',
  'DISPUTE_PACKET',
  'REQUEST_RESPONSE_DRAFT',
  'REPORT_HISTORY_AND_COMPARISON'
]);

/** Actions that are never gated, for any signed-in account. */
const FREE_ACTIONS = Object.freeze([
  'UPLOAD_REPORT',
  'RUN_ASSESSMENT',
  'RESULTS_SUMMARY_AND_TEASER',
  'READ_BASIC_OWNED_FILE_INFORMATION',
  'RECORD_OWN_STATUS',
  'DELETE_OWN_DATA'
]);

/** The subscriber-only actions. A one-time report unlock never grants these. */
const SUBSCRIBER_ACTIONS = Object.freeze([
  'DISPUTE_PACKET',
  'REQUEST_RESPONSE_DRAFT',
  'REPORT_HISTORY_AND_COMPARISON'
]);

function newId(prefix) {
  return `${prefix}_${crypto.randomBytes(12).toString('hex')}`;
}

function nowIso(now) {
  return (now ? new Date(now) : new Date()).toISOString();
}

function addDays(fromIso, days) {
  return new Date(new Date(fromIso).getTime() + days * 86400000).toISOString();
}

/**
 * The state a row has NOW. Expiry is applied on read AND swept on write, so a long-idle process cannot report
 * a lapsed entitlement as active, and the persisted row catches up the next time anything is written.
 */
function observed(row, at) {
  if (ENTITLED_STATES.includes(row.state) && row.expires_at && row.expires_at <= at) {
    return Object.assign({}, row, { state: 'EXPIRED', expired_at: row.expires_at });
  }
  if (row.state === 'CANCELLED' && row.expires_at && row.expires_at <= at) {
    return Object.assign({}, row, { state: 'EXPIRED', expired_at: row.expires_at });
  }
  return row;
}

/** Write the observed expiry back into every row of the store. Returns how many rows changed. */
function sweepExpired(state, at) {
  let changed = 0;
  for (const row of state.entitlements || []) {
    const after = observed(row, at);
    if (after.state !== row.state) {
      row.state = after.state;
      row.expired_at = after.expired_at;
      changed += 1;
    }
  }
  for (const session of state.checkout_sessions || []) {
    if (session.state === 'OPEN' && session.expires_at <= at) {
      session.state = 'EXPIRED';
      changed += 1;
      // Release its reserved credit. The 90-day window is from paid_at, not extended by this.
      for (const c of state.upgrade_credits || []) {
        if (c.state === 'RESERVED' && c.reserved_for_checkout_id === session.checkout_id) {
          c.state = 'ELIGIBLE';
          c.reserved_for_checkout_id = null;
          c.reserved_at = null;
        }
      }
    }
  }
  for (const c of state.upgrade_credits || []) {
    if ((c.state === 'ELIGIBLE' || c.state === 'RESERVED') && c.expires_at && c.expires_at <= at) {
      c.state = 'EXPIRED';
      c.reserved_for_checkout_id = null;
      c.reserved_at = null;
      changed += 1;
    }
  }
  return changed;
}

/**
 * The controlling row: what the account's entitlement ACTUALLY is, not merely what was last written.
 *
 * The order matters and is the whole point of this function. An unpaid PENDING intent must never be reported
 * as the account's state while a settled row exists, or a consumer who abandoned one checkout and paid through
 * another would be told they hold no purchase. So: an entitled row with the furthest expiry wins; then the most
 * recently settled row; and a PENDING row is only ever reported when there is nothing settled to report.
 */
function controlling(rows, at) {
  const settled = rows.map((row) => observed(row, at));
  const live = settled.filter((row) => ENTITLED_STATES.includes(row.state));
  if (live.length) return live.sort((a, b) => (String(b.expires_at) > String(a.expires_at) ? 1 : -1))[0];
  const resolved = settled.filter((row) => row.state !== 'PENDING');
  if (resolved.length) return resolved[resolved.length - 1];
  return settled.length ? settled[settled.length - 1] : null;
}

/**
 * The account's entitlement, derived and never stored as a separate flag. `can_use_paid_product` and
 * `can_read_historical` are two different answers, and the second one is always true while the account exists.
 */
function statusFor(store, accountId, options) {
  const opts = options || {};
  const at = nowIso(opts.now);
  const row = controlling(rowsFor(store.state(), accountId), at);
  const settled = row ? observed(row, at) : null;
  const entitled = Boolean(settled) && ENTITLED_STATES.includes(settled.state);
  const state = settled ? settled.state : 'NO_SUBSCRIPTION';
  return {
    account_id: accountId,
    state,
    entitled,
    can_use_paid_product: entitled,
    can_read_historical: true,
    access_via: entitled ? (settled.access_via || ACCESS_VIA.NONE) : ACCESS_VIA.NONE,
    plan_code: settled ? settled.plan_code : null,
    granted_at: settled ? settled.granted_at : null,
    expires_at: settled ? settled.expires_at : null,
    cancel_at_period_end: Boolean(settled && settled.cancel_at_period_end),
    grace_until: settled ? settled.grace_until || null : null,
    reason: entitled ? 'AN_ENTITLED_PURCHASE_IS_RECORDED' : (settled ? `NOT_ENTITLED:${state}` : 'NO_PURCHASE_IS_RECORDED'),
    source: settled ? settled.source : null,
    /* WHY access ended, when it has: a refund, a cancellation or simple lapse are different answers and the
       consumer surface says which one. `EXPIRED` alone would hide a refund behind a calendar. */
    access_ended_because: !entitled && settled
      ? (settled.access_revoked_reason || (settled.cancelled_at ? 'THE_PURCHASE_WAS_CANCELLED' : (settled.state === 'EXPIRED' ? 'THE_RECORDED_PERIOD_ENDED' : null)))
      : null,
    is_a_working_payment: false,
    plain: entitled
      ? 'A purchase is recorded against this account, so paid work can start.'
      : 'No active purchase is recorded against this account. Reading what you already have, and deleting it, stay available.'
  };
}

/** The single place a paid action is refused. Thrown from the transport layer, never decided by the UI. */
function requirePaid(store, actor) {
  const status = statusFor(store, actor.account_id);
  if (!status.entitled) {
    throw new ServiceError('ENTITLEMENT_REQUIRED', { state: status.state, reason: status.reason });
  }
  return status;
}

/* --------------------------------------------------------------- the two purchase questions, kept apart */

/** Whether a subscription is recorded and still live. The one question that unlocks subscriber features. */
function subscriptionAccess(store, actor) {
  const status = statusFor(store, actor.account_id);
  const subscribed = Boolean(status.entitled) && status.access_via === ACCESS_VIA.SUBSCRIPTION;
  return { subscribed, status };
}

/**
 * The cases this account unlocked with a one-time purchase, while that purchase is still live. The binding is
 * the recorded purchase for a named case (`purchased_downloads`), never a client claim.
 */
function unlockedCaseIds(store, actor) {
  const at = nowIso();
  const liveOneTime = rowsFor(store.state(), actor.account_id)
    .map((row) => observed(row, at))
    .find((row) => row && ENTITLED_STATES.includes(row.state) && (row.access_via || ACCESS_VIA.NONE) === ACCESS_VIA.ONE_TIME_CREDIT);
  if (!liveOneTime) return [];
  return [...new Set((store.state().purchased_downloads || [])
    .filter((d) => d.account_id === actor.account_id && d.case_id)
    .map((d) => d.case_id))];
}

/**
 * Whether this account may read the COMPLETE assessment of this case, and on what authority. A subscription
 * covers every report; a one-time unlock covers only the report it was bought for.
 */
function assessmentAccess(store, actor, caseId) {
  const sub = subscriptionAccess(store, actor);
  if (sub.subscribed) {
    return { complete_assessment: true, download: true, via: 'SUBSCRIPTION', case_id: caseId || null };
  }
  if (caseId && unlockedCaseIds(store, actor).includes(caseId)) {
    return { complete_assessment: true, download: true, via: 'ONE_TIME_CREDIT', case_id: caseId };
  }
  return { complete_assessment: false, download: false, via: 'NONE', case_id: caseId || null };
}

/** The gate for a report's complete assessment (and its download). */
function requireAssessmentAccess(store, actor, caseId) {
  const access = assessmentAccess(store, actor, caseId);
  if (!access.complete_assessment) {
    throw new ServiceError('ASSESSMENT_ACCESS_REQUIRED', {
      case_id: caseId || null,
      purchase: 'unlock_this_report_or_subscribe'
    });
  }
  return access;
}

/** The gate for every subscriber-only feature. A one-time report unlock never satisfies it. */
function requireSubscriberFeature(store, actor) {
  const sub = subscriptionAccess(store, actor);
  if (!sub.subscribed) {
    throw new ServiceError('SUBSCRIPTION_REQUIRED', {
      state: sub.status.state,
      access_via: sub.status.access_via || ACCESS_VIA.NONE
    });
  }
  return sub.status;
}

/** What a selected plan grants, and how long its period is, in one place. */
function periodFor(planCode, event) {
  const grant = plans.GRANTS[planCode];
  if (!grant) return null;
  if (event && typeof event.period_end === 'string' && !Number.isNaN(Date.parse(event.period_end))) {
    return { expires_at: new Date(event.period_end).toISOString(), basis: 'THE_PROVIDER_STATED_THE_PERIOD_END' };
  }
  return { expires_at: addDays(new Date().toISOString(), grant.period_days), basis: 'THE_CATALOG_RECORDED_THE_PERIOD' };
}


function addHours(fromIso, hours) {
  return new Date(new Date(fromIso).getTime() + hours * 3600000).toISOString();
}

function rowsFor(state, accountId) {
  return (state.entitlements || []).filter((row) => row.account_id === accountId);
}

/* ------------------------------------------------------------------ the purchase surface */

/**
 * The plans this account can buy, plus its own entitlement and the provider state. Billing routes are
 * deliberately NOT paid-gated: they are how an unentitled account becomes entitled, and gating them would make
 * the product unbuyable. They are still actor-scoped, and the actor always comes from the resolved session.
 */
function plansView(store, actor, env) {
  const catalog = plans.catalog();
  const provider = payments.describeProvider(env);
  const upgradeCredit = credits.creditView(store, actor.account_id, nowIso());
  return {
    plan_catalog: catalog,
    entitlement: statusFor(store, actor.account_id),
    upgrade_credit: upgradeCredit,
    payment: {
      state: provider.state,
      provider_id: provider.provider_id,
      display_name: provider.display_name,
      is_a_working_payment: provider.is_a_working_payment === true,
      plain: provider.plain,
      exact_external_dependency: provider.exact_external_dependency,
      purchase_is_possible: provider.is_a_working_payment === true
    },
    plain: provider.state === 'STRIPE_CONFIGURED'
      ? 'These CAD prices are recorded and Stripe is connected. A one-time purchase earns a once-only CAD 5.95 credit toward a first monthly or annual invoice within 90 days; renewals stay full price.'
      : (provider.state === 'NOT_CONFIGURED'
        ? 'These plans are recorded, but no payment provider is connected, so nothing can be purchased and no access can be activated.'
        : 'These plans are recorded. The connected provider is a TEST ADAPTER, so nothing can actually be purchased.')
  };
}

/**
 * Open a checkout intent. Fails closed when no provider is usable — no intent, no entitlement, no access.
 *
 * B4-PAY-001: a subscription checkout atomically reserves an eligible upgrade credit BEFORE the provider
 * session is created, so two concurrent upgrades cannot both apply the same credit, and the credit is released
 * if the provider call fails. `case_id` binds a one-time purchase to the case whose report it will download.
 */
async function openCheckout(store, actor, input, env) {
  const body = input || {};
  const planCode = typeof body.plan_code === 'string' ? body.plan_code : '';
  if (!plans.isPlanCode(planCode)) throw new ServiceError('UNKNOWN_PLAN', { requested: planCode || null });
  const provider = payments.resolveProvider(env);
  const described = payments.describeProvider(env);
  if (!provider) {
    throw new ServiceError('PAYMENT_PROVIDER_NOT_CONFIGURED', {
      provider_state: described.state,
      reason: described.reason,
      exact_external_dependency: described.exact_external_dependency
    });
  }
  const plan = plans.plan(planCode);
  const returnUrl = typeof body.return_url === 'string' && /^https?:\/\//.test(body.return_url) ? body.return_url : null;
  const caseId = typeof body.case_id === 'string' && body.case_id ? body.case_id : null;

  const now = nowIso();
  const checkoutId = newId('chk');

  // Reserve the upgrade credit atomically for a subscription checkout.
  let reservation = { reserved: false };
  if (planCode !== 'report_once') {
    reservation = credits.reserveCredit(store, actor.account_id, checkoutId, now);
  }

  let opened;
  try {
    opened = await provider.createCheckout({
      account_id: actor.account_id,
      plan_code: planCode,
      return_url: returnUrl,
      checkout_id: checkoutId,
      apply_upgrade_credit: reservation.reserved === true
    });
  } catch (err) {
    if (reservation.reserved) credits.releaseCredit(store, checkoutId);
    throw new ServiceError('CHECKOUT_OPEN_FAILED', { reason: err && err.message ? err.message : String(err) });
  }

  const checkout = store.update((state) => {
    const created = {
      checkout_id: checkoutId,
      account_id: actor.account_id,
      plan_code: planCode,
      case_id: caseId,
      amount_cents: plan.amount_cents,
      currency: plan.currency,
      provider_id: provider.provider_id,
      provider_reference: opened.provider_reference,
      credit_reserved: reservation.reserved === true,
      credit_applied_cents: reservation.reserved ? reservation.amount_cents : 0,
      state: 'OPEN',
      created_at: now,
      expires_at: addHours(now, 24)
    };
    state.checkout_sessions.push(created);
    state.entitlements.push({
      entitlement_id: newId('ent'),
      account_id: actor.account_id,
      plan_code: planCode,
      state: 'PENDING',
      source: provider.is_a_working_payment ? provider.provider_id : 'TEST_ADAPTER_NOT_A_PAYMENT',
      access_via: plans.GRANTS[planCode].access_via,
      checkout_id: created.checkout_id,
      provider_reference: opened.provider_reference,
      created_at: now,
      granted_at: null,
      expires_at: null,
      event_ids: []
    });
    return created;
  });

  const quote = planCode === 'report_once'
    ? null
    : {
        reserved: reservation.reserved,
        credit_cents: reservation.reserved ? reservation.amount_cents : 0,
        first_invoice_cents: reservation.reserved ? plan.amount_cents - reservation.amount_cents : plan.amount_cents,
        renewal_cents: plan.amount_cents
      };

  return {
    checkout_id: checkout.checkout_id,
    plan,
    provider_id: provider.provider_id,
    provider_is_a_working_payment: provider.is_a_working_payment === true,
    provider_reference: checkout.provider_reference,
    /* A redirect is a DESTINATION, never a grant. Nothing downstream reads this URL for authorization. */
    redirect_url: opened.redirect_url,
    redirect_grants_nothing: true,
    upgrade_credit: quote,
    entitlement: statusFor(store, actor.account_id),
    plain: 'A checkout intent was opened. Access changes only when the provider sends a signed event that verifies; returning from the redirect does nothing.'
  };
}

/**
 * Server-side re-verification of a checkout. The provider holds the truth; the client is re-checked against it
 * and never believed on its word. Confirmation grants nothing — the provider event is still the only grant.
 */
async function confirmCheckout(store, actor, input, env) {
  const body = input || {};
  const provider = payments.resolveProvider(env);
  const described = payments.describeProvider(env);
  if (!provider) {
    throw new ServiceError('PAYMENT_PROVIDER_NOT_CONFIGURED', {
      provider_state: described.state,
      reason: described.reason,
      exact_external_dependency: described.exact_external_dependency
    });
  }
  const reference = typeof body.provider_reference === 'string' ? body.provider_reference : '';
  const owned = (store.state().checkout_sessions || []).filter(
    (row) => row.account_id === actor.account_id && row.provider_reference === reference
  );
  if (!owned.length) throw new ServiceError('CHECKOUT_NOT_FOUND', { reference_present: Boolean(reference) });
  const queried = await provider.queryCheckout({ provider_reference: reference });
  if (queried.paid !== true) throw new ServiceError('CHECKOUT_NOT_CONFIRMED_BY_PROVIDER', { outcome: queried.outcome });
  return {
    confirmed: true,
    outcome: queried.outcome,
    provider_reference: reference,
    entitlement: statusFor(store, actor.account_id),
    plain: 'The provider re-confirmed this checkout as paid. Access itself is granted only by the verified provider event, never by this confirmation.'
  };
}



/* ------------------------------------------------------------------ the one way in */

/**
 * The SEMANTIC fingerprint of an event: what it says, not the bytes that said it.
 *
 * A provider that retries commonly sends the same event again under a fresh identifier, and a byte-level
 * fingerprint would call that a new event and apply it a second time. Fingerprinting the identity-relevant
 * fields instead means "the same purchase, re-sent" is recognised however it is wrapped. This is the idea the
 * legacy `payloadFingerprint` records, applied to the fields that can actually move an entitlement.
 */
function eventFingerprint(event) {
  const relevant = [
    String(event.type),
    String(event.account_reference),
    String(event.plan_code),
    String(event.session_reference),
    event.amount_cents === null || event.amount_cents === undefined ? '' : String(event.amount_cents),
    event.currency ? String(event.currency) : '',
    event.period_end ? String(event.period_end) : ''
  ];
  return crypto.createHash('sha256').update(relevant.join('\u0000'), 'utf8').digest('hex');
}

/** Record a refusal WITHOUT keeping the payload: a fingerprint and a reason, no body, no consumer data. */
function recordRejection(store, providerId, fingerprint, reason, eventId) {
  store.update((state) => {
    state.billing_events.push({
      event_id: eventId || null,
      provider_id: providerId,
      fingerprint: fingerprint || null,
      received_at: nowIso(),
      outcome: 'REJECTED',
      effect: null,
      reason: reason || 'REFUSED',
      entitlement_id: null,
      account_id: null
    });
    const rejected = state.billing_events.filter((row) => row.outcome === 'REJECTED');
    if (rejected.length > MAX_RECORDED_REJECTIONS) {
      const excess = rejected.length - MAX_RECORDED_REJECTIONS;
      const doomed = new Set(rejected.slice(0, excess).map((row) => `${row.received_at}|${row.fingerprint}|${row.reason}`));
      state.billing_events = state.billing_events.filter(
        (row) => !(row.outcome === 'REJECTED' && doomed.has(`${row.received_at}|${row.fingerprint}|${row.reason}`))
      );
    }
    return true;
  });
}

function applyEffect(row, effect, planCode, event, at) {
  if (effect === 'ACTIVATE') {
    const period = periodFor(planCode, event);
    row.state = 'ACTIVE';
    row.granted_at = at;
    row.expires_at = period.expires_at;
    row.granted_basis = period.basis;
    row.cancelled_at = null;
    row.grace_until = null;
    row.cancel_at_period_end = false;
  } else if (effect === 'RENEW') {
    const period = periodFor(planCode, event);
    row.state = 'ACTIVE';
    row.expires_at = row.expires_at && row.expires_at > period.expires_at ? row.expires_at : period.expires_at;
    row.granted_basis = period.basis;
    row.grace_until = null;
  } else if (effect === 'PAST_DUE') {
    row.state = 'PAST_DUE';
    row.grace_until = addHours(at, GRACE_HOURS_AFTER_A_FAILED_PAYMENT);
  } else if (effect === 'CANCEL_AT_PERIOD_END') {
    row.cancel_at_period_end = true;
    row.cancelled_at = at;
  } else if (effect === 'REVOKE') {
    row.state = 'CANCELLED';
    row.cancelled_at = at;
    row.expires_at = at;
    row.access_revoked_reason = 'THE_PROVIDER_RECORDED_A_REFUND';
  }
  return row;
}

/**
 * Receive one provider event. This is the ONLY function in the service that can move an account into an
 * entitled state, and it does so only after the provider's signature verified against a configured secret.
 *
 * A duplicate event id — or a different id carrying a byte-identical body already settled — is reported as a
 * duplicate and changes nothing, so a provider that retries cannot double-grant and a captured body cannot be
 * re-applied.
 */
async function recordEvent(store, input, env) {
  const req = input || {};
  const provider = payments.resolveProvider(env);
  const described = payments.describeProvider(env);
  if (!provider) {
    throw new ServiceError('PAYMENT_PROVIDER_NOT_CONFIGURED', {
      provider_state: described.state,
      reason: described.reason,
      exact_external_dependency: described.exact_external_dependency
    });
  }
  const rawBody = typeof req.rawBody === 'string' ? req.rawBody : '';
  const verified = await provider.verifyEvent({ rawBody, headers: req.headers || {} });
  if (!verified.verified) {
    recordRejection(store, provider.provider_id, verified.fingerprint, verified.reason, null);
    throw new ServiceError('BILLING_EVENT_SIGNATURE_INVALID', { reason: verified.reason });
  }
  const event = verified.event;
  if (event.mismatch) {
    recordRejection(store, provider.provider_id, verified.fingerprint, event.mismatch, event.event_id);
    throw new ServiceError('BILLING_EVENT_REJECTED', { reason: event.mismatch });
  }
  const effect = EVENT_EFFECTS[event.type];
  if (!effect) {
    recordRejection(store, provider.provider_id, verified.fingerprint, 'UNSUPPORTED_EVENT_TYPE', event.event_id);
    throw new ServiceError('BILLING_EVENT_TYPE_UNSUPPORTED', { event_type: event.type });
  }

  const before = store.state();
  const fingerprint = eventFingerprint(event);
  const settled = before.billing_events.find(
    (row) => row.outcome === 'APPLIED' && (row.event_id === event.event_id || (row.fingerprint && row.fingerprint === fingerprint))
  );
  if (settled) {
    return {
      accepted: true,
      duplicate: true,
      event_id: event.event_id,
      type: event.type,
      effect: settled.effect,
      applied_to: settled.entitlement_id,
      entitlement: statusFor(store, event.account_reference),
      plain: 'This event had already been recorded, so nothing changed. Re-sending it cannot grant a second activation.'
    };
  }

  const account = before.accounts.find((row) => row.account_id === event.account_reference);
  if (!account) {
    recordRejection(store, provider.provider_id, verified.fingerprint, 'EVENT_IGNORED_ACCOUNT_UNKNOWN', event.event_id);
    return { accepted: false, duplicate: false, reason: 'EVENT_IGNORED_ACCOUNT_UNKNOWN', entitlement: null };
  }

  // Only a successful payment grants anything. An unpaid checkout-completed event is recorded and refused.
  if (effect === 'ACTIVATE' && event.payment_verified === false) {
    recordRejection(store, provider.provider_id, verified.fingerprint, 'EVENT_IGNORED_UNPAID_CHECKOUT', event.event_id);
    return { accepted: false, duplicate: false, reason: 'EVENT_IGNORED_UNPAID_CHECKOUT', entitlement: statusFor(store, account.account_id) };
  }

  // ACTIVATE is the only effect that resolves through a checkout; renewal/failure/cancellation/refund operate
  // on the account's controlling entitlement row, which an earlier activation established.
  const checkout = effect === 'ACTIVATE'
    ? (before.checkout_sessions || []).find(
        (row) => row.account_id === account.account_id && row.provider_reference === event.session_reference
      )
    : null;
  if (effect === 'ACTIVATE' && !checkout) {
    recordRejection(store, provider.provider_id, verified.fingerprint, 'EVENT_IGNORED_CHECKOUT_UNKNOWN', event.event_id);
    return { accepted: false, duplicate: false, reason: 'EVENT_IGNORED_CHECKOUT_UNKNOWN', entitlement: statusFor(store, account.account_id) };
  }
  if (effect === 'ACTIVATE' && checkout.plan_code !== event.plan_code) {
    recordRejection(store, provider.provider_id, verified.fingerprint, 'EVENT_IGNORED_PLAN_MISMATCH', event.event_id);
    return { accepted: false, duplicate: false, reason: 'EVENT_IGNORED_PLAN_MISMATCH', entitlement: statusFor(store, account.account_id) };
  }

  const at = nowIso();
  const applied = store.update((state) => {
    const liveCheckout = checkout ? state.checkout_sessions.find((row) => row.checkout_id === checkout.checkout_id) : null;
    const rows = rowsFor(state, account.account_id);
    const row = effect === 'ACTIVATE'
      ? rows.find((candidate) => candidate.state === 'PENDING' && candidate.provider_reference === event.session_reference)
      : controlling(rows, at);
    if (!row) return null;
    applyEffect(row, effect, event.plan_code, event, at);
    if (effect === 'ACTIVATE' && liveCheckout) liveCheckout.state = 'COMPLETED';
    row.event_ids = (row.event_ids || []).concat([event.event_id]);
    row.last_event_type = event.type;
    row.updated_at = at;

    // B4-PAY-001: credit + download lifecycle, atomic with the entitlement change.
    if (effect === 'ACTIVATE' && event.plan_code === 'report_once') {
      const paidAt = event.occurred_at || at;
      if (!(state.upgrade_credits || []).some((c) => c.payment_id === event.session_reference)) {
        state.upgrade_credits.push({
          credit_id: newId('crd'),
          account_id: account.account_id,
          payment_id: event.session_reference,
          payment_intent: event.payment_intent || null,
          amount_cents: 595,
          currency: 'cad',
          state: 'ELIGIBLE',
          paid_at: paidAt,
          expires_at: credits.expiresAt(paidAt),
          reserved_for_checkout_id: null,
          reserved_at: null,
          redeemed_at: null,
          redeemed_checkout_id: null,
          redeemed_plan_code: null,
          revoked_reason: null
        });
      }
      if (liveCheckout && liveCheckout.case_id &&
          !(state.purchased_downloads || []).some((d) => d.account_id === account.account_id && d.case_id === liveCheckout.case_id)) {
        state.purchased_downloads.push({
          purchase_id: newId('dl'),
          account_id: account.account_id,
          case_id: liveCheckout.case_id,
          checkout_id: liveCheckout.checkout_id,
          provider_reference: event.session_reference,
          created_at: at
        });
      }
    }
    if (effect === 'ACTIVATE' && event.plan_code !== 'report_once' && liveCheckout) {
      const reserved = (state.upgrade_credits || []).find(
        (c) => c.state === 'RESERVED' && c.reserved_for_checkout_id === liveCheckout.checkout_id
      );
      if (reserved) {
        reserved.state = 'REDEEMED';
        reserved.redeemed_at = at;
        reserved.redeemed_checkout_id = liveCheckout.checkout_id;
        reserved.redeemed_plan_code = event.plan_code;
        reserved.reserved_for_checkout_id = null;
      }
    }
    if (effect === 'REVOKE' && event.payment_intent) {
      for (const c of state.upgrade_credits || []) {
        if (c.account_id === account.account_id && c.payment_intent === event.payment_intent && (c.state === 'ELIGIBLE' || c.state === 'RESERVED')) {
          c.state = 'REVOKED';
          c.revoked_reason = 'THE_UNDERLYING_PAYMENT_WAS_REFUNDED_OR_DISPUTED';
          c.reserved_for_checkout_id = null;
          c.reserved_at = null;
        }
      }
    }

    state.billing_events.push({
      event_id: event.event_id,
      provider_id: provider.provider_id,
      fingerprint,
      received_at: at,
      outcome: 'APPLIED',
      effect,
      reason: null,
      entitlement_id: row.entitlement_id,
      account_id: account.account_id,
      type: event.type
    });
    return { entitlement_id: row.entitlement_id, state: row.state, expires_at: row.expires_at };
  });

  return {
    accepted: true,
    duplicate: false,
    event_id: event.event_id,
    type: event.type,
    effect,
    applied_to: applied ? applied.entitlement_id : null,
    entitlement: statusFor(store, account.account_id),
    plain: effect === 'ACTIVATE'
      ? 'A verified provider event granted this purchase, and the entitlement is now recorded against the account.'
      : `A verified provider event applied ${effect}.`
  };
}

/* ------------------------------------------------------------------ leaving, and the read view */

/**
 * A consumer stops their own purchase. Time already paid for is not confiscated: the entitlement keeps running
 * to its recorded expiry and simply does not renew. An UNPAID checkout is cancelled outright. A purchase whose
 * access has ALREADY ended — expired, or revoked by a refund — is refused, because there is nothing left to
 * stop and answering "cancelled" would suggest access was still running.
 */
function cancelEntitlement(store, actor, input) {
  const body = input || {};
  const at = nowIso();
  const outcome = store.update((state) => {
    const row = controlling(rowsFor(state, actor.account_id), at);
    if (!row) return { cancelled: false, reason: 'NO_PURCHASE_IS_RECORDED' };
    if (row.state === 'PENDING') {
      row.state = 'CANCELLED';
      row.cancelled_at = at;
      for (const session of state.checkout_sessions) if (session.checkout_id === row.checkout_id) session.state = 'CANCELLED';
      return { cancelled: true, at_period_end: false, entitlement_id: row.entitlement_id, reason: 'AN_UNPAID_CHECKOUT_WAS_CANCELLED' };
    }
    if (!ENTITLED_STATES.includes(row.state)) {
      return { cancelled: false, reason: `NOTHING_LEFT_TO_CANCEL:${row.state}` };
    }
    row.cancel_at_period_end = true;
    row.cancelled_at = at;
    row.cancellation_reason = typeof body.reason === 'string' ? body.reason.slice(0, 120) : 'CONSUMER_REQUESTED';
    row.updated_at = at;
    return { cancelled: true, at_period_end: true, entitlement_id: row.entitlement_id, reason: 'ACCESS_CONTINUES_TO_THE_RECORDED_EXPIRY' };
  });
  if (!outcome.cancelled) throw new ServiceError('NO_ACTIVE_PURCHASE_TO_CANCEL', { reason: outcome.reason });
  return Object.assign(outcome, {
    entitlement: statusFor(store, actor.account_id),
    plain: outcome.at_period_end
      ? 'Your purchase will not renew. Access continues until the expiry already recorded against your account, and what you have already made stays readable.'
      : 'The unpaid checkout was cancelled, so no access was ever granted.'
  });
}

/** Write every observed expiry back into the store. Called on start and by the retention sweep. */
function sweep(store, now) {
  const at = nowIso(now);
  return store.update((state) => sweepExpired(state, at));
}

/** Whether an account may download one case's assessment report: a purchased download bound to it, or a
 *  subscription active now. A one-time purchase never widens into unlimited downloads. */
function downloadEntitled(store, actor, caseId) {
  const status = statusFor(store, actor.account_id);
  const viaSubscription = status.entitled && status.access_via === ACCESS_VIA.SUBSCRIPTION;
  const purchased = (store.state().purchased_downloads || []).some(
    (d) => d.account_id === actor.account_id && d.case_id === caseId
  );
  return {
    entitled: viaSubscription || purchased,
    via: viaSubscription ? 'SUBSCRIPTION' : (purchased ? 'ONE_TIME_PURCHASE' : 'NONE'),
    purchased_case: purchased,
    subscription: viaSubscription
  };
}

/** The upgrade-credit position: eligibility, amount, expiry and remaining time. */
function creditView(store, actor, now) {
  return credits.creditView(store, actor.account_id, nowIso(now));
}

/** What the consumer surface may say about entitlement. No internal identifier and no gate number appears. */
function entitlementView(store, actor, env) {
  const provider = payments.describeProvider(env);
  const status = statusFor(store, actor.account_id);
  return {
    entitlement: status,
    paid_actions: PAID_ACTIONS.slice(),
    paid_actions_require: 'a recorded purchase; the service refuses them without one, whatever the page says',
    never_gated: Object.freeze([
      'reading the cases, files and results you already have',
      'recording your own case status',
      'deleting a case, a stored file or your whole account'
    ]),
    not_granted: plans.NOT_GRANTED.slice(),
    payment: {
      state: provider.state,
      provider_id: provider.provider_id,
      is_a_working_payment: provider.is_a_working_payment === true,
      plain: provider.plain,
      exact_external_dependency: provider.exact_external_dependency
    },
    upgrade_credit: credits.creditView(store, actor.account_id, nowIso()),
    plain: status.entitled
      ? 'This account holds a recorded purchase.'
      : 'This account holds no active purchase. Everything you have already made stays readable, and you can always delete it.'
  };
}

module.exports = {
  ENTITLED_STATES,
  NON_ENTITLED_STATES,
  ACCESS_VIA,
  EVENT_EFFECTS,
  PAID_ACTIONS,
  FREE_ACTIONS,
  SUBSCRIBER_ACTIONS,
  subscriptionAccess,
  unlockedCaseIds,
  assessmentAccess,
  requireAssessmentAccess,
  requireSubscriberFeature,
  GRACE_HOURS_AFTER_A_FAILED_PAYMENT,
  MAX_RECORDED_REJECTIONS,
  IDEMPOTENCY_WINDOW_DAYS,
  statusFor,
  requirePaid,
  sweep,
  sweepExpired,
  observed,
  controlling,
  eventFingerprint,
  addDays,
  addHours,
  plansView,
  openCheckout,
  confirmCheckout,
  recordEvent,
  cancelEntitlement,
  entitlementView,
  downloadEntitled,
  creditView
};
