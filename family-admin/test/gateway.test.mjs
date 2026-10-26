import test from "node:test";
import http from "node:http";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fixtures, account, affiliateToken, mailCode } from "./fixtures.mjs";
import { configuration } from "../src/config.mjs";
import { Journal } from "../src/journal.mjs";
import { actionBody, actions, nativePath } from "../src/catalog.mjs";
const run = async (fn) => {
  const f = await fixtures();
  try {
    await fn(f);
  } finally {
    await f.close();
  }
};
  const change = (body = {termsVersion:'fixture-program-v1'}, extra = {}) => ({
  body,
  requestId: randomUUID(),
  confirmation: "local:affiliate:partner.activate",
  id: "11111111-1111-4111-8111-111111111111",
  ...extra,
});
test("CRP sign-in and separate fresh MFA unlock gate all application data", () =>
  run(async (f) => {
    assert.equal((await f.request("/api/apps/crp/accounts")).status, 401);
    const pending = await f.request("/api/login", {
      method: "POST",
      body: {
        email: "owner@example.test",
        password: "fictional-password",
        code: "123456",
      },
    });
    assert.equal(pending.status, 200);
    assert.match(
      pending.headers.get("set-cookie"),
      /HttpOnly; SameSite=Strict/,
    );
    assert.equal((await f.request("/api/apps/crp/accounts")).status, 401);
    assert.equal(
      (
        await f.request("/api/unlock", {
          method: "POST",
          body: { code: "111111" },
        })
      ).status,
      401,
    );
    const unlock = await f.request("/api/unlock", {
      method: "POST",
      body: { code: "654321" },
    });
    assert.equal(unlock.status, 200);
    assert.equal(unlock.json.subject, account);
    assert.equal(unlock.json.applications.affiliate.linked, false);
    const data = await f.request("/api/apps/crp/accounts");
    assert.equal(data.json.data.items.length, 2);
    assert.doesNotMatch(
      JSON.stringify(unlock.json),
      /fixture-consumer-cookie|fixture-admin-cookie|fictional-password/,
    );
  }));
test("explicit per-person links and native Origin/CSRF headers work across all apps", () =>
  run(async (f) => {
    await f.login();
    assert.equal((await f.request("/api/apps/affiliate/partners")).status, 409);
    await f.connect();
    for (const [app, resource] of [
      ["crp", "accounts"],
      ["crp", "organizations"],
      ["affiliate", "campaigns"],
      ["affiliate", "holds"],
      ["mail", "pricing"],
      ["affiliate", "partners"],
      ["affiliate", "commissions"],
      ["affiliate", "proposals"],
      ["mail", "orders"],
      ["mail", "routes"],
      ["mail", "team"],
    ]) {
      const r = await f.request("/api/apps/" + app + "/" + resource);
      assert.equal(r.status, 200, app + ":" + JSON.stringify(r.json));
      assert.equal(r.json.environment, "local");
    }
    const key = randomUUID();
    const r = await f.request("/api/actions/mail/note.add", {
      method: "POST",
      body: {
        id: "44444444-4444-4444-8444-444444444444",
        requestId: key,
        confirmation: "local:mail:note.add",
        body: { body: "Fictional operational note" },
      },
    });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.equal(f.state.writes[0].body.requestId, key);
    assert.equal(f.state.writes[0].body.body, "Fictional operational note");
    const native = f.state.calls.find((x) => x.path.endsWith("/notes"));
    assert.equal(native.headers["x-csrf-token"], "b".repeat(64));
    assert.equal(native.headers.origin, f.portal.config.upstreams.mail);
  }));
