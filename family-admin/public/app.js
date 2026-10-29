"use strict";
const $ = (id) => document.getElementById(id),
  S = {
    session: null,
    csrf: null,
    view: "overview",
    page: 1,
    query: "",
    generation: 0,
    dialog: null,
    market: 'CA',
    locked: false, resumeDialog: false, hasWorkspace: false,
  };
const labels = {
  crp: "CRP Consumer",
  affiliate: "Affiliate Program",
  mail: "Mail Operations",
};
const pages = {
  overview: {
    label: "Family overview",
    icon: "◫",
    description: "A clear view across your three applications.",
  },
  accounts: {
    label: "Consumer accounts",
    app: "crp",
    resource: "accounts",
    icon: "♙",
  },
  cases: { label: "Cases & packets", app: "crp", resource: "cases", icon: "▤" },
  billing: {
    label: "Consumer billing",
    app: "crp",
    resource: "billing",
    icon: "▣",
  },
  organizations: {
    label: "Organizations",
    app: "crp",
    resource: "organizations",
    icon: "▦",
  },
  campaigns: {
    label: "Campaigns",
    app: "affiliate",
    resource: "campaigns",
    icon: "↗",
  },
  holds: {
    label: "Commission holds",
    app: "affiliate",
    resource: "holds",
    icon: "◷",
  },
  partners: {
    label: "Partners",
    app: "affiliate",
    resource: "partners",
    icon: "♧",
  },
  commissions: {
    label: "Commissions",
    app: "affiliate",
    resource: "commissions",
    icon: "↗",
  },
  proposals: {
    label: "Payout review",
    app: "affiliate",
    resource: "proposals",
    icon: "▣",
  },
  orders: {
    label: "Mailing orders",
    app: "mail",
    resource: "orders",
    icon: "✉",
  },
  pricing: {
    label: "Mailing prices",
    app: "mail",
    resource: "pricing",
    icon: "≡",
  },
  routes: {
    label: "Mailing routes",
    app: "mail",
    resource: "routes",
    icon: "⌁",
  },
  team: { label: "Team & access", icon: "♙" },
  activity: { label: "Activity log", icon: "◷" },
};
for (const [id,label,app,resource] of [
  ['referrals','Consumer referral ledger','crp','referrals'],
  ['fulfillment','Consumer sharing tasks','crp','fulfillment'],
  ['grants','Consumer sharing grants','crp','grants'],
  ['settings','CRP settings','crp','settings'],
  ['report','Affiliate program report','affiliate','report'],
  ['contacts','Affiliate contacts','affiliate','contacts'],
  ['communications','Affiliate communications','affiliate','communications'],
  ['assets','Campaign assets','affiliate','assets'],
  ['tickets','Partner support','affiliate','tickets'],
  ['consumer-support','Consumer support','crp','support'],
  ['consumer-outcomes','Consumer service review','crp','outcomes'],
  ['partner-liabilities','Partner payment review','affiliate','liabilities'],
  ['partner-assurance','Partner service review','affiliate','assurance'],
  ['publishing-evidence','Publishing evidence','affiliate','placements'],
  ['onboarding','Partner onboarding','affiliate','onboarding'],
  ['evidence','Commission concern evidence','affiliate','evidence'],
  ['resources','Approved affiliate resources','affiliate','resources'],
]) pages[id]={label,app,resource,icon:'≡'};
function el(tag, text, cls) {
  const n = document.createElement(tag);
  if (text !== undefined && text !== null) n.textContent = String(text);
  if (cls) n.className = cls;
  return n;
}
function btn(text, fn, cls) {
  const b = el("button", text, cls);
  b.type = "button";
  b.addEventListener("click", fn);
  return b;
}
function human(s) {
  return String(s || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_:.]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
function notice(text) {
  $("notice").textContent = text || "";
}
function focusAuth(form) {
  document.querySelector('.skip').href = '#auth-main';
  $(form).querySelector('input')?.focus();
}
async function api(path, { method = "GET", body } = {}) {
  const r = await fetch(path, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
      ...(method !== "GET" ? { "x-csrf-token": S.csrf || "" } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data;
  try {
    data = await r.json();
  } catch {
    throw Error("The workspace returned an unreadable response.");
  }
  if (!r.ok) {
    const e = Object.assign(
      Error(data.error?.message || "This request could not be completed."),
      { code: data.error?.code, status: r.status },
    );
    if (e.code === 'PRIMARY_AUTHENTICATION_REQUIRED') showReauthentication();
    else if (e.code === 'ADMIN_UNLOCK_REQUIRED') showUnlock();
    else if (["SESSION_REQUIRED","AUTHENTICATION_REQUIRED"].includes(e.code)) showLogin(e.message);
    throw e;
  }
  return data;
}
function showLogin(error = "") {
  $('reauth').hidden=true;
  $('reauth').reset();
  S.locked=false;S.resumeDialog=false;S.hasWorkspace=false;activityAt=0;
  S.session = null;
  S.csrf = null;
  S.generation++;
  $("workspace").hidden = true;
  $("auth").hidden = false;
  $("login").hidden = false;
  $("unlock").hidden = true;
  $("auth-error").textContent = error;
  $('auth-title').textContent='Welcome to your workspace';
  $('auth-help').textContent='Sign in with your CRP administration account and authenticator.';
  $("content").replaceChildren();
  if ($("dialog").open) $("dialog").close();
  document.body.classList.remove("nav-open");
  focusAuth('login');
}
function showUnlock() {
  if(!S.session || S.locked)return;
  $('reauth').hidden=true;
  S.locked=true;
  S.generation++;
  S.resumeDialog=$('dialog').open;
  if(S.resumeDialog){for(const {input,f} of S.dialog.nodes.values())if(f.name==='freshCode'||f.type==='password')input.value='';$('dialog').close();}
  $('workspace').hidden=true;$('auth').hidden=false;
  $('login').hidden=true;$('unlock').hidden=false;
  $('auth-title').textContent='Unlock your workspace';
  $('auth-help').textContent='Your workspace locked after inactivity. Enter a current authenticator code to return to your page and draft.';
  $('auth-error').textContent='';
  focusAuth('unlock');
}
function showReauthentication() {
  if (!S.locked) showUnlock();
  $('workspace').hidden=true; $('auth').hidden=false;
  $('login').hidden=true; $('unlock').hidden=true; $('reauth').hidden=false;
  $('auth-title').textContent='Confirm your sign-in';
  $('auth-help').textContent='Your underlying sign-in expired. Your page and draft are kept. Enter your password and authenticator, then a fresh code to unlock administration.';
  focusAuth('reauth');
}
function sessionStatus() {
  if(!S.session || S.locked)return;
  const remaining=Date.parse(S.session.expiresAt)-Date.now();
  $('session-status').textContent=remaining<120000?'Your workspace will lock soon if you remain inactive. Your page and draft will be kept.':'';
  if(remaining<=0)showUnlock();
}
let activityAt=0,activityPending=false;
async function userActivity(event) {
  if(!event.isTrusted || document.visibilityState==='hidden' || !S.session || S.locked || activityPending || Date.now()-activityAt<60000)return;
  activityPending=true;
  const session = S.session, generation = S.generation;
  try {const update=await api('/api/activity',{method:'POST',body:{}});if(S.session!==session||S.generation!==generation)return;Object.assign(session,update);activityAt=Date.now();sessionStatus();}
  catch(error){if(error.status!==401)notice('Activity could not be confirmed. Your workspace may lock; your draft will be kept.');}
  finally{activityPending=false;}
}
document.addEventListener('pointerdown',userActivity,true);
document.addEventListener('keydown',userActivity,true);
function unlocked(session) {
  $('reauth').hidden=true;
  const resuming=S.locked&&S.hasWorkspace&&S.session?.subject===session.subject&&S.session?.role===session.role&&JSON.stringify(S.session?.permissions)===JSON.stringify(session.permissions);
  if(S.locked&&!resuming){$('content').replaceChildren();closeDialog();}
  S.session = session;
  S.locked=false;
  S.hasWorkspace=true;
  S.csrf = session.csrf;
  $("auth").hidden = true;
  $("workspace").hidden = false;
  document.querySelector('.skip').href = '#main';
  $("environment").textContent = session.environment.toUpperCase();
  $("environment").classList.toggle(
    "production",
    session.environment === "production",
  );
  $("who").textContent = session.email || session.role;
  $("demo-banner").hidden = !session.demo;
  renderNav();
  if(resuming) {
    if(S.resumeDialog){S.dialog.generation=S.generation;$('dialog').showModal();$('dialog-close').focus();}
    else $('title').focus();
    S.resumeDialog=false;

  } else load();
  sessionStatus();
}
function renderNav() {
  const nav = $("nav");
  nav.replaceChildren();
  for (const [group, ids] of [
    ["Workspace", ["overview"]],
    ["CRP", Object.keys(pages).filter(id=>pages[id].app==='crp')],
    [
      "Affiliate",
      Object.keys(pages).filter(id=>pages[id].app==='affiliate'),
    ],
    ["Mail Operations", ["orders", "pricing", "routes"]],
    ["Administration", ["team", "activity"]],
  ]) {
    nav.append(el("div", group, "nav-label"));
    for (const id of ids) {
      const p = pages[id];
      if (p.app && !S.session.catalog.reads[p.app].includes(p.resource))
        continue;
      if (id === "activity" && !S.session.permissions.includes("audit.read"))
        continue;
      const a = el("a");
      a.href = "#" + id;
      const icon = el('span', p.icon); icon.setAttribute('aria-hidden', 'true');
      a.append(icon, el("span", p.label));
      a.dataset.view = id;
      a.addEventListener("click", (e) => {
        e.preventDefault();
        navigate(id);
      });
      nav.append(a);
    }
  }
}
function navigate(view) {
  if (!pages[view]) view = "overview";
  S.view = view;
  notice("");
  window.scrollTo({ top: 0, behavior: "instant" });
  S.page = 1;
  S.query = "";
  document.body.classList.remove("nav-open");
  $("menu").setAttribute("aria-expanded", "false");
  load();
}
function empty(text, button) {
  const box = el("div", null, "panel empty");
  box.append(el("h2", "Nothing to show yet"), el("p", text));
  if (button) box.append(button);
  return box;
}
function dialog(title, description, fields, submit, submitText = "Confirm") {
  $('dialog-form').autocomplete = 'off';
  $("dialog-title").textContent = title;
  $("dialog-description").textContent = description;
  $("dialog-error").textContent = "";
  $("dialog-fields").replaceChildren();
  $("dialog-submit").textContent = submitText;
  $("dialog-submit").hidden = !submit;
  const nodes = new Map();
  for (const f of fields) {
    const l = el("label", f.label);
    let input;
    if (f.type?.startsWith("select:")) {
      input = el("select");
      if (!f.required) { const option=el('option','Not specified');option.value='';input.append(option); }
      for (const option of f.type.slice(7).split(",")) {
        const o = el("option", human(option));
        o.value = option;
        input.append(o);
      }
    } else if (f.type === "textarea" || f.type === "array")
      input = el("textarea");
    else {
      input = el("input");
      input.type =
        f.type === "boolean"
          ? "checkbox"
          : f.type === 'timestamp' ? 'datetime-local' : f.type === "number"
            ? "number"
            : f.type === "password"
              ? "password"
              : "text";
    }
    input.name = f.name;
    input.autocomplete = 'off';
    if(f.name === 'freshCode') {
      input.type='text';input.inputMode='numeric';input.maxLength=6;input.pattern='[0-9]{6}';input.autocomplete='one-time-code';
    }
    if (input.type !== "checkbox") input.required = !!f.required;
    if (input.tagName === "INPUT" && input.type === "number") {
      input.min = "0";
      input.max = f.type === 'timestamp' ? '8640000000000000' : "10000000";
      input.step = "1";
    }
    if (f.type === "password" && f.name !== 'freshCode') {
      input.autocomplete = "off";
      input.spellcheck = false;
    } else if (f.type !== "boolean") input.value = f.value ?? "";
    else input.checked = !!f.value;
    if (f.type === "array") input.placeholder = "One permission per line";
    l.append(input);
    $("dialog-fields").append(l);
    nodes.set(f.name, { input, f });
  }
  S.dialog = { submit, nodes, generation: S.generation,
    opener: $('dialog').open ? S.dialog?.opener : document.activeElement };
  // Replacing an open dialog must not enqueue a close event that clears the
  // replacement's fields and submit handler on the next browser task.
  if (!$("dialog").open) $("dialog").showModal();
  $("dialog-close").focus();
}
function closeDialog() {
  const opener = S.dialog?.opener;
  S.resumeDialog=false;
  $("dialog").close();
  S.dialog = null;
  $("dialog-fields").replaceChildren();
  if (opener?.isConnected && opener.getClientRects().length) opener.focus();
}
$("dialog-close").onclick = closeDialog;
$("dialog-cancel").onclick = closeDialog;
$("dialog").addEventListener("close", () => {
  if (S.resumeDialog) return;
  $("dialog-fields").replaceChildren();
  S.dialog = null;
});
$("dialog").addEventListener("cancel", (event) => {
  event.preventDefault(); closeDialog();
});
$("dialog-form").onsubmit = async (e) => {
  e.preventDefault();
  const d = S.dialog;
  if (!d?.submit) return;
  const values = {};
  for (const [name, { input, f }] of d.nodes) {
    if (!f.required && (input.value === '' || (f.type === 'boolean' && !input.checked))) continue;
    values[name] =
      f.type === "boolean"
        ? input.checked
        : f.type === 'timestamp' ? new Date(input.value).getTime() : f.type === "number"
          ? Number(input.value)
          : f.type === "array"
            ? input.value
                .split(/[\n,]/)
                .map((x) => x.trim())
                .filter(Boolean)
            : input.value.trim();
  }
  const button = $("dialog-submit");
  button.disabled = true;
  try {
    await d.submit(values);
    if (d.generation !== S.generation) return;
    closeDialog();
    await load();
  } catch (error) {
    if (d.generation === S.generation && $("dialog").open)
      $("dialog-error").textContent = error.message;
  } finally {
    button.disabled = false;
    for (const { input, f } of d.nodes.values())
      if (f.type === "password") input.value = "";
  }
};
async function confirmAction(app, name, id) {
  const action = S.session.catalog.actions[app]?.[name];
  if (!action) return;
  let termsVersion;
  if(app==='affiliate'&&name==='partner.activate') {
    try { termsVersion=(await api('/api/apps/affiliate/program')).data.termsVersion;
      if(typeof termsVersion!=='string'||!termsVersion)throw Error('Current program agreement is unavailable.');
    }catch(error){notice(error.message);return;}
  }
  const fields = [
    ...(action.needsId
      ? [
          {
            name: "recordId",
            label: "Record ID",
            value: id || "",
            required: true,
          },
        ]
      : []),
    ...action.fields.map(f=>f.name==='termsVersion'?{...f,value:termsVersion}:f),
    ...(action.requiresStepUp
      ? [
          {
            name: "freshCode",
            label: "Fresh authenticator code",
            type: "password",
            required: true,
          },
        ]
      : []),
    {
      name: "confirmText",
      label: `Type ${S.session.environment}:${app}:${name} to confirm`,
      required: true,
    },
  ];
  const key = crypto.randomUUID();
  dialog(
    action.label,
    `${labels[app]} · ${S.session.environment.toUpperCase()}. The originating application checks access and validates this change. Refresh the record if its result is uncertain.`,
    fields,
    async (values) => {
      const { recordId, freshCode, confirmText, ...body } = values;
      if (action.requiresStepUp)
        await api("/api/unlock", { method: "POST", body: { code: freshCode } });
      const result = await api("/api/actions/" + app + "/" + name, {
        method: "POST",
        body: { id: recordId, body, requestId: key, confirmation: confirmText },
      });
      notice(
        result.status === "APPLIED"
          ? "Change recorded."
          : "This request was already submitted. Refresh the application record; it was not sent again.",
      );
    },
    "Confirm change",
  );
}
function actionButtons(app, resource) {
  const box = el("div", null, "buttons"),
    list = S.session.catalog.actions[app] || {};
  const prefixes =
    {
      accounts: [],
      cases: [],
      billing: [],
      team: ["team."],
      organizations: ["organization."],
      partners: ["partner.", "campaign."],
      commissions: ["hold."],
      holds: ["hold."],
      proposals: ["proposal."],
      orders: ["note.", "order."],
      pricing: ["pricing."],
      routes: [],
      referrals:['referral.'],
      fulfillment:['fulfillment.'],
      grants:['fulfillment.'],
      contacts:['contact.','onboarding.start'],
      communications:['communication.'],
      assets:['asset.'],
      tickets:['ticket.'],
      support:['support.'],
      placements:['placement.'],
      onboarding:['onboarding.'],
      report:['agent.'],
    }[resource] || [];
  if (resource === 'routes') prefixes.push('route.','recipient.');
  if (app === 'mail' && resource === 'overview') prefixes.push('incident.');
  if (resource === 'orders') prefixes.push('provider.');
  if (resource === 'campaigns') prefixes.push('campaign.','asset.');
  for (const [name, action] of Object.entries(list))
    if (prefixes.some((prefix) => name.startsWith(prefix)))
      box.append(btn(action.label, () => confirmAction(app, name)));
  return box;
}
function items(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.orders)) return value.orders;
  return null;
}
// One readable presentation for native records and object-shaped summary pages.
// Always use text nodes: upstream record text must never become executable HTML.
function recordDetails(value, inheritedCurrency, level = 3) {
  const root = el("div", null, "record-details");
  const fieldLabels = {
    id: "Record ID", partner_id: "Partner ID", assigned_to: "Assigned to",
    state: "Status", manual_review: "Manually reviewed", resolution_evidence: "Resolution evidence",
    created_at: "Created", updated_at: "Updated", revision: "Revision",
  };
  const label = (key) => Object.hasOwn(fieldLabels, key) ? fieldLabels[key] : human(key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/_?minor$/i, ""));
  const technical = (key) => /(^id$|_id$|Id$|_hash$|Hash$|^hash$|^sha256$|^revision$|^sequence$)/.test(key);
  function scalar(item, key, currency) {
    if (item === null || item === undefined || item === "") return el("span", "Not provided", "detail-muted");
    if (technical(key)) return el("span", String(item));
    if (typeof item === "boolean") return el("span", item ? "Yes" : "No");
    if (typeof item === "number") {
      if (/minor$/i.test(key) && currency && Number.isSafeInteger(item)) {
        try { return el("span", new Intl.NumberFormat(undefined, { style: "currency", currency }).format(item / 100)); } catch { /* Preserve the supplied value below. */ }
      }
      return el("span", new Intl.NumberFormat().format(item) + (/minor$/i.test(key) ? " (minor units)" : ""));
    }
    const text = String(item);
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text) && Number.isFinite(Date.parse(text))) {
      const time = el("time", new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit", timeZoneName: "short" }).format(new Date(text)));
      time.dateTime = text; time.title = text; return time;
    }
    if (/(status|state|role)$/i.test(key)) return el("span", human(text.toLowerCase()), "badge");
    return el("span", text);
  }
  if (Array.isArray(value)) {
    if (!value.length) { root.append(el("p", "No items.", "detail-muted")); return root; }
    const list = el("ol", null, "detail-items");
    for (const [index, item] of value.entries()) {
      const li = el("li");
      if (item !== null && typeof item === "object") {
        li.append(el("h" + Math.min(level, 6), "Record " + (index + 1)), recordDetails(item, inheritedCurrency, level + 1));
      } else li.append(scalar(item, "", inheritedCurrency));
      list.append(li);
    }
    root.append(list); return root;
  }
  if (value === null || typeof value !== "object") { root.append(scalar(value, "", inheritedCurrency)); return root; }
  const entries = Object.entries(value), currency = value.currency || inheritedCurrency;
  if (!entries.length) { root.append(el("p", "No details provided.", "detail-muted")); return root; }
  const fields = el("dl", null, "detail-fields"), references = el("dl", null, "detail-fields");
  const groups = [];
  for (const [key, item] of entries) {
    if (item !== null && typeof item === "object" && !technical(key)) { groups.push([key, item]); continue; }
    const target = technical(key) ? references : fields;
    const dt = el("dt", label(key)), dd = el("dd");
    dd.append(item !== null && typeof item === "object" ? recordDetails(item, currency, level + 1) : scalar(item, key, currency));
    target.append(dt, dd);
  }
  if (fields.childElementCount) root.append(fields);
  for (const [key, item] of groups) {
    const section = el("section", null, "detail-group");
    section.append(el("h" + Math.min(level, 6), label(key)), recordDetails(item, currency, level + 1)); root.append(section);
  }
  if (references.childElementCount) {
    const more = el("details", null, "detail-references");
    more.append(el("summary", "Technical references"), references); root.append(more);
  }
  return root;
}
function showDetails(app, row) {
  dialog(
    (pages[S.view]?.label || "Record") + " details",
    labels[app],
    [],
    null,
  );
  const campaignGallery = app === 'affiliate' && window.CRPAffiliateBannerPreview?.render(row);
  if (campaignGallery) {
    $("dialog-fields").append(campaignGallery);
    const references = el('details');references.append(el('summary','Creative fields and source references'),recordDetails(row));$("dialog-fields").append(references);
  } else $("dialog-fields").append(recordDetails(row));
  const id = row.id || row.orderId || row.admin_id || row.job_id || row.org_id || row.account_id;
  const actions = el("div", null, "record-actions");
  const reads = S.session.catalog.reads[app];
  for (const [view,resource,title] of [
    ['onboarding','journey','Open onboarding checklist'],['partners','agreement','Review agreement acceptance'],
    ['campaigns','creative','View approved campaign creative'],['orders','provider','Review provider status']
  ]) if (id && S.view===view && reads.includes(resource)) actions.append(btn(title,async()=>{
    try { const result=await api('/api/apps/'+app+'/'+resource+'?id='+encodeURIComponent(id));showDetails(app,result.data); }
    catch(error){$('dialog-error').textContent=error.message;}
  }));
  if (id && ((app==='mail' && S.view==='orders') || (app==='crp' && S.view==='fulfillment')))
    for (const resource of app==='mail'?['packet','preview']:['packet']) if(reads.includes(resource)) {
      const a=el('a',resource==='preview'?'Download provider print preview':'Download authorized packet');
      a.href='/api/documents/'+app+'/'+resource+'?id='+encodeURIComponent(id);a.target='_blank';a.rel='noopener noreferrer';actions.append(a);
    }
  if (id && app==='affiliate' && S.view==='campaigns' && reads.includes('qr')) {
    const a=el('a','Download campaign QR code');a.href='/api/documents/affiliate/qr?id='+encodeURIComponent(id);a.target='_blank';a.rel='noopener noreferrer';actions.append(a);
  }
  if (app === "mail" && id)
    actions.append(
      btn("Open full order", async () => {
        try {
          const result = await api(
            "/api/apps/mail/order?id=" + encodeURIComponent(id),
          );
          showDetails(app, result.data);
        } catch (e) {
          $("dialog-error").textContent = e.message;
        }
      }),
    );
  if (app === "affiliate" && S.view === "proposals" && id)
    actions.append(
      btn("Review payout export", async () => {
        try {
          const result = await api(
            "/api/apps/affiliate/proposal?id=" + encodeURIComponent(id),
          );
          showDetails(app, result.data);
        } catch (e) {
          $("dialog-error").textContent = e.message;
        }
      }),
    );
  for (const [name, action] of Object.entries(
    S.session.catalog.actions[app] || {},
  ))
    if (
      action.needsId &&
      id &&
      (
        {
          partners: ["partner.activate",'partner.destination'],
          orders: ["note.add", "order.cancel", "order.assign", "order.refund",'order.fulfill','provider.prepare','provider.preview','provider.send','provider.reconcile','provider.cancel'],
          referrals:['referral.hold','referral.release'],
          fulfillment:['fulfillment.update'],
          contacts:['contact.suppress'],
          onboarding:['onboarding.advance','onboarding.review','onboarding.pause'],
          team: ["team.update", "team.revoke"],
          organizations: ["organization.update"],
        }[S.view] || []
      ).includes(name)
    )
      actions.append(btn(action.label, () => confirmAction(app, name, id)));
  $("dialog-fields").append(actions);
}
function table(app, rows, title = pages[S.view].label + ': ' + labels[app]) {
  if (!rows.length) return empty("No records were returned for this view.");
  const wrap = el("div", null, "table-wrap"),
    t = el("table"),
    head = el("thead"),
    tr = el("tr");
  wrap.tabIndex = 0;
  wrap.setAttribute('role', 'region');
  wrap.setAttribute('aria-label', title + ' table. Scroll horizontally for more columns.');
  t.append(el('caption', title, 'sr-only'));
  const keys = [...new Set(rows.flatMap((row) => Object.keys(row)))]
    .filter(
      (k) =>
        ![
          "snapshot_json",
          "metadata",
          "details",
          "scope",
          "permissions",
          "packet",
        ].includes(k),
    )
    .slice(0, 7);
  for (const key of keys) {
    const th = el('th', human(key.replace(/_?minor$/i, ''))); th.scope = 'col'; tr.append(th);
  }
  const details = el('th', 'Details'); details.scope = 'col'; tr.append(details);
  head.append(tr);
  t.append(head);
  const body = el("tbody");
  for (const row of rows) {
    const line = el("tr");
    for (const key of keys) {
      let value = row[key];
      const td = el("td");
      if (value === null || value === undefined) td.textContent = "—";
      else if (typeof value === "object")
        td.textContent = Array.isArray(value)
          ? (value.some(item => item !== null && typeof item === "object") ? `${value.length} items · View details` : value.join(", "))
          : "View details";
      else if (/status|state|role/.test(key))
        td.append(el("span", human(value), "badge"));
      else if (
        /(?:amount|delta|paid|price).*minor|minor$/i.test(key) &&
        row.currency &&
        Number.isSafeInteger(value)
      ) {
        try {
          td.textContent = new Intl.NumberFormat(undefined, {
            style: "currency",
            currency: String(row.currency).toUpperCase(),
          }).format(value / 100);
        } catch {
          td.textContent = String(value);
        }
      } else td.textContent = String(value);
      line.append(td);
    }
    const td = el("td");
    const view = btn('View', () => showDetails(app, row));
    const identity = row.id || row.orderId || row.admin_id || row.job_id || row.org_id || row.case_id || row.sequence || row.email || row.account_id || row.at || row.event || row.action || 'record';
    view.setAttribute('aria-label', 'View ' + title + ' record ' + identity);
    td.append(view);
    line.append(td);
    body.append(line);
  }
  t.append(body);
  wrap.append(el('p', 'More columns may be to the right. Scroll horizontally, or focus this table and use the arrow keys.', 'table-scroll-hint'), t);
  return wrap;
}
async function appView(app, resource, root, generation) {
  if (!S.session.applications[app].linked) {
    root.append(
      empty(
        S.session.applications[app].managedSignIn
          ? `Your ${labels[app]} access is unavailable. Check your assigned access or refresh the workspace.`
          : `Your ${labels[app]} access is not linked to this session.`,
        btn(S.session.applications[app].managedSignIn ? 'Check access' : 'Connect application', () => connectDialog(app), "primary"),
      ),
    );
    return;
  }
  const toolbar = el("div", null, "toolbar");
  const fields =
    ["crp", "mail"].includes(app) &&
    !["overview", "pricing", "routes", "team", 'settings','referrals'].includes(resource);
  if (fields) {
    const input = el("input");
    input.type = "search";
    input.placeholder = "Search records";
    input.setAttribute("aria-label", "Search records");
    input.value = S.query;
    const form = el("form");
    form.append(input);
    form.onsubmit = (e) => {
      e.preventDefault();
      S.query = input.value.trim();
      S.page = 1;
      load();
    };
    toolbar.append(form);
  }
  toolbar.append(actionButtons(app, resource));
  if(app==='affiliate'&&resource==='resources') {
    const select=el('select');select.setAttribute('aria-label','Resource market');
    for(const country of ['CA','US','GB','AU']){const option=el('option',country);option.value=country;select.append(option);}
    select.value=S.market;select.onchange=()=>{S.market=select.value;load();};toolbar.prepend(select);
  }
  root.append(toolbar);
  const params = new URLSearchParams();
  if(app==='affiliate'&&resource==='resources')params.set('country',S.market);
  if (app === "crp" && !["overview",'settings','referrals'].includes(resource)) {
    params.set("page", S.page);
    params.set("page_size", "25");
    if (S.query) params.set("q", S.query);
  }
  if (app === "mail" && resource === "orders") {
    params.set("page", S.page);
    if (S.query) params.set("search", S.query);
  }
  const result = await api(
    "/api/apps/" + app + "/" + resource + (params.size ? "?" + params : ""),
  );
  if (generation !== S.generation) return;
  const rows = items(result.data);
  if (rows) root.append(table(app, rows));
  else root.append(recordDetails(result.data));
  if (result.data?.totals)
    root.append(
      el(
        "p",
        "Verified totals by currency: " +
          result.data.totals
            .map(
              (x) =>
                `${x.currency} ${x.verified_paid_minor} minor units (${x.purchase_count} purchases)`,
            )
            .join(" · "),
        "table-hint",
      ),
    );
  if (app === "affiliate")
    root.append(
      el(
        "p",
        "This is the originating application’s current list.",
        "table-hint",
      ),
    );
  if (app === "mail" && resource === "routes")
    root.append(
      el(
        "p",
        "Route changes require current postal evidence. Provider submission requires the customer's exact approved packet and authorization.",
        "table-hint",
      ),
    );
  const total = result.data?.total;
  if (Number.isFinite(total)) {
    const size = app === "mail" ? 20 : 25,
      pager = el("div", null, "pager"),
      prev = btn("Previous", () => {
        S.page--;
        load();
      }),
      next = btn("Next", () => {
        S.page++;
        load();
      });
    prev.disabled = S.page <= 1;
    next.disabled = S.page * size >= total;
    pager.append(prev, el("span", `Page ${S.page} · ${total} records`), next);
    root.append(pager);
  }
  $("observed").textContent =
    "Checked " + new Date(result.observedAt).toLocaleTimeString();
}
function numeric(value, depth = 0) {
  if (depth > 2 || !value || typeof value !== "object") return [];
  return Object.entries(value)
    .flatMap(([k, v]) =>
      typeof v === "number" && Number.isFinite(v)
        ? [{ key: k, value: v }]
        : typeof v === "object" && !Array.isArray(v)
          ? numeric(v, depth + 1)
          : [],
    )
    .filter(
      (x) =>
        !/minor|amount|price|revision|budget|time|date|enabled|seconds|rate/i.test(
          x.key,
        ),
    )
    .slice(0, 4);
}
function mailMonitoring(card, value, now = Date.now()) {
  const box=el('section',null,'mail-monitoring');box.setAttribute('aria-label','Mail health and backup alerts');
  box.append(el('h3','Mail health and backup alerts'));
  const labels={API_IDENTITY_OR_HEALTH:'Mail service identity or health needs review',API_NOT_READY:'Mail service is not ready',WORKER_STALE:'Mail worker heartbeat is stale',RECONCILIATION_REQUIRED:'Uncertain mailing work needs reconciliation',PROVIDER_STATUS_REVIEW:'Provider progress needs review',FAILED_ORDERS:'Failed mailing orders need review',REFUND_REVIEW:'Refund evidence needs review',QUEUE_OVER_ONE_HOUR:'Mailing queue is over one hour old',ROUTE_EVIDENCE_RENEWAL:'Bureau route evidence needs renewal',LOCAL_BACKUP_STALE:'Mail backup is missing or stale',RECOVERY_EXPORT_STALE_OR_UNVERIFIED:'Recovery export is stale or unverified',MONITOR_INPUT_OR_STORAGE_FAILURE:'Mail monitor could not complete its checks',MONITOR_STATUS_UNAVAILABLE:'Mail monitoring is unavailable'};
  const current=value?.configured===true&&Number.isSafeInteger(value.checkedAt)&&value.checkedAt<=now&&now-value.checkedAt<=300000&&Array.isArray(value.alerts)&&value.alerts.length<=32;
  if(!current){box.append(el('p','Monitoring is not installed, is stale, or is unavailable.','badge warn'));}
  else{
    const clear=value.ok===true&&value.alerts.length===0;
    box.append(el('p',clear?'Current monitor checks passed':'Administrator review required',clear?'badge ok':'badge warn'));
    box.append(el('p','Checked '+new Date(value.checkedAt).toLocaleString(),'muted'));
    if(!clear){const list=el('ul');for(const alert of value.alerts)list.append(el('li',alert.code==='BACKUP_JOB_FAILED'?'The scheduled Mail backup failed':labels[alert.code]||'Monitoring requires review'));box.append(list);}
  }
  const email={CAPTURED:'Email capture prepared; no message sent.',RELAY_ACCEPTED:'Email relay accepted the alert; inbox receipt and administrator acknowledgement are unverified.',UNKNOWN:'Email outcome is uncertain. Reconcile before retrying.',CLEAR:'No active email alert incident.'};
  box.append(el('p',current&&email[value.emailState]?email[value.emailState]:'Administrator email delivery is not verified.','muted'));
  card.append(box);
}
async function overview(root, generation) {
  const cards = el("div", null, "cards");
  root.append(cards);
  for (const [app, description, icon] of [
    ["crp", "Consumer accounts, cases and approved packets.", "▤"],
    ["affiliate", "Partners, attributed sales and commissions.", "↗"],
    [
      "mail",
      "Mailing orders, staff assignments and delivery exceptions.",
      "✉",
    ],
  ]) {
    const status = S.session.applications[app],
      card = el("article", null, "card");
    card.append(
      el("div", icon, "app-icon"),
      el("h2", labels[app]),
      el("p", description, "muted"),
    );
    const badge = el(
      "span",
      status.linked
        ? "Checking access…"
        : status.configured
          ? status.managedSignIn ? "Access unavailable" : "Not linked"
          : "Not configured",
      "badge",
    );
    card.append(badge);
    const metrics = el("div", null, "metrics");
    card.append(metrics);
    if (!status.linked) {
      card.append(btn(status.managedSignIn ? 'Check access' : 'Connect access', () => connectDialog(app)));
    } else if (!S.session.catalog.reads[app].includes("overview"))
      badge.textContent = "Overview not permitted";
    else {
      api("/api/apps/" + app + "/overview")
        .then((result) => {
          if (generation !== S.generation) return;
          badge.textContent = "Access verified";
          badge.className = "badge ok";
          if(app==='mail')mailMonitoring(card,result.data?.monitoring);
          const metricData=app==='mail'?Object.fromEntries(Object.entries(result.data||{}).filter(([key])=>key!=='monitoring')):result.data;
          for (const item of numeric(metricData)) {
            const m = el("div", null, "metric");
            m.append(
              el("strong", new Intl.NumberFormat().format(item.value)),
              el("small", human(item.key)),
            );
            metrics.append(m);
          }
          if (!metrics.children.length)
            metrics.append(
              el("small", "Open application for operational details."),
            );
        })
        .catch((error) => {
          if (generation !== S.generation) return;
          badge.textContent = "Unavailable";
          badge.className = "badge warn";
          card.append(el("p", error.message, "muted"));
        });
    }
    if (S.session.demo || status.managedSignIn) {
      card.append(
        btn("View records →", () =>
          navigate(
            { crp: "accounts", affiliate: "partners", mail: "orders" }[app],
          ),
        ),
      );
    } else if (status.url) {
      const a = el("a", "Open workspace →");
      a.href = status.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      card.append(a);
    }
    cards.append(card);
  }
  const title = el("div", null, "section-title");
  title.append(el("h2", "Work that needs a clear decision"));
  root.append(title);
  const grid = el("div", null, "panel-grid");
  for (const [heading, text] of [
    [
      "Financial review",
      "Review verified sales, commission movements and prepared payouts in their own currencies. Payout exports continue through the existing external human release process.",
    ],
    [
      "Mailing oversight",
      "Review orders, assigned staff and delivery exceptions. Mailing status and customer approval remain authoritative in Mail Operations.",
    ],
  ]) {
    const panel = el("article", null, "panel");
    panel.append(el("h3", heading), el("p", text, "muted"));
    grid.append(panel);
  }
  root.append(grid);
}
async function load() {
  if (!S.session) return;
  const generation = ++S.generation,
    view = pages[S.view];
  $("title").textContent = view.label;
  $("crumb").textContent = view.label;
  $("eyebrow").textContent = view.app
    ? labels[view.app].toUpperCase()
    : "YOUR CONNECTED WORKSPACE";
  $("description").textContent =
    view.description ||
    "Review current records and the actions your role allows.";
  document.title = view.label + ' · CRP Family Administration';
  for (const a of $("nav").querySelectorAll("a")) {
    a.classList.toggle("active", a.dataset.view === S.view);
    if (a.dataset.view === S.view) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  const root = $("content");
  root.replaceChildren();
  root.setAttribute("aria-busy", "true");
  try {
    if (S.view === "overview") await overview(root, generation);
    else if (S.view === "team") {
      for (const app of ["crp", "affiliate", "mail"]) {
        if (!S.session.catalog.reads[app].includes("team")) continue;
        const section = el("section", null, "panel");
        section.append(el("h2", labels[app]));
        root.append(section);
        try {
          await appView(app, "team", section, generation);
        } catch (error) {
          if (generation === S.generation)
            section.append(el("p", error.message, "error"));
        }
      }
    } else if (S.view === "activity") {
      const result = await api("/api/audit");
      if (generation !== S.generation) return;
      const workspace = el("section", null, "panel");
      workspace.append(el("h2", "Family workspace activity"), table("crp", result.items, 'Family workspace activity'));
      root.append(workspace);
      for (const app of ["crp", "affiliate"]) {
        if (!S.session.catalog.reads[app].includes("audit")) continue;
        const history = el("section", null, "panel");
        history.append(el("h2", labels[app] + " activity"));
        root.append(history);
        try {
          await appView(app, "audit", history, generation);
        } catch (error) {
          if (generation === S.generation)
            history.append(el("p", error.message, "error"));
        }
        if (generation !== S.generation) return;
      }
      if (S.session.catalog.reads.mail.includes("orders")) {
        const mailing = el("section", null, "panel");
        mailing.append(el("h2", "Mail Operations activity"),
          el("p", "Open an order to review its mailing history, notes and provider events.", "muted"),
          btn("Open mailing order history", () => {
            S.view = "orders"; S.page = 1; S.query = ""; load();
          }));
        root.append(mailing);
      }
    } else await appView(view.app, view.resource, root, generation);
  } catch (e) {
    if (generation === S.generation) root.replaceChildren(empty(e.message));
  } finally {
    if (generation === S.generation) {
      root.setAttribute("aria-busy", "false");
      if (!S.locked) {
        $('view-status').textContent = view.label + ' loaded.';
        if (!$('dialog').open) $('title').focus();
      }
    }
  }
}
function connectDialog(app) {
  if (app === "crp") return;
  const status = S.session.applications[app];
  if (status.managedSignIn) {
    dialog('Application access', status.bindingConfigured
      ? 'Your global sign-in manages this application. Access is checked against your current role on every operation. Refresh the workspace if access has changed.'
      : 'Your global administrator must assign your individual application access.', [], null);
    return;
  }
  if (!status.bindingConfigured) {
    dialog(
      "Application access",
      "The owner must explicitly link this CRP account to an existing application membership before connection is allowed.",
      [],
      null,
    );
    return;
  }
  if (status.linked) {
    dialog(
      "Disconnect " + labels[app],
      "Disconnect the application from this family session. This does not remove the person’s application membership.",
      [],
      async () => {
        await api("/api/connections/" + app, { method: "DELETE" });
        S.session = await api("/api/session");
      },
      "Disconnect",
    );
    return;
  }
  if (app === "affiliate" && status.browserSignIn) {
    dialog("Connect Affiliate Program",
      "Sign in with your existing Affiliate account. Your current membership will be checked before connection.",
      [], async () => {
        const result = await api("/api/connections/affiliate/signin", {method:"POST",body:{}});
        location.assign(result.url);
      }, "Continue to Affiliate sign-in");
    return;
  }
  dialog(
    "Connect " + labels[app],
    app === "mail"
      ? "Use your own one-use staff access code. The existing Mail Operations role and assignment restrictions still apply."
      : "Use an access token issued by the existing Affiliate identity provider for your explicitly linked subject. It stays on the server only for this session.",
    [
      {
        name: app === "mail" ? "code" : "token",
        label:
          app === "mail"
            ? "One-use staff access code"
            : "Affiliate access token",
        type: "password",
        required: true,
      },
    ],
    async (body) => {
      await api("/api/connections/" + app, { method: "POST", body });
      S.session = await api("/api/session");
    },
    "Connect access",
  );
}
$("connections").onclick = () => {
  dialog(
    "Your application access",
    S.session.applications.affiliate.managedSignIn
      ? 'One global sign-in manages your assigned applications in this environment. Each application checks your current permissions.'
      : "Connections are specific to your account and this environment. Expired access must be reconnected.",
    [],
    null,
  );
  for (const app of ["crp", "affiliate", "mail"]) {
    const s = S.session.applications[app],
      section = el("section", null, "connection");
    section.append(
      el("h3", labels[app]),
      el(
        "p",
        app === "crp"
          ? "Connected through your CRP MFA session."
          : !s.configured
            ? "Application endpoint is not configured."
            : !s.bindingConfigured
              ? "Owner membership linking is required."
              : s.linked
                ? "Access verified for this session. Access is rechecked on every operation."
                : s.managedSignIn ? 'Access is currently unavailable. Refresh to check again.' : "Ready to connect your existing access.",
      ),
    );
    if (app !== "crp" && !s.managedSignIn && s.configured && s.bindingConfigured)
      section.append(
        btn(s.linked ? "Disconnect" : "Connect", () => connectDialog(app)),
      );
    $("dialog-fields").append(section);
  }
};
$("login").onsubmit = async (e) => {
  e.preventDefault();
  const b = e.submitter;
  b.disabled = true;
  $("auth-error").textContent = "";
  const f = new FormData(e.target);
  try {
    const r = await api("/api/login", {
      method: "POST",
      body: {
        email: f.get("email"),
        password: f.get("password"),
        code: f.get("code"),
      },
    });
    S.csrf = r.csrf;
    e.target.reset();
    $("login").hidden = true;
    $("unlock").hidden = false;
    $("auth-title").textContent = "Unlock administration";
    $("auth-help").textContent =
      "Use the next current authenticator code to unlock your admin access.";
    focusAuth('unlock');
  } catch (error) {
    $("auth-error").textContent = error.message;
  } finally {
    e.target.elements.password.value = "";
    e.target.elements.code.value = "";
    b.disabled = false;
  }
};
$("unlock").onsubmit = async (e) => {
  e.preventDefault();
  e.submitter.disabled = true;
  try {
    unlocked(
      await api("/api/unlock", {
        method: "POST",
        body: { code: e.target.elements.code.value.trim() },
      }),
    );
  } catch (error) {
    $("auth-error").textContent = error.message;
  } finally {
    e.target.elements.code.value = "";
    e.submitter.disabled = false;
  }
};
$('reauth').onsubmit = async (e) => {
  e.preventDefault();e.submitter.disabled=true;$('auth-error').textContent='';
  try {
    const f=new FormData(e.target),r=await api('/api/reauthenticate',{method:'POST',body:{password:f.get('password'),code:f.get('code')}});
    S.csrf=r.csrf;$('reauth').hidden=true;$('unlock').hidden=false;
    $('auth-title').textContent='Unlock administration';
    $('auth-help').textContent='Enter the next fresh authenticator code. Your page and draft are kept.';
    focusAuth('unlock');
  } catch(error) {$('auth-error').textContent=error.message;}
  finally {e.target.reset();e.submitter.disabled=false;}
};
$("logout").onclick = async () => {
  try {
    await api("/api/logout", { method: "POST", body: {} });
  } finally {
    showLogin();
  }
};
$("back-login").onclick = async () => {
  try {
    await api("/api/logout", { method: "POST", body: {} });
  } finally {
    showLogin();
  }
};
$("refresh").onclick = () => {
  notice("");
  load();
};
$("menu").onclick = () => {
  const open = document.body.classList.toggle("nav-open");
  $("menu").setAttribute("aria-expanded", String(open));
  if(open) $('nav').querySelector('[aria-current="page"]')?.focus();
};
document.addEventListener('keydown', event => {
  if(event.key === 'Escape' && document.body.classList.contains('nav-open')) {
    document.body.classList.remove('nav-open'); $('menu').setAttribute('aria-expanded', 'false'); $('menu').focus();
  }
});
setInterval(async () => {
  if (!S.session) return;
  try {
    const current = await api("/api/status");
    if(current.reauthenticateRequired)showReauthentication();
    else if(current.unlockRequired)showUnlock();
    else {Object.assign(S.session,current);sessionStatus();}
  } catch (e) {
    if(e.code==='PRIMARY_AUTHENTICATION_REQUIRED')showReauthentication();
    else if(e.code==='ADMIN_UNLOCK_REQUIRED')showUnlock();
    else if(e.status===401)showLogin(e.message);
    else notice('Access check temporarily unavailable. Your page and draft have been kept.');
  }
}, 30000);
(async () => {
  let data;
  try { data = await api("/api/session"); } catch(e) { if(e.code==='PRIMARY_AUTHENTICATION_REQUIRED')showReauthentication();else showLogin(); return; }
  S.csrf = data.csrf;
  if(data.reauthenticateRequired){S.session={csrf:data.csrf};showReauthentication();return;}
  if(data.unlockRequired){S.session={csrf:data.csrf};showUnlock();return;}
  let message = "";
  if (data.applications.affiliate.browserSignIn && !data.applications.affiliate.linked) {
    try {
      const result = await api("/api/connections/affiliate/finish", {method:"POST",body:{}});
      if (result.linked) data = await api("/api/session");
    } catch (e) { message = e.message; }
  }
  unlocked(data);
  if (message) notice(message);
})();
