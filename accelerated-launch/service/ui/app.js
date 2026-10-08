'use strict';
/* The private consumer UI for the local service. It renders PLAIN fields only: the API's audit-only
   `machine` payload is never read here, and no internal classification is ever shown. */

const STEP_VIEWS = Object.freeze({
  ACCOUNT: { label: 'Account', render: renderAccount }, JURISDICTION: { label: 'Upload report', render: renderJurisdiction },
  REPORT: { label: 'Your report', render: renderReport }, RESULTS: { label: 'Results', render: renderResults },
  REVIEW: { label: 'Print your packet', render: renderReview }, HISTORY: { label: 'Saved reports', render: renderHistory },
  CASE: { label: 'Privacy and deletion', render: renderCase }, SUPPORT: { label: 'Help', render: renderSupport },
  BILLING: { label: 'Billing', render: renderBilling }
});
const STEP_KEYS = Object.keys(STEP_VIEWS);
const STEPS = STEP_KEYS.map(key => STEP_VIEWS[key].label);
const STEP = Object.freeze(Object.fromEntries(STEP_KEYS.map((key, index) => [key, index])));
const state = {
  step: 0,
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
  const res = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined
  });
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
  el('stepcount').textContent = inJourney ? `Step ${state.step + 1} of 5` : 'Your tools';
  el('step-label').textContent = STEPS[state.step];
  el('bar').style.width = `${Math.min(state.step + 1, 5) / 5 * 100}%`;
  const progress = el('journey-progress');
  if (progress.setAttribute) { progress.setAttribute('aria-valuemax', '5'); progress.setAttribute('aria-valuenow', String(Math.min(state.step + 1, 5))); }
  progress.hidden = !inJourney;
}

function navigateStep(step) {
  if (state.step === STEP.REVIEW && packetLeave) return packetLeave(step);
  state.step = step; render();
}

function banner() {
  const node = el('support-banner');
  const inDemo = state.view && state.view.result && state.view.result.support === 'DEMONSTRATION_ONLY_NOT_REPORT_SUPPORT';
  if (inDemo) {
    node.className = 'banner demo';
    node.innerHTML = '<strong>INTERACTIVE DEMONSTRATION</strong> These results are examples, not results from your report. You cannot create a dispute packet from this sample.';
  } else {
    node.className = 'banner';
    node.innerHTML = surface && surface.preview_mode
      ? '<strong>Staging preview · test payments only.</strong> Use test cards and public samples, never real cards or private reports.'
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
    parts.push(`<strong>Upgrade credit:</strong> CAD ${(credit.credit_cents / 100).toFixed(2)} off your first monthly or yearly bill${credit.expires_at ? `, until ${esc(readableDate(credit.expires_at))}` : ''}.`);
  }
  return `<div class="note">${parts.join('<br>')}</div>`;
}

/** Refresh the account's access state after anything that could change it. */
async function refreshAccess() {
  try {
    const data = await api('GET', '/api/entitlement');
    if (data && data.entitlement) state.entitlement = data.entitlement;
    if (data && data.payment) state.payment = data.payment;
    if (data && data.upgrade_credit) state.upgrade_credit = data.upgrade_credit;
  } catch {
    state.entitlement = null;
    state.payment = null;
  }
  try {
    /* The purchase choices appear on the results step as well as in billing, so the catalogue is loaded once. */
    state.billing = await api('GET', '/api/billing/plans');
  } catch {
    state.billing = null;
  }
}

function notices() {
  const parts = [];
  if (state.error) parts.push(`<div class="note stop"><span class="err">Refused:</span> ${esc(state.error)}</div>`);
  if (state.notice) parts.push(`<div class="note">${esc(state.notice)}</div>`);
  if (state.checkoutReturn && state.account && (!state.caseId || state.checkoutReturn.caseId === state.caseId)) {
    const pending = state.checkoutReturn.status === 'pending';
    parts.push(`<div class="note${pending ? '' : ' stop'}">${pending ? 'Your payment has not been confirmed yet. Check again before starting another checkout.' : 'We could not open your saved report. Try again, or select a saved report below.'}<br><button class="secondary" id="checkout-return-retry">${pending ? 'Check payment' : 'Try again'}</button></div>`);
  }
  return parts.join('');
}

