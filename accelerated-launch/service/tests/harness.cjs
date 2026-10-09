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
const { buildPdf } = require('../../../internal-validation/ca-ns-last-payment-six-year/synthetic/make-synthetic-pdf.cjs');
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
    const bytes = Buffer.from(await response.arrayBuffer());
    const type = response.headers.get('content-type') || '';
    const text = /application\/(pdf|zip)/.test(type)
      ? require('./packet-pdf-assertions.cjs').packetText(bytes) : bytes.toString('utf8');
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
      bytes,
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

  /** Open a checkout intent through the real endpoint. A one-time unlock is bound to the case it unlocks. */
  async openCheckout(actor, planCode, caseId) {
    const body = { plan_code: planCode || 'monthly' };
    if (planCode === 'annual') {
      const view = await this.request('GET', '/api/billing/plans', { token: actor.token });
      if (view.json?.entitlement?.entitled && view.json.entitlement.access_via === 'SUBSCRIPTION') {
        body.quote_revision = view.json.upgrade_quotes.annual.revision;
      }
    }
    if (planCode === 'report_once' && caseId) body.case_id = caseId;
    return this.request('POST', '/api/billing/checkout', { token: actor.token, body });
  }

  /**
   * A new case for this actor holding one fictional report that has been assessed, so a one-time unlock has a
   * valid report to buy. Returns the case id.
   */
  async assessedCase(actor) {
    const created = await this.request('POST', '/api/cases', { token: actor.token, body: { country: 'CA', region: 'CA-NS' } });
    if (created.status !== 201) throw new Error(`case creation failed: ${created.status} ${created.text}`);
    const caseId = created.json.case.case_id;
    const pdf = buildPdf({ pages: [{ lines: ['Equifax  Consumer Credit Report', 'Report Date: June 12, 2026', 'Creditor A  Balance $100  Opened 01/01/2020  Closed 01/01/2019'] }] });
    await this.request('POST', `/api/cases/${caseId}/files`, {
      token: actor.token,
      body: { originalFilename: 'fictional-assessment.pdf', declaredBytes: pdf.length, mimeType: 'application/pdf', contentBase64: pdf.toString('base64') }
    });
    await this.request('POST', `/api/cases/${caseId}/evaluate`, { token: actor.token });
    return caseId;
  }

  /** Post one provider event through the real webhook endpoint. `signed: false` exercises the refusal path. */
  postEvent(body, signed) {
    const prepared = signed === false ? unsignedEvent(body) : signTestEvent(body);
    return this.request('POST', '/api/billing/events', { raw: prepared.raw, headers: prepared.headers });
  }

  /** Pay for one plan the way a provider would: a real checkout, then a real signed event. */
  async pay(actor, planCode, caseId) {
    const plan = planCode || 'monthly';
    const pending = (await this.request('GET', '/api/billing/plans', { token: actor.token })).json.pending_checkout;
    let checkout;
    if (pending?.plan_code === plan && (plan !== 'report_once' || pending.case_id === caseId)) {
      const resumed = await this.request('POST', '/api/billing/checkout', { token: actor.token,
        body: { plan_code: plan, resume_checkout_id: pending.checkout_id } });
      if (resumed.status !== 201) throw new Error(`checkout resume failed: ${resumed.status}`);
      checkout = resumed;
    } else checkout = await this.openCheckout(actor, plan, caseId);
    if (checkout.status !== 201) throw new Error(`checkout failed: ${checkout.status} ${checkout.text}`);
    const reference = checkout.json.checkout.provider_reference;
    const event = {
      id: `test_evt_${crypto.randomBytes(8).toString('hex')}`,
      type: 'checkout.session.completed',
      account_reference: actor.account_id,
      plan_code: plan,
      session_reference: reference,
      amount_cents: checkout.json.checkout.upgrade_credit?.first_invoice_cents ?? checkout.json.checkout.plan.amount_cents,
      currency: checkout.json.checkout.plan.currency,
      occurred_at: new Date().toISOString()
    };
    const posted = await this.postEvent(event);
    if (posted.status !== 200 || posted.json.event.accepted !== true) {
      throw new Error(`entitlement activation failed: ${posted.status} ${posted.text}`);
    }
    return { checkout_id: checkout.json.checkout.checkout_id, reference, event, response: posted.json.event };
  }

  /**
   * Convenience: a signed-in account that HOLDS a recorded purchase, obtained through the real path.
   *
   * OWNER-PURCHASE-FLOW-001: the full paid service (complete assessments, downloads, dispute packets, history
   * and comparison) is unlocked by a SUBSCRIPTION. Sections that exercise those flows therefore hold a monthly
   * plan; the one-time report unlock is exercised explicitly where a section tests it.
   */
  async account(email) {
    const actor = await this.unpaidAccount(email);
    actor.payment = await this.pay(actor, 'monthly');
    return actor;
  }

  /** Explicit fictional mail preparation for a positive HTTP packet journey.
   * Uses the real profile, document and support endpoints; no production gate is bypassed.
   * Callers testing missing details must leave this helper out. */
  async preparePostalPacket(actor, caseId) {
    const base = `/api/cases/${caseId}`;
    const cases = await this.request('GET', '/api/cases', { token: actor.token });
    const owned = cases.json.cases.find(c => c.case_id === caseId);
    const view = (await this.request('GET', base + '/packet', { token: actor.token })).json.view;
    const bureau = view.support.requirements?.bureau || owned.selected_bureau || view.support.catalog[0].id;
    const correspondence = view.packet.correspondence;
    const currentProfile = (await this.request('GET', '/api/account/profile', { token: actor.token })).json.profile;
    const fictionalName = correspondence.consumer_name || 'Morgan Fiction';
    const fictionalNameParts = fictionalName.split(/\s+/);
    const profile = { full_name: fictionalName, given_name: fictionalNameParts[0], family_name: fictionalNameParts.slice(1).join(' ') || 'Fiction', date_of_birth: '1980-04-12',
      phone: '555-0100', contact_email: 'morgan@example.test', address_line1: (correspondence.contact || '12 Example Street').replace(/[\r\n]+/g, ', ').slice(0, 180),
      address_line2: '', city: 'Example City', region: owned.region.replace(/^[A-Z]{2}-/, ''), postal_code: '00000', country: owned.country, previous_address: '' };
    // Fictional fixture values are declared here; runtime never guesses consumers' name parts.
    const existingParts = currentProfile.full_name ? currentProfile.full_name.split(/\s+/) : [];
    const savedProfile = currentProfile.full_name ? { ...currentProfile,
      given_name: currentProfile.given_name || existingParts[0],
      family_name: currentProfile.family_name || existingParts.slice(1).join(' ') || 'Fiction',
      region: currentProfile.region === 'Example Region' ? profile.region : currentProfile.region } : profile;
    const saved = await this.request('PUT', '/api/account/profile', { token: actor.token, body: { profile: savedProfile } });
    if (saved.status !== 200) throw new Error(`fictional mail profile failed: ${saved.text}`);
    const settings = { bureau, channel: 'POSTAL', purpose: view.support.suggested_purpose || 'ACCOUNT', document_ids: [],
      use_account_profile: true, identity_reference: owned.country === 'US' ? '000000000' : '', no_ssn_issued: false,
      identity_shows_address: false, verification_requested: false, copies_confirmed: true, document_dates: {}, other_identity_details: '' };
    const existing = (await this.request('GET', '/api/account/documents', { token: actor.token })).json.documents;
    for (const [type, kind] of [['IDENTITY', 'DRIVING_LICENCE'], ['IDENTITY', owned.country === 'US' && bureau === 'EQUIFAX' ? 'SOCIAL_SECURITY' : 'PASSPORT'], ['ADDRESS', 'UTILITY_BILL']]) {
      const prior = existing.find(doc => doc.document_type === type && doc.document_kind === kind && doc.original_filename === `fictional-${kind}.pdf`);
      if (prior) {
        settings.document_ids.push(prior.file_id);
        settings.document_dates[prior.file_id] = new Date().toISOString().slice(0, 10);
        continue;
      }
      const bytes = buildPdf({ pages: [{ lines: ['FICTIONAL TEST DOCUMENT', type, kind, actor.account_id] }] });
      const uploaded = await this.request('POST', '/api/account/documents', { token: actor.token, body: {
        originalFilename: `fictional-${kind}.pdf`, declaredBytes: bytes.length, mimeType: 'application/pdf',
        contentBase64: bytes.toString('base64'), document_type: type, document_kind: kind } });
      if (uploaded.status !== 201) throw new Error(`fictional mail document failed: ${uploaded.text}`);
      settings.document_ids.push(uploaded.json.document.file_id);
      settings.document_dates[uploaded.json.document.file_id] = new Date().toISOString().slice(0, 10);
    }
    const prepared = await this.request('POST', base + '/packet/support', { token: actor.token, body: { support: settings } });
    if (prepared.status !== 200 || prepared.json.view.support.missing.length) throw new Error(`fictional mail checklist failed: ${prepared.text}`);
    return prepared.json.view;
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
