import { randomUUID } from "node:crypto";
const read = (path, permission, query = []) => ({
  method: "GET",
  path,
  permission,
  query,
});
const field = (name, label, type = "text", required = true) => ({
  name,
  label,
  type,
  required,
});
const write = (path, permission, label, fields, extra = {}) => ({
  method: "POST",
  path,
  permission,
  label,
  fields,
  ...extra,
});
const page = ["q", "status", "page", "page_size", "limit", "offset"];
export const reads = {
  crp: {
    overview: read("/api/admin/overview", "overview.read"),
    accounts: read("/api/admin/accounts", "accounts.read", page),
    cases: read("/api/admin/cases", "cases.read", page),
    billing: read("/api/admin/billing", "billing.read", page),
    team: read("/api/admin/team", "team.manage", page),
    organizations: read(
      "/api/admin/organizations",
      "organizations.manage",
      page,
    ),
    audit: read("/api/admin/audit", "audit.read", page),
  },
  affiliate: {
    overview: read("/api/status", "affiliate.read"),
    partners: read("/api/partners", "affiliate.read"),
    campaigns: read("/api/campaigns", "affiliate.read"),
    commissions: read("/api/journal", "affiliate.read"),
    proposals: read("/api/proposals", "affiliate.read"),
    holds: read("/api/holds", "affiliate.read"),
    team: read("/api/members", "affiliate.read"),
    audit: read("/api/audit", "affiliate.read"),
    proposal: read("/api/proposals/:id/export", "affiliate.read"),
  },
  mail: {
    overview: read("/staff/api/overview", "fulfillment.read"),
    orders: read("/staff/api/orders", "fulfillment.read", [
      "search",
      "state",
      "payment",
      "exception",
      "page",
    ]),
    order: read("/staff/api/orders/:id", "fulfillment.read"),
    pricing: read("/staff/api/pricing", "fulfillment.read"),
    routes: read("/staff/api/routes", "fulfillment.read"),
    team: read("/staff/api/team", "fulfillment.read"),
  },
};
export const actions = {
  crp: {
    "team.add": write("/api/admin/team", "team.manage", "Add team member", [
      field("account_id", "Existing CRP account ID"),
      field("role", "Role", "select:owner,staff,partner"),
      field("permissions", "Permissions", "array"),
      field("org_id", "Organization ID", "text", false),
    ]),
    "team.update": write(
      "/api/admin/team/:id",
      "team.manage",
      "Update team access",
      [
        field("role", "Role", "select:owner,staff,partner"),
        field("status", "Status", "select:ACTIVE,DISABLED"),
        field("permissions", "Permissions", "array"),
        field("org_id", "Organization ID", "text", false),
      ],
      { method: "PATCH" },
    ),
    "organization.add": write(
      "/api/admin/organizations",
      "organizations.manage",
      "Add organization",
      [
        field("name", "Name"),
      ],
    ),
    "organization.update": write(
      "/api/admin/organizations/:id",
      "organizations.manage",
      "Update organization",
      [
        field("name", "Name"),
        field("status", "Status", "select:ACTIVE,DISABLED"),
      ],
      { method: "PATCH" },
    ),
  },
  affiliate: {
    "team.add": write(
      "/api/members",
      "team.manage",
      "Add Affiliate member",
      [
        field("subject", "Existing Affiliate identity subject"),
        field("partnerId", "Partner ID"),
        field("role", "Role", "select:operator,analyst"),
      ],
      { owner: true },
    ),
    "team.update": write(
      "/api/members",
      "team.manage",
      "Change Affiliate member role",
      [
        field("subject", "Affiliate identity subject"),
        field("partnerId", "Partner ID"),
        field("expectedRole", "Current role", "select:operator,analyst"),
        field("role", "New role", "select:operator,analyst"),
      ],
      { owner: true, method: "PUT" },
    ),
    "team.remove": write(
      "/api/members",
      "team.manage",
      "Remove Affiliate member",
      [
        field("subject", "Affiliate identity subject"),
        field("partnerId", "Partner ID"),
        field("expectedRole", "Current role", "select:operator,analyst"),
      ],
      { owner: true, method: "DELETE" },
    ),
    "partner.add": write(
      "/api/partners",
      "affiliate.manage",
      "Add partner application",
      [
        field("name", "Organization name"),
        {...field('code','Partner code'),pattern:'[A-Za-z0-9_-]{3,32}',maxLength:32,hint:'Use 3-32 letters, numbers, underscores or hyphens. Saved codes use uppercase.'},
        field("country", "Country", "select:CA,US,GB,AU"),
        field("trafficSource", "Publication website (https://)", "url"),
        field("introducerId", "Introducer ID", "text", false),
      ],
    ),
    "partner.activate": write(
      "/api/partners/:id/activate",
      "affiliate.manage",
      "Activate accepted partner",
      [field('termsVersion','Current accepted agreement version')],
      { owner: true },
    ),
    "campaign.add": write(
      "/api/campaigns",
      "affiliate.manage",
      "Create campaign",
      [
        field("partnerId", "Partner ID"),
        field("name", "Name"),
        field("country", "Country", "select:CA,US,GB,AU"),
      ],
    ),
    "proposal.prepare": write(
      "/api/proposals",
      "affiliate.manage",
      "Prepare payout for human review",
      [
        field("partnerId", "Partner ID"),
        field("currency", "Currency", "select:CAD,USD,GBP,AUD"),
      ],
    ),
    "hold.release": write(
      "/api/holds/:id/release",
      "affiliate.manage",
      "Release commission hold",
      [field("resolutionRef", "Resolution evidence reference")],
      { owner: true },
    ),
  },
  mail: {
    "note.add": write(
      "/staff/api/orders/:id/notes",
      "fulfillment.prepare",
      "Add order note",
      [field("body", "Note", "textarea")],
      { requestId: true },
    ),
    "order.cancel": write(
      "/staff/api/orders/:id/cancel",
      "fulfillment.prepare",
      "Cancel mailing order",
      [
        field("reason", "Reason"),
        field("expectedState", "Current order state"),
      ],
    ),
    "order.assign": write(
      "/staff/api/orders/:id/assignment",
      "fulfillment.prepare",
      "Assign designated fulfiller",
      [field("memberId", "Designation ID")],
      { owner: true },
    ),
    "order.refund": write(
      "/staff/api/orders/:id/refund",
      "billing.read",
      "Request eligible mailing refund",
      [field("reason", "Reason")],
      { owner: true, requestId: true, sensitive: true },
    ),
    "team.add": write(
      "/staff/api/team",
      "team.manage",
      "Designate mailing contact",
      [
        field("name", "Contact name"),
        field("country", "Posting country", "select:CA,US,GB,AU"),
        field("kind", "Contact type", "select:individual,mail_service"),
        field("postingPostalCode", "Posting postal code", "text", false),
      ],
      { owner: true },
    ),
    "team.revoke": write(
      "/staff/api/team/:id/revoke",
      "team.manage",
      "Revoke mailing designation",
      [],
      { owner: true },
    ),
    "pricing.update": write(
      "/staff/api/pricing",
      "fulfillment.prepare",
      "Set mailing price",
      [
        field("country", "Country", "select:CA,US,GB,AU"),
        field("expectedRevision", "Current price revision", "number"),
        field("firstPageMinor", "First page price in minor units", "number"),
        field(
          "additionalPageMinor",
          "Additional page price in minor units",
          "number",
        ),
        field("reason", "Reason"),
      ],
      { owner: true, requestId: true },
    ),
  },
};
// Native administrative parity. Public enrollment, partner assent/training,
// provider webhooks and external human payment release remain native workflows.
Object.assign(reads.crp, {
  referrals: read('/api/admin/affiliates', 'affiliate.read'),
  fulfillment: read('/api/admin/fulfillment', 'fulfillment.read', page),
  grants: read('/api/admin/fulfillment-grants', 'fulfillment.grants', [...page,'org_id']),
  settings: read('/api/admin/settings', 'overview.read'),
  packet: { ...read('/api/admin/fulfillment/:id/packet','fulfillment.read'), format:'pdf' },
});
Object.assign(reads.affiliate, {
  costs:{...read('/api/operating-costs','affiliate.read'),owner:true},
  'ticket.history':read('/api/tickets/:id/history','affiliate.read'),
  report: read('/api/report','affiliate.read',['includeSimulation']),
  contacts: read('/api/contacts','affiliate.read'),
  communications: read('/api/communications','affiliate.read'),
  assets: read('/api/assets','affiliate.read'),
  tickets: read('/api/tickets','affiliate.read'),
  onboarding: read('/api/onboarding','affiliate.read'),
  journey: read('/api/onboarding/:id','affiliate.read'),
  evidence: read('/api/holds/evidence','affiliate.read'),
  resources: read('/api/resources','affiliate.read',['country']),
  creative: read('/api/campaigns/:id/creative','affiliate.read'),
  agreement: read('/api/partners/:id/agreement','affiliate.read'),
  program: read('/api/program','affiliate.read'),
  qr: { ...read('/api/campaigns/:id/qr','affiliate.read'),format:'svg' },
});
Object.assign(reads.mail, {
  provider: read('/staff/api/orders/:id/postgrid','fulfillment.read'),
  packet: { ...read('/staff/api/orders/:id/packet','fulfillment.read'),format:'pdf' },
  preview: { ...read('/staff/api/orders/:id/print-preview','fulfillment.read'),format:'pdf' },
});
Object.assign(actions.crp, {
  'referral.sync':write('/api/admin/affiliates/sync','affiliate.manage','Synchronize verified referral ledger',[],{sensitive:true}),
  'referral.enroll':write('/api/admin/affiliates/enroll','affiliate.manage','Enroll existing consumer referral account',[
    field('account_id','CRP account ID'),field('introducer_code','Introducer code','text',false),field('org_id','Organization ID','text',false)]),
  'referral.hold':write('/api/admin/affiliates/:id/hold','affiliate.manage','Hold consumer referral account',[field('reason','Reason','select:MANUAL_REVIEW,REFUND_REVIEW,ACCOUNT_REVIEW')]),
  'referral.release':write('/api/admin/affiliates/:id/hold','affiliate.manage','Release consumer referral hold',[],{method:'DELETE'}),
  'fulfillment.add':write('/api/admin/fulfillment','fulfillment.grants','Create task from consumer sharing grant',[field('grant_id','Current sharing grant ID')]),
  'fulfillment.update':write('/api/admin/fulfillment/:id','fulfillment.prepare','Update fulfillment task',[field('status','Status','select:REVIEWED,CANCELLED')],{method:'PATCH'}),
});
Object.assign(actions.affiliate, {
  'cost.add':write('/api/operating-costs','affiliate.manage','Record reviewed operating cost',[field('id','New cost UUID'),field('sourceRef','Unique source reference'),field('currency','Currency','select:CAD,USD,GBP,AUD'),field('amountMinor','Cost in minor units','number'),field('category','Category','select:PROCESSOR,NETWORK,PLACEMENT,AI,OTHER'),field('reversesId','Original cost UUID for exact reversal','text',false),field('evidenceRef','Reviewed receipt reference'),field('reviewed','I independently reviewed the receipt','boolean'),field('occurredAt','Source event time (ISO UTC)')],{owner:true,sensitive:true}),
  'campaign.retire':write('/api/campaigns/:id','affiliate.manage','Retire campaign',[field('expectedActive','Campaign is currently active','boolean'),field('active','Keep campaign active (must be unchecked)','boolean'),field('reason','Retirement reason','textarea')],{method:'PATCH'}),
  'ticket.update':write('/api/tickets/:id','affiliate.manage','Review support ticket',[field('expectedRevision','Current revision','number'),field('action','Action','select:ASSIGN,NOTE,RESOLVE,REOPEN'),field('assignee','Assigned team subject','text',false),field('note','Internal review note','textarea'),field('answer','Reviewed answer','textarea',false),field('evidenceRef','Resolution evidence reference','text',false),field('reviewed','I reviewed this resolution','boolean',false)],{method:'PATCH'}),
  'contact.add':write('/api/contacts','affiliate.manage','Record contact',[
    field('name','Name'),field('email','Email'),field('sourceUrl','Source URL'),field('purpose','Purpose','select:recruitment,partner_service,customer_education'),field('partnerId','Partner ID','text',false)]),
  'contact.suppress':write('/api/contacts/:id','affiliate.manage','Suppress contact',[],{method:'DELETE',owner:true}),
  'communication.queue':write('/api/communications','affiliate.manage','Queue authorized communication',[field('contactId','Contact ID'),field('template','Template','select:invitation,activation,education,payout,followup,access_help')],{sensitive:true}),
  'asset.publish':write('/api/assets','affiliate.manage','Publish approved campaign asset',[field('campaignId','Campaign ID'),field('template','Template','select:newsletter,banner,video_script,fictional_example')],{sensitive:true}),
  'ticket.add':write('/api/tickets','affiliate.manage','Create partner support ticket',[field('partnerId','Partner ID'),field('question','Question','textarea')]),
  'onboarding.start':write('/api/onboarding','affiliate.manage','Start partner onboarding',[field('contactId','Contact ID')],{owner:true,sensitive:true}),
  'onboarding.advance':write('/api/onboarding/:id/advance','affiliate.manage','Advance onboarding checklist',[field('expectedVersion','Current version','number')],{owner:true,sensitive:true}),
  'onboarding.review':write('/api/onboarding/:id/review','affiliate.manage','Record owner qualification review',[field('expectedVersion','Current version','number'),field('decision','Decision','select:approve,decline'),field('evidenceRef','Evidence reference')],{owner:true}),
  'onboarding.pause':write('/api/onboarding/:id/pause','affiliate.manage','Pause or resume onboarding',[field('paused','Pause','boolean')],{owner:true,sensitive:true}),
  'agent.run':write('/api/agent/run','affiliate.manage','Request AI operations task',[field('task','Task','textarea')],{owner:true,sensitive:true,requestId:true}),
  'hold.add':write('/api/holds','affiliate.manage','Record evidenced commission concern',[field('id','New concern UUID'),field('partnerId','Partner ID'),field('reason','Reason','select:SELF_REFERRAL_CONCERN,SOURCE_INTEGRITY_CONCERN,ATTRIBUTION_CONFLICT'),field('evidenceAuditId','Relevant audit sequence'),field('expiresAt','Expiry (ISO date and time)')],{owner:true}),
  'partner.destination':write('/api/partners/:id/destination','affiliate.manage','Update independently verified payee destination',[field('destinationRef','Verified destination reference'),field('verified','I independently verified this destination','boolean')],{owner:true,sensitive:true}),
});
const countryField=()=>field('country','Destination country','select:CA,US,GB,AU');
const bureauField=()=>field('bureau','Bureau','select:EQUIFAX,EXPERIAN,TRANSUNION');
Object.assign(actions.mail, {
  'route.update':write('/staff/api/routes','fulfillment.prepare','Update evidenced mailing route',[
    countryField(),bureauField(),field('address','Published bureau address','textarea'),field('originCountry','Origin country','select:CA,US,GB,AU'),field('enabled','Enable route','boolean'),field('service','Postal service'),field('maxPages','Maximum pages','number'),field('evidence','Supporting evidence','textarea'),field('mailer','Mailer','select:POSTGRID,MANUAL'),field('operatorCountry','Operator country','select:CA,US,GB,AU',false),field('mailingClass','Mailing class','select:first_class,registered,certified,certified_return_receipt',false),field('paperSize','Paper size','select:us_letter,a4',false),field('postgridRecipientId','Verified provider recipient ID','text',false),field('postgridRecipientHash','Verified recipient hash','text',false),field('expectedRevision','Current route revision','number')],{owner:true,sensitive:true,requestId:true}),
  'route.emergency':write('/staff/api/manual-emergencies','fulfillment.prepare','Set explicit manual-mail emergency',[
    countryField(),bureauField(),field('enabled','Enable emergency option','boolean'),field('expiresAt','Emergency option expires','timestamp'),field('reason','Reason','textarea')],{owner:true,sensitive:true,requestId:true}),
  'recipient.verify':write('/staff/api/postgrid/recipient','fulfillment.prepare','Verify or review bureau recipient',[
    countryField(),bureauField(),field('address','Published bureau address','textarea'),field('previousRequestId','Previous verification request','text',false),field('approveNormalized','Approve normalized address','boolean',false),field('confirmBureauAddress','Confirm published bureau address','boolean',false),field('bureauEvidence','Bureau address evidence','textarea',false),
    ...[['addressLine1','Postal address line 1'],['addressLine2','Postal address line 2'],['city','City'],['provinceOrState','Province or state'],['postalOrZip','Postal code']].map(([name,label])=>({...field(name,label,'text',false),parent:'postalFields'}))],{owner:true,sensitive:true,requestId:true}),
  'order.fulfill':write('/staff/api/orders/:id/fulfill','fulfillment.prepare','Record checked fulfillment transition',[
    field('expectedState','Current order state'),field('action','Transition','select:PREPARE,HANDOFF,DISPATCH,DELIVER,RETURN,HOLD,RESOLVE_NOT_POSTED,RESOLVE_POSTED'),field('packetHash','Approved packet hash'),field('confirm','Type I_HAVE_CHECKED_THIS_ORDER'),field('evidence','Fulfillment evidence','textarea'),field('service','Postal service','text',false),field('tracking','Tracking reference','text',false)],{sensitive:true,requestId:true}),
});
for(const action of ['prepare','preview','send','reconcile','cancel'])actions.mail['provider.'+action]=write('/staff/api/orders/:id/postgrid/'+action,'fulfillment.prepare',{
  prepare:'Prepare provider mailing',preview:'Refresh provider print preview',send:'Submit customer-authorized provider mailing',reconcile:'Reconcile uncertain provider outcome',cancel:'Cancel provider submission'
}[action],[field('confirm','Type I_HAVE_CHECKED_THIS_ORDER')],{owner:true,sensitive:true,background:true});

