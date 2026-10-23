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
  };
const labels = {
  crp: "CRP Consumer",
  affiliate: "Affiliate Program",
  mail: "Mail Operations",
};
const pages = {
  studio:{label:'Affiliate Creative Studio',app:'affiliate',resource:'studio',icon:'▧'},
  studioQueue:{label:'Creative review queue',app:'affiliate',resource:'studio.queue',icon:'▧'},
  studioLimits:{label:'Creative usage limits',app:'affiliate',resource:'studio.limits',icon:'▧'},
  studioDesigns:{label:'AI design drafts',app:'affiliate',resource:'studio.designs',icon:'▧'},
  costs:{label:'Reviewed operating costs',app:'affiliate',resource:'costs',icon:'▣'},
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
  S.locked=false;S.resumeDialog=false;S.hasWorkspace=false;
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
}
function showReauthentication() {
  if (!S.locked) showUnlock();
  $('workspace').hidden=true; $('auth').hidden=false;
  $('login').hidden=true; $('unlock').hidden=true; $('reauth').hidden=false;
  $('auth-title').textContent='Confirm your sign-in';
  $('auth-help').textContent='Your underlying sign-in expired. Your page and draft are kept. Enter your password and authenticator, then a fresh code to unlock administration.';
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
  try {const update=await api('/api/activity',{method:'POST',body:{}});Object.assign(S.session,update);activityAt=Date.now();sessionStatus();}
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
  $("environment").textContent = session.environment.toUpperCase();
  $("environment").classList.toggle(
    "production",
    session.environment === "production",
  );
  $("who").textContent = session.email || session.role;
  $("demo-banner").hidden = !session.demo;
  renderNav();
  if(resuming) {
    if(S.resumeDialog){S.dialog.generation=S.generation;$('dialog').showModal();}
    S.resumeDialog=false;
  } else navigate(S.view);
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
      a.append(el("span", p.icon), el("span", p.label));
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
  box.append(el("h3", "Nothing to show yet"), el("p", text));
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
    if(f.type==='reference')input=el('select');
    else if (f.type?.startsWith("select:")) {
      input = el("select");
      if (!f.required) { const option=el('option','Not specified');option.value='';input.append(option); }
      for (const option of f.type.slice(7).split(",")) {
        const o = el("option", ({'art-right-v1':'Artwork on the right','art-left-v1':'Artwork on the left',CA:'Canada',US:'United States',AU:'Australia',GB:'United Kingdom',newsletter:'Email newsletter',social:'Social media',sidebar:'Website sidebar'})[option]??human(option));
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
  S.dialog = { submit, nodes, generation: S.generation };
  // Replacing an open dialog must not enqueue a close event that clears the
  // replacement's fields and submit handler on the next browser task.
  if (!$("dialog").open) $("dialog").showModal();
  $("dialog-close").focus();
}
function closeDialog() {
  $("dialog").close();
  S.dialog = null;
  $("dialog-fields").replaceChildren();
}
$("dialog-close").onclick = closeDialog;
$("dialog-cancel").onclick = closeDialog;
$("dialog").addEventListener("close", () => {
  if(S.locked||$('dialog').open)return;
  $("dialog-fields").replaceChildren();
  S.dialog = null;
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
    ...action.fields.filter(f=>!f.onlyNonProduction||S.session.environment!=='production').map(f=>f.name==='termsVersion'?{...f,value:termsVersion}:f),
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
      if (result.accessRemoved) {
        showLogin('Your administrative access changed. This change was recorded; sign in again if access is available.');
        return;
      }
      if (result.status === 'PENDING') {
        notice('Mail operation accepted. Checking the same request; do not submit it again.');
        void followOperation(result.requestId);
        return;
      }
      notice(
        result.status === "APPLIED"
          ? name==='studio.design'?'Design request saved. Open AI design drafts and refresh to check progress. Completed designs still need human review.':"Change recorded."
          : "This request was already submitted. Refresh the application record; it was not sent again.",
      );
    },
    "Confirm change",
  );
  void recordChoices(app,name).catch(()=>{});
}
async function followOperation(id) {
  const subject = S.session?.subject;
  for (let attempt=0; attempt<65 && S.session?.subject===subject; attempt++) {
    try {
      const result=await api('/api/operations/'+id);
      if(S.session?.subject!==subject)return;
      if(result.status==='APPLIED') { notice('Mail operation completed. Refresh the order to review its current state.'); return; }
      if(result.code==='POSTGRID_RATE_LIMITED') { notice(providerCooldown(result)); return; }
      if(result.status!=='PENDING') { notice(result.status==='UNKNOWN'
        ? 'The final result is not confirmed. Refresh the order and reconcile this request before any further submission.'
        : 'Mail operation was refused'+(result.code?' ('+result.code.replaceAll('_',' ').toLowerCase()+')':'')+'. Review the current order.'); return; }
    } catch(error) { notice('The mail result is not confirmed. Refresh the order and reconcile before submitting again.'); return; }
    await new Promise(resolve=>setTimeout(resolve,2000));
  }
  if(S.session?.subject===subject)notice('The mail result is still pending. Refresh the order and reconcile before submitting again.');
}
function providerCooldown(receipt) {
  const at=Date.parse(receipt.retryAt||'');
  return 'The provider request limit was reached. '+(Number.isFinite(at)?'Wait until '+new Date(at).toLocaleTimeString()+'. ':'Wait for the provider cooldown. ')+
    'Then review the current order and this request before another action. No request will be sent automatically.';
}
async function recordChoices(app,name){
  const d=S.dialog;if(!d)return;
  const relation={partnerId:['affiliate','partners'],contactId:['affiliate','contacts'],campaignId:['affiliate','campaigns'],grant_id:['crp','grants'],org_id:['crp','organizations'],account_id:['crp','accounts'],memberId:['mail','team'],assignee:['affiliate','team'],introducerId:['affiliate','partners'],subject:[app,'team'],reversesId:['affiliate','costs']};
  if(name==='studio.design'){relation.brandId=['affiliate','studio'];relation.messageId=['affiliate','studio'];}
  const recordResource=name.startsWith('studio.version')?'studio':name.startsWith('studio.request')?'studio.queue':name.startsWith('team.')?'team':name.startsWith('onboarding.')?'onboarding':name.startsWith('hold.')?'holds':name.startsWith('contact.')?'contacts':name.startsWith('referral.')?'referrals':name.startsWith('fulfillment.')?'fulfillment':name.startsWith('ticket.')?'tickets':name.startsWith('campaign.')?'campaigns':name.startsWith('partner.')?'partners':name.startsWith('organization.')?'organizations':name.startsWith('order.')||name.startsWith('note.')||name.startsWith('provider.')?'orders':null;
  if(recordResource)relation.recordId=[app,recordResource];
  for(const [field,node]of d.nodes){
    const target=relation[field];if(!target||!S.session.catalog.reads[target[0]]?.includes(target[1]))continue;
    const result=await api('/api/apps/'+target[0]+'/'+target[1]);if(S.dialog!==d)return;
    const rows=items(result.data)||[];
    const list=el('datalist');list.id='choices-'+crypto.randomUUID();node.input.setAttribute('list',list.id);
    const records=new Map();
    for(const row of rows){
      if(name==='studio.design'&&['brandId','messageId'].includes(field)&&(row.kind!==field.replace('Id','')||!['APPROVED','PUBLISHED'].includes(row.state)))continue;
      if(name==='campaign.add'&&field==='partnerId'&&row.status!=='ACTIVE')continue;
      if(field==='grant_id'&&(row.status!=='ACTIVE'||row.revoked_at))continue;
      const id=field==='subject'||field==='assignee'?row.subject:row.id||row.admin_id||row.job_id||row.orderId||row.grant_id||row.org_id||row.account_id||row.member_id||row.subject;
      if(!id)continue;records.set(id,row);const option=el('option');option.value=id;option.label=[row.name||row.email||row.question||row.subject,row.country,row.status||row.state].filter(Boolean).join(' · ');list.append(option);
    }
    node.input.parentElement.append(list);
    if(node.input.tagName==='SELECT'){
      const placeholder=el('option',records.size?'Choose an approved option':'No approved options yet');placeholder.value='';node.input.replaceChildren(placeholder);
      for(const [id,row]of records){const option=el('option',row.kind==='message'?row.spec?.headline||row.name:row.name);option.value=id;node.input.append(option);}
      if(!records.size)node.input.parentElement.append(el('span','Approve a CRP brand and message in Affiliate Creative Studio first.'));
    }
    const prefill=()=>{
      if(S.dialog!==d)return;
      const row=records.get(node.input.value.trim());if(!row)return;
      for(const [key,value]of Object.entries({expectedHash:row.content_hash,expectedRevision:row.revision,expectedVersion:row.version,expectedState:row.state,expectedActive:row.active,expectedRole:row.role})){
        const dest=d.nodes.get(key);if(!dest||value===undefined)continue;
        if(dest.f.type==='boolean')dest.input.checked=value;else dest.input.value=value;
      }
    };
    node.input.addEventListener('input',prefill);
    node.input.addEventListener('change',prefill);
    prefill();
  }
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
      onboarding:['onboarding.'],
      report:['agent.'],
      costs:['cost.'],
      studio:['studio.brand','studio.message','studio.template','studio.version.decision'],
      'studio.designs':['studio.design'],
      'studio.queue':['studio.request.decision'],'studio.limits':['studio.limits'],
    }[resource] || [];
  if (resource === 'routes') prefixes.push('route.','recipient.');
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
function recordFields(value) {
  if (value === null || value === undefined) return el('span', 'Not recorded', 'field-empty');
  if (Array.isArray(value)) {
    if (!value.length) return el('span', 'None recorded', 'field-empty');
    const list = el('ol', null, 'record-list');
    for (const item of value) { const line = el('li'); line.append(recordFields(item)); list.append(line); }
    return list;
  }
  if (typeof value === 'object') {
    const fields = el('dl', null, 'record-fields');
    for (const [key, item] of Object.entries(value)) {
      const group = el('div', null, 'record-field'), definition = el('dd');
      const currency = value.currency || value.currency_code;
      if (/minor$/i.test(key) && Number.isSafeInteger(item) && /^[A-Z]{3}$/i.test(currency || '')) {
        group.append(el('dt', human(key.replace(/_?minor$/i, ''))));
        definition.append(el('span', new Intl.NumberFormat(undefined, {style:'currency',currency:currency.toUpperCase()}).format(item / 100)));
      } else { group.append(el('dt', human(key))); definition.append(recordFields(item)); }
      group.append(definition); fields.append(group);
    }
    if (!fields.children.length) fields.append(el('span', 'No fields recorded', 'field-empty'));
    return fields;
  }
  if (typeof value === 'boolean') return el('span', value ? 'Yes' : 'No');
  const text = String(value);
  if (/^https?:\/\//i.test(text)) {
    try { const url = new URL(text); if (!url.username && !url.password) {
      const link = el('a', text); link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer'; return link;
    } } catch {}
  }
  return el('span', text);
}
function showDetails(app, row) {
  dialog(
    "Record details",
    `${labels[app]}. Fields shown are supplied by that application.`,
    [],
    null,
  );
  $("dialog-fields").append(recordFields(row));
  const id = row.id || row.orderId || row.admin_id || row.job_id || row.org_id || row.account_id;
  const actions = el("div", null, "record-actions");
  const reads = S.session.catalog.reads[app];
  for(const [key,view,label]of [['partner_id','partners','Open related partner'],['campaign_id','campaigns','Open related campaign'],['account_id','accounts','Open related consumer account'],['case_id','cases','Open related case']]){
    if(!row[key]||!reads.includes(view))continue;
    actions.append(btn(label,async()=>{closeDialog();S.query=row[key];S.page=1;navigate(view);try{const result=await api('/api/apps/'+app+'/'+view);const related=(items(result.data)||[]).find(x=>[x.id,x.account_id,x.case_id,x.org_id].includes(row[key]));if(related&&S.view===view)showDetails(app,related);}catch(error){notice(error.message);}}));
  }
  for (const [view,resource,title] of [
    ['onboarding','journey','Open onboarding checklist'],['partners','agreement','Review agreement acceptance'],
    ['campaigns','creative','View approved campaign creative'],['orders','provider','Review provider status'],['tickets','ticket.history','Review ticket history']
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
          tickets:['ticket.update'],
          campaigns:['campaign.retire'],
          onboarding:['onboarding.advance','onboarding.review','onboarding.pause'],
          team: ["team.update", "team.revoke"],
          organizations: ["organization.update"],
        }[S.view] || []
      ).includes(name)
    )
      actions.append(btn(action.label, () => confirmAction(app, name, id)));
  $("dialog-fields").append(actions);
}
function table(app, rows) {
  if (!rows.length) return empty("No records were returned for this view.");
  const wrap = el("div", null, "table-wrap"),
    t = el("table"),
    head = el("thead"),
    tr = el("tr");
  const keys = S.view==='routes' ? ['country','bureau','mailer','selection','effective_available','availability_reasons','recipient_review','evidence_expires_at','postal_service'] : [...new Set(rows.flatMap((row) => Object.keys(row)))]
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
  for (const key of keys)
    tr.append(el("th", human(key.replace(/_?minor$/i, ""))));
  tr.append(el("th", "Details"));
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
          ? value.join(", ")
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
    td.append(btn("View", () => showDetails(app, row)));
    line.append(td);
    body.append(line);
  }
  t.append(body);
  wrap.append(t);
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
  if(app==='affiliate'&&resource==='report'&&S.session.role==='owner'){
    const label=el('label','Include isolated simulation records');const input=el('input');input.type='checkbox';input.checked=!!S.includeSimulation;
    input.onchange=()=>{S.includeSimulation=input.checked;load();};label.append(input);toolbar.append(label);
  }
  root.append(toolbar);
  if(app==='mail' && resource==='orders' && S.session.role==='owner') {
    const receipts=await api('/api/operations');if(generation!==S.generation)return;
    if(receipts.items.length) {
      const panel=el('section',null,'panel');panel.append(el('h2','Your recent mail requests'));
      for(const receipt of receipts.items.slice(0,10)) {
        const row=el('p',human(receipt.operation)+' · '+receipt.status+' · '+receipt.requestId+' ');
        if(receipt.code==='POSTGRID_RATE_LIMITED')row.append(el('span',providerCooldown(receipt)));
        row.append(btn('Check request',()=>void followOperation(receipt.requestId)));panel.append(row);
      }
      panel.append(el('p','These receipts check the original request. An unconfirmed result requires order readback and reconciliation before another submission.'));
      root.append(panel);
    }
  }
  const params = new URLSearchParams();
  if(app==='affiliate'&&resource==='resources')params.set('country',S.market);
  if(app==='affiliate'&&resource==='report'&&S.includeSimulation)params.set('includeSimulation','1');
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
  if(resource==='studio.designs'){
    const capability=(await api('/api/apps/affiliate/studio.designer')).data;if(generation!==S.generation)return;
    root.append(el('p',capability.enabled?'Choose an approved brand and message, then create original artwork. CRP adds the exact logo and text. Open Affiliate Creative Studio to preview a completed draft before reviewing it.':'AI design is not enabled in this environment. Existing approved banners and design previews still work.','table-hint'));
    root.append(studioDesignJobs(rows??[]));
    $('observed').textContent='Checked '+new Date(result.observedAt).toLocaleTimeString();return;
  }
  if(app==='mail'&&resource==='routes')root.append(el('p','Default mailer: '+result.data.defaultMailer+'. '+result.data.availabilityScope,'table-hint'));
  if(resource==='studio')root.append(studioReviewTools(rows??[]));
  if(['studio','studio.queue','studio.limits'].includes(resource))root.append(el('p','New designs and messages require human approval before publication. Pausing or retiring a version disables its hosted creatives; downloaded copies cannot be recalled. Monetary budget is zero.','table-hint'));
  if (rows) root.append(table(app, rows));
    else root.append(recordFields(result.data));
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
          for (const item of numeric(result.data)) {
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
  for (const a of $("nav").querySelectorAll("a"))
    a.classList.toggle("active", a.dataset.view === S.view);
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
      workspace.append(el("h2", "Family workspace activity"), table("crp", result.items));
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
    if (generation === S.generation) root.setAttribute("aria-busy", "false");
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
};
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

