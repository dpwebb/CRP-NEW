'use strict';
/**
 * harness.cjs — the shared test harness for the B2 vertical slice.
 *
 * OWNER-ALL82-001 / B2. Each test run gets its own real HTTP listener on loopback with an ephemeral port and
 * its own private data directory outside the repository. Nothing is stubbed between the HTTP request and the
 * shared adapters: the transport, the store, the admission gate, the extraction, the rule adapters and the
 * renderer are all the production modules.
 *
 * No credential, no remote host and no report is read by this harness. The only optional external input is
 * the evidenced specimen, and only in the one section that declares it.
 */

const fs = require('fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { createService } = require('../app.cjs');
const { TEST_SECRET_NAME, TEST_ADAPTER_FLAG, TEST_PROVIDER_ID, SIGNATURE_HEADER } = require('../payment-provider.cjs');

/**
 * B4 — the harness buys access the same way a provider would.
 *
 * The suite needs entitled accounts for the journey sections to keep working, and it must not obtain that state
 * by reaching past the production gate. So the harness enables the TEST ADAPTER (which is not a payment), opens
 * a real checkout intent through the real endpoint, and posts a REAL SIGNED EVENT through the real verification
 * path. Nothing in `service/` knows the tests exist: the only test-only inputs are the two environment flags
 * and a synthetic signing secret, none of which is a credential.
 */
const TEST_SECRET = 'crp-test-adapter-signing-secret-not-a-credential';
process.env.CRP_PAYMENT_PROVIDER = process.env.CRP_PAYMENT_PROVIDER || TEST_PROVIDER_ID;
process.env[TEST_ADAPTER_FLAG] = process.env[TEST_ADAPTER_FLAG] || '1';
process.env[TEST_SECRET_NAME] = process.env[TEST_SECRET_NAME] || TEST_SECRET;

const REPOSITORY_ROOT = path.resolve(__dirname, '..', '..', '..');

/**
 * B5-PREFLIGHT-003: the runtime reads CA specimen paths from the environment, never from a hardcoded checkout
 * path or the historical register. For the DEV machine only, seed those two variables from the preserved
 * PROD-003 register so the suite can re-measure the real specimens. On a host without them the values stay
 * unset and the exact-specimen checks report the specimen as unavailable, as intended.
 */
(function seedSpecimenPaths() {
  const registerFile = path.join(REPOSITORY_ROOT, 'SOURCE_CAPTURES', 'PROD-003', 'report_representation_register.json');
  if (!fs.existsSync(registerFile)) return;
  const register = JSON.parse(fs.readFileSync(registerFile, 'utf8'));
  const row = (id) => register.presentations.find((p) => p.presentation_id === id);
  const eq = row('PR-01');
  const tu = row('PR-02');
  if (!process.env.CRP_CA_EQUIFAX_SPECIMEN && eq && eq.absolute_path_outside_this_repository) {
    process.env.CRP_CA_EQUIFAX_SPECIMEN = eq.absolute_path_outside_this_repository;
  }
  if (!process.env.CRP_CA_TRANSUNION_SPECIMEN && tu && tu.absolute_path_outside_this_repository) {
    process.env.CRP_CA_TRANSUNION_SPECIMEN = tu.absolute_path_outside_this_repository;
  }
})();

/** Build one signed provider event. The header format is the one `verifySignature` implements. */
function signTestEvent(body) {
  const raw = JSON.stringify(body);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto.createHmac('sha256', TEST_SECRET).update(`${timestamp}.${raw}`, 'utf8').digest('hex');
  return { raw, headers: { 'Content-Type': 'application/json', [SIGNATURE_HEADER]: `t=${timestamp},v1=${signature}` } };
}

function unsignedEvent(body) {
  return { raw: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } };
}

/** A private data directory, guaranteed outside the repository. */
function temporaryDataDir(tag) {
  const dir = path.join(os.tmpdir(), `crp-b2-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`);
  fs.rmSync(dir, { recursive: true, force: true });
  const relative = path.relative(REPOSITORY_ROOT, dir);
  if (relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))) {
    throw new Error(`REFUSING_TO_RUN: temporary data dir ${dir} is inside the repository`);
  }
  return dir;
}

