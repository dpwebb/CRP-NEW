'use strict';
(() => {
  const $ = (id) => document.getElementById(id);
  const state = { session: null, view: 'overview', tab: 'members', query: '', status: '', page: 1, pageSize: 20, generation: 0, dialog: null, lastFocus: null, searchTimer: null };
  const icons = {
    overview: ['M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z'],
    accounts: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.87', 'M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0'],
    team: ['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3a4 4 0 0 1 0 8', 'M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0'],
    organizations: ['M4 21V3h12v18M16 9h5v12M1 21h23M8 7h4M8 11h4M8 15h4M8 21v-2h4v2'],
    affiliates: ['M12 8V3M5 16v-4h14v4M12 12V8', 'M15 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0M8 19a3 3 0 1 1-6 0 3 3 0 0 1 6 0M22 19a3 3 0 1 1-6 0 3 3 0 0 1 6 0'],
    fulfillment: ['M3 6h18v15H3zM3 6l3-3h12l3 3M3 10h18M9 15h6'],
    audit: ['M8 3H4v18h16V3h-4M8 1h8v5H8zM8 11h8M8 15h8M8 18h5'],
    settings: ['M9 3l.6-2h4.8l.6 2 2.4 1.4 2-.5 2.4 4.2-1.4 1.5v2.8l1.4 1.5-2.4 4.2-2-.5L15 19l-.6 2H9.6L9 19l-2.4-1.4-2 .5-2.4-4.2 1.4-1.5V9.6L2.2 8.1l2.4-4.2 2 .5L9 3', 'M16 11a4 4 0 1 1-8 0 4 4 0 0 1 8 0'],
    empty: ['M4 4h16v16H4zM4 14h5l2 3h2l2-3h5M8 8h8'],
    shield: ['M12 2l8 3v6c0 5-8 10-8 10S4 16 4 11V5zM8 11l3 3 5-6']
  };
  const views = {
    overview: { label: 'Overview', eyebrow: 'YOUR WORKSPACE, AT A GLANCE', description: 'A clear view of your people, partners and day-to-day work.' },
    accounts: { label: 'Accounts', eyebrow: 'PEOPLE & SUPPORT', description: 'Find accounts and review the information your role can access.' },
    team: { label: 'Team & access', eyebrow: 'PEOPLE & PERMISSIONS', description: 'Give each person the access they need to do their work.' },
    organizations: { label: 'Organizations', eyebrow: 'YOUR PARTNER NETWORK', description: 'Manage partner workspaces and their assigned people.' },
    affiliates: { label: 'Affiliates', eyebrow: 'THREE LEVELS. ONE CLEAR VIEW.', description: 'Review the referral network, rewards and payment holds.' },
    fulfillment: { label: 'Fulfillment', eyebrow: 'KEEP WORK MOVING', description: 'Track operational tasks, assignments and their next steps.' },
    audit: { label: 'Activity log', eyebrow: 'A RECORD YOU CAN FOLLOW', description: 'See who changed what and when across your permitted workspace.' },
    settings: { label: 'Settings', eyebrow: 'WORKSPACE DETAILS', description: 'Review your access, security and operational settings.' }
  };

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined && text !== null) element.textContent = String(text);
    return element;
  }
  function svg(name) {
    const element = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    element.setAttribute('viewBox', '0 0 24 24'); element.setAttribute('aria-hidden', 'true');
    for (const d of icons[name] || icons.empty) {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('d', d); element.append(path);
    }
    return element;
  }
  function button(label, action, className = 'button secondary') {
    const element = node('button', className, label); element.type = 'button'; element.addEventListener('click', action); return element;
  }
  function clear(element) { element.replaceChildren(); return element; }
  function text(value, fallback = '—') { return value === null || value === undefined || value === '' ? fallback : String(value); }
  function human(value) { return text(value, '').replace(/[_:.]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()); }
  function date(value, detailed = false) {
    if (!value) return '—'; const parsed = new Date(value); if (!Number.isFinite(parsed.getTime())) return '—';
    return new Intl.DateTimeFormat(undefined, detailed ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' }).format(parsed);
  }
  function number(value) { return Number.isFinite(Number(value)) ? new Intl.NumberFormat().format(Number(value)) : '—'; }
  function money(cents, currency) {
    if (!Number.isFinite(Number(cents)) || !currency || !/^[A-Z]{3}$/.test(currency)) return '—';
    try { return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(cents) / 100); } catch { return `${currency} ${(Number(cents) / 100).toFixed(2)}`; }
  }
  function initials(value) { return String(value || 'CRP').split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase(); }
  function pill(value) {
    const normalized = String(value || '').toLowerCase();
    const type = ['active', 'approved', 'complete', 'completed', 'ready', 'paid', 'verified', 'enabled', 'resolved', 'reviewed'].includes(normalized) ? 'success' : /hold|pending|review|progress|queued|invited/.test(normalized) ? 'warning' : /suspend|disabled|blocked|failed|cancel|reject/.test(normalized) ? 'danger' : 'neutral';
    return node('span', `pill ${type}`, human(value) || 'Unknown');
  }
  function showError(id, message) { $(id).textContent = message; $(id).hidden = !message; }
  function toast(message, error = false) {
    const item = node('div', `toast${error ? ' error' : ''}`); item.append(node('span', '', message));
    const dismiss = button('×', () => item.remove(), ''); dismiss.setAttribute('aria-label', 'Dismiss notification'); item.append(dismiss); $('toast-stack').append(item);
    window.setTimeout(() => item.remove(), 7000);
  }
  async function api(method, path, body, { sessionCheck = false } = {}) {
    let response;
    try { response = await fetch(path, { method, credentials: 'same-origin', cache: 'no-store', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined }); }
    catch { throw new Error('We could not connect to CRP. Check your connection and try again.'); }
    let data; try { data = await response.json(); } catch { data = {}; }
    if (!response.ok || data.ok === false) {
      const error = new Error(data.error?.message || (response.status === 403 ? 'Your account does not have access to this action.' : `This request could not be completed (${response.status}).`));
      error.status = response.status; error.code = data.error?.code || ''; error.data = data;
      if (response.status === 401 && !sessionCheck && error.code === 'TWO_FACTOR_REQUIRED') showLogin('Your administration session has ended. Sign in to continue.');
      else if (response.status === 401 && !sessionCheck && error.code !== 'TWO_FACTOR_INVALID') showLogin('Your session has ended. Sign in to continue.');
      throw error;
    }
    return data;
  }
  function permissions() { return state.session?.permissions || []; }
  function can(permission) { return permissions().includes(permission); }
  function setBusy(form, busy) { form.setAttribute('aria-busy', String(busy)); for (const control of form.querySelectorAll('button[type=submit]')) control.disabled = busy; }
  function showLogin(message = '') {
    state.session = null; state.generation++; window.clearTimeout(state.searchTimer); if ($('editor').open) $('editor').close(); state.dialog = null; clear($('view')); clear($('editor-fields')); $('workspace').hidden = true; $('auth-shell').hidden = false; $('auth-checking').hidden = true;
    $('login-form').hidden = false; $('access-message').hidden = true;
    $('auth-title').textContent = 'Sign in to your workspace'; $('auth-description').textContent = 'Use the CRP account connected to your team.';
    showError('login-error', message); $('login-password').value = ''; $('login-code').value = ''; $('login-password').type = 'password'; $('toggle-password').textContent = 'Show password'; $('toggle-password').setAttribute('aria-pressed', 'false');
    document.querySelector('.skip-link').setAttribute('href', '#main-content'); closeMobile();
  }
  function showAccess(message) {
    $('auth-shell').hidden = false; $('workspace').hidden = true; $('auth-checking').hidden = true; $('login-form').hidden = true; $('access-message').hidden = false;
    $('auth-title').textContent = 'Workspace access'; $('auth-description').textContent = 'Your CRP account is signed in.'; $('access-description').textContent = message;
  }
  function openMobile() { $('sidebar').classList.add('open'); $('mobile-backdrop').hidden = false; $('menu-toggle').setAttribute('aria-expanded', 'true'); $('menu-toggle').setAttribute('aria-label', 'Close navigation'); $('navigation').querySelector('button[aria-current=page]')?.focus(); }
  function closeMobile() { $('sidebar').classList.remove('open'); $('mobile-backdrop').hidden = true; $('menu-toggle').setAttribute('aria-expanded', 'false'); $('menu-toggle').setAttribute('aria-label', 'Open navigation'); }
  function header(view) {
    const spec = views[view]; $('breadcrumb').textContent = spec.label; $('page-title').textContent = spec.label; $('page-eyebrow').textContent = spec.eyebrow; $('page-description').textContent = spec.description;
    $('view').setAttribute('aria-label', spec.label); clear($('page-actions')); showError('page-notice', '');
    for (const link of $('navigation').querySelectorAll('button')) link.setAttribute('aria-current', link.dataset.view === view ? 'page' : 'false');
    document.title = `${spec.label} · CRP Administration`;
  }
  function loading() {
    const target = clear($('view')); target.setAttribute('aria-busy', 'true');
    const card = node('div', 'card'); const status = node('div', 'loading-state'); status.setAttribute('role', 'status'); status.append(node('span', 'spinner'), node('span', '', `Loading ${views[state.view].label.toLowerCase()}…`)); card.append(status);
    for (let i = 0; i < 4; i++) { const row = node('div', 'skeleton-row'); row.setAttribute('aria-hidden', 'true'); row.append(node('div', 'skeleton')); card.append(row); }
    target.append(card);
  }
  function errorView(error) {
    const card = node('div', 'card error-state'); card.setAttribute('role', 'alert'); card.append(node('h3', '', 'We could not load this view'), node('p', '', error.message)); card.append(button('Try again', () => loadView(), 'button primary')); clear($('view')).append(card);
  }
  function empty(title = 'Nothing here yet', description = 'New activity will appear here when there is something to show.', action) {
    const wrap = node('div', 'empty-state'); const icon = node('span', 'empty-icon'); icon.append(svg(state.view)); wrap.append(icon, node('h3', '', title), node('p', '', description)); if (action) wrap.append(action); return wrap;
  }
  function card(title, subtitle, content, action) {
    const wrap = node('section', 'card'); const heading = node('div', 'card-heading'); const copy = node('div'); copy.append(node('h2', '', title)); if (subtitle) copy.append(node('p', '', subtitle)); heading.append(copy); if (action) heading.append(action); wrap.append(heading); if (content) wrap.append(content); return wrap;
  }
  function identity(primary, secondary) { const wrap = node('div', 'cell-identity'); wrap.append(node('span', 'avatar', initials(primary))); const copy = node('div'); copy.append(node('strong', '', text(primary))); if (secondary) copy.append(node('small', '', secondary)); wrap.append(copy); return wrap; }
  function keyValues(values) { const list = node('dl', 'key-value'); for (const [label, value] of values) { list.append(node('dt', '', label)); const detail = node('dd'); if (value instanceof Node) detail.append(value); else detail.textContent = text(value); list.append(detail); } return list; }
  function makeTable(columns, rows, { emptyTitle, emptyDescription } = {}) {
    if (!rows.length) return empty(emptyTitle || 'No matching records', emptyDescription || 'Try a different search or clear the filters.');
    const wrap = node('div', 'table-scroll'); const table = node('table'); const caption = node('caption', 'sr-only', views[state.view].label); caption.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)'; table.append(caption);
    const head = node('thead'), tr = node('tr'); for (const column of columns) { const th = node('th', '', column.label); th.scope = 'col'; if (column.actions) th.style.textAlign = 'right'; tr.append(th); } head.append(tr); table.append(head);
    const body = node('tbody'); for (const row of rows) { const line = node('tr'); for (const column of columns) { const cell = node('td', column.className || ''); const value = column.render(row); if (value instanceof Node) cell.append(value); else cell.textContent = text(value); line.append(cell); } body.append(line); } table.append(body); wrap.append(table); return wrap;
  }
  function toolbar({ statuses = [], total = 0, placeholder = 'Search records…' } = {}) {
    const wrap = node('div', 'toolbar'); const search = node('div', 'search-field'); const icon = node('span', '', '⌕'); icon.setAttribute('aria-hidden', 'true');
    const input = node('input'); input.type = 'search'; input.value = state.query; input.placeholder = placeholder; input.setAttribute('aria-label', 'Search this view'); input.maxLength = 200;
    input.addEventListener('input', () => { window.clearTimeout(state.searchTimer); state.searchTimer = window.setTimeout(() => { state.query = input.value.trim(); state.page = 1; loadView({ keepSearchFocus: true }); }, 350); }); search.append(icon, input); wrap.append(search);
    if (statuses.length) { const select = node('select'); select.setAttribute('aria-label', 'Filter by status'); const all = node('option', '', 'All statuses'); all.value = ''; select.append(all); for (const value of statuses) { const option = node('option', '', human(value)); option.value = value; select.append(option); } select.value = state.status; select.addEventListener('change', () => { state.status = select.value; state.page = 1; loadView(); }); wrap.append(select); }
    if (state.query || state.status) wrap.append(button('Clear', () => { state.query = ''; state.status = ''; state.page = 1; loadView(); }, 'text-button'));
    wrap.append(node('span', 'result-total', `${number(total)} ${total === 1 ? 'record' : 'records'}`)); return wrap;
  }
  function pagination(total, count) {
    const wrap = node('div', 'pagination'); const from = total ? (state.page - 1) * state.pageSize + 1 : 0; wrap.append(node('span', '', `Showing ${number(from)}–${number(total ? from + count - 1 : 0)} of ${number(total)}`));
    const controls = node('div', 'pagination-controls'); const previous = button('← Previous', () => { state.page--; loadView(); }); previous.disabled = state.page <= 1;
    const next = button('Next →', () => { state.page++; loadView(); }); next.disabled = state.page * state.pageSize >= total;
    controls.append(previous, node('span', '', `Page ${number(state.page)}`), next); wrap.append(controls); return wrap;
  }
  function listCard(data, columns, options = {}) {
    const wrap = node('section', 'card'); const rows = data.items || []; const total = Number(data.total) || 0;
    wrap.append(toolbar({ ...options, total }), makeTable(columns, rows, options), pagination(total, rows.length)); return wrap;
  }
  function actions(...items) { const wrap = node('div', 'cell-actions'); for (const item of items.filter(Boolean)) wrap.append(item); return wrap; }
  function field({ name, label, value = '', type = 'text', options, required = false, help, wide = false, maxLength, min, max, readOnly = false }) {
    const wrap = node('div', wide ? 'field-wide' : ''); const id = `edit-${name}`; const title = node('label', '', label); title.htmlFor = id;
    const control = node(options ? 'select' : type === 'textarea' ? 'textarea' : 'input'); control.id = id; control.name = name;
    if (options) { for (const option of options) { const entry = typeof option === 'string' ? { value: option, label: human(option) } : option; const element = node('option', '', entry.label); element.value = entry.value; control.append(element); } }
    else if (type !== 'textarea') control.type = type;
    control.value = value ?? ''; control.required = required; if (maxLength) control.maxLength = maxLength; if (min !== undefined) control.min = min; if (max !== undefined) control.max = max; control.readOnly = readOnly;
    if (type === 'email') control.autocomplete = 'email'; else control.autocomplete = 'off';
    wrap.append(title, control); if (help) { const description = node('p', 'field-help', help); description.id = `${id}-help`; control.setAttribute('aria-describedby', description.id); wrap.append(description); } return wrap;
  }
  function dialog({ title, description = '', eyebrow = views[state.view].label.toUpperCase(), fields = [], content, submit = 'Save changes', onSave, danger = false }) {
    if (!$('editor').open) state.lastFocus = document.activeElement; state.dialog = onSave || null;
    $('editor-title').textContent = title; $('editor-eyebrow').textContent = eyebrow; $('editor-description').textContent = description; clear($('editor-fields')); showError('editor-error', '');
    if (fields.length) { const grid = node('div', 'form-grid'); for (const item of fields) grid.append(field(item)); $('editor-fields').append(grid); } if (content) $('editor-fields').append(content);
    $('editor-save').textContent = submit; $('editor-save').hidden = !onSave; $('editor-save').className = `button ${danger ? 'danger' : 'primary'}`; $('editor-cancel').textContent = onSave ? 'Cancel' : 'Close';
    if (!$('editor').open) $('editor').showModal();
  }
  function closeDialog() { if ($('editor-form').getAttribute('aria-busy') === 'true') return; $('editor').close(); state.dialog = null; state.lastFocus?.focus(); }
  async function mutate(path, body, message, method = 'POST') { await api(method, path, body); $('editor').close(); state.dialog = null; toast(message); await loadView(); }

  function renderOverview(data) {
    const overview = data.overview || {}; const target = clear($('view')); const stats = node('div', 'stats-grid');
    const countIcons = { accounts: 'accounts', team: 'team', organizations: 'organizations', affiliates: 'affiliates', fulfillment: 'fulfillment', cases: 'fulfillment' };
    const counts = Object.entries(overview.counts || {}).filter(([, value]) => Number.isFinite(Number(value)) && value !== null && typeof value !== 'boolean');
    for (const [index, [name, value]] of counts.entries()) {
      const wrap = node('article', `stat-card${index === 0 ? ' featured' : ''}`); const top = node('div', 'stat-top'); const icon = node('span', 'stat-icon'); icon.append(svg(countIcons[name] || 'overview')); top.append(node('span', 'stat-label', human(name)), icon);
      wrap.append(top, node('div', 'stat-value', number(value)), node('p', 'stat-description', 'Within your permitted workspace')); stats.append(wrap);
    }
    if (counts.length) target.append(stats);
    const grid = node('div', 'dashboard-grid'); const quick = node('div', 'card-body quick-links');
    const quickViews = [['accounts', 'Find an account', 'Look up the accounts you support.'], ['fulfillment', 'Review the work queue', 'Keep assignments and next steps moving.'], ['affiliates', 'Review affiliate activity', 'Follow the three-level network and reward records.'], ['team', 'Manage team access', 'Review who can work in this workspace.']];
    for (const [view, title, description] of quickViews) {
      if (!allowedViews().includes(view)) continue; const entry = button('', () => navigate(view), 'quick-link'); const icon = node('span', 'stat-icon'); icon.append(svg(view)); const copy = node('span'); copy.append(node('strong', '', title), node('small', '', description)); entry.append(icon, copy, node('span', '', '↗')); quick.append(entry);
    }
    if (!quick.children.length) quick.append(empty('You are up to date', 'Use the navigation to review the parts of CRP available to your role.'));
    grid.append(card('Your next steps', 'Go straight to the work that matters.', quick));
    const context = node('div', 'card-body'); const principal = state.session;
    context.append(keyValues([['Signed in as', principal.email], ['Workspace role', human(principal.role)], ['Organization', principal.org_id || 'CRP workspace'], ['Session expires', date(principal.expires_at, true)]]));
    const access = node('p', 'section-note', 'Your workspace only shows the records and actions permitted for your account.'); context.append(access); grid.append(card('Your workspace', 'Access follows your assigned role.', context)); target.append(grid);
    const operations = overview.operations || {};
    if (operations.payouts_enabled === false || operations.mailing_enabled === false) {
      const note = node('div', 'dashboard-note'); note.append(node('span', '', '◇')); const copy = node('div'); copy.append(node('strong', '', 'Operational control stays with you'));
      const messages = []; if (operations.payouts_enabled === false) messages.push('Affiliate records do not send payments.'); if (operations.mailing_enabled === false) messages.push('Fulfillment records do not send mail.'); copy.append(node('p', '', messages.join(' '))); note.append(copy); target.append(note);
    }
  }
  function tabBar(tabs, active, onSelect) {
    const wrap = node('div', 'tabs'); wrap.setAttribute('role', 'group'); wrap.setAttribute('aria-label', `${views[state.view].label} views`);
    for (const [id, label] of tabs) { const tab = button(label, () => onSelect(id), ''); tab.setAttribute('aria-pressed', String(id === active)); tab.dataset.tab = id; wrap.append(tab); }
    return wrap;
  }
  function filteredPage(rows) {
    const query = state.query.toLocaleLowerCase(); const filtered = rows.filter((row) => (!state.status || row.status === state.status) && (!query || Object.values(row).some((value) => typeof value !== 'object' && String(value || '').toLocaleLowerCase().includes(query))));
    const pages = Math.max(1, Math.ceil(filtered.length / state.pageSize)); state.page = Math.min(state.page, pages);
    return { items: filtered.slice((state.page - 1) * state.pageSize, state.page * state.pageSize), total: filtered.length };
  }
  function showDetails(title, values, description = '') {
    dialog({ title, description, content: keyValues(values.filter(([, value]) => value !== undefined)) });
  }
  function renderSettings(data) {
    const settings = data.settings || {}; const target = clear($('view')); const body = node('div', 'card-body');
    body.append(keyValues([['Workspace role', human(state.session.role)], ['Account email', state.session.email], ['Organization', state.session.org_id || 'CRP workspace'], ['Session expires', date(state.session.expires_at, true)]]));
    const permissionsSection = node('div', 'detail-section'); permissionsSection.append(node('h3', '', 'Your permissions')); const list = node('ul', 'permission-list'); for (const permission of permissions()) list.append(node('li', '', human(permission))); permissionsSection.append(list); body.append(permissionsSection);
    target.append(card('Account & access', 'Your permissions are managed by the workspace owner.', body));
    const operations = node('div', 'card-body'); const values = [];
    if (settings.live_actions_disabled !== undefined) values.push(['Live financial and mailing actions', settings.live_actions_disabled ? 'Disabled' : 'See the capability details below']);
    const capabilities = settings.capabilities || {};
    if (Array.isArray(capabilities)) { for (const item of capabilities) values.push([human(item), 'Available within your permissions']); }
    else for (const [name, value] of Object.entries(capabilities)) if (typeof value === 'boolean' || typeof value === 'string' || typeof value === 'number') values.push([human(name), typeof value === 'boolean' ? (value ? 'Enabled' : 'Disabled') : String(value)]);
    for (const [name, value] of Object.entries(settings)) if (!['capabilities', 'live_actions_disabled'].includes(name) && (typeof value === 'boolean' || typeof value === 'string' || typeof value === 'number')) values.push([human(name), typeof value === 'boolean' ? (value ? 'Enabled' : 'Disabled') : String(value)]);
    operations.append(values.length ? keyValues(values) : node('p', 'muted', 'No additional workspace settings are available to your role.')); target.append(card('Workspace capabilities', 'Current capabilities reported by the CRP service.', operations));
  }

  const permissionMap = {
    overview: 'overview.read', accounts: 'accounts.read', team: 'team.manage', organizations: 'organizations.manage', affiliates: 'affiliate.read', fulfillment: 'fulfillment.read', audit: 'audit.read'
  };
  function allowedViews() {
    return Object.keys(views).filter((view) => {
      if (view === 'settings') return true;
      if (view === 'accounts') return can('accounts.read') || can('cases.read') || can('billing.read');
      return can(permissionMap[view]);
    });
  }
  function renderAccounts(data) {
    const target = clear($('view')); const tabs = []; if (can('accounts.read')) tabs.push(['accounts', 'Accounts']); if (can('cases.read')) tabs.push(['cases', 'Cases']); if (can('billing.read')) tabs.push(['billing', 'Billing status']);
    if (!tabs.some(([id]) => id === state.tab)) state.tab = tabs[0][0];
    target.append(tabBar(tabs, state.tab, (tab) => { state.tab = tab; state.query = ''; state.status = ''; state.page = 1; loadView(); }));
    let columns;
    if (state.tab === 'cases') columns = [
      { label: 'Case', render: (row) => { const copy = node('div'); copy.append(node('strong', '', row.case_id), node('small', '', row.account_id)); return copy; } },
      { label: 'Location', render: (row) => [row.country, row.region].filter(Boolean).join(' · ') },
      { label: 'Status', render: (row) => pill(row.status) },
      { label: 'Files', render: (row) => number(row.file_count) },
      { label: 'Packet', render: (row) => pill(row.packet?.approval_stale ? 'REVIEW_NEEDED' : row.packet?.approved ? 'APPROVED' : row.packet ? 'PENDING' : 'NOT_PREPARED') },
      { label: 'Updated', className: 'cell-nowrap', render: (row) => date(row.updated_at) },
      { label: 'Actions', actions: true, render: (row) => actions(button('View', () => showDetails('Case details', [['Case ID', row.case_id], ['Account ID', row.account_id], ['Country', row.country], ['Region', row.region], ['Status', human(row.status)], ['Files', number(row.file_count)], ['Results', number(row.result_count)], ['Packet ID', row.packet?.packet_id], ['Packet approval', row.packet?.approval_stale ? 'A new review is needed' : row.packet?.approved ? 'Approved by the consumer' : 'Not approved'], ['Approved version', row.packet?.approved_version], ['Created', date(row.created_at, true)], ['Updated', date(row.updated_at, true)]]), 'button secondary small')) }
    ];
    else if (state.tab === 'billing') columns = [
      { label: 'Account', render: (row) => identity(row.email || row.account_id, row.email ? row.account_id : '') },
      { label: 'Plan', render: (row) => human(row.plan_code || row.plan) },
      { label: 'Status', render: (row) => pill(row.status || row.entitlement_status || row.state) },
      { label: 'Paid amount', className: 'money cell-nowrap', render: (row) => row.verified_paid_minor == null ? '—' : money(row.verified_paid_minor, String(row.currency || '').toUpperCase()) },
      { label: 'Created', render: (row) => date(row.created_at) },
      { label: 'Actions', actions: true, render: (row) => actions(button('View', () => showDetails('Billing status', [['Checkout ID', row.checkout_id], ['Account ID', row.account_id], ['Plan', human(row.plan_code || row.plan)], ['Status', human(row.status || row.entitlement_status || row.state)], ['Verified payment', row.verified_paid_minor == null ? 'No verified amount' : money(row.verified_paid_minor, String(row.currency || '').toUpperCase())], ['Paid at', date(row.paid_at, true)], ['Entitlement', human(row.entitlement?.state || row.entitlement?.status)], ['Created', date(row.created_at, true)]], 'Billing information is read-only in this workspace.'), 'button secondary small')) }
    ];
    else columns = [
      { label: 'Account', render: (row) => identity(row.email, row.account_id) },
      { label: 'Setup', render: (row) => pill(row.signup_complete ? 'COMPLETE' : 'PENDING') },
      { label: 'Two-step sign-in', render: (row) => pill(row.two_factor_enabled ? 'ENABLED' : 'NOT_ENABLED') },
      { label: 'Cases', render: (row) => number(row.case_count) },
      { label: 'Joined', className: 'cell-nowrap', render: (row) => date(row.created_at) },
      { label: 'Actions', actions: true, render: (row) => actions(button('View', () => showDetails('Account details', [['Email', row.email], ['Account ID', row.account_id], ['Account setup', row.signup_complete ? 'Complete' : 'Pending'], ['Two-step sign-in', row.two_factor_enabled ? 'Enabled' : 'Not enabled'], ['Cases', number(row.case_count)], ['Joined', date(row.created_at, true)]]), 'button secondary small')) }
    ];
    if (state.tab === 'billing' && Array.isArray(data.totals) && data.totals.length) { const totals = node('div', 'inline-summary'); for (const total of data.totals) { const item = node('div', 'info-block'); item.append(node('span', 'info-label', `${total.currency} · ${number(total.purchase_count)} verified purchases`), node('span', 'info-value money', money(total.verified_paid_minor, total.currency))); totals.append(item); } target.append(totals); }
    target.append(listCard(data, columns, { placeholder: state.tab === 'accounts' ? 'Search accounts by email or ID…' : 'Search by account or case ID…', emptyTitle: 'No matching records', emptyDescription: state.query ? 'Try another search or clear the filters.' : 'Records you can access will appear here.' }));
    if (state.tab === 'billing' && data.money_actions_enabled === false) target.append(node('p', 'section-note', 'Financial actions are disabled. This view shows verified payment records only.'));
  }
  function organizationForm(row) {
    dialog({ title: row ? 'Edit organization' : 'Add an organization', description: 'Each organization has its own permitted workspace. Consumer access must be shared separately.',
      fields: [{ name: 'name', label: 'Organization name', required: true, value: row?.name || '', maxLength: 120, wide: true }, ...(row ? [{ name: 'status', label: 'Status', value: row.status, options: ['ACTIVE', 'DISABLED'], required: true, wide: true }] : [])], submit: row ? 'Save organization' : 'Add organization',
      onSave: (values) => mutate(row ? `/api/admin/organizations/${encodeURIComponent(row.org_id)}` : '/api/admin/organizations', { name: values.name.trim(), ...(row ? { status: values.status } : {}) }, row ? 'Organization updated.' : 'Organization added.', row ? 'PATCH' : 'POST') });
  }
  function renderOrganizations(data) {
    if (can('organizations.manage')) $('page-actions').append(button('+ Add organization', () => organizationForm(), 'button primary'));
    clear($('view')).append(listCard(data, [
      { label: 'Organization', render: (row) => identity(row.name, row.org_id) },
      { label: 'Status', render: (row) => pill(row.status) },
      { label: 'Actions', actions: true, render: (row) => actions(
        button('Sharing link', () => dialog({ title: 'Consumer sharing link', description: 'A consumer can use this link to review and explicitly grant access to this organization. Copy and share it through your approved process.', fields: [{ name: 'sharing_link', label: `Link for ${row.name}`, value: `${window.location.origin}/partner-access?organization=${encodeURIComponent(row.org_id)}`, readOnly: true, wide: true }], submit: 'Copy link', onSave: async () => { if (!navigator.clipboard?.writeText) { $('edit-sharing_link').focus(); $('edit-sharing_link').select(); toast('Select and copy the sharing link.'); return; } await navigator.clipboard.writeText(`${window.location.origin}/partner-access?organization=${encodeURIComponent(row.org_id)}`); $('editor').close(); toast('Sharing link copied.'); } }), 'button secondary small'),
        can('organizations.manage') ? button('Edit', () => organizationForm(row), 'button secondary small') : null
      ) }
    ], { placeholder: 'Search organizations…', statuses: ['ACTIVE', 'DISABLED'], emptyTitle: 'No organizations yet', emptyDescription: 'Organizations added to your workspace will appear here.' }));
  }
  function permissionFields(selected = [], role = 'staff') {
    const wrap = node('fieldset', 'permission-fieldset'); const legend = node('legend', '', 'Permissions'); wrap.append(legend, node('p', 'field-help', role === 'owner' ? 'Owners have full administration access. These permissions cannot be limited. The service protects the last active owner.' : 'Select only the access this person needs. The service validates every permission.'));
    for (const value of grantablePermissions(role)) { const label = node('label', 'checkbox-label'); const input = node('input'); input.type = 'checkbox'; input.name = 'permissions'; input.value = value; input.checked = role === 'owner' || selected.includes(value); input.disabled = role === 'owner'; label.append(input, node('span', '', human(value))); wrap.append(label); }
    return wrap;
  }
  function grantablePermissions(role) {
    const staff = ['overview.read', 'accounts.read', 'cases.read', 'billing.read', 'affiliate.read', 'affiliate.manage', 'fulfillment.read', 'fulfillment.prepare', 'fulfillment.grants', 'audit.read'];
    return role === 'owner' ? [...staff, 'team.manage', 'organizations.manage'] : role === 'partner' ? ['overview.read', 'affiliate.read', 'fulfillment.read', 'fulfillment.prepare'] : staff;
  }
  function teamForm(row) {
    const create = !row; const roles = [{ value: 'staff', label: 'Staff — assigned permissions' }, { value: 'partner', label: 'Partner — limited organization access' }];
    if (state.session.role === 'owner') roles.push({ value: 'owner', label: 'Owner — full administration' });
    const fields = [...(create ? [{ name: 'account_id', label: 'Existing CRP account ID', required: true, maxLength: 128, wide: true, help: 'The person must already have a complete CRP account with verified email and two-step sign-in.' }] : [{ name: 'status', label: 'Status', options: ['ACTIVE', 'DISABLED'], value: row.status, required: true }]), { name: 'role', label: 'Role', options: roles, required: true, value: row?.role || 'staff', help: 'Only a current owner can assign full owner access.' }, { name: 'org_id', label: 'Organization ID', value: row?.org_id || '', maxLength: 128, required: row?.role === 'partner', help: 'Required only for a partner. The organization must be active.' }];
    const chosen = row?.permissions || []; const content = permissionFields(chosen, row?.role || 'staff');
    dialog({ title: create ? 'Add a team member' : 'Edit team access', description: create ? 'Connect an existing account to this workspace. Every team member needs verified email, completed account setup and two-step sign-in.' : `Update access for ${row.email || row.account_id}. Changes are recorded in the activity log. The service requires at least one active owner.`, fields, content, submit: create ? 'Add team member' : 'Save access',
      onSave: () => { const form = new FormData($('editor-form')); const role = form.get('role'); const body = { role, permissions: role === 'owner' ? grantablePermissions('owner') : form.getAll('permissions'), ...(create ? { account_id: String(form.get('account_id') || '').trim() } : { status: form.get('status') }) }; const org = String(form.get('org_id') || '').trim(); body.org_id = role === 'partner' ? org || null : null; if (role === 'partner' && !org) throw new Error('Enter an organization ID for this partner.'); return mutate(create ? '/api/admin/team' : `/api/admin/team/${encodeURIComponent(row.admin_id)}`, body, create ? 'Team member added.' : 'Team access updated.', create ? 'POST' : 'PATCH'); } });
    $('edit-org_id').disabled = $('edit-role').value !== 'partner';
    $('edit-role').addEventListener('change', () => { const selected = [...$('editor-fields').querySelectorAll('input[name=permissions]:checked')].map((item) => item.value); $('editor-fields').querySelector('.permission-fieldset').replaceWith(permissionFields(selected, $('edit-role').value)); $('edit-org_id').required = $('edit-role').value === 'partner'; $('edit-org_id').disabled = $('edit-role').value !== 'partner'; });
  }
  function renderTeam(data) {
    if (can('team.manage')) $('page-actions').append(button('+ Add team member', () => teamForm(), 'button primary'));
    clear($('view')).append(listCard(data, [
      { label: 'Team member', render: (row) => identity(row.email || row.account_id, row.email ? row.account_id : row.admin_id) },
      { label: 'Role', render: (row) => human(row.role) },
      { label: 'Organization', render: (row) => text(row.org_id, 'CRP workspace') },
      { label: 'Status', render: (row) => pill(row.status) },
      { label: 'Permissions', render: (row) => `${number(row.permissions?.length || 0)} assigned` },
      { label: 'Actions', actions: true, render: (row) => actions(button('View', () => { const content = keyValues([['Email', row.email], ['Account ID', row.account_id], ['Team ID', row.admin_id], ['Role', human(row.role)], ['Organization', row.org_id || 'CRP workspace'], ['Status', human(row.status)]]); const section = node('div', 'detail-section'); section.append(node('h3', '', 'Permissions')); const list = node('ul', 'permission-list'); for (const permission of row.permissions || []) list.append(node('li', '', human(permission))); section.append(list); content.append(section); dialog({ title: 'Team member', content }); }, 'button secondary small'), can('team.manage') ? button('Edit', () => teamForm(row), 'button secondary small') : null) }
    ], { placeholder: 'Search team members…', statuses: ['ACTIVE', 'DISABLED'], emptyTitle: 'No team members to show', emptyDescription: 'Your permitted team members will appear here.' }));
  }
  function affiliateForm() {
    dialog({ title: 'Enroll an affiliate', description: 'Enroll an existing CRP account. An introducer connects the account to the existing three-level referral network.',
      fields: [{ name: 'account_id', label: 'CRP account ID', required: true, maxLength: 128, wide: true }, { name: 'introducer_code', label: 'Introducer code', maxLength: 12, help: 'Optional. Use an existing affiliate’s code.' }, { name: 'org_id', label: 'Organization ID', maxLength: 128, help: 'Optional. Use the permitted partner organization.' }], submit: 'Enroll affiliate',
      onSave: (values) => { const body = { account_id: values.account_id.trim() }; if (values.introducer_code.trim()) body.introducer_code = values.introducer_code.trim(); if (values.org_id.trim()) body.org_id = values.org_id.trim(); return mutate('/api/admin/affiliates/enroll', body, 'Affiliate enrolled.'); } });
  }
  function holdForm(row, release = false) {
    dialog({ title: release ? 'Release affiliate hold?' : 'Place affiliate on hold', description: release ? `Release the administrative hold on ${row.account_id}. This does not initiate a payment.` : `Pause eligibility for ${row.account_id} while the selected review is completed.`, fields: release ? [] : [{ name: 'reason', label: 'Reason for hold', options: ['MANUAL_REVIEW', 'REFUND_REVIEW', 'ACCOUNT_REVIEW'], required: true, wide: true }], submit: release ? 'Release hold' : 'Place hold', danger: !release,
      onSave: (values) => mutate(`/api/admin/affiliates/${encodeURIComponent(row.account_id)}/hold`, release ? undefined : { reason: values.reason }, release ? 'Affiliate hold released.' : 'Affiliate hold recorded.', release ? 'DELETE' : 'POST') });
  }
  function affiliateDetails(row, data) {
    const content = node('div'); content.append(keyValues([['Account ID', row.account_id], ['Referral code', row.code], ['Introduced by', row.introduced_by || 'No introducer'], ['Organization', row.org_id || 'CRP workspace'], ['Status', row.held ? 'On hold' : human(row.status || 'ENROLLED')]]));
    const section = node('div', 'detail-section'); section.append(node('h3', '', 'Visible referral network'));
    let previous = [row.account_id]; const levels = [];
    for (let level = 1; level <= 3; level++) { const children = data.members.filter((member) => previous.includes(member.introduced_by)); levels.push([`Level ${level}`, children.length ? children.map((member) => member.account_id).join(', ') : 'No members in this view']); previous = children.map((member) => member.account_id); }
    section.append(keyValues(levels), node('p', 'field-help', 'This view includes only members your account is permitted to see.')); content.append(section); dialog({ title: 'Affiliate details', description: 'Referral codes and network records are separate from payment execution.', content });
  }
  function renderAffiliates(data) {
    if (can('affiliate.manage')) $('page-actions').append(button('Reconcile verified purchases', affiliateSync, 'button secondary'), button('+ Enroll affiliate', affiliateForm, 'button primary'));
    const target = clear($('view')); const policy = data.policy || {}; const levels = node('div', 'level-grid');
    for (let level = 1; level <= 3; level++) { const rate = policy[`level${level}_bps`]; const wrap = node('article', 'level-card'); wrap.append(node('span', 'level-label', `LEVEL ${level}`), node('div', 'level-rate', Number.isFinite(rate) ? `${rate / 100}%` : '—'), node('p', '', level === 1 ? 'Direct referral' : level === 2 ? 'Second-level referral' : 'Third-level referral')); levels.append(wrap); } target.append(levels);
    const tabs = [['members', 'Members'], ['rewards', 'Rewards'], ['tranches', 'Schedule'], ['holds', 'Holds']]; if (!tabs.some(([id]) => id === state.tab)) state.tab = 'members';
    target.append(tabBar(tabs, state.tab, (tab) => { state.tab = tab; state.query = ''; state.status = ''; state.page = 1; loadView(); }));
    const rows = Array.isArray(data[state.tab]) ? data[state.tab] : []; let columns;
    if (state.tab === 'members') columns = [
      { label: 'Affiliate account', render: (row) => identity(row.account_id, row.org_id) },
      { label: 'Referral code', render: (row) => node('span', 'code', row.code) },
      { label: 'Introduced by', render: (row) => text(row.introduced_by, 'Direct enrollment') },
      { label: 'Status', render: (row) => pill(row.held ? 'ON_HOLD' : row.status || 'ENROLLED') },
      { label: 'Actions', actions: true, render: (row) => actions(button('View', () => affiliateDetails(row, data), 'button secondary small'), can('affiliate.manage') ? button(row.held ? 'Release hold' : 'Hold', () => holdForm(row, row.held), 'button secondary small') : null) }
    ];
    else if (state.tab === 'rewards') columns = [
      { label: 'Affiliate', render: (row) => { const copy = node('div'); copy.append(node('strong', '', row.referrer_id), node('small', '', row.reward_id)); return copy; } },
      { label: 'Level', render: (row) => `Level ${row.level}` }, { label: 'Rate', render: (row) => `${row.rate_bps / 100}%` },
      { label: 'Reward', className: 'money cell-nowrap', render: (row) => money(row.amount_minor, row.currency) },
      { label: 'Reserve', className: 'money cell-nowrap', render: (row) => money(row.reserve_minor, row.currency) }, { label: 'Status', render: (row) => pill(row.status) }
    ];
    else if (state.tab === 'tranches') columns = [
      { label: 'Affiliate', render: (row) => { const copy = node('div'); copy.append(node('strong', '', row.referrer_id), node('small', '', row.tranche_id)); return copy; } },
      { label: 'Level', render: (row) => `Level ${row.level}` }, { label: 'Type', render: (row) => human(row.kind) },
      { label: 'Amount', className: 'money cell-nowrap', render: (row) => money(row.amount_minor, row.currency) }, { label: 'Scheduled', className: 'cell-nowrap', render: (row) => date(row.due_at) }, { label: 'Status', render: (row) => pill(row.status) }
    ];
    else columns = [{ label: 'Affiliate', render: (row) => identity(row.account_id, row.org_id) }, { label: 'Reason', render: (row) => human(row.reason) }, { label: 'Held since', render: (row) => date(row.held_at, true) }, { label: 'Actions', actions: true, render: (row) => can('affiliate.manage') ? actions(button('Release hold', () => holdForm(row, true), 'button secondary small')) : '—' }];
    target.append(listCard(filteredPage(rows), columns, { placeholder: `Search ${state.tab === 'tranches' ? 'scheduled rewards' : state.tab}…`, statuses: [...new Set(rows.map((row) => row.status).filter(Boolean))], emptyTitle: `No ${state.tab === 'tranches' ? 'scheduled rewards' : state.tab} to show`, emptyDescription: 'Matching records will appear here when available to your workspace.' }));
    const detail = node('p', 'section-note');
    if (Number.isFinite(policy.hold_days) && Number.isFinite(policy.reserve_days) && Number.isFinite(policy.reserve_bps)) detail.textContent = `Rewards use the verified first purchase price before tax. The initial hold is ${policy.hold_days} days; ${policy.reserve_bps / 100}% is reserved for ${policy.reserve_days} days. Scheduled records do not initiate a payment.`;
    target.append(detail); if (data.payouts_enabled === false) { const notice = node('div', 'notice', 'Payout execution is disabled. Enrollment and holds manage affiliate records only.'); target.append(notice); }
  }
  function affiliateSync() {
    dialog({ title: 'Reconcile verified purchases?', description: 'Update referral reward records from purchases and refunds already verified by CRP. This does not purchase a service or send a payout.', submit: 'Reconcile records',
      onSave: async () => {
        const result = await api('POST', '/api/admin/affiliates/sync', {});
        $('editor').close(); state.dialog = null;
        toast(`Reconciliation completed: ${number(result.reward_count)} reward records and ${number(result.refund_count)} refund records.`); await loadView();
      } });
  }
  function fulfillmentForm() {
    let request = 0;
    const description = 'Choose a current consumer sharing grant. The service confirms the organization, consumer approval and packet version before a task is created.';
    async function loadGrants(offset = 0) {
      const generation = ++request; const marker = node('div', 'loading-state'); marker.setAttribute('role', 'status'); marker.append(node('span', 'spinner'), node('span', '', 'Loading current sharing grants…'));
      dialog({ title: 'Add a fulfillment task', description, content: marker });
      try {
        const data = await api('GET', `/api/admin/fulfillment-grants?status=ACTIVE&limit=100&offset=${offset}`);
        if (generation !== request || !$('editor').open || !marker.isConnected) return;
        const items = (data.items || []).filter((item) => item.status === 'ACTIVE'); const total = Number(data.total) || 0; const limit = Number(data.limit) || 100; const currentOffset = Number(data.offset) || 0; const content = node('div');
        if (total > limit) {
          const controls = node('div', 'pagination'); controls.append(node('span', '', `${number(currentOffset + 1)}–${number(Math.min(currentOffset + limit, total))} of ${number(total)} grants`)); const row = node('div', 'pagination-controls');
          const previous = button('← Previous', () => loadGrants(Math.max(0, currentOffset - limit))); previous.disabled = currentOffset === 0;
          const next = button('Next →', () => loadGrants(currentOffset + limit)); next.disabled = currentOffset + limit >= total; row.append(previous, next); controls.append(row); content.append(controls);
        }
        if (!items.length) content.prepend(empty('No active sharing grants', 'A consumer must approve a packet and explicitly share it with an eligible organization before a task can be added.'));
        const allowed = new Set(items.map((item) => item.grant_id));
        dialog({ title: 'Add a fulfillment task', description, content,
          fields: items.length ? [{ name: 'grant_id', label: 'Approved consumer grant', required: true, wide: true, options: [{ value: '', label: 'Choose an approved consumer grant' }, ...items.map((item) => ({ value: item.grant_id, label: `${item.organization_name || item.org_id} · ${item.case_id} · ${item.grant_id}` }))] }] : [],
          submit: 'Add task', onSave: items.length ? (values) => { if (!allowed.has(values.grant_id)) throw new Error('Choose a current consumer sharing grant.'); return mutate('/api/admin/fulfillment', { grant_id: values.grant_id }, 'Fulfillment task created.'); } : undefined });
      } catch (error) {
        if (generation !== request || !$('editor').open || !marker.isConnected) return;
        const failure = node('div', 'notice error', error.message); failure.setAttribute('role', 'alert'); const content = node('div'); content.append(failure, button('Try again', () => loadGrants(offset)));
        dialog({ title: 'Add a fulfillment task', description, content });
      }
    }
    loadGrants();
  }
  function fulfillmentStatus(row, status) {
    dialog({ title: status === 'REVIEWED' ? 'Mark this task reviewed?' : 'Cancel this task?', description: `Task ${row.job_id} will be marked ${status === 'REVIEWED' ? 'reviewed' : 'cancelled'}. This changes the work record only.`, submit: status === 'REVIEWED' ? 'Mark reviewed' : 'Cancel task', danger: status === 'CANCELLED', onSave: () => mutate(`/api/admin/fulfillment/${encodeURIComponent(row.job_id)}`, { status }, status === 'REVIEWED' ? 'Task marked reviewed.' : 'Task cancelled.', 'PATCH') });
  }
  function renderFulfillment(data) {
    if (can('fulfillment.grants')) $('page-actions').append(button('+ Add task', fulfillmentForm, 'button primary'));
    const target = clear($('view')); target.append(listCard(data, [
      { label: 'Task', render: (row) => { const copy = node('div'); copy.append(node('strong', '', row.job_id), node('small', '', row.case_id)); return copy; } },
      { label: 'Organization', render: (row) => row.org_id }, { label: 'Packet version', render: (row) => row.approved_version }, { label: 'Status', render: (row) => pill(row.status) },
      { label: 'Updated', className: 'cell-nowrap', render: (row) => date(row.updated_at || row.created_at) },
      { label: 'Actions', actions: true, render: (row) => { const download = row.access_available ? node('a', 'button secondary small', 'Open packet ↗') : null; if (download) { download.href = `/api/admin/fulfillment/${encodeURIComponent(row.job_id)}/packet`; download.target = '_blank'; download.rel = 'noopener noreferrer'; }
        return actions(button('View', () => showDetails('Fulfillment task', [['Task ID', row.job_id], ['Organization', row.org_id], ['Consumer grant', row.grant_id], ['Case ID', row.case_id], ['Packet ID', row.packet_id], ['Approved version', row.approved_version], ['Status', human(row.status)], ['Packet access', row.access_available ? 'Available with current approval' : 'Unavailable — a current consumer grant and approval are required'], ['Created', date(row.created_at, true)], ['Updated', date(row.updated_at, true)]]), 'button secondary small'), download, can('fulfillment.prepare') && row.status === 'QUEUED' ? button('Review', () => fulfillmentStatus(row, 'REVIEWED'), 'button secondary small') : null, can('fulfillment.prepare') && row.status !== 'CANCELLED' ? button('Cancel', () => fulfillmentStatus(row, 'CANCELLED'), 'button secondary small') : null); } }
    ], { statuses: ['QUEUED', 'REVIEWED', 'CANCELLED'], placeholder: 'Search task or case ID…', emptyTitle: 'No fulfillment tasks', emptyDescription: 'Tasks created from a consumer’s valid sharing grant will appear here.' }));
    if (data.mailing_enabled === false) target.append(node('div', 'notice', 'Mailing is disabled. Reviewing or cancelling a task does not print, mail or purchase delivery.'));
  }
  function renderAudit(data) {
    clear($('view')).append(listCard(data, [
      { label: 'Activity', render: (row) => { const copy = node('div'); copy.append(node('strong', '', human(row.event || row.action)), node('small', '', row.audit_id || row.event_id)); return copy; } },
      { label: 'Person', render: (row) => { const identity = node('div'); identity.append(node('strong', '', row.actor_admin_id || row.actor_account_id || '—')); if (row.actor_role) identity.append(node('small', '', human(row.actor_role))); return identity; } },
      { label: 'Organization', render: (row) => row.org_id || row.metadata?.org_id }, { label: 'Time', className: 'cell-nowrap', render: (row) => date(row.at || row.created_at || row.timestamp, true) },
      { label: 'Actions', actions: true, render: (row) => actions(button('View', () => { const references = row.metadata || row.refs; const refs = references && typeof references === 'object' ? Object.entries(references).filter(([, value]) => typeof value === 'string' || typeof value === 'number').map(([key, value]) => [human(key), value]) : [];
        showDetails('Activity details', [['Activity', human(row.event || row.action)], ['Activity ID', row.audit_id || row.event_id], ['Person’s team ID', row.actor_admin_id], ['Person’s account ID', row.actor_account_id], ['Person’s role', human(row.actor_role)], ['Organization', row.org_id], ['Time', date(row.at || row.created_at || row.timestamp, true)], ...refs]); }, 'button secondary small')) }
    ], { placeholder: 'Search activities or references…', emptyTitle: 'No activity to show', emptyDescription: 'Recorded activity within your permitted workspace will appear here.' }));
  }

  async function loadView({ keepSearchFocus = false } = {}) {
    if (!state.session) return; const generation = ++state.generation; const selected = state.view;
    header(selected); loading(); $('refresh-button').disabled = true;
    const params = new URLSearchParams({ page: String(state.page), page_size: String(state.pageSize) }); if (state.query) params.set('q', state.query); if (state.status) params.set('status', state.status);
    let path = selected;
    if (selected === 'accounts') {
      const tabs = []; if (can('accounts.read')) tabs.push('accounts'); if (can('cases.read')) tabs.push('cases'); if (can('billing.read')) tabs.push('billing');
      if (!tabs.includes(state.tab)) state.tab = tabs[0]; path = state.tab;
    }
    try {
      const data = await api('GET', `/api/admin/${path}${['overview', 'settings', 'affiliates'].includes(path) ? '' : `?${params}`}`);
      if (generation !== state.generation || !state.session) return;
      const renderers = { overview: renderOverview, accounts: renderAccounts, organizations: renderOrganizations, team: renderTeam, affiliates: renderAffiliates, fulfillment: renderFulfillment, audit: renderAudit, settings: renderSettings };
      renderers[selected](data); $('updated-at').textContent = `Updated ${new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date())}`;
      if (keepSearchFocus) { const input = $('view').querySelector('input[type=search]'); input?.focus(); if (input) input.setSelectionRange(input.value.length, input.value.length); }
    } catch (error) { if (generation === state.generation) errorView(error); }
    finally { if (generation === state.generation) { $('view').setAttribute('aria-busy', 'false'); $('refresh-button').disabled = false; } }
  }
  function navigate(view, { focus = false } = {}) {
    window.clearTimeout(state.searchTimer); if (!allowedViews().includes(view)) view = allowedViews()[0] || 'settings';
    state.view = view; state.tab = view === 'accounts' ? 'accounts' : 'members'; state.query = ''; state.status = ''; state.page = 1;
    window.history.replaceState(null, '', `#${view}`); closeMobile(); loadView(); if (focus) $('workspace-content').focus();
  }
  function enterWorkspace(session) {
    if (!session || !['owner', 'staff', 'partner'].includes(session.role) || !Array.isArray(session.permissions)) throw new Error('Your workspace session could not be read. Try signing in again.');
    state.session = session; $('workspace').hidden = false; $('auth-shell').hidden = true; document.querySelector('.skip-link').setAttribute('href', '#workspace-content');
    $('identity-name').textContent = session.email; $('identity-role').textContent = `${human(session.role)}${session.organization?.name ? ` · ${session.organization.name}` : ''}`;
    $('identity-avatar').textContent = initials(session.email); $('workspace-name').textContent = session.organization?.name || (session.role === 'partner' ? 'Partner workspace' : 'Administration'); $('refresh-button').disabled = false;
    const nav = clear($('navigation'));
    for (const view of allowedViews()) { const link = button('', () => navigate(view, { focus: true }), ''); link.dataset.view = view; link.append(svg(view), node('span', '', views[view].label)); nav.append(link); }
    navigate(window.location.hash.slice(1) || state.view);
  }
  async function checkSession() {
    $('auth-checking').hidden = false; $('login-form').hidden = true; $('access-message').hidden = true; $('retry-session').hidden = false;
    try {
      let data;
      try { data = await api('GET', '/api/admin/session', undefined, { sessionCheck: true }); }
      catch(error) { if(error.code!=='TWO_FACTOR_REQUIRED')throw error;await api('POST','/api/admin/unlock',{}, {sessionCheck:true});data=await api('GET','/api/admin/session',undefined,{sessionCheck:true}); }
      enterWorkspace(data.session || data.principal);
    }
    catch (error) {
      if (error.code === 'TWO_FACTOR_REQUIRED') showLogin('Sign in with your password and authenticator to open administration.');
      else if (error.code === 'ADMIN_SECURITY_REQUIRED') showAccess('Complete your CRP account setup, verify your email and enable two-step sign-in before opening administration. You can manage these in your CRP account.');
      else if (error.status === 401) showLogin();
      else if (error.code === 'NOT_AUTHORIZED' || error.status === 403) showAccess('This account does not have an active administration role. Ask your workspace owner to check your access.');
      else if (error.status === 404) { showAccess('The administration workspace is not enabled on this service.'); $('retry-session').hidden = true; }
      else { showAccess(error.message); $('retry-session').hidden = false; }
    } finally { $('auth-checking').hidden = true; }
  }
  async function signOut() {
    const controls = [$('sign-out'), $('auth-sign-out')]; for (const control of controls) control.disabled = true;
    try { await api('POST', '/api/admin/lock', {}, { sessionCheck: true }).catch(() => {}); await api('DELETE', '/api/sessions/current', undefined, { sessionCheck: true }); if ($('editor').open) $('editor').close(); showLogin(); $('login-email').focus(); }
    catch (error) { toast(error.message, true); }
    finally { for (const control of controls) control.disabled = false; }
  }

  $('toggle-password').addEventListener('click', () => { const show = $('login-password').type === 'password'; $('login-password').type = show ? 'text' : 'password'; $('toggle-password').textContent = show ? 'Hide password' : 'Show password'; $('toggle-password').setAttribute('aria-pressed', String(show)); });
  $('menu-toggle').addEventListener('click', () => $('sidebar').classList.contains('open') ? closeMobile() : openMobile()); $('mobile-backdrop').addEventListener('click', closeMobile);
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && $('sidebar').classList.contains('open')) { closeMobile(); $('menu-toggle').focus(); } });
  $('editor-close').addEventListener('click', closeDialog); $('editor-cancel').addEventListener('click', closeDialog);
  $('editor').addEventListener('cancel', (event) => { if ($('editor-form').getAttribute('aria-busy') === 'true') event.preventDefault(); });
  $('editor-form').addEventListener('submit', async (event) => { event.preventDefault(); if (!state.dialog) return; setBusy($('editor-form'), true); showError('editor-error', ''); try { await state.dialog(Object.fromEntries(new FormData($('editor-form')))); } catch (error) { showError('editor-error', error.message); } finally { setBusy($('editor-form'), false); } });
  $('login-form').addEventListener('submit', async (event) => {
    event.preventDefault(); showError('login-error', ''); setBusy($('login-form'), true);
    try { await api('POST', '/api/sessions', { email: $('login-email').value.trim(), password: $('login-password').value, code: $('login-code').value.trim() }, { sessionCheck: true }); $('login-password').value = ''; $('login-code').value = ''; await api('POST', '/api/admin/unlock', {}, { sessionCheck: true }); await checkSession(); }
    catch (error) { showError('login-error', error.message); if (error.code === 'TWO_FACTOR_REQUIRED' || error.code === 'TWO_FACTOR_INVALID') { $('login-otp-field').hidden = false; $('login-code').required = true; $('login-code').focus(); } }
    finally { setBusy($('login-form'), false); }
  });
  $('refresh-button').addEventListener('click', () => loadView()); $('retry-session').addEventListener('click', checkSession);
  for (const id of ['sign-out', 'auth-sign-out']) $(id).addEventListener('click', signOut);
  window.addEventListener('hashchange', () => { if (state.session) navigate(window.location.hash.slice(1)); });
  const closeMenu = button('×', () => { closeMobile(); $('menu-toggle').focus(); }, 'icon-button mobile-close'); closeMenu.setAttribute('aria-label', 'Close navigation'); $('sidebar').append(closeMenu);
  checkSession();
})();
