'use strict';
/**
 * release-check.cjs — the local pre-release check. OWNER-ALL82-001 / B4: "Prepare deployment configuration and
 * release checks locally; do not deploy."
 *
 *   node accelerated-launch/service/release-check.cjs
 *
 * WHAT IT DOES: reads this tree and the evidence the suite wrote, and reports what a release would be
 * claiming. It writes exactly one file (`service/out/b4-release-check.json`) and nothing else.
 * WHAT IT DOES NOT DO: it makes no network call, contacts no provider, installs nothing, deploys nothing and
 * prints no report content. Running it twice changes nothing but that one file.
 *
 * THE POINT OF IT IS THE ANSWER TO ONE QUESTION, stated so it cannot be read more favourably than it is: is
 * this build launch-ready? The check computes `launch_ready` from the checks that BLOCK a launch.
 *
 * B4 CONTINUATION — THE EIGHT LAUNCH-CRITICAL CONDITIONS, AND WHY FAILURES ARE GROUPED. The owner's order was:
 * "The release check must include all launch-critical conditions: (1) all 82 jurisdictions have meaningful
 * assessments on supported consumer-report formats, (2) Canadian general-upload support is established within
 * its stated boundaries, (3) current GB support is established, (4) production storage is durable, (5) account
 * isolation and deletion pass, (6) real payment integration is verified, (7) supported checks and limitations
 * are shown before purchase, (8) deployment provenance and release authorization are recorded. Report separate
 * blocker categories and affected regions. 'Two blockers' must not hide unresolved format support."
 *
 * So every check carries a `category`, the report groups its failures by category, names the regions each
 * category reaches, and states format-support blockage in a field of its own. A count of "two blockers" can no
 * longer conceal that one of them is a whole market with no resolvable format evidence.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { PrivateStore, REPOSITORY_ROOT, defaultDataDir } = require('./private-store.cjs');
const { inspectStateReadOnly } = require('./store-diagnostic.cjs');
const { Logger, ALLOWED_FIELDS } = require('./logger.cjs');
const { describeProvider, TEST_ADAPTER_FLAG, TEST_SECRET_NAME, STRIPE_CONFIGURATION_NAMES } = require('./payment-provider.cjs');
const { validateCapabilityStatus: validateCapabilityEvidence } = require('./evidence-validator.cjs');
const plans = require('./plan-catalog.cjs');
const formats = require('./formats.cjs');
const caFormatScope = require('./format-families/ca-consumer-format-scope.cjs');
const gbFamily = require('./format-families/gb-experian-consumer.cjs');

const SERVICE_DIR = __dirname;
const LAUNCH_DIR = path.resolve(__dirname, '..');
const OUT_DIR = path.join(SERVICE_DIR, 'out');
const TEMPLATE = path.join(SERVICE_DIR, 'deploy', 'production.env.example');
const MATRIX = path.join(LAUNCH_DIR, 'launch-matrix.json');
const EXPECTED_MARKETS = ['CA', 'AU', 'US', 'GB'];

const SECRET_NAME_PATTERN = /(SECRET|_KEY|PASSWORD|TOKEN|APIKEY|CREDENTIAL)/i;

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
}

/** The recorded test-mode Stripe evidence, if any. Written only by the provisioning script. */
function readPaymentEvidence() {
  const file = path.join(OUT_DIR, 'b4-pay-evidence.json');
  const raw = read(file);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** The matched-test-payment evidence (a real hosted Checkout completed in test mode), if any. */
function readMatchedPaymentEvidence() {
  const file = path.join(OUT_DIR, 'b5-matched-payment-evidence.json');
  const raw = read(file);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Every `.cjs` under the service, excluding the suite's own fixtures and the evidence directory. */
function sourceFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'out' || entry.name === 'tests') continue;
      out.push(...sourceFiles(full));
    } else if (entry.name.endsWith('.cjs')) {
      out.push(full);
    }
  }
  return out;
}

/* ------------------------------------------------------------------ the checks */

const CHECKS = [
  {
    id: 'PRIVATE_DATA_DIRECTORY_OUTSIDE_THE_REPOSITORY',
    category: 'STORAGE',
    blocks_launch: true,
    why: 'report bytes must never be written into a tree that is copied or published',
    run() {
      const target = path.join(REPOSITORY_ROOT, 'accelerated-launch', 'service', '.forbidden');
      try {
        new PrivateStore(target);
        return { passed: false, detail: 'the store accepted a data directory inside the repository' };
      } catch (err) {
        const refused = /PRIVATE_DATA_DIRECTORY_INSIDE_REPOSITORY_REFUSED/.test(err.message);
        return { passed: refused, detail: refused ? `${REPOSITORY_ROOT} is refused as a data directory` : err.message };
      }
    }
  },
  {
    id: 'NO_SECRET_MATERIAL_IN_SERVICE_SOURCES',
    category: 'SECRETS',
    blocks_launch: true,
    why: 'a credential committed to source has been published',
    run() {
      const offenders = [];
      const patterns = [
        [/sk_live_[A-Za-z0-9]/, 'a live provider key'],
        [/sk_test_[A-Za-z0-9]/, 'a test provider key'],
        [/whsec_[A-Za-z0-9]/, 'a webhook signing secret'],
        [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'a private key'],
        [/AKIA[0-9A-Z]{16}/, 'an AWS access key id']
      ];
      const files = sourceFiles(SERVICE_DIR);
      for (const file of files) {
        if (path.basename(file) === path.basename(__filename)) continue;
        const text = read(file) || '';
        for (const [pattern, label] of patterns) {
          if (pattern.test(text)) offenders.push(`${path.relative(LAUNCH_DIR, file)}: ${label}`);
        }
      }
      return {
        passed: offenders.length === 0,
        detail: offenders.length ? offenders.join('; ') : `${files.length} service source files carry no credential-shaped string`
      };
    }
  },
  {
    id: 'PRODUCTION_TEMPLATE_NAMES_ONLY',
    category: 'SECRETS',
    blocks_launch: true,
    why: 'the committed template must name what is required and supply nothing',
    run() {
      const text = read(TEMPLATE);
      if (!text) return { passed: false, detail: 'deploy/production.env.example is missing' };
      const problems = [];
      const assigned = [...text.matchAll(/^([A-Z][A-Z0-9_]*)=(.*)$/gm)].map((match) => [match[1], match[2].trim()]);
      for (const [name, value] of assigned) {
        if (SECRET_NAME_PATTERN.test(name) && value !== '') problems.push(`${name} carries a value`);
      }
      for (const name of STRIPE_CONFIGURATION_NAMES) {
        if (!text.includes(`${name}=`)) problems.push(`${name} is not named`);
      }
      if (text.includes(TEST_ADAPTER_FLAG) || text.includes(TEST_SECRET_NAME)) {
        problems.push('the test payment adapter is named in the production template');
      }
      return {
        passed: problems.length === 0,
        detail: problems.length
          ? problems.join('; ')
          : `${assigned.length} names declared, every secret left empty, no test adapter named`
      };
    }
  },
  {
    id: 'SUPPORT_REFERENCE_SECRET_IS_CONFIGURED',
    category: 'DEPLOYMENT',
    blocks_launch: true,
    why: 'support references are derived from a server-side secret; without a configured secret they are process-generated and change on restart, so a release must configure one',
    run() {
      const configured = Boolean(process.env.CRP_SUPPORT_REFERENCE_SECRET);
      return {
        passed: configured,
        detail: configured
          ? 'CRP_SUPPORT_REFERENCE_SECRET is configured, so support references are stable across restarts.'
          : 'CRP_SUPPORT_REFERENCE_SECRET is not configured; support references are process-generated and would change on restart (local development only).',
        external_dependency: null
      };
    }
  },
  {
    id: 'STATIC_ALLOWLIST_MATCHES_THE_PRIVATE_UI_TREE',
    category: 'SERVICE',
    blocks_launch: true,
    why: 'an allowlist that does not match the tree either serves nothing or serves too much',
    run() {
      const uiDir = path.join(SERVICE_DIR, 'ui');
      const present = fs.readdirSync(uiDir).filter((name) => fs.statSync(path.join(uiDir, name)).isFile()).sort();
      const served = ['app.js', 'favicon.svg', 'index.html', 'style.css'];
      const missing = served.filter((name) => !present.includes(name));
      const unexposed = present.filter((name) => !served.includes(name));
      return {
        passed: missing.length === 0,
        detail: missing.length
          ? `the allowlist names files that are not present: ${missing.join(', ')}`
          : `${served.length} files served; present but not exposed: ${unexposed.join(', ') || '(none)'}`
      };
    }
  },
  {
    id: 'LOG_SINK_ADMITS_ONLY_WHITELISTED_FIELDS',
    category: 'PRIVACY',
    blocks_launch: true,
    why: 'no report text, identifier, address or path may reach a log by any call site',
    run() {
      const captured = [];
      new Logger((line) => captured.push(line)).log({
        event: 'RELEASE_CHECK',
        region: 'CA-NS',
        count: 1,
        http_status: 200,
        outcome: 'OK',
        email: 'consumer@example.test',
        case_id: 'case_x',
        path: 'C:\\Users\\x\\report.pdf',
        token: 'abc',
        report_text: 'anything'
      });
      const record = captured.length ? JSON.parse(captured[0]) : null;
      const extra = record ? Object.keys(record).filter((key) => !ALLOWED_FIELDS.includes(key)) : ['<no record>'];
      return {
        passed: captured.length === 1 && extra.length === 0,
        detail: extra.length ? `fields escaped the whitelist: ${extra.join(', ')}` : `${ALLOWED_FIELDS.length} fields admissible; consumer data dropped at the sink`
      };
    }
  }
];

