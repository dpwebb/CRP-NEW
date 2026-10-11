'use strict';
const assert = require('node:assert/strict');
const { TestService } = require('./harness.cjs');

async function main() {
  const prior = process.env.CRP_DEPLOYMENT_ENV;
  process.env.CRP_DEPLOYMENT_ENV = 'staging';
  const service = await new TestService('referrals').listen();
  try {
    const jurisdictions = await service.request('GET', '/api/jurisdictions');
    assert.equal(jurisdictions.status, 200);
    assert.equal(jurisdictions.json.surface.regions.length, 82);
    const [a, b, c, buyer] = await Promise.all(['a', 'b', 'c', 'buyer']
      .map(name => service.unpaidAccount(`${name}-referral@example.test`)));
    const unauthorized = await service.request('GET', '/api/referrals');
    assert.equal(unauthorized.status, 401);
    const aJoin = await service.request('POST', '/api/referrals/enroll', { token: a.token, body: {} });
    assert.equal(aJoin.status, 201);
    const bJoin = await service.request('POST', '/api/referrals/enroll', { token: b.token,
      body: { introducer_code: aJoin.json.referral.code } });
    assert.equal(bJoin.status, 201);
    const cJoin = await service.request('POST', '/api/referrals/enroll', { token: c.token,
      body: { introducer_code: bJoin.json.referral.code } });
    assert.equal(cJoin.status, 201);
    const attributed = await service.request('POST', '/api/referrals/attribute', { token: buyer.token,
      body: { referrer_code: cJoin.json.referral.code } });
    assert.equal(attributed.status, 200);
    assert.equal(JSON.stringify(attributed.json).includes(c.account_id), false);
    assert.equal((await service.request('GET', '/referrals.html')).status, 200);
    const payment = await service.pay(buyer, 'monthly');
    const views = await Promise.all([a, b, c].map(actor => service.request('GET', '/api/referrals', { token: actor.token })));
    assert.deepEqual(views.map(view => [view.status, view.json.referral.rewards[0].level,
      view.json.referral.rewards[0].amount_minor]), [[200, 3, 39], [200, 2, 79], [200, 1, 119]]);
    for (const view of views) {
      assert.equal(view.json.referral.tranches.length, 2);
      assert.equal(JSON.stringify(view.json).includes(buyer.account_id), false);
      assert.equal(view.json.referral.rewards[0].payout_minor + view.json.referral.rewards[0].reserve_minor,
        view.json.referral.rewards[0].amount_minor);
    }
    assert.equal((await service.request('POST', '/api/referrals/attribute', { token: buyer.token,
      body: { referrer_code: aJoin.json.referral.code } })).status, 400);
    assert.equal((await service.request('GET', '/api/referrals', { token: c.token })).json.referral.rewards.length, 1);
    const refund = await service.postEvent({ id: 'test_refund_referrals', type: 'charge.refunded',
      account_reference: buyer.account_id, plan_code: 'monthly', session_reference: payment.reference,
      amount_cents: 795, refunded_cents: 795, currency: 'CAD', occurred_at: new Date().toISOString() });
    assert.equal(refund.status, 200);
    assert.equal((await service.request('GET', '/api/referrals', { token: c.token })).json.referral.tranches[0].status,
      'REVERSED');
    const buyer2 = await service.unpaidAccount('buyer2-referral@example.test');
    assert.equal((await service.request('POST', '/api/referrals/attribute', { token: buyer2.token,
      body: { referrer_code: cJoin.json.referral.code } })).status, 200);
    const payment2 = await service.pay(buyer2, 'monthly');
    const partial = await service.postEvent({ id: 'test_partial_refund_referrals', type: 'charge.refunded',
      account_reference: buyer2.account_id, plan_code: 'monthly', session_reference: payment2.reference,
      amount_cents: 795, refunded_cents: 100, currency: 'CAD', occurred_at: new Date().toISOString() });
    assert.equal(partial.status, 200);
    assert.equal((await service.request('GET', '/api/referrals', { token: c.token })).json.referral.tranches.at(-1).status,
      'REVIEW_HOLD');
    const buyer3 = await service.unpaidAccount('buyer3-referral@example.test');
    assert.equal((await service.request('POST', '/api/referrals/attribute', { token: buyer3.token,
      body: { referrer_code: cJoin.json.referral.code } })).status, 200);
    await service.pay(buyer3, 'monthly');
    assert.equal((await service.request('GET', '/api/referrals', { token: c.token })).json.referral.rewards.length, 3);
    assert.equal((await service.request('DELETE', '/api/account', { token: buyer3.token })).status, 200);
    assert.equal((await service.request('GET', '/api/referrals', { token: c.token })).json.referral.tranches.at(-1).status,
      'REVIEW_HOLD');
    const privacy = await service.request('GET', '/api/privacy', { token: b.token });
    assert.equal(privacy.json.referral.enrolled, true);
    assert.equal(privacy.json.referral.reward_count, 3);
    const deleted = await service.request('DELETE', '/api/account', { token: c.token });
    assert.equal(deleted.status, 200);
    assert.equal((await service.request('GET', '/api/referrals', { token: b.token })).json.referral.rewards.length, 3);
    console.log('Staging referral HTTP journey: passed');
  } finally {
    await service.close();
    if (prior === undefined) delete process.env.CRP_DEPLOYMENT_ENV;
    else process.env.CRP_DEPLOYMENT_ENV = prior;
  }
  process.env.CRP_DEPLOYMENT_ENV = 'production';
  const production = await new TestService('referral-production-isolation').listen();
  try {
    const actor = await production.unpaidAccount('prod-referral@example.test');
    assert.equal((await production.request('GET', '/referrals.html')).status, 404);
    assert.equal((await production.request('GET', '/api/referrals', { token: actor.token })).status, 404);
  } finally {
    await production.close();
    if (prior === undefined) delete process.env.CRP_DEPLOYMENT_ENV;
    else process.env.CRP_DEPLOYMENT_ENV = prior;
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
