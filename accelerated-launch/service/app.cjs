'use strict';
/**
 * app.cjs — the local HTTP service. Node built-ins only; no framework, and no build step.
 *
 * OWNER-ALL82-001 / B2. Stack choice and its reasoning are recorded once in `README.md`. The transport layer
 * does exactly three things: authenticate, dispatch, and translate a typed refusal into a status code. It
 * owns no product decision, so every consumer-visible statement is produced by the modules behind it.
 *
 * The consumer surface served from `ui/` is a SEPARATE, private asset tree from the static site in
 * `consumer-wizard/dist`. Nothing here publishes a report, and `staticResponse` refuses every path that is
 * not a known file inside `ui/`.
 */

const fs = require('fs');
const path = require('path');
const { ServiceError, toBody } = require('./errors.cjs');
const { PrivateStore } = require('./private-store.cjs');
const { Logger } = require('./logger.cjs');
const accounts = require('./accounts.cjs');
const accountProfile = require('./account-profile.cjs');
const accountDocuments = require('./account-documents.cjs');
const cases = require('./cases.cjs');
const uploads = require('./uploads.cjs');
const formats = require('./formats.cjs');
const journey = require('./journey.cjs');
const packets = require('./packets.cjs');
const comparison = require('./comparison.cjs');
const evaluation = require('./evaluation.cjs');
const entitlement = require('./entitlement.cjs');
const retention = require('./retention.cjs');
const payments = require('./payment-provider.cjs');
const { CHECKS: COMMON_ERROR_CHECKLIST } = require('./common-error-checklist.cjs');

const UI_DIR = path.join(__dirname, 'ui');
const SESSION_COOKIE = 'crp_session';
const BODY_LIMIT_BYTES = 20 * 1024 * 1024;
const MATRIX_FILE = path.join(__dirname, '..', 'launch-matrix.json');

/**
 * B4: the response headers that cost nothing and close whole classes of defect. The CSP allows an inline
 * `style` attribute because the private UI sets one bar width inline; it still forbids every remote load, every
 * inline script and every frame, which is what matters for a page that renders a consumer's own report facts.
 */
const SECURITY_HEADERS = Object.freeze({
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'X-Permitted-Cross-Domain-Policies': 'none',
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'; connect-src 'self'; form-action 'none'; frame-ancestors 'none'; base-uri 'none'"
});

/**
 * Internal comparison kinds describe evidence mechanisms within the shared product checklist.
 * `no_issue_found_means` is the sentence the owner asked for: it says only what the performed checks found.
 */
const CHECK_CLASSES = Object.freeze({
  statutory_rule_comparison: {
    is_a_statutory_check: true,
    plain: 'An applicable statute can support a listed reporting check. The issue states the relevant rule and the report facts that support it.'
  },
  report_fact_consistency: {
    is_a_statutory_check: false,
    plain: 'Listed checks compare facts printed in your report. Supported reporting issues can be reviewed and selected for a correction or verification packet.'
  },
  printed_policy_observation: {
    is_a_statutory_check: false,
    label: 'PRINTED_POLICY_OBSERVATION_NOT_A_STATUTORY_FINDING',
    plain: 'A statement printed in your report can help explain a listed check. It does not establish a reporting issue by itself.'
  },
  never_summed: 'We use one common-error checklist. Statutory support and report facts can support the same issue without creating extra issue counts.',
  no_issue_found_means: 'We did not find a reporting issue in the information we could review. That does not mean your whole report is correct, and it does not mean we checked every possible rule.'
});

const STATIC_TYPES = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml'
});
const STATIC_ALLOWLIST = Object.freeze(['/', '/index.html', '/app.js', '/style.css', '/favicon.svg']);


/**
 * Read the request body ONCE, keeping the raw bytes.
 *
 * B4 needs the raw bytes because a provider signature is computed over the exact body text: re-serialising the
 * parsed object would change the bytes and could never verify. The size limit applies before anything is kept.
 */
function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > BODY_LIMIT_BYTES) {
        reject(new ServiceError('FILE_TOO_LARGE'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      const trimmed = raw.trim();
      if (!trimmed) return resolve({ raw, json: {} });
      try {
        return resolve({ raw, json: JSON.parse(trimmed) });
      } catch {
        return reject(new ServiceError('INVALID_REQUEST', 'BODY_IS_NOT_JSON'));
      }
    });
    req.on('error', () => reject(new ServiceError('INVALID_REQUEST', 'BODY_READ_FAILED')));
  });
}

function bearerToken(req) {
  const header = req.headers.authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match ? match[1].trim() : null;
}

function cookieValue(req, name) {
  for (const part of String(req.headers.cookie || '').split(';')) {
    const at = part.indexOf('=');
    if (at === -1) continue;
    if (part.slice(0, at).trim() === name) return decodeURIComponent(part.slice(at + 1).trim());
  }
  return null;
}

function sessionToken(req) {
  return bearerToken(req) || cookieValue(req, SESSION_COOKIE);
}


