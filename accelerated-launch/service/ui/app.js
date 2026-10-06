'use strict';
/* The private consumer UI for the local service. It renders PLAIN fields only: the API's audit-only
   `machine` payload is never read here, and no internal classification is ever shown. */

const STEP_VIEWS = Object.freeze({
  ACCOUNT: { label: 'Account', render: renderAccount }, JURISDICTION: { label: 'Your jurisdiction', render: renderJurisdiction },
  REPORT: { label: 'Your report', render: renderReport }, RESULTS: { label: 'Results', render: renderResults },
  REVIEW: { label: 'Review and download', render: renderReview }, HISTORY: { label: 'Report history', render: renderHistory },
  CASE: { label: 'Case and deletion', render: renderCase }, SUPPORT: { label: 'Support', render: renderSupport },
  BILLING: { label: 'Billing', render: renderBilling }
});
const STEP_KEYS = Object.keys(STEP_VIEWS);
const STEPS = STEP_KEYS.map(key => STEP_VIEWS[key].label);
const STEP = Object.freeze(Object.fromEntries(STEP_KEYS.map((key, index) => [key, index])));
const state = {
  step: 0,
  account: null,
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
  /* The post-upload screen reports the case's actual state: an assessment in flight, the last refusal, or a
     missing purchase (which is a plan decision, not a failure). */
  assessing: false,
  assessment_error: null,
  purchase_needed: null
};
let surface = null;
let uploadLimits = null;
const uploadBatches = new Map();

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
    .catch((err) => { state.error = err.message; render(); });
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
  el('steps').innerHTML = STEPS.map((label, index) =>
    `<button data-step="${index}" aria-current="${index === state.step}"><span class="num">${index + 1}</span><span class="step-name">${esc(label)}</span></button>`).join('');
  for (const button of el('steps').querySelectorAll('button')) {
    button.onclick = () => { state.step = Number(button.dataset.step); render(); };
  }
  el('breadcrumb').textContent = STEPS[state.step];
  el('stepcount').textContent = `Step ${state.step + 1} of ${STEPS.length}`;
  el('step-label').textContent = STEPS[state.step];
  el('bar').style.width = `${(state.step + 1) / STEPS.length * 100}%`;
  const progress = el('journey-progress');
  if (progress.setAttribute) progress.setAttribute('aria-valuenow', String(state.step + 1));
}

function banner() {
  const node = el('support-banner');
  const inDemo = state.view && state.view.result && state.view.result.support === 'DEMONSTRATION_ONLY_NOT_REPORT_SUPPORT';
  if (inDemo) {
    node.className = 'banner demo';
    node.innerHTML = '<strong>INTERACTIVE DEMONSTRATION — NOT A CREDIT REPORT — NOT REPORT SUPPORT.</strong> ' +
      'The content below came from a synthetic model built in memory. It evidences no report format, it counts ' +
      'as nothing, and no response draft can follow from it.';
  } else {
    node.className = 'banner';
    node.innerHTML = surface && surface.preview_mode
      ? '<strong>Staging preview · test payments only.</strong> Use test cards and public samples, never real cards or private reports.'
      : '<strong>Preview build · not released for consumer use.</strong> Supported reports and limits are explained below. ' + esc(surface && surface.entitlement ? surface.entitlement.plain : 'Payment status is unavailable; no payment provider is connected until configuration is reported.');
  }
}

/**
 * B4: what this account may do, and what the payment capability actually is. Both come from the service, so the
 * page can never claim more access than the service will honour.
 */