CHECKS.push(
  {
    id: 'ALL_82_REGIONS_PRESENT_IN_THE_LAUNCH_MATRIX',
    category: 'COVERAGE',
    blocks_launch: true,
    why: 'the launch requirement is 82 working jurisdictions, not 81',
    run() {
      const text = read(MATRIX);
      if (!text) return { passed: false, detail: 'launch-matrix.json is missing; run build_launch_matrix.py' };
      const matrix = JSON.parse(text);
      const countries = [...new Set(matrix.regions.map((row) => row.country))].sort();
      return { passed: matrix.regions.length === 82, detail: `${matrix.regions.length} rows across ${countries.join('/')}` };
    }
  },
  {
    id: 'NO_REGION_IS_ADVERTISED_AS_LAUNCH_READY',
    category: 'COVERAGE',
    blocks_launch: true,
    why: 'a row may only be ready when its journey, checks, billing and host all pass',
    run() {
      const text = read(MATRIX);
      if (!text) return { passed: false, detail: 'launch-matrix.json is missing' };
      const matrix = JSON.parse(text);
      const ready = matrix.regions.filter((row) => row.launch_ready === true).map((row) => row.region);
      return {
        passed: ready.length === 0,
        detail: ready.length ? `rows claiming launch readiness: ${ready.join(', ')}` : `0 of ${matrix.regions.length} rows claim launch readiness`
      };
    }
  },
  {
    id: 'PAYMENT_PROVIDER_IS_CONFIGURED_FOR_BILLING',
    category: 'PAYMENT',
    blocks_launch: true,
    why: 'test-verified billing is not live billing; a launch needs live keys and live evidence, and neither is authorized here',
    run() {
      const env = Object.assign({}, process.env);
      delete env[TEST_ADAPTER_FLAG];
      delete env[TEST_SECRET_NAME];
      const described = describeProvider(env);
      const configured = described.state === 'STRIPE_CONFIGURED';
      const evidence = readPaymentEvidence();
      const keyMode = described.key_mode || 'unknown';
      const testVerified = configured && evidence && evidence.verified === true && evidence.checkout_session_created === true;
      // Live-readiness requires a LIVE key and read-only live-configuration evidence (live prices/account/webhook,
      // livemode true) — NOT a real live charge. A production smoke transaction is a separate, owner-authorized step
      // and is never a code prerequisite for readiness.
      const liveReady = configured && keyMode === 'live' && evidence && evidence.live_config_verified === true;
      return {
        passed: liveReady,
        detail: liveReady
          ? `Stripe is live-configured with live evidence (account ${evidence.account_id})`
          : testVerified
            ? `Stripe is test-verified (account ${evidence.account_id}, ${keyMode} keys), but test-mode evidence and test keys do not make billing live-ready.`
            : configured
              ? `Stripe is configured (${keyMode} keys) but not live-verified; configured keys alone do not prove working billing.`
              : `no working payment provider is connected (${described.reason})`,
        billing_state: liveReady ? 'LIVE_READY' : (testVerified ? 'TEST_VERIFIED_NOT_LIVE' : (configured ? 'CONFIGURED_NOT_VERIFIED' : 'NOT_CONFIGURED')),
        external_dependency: described.exact_external_dependency
      };
    }
  },
  {
    id: 'MATCHED_TEST_CHECKOUT_EVIDENCE',
    category: 'PAYMENT',
    blocks_launch: true,
    why: 'a real matched hosted Checkout -> verified webhook -> entitlement/download must be evidenced before launch, separately from mocks and generic triggers',
    run() {
      // Read the exact-session API verification and the separate successful HTTP download proof.
      // A 409 missing-result response and account-wide invoice lists are not download/payment evidence.
      let payment = null;
      let download = null;
      try {
        payment = JSON.parse(read(path.join(OUT_DIR, 'b5-chrome-payment-verification.json')));
        download = JSON.parse(read(path.join(OUT_DIR, 'b5-paid-download-verification.json')));
      } catch (_) { /* Missing or malformed evidence keeps the check closed. */ }
      const sessions = payment && Array.isArray(payment.sessions) ? payment.sessions : [];
      const paid = sessions.length === 5 && new Set(sessions.map(s => s.session_id)).size === 5
        && sessions.every(s => /^cs_test_/.test(s.session_id || '') && s.livemode === false && s.status === 'complete' && s.payment_status === 'paid' && s.currency === 'cad');
      const monthly = sessions.filter(s => s.amount_total === 200 && s.invoice && s.invoice.status === 'paid' && s.invoice.currency === 'cad' && s.invoice.amount_paid === 200 && s.invoice.subtotal === 795).length === 1;
      const annual = sessions.filter(s => s.amount_total === 7355 && s.invoice && s.invoice.status === 'paid' && s.invoice.currency === 'cad' && s.invoice.amount_paid === 7355 && s.invoice.subtotal === 7950).length === 1;
      const downloaded = download && download.test_only === true && /^cs_test_/.test(download.real_matched_session || '')
        && download.successful_download === true && download.download_status === 200 && download.repeat_status === 200
        && download.unpurchased_case_status === 402 && download.checks_performed > 0 && download.content_bytes > 0
        && /^[a-f0-9]{64}$/.test(download.content_sha256 || '') && /attachment/.test(download.content_disposition || '');
      const matched = !!(payment && payment.test_only === true && paid && monthly && annual && sessions.filter(s => s.amount_total === 595).length === 3 && downloaded);
      return {
        passed: matched,
        detail: matched
          ? 'Five exact Stripe sandbox sessions verified paid, monthly/annual credits verified on their invoices, and a separate matched purchase delivered an assessed report (HTTP 200); repeat and unpurchased-case checks passed.'
          : 'Exact matched sandbox payment/invoice evidence and a successful assessed report download are required; a 409 refusal, mocks or generic triggers do not satisfy this check',
        external_dependency: 'a browser completion of the service-created hosted Checkout sessions in Stripe test mode'
      };
    }
  },
  {
    id: 'RUNTIME_PATH_PORTABILITY',
    category: 'PORTABILITY',
    blocks_launch: true,
    why: 'a runtime module that hardcodes a Windows checkout path cannot run on the Linux host',
    run() {
      const offenders = [];
      for (const file of sourceFiles(SERVICE_DIR)) {
        const text = read(file) || '';
        if (/C:[\\/]CRP-NEW/.test(text)) offenders.push(path.relative(LAUNCH_DIR, file));
      }
      // Also scan the shared internal-validation runtime modules (document-model, runtime-config, constants).
      const internal = path.resolve(REPOSITORY_ROOT, 'internal-validation', 'ca-ns-last-payment-six-year');
      for (const name of ['document-model.cjs', 'runtime-config.cjs', 'constants.cjs', 'presentation-contract.cjs', 'extraction.cjs']) {
        const file = path.join(internal, name);
        const text = read(file) || '';
        if (/C:[\\/]CRP-NEW/.test(text)) offenders.push(path.relative(REPOSITORY_ROOT, file));
      }
      return {
        passed: offenders.length === 0,
        detail: offenders.length
          ? `hardcoded Windows checkout path remains in: ${offenders.join(', ')}`
          : 'no runtime module hardcodes a Windows checkout path'
      };
    }
  },
  {
    id: 'SUPPORTED_FORMAT_MESSAGING_MATCHES_THE_REGISTRY',
    category: 'FORMAT_SUPPORT',
    blocks_launch: true,
    why: 'the wizard must not promise a format the admission gate will refuse',
    run() {
      const presented = formats.listSupportedFormats();
      const registry = formats.EXTRACTION_ADAPTERS.map((entry) => entry.presentation_id).sort();
      const advertised = presented.map((entry) => entry.presentation_id).sort();
      const omitted = registry.filter((id) => !advertised.includes(id));
      const scope = formats.presentationScope();
      const problems = [];
      if (omitted.length) problems.push(`the surface omits ${omitted.join(', ')}`);
      if (scope.CA.family_admitted !== caFormatScope.COUNTRY_FAMILY_ADMISSION.admitted) problems.push('the Canadian scope disagrees with the scope module');
      if (scope.CA.equifax_family_admitted !== caFormatScope.FAMILY_ADMISSION.admitted) problems.push('the Canadian scope misreports the Equifax presentation\'s own family admission');
      if (scope.GB.present_day_support_claimed !== false) problems.push('the GB scope claims present-day support');
      return {
        passed: problems.length === 0,
        detail: problems.length
          ? problems.join('; ')
          : `${advertised.join(', ')} advertised; Canadian family admitted: ${scope.CA.family_admitted}; GB present-day support claimed: ${scope.GB.present_day_support_claimed}`
      };
    }
  },
  {
    id: 'PLAN_CATALOG_PRICES_EVERY_PLAN_ABOVE_THE_PROVIDER_MINIMUM',
    category: 'PAYMENT',
    blocks_launch: false,
    why: 'a provider rejects a charge below its own minimum',
    run() {
      const catalog = plans.catalog();
      const low = catalog.plans.filter((plan) => plan.amount_cents < plans.MINIMUM_CHARGE_CAD_CENTS);
      const cheapest = Math.min(...catalog.plans.map((plan) => plan.amount_cents));
      return {
        passed: low.length === 0 && catalog.plans.length === plans.PLAN_CODES.length,
        detail: `${catalog.plans.length} plans, cheapest ${cheapest} cents, catalog digest ${catalog.catalog_digest.slice(0, 16)}…`
      };
    }
  }
);