for(const name of ['partner.add','campaign.add'])actions.affiliate[name].fields.push({...field('simulationRunId','Isolated simulation run UUID','text',false),onlyNonProduction:true});
export function operation(app, name, writeMode = false) {
  const item = (writeMode ? actions : reads)[app]?.[name];
  if (!item)
    throw Object.assign(new Error("OPERATION_NOT_ALLOWED"), { status: 404 });
  return item;
}
export function nativePath(op, id, query = {}) {
  let path = op.path;
  if (path.includes(":id")) {
    if (typeof id !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(id))
      throw Object.assign(new Error("INVALID_RECORD_ID"), { status: 400 });
    path = path.replace(":id", encodeURIComponent(id));
  }
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (!op.query?.includes(k) || typeof v !== "string" || v.length > 200)
      throw Object.assign(new Error("INVALID_QUERY"), { status: 400 });
    params.set(k, v);
  }
  return path + (params.size ? "?" + params : "");
}
export function actionBody(op, raw, key) {
  if (
    !raw ||
    typeof raw !== "object" ||
    Array.isArray(raw) ||
    Object.keys(raw).some((k) => !op.fields.some((f) => f.name === k))
  )
    throw Object.assign(new Error("INVALID_FIELDS"), { status: 400 });
  const body = {};
  for (const f of op.fields) {
    let v = raw[f.name];
    if ((v === undefined || v === "") && !f.required) continue;
    if (f.required && (v === undefined || v === ""))
      throw Object.assign(new Error("REQUIRED_FIELD"), { status: 400 });
    if (f.type === "number" || f.type === 'timestamp') {
      if (!Number.isSafeInteger(v) || v < 0 || v > (f.type === 'timestamp' ? 8640000000000000 : 10000000))
        throw Object.assign(new Error("INVALID_AMOUNT"), { status: 400 });
    } else if (f.type === "boolean") {
      if (typeof v !== "boolean")
        throw Object.assign(new Error("INVALID_FIELD"), { status: 400 });
    } else if (f.type === "array") {
      if (
        !Array.isArray(v) ||
        v.length > 32 ||
        v.some((x) => typeof x !== "string" || x.length > 80)
      )
        throw Object.assign(new Error("INVALID_FIELD"), { status: 400 });
    } else if (
      typeof v !== "string" ||
      v.length > 2000 ||
      /[\x00-\x08\x0b-\x1f\x7f]/.test(v)
    )
      throw Object.assign(new Error("INVALID_FIELD"), { status: 400 });
    if (f.type.startsWith("select:") && !f.type.slice(7).split(",").includes(v))
      throw Object.assign(new Error("INVALID_FIELD"), { status: 400 });
    if (f.parent) { body[f.parent] ||= {}; body[f.parent][f.name]=v; }
    else body[f.name] = v;
  }
  if (body.postalFields) body.postalFields.addressLine2 ??= '';
  if (op.requestId) body.requestId = key;
  return body;
}
export const requestId = () => randomUUID();

