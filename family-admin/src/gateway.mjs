import { randomBytes, timingSafeEqual } from "node:crypto";
import {
  reads,
  actions,
  operation,
  nativePath,
  actionBody,
} from "./catalog.mjs";
import { digest } from "./journal.mjs";
const fail = (code, status = 403) => {
  throw Object.assign(Error(code), { status, code });
};
const plain = (x) => x && typeof x === "object" && !Array.isArray(x);
function strict(body, keys) {
  if (!plain(body) || Object.keys(body).some((k) => !keys.includes(k)))
    fail("INVALID_FIELDS", 400);
}
export function scrub(v) {
  if (Array.isArray(v)) return v.map(scrub);
  if (plain(v))
    return Object.fromEntries(
      Object.entries(v)
        .filter(
          ([k]) =>
            !/(?:token|secret|password|authorization|cookie|pdfbase64|privatekey)/i.test(
              k,
            ),
        )
        .map(([k, x]) => [k, scrub(x)]),
    );
  return v;
}
const random = () => randomBytes(32).toString("base64url");
const safeEqual = (a, b) => {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const left = Buffer.from(a),
    right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};
export class Gateway {
  constructor(config, journal, { fetcher = fetch, now = Date.now } = {}) {
    this.config = config;
    this.journal = journal;
    this.fetcher = fetcher;
    this.now = now;
    this.sessions = new Map();
    this.pendingLogouts = new Set();
    this.loginLimits = new Map();
  }
  async call(
    app,
    path,
    session,
    { method = "GET", body, timeout = 12000, documentFormat } = {},
  ) {
    const base = this.config.upstreams[app];
    if (!base) fail("APPLICATION_NOT_CONFIGURED", 503);
    const target = new URL(path, base);
    if (
      target.origin !== base ||
      !path.startsWith("/") ||
      path.startsWith("//")
    )
      fail("INVALID_UPSTREAM_PATH");
    const delegated = this.sso && app !== 'crp';
    const proof = delegated ? await this.sso.proof(session, app, { method, path: target.pathname + target.search, body }) : null;
    const link = session?.links?.[app] || {},
      headers = { accept: "application/json", origin: base };
    if (!delegated && link.cookies)
      headers.cookie = Object.entries(link.cookies)
        .map(([k, v]) => k + "=" + v)
        .join("; ");
    if (proof) headers.authorization = 'Bearer ' + proof;
    else if (link.bearer) headers.authorization = "Bearer " + link.bearer;
    if (link.csrf) headers["x-csrf-token"] = link.csrf;
    if (body !== undefined) headers["content-type"] = "application/json";
    let response;
    try {
      response = await this.fetcher(target, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        redirect: "error",
        signal: AbortSignal.timeout(timeout),
      });
    } catch {
      fail("UPSTREAM_OUTCOME_UNKNOWN", 502);
    }
    const cookies = response.headers.getSetCookie?.() || [];
    for (const line of cookies) {
      const match =
        /^(crp_session|crp_admin_session|crp_mail_staff)=([A-Za-z0-9_-]*)/.exec(
          line,
        );
      if (match && !delegated) {
        link.cookies ||= {};
        if (match[2]) link.cookies[match[1]] = match[2];
        else delete link.cookies[match[1]];
      }
    }
    const chunks = [];
    let bytes = 0;
    try {
      const reader = response.body?.getReader();
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          bytes += value.length;
          if (bytes > (documentFormat === 'pdf' ? 64*1024*1024 : documentFormat === 'svg' ? 65536 : 2*1024*1024)) {
            await reader.cancel();
            fail("UPSTREAM_RESPONSE_TOO_LARGE", 502);
          }
          chunks.push(Buffer.from(value));
        }
      }
    } catch (e) {
      if (e.code) throw e;
      fail("UPSTREAM_OUTCOME_UNKNOWN", 502);
    }
    const buffer = Buffer.concat(chunks);
    if (documentFormat && response.ok) {
      const type = String(response.headers.get('content-type')).toLowerCase();
      if (documentFormat === 'pdf' ? (!type.startsWith('application/pdf') || buffer.subarray(0,5).toString() !== '%PDF-')
        : (!type.startsWith('image/svg+xml') || !buffer.toString('utf8').includes('<svg')))
        fail('UPSTREAM_INVALID_DOCUMENT', 502);
      return buffer;
    }
    const text = buffer.toString("utf8");
    let value;
    try {
      value = JSON.parse(text);
    } catch {
      fail("UPSTREAM_INVALID_RESPONSE", 502);
    }
    if (!response.ok || value.ok === false) {
      const code =
        typeof value.error === "string" ? value.error : value.error?.code;
      fail(
        /^[A-Z0-9_]{1,80}$/.test(code || "") ? code : "UPSTREAM_REFUSED",
        [400, 401, 403, 404, 409, 422, 429].includes(response.status)
          ? response.status
          : 502,
      );
    }
    return value;
  }
  cookie(token, clear = false) {
    return `crp_family=${clear ? "" : token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${clear ? 0 : 900}${this.config.secure ? "; Secure" : ""}`;
  }
  getSession(req) {
    const raw = String(req.headers.cookie || "")
      .split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith("crp_family="))
      ?.slice(11);
    const session = raw && this.sessions.get(digest(raw));
    if (!session || session.expires <= this.now()) {
      if (session) void this.logout(session).catch(() => {});
      fail("SESSION_REQUIRED", 401);
    }
    return session;
  }
  csrf(req, s) {
    if (!safeEqual(req.headers["x-csrf-token"], s.csrf)) fail("CSRF_REJECTED");
  }
  async login(body, address) {
    strict(body, ["email", "password", "code"]);
    if (
      typeof body.email !== "string" ||
      body.email.length > 254 ||
      typeof body.password !== "string" ||
      body.password.length > 1024 ||
      typeof body.code !== "string" ||
      !/^[0-9]{6}$/.test(body.code)
    )
      fail("LOGIN_FIELDS_REQUIRED", 400);
    const ipKey = digest(address),
      ip = this.loginLimits.get(ipKey) || {
        count: 0,
        until: this.now() + 60000,
      };
    if (ip.until <= this.now()) {
      ip.count = 0;
      ip.until = this.now() + 60000;
    }
    if (++ip.count > 12) fail("LOGIN_RATE_LIMITED", 429);
    this.loginLimits.set(ipKey, ip);
    if (this.loginLimits.size > 2000) fail("LOGIN_RATE_LIMITED", 429);
    const key = digest(address + ":" + body.email.toLowerCase()),
      limit = this.loginLimits.get(key) || {
        count: 0,
        until: this.now() + 60000,
      };
    if (limit.until <= this.now()) {
      limit.count = 0;
      limit.until = this.now() + 60000;
    }
    if (++limit.count > 6) fail("LOGIN_RATE_LIMITED", 429);
    this.loginLimits.set(key, limit);
    if (this.loginLimits.size > 1000)
      for (const [k, v] of this.loginLimits)
        if (v.until <= this.now()) this.loginLimits.delete(k);
    for (const [k, v] of this.sessions)
      if (v.expires <= this.now()) {
        v.links = {};
        this.sessions.delete(k);
      }
    if (this.sessions.size >= 200) fail("SESSION_CAPACITY", 503);
    const s = {
      csrf: random(),
      links: { crp: {} },
      expires: this.now() + 300000,
      authorized: false,
    };
    try {
      const v = await this.call("crp", "/api/sessions", s, {
        method: "POST",
        body,
      });
      if (
        !/^acc_[a-f0-9]{24}$/.test(v.account?.account_id || "") ||
        !s.links.crp.cookies?.crp_session
      )
        fail("INVALID_PRIMARY_IDENTITY", 502);
      s.subject = v.account.account_id;
      s.email = v.account.email;
      const token = random();
      s.key = digest(token);
      this.journal.append("SIGN_IN", {
        subject: s.subject,
        environment: this.config.environment,
      });
      this.sessions.set(s.key, s);
      return {
        cookie: this.cookie(token),
        data: {
          csrf: s.csrf,
          unlockRequired: true,
          environment: this.config.environment,
        },
      };
    } catch (e) {
      if (s.links.crp.cookies)
        await this.call("crp", "/api/sessions/current", s, {
          method: "DELETE",
        }).catch(() => {});
      throw e;
    }
  }
  async unlock(s, body) {
    strict(body, ["code"]);
    if (typeof body.code !== "string" || !/^\d{6}$/.test(body.code))
      fail("FRESH_FACTOR_REQUIRED", 400);
    await this.call("crp", "/api/admin/unlock", s, { method: "POST", body });
    const value = await this.call("crp", "/api/admin/session", s);
    if (value.session?.account_id !== s.subject) fail("IDENTITY_CHANGED");
    s.authorized = true;
    s.verifiedAt = this.now();
    s.expires = this.now() + 900000;
    this.journal.append("ADMIN_UNLOCKED", {
      subject: s.subject,
      environment: this.config.environment,
    });
    return this.session(s);
  }
  async authorize(s) {
    if (
      !s.authorized ||
      s.expires <= this.now() ||
      this.sessions.get(s.key) !== s
    )
      fail("ADMIN_UNLOCK_REQUIRED", 401);
    const v = await this.call("crp", "/api/admin/session", s);
    const p = v.session || v.principal;
    if (
      p?.account_id !== s.subject ||
      !Array.isArray(p.permissions) ||
      !["owner", "staff", "partner"].includes(p.role)
    )
      fail("PRIMARY_MEMBERSHIP_INVALID");
    s.principal = p;
    return p;
  }
  binding(s, app) {
    return this.config.bindings[s.subject]?.[app];
  }
  async nativeIdentity(s, app) {
    if (app === "crp") return this.authorize(s);
    if (this.sso && this.binding(s, app)) this.sso.claims(s, app);
    const b = this.binding(s, app),
      link = s.links[app];
    if (!b || !link) fail("APPLICATION_NOT_LINKED", 409);
    if (app === "affiliate") {
      const me = await this.call(app, "/api/me", s);
      if (me.subject !== b.subject || !b.roles.includes(me.role))
        fail("LINKED_MEMBERSHIP_CHANGED");
      return me;
    }
    const me = await this.call(app, "/staff/api/session", s);
    if (
      !me.authenticated ||
      me.role !== b.role ||
      (b.role === "operator" && me.scope?.member?.id !== b.memberId)
    )
      fail("LINKED_MEMBERSHIP_CHANGED");
    if (!this.sso) link.csrf = me.csrfToken;
    return me;
  }
  capability(s, app, op) {
    const p = s.principal;
    if (
      !p?.permissions.includes(op.permission) ||
      (op.owner && p.role !== "owner")
    )
      fail("PERMISSION_REQUIRED");
    if (
      app !== "crp" &&
      !this.binding(s, app)?.permissions.includes(op.permission)
    )
      fail("LINKED_PERMISSION_REQUIRED");
  }
  async session(s) {
    const p = await this.authorize(s);
    const access = {};
    if (this.sso) for (const app of ['affiliate', 'mail']) {
      if (!this.binding(s, app) || !this.config.upstreams[app]) continue;
      try {
        await this.nativeIdentity(s, app);
        access[app] = true;
        if (!s.links[app].recorded) {
          this.journal.append('APPLICATION_LINKED', { subject: s.subject, app, mode: 'sso' });
          s.links[app].recorded = true;
        }
      } catch { access[app] = false; }
    }
    return {
      subject: s.subject,
      email: s.email,
      role: p.role,
      permissions: p.permissions,
      csrf: s.csrf,
      environment: this.config.environment,
      demo: this.config.demo,
      expiresAt: new Date(s.expires).toISOString(),
      applications: Object.fromEntries(
        ["crp", "affiliate", "mail"].map((app) => [
          app,
          {
            configured: !!this.config.upstreams[app],
            linked: app === "crp" || (this.sso ? access[app] === true : !!s.links[app]),
            managedSignIn: !!this.sso,
            ...(app === "affiliate" ? { browserSignIn: !!this.config.affiliateLogin } : {}),
            bindingConfigured: app === "crp" || !!this.binding(s, app),
            url: this.config.upstreams[app]
              ? this.config.upstreams[app] +
                { crp: "/admin", affiliate: "/", mail: "/staff" }[app]
              : null,
          },
        ]),
      ),
      catalog: {
        reads: Object.fromEntries(
          Object.entries(reads).map(([app, list]) => [
            app,
            Object.keys(list).filter((name) => {
              try {
                this.capability(s, app, list[name]);
                return true;
              } catch {
                return false;
              }
            }),
          ]),
        ),
        actions: Object.fromEntries(
          Object.entries(actions).map(([app, list]) => [
            app,
            Object.fromEntries(
              Object.entries(list)
                .filter(([, op]) => {
                  try {
                    this.capability(s, app, op);
                    return true;
                  } catch {
                    return false;
                  }
                })
                .map(([name, op]) => [
                  name,
                  {
                    label: op.label,
                    fields: op.fields,
                    needsId: op.path.includes(":id"),
                    sensitive: !!op.sensitive,
                    requiresStepUp: !!(op.owner || op.sensitive),
                  },
                ]),
            ),
          ]),
        ),
      },
    };
  }
  async connect(s, app, body) {
    if (this.sso) fail('GLOBAL_SIGN_IN_MANAGED', 409);
    await this.authorize(s);
    const b = this.binding(s, app);
    if (!b || !this.config.upstreams[app]) fail("APPLICATION_BINDING_REQUIRED");
    if (s.links[app]) fail("APPLICATION_ALREADY_LINKED", 409);
    if (app === "affiliate") {
      strict(body, ["token"]);
      if (
        typeof body.token !== "string" ||
        body.token.length < 16 ||
        body.token.length > 8192 ||
        /\s/.test(body.token)
      )
        fail("INVALID_LINK_CREDENTIAL", 400);
      s.links[app] = { bearer: body.token };
    } else if (app === "mail") {
      strict(body, ["code"]);
      if (typeof body.code !== "string" || !/^[a-f0-9]{48}$/.test(body.code))
        fail("INVALID_STAFF_CODE", 400);
      s.links[app] = {};
      try {
        const v = await this.call(app, "/staff/api/login", s, {
          method: "POST",
          body,
        });
        s.links[app].csrf = v.csrfToken;
      } catch (e) {
        delete s.links[app];
        throw e;
      }
    } else fail("APPLICATION_NOT_ALLOWED", 404);
    try {
      await this.nativeIdentity(s, app);
      await this.authorize(s);
      this.journal.append("APPLICATION_LINKED", { subject: s.subject, app });
    } catch (e) {
      if (app === "mail" && s.links[app]?.csrf)
        await this.call("mail", "/staff/api/logout", s, {
          method: "POST",
          body: {},
        }).catch(() => {});
      delete s.links[app];
      throw e;
    }
    return { linked: true };
  }
  async read(s, app, name, id, query) {
    await this.authorize(s);
    const op = operation(app, name);
    if (op.format) fail('DOCUMENT_ENDPOINT_REQUIRED', 400);
    this.capability(s, app, op);
    await this.nativeIdentity(s, app);
    const result = await this.call(app, nativePath(op, id, query), s);
    await this.authorize(s);
    await this.nativeIdentity(s, app);
    this.journal.append("RESOURCE_VIEWED", {
      subject: s.subject,
      app,
      resource: name,
      record: id || null,
    });
    return {
      app,
      resource: name,
      environment: this.config.environment,
      observedAt: new Date(this.now()).toISOString(),
      data: scrub(result),
    };
  }
  async document(s, app, name, id) {
    await this.authorize(s);
    const op=operation(app,name);
    if(!['pdf','svg'].includes(op.format))fail('DOCUMENT_NOT_ALLOWED',404);
    this.capability(s,app,op);await this.nativeIdentity(s,app);
    const bytes=await this.call(app,nativePath(op,id),s,{documentFormat:op.format,timeout:60000});
    await this.authorize(s);await this.nativeIdentity(s,app);
    this.journal.append('DOCUMENT_VIEWED',{subject:s.subject,app,resource:name,record:id,sha256:digest(bytes)});
    return bytes;
  }
  async execute(s, app, name, input) {
    strict(input, ["id", "body", "requestId", "confirmation"]);
    await this.authorize(s);
    const op = operation(app, name, true);
    this.capability(s, app, op);
    await this.nativeIdentity(s, app);
    if (input.confirmation !== `${this.config.environment}:${app}:${name}`)
      fail("CONFIRMATION_REQUIRED", 400);
    if (
      typeof input.requestId !== "string" ||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
        input.requestId,
      )
    )
      fail("REQUEST_ID_REQUIRED", 400);
    if ((op.owner || op.sensitive) && this.now() - s.verifiedAt > 60000)
      fail("FRESH_FACTOR_REQUIRED", 401);
    const body = actionBody(op, input.body, input.requestId),
      path = nativePath(op, input.id);
    const details = {
      subject: s.subject,
      app,
      operation: name,
      record: input.id || null,
      environment: this.config.environment,
      requestHash: digest(
        JSON.stringify([
          app,
          name,
          path,
          Object.fromEntries(
            Object.entries(body).filter(([k]) => k !== "requestId"),
          ),
          this.config.environment,
        ]),
      ),
    };
    if (!this.journal.reserve(input.requestId, details))
      return {
        status: "ALREADY_SUBMITTED",
        requestId: input.requestId,
        message:
          "Refresh the application record. This request was not sent again.",
      };
    let applied = false;
    try {
      const result = await this.call(app, path, s, { method: op.method, body });
      applied = true;
      this.journal.append("ACTION_RESULT", {
        key: input.requestId,
        ...details,
        outcome: "APPLIED",
      });
      await this.authorize(s);
      await this.nativeIdentity(s, app);
      return {
        status: "APPLIED",
        requestId: input.requestId,
        data: scrub(result),
      };
    } catch (e) {
      this.journal.append("ACTION_OBSERVATION", {
        key: input.requestId,
        ...details,
        outcome: applied
          ? "APPLIED_RESPONSE_WITHHELD"
          : e.code?.startsWith("UPSTREAM_")
            ? "UNKNOWN"
            : "REFUSED_OR_ACCESS_CHANGED",
        code: e.code || "INTERNAL_ERROR",
      });
      throw e;
    }
  }
  logout(s) {
    if (s.logoutPromise) return s.logoutPromise;
    this.sessions.delete(s.key);
    const work = (async () => {
      // Lock administration while the primary session still authenticates it.
      // Always attempt primary revocation, including after a failed lock.
      const outcomes = [];
      for (const operation of [
        () => this.call("crp", "/api/admin/lock", s, { method: "POST", body: {} }),
        () => this.call("crp", "/api/sessions/current", s, { method: "DELETE" }),
        ...(s.links.mail && !this.sso
          ? [
              () => this.call("mail", "/staff/api/logout", s, {
                method: "POST",
                body: {},
              }),
            ]
          : []),
      ]) outcomes.push(...await Promise.allSettled([operation()]));
      s.links = {};
      this.journal.append("SIGNED_OUT", {
        subject: s.subject,
        upstreamSignOutConfirmed: outcomes.every(
          (x) => x.status === "fulfilled",
        ),
      });
    })();
    s.logoutPromise = work;
    this.pendingLogouts.add(work);
    void work.finally(() => this.pendingLogouts.delete(work)).catch(() => {});
    return work;
  }
}