CHECKS.push(
  {
    id: 'EVERY_MARKET_HAS_A_MATRIX_ROW',
    category: 'COVERAGE',
    blocks_launch: false,
    why: 'a whole market must not vanish from the matrix silently',
    run() {
      const text = read(MATRIX);
      if (!text) return { passed: false, detail: 'launch-matrix.json is missing' };
      const matrix = JSON.parse(text);
      const countries = [...new Set(matrix.regions.map((row) => row.country))].sort();
      const missing = EXPECTED_MARKETS.filter((code) => !countries.includes(code));
      return { passed: missing.length === 0, detail: missing.length ? `absent from the matrix: ${missing.join(', ')}` : `countries present: ${countries.join(', ')}` };
    }
  },
  {
    id: 'EVIDENCE_ARTIFACTS_PRESENT_AND_SEPARATE',
    category: 'EVIDENCE',
    blocks_launch: false,
    why: 'each batch keeps its own evidence so no historical package is regenerated in place',
    run() {
      const wanted = ['b2-evidence.json', 'b3-evidence.json'];
      const present = wanted.filter((name) => fs.existsSync(path.join(OUT_DIR, name)));
      const missing = wanted.filter((name) => !present.includes(name));
      return {
        passed: missing.length === 0,
        detail: missing.length ? `missing: ${missing.join(', ')}` : `present: ${present.join(', ')} (each batch writes its own file)`
      };
    }
  },
  {
    id: 'PRIVATE_DATA_DIRECTORY_IS_DURABLE',
    category: 'STORAGE',
    blocks_launch: true,
    why: 'a data directory inside the operating system temp area can be cleaned by the system, which would destroy the consumer’s only copy of their report',
    run() {
      const configured = process.env.CRP_LOCAL_SERVICE_DATA;
      const dir = path.resolve(configured || defaultDataDir());
      const temp = path.resolve(os.tmpdir());
      const inside = dir === temp || dir.startsWith(temp + path.sep);
      return {
        passed: !inside,
        detail: inside
          ? `${configured ? 'CRP_LOCAL_SERVICE_DATA' : 'the default data directory'} resolves to ${dir}, INSIDE the operating system temp area (${temp}); bytes kept there can be removed by the system`
          : `the data directory ${dir} is outside the operating system temp area`
      };
    }
  },
  {
    id: 'STATE_FILE_IS_READABLE_WHERE_A_DATA_DIRECTORY_EXISTS',
    category: 'STORAGE',
    blocks_launch: true,
    why: 'a release must not start against an unreadable state file',
    run() {
      const dir = process.env.CRP_LOCAL_SERVICE_DATA || defaultDataDir();
      if (!fs.existsSync(dir)) {
        return { passed: true, detail: `no data directory at ${dir} yet; a first start creates one on its own` };
      }
      return inspectStateReadOnly(dir);
    }
  }
);

/* ------------------------------------------------------------------ the eight launch-critical conditions
 *
 * B4 continuation, owner order: "The release check must include all launch-critical conditions:
 *  - All 82 jurisdictions have meaningful assessments on supported consumer-report formats.
 *  - Canadian general-upload support is established within its stated boundaries.
 *  - Current GB support is established.
 *  - Production storage is durable.
 *  - Account isolation and deletion pass.
 *  - Real payment integration is verified.
 *  - Supported checks and limitations are shown before purchase.
 *  - Deployment provenance and release authorization are recorded.
 *  Report separate blocker categories and affected regions. 'Two blockers' must not hide unresolved format
 *  support."
 *
 * Every one of the eight is a check below or above, each carries its own `category`, and the report groups the
 * failures by category AND names the regions each category reaches. A single format-support failure can no
 * longer be hidden inside a headline count.
 */

/** The suite's own evidence file. Read, never written here. */
const B4_EVIDENCE = path.join(OUT_DIR, 'b4-evidence.json');

function readEvidence() {
  const text = read(B4_EVIDENCE);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (err) {
    return null;
  }
}