class TestService {
  constructor(tag) {
    this.dataDir = temporaryDataDir(tag || 'run');
    this.logs = [];
    this.service = createService({ dataDir: this.dataDir, logSink: (line) => this.logs.push(line) });
    this.server = http.createServer((req, res) => {
      this.service.handle(req, res).catch(() => {
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: { code: 'INTERNAL_ERROR', message: 'test harness', detail: null } }));
        }
      });
    });
  }

  listen() {
    return new Promise((resolve) => {
      this.server.listen(0, '127.0.0.1', () => {
        this.port = this.server.address().port;
        this.base = `http://127.0.0.1:${this.port}`;
        resolve(this);
      });
    });
  }

  /** One request. `token` is passed as a bearer header so direct-object requests can be scripted. */
  async request(method, urlPath, options) {
    const opts = options || {};
    // Each isolated test request gets a fresh socket. Reusing an idle socket during
    // synchronous PDF extraction can race the loopback server's keep-alive timeout.
    // Concurrent requests still run concurrently; no assertion or retry is bypassed.
    const headers = Object.assign({ Connection: 'close' }, opts.headers || {});
    if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
    let body;
    if (opts.raw !== undefined) {
      body = opts.raw;
      if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
    } else if (opts.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(opts.body);
    }
    const response = await fetch(this.base + urlPath, { method, headers, body });
    const text = await response.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    return {
      status: response.status,
      json,
      text,
      headers: response.headers,
      setCookie: response.headers.get('set-cookie')
    };
  }

  /** Convenience: a signed-in account with NO purchase recorded. Used by the entitlement section. */
  async unpaidAccount(email) {
    const created = await this.request('POST', '/api/accounts', { body: { email, password: 'a-long-enough-password' } });
    if (created.status !== 201) throw new Error(`account creation failed: ${created.status} ${created.text}`);
    return { email, token: /crp_session=([^;]+)/.exec(created.setCookie || '')[1], account_id: created.json.account.account_id };
  }

  /** Open a checkout intent through the real endpoint. Returns the raw response. */
  openCheckout(actor, planCode) {
    return this.request('POST', '/api/billing/checkout', { token: actor.token, body: { plan_code: planCode || 'report_once' } });
  }

  /** Post one provider event through the real webhook endpoint. `signed: false` exercises the refusal path. */
  postEvent(body, signed) {
    const prepared = signed === false ? unsignedEvent(body) : signTestEvent(body);
    return this.request('POST', '/api/billing/events', { raw: prepared.raw, headers: prepared.headers });
  }

  /** Pay for one plan the way a provider would: a real checkout, then a real signed event. */
  async pay(actor, planCode) {
    const plan = planCode || 'report_once';
    const checkout = await this.openCheckout(actor, plan);
    if (checkout.status !== 201) throw new Error(`checkout failed: ${checkout.status} ${checkout.text}`);
    const reference = checkout.json.checkout.provider_reference;
    const event = {
      id: `test_evt_${crypto.randomBytes(8).toString('hex')}`,
      type: 'checkout.session.completed',
      account_reference: actor.account_id,
      plan_code: plan,
      session_reference: reference,
      amount_cents: checkout.json.checkout.plan.amount_cents,
      currency: checkout.json.checkout.plan.currency,
      occurred_at: new Date().toISOString()
    };
    const posted = await this.postEvent(event);
    if (posted.status !== 200 || posted.json.event.accepted !== true) {
      throw new Error(`entitlement activation failed: ${posted.status} ${posted.text}`);
    }
    return { checkout_id: checkout.json.checkout.checkout_id, reference, event, response: posted.json.event };
  }

  /** Convenience: a signed-in account that HOLDS a recorded purchase, obtained through the real path. */
  async account(email) {
    const actor = await this.unpaidAccount(email);
    actor.payment = await this.pay(actor, 'report_once');
    return actor;
  }

  blobFiles() {
    const dir = path.join(this.dataDir, 'blobs');
    return fs.existsSync(dir) ? fs.readdirSync(dir) : [];
  }

  logText() {
    return this.logs.join('\n');
  }

  close() {
    return new Promise((resolve) => {
      this.server.close(() => {
        fs.rmSync(this.dataDir, { recursive: true, force: true });
        resolve();
      });
    });
  }
}

/** Read the evidenced specimen WITHOUT copying it: read-only, and only when the register pins it. */
function readPinnedSpecimen() {
  const registerPath = path.join(REPOSITORY_ROOT, 'SOURCE_CAPTURES', 'PROD-003', 'report_representation_register.json');
  if (!fs.existsSync(registerPath)) return { available: false, reason: 'THE_PROD_003_REGISTER_IS_NOT_PRESENT' };
  const register = JSON.parse(fs.readFileSync(registerPath, 'utf8'));
  const presentation = register.presentations.find((p) => p.presentation_id === register.selected_presentation);
  if (!presentation) return { available: false, reason: 'NO_SELECTED_PRESENTATION_IN_THE_REGISTER' };
  const file = presentation.absolute_path_outside_this_repository;
  if (!fs.existsSync(file)) return { available: false, reason: 'THE_EVIDENCED_SPECIMEN_IS_NOT_ON_THIS_MACHINE' };
  const bytes = fs.readFileSync(file);
  const digest = require('node:crypto').createHash('sha256').update(bytes).digest('hex').toUpperCase();
  if (digest !== presentation.sha256) return { available: false, reason: 'THE_FILE_NO_LONGER_MATCHES_THE_RECORDED_DIGEST' };
  return { available: true, path: file, bytes, sha256: digest, presentation_id: presentation.presentation_id, artifact_id: presentation.artifact_id };
}

module.exports = { TestService, temporaryDataDir, readPinnedSpecimen, signTestEvent, unsignedEvent, TEST_SECRET, REPOSITORY_ROOT };