/** Route table. `auth: true` means the dispatcher resolves the session BEFORE the handler runs. */
const ROUTES = Object.freeze([
  ['POST', '/api/accounts', false, 'createAccount'],
  ['POST', '/api/sessions', false, 'signIn'],
  ['DELETE', '/api/sessions/current', false, 'signOut'],
  ['GET', '/api/session', true, 'sessionInfo'],
  ['GET', '/api/account/security', true, 'accountSecurity'],
  ['POST', '/api/account/recovery-key', true, 'issueRecoveryKey'],
  ['POST', '/api/account/recover', false, 'recoverAccount'],
  ['GET', '/api/account/profile', true, 'accountProfile'],
  ['PUT', '/api/account/profile', true, 'saveAccountProfile'],
  ['GET', '/api/account/documents', true, 'accountDocuments'],
  ['POST', '/api/account/documents', true, 'uploadAccountDocument'],
  ['GET', '/api/account/documents/:fileId', true, 'accountDocument'],
  ['DELETE', '/api/account/documents/:fileId', true, 'deleteAccountDocument'],
  ['POST', '/api/cases/:caseId/packet/support', true, 'packetSupport'],
  ['POST', '/api/cases/:caseId/packet/requirements', true, 'packetRequirements'],
  ['GET', '/api/privacy', true, 'privacyDashboard'],
  ['GET', '/api/support', true, 'supportInfo'],
  ['GET', '/api/support/references/:reference', true, 'supportLookup'],
  ['DELETE', '/api/account', true, 'deleteAccount'],
  ['GET', '/api/jurisdictions', false, 'jurisdictions'],
  ['GET', '/api/health', false, 'health'],
  ['GET', '/api/formats', false, 'supportedFormats'],
  ['GET', '/api/pricing', false, 'publicPricing'],
  /* B4. `auth: false` on the two public reads and on the PROVIDER callback: the provider has no session, and
     the event it sends is trusted only after its signature verifies. The billing routes are authenticated but
     deliberately NOT entitlement-gated — they are how an account becomes entitled. */
  ['GET', '/api/policy', false, 'policy'],
  ['POST', '/api/billing/events', false, 'billingEvent'],
  ['GET', '/api/billing/plans', true, 'billingPlans'],
  ['POST', '/api/billing/checkout', true, 'openCheckout'],
  ['POST', '/api/billing/confirm', true, 'confirmCheckout'],
  ['GET', '/api/entitlement', true, 'entitlementView'],
  ['POST', '/api/entitlement/cancel', true, 'cancelEntitlement'],
  ['POST', '/api/cases', true, 'createCase'],
  ['GET', '/api/cases', true, 'listCases'],
  ['GET', '/api/cases/:caseId', true, 'getCase'],
  ['PATCH', '/api/cases/:caseId/status', true, 'setCaseStatus'],
  ['DELETE', '/api/cases/:caseId', true, 'deleteCase'],
  ['POST', '/api/cases/:caseId/files', true, 'uploadFile'],
  ['POST', '/api/cases/:caseId/evaluate', true, 'evaluateCase'],
  ['GET', '/api/cases/:caseId/results', true, 'listResults'],
  ['GET', '/api/cases/:caseId/results/:resultId', true, 'getResult'],
  ['GET', '/api/cases/:caseId/results/:resultId/view', true, 'caseViewForResult'],
  ['POST', '/api/cases/:caseId/results/:resultId/review', true, 'reviewResult'],
  ['POST', '/api/cases/:caseId/review', true, 'reviewLatestResult'],
  ['POST', '/api/cases/:caseId/results/:resultId/clarify', true, 'clarifyResult'],
  ['GET', '/api/cases/:caseId/response-draft', true, 'responseDraft'],
  ['GET', '/api/cases/:caseId/report-download', true, 'reportDownload'],
  ['GET', '/api/cases/:caseId/demonstration-download', true, 'demonstrationDownload'],
  ['POST', '/api/cases/:caseId/demonstration', true, 'demonstration'],
  /* OWNER-CA-CORRECTION-PACKET-001 — the bounded California correction-packet consumer path. */
  ['GET', '/api/cases/:caseId/packet', true, 'packetView'],
  ['POST', '/api/cases/:caseId/packet/select', true, 'packetSelect'],
  ['POST', '/api/cases/:caseId/packet/wording', true, 'packetWording'],
  ['POST', '/api/cases/:caseId/packet/correspondence', true, 'packetCorrespondence'],
  ['POST', '/api/cases/:caseId/packet/reports', true, 'packetReports'],
  ['GET', '/api/cases/:caseId/packet/reports/:fileId', true, 'packetReport'],
  ['POST', '/api/cases/:caseId/packet/approve', true, 'packetApprove'],
  ['GET', '/api/cases/:caseId/packet-download', true, 'packetDownload'],
  ['GET', '/api/cases/:caseId/packet-print', true, 'packetPrint'],
  ['GET', '/api/cases/:caseId/packet/preview', true, 'packetPreview'],
  ['GET', '/api/cases/:caseId/packet/forms/:filename', true, 'packetForm'],
  /* BLOCKER-SUBSCRIPTION-VALUE-001 — owned report history and evidence-based comparison. */
  ['GET', '/api/history', true, 'historyView'],
  ['GET', '/api/history/compare/:leftResultId/:rightResultId', true, 'comparisonView']
]);