/** Every region the matrix records, so a failing category can name the regions it reaches. */
function matrixRows() {
  const text = read(MATRIX);
  if (!text) return null;
  try {
    return JSON.parse(text).regions;
  } catch (err) {
    return null;
  }
}


/* ------------------------------------------------------------------ the run */

function runReleaseCheck(options) {
  const opts = options || {};
  const results = CHECKS.map((check) => {
    let outcome;
    try {
      outcome = check.run();
    } catch (err) {
      outcome = { passed: false, detail: `the check itself failed: ${err.message}`, affected_regions: [] };
    }
    return {
      id: check.id,
      category: check.category || 'UNCATEGORISED',
      passed: outcome.passed === true,
      applies_to_launch: check.blocks_launch === true,
      release_scope: check.release_scope || null,
      customer_requirement: check.customer_requirement || null,
      detail: outcome.detail || null,
      affected_regions: outcome.affected_regions ? outcome.affected_regions.slice() : [],
      external_dependency: outcome.external_dependency || null,
      implementation_status: outcome.implementation_status || null,
      implementation_detail: outcome.implementation_detail || null,
      staging_status: outcome.staging_status || null,
      why: check.why
    };
  });
  const blocking = results.filter((row) => row.applies_to_launch && !row.passed);

  /* BLOCKERS BY CATEGORY, WITH THE REGIONS EACH ONE REACHES. The owner's order was explicit: "Report separate
     blocker categories and affected regions. 'Two blockers' must not hide unresolved format support." A single
     headline count cannot show that format support is unresolved in one market but not another, so the report
     never relies on one. */
  const categories = [...new Set(results.map((row) => row.category))].sort();
  const blockersByCategory = categories.map((category) => {
    const rows = blocking.filter((row) => row.category === category);
    const regions = [...new Set(rows.flatMap((row) => row.affected_regions))].sort();
    return {
      category,
      launch_blocking_checks_failed: rows.map((row) => row.id),
      affected_regions: regions,
      reaches_every_region: regions.length === 0 && rows.length > 0 ? false : regions.length >= 82,
      plain: rows.length === 0
        ? 'No launch-blocking failure in this category.'
        : `${rows.length} launch-blocking failure(s): ${rows.map((row) => row.id).join(', ')}${regions.length ? `; affected regions: ${regions.join(', ')}` : ''}`
    };
  });

  const formatSupport = blockersByCategory.find((row) => row.category === 'FORMAT_SUPPORT');
  const report = {
    order: 'OWNER-ALL82-001',
    batch: 'B4',
    ran_at: new Date().toISOString(),
    checks: results,
    passed: results.filter((row) => row.passed).length,
    failed: results.filter((row) => !row.passed).length,
    launch_blocking_failures: blocking.map((row) => row.id),
    closure_policy: 'OWNER-CLOSURE-001',
    implementation_closed: results.filter(r => r.implementation_status === 'IMPLEMENTED_AND_TESTED').map(r => r.id),
    implementation_open: results.filter(r => r.implementation_status === 'OPEN').map(r => r.id),
    staging_verification_pending: results.filter(r => r.staging_status === 'PENDING_VERIFICATION').map(r => r.id),
    staging_verified: results.filter(r => r.staging_status === 'VERIFIED_ON_STAGING').map(r => r.id),
    blockers_by_category: blockersByCategory,
    /* Named so it cannot be hidden by a count: a launch-blocking FORMAT_SUPPORT failure is stated in its own
       field, with the regions it reaches, whatever else passes. */
    format_support_blocked: Boolean(formatSupport && formatSupport.launch_blocking_checks_failed.length),
    format_support_blocked_in_regions: formatSupport ? formatSupport.affected_regions : [],
    launch_ready: blocking.length === 0,
    state: blocking.length === 0 ? 'READY_FOR_A_RELEASE_REVIEW' : 'NOT_LAUNCH_READY',
    plain: blocking.length === 0
      ? 'Every launch-blocking check passes. A release still requires owner authorization and a deployment step (B5).'
      : `Not launch ready. ${blocking.length} launch-blocking check(s) failed across ${blockersByCategory.filter((row) => row.launch_blocking_checks_failed.length).length} category(ies): ` +
        blockersByCategory.filter((row) => row.launch_blocking_checks_failed.length)
          .map((row) => `${row.category} [${row.launch_blocking_checks_failed.join(', ')}]${row.affected_regions.length ? ` in ${row.affected_regions.join(', ')}` : ''}`)
          .join('; '),
    next_release_action:
      'Derived from the failing gates above, in priority order: (1) provide the format evidence each unresolved ' +
      'market still needs — current GB consumer-format evidence, and any other market whose format support is ' +
      'not established; (2) close the remaining capability blockers (common-errors, GAP-INGEST, GAP-FINDING, ' +
      'consumer-experience) with deployed, current-release behavioral evidence; (3) complete the live-billing ' +
      'configuration — sandbox Stripe billing is implemented and tested in test mode, but live pricing, a live ' +
      'webhook endpoint and production keys are not provisioned; (4) record production deployment provenance and ' +
      'release authorization (B5). Re-run this check after each.',
    validation_scope: process.env.CRP_BUILD_ID
      ? 'served/candidate identity validation (CRP_BUILD_ID set)'
      : 'local candidate validation only (no target release identity set); served-runtime evidence is not verifiable here',
    target_build_id: process.env.CRP_BUILD_ID || null,
    deployment_performed: false,
    network_calls_made: 0
  };
  if (opts.write !== false) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUT_DIR, 'b4-release-check.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }
  return report;
}

function print(report) {
  const lines = ['', `Release check — ${report.state}`, ''];
  for (const row of report.checks) {
    lines.push(`${row.passed ? 'PASS' : 'FAIL'}  ${row.applies_to_launch ? 'BLOCKS' : '      '}  [${row.category}]  ${row.id}`);
    lines.push(`         ${row.detail}`);
    if (row.implementation_status) lines.push(`         Implementation: ${row.implementation_status}; staging: ${row.staging_status}`);
    if (!row.passed && row.affected_regions.length) lines.push(`         affected regions: ${row.affected_regions.join(', ')}`);
  }
  lines.push('');
  lines.push(`Implementation closed: ${(report.implementation_closed || []).length}; implementation open: ${(report.implementation_open || []).length}; staging verification pending: ${(report.staging_verification_pending || []).length}. These are separate from production release checks.`);
  lines.push('Blockers by category:');
  for (const row of report.blockers_by_category) {
    lines.push(`  ${row.category}: ${row.plain}`);
  }
  lines.push('');
  lines.push(report.plain);
  lines.push(`Next: ${report.next_release_action}`);
  lines.push('');
  process.stdout.write(lines.join('\n'));
}

/* Every check must be registered BEFORE the entry point runs, and the two CHECKS.push blocks below register
   the launch-critical checks the owner's order names. The entry point is therefore the last thing in the file. */

module.exports = { runReleaseCheck, CHECKS };


