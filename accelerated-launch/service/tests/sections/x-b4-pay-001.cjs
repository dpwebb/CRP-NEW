'use strict';
/**
 * x-b4-pay-001.cjs — OWNER-ALL82-001 / B4-PAY-001: the once-only CAD upgrade credit and the paid
 * assessment-report download, driven over HTTP with the test adapter. The store is read directly only to
 * assert credit state transitions. The Stripe adapter is exercised against test mode separately.
 */

const crypto = require('node:crypto');
const { sweep } = require('../../entitlement.cjs');

async function payWithBody(service, actor, body) {
  const checkout = await service.request('POST', '/api/billing/checkout', { token: actor.token, body });
  if (checkout.status !== 201) throw new Error(`checkout failed: ${checkout.status} ${checkout.text}`);
  const c = checkout.json.checkout;
  const event = {
    id: `test_evt_${crypto.randomBytes(8).toString('hex')}`,
    type: 'checkout.session.completed',
    account_reference: actor.account_id,
    plan_code: c.plan.plan_code,
    session_reference: c.provider_reference,
    amount_cents: c.upgrade_credit?.first_invoice_cents ?? c.plan.amount_cents,
    currency: c.plan.currency,
    payment_intent: body.payment_intent || `test_pi_${crypto.randomBytes(6).toString('hex')}`,
    occurred_at: new Date().toISOString()
  };
  const posted = await service.postEvent(event);
  if (posted.status !== 200) throw new Error(`event failed: ${posted.status} ${posted.text}`);
  return { checkout, event, posted };
}