function studioReviewTools(versions){
 const box=el('section',null,'panel');box.append(el('h2','Review a proposed design'),el('p','Choose the exact brand, message and design versions, then inspect the proposed size before approving their hashes. This preview is not approved advertising.'));
 const form=el('form'),fields={};
 for(const [key,label,value] of [['brandId','Brand version ID',''],['messageId','Message version ID',''],['templateId','Design version ID',''],['width','Width in pixels','1200'],['height','Height in pixels','1200']]){const l=el('label',label),input=el(['width','height'].includes(key)?'input':'select');input.required=true;if(input.tagName==='SELECT'){for(const v of versions.filter(x=>x.kind===key.replace('Id',''))){const option=el('option',v.name+' · '+v.state+' · '+v.content_hash.slice(0,12));option.value=v.id;input.append(option);}}else {input.value=value;input.type='number';input.min=100;input.max=2400;}l.append(input);form.append(l);fields[key]=input;}
 const output=el('div'),go=el('button','Preview for review');go.type='submit';form.append(go);box.append(form,output);
 form.onsubmit=async event=>{event.preventDefault();go.disabled=true;try{const query=new URLSearchParams(Object.entries(fields).map(([k,v])=>[k,v.value]));const result=await api('/api/apps/affiliate/studio.preview?'+query);const svg=result.data.svg;if(typeof svg!=='string'||!svg.startsWith('<svg '))throw Error('Preview unavailable');const image=el('img');image.alt='Creative design review — not approved for publication';image.style.maxWidth='100%';image.style.height='auto';const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));image.onload=image.onerror=()=>URL.revokeObjectURL(url);image.src=url;output.replaceChildren(image,el('p','Component hashes: '+result.data.hashes.join(' · '),'studio-review-hashes'));}catch(error){output.textContent=error.message;}finally{go.disabled=false;}};
 return box;
}