CHECKS.push(
  {
    id: 'ALL_82_JURISDICTIONS_HAVE_MEANINGFUL_ASSESSMENTS_ON_SUPPORTED_FORMATS',
    category: 'FORMAT_SUPPORT',
    blocks_launch: true,
    why: 'a jurisdiction with no working assessment is not launched, and a matrix row that claims one must name the format it rests on',
    run() {
      const rows = matrixRows();
      if (!rows) return { passed: false, detail: 'launch-matrix.json is missing or unreadable; run build_launch_matrix.py', affected_regions: [] };
      const withoutAssessment = rows.filter((row) => row.working_assessment !== true).map((row) => row.region);
      const withoutFormat = rows
        .filter((row) => !row.report_format_support || row.report_format_support === 'NOT_ESTABLISHED_FOR_LAUNCH')
        .map((row) => row.region);
      const withoutAnyCheck = rows
        .filter((row) => !Number(row.executable_checks || 0) && !Number(row.factual_checks || 0) && !Number(row.policy_observations || 0))
        .map((row) => row.region);
      const affected = [...new Set(withoutAssessment.concat(withoutFormat, withoutAnyCheck))].sort();
      const problems = [];
      if (withoutAssessment.length) problems.push(`${withoutAssessment.length} region(s) with no meaningful assessment: ${withoutAssessment.join(', ')}`);
      if (withoutFormat.length) problems.push(`${withoutFormat.length} region(s) with no supported consumer-report format behind them: ${withoutFormat.join(', ')}`);
      if (withoutAnyCheck.length) problems.push(`${withoutAnyCheck.length} region(s) with no check of any class: ${withoutAnyCheck.join(', ')}`);
      return {
        passed: problems.length === 0,
        detail: problems.length
          ? problems.join('; ')
          : `all ${rows.length} jurisdictions have a meaningful assessment on a supported format, and each row names it`,
        affected_regions: affected
      };
    }
  },
  {
    id: 'CANADIAN_GENERAL_UPLOAD_SUPPORT_ESTABLISHED_WITHIN_STATED_BOUNDARIES',
    category: 'FORMAT_SUPPORT',
    blocks_launch: true,
    why: 'Canada must actually read a consumer\'s own file, and must state which layouts it reads rather than promising a bureau',
    run() {
      const scope = formats.presentationScope().CA;
      const adapters = formats.formatsForCountry('CA');
      const families = formats.familiesForCountry('CA');
      const problems = [];
      if (!adapters.length) problems.push('no Canadian presentation is registered');
      if (!families.length) problems.push('no Canadian format FAMILY is admitted, so only a pinned specimen could ever be read');
      if (!adapters.filter((a) => a.admission_path === 'EVIDENCED_STRUCTURAL_CONTRACT').length) {
        problems.push('no Canadian presentation is admitted by a structural contract');
      }
      if (!scope.plain || !/structural contract/i.test(scope.plain)) problems.push('the Canadian coverage sentence does not state the boundary');
      for (const family of families) {
        const boundary = family.reader.FAMILY_CONTRACT.boundary.join(' ');
        if (!/ONE specimen|ONE real/i.test(boundary)) problems.push(`${family.presentation_id}: its boundary does not state that one specimen is what is evidenced`);
      }
      if (!formats.listSupportedFormats().some((entry) => entry.country === 'CA')) {
        problems.push('the Canadian presentations are not advertised before upload');
      }
      return {
        passed: problems.length === 0,
        detail: problems.length
          ? problems.join('; ')
          : `${families.length} Canadian format family(ies) admitted by measured structure, ${adapters.length} Canadian presentation(s) registered, each stating its own boundary`,
        affected_regions: problems.length ? ['CA'] : []
      };
    }
  },
  {
    id: 'CURRENT_GB_SUPPORT_IS_ESTABLISHED',
    category: 'FORMAT_SUPPORT',
    blocks_launch: true,
    why: 'a market whose only format evidence is a fictitious 2007 example has no present-day support; the gap is a current-format INTAKE artifact for the GB consumer-disclosure family reader, not a configuration, deployment, implementation or staging requirement, and saying so is the honest release position',
    run() {
      const currency = gbFamily.CURRENCY_EVIDENCE;
      const validated = currency.currency_validated === true && currency.present_day_support_claimed === true;
      return {
        passed: validated,
        detail: validated
          ? `current GB support is established from ${currency.validated_against || 'recorded current evidence'}`
          : `current GB support is NOT established, and the gap is a current-format INTAKE-EVIDENCE gap (a missing required artifact), distinct from a configuration, deployment, implementation or staging requirement: the only GB format evidence held is ${currency.status} of vintage ${currency.evidence_vintage}, ${currency.current_evidence_attempts.length} targeted retrieval attempt(s) were refused at the source, and no present-day GB consumer-format artifact or layout specification is available to this build. GB intake itself is live through the general bureau-report path (a GB consumer report is read and the shared factual-verification issues are delivered); only the GB-specific consumer-disclosure family reader stays unadmitted until a current artifact is captured and measured.`,
        affected_regions: validated ? [] : ['GB']
      };
    }
  }
);


CHECKS.push(
  {
    id: 'ACCOUNT_ISOLATION_AND_DELETION_PASS',
    category: 'ISOLATION',
    blocks_launch: true,
    why: 'one consumer must never see another\'s case, and deletion must remove the report bytes as well as the row',
    run() {
      const evidence = readEvidence();
      if (!evidence) {
        return {
          passed: false,
          detail: `the suite's own evidence file (${path.relative(LAUNCH_DIR, B4_EVIDENCE)}) is absent or unreadable; run the suite before releasing`,
          affected_regions: []
        };
      }
      const acceptance = evidence.acceptance || {};
      const hardening = evidence.hardening || {};
      const isolation = acceptance['4_sessions_storage_upload_limits_concurrency_account_isolation_deletion_and_restart'] === true;
      const retention = acceptance['5_retention_and_deletion_defined_and_no_report_or_identifier_in_logs_or_public_assets'] === true;
      const cascades = Boolean(hardening.retention
        && hardening.retention.account_deletion_cascades_to_entitlements === true
        && hardening.retention.account_deletion_cascades_to_billing_events === true);
      const blobAccounting = Boolean(hardening.concurrency && Number(hardening.concurrency.referenced_blobs_kept) > 0);
      return {
        passed: isolation && retention && cascades && blobAccounting,
        detail: isolation && retention && cascades && blobAccounting
          ? 'account isolation, deletion and retention pass, and one account\'s deletion cascades to its entitlements and its billing events'
          : `isolation ${isolation}, retention ${retention}, deletion cascades ${cascades}, blob accounting ${blobAccounting}`,
        affected_regions: []
      };
    }
  },
  {
    id: 'SUPPORTED_CHECKS_AND_LIMITATIONS_SHOWN_BEFORE_PURCHASE',
    category: 'PRESENTATION',
    blocks_launch: true,
    why: 'a consumer must see what each selection can check and what it cannot before paying or uploading',
    run() {
      const advertised = formats.listSupportedFormats();
      const paid = require('./entitlement.cjs').PAID_ACTIONS;
      const problems = [];
      if (!advertised.length) problems.push('no presentation is advertised');
      for (const entry of advertised) {
        if (typeof entry.note !== 'string' || !entry.note.length) problems.push(`${entry.presentation_id}: no limitation note`);
        if (typeof entry.currency_note !== 'string' || !entry.currency_note.length) problems.push(`${entry.presentation_id}: no currency note`);
      }
      if (!advertised.some((entry) => entry.present_day_support_claimed === false)) {
        problems.push('no advertised presentation records that it does not claim present-day support, although the GB family does not');
      }
      if (!paid.length) problems.push('the paid actions are not named before payment');
      const html = read(path.join(SERVICE_DIR, 'ui', 'index.html')) || '';
      const uiJs = read(path.join(SERVICE_DIR, 'ui', 'app.js')) || '';
      if (!new RegExp(`\\b${advertised.length}\\b`).test(html)) {
        problems.push(`the UI banner does not state that ${advertised.length} presentations are supported`);
      }
      if (!/no payment provider is connected/.test(uiJs)) problems.push('the UI does not state the payment position before payment');
      if (!/No issue found/.test(uiJs)) problems.push('the UI does not define what "no issue found" means');
      return {
        passed: problems.length === 0,
        detail: problems.length
          ? problems.join('; ')
          : `${advertised.length} presentation(s), each with a limitation note and a currency note, ${paid.length} paid action(s) named, and the UI states both the count and the "no issue found" boundary before payment`,
        affected_regions: []
      };
    }
  },
  {
    id: 'DEPLOYMENT_PROVENANCE_AND_RELEASE_AUTHORIZATION_RECORDED',
    category: 'DEPLOYMENT',
    blocks_launch: true,
    why: 'a release needs a named build, a named host and a recorded owner authorization; none of the three exists yet',
    run() {
      const provenance = path.join(OUT_DIR, 'deployment-provenance.json');
      const record = fs.existsSync(provenance) ? read(provenance) : null;
      let parsed = null;
      try {
        parsed = record ? JSON.parse(record) : null;
      } catch (err) {
        parsed = null;
      }
      const problems = [];
      if (!parsed) problems.push('no deployment provenance record exists');
      if (parsed) {
        for (const field of ['build_id', 'host', 'deployed_by', 'owner_authorization', 'deployed_at']) {
          if (!parsed[field]) problems.push(`the provenance record does not name ${field}`);
        }
      }
      return {
        passed: problems.length === 0,
        detail: problems.length
          ? `${problems.join('; ')}. A validated production release is not recorded here. Any isolated test-mode staging deployment is documented separately and does not establish production launch readiness.`
          : `provenance recorded: build ${parsed.build_id}, host ${parsed.host}, authorized by ${parsed.owner_authorization}`,
        affected_regions: problems.length ? EXPECTED_MARKETS.slice() : []
      };
    }
  }
);



