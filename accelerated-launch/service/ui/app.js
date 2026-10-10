'use strict';
/* The private consumer UI for the local service. It renders PLAIN fields only: the API's audit-only
   `machine` payload is never read here, and no internal classification is ever shown. */

const STEP_VIEWS = Object.freeze({
  ACCOUNT: { label: 'Account', render: renderAccount }, JURISDICTION: { label: 'Upload report', render: renderJurisdiction },
  REPORT: { label: 'Check report', render: renderReport }, RESULTS: { label: 'Review results', render: renderResults },
  CHOOSE: { label: 'Choose disputes', render: renderReview },
  PREPARE: { label: 'Prepare documents', render: renderReview },
  REVIEW: { label: 'Review and approve packet', render: renderReview }, HISTORY: { label: 'Saved reports', render: renderHistory },
  CASE: { label: 'Privacy and deletion', render: renderCase }, SUPPORT: { label: 'Help', render: renderSupport },
  BILLING: { label: 'Plans', render: renderBilling }
});
const STEP_KEYS = Object.keys(STEP_VIEWS);
const STEPS = STEP_KEYS.map(key => STEP_VIEWS[key].label);
const STEP = Object.freeze(Object.fromEntries(STEP_KEYS.map((key, index) => [key, index])));
const state = {
  step: 0,
  surfaceError: null,
  account: null,
  accountProfile: null,
  accountDocuments: [],
  cases: [],
  caseId: null,
  view: null,
  notice: null,
  error: null,
  activity: [],
  entitlement: null,
  payment: null,
  upgrade_credit: null,
  upgrade_quotes: null,
  upgrade_confirmation: null,
  pending_checkout: null,
  pending_checkout_account_id: null,
  result_list: [],
  support: null,
  billing: null,
  publicPricing: null,
  accountSecurity: null,
  recoveryKey: null,
  recoveryMode: false,
  packetReturn: null,
  checkoutReturn: null,
  /* The post-upload screen reports the case's actual state: an assessment in flight, the last refusal, or a
     missing purchase (which is a plan decision, not a failure). */
  assessing: false,
  assessment_error: null,
  purchase_needed: null
};
let surface = null;
let uploadLimits = null;
const uploadBatches = new Map();
let accountEpoch = 0;
let renderSequence = 0;
let accountOperationSequence = 0;
let assessmentOperationSequence = 0;
let assessmentCaseId = null;
let packetLeave = null;
let checkoutReturnSequence = 0;
function cancelledAction() { const error = new Error('Action cancelled after navigation.'); error.cancelled = true; return error; }
function accountContext() {
  const id = state.account?.account_id, epoch = accountEpoch;
  return () => { if (state.account?.account_id !== id || accountEpoch !== epoch) throw cancelledAction(); };
}

const el = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function note(line) {
  state.activity.push(`${new Date().toISOString().slice(11, 19)}  ${line}`);
  if (state.activity.length > 120) state.activity.shift();
  el('activity').textContent = state.activity.join('\n');
}

async function api(method, path, body) {
  let res;
  try { res = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined
  }); } catch { throw new Error('We could not connect to the CRP service. Please try again shortly.'); }
  note(`${method} ${path} -> ${res.status}`);
  let data = {};
  try { data = await res.json(); } catch { data = {}; }
  if (!res.ok || data.ok === false) {
    const message = data.error && data.error.message ? data.error.message : `Request refused (${res.status})`;
    const error = new Error(message);
    /* The caller needs the actual refusal class — a missing purchase is not a failure of the check. */
    error.status = res.status;
    error.code = data.error && data.error.code ? data.error.code : null;
    throw error;
  }
  return data;
}

function run(fn) {
  state.error = null;
  state.notice = null;
  return Promise.resolve()
    .then(fn)
    .then(render)
    .catch((err) => { if (err.cancelled) return; state.error = err.message; render(); });
}

function regionLabel(country, region) {
  if (!surface) return region;
  const row = surface.regions.find((r) => r.value === region);
  const c = surface.countries.find((x) => x.value === country);
  return `${row ? row.label : region}${c ? ` · ${c.label}` : ''}`;
}

function readFileBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(new Error('This browser could not read the selected file.'));
    reader.readAsDataURL(file);
  });
}

/* ------------------------------------------------------------------ shell */

function renderSteps() {
  const main = STEPS.slice(0, STEP.REVIEW + 1).map((label, index) =>
    `<button data-step="${index}" aria-current="${index === state.step}"><span class="num">${index + 1}</span><span class="step-name">${esc(label)}</span></button>`).join('');
  const tools = STEPS.slice(STEP.HISTORY).map((label, offset) =>
    `<button data-step="${STEP.HISTORY + offset}" aria-current="${STEP.HISTORY + offset === state.step}"><span class="step-name">${esc(label)}</span></button>`).join('');
  el('steps').innerHTML = `${main}<div class="tools-label">Your tools</div>${tools}`;
  for (const button of el('steps').querySelectorAll('button')) {
    button.onclick = () => navigateStep(Number(button.dataset.step));
  }
  el('breadcrumb').textContent = STEPS[state.step];
  const inJourney = state.step <= STEP.REVIEW;
  el('stepcount').textContent = inJourney ? `Step ${state.step + 1} of 7` : 'Your tools';
  el('step-label').textContent = STEPS[state.step];
  el('bar').style.width = `${Math.min(state.step + 1, 7) / 7 * 100}%`;
  const progress = el('journey-progress');
  if (progress.setAttribute) { progress.setAttribute('aria-valuemax', '7'); progress.setAttribute('aria-valuenow', String(Math.min(state.step + 1, 7))); }
  progress.hidden = !inJourney;
}

function navigateStep(step) {
  if ((state.step === STEP.CHOOSE || state.step === STEP.PREPARE || state.step === STEP.REVIEW) && packetLeave) return packetLeave(step);
  if (step !== STEP.BILLING) state.upgrade_confirmation = null;
  state.step = step; render();
}

function banner() {
  const node = el('support-banner');
  el('referral-preview-link').hidden = !surface?.preview_mode;
  const inDemo = state.view && state.view.result && state.view.result.support === 'DEMONSTRATION_ONLY_NOT_REPORT_SUPPORT';
  if (inDemo) {
    node.className = 'banner demo';
    node.innerHTML = '<strong>INTERACTIVE DEMONSTRATION</strong> These results are examples, not results from your report. You cannot create a dispute packet from this sample.';
  } else {
    node.className = 'banner';
    node.innerHTML = surface && surface.preview_mode
      ? '<strong>Staging preview · test payments only.</strong> Use test cards and fictional reports, never real cards or private reports. <a href="/score-simulator.html" target="_blank" rel="noopener">Try the fictional score simulator</a>.'
      : '<strong>Preview · not open to the public yet.</strong> Payments are unavailable in this preview.';
  }
}

/**
 * B4: what this account may do, and what the payment capability actually is. Both come from the service, so the
 * page can never claim more access than the service will honour.
 */
function readableDate(value) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }) : '';
}
function planName(code) { return ({ report_once: 'One report', monthly: 'Monthly subscription', annual: 'Yearly subscription' })[code] || 'Subscription'; }
function paymentSentence(pay) { return pay?.is_a_working_payment ? 'You pay only after choosing a plan and completing checkout.' : 'Payments are unavailable right now.'; }
function access() {
  const ent = state.entitlement || null;
  const pay = state.payment || null;
  const credit = state.upgrade_credit || null;
  const parts = [];
  if (ent) {
    parts.push(ent.entitled
      ? `<strong>Your plan:</strong> ${esc(planName(ent.plan_code))}${ent.expires_at ? `, active until ${esc(readableDate(ent.expires_at))}` : ''}.`
      : 'Upload and check your report for free. Unlock the full assessment with a one-time purchase, or choose a subscription for dispute packets and full access.');
  } else {
    parts.push('Your plan details are unavailable. Try again.');
  }
  parts.push(esc(paymentSentence(pay)));
  /* A credit message appears only where it bears on a purchase decision (the billing view), never as a
     standing "not eligible" line on the report screen. */
  if (credit && credit.eligible) {
    parts.push(`<strong>Your upgrade credit:</strong> ${esc(money(credit.credit_cents, credit.currency))} from unused payments toward a higher plan.`);
  }
  return `<div class="note">${parts.join('<br>')}</div>`;
}

/** Refresh the account's access state after anything that could change it. */
async function refreshAccess() {
  const ensureAccount = accountContext();
  try {
    const data = await api('GET', '/api/entitlement');
    ensureAccount();
    if (data && data.entitlement) state.entitlement = data.entitlement;
    if (data && data.payment) state.payment = data.payment;
    state.upgrade_credit = data.upgrade_credit || null;
    state.upgrade_quotes = data.upgrade_quotes || null;
    rememberPendingCheckout(data);
  } catch (error) {
    if (error.cancelled) throw error;
    ensureAccount();
    state.entitlement = null;
    state.payment = null;
    state.upgrade_credit = null;
    state.upgrade_quotes = null;
    state.upgrade_confirmation = null;
    rememberPendingCheckout({});
  }
  try {
    /* The purchase choices appear on the results step as well as in billing, so the catalogue is loaded once. */
    const billing = await api('GET', '/api/billing/plans');
    ensureAccount();
    state.billing = billing;
    if (billing.upgrade_quotes) state.upgrade_quotes = billing.upgrade_quotes;
    if (billing.upgrade_credit) state.upgrade_credit = billing.upgrade_credit;
    rememberPendingCheckout(billing);
  } catch (error) {
    if (error.cancelled) throw error;
    ensureAccount();
    state.billing = null;
  }
}

function notices() {
  const parts = [];
  if (state.error) parts.push(`<div class="note stop"><span class="err">Refused:</span> ${esc(state.error)}</div>`);
  if (state.notice) parts.push(`<div class="note" id="consumer-notice">${esc(state.notice)}</div>`);
  if (state.checkoutReturn && state.account && (!state.caseId || state.checkoutReturn.caseId === state.caseId)) {
    const pending = state.checkoutReturn.status === 'pending';
    parts.push(`<div class="note${pending ? '' : ' stop'}">${pending ? 'Your payment has not been confirmed yet. Check again before starting another checkout.' : 'We could not open your saved report. Try again, or select a saved report below.'}<br><button class="secondary" id="checkout-return-retry">${pending ? 'Check payment' : 'Try again'}</button></div>`);
  }
  return parts.join('');
}

function render() {
  renderSequence++;
  packetLeave = null;
  document.body?.classList?.toggle('auth-entry', !state.account && state.step === STEP.ACCOUNT);
  document.title = !state.account && state.step === STEP.ACCOUNT
    ? `${state.recoveryMode ? 'Reset password' : location.hash === '#signin' ? 'Log in' : 'Create account'} — Credit Regulator Pro`
    : 'Credit Regulator Pro — Check your credit report';
  el('who').textContent = state.account ? `Signed in as ${state.account.email}` : 'Not signed in';
  banner();
  renderSteps();
  footerDisclaimer();
  const panel = el('panel');
  STEP_VIEWS[STEP_KEYS[state.step]].render(panel);
  wireCheckoutReturn();
}

/* OWNER-CONSUMER-LANGUAGE-001 (footer-only): the legal-advice disclaimer is shown ONLY on the main page
   (step 0) and hidden on every other view — assessment/results, review/download, billing, privacy and support. */
function footerDisclaimer() {
  const node = el('footer-disclaimer');
  if (node) node.hidden = state.step !== 0;
}

/* ------------------------------------------------------------------ step 0: account */

const SIGNUP_PROFILE_FIELDS = [
  ['full_name', 'Full name', 'text', 'name'], ['date_of_birth', 'Date of birth', 'date', 'bday'],
  ['phone', 'Phone number', 'tel', 'tel'], ['address_line1', 'Street address', 'text', 'address-line1'],
  ['address_line2', 'Apartment or unit', 'text', 'address-line2'], ['city', 'City or town', 'text', 'address-level2'],
  ['region', 'Province, state or county', 'text', 'address-level1'], ['postal_code', 'Postal or ZIP code', 'text', 'postal-code'],
  ['country', 'Country', 'text', 'country-name']
];

function renderAccount(panel) {
  if (state.account) { renderAccountDetails(panel); return; }
  if (state.recoveryMode) { renderRecovery(panel); return; }
  const signInEntry = location.hash === '#signin';
  panel.innerHTML = `
    <div class="auth-heading"><a class="auth-brand" href="landing.html"><span class="mark" aria-hidden="true">C</span><span>Credit Regulator <b>PRO</b></span></a><a href="landing.html">← Back to home</a></div>
    <h1>${signInEntry ? 'Log in to your account' : 'Create your account'}</h1>
    <p class="lede">${signInEntry ? 'Enter your email and password to continue.' : 'Start with your email and a password. You can upload your report after signing in.'}</p>
    ${location.protocol === 'file:' ? '<p class="note" id="local-preview-note">This saved page is a visual preview. To create an account, <a href="https://staging.creditregulatorpro.com/index.html#create">open the running staging site</a>.</p>' : ''}
    ${notices()}
    <div class="row">
      <div>
        <label for="email">Email address</label>
        <input id="email" type="email" autocomplete="username" placeholder="you@example.com">
      </div>
      <div>
        <label for="password">${signInEntry ? 'Password' : 'Password (at least 12 characters)'}</label>
        <input id="password" type="password" autocomplete="${signInEntry ? 'current-password' : 'new-password'}">
      </div>
    </div>
    ${signInEntry ? '' : `<section class="signup-details" aria-labelledby="signup-details-title"><h2 id="signup-details-title">Your personal details</h2>
      <p class="evidence">Add these now so your packet can use them later. You can edit or finish them in your account. Your sign-in email will be used for replies unless you change it there.</p>
      <div class="signup-fields">${SIGNUP_PROFILE_FIELDS.map(([field, label, type, autocomplete]) => `<div><label for="signup-${field}">${label}</label><input id="signup-${field}" type="${type}" autocomplete="${autocomplete}" maxlength="${ACCOUNT_CONTACT_LIMITS[field]}"></div>`).join('')}</div></section>`}
    ${signInEntry ? '<button class="primary" id="signin">Log in</button><button class="secondary" id="create">Create account</button>' : '<button class="primary" id="create">Create account</button><button class="secondary" id="signin">Log in</button>'}
    <p><button class="text-button" id="forgot-password">Forgot your password?</button></p>
    <p class="evidence">No report, identification, or payment is needed to create an account.</p>
    ${surface?.preview_mode ? '<p class="evidence">Staging preview: use fictional information while testing this page.</p>' : ''}
    `;

  const credentials = () => ({ email: el('email').value, password: el('password').value });
  el('create').onclick = () => {
    if (signInEntry) { location.hash = '#create'; render(); return; }
    return run(async () => {
    if (location.protocol === 'file:') throw new Error('Open the running staging site to create an account.');
    const profile = Object.fromEntries(SIGNUP_PROFILE_FIELDS.map(([field]) => [field, el('signup-' + field)?.value || '']));
    accountEpoch++;
    const data = await api('POST', '/api/accounts', { ...credentials(), profile });
    state.account = data.account;
    state.accountProfile = data.profile || null; state.accountDocuments = [];
    state.accountSecurity = null; state.packetReturn = null; state.recoveryKey = data.recovery_key || null;
    state.checkoutReturn = null;
    await refreshAccess();
    state.step = 1;
    state.notice = 'Account created and signed in.';
    });
  };
  el('signin').onclick = () => run(async () => {
    if (location.protocol === 'file:') throw new Error('Open the running staging site to log in.');
    accountEpoch++;
    const data = await api('POST', '/api/sessions', credentials());
    state.account = data.account;
    state.accountProfile = null; state.accountDocuments = [];
    state.accountSecurity = null; state.recoveryKey = null; state.packetReturn = null;
    state.checkoutReturn = null;
    await refreshAccess();
    state.step = 1;
    state.notice = 'Signed in.';
    const returning = checkoutReturnContext();
    if (returning) await restoreCheckoutReport(returning);
  });
  el('forgot-password').onclick = () => { state.recoveryMode = true; state.error = null; render(); };
}


function recoveryKeyBlock() {
  return state.recoveryKey ? `<section class="note recovery-key"><h2>Save your recovery key</h2>
    <p>Use this key if you forget your password. Keep it in a safe place. We show it only now. A key works once.</p>
    <label for="recovery-key">Your recovery key</label><input id="recovery-key" readonly autocomplete="off" value="${esc(state.recoveryKey)}">
    <button class="secondary" id="download-recovery-key">Save key to a file</button><button class="secondary" id="copy-recovery-key">Copy key</button>
    <button class="primary" id="saved-recovery-key">I saved my key</button><p id="recovery-key-status" role="status"></p></section>` : '';
}