function sessionCookie(token, maxAgeSeconds) {
  const secure = process.env.CRP_LOCAL_SERVICE_SECURE_COOKIE === '1' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly${secure}; SameSite=Strict; Path=/; Max-Age=${maxAgeSeconds}`;
}

function loadJurisdictionSurface() {
  const payment = payments.describeProvider(process.env);
  const dataFile = path.join(__dirname, '..', '..', 'consumer-wizard', 'dist', 'jurisdiction-data.js');
  const marker = 'window.CRP_JURISDICTION_DATA = ';
  const raw = fs.readFileSync(dataFile, 'utf8');
  const parsed = JSON.parse(raw.slice(raw.indexOf(marker) + marker.length).trim().replace(/;\s*$/, ''));
  const matrix = JSON.parse(fs.readFileSync(MATRIX_FILE, 'utf8'));
  const byRegion = new Map(matrix.regions.map((r) => [r.region, r]));
  return {
    countries: parsed.countries.map((c) => ({ value: c.code, label: c.display_name })),
    regions: parsed.regions.map((r) => {
      const row = byRegion.get(r.region_code) || {};
      const configured = evaluation.applicableAdapters(r.region_code).confirmed;
      const configs = require('../adapters/rule-adapters.cjs').ADAPTERS;
      const regionalRules = configured.map((entry) => configs.find((a) => a.adapter_id === entry.adapter_id)).filter(Boolean);
      const currentRow = Object.assign({}, row, {
        executable_checks: regionalRules.length,
        working_assessment: regionalRules.length > 0 || row.working_assessment === true,
        supported_format_families: [...new Set(regionalRules.flatMap((a) => Array.isArray(a.presentation_required) ? a.presentation_required : [a.presentation_required]).filter(Boolean).concat(row.supported_format_families || []))]
      });
      /* The saved matrix predates the common-error statutory retirement. Its
         historical class label cannot advertise a rule that no active adapter
         for this selection can run. Keep its independent factual classes. */
      const assessmentKinds = (row.assessment_kinds || [])
        .filter((kind) => kind !== 'STATUTORY_RULE_COMPARISON' || regionalRules.length > 0);
      if (regionalRules.length > 0 && !assessmentKinds.includes('STATUTORY_RULE_COMPARISON')) {
        assessmentKinds.push('STATUTORY_RULE_COMPARISON');
      }
      if (!assessmentKinds.includes('COMMON_ERROR')) assessmentKinds.push('COMMON_ERROR');
      return {
        value: r.region_code,
        country: r.country_code,
        label: r.display_name,
        launch_ready: row.launch_ready === true,
        /* Plan section 2: a regional check's limitations are visible BEFORE anything is uploaded or bought. */
        supported_format_families: currentRow.supported_format_families,
        executable_checks: currentRow.executable_checks,
        common_error_checklist: COMMON_ERROR_CHECKLIST,
        checklist_items: COMMON_ERROR_CHECKLIST.length,
        statutory_support_checks: regionalRules.length,
        factual_checks: typeof row.factual_checks === 'number' ? row.factual_checks : 0,
        policy_observations: typeof row.policy_observations === 'number' ? row.policy_observations : 0,
        assessment_kinds: assessmentKinds,
        working_assessment: currentRow.working_assessment,
        applicability_state: row.applicability_state || null,
        availability: availabilityFor(currentRow)
      };
    }),
    note: 'You choose the place your report is assessed for. We tell you what we can read and check for that place before you upload anything.',
    /* B4 item 7: the supported countries, bureaus, formats, checks and limitations, before payment and upload. */
    presentations: formats.listSupportedFormats(),
    general_report_path: require('./coverage-matrix.cjs').loadMatrix().general_intake,
    presentation_scope: formats.presentationScope(),
    check_classes: CHECK_CLASSES,
    paid_actions: entitlement.PAID_ACTIONS.slice(),
    entitlement: {
      required_for: 'viewing a report complete assessment, downloading it, dispute packets, report history and comparison',
      never_required_for: ['uploading a report', 'running the assessment of your own report', 'the results summary and the one teaser', 'reading basic information about your own file', 'recording your own status', 'deleting your data'],
      subscriber_actions: entitlement.SUBSCRIBER_ACTIONS.slice(),
      free_actions: entitlement.FREE_ACTIONS.slice(),
      plain: payment.plain + ' Uploading a report and having it assessed are free. Reading the complete assessment of a report, downloading it, dispute packets and the subscriber features need a purchase.',
      payment_mode: payment.key_mode || null
    },
    preview_mode: process.env.CRP_DEPLOYMENT_ENV === 'staging',
    retention_plain: retention.policyView().plain
  };
}

/**
 * One honest sentence per region, built from the region's own recorded state. B3 continuation: the sentence
 * names the shared checklist. Adapter counts remain internal capability metadata and are not separate scopes.
 */
function availabilityFor(row) {
  if (row.working_assessment === true) {
    return {
      state: 'SUPPORTED',
      plain: 'We use the common-error checklist for your jurisdiction. Checks use the readable facts in your report and the rules that apply. Applicable statutes may support a listed check.'
    };
  }
  if (row.format_path_for_the_market === 'REGISTERED_FOR_THE_MARKET') {
    return {
      state: 'FORMAT_AVAILABLE_NO_CHECK',
      plain: 'We can read reports in this layout, but no check is ready for the place you picked yet. Pick another place, or contact support and we will tell you when it is ready.'
    };
  }
  return {
    state: 'NO_REPORT_FORMAT',
    plain: 'We cannot read reports from this country yet, so we cannot check one here. Nothing is charged, and you can pick another place.'
  };
}

/** The consumer-facing handler set. Every consumer-visible string it returns came from another module. */
function buildHandlers(store, logger, surface) {
  return {
    /* ------------------------------------------------------------ accounts and sessions */

    createAccount: ({ body, res }) => {
      const created = accounts.createAccount(store, body);
      logger.log({ event: 'ACCOUNT_CREATED', outcome: 'OK' });
      return {
        status: 201,
        json: { ok: true, account: created.account, signed_in: true, recovery_key: created.recovery_key },
        headers: { 'Set-Cookie': sessionCookie(created.token, 86400) }
      };
    },

    signIn: ({ body }) => {
      const opened = accounts.signIn(store, body);
      logger.log({ event: 'SIGN_IN', outcome: 'OK' });
      return { status: 200, json: { ok: true, account: opened.account, signed_in: true }, headers: { 'Set-Cookie': sessionCookie(opened.token, 86400) } };
    },

    signOut: ({ req }) => {
      const { signed_out } = accounts.signOut(store, sessionToken(req));
      logger.log({ event: 'SIGN_OUT', outcome: signed_out ? 'OK' : 'NO_SESSION' });
      return { status: 200, json: { ok: true, signed_out }, headers: { 'Set-Cookie': sessionCookie('', 0) } };
    },

    sessionInfo: ({ actor }) => ({ status: 200, json: { ok: true, account: actor, signed_in: true } }),

    accountSecurity: ({ actor }) => ({ status: 200, json: { ok: true, ...accounts.securityView(store, actor) } }),
    issueRecoveryKey: ({ actor, body }) => {
      const issued = accounts.issueRecoveryKey(store, actor, body);
      logger.log({ event: 'RECOVERY_KEY_ISSUED', outcome: 'OK' });
      return { status: 200, json: { ok: true, ...issued } };
    },
    recoverAccount: ({ body, req }) => {
      const recovered = accounts.recoverAccount(store, body, req.socket?.remoteAddress);
      logger.log({ event: 'ACCOUNT_RECOVERED', outcome: 'OK' });
      return { status: 200, json: { ok: true, ...recovered }, headers: { 'Set-Cookie': sessionCookie('', 0) } };
    },
    publicPricing: () => {
      const catalog = require('./plan-catalog.cjs').catalog();
      const publicPlans = catalog.plans.map(({ plan_code, currency, amount_cents, amount_display, interval, headline }) =>
        ({ plan_code, currency, amount_cents, amount_display, interval, headline }));
      return { status: 200, json: { ok: true, plan_catalog: { plans: publicPlans, currency: catalog.currency } } };
    },

    accountProfile: ({ actor }) => ({ status: 200, json: { ok: true, profile: accountProfile.getProfile(store, actor) } }),
    saveAccountProfile: ({ actor, body }) => ({ status: 200, json: { ok: true, profile: accountProfile.setProfile(store, actor, body.profile) } }),
    accountDocuments: ({ actor }) => ({ status: 200, json: { ok: true, documents: accountDocuments.listDocuments(store, actor) } }),
    uploadAccountDocument: ({ actor, body }) => ({ status: 201, json: { ok: true, document: accountDocuments.receiveDocument(store, actor, body) } }),
    accountDocument: ({ actor, params }) => {
      const file = accountDocuments.getDocument(store, actor, params.fileId);
      return { status: 200, text: file.bytes, content_type: file.document.content_type,
        headers: { 'Content-Disposition': `attachment; filename="account-document-${params.fileId}.${file.document.content_type === 'application/pdf' ? 'pdf' : file.document.content_type === 'image/png' ? 'png' : 'jpg'}"` } };
    },
    deleteAccountDocument: ({ actor, params }) => ({ status: 200, json: { ok: true, ...accountDocuments.deleteDocument(store, actor, params.fileId) } }),

    privacyDashboard: ({ actor }) => ({ status: 200, json: { ok: true, ...require('./privacy.cjs').dashboard(store, actor) } }),
    supportInfo: ({ actor }) => ({ status: 200, json: { ok: true, ...require('./support.cjs').supportInfo(store, actor) } }),
    supportLookup: ({ actor, params }) => ({ status: 200, json: { ok: true, ...require('./support.cjs').lookup(store, actor, params.reference) } }),
    deleteAccount: ({ actor }) => {
      const result = cases.deleteAccount(store, actor);
      logger.log({ event: 'ACCOUNT_DELETED', outcome: 'OK', count: result.blobs_removed });
      return { status: 200, json: { ok: true, deleted: true, stored_files_removed: result.blobs_removed }, headers: { 'Set-Cookie': sessionCookie('', 0) } };
    },

    /* ------------------------------------------------------------ jurisdiction and formats */

    health: () => ({ status: 200, json: { ok: true, build_id: process.env.CRP_BUILD_ID || 'local-development', deployment: process.env.CRP_DEPLOYMENT_ENV || 'local', billing_mode: surface.entitlement.payment_mode, launch_ready: false } }),
    jurisdictions: () => ({ status: 200, json: { ok: true, surface: { ...surface,
      bureau_choices: Object.fromEntries(surface.countries.map(country => [country.value, require('./bureau-dispute-requirements.cjs').catalog(country.value).map(({ id, label }) => ({ id, label }))])) } } }),

    supportedFormats: () => ({
      status: 200,
      json: {
        ok: true,
        formats: formats.listSupportedFormats(),
        general_report_path: require('./coverage-matrix.cjs').loadMatrix().general_intake,
        presentation_scope: formats.presentationScope(),
        upload_limits: uploads.uploadLimits(),
        note: require('./coverage-matrix.cjs').readSupportQualification()
      }
    })
  };
}

/**
 * B4 — entitlement, billing and policy handlers.
 *
 * The provider callback (`billingEvent`) is the one endpoint that can move money-derived state, and it is
 * reachable WITHOUT a session because a provider has none. It is not therefore open: the raw body and the
 * signature header go to `entitlement.recordEvent`, which verifies the signature against a configured secret
 * before looking at anything the body says. Everything else here is actor-scoped and never entitlement-gated.
 */
function buildBillingHandlers(store, logger) {
  const env = process.env;
  return {
    policy: () => ({ status: 200, json: { ok: true, ...retention.policyView(), check_classes: CHECK_CLASSES } }),

    billingPlans: async ({ actor }) => {
      await require('./billing-reconciliation.cjs').reconcileAccountPayments(store, actor, env);
      return { status: 200, json: { ok: true, ...entitlement.plansView(store, actor, env) } };
    },

    openCheckout: async ({ body, actor }) => {
      const opened = await entitlement.openCheckout(store, actor, body, env);
      logger.log({ event: 'CHECKOUT_OPENED', outcome: 'OK' });
      return { status: 201, json: { ok: true, checkout: opened } };
    },

    /** Server-side verification of a purchase. It cannot be satisfied by anything the client says. */
    confirmCheckout: async ({ body, actor }) => ({
      status: 200,
      json: { ok: true, confirmation: await entitlement.confirmCheckout(store, actor, body, env) }
    }),

    billingEvent: async ({ rawBody, headers }) => {
      const outcome = await entitlement.recordEvent(store, { rawBody, headers }, env);
      logger.log({
        event: 'BILLING_EVENT',
        outcome: outcome.duplicate ? 'DUPLICATE' : (outcome.accepted ? 'APPLIED' : 'IGNORED')
      });
      return { status: 200, json: { ok: true, event: outcome } };
    },

    entitlementView: async ({ actor }) => {
      await require('./billing-reconciliation.cjs').reconcileAccountPayments(store, actor, env);
      return { status: 200, json: { ok: true, ...entitlement.entitlementView(store, actor, env) } };
    },

    cancelEntitlement: async ({ body, actor }) => {
      const cancellation = await entitlement.cancelEntitlement(store, actor, body, env);
      logger.log({ event: 'ENTITLEMENT_CANCELLED', outcome: 'OK' });
      return { status: 200, json: { ok: true, cancellation } };
    }
  };
}

/** Case, upload, evaluation, review and download handlers. */
function buildCaseHandlers(store, logger, surface) {
  return {
    createCase: ({ body, actor }) => {
      const created = cases.createCase(store, actor, body);
      logger.log({ event: 'CASE_CREATED', region: created.region, outcome: 'OK' });
      return { status: 201, json: { ok: true, case: created } };
    },

    listCases: ({ actor }) => {
      const state = store.state();
      const rows = cases.listCases(store, actor).map(row => {
        const ownFiles = state.files.filter(file => file.case_id === row.case_id && file.account_id === actor.account_id);
        const results = state.results.filter(result => result.case_id === row.case_id && result.account_id === actor.account_id);
        const latest = results[results.length - 1];
        const bureau = row.selected_bureau || '';
        const route = require('./bureau-dispute-requirements.cjs').catalog(row.country).find(item => item.id === bureau);
        return { ...row, bureau, bureau_label: route?.label || bureau,
          report_date: comparison.reportIdentityOf(latest?.extraction).report_date,
          original_filenames: ownFiles.map(file => file.original_filename || file.originalFilename).filter(Boolean) };
      });
      return { status: 200, json: { ok: true, cases: rows } };
    },

    getCase: ({ params, actor }) => ({ status: 200, json: { ok: true, view: journey.caseView(store, actor, params.caseId) } }),

    setCaseStatus: ({ params, body, actor }) => ({
      status: 200,
      json: { ok: true, case: cases.setStatus(store, actor, params.caseId, body && body.status) }
    }),

    deleteCase: ({ params, actor }) => {
      const removed = cases.deleteCase(store, actor, params.caseId);
      logger.log({ event: 'CASE_DELETED', outcome: 'OK', count: removed.blobs_removed });
      return { status: 200, json: { ok: true, ...removed } };
    },

    uploadFile: ({ params, body, actor }) => {
      const caseRow = cases.requireOwnedCase(store, actor, params.caseId);
      /* Ownership first (a 403 that leaks nothing). OWNER-PURCHASE-FLOW-001: uploading an owned report is FREE,
         and no purchase is required to have it assessed. */
      const receipt = uploads.receiveReport(store, actor, caseRow, body);
      logger.log({
        event: 'REPORT_UPLOADED',
        region: caseRow.region,
        outcome: receipt.format_detection.supported ? 'SUPPORTED_FORMAT' : 'REFUSED_BY_FORMAT_GATE'
      });
      return { status: 201, json: { ok: true, receipt } };
    },

    evaluateCase: ({ params, body, actor }) => {
      const caseRow = cases.requireOwnedCase(store, actor, params.caseId);
      /* OWNER-PURCHASE-FLOW-001: the assessment runs BEFORE any purchase. Only the COMPLETE assessment, its
         download and the subscriber features are gated. */
      const outcome = journey.evaluateCase(store, actor, params.caseId, body || {});
      logger.log({
        event: 'CASE_EVALUATED',
        region: caseRow.region,
        outcome: outcome.result.checks_performed ? 'CHECKS_PERFORMED' : 'NO_APPLICABLE_CHECK',
        count: outcome.result.checks_performed
      });
      // The assessment is persisted in full, but its POST response has the same purchase boundary as a read.
      const view = journey.caseViewForResult(store, actor, params.caseId, outcome.result_id);
      return { status: 201, json: {
        ok: true,
        result_id: view.result_id,
        assessed_on: view.assessment_summary.assessed_on,
        assessment_summary: view.assessment_summary,
        assessment_access: view.assessment_access,
        result: view.result
      } };
    },

    listResults: ({ params, actor }) => {
      cases.requireOwnedCase(store, actor, params.caseId);
      entitlement.requireAssessmentAccess(store, actor, params.caseId);
      return { status: 200, json: { ok: true, results: journey.listResults(store, actor, params.caseId) } };
    },

    getResult: ({ params, actor }) => {
      cases.requireOwnedCase(store, actor, params.caseId);
      entitlement.requireAssessmentAccess(store, actor, params.caseId);
      return { status: 200, json: { ok: true, result: journey.getResult(store, actor, params.caseId, params.resultId) } };
    },

    caseViewForResult: ({ params, actor }) => {
      cases.requireOwnedCase(store, actor, params.caseId);
      entitlement.requireAssessmentAccess(store, actor, params.caseId);
      return { status: 200, json: { ok: true, view: journey.caseViewForResult(store, actor, params.caseId, params.resultId) } };
    },

    reviewResult: ({ params, actor }) => {
      cases.requireOwnedCase(store, actor, params.caseId);
      entitlement.requireAssessmentAccess(store, actor, params.caseId);
      return { status: 200, json: { ok: true, ...journey.markReviewed(store, actor, params.caseId, params.resultId) } };
    },

    reviewLatestResult: ({ params, actor }) => {
      cases.requireOwnedCase(store, actor, params.caseId);
      entitlement.requireAssessmentAccess(store, actor, params.caseId);
      return { status: 200, json: { ok: true, ...journey.markReviewed(store, actor, params.caseId, null) } };
    },

    /** OWNER-ACCEPT-009 item 2: record optional clarification answers, stored separately from report facts. */
    clarifyResult: ({ params, body, actor }) => {
      cases.requireOwnedCase(store, actor, params.caseId);
      entitlement.requireAssessmentAccess(store, actor, params.caseId);
      return { status: 200, json: { ok: true, ...journey.recordClarification(store, actor, params.caseId, params.resultId, body ? body.answers : []) } };
    },

    /** Refuses, by design, in this batch. The refusal is the recorded output permission, not a defect. */
    responseDraft: ({ params, actor }) => {
      cases.requireOwnedCase(store, actor, params.caseId);
      /* OWNER-PURCHASE-FLOW-001: the response draft is a subscriber feature; a one-time report unlock never
         grants it. */
      entitlement.requireSubscriberFeature(store, actor);
      return { status: 200, json: { ok: true, draft: journey.requestResponseDraft(store, actor, params.caseId, null) } };
    },

    /** The assessment-report download: the complete assessment of THAT report (one-time unlock) or a subscription. */
    reportDownload: ({ params, actor }) => {
      cases.requireOwnedCase(store, actor, params.caseId);
      const access = entitlement.requireAssessmentAccess(store, actor, params.caseId);
      const owned = cases.requireOwnedCase(store, actor, params.caseId);
      const country = surface.countries.find(c => c.value === owned.country)?.label || owned.country;
      const region = surface.regions.find(r => r.value === owned.region)?.label || owned.region;
      const file = journey.assessmentReport(store, actor, params.caseId, {
        jurisdiction_label: `${country} / ${region}`, upgrade_quotes: entitlement.upgradeQuotes(store, actor) });
      logger.log({ event: 'ASSESSMENT_REPORT_DOWNLOAD_SERVED', outcome: access.via });
      return {
        status: 200,
        text: file.body,
        content_type: file.content_type,
        headers: { 'Content-Disposition': `attachment; filename="${file.filename}"` }
      };
    },

    demonstrationDownload: ({ params, actor }) => {
      cases.requireOwnedCase(store, actor, params.caseId);
      entitlement.requireAssessmentAccess(store, actor, params.caseId);
      const file = journey.demonstrationDownload(store, actor, params.caseId);
      logger.log({ event: 'DEMONSTRATION_DOWNLOAD_SERVED', outcome: 'FICTIONAL_CONTENT' });
      return {
        status: 200,
        text: file.body,
        content_type: file.content_type,
        headers: { 'Content-Disposition': `attachment; filename="${file.filename}"` }
      };
    },

    demonstration: ({ params, body, actor }) => {
      cases.requireOwnedCase(store, actor, params.caseId);
      /* A labelled demonstration of the interface on synthetic input: free, like any assessment. */
      const outcome = journey.runDemonstration(store, actor, params.caseId, body && body.scenario);
      logger.log({ event: 'DEMONSTRATION_RUN', outcome: 'NOT_REPORT_SUPPORT', count: outcome.result.checks_performed });
      return { status: 201, json: { ok: true, ...outcome } };
    },

    /* OWNER-CA-CORRECTION-PACKET-001: select -> review -> edit -> approve -> download. The download is the
       entitlement-gated step (subscription or a one-time purchase bound to this case); the other steps follow
       the same paid gate as review and clarify. */
    packetView: ({ params, actor }) => {
      cases.requireOwnedCase(store, actor, params.caseId);
      /* OWNER-PURCHASE-FLOW-001: dispute packets are a subscriber feature. */
      entitlement.requireSubscriberFeature(store, actor);
      return { status: 200, json: { ok: true, view: packets.packetView(store, actor, params.caseId) } };
    },

    packetSelect: ({ params, body, actor }) => {
      cases.requireOwnedCase(store, actor, params.caseId);
      entitlement.requireSubscriberFeature(store, actor);
      packets.selectIssues(store, actor, params.caseId, body && body.issue_ids);
      logger.log({ event: 'PACKET_SELECTED', outcome: 'OK' });
      return { status: 200, json: { ok: true, view: packets.packetView(store, actor, params.caseId) } };
    },

    packetWording: ({ params, body, actor }) => {
      cases.requireOwnedCase(store, actor, params.caseId);
      entitlement.requireSubscriberFeature(store, actor);
      packets.setWording(store, actor, params.caseId, body && body.wording);
      logger.log({ event: 'PACKET_WORDING_RECORDED', outcome: 'OK' });
      return { status: 200, json: { ok: true, view: packets.packetView(store, actor, params.caseId) } };
    },

    /* The consumer-entered correspondence details: stored on the packet, separately from the report facts, and bound
       into the approval, so changing them after approval forces reapproval before the download is available again. */
    packetCorrespondence: ({ params, body, actor }) => {
      cases.requireOwnedCase(store, actor, params.caseId);
      entitlement.requireSubscriberFeature(store, actor);
      packets.setCorrespondence(store, actor, params.caseId, body && body.correspondence);
      logger.log({ event: 'PACKET_CORRESPONDENCE_RECORDED', outcome: 'OK' });
      return { status: 200, json: { ok: true, view: packets.packetView(store, actor, params.caseId) } };
    },

    packetApprove: ({ params, actor, body }) => {
      cases.requireOwnedCase(store, actor, params.caseId);
      entitlement.requireSubscriberFeature(store, actor);
      packets.approvePacket(store, actor, params.caseId, body.reviewed_version, true);
      logger.log({ event: 'PACKET_APPROVED', outcome: 'OK' });
      return { status: 200, json: { ok: true, view: packets.packetView(store, actor, params.caseId) } };
    },

    packetReports: ({ params, actor, body }) => {
      cases.requireOwnedCase(store, actor, params.caseId);
      entitlement.requireSubscriberFeature(store, actor);
      packets.setReportFiles(store, actor, params.caseId, body.file_ids);
      return { status: 200, json: { ok: true, view: packets.packetView(store, actor, params.caseId) } };
    },
    packetReport: ({ params, actor }) => {
      cases.requireOwnedCase(store, actor, params.caseId);
      entitlement.requireSubscriberFeature(store, actor);
      const file = packets.packetReport(store, actor, params.caseId, params.fileId);
      return { status: 200, text: file.body, content_type: file.content_type,
        headers: { 'Content-Disposition': `inline; filename="${file.filename}"` } };
    },

    packetSupport: ({ params, actor, body }) => {
      cases.requireOwnedCase(store, actor, params.caseId);
      entitlement.requireSubscriberFeature(store, actor);
      packets.setSupport(store, actor, params.caseId, body.support);
      return { status: 200, json: { ok: true, view: packets.packetView(store, actor, params.caseId) } };
    },
    packetRequirements: ({ params, actor, body }) => {
      const owned = cases.requireOwnedCase(store, actor, params.caseId);
      entitlement.requireSubscriberFeature(store, actor);
      const support = require('./packet-support.cjs'), settings = support.normalize(body.support, owned.country);
      accountDocuments.materialDocuments(store, actor, settings.document_ids);
      const snapshot = support.snapshot(store, actor, owned.country, settings);
      return { status: 200, json: { ok: true, requirements: snapshot.requirements, missing: snapshot.missing } };
    },

    packetDownload: ({ params, actor }) => {
      cases.requireOwnedCase(store, actor, params.caseId);
      /* OWNER-PURCHASE-FLOW-001: the packet download needs a subscription (the packet step itself does), and the
         recorded approval is still required below. */
      entitlement.requireSubscriberFeature(store, actor);
      const file = packets.packetDownload(store, actor, params.caseId);
      require('./packet-support.cjs').requirePostalPacket(packets.packetView(store, actor, params.caseId));
      logger.log({ event: 'PACKET_DOWNLOAD_SERVED', outcome: 'SUBSCRIPTION' });
      return {
        status: 200,
        text: file.body,
        content_type: file.content_type,
        headers: { 'Content-Disposition': `attachment; filename="${file.filename}"`, 'X-CRP-Packet-Version': file.approved_version }
      };
    },

    packetPrint: ({ params, actor }) => {
      cases.requireOwnedCase(store, actor, params.caseId);
      entitlement.requireSubscriberFeature(store, actor);
      const file = packets.packetPrint(store, actor, params.caseId);
      require('./packet-support.cjs').requirePostalPacket(packets.packetView(store, actor, params.caseId));
      logger.log({ event: 'PACKET_PRINT_SERVED', outcome: 'SUBSCRIPTION' });
      return { status: 200, text: file.body, content_type: file.content_type,
        headers: { 'Content-Disposition': `inline; filename="${file.filename}"`, 'X-CRP-Packet-Version': file.approved_version } };
    },

    packetPreview: ({ params, actor, req }) => {
      cases.requireOwnedCase(store, actor, params.caseId);
      entitlement.requireSubscriberFeature(store, actor);
      const version = new URL(req.url, 'http://127.0.0.1').searchParams.get('version');
      const file = packets.packetPreview(store, actor, params.caseId, version);
      return { status: 200, text: file.body, content_type: file.content_type,
        headers: { 'Content-Disposition': `inline; filename="${file.filename}"`, 'X-CRP-Packet-Version': file.approved_version } };
    },
    packetForm: ({ params, actor, req }) => {
      cases.requireOwnedCase(store, actor, params.caseId);
      entitlement.requireSubscriberFeature(store, actor);
      const version = new URL(req.url, 'http://127.0.0.1').searchParams.get('version');
      const file = packets.packetForm(store, actor, params.caseId, params.filename, version);
      return { status: 200, text: file.body, content_type: file.content_type,
        headers: { 'Content-Disposition': `inline; filename="${file.filename}"`, 'X-CRP-Packet-Version': file.approved_version } };
    },

    /* BLOCKER-SUBSCRIPTION-VALUE-001 + OWNER-PURCHASE-FLOW-001: reading basic information about your own file is
       always available; the report-history and comparison FEATURES are subscriber-only. */
    historyView: ({ actor }) => {
      entitlement.requireSubscriberFeature(store, actor);
      return { status: 200, json: { ok: true, ...comparison.historyView(store, actor) } };
    },

    comparisonView: ({ params, actor }) => {
      entitlement.requireSubscriberFeature(store, actor);
      logger.log({ event: "REPORT_COMPARISON_VIEWED", outcome: "OK" });
      return { status: 200, json: { ok: true, ...comparison.comparisonView(store, actor, params.leftResultId, params.rightResultId) } };
    }
  };
}

/**
 * Serve one private UI asset. The allowlist is the whole path check: no request can name a file outside it,
 * so neither a traversal nor a guess can reach the state directory.
 */
function staticResponse(req, urlPath) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return null;
  if (!STATIC_ALLOWLIST.includes(urlPath)) return null;
  const file = path.resolve(UI_DIR, urlPath === '/' ? 'index.html' : urlPath.slice(1));
  if (!file.startsWith(UI_DIR + path.sep) || !fs.existsSync(file)) return null;
  return {
    status: 200,
    text: fs.readFileSync(file, 'utf8'),
    content_type: STATIC_TYPES[path.extname(file)] || 'application/octet-stream'
  };
}

/** Build one isolated service instance: its own private store, its own logger, its own handler map. */
function createService(options) {
  const opts = options || {};
  const store = new PrivateStore(opts.dataDir);
  const logger = new Logger(opts.logSink);
  const surface = loadJurisdictionSurface();
  const handlers = Object.assign(
    {},
    buildHandlers(store, logger, surface),
    buildCaseHandlers(store, logger, surface),
    buildBillingHandlers(store, logger)
  );

  /**
   * Everything a restart must do before serving anyone: reconcile the state file, expire what has lapsed, and
   * clear what a crash left behind. Reported rather than performed silently, so the operator can see it.
   */
  function startup() {
    const recovery = retention.applyRetention(store, {});
    const report = Object.assign({}, recovery, {
      store_recovered_from_backup: store.recoveredFromBackup === true,
      state: store.integrity(),
      payment: payments.describeProvider(process.env),
      plain: 'Lapsed sessions and purchases were expired, and bytes a crash left behind were cleared. No report was read, moved or transmitted.'
    });
    logger.log({ event: 'SERVICE_STARTUP_RECOVERY', outcome: 'OK', count: recovery.orphan_blobs_removed });
    return report;
  }

  async function handle(req, res) {
    const urlPath = new URL(req.url, 'http://127.0.0.1').pathname;
    try {
      if (!urlPath.startsWith('/api/')) {
        const asset = staticResponse(req, urlPath);
        if (!asset) {
          sendJson(res, 404, { ok: false, error: { code: 'NOT_FOUND', message: 'That page does not exist.', detail: null } });
          return;
        }
        if (req.method === 'HEAD') {
          res.writeHead(asset.status, Object.assign({ 'Content-Type': asset.content_type }, SECURITY_HEADERS));
          res.end();
          return;
        }
        sendText(res, asset.status, asset.text, asset.content_type);
        return;
      }

      let matched = null;
      for (const [method, template, auth, name] of ROUTES) {
        if (method !== req.method) continue;
        const params = matchRoute(urlPath, template);
        if (params) {
          matched = { auth, name, params };
          break;
        }
      }
      if (!matched) {
        sendJson(res, 404, { ok: false, error: { code: 'NOT_FOUND', message: 'That endpoint does not exist.', detail: null } });
        return;
      }

      const actor = matched.auth ? accounts.resolveSession(store, sessionToken(req)) : null;
      const body = req.method === 'GET' || req.method === 'HEAD' ? {} : await readRequestBody(req);
      const outcome = await handlers[matched.name]({
        req,
        res,
        params: matched.params,
        body: body.json || {},
        /* The RAW body and the headers go to the handler as well: a provider signature is over bytes. */
        rawBody: body.raw || '',
        headers: req.headers,
        actor,
        logger
      });

      if (outcome.text !== undefined) {
        sendText(res, outcome.status, outcome.text, outcome.content_type, outcome.headers);
        return;
      }
      sendJson(res, outcome.status, outcome.json, outcome.headers);
    } catch (err) {
      /* A store that cannot read its own state refuses the request; it never answers from an empty state. */
      const serviceError = err instanceof ServiceError
        ? err
        : (err && err.code === 'SERVICE_STATE_UNAVAILABLE' ? new ServiceError('SERVICE_STATE_UNAVAILABLE') : null);
      const refusal = serviceError ? toBody(serviceError) : toBody(err);
      const status = serviceError ? serviceError.status : 500;
      /* No path, no query, no body and no header value is ever passed to the log sink. */
      logger.log({
        event: 'REQUEST_REFUSED',
        reason_code: refusal.error.code,
        outcome: refusal.error.code,
        http_status: status
      });
      sendJson(res, status, refusal);
    }
  }

  return { store, logger, handle, surface, startup };
}

function sendJson(res, status, body, headers) {
  const payload = Buffer.from(JSON.stringify(body), 'utf8');
  res.writeHead(status, Object.assign({
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': payload.length,
    'Cache-Control': 'no-store'
  }, SECURITY_HEADERS, headers || {}));
  res.end(payload);
}

function sendText(res, status, text, contentType, headers) {
  const payload = Buffer.from(text, 'utf8');
  res.writeHead(status, Object.assign({
    'Content-Type': contentType,
    'Content-Length': payload.length,
    'Cache-Control': 'no-store'
  }, SECURITY_HEADERS, headers || {}));
  res.end(payload);
}

/** Match a pathname against a `:param` template. Returns the parameters, or null. */
function matchRoute(pathname, template) {
  const actual = pathname.split('/').filter(Boolean);
  const expected = template.split('/').filter(Boolean);
  if (actual.length !== expected.length) return null;
  const params = {};
  for (let i = 0; i < expected.length; i += 1) {
    if (expected[i].startsWith(':')) params[expected[i].slice(1)] = decodeURIComponent(actual[i]);
    else if (expected[i] !== actual[i]) return null;
  }
  return params;
}

module.exports = {
  createService,
  ROUTES,
  SESSION_COOKIE,
  SECURITY_HEADERS,
  CHECK_CLASSES,
  matchRoute,
  staticResponse,
  loadJurisdictionSurface,
  UI_DIR
};

