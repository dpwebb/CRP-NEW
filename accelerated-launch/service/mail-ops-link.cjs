'use strict';
// Local/staging simulation producer. No provider SDK, packet bytes, contact data or payment execution is transmitted.
const crypto = require('node:crypto');
const { ServiceError } = require('./errors.cjs');
const cases = require('./cases.cjs'), packets = require('./packets.cjs'), entitlement = require('./entitlement.cjs');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const fail = code => { throw new ServiceError(code); };
function configuration(env = process.env) {
  let origin;
  try { const url = new URL(env.CRP_MAIL_OPS_URL); if (url.protocol === 'http:' && url.hostname === '127.0.0.1' && url.port && url.pathname === '/' && !url.username && !url.password && !url.search && !url.hash) origin = url.origin; } catch {}
  const local = env.CRP_MAIL_OPS_MODE === 'local-simulation' && env.CRP_DEPLOYMENT_ENV === 'local'
    && env.CRP_PAYMENT_PROVIDER === 'test-adapter-not-a-payment' && env.CRP_ALLOW_TEST_PAYMENT_ADAPTER === '1';
  const staging = env.CRP_MAIL_OPS_MODE === 'staging-simulation' && env.CRP_DEPLOYMENT_ENV === 'staging'
    && env.CRP_PAYMENT_PROVIDER === 'stripe' && /^sk_test_/.test(env.STRIPE_SECRET_KEY || '') && origin === 'http://127.0.0.1:4335';
  const enabled = (local || staging)
    && /^[a-f0-9]{64}$/.test(env.CRP_MAIL_OPS_KEY || '') && /^[a-f0-9]{64}$/.test(env.CRP_MAIL_OPS_PAYMENT_KEY || '')
    && env.CRP_MAIL_OPS_KEY !== env.CRP_MAIL_OPS_PAYMENT_KEY && Boolean(origin);
  return { enabled, origin, source: staging ? 'CRP_STAGING_SIMULATION' : 'CRP_LOCAL_SIMULATION', key: env.CRP_MAIL_OPS_KEY, paymentKey: env.CRP_MAIL_OPS_PAYMENT_KEY };
}
function exact(body, keys) { if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(k => !keys.includes(k)) || keys.some(k => !Object.hasOwn(body, k))) fail('INVALID_REQUEST'); }
function create(store, env = process.env) {
  const busy = new Set();
  function authorize(actor, caseId) {
    const owned = cases.requireOwnedCase(store, actor, caseId);
    entitlement.requireSubscriberFeature(store, actor);
    const config = configuration(env);
    if (!config.enabled) fail('MAILING_SIMULATION_UNAVAILABLE');
    return { owned, config };
  }
  function packetRow(state, actor, caseId) {
    const row = state.packets.find(p => p.case_id === caseId && p.account_id === actor.account_id);
    if (!row) fail('PACKET_NO_SELECTION');
    return row;
  }
  const attempts = (actor, caseId) => packetRow(store.state(), actor, caseId).mailing_simulations || [];
  function update(actor, caseId, id, values) {
    store.update(state => {
      const row = packetRow(state, actor, caseId).mailing_simulations.find(item => item.id === id);
      if (!row) fail('MAILING_QUOTE_STALE'); Object.assign(row, values);
    });
  }
  async function locked(actor, caseId, fn) {
    const key = actor.account_id + ':' + caseId;
    if (busy.has(key)) fail('MAILING_ORDER_CHANGED'); busy.add(key);
    try { return await fn(); } finally { busy.delete(key); }
  }
  async function remote(config, principal, method, path, data) {
    const raw = data === undefined ? '' : JSON.stringify(data), timestamp = String(Date.now()), nonce = crypto.randomUUID();
    const key = principal === 'payment' ? config.paymentKey : config.key;
    const signature = crypto.createHmac('sha256', key).update(['crp-mail-v1', principal, timestamp, nonce, method, path, sha(raw)].join('\n')).digest('hex');
    try {
      const response = await fetch(config.origin + path, { method, redirect: 'error', signal: AbortSignal.timeout(4000),
        headers: { ...(raw ? { 'content-type': 'application/json' } : {}), 'x-mail-principal': principal, 'x-mail-timestamp': timestamp, 'x-mail-nonce': nonce, 'x-mail-signature': signature },
        ...(raw ? { body: raw } : {}) });
      const chunks = []; let size = 0;
      for await (const chunk of response.body) { size += chunk.length; if (size > 65536) throw Error('BOUND'); chunks.push(chunk); }
      const result = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (!response.ok) {
        if (['QUOTE_EXPIRED', 'AUTHORIZATION_EXPIRED', 'APPROVAL_INVALID'].includes(result.error)) fail('MAILING_QUOTE_STALE');
        if (['SUBMISSION_MAY_HAVE_OCCURRED','ORDER_NOT_PAYABLE','PAYMENT_ALREADY_REFUNDED'].includes(result.error)) fail('MAILING_ORDER_CHANGED');
        throw Error('REFUSED');
      }
      return result;
    } catch (error) { if (error instanceof ServiceError) throw error; fail('MAILING_SERVICE_UNAVAILABLE'); }
  }
  function current(actor, caseId, expectedVersion, config) {
    const owned = cases.requireOwnedCase(store, actor, caseId), view = packets.packetView(store, actor, caseId);
    const file = packets.packetDownload(store, actor, caseId);
    require('./packet-support.cjs').requirePostalPacket(view);
    if (file.approved_version !== expectedVersion) fail('MAILING_QUOTE_STALE');
    const destination = view.support.requirements;
    if (!destination?.postal) fail('PACKET_SUPPORT_REQUIRED');
    const ownerRef = 'crp:' + crypto.createHmac('sha256', config.key).update('owner:' + actor.account_id).digest('hex');
    return { ownerRef, file, pdfHash: sha(file.body), label: destination.label, address: destination.postal,
      payload: { source: configuration(env).source, ownerRef,
        packet: { version: file.approved_version, sha256: sha(file.body), pages: file.page_count },
        recipient: { bureau: destination.bureau, country: owned.country, addressRef: 'crp:' + sha(destination.postal) }, service: 'SIMULATED_REGISTERED' } };
  }
  function quoteView(record) {
    return { simulation: true, mail_ready: false, quote_id: record.quote.id, amount_minor: record.quote.amountMinor,
      currency: record.quote.currency, expires_at: record.quote.expiresAt, packet_hash: record.packet_hash,
      packet_version: record.packet_version, page_count: record.quote.snapshot.packet.pages,
      recipient_label: record.label, recipient_address: record.address, service: 'Simulated registered mailing' };
  }
  function validateQuote(q, expected) {
    if (!q || !/^[a-f0-9-]{36}$/.test(q.id) || q.simulated !== true || !Number.isSafeInteger(q.amountMinor) || q.amountMinor < 1
      || q.currency !== ({CA:'CAD',US:'USD',GB:'GBP',AU:'AUD'})[expected.recipient.country]
      || !Number.isSafeInteger(q.expiresAt) || q.expiresAt <= Date.now() || q.expiresAt > Date.now() + 1800000
      || !q.snapshot || q.snapshotHash !== sha(JSON.stringify(q.snapshot))) fail('MAILING_SERVICE_UNAVAILABLE');
    for (const field of ['source','ownerRef','packet','recipient','service']) if (JSON.stringify(q.snapshot[field]) !== JSON.stringify(expected[field])) fail('MAILING_SERVICE_UNAVAILABLE');
    if (q.snapshot.quoteId !== q.id || q.snapshot.expiresAt !== q.expiresAt || q.snapshot.pricing?.amountMinor !== q.amountMinor || q.snapshot.pricing?.currency !== q.currency) fail('MAILING_SERVICE_UNAVAILABLE');
  }
  function validateOrder(order, record) {
    if (!order || order.simulated !== true || order.ownerRef !== record.quote.snapshot.ownerRef || order.quoteId !== record.quote.id
      || order.packetHash !== record.packet_hash || order.snapshotHash !== record.quote.snapshotHash || order.amountMinor !== record.quote.amountMinor || order.currency !== record.quote.currency
      || !/^[a-f0-9-]{36}$/.test(order.id) || (record.order_id && record.order_id !== order.id)) fail('MAILING_SERVICE_UNAVAILABLE');
    return { id: order.id, state: order.state, payment_state: order.paymentState, provider_ref: order.providerRef ?? null,
      amount_minor: order.amountMinor, currency: order.currency, packet_hash: order.packetHash, simulation: true };
  }
  async function status(actor, caseId) {
    const { config } = authorize(actor, caseId);
    const record = attempts(actor, caseId).at(-1);
    if (!record) return { simulation: true, available: true, quote: null, order: null, pending: false };
    let order = record.order || null;
    if (record.order_id) {
      order = validateOrder(await remote(config, 'integration', 'GET', `/api/v1/orders/${record.order_id}?ownerRef=${encodeURIComponent(record.quote.snapshot.ownerRef)}`), record);
      update(actor, caseId, record.id, { order });
    }
    const packet = packets.packetView(store, actor, caseId).packet;
    return { simulation: true, available: true, quote: quoteView(record), order,
      pending: Boolean(record.confirmed_at && !order), payment_pending: Boolean(record.confirmed_at && order?.payment_state === 'UNPAID'),
      packet_changed: !packet.approved || packet.approved_version !== record.packet_version };
  }
  async function quote(actor, caseId, body) {
    const { config } = authorize(actor, caseId); exact(body, ['reviewed_version']);
    return locked(actor, caseId, async () => {
      const prepared = current(actor, caseId, body.reviewed_version, config), history = attempts(actor, caseId);
      const outstanding = history.findLast(r => r.packet_hash === prepared.pdfHash && r.confirmed_at && !['CANCELLED','FAILED'].includes(r.order?.state));
      if (outstanding) fail('MAILING_ORDER_CHANGED');
      const last = history.at(-1);
      if (last && !last.confirmed_at && last.packet_hash === prepared.pdfHash && last.quote.expiresAt > Date.now()) return { quote: quoteView(last) };
      if (history.length >= 20) fail('MAILING_ORDER_CHANGED');
      const q = await remote(config, 'integration', 'POST', '/api/v1/quotes', prepared.payload);
      validateQuote(q, prepared.payload);
      const after = current(actor, caseId, body.reviewed_version, config);
      if (after.pdfHash !== prepared.pdfHash) fail('MAILING_QUOTE_STALE');
      const record = { id: crypto.randomUUID(), quote: q, packet_hash: prepared.pdfHash, packet_version: body.reviewed_version, label: prepared.label, address: prepared.address };
      store.update(state => { const packet = packetRow(state, actor, caseId); (packet.mailing_simulations ||= []).push(record); });
      return { quote: quoteView(record) };
    });
  }
  async function confirm(actor, caseId, body) {
    const { config } = authorize(actor, caseId); exact(body, ['quote_id','reviewed_version','authorize_mailing','simulate_payment']);
    if (body.authorize_mailing !== true || body.simulate_payment !== true) fail('MAILING_CONFIRMATION_REQUIRED');
    return locked(actor, caseId, async () => {
      let record = attempts(actor, caseId).find(r => r.quote.id === body.quote_id);
      if (!record || record.packet_version !== body.reviewed_version) fail('MAILING_QUOTE_STALE');
      const prepared = current(actor, caseId, body.reviewed_version, config);
      if (prepared.pdfHash !== record.packet_hash || JSON.stringify(prepared.payload.recipient) !== JSON.stringify(record.quote.snapshot.recipient)) fail('MAILING_QUOTE_STALE');
      if (!record.confirmed_at) {
        if (record.quote.expiresAt <= Date.now()) fail('MAILING_QUOTE_STALE');
        update(actor, caseId, record.id, { confirmed_at: Date.now(), approval_expires_at: Math.min(Date.now() + 600000, record.quote.expiresAt) });
        record = attempts(actor, caseId).find(r => r.id === record.id);
      }
      const created = await remote(config, 'integration', 'POST', '/api/v1/orders', { ownerRef: record.quote.snapshot.ownerRef,
        quoteId: record.quote.id, idempotencyKey: 'crp:' + record.id,
        approval: { ref: 'crp:' + record.id, snapshotHash: record.quote.snapshotHash, approvedAt: record.confirmed_at, expiresAt: record.approval_expires_at } });
      let order = validateOrder(created, record);
      update(actor, caseId, record.id, { order_id: order.id, order });
      const after = current(actor, caseId, body.reviewed_version, config);
      if (after.pdfHash !== record.packet_hash) fail('MAILING_QUOTE_STALE');
      if (order.payment_state === 'UNPAID') {
        order = validateOrder(await remote(config, 'payment', 'POST', '/api/v1/simulation/payments', {
          eventId: 'crp:' + record.id, paymentRef: 'crp-sim:' + record.id, orderId: order.id,
          amountMinor: record.quote.amountMinor, currency: record.quote.currency, type: 'SIMULATED_PAID' }), record);
        update(actor, caseId, record.id, { order });
      }
      return { simulation: true, quote: quoteView(record), order, pending: false, payment_pending: order.payment_state === 'UNPAID' };
    });
  }
  async function cancel(actor, caseId, body) {
    const { config } = authorize(actor, caseId); exact(body, ['order_id']);
    return locked(actor, caseId, async () => {
      const record = attempts(actor, caseId).find(r => r.order_id === body.order_id);
      if (!record) fail('NOT_FOUND');
      const order = validateOrder(await remote(config, 'integration', 'POST', `/api/v1/orders/${record.order_id}/cancel`, { ownerRef: record.quote.snapshot.ownerRef }), record);
      update(actor, caseId, record.id, { order });
      return { simulation: true, quote: quoteView(record), order };
    });
  }
  return { status, quote, confirm, cancel };
}
module.exports = { configuration, create };
