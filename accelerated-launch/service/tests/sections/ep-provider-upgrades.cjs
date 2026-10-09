'use strict';
// HTTP integration with signed Stripe-shaped events and a local REST provider.
// Every cash receipt comes through the signature gate or owned provider read-back.
const { createService } = require('../../app.cjs');
const { StripeUpgradeFixture, PRICES, clone } = require('../stripe-upgrade-fixture.cjs');

async function run(t, check) {
  const mock = await new StripeUpgradeFixture().listen();
  const values = mock.env(t.base), old = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
  Object.assign(process.env, values);
  t.service = createService({ dataDir: t.dataDir, logSink: line => t.logs.push(line) });
  const store = t.service.store;
  const read = () => store.state();
  const events = async (type, object, eventId) => {
    const signed = mock.signed(type, object, eventId);
    return t.request('POST', '/api/billing/events', signed);
  };
  const purchase = (actor, plan, extras = {}) => t.request('POST', '/api/billing/checkout', {
    token: actor.token, body: { plan_code: plan, return_url: t.base + '/?checkout=return', ...extras } });
  const resetHistory = actor => store.update(state => {
    state.accounts.find(a => a.account_id === actor.account_id).payment_history_checked_at = '1970-01-01T00:00:00Z';
  });
  const getPlans = async actor => {
    const response = await t.request('GET', '/api/billing/plans', { token: actor.token });
    check.equal(response.status, 200, 'owned billing plans read succeeds'); return response.json;
  };
  const status = async actor => (await t.request('GET', '/api/entitlement', { token: actor.token })).json.entitlement;
  const pay = async (actor, plan, extras) => {
    const opened = await purchase(actor, plan, extras);
    check.equal(opened.status, 201, 'real HTTP opens ' + plan + ' purchase: ' + opened.text);
    const session = mock.completeSession(opened.json.checkout.provider_reference);
    const paid = await events('checkout.session.completed', session);
    check.equal(paid.status, 200, 'signed paid Checkout is processed: ' + paid.text);
    check.equal(paid.json.event.accepted, true, 'signed payment activates the owned purchase');
    return { checkout: opened.json.checkout, session, subscription: mock.subscriptions.get(session.subscription) };
  };
  const payReport = async actor => pay(actor, 'report_once', { case_id: await t.assessedCase(actor) });
  const creditsFor = actor => read().upgrade_credits.filter(row => row.account_id === actor.account_id);
  const subscriptionWrites = () => mock.calls.filter(c => c.method === 'POST' && c.path.startsWith('/v1/subscriptions/') && c.params.payment_behavior);

  try {
    const actor = await t.unpaidAccount('ep-primary@example.test');
    const other = await t.unpaidAccount('ep-other@example.test');
    const report = await payReport(actor);
    check.equal((await getPlans(actor)).upgrade_quotes.monthly.first_invoice_cents, 200,
      'Plan page quote subtracts the paid one-report amount');
    check.equal((await getPlans(other)).upgrade_quotes.annual.credit_cents, 0, 'another account sees no credit');
    const month = await pay(actor, 'monthly');
    check.equal(month.checkout.upgrade_credit.credit_cents, 595, 'actual Checkout uses the server-quoted credit');
    check.equal(month.session.amount_total, 200, 'mock provider charges only the quoted monthly cash subtotal');
    const coupon = [...mock.coupons.values()][0];
    check.equal(coupon.amount_off, 595, 'provider receives the calculated fixed cash credit');
    check.equal(coupon.duration, 'once', 'renewals are not discounted');
    check.equal(coupon.max_redemptions, 1, 'coupon is bound to one use');
    const firstInvoice = mock.invoices.get(month.session.invoice);
    check.equal(creditsFor(actor).find(row => row.payment_id === firstInvoice.id).amount_cents, 200,
      'discounted monthly receipt credits actual cash instead of catalog CAD7.95');
    const beforeFirstReplay = creditsFor(actor).length;
    const firstReplay = await events('invoice.paid', firstInvoice);
    check.equal(firstReplay.status, 200, 'first invoice after Checkout is processed');
    check.equal(creditsFor(actor).length, beforeFirstReplay, 'Checkout and first invoice mint one cash receipt');
    check.equal((await getPlans(actor)).upgrade_quotes.annual.credit_cents, 200, 'annual counts only unused monthly cash');

    const history1 = mock.historicalInvoice(month.subscription.id, 795);
    const history2 = mock.historicalInvoice(month.subscription.id, 795);
    const refunded = mock.historicalInvoice(month.subscription.id, 795);
    mock.refundIntent(refunded.payment_intent);
    mock.historicalInvoice(month.subscription.id, 795, { currency: 'usd' });
    mock.historicalInvoice(month.subscription.id, 795, { subscription: 'sub_foreign', include_in_list_for: month.subscription.id });
    resetHistory(actor);
    const historical = await getPlans(actor);
    check.equal(historical.upgrade_quotes.annual.credit_cents, 1790, 'provider read-back imports every unused monthly payment');
    check.ok(mock.calls.some(c => c.path === '/v1/invoices' && c.query.starting_after), 'historical invoice read follows pagination');
    check.equal(creditsFor(actor).find(row => row.payment_id === refunded.id)?.state, 'REVOKED',
      'refunded historical receipt is retained with no usable credit');
    check.equal(creditsFor(other).length, 0, 'read-back preserves account isolation');
    const importedCount = creditsFor(actor).length;
    resetHistory(actor); await getPlans(actor);
    check.equal(creditsFor(actor).length, importedCount, 'repeated provider read-back is idempotent');
    const beforeUpgradeCalls = subscriptionWrites().length;
    const missingReview = await purchase(actor, 'annual');
    check.equal(missingReview.status, 409, 'saved-card upgrade requires the reviewed quote revision');
    check.equal(subscriptionWrites().length, beforeUpgradeCalls, 'unreviewed upgrade never calls the saved-card update');
    const recentRenewal = mock.historicalInvoice(month.subscription.id, 795);
    const renewedMonth = await events('invoice.paid', recentRenewal);
    check.equal(renewedMonth.json.event.accepted, true, 'another verified monthly payment is recorded');
    const stale = await purchase(actor, 'annual', { quote_revision: historical.upgrade_quotes.annual.revision });
    check.equal(stale.status, 409, 'changed credit invalidates a previously displayed amount');
    check.equal(subscriptionWrites().length, beforeUpgradeCalls, 'stale quote does not call the saved card');
    const currentPlans = await getPlans(actor);
    const quote = currentPlans.upgrade_quotes.annual;
    check.equal(quote.credit_cents, 2585, 'upgrade counts all unused lower-plan cash payments');
    check.equal(quote.first_invoice_cents, 5365, 'quoted annual cash charge matches the accumulated credit');
    const oldEntitlement = read().entitlements.find(row => row.account_id === actor.account_id && row.plan_code === 'monthly' && row.state === 'ACTIVE');
    const upgrade = await purchase(actor, 'annual', { quote_revision: quote.revision });
    check.equal(upgrade.status, 201, 'owned annual upgrade opens: ' + upgrade.text);
    check.equal(upgrade.json.checkout.is_subscription_upgrade, true, 'service marks an update of the existing subscription');
    check.equal(mock.subscriptions.size, 1, 'upgrade creates no second subscription');
    check.equal((await status(actor)).plan_code, 'monthly', 'pending payment keeps existing monthly access');
    check.equal(month.subscription.metadata.plan_code, 'annual', 'fixture exposes metadata applied before the pending price change');
    check.equal(month.subscription.items.data[0].price.id, PRICES.monthly, 'provider item remains monthly while its annual invoice is unpaid');
    const upgradeCall = subscriptionWrites().at(-1);
    check.equal(upgradeCall.path, '/v1/subscriptions/' + month.subscription.id, 'provider changes the original owned subscription');
    check.equal(upgradeCall.params['items[0][id]'], month.subscription.items.data[0].id, 'same subscription item is replaced');
    check.equal(upgradeCall.params['items[0][price]'], PRICES.annual, 'annual configured price is used');
    check.equal(upgradeCall.params.payment_behavior, 'pending_if_incomplete', 'provider defers unpaid plan changes');
    check.equal(upgradeCall.params.proration_behavior, 'none', 'owner cash credit is not doubled by automatic proration');
    check.equal(upgradeCall.params.billing_cycle_anchor, 'now', 'annual billing period starts at the upgrade');
    check.ok(upgradeCall.idempotency_key.startsWith('crp-upgrade-'), 'provider mutation uses a bound idempotency key');
    const pendingInvoice = mock.invoices.get(upgrade.json.checkout.provider_reference);
    check.equal(pendingInvoice.amount_due, quote.first_invoice_cents, 'provider invoice matches the displayed annual amount');
    const failedPayment = await events('invoice.payment_failed', pendingInvoice);
    check.equal(failedPayment.status, 200, 'valid signed failed pending payment is processed');
    check.equal((await status(actor)).plan_code, 'monthly', 'failed pending invoice does not widen access');
    check.equal(creditsFor(actor).filter(row => row.state === 'RESERVED').reduce((sum, row) => sum + row.reserved_amount_cents, 0),
      quote.credit_cents, 'pending credit stays reserved and unspent');

    async function rejectedInvoice(patch, label) {
      const altered = clone(pendingInvoice);
      Object.assign(altered, { status: 'paid', paid: true, amount_paid: altered.amount_due, ...patch });
      const response = await events('invoice.paid', altered);
      check.ok(response.status < 500 && (response.status >= 400 || response.json.event.accepted === false), label + ' is rejected');
      check.equal((await status(actor)).plan_code, 'monthly', label + ' grants no annual access');
    }
    await rejectedInvoice({ amount_paid: pendingInvoice.amount_due + 1 }, 'altered net amount');
    await rejectedInvoice({ currency: 'usd' }, 'altered currency');
    await rejectedInvoice({ lines: { data: [{ ...pendingInvoice.lines.data[0], price: { id: 'price_unknown' } }] } }, 'altered price');
    const wrongSub = clone(month.subscription); wrongSub.id = 'sub_wrong_fixture';
    mock.subscriptions.set(wrongSub.id, wrongSub);
    await rejectedInvoice({ subscription: wrongSub.id }, 'different subscription');
    mock.subscriptions.delete(wrongSub.id);
    const originalAccount = month.subscription.metadata.account_id;
    month.subscription.metadata.account_id = other.account_id;
    await rejectedInvoice({}, 'different account binding');
    month.subscription.metadata.account_id = originalAccount;

    const paidAnnual = mock.payInvoice(pendingInvoice.id);
    const paidEvent = 'evt_annual_confirmed';
    const confirmation = await events('invoice.paid', paidAnnual, paidEvent);
    check.equal(confirmation.status, 200, 'signed exact upgrade invoice is processed: ' + confirmation.text);
    check.equal(confirmation.json.event.accepted, true, 'exact paid invoice activates annual access');
    const activeYear = (await status(actor));
    check.equal(activeYear.plan_code, 'annual', 'annual access follows the signed payment');
    check.equal(read().entitlements.find(row => row.entitlement_id === oldEntitlement.entitlement_id).plan_code,
      'annual', 'existing entitlement row is updated in place');
    check.equal(read().entitlements.filter(row => row.account_id === actor.account_id && row.access_via === 'SUBSCRIPTION').length,
      1, 'one owned subscription entitlement remains');
    check.equal(creditsFor(actor).filter(row => row.source_plan_code !== 'annual' && row.state !== 'REVOKED')
      .reduce((sum, row) => sum + row.remaining_amount_cents, 0),
      0, 'confirmed annual payment atomically consumes exactly the reserved lower-plan credit');
    check.equal(creditsFor(actor).flatMap(row => row.allocations || []).filter(allocation => allocation.checkout_id === upgrade.json.checkout.checkout_id)
      .reduce((sum, allocation) => sum + allocation.amount_cents, 0), quote.credit_cents,
      'actual ledger allocations equal the provider-verified upgrade discount');
    const receiptCount = creditsFor(actor).length;
    const sameEvent = await events('invoice.paid', paidAnnual, paidEvent);
    check.equal(sameEvent.json.event.duplicate, true, 'same event ID is idempotent');
    const freshId = await events('invoice.paid', paidAnnual);
    check.equal(freshId.json.event.duplicate, true, 'same invoice with a fresh event ID is idempotent');
    check.equal(creditsFor(actor).length, receiptCount, 'replays mint no additional credit');
    const yearRenewal = mock.invoice(month.subscription, 'annual', 7950);
    yearRenewal.lines.data[0].period.end += 366 * 86400;
    mock.payInvoice(yearRenewal.id);
    check.equal((await events('invoice.paid', yearRenewal)).json.event.accepted, true, 'annual renewal uses its normal full price');
    const afterRenewal = await status(actor);
    check.ok(afterRenewal.expires_at > activeYear.expires_at, 'verified renewal extends annual access');
    const lateOldMonth = await events('invoice.paid', history1);
    check.equal(lateOldMonth.json.event.accepted, false, 'old monthly invoice cannot rewrite annual access');
    check.equal((await status(actor)).plan_code, 'annual', 'late monthly event preserves annual plan');
    const cancelledYear = await t.request('POST', '/api/entitlement/cancel', { token: actor.token, body: {} });
    check.equal(cancelledYear.status, 200, 'annual renewal cancellation succeeds: ' + cancelledYear.text);
    check.equal(month.subscription.cancel_at_period_end, true, 'cancellation reaches the same original provider subscription');
    check.equal((await status(actor)).plan_code, 'annual', 'paid annual access remains through the paid period');

    const voidActor = await t.unpaidAccount('ep-void@example.test');
    const voidMonth = await pay(voidActor, 'monthly');
    const voidQuote = (await getPlans(voidActor)).upgrade_quotes.annual;
    const voidUpgrade = await purchase(voidActor, 'annual', { quote_revision: voidQuote.revision });
    check.equal(voidUpgrade.status, 201, 'second account opens a pending upgrade');
    const voidInvoice = mock.voidInvoice(voidUpgrade.json.checkout.provider_reference);
    check.equal((await events('invoice.voided', voidInvoice)).json.event.accepted, true, 'signed void releases its pending upgrade');
    check.equal((await getPlans(voidActor)).upgrade_quotes.annual.credit_cents, 795, 'void restores unused monthly cash credit');
    check.equal((await status(voidActor)).plan_code, 'monthly', 'void preserves prior monthly access');
    check.equal(voidMonth.subscription.metadata.plan_code, 'monthly', 'void restores monthly provider metadata before another upgrade');
    check.equal(voidMonth.subscription.metadata.checkout_id, voidMonth.checkout.checkout_id,
      'void restores the original completed monthly purchase binding');
    const repeatQuote = (await getPlans(voidActor)).upgrade_quotes.annual;
    const expiring = await purchase(voidActor, 'annual', { quote_revision: repeatQuote.revision });
    mock.voidInvoice(expiring.json.checkout.provider_reference);
    const recovered = await purchase(voidActor, 'annual', { quote_revision: repeatQuote.revision });
    check.equal(recovered.status, 201, 'provider-expired invoice is reconciled before retry');
    check.equal(read().checkout_sessions.find(row => row.checkout_id === expiring.json.checkout.checkout_id).state,
      'EXPIRED', 'expired pending checkout does not strand the credit');
    check.equal(recovered.json.checkout.upgrade_credit.credit_cents, 795, 'same unused credit is available on the retry');
    const pendingCancellation = await t.request('POST', '/api/entitlement/cancel', { token: voidActor.token, body: {} });
    check.equal(pendingCancellation.status, 200, 'monthly subscriber can stop renewal with an unpaid annual upgrade: ' + pendingCancellation.text);
    check.equal(mock.invoices.get(recovered.json.checkout.provider_reference).status, 'void', 'cancellation voids the pending annual invoice');
    check.equal(voidMonth.subscription.metadata.plan_code, 'monthly', 'cancellation restores monthly provider metadata');
    check.equal(voidMonth.subscription.metadata.checkout_id, voidMonth.checkout.checkout_id, 'cancellation restores the original purchase binding');
    check.equal(voidMonth.subscription.cancel_at_period_end, true, 'cancellation stops renewal on the original monthly subscription');
    check.equal((await status(voidActor)).plan_code, 'monthly', 'cancellation keeps the already paid monthly access');
    check.equal(read().checkout_sessions.find(row => row.checkout_id === recovered.json.checkout.checkout_id).state,
      'CANCELLED', 'cancelled upgrade cannot remain an open saved-card request');
    check.equal(creditsFor(voidActor).filter(row => row.state === 'RESERVED').length, 0, 'cancellation releases the pending upgrade credit');

    const failureActor = await t.unpaidAccount('ep-failure@example.test');
    await pay(failureActor, 'monthly');
    const failureQuote = (await getPlans(failureActor)).upgrade_quotes.annual;
    const beforeFailInvoices = mock.invoices.size, beforeFailIntents = mock.intents.size;
    mock.failUpgrade = true;
    const failed = await purchase(failureActor, 'annual', { quote_revision: failureQuote.revision });
    check.equal(failed.status, 502, 'provider mutation failure is surfaced without a server crash');
    check.equal(mock.invoices.size, beforeFailInvoices, 'failed provider update creates no chargeable invoice');
    check.equal(mock.intents.size, beforeFailIntents, 'failed update charges no cash');
    check.equal((await status(failureActor)).plan_code, 'monthly', 'provider failure keeps paid monthly access');
    check.equal((await getPlans(failureActor)).upgrade_quotes.annual.credit_cents, 795, 'failed update releases its reserved credit');
    const gate = mock.pauseNextUpgrade();
    const firstTry = purchase(failureActor, 'annual', { quote_revision: failureQuote.revision });
    try {
      await Promise.race([gate.ready, firstTry.then(response => {
        throw new Error('First concurrent upgrade never reached the provider: ' + response.status + ' ' + response.text);
      })]);
      const secondTry = await purchase(failureActor, 'annual', { quote_revision: failureQuote.revision });
      check.equal(secondTry.status, 409, 'a competing tab cannot open a second saved-card upgrade');
    } finally { gate.release(); }
    check.equal((await firstTry).status, 201, 'the original upgrade proceeds once');

    const centsActor = await t.unpaidAccount('ep-small-invoice@example.test');
    const centsMonth = await pay(centsActor, 'monthly');
    for (let index = 0; index < 9; index++) mock.historicalInvoice(centsMonth.subscription.id, 795);
    const centsInvoice = mock.invoices.get(centsMonth.session.invoice);
    await events('charge.refunded', mock.refundIntent(centsInvoice.payment_intent, 39));
    resetHistory(centsActor);
    const centsQuote = (await getPlans(centsActor)).upgrade_quotes.annual;
    check.equal(centsQuote.available_credit_cents, 7911, 'all verified net cents remain counted');
    check.equal(centsQuote.first_invoice_cents, 50, 'nonzero invoice reaches the configured CAD minimum charge');
    check.equal(centsQuote.credit_cents, 7900, 'only the chargeable discount is reserved');
    check.equal(centsQuote.remaining_credit_cents, 11, 'the extra unused cents remain in the account');
    const centsUpgrade = await purchase(centsActor, 'annual', { quote_revision: centsQuote.revision });
    check.equal(centsUpgrade.status, 201, 'a few-cents remainder does not block the upgrade');
    check.equal(centsUpgrade.json.checkout.upgrade_credit.first_invoice_cents, 50, 'provider invoice uses the reviewed chargeable amount');
    const centsPaid = mock.payInvoice(centsUpgrade.json.checkout.provider_reference);
    check.equal(centsPaid.amount_paid, 50, 'actual provider cash equals the reviewed bill');
    check.equal((await events('invoice.paid', centsPaid)).json.event.accepted, true, 'chargeable exact paid invoice activates the upgrade');
    check.equal(creditsFor(centsActor).filter(row => row.source_plan_code === 'monthly').reduce((sum, row) => sum + row.remaining_amount_cents, 0), 11,
      'settlement preserves the unused cents without minting new lower-plan cash');

    const partialCurrentActor = await t.unpaidAccount('ep-partial-current@example.test');
    const partialCurrent = await pay(partialCurrentActor, 'monthly');
    const partialCurrentInvoice = mock.invoices.get(partialCurrent.session.invoice);
    const partialCurrentRefund = mock.refundIntent(partialCurrentInvoice.payment_intent, 100);
    check.equal((await events('charge.refunded', partialCurrentRefund)).json.event.accepted, true, 'partial refund of current subscription cash is processed');
    const currentAfterPartial = await status(partialCurrentActor);
    check.equal(currentAfterPartial.state, 'ACTIVE', 'a partial refund preserves the paid subscription period');
    check.equal(currentAfterPartial.entitled, true, 'current paid report and packet access remain available after a partial refund');
    check.equal((await getPlans(partialCurrentActor)).upgrade_quotes.annual.credit_cents, 695, 'current subscription contributes only the unrefunded unused cash');
    const fullCurrentRefund = mock.refundIntent(partialCurrentInvoice.payment_intent, 795);
    check.equal((await events('charge.refunded', fullCurrentRefund)).json.event.accepted, true, 'a later full cumulative refund is processed');
    check.equal((await status(partialCurrentActor)).entitled, false, 'a full refund still revokes the refunded subscription access');

    const refundActor = await t.unpaidAccount('ep-refund@example.test');
    const refundMonth = await pay(refundActor, 'monthly');
    const refundedRenewal = mock.historicalInvoice(refundMonth.subscription.id, 795);
    resetHistory(refundActor);
    const refundQuote = (await getPlans(refundActor)).upgrade_quotes.annual;
    check.equal(refundQuote.credit_cents, 1590, 'two unspent monthly payments fund one pending upgrade');
    const refundDraft = await purchase(refundActor, 'annual', { quote_revision: refundQuote.revision });
    const refundCharge = mock.refundIntent(refundedRenewal.payment_intent);
    check.equal((await events('charge.refunded', refundCharge)).json.event.accepted, true, 'signed source refund is processed');
    check.equal(mock.invoices.get(refundDraft.json.checkout.provider_reference).status, 'void', 'pending discounted invoice is voided at provider');
    check.equal(refundMonth.subscription.metadata.plan_code, 'monthly', 'source refund restores the original monthly provider metadata');
    check.equal(refundMonth.subscription.metadata.checkout_id, refundMonth.checkout.checkout_id, 'source refund restores the original purchase binding');
    check.equal((await status(refundActor)).plan_code, 'monthly', 'unrelated historical refund does not end current monthly payment');
    check.equal(creditsFor(refundActor).find(row => row.payment_id === refundMonth.session.invoice).remaining_amount_cents,
      795, 'surviving cash credit is released without being consumed');
    check.equal(creditsFor(refundActor).filter(row => row.state === 'RESERVED').length, 0, 'void leaves no surviving stranded reservation');
    const invalidPaid = clone(mock.invoices.get(refundDraft.json.checkout.provider_reference));
    invalidPaid.status = 'paid'; invalidPaid.paid = true; invalidPaid.amount_paid = invalidPaid.amount_due;
    const blockedAfterRefund = await events('invoice.paid', invalidPaid);
    check.ok(blockedAfterRefund.status < 500 && (blockedAfterRefund.status >= 400 || blockedAfterRefund.json.event.accepted === false),
      'revoked discounted invoice cannot activate annual access later');
    const partialRenewal = mock.historicalInvoice(refundMonth.subscription.id, 795);
    resetHistory(refundActor);
    const partialQuote = (await getPlans(refundActor)).upgrade_quotes.annual;
    check.equal(partialQuote.credit_cents, 1590, 'a new historical renewal adds its actual unused cash');
    const partialDraft = await purchase(refundActor, 'annual', { quote_revision: partialQuote.revision });
    check.equal(partialDraft.status, 201, 'unused cash can fund another reviewed upgrade');
    const partialCharge = mock.refundIntent(partialRenewal.payment_intent, 100);
    check.equal((await events('charge.refunded', partialCharge)).json.event.accepted, true, 'signed partial source refund is processed');
    check.equal(mock.invoices.get(partialDraft.json.checkout.provider_reference).status, 'void', 'partial refund voids the now-inaccurate discounted invoice');
    const partiallyRefunded = creditsFor(refundActor).find(row => row.payment_id === partialRenewal.id);
    check.equal(partiallyRefunded.amount_cents, 795, 'partial refund preserves the original cash receipt');
    check.equal(partiallyRefunded.refunded_cents, 100, 'partial refund records the cumulative returned amount');
    check.equal(partiallyRefunded.remaining_amount_cents, 695, 'only the returned cash is removed from unused credit');
    check.equal(creditsFor(refundActor).filter(row => row.state === 'RESERVED').length, 0, 'partial refund releases every allocation for its cancelled invoice');
    check.equal((await getPlans(refundActor)).upgrade_quotes.annual.credit_cents, 1490, 'consumer can review the corrected cash credit after partial refund');
    check.equal((await status(refundActor)).plan_code, 'monthly', 'partial historical refund preserves the independently paid monthly access');
    const readBackPartial = mock.historicalInvoice(refundMonth.subscription.id, 795);
    mock.refundIntent(readBackPartial.payment_intent, 200);
    resetHistory(refundActor);
    check.equal((await getPlans(refundActor)).upgrade_quotes.annual.credit_cents, 2085,
      'provider read-back imports only the remaining cash of a previously unseen partial-refund receipt');
    const readBackRow = () => creditsFor(refundActor).find(row => row.payment_id === readBackPartial.id);
    check.equal(readBackRow().amount_cents, 795, 'historical partial refund retains the actual original payment');
    check.equal(readBackRow().refunded_cents, 200, 'historical partial refund retains the cumulative returned amount');
    check.equal(readBackRow().remaining_amount_cents, 595, 'historical partial refund leaves unreturned cash eligible');
    resetHistory(refundActor); await getPlans(refundActor);
    check.equal(readBackRow().remaining_amount_cents, 595, 'repeated historical partial-refund import is idempotent');

    const zeroActor = await t.unpaidAccount('ep-zero@example.test');
    await payReport(zeroActor); await payReport(zeroActor);
    const zeroPlans = await getPlans(zeroActor);
    check.equal(zeroPlans.upgrade_quotes.monthly.first_invoice_cents, 0, 'multiple one-report payments fully fund the first month');
    check.equal(zeroPlans.upgrade_quotes.monthly.remaining_credit_cents, 395, 'excess money remains available');
    const zeroMonth = await pay(zeroActor, 'monthly');
    check.equal(zeroMonth.session.payment_status, 'no_payment_required', 'zero-due Checkout uses the provider zero-payment status');
    check.equal((await status(zeroActor)).plan_code, 'monthly', 'verified zero invoice grants the fully credited subscription');
    check.equal(creditsFor(zeroActor).some(row => row.source_plan_code === 'monthly'), false, 'zero cash creates no new payment credit');
    check.equal((await events('invoice.paid', mock.invoices.get(zeroMonth.session.invoice))).status, 200, 'first zero invoice after Checkout is processed');
    check.equal((await getPlans(zeroActor)).upgrade_quotes.annual.credit_cents, 395, 'unused receipt balance survives the zero first bill');
    const cancelledZero = await t.request('POST', '/api/entitlement/cancel', { token: zeroActor.token, body: {} });
    check.equal(cancelledZero.status, 200, 'a fully credited subscriber can cancel renewal too: ' + cancelledZero.text);
    const partiallyUsed = creditsFor(zeroActor).find(row => row.remaining_amount_cents === 395);
    check.equal(partiallyUsed.consumed_cents, 200, 'one source receipt was partly consumed by the paid subscription');
    const usedRefund = mock.refundIntent(partiallyUsed.payment_intent, 100);
    const firstPartialEvent = 'evt_partly_used_cash_refund';
    check.equal((await events('charge.refunded', usedRefund, firstPartialEvent)).json.event.accepted, true,
      'partial refund of a partly used source payment is processed');
    const adjustedUsed = () => creditsFor(zeroActor).find(row => row.credit_id === partiallyUsed.credit_id);
    check.equal(adjustedUsed().amount_cents, 595, 'returned cash never rewrites the original paid amount');
    check.equal(adjustedUsed().consumed_cents, 200, 'a refund never erases credit already allocated to a paid upgrade');
    check.equal(adjustedUsed().refunded_cents, 100, 'returned cash remains a separate cumulative ledger amount');
    check.equal(adjustedUsed().remaining_amount_cents, 295, 'the remaining credit is paid cash minus consumed credit and refund');
    check.equal((await events('charge.refunded', usedRefund, firstPartialEvent)).json.event.duplicate, true, 'same partial-refund event is idempotent');
    check.equal((await events('charge.refunded', usedRefund)).json.event.duplicate, true, 'repeated cumulative refund with a new event ID is idempotent');
    check.equal(adjustedUsed().remaining_amount_cents, 295, 'refund replay deducts no cash twice');
    const increasedRefund = mock.refundIntent(partiallyUsed.payment_intent, 150);
    check.equal((await events('charge.refunded', increasedRefund)).json.event.accepted, true, 'a later larger cumulative refund is applied');
    check.equal(adjustedUsed().refunded_cents, 150, 'later refund replaces the cumulative returned total');
    check.equal(adjustedUsed().remaining_amount_cents, 245, 'only the newly returned difference is removed');
    resetHistory(zeroActor);
    check.equal((await getPlans(zeroActor)).upgrade_quotes.annual.credit_cents, 245, 'provider receipt read-back preserves the unused net cash');
    resetHistory(zeroActor); await getPlans(zeroActor);
    check.equal(adjustedUsed().refunded_cents, 150, 'repeated provider read-back does not add the refund again');
    check.equal(adjustedUsed().remaining_amount_cents, 245, 'provider read-back cannot reset spent or returned credit');
    check.equal(adjustedUsed().consumed_cents, 200, 'provider read-back keeps already settled allocations');
    check.equal((await status(zeroActor)).plan_code, 'monthly', 'refund of the earlier report payment preserves the verified zero-due monthly purchase');

    const uncertainActor = await t.unpaidAccount('ep-uncertain@example.test');
    const uncertainMonth = await pay(uncertainActor, 'monthly');
    const uncertainQuote = (await getPlans(uncertainActor)).upgrade_quotes.annual;
    const beforeLostInvoice = mock.invoices.size, beforeLostSubs = mock.subscriptions.size;
    mock.loseUpgradeResponse = true;
    const uncertain = await purchase(uncertainActor, 'annual', { quote_revision: uncertainQuote.revision });
    check.equal(uncertain.status, 409, 'lost provider response is held for safe recovery');
    check.equal(uncertain.json.error.code, 'PAYMENT_CONFIRMATION_PENDING', 'uncertain response does not promise nothing was charged');
    check.equal(mock.invoices.size, beforeLostInvoice + 1, 'provider already created precisely one pending invoice');
    const pendingPosition = await getPlans(uncertainActor);
    const pendingId = pendingPosition.pending_checkout.checkout_id;
    check.equal(pendingPosition.pending_checkout.credit_cents, 795, 'original reviewed credit stays bound while provider outcome is uncertain');
    check.equal(pendingPosition.upgrade_quotes.annual.allowed, false, 'another upgrade is blocked while its outcome is uncertain');
    check.equal((await status(uncertainActor)).plan_code, 'monthly', 'uncertain provider reply keeps prior access');
    const foreignResume = await purchase(other, 'annual', { resume_checkout_id: pendingId });
    check.equal(foreignResume.status, 404, 'another account cannot resume the pending saved-card request');
    const recoverableInvoice = mock.invoices.get(mock.subscriptions.get(uncertainMonth.subscription.id).latest_invoice);
    const originalDue = recoverableInvoice.amount_due;
    recoverableInvoice.amount_due += 1;
    const failedResume = await purchase(uncertainActor, 'annual', { resume_checkout_id: pendingId });
    check.equal(failedResume.status, 409, 'unconfirmed recovery keeps the purchase pending');
    check.equal(failedResume.json.error.code, 'PAYMENT_CONFIRMATION_PENDING', 'recovery refusal avoids a false no-payment claim');
    check.ok(!/nothing was sent|nothing.*charged/i.test(failedResume.json.error.message), 'recovery explains the uncertain original payment honestly');
    check.equal(read().checkout_sessions.find(row => row.checkout_id === pendingId).state, 'OPENING', 'failed recovery retains the original pending request');
    check.equal(creditsFor(uncertainActor).reduce((sum, row) => sum + row.reserved_amount_cents, 0), 795, 'failed recovery retains the approved credit reservation');
    check.equal(mock.invoices.size, beforeLostInvoice + 1, 'failed recovery creates no second invoice');
    recoverableInvoice.amount_due = originalDue;
    const writesBeforeResume = subscriptionWrites().length;
    const resumed = await purchase(uncertainActor, 'annual', { resume_checkout_id: pendingId });
    check.equal(resumed.status, 201, 'same owned request is recovered from its bound provider invoice: ' + resumed.text);
    check.equal(subscriptionWrites().length, writesBeforeResume, 'recovery reads the existing invoice without another saved-card update');
    check.equal(resumed.json.checkout.checkout_id, pendingId, 'recovery retains the original purchase identity');
    check.equal(mock.invoices.size, beforeLostInvoice + 1, 'recovery creates no second chargeable invoice');
    check.equal(mock.subscriptions.size, beforeLostSubs, 'recovery creates no second subscription');
    const recoveredInvoice = mock.payInvoice(resumed.json.checkout.provider_reference);
    check.equal((await events('invoice.paid', recoveredInvoice)).json.event.accepted, true, 'recovered exact invoice grants annual access once');
    check.equal((await status(uncertainActor)).plan_code, 'annual', 'recovery finishes the original yearly upgrade');
    check.equal(uncertainMonth.subscription.items.data[0].price.id, PRICES.annual, 'original provider subscription item becomes annual');

    return { provider: 'loopback Stripe REST fixture; no external account or payment',
      signed_events_and_history: true, actual_net_cash: true, reviewed_quote: true,
      one_provider_subscription: true, pending_and_void: true, refund_invalidates_invoice: true,
      zero_cash_accepted: true, ownership_and_amount_refusals: true };
  } finally {
    for (const [key, value] of Object.entries(old)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    await mock.close();
  }
}
module.exports = { run, id: 'ep-provider-upgrades', title: 'Signed provider receipts, cumulative upgrade cash and one-subscription pending-payment lifecycle' };

if (require.main === module) {
  const assert = require('node:assert/strict');
  const { TestService } = require('../harness.cjs');
  let total = 0, harness;
  const check = Object.fromEntries(['equal', 'deepEqual', 'ok'].map(name => [name, (...args) => { assert[name](...args); total += 1; }]));
  (async () => { harness = await new TestService('ep-provider').listen(); await run(harness, check);
    console.log('PASS: ' + total + ' signed provider upgrade assertions through the real HTTP service');
  })().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { if (harness) await harness.close(); });
}