/* OWNER-ACCEPT-008: the two MANDATORY production blockers (OWNER-PRODUCTION-BLOCKERS-001). Each is OPEN until
   its own evidence proves its acceptance criteria; missing, failed, stale or identity-mismatched evidence keeps
   the blocker closed, and neither documentation nor aggregate assertion counts can clear it. */

function readBlockerEvidence(filename) {
  const raw = read(path.join(OUT_DIR, filename));
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (_) { return null; }
}

/* C1: every capability blocker declares the EXACT criterion keys its evidence must carry. The shared validator
   rejects missing required criteria, arbitrary substitute criteria, and references that do not bind to the target
   release. FDT criteria, thresholds and metric definitions are ALIGNED with the Owner-approved PROSPECTIVE
   criteria (OWNER-ACCEPT-009): >=95% recovery of readable required facts, zero incorrect decisive facts, zero
   cross-record/bureau borrowing and zero unsupported violations. */
const FDT_REQUIRED_CRITERIA = [
  'freeze_before_run',
  'independent_held_out_set',
  'zero_incorrect_decisive_facts',
  'zero_cross_record_or_bureau_borrowing',
  'zero_unsupported_violations',
  'min_recovery_of_readable_assessment_required_facts',
  'account_for_every_remaining_miss',
  'withhold_unreadable_or_conflicting_decisive_facts',
  'demonstrate_useful_recovery_on_deployed',
  'demonstrate_bounded_unsuccessful_recovery_on_deployed',
  'benchmark'
];
/* <=5% missed == >=95% of the designated readable required facts recovered. */
const FDT_MAX_MISSED_FACT_RATE = 0.05;
/* Zero incorrect decisive facts. */
const FDT_MAX_INCORRECT_READING_RATE = 0;
const FDT_MIN_RECOVERY_RATE = 0.95;

const CLARIFY_REQUIRED_CRITERIA = [
  'at_most_two_questions',
  'skip_and_dont_know',
  'separate_supplemental_storage',
  'no_escalation',
  'browser_journey'
];

CHECKS.push(
  {
    id: 'BLOCKER-FDT-001_FAILURE_TO_DETECT_MITIGATION',
    category: 'FAILURE_TO_DETECT_MITIGATION',
    blocks_launch: true,
    why: 'failure-to-detect mitigation (equivalent labels/codes, contextual structure, completeness checks, bounded targeted recovery, same-record corroboration and missed-fact/incorrect-reading benchmarks) is a mandatory launch requirement; the served release must demonstrate it behaviorally, not merely carry a local benchmark',
    run() {
      const e = readBlockerEvidence('fdt-mitigation-evidence.json');
      const verdict = validateCapabilityEvidence(e, {
        targetBuildId: process.env.CRP_BUILD_ID || null,
        baseDir: path.join(OUT_DIR),
        requiredCriteria: FDT_REQUIRED_CRITERIA,
        benchmark: { missed_fact_rate: FDT_MAX_MISSED_FACT_RATE, incorrect_reading_rate: FDT_MAX_INCORRECT_READING_RATE, require_baseline: true },
        acceptance: { min_recovery_rate: FDT_MIN_RECOVERY_RATE, zero_incorrect_decisive_facts: true, zero_cross_record_or_bureau_borrowing: true, zero_unsupported_violations: true }
      });
      return { ...verdict, passed: verdict.passed, detail: `BLOCKER-FDT-001: ${verdict.detail}`, affected_regions: EXPECTED_MARKETS.slice() };
    }
  },
  {
    id: 'BLOCKER-CLARIFY-001_MINIMAL_OPTIONAL_CLARIFICATION',
    category: 'CLARIFICATION',
    blocks_launch: true,
    why: 'the conditional "a quick clarification" workflow (at most two simple consequential questions after automatic recovery, with skip and I-don\'t-know, and separately stored supplemental answers) is a mandatory launch requirement',
    run() {
      const e = readBlockerEvidence('clarify-evidence.json');
      const verdict = validateCapabilityEvidence(e, {
        targetBuildId: process.env.CRP_BUILD_ID || null,
        baseDir: path.join(OUT_DIR),
        requiredCriteria: CLARIFY_REQUIRED_CRITERIA
      });
      return { ...verdict, passed: verdict.passed, detail: `BLOCKER-CLARIFY-001: ${verdict.detail}`, affected_regions: EXPECTED_MARKETS.slice() };
    }
  }
);

/* OWNER-ACCEPT-009: register BLOCKER-COMMON-ERRORS-001 and the fourteen section 8.2 GAP blockers. Every one is
   OPEN until its own evidence proves behavior (not just a passing flag) on a recorded release identity. */