// Controlled Creative Studio stays inside Affiliate; all administration uses native APIs.
reads.affiliate.studio=read('/api/studio/library','affiliate.read');
reads.affiliate['studio.queue']=read('/api/studio/requests','affiliate.read');
reads.affiliate['studio.limits']=read('/api/studio/limits','affiliate.read');
reads.affiliate['studio.proposals']=read('/api/studio/proposals','affiliate.read');
reads.affiliate['studio.designs']=read('/api/studio/designs','affiliate.manage');
reads.affiliate['studio.designer']=read('/api/studio/designer','affiliate.manage');
reads.affiliate['studio.export']={...read('/api/studio/requests/:id/download','affiliate.read'),format:'svg'};
reads.affiliate['studio.preview']=read('/api/studio/preview','affiliate.read',['brandId','messageId','templateId','width','height']);
Object.assign(actions.affiliate,{
 'studio.request':write('/api/studio/requests','affiliate.manage','Create an ad from approved designs',[field('campaignId','Active campaign','reference'),field('brandId','Published CRP brand','reference'),field('messageId','Published message','reference'),field('templateId','Published design','reference'),{...field('placement','Where will this ad be used?','select:website,sidebar,newsletter,social'),value:'website'},{...field('width','Width in pixels','number'),value:'1200'},{...field('height','Height in pixels','number'),value:'1200'}],{owner:true,sensitive:true}),
 'studio.design':write('/api/studio/designs','affiliate.manage','Create an AI design',[field('name','Design name'),field('brandId','Approved CRP brand','reference'),field('messageId','Approved advertising message','reference'),{...field('style','Artwork style','select:editorial,sculpted,abstract'),value:'editorial'},{...field('composition','Artwork position','select:art-right-v1,art-left-v1'),value:'art-right-v1'},{...field('country','Country','select:CA,US,AU,GB'),value:'CA'},{...field('placement','Where will this ad be used?','select:website,sidebar,newsletter,social'),value:'website'},{...field('width','Width in pixels','number'),value:'1200'},{...field('height','Height in pixels','number'),value:'1200'}],{owner:true,sensitive:true,requestId:true}),
 'studio.brand':write('/api/studio/brands','affiliate.manage','Propose brand version',[field('name','Version name')],{owner:true,sensitive:true}),
 'studio.message':write('/api/studio/messages','affiliate.manage','Propose message version',[field('name','Version name'),field('headline','Headline'),field('body','Product message','textarea'),field('cta','Call to action')],{owner:true,sensitive:true}),
 'studio.template':write('/api/studio/templates','affiliate.manage','Propose design version',[field('name','Version name'),field('layout','Design','select:stacked-v1,wide-v1'),field('countries','Permitted countries (CA,US,AU,GB)','array'),field('placements','Permitted placements (website,sidebar,newsletter,social)','array'),field('sizes','Approved sizes (for example 600x900)','array'),field('allowCustom','Allow any readable custom size within these bounds','boolean'),...['minWidth','maxWidth','minHeight','maxHeight'].map(k=>field(k,k.replace(/([A-Z])/g,' $1'),'number'))],{owner:true,sensitive:true}),
 'studio.version.decision':write('/api/studio/library/:id/decision','affiliate.manage','Review or change version publication',[field('expectedRevision','Current revision','number'),field('expectedHash','Exact content hash'),field('action','Decision','select:approve,reject,publish,pause,retire'),field('reason','Review reason','textarea')],{owner:true,sensitive:true}),
 'studio.request.decision':write('/api/studio/requests/:id/decision','affiliate.manage','Review creative request',[field('expectedRevision','Current revision','number'),field('action','Decision','select:approve,reject'),field('reason','Review reason','textarea')],{owner:true,sensitive:true}),
 'studio.limits':write('/api/studio/limits','affiliate.manage','Set Studio daily usage limits',[field('expectedRevision','Current revision','number'),field('requestsPerDay','Requests per partner per day','number'),field('downloadsPerDay','Downloads per partner per day','number')],{owner:true,sensitive:true}),
});