function studioDesignJobs(rows){
 const box=el('section',null,'studio-design-jobs');
 if(!rows.length){box.append(el('h2','Your first AI design'),el('p','Create an AI design using an approved CRP brand and message. Review the resulting artwork before making it available to partners.'));return box;}
 for(const row of rows){
   const card=el('section',null,'panel');
   const state=row.result?'Draft ready for review':({READY:'Waiting to start',RUNNING:'Creating artwork',DONE:'Completed',DEAD:'Could not start',UNKNOWN:'Needs reconciliation'})[row.state]??'Check request';
   card.append(el('h2',row.name),el('p',state));
   if(row.result)card.append(el('p','Open Affiliate Creative Studio, choose this design and preview it. AI-generated artwork is not approved automatically.'));
   if(row.state==='UNKNOWN'&&!row.result)card.append(el('p','The result could not be confirmed. Do not send this request again until it has been reconciled.'));
   if(row.last_error&&row.state!=='UNKNOWN')card.append(el('p',row.last_error==='DESIGN_APPROVED_COPY_REQUIRED'?'Choose a currently approved brand and message.':row.last_error==='DESIGN_AI_DISABLED'?'AI design is paused in this environment.':'The design was not completed. Review the request details before any further action.'));
   const details=el('details'),summary=el('summary','Technical details');details.append(summary,recordFields({request:row.id,state:row.state,error:row.last_error,result:row.result}));card.append(details);box.append(card);
 }return box;
}