test("foreign affiliate identity and unconfigured mappings never connect", () =>
  run(async (f) => {
    await f.login();
    f.state.affiliateSubject = "unrelated-person";
    assert.equal(
      (
        await f.request("/api/connections/affiliate", {
          method: "POST",
          body: { token: affiliateToken },
        })
      ).status,
      403,
    );
    assert.equal(
      f.portal.gateway.sessions.values().next().value.links.affiliate,
      undefined,
    );
    delete f.portal.config.bindings[account].mail;
    assert.equal(
      (
        await f.request("/api/connections/mail", {
          method: "POST",
          body: { code: mailCode },
        })
      ).status,
      403,
    );
    assert.equal(
      f.state.calls.some((x) => x.app === "mail"),
      false,
    );
  }));
test("role downgrade and native revocation stop subsequent writes", () =>
  run(async (f) => {
    await f.login();
    await f.connect();
    f.state.primaryPermissions = ["overview.read"];
    assert.equal(
      (
        await f.request("/api/actions/affiliate/partner.activate", {
          method: "POST",
          body: change(),
        })
      ).status,
      403,
    );
    f.state.primaryPermissions.push("affiliate.manage");
    f.state.affiliateActive = false;
    assert.equal(
      (
        await f.request("/api/actions/affiliate/partner.activate", {
          method: "POST",
          body: change(),
        })
      ).status,
      401,
    );
    assert.equal(f.state.writes.length, 0);
  }));
test("revocation while reading withholds already fetched private records", () =>
  run(async (f) => {
    await f.login();
    await f.connect();
    f.state.beforeData = (app) => {
      if (app === "affiliate") f.state.active = false;
    };
    const r = await f.request("/api/apps/affiliate/partners");
    assert.equal(r.status, 401);
    assert.doesNotMatch(r.text, /Fictional Maple Partners/);
  }));
test("duplicate action is never dispatched again and changed body conflicts", () =>
  run(async (f) => {
    await f.login();
    await f.connect();
    const input = change();
    let r = await f.request("/api/actions/affiliate/partner.activate", {
      method: "POST",
      body: input,
    });
    assert.equal(r.status, 200);
    r = await f.request("/api/actions/affiliate/partner.activate", {
      method: "POST",
      body: input,
    });
    assert.equal(r.json.status, "ALREADY_SUBMITTED");
    assert.equal(f.state.writes.length, 1);
    const altered = { ...input, id: "22222222-2222-4222-8222-222222222222" };
    assert.equal(
      (
        await f.request("/api/actions/affiliate/partner.activate", {
          method: "POST",
          body: altered,
        })
      ).status,
      409,
    );
    assert.equal(f.state.writes.length, 1);
    const log = readFileSync(join(f.directory, "audit.jsonl"), "utf8");
    assert.doesNotMatch(
      log,
      /fixture-affiliate-bearer|fixture-admin-cookie|fictional-password/,
    );
    assert.match(log, /ACTION_INTENT/);
    assert.match(log, /ACTION_RESULT/);
  }));
test("uncertain response holds its durable request and refuses an automatic retry", () =>
  run(async (f) => {
    await f.login();
    await f.connect();
    f.state.fault = "drop";
    const input = change();
    const r = await f.request("/api/actions/affiliate/partner.activate", {
      method: "POST",
      body: input,
    });
    assert.equal(r.status, 502);
    assert.equal(r.json.error.code, "UPSTREAM_OUTCOME_UNKNOWN");
    f.state.fault = null;
    assert.equal(
      (
        await f.request("/api/actions/affiliate/partner.activate", {
          method: "POST",
          body: input,
        })
      ).json.status,
      "ALREADY_SUBMITTED",
    );
    assert.equal(f.state.writes.length, 1);
    assert.equal(
      (
        await f.request("/api/actions/affiliate/partner.activate", {
          method: "POST",
          body: { ...input, requestId: randomUUID() },
        })
      ).json.error.code,
      "PREVIOUS_OUTCOME_UNRESOLVED",
    );
    assert.equal(f.state.writes.length, 1);
    assert.match(
      readFileSync(join(f.directory, "audit.jsonl"), "utf8"),
      /UNKNOWN/,
    );
  }));