const REMAINING_BLOCKERS = [
  { id: 'BLOCKER-COMMON-ERRORS-001_COMMON_CREDIT_REPORT_ERROR_CHECKS', category: 'COMMON_ERRORS', title: 'common credit-report error checks', evidence: 'common-errors-evidence.json', criteria: ['checks_implemented', 'no_false_finding', 'end_to_end_journey'] },
  { id: 'GAP-INGEST-001_IMAGE_SET_COHERENCE', category: 'INGESTION', title: 'ordered image-set / multi-page coherence', evidence: 'gap-ingest-001-evidence.json', criteria: ['upload_order_preserved', 'duplicate_handling', 'report_boundary', 'end_to_end_journey'] },
  { id: 'GAP-INGEST-002_MULTILINE_RECORD_BOUNDARIES', category: 'INGESTION', title: 'multi-line account/collection/public-record boundaries', evidence: 'gap-ingest-002-evidence.json', criteria: ['multiline_boundaries', 'continuation_lines', 'end_to_end_journey'] },
  { id: 'GAP-INGEST-003_OCR_CONFIDENCE_AND_COORDINATES', category: 'INGESTION', title: 'OCR confidence / coordinates preservation', evidence: 'gap-ingest-003-evidence.json', criteria: ['ocr_confidence_preserved', 'coordinates_preserved', 'end_to_end_journey'] },
  { id: 'GAP-INGEST-004_DATE_FORMS', category: 'INGESTION', title: 'unambiguous written date forms', evidence: 'gap-ingest-004-evidence.json', criteria: ['written_date_forms', 'unambiguous_parse', 'end_to_end_journey'] },
  { id: 'GAP-INGEST-005_NUMERIC_DATE_CONVENTIONS', category: 'INGESTION', title: 'numeric date conventions', evidence: 'gap-ingest-005-evidence.json', criteria: ['numeric_date_conventions', 'end_to_end_journey'] },
  { id: 'GAP-INGEST-006_PARTIAL_DATE_PRECISION', category: 'INGESTION', title: 'month-only / partial-date precision', evidence: 'gap-ingest-006-evidence.json', criteria: ['partial_date_precision', 'end_to_end_journey'] },
  { id: 'GAP-INGEST-007_REPORT_REFERENCE_DATE', category: 'INGESTION', title: 'report/reference date identification', evidence: 'gap-ingest-007-evidence.json', criteria: ['reference_date_identified', 'end_to_end_journey'] },
  { id: 'GAP-INGEST-008_PARTIAL_NATIVE_TEXT_RECOVERY', category: 'INGESTION', title: 'partial native-text layer recovery', evidence: 'gap-ingest-008-evidence.json', criteria: ['partial_text_recovery', 'end_to_end_journey'] },
  { id: 'GAP-INGEST-009_BUREAU_SEGMENTATION', category: 'INGESTION', title: 'combined-report bureau segmentation', evidence: 'gap-ingest-009-evidence.json', criteria: ['bureau_segmentation', 'end_to_end_journey'] },
  { id: 'GAP-INGEST-010_UPLOAD_LIMITS_AND_CONTAINERS', category: 'INGESTION', title: 'realistic upload/image-set limits', evidence: 'gap-ingest-010-evidence.json', criteria: ['upload_limits', 'container_handling', 'end_to_end_journey'] },
  { id: 'GAP-FINDING-001_EXCEPTION_EVALUATION', category: 'FINDING', title: 'rule-specific exception evaluation', evidence: 'gap-finding-001-evidence.json', criteria: ['rule_exceptions', 'end_to_end_journey'] },
  { id: 'GAP-FINDING-002_PROBABLE_VIOLATION_PATH', category: 'FINDING', title: 'end-to-end PROBABLE_VIOLATION path', evidence: 'gap-finding-002-evidence.json', criteria: ['probable_violation_path', 'end_to_end_journey'] },
  { id: 'GAP-FINDING-003_RULE_IDENTITY_AND_VERSION', category: 'FINDING', title: 'rule identity/version binding', evidence: 'gap-finding-003-evidence.json', criteria: ['rule_identity', 'version_binding', 'end_to_end_journey'] },
  { id: 'GAP-FINDING-004_SOURCE_LINKED_FINDING_FACTS', category: 'FINDING', title: 'source-linked finding facts', evidence: 'gap-finding-004-evidence.json', criteria: ['source_linked_facts', 'end_to_end_journey'] }
];

for (const blocker of REMAINING_BLOCKERS) {
  CHECKS.push({
    id: blocker.id,
    category: blocker.category,
    blocks_launch: true,
    why: `${blocker.title} is a mandatory production blocker (build plan §8.1/§8.2); a passing flag alone does not clear it`,
    run() {
      const raw = read(path.join(OUT_DIR, blocker.evidence));
      let e = null;
      try { e = raw ? JSON.parse(raw) : null; } catch (_) { e = null; }
      /* C1: a shared strict validator, not the old `passed && behavior && nonempty identity`. The target release
         identity is the candidate build (CRP_BUILD_ID); without one nothing is validated and the blocker stays
         open. Obsolete builds, missing served identity, empty references and partial criteria all fail. */
      const verdict = validateCapabilityEvidence(e, { targetBuildId: process.env.CRP_BUILD_ID || null, baseDir: path.join(OUT_DIR), requiredCriteria: blocker.criteria });
      return {
        ...verdict,
        passed: verdict.passed,
        detail: `${blocker.id}: ${verdict.detail}`,
        affected_regions: EXPECTED_MARKETS.slice()
      };
    }
  });
}




/* OWNER-CONSUMER-EXPERIENCE-001: mandatory §8.3 capabilities, never cleared by flags alone. */
const CONSUMER_EXPERIENCE_BLOCKERS = [
  { id: 'BLOCKER-RESULTS-001', evidence: 'consumer-results-evidence.json', criteria: ['prioritization', 'reasons', 'uncertainty', 'journey', 'isolation'] },
  { id: 'BLOCKER-EXPLANATIONS-001', evidence: 'consumer-explanations-evidence.json', criteria: ['report_fact', 'rule_basis', 'uncertainty', 'journey', 'consistency'] },
  { id: 'BLOCKER-BILLING-001', evidence: 'consumer-billing-evidence.json', criteria: ['plan', 'renewal', 'cancellation', 'upgrade_credit', 'isolation', 'journey'] },
  { id: 'BLOCKER-PRIVACY-001', evidence: 'consumer-privacy-evidence.json', criteria: ['inventory', 'retention', 'deletion', 'isolation', 'journey'] },
  { id: 'BLOCKER-SUPPORT-001', evidence: 'consumer-support-evidence.json', criteria: ['reference', 'redaction', 'access', 'journey', 'usefulness'] }
];
for (const blocker of CONSUMER_EXPERIENCE_BLOCKERS) {
  CHECKS.push({
    id: blocker.id, category: 'CONSUMER_EXPERIENCE', blocks_launch: true,
    why: 'Owner-required consumer capability under build plan §8.3; implementation and served-release behavior must be verified',
    run() {
      let e;
      try { e = JSON.parse(read(path.join(OUT_DIR, blocker.evidence)) || 'null'); } catch (_) { e = null; }
      const verdict = validateCapabilityEvidence(e, { targetBuildId: process.env.CRP_BUILD_ID || null, baseDir: path.join(OUT_DIR), requiredCriteria: blocker.criteria });
      return { ...verdict, passed: verdict.passed, affected_regions: EXPECTED_MARKETS.slice(), detail: verdict.passed
        ? `${blocker.id}: all required criteria have deployed, current-release behavioral evidence`
        : `${blocker.id}: ${verdict.detail}` };
    }
  });
}

/* Owner-requested consumer inconsistencies: remain open until corrected and behaviorally tested.
   Use the shared OWNER-CLOSURE-001 validator; documentation alone cannot close implementation. */
const OWNER_CONSUMER_INCONSISTENCIES = [
  { id: 'BLOCKER-CONSUMER-LANGUAGE-001', evidence: 'consumer-language-imperative-evidence.json', criteria: ['affirmative_scope', 'no_legal_advice_disclaimers', 'finding_labels'] },
  { id: 'BLOCKER-CONSUMER-INCOMPLETE-001', evidence: 'consumer-incomplete-presentation-evidence.json', criteria: ['internal_diagnostics_retained', 'incomplete_checks_hidden', 'no_false_compliance_claim'] },
  { id: 'BLOCKER-CLARIFY-MATERIALITY-002', evidence: 'clarification-materiality-evidence.json', criteria: ['no_context_only_questions', 'rule_materiality', 'mandatory_omission_not_cured_by_answer'] }
];
for (const blocker of OWNER_CONSUMER_INCONSISTENCIES) {
  CHECKS.push({
    id: blocker.id, category: 'CONSUMER_EXPERIENCE', blocks_launch: true,
    why: 'Explicit owner release blocker: consumer behavior conflicts with the product promise',
    run() {
      let evidence = null;
      try { evidence = JSON.parse(read(path.join(OUT_DIR, blocker.evidence)) || 'null'); } catch (_) {}
      const verdict = validateCapabilityEvidence(evidence, {
        targetBuildId: process.env.CRP_BUILD_ID || null,
        baseDir: OUT_DIR, requiredCriteria: blocker.criteria
      });
      return { ...verdict, passed: verdict.passed, affected_regions: EXPECTED_MARKETS.slice(), detail: `${blocker.id}: ${verdict.detail}` };
    }
  });
}

