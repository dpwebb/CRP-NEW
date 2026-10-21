import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createPortal } from "../src/server.mjs";
const require = createRequire(import.meta.url),
  {
    TestService,
  } = require("../../accelerated-launch/service/tests/harness.cjs"),
  security = require("../../accelerated-launch/service/signup-security.cjs"),
  access = require("../../accelerated-launch/service/admin-access.cjs");
test("real CRP HTTP authentication, MFA, scoped data and revocation through independent family gateway", async () => {
  const before = process.env.CRP_ADMIN_ENABLED,
    realNow = Date.now,
    dir = mkdtempSync(join(tmpdir(), "crp-family-real-"));
  let t,
    p,
    clock = realNow();
  process.env.CRP_ADMIN_ENABLED = "1";
  try {
    t = new TestService("family-admin-native");
    await t.listen();
    const actor = await t.unpaidAccount("family-owner@example.test");
    let setup;
    Date.now = () => clock - 180000;
    setup = security.beginTwoFactor(t.service.store, actor, {
      password: "a-long-enough-password",
    });
    security.confirmTwoFactor(t.service.store, actor, {
      code: security.totp(setup.secret),
    });
    access.bootstrapOwner(t.service.adminStore, {
      account_id: actor.account_id,
      code: security.totp(setup.secret, clock - 150000),
    });
    Date.now = () => clock;
    p = createPortal({
      environment: "local",
      origin: "http://127.0.0.1:0",
      upstreams: { crp: t.base },
      auditDirectory: dir,
      bindings: {},
    });
    await new Promise((r) => p.server.listen(0, "127.0.0.1", r));
    p.config.origin = "http://127.0.0.1:" + p.server.address().port;
    p.config.host = new URL(p.config.origin).host;
    let cookie = "",
      csrf = "";
    async function request(path, method = "GET", body) {
      const r = await fetch(p.config.origin + path, {
        method,
        headers: {
          origin: p.config.origin,
          cookie,
          ...(body
            ? { "content-type": "application/json", "x-csrf-token": csrf }
            : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const c = r.headers
        .getSetCookie?.()
        .find((x) => x.startsWith("crp_family="));
      if (c) cookie = c.split(";")[0];
      const json = await r.json();
      if (json.csrf) csrf = json.csrf;
      return { status: r.status, json };
    }
    let r = await request("/api/login", "POST", {
      email: "family-owner@example.test",
      password: "a-long-enough-password",
      code: security.totp(setup.secret, clock),
    });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    clock += 30000;
    r = await request("/api/unlock", "POST", {
      code: security.totp(setup.secret, clock),
    });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.equal(r.json.subject, actor.account_id);
    r = await request("/api/apps/crp/accounts");
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.ok(r.json.data.items.some((x) => x.account_id === actor.account_id));
    t.service.adminStore.update((state) => {
      state.memberships.find((x) => x.account_id === actor.account_id)
        .revision++;
    });
    r = await request("/api/apps/crp/accounts");
    assert.equal(r.status, 401);
    assert.equal(r.json.error.code, "TWO_FACTOR_REQUIRED");
  } finally {
    Date.now = realNow;
    if (p) await p.close();
    if (t) await t.close();
    if (before === undefined) delete process.env.CRP_ADMIN_ENABLED;
    else process.env.CRP_ADMIN_ENABLED = before;
    rmSync(dir, { recursive: true, force: true });
  }
});
