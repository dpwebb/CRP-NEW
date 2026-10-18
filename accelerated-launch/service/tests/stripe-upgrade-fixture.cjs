'use strict';
// A loopback REST fixture: no real provider, credential, saved card or money.
const http = require('node:http');
const crypto = require('node:crypto');
const clone = value => JSON.parse(JSON.stringify(value));
const SECRET = 'whsec_fictional_upgrade_fixture';
const PRICES = Object.freeze({ report_once: 'price_report_fixture', monthly: 'price_month_fixture', annual: 'price_year_fixture' });
const catalog = require('../plan-catalog.cjs');
const AMOUNTS = catalog.NATIVE_PRICES.cad;
const priceFor = (code, currency = 'cad') => PRICES[code] + (currency === 'cad' ? '' : '_' + currency);
const resolvePrice = id => { for (const currency of catalog.CURRENCIES) for (const code of catalog.PLAN_CODES) if (priceFor(code, currency) === id) return { code, currency }; return {}; };
const second = () => Math.floor(Date.now() / 1000);

class StripeUpgradeFixture {
  constructor() {
    this.prices = new Map(); this.primaryPrices = new Map();
    for (const currency of catalog.CURRENCIES) for (const code of catalog.PLAN_CODES) {
      const id = priceFor(code, currency);
      this.primaryPrices.set(currency + '/' + code, id);
      this.prices.set(id, { code, currency, amount: catalog.NATIVE_PRICES[currency][code] });
    }
    this.sessions = new Map(); this.subscriptions = new Map(); this.invoices = new Map();
    this.intents = new Map(); this.charges = new Map(); this.coupons = new Map();
    this.calls = []; this.sequence = 0; this.pageSize = 2; this.failUpgrade = false;
    this.idempotent = new Map(); this.loseUpgradeResponse = false;
    this.invoiceReadOverrides = new Map();
    this.server = http.createServer(async (req, res) => {
      let raw = ''; for await (const chunk of req) raw += chunk;
      const url = new URL(req.url, 'http://fixture.invalid');
      const call = { method: req.method, path: url.pathname, query: Object.fromEntries(url.searchParams),
        params: Object.fromEntries(new URLSearchParams(raw)), idempotency_key: req.headers['idempotency-key'] || null,
        api_version: req.headers['stripe-version'] || null };
      this.calls.push(call);
      try {
        const result = await this.route(call);
        if (result.close) { req.socket.destroy(); return; }
        res.writeHead(result.status || 200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result.body));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: 'fictional fixture: ' + error.message } }));
      }
    });
  }
  listen() { return new Promise(resolve => this.server.listen(0, '127.0.0.1', () => {
    this.base = 'http://127.0.0.1:' + this.server.address().port; resolve(this);
  })); }
  close() { return new Promise(resolve => this.server.close(resolve)); }
  priceFor(code, currency = 'cad') { return this.primaryPrices.get(currency + '/' + code); }
  rotatePrices(previous, suffix) {
    for (const currency of catalog.CURRENCIES) for (const code of catalog.PLAN_CODES) {
      this.prices.get(this.priceFor(code, currency)).amount = previous[currency][code];
      const id = priceFor(code, currency) + '_' + suffix;
      this.primaryPrices.set(currency + '/' + code, id);
      this.prices.set(id, { code, currency, amount: catalog.NATIVE_PRICES[currency][code] });
    }
  }
  env(origin) { const native = {}; for (const currency of catalog.CURRENCIES) for (const code of catalog.PLAN_CODES) {
    const name = 'STRIPE_PRICE_' + code.toUpperCase() + (currency === 'cad' ? '' : '_' + currency.toUpperCase());
    native[name] = this.priceFor(code, currency);
    const old = [...this.prices].filter(([id, p]) => p.code === code && p.currency === currency && id !== native[name]).map(([id]) => id);
    if (old.length) native[name + '_LEGACY'] = old.join(',');
  } return { ...native, CRP_PAYMENT_PROVIDER: 'stripe', STRIPE_SECRET_KEY: 'sk_test_fictional_upgrade_fixture',
    STRIPE_PUBLISHABLE_KEY: 'pk_test_fictional_upgrade_fixture',
    STRIPE_WEBHOOK_SECRET: SECRET,
    STRIPE_APP_ORIGINS: origin, CRP_STRIPE_API_BASE: this.base }; }
  metadata(params, prefix = 'metadata') {
    return Object.fromEntries(Object.entries(params).filter(([key]) => key.startsWith(prefix + '['))
      .map(([key, value]) => [key.slice(prefix.length + 1, -1), value]));
  }
  payment(amount, metadata, currency = 'cad') {
    if (!amount) return null;
    const id = 'pi_fixture_' + ++this.sequence, charge = 'ch_fixture_' + this.sequence;
    this.intents.set(id, { id, object: 'payment_intent', currency, amount_received: amount,
      amount, status: 'succeeded', livemode: false, latest_charge: charge, metadata: { ...metadata } });
    this.charges.set(charge, { id: charge, object: 'charge', payment_intent: id, amount, amount_refunded: 0,
      currency, livemode: false, refunded: false, disputed: false });
    return id;
  }
  invoice(subscription, plan, amount, patch = {}) {
    const id = 'in_fixture_' + ++this.sequence, from = second(), currency = subscription.currency || 'cad';
    const currentId = subscription.items?.data?.[0]?.price?.id;
    const priceId = this.prices.get(currentId)?.code === plan ? currentId : this.priceFor(plan, currency);
    const invoice = { id, object: 'invoice', subscription: subscription.id, customer: subscription.customer,
      currency, livemode: false, status: 'open', paid: false, amount_due: amount, amount_paid: 0,
      amount_remaining: amount, created: from, payment_intent: null,
      hosted_invoice_url: 'https://invoice.stripe.com/i/' + id,
      lines: { data: [{ id: 'il_' + id, price: { id: priceId }, quantity: 1,
        amount: this.prices.get(priceId).amount, period: { start: from, end: from + (plan === 'annual' ? 366 : 31) * 86400 } }] },
      status_transitions: { paid_at: null }, ...patch };
    this.invoices.set(id, invoice); return invoice;
  }
  historicalInvoice(subscriptionId, amount, patch = {}) {
    const subscription = this.subscriptions.get(subscriptionId);
    const invoice = this.invoice(subscription, 'monthly', amount,
      { created: second() - 86400, status: 'paid', paid: true, amount_paid: amount,
        amount_remaining: 0, status_transitions: { paid_at: second() - 86400 }, ...patch });
    invoice.payment_intent = this.payment(amount, { ...subscription.metadata }, subscription.currency);
    return invoice;
  }
  completeSession(id) {
    const session = this.sessions.get(id);
    session.status = 'complete'; session.payment_status = session.amount_total ? 'paid' : 'no_payment_required';
    if (session.mode === 'subscription') {
      const subscription = this.subscriptions.get(session.subscription);
      subscription.status = 'active'; this.payInvoice(session.invoice);
    } else session.payment_intent = this.payment(session.amount_total, session.metadata, session.currency);
    return session;
  }
  payInvoice(id, patch = {}) {
    const invoice = this.invoices.get(id), sub = this.subscriptions.get(invoice.subscription);
    if (sub?.pending && sub.pending.invoice_id === id) {
      sub.items.data[0].price.id = sub.pending.plan_price;
      sub.metadata = { ...sub.pending.metadata }; sub.pending = null; sub.pending_update = null;
      sub.current_period_end = invoice.lines.data[0].period.end;
    }
    Object.assign(invoice, { status: 'paid', paid: true, amount_paid: invoice.amount_due, amount_remaining: 0,
      status_transitions: { paid_at: second() }, ...patch });
    invoice.payment_intent ||= this.payment(invoice.amount_paid, sub?.metadata || {}, invoice.currency);
    return invoice;
  }
  voidInvoice(id) {
    const invoice = this.invoices.get(id), sub = this.subscriptions.get(invoice.subscription);
    invoice.status = 'void'; invoice.paid = false;
    if (sub?.pending?.invoice_id === id) { sub.pending = null; sub.pending_update = null; }
    return invoice;
  }
  refundIntent(id, cumulativeAmount) {
    const intent = this.intents.get(id), charge = this.charges.get(intent.latest_charge);
    charge.amount_refunded = cumulativeAmount === undefined ? charge.amount : cumulativeAmount;
    charge.refunded = charge.amount_refunded === charge.amount;
    return charge;
  }
  pauseNextUpgrade() {
    let release; const gate = new Promise(resolve => { release = resolve; });
    let started; const ready = new Promise(resolve => { started = resolve; });
    this.upgradeGate = { gate, started }; return { ready, release };
  }
  // The webhook endpoint version can differ from the REST version pinned by CRP.
  // Basil removes these legacy invoice/line fields; the REST map above retains them.
  webhookInvoice(invoice) {
    const object = clone(invoice);
    const subscriptionId = typeof object.subscription === 'string' ? object.subscription : object.subscription?.id;
    object.parent = { type: 'subscription_details', subscription_details: {
      subscription: subscriptionId, metadata: clone(this.subscriptions.get(subscriptionId)?.metadata || {}) } };
    delete object.subscription; delete object.payment_intent;
    object.lines.data = object.lines.data.map(line => {
      const priceId = typeof line.price === 'string' ? line.price : line.price?.id;
      line.pricing = { type: 'price_details', price_details: { price: priceId, product: 'prod_fixture_invoice' } };
      delete line.price; return line;
    });
    return object;
  }
  signed(type, object, id, eventPatch = {}) {
    const body = { id: id || 'evt_fixture_' + ++this.sequence, object: 'event', type,
      created: second(), livemode: false, data: { object: clone(object) }, ...eventPatch };
    const raw = JSON.stringify(body), at = second();
    return { raw, headers: { 'Content-Type': 'application/json',
      'stripe-signature': 't=' + at + ',v1=' + crypto.createHmac('sha256', SECRET).update(at + '.' + raw).digest('hex') } };
  }
  async route(call) {
    const p = call.params, id = call.path.split('/')[call.path.startsWith('/v1/checkout/sessions/') ? 4 : 3];
    const yes = body => ({ body: clone(body) });
    const missing = () => ({ status: 404, body: { error: { message: 'fictional object missing' } } });
    const key = call.method === 'POST' && call.idempotency_key
      ? call.path + ':' + call.idempotency_key : null;
    if (key && this.idempotent.has(key)) return yes(this.idempotent.get(key));
    const saved = body => { if (key) this.idempotent.set(key, clone(body)); return yes(body); };
    if (call.method === 'GET' && call.path.startsWith('/v1/prices/')) {
      const { code, currency, amount } = this.prices.get(id) || {};
      return code ? yes({ id, currency, unit_amount: amount, livemode: false,
        type: code === 'report_once' ? 'one_time' : 'recurring',
        ...(code === 'report_once' ? {} : { recurring: { interval: code === 'monthly' ? 'month' : 'year' } }) }) : missing();
    }
    if (call.method === 'POST' && call.path === '/v1/coupons') {
      if (this.coupons.has(p.id)) return { status: 400, body: { error: { message: 'Coupon ID already exists' } } };
      const coupon = { ...p, amount_off: Number(p.amount_off), max_redemptions: Number(p.max_redemptions) };
      this.coupons.set(coupon.id, coupon); return saved(coupon);
    }
    if (call.method === 'POST' && call.path === '/v1/checkout/sessions') {
      const selectedPrice = p['line_items[0][price]'];
      const { code, currency, amount } = this.prices.get(selectedPrice) || {};
      const metadata = this.metadata(p), discount = this.coupons.get(p['discounts[0][coupon]'])?.amount_off || 0;
      const sessionId = 'cs_fixture_' + ++this.sequence;
      const session = { id: sessionId, object: 'checkout.session', mode: p.mode, status: 'open',
        payment_status: 'unpaid', amount_total: amount - discount, currency,
        client_reference_id: p.client_reference_id, metadata, livemode: false, created: second(),
        expires_at: second() + 86400, subscription: null, invoice: null, payment_intent: null,
        line_items: { data: [{ price: { id: selectedPrice }, quantity: 1 }] }, url: 'https://checkout.stripe.com/c/' + sessionId };
      if (p.mode === 'subscription') {
        const subId = 'sub_fixture_' + ++this.sequence;
        const sub = { id: subId, object: 'subscription', currency, livemode: false, metadata: this.metadata(p, 'subscription_data[metadata]'),
          status: 'incomplete', customer: 'cus_' + p.client_reference_id, collection_method: 'charge_automatically',
          cancel_at_period_end: false, pending_update: null, schedule: null,
          current_period_end: second() + (code === 'annual' ? 366 : 31) * 86400,
          items: { data: [{ id: 'si_fixture_' + this.sequence, price: { id: selectedPrice }, quantity: 1 }] } };
        this.subscriptions.set(sub.id, sub); const invoice = this.invoice(sub, code, session.amount_total);
        sub.latest_invoice = invoice.id; session.subscription = sub.id; session.invoice = invoice.id;
      }
      this.sessions.set(session.id, session); return saved(session);
    }
    if (call.path.startsWith('/v1/checkout/sessions/') && call.method === 'GET') {
      return this.sessions.has(id) ? yes(this.sessions.get(id)) : missing();
    }
    if (call.path.endsWith('/expire') && call.method === 'POST') {
      const session = this.sessions.get(id); if (!session) return missing(); session.status = 'expired'; return yes(session);
    }
    if (call.path.startsWith('/v1/subscriptions/')) {
      const sub = this.subscriptions.get(id); if (!sub) return missing();
      if (call.method === 'GET') return yes(sub);
      if (p.payment_behavior) {
        if (this.upgradeGate) { const hold = this.upgradeGate; this.upgradeGate = null; hold.started(); await hold.gate; }
        if (this.failUpgrade) { this.failUpgrade = false; return { status: 400, body: { error: { message: 'fictional definitive upgrade refusal' } } }; }
        const discount = this.coupons.get(p['discounts[0][coupon]'])?.amount_off || 0;
        const selectedPrice = p['items[0][price]'];
        const invoice = this.invoice(sub, 'annual', this.prices.get(selectedPrice).amount - discount);
        invoice.lines.data[0].price.id = selectedPrice;
        invoice.lines.data[0].amount = this.prices.get(selectedPrice).amount;
        sub.pending = { invoice_id: invoice.id, plan_price: p['items[0][price]'], metadata: this.metadata(p) };
        // Stripe metadata may change before the pending price change is paid.
        sub.metadata = { ...sub.pending.metadata };
        sub.pending_update = { expires_at: second() + 23 * 3600,
          subscription_items: [{ id: p['items[0][id]'], price: p['items[0][price]'], quantity: Number(p['items[0][quantity]']) }] };
        sub.latest_invoice = invoice.id;
        const result = saved({ ...sub, latest_invoice: invoice });
        if (this.loseUpgradeResponse) { this.loseUpgradeResponse = false; return { close: true }; }
        return result;
      }
      if ('cancel_at_period_end' in p) sub.cancel_at_period_end = p.cancel_at_period_end === 'true';
      const metadata = this.metadata(p);
      if (Object.keys(metadata).length) Object.assign(sub.metadata, metadata);
      return yes(sub);
    }
    if (call.method === 'GET' && call.path === '/v1/invoices') {
      const list = [...this.invoices.values()].filter(invoice => invoice.subscription === call.query.subscription || invoice.include_in_list_for === call.query.subscription);
      const start = call.query.starting_after ? list.findIndex(invoice => invoice.id === call.query.starting_after) + 1 : 0;
      return yes({ object: 'list', data: list.slice(start, start + this.pageSize), has_more: start + this.pageSize < list.length });
    }
    if (call.path.startsWith('/v1/invoices/')) {
      if (call.method === 'GET' && this.invoiceReadOverrides.has(id)) return clone(this.invoiceReadOverrides.get(id));
      const invoice = this.invoices.get(id); if (!invoice) return missing();
      if (call.method === 'POST' && call.path.endsWith('/void')) return yes(this.voidInvoice(id));
      return yes(invoice);
    }
    if (call.path.startsWith('/v1/payment_intents/')) return this.intents.has(id) ? yes(this.intents.get(id)) : missing();
    if (call.path.startsWith('/v1/charges/')) return this.charges.has(id) ? yes(this.charges.get(id)) : missing();
    return missing();
  }
}
module.exports = { StripeUpgradeFixture, PRICES, AMOUNTS, clone };