test("CSRF, foreign Host, unapproved commands, injected paths and unknown fields fail closed", () =>
  run(async (f) => {
    await f.login();
    await f.connect();
    assert.equal(
      (
        await f.request("/api/actions/affiliate/partner.activate", {
          method: "POST",
          body: change(),
          headers: { origin: "https://untrusted.example" },
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await f.request("/api/actions/affiliate/partner.activate", {
          method: "POST",
          body: change(),
          headers: { "x-csrf-token": "wrong" },
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await f.request("/api/actions/affiliate/partner.activate", {
          method: "POST",
          body: change(),
          headers: { "x-csrf-token": "ñ".repeat(43) },
        })
      ).status,
      403,
    );
    const foreignHost = await new Promise((resolve, reject) => {
      const r = http.get(
        f.base + "/api/session",
        { headers: { host: "untrusted.example", cookie: f.cookie } },
        (res) => {
          res.resume();
          resolve(res.statusCode);
        },
      );
      r.on("error", reject);
    });
    assert.equal(foreignHost, 403);
    assert.equal(
      (
        await f.request("/api/actions/affiliate/payments.execute", {
          method: "POST",
          body: change(),
        })
      ).status,
      404,
    );
    assert.equal(
      (await f.request("/api/apps/mail/order?id=..%2F..%2Fprivate")).status,
      400,
    );
    assert.equal(
      (await f.request("/api/apps/crp/accounts?url=https://other.example"))
        .status,
      400,
    );
    assert.equal(
      (
        await f.request("/api/actions/affiliate/partner.activate", {
          method: "POST",
          body: change({ admin: true }),
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await f.request("/api/actions/affiliate/partner.activate", {
          method: "POST",
          body: change(
            {},
            { confirmation: "production:affiliate:partner.activate" },
          ),
        })
      ).status,
      400,
    );
    assert.equal(f.state.writes.length, 0);
  }));
test("privileged actions require recent MFA even with a still valid session", async () => {
  let clock = Date.now();
  const f = await fixtures({ now: () => clock });
  try {
    await f.login();
    await f.connect();
    clock += 61000;
    assert.equal(
      (
        await f.request("/api/actions/affiliate/partner.activate", {
          method: "POST",
          body: change(),
        })
      ).json.error.code,
      "FRESH_FACTOR_REQUIRED",
    );
    await f.request("/api/unlock", {
      method: "POST",
      body: { code: "654321" },
    });
    assert.equal(
      (
        await f.request("/api/actions/affiliate/partner.activate", {
          method: "POST",
          body: change(),
        })
      ).status,
      200,
    );
  } finally {
    await f.close();
  }
});
test("sign-out clears gateway session and native sessions", () =>
  run(async (f) => {
    await f.login();
    await f.connect();
    const cookie = f.cookie;
    assert.equal(
      (await f.request("/api/logout", { method: "POST", body: {} })).status,
      200,
    );
    assert.equal(
      (await f.request("/api/session", { headers: { cookie } })).status,
      401,
    );
    assert.equal(f.portal.gateway.sessions.size, 0);
    assert.equal(f.state.mailActive, false);
  }));
test("sign-out confirms native admin lock before closing the primary session", () =>
  run(async (f) => {
    await f.login();
    const fetcher = f.portal.gateway.fetcher;
    let primaryClosed = false;
    f.portal.gateway.fetcher = async (target, options) => {
      const path = new URL(target).pathname;
      if (path === "/api/admin/lock") {
        await new Promise(resolve => setTimeout(resolve, 25));
        if (primaryClosed)
          return Response.json({error:{code:"SESSION_REQUIRED"}}, {status:401});
      }
      if (path === "/api/sessions/current" && options.method === "DELETE")
        primaryClosed = true;
      return fetcher(target, options);
    };
    assert.equal((await f.request("/api/logout", {method:"POST",body:{}})).status,200);
    assert.equal(primaryClosed,true);
    const event=f.portal.journal.events.at(-1);
    assert.equal(event.event,"SIGNED_OUT");
    assert.equal(event.upstreamSignOutConfirmed,true);
  }));
test("a refused admin lock still closes the primary session and records incomplete confirmation", () =>
  run(async (f) => {
    await f.login();
    const fetcher=f.portal.gateway.fetcher;
    let primaryClosed=false;
    f.portal.gateway.fetcher=async(target,options)=>{
      const path=new URL(target).pathname;
      if(path==="/api/admin/lock")return Response.json({error:{code:"NOT_AUTHORIZED"}},{status:403});
      if(path==="/api/sessions/current"&&options.method==="DELETE")primaryClosed=true;
      return fetcher(target,options);
    };
    assert.equal((await f.request("/api/logout",{method:"POST",body:{}})).status,200);
    assert.equal(primaryClosed,true);
    assert.equal(f.portal.gateway.sessions.size,0);
    assert.equal(f.portal.journal.events.at(-1).upstreamSignOutConfirmed,false);
  }));
test("audit is authenticated, durable, nonreplayable across restart and rejects modification", () => {
  const dir = mkdtempSync(join(tmpdir(), "family-audit-"));
  try {
    let j = new Journal(dir);
    const key = randomUUID(),
      d = { subject: account, requestHash: "a".repeat(64) };
    assert.equal(j.reserve(key, d), true);
    assert.throws(() => new Journal(dir), /EEXIST/);
    j.close();
    j = new Journal(dir);
    assert.equal(j.reserve(key, d), false);
    j.close();
    const file = join(dir, "audit.jsonl");
    writeFileSync(
      file,
      readFileSync(file, "utf8").replace("ACTION_INTENT", "MODIFIED_INTENT"),
    );
    assert.throws(() => new Journal(dir), /AUDIT_INTEGRITY_FAILED/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("environment isolation refuses production destinations from local/staging and unbound identities", () => {
  const base = {
    environment: "local",
    origin: "http://127.0.0.1:4396",
    upstreams: { crp: "http://127.0.0.1:5001" },
    bindings: {},
  };
  assert.equal(configuration(base).environment, "local");
  assert.throws(
    () =>
      configuration({
        ...base,
        upstreams: { crp: "https://creditregulatorpro.com" },
      }),
    /LOCAL_UPSTREAM_REQUIRED/,
  );
  assert.throws(
    () =>
      configuration({
        ...base,
        environment: "staging",
        origin: "https://admin-staging.creditregulatorpro.com",
        upstreams: { crp: "https://creditregulatorpro.com" },
      }),
    /ENVIRONMENT_UPSTREAM_MISMATCH/,
  );
  assert.throws(
    () => configuration({ ...base, bindings: { "owner@example.test": {} } }),
    /INVALID_CRP_ACCOUNT_BINDING/,
  );
  assert.throws(
    () => nativePath({ path: "/api/:id" }, "a/b"),
    /INVALID_RECORD_ID/,
  );
  assert.throws(
    () =>
      actionBody(
        actions.mail["pricing.update"],
        {
          country: "CA",
          expectedRevision: 1,
          firstPageMinor: -1,
          additionalPageMinor: 0,
          reason: "A price change",
        },
        randomUUID(),
      ),
    /INVALID_AMOUNT/,
  );
});

test("native Mail role changes and removal of linked capabilities deny cross-app access", () =>
  run(async (f) => {
    await f.login();
    await f.connect();
    f.state.mailRole = "operator";
    assert.equal((await f.request("/api/apps/mail/orders")).status, 403);
    f.state.mailRole = "admin";
    f.portal.config.bindings[account].mail.permissions = ["fulfillment.read"];
    assert.equal(
      (
        await f.request("/api/actions/mail/order.refund", {
          method: "POST",
          body: {
            id: "44444444-4444-4444-8444-444444444444",
            requestId: randomUUID(),
            confirmation: "local:mail:order.refund",
            body: { reason: "Fictional eligible refund review" },
          },
        })
      ).status,
      403,
    );
    assert.equal(f.state.writes.length, 0);
  }));
test("idle privileges lock without discarding Family identity; absolute expiry revokes it", async () => {
  let clock = Date.now();
  const f = await fixtures({ now: () => clock });
  try {
    await f.login();
    const cookie = f.cookie;
    const session = [...f.portal.gateway.sessions.values()][0], cap = session.authenticatedUntil;
    clock += 901000;
    assert.equal((await f.request("/api/apps/crp/accounts", { headers: { cookie } })).status, 401);
    assert.equal(f.portal.gateway.sessions.size, 1);
    assert.equal((await f.request("/api/session", { headers: { cookie } })).json.unlockRequired, true);
    assert.equal(session.authenticatedUntil, cap);
    clock = cap + 1;
    assert.equal((await f.request("/api/session", { headers: { cookie } })).status, 401);
    assert.equal(f.portal.gateway.sessions.size, 0);
  } finally {
    await f.close();
  }
});
test("native secret fields are removed from responses and their values never enter audit", () =>
  run(async (f) => {
    await f.login();
    f.state.data.crp.accounts.items[0].password = "unwanted-private-password";
    f.state.data.crp.accounts.items[0].metadata = {
      accessToken: "unwanted-token",
      display: "permitted",
    };
    const r = await f.request("/api/apps/crp/accounts");
    assert.equal(r.status, 200);
    assert.doesNotMatch(r.text, /unwanted-private-password|unwanted-token/);
    assert.match(r.text, /permitted/);
    assert.doesNotMatch(
      readFileSync(join(f.directory, "audit.jsonl"), "utf8"),
      /unwanted-private-password|unwanted-token/,
    );
  }));
test("fresh login applies a bounded address-wide rate limit", () =>
  run(async (f) => {
    for (let i = 0; i < 12; i++)
      await f.request("/api/login", {
        method: "POST",
        body: {
          email: "different-" + i + "@example.test",
          password: "fictional-password",
          code: "123456",
        },
      });
    assert.equal(
      (
        await f.request("/api/login", {
          method: "POST",
          body: {
            email: "another@example.test",
            password: "fictional-password",
            code: "123456",
          },
        })
      ).status,
      429,
    );
  }));

test("Affiliate membership operations preserve native methods, subject scope and role bounds", () =>
  run(async (f) => {
    await f.login();
    await f.connect();
    const base = {
      subject: "verified-existing-subject",
      partnerId: "11111111-1111-4111-8111-111111111111",
    };
    for (const [name, method, body] of [
      ["team.add", "POST", { ...base, role: "analyst" }],
      [
        "team.update",
        "PUT",
        { ...base, expectedRole: "analyst", role: "operator" },
      ],
      ["team.remove", "DELETE", { ...base, expectedRole: "operator" }],
    ]) {
      const r = await f.request("/api/actions/affiliate/" + name, {
        method: "POST",
        body: {
          body,
          requestId: randomUUID(),
          confirmation: "local:affiliate:" + name,
        },
      });
      assert.equal(r.status, 200, JSON.stringify(r.json));
      assert.equal(f.state.writes.at(-1).method, method);
      assert.equal(f.state.writes.at(-1).path, "/api/members");
      assert.deepEqual(f.state.writes.at(-1).body, body);
    }
    const r = await f.request("/api/actions/affiliate/team.add", {
      method: "POST",
      body: {
        body: { ...base, role: "owner" },
        requestId: randomUUID(),
        confirmation: "local:affiliate:team.add",
      },
    });
    assert.equal(r.status, 400);
    assert.equal(f.state.writes.length, 3);
  }));
