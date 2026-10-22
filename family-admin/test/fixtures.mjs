import http from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createPortal } from "../src/server.mjs";
import { generateKeyPairSync } from 'node:crypto';
import { FamilySsoClient } from '../native/family-sso-client.mjs';
export const account = "acc_" + "a".repeat(24),
  otherAccount = "acc_" + "b".repeat(24);
export const permissions = [
  "overview.read",
  "accounts.read",
  "cases.read",
  "billing.read",
  "affiliate.read",
  "affiliate.manage",
  "fulfillment.read",
  "fulfillment.prepare",
  "fulfillment.grants",
  "audit.read",
  "team.manage",
  "organizations.manage",
];
export const mailCode = "a".repeat(48),
  affiliateToken = "fixture-affiliate-bearer-only";
const cookie = "crp_session=fixture-consumer-cookie; HttpOnly; SameSite=Strict";
export const data = {
  crp: {
    overview: {
      overview: {
        counts: { accounts: 3, cases: 5, reports: 7, approved_packets: 2 },
      },
    },
    accounts: {
      items: [
        {
          account_id: account,
          email: "morgan@example.test",
          signup_complete: true,
          two_factor_enabled: true,
          case_count: 2,
        },
        {
          account_id: otherAccount,
          email: "alex@example.test",
          signup_complete: true,
          two_factor_enabled: true,
          case_count: 1,
        },
      ],
      total: 2,
    },
    cases: {
      items: [
        {
          case_id: "case_fictional_1",
          account_id: account,
          country: "CA",
          region: "CA-NS",
          status: "PACKET_READY",
          created_at: "2026-10-21T12:00:00Z",
          packet: { approved: true },
        },
      ],
      total: 1,
    },
    billing: {
      items: [
        {
          checkout_id: "fictional-checkout",
          account_id: account,
          plan_code: "monthly",
          currency: "cad",
          status: "COMPLETED",
          verified_paid_minor: 795,
        },
      ],
      total: 1,
      totals: [
        { currency: "CAD", purchase_count: 1, verified_paid_minor: 795 },
      ],
    },
    team: {
      items: [
        {
          admin_id: "owner-fixture",
          account_id: account,
          email: "owner@example.test",
          role: "owner",
          permissions,
          status: "ACTIVE",
        },
      ],
      total: 1,
    },
    organizations: { items: [], total: 0 },
    audit: { items: [], total: 0 },
  },
  affiliate: {
    overview: {
      partners: { active: 2, applied: 1 },
      jobs: { pending: 2 },
      paymentExecution: false,
    },
    partners: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        name: "Fictional Maple Partners",
        code: "MAPLE",
        status: "ACTIVE",
        country: "CA",
        payee_verified: true,
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        name: "Fictional Cedar Network",
        code: "CEDAR",
        status: "APPLIED",
        country: "US",
        payee_verified: false,
      },
    ],
    campaigns: [
      {
        id: "fictional-campaign",
        partner_id: "11111111-1111-4111-8111-111111111111",
        name: "Fictional fall campaign",
        country: "CA",
        active: true,
      },
    ],
    commissions: [
      {
        id: 1,
        partner_id: "11111111-1111-4111-8111-111111111111",
        currency: "CAD",
        beneficiary_kind: "DIRECT",
        delta_minor: 199,
        eligible_at: "2026-11-21T00:00:00Z",
      },
    ],
    proposals: [
      {
        id: "33333333-3333-4333-8333-333333333333",
        partner_id: "11111111-1111-4111-8111-111111111111",
        currency: "CAD",
        amount_minor: 199,
        state: "READY_FOR_HUMAN",
      },
    ],
    holds: [],
    team: [
      { subject: "fictional-affiliate-owner", partner_id: null, role: "owner" },
    ],
    audit: [],
  },
  mail: {
    overview: {
      orders: 4,
      queued: 2,
      returned: 1,
      awaitingPayment: 1,
      dispatchPaused: true,
    },
    orders: {
      items: [
        {
          id: "44444444-4444-4444-8444-444444444444",
          state: "QUEUED",
          paymentState: "VERIFIED",
          country: "CA",
          amountMinor: 990,
          currency: "CAD",
          createdAt: "2026-10-21T12:00:00Z",
        },
        {
          id: "55555555-5555-4555-8555-555555555555",
          state: "RETURNED",
          paymentState: "VERIFIED",
          country: "US",
          amountMinor: 1390,
          currency: "USD",
          createdAt: "2026-10-20T12:00:00Z",
        },
      ],
      total: 2,
    },
    pricing: {
      items: [
        {
          revision: 1,
          country: "CA",
          currency: "CAD",
          firstPageMinor: 990,
          additionalPageMinor: 50,
        },
      ],
    },
    routes: {
      items: [
        {
          id: "fictional-route",
          country: "CA",
          bureau: "EQUIFAX",
          enabled: false,
          service: "FICTIONAL_ONLY",
        },
      ],
      defaultMailer: "postgrid",
    },
    team: {
      items: [
        {
          id: "66666666-6666-4666-8666-666666666666",
          name: "Fictional Canada fulfiller",
          country: "CA",
          kind: "individual",
          revoked_at: null,
        },
      ],
    },
  },
};
function send(res, status, value, headers = {}) {
  res.writeHead(status, { "content-type": "application/json", ...headers });
  res.end(JSON.stringify(value));
}
export async function fixtures({ port = 0, dir, now = Date.now, singleSignIn = false } = {}) {
  const clients = {};
  const pair = singleSignIn ? generateKeyPairSync('ed25519') : null;
  const state = {
      active: true,
      affiliateActive: true,
      mailActive: true,
      primaryRole: "owner",
      primaryPermissions: [...permissions],
      writes: [],
      calls: [],
      fault: null,
      beforeData: null,
      affiliateSubject: "fictional-affiliate-owner",
      mailRole: "admin",
      data: structuredClone(data),
    },
    servers = [],
    upstreams = {};
  for (const app of ["crp", "affiliate", "mail"]) {
    const server = http.createServer(async (req, res) => {
      let text = "";
      for await (const chunk of req) text += chunk;
      const body = text ? JSON.parse(text) : {},
        path = new URL(req.url, "http://fixture").pathname;
      state.calls.push({ app, path, method: req.method, headers: req.headers });
      if (req.headers.origin !== upstreams[app])
        return send(res, 403, { error: "ORIGIN_REQUIRED" });
      if (app === "crp" && path === "/api/sessions" && req.method === "POST") {
        if (
          body.email !== "owner@example.test" ||
          body.password !== "fictional-password" ||
          body.code !== "123456"
        )
          return send(res, 401, { error: { code: "INVALID_CREDENTIALS" } });
        return send(
          res,
          200,
          { ok: true, account: { account_id: account, email: body.email } },
          { "set-cookie": cookie },
        );
      }
      if (
        app === "crp" &&
        (!req.headers.cookie?.includes("crp_session=fixture-consumer-cookie") ||
          !state.active)
      )
        return send(res, 401, { error: { code: "SESSION_REQUIRED" } });
      if (app === "crp" && path === "/api/admin/unlock") {
        if (body.code !== "654321")
          return send(res, 401, { error: { code: "TWO_FACTOR_INVALID" } });
        return send(
          res,
          200,
          { ok: true },
          { "set-cookie": "crp_admin_session=fixture-admin-cookie; HttpOnly" },
        );
      }
      if (
        app === "crp" &&
        path.startsWith("/api/admin/") &&
        path !== "/api/admin/lock" &&
        !req.headers.cookie?.includes("crp_admin_session=fixture-admin-cookie")
      )
        return send(res, 401, { error: { code: "TWO_FACTOR_REQUIRED" } });
      if (app === "crp" && path === "/api/admin/session")
        return send(res, 200, {
          ok: true,
          session: {
            account_id: account,
            role: state.primaryRole,
            permissions: state.primaryPermissions,
          },
        });
      if (
        app === "crp" &&
        (path === "/api/admin/lock" || path === "/api/sessions/current")
      )
        return send(res, 200, { ok: true });
      if (app === "affiliate") {
        if(singleSignIn) {
          try { await clients.affiliate.authenticate({method:req.method,url:req.url,headers:req.headers,body:text?body:undefined}); }
          catch { return send(res,401,{error:'FAMILY_SSO_REFUSED'}); }
        }
        if (
          (!singleSignIn && req.headers.authorization !== "Bearer " + affiliateToken) ||
          !state.affiliateActive
        )
          return send(res, 401, { error: "INVALID_SESSION" });
        if (path === "/api/me")
          return send(res, 200, {
            subject: state.affiliateSubject,
            role: "owner",
            partner_id: null,
          });
      }
      if (app === "mail" && path === "/staff/api/login") {
        if (body.code !== mailCode)
          return send(res, 401, { error: "STAFF_SESSION_REQUIRED" });
        state.mailActive = true;
        return send(
          res,
          200,
          {
            ok: true,
            role: state.mailRole,
            scope: { country: null, member: null },
            csrfToken: "b".repeat(64),
          },
          { "set-cookie": "crp_mail_staff=fixture-mail-cookie; HttpOnly" },
        );
      }
      if (app === "mail") {
        if(singleSignIn) {
          try { await clients.mail.authenticate({method:req.method,url:req.url,headers:req.headers,body:text?body:undefined}); }
          catch { return send(res,401,{error:'FAMILY_SSO_REFUSED'}); }
        }
        if (
          (!singleSignIn && !req.headers.cookie?.includes("crp_mail_staff=fixture-mail-cookie")) ||
          !state.mailActive
        )
          return send(res, 401, { error: "STAFF_SESSION_REQUIRED" });
        if (path === "/staff/api/session")
          return send(res, 200, {
            authenticated: true,
            role: state.mailRole,
            scope: { country: null, member: null },
            csrfToken: "b".repeat(64),
          });
        if (
          !singleSignIn && req.method !== "GET" &&
          req.headers["x-csrf-token"] !== "b".repeat(64)
        )
          return send(res, 403, { error: "CSRF_REJECTED" });
        if (path === "/staff/api/logout") {
          state.mailActive = false;
          return send(res, 200, { ok: true });
        }
      }
      if (req.method !== "GET") {
        state.writes.push({ app, path, body, method: req.method });
        if (state.fault === "drop") {
          res.destroy();
          return;
        }
        if (state.fault === "reject")
          return send(res, 409, { error: "STATE_CHANGED" });
        return send(res, 200, { updated: true });
      }
      let resource = path.split("/").at(-1);
      if(app==='crp'&&resource==='affiliates')resource='referrals';
      if (app === "affiliate")
        resource =
          { status: "overview", journal: "commissions", members: "team" }[
            resource
          ] || resource;
      if (app === "mail" && /^\/staff\/api\/orders\/[^/]+$/.test(path))
        resource = "order";
      if (state.beforeData) await state.beforeData(app, resource);
      let value = state.data[app][resource];
      if(value === undefined && singleSignIn) value={items:[]};
      if (resource === "order") value = state.data.mail.orders.items[0];
      if (app === "affiliate" && resource === "export")
        value = { state: "READY_FOR_HUMAN", externalPaymentRequired: true };
      if (value === undefined) return send(res, 404, { error: "NOT_FOUND" });
      return send(res, 200, value);
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    upstreams[app] = "http://127.0.0.1:" + server.address().port;
    servers.push(server);
  }
  const directory = dir || mkdtempSync(join(tmpdir(), "crp-family-fixture-")),
    raw = {
      environment: "local",
      origin: "http://127.0.0.1:" + port,
      demo: true,
      familySso: singleSignIn,
      upstreams,
      auditDirectory: directory,
      bindings: {
        [account]: {
          affiliate: {
            subject: "fictional-affiliate-owner",
            roles: ["owner"],
            permissions: ["affiliate.read", "affiliate.manage", "team.manage"],
          },
          mail: {
            role: "admin",
            permissions: [
              "fulfillment.read",
              "fulfillment.prepare",
              "billing.read",
              "team.manage",
            ],
          },
        },
      },
    },
    portal = createPortal(raw, { now, ...(pair ? {ssoPrivateKey:pair.privateKey} : {}) });
  await new Promise((r) => portal.server.listen(port, "127.0.0.1", r));
  portal.config.port = portal.server.address().port;
  portal.config.origin = "http://127.0.0.1:" + portal.config.port;
  portal.config.host = "127.0.0.1:" + portal.config.port;
  const base = portal.config.origin;
  if(singleSignIn)for(const app of ['affiliate','mail'])clients[app]=new FamilySsoClient({app,issuer:base,audience:upstreams[app],environment:'local',publicKey:portal.gateway.sso.publicKey,now,
    binding:sub=>portal.config.bindings[sub]?.[app],
    resolveActor:b=>app==='affiliate'?{subject:b.subject,role:'owner'}:{role:b.role},permission:()=>null});
  let cookieHeader = "",
    csrf = "";
  const request = async (path, { method = "GET", body, headers = {} } = {}) => {
    const response = await fetch(base + path, {
      method,
      headers: {
        origin: base,
        cookie: cookieHeader,
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
        ...(method !== "GET" ? { "x-csrf-token": csrf } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const set = response.headers
      .getSetCookie?.()
      .find((x) => x.startsWith("crp_family="));
    if (set) cookieHeader = set.split(";")[0];
    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {}
    if (json?.csrf) csrf = json.csrf;
    return { status: response.status, json, text, headers: response.headers };
  };
  const login = async () => {
    await request("/api/login", {
      method: "POST",
      body: {
        email: "owner@example.test",
        password: "fictional-password",
        code: "123456",
      },
    });
    return request("/api/unlock", { method: "POST", body: { code: "654321" } });
  };
  const connect = async () => {
    await request("/api/connections/affiliate", {
      method: "POST",
      body: { token: affiliateToken },
    });
    await request("/api/connections/mail", {
      method: "POST",
      body: { code: mailCode },
    });
  };
  return {
    portal,
    state,
    base,
    request,
    login,
    connect,
    directory,
    get cookie() {
      return cookieHeader;
    },
    get csrf() {
      return csrf;
    },
    close: async () => {
      await portal.close();
      for (const server of servers) await new Promise((r) => server.close(r));
      if (!dir) rmSync(directory, { recursive: true, force: true });
    },
  };
}