function render() {
  renderSequence++;
  packetLeave = null;
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

function renderAccount(panel) {
  if (state.account) { renderAccountDetails(panel); return; }
  if (state.recoveryMode) { renderRecovery(panel); return; }
  panel.innerHTML = `
    <h1>Your account</h1>
    <p class="lede">Create an account to upload your report. Already have an account? Sign in.</p>
    ${firstVisitPlans()}
    ${notices()}
    <div class="row">
      <div>
        <label for="email">Email address</label>
        <input id="email" type="email" autocomplete="username" placeholder="you@example.com">
      </div>
      <div>
        <label for="password">Password (at least 12 characters)</label>
        <input id="password" type="password" autocomplete="new-password">
      </div>
    </div>
    <button class="primary" id="create">Create account</button>
    <button class="secondary" id="signin">Sign in</button>
    <p><button class="text-button" id="forgot-password">Forgot your password?</button></p>
    `;

  const credentials = () => ({ email: el('email').value, password: el('password').value });
  el('create').onclick = () => run(async () => {
    accountEpoch++;
    const data = await api('POST', '/api/accounts', credentials());
    state.account = data.account;
    state.accountProfile = null; state.accountDocuments = [];
    state.accountSecurity = null; state.packetReturn = null; state.recoveryKey = data.recovery_key || null;
    state.checkoutReturn = null;
    await refreshAccess();
    state.step = 1;
    state.notice = 'Account created and signed in.';
  });
  el('signin').onclick = () => run(async () => {
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

function firstVisitPlans() {
  const plans = state.publicPricing?.plans || [];
  const price = code => esc(plans.find(plan => plan.plan_code === code)?.amount_display || 'Price unavailable');
  return `<section class="first-visit-plans" aria-label="Plans and prices"><h2>Choose after you see your free summary</h2>
    <div class="plan-grid"><div><h3>Free</h3><p>Upload your report. See the issue count and one issue, if we find one.</p></div>
    <div><h3>One report — ${price('report_once')}</h3><p>See all issues and download the full assessment for that report. No dispute packet. No renewal.</p></div>
    <div><h3>Subscription</h3><p>Full assessments, dispute packets and report comparisons.</p><p>Monthly: ${price('monthly')}<br>Yearly: ${price('annual')}</p><p>Renews until you cancel.</p></div></div>
    <p class="evidence">Prices are in CAD. You choose a plan before paying.</p></section>`;
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
  panel.innerHTML = `<h1>Reset your password</h1><p class="lede">Use the recovery key you saved when you created your account.</p>${notices()}
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
const ACCOUNT_CONTACT_LIMITS = { full_name: 200, date_of_birth: 10, phone: 50, contact_email: 254, address_line1: 250, address_line2: 250, city: 120, region: 120, postal_code: 32, country: 80, previous_address: 500 };
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
let accountDetailsSequence = 0;
function renderAccountDetails(panel) {
  const accountId = state.account.account_id, sequence = ++accountDetailsSequence;
  if (!state.accountProfile) {
    panel.innerHTML = `${notices()}<h1>Your account</h1><p>Loading your details…</p>`;
    Promise.all([api('GET', '/api/account/profile'), api('GET', '/api/account/documents'), api('GET', '/api/account/security')]).then(([profile, documents, security]) => {
      if (state.step !== 0 || state.account?.account_id !== accountId || sequence !== accountDetailsSequence) return;
      if (!profile.profile || !Array.isArray(documents.documents)) throw new Error('Your account details could not be loaded. Try again.');
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
    <button class="primary" id="account-save">Save contact details</button>
    <h2>Documents for disputes</h2><p class="evidence">Upload copies of your ID and proof of address. Include both sides of an ID in one PDF where required. Choose what to include when you review a packet.</p>
    <div class="row"><div><label for="account-document-type">Purpose</label><select id="account-document-type"><option value="IDENTITY">Identification</option><option value="ADDRESS">Proof of address</option><option value="SUPPORTING">Other supporting document</option></select></div>
    <div><label for="account-document-kind">Document</label><select id="account-document-kind">${Object.entries(DOCUMENT_KIND_LABELS).sort((a, b) => Number(a[0] === '1099') - Number(b[0] === '1099')).map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}</select></div></div>
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
  for (const [field] of ACCOUNT_CONTACT_FIELDS) el('account-' + field).oninput = () => { accountOperationSequence++; state.accountProfile[field] = el('account-' + field).value; };
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
    state.step = answer.view.result_id === returning.resultId ? STEP.REVIEW : STEP.RESULTS;
    state.notice = state.step === STEP.REVIEW ? 'Your saved packet is ready. Review your updated details.' : 'Your report has a newer result. Review it before preparing a packet.';
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
    state.support = null;
    state.billing = null;
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
        ? `We found ${total} reporting issue${total === 1 ? '' : 's'} in the information we could review. See the summary and the one we show you, then unlock the rest if you want it.`
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
    ${files.length ? files.map(fileCard).join('') : '<p class="lede">No file has been uploaded for this case yet.</p>'}
    <h2>Try a sample report</h2>
    <p class="lede">These results are examples, not results from your report.</p>
    <label for="scenario">Sample</label>
    <select id="scenario">${(view.demonstration_scenarios || []).map((s) => `<option value="${esc(s)}">${esc(s)}</option>`).join('')}</select>
    <button class="secondary" id="demo">Try the sample</button>`;

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

  el('demo').onclick = () => run(async () => {
    const data = await api('POST', `/api/cases/${state.caseId}/demonstration`, { scenario: el('scenario').value });
    state.view = (await api('GET', `/api/cases/${state.caseId}`)).view;
    state.step = 3;
    state.notice = `${data.label}. Nothing here counts as report support.`;
  });

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
    state.step = data.view.assessment_summary || data.view.result ? STEP.RESULTS : STEP.REPORT;
    const confirmed = context.planCode === 'report_once' ? data.view.assessment_access?.complete_assessment : data.view.assessment_access?.dispute_packet;
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
function startCheckout(planCode) {
  return run(async () => {
    if (state.checkoutReturn?.status === 'pending' && state.checkoutReturn.caseId === state.caseId) throw new Error('Select Check payment before starting another checkout.');
    const base = typeof location !== 'undefined' && location.origin ? location.origin + '/' : 'http://127.0.0.1/';
    const context = state.caseId && state.view?.case?.case_id === state.caseId
      ? `?checkout=return&report=${encodeURIComponent(state.caseId)}&plan=${encodeURIComponent(planCode)}` : '';
    const body = { plan_code: planCode, return_url: base + context };
    if (planCode === 'report_once' && state.caseId) body.case_id = state.caseId;
    let opened;
    try {
      opened = await api('POST', '/api/billing/checkout', body);
    } catch (err) {
      /* The server refuses a one-time unlock with no eligible report, and refreshes the screen when the report is
         already unlocked, so the consumer sees their results instead of another purchase. */
      if (err && err.code === 'REPORT_ALREADY_UNLOCKED' && state.caseId) {
        state.view = (await api('GET', '/api/cases/' + state.caseId)).view;
        state.step = STEP.RESULTS;
      }
      throw err;
    }
    state.notice = 'Checkout opened. We will check your payment when you return.';
    if (opened.checkout && /^https:\/\/checkout\.stripe\.com\//.test(opened.checkout.redirect_url || '')) location.assign(opened.checkout.redirect_url);
  });
}

/**
 * The free view of a completed assessment: how many distinct issues were found, how they split across the three
 * categories, and ONE limited teaser. The complete details, the evidence and the download follow a purchase.
 */
function freeSummaryBlock(view) {
  const summary = view.assessment_summary || {};
  const teaser = summary.teaser || null;
  const total = Number(summary.distinct_total || 0);
  const counts = total > 0
    ? `<p class="evidence">Reporting issues found: <b>${total}</b></p>`
    : '<p class="evidence">We did not find a reporting issue in the information we could review.</p>';
  const preview = teaser
    ? `<div class="obs">
      ${teaser.confidence_label === 'VIOLATION' ? '<span class="pill">VIOLATION</span>' : ''}
      <h3>${esc(teaser.title || '')}</h3>
      <p>${esc(teaser.explanation || '')}</p>
      <p class="evidence">One issue is previewed here. The complete assessment, the report facts and the next steps for every issue are part of the unlock or a subscription.</p>
    </div>`
    : '';
  return `<div class="obs">
    <span class="pill">SUMMARY — FREE</span>
    <h3>What we found</h3>
    ${assessmentDateLine(summary)}
    ${counts}
    ${preview}
  </div>
  ${state.checkoutReturn?.status === 'pending' && state.checkoutReturn.caseId === state.caseId ? '' : `<div class="obs">
    <span class="pill">UNLOCK THE REST</span>
    <h3>Choose what you want next</h3>
    <p class="evidence">Nothing renews unless you choose a subscription. Prices are in CAD and shown before you buy.</p>
    <button class="primary" id="buy-report_once">Unlock this report — ${esc(planPrice('report_once'))}</button>
    <button class="secondary" id="buy-monthly">Monthly — ${esc(planPrice('monthly'))}</button>
    <button class="secondary" id="buy-annual">Annual — ${esc(planPrice('annual'))}</button>
    <p class="evidence">Unlocking this report gives you every reporting issue found, the report facts and explanations behind them, the next steps that apply, and the assessment download for that report. Dispute packets, report history and comparison are part of a subscription.</p>
  </div>`}`;
}

/** A one-time unlocked report: the complete findings, the download, and the subscriber note. */
function oneTimeNextStepsBlock() {
  return `<div class="obs">
    <span class="pill">UNLOCKED REPORT</span>
    <h3>Next steps for this report</h3>
    <p class="evidence">This unlock covers this report. Dispute packets, report history and subsequent-report comparison are part of a subscription.</p>
    <button class="primary" id="download-assessment">Download my assessment</button>
    <button class="secondary" id="go-subscribe">See subscription plans</button>
  </div>`;
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
    <button class="${summary ? 'secondary' : 'primary'}" id="evaluate">${summary ? 'Check this report again' : 'Check my report'}</button>
    ${summary
      ? (access.complete_assessment && result ? resultBlock(result, demo) : freeSummaryBlock(view))
      : '<div class="note">Your report has not been checked yet. Select Check my report.</div>'}
    ${summary && access.complete_assessment && result && !demo
      ? (access.dispute_packet ? `${clarificationBlock(view)}${(result.issues || []).some(issue => issue.eligible) ? '<button class="primary" id="create-packet">Create my dispute packet</button>' : ''}<button class="secondary" id="download-assessment">Download my assessment</button>` : oneTimeNextStepsBlock())
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
  if (packet) packet.onclick = () => navigateStep(STEP.REVIEW);

  wireResultSelector(panel, view);
  wireClarification(panel, view);
}

function resultBlock(result, demo) {
  if (!demo) {
    const checklist = (result.common_error_checklist || []).map((item) =>
      `<li>${esc(item.label)}</li>`).join('');
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
  const cards = issues.map((i) => `
    <div class="obs issue">
      <span class="pill potential">${issueLabel(i)}</span>
      ${i.account_identity && i.account_identity.name ? `<p class="evidence">Account: <b>${esc(i.account_identity.name)}</b></p>` : ''}
      <h3>${esc(i.explanation)}</h3>
      <p class="evidence">Why it merits attention: ${esc(i.uncertainty)}</p>
      ${i.limitation && i.limitation.assessed_on ? `<p class="evidence">Assessed on <b>${esc(i.limitation.assessed_on)}</b>${i.limitation.assessment_clock_basis ? ` (${esc(i.limitation.assessment_clock_basis)})` : ''}${i.limitation.report_date ? ` · the report itself is dated <b>${esc(i.limitation.report_date)}</b>` : ''}.</p>` : ''}
      ${i.retention_review ? `<p class="evidence">${i.retention_review.report_issued ? `Report issued: <b>${esc(i.retention_review.report_issued)}</b> · ` : 'Report issued: <b>not stated</b> · '}Assessed on: <b>${esc(i.retention_review.assessed_on || '')}</b> · the reporting period appears to end ${i.retention_review.period_appears_to_end_from ? `somewhere between <b>${esc(i.retention_review.period_appears_to_end_from)}</b> and <b>${esc(i.retention_review.period_appears_to_end_on)}</b>` : `<b>${esc(i.retention_review.period_appears_to_end_on || '')}</b>`}${i.retention_review.arose_through_later_passage_of_time ? ' · this arose through the passage of time since your report was issued' : ''}.</p>` : ''}
      ${i.source_location ? `<p class="evidence">Your report, ${i.source_location.section ? esc(i.source_location.section) + ', ' : ''}page <b>${esc(i.source_location.page)}</b>${i.source_location.line != null ? `, line <b>${esc(i.source_location.line)}</b>` : ''}${i.account_number_in_report != null ? `, account <b>${esc(i.account_number_in_report)}</b>` : ''}.</p>` : ''}
      ${i.rule_assessment ? `<p class="evidence">${esc(i.rule_assessment.requirement)}${i.citation ? ` Supporting statute: ${esc(i.citation)}.` : ''}</p>` : i.retention_review || i.limitation_concern ? '' : '<p class="evidence">A factual discrepancy like this supports a verification request.</p>'}
    </div>`).join('');
  return issues.length ? `<h2>Reporting issues for your review</h2>${cards}` : '<p class="lede">We did not find a reporting issue in the information we could review.</p>';
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
      <h1>Review and download</h1>
      <p class="lede">Dispute packets are part of a subscription.</p>
      ${notices()}
      <div class="note">A one-time purchase includes the full assessment and its download. A subscription also includes dispute packets.</div>
      <button class="primary" id="go-billing">See subscription plans</button>`;
    el('go-billing').onclick = () => run(async () => { state.step = STEP.BILLING; });
    return;
  }
  const result = view.result;
  panel.innerHTML = `
    <h1>Review and download</h1>
    <p class="lede">Choose your issues. Save and review your packet. Approve it, then print it and mail it to the bureau.</p>
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
  return issue && issue.consumer_label === 'VIOLATION' ? 'VIOLATION' : 'Verification request';
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
  return `<h3>Prepare for the bureau</h3>
    <div class="row"><div><label for="packet-bureau">Bureau</label><select id="packet-bureau"><option value="">Choose bureau</option>${(view.catalog || []).map(row => `<option value="${row.id}" ${row.id === bureau ? 'selected' : ''}>${esc(row.label)}</option>`).join('')}</select></div>
    <div><label for="packet-purpose">What you are correcting</label><select id="packet-purpose">${[['ACCOUNT', 'Account information'], ['PUBLIC_RECORD', 'Collections or public records'], ['PERSONAL', 'Personal information'], ['NEW_ADDRESS', 'Add a new address']].map(([value, label]) => `<option value="${value}" ${(settings.purpose || view.suggested_purpose || 'ACCOUNT') === value ? 'selected' : ''}>${label}</option>`).join('')}</select></div></div>
    <p class="evidence">Your saved contact details are included. <button class="secondary" id="packet-account-details">Add contact details or documents</button></p>
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
    <label for="packet-other-identity">Other identification details requested by the bureau (optional)</label><textarea id="packet-other-identity" maxlength="500">${esc(settings.other_identity_details || '')}</textarea>`;
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
    <h2>Correction packet</h2>
    <p class="evidence">Choose the issues you want the bureau to check or correct.</p>
    ${rows}
    <h3>Where to mail your letter</h3>
    <p class="evidence">Check the bureau address. Choose the documents you will mail with your letter.</p>
    ${packetSupportingDocuments(pv)}
    <div class="row">
      <label for="packet-name">Your name (as the sender)</label>
      <input id="packet-name" readonly value="${esc(correspondence.consumer_name || '')}">
      <label for="packet-contact">Where the reply should go</label>
      <textarea id="packet-contact" readonly>${esc(correspondence.contact || '')}</textarea>
      <label for="packet-reference">Your own reference (optional)</label>
      <input id="packet-reference" value="${esc(correspondence.account_reference || '')}">
    </div>
    ${missing.length ? `<p class="note stop">Add ${missing.map(correspondenceFieldLabel).join(' and ')} before you approve the letter.</p>` : ''}
    <label for="packet-wording">Your own words (optional)</label>
    <textarea id="packet-wording" placeholder="Add anything else you want the bureau to know.">${esc(packet.wording || '')}</textarea>
    <div class="row">
      <button class="primary" id="packet-save">Save and review packet</button>
    </div>
    ${packet.approved ? '<p class="evidence">Your packet is approved.</p>' : ''}
    ${packet.approval_stale ? '<p class="note stop">The packet changed since approval; review and approve it again.</p>' : ''}
    <div class="packet-review">
      <h3>Read your full packet</h3>
      <p class="evidence" id="packet-preview-status">${packet.selected_count && packet.correspondence_preview ? 'Read the letter and report facts below. Check your chosen documents too.' : 'Choose at least one issue, then select Save and review packet.'}</p>
      <pre id="packet-preview">${esc(packet.correspondence_preview || 'Choose at least one issue to see the letter and report facts.')}</pre>
      <label><input id="packet-preview-reviewed" type="checkbox" ${packet.approved ? 'checked' : ''} ${packet.selected_count && packet.correspondence_preview ? '' : 'disabled'}>I have read this packet and checked its attachments</label>
      <button class="primary" id="packet-approve" disabled>Approve this version</button>
      <button class="secondary" id="packet-print" ${(packet.print_available ?? packet.download_available) ? '' : 'disabled'}>Print letter and evidence</button>
      <button class="secondary" id="packet-download" ${packet.download_available ? '' : 'disabled'}>Download correction packet</button>
      ${packet.download_available ? '<p class="note">Your packet is ready. Download it to get the letter, forms and selected document copies. Print all of them. Fill in the forms and sign where shown. Mail everything to the bureau address above. Keep a copy for yourself.</p>' : ''}
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
  } catch {
    try { ensureOrigin(); } catch { return; }
    block.innerHTML = '<p class="note stop">We could not load your packet. Try again.</p><button class="secondary" id="packet-retry">Try again</button>';
    const retry = el('packet-retry');
    if (retry) retry.onclick = () => { try { ensureOrigin(); } catch { return; } retry.disabled = true; return wirePacket(panel); };
    return;
  }
  try { ensureOrigin(); } catch { return; }
  block.innerHTML = renderPacketBlock(pv);
  if (!(pv.eligible_issues || []).some(issue => issue.eligible)) return;

  /* The current visible selection and wording, captured at action time so a save or an approve can never
     silently use an older saved version while the consumer sees a changed one. */
  const currentSelection = () => [...panel.querySelectorAll('[data-check-issue]:checked')].map((n) => n.getAttribute('data-check-issue'));
  const currentWording = () => el('packet-wording') ? el('packet-wording').value : '';
  const currentCorrespondence = () => ({
    consumer_name: el('packet-name') ? el('packet-name').value : '',
    contact: el('packet-contact') ? el('packet-contact').value : '',
    account_reference: el('packet-reference') ? el('packet-reference').value : ''
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
      other_identity_details: el('packet-other-identity').value,
      document_dates: Object.fromEntries(document_ids.map(id => [id, el('packet-document-date-' + id).value])) };
  };
  let edits = 0;
  let previewCurrent = Boolean(pv.packet?.selected_count && pv.packet?.correspondence_preview);
  const persistSelection = async () => {
    ensureOrigin();
    const captured = edits, payloads = [
      ['select', { issue_ids: currentSelection() }], ['correspondence', { correspondence: currentCorrespondence() }],
      ['wording', { wording: currentWording() }], ...(pv.support?.catalog?.length ? [['support', { support: currentSupport() }]] : [])
    ];
    const ensureCurrent = () => { ensureOrigin(); if (edits !== captured) throw cancelledAction(); };
    for (const [action, body] of payloads) {
      ensureCurrent(); await api('POST', `/api/cases/${caseId}/packet/${action}`, body); ensureCurrent();
    }
    return ensureCurrent;
  };

  const save = el('packet-save');
  if (save) save.onclick = () => run(async () => {
    const ensureCurrent = await persistSelection();
    const answer = await api('GET', `/api/cases/${caseId}`); ensureCurrent(); state.view = answer.view;
    state.notice = 'Packet saved. Read the full packet and check its attachments before approving.';
  });

  const approve = el('packet-approve');
  if (approve) approve.onclick = () => run(async () => {
    ensureOrigin();
    if (!previewCurrent || edits || !el('packet-preview-reviewed').checked) throw new Error('Save and read the current packet before approving it.');
    const captured = edits, ensureCurrent = () => { ensureOrigin(); if (captured !== edits || !previewCurrent) throw cancelledAction(); };
    await api('POST', `/api/cases/${caseId}/packet/approve`, { reviewed_version: pv.packet.preview_version }); ensureCurrent();
    const answer = await api('GET', `/api/cases/${caseId}`); ensureCurrent(); state.view = answer.view;
    state.notice = 'Packet approved. Download it. Print the letter, forms and selected copies before mailing.';
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
    for (const id of ['packet-download', 'packet-print', 'packet-approve', 'packet-preview-reviewed']) if (el(id)) el(id).disabled = true;
    if (reviewed) reviewed.checked = false;
    if (el('packet-preview-status')) el('packet-preview-status').textContent = 'Your packet changed. Select Save and review packet to read the new version.';
    if (el('packet-preview')) el('packet-preview').textContent = 'Save and review your changes before approving.';
  };
  const wording = el('packet-wording');
  if (wording) wording.oninput = markChanged;
  for (const node of panel.querySelectorAll('[data-check-issue]')) node.onchange = markChanged;
  for (const id of ['packet-name', 'packet-contact', 'packet-reference']) {
    const input = el(id);
    if (input) input.oninput = markChanged;
  }
  const accountDetails = el('packet-account-details');
  packetLeave = step => run(async () => {
    const ensureCurrent = await persistSelection(); ensureCurrent();
    if (step === STEP.ACCOUNT) {
      state.packetReturn = { accountId: state.account.account_id, epoch: accountEpoch, caseId, resultId: pv.packet.result_id || state.view.result_id };
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
    if (f.privacy_redacted) return `<span class="evidence">Creditor identity matched from the report.</span>`;
    if (f.definition_source) {
      const source = f.definition_source;
      return `<span class="evidence">${source.kind === 'HISTORY_PERIOD' ? 'What the payment period means' : 'What the payment code means'}: ${esc(readableFactLabel(f.source_field))} — <b>${esc(f.normalized_value)}</b>. ${esc(source.publisher)}, ${esc(source.title)}, ${esc(source.section)}: ${esc(source.url)}</span>`;
    }
    return `<span class="evidence">${esc(readableFactLabel(f.source_field))}: printed <b>${esc(f.raw_value)}</b>${f.normalized_value != null ? ` → read as <b>${esc(f.normalized_value)}</b>` : ''}</span>`;
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
    if (state.step !== 5 || !state.account || state.account.account_id !== accountId || !el('history-body')) return;
    const rows = data.assessments || [];
    const list = rows.length
      ? `<ul class="plain">${rows.map((r) => `<li>${esc(historyOption(r))} · ${esc(r.jurisdiction || '')} · ${esc(String(r.issue_count))} issue(s) <span class="evidence">assessment recorded ${esc(String(r.recorded_at || '').slice(0, 10))}</span></li>`).join('')}</ul>`
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
    if (state.step !== 6 || state.caseId !== privacyCase || !state.account || state.account.account_id !== privacyAccount) return;
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
    await api('DELETE', '/api/account');
    state.account = null;
    state.accountProfile = null; state.accountDocuments = [];
    state.cases = [];
    state.caseId = null;
    state.view = null;
    state.support = null;
    state.billing = null;
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
    if (state.step !== 7 || !state.account || state.account.account_id !== accountId || seq !== supportSeq) return;
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
    if (state.step !== 7 || !state.account || state.account.account_id !== accountId || seq !== supportSeq) return;
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
    panel.innerHTML = `${notices()}<h1>Billing</h1><p class="lede">Sign in to see your billing information. It belongs to your account.</p>`;
    return;
  }
  panel.innerHTML = `
    <h1>Billing</h1>
    <p class="lede">See your plan and prices. You can cancel your subscription renewal here.</p>
    ${notices()}
    <div class="obs" id="billingView">Loading your billing information…</div>`;

  const accountId = state.account.account_id;
  const seq = ++billingSeq;

  api('GET', '/api/billing/plans').then((data) => {
    if (state.step !== 8 || !state.account || state.account.account_id !== accountId || seq !== billingSeq) return;
    renderBillingView(data);
  }).catch(() => {
    if (state.step !== 8 || !state.account || state.account.account_id !== accountId || seq !== billingSeq) return;
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
    ? `You can save <b>CAD ${(credit.credit_cents / 100).toFixed(2)}</b> on your first subscription bill${credit.expires_at ? `, until ${esc(readableDate(credit.expires_at))}` : ''}.`
    : 'No upgrade credit is currently available.';

  const checkingPayment = state.checkoutReturn?.status === 'pending' && state.checkoutReturn.caseId === state.caseId;
  const planCards = checkingPayment ? '' : plansList.map((p) => `
    <div class="obs">
      <span class="pill">${esc(p.label)}</span>
      <h3>${esc(p.amount_display)} — ${esc(intervalLabel(p.interval))}</h3>
      <p class="evidence">${p.plan_code === 'report_once' ? 'Full assessment and download for one report. No dispute packet.' : 'Full assessments, dispute packets and report comparisons.'}</p>
      <button class="secondary" id="checkout-${esc(p.plan_code)}">Start checkout</button>
    </div>`).join('');

  box.innerHTML = `
    <h3>Your access</h3>
    <p class="evidence">${accessLine}</p>
    <p class="evidence">${renewalLine}</p>
    ${cancelBlock}
    ${checkingPayment ? '' : `<h3>Plans and prices</h3>
    <p class="evidence">Prices are in CAD. A one-time purchase does not renew. A subscription renews until you cancel it. Cancelling stops the next charge. Your access lasts until the date shown above.</p>
    ${planCards}`}
    <p class="evidence">${esc(paymentSentence(pay))}</p>
    <h3>Upgrade credit</h3>
    <p class="evidence">${creditLine}</p>`;

  for (const p of plansList) {
    const btn = el('checkout-' + p.plan_code);
    if (btn) btn.onclick = () => startCheckout(p.plan_code);
  }
  const cancel = el('cancelEntitlement');
  if (cancel) cancel.onclick = () => run(async () => {
    const result = await api('POST', '/api/entitlement/cancel', {});
    state.notice = result.plain || 'Cancellation recorded.';
  });
}

/* ------------------------------------------------------------------ bootstrap */

(async function start() {
  try {
    const data = await api('GET', '/api/jurisdictions');
    surface = data.surface;
    note(`jurisdiction surface loaded: ${surface.regions.length} regions`);
  } catch (err) {
    state.error = err.message;
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
})();