function wireRecoveryKey() {
  if (!state.recoveryKey) return;
  const key = state.recoveryKey, ensureAccount = accountContext();
  el('download-recovery-key').onclick = () => {
    ensureAccount();
    const url = URL.createObjectURL(new Blob(['Credit Regulator Pro recovery key\n\n' + key + '\n\nKeep this file private. This key works once.\n'], { type: 'text/plain' }));
    const link = document.createElement('a'); link.href = url; link.download = 'CRP-recovery-key.txt'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  el('copy-recovery-key').onclick = async () => {
    try { ensureAccount(); await navigator.clipboard.writeText(key); ensureAccount(); el('recovery-key-status').textContent = 'Key copied. Save it in a safe place.'; }
    catch { if (state.recoveryKey === key && el('recovery-key-status')) el('recovery-key-status').textContent = 'Select the key and copy it, or save it to a file.'; }
  };
  el('saved-recovery-key').onclick = () => { ensureAccount(); state.recoveryKey = null; render(); };
}

function renderRecovery(panel) {
  panel.innerHTML = `<div class="auth-heading"><a class="auth-brand" href="landing.html"><span class="mark" aria-hidden="true">C</span><span>Credit Regulator <b>PRO</b></span></a><a href="landing.html">← Back to home</a></div>
    <h1>Reset your password</h1><p class="lede">Use the recovery key you saved when you created your account.</p>${notices()}
    ${recoveryKeyBlock()}
    ${state.recoveryKey ? '' : `<label for="recover-email">Email address</label><input id="recover-email" type="email" autocomplete="username">
    <label for="recover-key">Saved recovery key</label><input id="recover-key" type="password" autocomplete="off">
    <label for="recover-password">New password (at least 12 characters)</label><input id="recover-password" type="password" autocomplete="new-password">
    <button class="primary" id="recover-account">Reset password</button>
    <p class="evidence">Without your saved key, we cannot reset your password here.</p>`}
    <button class="secondary" id="recovery-back">Back to sign in</button>`;
  if (state.recoveryKey) wireRecoveryKey();
  if (el('recover-account')) el('recover-account').onclick = () => run(async () => {
    const epoch = accountEpoch, rendered = renderSequence;
    const data = await api('POST', '/api/account/recover', { email: el('recover-email').value, recovery_key: el('recover-key').value, password: el('recover-password').value });
    if (epoch !== accountEpoch || rendered !== renderSequence || state.account || !state.recoveryMode) throw cancelledAction();
    state.recoveryKey = data.recovery_key || null;
    state.notice = 'Password reset. Save your new key, then sign in with your new password.';
  });
  el('recovery-back').onclick = () => { state.recoveryKey = null; state.recoveryMode = false; render(); };
}

const ACCOUNT_CONTACT_FIELDS = [
  ['full_name', 'Full name', 'text', 'name'], ['date_of_birth', 'Date of birth', 'date', 'bday'],
  ['contact_email', 'Contact email', 'email', 'email'], ['phone', 'Phone number', 'tel', 'tel'],
  ['address_line1', 'Street address', 'text', 'address-line1'], ['address_line2', 'Apartment or unit', 'text', 'address-line2'],
  ['city', 'City or town', 'text', 'address-level2'], ['region', 'Province, state or county', 'text', 'address-level1'],
  ['postal_code', 'Postal or ZIP code', 'text', 'postal-code'], ['country', 'Country', 'text', 'country-name'],
  ['previous_address', 'Previous address, if needed', 'text', 'off']
];
const ACCOUNT_FORM_FIELDS = [
  ['given_name', 'First name', 'text', 'given-name'], ['middle_name', 'Middle name (optional)', 'text', 'additional-name'],
  ['family_name', 'Last name', 'text', 'family-name'], ['suffix', 'Suffix, such as Jr. (optional)', 'text', 'honorific-suffix'],
  ['street_number', 'Street number (optional)', 'text', 'off'], ['street_name', 'Street name (optional)', 'text', 'off']
];
const ACCOUNT_CONTACT_LIMITS = { full_name: 200, given_name: 100, middle_name: 100, family_name: 100, suffix: 20, street_number: 30, street_name: 250,
  date_of_birth: 10, phone: 50, contact_email: 254, address_line1: 250, address_line2: 250, city: 120, region: 120, postal_code: 32, country: 80, previous_address: 500 };
const DOCUMENT_KIND_LABELS = {
  DRIVING_LICENCE: 'Driver’s licence', PASSPORT: 'Passport', GOVERNMENT_ID: 'Other government ID',
  BIRTH_CERTIFICATE: 'Birth certificate', SOCIAL_SECURITY: 'Social Security document',
  UTILITY_BILL: 'Utility bill', BANK_STATEMENT: 'Bank statement', OTHER: 'Other document',
  MEDICARE: 'Medicare card', TAX_ASSESSMENT: 'Tax assessment', LEASE: 'Lease', RATES_NOTICE: 'Rates notice',
  SSN_PAY_STUB: 'Pay stub showing SSN', W2: 'W-2', '1099': '1099',
  AU_FULL_BIRTH_CERTIFICATE: 'Full Australian birth certificate', PROOF_OF_AGE: 'Proof-of-age card',
  FOREIGN_BIRTH_CERTIFICATE_TRANSLATED: 'Foreign birth certificate with official translation',
  STATUTORY_DECLARATION: 'Completed bureau statutory declaration', SELFIE_ID: 'Selfie holding photo ID, if requested',
  EMPLOYEE_ID: 'Employee photo ID', MARRIAGE_CERTIFICATE: 'Marriage certificate',
  INSURANCE_STATEMENT: 'Home insurance statement', FINANCIAL_STATEMENT: 'Financial statement',
  DEED: 'Property deed', ADDRESS_PAY_STUB: 'Pay stub showing address', PHONE_BILL: 'Phone bill', MORTGAGE_STATEMENT: 'Mortgage statement'
};
const US_IDENTIFIER_DOCUMENT_KINDS = new Set(['SOCIAL_SECURITY', 'SSN_PAY_STUB', 'W2', '1099']);
function documentKindsForAccount() {
  const country = String(state.accountProfile?.country || '').trim().toUpperCase();
  const gbOrAu = ['GB', 'UK', 'UNITED KINGDOM', 'GREAT BRITAIN', 'ENGLAND', 'SCOTLAND', 'WALES', 'NORTHERN IRELAND',
    'AU', 'AUSTRALIA', 'COMMONWEALTH OF AUSTRALIA'].includes(country) ||
    ['GB', 'AU'].includes(state.view?.case?.country);
  return Object.entries(DOCUMENT_KIND_LABELS)
    .filter(([kind]) => !gbOrAu || !US_IDENTIFIER_DOCUMENT_KINDS.has(kind))
    .sort((a, b) => Number(a[0] === '1099') - Number(b[0] === '1099'));
}
let accountDetailsSequence = 0;
function renderAccountDetails(panel) {
  const accountId = state.account.account_id, sequence = ++accountDetailsSequence;
  if (!state.accountProfile) {
    panel.innerHTML = `${notices()}<h1>Your account</h1><p>Loading your details…</p>`;
    Promise.all([api('GET', '/api/account/profile'), api('GET', '/api/account/documents'), api('GET', '/api/account/security'), api('GET', '/api/entitlement')]).then(([profile, documents, security, access]) => {
      if (state.step !== 0 || state.account?.account_id !== accountId || sequence !== accountDetailsSequence) return;
      if (!profile.profile || !Array.isArray(documents.documents)) throw new Error('Your account details could not be loaded. Try again.');
      if (access.entitlement) state.entitlement = access.entitlement;
      if (access.payment) state.payment = access.payment;
      if (access.upgrade_credit) state.upgrade_credit = access.upgrade_credit;
      if (access.upgrade_quotes) { state.upgrade_quotes = access.upgrade_quotes; state.billing = null; }
      rememberPendingCheckout(access);
      state.accountProfile = profile.profile; state.accountDocuments = documents.documents; state.accountSecurity = security; renderAccountDetails(panel);
    }).catch(error => {
      if (state.step !== 0 || state.account?.account_id !== accountId || sequence !== accountDetailsSequence) return;
      panel.innerHTML = `<h1>Your account</h1><p class="note stop">${esc(error.message)}</p><button id="account-retry">Try again</button>`;
      el('account-retry').onclick = () => renderAccountDetails(panel);
    });
    return;
  }
  panel.innerHTML = `${notices()}<h1>Your account</h1>
    <p class="lede">Manage your contact details and documents for your dispute packets.</p>
    ${state.packetReturn ? '<p class="note">Your packet draft is saved. Add or update your details, then return to your packet.</p>' : ''}
    ${recoveryKeyBlock()}
    <p><strong>Sign-in email:</strong> ${esc(state.account.email)}</p>
    <h2>Contact details</h2><p class="evidence">Add the details you want to use in your letter. You can review them before sending.</p>
    <div class="row">${ACCOUNT_CONTACT_FIELDS.map(([field, label, type, autocomplete]) => `<div><label for="account-${field}">${label}</label><input id="account-${field}" type="${type}" autocomplete="${autocomplete}" maxlength="${ACCOUNT_CONTACT_LIMITS[field]}" value="${esc(state.accountProfile[field] || '')}"></div>`).join('')}</div>
    <details ${state.packetReturn ? 'open' : ''}><summary>Details for bureau forms</summary>
      <p class="evidence">Enter your name as shown on your ID. If your form has separate street boxes, you can add your street number and name here.</p>
      <div class="row">${ACCOUNT_FORM_FIELDS.map(([field, label, type, autocomplete]) => `<div><label for="account-${field}">${label}</label><input id="account-${field}" type="${type}" autocomplete="${autocomplete}" maxlength="${ACCOUNT_CONTACT_LIMITS[field]}" value="${esc(state.accountProfile[field] || '')}"></div>`).join('')}</div>
    </details>
    <button class="primary" id="account-save">Save contact details</button>
    <h2>Documents for disputes</h2><p class="evidence">Upload copies of your ID and proof of address. Include both sides of an ID in one PDF where required. Choose what to include when you review a packet.</p>
    <div class="row"><div><label for="account-document-type">Purpose</label><select id="account-document-type"><option value="IDENTITY">Identification</option><option value="ADDRESS">Proof of address</option><option value="SUPPORTING">Other supporting document</option></select></div>
    <div><label for="account-document-kind">Document</label><select id="account-document-kind">${documentKindsForAccount().map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}</select></div></div>
    <label for="account-document-file">PDF, PNG or JPEG, up to 10 MB</label><input id="account-document-file" type="file" accept="application/pdf,image/png,image/jpeg">
    <button class="secondary" id="account-document-upload">Upload document</button>
    <div>${state.accountDocuments.length ? state.accountDocuments.map(doc => `<p><a href="/api/account/documents/${encodeURIComponent(doc.file_id)}">${esc(doc.original_filename)}</a> — ${esc(DOCUMENT_KIND_LABELS[doc.document_kind] || doc.document_kind)} <button class="secondary" data-delete-document="${esc(doc.file_id)}">Remove</button></p>`).join('') : '<p class="evidence">No documents uploaded yet.</p>'}</div>
    <details class="account-security"><summary>Password recovery</summary><p>${state.accountSecurity?.recovery_key_available ? 'You have a recovery key. Creating a new key replaces the old one.' : 'Save a recovery key so you can reset a forgotten password.'}</p>
    <label for="security-password">Current password</label><input id="security-password" type="password" autocomplete="current-password">
    <button class="secondary" id="create-recovery-key">Create a recovery key</button></details>
    <div class="row"><button class="primary" id="account-continue">${state.packetReturn ? 'Return to my packet' : 'Continue'}</button><button class="secondary" id="signout">Sign out</button></div>`;
  wireRecoveryKey();
  el('create-recovery-key').onclick = () => run(async () => {
    const ensureAccount = accountContext();
    const data = await api('POST', '/api/account/recovery-key', { password: el('security-password').value }); ensureAccount();
    state.recoveryKey = data.recovery_key; state.accountSecurity = { recovery_key_available: true };
  });
  for (const [field] of [...ACCOUNT_CONTACT_FIELDS, ...ACCOUNT_FORM_FIELDS]) el('account-' + field).oninput = () => { accountOperationSequence++; state.accountProfile[field] = el('account-' + field).value; };
  el('account-save').onclick = () => run(async () => {
    const ensureAccount = accountContext(), operation = ++accountOperationSequence, profile = { ...state.accountProfile };
    const saved = await api('PUT', '/api/account/profile', { profile });
    ensureAccount(); if (operation !== accountOperationSequence) throw cancelledAction();
    state.accountProfile = saved.profile;
    state.notice = 'Contact details saved.';
  });
  el('account-document-upload').onclick = () => run(async () => {
    const ensureAccount = accountContext(), operation = ++accountOperationSequence;
    const file = el('account-document-file').files[0];
    if (!file) throw new Error('Choose a document to upload.');
    const body = { originalFilename: file.name, declaredBytes: file.size, mimeType: file.type,
      document_type: el('account-document-type').value, document_kind: el('account-document-kind').value };
    body.contentBase64 = await readFileBase64(file); ensureAccount();
    await api('POST', '/api/account/documents', body); ensureAccount();
    const saved = await api('GET', '/api/account/documents'); ensureAccount();
    if (operation !== accountOperationSequence) throw cancelledAction();
    state.accountDocuments = saved.documents;
    state.notice = 'Document uploaded.';
  });
  for (const button of panel.querySelectorAll('[data-delete-document]')) button.onclick = () => run(async () => {
    const ensureAccount = accountContext(), operation = ++accountOperationSequence;
    await api('DELETE', '/api/account/documents/' + encodeURIComponent(button.dataset.deleteDocument));
    ensureAccount(); const saved = await api('GET', '/api/account/documents'); ensureAccount();
    if (operation !== accountOperationSequence) throw cancelledAction();
    state.accountDocuments = saved.documents;
    state.notice = 'Document removed.';
  });
  el('account-continue').onclick = () => run(async () => {
    const returning = state.packetReturn, ensureAccount = accountContext(), rendered = renderSequence, operation = ++accountOperationSequence;
    if (!returning || returning.accountId !== state.account.account_id || returning.epoch !== accountEpoch || returning.caseId !== state.caseId) {
      state.packetReturn = null; state.step = STEP.JURISDICTION; return;
    }
    const ensureReturn = () => { ensureAccount(); if (rendered !== renderSequence || operation !== accountOperationSequence || state.step !== STEP.ACCOUNT || state.packetReturn !== returning || state.caseId !== returning.caseId) throw cancelledAction(); };
    const saved = await api('PUT', '/api/account/profile', { profile: { ...state.accountProfile } }); ensureReturn();
    state.accountProfile = saved.profile;
    const answer = await api('GET', `/api/cases/${returning.caseId}`); ensureReturn();
    state.view = answer.view; state.packetReturn = null;
    state.step = answer.view.result_id === returning.resultId ? (returning.step || STEP.REVIEW) : STEP.RESULTS;
    state.notice = state.step !== STEP.RESULTS ? 'Your saved packet is ready. Review your updated details.' : 'Your report has a newer result. Review it before preparing a packet.';
  });
  el('signout').onclick = () => run(async () => {
    accountEpoch++;
    await api('DELETE', '/api/sessions/current');
    state.account = null;
    state.accountProfile = null;
    state.accountDocuments = [];
    state.cases = [];
    state.caseId = null;
    state.view = null;
    state.entitlement = null;
    state.payment = null;
    state.upgrade_credit = null;
    state.upgrade_quotes = null;
    state.support = null;
    state.billing = null;
    state.upgrade_confirmation = null;
    rememberPendingCheckout({});
    state.accountSecurity = null; state.recoveryKey = null; state.recoveryMode = false; state.packetReturn = null; state.checkoutReturn = null;
    state.step = 0;
    state.notice = 'Signed out.';
  });
}

/* ------------------------------------------------------------------ step 1: jurisdiction */

function coverage(region) {
  return region ? `<p class="evidence">We check your report using your selected location: ${esc(region.label)}.
    Review your results and choose what you want to dispute.</p>` : '';
}

function uploadPreparation() {
  return `<p class="evidence">Use the PDF from your bureau if you have it. For photos, include the whole page and keep the text clear.</p>
    <details class="upload-help"><summary>File sizes and help</summary><ul class="plain">
    <li>Use PDF, PNG or JPEG. Convert HEIC photos to JPEG first.</li><li>Each file must be 10 MB or less. Select up to 8 files at a time.</li>
    <li>Keep pages in order. Split a large PDF into smaller files if needed.</li><li>Do not upload a file that needs a password.</li>
    </ul><div id="upload-limits-help">${uploadLimits?.plain ? esc(uploadLimits.plain) : 'The upload checks the file and page limits before it is saved.'}</div></details>`;
}

function savedReportLabel(row) {
  const bureau = row.bureau_label || row.bureau || (surface?.bureau_choices?.[row.country] || []).find(item => item.id === row.selected_bureau)?.label || 'Credit report';
  const files = row.original_filenames || (row.files || []).map(file => file.original_filename);
  const date = row.report_date || String(row.created_at || '').slice(0, 10);
  return [bureau, date, files.filter(Boolean).join(', '), regionLabel(row.country, row.region)].filter(Boolean).join(' · ');
}

function renderJurisdiction(panel) {
  if (!state.account) { panel.innerHTML = `${notices()}<h1>Sign in first</h1><p class="lede">Create an account or sign in on the first step.</p>`; return; }
  const countries = surface ? surface.countries : [];
  const regions = surface ? surface.regions : [];
  const selectedCountry = el('country') ? el('country').value : (state.view ? state.view.case.country : '');
  const selectedRegion = el('region') ? el('region').value : (state.view?.case.region || '');
  const bureauChoices = surface?.bureau_choices?.[selectedCountry] || [];
  const selectedBureau = el('bureau') ? el('bureau').value : (state.view?.case.selected_bureau || '');
  const options = regions.filter((r) => r.country === selectedCountry);
  panel.innerHTML = `
    <h1>Upload your credit report</h1>
    <p class="lede">Choose your current location, select your credit bureau and upload your report.</p>
    ${notices()}
    ${state.surfaceError ? `<p class="note stop">We could not load the available locations. ${esc(state.surfaceError)}</p>` : ''}
    ${recoveryKeyBlock()}
    <div class="row">
      <div>
        <label for="country">Country</label>
        <select id="country">
          <option value="">Select a country</option>
          ${countries.map((c) => `<option value="${esc(c.value)}" ${c.value === selectedCountry ? 'selected' : ''}>${esc(c.label)}</option>`).join('')}
        </select>
      </div>
      <div>
        <label for="region">Region</label>
        <select id="region">
          <option value="">Select a region</option>
          ${options.map((r) => `<option value="${esc(r.value)}" ${r.value === selectedRegion ? 'selected' : ''}>${esc(r.label)}</option>`).join('')}
        </select>
      </div>
    </div>
    <label for="bureau">Credit bureau</label><select id="bureau" ${bureauChoices.length ? '' : 'disabled'}><option value="">Choose a bureau</option>${bureauChoices.map(row => `<option value="${row.id}" ${row.id === selectedBureau ? 'selected' : ''}>${esc(row.label)}</option>`).join('')}</select>
    <p class="evidence">Choose the country and region where you live now. We use this selection to check your report,
    even if it shows a different or previous address.</p>
    <label for="file">Credit report (PDF, PNG or JPEG)</label>
    ${uploadPreparation()}
    <input id="file" type="file" multiple accept="application/pdf,image/png,image/jpeg,.pdf,.png,.jpg,.jpeg">
    <p class="evidence">You can select up to 8 files, with a maximum of 10 MB each. Keep report images in page order.</p>
    <button class="primary" id="open">Upload your report</button>
    <div id="upload-progress" role="status" aria-live="polite"></div>
    <button class="secondary" id="refresh">Continue a saved report</button>
    ${state.cases.length
      ? `<details open><summary>Your saved reports</summary><ul class="plain">${state.cases.map((c) => `<li>${esc(savedReportLabel(c))} <button class="secondary" data-open="${esc(c.case_id)}">Continue</button></li>`).join('')}</ul></details>`
      : ''}`;
  wireRecoveryKey();

  let selectionOperation = 0;
  let uploading = false;
  const uploadButton = el('open');
  const updateButton = () => {
    uploadButton.disabled = uploading || !el('country').value || !el('region').value || !el('bureau').value;
  };
  // Update dependent choices in place so choosing a location never clears the selected file.
  el('country').onchange = () => {
    selectionOperation++;
    const country = el('country').value;
    el('region').innerHTML = '<option value="">Select a region</option>' + regions.filter(row => row.country === country)
      .map(row => `<option value="${esc(row.value)}">${esc(row.label)}</option>`).join('');
    el('region').value = '';
    const choices = surface?.bureau_choices?.[country] || [];
    el('bureau').innerHTML = '<option value="">Choose a bureau</option>' + choices.map(row => `<option value="${esc(row.id)}">${esc(row.label)}</option>`).join('');
    el('bureau').value = ''; el('bureau').disabled = !choices.length;
    updateButton();
  };
  el('region').onchange = el('bureau').onchange = el('file').onchange = () => { selectionOperation++; updateButton(); };
  updateButton();
  const selectionContext = () => {
    const ensureAccount = accountContext(), sequence = renderSequence, operation = ++selectionOperation;
    const country = el('country').value, region = el('region').value, bureau = el('bureau').value;
    return () => { ensureAccount(); if (state.step !== STEP.JURISDICTION || sequence !== renderSequence || operation !== selectionOperation ||
      el('country').value !== country || el('region').value !== region || el('bureau').value !== bureau) throw cancelledAction(); };
  };
  uploadButton.onclick = () => run(async () => {
    const ensureSelection = selectionContext();
    const country = el('country').value, region = el('region').value, bureau = el('bureau').value;
    const files = Array.from(el('file').files);
    if (!country || !regions.some(row => row.country === country && row.value === region)) throw new Error('Choose the country and region where you live now.');
    if (!(surface?.bureau_choices?.[country] || []).some(row => row.id === bureau)) throw new Error('Choose the bureau that issued your report.');
    validateReportFiles(files);
    const sequence = renderSequence, ensureAccount = accountContext();
    uploading = true; updateButton();
    try {
      const data = await api('POST', '/api/cases', { country, region, bureau }); ensureSelection();
      const caseId = data.case.case_id;
      const items = files.map(file => ({ file, key: crypto.randomUUID(), status: 'pending' }));
      uploadBatches.set(caseId, items);
      const uploaded = await uploadReportBatch(items, caseId, ensureSelection); ensureSelection();
      const cases = await api('GET', '/api/cases'); ensureSelection();
      state.caseId = caseId; state.cases = cases.cases; state.view = uploaded.view; state.checkoutReturn = null;
      state.step = STEP.REPORT; state.notice = uploaded.notice;
      state.assessment_error = null; state.purchase_needed = null;
      if (items.every(item => item.status === 'saved')) await checkReport();
    } catch (err) {
      ensureSelection();
      throw err;
    } finally {
      try { ensureAccount(); if (sequence === renderSequence && state.step === STEP.JURISDICTION) { uploading = false; updateButton(); } } catch {}
    }
  });
  el('refresh').onclick = () => run(async () => {
    const ensureSelection = selectionContext();
    try { const data = await api('GET', '/api/cases'); ensureSelection(); state.cases = data.cases; }
    catch (err) { ensureSelection(); throw err; }
  });
  for (const button of panel.querySelectorAll('[data-open]')) {
    button.onclick = () => run(async () => {
      const ensureSelection = selectionContext(), caseId = button.dataset.open;
      let data;
      try { data = await api('GET', `/api/cases/${caseId}`); ensureSelection(); }
      catch (err) { ensureSelection(); throw err; }
      state.caseId = caseId;
      if (state.checkoutReturn?.caseId !== caseId) state.checkoutReturn = null;
      state.view = data.view;
      state.step = data.view.assessment_summary || data.view.result ? STEP.RESULTS : STEP.REPORT;
    });
  }
}

/* ------------------------------------------------------------------ step 2: your report */

/**
 * The post-upload status of the case, taken from the case's own state: the file is stored, and the assessment
 * either has a result, is running, was refused, or is waiting on a purchase. Exactly one next action is offered,
 * and the screen never asks for an upload the case already has.
 */
function reportStatus(view) {
  const summary = view.assessment_summary || null;
  const complete = Boolean(view.assessment_access && view.assessment_access.complete_assessment);
  const head = '<strong>Your report is uploaded</strong>';
  if (summary) {
    /* A recorded assessment is finished. A free account sees the counts and one teaser on the results step; the
       complete findings need a one-time unlock of this report or a subscription. The pre-check wording ("ready to
       review") is never used once a result exists, and no payment-before-assessment wording is used anywhere. */
    const total = Number(summary.distinct_total || 0);
    const noIssue = 'We did not find a reporting issue in the information we could review.';
    const line = complete
      ? (total > 0 ? 'Review the issues we found and choose any you want to dispute.' : noIssue)
      : (total > 0
        ? `We found ${total} reporting issue${total === 1 ? '' : 's'} in the information we could review. See your summary before you buy.`
        : noIssue);
    return `<div class="note"><strong>Your results are ready</strong><br>${line}</div>
      <button class="primary" id="view-results">View my results</button>`;
  }
  if (state.assessing && assessmentCaseId === view.case.case_id) {
    return `<div class="note">${head}<br>We are checking your report.</div>
      <button class="secondary" id="refresh-report">Refresh results</button>`;
  }
  if (state.assessment_error) {
    return `<div class="note stop">${head}<br>Your report is ready to review.<br><span class="err">We could not check your report:</span> ${esc(state.assessment_error)}</div>
      <button class="primary" id="check-report">Try again to check my report</button>`;
  }
  return `<div class="note">${head}<br>Your report is ready to review.</div>
    <button class="primary" id="check-report">Check my report</button>`;
}

function validateReportFiles(files) {
  if (!files.length) throw new Error('Choose your credit report first.');
  if (files.length > (uploadLimits?.max_case_files || 8)) throw new Error('Choose up to 8 files. Combine extra report images into a PDF.');
  for (const file of files) {
    if (!file.size || file.size > (uploadLimits?.max_file_bytes || 10485760)) throw new Error('Each file must be nonempty and no larger than 10 MB. Export a smaller readable copy or split it at page boundaries.');
    if (!/\.(pdf|png|jpe?g)$/i.test(file.name)) throw new Error('Convert your report to PDF, PNG or JPEG first.');
  }
}

/** Shared ordered upload/retry. File bytes and responses stay bound to the initiating account and screen. */
async function uploadReportBatch(items, caseId, ensureContext) {
  ensureContext();
  if (el('upload')) el('upload').disabled = true;
  if (el('retry-upload')) el('retry-upload').disabled = true;
  for (const item of items.filter(row => row.status === 'pending')) {
    try {
      validateReportFiles([item.file]);
      const contentBase64 = await readFileBase64(item.file); ensureContext();
      const data = await api('POST', '/api/cases/' + caseId + '/files', {
        originalFilename: item.file.name, declaredBytes: item.file.size, mimeType: item.file.type,
        contentBase64, uploadKey: item.key
      }); ensureContext();
      item.status = 'saved';
      item.message = data.receipt.format_detection.supported ? 'Uploaded' : 'Uploaded; ' + refusalMessage(data.receipt.format_detection.refusal_reason);
    } catch (err) {
      ensureContext();
      if (err.cancelled) throw err;
      item.message = 'Pending: ' + err.message;
    }
    ensureContext();
    const progress = el('upload-progress');
    if (progress) progress.textContent = items.map(row => row.file.name + ': ' + (row.message || row.status)).join('\n');
  }
  const data = await api('GET', '/api/cases/' + caseId); ensureContext();
  const saved = items.filter(row => row.status === 'saved').length, pending = items.filter(row => row.status === 'pending').length;
  return { view: data.view, notice: pending
    ? `${saved} uploaded; ${pending} still pending. Retry the pending files to include them in your review. Files already uploaded will not be repeated.`
    : `${saved} file${saved === 1 ? '' : 's'} uploaded.` };
}

/** Run the existing free assessment for the captured owned case. */
async function checkReport() {
  const caseId = state.caseId;
  if (state.assessing && assessmentCaseId === caseId) return;
  const ensureAccount = accountContext(), operation = ++assessmentOperationSequence;
  assessmentCaseId = caseId;
  state.error = null;
  state.notice = null;
  state.assessment_error = null;
  state.purchase_needed = null;
  state.assessing = true;
  render();
  const sequence = renderSequence, step = state.step;
  const ensureContext = () => { ensureAccount(); if (state.caseId !== caseId || state.step !== step ||
    sequence !== renderSequence || operation !== assessmentOperationSequence) throw cancelledAction(); };
  let cancelled = false;
  try {
    await api('POST', `/api/cases/${caseId}/evaluate`, {}); ensureContext();
    const data = await api('GET', `/api/cases/${caseId}`); ensureContext();
    state.view = data.view;
    state.step = STEP.RESULTS;
    state.notice = 'Your results are ready. Choose what you want to dispute.';
  } catch (err) {
    try { ensureContext(); } catch (stale) { cancelled = true; throw stale; }
    if (err.cancelled) { cancelled = true; throw err; }
    if (err && err.status === 402) {
      state.purchase_needed = 'Checking a report needs a recorded purchase. Choose a plan, then check your report.';
    } else {
      state.assessment_error = err && err.message ? err.message : 'The check could not be completed. Try again.';
    }
  } finally {
    if (operation === assessmentOperationSequence) state.assessing = false;
    if (!cancelled) render();
  }
}

function renderReport(panel) {
  if (!state.view) {
    panel.innerHTML = `${notices()}<h1>Upload your credit report</h1><p class="lede">Start with your current location and credit bureau.</p><button class="primary" id="upload-start">Upload your report</button>`;
    el('upload-start').onclick = () => { state.step = STEP.JURISDICTION; render(); };
    return;
  }
  const view = state.view;
  const files = view.files || [];
  const regionRow = surface ? surface.regions.find((r) => r.value === view.case.region) : null;
  const batch = uploadBatches.get(state.caseId) || [];
  const uploaded = files.length > 0;
  const where = esc(regionLabel(view.case.country, view.case.region));
  panel.innerHTML = `
    <h1>Your report</h1>
    ${notices()}
    ${uploaded
      ? reportStatus(view)
      : `<p class="lede">Case for ${where}. The file you upload is stored privately and securely for this case.</p>
         ${coverage(regionRow)}`}
    ${access()}
    ${uploaded ? `<h2>Reviewing your report for ${where}</h2>` : ''}
    <label for="file">${uploaded ? 'Choose another file for this case, or a replacement for one already here' : 'Choose a PDF report or report images in page order'}</label>
    <input id="file" type="file" multiple accept="application/pdf,image/png,image/jpeg,.pdf,.png,.jpg,.jpeg">
    <button class="primary" id="upload">Upload selected files</button>
    <button class="secondary" id="retry-upload" ${batch.some(x => x.status === 'pending') ? '' : 'disabled'}>Retry pending files</button>
    <details><summary>File limits and help</summary><div class="note">PDF, PNG and JPEG: 10 MB per file, 8 files per report, 40 MB stored per account.
    Images are limited to 25 million pixels and 12,000 pixels per side. Scanned PDFs are read up to 40 pages per file; split longer scans into complete page ranges of at most 40 pages within the 8-file limit. HEIC/HEIF, TIFF and ZIP are not supported; export images as PNG/JPEG or combine them into a PDF.
    For an oversized report, export a smaller readable PDF or split at page boundaries into parts under 10 MB, keeping every page in order and the report header and date with each part.
    For more than 8 screenshots, combine pages into a PDF. Delete an unneeded case to free account storage.
    Keep the report header, date and every page.</div></details>
    <div id="upload-progress" role="status" aria-live="polite">${batch.map(x => esc(x.file.name) + ': ' + esc(x.message || x.status)).join('<br>')}</div>
    <h2>Files on this case</h2>
    ${files.length ? files.map(fileCard).join('') : '<p class="lede">No file has been uploaded for this case yet.</p>'}`;

  const caseId = state.caseId, ensureAccount = accountContext(), sequence = renderSequence;
  const ensureReport = () => { ensureAccount(); if (state.caseId !== caseId || state.step !== STEP.REPORT || sequence !== renderSequence) throw cancelledAction(); };
  const uploadBatch = async items => {
    const uploaded = await uploadReportBatch(items, caseId, ensureReport); ensureReport();
    state.view = uploaded.view; state.notice = uploaded.notice;
  };
  el('upload').onclick = () => {
    const selected = Array.from(el('file').files);
    return run(async () => {
      ensureReport();
      validateReportFiles(selected);
      if (batch.some(x => x.status === 'pending')) throw new Error('Retry pending files first, or remove them from the pending list before selecting replacements.');
      const items = selected.map(file => ({file, key: crypto.randomUUID(), status: 'pending'}));
      uploadBatches.set(caseId, items);
      await uploadBatch(items);
    });
  };
  el('retry-upload').onclick = () => run(() => uploadBatch(batch));
  if (batch.some(x => x.status === 'pending')) {
    const clear = document.createElement('button'); clear.textContent = 'Clear pending list to select converted copies';
    clear.onclick = () => { uploadBatches.set(state.caseId, batch.filter(x => x.status === 'saved')); render(); };
    el('upload-progress').after(clear);
  }
  if (!uploadLimits) api('GET', '/api/formats').then(data => { uploadLimits = data.upload_limits; }).catch(() => {});

  /* The one next action the status offers, wired to the case's own state. */
  const viewResults = el('view-results');
  const refreshReport = el('refresh-report');
  const refreshResults = () => run(async () => {
    try {
      const data = await api('GET', `/api/cases/${caseId}`); ensureReport();
      state.view = data.view;
      state.step = data.view.assessment_summary || data.view.result ? STEP.RESULTS : STEP.REPORT;
    } catch (err) { ensureReport(); throw err; }
  });
  if (viewResults) viewResults.onclick = refreshResults;
  if (refreshReport) refreshReport.onclick = refreshResults;
  const check = el('check-report');
  if (check) check.onclick = () => run(() => checkReport());
  const choosePlan = el('choose-plan');
  if (choosePlan) choosePlan.onclick = () => run(async () => { state.step = STEP.BILLING; });
}

function refusalMessage(reason) {
  if (reason === 'UNRELATED_DOCUMENT') return 'This document or image set does not seem to be a credit report. Please upload an actual credit report issued by your credit bureau.';
  if (reason === 'UNREADABLE_DOCUMENT') return 'We could not read your report clearly enough to work with it. Please upload a clearer or complete copy of the same report.';
  /* A reading outcome, never a refusal of the upload: the file is stored on the case either way, and an internal
     reason token is never shown to the consumer. */
  return 'This file is stored, but we could not read it, so no facts were taken from it. Upload a clearer or complete copy of the same report.';
}

function fileCard(file) {
  const extraction = file.extraction || {};
  const readable = extraction.admitted === true;
  const detection = file.demonstration
    ? ''
    : (readable
      ? (file.supported_format
        ? `<p class="evidence">Recognised as <b>${esc(file.recognised_as || 'a bureau credit report')}</b> and stored for this case.</p>`
        : '<p class="evidence">Accepted and stored for this case. We read it in the general way and use the facts we could read from it.</p>')
      : `<p class="evidence">${esc(refusalMessage(extraction.refusal_reason || file.refusal_reason))}</p>`);
  return `<div class="obs">
    <span class="pill ${file.demonstration ? 'demo' : ''}">${file.demonstration ? 'DEMONSTRATION INPUT — NOT A REPORT' : 'STORED PRIVATELY'}</span>
    <h3>${esc(file.original_filename)}</h3>
    <p class="evidence">File size: ${esc((Number(file.stored_bytes || 0) / 1024 / 1024).toFixed(2))} MB.</p>
    ${file.demonstration ? '' : detection}
  </div>`;
}

/* ------------------------------------------------------------------ step 3: results */

async function wireResultSelector(panel, view) {
  const select = el('result-select');
  if (!select) return;
  try {
    const data = await api('GET', '/api/cases/' + state.caseId + '/results');
    state.result_list = data.results || [];
    select.innerHTML = '<option value="">Latest result</option>' +
      state.result_list.map((r) => '<option value="' + esc(r.result_id) + '">Checked on ' + esc((r.created_at || '').slice(0, 19).replace('T', ' ')) + '</option>').join('');
    select.value = state.result_list.some((r) => r.result_id === view.result_id) ? view.result_id : '';
  } catch {
    select.innerHTML = '<option value="">Latest result</option>';
  }
  select.onchange = () => run(async () => {
    const rid = select.value;
    if (!rid) {
      state.view = (await api('GET', '/api/cases/' + state.caseId)).view;
    } else {
      const d = await api('GET', '/api/cases/' + state.caseId + '/results/' + rid + '/view');
      state.view = d.view;
    }
    state.step = 3;
    state.notice = 'Showing the selected result; its report facts and clarification answers are unchanged.';
  });
}


/** The price strings the purchase choices show, taken from the recorded catalogue (never invented). */
function planPrice(code) {
  const catalog = (state.billing && state.billing.plan_catalog) || state.publicPricing || null;
  const plan = catalog && (catalog.plans || []).find((p) => p.plan_code === code);
  if (!plan) return '';
  const suffix = plan.interval === 'month' ? ' per month' : (plan.interval === 'year' ? ' per year' : '');
  return `${plan.amount_display}${suffix}`;
}

function money(cents, currency = 'cad') {
  return Number.isSafeInteger(cents) && cents >= 0
    ? `$${(cents / 100).toFixed(2)} ${String(currency).toUpperCase()}` : '';
}
function upgradeQuote(code) {
  const quotes = state.billing?.upgrade_quotes || state.upgrade_quotes;
  const quote = quotes && quotes[code];
  return quote && ['regular_cents', 'first_invoice_cents', 'credit_cents', 'renewal_cents'].every(key => Number.isSafeInteger(quote[key]) && quote[key] >= 0)
    ? quote : null;
}
function canChoosePlan(code) {
  const quote = upgradeQuote(code);
  if (quote) return quote.allowed !== false && !quote.is_current;
  const ent = state.entitlement || {};
  const rank = { report_once: 0, monthly: 1, annual: 2 };
  return !(ent.entitled && ent.access_via === 'SUBSCRIPTION' && rank[code] <= rank[ent.plan_code]);
}
function purchasePrice(code) {
  const quote = upgradeQuote(code);
  return quote && quote.allowed !== false && !quote.is_current
    ? `${money(quote.first_invoice_cents, quote.currency)} today` : planPrice(code);
}
function priceDetails(code) {
  const quote = upgradeQuote(code);
  const interval = code === 'annual' ? 'year' : 'month';
  if (!quote) {
    return `<p class="evidence">${code === 'report_once' ? 'One-time purchase. No renewal.' : `${esc(planPrice(code))}. Renews until you cancel.`}${state.upgrade_credit?.eligible && code !== 'report_once' ? ' Checkout will confirm your upgrade credit and final price.' : ''}</p>`;
  }
  const credit = quote.credit_cents > 0 && quote.allowed !== false && !quote.is_current
    ? `<div class="credit-equation" aria-label="Upgrade price"><span><small>Plan price</small><b>${esc(money(quote.regular_cents, quote.currency))}</b></span><span class="equation-sign" aria-hidden="true">−</span><span><small>Your credit</small><b>${esc(money(quote.credit_cents, quote.currency))}</b></span><span class="equation-sign" aria-hidden="true">=</span><span class="equation-total"><small>Pay today</small><b>${esc(money(quote.first_invoice_cents, quote.currency))}</b></span></div>` : '';
  const remaining = credit && quote.remaining_credit_cents > 0
    ? `<p class="evidence">${esc(money(quote.remaining_credit_cents, quote.currency))} remains for a later upgrade.</p>` : '';
  return `${credit}${remaining}<p class="evidence">${code === 'report_once' ? 'One-time purchase. No renewal.' : `Then ${esc(money(quote.renewal_cents, quote.currency))} per ${interval}. Renews until you cancel.`}</p>`;
}
function subscriptionBenefits(title = 'More help with every report') {
  const icons = [
    '<path d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7"/>',
    '<path d="M20 8a8 8 0 0 0-14-3L3 8m0-5v5h5M4 16a8 8 0 0 0 14 3l3-3m0 5v-5h-5"/>',
    '<path d="M3 7h7l2-3h9v16H3zM7 11h10M7 15h7"/>'
  ];
  const features = [
    ['Print and mail your disputes', 'Choose the issues. Review and approve your packet. Print it and send it to your bureau.'],
    ['Compare your next report', 'See which issues remain, change or no longer appear when you upload a newer report.'],
    ['Keep your reports together', 'Find your saved reports and results in your account while your subscription is active.']
  ];
  return `<section class="subscription-benefits" aria-label="Subscription benefits"><span class="pill">SUBSCRIPTION BENEFITS</span><h2>${esc(title)}</h2><div class="benefit-grid">${features.map(([heading, detail], index) => `<div class="benefit-card"><svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${icons[index]}</svg><h3>${heading}</h3><p>${detail}</p></div>`).join('')}</div></section>`;
}
function subscriptionChoices(prefix = 'buy') {
  return ['monthly', 'annual'].filter(canChoosePlan).map(code => `<div class="subscription-choice"><button class="secondary" id="${prefix}-${code}">${code === 'annual' ? 'Yearly' : 'Monthly'} — ${esc(purchasePrice(code))}</button>${priceDetails(code)}</div>`).join('');
}

function rememberPendingCheckout(data) {
  const pending = data?.pending_checkout;
  const valid = pending && typeof pending.checkout_id === 'string' && pending.checkout_id.length > 0
    && ['report_once', 'monthly', 'annual'].includes(pending.plan_code)
    && (!pending.state || ['OPEN', 'OPENING'].includes(pending.state));
  state.pending_checkout = valid ? pending : null;
  state.pending_checkout_account_id = valid ? state.account?.account_id || null : null;
}
function ownedPendingCheckout() {
  return state.account?.account_id && state.pending_checkout_account_id === state.account.account_id
    ? state.pending_checkout : null;
}
function currentReportPaymentPending() {
  const pending = ownedPendingCheckout();
  return !!state.caseId && (pending?.plan_code === 'report_once' && pending.case_id === state.caseId
    || state.checkoutReturn?.status === 'pending' && state.checkoutReturn.caseId === state.caseId);
}
function pendingPaymentBlock(forReport = false) {
  const pending = ownedPendingCheckout();
  if (!pending) return '';
  if (forReport) {
    const context = state.checkoutReturn;
    if (pending.plan_code === 'report_once') {
      if (!state.caseId || pending.case_id !== state.caseId) return '';
    } else if (context?.status !== 'pending' || context.caseId !== state.caseId || context.planCode !== pending.plan_code) return '';
  }
  const pricing = Number.isSafeInteger(pending.payable_cents) && pending.payable_cents >= 0
    ? `<p class="evidence">Payment amount: <b>${esc(money(pending.payable_cents, pending.currency))}</b>${pending.credit_cents > 0 ? ` after ${esc(money(pending.credit_cents, pending.currency))} credit` : ''}.${pending.plan_code !== 'report_once' && Number.isSafeInteger(pending.renewal_cents) ? ` Then ${esc(money(pending.renewal_cents, pending.currency))} per ${pending.plan_code === 'annual' ? 'year' : 'month'}.` : ''}</p>` : '';
  return `<section class="note" aria-label="Your open payment"><h3>${pending.is_subscription_upgrade ? 'Your yearly upgrade is waiting for payment' : 'Finish your payment'}</h3><p>Your payment has not been confirmed yet. Continue the payment you already started.</p>${pricing}<button class="primary" id="continue-payment">Continue payment</button></section>`;
}
function redirectToPayment(redirect, expectedReturn = null, resuming = false) {
  if (/^https:\/\/(?:checkout|invoice)\.stripe\.com\//.test(redirect || '')) return location.assign(redirect);
  if (expectedReturn && redirect === expectedReturn) return location.assign(redirect);
  const base = typeof location !== 'undefined' && location.origin ? location.origin + '/' : 'http://127.0.0.1/';
  if (resuming && (redirect === base || String(redirect || '').startsWith(base + '?checkout=return&'))) return location.assign(redirect);
}
function resumePendingCheckout(expectedCheckoutId, ensureOwner) {
  return run(async () => {
    if (ensureOwner) ensureOwner();
    const ensureAccount = accountContext(), pending = ownedPendingCheckout();
    if (!pending) throw new Error('Your open payment is unavailable. Refresh your plans and try again.');
    if (expectedCheckoutId && pending.checkout_id !== expectedCheckoutId) throw cancelledAction();
    let opened;
    try {
      opened = await api('POST', '/api/billing/checkout', { plan_code: pending.plan_code, resume_checkout_id: pending.checkout_id });
      ensureAccount();
    } catch (error) {
      ensureAccount();
      if (error.code === 'PAYMENT_CONFIRMATION_PENDING') {
        state.step = STEP.BILLING;
        await refreshAccess();
        ensureAccount();
      }
      throw error;
    }
    await refreshAccess(); ensureAccount();
    state.notice = 'Continuing the payment you already started. We will check it when you return.';
    redirectToPayment(opened.checkout?.redirect_url, null, true);
  });
}
function wirePendingPayment() {
  const button = el('continue-payment'), pending = ownedPendingCheckout();
  const ensureOwner = accountContext();
  if (button && pending) button.onclick = () => resumePendingCheckout(pending.checkout_id, ensureOwner);
}

/** The return URL remembers a report, never payment or access. The protected view supplies both. */
function checkoutReturnContext() {
  if (typeof location === 'undefined' || !location.search) return null;
  const params = new URLSearchParams(location.search.replace(/^\?/, '').split('?')[0]);
  const caseId = params.get('report'), planCode = params.get('plan');
  return params.get('checkout') === 'return' && /^case_[a-f0-9]{24}$/.test(caseId || '') && ['report_once', 'monthly', 'annual'].includes(planCode)
    ? { caseId, planCode, cancelled: params.get('checkout_cancelled') === '1' } : null;
}
async function restoreCheckoutReport(context) {
  const ensureAccount = accountContext(), sequence = ++checkoutReturnSequence, rendered = renderSequence, step = state.step;
  const returning = { ...context, status: 'loading' };
  state.checkoutReturn = returning;
  const ensureCurrent = () => { ensureAccount(); if (sequence !== checkoutReturnSequence || rendered !== renderSequence || step !== state.step || state.checkoutReturn !== returning) throw cancelledAction(); };
  try {
    const [data, access] = await Promise.all([api('GET', '/api/cases/' + encodeURIComponent(context.caseId)), api('GET', '/api/entitlement')]);
    ensureCurrent();
    if (!data.view || data.view.case?.case_id !== context.caseId) throw new Error('Report unavailable');
    state.caseId = context.caseId; state.view = data.view;
    state.entitlement = access.entitlement || null; state.payment = access.payment || null; state.upgrade_credit = access.upgrade_credit || null;
    state.upgrade_quotes = access.upgrade_quotes || null;
    rememberPendingCheckout(access);
    state.billing = null;
    state.step = data.view.assessment_summary || data.view.result ? STEP.RESULTS : STEP.REPORT;
    const confirmed = context.planCode === 'report_once' ? data.view.assessment_access?.complete_assessment
      : data.view.assessment_access?.dispute_packet && (context.planCode !== 'annual'
        || access.entitlement?.entitled && access.entitlement.plan_code === 'annual');
    state.checkoutReturn = confirmed || context.cancelled ? null : { ...context, status: 'pending' };
    state.notice = confirmed ? (context.planCode === 'report_once' ? 'Your full assessment is ready.' : 'Your report is ready. Choose what you want to dispute.')
      : context.cancelled ? 'Checkout cancelled. You can choose a plan when you are ready.' : null;
    state.error = null;
  } catch (error) {
    ensureCurrent();
    state.checkoutReturn = { ...context, status: 'failed' };
    state.caseId = null; state.view = null; state.step = STEP.JURISDICTION;
    state.notice = null;
  }
}
function wireCheckoutReturn() {
  const retry = el('checkout-return-retry'), context = state.checkoutReturn;
  if (!retry || !context || !state.account) return;
  const ensureAccount = accountContext(), rendered = renderSequence;
  retry.onclick = () => run(async () => {
    ensureAccount(); if (rendered !== renderSequence || context !== state.checkoutReturn) throw cancelledAction();
    await restoreCheckoutReport(context);
  });
}

/** Start a purchase for one plan. The one-time unlock is bound to this case on the server, which validates it. */
function startCheckout(planCode, confirmedUpgrade = false) {
  return run(async () => {
    const ensureAccount = accountContext();
    if (state.checkoutReturn?.status === 'pending' && state.checkoutReturn.caseId === state.caseId) throw new Error('Select Check payment before starting another checkout.');
    const pending = ownedPendingCheckout();
    if (pending && (planCode !== 'report_once' || pending.plan_code === 'report_once' && pending.case_id === state.caseId)) throw new Error('Continue your open payment or check its status before starting another checkout.');
    if (!canChoosePlan(planCode)) throw new Error('This plan is already included in your subscription. Choose a higher plan to upgrade.');
    if (state.entitlement?.entitled && state.entitlement.access_via === 'SUBSCRIPTION') {
      const quote = upgradeQuote(planCode);
      if (!quote || typeof quote.revision !== 'string' || !quote.revision) throw new Error('Your upgrade price is unavailable. Refresh your plans and try again.');
      if (!confirmedUpgrade) {
        state.upgrade_confirmation = { account_id: state.account.account_id, plan_code: planCode, quote: { ...quote } };
        state.step = STEP.BILLING;
        return;
      }
      const review = state.upgrade_confirmation;
      if (!review || review.account_id !== state.account?.account_id || review.plan_code !== planCode || !sameUpgradePrice(review.quote, quote)) {
        state.upgrade_confirmation = null;
        throw new Error('Your upgrade price changed. Review the updated price before confirming.');
      }
    }
    const base = typeof location !== 'undefined' && location.origin ? location.origin + '/' : 'http://127.0.0.1/';
    const context = state.caseId && state.view?.case?.case_id === state.caseId
      ? `?checkout=return&report=${encodeURIComponent(state.caseId)}&plan=${encodeURIComponent(planCode)}` : '';
    const body = { plan_code: planCode, return_url: base + context };
    if (planCode === 'report_once' && state.caseId) body.case_id = state.caseId;
    if (confirmedUpgrade && state.entitlement?.access_via === 'SUBSCRIPTION') body.quote_revision = upgradeQuote(planCode).revision;
    let opened;
    try {
      opened = await api('POST', '/api/billing/checkout', body);
      ensureAccount();
    } catch (err) {
      ensureAccount();
      if (err && ['STALE_UPGRADE_QUOTE', 'PAYMENT_CONFIRMATION_PENDING'].includes(err.code)) {
        state.upgrade_confirmation = null;
        if (err.code === 'PAYMENT_CONFIRMATION_PENDING') state.step = STEP.BILLING;
        await refreshAccess();
        ensureAccount();
      }
      /* The server refuses a one-time unlock with no eligible report, and refreshes the screen when the report is
         already unlocked, so the consumer sees their results instead of another purchase. */
      if (err && err.code === 'REPORT_ALREADY_UNLOCKED' && state.caseId) {
        state.view = (await api('GET', '/api/cases/' + state.caseId)).view;
        state.step = STEP.RESULTS;
      }
      throw err;
    }
    state.notice = opened.checkout?.is_subscription_upgrade || opened.checkout?.mode === 'EXISTING_SUBSCRIPTION_UPGRADE'
      ? 'Your yearly upgrade was requested. We will confirm your payment before changing your access.'
      : 'Checkout opened. We will check your payment when you return.';
    state.upgrade_confirmation = null;
    await refreshAccess(); ensureAccount();
    const redirect = opened.checkout?.redirect_url || '';
    redirectToPayment(redirect, body.return_url);
  });
}

function sameUpgradePrice(left, right) {
  return !!left && !!right && ['credit_cents', 'regular_cents', 'first_invoice_cents', 'renewal_cents', 'currency', 'allowed', 'is_current', 'revision'].every(key => left[key] === right[key]);
}

function upgradeConfirmationBlock() {
  const review = state.upgrade_confirmation;
  if (!review || review.account_id !== state.account?.account_id) return '';
  const quote = upgradeQuote(review.plan_code);
  if (!canChoosePlan(review.plan_code) || !sameUpgradePrice(review.quote, quote)) {
    state.upgrade_confirmation = null;
    return '<div class="note" role="status">Your upgrade price changed. Review the updated price before confirming.</div>';
  }
  return `<section class="upgrade-confirmation" aria-label="Review yearly upgrade"><h3>Review your yearly upgrade</h3>${priceDetails(review.plan_code)}<p><b>Pay today: ${esc(money(quote.first_invoice_cents, quote.currency))}</b></p><p>When you confirm, we change your plan and charge the amount shown to your saved payment method.</p><p>Your yearly plan renews at ${esc(money(quote.renewal_cents, quote.currency))} each year until you cancel.</p><button class="primary" id="confirm-upgrade-${esc(review.plan_code)}">Confirm yearly upgrade</button><button class="secondary" id="cancel-upgrade">Keep my current plan</button></section>`;
}

/**
 * The free view of a completed assessment: how many distinct issues were found, how they split across the three
 * categories, and ONE limited teaser. The complete details, the evidence and the download follow a purchase.
 */
function freeSummaryBlock(view) {
  const summary = view.assessment_summary || {};
  const teaser = summary.teaser?.confidence_label === 'VIOLATION' ? summary.teaser : null;
  const total = Number(summary.distinct_total || 0);
  const counts = total > 0
    ? `<p class="evidence">Reporting issues found: <b>${total}</b></p>`
    : '<p class="evidence">We did not find a reporting issue in the information we could review.</p>';
  const preview = teaser
    ? `<div class="obs">
      ${teaser.confidence_label === 'VIOLATION' ? '<span class="pill">VIOLATION</span>' : ''}
      <h3>${esc(teaser.title || '')}</h3>
      <p>${esc(teaser.explanation || '')}</p>
      <p class="evidence">This is the most serious violation we found that you can dispute.</p>
      <p class="evidence">Unlock this report or choose a subscription to see all the issues we found and what you can do next.</p>
    </div>`
    : '';
  return `<div class="obs">
    <span class="pill">SUMMARY — FREE</span>
    <h3>What we found</h3>
    ${assessmentDateLine(summary)}
    ${counts}
    ${summary.information_total ? '<p class="evidence">Your assessment also includes information about court time limits. This is separate from reporting issues and is not a dispute reason.</p>' : ''}
    ${preview}
  </div>
  ${currentReportPaymentPending() ? '' : `<div class="obs">
    <span class="pill">UNLOCK THE REST</span>
    <h3>Choose what you want next</h3>
    <p class="evidence">Nothing renews unless you choose a subscription. Prices are in CAD and shown before you buy.</p>
    ${canChoosePlan('report_once') ? `<button class="primary" id="buy-report_once">Unlock this report — ${esc(purchasePrice('report_once'))}</button>` : ''}
    ${subscriptionChoices()}
    <p class="evidence">Unlocking this report gives you every reporting issue found, the report facts and explanations behind them, the next steps that apply, and a PDF report to keep. Dispute packets, report history and comparison are part of a subscription.</p>
  </div>${subscriptionBenefits('Ready to take the next step?')}`}`;
}

/** A one-time unlocked report: the complete findings, the download, and the subscriber note. */
function oneTimeNextStepsBlock() {
  return `<div class="obs">
    <span class="pill">UNLOCKED REPORT</span>
    <h3>Next steps for this report</h3>
    <p class="evidence">Keep your full report as a PDF. It includes the issues we found, the report facts and clear next steps.</p>
    <button class="primary" id="download-assessment">Download my report (PDF)</button>
  </div>${subscriptionBenefits('Turn your results into a dispute packet')}
  ${currentReportPaymentPending() ? '' : `<div class="upgrade-offer"><h3>Your earlier payments count</h3><p>Every unused payment for a lower plan goes toward your upgrade. Your credit is applied at checkout.</p>${state.upgrade_credit?.eligible ? `<p class="upgrade-credit-total">Your available credit: <b>${esc(money(state.upgrade_credit.credit_cents, state.upgrade_credit.currency))}</b></p>` : ''}<div class="subscription-choices">${subscriptionChoices()}</div><button class="text-button" id="go-subscribe">See all plans</button></div>`}`;
}

function renderResults(panel) {
  if (!state.view) { panel.innerHTML = `${notices()}<h1>Upload your report first</h1>`; return; }
  const view = state.view;
  const access = view.assessment_access || {};
  const result = view.result;
  const summary = view.assessment_summary || null;
  const demo = result && result.support === 'DEMONSTRATION_ONLY_NOT_REPORT_SUPPORT';
  panel.innerHTML = `
    <h1>Results</h1>
    ${access.complete_assessment && result ? '<label for="result-select">Result</label><select id="result-select"><option value="">Latest result</option></select>' : ''}
    <p class="lede">Your report for ${esc(regionLabel(view.case.country, view.case.region))}.</p>
    ${notices()}
    ${pendingPaymentBlock(true)}
    <button class="${summary ? 'secondary' : 'primary'}" id="evaluate">${summary ? 'Check this report again' : 'Check my report'}</button>
    ${summary
      ? (access.complete_assessment && result ? resultBlock(result, demo) : freeSummaryBlock(view))
      : '<div class="note">Your report has not been checked yet. Select Check my report.</div>'}
    ${summary && access.complete_assessment && result && !demo
      ? (access.dispute_packet ? `${clarificationBlock(view)}${(result.issues || []).some(issue => issue.eligible) ? '<button class="primary" id="create-packet">Create my dispute packet</button>' : ''}<button class="secondary" id="download-assessment">Download my report (PDF)</button>${subscriptionBenefits('Included with your subscription')}` : oneTimeNextStepsBlock())
      : ''}`;

  el('evaluate').onclick = () => checkReport();
  for (const code of ['report_once', 'monthly', 'annual']) {
    const button = el('buy-' + code);
    if (button) button.onclick = () => startCheckout(code);
  }
  const download = el('download-assessment');
  if (download) download.onclick = () => window.location.assign(`/api/cases/${state.caseId}/report-download`);
  const subscribe = el('go-subscribe');
  if (subscribe) subscribe.onclick = () => run(async () => { state.step = STEP.BILLING; });
  const packet = el('create-packet');
  if (packet) packet.onclick = () => navigateStep(STEP.CHOOSE);

  wireResultSelector(panel, view);
  wireClarification(panel, view);
  wirePendingPayment();
}

function resultBlock(result, demo) {
  if (!demo) {
    const checklist = (result.common_error_checklist || []).map((item) =>
      `<li>${esc(item.label)}${item.description ? `<p>${esc(item.description)}</p>` : ''}</li>`).join('');
    return `${assessmentDateLine(result)}${checklist ? `<section class="obs"><h2>Common-error checklist</h2><p>We check for common reporting errors using the rules for where you live. When your report breaks a rule we check, we label the issue VIOLATION.</p><ol>${checklist}</ol></section>` : ''}${issuesSection(result)}`;
  }
  const observations = result.observations.filter(o => o.assessment_completed !== false).map((o) => `
    <div class="obs">
      <span class="pill ${demo ? 'demo' : o.is_a_finding ? 'finding' : ''}">${demo ? 'DEMONSTRATION — NOT REPORT SUPPORT' : (o.is_a_finding ? esc(o.consumer_label || 'FINDING') : 'REPORT OBSERVATION')}</span>
      <h3>${esc(o.headline)}</h3>
      ${o.detail ? `<p>${esc(o.detail)}</p>` : ''}
      <p class="evidence">Check: <b>${esc(o.check_name || 'not named')}</b>
        ${o.measures_from ? `· measured from <b>${esc(o.measures_from)}</b>` : ''}
        · output level: <b>${esc(o.output_level || 'none')}</b></p>
      ${o.is_a_finding && o.rule_source_version ? `<p class="evidence">Rule version: <b>${esc(o.rule_source_version)}</b></p>` : ''}
      ${o.is_a_finding && o.rule_source && o.rule_source.location ? `<p class="evidence">Source fact: printed <b>${esc(o.rule_source.raw_value)}</b> (page ${esc(o.rule_source.location.page)}${o.rule_source.location.line != null ? `, line ${esc(o.rule_source.location.line)}` : ''})${o.rule_source.normalization && o.rule_source.normalization.to ? ` → normalized <b>${esc(o.rule_source.normalization.to)}</b>` : ''}</p>` : ''}
      ${(o.decisive_facts_unavailable || []).map((d) => `<p class="evidence">Decisive fact unavailable: <b>${esc(d.identity)}</b> — ${esc(d.evidence)}</p>`).join('')}
      ${o.evidence ? `<p class="evidence">Your report, ${esc(o.evidence.section)} section, page <b>${esc(o.evidence.page)}</b>,
        line <b>${esc(o.evidence.line)}</b>, field <b>${esc(o.evidence.field)}</b>, account <b>${esc(o.evidence.account_number_in_report)}</b>,
        printed value <b>${esc(o.evidence.printed_value)}</b>.</p>` : ''}
      <p class="evidence">${esc(o.qualification)}</p>
    </div>`).join('');

  /* What the report prints, set against itself. Its own group and its own label: a report-against-report
     comparison is never shown as a rule check, and never as a finding. */
  const factual = (result.report_consistency_checks || []).map((c) => `
    <div class="obs">
      <span class="pill">${c.check_class === 'PRINTED_POLICY_OBSERVATION' ? 'WHAT YOUR REPORT SAYS ABOUT ITSELF — NOT A FINDING' : 'REPORT CONSISTENCY — NOT A FINDING'}</span>
      <h3>${esc(c.headline)}</h3>
      ${c.detail ? `<p>${esc(c.detail)}</p>` : ''}
      <p class="evidence">Check: <b>${esc(c.check_name || 'not named')}</b> · output level: <b>${esc(c.output_level || 'none')}</b>
        ${c.agreement ? `· <b>${esc(c.agreement === 'A_DIFFERENCE_WAS_FOUND' ? 'a difference was found between two printed facts' : 'no difference found')}</b>` : ''}</p>
      ${(c.examined || []).length ? `<p class="evidence">${esc(c.examined.length)} printed value(s) were compared. </p>` : ''}
      <p class="evidence">${esc(c.qualification)}</p>
    </div>`).join('');

  return `
    ${assessmentDateLine(result)}
    <h2>Checks performed: ${esc(result.checks_performed)}</h2>
    ${observations || (factual ? '' : '<p class="lede">No findings available.</p>')}
    ${factual ? `<h2>What your report prints, set against itself</h2>${factual}` : ''}
    ${issuesSection(result)}
    <div class="note stop">${esc(result.disclaimer)}</div>`;
}

/* OWNER correction (SOL assessment date): the date the SERVER ran this assessment, shown wherever results are
   shown, so a court-time-limit result always says which day it was judged on. Reading a result never moves it. */
function assessmentDateLine(holder) {
  const h = holder || {};
  const assessed = h.assessed_on || (h.limitation && h.limitation.assessed_on) || null;
  if (!assessed) return '';
  const basis = h.assessment_clock_basis || (h.limitation && h.limitation.assessment_clock_basis) || null;
  const reportDate = (h.limitation && h.limitation.report_date) || null;
  return `<p class="evidence">Assessed on <b>${esc(assessed)}</b>${basis ? ` (${esc(basis)})` : ''}${reportDate ? ` · the report itself is dated <b>${esc(reportDate)}</b>` : ''}.</p>`;
}

/* OWNER-POTENTIAL-ISSUE-001: supported potential reporting issues, rendered as review cards (never NOT_DETECTED,
   never failed-check diagnostics). Each states what the report says, why it merits attention and its uncertainty. */
function issuesSection(result) {
  const issues = result.issues || [];
  const informational = i => i.limitation_concern || i.basis_type === 'LIMITATION_ASSESSMENT';
  const cards = items => items.map((i) => `
    <div class="obs issue">
      <span class="pill potential">${issueLabel(i)}</span>
      ${i.account_identity && i.account_identity.name ? `<p class="evidence">Account: <b>${esc(i.account_identity.name)}</b></p>` : ''}
      <h3>${esc(i.explanation)}</h3>
      <p class="evidence">${informational(i) ? '' : 'Why it merits attention: '}${esc(i.uncertainty)}</p>
      ${i.limitation && i.limitation.assessed_on ? `<p class="evidence">Assessed on <b>${esc(i.limitation.assessed_on)}</b>${i.limitation.assessment_clock_basis ? ` (${esc(i.limitation.assessment_clock_basis)})` : ''}${i.limitation.report_date ? ` · the report itself is dated <b>${esc(i.limitation.report_date)}</b>` : ''}.</p>` : ''}
      ${i.retention_review ? `<p class="evidence">${i.retention_review.report_issued ? `Report issued: <b>${esc(i.retention_review.report_issued)}</b> · ` : 'Report issued: <b>not stated</b> · '}Assessed on: <b>${esc(i.retention_review.assessed_on || '')}</b> · the reporting period appears to end ${i.retention_review.period_appears_to_end_from ? `somewhere between <b>${esc(i.retention_review.period_appears_to_end_from)}</b> and <b>${esc(i.retention_review.period_appears_to_end_on)}</b>` : `<b>${esc(i.retention_review.period_appears_to_end_on || '')}</b>`}${i.retention_review.arose_through_later_passage_of_time ? ' · this arose through the passage of time since your report was issued' : ''}.</p>` : ''}
      ${i.source_location ? `<p class="evidence">Your report, ${i.source_location.section ? esc(i.source_location.section) + ', ' : ''}page <b>${esc(i.source_location.page)}</b>${i.source_location.line != null ? `, line <b>${esc(i.source_location.line)}</b>` : ''}${i.account_number_in_report != null ? `, account <b>${esc(i.account_number_in_report)}</b>` : ''}.</p>` : ''}
      ${i.rule_assessment ? `<p class="evidence">${esc(i.rule_assessment.requirement)}${i.citation ? ` Supporting statute: ${esc(i.citation)}.` : ''}</p>` : i.retention_review || i.limitation_concern ? '' : '<p class="evidence">A factual discrepancy like this supports a verification request.</p>'}
    </div>`).join('');
  const reporting = issues.filter(i => !informational(i)), information = issues.filter(informational);
  return `${reporting.length ? `<h2>Reporting issues for your review</h2>${cards(reporting)}` : '<p class="lede">We did not find a reporting issue in the information we could review.</p>'}${information.length ? `<h2>Information about court time limits</h2><p>This information is for you. It is not included in a dispute packet.</p>${cards(information)}` : ''}`;
}

/* ------------------------------------------------------------------ optional clarification (BLOCKER-CLARIFY-001) */

function reportUsePurposeControl(q) {
  const qk = esc(q.question_key);
  const purposeOptions = (q.choices || []).map((c) => {
    const label = (q.purpose_labels && q.purpose_labels[c]) ? q.purpose_labels[c] : c;
    return '<option value="' + esc(c) + '">' + esc(label) + '</option>';
  }).join('');
  const amountSelects = (q.choices || []).map((c) => {
    const bands = (q.amount_bands && q.amount_bands[c]) || [];
    const bandOptions = bands.map((b) => '<option value="' + esc(b.code) + '">' + esc(b.label) + '</option>').join('');
    return '<div class="amount-band" data-purpose="' + esc(c) + '" hidden>' +
      '<label for="q-' + qk + '-amount-' + esc(c) + '">Amount</label>' +
      '<select id="q-' + qk + '-amount-' + esc(c) + '"><option value="">Choose an amount…</option>' + bandOptions + '<option value="I_DONT_KNOW">I don\'t know</option><option value="SKIP">Skip</option></select></div>';
  }).join('');
  return '<div class="obs" data-question="' + qk + '" data-kind="report_use">' +
    '<h3>' + esc(q.plain) + '</h3>' +
    '<p class="evidence">Why we ask: ' + esc(q.benefit) + '</p>' +
    '<label for="q-' + qk + '">Your answer</label>' +
    '<select id="q-' + qk + '"><option value="">Choose an answer…</option>' + purposeOptions + '<option value="I_DONT_KNOW">I don\'t know</option><option value="SKIP">Skip</option></select>' +
    amountSelects +
    '<div class="row">' +
    '<button class="secondary" data-dontknow="' + qk + '">I don\'t know</button>' +
    '<button class="secondary" data-skip="' + qk + '">Skip</button>' +
    '</div></div>';
}

function clarificationBlock(view) {
  const questions = (view.clarification_questions || []).slice(0, 2);
  if (!questions.length) return '';
  const answered = view.clarifications || [];
  const correcting = state.correctingReportUse === true;
  const answeredKeys = new Set(answered.filter((a) => !a.superseded && !(correcting && a.question_id === 'report-use')).map((a) => a.question_key).filter(Boolean));
  const requiresReassessment = questions.filter((q) => q.requires_reassessment);
  const answerable = questions.filter((q) => !q.requires_reassessment && q.question_key);
  const pending = answerable.filter((q) => !answeredKeys.has(q.question_key));
  const labelFor = (c) => (c === 'I_DONT_KNOW' ? "I don't know" : c === 'SKIP' ? 'Skip' : c);
  if (!pending.length) {
    const hasReportUseAnswer = answered.some((a) => a.question_id === 'report-use' && !a.superseded);
    const correctButton = hasReportUseAnswer && !correcting
      ? '<button class="secondary" id="report-use-correct">Correct my answer</button>'
      : '';
    return '<h2>Your clarification</h2>' +
      '<div class="obs">' +
      (requiresReassessment.length ? '<p class="evidence">Some earlier questions need the checks to be run again before you can answer them.</p>' : '') +
      '<p class="evidence">Your answers are stored separately from your report\'s facts and are shown below as your own statements, never as anything the report itself printed.</p>' +
      answered.map((a) => '<p class="evidence"><b>' + esc(a.question_plain) + '</b>' + (a.account ? ' <span class="pill">' + esc(a.account) + '</span>' : '') + '<br>Answer: <b>' + esc(a.answer_plain) + '</b> · ' + esc(a.source) + (a.superseded ? ' · replaced by a later answer' : '') + '</p>').join('') +
      correctButton +
      '</div>';
  }
  const rows = pending.map((q) => {
    if (q.answer_kind === 'report_use_purpose') return reportUsePurposeControl(q);
    const control = q.answer_kind === 'choice'
      ? '<label for="q-' + esc(q.question_key) + '">Your answer</label><select id="q-' + esc(q.question_key) + '"><option value="">Choose an answer…</option>' + (q.choices || []).map((c) => '<option value="' + esc(c) + '">' + esc(labelFor(c)) + '</option>').join('') + '<option value="I_DONT_KNOW">I don\'t know</option><option value="SKIP">Skip</option></select>'
      : '<label for="q-' + esc(q.question_key) + '">Your answer (optional)</label><input id="q-' + esc(q.question_key) + '" type="text" placeholder="Type your answer, or use the buttons below">';
    return '<div class="obs" data-question="' + esc(q.question_key) + '">' +
      '<h3>' + esc(q.plain) + '</h3>' +
      (q.account ? '<p class="evidence">Account: <span class="pill">' + esc(q.account) + '</span></p>' : '') +
      '<p class="evidence">Why we ask: ' + esc(q.benefit) + '</p>' +
      control +
      '<div class="row">' +
      '<button class="secondary" data-dontknow="' + esc(q.question_key) + '">I don\'t know</button>' +
      '<button class="secondary" data-skip="' + esc(q.question_key) + '">Skip</button>' +
      '</div></div>';
  }).join('');
  const reassessmentNote = requiresReassessment.length
    ? '<div class="note">Some questions cannot be shown safely because they were recorded before account information was attached. Run the checks again to refresh them.</div>'
    : '';
  return '<h2>A quick clarification</h2>' +
    '<p class="lede">Optional, at most two questions. Your answers never change what your report itself says.</p>' +
    reassessmentNote +
    rows +
    '<button class="primary" id="clarify-submit">Save my answers</button>';
}

function wireClarification(panel, view) {
  if (!el('clarify-submit')) return;
  const questions = (view.clarification_questions || []).slice(0, 2).filter((q) => !q.requires_reassessment && q.question_key);
  /* C5: the special answers are preserved in their own state keyed by question_key. The browser converts a
     select assignment to an empty string when the value is not one of its options, so the buttons cannot rely
     on the select alone. */
  const special = {};
  const setSpecial = (questionKey, value) => {
    special[questionKey] = value;
    const node = el('q-' + questionKey);
    if (node) node.value = value; /* visual only; the option now exists and the separate state is authoritative */
  };
  for (const btn of panel.querySelectorAll('[data-dontknow]')) {
    btn.onclick = () => setSpecial(btn.dataset.dontknow, 'I_DONT_KNOW');
  }
  for (const btn of panel.querySelectorAll('[data-skip]')) {
    btn.onclick = () => setSpecial(btn.dataset.skip, 'SKIP');
  }
  /* Report-use: show the amount select only for the chosen purpose. Selecting a purpose after clicking
     Unknown/Skip clears the stale special-answer state and updates amount visibility; clicking Unknown/Skip
     hides every amount select. */
  const reportUseBands = [];
  for (const node of panel.querySelectorAll('[data-kind="report_use"]')) {
    const qKey = node.getAttribute('data-question');
    const purposeSelect = el('q-' + qKey);
    const bands = node.querySelectorAll('.amount-band');
    const showBand = (purpose) => {
      for (const d of bands) {
        if (d && d.dataset) d.hidden = d.dataset.purpose !== purpose;
      }
    };
    reportUseBands.push({ qKey, showBand });
    if (purposeSelect) {
      purposeSelect.onchange = () => {
        delete special[qKey];
        showBand(purposeSelect.value);
      };
    }
  }
  for (const btn of panel.querySelectorAll('[data-dontknow]')) {
    const prior = btn.onclick;
    btn.onclick = () => {
      if (prior) prior();
      for (const rb of reportUseBands) if (rb.qKey === btn.dataset.dontknow) rb.showBand('');
    };
  }
  for (const btn of panel.querySelectorAll('[data-skip]')) {
    const prior = btn.onclick;
    btn.onclick = () => {
      if (prior) prior();
      for (const rb of reportUseBands) if (rb.qKey === btn.dataset.skip) rb.showBand('');
    };
  }
  if (el('report-use-correct')) {
    el('report-use-correct').onclick = () => {
      state.correctingReportUse = true;
      render();
    };
  }
  el('clarify-submit').onclick = () => run(async () => {
    const answers = [];
    for (const q of questions) {
      if (q.answer_kind === 'report_use_purpose') {
        const purpose = special[q.question_key] || (el('q-' + q.question_key) && el('q-' + q.question_key).value ? el('q-' + q.question_key).value : '');
        if (purpose) answers.push({ question_id: 'report-use', question_key: q.question_key, account: q.account, answer: purpose });
        if (purpose && purpose !== 'I_DONT_KNOW' && purpose !== 'SKIP') {
          const amountNode = el('q-' + q.question_key + '-amount-' + purpose);
          const amount = amountNode && amountNode.value ? amountNode.value : '';
          if (amount) answers.push({ question_id: 'report-use-amount', question_key: q.question_key + '-amount', account: q.account, purpose, answer: amount });
        }
        continue;
      }
      const node = el('q-' + q.question_key);
      const answer = special[q.question_key] || (node && node.value ? node.value : '');
      if (answer) answers.push({ question_id: q.id, account: q.account, outcome: q.outcome, answer });
    }
    await api('POST', '/api/cases/' + state.caseId + '/results/' + view.result_id + '/clarify', { answers });
    state.correctingReportUse = false;
    state.view = (await api('GET', '/api/cases/' + state.caseId + '/results/' + view.result_id + '/view')).view;
    state.notice = 'Clarification saved. It is stored separately from your report facts.';
  });
}
/* ------------------------------------------------------------------ step 4: review and download */

function renderReview(panel) {
  if (!state.view) { panel.innerHTML = `${notices()}<h1>Upload your report first</h1>`; return; }
  const view = state.view;
  /* OWNER-PURCHASE-FLOW-001: the dispute packet is a subscriber feature. A one-time unlock gives the complete
     assessment and its download; packet selection, correspondence, approval and download need a subscription. */
  const access = view.assessment_access || {};
  if (!access.dispute_packet) {
    panel.innerHTML = `
      <h1>Choose disputes</h1>
      <p class="lede">Dispute packets are part of a subscription.</p>
      ${notices()}
      <div class="note">A one-time purchase includes the full assessment and its download. A subscription also includes dispute packets.</div>
      <button class="primary" id="go-billing">See subscription plans</button>`;
    el('go-billing').onclick = () => run(async () => { state.step = STEP.BILLING; });
    return;
  }
  const result = view.result;
  const choosing = state.step === STEP.CHOOSE;
  const preparing = state.step === STEP.PREPARE;
  panel.innerHTML = `
    <h1>${choosing ? 'Choose disputes' : preparing ? 'Prepare your documents' : 'Review and approve packet'}</h1>
    <p class="lede">${choosing ? 'Select the issues you want the bureau to check or correct.' : preparing ? 'Check what your bureau asks you to include. Upload your identification and proof of address as needed, then choose the copies for your packet.' : 'Check your chosen issues and every page. Approve this version before downloading or printing it.'}</p>
    ${notices()}
    ${result ? `<div class="obs">
      <span class="pill ${view.reviewed ? '' : 'stop'}">${view.reviewed ? 'REVIEWED BY YOU' : 'NOT YET REVIEWED'}</span>
      <button class="primary" id="review" ${view.reviewed ? 'disabled' : ''}>I have reviewed my assessment</button>
      <div id="packet-block"></div>
    </div>` : '<div class="note">Run the checks on the previous step first.</div>'}`;

  if (el('review')) el('review').onclick = () => run(async () => {
    await api('POST', `/api/cases/${state.caseId}/review`, {});
    state.view = (await api('GET', `/api/cases/${state.caseId}`)).view;
    state.notice = 'Your review is saved.';
  });

  wirePacket(panel);
}

/* OWNER-POTENTIAL-ISSUE-001: the correction-packet selection/review/edit/approve/download flow, wired into the
   Wizzard review step. Consumer wording is kept separate from the report facts. */
function issueLabel(issue) {
  return issue && issue.consumer_label === 'INFORMATION' ? 'INFORMATION' : issue && issue.consumer_label === 'VIOLATION' ? 'VIOLATION' : 'Verification request';
}

/* OWNER-PACKET-CORRESPONDENCE-001: the consumer-visible name of each necessary correspondence detail. */
function correspondenceFieldLabel(field) {
  if (field === 'consumer_name') return 'your name';
  if (field === 'contact') return 'where the reply should go';
  return field;
}

function bureauChecklist(requirements, missing = []) {
  if (!requirements) return '<p>Choose the bureau that issued your report.</p>';
  return `<h4>${esc(requirements.label)} checklist</h4><ul>${requirements.items.map(item => `<li>${esc(item)}</li>`).join('')}</ul>
    ${requirements.postal ? `<p><strong>Mail your packet to:</strong><br>${esc(requirements.postal).replace(/\n/g, '<br>')}</p>` : ''}
    ${missing.length ? `<p class="note">${missing.map(esc).join('<br>')}</p>` : ''}
    <p>${[...new Set(requirements.sources)].map((url, index) => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">Official instructions${index ? ' ' + (index + 1) : ''}</a>`).join(' · ')}</p>`;
}
function packetSupportingDocuments(pv) {
  const view = pv.support || {}, settings = view.settings || {}, req = view.requirements;
  const bureau = settings.bureau || req?.bureau || '';
  const country = req?.country || state.view?.case?.country;
  return `<h3>Prepare for the bureau</h3>
    <div class="row"><div><label for="packet-bureau">Bureau</label><select id="packet-bureau"><option value="">Choose bureau</option>${(view.catalog || []).map(row => `<option value="${row.id}" ${row.id === bureau ? 'selected' : ''}>${esc(row.label)}</option>`).join('')}</select></div>
    <div><label for="packet-purpose">What you are correcting</label><select id="packet-purpose">${[['ACCOUNT', 'Account information'], ['PUBLIC_RECORD', 'Collections or public records'], ['PERSONAL', 'Personal information'], ['NEW_ADDRESS', 'Add a new address']].map(([value, label]) => `<option value="${value}" ${(settings.purpose || view.suggested_purpose || 'ACCOUNT') === value ? 'selected' : ''}>${label}</option>`).join('')}</select></div></div>
    <p class="evidence">Your saved contact details are included. <button class="secondary" id="packet-account-details">Upload identification or proof of address</button></p>
    <div id="packet-bureau-checklist">${bureauChecklist(req, view.missing || [])}</div>
    <h4>Choose documents to include</h4>
    ${(view.documents || []).map(doc => `<div><label><input type="checkbox" data-packet-document="${esc(doc.file_id)}" ${(view.selected_document_ids || []).includes(doc.file_id) ? 'checked' : ''}>${esc(doc.original_filename)} — ${esc(DOCUMENT_KIND_LABELS[doc.document_kind] || doc.document_kind)}</label>
    <label for="packet-document-date-${doc.file_id}">Document date, if required</label><input id="packet-document-date-${doc.file_id}" type="date" value="${esc(settings.document_dates?.[doc.file_id] || '')}"></div>`).join('') || '<p class="evidence">No account documents uploaded yet.</p>'}
    <label><input id="packet-id-address" type="checkbox" ${settings.identity_shows_address ? 'checked' : ''}>My selected identification shows my current address</label>
    <label><input id="packet-verification-requested" type="checkbox" ${settings.verification_requested ? 'checked' : ''}>The bureau has asked me for identity verification</label>
    <label><input id="packet-copies-confirmed" type="checkbox" ${settings.copies_confirmed ? 'checked' : ''}>I checked that these copies are clear, current and meet the bureau’s instructions</label>
    <div id="packet-us-identity" ${req?.country === 'US' ? '' : 'hidden'}><label for="packet-identity-reference">Social Security number for bureau correspondence${req?.ssn_required ? '' : ' (optional)'}</label>
    <input id="packet-identity-reference" type="password" autocomplete="off" maxlength="20" value="${esc(settings.identity_reference || '')}">
    <label><input id="packet-no-ssn" type="checkbox" ${settings.no_ssn_issued ? 'checked' : ''}>I have never been issued an SSN</label></div>
    <div id="packet-other-identity-section" ${country === 'GB' || country === 'AU' ? 'hidden' : ''}><label for="packet-other-identity">Other identification details requested by the bureau (optional)</label><textarea id="packet-other-identity" maxlength="500">${esc(settings.other_identity_details || '')}</textarea></div>`;
}
function packetReportCopies(packet) {
  if (!Array.isArray(packet.report_exhibits)) return '';
  const reports = packet.report_exhibits;
  if (!reports.length) return '';
  return `<section id="packet-reports"><h3>Report pages</h3>
    <p class="evidence">The pages about your chosen disputes are included in your packet.</p>
    ${reports.map(report => {
      const label = String(report.label || 'Report copy').replace(/\b\d{4}-\d{2}-\d{2}\b/g, date => readableDate(date) || date);
      const count = Number.isSafeInteger(report.page_count) && report.page_count > 0 ? report.page_count : null;
      const pages = (report.relevant_pages || []).filter(page => Number.isSafeInteger(page) && page > 0);
      const copyUrl = `/api/cases/${encodeURIComponent(state.caseId)}/packet/reports/${encodeURIComponent(report.file_id)}`;
      return `<div class="obs"><h4>${esc(label)}</h4>
        <p class="evidence">${pages.length ? `Included: report ${pages.length === 1 ? 'page' : 'pages'} ${pages.join(', ')}.` : `Enter the page numbers that show the problem. Your report has ${count || ''} pages.`}</p>
        ${!pages.length || report.consumer_pages?.length ? `<label for="packet-report-pages-${esc(report.file_id)}">Pages to include (for example, 2, 3)</label><input id="packet-report-pages-${esc(report.file_id)}" data-packet-pages="${esc(report.file_id)}" inputmode="numeric" value="${esc((report.consumer_pages || []).join(', '))}">` : ''}
        <input type="checkbox" hidden checked data-packet-report="${esc(report.file_id)}">
        ${report.review_url === copyUrl ? `<a href="${esc(copyUrl)}" target="_blank" rel="noopener noreferrer">Check the original report</a>` : ''}</div>`;
    }).join('')}</section>`;
}
function packetFormPreviews(packet, ready) {
  if (!packet.form_previews?.length) return '';
  return `<section id="packet-forms"><h3>Your bureau forms</h3>
    <p class="evidence">We fill these forms with your saved details and chosen disputes. Check them before you approve your packet. Sign where the original form asks.</p>
    ${ready ? `<ul class="plain">${packet.form_previews.map(form => `<li><a href="${esc(form.review_url)}" target="_blank" rel="noopener noreferrer">Open filled ${esc(form.label)}</a></li>`).join('')}</ul>`
      : '<p class="evidence">Save your details and the mail checklist to open your filled forms.</p>'}</section>`;
}
function renderPacketBlock(pv) {
  const issues = (pv.eligible_issues || []).filter((i) => i.eligible);
  const packet = pv.packet || {};
  if (!issues.length) return '<p class="evidence">No issue on this case is eligible for a correction packet yet.</p>';
  const profile = pv.support?.account_profile || {};
  const correspondence = Object.values(profile).some(value => String(value || '').trim()) || pv.support?.settings?.use_account_profile ? { ...(packet.correspondence || {}), consumer_name: profile.full_name || '', contact: [
    ['address_line1', 'address_line2', 'city', 'region', 'postal_code', 'country'].map(field => profile[field]).filter(Boolean).join(', '), profile.contact_email, profile.phone
  ].filter(Boolean).join('\n') } : (packet.correspondence || {});
  const recipient = packet.recipient || {};
  const missing = packet.correspondence_missing || [];
  const rows = issues.map((i) => `
    <label class="issue-select">
      <input type="checkbox" data-check-issue="${esc(i.issue_id)}" ${(packet.selected_issue_ids || []).includes(i.issue_id) ? 'checked' : ''}>
      <span class="pill">${issueLabel(i)}</span>
      ${i.account_identity && i.account_identity.name ? `<span class="evidence">Account: <b>${esc(i.account_identity.name)}</b></span>` : ''}
      <strong>${esc(i.explanation)}</strong>
      <span class="evidence">Why: ${esc(i.uncertainty)}</span>
      ${i.report_identity ? `<span class="evidence">Report: <b>${esc(i.report_identity.bureau || 'a report')}</b>${i.report_identity.reference_date ? ` · reference date <b>${esc(i.report_identity.reference_date)}</b>` : ''}</span>` : ''}
      ${comparisonFactList(i)}
    </label>`).join('');
  return `
    <div id="packet-selection">
    <h2>Your dispute packet</h2>
    <p class="evidence">Choose the issues you want the bureau to check or correct.</p>
    ${rows}
    <button class="primary" id="packet-choose-next">Continue to document preparation</button>
    </div>
    <div id="packet-details">
    <p class="evidence">We put your letter, report pages, document copies and bureau forms in one PDF.</p>
    ${packetSupportingDocuments(pv)}
    <button class="primary" id="packet-prepare-next">Continue to packet review</button>
    <div id="packet-review-controls">
    ${packetReportCopies(packet)}
    <div class="row">
      <label for="packet-name">Your name (as the sender)</label>
      <input id="packet-name" readonly value="${esc(correspondence.consumer_name || '')}">
      <label for="packet-contact">Where the reply should go</label>
      <textarea id="packet-contact" readonly>${esc(correspondence.contact || '')}</textarea>
      <label for="packet-reference">Your own reference (optional)</label>
      <input id="packet-reference" value="${esc(correspondence.account_reference || '')}">
      <label for="packet-bureau-reference">Your bureau file or account number (if printed on your report)</label>
      <input id="packet-bureau-reference" value="${esc(correspondence.bureau_reference || '')}">
    </div>
    ${missing.length ? `<p class="note stop">Add ${missing.map(correspondenceFieldLabel).join(' and ')} before you approve the letter.</p>` : ''}
    <label for="packet-wording">Your own words (optional)</label>
    <textarea id="packet-wording" placeholder="Add anything else you want the bureau to know.">${esc(packet.wording || '')}</textarea>
    <div class="row">
      <button class="primary" id="packet-save">Save and review packet</button>
    </div>
    ${packet.approved ? '<p class="evidence" id="packet-approved-status">Your packet is approved.</p>' : ''}
    ${packet.approval_stale ? '<p class="note stop">The packet changed since approval; review and approve it again.</p>' : ''}
    <div class="packet-review">
      <h3>Review and edit</h3>
      <p class="evidence" id="packet-preview-status">${packet.selected_count && packet.correspondence_preview ? 'Read your letter. You can change the words below, then save your changes.' : 'Choose your disputes, then select Save and review packet.'}</p>
      ${packet.correspondence_preview ? `<label for="packet-letter">Your letter</label><textarea id="packet-letter" rows="18" maxlength="24000">${esc(packet.correspondence_preview)}</textarea><button class="secondary" id="packet-reset-letter">Use the prepared letter</button>` : ''}
      <pre id="packet-preview" hidden>${esc(packet.correspondence_preview || '')}</pre>
      ${packet.preview_ready && packet.letter_preview_url ? `<div id="packet-pdf-review"><p><a href="${esc(packet.letter_preview_url)}" target="_blank" rel="noopener noreferrer">Open your complete packet PDF</a></p><iframe title="Your complete dispute packet" src="${esc(packet.letter_preview_url)}" style="width:100%;height:720px;border:1px solid #dbe3d5"></iframe><p class="evidence">Check every page. You can edit the letter in your downloaded PDF before printing. To change your personal details, update your account details, then save and review your packet again.</p></div>` : ''}
      <label><input id="packet-preview-reviewed" type="checkbox" ${packet.approved ? 'checked' : ''} ${(packet.preview_ready ?? Boolean(packet.selected_count && packet.correspondence_preview)) ? '' : 'disabled'}>I have checked every page of my packet</label>
      <button class="primary" id="packet-approve" disabled>Approve this version</button>
      <button class="secondary" id="packet-print" ${(packet.print_available ?? packet.download_available) ? '' : 'disabled'}>Open PDF to print</button>
      <button class="secondary" id="packet-download" ${packet.download_available ? '' : 'disabled'}>Download your PDF</button>
      ${packet.download_available ? `<p class="note" id="packet-ready-status">Download your PDF and print every page. Sign and date where shown. Mail it to the bureau address in your letter. Keep a copy.</p>` : ''}
      ${surface?.preview_mode === true && packet.download_available ? '<p class="note demo"><strong>Staging preview:</strong> See how an optional paid mailing step could look. This sample cannot take payment or mail your packet.<br><a href="/mailing-preview.html" target="_blank" rel="noopener">Review the mailing design</a></p>' : ''}
    </div>
    </div>
    </div>`;
}

async function wirePacket(panel) {
  const block = panel.querySelector('#packet-block');
  if (!block) return;
  const caseId = state.caseId, rendered = renderSequence, ensureAccount = accountContext();
  const ensureOrigin = () => { ensureAccount(); if (state.caseId !== caseId || renderSequence !== rendered) throw cancelledAction(); };
  let pv;
  try {
    pv = (await api('GET', `/api/cases/${caseId}/packet`)).view;
  } catch (error) {
    try { ensureOrigin(); } catch { return; }
    if (error.code === 'PACKET_APPROVAL_STALE') {
      state.notice = null;
      if (el('consumer-notice')) el('consumer-notice').hidden = true;
      block.innerHTML = '<p class="note stop">Your report copy has changed. Upload it again, then choose your disputes and review your packet.</p><button class="secondary" id="packet-reports-review">Upload your report again</button>';
      const review = el('packet-reports-review');
      if (review) review.onclick = () => run(async () => {
        ensureOrigin(); review.disabled = true;
        state.notice = 'Upload your report again so we can check the copy you want to dispute.';
        navigateStep(STEP.JURISDICTION);
      });
      return;
    }
    block.innerHTML = '<p class="note stop">We could not load your packet. Try again.</p><button class="secondary" id="packet-retry">Try again</button>';
    const retry = el('packet-retry');
    if (retry) retry.onclick = () => { try { ensureOrigin(); } catch { return; } retry.disabled = true; return wirePacket(panel); };
    return;
  }
  try { ensureOrigin(); } catch { return; }
  block.innerHTML = renderPacketBlock(pv);
  if (!(pv.eligible_issues || []).some(issue => issue.eligible)) return;
  const choosing = state.step === STEP.CHOOSE;
  const preparing = state.step === STEP.PREPARE;
  el('packet-choose-next').hidden = !choosing;
  el('packet-details').hidden = choosing;
  el('packet-prepare-next').hidden = !preparing;
  el('packet-review-controls').hidden = preparing;

  /* The current visible selection and wording, captured at action time so a save or an approve can never
     silently use an older saved version while the consumer sees a changed one. */
  const currentSelection = () => [...panel.querySelectorAll('[data-check-issue]:checked')].map((n) => n.getAttribute('data-check-issue'));
  const currentReports = () => [...panel.querySelectorAll('[data-packet-report]:checked')].map(node => node.getAttribute('data-packet-report'));
  const currentWording = () => el('packet-wording') ? el('packet-wording').value : '';
  const currentCorrespondence = () => ({
    consumer_name: el('packet-name') ? el('packet-name').value : '',
    contact: el('packet-contact') ? el('packet-contact').value : '',
    account_reference: el('packet-reference') ? el('packet-reference').value : '',
    bureau_reference: el('packet-bureau-reference') ? el('packet-bureau-reference').value : ''
  });
  const currentSupport = () => {
    const document_ids = [...panel.querySelectorAll('[data-packet-document]:checked')].map(node => node.getAttribute('data-packet-document'));
    const selected = new Set(currentSelection()), kinds = (pv.eligible_issues || []).filter(issue => selected.has(issue.issue_id)).map(issue => issue.record_kind || '');
    const account = kinds.some(kind => /credit account/i.test(kind)), publicRecord = kinds.some(kind => /collection|judgment|bankruptcy|public record|tax lien/i.test(kind));
    if (pv.support?.requirements?.country === 'CA' && el('packet-bureau').value === 'EQUIFAX') {
      if (account || publicRecord) el('packet-purpose').value = account ? 'ACCOUNT' : 'PUBLIC_RECORD';
      if (account && publicRecord) el('packet-id-address').checked = false;
    }
    return { bureau: el('packet-bureau').value, channel: 'POSTAL', purpose: el('packet-purpose').value,
      use_account_profile: true, document_ids, identity_shows_address: el('packet-id-address').checked,
      verification_requested: el('packet-verification-requested').checked, copies_confirmed: el('packet-copies-confirmed').checked,
      identity_reference: el('packet-identity-reference').value, no_ssn_issued: el('packet-no-ssn').checked,
      other_identity_details: el('packet-other-identity-section').hidden ? '' : el('packet-other-identity').value,
      document_dates: Object.fromEntries(document_ids.map(id => [id, el('packet-document-date-' + id).value])) };
  };
  let edits = 0;
  let letterEdited = false, resetLetter = false;
  let previewCurrent = pv.packet?.preview_ready ?? Boolean(pv.packet?.selected_count && pv.packet?.correspondence_preview);
  const persistSelection = async () => {
    ensureOrigin();
    const captured = edits, chosenIssues = currentSelection(), chosenReports = currentReports(), letterText = el('packet-letter')?.value,
      pageChoices = Object.fromEntries([...panel.querySelectorAll('[data-packet-pages]')].map(node => [node.getAttribute('data-packet-pages'),
        node.value.trim() ? node.value.split(',').map(value => Number(value.trim())) : []])), payloads = [
      ['select', { issue_ids: chosenIssues }], ['correspondence', { correspondence: currentCorrespondence() }],
      ['wording', { wording: currentWording() }], ...(pv.support?.catalog?.length ? [['support', { support: currentSupport() }]] : [])
    ];
    const ensureCurrent = () => { ensureOrigin(); if (edits !== captured) throw cancelledAction(); };
    let allowedReports = null;
    for (const [action, body] of payloads) {
      ensureCurrent(); const answer = await api('POST', `/api/cases/${caseId}/packet/${action}`, body); ensureCurrent();
      if (action === 'select' && Array.isArray(answer.view?.packet?.report_exhibits)) allowedReports = new Set(answer.view.packet.report_exhibits.map(report => report.file_id));
    }
    if (chosenIssues.length && Array.isArray(pv.packet?.report_exhibits)) {
      if (chosenReports.length && !allowedReports) throw new Error('We could not save your report choices. Try saving again.');
      const file_ids = chosenReports.filter(fileId => allowedReports?.has(fileId));
      const page_choices = Object.fromEntries(Object.entries(pageChoices).filter(([fileId]) => allowedReports?.has(fileId)));
      ensureCurrent(); await api('POST', `/api/cases/${caseId}/packet/reports`, { file_ids, page_choices }); ensureCurrent();
    }
    if (chosenIssues.length && letterEdited) { ensureCurrent(); await api('POST', `/api/cases/${caseId}/packet/letter`, { letter_text: resetLetter ? null : letterText }); ensureCurrent(); }
    return ensureCurrent;
  };

  const save = el('packet-save');
  const continueToReview = el('packet-choose-next');
  if (continueToReview) continueToReview.onclick = () => run(async () => {
    if (!currentSelection().length) throw new Error('Choose at least one issue to continue.');
    const ensureCurrent = await persistSelection(); ensureCurrent();
    const answer = await api('GET', `/api/cases/${caseId}`); ensureCurrent(); state.view = answer.view;
    state.step = STEP.PREPARE;
    state.notice = 'Your choices are saved. Check the bureau requirements and add your documents.';
  });
  el('packet-prepare-next').onclick = () => run(async () => {
    if (!currentSelection().length) throw new Error('Choose at least one issue to continue.');
    const ensureCurrent = await persistSelection(); ensureCurrent();
    const answer = await api('GET', `/api/cases/${caseId}`); ensureCurrent(); state.view = answer.view;
    state.step = STEP.REVIEW;
    state.notice = 'Your document choices are saved. Review every page before approving.';
  });
  if (save) save.onclick = () => run(async () => {
    const ensureCurrent = await persistSelection();
    const answer = await api('GET', `/api/cases/${caseId}`); ensureCurrent(); state.view = answer.view;
    state.notice = 'Packet saved. Check your letter and every page in the PDF.';
  });

  const approve = el('packet-approve');
  if (approve) approve.onclick = () => run(async () => {
    ensureOrigin();
    if (!previewCurrent || edits || !el('packet-preview-reviewed').checked) throw new Error('Save and read the current packet before approving it.');
    const captured = edits, ensureCurrent = () => { ensureOrigin(); if (captured !== edits || !previewCurrent) throw cancelledAction(); };
    await api('POST', `/api/cases/${caseId}/packet/approve`, { reviewed_version: pv.packet.preview_version }); ensureCurrent();
    const answer = await api('GET', `/api/cases/${caseId}`); ensureCurrent(); state.view = answer.view;
    state.notice = 'Packet approved. Download your PDF, print it and sign where shown.';
  });
  const reviewed = el('packet-preview-reviewed');
  if (reviewed) reviewed.onchange = () => { ensureOrigin(); if (approve) approve.disabled = !previewCurrent || edits > 0 || !reviewed.checked || pv.packet.approved; };

  const dl = el('packet-download');
  if (dl) dl.onclick = () => {
    try { ensureOrigin(); } catch { return; }
    if (edits || !pv.packet.download_available) return;
    note(`GET /api/cases/${caseId}/packet-download -> browser download`);
    window.location.assign(`/api/cases/${caseId}/packet-download`);
  };
  const print = el('packet-print');
  if (print) print.onclick = () => {
    try { ensureOrigin(); } catch { return; }
    if (edits || !(pv.packet.print_available ?? pv.packet.download_available)) return;
    window.open(`/api/cases/${caseId}/packet-print`, '_blank', 'noopener');
  };

  /* Editing the correspondence details or the wording after approval marks the visible packet changed, so the
     download is disabled until the current version is approved again — never a silent download of an older
     approved version. */
  const markChanged = () => {
    edits++;
    previewCurrent = false;
    state.notice = null;
    for (const id of ['consumer-notice', 'packet-approved-status', 'packet-ready-status', 'packet-pdf-review']) if (el(id)) el(id).hidden = true;
    for (const id of ['packet-download', 'packet-print', 'packet-approve', 'packet-preview-reviewed']) if (el(id)) el(id).disabled = true;
    if (reviewed) reviewed.checked = false;
    if (el('packet-preview-status')) el('packet-preview-status').textContent = 'Your packet changed. Select Save and review packet to read the new version.';
    if (el('packet-preview')) el('packet-preview').textContent = 'Save and review your changes before approving.';
  };
  const wording = el('packet-wording');
  if (wording) wording.oninput = markChanged;
  const letterInput = el('packet-letter');
  if (letterInput) letterInput.oninput = () => { letterEdited = true; resetLetter = false; markChanged(); };
  const reset = el('packet-reset-letter');
  if (reset) reset.onclick = () => { letterEdited = true; resetLetter = true; markChanged(); };
  for (const node of panel.querySelectorAll('[data-packet-pages]')) node.oninput = markChanged;
  for (const node of panel.querySelectorAll('[data-check-issue]')) node.onchange = markChanged;
  for (const id of ['packet-name', 'packet-contact', 'packet-reference', 'packet-bureau-reference']) {
    const input = el(id);
    if (input) input.oninput = markChanged;
  }
  const accountDetails = el('packet-account-details');
  packetLeave = step => run(async () => {
    const ensureCurrent = await persistSelection(); ensureCurrent();
    if (step === STEP.ACCOUNT) {
      state.packetReturn = { accountId: state.account.account_id, epoch: accountEpoch, caseId, resultId: pv.packet.result_id || state.view.result_id, step: state.step };
      state.accountProfile = null;
    }
    state.step = step;
  });
  if (accountDetails) accountDetails.onclick = () => packetLeave(STEP.ACCOUNT);
  let checklistSequence = 0;
  const refreshChecklist = async () => {
    markChanged(); const sequence = ++checklistSequence;
    try {
      ensureOrigin();
      const answer = await api('POST', `/api/cases/${caseId}/packet/requirements`, { support: currentSupport() });
      ensureOrigin();
      if (sequence !== checklistSequence || !el('packet-bureau-checklist')) return;
      el('packet-bureau-checklist').innerHTML = bureauChecklist(answer.requirements, answer.missing);
      el('packet-us-identity').hidden = answer.requirements.country !== 'US';
      el('packet-other-identity-section').hidden = ['GB', 'AU'].includes(answer.requirements.country);
    } catch (error) { if (!error.cancelled && sequence === checklistSequence && state.caseId === caseId && renderSequence === rendered && el('packet-bureau-checklist')) el('packet-bureau-checklist').textContent = error.message; }
  };
  for (const id of ['packet-bureau', 'packet-purpose', 'packet-id-address', 'packet-verification-requested', 'packet-copies-confirmed', 'packet-no-ssn', 'packet-identity-reference', 'packet-other-identity']) if (el(id)) el(id).onchange = () => {
    if (id === 'packet-no-ssn' && el(id).checked) el('packet-identity-reference').value = '';
    if (id === 'packet-identity-reference' && el(id).value.trim()) el('packet-no-ssn').checked = false;
    return refreshChecklist();
  };
  for (const id of ['packet-identity-reference', 'packet-other-identity']) if (el(id)) el(id).oninput = markChanged;
  for (const node of panel.querySelectorAll('[data-packet-document], [id^="packet-document-date-"]')) node.onchange = refreshChecklist;
  for (const node of panel.querySelectorAll('[data-check-issue]')) node.onchange = refreshChecklist;
  for (const node of panel.querySelectorAll('[data-packet-report]')) node.onchange = markChanged;
  if (pv.support?.suggested_purpose && !pv.support.settings && pv.support.suggested_purpose !== pv.support.requirements?.purpose) refreshChecklist();
}

/* ------------------------------------------------------------------ step 5: report history and comparison */

function historyOption(r) {
  const row = r || {};
  const bureau = row.bureau || 'a report';
  const date = row.report_date || 'no report date on file';
  return `${bureau} · ${date}`;
}

function readableFactLabel(field) {
  return ({ 'account.masked_identifier': 'Account number', 'account.reported_identity': 'Account name',
    'account.first_delinquency': 'First missed payment date', 'account.last_payment': 'Last payment date',
    'account.closed_date': 'Closed date', 'account.opened_date': 'Opened date', 'account.status': 'Account status',
    'account.current_balance': 'Current balance', 'account.past_due_amount': 'Past-due amount',
    'account.responsibility': 'Who is responsible', 'report.reference_date': 'Report date' })[field] ||
    String(field || 'Report field').replace(/^(account|report|history)\./, '').replace(/[_.]/g, ' ');
}
function comparisonFactList(issue) {
  const facts = (issue && issue.source_facts) || [];
  if (!facts.length) return '';
  return facts.map((f) => {
    if (f.omitted_value) return `<span class="evidence">${esc(readableFactLabel(f.source_field))}: label printed without a value.</span>`;
    if (f.privacy_redacted) {
      const label = /\bMember Number\b/i.test(f.source_field || '') ? 'Member number matched from the report'
        : /Member Name/i.test(f.source_field || '') ? 'Reporting member matched from the report'
          : 'Creditor identity matched from the report';
      return `<span class="evidence">${esc(label)}.</span>`;
    }
    if (f.definition_source) {
      const source = f.definition_source;
      return `<span class="evidence">${source.kind === 'HISTORY_PERIOD' ? 'What the payment period means' : 'What the payment code means'}: ${esc(readableFactLabel(f.source_field))} — <b>${esc(f.normalized_value)}</b>. ${esc(source.publisher)}, ${esc(source.title)}, ${esc(source.section)}: ${esc(source.url)}</span>`;
    }
    const maskedReference = f.source_field === 'account.masked_identifier' || /^MASK-[A-Z0-9]+$/.test(String(f.normalized_value || '')) && /account[ _.-]+(?:number|identifier)/i.test(String(f.source_field || ''));
    return `<span class="evidence">${esc(readableFactLabel(f.source_field))}: printed <b>${esc(f.raw_value)}</b>${f.normalized_value != null && !maskedReference ? ` → read as <b>${esc(f.normalized_value)}</b>` : ''}</span>`;
  }).join('');
}

function outcomePill(outcome) {
  if (outcome === 'STILL_OBSERVED') return 'STILL OBSERVED';
  if (outcome === 'CHANGED') return 'CHANGED';
  if (outcome === 'NO_LONGER_OBSERVED') return 'NO LONGER OBSERVED IN THE LATER REPORT';
  return 'NOT COMPARABLE';
}

/* Render one comparison. The before/after facts, the match state and the specific uncertainty are shown; an
   internal comparison failure is never turned into an issue card. */
function renderComparison(data) {
  const block = el('comparison');
  if (!block) return;
  const order = data.order || {};
  const summary = data.summary || {};
  const rows = (data.outcomes || []).map((x) => `
    <div class="obs">
      <span class="pill">${esc(outcomePill(x.outcome))}</span>
      <h3>${esc(x.category || 'an issue')}</h3>
      <p class="evidence">${esc((x.earlier && x.earlier.explanation) || '')}</p>
      ${comparisonFactList(x.earlier)}
      ${x.later ? `<p class="evidence"><b>In the later report:</b></p>${comparisonFactList(x.later)}` : ''}
      <p class="evidence">Match: <b>${esc((x.match && x.match.state) || 'NONE')}</b>${x.match && x.match.cross_bureau ? ' · the two reports are from different bureaus' : ''}</p>
      <p class="evidence">${esc(x.uncertainty || '')}</p>
    </div>`).join('');
  block.innerHTML = `
    <h2>Comparison</h2>
    <p class="evidence">${esc(order.note || '')}</p>
    <div class="obs">
      <p class="evidence">First report: <b>${esc(historyOption(data.left))}</b> · report date <b>${esc((data.left && data.left.report_date) || 'not printed')}</b></p>
      <p class="evidence">Second report: <b>${esc(historyOption(data.right))}</b> · report date <b>${esc((data.right && data.right.report_date) || 'not printed')}</b></p>
      ${data.different_bureau ? '<p class="evidence">These two reports come from different bureaus, so a difference may reflect the two bureaus rather than a change over time.</p>' : ''}
      <p class="evidence">Still observed ${esc(String(summary.still_observed || 0))} · changed ${esc(String(summary.changed || 0))} · no longer observed ${esc(String(summary.no_longer_observed || 0))} · not comparable ${esc(String(summary.not_comparable || 0))}</p>
    </div>
    ${rows || '<p class="evidence">No issue from the earlier report could be compared.</p>'}
    <p class="evidence">${esc(data.note || '')}</p>`;
}

function renderHistory(panel) {
  if (!state.account) {
    panel.innerHTML = `${notices()}<h1>Report history</h1><p class="lede">Sign in to see and compare your own reports.</p>`;
    return;
  }
  panel.innerHTML = `
    <h1>Report history</h1>
    <p class="lede">Your own assessments, newest report first. Compare a later report with an earlier one to see
    whether a previously identified issue is still shown, has changed, or is no longer shown. Nothing here is sent
    anywhere, and comparing reports never changes an earlier assessment or an approved packet.</p>
    ${notices()}
    <div id="history-body">Loading your reports…</div>`;
  const accountId = state.account.account_id;
  api('GET', '/api/history').then((data) => {
    if (state.step !== STEP.HISTORY || !state.account || state.account.account_id !== accountId || !el('history-body')) return;
    const rows = data.assessments || [];
    const list = rows.length
      ? `<ul class="plain">${rows.map((r) => `<li>${esc(historyOption(r))} · ${esc(r.jurisdiction || '')} · ${esc(String(r.issue_count))} reporting issue(s)${r.information_count ? ` · court time-limit information for ${esc(String(r.information_count))} account(s)` : ''} <span class="evidence">assessment recorded ${esc(String(r.recorded_at || '').slice(0, 10))}</span></li>`).join('')}</ul>`
      : '<p class="evidence">No assessment is recorded for this account yet. Open a case, upload a report and run the checks.</p>';
    const options = rows.map((r) => `<option value="${esc(r.result_id)}">${esc(historyOption(r))}</option>`).join('');
    el('history-body').innerHTML = `
      ${list}
      ${rows.length >= 2 ? `<div class="row">
        <div><label for="cmp-left">First report</label><select id="cmp-left">${options}</select></div>
        <div><label for="cmp-right">Second report</label><select id="cmp-right">${options}</select></div>
      </div>
      <button class="primary" id="compare">Compare these two reports</button>` : ''}
      <div id="comparison"></div>`;
    if (rows.length >= 2) {
      el('cmp-right').selectedIndex = 1;
      el('compare').onclick = async () => {
        const block = el('comparison');
        if (block) block.innerHTML = '<p class="evidence">Comparing…</p>';
        try {
          const compared = await api('GET', `/api/history/compare/${encodeURIComponent(el('cmp-left').value)}/${encodeURIComponent(el('cmp-right').value)}`);
          renderComparison(compared);
        } catch (err) {
          if (block) block.innerHTML = `<div class="note stop"><span class="err">Refused:</span> ${esc(err.message)}</div>`;
        }
      };
    }
  }).catch(() => {
    if (state.step === STEP.HISTORY && el('history-body')) el('history-body').textContent = 'Your report history could not be loaded. Open this page again to retry.';
  });
}

/* ------------------------------------------------------------------ step 6: case and deletion */

function renderCase(panel) {
  if (!state.view) { panel.innerHTML = `${notices()}<h1>Open a case first</h1>`; return; }
  const view = state.view;
  panel.innerHTML = `
    <h1>Privacy, cases and deletion</h1>
    <p class="lede">Status is what you record; nothing here is computed and nothing here proves that anything was sent.</p>
    ${notices()}
    <div class="obs">
      <span class="pill">${esc(view.case.status)}</span>
      <h3>${esc(regionLabel(view.case.country, view.case.region))}</h3>
      <p class="evidence">${esc(view.status_label || '')}</p>
      ${['OPEN', 'REVIEWED', 'RESPONSE_RECORDED', 'CLOSED'].map((s) =>
        `<button class="secondary" data-status="${s}" ${s === view.case.status ? 'disabled' : ''}>Mark ${s}</button>`).join('')}
    </div>
    <div class="obs" id="privacyInventory">Loading your stored documents and retention information…</div>
    <div class="obs">
      <h3>Deleting</h3>
      <p class="evidence">Deleting a case removes its file bytes, its result sets and its downloads from this
      machine. Afterwards the case id stops working for everyone, including you.</p>
      <button class="danger" id="delete">Delete this case and its stored file</button>
      <button class="danger" id="deleteAccount">Delete my whole account</button>
    </div>`;

  const privacyAccount = state.account && state.account.account_id;
  const privacyCase = state.caseId;
  api('GET', '/api/privacy').then(data => {
    if (state.step !== STEP.CASE || state.caseId !== privacyCase || !state.account || state.account.account_id !== privacyAccount) return;
    const inventory = el('privacyInventory');
    if (!inventory) return;
    inventory.innerHTML = `<h3>Your stored documents</h3>${(data.cases || []).map(c => `<p>${esc(regionLabel(c.country, c.region))}: ${(c.documents || []).map(d => `${esc(d.name)} (${esc(d.stored_bytes)} bytes)`).join(', ') || 'No stored documents'}; ${esc(c.result_count)} saved results.</p>`).join('') || '<p>No stored cases.</p>'}
      ${(data.account_documents || []).length ? `<h4>Account documents</h4><ul>${data.account_documents.map(d => `<li>${esc(d.name)} (${esc(d.stored_bytes)} bytes)</li>`).join('')}</ul><p>Manage these documents in Your account.</p>` : ''}
      <h3>Retention</h3><p>${esc(data.retention && data.retention.plain)}</p><p>Reports have no automatic expiry. Retention settings are not adjustable.</p>
      <p>${esc(data.deletion && data.deletion.backups)}</p><p>${esc(data.deletion && data.deletion.external_billing)}</p>`;
  }).catch(() => {
    if (state.step === STEP.CASE && state.caseId === privacyCase && el('privacyInventory')) el('privacyInventory').textContent = 'Your inventory could not be loaded. Open this page again to retry.';
  });

  for (const button of panel.querySelectorAll('[data-status]')) {
    button.onclick = () => run(async () => {
      await api('PATCH', `/api/cases/${state.caseId}/status`, { status: button.dataset.status });
      state.view = (await api('GET', `/api/cases/${state.caseId}`)).view;
      state.notice = `Case marked ${button.dataset.status}.`;
    });
  }
  el('delete').onclick = () => run(async () => {
    await api('DELETE', `/api/cases/${state.caseId}`);
    state.cases = (await api('GET', '/api/cases')).cases;
    state.caseId = null;
    state.view = null;
    state.step = 1;
    state.notice = 'Case deleted. Its stored file and results are gone, and the case id no longer resolves.';
  });
  el('deleteAccount').onclick = () => run(async () => {
    accountEpoch++;
    await api('DELETE', '/api/account');
    state.account = null;
    state.accountProfile = null; state.accountDocuments = [];
    state.cases = [];
    state.caseId = null;
    state.view = null;
    state.support = null;
    state.billing = null;
    state.entitlement = null; state.payment = null; state.upgrade_credit = null; state.upgrade_quotes = null;
    state.upgrade_confirmation = null;
    rememberPendingCheckout({});
    state.step = 0;
    state.notice = 'Account deleted, along with every case and stored file.';
  });
}

/* ------------------------------------------------------------------ step 6: support reference */

function supportSummaryText(data) {
  const jurisdiction = (data.jurisdiction || []).map((j) => `${j.country}-${j.region}`).join(', ') || 'none';
  return [
    `Reference: ${data.reference}`,
    `Build: ${data.build_id}`,
    `Stage: ${data.category}`,
    `Jurisdiction: ${jurisdiction}`,
    `Cases: ${data.case_count}; stored documents: ${data.file_count}; results: ${data.result_count}`
  ].join('\n');
}

let supportSeq = 0;

function renderSupport(panel) {
  if (!state.account) {
    panel.innerHTML = `${notices()}<h1>Support</h1><p class="lede">Sign in to see your support reference. It belongs to your account.</p>`;
    return;
  }
  panel.innerHTML = `
    <h1>Support</h1>
    <p class="lede">A support reference identifies the build you ran and the step you reached, without exposing your report. It needs no open case or upload.</p>
    ${notices()}
    <div class="obs" id="supportInfo">Loading your support reference…</div>
    <div class="note">Copying the summary does not send a message and does not submit a support request. Share it through a channel you already use.</div>`;

  const accountId = state.account.account_id;
  const seq = ++supportSeq;

  api('GET', '/api/support').then((data) => {
    if (state.step !== STEP.SUPPORT || !state.account || state.account.account_id !== accountId || seq !== supportSeq) return;
    const box = el('supportInfo');
    if (!box) return;
    const summary = supportSummaryText(data);
    state.support = { reference: data.reference, summary, account_id: accountId };
    box.innerHTML = `
      <h3>Your support reference</h3>
      <p class="evidence">Reference: <b id="supportReference">${esc(data.reference)}</b></p>
      <p class="evidence">Build: <b>${esc(data.build_id)}</b> · Stage: <b>${esc(data.category)}</b></p>
      <p class="evidence">${esc(data.plain)}</p>
      <p class="evidence">Redacted summary:</p>
      <textarea id="supportSummary" rows="6" readonly aria-label="Redacted support summary">${esc(summary)}</textarea>
      <div class="row">
        <button class="primary" id="copyReference">Copy reference</button>
        <button class="primary" id="copySummary">Copy summary</button>
        <button class="secondary" id="retrySupport">Retry</button>
      </div>
      <p class="evidence" id="copyStatus"></p>`;

    const setStatus = (text, isError) => {
      const s = el('copyStatus');
      if (s) { s.textContent = text; s.className = 'evidence' + (isError ? ' stop' : ''); }
    };
    const selectSummary = () => {
      const ta = el('supportSummary');
      if (ta && ta.select) { ta.select(); if (ta.focus) ta.focus(); }
    };
    const doCopy = async (text, label) => {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
          setStatus(`${label} copied. It was not sent anywhere.`, false);
          return;
        }
        selectSummary();
        setStatus('Copying was not available in this browser. The summary below is selected — press Ctrl+C (or Cmd+C) to copy it.', true);
      } catch {
        selectSummary();
        setStatus('Copying was not available in this browser. The summary below is selected — press Ctrl+C (or Cmd+C) to copy it.', true);
      }
    };
    el('copyReference').onclick = () => doCopy(data.reference, 'Reference');
    el('copySummary').onclick = () => doCopy(summary, 'Summary');
    el('retrySupport').onclick = () => renderSupport(panel);
  }).catch(() => {
    if (state.step !== STEP.SUPPORT || !state.account || state.account.account_id !== accountId || seq !== supportSeq) return;
    const box = el('supportInfo');
    if (!box) return;
    box.innerHTML = `<div class="note stop">Your support reference could not be loaded.</div><button class="secondary" id="retrySupport">Try again</button>`;
    const retry = el('retrySupport');
    if (retry) retry.onclick = () => renderSupport(panel);
  });
}

/* ------------------------------------------------------------------ step 7: billing */

let billingSeq = 0;

function intervalLabel(interval) {
  if (interval === 'one_time') return 'one-time purchase';
  if (interval === 'month') return 'renews monthly';
  if (interval === 'year') return 'renews annually';
  return String(interval || '');
}

function renderBilling(panel) {
  if (!state.account) {
    panel.innerHTML = `${notices()}<h1>Plans</h1><p class="lede">Sign in to see your plan and upgrade credit.</p>`;
    return;
  }
  panel.innerHTML = `
    <h1>Your plan and upgrades</h1>
    <p class="lede">See what you have, what you can add and what you will pay.</p>
    ${notices()}
    <div class="obs" id="billingView">Loading your billing information…</div>`;

  const accountId = state.account.account_id;
  const seq = ++billingSeq;

  api('GET', '/api/billing/plans').then((data) => {
    if (state.step !== STEP.BILLING || !state.account || state.account.account_id !== accountId || seq !== billingSeq) return;
    renderBillingView(data);
  }).catch(() => {
    if (state.step !== STEP.BILLING || !state.account || state.account.account_id !== accountId || seq !== billingSeq) return;
    const box = el('billingView');
    if (!box) return;
    box.innerHTML = `<div class="note stop">Your billing information could not be loaded.</div><button class="secondary" id="retryBilling">Try again</button>`;
    const retry = el('retryBilling');
    if (retry) retry.onclick = () => renderBilling(panel);
  });
}

function renderBillingView(data) {
  const box = el('billingView');
  if (!box) return;
  const ent = data.entitlement || {};
  const pay = data.payment || {};
  const credit = data.upgrade_credit || {};
  const plansList = (data.plan_catalog && data.plan_catalog.plans) || [];
  state.billing = data;
  state.entitlement = data.entitlement || null;
  state.payment = data.payment || null;
  state.upgrade_credit = data.upgrade_credit || null;
  state.upgrade_quotes = data.upgrade_quotes || null;
  rememberPendingCheckout(data);

  const accessLine = ent.entitled
    ? `Your plan: <b>${esc(planName(ent.plan_code))}</b>${ent.expires_at ? `, active until ${esc(readableDate(ent.expires_at))}` : ''}.`
    : 'You have no active paid plan. You can still read and delete your saved files.';

  const renewalLine = ent.access_via === 'ONE_TIME_CREDIT'
    ? 'This purchase is one-time. It does not renew, and no recurring payment will be taken.'
    : ent.access_via === 'SUBSCRIPTION'
      ? (ent.cancel_at_period_end
        ? 'Renewal is cancelled. Access continues until your recorded expiry.'
        : `Your subscription renews automatically ${ent.plan_code === 'annual' ? 'each year' : 'each month'} until you cancel.`)
      : 'You have no renewing subscription.';

  const cancelBlock = ent.entitled && ent.access_via === 'SUBSCRIPTION'
    ? (ent.cancel_at_period_end
      ? '<p class="evidence">Renewal is already cancelled. Access continues to the recorded expiry, and what you have made stays readable.</p>'
      : '<button class="secondary" id="cancelEntitlement">Cancel renewal</button><p class="evidence" id="cancelStatus"></p>')
    : '';

  const creditLine = credit.eligible
    ? `You have <b>${esc(money(credit.credit_cents, credit.currency))}</b> from unused lower-plan payments. We apply your credit when you upgrade.`
    : credit.reserved_now ? 'Your upgrade credit is held for your open checkout. Finish or cancel that checkout before starting another.'
      : 'Every unused payment for a lower plan counts toward an upgrade.';

  const checkingPayment = currentReportPaymentPending();
  const planCards = checkingPayment ? '' : plansList.map((p) => {
    const quote = upgradeQuote(p.plan_code);
    const current = quote ? quote.is_current : ent.entitled && ent.access_via === 'SUBSCRIPTION' && ent.plan_code === p.plan_code;
    const allowed = canChoosePlan(p.plan_code);
    return `<article class="plan-card${current ? ' current-plan' : ''}">
      <span class="pill">${current ? 'CURRENT PLAN' : p.plan_code === 'report_once' ? 'ONE REPORT' : 'SUBSCRIPTION'}</span>
      <h3>${esc(planName(p.plan_code))}</h3>
      <p class="plan-price">${esc(allowed && quote ? money(quote.first_invoice_cents, quote.currency) : p.amount_display)}${allowed && quote ? '<small>today</small>' : ''}</p>
      <p class="evidence">${esc(intervalLabel(p.interval))}</p>
      <p>${p.plan_code === 'report_once' ? 'Full results and a PDF for one report. No dispute packet.' : 'Full results, print and mail dispute packets, saved reports and comparisons.'}</p>
      ${allowed ? priceDetails(p.plan_code) : `<p class="evidence">${current ? 'This is your current subscription.' : quote?.reason === 'CHECKOUT_ALREADY_IN_PROGRESS' ? 'Finish your open checkout before choosing another plan.' : 'Included in your current subscription.'}</p>`}
      ${allowed ? `<button class="${p.plan_code === 'report_once' ? 'secondary' : 'primary'}" id="checkout-${esc(p.plan_code)}">${ent.entitled && ent.access_via === 'SUBSCRIPTION' ? 'Review' : ent.entitled && p.plan_code !== 'report_once' ? 'Upgrade to' : 'Choose'} ${p.plan_code === 'report_once' ? 'one report' : p.plan_code === 'annual' ? 'yearly' : 'monthly'}${ent.entitled && ent.access_via === 'SUBSCRIPTION' ? ' upgrade' : ''}</button>` : ''}
    </article>`;
  }).join('');

  box.innerHTML = `
    <h3>Your access</h3>
    <p class="evidence">${accessLine}</p>
    <p class="evidence">${renewalLine}</p>
    ${cancelBlock}
    ${pendingPaymentBlock()}
    ${!ownedPendingCheckout() && Object.values(data.upgrade_quotes || {}).some(q => q.reason === 'CHECKOUT_ALREADY_IN_PROGRESS') ? '<div class="note" role="status">A checkout is already open. Your access changes after payment is confirmed.<br><button class="secondary" id="refresh-billing-payment">Check payment</button></div>' : ''}
    ${checkingPayment ? '' : upgradeConfirmationBlock()}
    ${subscriptionBenefits('Keep going with a subscription')}
    ${checkingPayment ? '' : `<div class="upgrade-offer"><h3>Your earlier payments count</h3><p class="upgrade-credit-total">${creditLine}</p><p>Pay only the difference today. Credit never changes your regular renewal price.</p></div><h3>Plans and prices</h3>
    <p class="evidence">Prices are in CAD. A one-time purchase does not renew. Cancelling a subscription stops the next charge. Your access lasts until the date shown above.</p>
    <div class="purchase-plan-grid">${planCards}</div>`}
    <p class="evidence">${esc(paymentSentence(pay))}</p>
    ${checkingPayment ? '' : '<p class="evidence">Checkout confirms your final price before you pay.</p>'}`;

  for (const p of plansList) {
    const btn = el('checkout-' + p.plan_code);
    if (btn && canChoosePlan(p.plan_code)) btn.onclick = () => startCheckout(p.plan_code);
  }
  const confirming = state.upgrade_confirmation;
  const confirm = confirming && el('confirm-upgrade-' + confirming.plan_code);
  if (confirm) confirm.onclick = () => startCheckout(confirming.plan_code, true);
  const cancelUpgrade = el('cancel-upgrade');
  if (cancelUpgrade) cancelUpgrade.onclick = () => { state.upgrade_confirmation = null; renderBillingView(data); };
  const refreshPayment = el('refresh-billing-payment');
  if (refreshPayment) refreshPayment.onclick = () => run(async () => { await refreshAccess(); });
  wirePendingPayment();
  const cancel = el('cancelEntitlement');
  if (cancel) cancel.onclick = () => run(async () => {
    const result = await api('POST', '/api/entitlement/cancel', {});
    state.notice = result.plain || 'Cancellation recorded.';
  });
}

/* ------------------------------------------------------------------ bootstrap */

(async function start() {
  if (location.protocol === 'file:') { render(); el('email')?.focus(); return; }
  try {
    const data = await api('GET', '/api/jurisdictions');
    surface = data.surface;
    note(`jurisdiction surface loaded: ${surface.regions.length} regions`);
  } catch (err) {
    state.surfaceError = err.message;
  }
  try { state.publicPricing = (await api('GET', '/api/pricing')).plan_catalog || null; }
  catch { state.publicPricing = null; }
  try {
    const session = await api('GET', '/api/session');
    state.account = session.account;
    state.cases = (await api('GET', '/api/cases')).cases;
    await refreshAccess();
    state.step = 1;
    const returning = checkoutReturnContext();
    if (returning) await restoreCheckoutReport(returning);
  } catch {
    state.account = null;
  }
  el('activity').textContent = state.activity.join('\n');
  render();
  if (!state.account && (location.hash === '#create' || location.hash === '#signin')) {
    el('email')?.focus();
  }
})();
