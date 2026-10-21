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
        field("status", "Status", "select:ACTIVE,DISABLED"),
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
        field("code", "Partner code"),
        field("country", "Country", "select:CA,US,GB,AU"),
        field("trafficSource", "Traffic source URL"),
        field("introducerId", "Introducer ID", "text", false),
      ],
    ),
    "partner.activate": write(
      "/api/partners/:id/activate",
      "affiliate.manage",
      "Activate accepted partner",
      [],
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
    if (f.type === "number") {
      if (!Number.isSafeInteger(v) || v < 0 || v > 10000000)
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
    body[f.name] = v;
  }
  if (op.requestId) body.requestId = key;
  return body;
}
export const requestId = () => randomUUID();