function access() {
  const ent = state.entitlement || null;
  const pay = state.payment || null;
  const credit = state.upgrade_credit || null;
  const parts = [];
  if (ent) {
    parts.push(ent.entitled
      ? `<strong>Your access:</strong> active${ent.plan_code ? ` (${esc(ent.plan_code)})` : ''}${ent.expires_at ? `, until ${esc(ent.expires_at)}` : ''}.`
      : 'Choose a plan to check this report and create your dispute packet. You can still view or delete your uploaded file.');
  } else {
    parts.push('Access state is not reported by this build.');
  }
  parts.push(pay ? `<strong>Payment:</strong> ${esc(pay.plain)}` : 'Payment capability is not reported by this build.');
  /* A credit message appears only where it bears on a purchase decision (the billing view), never as a
     standing "not eligible" line on the report screen. */
  if (credit && credit.eligible) {
    parts.push(`<strong>Upgrade credit:</strong> CAD ${(credit.credit_cents / 100).toFixed(2)} off your first monthly or annual invoice${credit.expires_at ? `, expiring ${esc(credit.expires_at)}` : ''}.`);
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
  return parts.join('');
}

function render() {
  el('who').textContent = state.account ? `Signed in as ${state.account.email}` : 'Not signed in';
  banner();
  renderSteps();
  footerDisclaimer();
  const panel = el('panel');
  STEP_VIEWS[STEP_KEYS[state.step]].render(panel);
}

/* OWNER-CONSUMER-LANGUAGE-001 (footer-only): the legal-advice disclaimer is shown ONLY on the main page
   (step 0) and hidden on every other view — assessment/results, review/download, billing, privacy and support. */
function footerDisclaimer() {
  const node = el('footer-disclaimer');
  if (node) node.hidden = state.step !== 0;
}

/* ------------------------------------------------------------------ step 0: account */

function renderAccount(panel) {
  panel.innerHTML = `
    <h1>Your account</h1>
    <p class="lede">Your cases, files and results belong to this account only. Another account cannot read them,
    including by asking for them directly.</p>
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
    <button class="secondary" id="signout" ${state.account ? '' : 'disabled'}>Sign out</button>
    ${state.account ? access() : ''}
    <div class="note">No email is sent and no bureau is contacted in this build. Whether anything can be bought is
    decided by the service and reported above.</div>`;

  const credentials = () => ({ email: el('email').value, password: el('password').value });
  el('create').onclick = () => run(async () => {
    const data = await api('POST', '/api/accounts', credentials());
    state.account = data.account;
    await refreshAccess();
    state.step = 1;
    state.notice = 'Account created and signed in.';
  });
  el('signin').onclick = () => run(async () => {
    const data = await api('POST', '/api/sessions', credentials());
    state.account = data.account;
    await refreshAccess();
    state.step = 1;
    state.notice = 'Signed in.';
  });
  el('signout').onclick = () => run(async () => {
    await api('DELETE', '/api/sessions/current');
    state.account = null;
    state.cases = [];
    state.caseId = null;
    state.view = null;
    state.entitlement = null;
    state.payment = null;
    state.support = null;
    state.billing = null;
    state.step = 0;
    state.notice = 'Signed out. The session is destroyed, so the same session cannot be used again.';
  });
}

/* ------------------------------------------------------------------ step 1: jurisdiction */

/**
 * What this build can actually read and check for the selected region, stated BEFORE any upload. Plan
 * section 2: any limitation in a regional check must be visible before purchase and upload.
 */
function coverage(region) {
  if (!region) return '<div class="note">Pick a region to see what this build can read and check for it.</div>';
  const avail = region.availability || { state: 'UNKNOWN', plain: 'Availability for this region is not reported.' };
  const checks = region.executable_checks || 0;
  const families = (region.supported_format_families || []).join(', ');
  const scope = surface && surface.presentation_scope ? surface.presentation_scope[region.country] : null;
  return `<div class="note">
    <strong>${esc(region.label)} (${esc(region.value)})</strong> — ${esc(avail.plain)}
    <br><span class="evidence">Upload your report. We check its readable information for reporting issues,
    probable violations and potential errors under the requirements relevant to your selection.
    Review the issues, choose the ones you want to dispute, and create your packet to send to the bureau.</span>
  </div>`;
}

function renderJurisdiction(panel) {
  if (!state.account) { panel.innerHTML = `${notices()}<h1>Sign in first</h1><p class="lede">Create an account or sign in on the first step.</p>`; return; }
  const countries = surface ? surface.countries : [];
  const regions = surface ? surface.regions : [];
  const selectedCountry = el('country') ? el('country').value : (state.view ? state.view.case.country : '');
  const selectedRegion = el('region') ? el('region').value : '';
  const options = regions.filter((r) => r.country === selectedCountry);
  panel.innerHTML = `
    <h1>Choose your jurisdiction</h1>
    <p class="lede">The selection is yours and it is explicit. It is never taken from a report, a file name or a bureau.</p>
    ${notices()}
    <div class="row">
      <div>
        <label for="country">Country</label>
        <select id="country">
          <option value="">Select a country</option>
          ${countries.map((c) => `<option value="${esc(c.value)}" ${c.value === selectedCountry ? 'selected' : ''}>${esc(c.label)} (${esc(c.value)})</option>`).join('')}
        </select>
      </div>
      <div>
        <label for="region">Region</label>
        <select id="region">
          <option value="">Select a region</option>
          ${options.map((r) => `<option value="${esc(r.value)}" ${r.value === selectedRegion ? 'selected' : ''}>${esc(r.label)} (${esc(r.value)})</option>`).join('')}
        </select>
      </div>
    </div>
    <button class="primary" id="open">Open a case for this selection</button>
    <button class="secondary" id="refresh">Reload my cases</button>
    ${coverage(options.find((r) => r.value === (el('region') ? el('region').value : '')))}
    <div class="note">You can open a case for any of the 82 regions. What we can read and check for the one you
    pick is shown above, before you upload anything.</div>
    <h2>Your cases</h2>
    ${state.cases.length
      ? `<ul class="plain">${state.cases.map((c) => `<li><code>${esc(c.region)}</code> · ${esc(regionLabel(c.country, c.region))} · status ${esc(c.status)} <button class="secondary" data-open="${esc(c.case_id)}">Open</button></li>`).join('')}</ul>`
      : '<p class="lede">No cases yet for this account.</p>'}`;

  el('country').onchange = () => render();
  if (el('region')) el('region').onchange = () => render();
  el('open').onclick = () => run(async () => {
    const data = await api('POST', '/api/cases', { country: el('country').value, region: el('region').value });
    state.caseId = data.case.case_id;
    state.cases = (await api('GET', '/api/cases')).cases;
    state.view = (await api('GET', `/api/cases/${state.caseId}`)).view;
    state.step = 2;
    state.notice = `Case opened for ${regionLabel(data.case.country, data.case.region)}.`;
  });
  el('refresh').onclick = () => run(async () => {
    state.cases = (await api('GET', '/api/cases')).cases;
  });
  for (const button of panel.querySelectorAll('[data-open]')) {
    button.onclick = () => run(async () => {
      state.caseId = button.dataset.open;
      state.view = (await api('GET', `/api/cases/${state.caseId}`)).view;
      state.step = 3;
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
  if (state.assessing) {
    return `<div class="note">${head}<br>We are checking your report.</div>`;
  }
  if (state.assessment_error) {
    return `<div class="note stop">${head}<br>Your report is ready to review.<br><span class="err">We could not check your report:</span> ${esc(state.assessment_error)}</div>
      <button class="primary" id="check-report">Try again to check my report</button>`;
  }
  return `<div class="note">${head}<br>Your report is ready to review.</div>
    <button class="primary" id="check-report">Check my report</button>`;
}

/** Run the assessment for this case. A missing purchase is a plan decision, not a failed check. */
async function checkReport() {
  if (state.assessing) return;
  state.error = null;
  state.notice = null;
  state.assessment_error = null;
  state.purchase_needed = null;
  state.assessing = true;
  render();
  try {
    await api('POST', `/api/cases/${state.caseId}/evaluate`, {});
    state.view = (await api('GET', `/api/cases/${state.caseId}`)).view;
    state.step = STEP.RESULTS;
    state.notice = 'Checks run. Nothing was sent anywhere.';
  } catch (err) {
    if (err && err.status === 402) {
      state.purchase_needed = 'Checking a report needs a recorded purchase. Choose a plan, then check your report.';
    } else {
      state.assessment_error = err && err.message ? err.message : 'The check could not be completed. Try again.';
    }
  } finally {
    state.assessing = false;
    render();
  }
}

function renderReport(panel) {
  if (!state.view) { panel.innerHTML = `${notices()}<h1>Open a case first</h1><p class="lede">Choose your jurisdiction on the previous step.</p>`; return; }
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
    <div class="note">PDF, PNG and JPEG: 10 MB per file, 8 files per case, 40 MB stored per account.
    Images are limited to 25 million pixels and 12,000 pixels per side. Scanned PDFs are read up to 40 pages per file; split longer scans into complete page ranges of at most 40 pages within the 8-file limit. HEIC/HEIF, TIFF and ZIP are not supported; export images as PNG/JPEG or combine them into a PDF.
    For an oversized report, export a smaller readable PDF or split at page boundaries into parts under 10 MB, keeping every page in order and the report header and date with each part.
    For more than 8 screenshots, combine pages into a PDF. Delete an unneeded case to free account storage.
    Plausible bureau reports are read where possible; recognition does not prove authenticity or complete extraction.</div>
    <div id="upload-progress" role="status" aria-live="polite">${batch.map(x => esc(x.file.name) + ': ' + esc(x.message || x.status)).join('<br>')}</div>
    <h2>Files on this case</h2>
    ${files.length ? files.map(fileCard).join('') : '<p class="lede">No file has been uploaded for this case yet.</p>'}
    <h2>Exercise the experience with fictional input</h2>
    <p class="lede">This builds a synthetic model in memory. It is labelled, it evidences no report format, and it
    counts as nothing. It exists so the interface can be reviewed.</p>
    <label for="scenario">Demonstration scenario</label>
    <select id="scenario">${(view.demonstration_scenarios || []).map((s) => `<option value="${esc(s)}">${esc(s)}</option>`).join('')}</select>
    <button class="secondary" id="demo">Run the demonstration</button>`;

  async function uploadBatch(items) {
    const caseId = state.caseId;
    el('upload').disabled = true;
    el('retry-upload').disabled = true;
    for (const item of items.filter(x => x.status === 'pending')) {
      try {
        if (!item.file.size || item.file.size > (uploadLimits ? uploadLimits.max_file_bytes : 10485760)) throw new Error('File must be nonempty and at most 10 MiB. Split or export a smaller readable copy.');
        if (!/\.(pdf|png|jpe?g)$/i.test(item.file.name)) throw new Error('Convert this file to PDF, PNG or JPEG first.');
        const data = await api('POST', '/api/cases/' + caseId + '/files', {
          originalFilename: item.file.name, declaredBytes: item.file.size, mimeType: item.file.type,
          contentBase64: await readFileBase64(item.file), uploadKey: item.key
        });
        item.status = 'saved';
        item.message = data.receipt.format_detection.supported ? 'Saved; read where possible' : 'Saved; ' + refusalMessage(data.receipt.format_detection.refusal_reason);
      } catch (err) { item.message = 'Pending: ' + err.message; }
      const progress = el('upload-progress');
      if (progress) progress.textContent = items.map(x => x.file.name + ': ' + (x.message || x.status)).join('\n');
    }
    if (state.caseId === caseId) state.view = (await api('GET', '/api/cases/' + caseId)).view;
    state.notice = items.filter(x => x.status === 'saved').length + ' saved; ' + items.filter(x => x.status === 'pending').length + ' pending. A partial upload is not a complete review. Retry pending files or choose converted copies; saved files will not be repeated by retry.';
  }
  el('upload').onclick = () => {
    const selected = Array.from(el('file').files);
    return run(async () => {
      if (!selected.length) throw new Error('Choose PDF, PNG or JPEG files first.');
      if (batch.some(x => x.status === 'pending')) throw new Error('Retry pending files first, or remove them from the pending list before selecting replacements.');
      const items = selected.map(file => ({file, key: crypto.randomUUID(), status: 'pending'}));
      uploadBatches.set(state.caseId, items);
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
  if (viewResults) viewResults.onclick = () => run(async () => {
    state.view = (await api('GET', `/api/cases/${state.caseId}`)).view;
    state.step = STEP.RESULTS;
  });
  const check = el('check-report');
  if (check) check.onclick = () => checkReport();
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
  const failed = (file.format_predicates || []).filter((p) => !p.passed).map((p) => `<li>${esc(p.detail)}</li>`);
  return `<div class="obs">
    <span class="pill ${file.demonstration ? 'demo' : ''}">${file.demonstration ? 'DEMONSTRATION INPUT — NOT A REPORT' : 'STORED PRIVATELY'}</span>
    <h3>${esc(file.original_filename)}</h3>
    <p class="evidence">${esc(file.stored_bytes)} bytes stored · container: <b>${esc(file.container)}</b></p>
    ${file.demonstration ? '' : detection}
    ${failed.length ? `<details><summary>What the format check measured</summary><ul class="plain">${failed.join('')}</ul></details>` : ''}
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
      state.result_list.map((r) => '<option value="' + esc(r.result_id) + '">' + esc((r.created_at || '').slice(0, 19).replace('T', ' ')) + ' · ' + esc(r.result_id.slice(0, 14)) + '</option>').join('');
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
  const catalog = (state.billing && state.billing.plan_catalog) || null;
  const plan = catalog && (catalog.plans || []).find((p) => p.plan_code === code);
  if (!plan) return '';
  const suffix = plan.interval === 'month' ? ' per month' : (plan.interval === 'year' ? ' per year' : '');
  return `${plan.amount_display}${suffix}`;
}

/** Start a purchase for one plan. The one-time unlock is bound to this case on the server. */
function startCheckout(planCode) {
  return run(async () => {
    const body = { plan_code: planCode };
    if (planCode === 'report_once' && state.caseId) body.case_id = state.caseId;
    const opened = await api('POST', '/api/billing/checkout', body);
    state.notice = (opened.checkout && opened.checkout.redirect_grants_nothing)
      ? 'Checkout opened. Access activates only after the payment provider verifies the payment; returning from the payment page by itself unlocks nothing.'
      : 'Checkout opened.';
  });
}

/**
 * The free view of a completed assessment: how many distinct issues were found, how they split across the three
 * categories, and ONE limited teaser. The complete details, the evidence and the download follow a purchase.
 */
function freeSummaryBlock(view) {
  const summary = view.assessment_summary || {};
  const by = summary.by_confidence || {};
  const teaser = summary.teaser || null;
  const total = Number(summary.distinct_total || 0);
  const counts = total > 0
    ? `<p class="evidence">Reporting issues found: <b>${total}</b> — violations: <b>${by.violation || 0}</b> · probable violations: <b>${by.probable_violation || 0}</b> · potential issues: <b>${by.potential || 0}</b></p>`
    : '<p class="evidence">We did not find a reporting issue in the information we could review.</p>';
  const preview = teaser
    ? `<div class="obs">
      <span class="pill">${esc(teaser.confidence_label || 'Reporting issue')}</span>
      <h3>${esc(teaser.title || '')}</h3>
      <p>${esc(teaser.explanation || '')}</p>
      <p class="evidence">One issue is previewed here. The complete assessment, the report facts and the next steps for every issue are part of the unlock or a subscription.</p>
    </div>`
    : '';
  return `<div class="obs">
    <span class="pill">SUMMARY — FREE</span>
    <h3>What we found</h3>
    ${counts}
    ${preview}
  </div>
  <div class="obs">
    <span class="pill">UNLOCK THE REST</span>
    <h3>Choose what you want next</h3>
    <p class="evidence">Nothing renews unless you choose a subscription. Prices are in CAD and shown before you buy.</p>
    <button class="primary" id="buy-report_once">Unlock this report — ${esc(planPrice('report_once'))}</button>
    <button class="secondary" id="buy-monthly">Monthly — ${esc(planPrice('monthly'))}</button>
    <button class="secondary" id="buy-annual">Annual — ${esc(planPrice('annual'))}</button>
    <p class="evidence">Unlocking this report gives you its complete assessment: every violation, probable violation and potential issue, the report facts and explanations behind them, the next steps that apply, and the assessment download for that report. Dispute packets, report history and comparison are part of a subscription.</p>
  </div>`;
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
  if (!state.view) { panel.innerHTML = `${notices()}<h1>Open a case first</h1>`; return; }
  const view = state.view;
  const access = view.assessment_access || {};
  const result = view.result;
  const summary = view.assessment_summary || null;
  const demo = result && result.support === 'DEMONSTRATION_ONLY_NOT_REPORT_SUPPORT';
  panel.innerHTML = `
    <h1>Results</h1>
    ${access.complete_assessment && result ? '<label for="result-select">Result</label><select id="result-select"><option value="">Latest result</option></select>' : ''}
    <p class="lede">Case for ${esc(regionLabel(view.case.country, view.case.region))}.</p>
    ${notices()}
    <button class="primary" id="evaluate">Run the applicable checks on this case</button>
    ${summary
      ? (access.complete_assessment && result ? resultBlock(result, demo) : freeSummaryBlock(view))
      : '<div class="note">No result set exists for this case yet.</div>'}
    ${summary && access.complete_assessment && result && !demo
      ? (access.dispute_packet ? clarificationBlock(view) : oneTimeNextStepsBlock())
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

  wireResultSelector(panel, view);
  wireClarification(panel, view);
}

function resultBlock(result, demo) {
  const observations = result.observations.filter(o => o.assessment_completed !== false).map((o) => `
    <div class="obs">
      <span class="pill ${demo ? 'demo' : o.is_a_finding ? 'finding' : ''}">${demo ? 'DEMONSTRATION — NOT REPORT SUPPORT' : (o.is_a_finding ? esc(o.consumer_label || 'FINDING') : 'OBSERVATION — NOT A LEGAL FINDING')}</span>
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
    <h2>Checks performed: ${esc(result.checks_performed)}</h2>
    ${observations || (factual ? '' : '<p class="lede">No findings available.</p>')}
    ${factual ? `<h2>What your report prints, set against itself</h2>${factual}` : ''}
    ${issuesSection(result)}
    <div class="note stop">${esc(result.disclaimer)}</div>`;
}

/* OWNER-POTENTIAL-ISSUE-001: supported potential reporting issues, rendered as review cards (never NOT_DETECTED,
   never failed-check diagnostics). Each states what the report says, why it merits attention and its uncertainty. */
function issuesSection(result) {
  const issues = (result.issues || []).filter((i) => i.confidence === 'POTENTIAL');
  if (!issues.length) return '';
  const cards = issues.map((i) => `
    <div class="obs issue">
      <span class="pill potential">POTENTIAL REPORTING ISSUE — FOR YOUR REVIEW</span>
      <h3>${esc(i.explanation)}</h3>
      <p class="evidence">Why it merits attention: ${esc(i.uncertainty)}</p>
      ${i.source_location ? `<p class="evidence">Your report, ${i.source_location.section ? esc(i.source_location.section) + ', ' : ''}page <b>${esc(i.source_location.page)}</b>${i.source_location.line != null ? `, line <b>${esc(i.source_location.line)}</b>` : ''}${i.account_number_in_report != null ? `, account <b>${esc(i.account_number_in_report)}</b>` : ''}.</p>` : ''}
      <p class="evidence">A factual discrepancy like this supports a verification request; it is not, by itself, an established legal violation.</p>
    </div>`).join('');
  return `<h2>Potential reporting issues for your review</h2>${cards}`;
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
  if (!state.view) { panel.innerHTML = `${notices()}<h1>Open a case first</h1>`; return; }
  const view = state.view;
  /* OWNER-PURCHASE-FLOW-001: the dispute packet is a subscriber feature. A one-time unlock gives the complete
     assessment and its download; packet selection, correspondence, approval and download need a subscription. */
  const access = view.assessment_access || {};
  if (!access.dispute_packet) {
    panel.innerHTML = `
      <h1>Review and download</h1>
      <p class="lede">Dispute packets are part of a subscription.</p>
      ${notices()}
      <div class="note">Your one-time unlock gives you the complete assessment of this report and its download.
      Selecting issues, reviewing and editing the correspondence, approving the packet and downloading it are part
      of a subscription.</div>
      <button class="primary" id="go-billing">See subscription plans</button>`;
    el('go-billing').onclick = () => run(async () => { state.step = STEP.BILLING; });
    return;
  }
  const result = view.result;
  panel.innerHTML = `
    <h1>Review and download</h1>
    <p class="lede">You review the observations before anything can follow from them. Nothing was sent, and nothing
    will be sent from this build.</p>
    ${notices()}
    ${result ? `<div class="obs">
      <span class="pill ${view.reviewed ? '' : 'stop'}">${view.reviewed ? 'REVIEWED BY YOU' : 'NOT YET REVIEWED'}</span>
      <h3>${esc(result.checks_performed)} checks performed on this case</h3>
      <p class="evidence">${esc((result.assessment && result.assessment.plain) || '')}</p>
      <p class="evidence">A response draft is available only where the recorded output permission allows it.
      Here: <b>not available</b>. ${esc(view.download.reason_plain || '')}</p>
      <button class="primary" id="review" ${view.reviewed ? 'disabled' : ''}>I have reviewed this result</button>
      <button class="secondary" id="draft">Request a response draft</button>
      <button class="secondary" id="download">Download the demonstration file</button>
      <div id="packet-block"></div>
    </div>` : '<div class="note">Run the checks on the previous step first.</div>'}`;

  if (el('review')) el('review').onclick = () => run(async () => {
    await api('POST', `/api/cases/${state.caseId}/review`, {});
    state.view = (await api('GET', `/api/cases/${state.caseId}`)).view;
    state.notice = 'Review recorded. A response draft still depends on the recorded output permission.';
  });

  if (el('draft')) el('draft').onclick = () => run(async () => {
    await api('GET', `/api/cases/${state.caseId}/response-draft`);
    state.notice = 'A response draft was produced.';
  });

  if (el('download')) el('download').onclick = () => {
    note(`GET /api/cases/${state.caseId}/demonstration-download -> browser download`);
    window.location.assign(`/api/cases/${state.caseId}/demonstration-download`);
  };

  wirePacket(panel);
}

/* OWNER-POTENTIAL-ISSUE-001: the correction-packet selection/review/edit/approve/download flow, wired into the
   Wizzard review step. Consumer wording is kept separate from the report facts. */
function confidencePill(c) {
  if (c === 'DEFINITE') return 'ESTABLISHED REPORTING ISSUE';
  if (c === 'PROBABLE') return 'PROBABLE REPORTING ISSUE';
  return 'POTENTIAL REPORTING ISSUE';
}

/* OWNER-PACKET-CORRESPONDENCE-001: the consumer-visible name of each necessary correspondence detail. */
function correspondenceFieldLabel(field) {
  if (field === 'consumer_name') return 'your name';
  if (field === 'contact') return 'where the reply should go';
  return field;
}

function renderPacketBlock(pv) {
  const issues = (pv.eligible_issues || []).filter((i) => i.eligible);
  const packet = pv.packet || {};
  if (!issues.length) return '<p class="evidence">No issue on this case is eligible for a correction packet yet.</p>';
  const correspondence = packet.correspondence || {};
  const recipient = packet.recipient || {};
  const missing = packet.correspondence_missing || [];
  const rows = issues.map((i) => `
    <label class="issue-select">
      <input type="checkbox" data-check-issue="${esc(i.issue_id)}" ${(packet.selected_issue_ids || []).includes(i.issue_id) ? 'checked' : ''}>
      <span class="pill">${confidencePill(i.confidence)}</span>
      <strong>${esc(i.explanation)}</strong>
      <span class="evidence">Why: ${esc(i.uncertainty)}</span>
      ${i.report_identity ? `<span class="evidence">Report: <b>${esc(i.report_identity.bureau || 'a report')}</b>${i.report_identity.reference_date ? ` · reference date <b>${esc(i.report_identity.reference_date)}</b>` : ''}</span>` : ''}
      ${(i.source_facts || []).map((f) => `<span class="evidence">${esc(f.source_field || 'field')}: printed <b>${esc(f.raw_value)}</b>${f.normalized_value ? ` → normalized <b>${esc(f.normalized_value)}</b>` : ''}</span>`).join('')}
    </label>`).join('');
  return `
    <h2>Correction packet</h2>
    <p class="evidence">Choose the issues to include. Each states what your report says, why it merits attention and its uncertainty. Your details and your own words stay separate from the report facts.</p>
    ${rows}
    <h3>Who this correspondence goes to</h3>
    <p class="evidence">Addressed to <b>${esc(recipient.label || 'the consumer reporting agency that issued this report')}</b>. This service supplies no address and sends nothing: the packet is prepared for you to review, edit and send yourself.</p>
    <div class="row">
      <label for="packet-name">Your name (as the sender)</label>
      <input id="packet-name" value="${esc(correspondence.consumer_name || '')}">
      <label for="packet-contact">Where the reply should go</label>
      <input id="packet-contact" value="${esc(correspondence.contact || '')}">
      <label for="packet-reference">Your own reference (optional)</label>
      <input id="packet-reference" value="${esc(correspondence.account_reference || '')}">
    </div>
    ${missing.length ? `<p class="note stop">Add ${missing.map(correspondenceFieldLabel).join(' and ')} before approving: correspondence without them cannot be sent.</p>` : ''}
    <label for="packet-wording">Your own words (optional)</label>
    <textarea id="packet-wording" placeholder="Add any request wording of your own. It is kept separate from the report facts.">${esc(packet.wording || '')}</textarea>
    <div class="row">
      <button class="secondary" id="packet-save">Save selection, details and wording</button>
      <button class="primary" id="packet-approve" ${packet.approved ? 'disabled' : ''}>Approve this version</button>
      <button class="secondary" id="packet-download" ${packet.download_available ? '' : 'disabled'}>Download correction packet</button>
    </div>
    ${packet.approved ? `<p class="evidence">Approved version: <b>${esc(packet.approved_version)}</b></p>` : ''}
    ${packet.approval_stale ? '<p class="note stop">The packet changed since approval; review and approve it again.</p>' : ''}
    <div class="packet-review">
      <h3>Review the correspondence and evidence</h3>
      <p class="evidence">This is the correspondence the download contains, and the report evidence each request rests on. It corresponds to the issues you selected.</p>
      <pre id="packet-preview">${esc(packet.correspondence_preview || 'Select at least one issue to see the correspondence and its evidence.')}</pre>
    </div>`;
}

async function wirePacket(panel) {
  const block = panel.querySelector('#packet-block');
  if (!block) return;
  let pv;
  try {
    pv = (await api('GET', `/api/cases/${state.caseId}/packet`)).view;
  } catch {
    pv = { eligible_issues: [], packet: {} };
  }
  block.innerHTML = renderPacketBlock(pv);

  /* The current visible selection and wording, captured at action time so a save or an approve can never
     silently use an older saved version while the consumer sees a changed one. */
  const currentSelection = () => [...panel.querySelectorAll('[data-check-issue]:checked')].map((n) => n.getAttribute('data-check-issue'));
  const currentWording = () => el('packet-wording') ? el('packet-wording').value : '';
  const currentCorrespondence = () => ({
    consumer_name: el('packet-name') ? el('packet-name').value : '',
    contact: el('packet-contact') ? el('packet-contact').value : '',
    account_reference: el('packet-reference') ? el('packet-reference').value : ''
  });
  const persistSelection = async () => {
    await api('POST', `/api/cases/${state.caseId}/packet/select`, { issue_ids: currentSelection() });
    await api('POST', `/api/cases/${state.caseId}/packet/correspondence`, { correspondence: currentCorrespondence() });
    await api('POST', `/api/cases/${state.caseId}/packet/wording`, { wording: currentWording() });
  };

  const save = el('packet-save');
  if (save) save.onclick = () => run(async () => {
    await persistSelection();
    state.view = (await api('GET', `/api/cases/${state.caseId}`)).view;
    state.notice = 'Selection, correspondence details and wording saved. Approve the current version to enable download.';
  });

  const approve = el('packet-approve');
  if (approve) approve.onclick = () => run(async () => {
    /* Approve the CURRENT version: re-save the visible selection and wording first, then approve. */
    await persistSelection();
    await api('POST', `/api/cases/${state.caseId}/packet/approve`, {});
    state.view = (await api('GET', `/api/cases/${state.caseId}`)).view;
    state.notice = 'Packet approved. You can now download it.';
  });

  const dl = el('packet-download');
  if (dl) dl.onclick = () => {
    note(`GET /api/cases/${state.caseId}/packet-download -> browser download`);
    window.location.assign(`/api/cases/${state.caseId}/packet-download`);
  };

  /* Editing the correspondence details or the wording after approval marks the visible packet changed, so the
     download is disabled until the current version is approved again — never a silent download of an older
     approved version. */
  const markChanged = () => {
    if (pv.packet.approved) {
      const dlBtn = el('packet-download');
      if (dlBtn) dlBtn.disabled = true;
      const apBtn = el('packet-approve');
      if (apBtn) apBtn.disabled = false;
    }
  };
  const wording = el('packet-wording');
  if (wording) wording.oninput = markChanged;
  for (const id of ['packet-name', 'packet-contact', 'packet-reference']) {
    const input = el(id);
    if (input) input.oninput = markChanged;
  }
}

/* ------------------------------------------------------------------ step 5: report history and comparison */

function historyOption(r) {
  const row = r || {};
  const bureau = row.bureau || 'a report';
  const date = row.report_date || 'no report date on file';
  return `${bureau} · ${date}`;
}

function comparisonFactList(issue) {
  const facts = (issue && issue.source_facts) || [];
  if (!facts.length) return '';
  return facts.map((f) => `<span class="evidence">${esc(f.source_field || 'field')}: printed <b>${esc(f.raw_value)}</b>${f.normalized_value != null ? ` → normalized <b>${esc(f.normalized_value)}</b>` : ''}</span>`).join('');
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
    <p class="lede">Prices, what each purchase grants, your recorded access, renewal, cancellation and your upgrade credit — all from the service's own configuration.</p>
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
    ? `You hold a recorded purchase: state <b>${esc(ent.state)}</b>${ent.plan_code ? ` (${esc(ent.plan_code)})` : ''}${ent.expires_at ? `, access until ${esc(ent.expires_at)}` : ''}.`
    : 'No active purchase is recorded against this account. Reading what you already have, and deleting it, stay available.';

  const renewalLine = ent.access_via === 'ONE_TIME_CREDIT'
    ? 'This purchase is one-time. It does not renew, and no recurring payment will be taken.'
    : ent.access_via === 'SUBSCRIPTION'
      ? `This purchase renews automatically (${esc(ent.plan_code || 'subscription')}) while active.`
      : 'No recurring purchase is recorded.';

  const cancelBlock = ent.entitled && ent.access_via === 'SUBSCRIPTION'
    ? (ent.cancel_at_period_end
      ? '<p class="evidence">Renewal is already cancelled. Access continues to the recorded expiry, and what you have made stays readable.</p>'
      : '<button class="secondary" id="cancelEntitlement">Cancel renewal</button><p class="evidence" id="cancelStatus"></p>')
    : '';

  const creditLine = credit.eligible
    ? `An upgrade credit of <b>CAD ${(credit.credit_cents / 100).toFixed(2)}</b> is available toward a first monthly or annual invoice${credit.expires_at ? `, expiring ${esc(credit.expires_at)}` : ''}.`
    : 'No upgrade credit is currently available.';

  const planCards = plansList.map((p) => `
    <div class="obs">
      <span class="pill">${esc(p.label)}</span>
      <h3>${esc(p.amount_display)} — ${esc(intervalLabel(p.interval))}</h3>
      <p class="evidence">Grants: ${(p.grants || []).map((g) => esc(g)).join('; ')}.</p>
      <button class="secondary" id="checkout-${esc(p.plan_code)}">Start checkout</button>
    </div>`).join('');

  box.innerHTML = `
    <h3>Your access</h3>
    <p class="evidence">${accessLine}</p>
    <p class="evidence">${renewalLine}</p>
    ${cancelBlock}
    <h3>Plans and prices</h3>
    <p class="evidence">Prices are in CAD and shown before you buy. A one-time purchase does not renew. A subscription renews automatically until you cancel it, and cancelling stops the next charge while your recorded access continues to its expiry.</p>
    ${planCards}
    <p class="evidence">${esc(pay.plain || data.plain || '')}</p>
    <h3>Upgrade credit</h3>
    <p class="evidence">${creditLine}</p>`;

  for (const p of plansList) {
    const btn = el('checkout-' + p.plan_code);
    if (btn) btn.onclick = () => run(async () => {
      const opened = await api('POST', '/api/billing/checkout', { plan_code: p.plan_code });
      state.notice = (opened.checkout && opened.checkout.redirect_grants_nothing)
        ? 'Checkout opened. Completing it in the provider does not grant access here — access activates only after the provider verifies the payment.'
        : 'Checkout opened.';
    });
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
  try {
    const session = await api('GET', '/api/session');
    state.account = session.account;
    state.cases = (await api('GET', '/api/cases')).cases;
    await refreshAccess();
    state.step = 1;
  } catch {
    state.account = null;
  }
  el('activity').textContent = state.activity.join('\n');
  render();
})();
