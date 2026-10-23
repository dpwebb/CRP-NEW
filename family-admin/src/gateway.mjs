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
const IDLE_MS = 15 * 60000, MAX_SESSION_MS = 8 * 60 * 60000;
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
    this.pendingOperations = new Map();
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
          if (bytes > (documentFormat === 'pdf' ? 64*1024*1024 : documentFormat === 'svg' ? 65536 : path.startsWith('/api/studio/preview?') ? 3*1024*1024 : 2*1024*1024)) {
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
      if(code==='POSTGRID_RATE_LIMITED'){
        const error=Object.assign(Error(code),{code,status:429});
        error.retryAfterSeconds=Number.isInteger(value.retryAfterSeconds)&&value.retryAfterSeconds>=1&&value.retryAfterSeconds<=3600?value.retryAfterSeconds:60;
        error.retryAt=new Date(this.now()+error.retryAfterSeconds*1000).toISOString();throw error;
      }
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
    return `crp_family=${clear ? "" : token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${clear ? 0 : MAX_SESSION_MS/1000}${this.config.secure ? "; Secure" : ""}`;
  }
  getSession(req) {
    const raw = String(req.headers.cookie || "")
      .split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith("crp_family="))
      ?.slice(11);
    const session = raw && this.sessions.get(digest(raw));
    if (!session || (session.authenticatedUntil ?? session.expires) <= this.now()) {
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
    for (const v of this.sessions.values())
      if ((v.authenticatedUntil ?? v.expires) <= this.now())
        await this.logout(v);
    if (this.sessions.size >= 200) fail("SESSION_CAPACITY", 503);
    const s = {
      csrf: random(),
      links: { crp: {} },
      expires: this.now() + 300000,
      authenticatedUntil: this.now() + MAX_SESSION_MS,
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
    try { await this.call("crp", "/api/admin/unlock", s, { method: "POST", body }); }
    catch (error) {
      if (['AUTHENTICATION_REQUIRED','SESSION_REQUIRED'].includes(error.code)) {
        s.primaryAuthenticationExpired = true; s.authorized = false;
        fail('PRIMARY_AUTHENTICATION_REQUIRED', 401);
      }
      throw error;
    }
    const value = await this.call("crp", "/api/admin/session", s);
    if (value.session?.account_id !== s.subject) fail("IDENTITY_CHANGED");
    s.authorized = true;
    s.verifiedAt = this.now();
    s.expires = Math.min(this.now() + IDLE_MS, s.authenticatedUntil);
    this.journal.append("ADMIN_UNLOCKED", {
      subject: s.subject,
      environment: this.config.environment,
    });
    return this.session(s);
  }
  async reauthenticate(s, body) {
    strict(body, ['password', 'code']);
    if (!s.primaryAuthenticationExpired) fail('REAUTHENTICATION_NOT_REQUIRED', 409);
    if (s.authenticatedUntil <= this.now()) fail('SESSION_REQUIRED', 401);
    if (typeof body.password !== 'string' || !body.password || body.password.length > 1024 || typeof body.code !== 'string' || !/^\d{6}$/.test(body.code))
      fail('LOGIN_FIELDS_REQUIRED', 400);
    const renewed = { links: {crp:{}} };
    try {
      const value = await this.call('crp', '/api/sessions', renewed, {method:'POST', body:{email:s.email,password:body.password,code:body.code}});
      if (value.account?.account_id !== s.subject || !renewed.links.crp.cookies?.crp_session) fail('IDENTITY_CHANGED', 403);
      if(this.now()>=s.authenticatedUntil||this.sessions.get(s.key)!==s)fail('SESSION_REQUIRED',401);
    } catch (error) {
      if (renewed.links.crp.cookies?.crp_session)
        await this.call('crp','/api/sessions/current',renewed,{method:'DELETE'}).catch(()=>{});
      throw error;
    }
    s.links.crp = renewed.links.crp;
    s.primaryAuthenticationExpired = false; s.authorized = false; s.verifiedAt = 0;
    s.expires = Math.min(this.now()+300000,s.authenticatedUntil);
    this.journal.append('PRIMARY_REAUTHENTICATED',{subject:s.subject,environment:this.config.environment,absoluteExpiresAt:new Date(s.authenticatedUntil).toISOString()});
    return {csrf:s.csrf,unlockRequired:true,environment:this.config.environment,absoluteExpiresAt:new Date(s.authenticatedUntil).toISOString()};
  }
  async authorize(s) {
    if (
      !s.authorized ||
      s.expires <= this.now() ||
      this.sessions.get(s.key) !== s
    )
      fail("ADMIN_UNLOCK_REQUIRED", 401);
    let v;
    try { v = await this.call("crp", "/api/admin/session", s); }
    catch(error) {
      if(error.code === 'TWO_FACTOR_REQUIRED') { s.authorized=false; fail('ADMIN_UNLOCK_REQUIRED',401); }
      if(['AUTHENTICATION_REQUIRED','SESSION_REQUIRED'].includes(error.code)) { s.authorized=false;s.primaryAuthenticationExpired=true;fail('PRIMARY_AUTHENTICATION_REQUIRED',401); }
      throw error;
    }
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
  status(s) {
    // Passive browser polling is not user activity. Never call an upstream
    // resolver here: resolving Consumer's session slides its idle deadline.
    // This discloses no role/catalog/application data. Every real operation,
    // full session read and MFA unlock still checks the native authority.
    return {
      unlockRequired: !s.authorized || s.expires <= this.now(),
      reauthenticateRequired: s.primaryAuthenticationExpired === true,
      expiresAt: new Date(s.expires).toISOString(),
      absoluteExpiresAt: new Date(s.authenticatedUntil).toISOString(),
    };
  }
  async session(s) {
    const renewal = () => ({unlockRequired:true,reauthenticateRequired:true,csrf:s.csrf,environment:this.config.environment});
    if(s.primaryAuthenticationExpired)return renewal();
    let p;
    try { p = await this.authorize(s); }
    catch(error) {
      if(error.code === 'PRIMARY_AUTHENTICATION_REQUIRED')return renewal();
      if(error.code === 'ADMIN_UNLOCK_REQUIRED') return {unlockRequired:true,csrf:s.csrf,environment:this.config.environment}; throw error;
    }
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
      absoluteExpiresAt: new Date(s.authenticatedUntil).toISOString(),
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
  async activity(s) {
    await this.authorize(s);
    const native=await this.call('crp','/api/admin/activity',s,{method:'POST',body:{}});
    const until=Date.parse(native.expires_at);
    if(!Number.isFinite(until)||until<=this.now()) fail('ADMIN_UNLOCK_REQUIRED',401);
    s.expires=Math.min(until,this.now()+IDLE_MS,s.authenticatedUntil);
    // Activity is not MFA. verifiedAt deliberately stays unchanged.
    return {expiresAt:new Date(s.expires).toISOString(),absoluteExpiresAt:new Date(s.authenticatedUntil).toISOString()};
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
    if (op.background) {
      const work = this.performAction(s, app, name, input, op, body, path, details);
      this.pendingOperations.set(input.requestId, work);
      void work.finally(() => this.pendingOperations.delete(input.requestId)).catch(() => {});
      return { status: 'PENDING', requestId: input.requestId };
    }
    return this.performAction(s, app, name, input, op, body, path, details);
  }
  async operationStatus(s, requestId) {
    await this.authorize(s);
    const intent = this.journal.intents.get(requestId);
    if (!intent || intent.subject !== s.subject) fail('OPERATION_NOT_FOUND', 404);
    this.capability(s, intent.app, operation(intent.app, intent.operation, true));
    await this.nativeIdentity(s, intent.app);
    return this.operationReceipt(intent);
  }
  async operationList(s) {
    await this.authorize(s);
    this.capability(s, 'mail', operation('mail', 'provider.reconcile', true));
    await this.nativeIdentity(s, 'mail');
    return { items: [...this.journal.intents.values()].filter(r => r.subject === s.subject
      && r.app === 'mail' && actions.mail[r.operation]?.background).slice(-30).reverse()
      .map(r => this.operationReceipt(r)) };
  }
  operationReceipt(intent) {
    const requestId = intent.key;
    const rows = this.journal.events.filter(r => r.key === requestId);
    const applied = rows.some(r => r.event === 'ACTION_RESULT' && r.outcome === 'APPLIED');
    const last = rows.at(-1);
    const status = applied ? 'APPLIED' : this.pendingOperations.has(requestId) ? 'PENDING'
      : last?.outcome === 'REFUSED_OR_ACCESS_CHANGED' ? 'REFUSED' : 'UNKNOWN';
    return { status, requestId, app: intent.app, operation: intent.operation, record: intent.record,
      ...(status === 'REFUSED' ? { code: last.code,...(last.code==='POSTGRID_RATE_LIMITED'?{retryAfterSeconds:last.retryAfterSeconds,retryAt:last.retryAt}:{}) } : {}) };
  }
  async performAction(s, app, name, input, op, body, path, details) {
    let applied = false;
    try {
      const result = await this.call(app, path, s, { method: op.method, body,
        ...(op.background ? { timeout: 120000 } : {}) });
      applied = true;
      this.journal.append("ACTION_RESULT", {
        key: input.requestId,
        ...details,
        outcome: "APPLIED",
      });
      // A successful self-change revokes the native unlock before a post-read.
      // Acknowledge only the mutation, then revoke this session without returning
      // newly unauthorized member data or touching any other person's session.
      if (app === 'crp' && name === 'team.update' && result.member?.account_id === s.subject
          && result.member?.admin_id === input.id) {
        await this.logout(s);
        return { status: 'APPLIED', requestId: input.requestId, accessRemoved: true };
      }
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
        ...(e.code==='POSTGRID_RATE_LIMITED'?{retryAfterSeconds:e.retryAfterSeconds,retryAt:e.retryAt}:{}),
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