/* The October 7 owner scope limits version 1 violation coverage to the active
   common-error checklist. Historical out-of-checklist statutory adapters are not
   release prerequisites; source-proven checks and packets remain prerequisites. */
CHECKS.push({
  id: 'BLOCKER-FINDING-COVERAGE-001', category: 'FINDING_COVERAGE', blocks_launch: true,
  why: 'The active common-error checklist must be executable from source-linked report data and tested through consumer-selected packets across the 82 selections',
  run() {
    let evidence = null;
    try { evidence = JSON.parse(read(path.join(OUT_DIR, 'finding-coverage-evidence.json')) || 'null'); } catch (_) {}
    const verdict = validateCapabilityEvidence(evidence, {
      targetBuildId: process.env.CRP_BUILD_ID || null, baseDir: OUT_DIR,
      requiredCriteria: ['promise_inventory', 'check_mapping', 'executable_findings', 'material_questions', 'behavioral_coverage', 'end_to_end_journey']
    });
    return { ...verdict, passed: verdict.passed, affected_regions: EXPECTED_MARKETS.slice(), detail: `BLOCKER-FINDING-COVERAGE-001: ${verdict.detail}` };
  }
});

/* Owner all-82 facilitation directive: test the usable jurisdiction-specific journey separately. */
CHECKS.push({
  id: 'BLOCKER-ALL82-FACILITATION-001', category: 'JURISDICTION_FACILITATION', blocks_launch: true,
  why: 'All 82 promised jurisdictions require usable tested consumer facilitation, not merely selectable routes',
  run() {
    let evidence = null;
    try { evidence = JSON.parse(read(path.join(OUT_DIR, 'all82-facilitation-evidence.json')) || 'null'); } catch (_) {}
    const verdict = validateCapabilityEvidence(evidence, {
      targetBuildId: process.env.CRP_BUILD_ID || null, baseDir: OUT_DIR,
      requiredCriteria: ['jurisdiction_inventory', 'usable_intake', 'applicable_assessment', 'material_questions', 'consumer_delivery', 'account_isolation', 'behavioral_coverage', 'end_to_end_journey']
    });
    return { ...verdict, passed: verdict.passed, affected_regions: EXPECTED_MARKETS.slice(), detail: `BLOCKER-ALL82-FACILITATION-001: ${verdict.detail}` };
  }
});

/* Owner directive: a consumer-ready dispute packet is separate from an assessment report. */
CHECKS.push({
  id: 'BLOCKER-DISPUTE-PACKET-001', category: 'DISPUTE_PACKET', blocks_launch: true,
  why: 'Promised consumer-reviewed jurisdiction-appropriate dispute packets must be implemented and tested',
  run() {
    let evidence = null;
    try { evidence = JSON.parse(read(path.join(OUT_DIR, 'dispute-packet-evidence.json')) || 'null'); } catch (_) {}
    const verdict = validateCapabilityEvidence(evidence, {
      targetBuildId: process.env.CRP_BUILD_ID || null, baseDir: OUT_DIR,
      requiredCriteria: ['packet_scope', 'finding_evidence', 'jurisdiction_content', 'consumer_review', 'usable_download', 'entitlement_isolation', 'behavioral_coverage', 'end_to_end_journey']
    });
    return { ...verdict, passed: verdict.passed, affected_regions: EXPECTED_MARKETS.slice(), detail: `BLOCKER-DISPUTE-PACKET-001: ${verdict.detail}` };
  }
});
/* Owner directive (BLOCKER-REPORT-DATA-TO-ISSUE-001): usable ordinary-report assessment is separate from format
   admission and from packet infrastructure. Reading a report is not enough when its material account data is
   ignored, so the extraction -> check -> selected-packet chain is enforced as its own launch requirement. */
CHECKS.push({
  id: 'BLOCKER-REPORT-DATA-TO-ISSUE-001', category: 'REPORT_DATA_TO_ISSUE', blocks_launch: true,
  why: 'Material ordinary-report data must reach supported issues and the consumer-selected packet; readable report facts that no check consumes do not fulfil the assessment promise',
  run() {
    let evidence = null;
    try { evidence = JSON.parse(read(path.join(OUT_DIR, 'report-data-to-issue-evidence.json')) || 'null'); } catch (_) {}
    const verdict = validateCapabilityEvidence(evidence, {
      targetBuildId: process.env.CRP_BUILD_ID || null, baseDir: OUT_DIR,
      requiredCriteria: ['material_field_extraction', 'issue_wiring', 'packet_delivery', 'behavioral_coverage', 'end_to_end_journey']
    });
    return { ...verdict, passed: verdict.passed, affected_regions: EXPECTED_MARKETS.slice(), detail: `BLOCKER-REPORT-DATA-TO-ISSUE-001: ${verdict.detail}` };
  }
});



/* Approved subscriber offering: continuing value requires history and evidence-based comparison. */
CHECKS.push({
  id: 'BLOCKER-SUBSCRIPTION-VALUE-001', category: 'SUBSCRIPTION_VALUE', blocks_launch: true,
  why: 'The approved subscription offering requires owned report history and meaningful subsequent-report comparison',
  run() {
    let evidence = null;
    try { evidence = JSON.parse(read(path.join(OUT_DIR, 'subscription-value-evidence.json')) || 'null'); } catch (_) {}
    const verdict = validateCapabilityEvidence(evidence, {
      targetBuildId: process.env.CRP_BUILD_ID || null, baseDir: OUT_DIR,
      requiredCriteria: ['owned_history', 'comparison_linkage', 'issue_changes', 'consumer_view', 'isolation', 'behavioral_coverage', 'end_to_end_journey']
    });
    return { ...verdict, passed: verdict.passed, affected_regions: EXPECTED_MARKETS.slice(), detail: `BLOCKER-SUBSCRIPTION-VALUE-001: ${verdict.detail}` };
  }
});

/* Owner scope cap: every release check must map to the approved customer minimum or optional roadmap.
   No new blocking requirement can silently appear without a scope entry. */
const FINAL_RELEASE_SCOPE = require('./release-scope.json');
const scopeEntries = new Map(FINAL_RELEASE_SCOPE.checks.map(row => [row.id, row]));
if (scopeEntries.size !== FINAL_RELEASE_SCOPE.checks.length) throw new Error('DUPLICATE_RELEASE_SCOPE_ENTRY');
for (const check of CHECKS) {
  const scope = scopeEntries.get(check.id);
  if (!scope || !scope.customer_requirement || !['CORE', 'DIAGNOSTIC', 'OPTIONAL'].includes(scope.release_scope)) {
    throw new Error(`RELEASE_CHECK_REQUIRES_OWNER_SCOPE_MAPPING: ${check.id}`);
  }
  if (scope.blocks_launch !== (scope.release_scope === 'CORE')) throw new Error(`INCONSISTENT_RELEASE_SCOPE: ${check.id}`);
  check.blocks_launch = scope.blocks_launch;
  check.release_scope = scope.release_scope;
  check.customer_requirement = scope.customer_requirement;
}
for (const id of scopeEntries.keys()) {
  if (!CHECKS.some(check => check.id === id)) throw new Error(`RELEASE_SCOPE_NAMES_MISSING_CHECK: ${id}`);
}

/* The entry point runs LAST, so every `CHECKS.push` above has already registered. */
if (require.main === module) {
  print(runReleaseCheck({}));
  process.stdout.write(`evidence written to ${path.relative(process.cwd(), path.join(OUT_DIR, 'b4-release-check.json'))}\n`);
}