async function run(service, check) {
  const store = () => service.service.store;
  const credits = () => store().state().upgrade_credits;

  /* ---- 1. A verified one-time payment earns exactly one eligible credit. ---- */
  const a = await service.unpaidAccount('credit-a@example.test');
  await payWithBody(service, a, { plan_code: 'report_once', case_id: await service.assessedCase(a) });
  check.equal(credits().length, 1, 'a verified one-time payment earns one credit');
  check.equal(credits()[0].state, 'ELIGIBLE', 'which starts ELIGIBLE');
  check.equal(credits()[0].amount_cents, 595, 'worth CAD 5.95');

  /* ---- 2. A monthly checkout atomically reserves it and quotes the first-invoice credit. ---- */
  const monthly = await service.openCheckout(a, 'monthly');
  check.equal(monthly.status, 201, 'monthly checkout opens');
  check.equal(monthly.json.checkout.upgrade_credit.reserved, true, 'and the credit is reserved');
  check.equal(monthly.json.checkout.upgrade_credit.first_invoice_cents, 200, 'first invoice subtotal CAD 2.00');
  check.equal(monthly.json.checkout.upgrade_credit.renewal_cents, 795, 'renewal stays CAD 7.95');
  check.equal(credits()[0].state, 'RESERVED', 'state is RESERVED');

  /* ---- 3. A concurrent annual checkout cannot use the same credit twice. ---- */
  const annual = await service.openCheckout(a, 'annual');
  check.equal(annual.status, 409, 'a concurrent annual checkout is refused before a second renewing plan can be opened');
  check.equal(credits()[0].reserved_for_checkout_id, monthly.json.checkout.checkout_id, 'the original checkout keeps its single reservation');

  /* ---- 4. Paying the reserved monthly checkout redeems the credit. ---- */
  const mPay = await service.postEvent({
    id: `test_evt_${crypto.randomBytes(8).toString('hex')}`,
    type: 'checkout.session.completed',
    account_reference: a.account_id,
    plan_code: 'monthly',
    session_reference: monthly.json.checkout.provider_reference,
    amount_cents: 200,
    currency: 'cad',
    occurred_at: new Date().toISOString()
  });
  check.equal(mPay.status, 200, 'monthly payment accepted');
  check.equal(credits()[0].state, 'REDEEMED', 'and the credit is REDEEMED');
  check.equal(credits()[0].redeemed_plan_code, 'monthly', 'and records the plan it redeemed for');

  /* ---- 5. A failed checkout releases its reservation. ---- */
  const b = await service.unpaidAccount('credit-b@example.test');
  await payWithBody(service, b, { plan_code: 'report_once', case_id: await service.assessedCase(b) });
  const bMonthly = await service.openCheckout(b, 'monthly');
  check.equal(bMonthly.json.checkout.upgrade_credit.reserved, true, 'second account reserves');
  store().update((state) => {
    for (const s of state.checkout_sessions) {
      if (s.checkout_id === bMonthly.json.checkout.checkout_id) s.expires_at = new Date(Date.now() - 1000).toISOString();
    }
    return true;
  });
  sweep(store(), new Date());
  const bCredit = credits().find((c) => c.account_id === b.account_id);
  check.equal(bCredit.state, 'ELIGIBLE', 'an expired checkout releases the reservation without extending the window');

  /* ---- 6. A refunded one-time payment revokes its credit. ---- */
  const c = await service.unpaidAccount('credit-c@example.test');
  await payWithBody(service, c, { plan_code: 'report_once', case_id: await service.assessedCase(c), payment_intent: 'test_pi_refunded' });
  await service.postEvent({
    id: `test_evt_${crypto.randomBytes(8).toString('hex')}`,
    type: 'charge.refunded',
    account_reference: c.account_id,
    plan_code: 'report_once',
    session_reference: 'test_pi_refunded',
    payment_intent: 'test_pi_refunded',
    amount_cents: 595,
    currency: 'cad',
    occurred_at: new Date().toISOString()
  });
  check.equal(credits().find((r) => r.account_id === c.account_id).state, 'REVOKED', 'a refunded one-time payment revokes its credit');

  /* ---- 7. An unpaid checkout-completed event grants nothing. ---- */
  const d = await service.unpaidAccount('credit-d@example.test');
  await payWithBody(service, d, { plan_code: 'report_once', case_id: await service.assessedCase(d) });
  const unpaid = await service.postEvent({
    id: `test_evt_${crypto.randomBytes(8).toString('hex')}`,
    type: 'checkout.session.completed',
    account_reference: d.account_id,
    plan_code: 'monthly',
    session_reference: 'test_cs_unpaid',
    amount_cents: 795,
    currency: 'cad',
    payment_verified: false,
    occurred_at: new Date().toISOString()
  });
  check.equal(unpaid.status, 200, 'unpaid event is processed');
  check.equal(unpaid.json.event.accepted, false, 'but accepted is false');

  /* ---- 8. Paid report download: one purchased case, second case refused. ---- */
  const e = await service.unpaidAccount('credit-e@example.test');
  const caseAId = await service.assessedCase(e);
  const caseB = await service.request('POST', '/api/cases', { token: e.token, body: { country: 'CA', region: 'CA-NS' } });
  const caseBId = caseB.json.case.case_id;
  await payWithBody(service, e, { plan_code: 'report_once', case_id: caseAId });
  const dlA = await service.request('GET', `/api/cases/${caseAId}/report-download`, { token: e.token });
  check.equal(dlA.status, 200, 'the purchased case downloads its already-assessed report');
  const dlB = await service.request('GET', `/api/cases/${caseBId}/report-download`, { token: e.token });
  check.equal(dlB.status, 402, 'an unpurchased second case is refused');
  check.equal(dlB.json.error.code, 'ASSESSMENT_ACCESS_REQUIRED', 'with the assessment-access refusal');

  return {
    credits_exercised: credits().length,
    credit_final_states: credits().map((r) => `${r.account_id}:${r.state}`),
    download_gate: { purchased_case_status: dlA.status, second_case_status: dlB.status }
  };
}

module.exports = {
  run,
  id: 'x-b4-pay-001',
  title: 'Once-only CAD upgrade credit (reserve/redeem/release/revoke) and the paid assessment-report download'
};
